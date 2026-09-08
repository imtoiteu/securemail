const path = require('path');
const fixtures = require('./fixtures/desktop.json');
const {createCore} = require(path.join(__dirname, '..', 'dist', 'core.node.cjs'));

jest.setTimeout(60000);

function memoryStorage() {
  const m = new Map();
  return {get: async id => m.get(id), set: async (id, o) => void m.set(id, o), remove: async id => void m.delete(id)};
}
const boot = () => createCore({storage: memoryStorage(),
  requestPassphrase: async () => ({password: fixtures.passphrase, cache: true}),
  manifest: {version: '0.1.0'}, messages: {}});

test('imports a desktop-exported private key', async () => {
  const core = await boot();
  const result = await core.call('keyring.importKeys',
    {keys: [{type: 'private', armored: fixtures.privateKeyArmored}]});
  expect(result.some(r => r.type === 'success')).toBe(true);
  const keys = await core.call('keyring.getKeys', {});
  expect(keys.map(k => k.fingerprint)).toContain(fixtures.fingerprint);
});

test('decrypts desktop-produced ciphertext to the exact plaintext', async () => {
  const core = await boot();
  await core.call('keyring.importKeys', {keys: [{type: 'private', armored: fixtures.privateKeyArmored}]});
  const out = await core.call('crypto.decryptMessage', {armored: fixtures.ciphertext});
  expect(Buffer.from(out.data, 'binary').toString('utf8')).toBe(fixtures.plaintext);
});

test('verifies a desktop-produced signature', async () => {
  const core = await boot();
  await core.call('keyring.importKeys', {keys: [{type: 'public', armored: fixtures.publicKeyArmored}]});
  const out = await core.call('crypto.verifyMessage',
    {armored: fixtures.signedMessage, senderAddress: 'fixture@example.com'});
  expect(out.signatures[0].valid).toBe(true);
});

test('restores a desktop-produced backup block', async () => {
  const core = await boot();
  const {fingerprint} = await core.call('backup.restore',
    {armoredBlock: fixtures.backup.backup, code: fixtures.backup.code});
  expect(fingerprint).toBe(fixtures.fingerprint);
});

test('ciphertext produced here is readable by a core holding the fixture key', async () => {
  const writer = await boot();
  await writer.call('keyring.importKeys', {keys: [{type: 'private', armored: fixtures.privateKeyArmored}]});
  const {armored} = await writer.call('crypto.encryptMessage',
    {data: 'round trip back to desktop', encryptionKeyFprs: [fixtures.fingerprint]});

  const reader = await boot();
  await reader.call('keyring.importKeys', {keys: [{type: 'private', armored: fixtures.privateKeyArmored}]});
  const out = await reader.call('crypto.decryptMessage', {armored});
  expect(Buffer.from(out.data, 'binary').toString('utf8')).toBe('round trip back to desktop');
});
