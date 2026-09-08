/**
 * Secure Mail — screenshot capture from the built extension.
 *
 * Loads build/chrome as an unpacked extension in headless Chrome and captures
 * the extension's own pages. Screenshots used in documentation are produced by
 * this script so they can be regenerated and are known to show the real build
 * rather than a mock-up.
 *
 * Usage: node scripts/capture-screenshots.mjs [outDir]
 */
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const EXT = path.join(ROOT, 'build/chrome');
const OUT = process.argv[2] || path.join(ROOT, '../docs-sangkien/assets/screenshots');
const PROFILE = fs.mkdtempSync('/tmp/securemail-shot-');

const VIEWPORT = {width: 1440, height: 950, deviceScaleFactor: 2};

/** Pages that render standalone, with the hash route to reach them. */
const SHOTS = [
  {file: 'onboarding',        hash: '#/keyring/setup',            wait: 2500},
  {file: 'key-generate',      hash: '#/keyring/generate',         wait: 2500},
  {file: 'keyring-display',   hash: '#/keyring/display',          wait: 2500},
  {file: 'settings-general',  hash: '#/settings/general',         wait: 2000},
  {file: 'settings-security', hash: '#/settings/security',        wait: 2000},
  {file: 'settings-keyserver',hash: '#/settings/key-server',      wait: 2000},
  {file: 'settings-provider', hash: '#/settings/provider',        wait: 2000},
  {file: 'settings-watchlist',hash: '#/settings/watchlist',       wait: 2000},
];

async function main() {
  fs.mkdirSync(OUT, {recursive: true});
  const browser = await puppeteer.launch({
    // Chrome for Testing: branded Google Chrome refuses --load-extension /
    // --disable-extensions-except ("not allowed in Google Chrome, ignoring").
    // Install with: npx puppeteer browsers install chrome
    executablePath: process.env.CHROME_PATH ||
      '/root/.cache/puppeteer/chrome/linux-149.0.7827.22/chrome-linux64/chrome',
    headless: true,
    userDataDir: PROFILE,
    args: [
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      // Chrome 137+ ignores --load-extension unless this kill switch is off.
      '--disable-features=DisableLoadExtensionCommandLineSwitch',
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--lang=en-US',
      '--window-size=1440,950',
    ],
  });

  await new Promise(r => setTimeout(r, 4000));
  const ids = new Set(
    browser.targets().map(t => t.url()).filter(u => u.startsWith('chrome-extension://')).map(u => u.split('/')[2])
  );
  // The manifest pins a public key, so the id is deterministic; fall back to it
  // when the service-worker target has not spun up yet.
  const PINNED_ID = 'ihhialmbgcagicfabjkijpbppggbnebe';
  const id = [...ids][0] || PINNED_ID;
  if (!id) {
    console.error('No extension target found. Targets:', browser.targets().map(t => `${t.type()} ${t.url()}`));
    await browser.close();
    process.exit(1);
  }
  console.log('extension id:', id);

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);

  for (const locale of ['en', 'vi']) {
    // Seed the language choice the way the options page stores it.
    await page.goto(`chrome-extension://${id}/app/app.html`, {waitUntil: 'domcontentloaded'});
    await page.evaluate(loc => {
      if (loc === 'en') { localStorage.removeItem('securemail.locale'); }
      else { localStorage.setItem('securemail.locale', loc); }
    }, locale);

    for (const shot of SHOTS) {
      const url = `chrome-extension://${id}/app/app.html${shot.hash}`;
      await page.goto(url, {waitUntil: 'networkidle2'});
      // l10n.js reads the stored locale once, at module evaluation time. A
      // hash-only navigation does not re-evaluate it, so force a real reload.
      await page.reload({waitUntil: 'networkidle2'});
      await new Promise(r => setTimeout(r, shot.wait));
      const out = path.join(OUT, `${shot.file}.${locale}.png`);
      await page.screenshot({path: out, fullPage: true});
      console.log('captured', path.basename(out));
    }
  }

  await browser.close();
  fs.rmSync(PROFILE, {recursive: true, force: true});
}

main().catch(e => { console.error(e); process.exit(1); });
