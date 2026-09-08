/**
 * Runs the mobile crypto core inside Chromium — the same engine family as the
 * Android System WebView — and exercises the whole RPC surface end to end.
 *
 * This is the closest evidence obtainable without a physical handset: the
 * bundle under test is the one the Android app loads, the engine is the one
 * Android runs it on, and the assertions cover the real operations rather than
 * mocks. What it does NOT cover is the React Native UI layer, Android Keystore,
 * and device-specific behaviour; those are in the device test matrix
 * (Phụ lục kỹ thuật, mục G) and are deliberately not claimed here.
 *
 * Usage: node test/webview-chromium.mjs [outFile]
 */
import puppeteer from '/root/imtoiteu/company-secure-mail/mailvelope/node_modules/puppeteer/lib/puppeteer/puppeteer.js';
import * as openpgp from '/root/imtoiteu/company-secure-mail/mailvelope/node_modules/openpgp/dist/node/openpgp.mjs';
import http from 'http';
import fs from 'fs';
import path from 'path';

const HERE = path.dirname(new URL(import.meta.url).pathname);
const DIST = path.join(HERE, '../packages/core-host/dist');
const OUT = process.argv[2] ||
  '/root/imtoiteu/company-secure-mail/docs-sangkien/assets/measurements/webview-chromium.json';

const PASS = 'CumMatKhau-Manh-2026!';
const results = [];
let failures = 0;

function check(name, detail, ok) {
  results.push({check: name, detail, result: ok ? 'PASS' : 'FAIL'});
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${name} — ${detail}`);
  if (!ok) failures++;
}

// Serve dist/ so the bundle's Content-Security-Policy applies as it does in
// the app; a file:// origin would relax it and weaken the test.
const server = http.createServer((req, res) => {
  const f = path.join(DIST, req.url === '/' ? 'core.html' : req.url.slice(1));
  if (!fs.existsSync(f)) { res.writeHead(404); return res.end(); }
  res.writeHead(200, {'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html'});
  fs.createReadStream(f).pipe(res);
});
await new Promise(r => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}/`;

const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH ||
    '/root/.cache/puppeteer/chrome/linux-149.0.7827.22/chrome-linux64/chrome',
  headless: true,
  protocolTimeout: 1_800_000,
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const page = await browser.newPage();
page.on('pageerror', e => console.log('  [page error]', e.message));
await page.goto(base, {waitUntil: 'networkidle0'});

const version = await browser.version();
console.log('Chromium:', version, '\n');

check('Bundle nạp được trong Chromium',
  'window.SecureMailCore hiện diện sau khi trang tải xong',
  await page.evaluate(() => typeof window.SecureMailCore === 'object'));

const caps = await page.evaluate(() => window.SecureMailCore.probeCapabilities());
check('Năng lực nền tảng đầy đủ',
  caps.ok ? 'crypto.subtle, getRandomValues, TextEncoder, ReadableStream đều có'
          : `thiếu: ${(caps.missing || []).join(', ')}`,
  caps.ok === true);

// Bring up the core with an in-page storage and passphrase provider, exactly
// the two things the native layer supplies over the bridge at run time.
const boot = await page.evaluate(async pass => {
  const mem = new Map();
  window.__store = mem;
  window.__core = await window.SecureMailCore.createCore({
    storage: {
      get: k => mem.get(k) ?? null,
      set: (k, v) => { mem.set(k, v); },
      remove: k => { mem.delete(k); },
    },
    // The provider expects {password, cache}; returning a bare string leaves
    // password undefined, which the unlock loop reads as a wrong passphrase and
    // retries for ever.
    requestPassphrase: async () => ({password: pass, cache: false}),
    manifest: {version: '0.3.0'},
  });
  return Object.keys(window.__core).length > 0;
}, PASS);
check('Khởi tạo lõi mật mã trong WebView', 'createCore trả về API sẵn sàng', boot);

// Two transformations sit between what went in and what comes back, and a
// comparison that applies only one of them fails misleadingly:
//   1. pgpModel.decryptMessage returns `data` as a JS binary string — UTF-8
//      bytes carried one per char code — the documented convention it shares
//      with verifyMessage, so it can be handed to the MIME parser.
//   2. OpenPGP canonicalises text to CRLF line endings (RFC 4880 §5.9).
const norm = s => Buffer
  .from(Array.from(String(s ?? ''), c => c.charCodeAt(0) & 0xff))
  .toString('utf8')
  .replace(/\r\n/g, '\n');

const call = (method, params = {}) => page.evaluate(async (m, p) => {
  try { return {ok: true, result: await window.__core.call(m, p)}; }
  catch (e) { return {ok: false, error: String(e && e.message || e)}; }
}, method, params);

// --- keyring --------------------------------------------------------------
const t0 = Date.now();
const gen = await call('keyring.generateKey', {
  keyAlgo: 'rsa', numBits: 4096, passphrase: PASS,
  userIds: [{fullName: 'Nguyen Van A', email: 'giangvien.a@donvi.test'}],
});
const genMs = Date.now() - t0;
check('Sinh cặp khóa RSA-4096 trong WebView',
  `hoàn tất sau ${genMs} ms`, gen.ok === true);

const t1 = Date.now();
const gen2 = await call('keyring.generateKey', {
  keyAlgo: 'rsa', numBits: 4096, passphrase: PASS,
  userIds: [{fullName: 'Tran Thi B', email: 'hocvien.b@donvi.test'}],
});
const gen2Ms = Date.now() - t1;
check('Sinh cặp khóa thứ hai', `hoàn tất sau ${gen2Ms} ms`, gen2.ok === true);

const keys = await call('keyring.getKeys', {});
check('Liệt kê chùm khóa',
  `${keys.result?.length ?? 0} khóa trong chùm khóa`, keys.result?.length === 2);

const fprA = keys.result?.[0]?.fingerprint;
const details = await call('keyring.getKeyDetails', {fingerprint: fprA});
check('Đọc chi tiết khóa',
  `dấu vân tay ${String(fprA).slice(0, 16).toUpperCase()}…`, details.ok === true);

const exported = await call('keyring.exportKeys', {fingerprints: [fprA], publicOnly: true});
const pubArmored = exported.result?.armored;
check('Xuất khóa công khai',
  'khối BEGIN PGP PUBLIC KEY BLOCK hợp lệ',
  typeof pubArmored === 'string' && pubArmored.includes('BEGIN PGP PUBLIC KEY BLOCK'));

// --- crypto ---------------------------------------------------------------
const PLAINTEXT = 'Báo cáo nghiệp vụ — nội dung mã hóa đầu cuối.\n' +
                  'Ký tự tiếng Việt có dấu: ăâđêôơư ĂÂĐÊÔƠƯ — 1234567890.\n';
const fprB = keys.result?.[1]?.fingerprint;

const t2 = Date.now();
const enc = await call('crypto.encryptMessage', {
  data: PLAINTEXT, encryptionKeyFprs: [fprA, fprB], signingKeyFpr: fprA,
});
const encMs = Date.now() - t2;
const armored = enc.result?.armored;
check('Mã hóa kèm ký số',
  `${encMs} ms, khối bản mã ${armored?.length ?? 0} byte`,
  typeof armored === 'string' && armored.includes('BEGIN PGP MESSAGE'));

const t3 = Date.now();
const dec = await call('crypto.decryptMessage', {armored, senderAddress: 'giangvien.a@donvi.test'});
const decMs = Date.now() - t3;
check('Giải mã và xác minh chữ ký',
  `${decMs} ms, bản rõ đúng từng ký tự, tiếng Việt nguyên vẹn`,
  norm(dec.result?.data) === PLAINTEXT);
check('Chữ ký được xác minh hợp lệ',
  `${dec.result?.signatures?.filter(s => s.valid).length ?? 0} chữ ký hợp lệ`,
  dec.result?.signatures?.some(s => s.valid === true) === true);

// --- independent interoperability -----------------------------------------
// The ciphertext produced inside the WebView is handed to a separate OpenPGP
// implementation running in Node, so the check is not self-referential.
let interopOk = false;
try {
  const restored = await openpgp.readKey({armoredKey: pubArmored});
  interopOk = restored.getFingerprint().toLowerCase() === String(fprA).toLowerCase();
} catch { interopOk = false; }
check('Khóa sinh trong WebView đọc được bằng thư viện độc lập',
  'OpenPGP.js chạy trong Node phân tích đúng khóa và khớp dấu vân tay', interopOk);

// The armored block itself must parse as standard OpenPGP outside the WebView.
let msgOk = false;
try {
  const msg = await openpgp.readMessage({armoredMessage: armored});
  msgOk = msg.getEncryptionKeyIDs().length === 2;
} catch { msgOk = false; }
check('Bản mã sinh trong WebView là OpenPGP chuẩn',
  'thư viện độc lập phân tích được khối và thấy đúng 2 khóa người nhận', msgOk);

// --- lock / unlock --------------------------------------------------------
const locked = await page.evaluate(async () => {
  try { await window.__core.lock(); return {ok: true}; }
  catch (e) { return {ok: false, error: String(e)}; }
});
check('Khóa lại ứng dụng', 'app.lock trả về thành công', locked.ok === true);
const afterLock = await call('crypto.decryptMessage', {armored, senderAddress: 'giangvien.a@donvi.test'});
check('Sau khi khóa vẫn giải mã được khi cung cấp lại cụm mật khẩu',
  'bộ nhớ đệm bị xóa, lõi yêu cầu lại cụm mật khẩu qua bridge',
  norm(afterLock.result?.data) === PLAINTEXT);

// --- preferences ----------------------------------------------------------
const prefs = await call('prefs.get', {});
check('Đọc tùy chọn', 'prefs.get trả về cấu hình', prefs.ok === true);

const report = {
  generatedAt: new Date().toISOString(),
  engine: version,
  note: 'Lõi mật mã của bản di động chạy trong Chromium — cùng họ engine với ' +
        'Android System WebView. Không bao gồm tầng giao diện React Native, ' +
        'Android Keystore và hành vi đặc thù thiết bị (xem Phụ lục kỹ thuật, mục G).',
  timings: {keygenRsa4096Ms: genMs, keygenRsa4096SecondMs: gen2Ms,
            encryptSignMs: encMs, decryptVerifyMs: decMs},
  results,
  summary: failures === 0 ? 'ALL PASS' : `${failures} FAILED`,
};
fs.mkdirSync(path.dirname(OUT), {recursive: true});
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
console.log(`\n${report.summary} -> ${OUT}`);

await browser.close();
server.close();
process.exit(failures ? 1 : 0);
