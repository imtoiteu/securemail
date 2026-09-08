// The chrome shim must be installed before any desktop module evaluates, so it
// is imported first and self-installs a bootstrap chrome at module load.
import {installChromeShim, setManifest, clearSession} from './shims/chrome';
import {setMessages} from './shims/l10n';
import * as pgpModel from '../../../../mailvelope/src/modules/pgpModel';
import * as keyring from '../../../../mailvelope/src/modules/keyring';
import * as pwdCache from '../../../../mailvelope/src/modules/pwdCache';
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
