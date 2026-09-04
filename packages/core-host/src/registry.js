import * as keyringHandlers from './handlers/keyring';
import * as cryptoHandlers from './handlers/crypto';
import * as backupHandlers from './handlers/backup';
import * as prefsHandlers from './handlers/prefs';
import * as appHandlers from './handlers/app';

export function buildRegistry(ctx) {
  return {
    ...appHandlers.build(ctx),
    ...keyringHandlers.build(ctx),
    ...cryptoHandlers.build(ctx),
    ...backupHandlers.build(ctx),
    ...prefsHandlers.build(ctx)
  };
}
