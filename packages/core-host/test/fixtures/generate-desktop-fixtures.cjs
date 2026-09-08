/**
 * Produces golden fixtures using the DESKTOP module tree.
 * Read-only: imports from mailvelope/src via the built bundle, writes only
 * into this directory.
 * Run: node test/fixtures/generate-desktop-fixtures.cjs
 */
const fs = require('fs');
const path = require('path');
const {webcrypto} = require('node:crypto');
if (!globalThis.crypto) globalThis.crypto = webcrypto;
const {createCore} = require(path.join(__dirname, '..', '..', 'dist', 'core.node.cjs'));

const PASS = 'desktop fixture passphrase';
const PLAINTEXT = 'Xin chào — golden fixture plaintext with ünïcode.';

function memoryStorage() {
  const m = new Map();
  return {get: async id => m.get(id), set: async (id, o) => void m.set(id, o), remove: async id => void m.delete(id)};
}

(async () => {
  const core = await createCore({
    storage: memoryStorage(),
    requestPassphrase: async () => ({password: PASS, cache: true}),
    manifest: {version: '0.1.0'},
    messages: {}
  });

  const {fingerprint} = await core.call('keyring.generateKey', {
    keyAlgo: 'ecc', numBits: 256, keyExpirationTime: 0,
    userIds: [{fullName: 'Fixture User', email: 'fixture@example.com'}],
    passphrase: PASS
  });
  await core.call('keyring.setDefaultKey', {fingerprint});

  const {armored: publicKeyArmored} = await core.call('keyring.exportKeys',
    {fingerprints: [fingerprint], publicOnly: true});
  const {armored: privateKeyArmored} = await core.call('keyring.exportKeys',
    {fingerprints: [fingerprint], publicOnly: false});
  const {armored: ciphertext} = await core.call('crypto.encryptMessage', {
    data: PLAINTEXT, encryptionKeyFprs: [fingerprint], signingKeyFpr: fingerprint
  });
  const {armored: signedMessage} = await core.call('crypto.signMessage',
    {data: 'golden signed text', signingKeyFpr: fingerprint});
  const backup = await core.call('backup.create', {keyPwd: PASS});

  fs.writeFileSync(path.join(__dirname, 'desktop.json'), `${JSON.stringify({
    note: 'Generated from the desktop module tree. Do not hand-edit.',
    passphrase: PASS, fingerprint, publicKeyArmored, privateKeyArmored,
    plaintext: PLAINTEXT, ciphertext, signedMessage, backup
  }, null, 2)}\n`);
  console.log('wrote desktop.json for', fingerprint);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
