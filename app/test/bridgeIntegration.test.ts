/**
 * End-to-end bridge test with no device.
 *
 * Wires the real CoreClient to the real core-host bundle through a simulated
 * WebView: injectJavaScript is routed into the core's SecureMailCore.handle,
 * and the core's postMessage is routed back into CoreClient.onMessage. Every
 * byte crosses the same JSON envelopes the Android app will use, so this
 * exercises the actual transport rather than a mock of it.
 */
import path from 'node:path';
import {webcrypto} from 'node:crypto';
import {CoreClient} from '../src/core/CoreClient';

if (!globalThis.crypto) (globalThis as any).crypto = webcrypto;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const core = require(path.join(__dirname, '../../packages/core-host/dist/core.node.cjs'));

jest.setTimeout(60_000);

const PASS = 'bridge integration passphrase';

function wireUp() {
  const client = new CoreClient();
  const blobs = new Map<string, string>();
  let api: {handle: (e: any) => Promise<void>; reply: (r: any) => void};

  // The core posts to the app.
  api = core.installWebViewTransport((msg: string) => {
    void client.onMessage({nativeEvent: {data: msg}} as any);
  });

  // The app injects into the core. Mirrors CoreClient.inject's wire format.
  client.attach({
    injectJavaScript(js: string) {
      const fn = js.includes('SecureMailCore.handle(') ? 'handle' : 'reply';
      const payload = JSON.parse(js.slice(js.indexOf('(') + 1, js.lastIndexOf(')')));
      if (fn === 'handle') void api.handle(payload);
      else api.reply(payload);
    }
  });

  client.setHandlers({
    'storage.get': async ({id}: any) => blobs.get(id) ?? null,
    'storage.set': async ({id, obj}: any) => { blobs.set(id, obj); return {ok: true}; },
    'storage.remove': async ({id}: any) => { blobs.delete(id); return {ok: true}; },
    'pwd.request': async () => ({password: PASS, cache: true}),
    'log.uiLog': async () => null
  });

  return {client, blobs};
}

test('the app can probe the core before initialising it', async () => {
  const {client} = wireUp();
  await expect(client.call('core.probe')).resolves.toMatchObject({ok: true});
});

test('methods are refused until core.init has run', async () => {
  const {client} = wireUp();
  await expect(client.call('keyring.getKeys')).rejects.toMatchObject({code: 'UNKNOWN_METHOD'});
});

test('full round trip across the bridge: init, generate, encrypt, decrypt', async () => {
  const {client} = wireUp();
  await client.call('core.init', {manifest: {version: '0.1.0'}, messages: {}});

  const {version} = await client.call<any>('app.getVersion');
  expect(version).toBe('0.1.0');

  const {fingerprint} = await client.call<any>('keyring.generateKey', {
    keyAlgo: 'ecc', numBits: 256, keyExpirationTime: 0,
    userIds: [{fullName: 'Bridge User', email: 'bridge@example.com'}],
    passphrase: PASS
  });
  expect(fingerprint).toMatch(/^[0-9a-f]{40}$/i);

  const {armored} = await client.call<any>('crypto.encryptMessage', {
    data: 'across the bridge, with ünïcode',
    encryptionKeyFprs: [fingerprint], signingKeyFpr: fingerprint
  });
  expect(armored).toContain('BEGIN PGP MESSAGE');

  const out = await client.call<any>('crypto.decryptMessage', {armored});
  expect(Buffer.from(out.data, 'binary').toString('utf8')).toBe('across the bridge, with ünïcode');
});

test('the core persists through the app-side storage handlers', async () => {
  const {client, blobs} = wireUp();
  await client.call('core.init', {manifest: {version: '0.1.0'}, messages: {}});
  await client.call('keyring.generateKey', {
    keyAlgo: 'ecc', numBits: 256, keyExpirationTime: 0,
    userIds: [{fullName: 'Bridge User', email: 'bridge@example.com'}], passphrase: PASS
  });
  // Storage really went through the bridge to the app side, not somewhere else.
  expect([...blobs.keys()].some(k => k.includes('privateKeys'))).toBe(true);
});

test('an error thrown inside the core keeps its code across the bridge', async () => {
  const {client} = wireUp();
  await client.call('core.init', {manifest: {version: '0.1.0'}, messages: {}});
  await expect(client.call('backup.create', {keyPwd: PASS}))
    .rejects.toMatchObject({code: 'NO_DEFAULT_KEY'});
});
