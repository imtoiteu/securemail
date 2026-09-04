import {MAIN_KEYRING_ID} from '../../../../mailvelope/src/lib/constants';

const kid = params => params.keyringId || MAIN_KEYRING_ID;

export function build({keyring}) {
  return {
    // Recipient picking only: keyring.js:362 strips the key object, filters out
    // anything failing isValidEncryptionKey, and expands one row per user id.
    'keyring.getKeyData': async params =>
      keyring.getKeyData({keyringId: kid(params), allUsers: params.allUsers ?? true}),

    // Key-management list: includes invalid/expired keys, unlike getKeyData.
    // Backed by KeyringBase.getKeys() -> mapKeys() (key.js:111), the same source
    // the desktop key grid uses (app.controller.js:42).
    'keyring.getKeys': async params => {
      const kr = await keyring.getById(kid(params));
      return kr.getKeys();
    },

    'keyring.getKeyDetails': async params => {
      const kr = await keyring.getById(kid(params));
      return kr.getKeyDetails(params.fingerprint);
    },

    'keyring.generateKey': async params => {
      const kr = await keyring.getById(kid(params));
      const newKey = await kr.generateKey({
        keyAlgo: params.keyAlgo,
        numBits: params.numBits,
        userIds: params.userIds,
        passphrase: params.passphrase,
        keyExpirationTime: params.keyExpirationTime,
        uploadPublicKey: false // never upload; keyserver is off in Phase 1
      });
      await kr.keystore.store();
      return {
        fingerprint: newKey.privateKey.getFingerprint(),
        publicKeyArmored: newKey.publicKey.armor()
      };
    },

    // KeyringLocal.importKeys already calls keystore.store() and sync.commit(),
    // and sets the first private key as default if none is set. Do not re-store.
    'keyring.importKeys': async params => {
      const kr = await keyring.getById(kid(params));
      return kr.importKeys(params.keys);
    },

    // KeyringLocal.removeKey also persists and clears the default key if it was
    // the one removed (KeyringLocal.js:202). Do not re-store.
    'keyring.removeKey': async params => {
      const kr = await keyring.getById(kid(params));
      await kr.removeKey(params.fingerprint, params.type);
      return {ok: true};
    },

    'keyring.exportKeys': async params => {
      const kr = await keyring.getById(kid(params));
      const armored = await kr.getArmoredKeys(params.fingerprints, {
        all: Boolean(params.allKeys),
        pub: true,
        priv: !params.publicOnly
      });
      const blocks = armored.map(entry =>
        params.publicOnly ? entry.armoredPublic : (entry.armoredPrivate || entry.armoredPublic));
      return {armored: blocks.filter(Boolean).join('\n')};
    },

    'keyring.setDefaultKey': async params => {
      const kr = await keyring.getById(kid(params));
      await kr.setDefaultKey(params.fingerprint);
      return {ok: true};
    },

    'keyring.getDefaultKeyFpr': async params => keyring.getDefaultKeyFpr(kid(params))
  };
}
