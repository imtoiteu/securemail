import * as pwdCache from '../../../../mailvelope/src/modules/pwdCache';
import * as prefs from '../../../../mailvelope/src/modules/prefs';
import {getUserInfo} from '../../../../mailvelope/src/modules/key';

/**
 * Mobile replacement for PwdController (controller/pwd.controller.js).
 * Same decision order as the desktop unlock(): cache hit, then already-decrypted
 * key, then ask the user. Requests are serialised so two concurrent operations
 * cannot stack two prompts on top of each other.
 */
export function makePassphraseProvider({requestPassphrase}) {
  let chain = Promise.resolve();

  async function unlock({key, message, reason = '', noCache = false}) {
    const cacheEntry = await pwdCache.get(key.getFingerprint(), message);
    if (cacheEntry && !noCache) {
      if (cacheEntry.key) return cacheEntry;
      return {
        key: await pwdCache.unlock({key, password: cacheEntry.password}),
        password: cacheEntry.password
      };
    }
    // Mirrors PwdController.keyIsDecrypted() (pwd.controller.js:142).
    if (key.isDecrypted() && !noCache) {
      return {key, password: undefined};
    }
    const {userId} = await getUserInfo(key, {allowInvalid: true});
    const keyId = key.getKeyID().toHex().toUpperCase();

    // The desktop PwdController does NOT abort on a wrong passphrase: onOk()
    // emits 'wrong-password' and leaves the dialog open so the user can retry
    // (pwd.controller.js:56). Rejecting here instead would surface a typo as a
    // generic ENCRYPT_ERROR, because pgpModel.encryptMessage rewraps everything
    // except PWD_DIALOG_CANCEL. So loop until the key unlocks or the user
    // cancels — cancellation is the app's job, signalled by PWD_DIALOG_CANCEL.
    let wrongPassword = false;
    for (;;) {
      const {password, cache} = await requestPassphrase({
        keyId, userId, reason, wrongPassword,
        cache: prefs.prefs.security.password_cache
      });
      if (typeof cache === 'boolean' && cache !== prefs.prefs.security.password_cache) {
        await prefs.update({security: {password_cache: cache}});
      }
      try {
        const unlocked = await pwdCache.unlock({key, password, noCache});
        return {key: unlocked, password};
      } catch (e) {
        if (e.code !== 'WRONG_PASSWORD') throw e;
        wrongPassword = true;
      }
    }
  }

  return {
    unlockKey(options) {
      chain = chain.then(() => unlock(options), () => unlock(options));
      return chain;
    },
    reset() { chain = Promise.resolve(); }
  };
}
