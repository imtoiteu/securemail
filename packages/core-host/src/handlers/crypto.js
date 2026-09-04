import {MAIN_KEYRING_ID} from '../../../../../mailvelope/src/lib/constants';

const kid = params => params.keyringId || MAIN_KEYRING_ID;
const SOURCE = 'securemail-mobile';

export function build({pgpModel, passphrase}) {
  const unlockKey = options => passphrase.unlockKey(options).then(({key}) => key);

  return {
    'crypto.encryptMessage': async params => ({
      armored: await pgpModel.encryptMessage({
        data: params.data,
        keyringId: kid(params),
        unlockKey,
        encryptionKeyFprs: params.encryptionKeyFprs,
        signingKeyFpr: params.signingKeyFpr,
        uiLogSource: SOURCE
      })
    }),

    'crypto.decryptMessage': async params => pgpModel.decryptMessage({
      armored: params.armored,
      keyringId: kid(params),
      unlockKey,
      senderAddress: params.senderAddress,
      uiLogSource: SOURCE
    }),

    'crypto.signMessage': async params => ({
      armored: await pgpModel.signMessage({
        data: params.data,
        keyringId: kid(params),
        unlockKey,
        signingKeyFpr: params.signingKeyFpr
      })
    }),

    'crypto.verifyMessage': async params => pgpModel.verifyMessage({
      armored: params.armored,
      keyringId: kid(params),
      senderAddress: params.senderAddress
    }),

    'crypto.encryptFile': async params => ({
      encryptedFile: await pgpModel.encryptFile({
        plainFile: params.plainFile,
        keyringId: kid(params),
        unlockKey,
        encryptionKeyFprs: params.encryptionKeyFprs,
        signingKeyFpr: params.signingKeyFpr,
        armor: params.armor ?? true,
        uiLogSource: SOURCE
      })
    }),

    'crypto.decryptFile': async params => pgpModel.decryptFile({
      encryptedFile: params.encryptedFile,
      unlockKey,
      uiLogSource: SOURCE
    })
  };
}
