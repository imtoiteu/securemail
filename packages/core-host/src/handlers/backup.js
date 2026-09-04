import {MAIN_KEYRING_ID} from '../../../../mailvelope/src/lib/constants';

const kid = params => params.keyringId || MAIN_KEYRING_ID;

export function build({pgpModel, keyring}) {
  return {
    'backup.create': async params => {
      const keyringId = kid(params);
      const kr = await keyring.getById(keyringId);
      const defaultKeyFpr = await keyring.getDefaultKeyFpr(keyringId);
      if (!defaultKeyFpr) {
        const err = new Error('No default key set for backup');
        err.code = 'NO_DEFAULT_KEY';
        throw err;
      }
      const defaultKey = kr.getPrivateKeyByFpr(defaultKeyFpr);
      // pgpModel.createPrivateKeyBackup returns {backupCode, message}
      // (pgpModel.js:342) — rename at the boundary so the bridge contract stays
      // {backup, code} as specified.
      const {backupCode, message} = await pgpModel.createPrivateKeyBackup(defaultKey, params.keyPwd ?? '');
      return {backup: message, code: backupCode};
    },

    // restorePrivateKeyBackup returns {key, password} and throws MvError with
    // code WRONG_RESTORE_CODE on a bad code (pgpModel.js:365).
    'backup.restore': async params => {
      const {key} = await pgpModel.restorePrivateKeyBackup(params.armoredBlock, params.code);
      const kr = await keyring.getById(kid(params));
      const result = await kr.importKeys([{type: 'private', armored: key.armor()}]);
      const failed = result.find(r => r.type === 'error');
      if (failed) {
        const err = new Error(failed.message);
        err.code = 'RESTORE_IMPORT_FAILED';
        throw err;
      }
      return {fingerprint: key.getFingerprint()};
    }
  };
}
