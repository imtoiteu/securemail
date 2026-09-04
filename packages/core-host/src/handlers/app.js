import * as defaults from '../../../../mailvelope/src/modules/defaults';

export function build({session, passphrase}) {
  return {
    'app.getVersion': async () => ({
      version: defaults.getVersion(),
      coreVersion: defaults.getVersion()
    }),

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
