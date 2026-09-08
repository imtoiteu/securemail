/**
 * Renders the Android interface design to PNG, one file per screen.
 *
 * These are interface designs, not screenshots of a running build: the Android
 * UI layer is the next implementation stage. They are captured at a real phone
 * viewport (393 x 852 at 3x) so the layout, type sizes and touch targets are
 * the ones the implementation has to hit, rather than a sketch that later turns
 * out not to fit.
 *
 * Usage: node capture.mjs [outDir]
 */
import puppeteer from '/root/imtoiteu/company-secure-mail/mailvelope/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import path from 'path';
import fs from 'fs';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const OUT = process.argv[2] || path.resolve(HERE, '../../assets/mobile-design');

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ||
    '/root/.cache/puppeteer/chrome/linux-149.0.7827.22/chrome-linux64/chrome',
  headless: true,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'],
});

fs.mkdirSync(OUT, { recursive: true });
const page = await browser.newPage();
await page.setViewport({ width: 1400, height: 1000, deviceScaleFactor: 3 });
await page.goto('file://' + path.join(HERE, 'screens.html'), { waitUntil: 'networkidle0' });
await new Promise(r => setTimeout(r, 800));

const ids = await page.evaluate(() => window.__SCREENS__);
for (const id of ids) {
  const el = await page.$('#' + id);
  await el.screenshot({ path: path.join(OUT, id + '.png') });
  console.log('captured', id + '.png');
}
console.log(`\n${ids.length} screens -> ${OUT}`);
await browser.close();
