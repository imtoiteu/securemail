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
    const {password, cache} = await requestPassphrase({
      keyId: key.getKeyID().toHex().toUpperCase(),
      userId,
      reason,
      cache: prefs.prefs.security.password_cache
    });
    if (typeof cache === 'boolean' && cache !== prefs.prefs.security.password_cache) {
      await prefs.update({security: {password_cache: cache}});
    }
    const unlocked = await pwdCache.unlock({key, password, noCache});
    return {key: unlocked, password};
  }

  return {
    unlockKey(options) {
      chain = chain.then(() => unlock(options), () => unlock(options));
      return chain;
    },
    reset() { chain = Promise.resolve(); }
  };
}
