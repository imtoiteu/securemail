/**
 * Secure Mail — cryptographic benchmark.
 *
 * Measures the operations the product actually performs, using the exact
 * OpenPGP.js build that the extension bundles (node_modules/openpgp, the
 * version pinned in package-lock.json). Numbers are wall-clock medians over
 * repeated runs on one machine; they characterise the implementation, not the
 * hardware of any particular deployment, and the report records the CPU so a
 * reader can judge the scale.
 *
 * Usage: node scripts/benchmark-crypto.mjs [outFile]
 */
import * as openpgp from '../node_modules/openpgp/dist/node/openpgp.mjs';
import fs from 'fs';
import os from 'os';
import path from 'path';

const OUT = process.argv[2] ||
  path.resolve(import.meta.dirname, '../../docs-sangkien/assets/measurements/crypto-benchmark.json');

const PASS = 'benchmark-passphrase';
const median = xs => { const s = [...xs].sort((a, b) => a - b); const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const ms = fn => async (...a) => { const t = process.hrtime.bigint(); const r = await fn(...a);
  return [Number(process.hrtime.bigint() - t) / 1e6, r]; };

async function genKey(cfg) {
  return openpgp.generateKey({
    ...cfg,
    userIDs: [{name: 'Benchmark', email: 'benchmark@donvi.test'}],
    passphrase: PASS,
    format: 'object',
  });
}

async function main() {
  const report = {
    generatedAt: new Date().toISOString(),
    library: `openpgp ${JSON.parse(fs.readFileSync(
      path.resolve(import.meta.dirname, '../node_modules/openpgp/package.json'))).version}`,
    host: {
      cpu: os.cpus()[0]?.model?.trim(),
      cores: os.cpus().length,
      memoryGB: +(os.totalmem() / 1024 ** 3).toFixed(1),
      node: process.version,
      platform: `${os.type()} ${os.release()}`,
    },
    note: 'Median of repeated runs, single-threaded, wall clock in milliseconds.',
    keyGeneration: {},
    messageOperations: {},
  };

  // ---- key generation -------------------------------------------------
  const KEY_CFGS = [
    ['RSA-2048',   {type: 'rsa', rsaBits: 2048}, 3],
    ['RSA-4096',   {type: 'rsa', rsaBits: 4096}, 3],
    ['ECC-Curve25519', {type: 'ecc', curve: 'curve25519'}, 5],
  ];
  for (const [label, cfg, runs] of KEY_CFGS) {
    const samples = [];
    for (let i = 0; i < runs; i++) {
      const [t] = await ms(genKey)(cfg);
      samples.push(+t.toFixed(1));
    }
    report.keyGeneration[label] = {runs, samples, medianMs: +median(samples).toFixed(1)};
    console.log(`keygen ${label.padEnd(16)} median ${median(samples).toFixed(0)} ms  (${samples.join(', ')})`);
  }

  // ---- message operations --------------------------------------------
  // RSA-4096 is the product default, so the throughput figures use it.
  const alice = await genKey({type: 'rsa', rsaBits: 4096});
  const bob = await genKey({type: 'rsa', rsaBits: 4096});
  const alicePriv = await openpgp.decryptKey({privateKey: alice.privateKey, passphrase: PASS});
  const bobPriv = await openpgp.decryptKey({privateKey: bob.privateKey, passphrase: PASS});

  // Attachments are encrypted as binary messages; message bodies as text.
  // Both paths are measured because the product uses both.
  const SIZES = [
    ['1 KB', 1024, 7],
    ['10 KB', 10 * 1024, 7],
    ['100 KB', 100 * 1024, 5],
    ['1 MB', 1024 * 1024, 5],
    ['5 MB', 5 * 1024 * 1024, 3],
  ];
  for (const [label, bytes, runs] of SIZES) {
    // Incompressible random bytes, so the figures are a worst case rather
    // than an artefact of OpenPGP's built-in compression.
    const plaintext = new Uint8Array(bytes);
    for (let i = 0; i < bytes; i += 65536) {
      crypto.getRandomValues(plaintext.subarray(i, Math.min(i + 65536, bytes)));
    }

    const encSamples = [], decSamples = [];
    let armored;
    for (let i = 0; i < runs; i++) {
      const [te, out] = await ms(openpgp.encrypt)({
        message: await openpgp.createMessage({binary: plaintext, filename: 'attachment.bin'}),
        encryptionKeys: bob.publicKey,
        signingKeys: alicePriv,       // the product signs by default
      });
      armored = out;
      encSamples.push(+te.toFixed(1));

      const [td, res] = await ms(openpgp.decrypt)({
        message: await openpgp.readMessage({armoredMessage: armored}),
        decryptionKeys: bobPriv,
        verificationKeys: alice.publicKey,
        format: 'binary',
      });
      decSamples.push(+td.toFixed(1));
      if (res.data.length !== plaintext.length) { throw new Error('round-trip length mismatch'); }
      if (!(await res.signatures[0].verified)) { throw new Error('signature did not verify'); }
    }

    const encMed = median(encSamples), decMed = median(decSamples);
    report.messageOperations[label] = {
      plaintextBytes: bytes,
      ciphertextArmoredBytes: armored.length,
      expansionPercent: +(((armored.length - bytes) / bytes) * 100).toFixed(1),
      encryptSignMedianMs: +encMed.toFixed(1),
      decryptVerifyMedianMs: +decMed.toFixed(1),
      encryptThroughputMBps: +((bytes / 1024 / 1024) / (encMed / 1000)).toFixed(2),
      decryptThroughputMBps: +((bytes / 1024 / 1024) / (decMed / 1000)).toFixed(2),
      runs,
    };
    console.log(`bin ${label.padEnd(7)} enc ${encMed.toFixed(1).padStart(8)} ms  dec ${decMed.toFixed(1).padStart(8)} ms  ` +
                `armored +${report.messageOperations[label].expansionPercent}%`);
  }

  // A realistic Vietnamese message body, to show the latency a user actually
  // perceives when sending mail rather than a file.
  const body = ('Kinh gui dong chi,\n\nNoi dung trao doi duoc bao ve bang ma hoa dau cuoi ' +
    'theo chuan OpenPGP. Tieng Viet co dau: cac ky tu nhu ê, ô, ơ, ư, đ deu duoc ma hoa UTF-8.\n\n').repeat(20);
  const textEnc = [], textDec = [];
  for (let i = 0; i < 7; i++) {
    const [te, out] = await ms(openpgp.encrypt)({
      message: await openpgp.createMessage({text: body}),
      encryptionKeys: bob.publicKey, signingKeys: alicePriv,
    });
    textEnc.push(+te.toFixed(1));
    const [td, res] = await ms(openpgp.decrypt)({
      message: await openpgp.readMessage({armoredMessage: out}),
      decryptionKeys: bobPriv, verificationKeys: alice.publicKey,
    });
    textDec.push(+td.toFixed(1));
    if (res.data !== body) { throw new Error('text round-trip mismatch'); }
    if (i === 6) {
      report.messageOperations['Typical e-mail body (Vietnamese, UTF-8)'] = {
        plaintextBytes: Buffer.byteLength(body, 'utf8'),
        ciphertextArmoredBytes: out.length,
        expansionPercent: +(((out.length - Buffer.byteLength(body, 'utf8')) /
          Buffer.byteLength(body, 'utf8')) * 100).toFixed(1),
        encryptSignMedianMs: +median(textEnc).toFixed(1),
        decryptVerifyMedianMs: +median(textDec).toFixed(1),
        runs: 7,
        note: 'Compressible text, so the armored expansion is far lower than the random-byte cases.',
      };
    }
  }
  console.log(`txt body   enc ${median(textEnc).toFixed(1).padStart(8)} ms  dec ${median(textDec).toFixed(1).padStart(8)} ms`);

  fs.mkdirSync(path.dirname(OUT), {recursive: true});
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log('\nwrote', OUT);
}

main().catch(e => { console.error(e); process.exit(1); });
