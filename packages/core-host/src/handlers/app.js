import * as defaults from '../../../../../mailvelope/src/modules/defaults';

export function build({session, passphrase}) {
  return {
    // defaults.getVersion() reads res/defaults.json, whose "version" is the
    // literal '@@mvelo_version' placeholder that grunt-replace substitutes
    // during the desktop build. The mobile build does not run grunt, so the
    // app injects its own version through the manifest and we fall back to the
    // desktop value only when it has actually been substituted.
    'app.getVersion': async () => {
      const desktopVersion = defaults.getVersion();
      const substituted = desktopVersion && !desktopVersion.startsWith('@@');
      return {
        version: chrome.runtime.getManifest().version,
        coreVersion: substituted ? desktopVersion : null
      };
    },

    // The DEK lives only here, in core-host memory, for as long as the app is
    // unlocked. It is never written to storage from this side.
    'app.unlock': async ({dek}) => {
      session.setDek(Uint8Array.from(atob(dek), c => c.charCodeAt(0)));
      return {ok: true};
    },

    'app.lock': async () => {
      session.clearDek();
      passphrase.reset();
      return {ok: true};
    }
  };
}
