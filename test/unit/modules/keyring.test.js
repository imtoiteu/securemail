// Mock the heavy crypto imports so requiring keyring.js stays cheap.
jest.mock('emailjs-mime-builder', () => ({__esModule: true, default: jest.fn()}));
jest.mock('openpgp', () => ({
  readKey: jest.fn(),
  generateKey: jest.fn(),
  config: {},
  enums: {}
}));
jest.mock('@openpgp/web-stream-tools', () => ({readToEnd: jest.fn()}), {virtual: true});
jest.mock('../../../src/modules/KeyringGPG', () => ({default: class {}}));
jest.mock('../../../src/modules/KeyStoreGPG', () => ({default: class {}}));
jest.mock('../../../src/lib/browser.runtime', () => ({
  gpgme: null,
  initNativeMessaging: jest.fn()
}));

import {GNUPG_KEYRING_ID, MAIN_KEYRING_ID} from '../../../src/lib/constants';

function seedStorage(initial = {}) {
  const store = {...initial};
  chrome.storage.local.get.mockImplementation(key =>
    Promise.resolve(key in store ? {[key]: store[key]} : {}));
  chrome.storage.local.set.mockImplementation(obj => {
    Object.assign(store, obj);
    return Promise.resolve();
  });
  return store;
}

describe('keyring hasAnyPrivateKey', () => {
  let hasAnyPrivateKey;

  beforeEach(() => {
    jest.resetModules();
    chrome.storage.local.get.mockReset();
    chrome.storage.local.set.mockReset();
    // keyring.js never calls init() here, so keyringInitialized stays pending —
    // any awaited gate would hang the test rather than resolve.
    ({hasAnyPrivateKey} = require('../../../src/modules/keyring'));
  });

  it('returns false when no keyring attributes are stored', async () => {
    seedStorage({});
    await expect(hasAnyPrivateKey()).resolves.toBe(false);
  });

  it('returns false when the attributes map is empty', async () => {
    seedStorage({'mvelo.keyring.attributes': {}});
    await expect(hasAnyPrivateKey()).resolves.toBe(false);
  });

  it('returns true when the main keyring has non-empty private-key armor', async () => {
    seedStorage({
      'mvelo.keyring.attributes': {[MAIN_KEYRING_ID]: {}},
      [`mvelo.keyring.${MAIN_KEYRING_ID}.privateKeys`]: ['-----BEGIN PGP PRIVATE KEY BLOCK-----']
    });
    await expect(hasAnyPrivateKey()).resolves.toBe(true);
  });

  it('returns false when the main keyring is present but has no private keys', async () => {
    seedStorage({
      'mvelo.keyring.attributes': {[MAIN_KEYRING_ID]: {}},
      [`mvelo.keyring.${MAIN_KEYRING_ID}.privateKeys`]: []
    });
    await expect(hasAnyPrivateKey()).resolves.toBe(false);
  });

  it('returns false when the private-key armor entry is absent', async () => {
    seedStorage({'mvelo.keyring.attributes': {[MAIN_KEYRING_ID]: {}}});
    await expect(hasAnyPrivateKey()).resolves.toBe(false);
  });

  it('returns true when only a GnuPG keyring is registered (no native messaging)', async () => {
    seedStorage({'mvelo.keyring.attributes': {[GNUPG_KEYRING_ID]: {}}});
    await expect(hasAnyPrivateKey()).resolves.toBe(true);
  });

  it('returns true when a second local keyring carries the private key', async () => {
    const otherKeyringId = 'localhost|#|other';
    seedStorage({
      'mvelo.keyring.attributes': {[MAIN_KEYRING_ID]: {}, [otherKeyringId]: {}},
      [`mvelo.keyring.${MAIN_KEYRING_ID}.privateKeys`]: [],
      [`mvelo.keyring.${otherKeyringId}.privateKeys`]: ['-----BEGIN PGP PRIVATE KEY BLOCK-----']
    });
    await expect(hasAnyPrivateKey()).resolves.toBe(true);
  });
});
