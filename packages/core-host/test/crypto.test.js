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

async function coreWith(requestPassphrase, storage = memoryStorage()) {
  return createCore({storage, requestPassphrase, manifest: {version: '0.1.0'}, messages: {}});
}

test('encrypt then decrypt round-trips the plaintext', async () => {
  let asked = 0;
  const core = await coreWith(async () => { asked++; return {password: PASS, cache: false}; });
  const {fingerprint} = await core.call('keyring.generateKey', GEN);

  const {armored} = await core.call('crypto.encryptMessage',
    {data: 'Xin chao, this is secret.', encryptionKeyFprs: [fingerprint], signingKeyFpr: fingerprint});
  expect(armored).toContain('BEGIN PGP MESSAGE');

  const out = await core.call('crypto.decryptMessage', {armored});
  expect(out.data).toContain('secret');
  expect(asked).toBeGreaterThan(0);
});

test('a wrong passphrase is retried, not aborted', async () => {
  // The provider retries rather than aborting, matching PwdController. The app
  // gives up by throwing PWD_DIALOG_CANCEL, which is the only way out.
  let attempts = 0;
  const retryCore = await coreWith(async () => {
    attempts++;
    if (attempts < 3) return {password: 'wrong', cache: false};
    const e = new Error('user gave up'); e.code = 'PWD_DIALOG_CANCEL'; throw e;
  });
  const fpr2 = (await retryCore.call('keyring.generateKey', GEN)).fingerprint;
  await expect(retryCore.call('crypto.encryptMessage',
    {data: 'x', encryptionKeyFprs: [fpr2], signingKeyFpr: fpr2}))
    .rejects.toMatchObject({code: 'PWD_DIALOG_CANCEL'});
  expect(attempts).toBe(3);
  expect(await retryCore.call('keyring.getKeys', {})).toHaveLength(1);
});

test('cancelling the passphrase prompt surfaces PWD_DIALOG_CANCEL', async () => {
  const core = await coreWith(async () => {
    const e = new Error('cancelled'); e.code = 'PWD_DIALOG_CANCEL'; throw e;
  });
  const {fingerprint} = await core.call('keyring.generateKey', GEN);
  await expect(core.call('crypto.encryptMessage',
    {data: 'x', encryptionKeyFprs: [fingerprint], signingKeyFpr: fingerprint}))
    .rejects.toMatchObject({code: 'PWD_DIALOG_CANCEL'});
});

test('caching means the second operation does not prompt again', async () => {
  let asked = 0;
  const core = await coreWith(async () => { asked++; return {password: PASS, cache: true}; });
  const {fingerprint} = await core.call('keyring.generateKey', GEN);
  const opts = {data: 'a', encryptionKeyFprs: [fingerprint], signingKeyFpr: fingerprint};
  await core.call('crypto.encryptMessage', opts);
  const first = asked;
  await core.call('crypto.encryptMessage', {...opts, data: 'b'});
  expect(asked).toBe(first);
});

test('lock() clears the cache so the next operation prompts again', async () => {
  let asked = 0;
  const core = await coreWith(async () => { asked++; return {password: PASS, cache: true}; });
  const {fingerprint} = await core.call('keyring.generateKey', GEN);
  const opts = {data: 'a', encryptionKeyFprs: [fingerprint], signingKeyFpr: fingerprint};
  await core.call('crypto.encryptMessage', opts);
  const before = asked;
  await core.lock();
  await core.call('crypto.encryptMessage', {...opts, data: 'b'});
  expect(asked).toBeGreaterThan(before);
});

test('decrypting a message for an absent key reports NO_KEY_FOUND', async () => {
  const donor = await coreWith(async () => ({password: PASS, cache: true}));
  const {fingerprint} = await donor.call('keyring.generateKey', GEN);
  const {armored} = await donor.call('crypto.encryptMessage',
    {data: 'secret', encryptionKeyFprs: [fingerprint], signingKeyFpr: fingerprint});

  const empty = await coreWith(async () => ({password: PASS}));
  await expect(empty.call('crypto.decryptMessage', {armored}))
    .rejects.toMatchObject({code: 'NO_KEY_FOUND'});
});

test('sign then verify reports a valid signature', async () => {
  const core = await coreWith(async () => ({password: PASS, cache: true}));
  const {fingerprint} = await core.call('keyring.generateKey', GEN);
  const {armored} = await core.call('crypto.signMessage', {data: 'signed text', signingKeyFpr: fingerprint});
  const out = await core.call('crypto.verifyMessage', {armored, senderAddress: 'anna@example.com'});
  expect(out.signatures[0].valid).toBe(true);
});

test('file encrypt then decrypt preserves name and bytes', async () => {
  const core = await coreWith(async () => ({password: PASS, cache: true}));
  const {fingerprint} = await core.call('keyring.generateKey', GEN);
  const plainFile = {name: 'note.txt', content: `data:text/plain;base64,${Buffer.from('hello file').toString('base64')}`};

  const {encryptedFile} = await core.call('crypto.encryptFile',
    {plainFile, encryptionKeyFprs: [fingerprint], signingKeyFpr: fingerprint, armor: true});
  const out = await core.call('crypto.decryptFile', {encryptedFile});
  expect(out.name).toBe('note.txt');
  expect(Buffer.from(out.content.split(',')[1], 'base64').toString()).toBe('hello file');
});

test('malformed armor is rejected as a parse error, not a crash', async () => {
  const core = await coreWith(async () => ({password: PASS}));
  await expect(core.call('crypto.decryptMessage',
    {armored: '-----BEGIN PGP MESSAGE-----\nrubbish\n-----END PGP MESSAGE-----'}))
    .rejects.toThrow();
});
