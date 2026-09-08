/**
 * Copies the built core host into the app's assets so Metro bundles it.
 * Run after `npm run build:core`.
 */
const fs = require('fs');
const path = require('path');
const src = path.resolve(__dirname, '../../packages/core-host/dist');
const out = path.resolve(__dirname, '../assets/core');
fs.mkdirSync(out, {recursive: true});
for (const file of ['core.html', 'core.bundle.js']) {
  const from = path.join(src, file);
  if (!fs.existsSync(from)) {
    console.error(`missing ${from} — run "npm run build:core" first`);
    process.exit(1);
  }
  fs.copyFileSync(from, path.join(out, file));
  console.log(`copied ${file} (${fs.statSync(from).size} bytes)`);
}
