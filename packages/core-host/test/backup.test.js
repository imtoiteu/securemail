const path = require('path');
const {createCore} = require(path.join(__dirname, '..', 'dist', 'core.node.cjs'));

const PASS = 'correct horse battery staple';
const GEN = {keyAlgo: 'ecc', numBits: 256, keyExpirationTime: 0,
  userIds: [{fullName: 'Anna Nguyen', email: 'anna@example.com'}], passphrase: PASS};

jest.setTimeout(60000);

function memoryStorage() {
  const m = new Map();
  return {get: async id => m.get(id), set: async (id, o) => void m.set(id, o), remove: async id => void m.delete(id)};
}
const boot = () => createCore({storage: memoryStorage(),
  requestPassphrase: async () => ({password: PASS, cache: true}),
  manifest: {version: '0.1.0'}, messages: {}});

test('a backup restores into a fresh core and yields a usable key', async () => {
  const a = await boot();
  const {fingerprint} = await a.call('keyring.generateKey', GEN);
  await a.call('keyring.setDefaultKey', {fingerprint});

  const {backup, code} = await a.call('backup.create', {keyPwd: PASS});
  expect(backup).toContain('BEGIN PGP MESSAGE');
  expect(code).toHaveLength(26);

  const b = await boot();
  await b.call('backup.restore', {armoredBlock: backup, code});
  const keys = await b.call('keyring.getKeys', {});
  expect(keys.map(k => k.fingerprint)).toContain(fingerprint);
});

test('restoring with a wrong code fails and imports nothing', async () => {
  const a = await boot();
  await a.call('keyring.generateKey', GEN);
  await a.call('keyring.setDefaultKey', {fingerprint: (await a.call('keyring.getKeys', {}))[0].fingerprint});
  const {backup} = await a.call('backup.create', {keyPwd: PASS});

  const b = await boot();
  await expect(b.call('backup.restore', {armoredBlock: backup, code: 'A'.repeat(26)}))
    .rejects.toMatchObject({code: 'WRONG_RESTORE_CODE'});
  expect(await b.call('keyring.getKeys', {})).toHaveLength(0);
});

test('backup without a default key reports NO_DEFAULT_KEY', async () => {
  const core = await boot();
  await expect(core.call('backup.create', {keyPwd: PASS}))
    .rejects.toMatchObject({code: 'NO_DEFAULT_KEY'});
});
