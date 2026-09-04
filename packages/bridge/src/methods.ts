export const APP_TO_CORE = {
  appGetVersion: 'app.getVersion',
  appUnlock: 'app.unlock',
  appLock: 'app.lock',
  keyringGetKeyData: 'keyring.getKeyData',
  keyringGetKeys: 'keyring.getKeys',
  keyringGetKeyDetails: 'keyring.getKeyDetails',
  keyringGenerateKey: 'keyring.generateKey',
  keyringImportKeys: 'keyring.importKeys',
  keyringRemoveKey: 'keyring.removeKey',
  keyringExportKeys: 'keyring.exportKeys',
  keyringSetDefaultKey: 'keyring.setDefaultKey',
  keyringGetDefaultKeyFpr: 'keyring.getDefaultKeyFpr',
  cryptoEncryptMessage: 'crypto.encryptMessage',
  cryptoDecryptMessage: 'crypto.decryptMessage',
  cryptoSignMessage: 'crypto.signMessage',
  cryptoVerifyMessage: 'crypto.verifyMessage',
  cryptoEncryptFile: 'crypto.encryptFile',
  cryptoDecryptFile: 'crypto.decryptFile',
  backupCreate: 'backup.create',
  backupRestore: 'backup.restore',
  prefsGet: 'prefs.get',
  prefsSet: 'prefs.set'
} as const;

export const CORE_TO_APP = {
  storageGet: 'storage.get',
  storageSet: 'storage.set',
  storageRemove: 'storage.remove',
  pwdRequest: 'pwd.request',
  logUiLog: 'log.uiLog'
} as const;
