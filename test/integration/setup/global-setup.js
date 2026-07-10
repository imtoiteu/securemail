/**
 * Jest globalSetup for integration tests.
 * Launches a single Puppeteer browser and files its websocket endpoint so each
 * test environment can reconnect (globals set here do not reach the workers).
 */

import {mkdir, writeFile} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer';

export const WS_DIR = path.join(os.tmpdir(), 'mailvelope_jest_puppeteer');
export const WS_FILE = path.join(WS_DIR, 'wsEndpoint');

export default async function globalSetup() {
  const browser = await puppeteer.launch({
    headless: process.env.HEADLESS !== 'false',
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu'
    ],
    dumpio: process.env.DEBUG === 'true'
  });
  // Visible to globalTeardown via the global object, not to the test workers.
  global.__MV_BROWSER__ = browser;
  await mkdir(WS_DIR, {recursive: true});
  await writeFile(WS_FILE, browser.wsEndpoint());
}
