/**
 * Independent interoperability check.
 *
 * The golden fixtures are produced by the core-host bundle, which contains the
 * desktop modules — a strong proxy, but the same code path. This suite instead
 * reads the mobile core's output using the raw openpgp API loaded straight from
 * the desktop's frozen node_modules, with no Mailvelope code involved at all.
 * It proves the output is standard OpenPGP that any conforming implementation
 * can read, not something only the wrapper understands.
 */
const path = require('path');
const fixtures = require('./fixtures/desktop.json');
const openpgp = require(path.join(__dirname, '../../../../mailvelope/node_modules/openpgp'));

jest.setTimeout(60000);

test('the frozen openpgp version is the audited one', () => {
  const pkg = require(path.join(__dirname, '../../../../mailvelope/node_modules/openpgp/package.json'));
  expect(pkg.version).toBe('5.11.3');
});

test('raw openpgp decrypts ciphertext the mobile core produced', async () => {
  const privateKey = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({armoredKey: fixtures.privateKeyArmored}),
    passphrase: fixtures.passphrase
  });
  const message = await openpgp.readMessage({armoredMessage: fixtures.ciphertext});
  const {data} = await openpgp.decrypt({message, decryptionKeys: privateKey});
  expect(data).toBe(fixtures.plaintext);
});

test('raw openpgp verifies a signature the mobile core produced', async () => {
  // pgpModel.signMessage emits a CLEARTEXT signed message
  // ("-----BEGIN PGP SIGNED MESSAGE-----"), so it needs readCleartextMessage.
  const publicKey = await openpgp.readKey({armoredKey: fixtures.publicKeyArmored});
  const cleartextMessage = await openpgp.readCleartextMessage(
    {cleartextMessage: fixtures.signedMessage});
  const {signatures, data} = await openpgp.verify(
    {message: cleartextMessage, verificationKeys: publicKey});
  expect(data).toBe('golden signed text');
  await expect(signatures[0].verified).resolves.toBe(true);
});

test('armored output carries a real version, not a build placeholder', () => {
  for (const block of [fixtures.ciphertext, fixtures.signedMessage, fixtures.backup.backup]) {
    expect(block).not.toContain('@@mvelo_version');
  }
});

test('the exported public key carries the expected user id and fingerprint', async () => {
  const key = await openpgp.readKey({armoredKey: fixtures.publicKeyArmored});
  expect(key.getFingerprint()).toBe(fixtures.fingerprint);
  expect(key.getUserIDs()[0]).toContain('fixture@example.com');
});
