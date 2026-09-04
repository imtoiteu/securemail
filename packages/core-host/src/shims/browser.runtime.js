/**
 * Replaces lib/browser.runtime.js.
 * GnuPG native messaging cannot exist on Android. The desktop original calls
 * gpgmejs.init({timeout: 10000}) during keyring.init(), which would stall the
 * first launch for ten seconds and pull gpgmejs into the bundle for nothing.
 */
export const gpgme = null;

export function initBrowserRuntime() {}
export async function initNativeMessaging() {}
