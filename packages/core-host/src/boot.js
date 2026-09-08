// The chrome shim must be installed before any desktop module evaluates, so it
// is imported first and self-installs a bootstrap chrome at module load.
import {installChromeShim, setManifest, clearSession} from './shims/chrome';
import {setMessages} from './shims/l10n';
import * as pgpModel from '../../../../mailvelope/src/modules/pgpModel';
import * as keyring from '../../../../mailvelope/src/modules/keyring';
import * as pwdCache from '../../../../mailvelope/src/modules/pwdCache';
import {config as pgpConfig} from 'openpgp';
import {createRpcClient, createRpcServer} from '@securemail/bridge';
import {buildRegistry} from './registry';
import {makePassphraseProvider} from './passphrase';

export {gpgme} from './shims/browser.runtime';

export function probeCapabilities() {
  const missing = [];
  if (typeof globalThis.crypto?.getRandomValues !== 'function') missing.push('crypto.getRandomValues');
  if (!globalThis.crypto?.subtle) missing.push('crypto.subtle');
  if (typeof globalThis.TextEncoder !== 'function') missing.push('TextEncoder');
  if (typeof globalThis.ReadableStream !== 'function') missing.push('ReadableStream');
  return {ok: missing.length === 0, missing};
}

/** Holds the DEK for as long as the app is unlocked. Never persisted. */
function makeSession() {
  let dek = null;
  return {
    setDek(next) { dek = next; },
    getDek() {
      if (!dek) {
        const e = new Error('core host is locked'); e.code = 'CORE_LOCKED'; throw e;
      }
      return dek;
    },
    hasDek: () => dek !== null,
    clearDek() { if (dek) dek.fill(0); dek = null; }
  };
}

/**
 * Boot the core in-process. Transport-free so tests can drive it directly.
 * @param {{get,set,remove}} opts.storage  persistent backend (bridge or memory)
 * @param {Function} opts.requestPassphrase ({keyId,userId,reason,cache}) => {password,cache}
 */
export async function createCore({storage, requestPassphrase, log = () => {}, manifest, messages}) {
  const probe = probeCapabilities();
  if (!probe.ok) {
    const err = new Error(`unsupported runtime, missing: ${probe.missing.join(', ')}`);
    err.code = 'UNSUPPORTED_RUNTIME';
    throw err;
  }
  installChromeShim({storage});
  setManifest(manifest);
  setMessages(messages);

  await pgpModel.init();
  await keyring.init();

  // pgpModel.initOpenPGP() sets versionString from defaults.getVersion(), which
  // reads res/defaults.json — whose "version" is the '@@mvelo_version'
  // placeholder that grunt-replace substitutes during the DESKTOP build only.
  // Without this, every armored block the mobile core emits would carry the
  // literal 'Secure Mail v@@mvelo_version' in its Version header.
  pgpConfig.versionString = `Secure Mail Mobile v${manifest.version}`;

  const session = makeSession();
  const passphrase = makePassphraseProvider({requestPassphrase});
  const handlers = buildRegistry({pgpModel, keyring, log, passphrase, session});

  return {
    async call(method, params = {}) {
      const handler = handlers[method];
      if (!handler) throw new Error(`unknown method: ${method}`);
      return handler(params);
    },
    /**
     * Relock. Clearing chrome.storage.session is NOT sufficient on mobile.
     *
     * pwdCache's PwdMap extends Map and keeps unlocked Key objects and
     * passphrases in an in-process JS Map (pwdCache.js:26), consulted BEFORE
     * session storage (pwdCache.js:71). On desktop the MV3 service worker dies
     * and takes that memory with it; the mobile WebView does not, so a plain
     * session wipe would leave private keys usable and the next operation would
     * proceed with no passphrase prompt.
     *
     * So: drop each cached entry (which also clears its rate-limit interval),
     * reset the map, wipe session storage, then rebuild the keyring so the
     * decrypted Key objects it holds are replaced by freshly-read armored ones.
     * The keyring reload happens before the DEK is cleared, because it reads
     * storage.
     */
    async lock() {
      passphrase.reset();
      try {
        for (const kr of await keyring.getAll()) {
          for (const key of kr.keystore.getAllKeys()) {
            await pwdCache.delete(key.getFingerprint());
          }
        }
      } catch (e) {
        console.log('pwdCache purge during lock failed', e);
      }
      pwdCache.initSession();
      clearSession();
      try {
        await keyring.init();
      } finally {
        session.clearDek();
      }
    }
  };
}

/**
 * Browser transport. Runs only inside the WebView; the node test bundle skips
 * it because window.ReactNativeWebView does not exist there.
 *
 * The core cannot be built until the app hands over the DEK and config, so the
 * RPC server starts empty and answers only `core.init` until that lands.
 */
export function installWebViewTransport(postMessage) {
  const outbound = createRpcClient(
    env => postMessage(JSON.stringify(env)),
    {timeoutMs: 120000}
  );
  const server = createRpcServer({}, reply => postMessage(JSON.stringify(reply)));
  let core = null;

  const bootHandlers = {
    'core.probe': async () => probeCapabilities(),
    'core.init': async params => {
      core = await createCore({
        storage: makeBridgeStorage(outbound),
        requestPassphrase: p => outbound.call('pwd.request', p),
        log: entry => { outbound.call('log.uiLog', entry).catch(() => {}); },
        manifest: params.manifest,
        messages: params.messages
      });
      server.replaceHandlers({...bootHandlers, ...forwardingHandlers()});
      return {ok: true, version: params.manifest.version};
    }
  };

  function forwardingHandlers() {
    const names = [
      'app.getVersion', 'app.unlock',
      'keyring.getKeyData', 'keyring.getKeys', 'keyring.getKeyDetails',
      'keyring.generateKey', 'keyring.importKeys', 'keyring.removeKey',
      'keyring.exportKeys', 'keyring.setDefaultKey', 'keyring.getDefaultKeyFpr',
      'crypto.encryptMessage', 'crypto.decryptMessage', 'crypto.signMessage',
      'crypto.verifyMessage', 'crypto.encryptFile', 'crypto.decryptFile',
      'backup.create', 'backup.restore',
      'prefs.get', 'prefs.set'
    ];
    const out = {};
    for (const name of names) out[name] = params => core.call(name, params);
    // app.lock is the core's own teardown, not a registry handler.
    out['app.lock'] = async () => { await core.lock(); return {ok: true}; };
    return out;
  }

  // Register the boot handlers immediately; without this the server starts
  // empty and even core.init comes back as UNKNOWN_METHOD.
  server.replaceHandlers(bootHandlers);

  const api = {
    handle: env => server.handle(env),
    reply: r => outbound.handleReply(r)
  };
  if (typeof window !== 'undefined') {
    window.SecureMailCore = api;
  }
  return api;
}

/**
 * Storage seen by the desktop core. Values are AES-GCM encrypted here, inside
 * the WebView, using the DEK the app released at unlock; the native side only
 * ever stores opaque base64. A fresh 12-byte IV per write is prepended to the
 * ciphertext.
 */
export function makeBridgeStorage(outbound, getDek = null) {
  const enc = new TextEncoder();
  const dec = new TextDecoder();
  const plain = getDek === null;

  async function key() {
    return crypto.subtle.importKey('raw', getDek(), 'AES-GCM', false, ['encrypt', 'decrypt']);
  }
  const toB64 = bytes => {
    let s = '';
    for (const b of bytes) s += String.fromCharCode(b);
    return btoa(s);
  };
  const fromB64 = b64 => Uint8Array.from(atob(b64), c => c.charCodeAt(0));

  return {
    async get(id) {
      const stored = await outbound.call('storage.get', {id});
      if (stored === null || stored === undefined) return undefined;
      if (plain) return JSON.parse(stored);
      const raw = fromB64(stored);
      const clear = await crypto.subtle.decrypt(
        {name: 'AES-GCM', iv: raw.slice(0, 12)}, await key(), raw.slice(12));
      return JSON.parse(dec.decode(clear));
    },
    async set(id, obj) {
      if (plain) return outbound.call('storage.set', {id, obj: JSON.stringify(obj)});
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const ct = new Uint8Array(await crypto.subtle.encrypt(
        {name: 'AES-GCM', iv}, await key(), enc.encode(JSON.stringify(obj))));
      const packed = new Uint8Array(iv.length + ct.length);
      packed.set(iv);
      packed.set(ct, iv.length);
      return outbound.call('storage.set', {id, obj: toB64(packed)});
    },
    remove(id) { return outbound.call('storage.remove', {id}); }
  };
}

if (typeof window !== 'undefined' && window.ReactNativeWebView) {
  installWebViewTransport(msg => window.ReactNativeWebView.postMessage(msg));
}
