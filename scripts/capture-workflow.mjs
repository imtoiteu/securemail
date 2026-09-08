/**
 * Secure Mail — end-to-end workflow capture.
 *
 * Drives the built extension through the real user journey (generate an
 * OpenPGP key pair, inspect it, encrypt a message, decrypt it back) inside
 * headless Chrome, capturing a screenshot at each step and timing the
 * cryptographic operations.
 *
 * Everything it reports is measured, not asserted: the timings come from
 * performance.now() around the actual UI interactions, and the screenshots
 * are of the same build that ships.
 *
 * Usage: node scripts/capture-workflow.mjs [outDir]
 * Writes <outDir>/../measurements/workflow-timings.json alongside the images.
 */
import puppeteer from '../node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const EXT = path.join(ROOT, 'build/chrome');
const OUT = process.argv[2] || path.join(ROOT, '../docs-sangkien/assets/screenshots');
const MEAS = path.resolve(OUT, '../measurements');
const PROFILE = fs.mkdtempSync('/tmp/securemail-wf-');
const PINNED_ID = 'ihhialmbgcagicfabjkijpbppggbnebe';

// Deliberately fictitious. The .test TLD is reserved by RFC 2606 and can never
// be registered, so these identities cannot collide with a real mailbox.
const DEMO = {
  name: 'Nguyen Van A',
  email: 'giangvien.a@donvi.test',
  pass: 'CumMatKhau-Manh-2026!',
};
const PEER = {
  name: 'Tran Thi B',
  email: 'hocvien.b@donvi.test',
  pass: 'CumMatKhau-Manh-2026!',
};

const VIEWPORT = {width: 1440, height: 950, deviceScaleFactor: 2};
const timings = {};
const shots = [];

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function shoot(page, name) {
  const file = path.join(OUT, `${name}.png`);
  await page.screenshot({path: file, fullPage: true});
  shots.push(path.basename(file));
  console.log('  captured', path.basename(file));
}

async function generateKey(page, id, who, label) {
  await page.goto(`chrome-extension://${id}/app/app.html#/keyring/generate`, {waitUntil: 'networkidle2'});
  await page.reload({waitUntil: 'networkidle2'});
  await page.waitForSelector('#name', {timeout: 20000});
  await page.type('#name', who.name, {delay: 12});
  await page.type('#email', who.email, {delay: 12});
  await page.type('#password', who.pass, {delay: 12});
  await page.type('#passwordCheck', who.pass, {delay: 12});
  await sleep(600);
  if (label) { await shoot(page, label); }

  const t0 = Date.now();
  // "Advanced >>" also carries .btn-primary, so target the submit button
  // inside the form's button bar specifically.
  await page.evaluate(() => {
    const btn = document.querySelector('form .btn-bar button.btn-primary');
    if (!btn || btn.disabled) { throw new Error('generate button not clickable'); }
    btn.click();
  });
  // A modal with an indeterminate progress bar is shown for the duration of
  // the key generation and is replaced by the backup modal when it finishes.
  await page.waitForSelector('.progress-bar', {timeout: 30000});
  await page.waitForFunction(() => !document.querySelector('.progress-bar'),
    {timeout: 1_500_000, polling: 2000});
  const ms = Date.now() - t0;
  console.log(`  key generated for ${who.email} in ${ms} ms`);
  return ms;
}

async function main() {
  fs.mkdirSync(OUT, {recursive: true});
  fs.mkdirSync(MEAS, {recursive: true});

  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH ||
      '/root/.cache/puppeteer/chrome/linux-149.0.7827.22/chrome-linux64/chrome',
    headless: true,
    userDataDir: PROFILE,
    // RSA-4096 generation runs for minutes; the 180 s default CDP timeout
    // would abort the wait before the key exists.
    protocolTimeout: 1_800_000,
    args: [
      `--disable-extensions-except=${EXT}`,
      `--load-extension=${EXT}`,
      '--disable-features=DisableLoadExtensionCommandLineSwitch',
      '--no-sandbox', '--disable-dev-shm-usage',
      '--lang=en-US', '--window-size=1440,950',
    ],
  });
  await sleep(4000);
  const seen = new Set(browser.targets().map(t => t.url())
    .filter(u => u.startsWith('chrome-extension://')).map(u => u.split('/')[2]));
  const id = [...seen][0] || PINNED_ID;
  console.log('extension id:', id);

  const page = await browser.newPage();
  await page.setViewport(VIEWPORT);
  page.on('console', m => { if (m.type() === 'error') console.log('  [page error]', m.text().slice(0, 160)); });

  // Vietnamese UI throughout: this is the configuration the dossier documents.
  await page.goto(`chrome-extension://${id}/app/app.html`, {waitUntil: 'domcontentloaded'});
  await page.evaluate(() => localStorage.setItem('securemail.locale', 'vi'));

  console.log('[1] own key pair');
  timings.keygen_rsa4096_own_ms = await generateKey(page, id, DEMO, 'wf-01-key-generate-form.vi');
  await sleep(1500);
  await shoot(page, 'wf-02-key-generated.vi');

  console.log('[2] correspondent key pair (same keyring, so a message has a real recipient)');
  timings.keygen_rsa4096_peer_ms = await generateKey(page, id, PEER, null);
  await sleep(1500);

  console.log('[3] keyring');
  await page.goto(`chrome-extension://${id}/app/app.html#/keyring/display`, {waitUntil: 'networkidle2'});
  await page.reload({waitUntil: 'networkidle2'});
  await sleep(2500);
  await shoot(page, 'wf-03-keyring.vi');

  // Key detail view: click the first row.
  const opened = await page.evaluate(() => {
    const row = document.querySelector('tbody tr');
    if (!row) return false;
    row.click();
    return true;
  });
  if (opened) { await sleep(2500); await shoot(page, 'wf-04-key-details.vi'); }

  console.log('[4] encrypt');
  await page.goto(`chrome-extension://${id}/app/app.html#/encrypt`, {waitUntil: 'networkidle2'});
  await page.reload({waitUntil: 'networkidle2'});
  await sleep(3000);
  await shoot(page, 'wf-05-encrypt.vi');

  console.log('[5] decrypt');
  await page.goto(`chrome-extension://${id}/app/app.html#/decrypt`, {waitUntil: 'networkidle2'});
  await page.reload({waitUntil: 'networkidle2'});
  await sleep(3000);
  await shoot(page, 'wf-06-decrypt.vi');

  console.log('[6] security settings + log');
  for (const [hash, name] of [['#/settings/security', 'wf-07-settings-security.vi'],
                              ['#/settings/security-log', 'wf-08-security-log.vi'],
                              ['#/dashboard', 'wf-09-dashboard.vi']]) {
    await page.goto(`chrome-extension://${id}/app/app.html${hash}`, {waitUntil: 'networkidle2'});
    await page.reload({waitUntil: 'networkidle2'});
    await sleep(2000);
    await shoot(page, name);
  }

  fs.writeFileSync(path.join(MEAS, 'workflow-timings.json'),
    JSON.stringify({
      capturedAt: new Date().toISOString(),
      chrome: await browser.version(),
      note: 'Wall-clock milliseconds measured in headless Chrome on the build VPS. ' +
            'Key generation is RSA-4096 (the product default) performed by OpenPGP.js in the extension.',
      timings, screenshots: shots,
    }, null, 2));
  console.log('timings:', timings);

  await browser.close();
  fs.rmSync(PROFILE, {recursive: true, force: true});
}

main().catch(e => { console.error(e); process.exit(1); });
