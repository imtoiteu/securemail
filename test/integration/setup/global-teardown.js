/**
 * Jest globalTeardown for integration tests.
 * Closes the shared Puppeteer browser and removes the wsEndpoint temp dir.
 */

import {rm} from 'node:fs/promises';
import {WS_DIR} from './global-setup.js';

export default async function globalTeardown() {
  if (global.__MV_BROWSER__) {
    await global.__MV_BROWSER__.close();
  }
  await rm(WS_DIR, {recursive: true, force: true});
}
