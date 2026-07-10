/**
 * Custom Jest test environment for Puppeteer integration tests.
 * Extends the project's own Jest 30 node environment and reconnects to the
 * browser launched in globalSetup, exposing `browser` and `page` globals.
 */

import {readFile} from 'node:fs/promises';
import {TestEnvironment as NodeEnvironment} from 'jest-environment-node';
import puppeteer from 'puppeteer';
import {WS_FILE} from './global-setup.js';

export default class PuppeteerEnvironment extends NodeEnvironment {
  async setup() {
    await super.setup();
    const wsEndpoint = await readFile(WS_FILE, 'utf8');
    if (!wsEndpoint) {
      throw new Error('wsEndpoint not found — global setup did not run');
    }
    this.global.browser = await puppeteer.connect({browserWSEndpoint: wsEndpoint});
    this.global.page = await this.global.browser.newPage();
  }

  async teardown() {
    if (this.global.page) {
      await this.global.page.close();
    }
    if (this.global.browser) {
      // disconnect, not close — the browser is shared and closed in globalTeardown
      await this.global.browser.disconnect();
    }
    await super.teardown();
  }
}
