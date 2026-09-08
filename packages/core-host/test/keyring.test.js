const path = require('path');
const {createCore} = require(path.join(__dirname, '..', 'dist', 'core.node.cjs'));

const PASS = 'correct horse battery staple';

function memoryStorage() {
  const m = new Map();
  return {get: async id => m.get(id), set: async (id, o) => void m.set(id, o), remove: async id => void m.delete(id)};
}

async function newCore() {
  return createCore({
    storage: memoryStorage(),
    requestPassphrase: async () => ({password: PASS, cache: false}),
    manifest: {version: '0.1.0'},
    messages: {}
  });
}

// ECC keys generate in well under a second; RSA would blow the timeout.
const GEN = {keyAlgo: 'ecc', numBits: 256, keyExpirationTime: 0,
  userIds: [{fullName: 'Anna Nguyen', email: 'anna@example.com'}], passphrase: PASS};

jest.setTimeout(60000);

test('generates a key and lists it', async () => {
  const core = await newCore();
  const {fingerprint} = await core.call('keyring.generateKey', GEN);
  expect(fingerprint).toMatch(/^[0-9a-f]{40}$/i);

  const keys = await core.call('keyring.getKeyData', {});
  expect(keys).toHaveLength(1);
  expect(keys[0].email).toBe('anna@example.com');
});

test('the generated key becomes the default key', async () => {
  const core = await newCore();
  const {fingerprint} = await core.call('keyring.generateKey', GEN);
  await core.call('keyring.setDefaultKey', {fingerprint});
  expect(await core.call('keyring.getDefaultKeyFpr', {})).toBe(fingerprint);
});

test('getKeys returns the management shape, including type and validity', async () => {
  const core = await newCore();
  const {fingerprint} = await core.call('keyring.generateKey', GEN);
  const list = await core.call('keyring.getKeys', {});
  expect(list).toHaveLength(1);
  expect(list[0]).toMatchObject({fingerprint, type: 'private', validity: true, name: 'Anna Nguyen'});
  expect(list[0].algorithm).toBeTruthy();
  // Must be JSON-serialisable to cross the bridge: no live openpgp Key object.
  expect(() => JSON.stringify(list)).not.toThrow();
  expect(list[0].key).toBeUndefined();
});

test('getKeyData is JSON-serialisable too', async () => {
  const core = await newCore();
  await core.call('keyring.generateKey', GEN);
  const keys = await core.call('keyring.getKeyData', {});
  expect(() => JSON.stringify(keys)).not.toThrow();
  expect(keys[0].key).toBeUndefined();
});

test('key details expose user ids', async () => {
  const core = await newCore();
  const {fingerprint} = await core.call('keyring.generateKey', GEN);
  const details = await core.call('keyring.getKeyDetails', {fingerprint});
  expect(JSON.stringify(details.users)).toContain('anna@example.com');
});

test('exports a public key and re-imports it into a fresh core', async () => {
  const a = await newCore();
  const {fingerprint} = await a.call('keyring.generateKey', GEN);
  const {armored} = await a.call('keyring.exportKeys', {fingerprints: [fingerprint], publicOnly: true});
  expect(armored).toContain('BEGIN PGP PUBLIC KEY BLOCK');

  const b = await newCore();
  const result = await b.call('keyring.importKeys', {keys: [{type: 'public', armored}]});
  expect(result[0].type).toBe('success');
  expect(await b.call('keyring.getKeys', {})).toHaveLength(1);
});

test('export of a private key includes the secret block', async () => {
  const core = await newCore();
  const {fingerprint} = await core.call('keyring.generateKey', GEN);
  const {armored} = await core.call('keyring.exportKeys', {fingerprints: [fingerprint], publicOnly: false});
  expect(armored).toContain('BEGIN PGP PRIVATE KEY BLOCK');
});

test('removes a key', async () => {
  const core = await newCore();
  const {fingerprint} = await core.call('keyring.generateKey', GEN);
  await core.call('keyring.removeKey', {fingerprint, type: 'private'});
  expect(await core.call('keyring.getKeys', {})).toHaveLength(0);
});

test('keys survive a core restart against the same storage', async () => {
  const storage = memoryStorage();
  const boot = () => createCore({storage, requestPassphrase: async () => ({password: PASS}),
    manifest: {version: '0.1.0'}, messages: {}});
  const first = await boot();
  const {fingerprint} = await first.call('keyring.generateKey', GEN);
  const second = await boot();
  const keys = await second.call('keyring.getKeys', {});
  expect(keys.map(k => k.fingerprint)).toEqual([fingerprint]);
});

test('importing garbage reports an error entry instead of throwing', async () => {
  const core = await newCore();
  const result = await core.call('keyring.importKeys', {keys: [{type: 'public', armored: 'not a key'}]});
  expect(result[0].type).toBe('error');
});

test('prefs round-trip', async () => {
  const core = await newCore();
  const before = await core.call('prefs.get', {});
  expect(before.security).toBeDefined();
  await core.call('prefs.set', {prefs: {security: {password_cache: false}}});
  const after = await core.call('prefs.get', {});
  expect(after.security.password_cache).toBe(false);
});
