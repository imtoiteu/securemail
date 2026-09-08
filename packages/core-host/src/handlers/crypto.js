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

    // pgpModel.encryptFile returns a bare armored string, but pgpModel.decryptFile
    // expects {content: dataURL, name}. Map between the two here, at the bridge
    // boundary, rather than making callers know the asymmetry.
    // The '.asc' suffix matters: decryptFile falls back to name.slice(0, -4) when
    // the message carries no embedded filename (pgpModel.js:528).
    'crypto.encryptFile': async params => {
      const armored = await pgpModel.encryptFile({
        plainFile: params.plainFile,
        keyringId: kid(params),
        unlockKey,
        encryptionKeyFprs: params.encryptionKeyFprs,
        signingKeyFpr: params.signingKeyFpr,
        armor: params.armor ?? true,
        uiLogSource: SOURCE
      });
      return {
        encryptedFile: {
          name: `${params.plainFile.name}.asc`,
          content: `data:application/pgp-encrypted;base64,${btoa(armored)}`
        }
      };
    },

    // Returns {data, signatures, filename} with data as a JS binary string.
    'crypto.decryptFile': async params => {
      const result = await pgpModel.decryptFile({
        encryptedFile: params.encryptedFile,
        unlockKey,
        uiLogSource: SOURCE
      });
      return {
        name: result.filename,
        content: `data:application/octet-stream;base64,${btoa(result.data)}`,
        signatures: result.signatures
      };
    }
  };
}
