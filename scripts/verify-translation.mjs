/**
 * Secure Mail — Vietnamese localisation audit.
 *
 * Checks the Vietnamese catalogue against English on the properties that
 * actually break a UI when a translation is wrong, rather than on word count:
 *
 *   1. Coverage      — every key English defines must exist in Vietnamese.
 *   2. Placeholders  — $1/$2/$3 substitution slots must survive translation,
 *                      or a message loses the value it was meant to show.
 *   3. Markup slots  — <0>…</0> component tags consumed by <Trans> must match,
 *                      or React renders the wrong element tree.
 *   4. Terminology   — security terms must be translated consistently; the
 *                      same English term rendered two ways teaches two
 *                      different concepts to a learner.
 *   5. Untranslated  — values identical to English that are not proper nouns.
 *
 * Usage: node scripts/verify-translation.mjs [outFile]
 */
import fs from 'fs';
import path from 'path';

const ROOT = path.resolve(import.meta.dirname, '..');
const OUT = process.argv[2] ||
  path.resolve(ROOT, '../docs-sangkien/assets/measurements/translation-audit.json');

const en = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales/en/messages.json'), 'utf8'));
const vi = JSON.parse(fs.readFileSync(path.join(ROOT, 'locales/vi/messages.json'), 'utf8'));

/** Terms that must map to exactly one Vietnamese rendering across the UI. */
const GLOSSARY = {
  'private key': 'khóa riêng tư',
  'public key': 'khóa công khai',
  'key pair': 'cặp khóa',
  'keyring': 'chùm khóa',
  'passphrase': 'cụm mật khẩu',
  'fingerprint': 'dấu vân tay',
  'revoke': 'thu hồi',
  'encrypt': 'mã hóa',
  'decrypt': 'giải mã',
  'signature': 'chữ ký',
  'verify': 'xác minh',
  'backup': 'sao lưu',
  'subkey': 'khóa phụ',
};

/**
 * Deliberate deviations from the glossary, with the reason. The keyring screen
 * is labelled "Quản lý khóa" (key management) rather than the literal "chùm
 * khóa" because it names a task the user performs, not the data structure;
 * "chùm khóa" is used in explanatory text where the concept is what matters.
 */
const ACCEPTED_EXCEPTIONS = {
  keyring: ['action_menu_keyring_label', 'keybackup_load_error'],
};

/** Values legitimately identical in both languages. */
const PROPER_NOUNS = /^(Secure Mail|OpenPGP|OpenPGP\.js|GnuPG|Gmail|Google|PGP|Autocrypt|Mailvelope.*|WKD|Email|API|ID|OK|UTF-8)$/i;

const slots = s => (s.match(/\$\d/g) || []).sort().join(',');
const tags = s => (s.match(/<\/?\d>/g) || []).sort().join(',');

const findings = {missing: [], placeholderMismatch: [], markupMismatch: [], untranslated: [], glossary: []};

for (const [key, entry] of Object.entries(en)) {
  const src = entry.message;
  const dst = vi[key]?.message;
  if (dst === undefined) { findings.missing.push(key); continue; }
  if (slots(src) !== slots(dst)) {
    findings.placeholderMismatch.push({key, en: slots(src) || '(none)', vi: slots(dst) || '(none)'});
  }
  if (tags(src) !== tags(dst)) {
    findings.markupMismatch.push({key, en: tags(src) || '(none)', vi: tags(dst) || '(none)'});
  }
  if (src === dst && src.length > 3 && !PROPER_NOUNS.test(src.trim())) {
    findings.untranslated.push({key, value: src.slice(0, 70)});
  }
}

// Glossary consistency: wherever English uses a term, Vietnamese must use the
// agreed rendering. Reported only when the English term is present but the
// Vietnamese equivalent is absent from that same message.
for (const [term, expected] of Object.entries(GLOSSARY)) {
  const offenders = [];
  for (const [key, entry] of Object.entries(en)) {
    const dst = vi[key]?.message;
    if (!dst) continue;
    if (!new RegExp(`\\b${term}s?\\b`, 'i').test(entry.message)) continue;
    // "encrypt"/"decrypt" also appear inside longer Vietnamese words; a simple
    // substring test is the right check here.
    if (ACCEPTED_EXCEPTIONS[term]?.includes(key)) continue;
    if (!dst.toLowerCase().includes(expected.toLowerCase())) {
      offenders.push({key, vi: dst.slice(0, 80)});
    }
  }
  if (offenders.length) {
    findings.glossary.push({term, expected, count: offenders.length, examples: offenders.slice(0, 3)});
  }
}

const extraKeys = Object.keys(vi).filter(k => !(k in en));
const report = {
  generatedAt: new Date().toISOString(),
  counts: {
    englishKeys: Object.keys(en).length,
    vietnameseKeys: Object.keys(vi).length,
    coveragePercent: +((1 - findings.missing.length / Object.keys(en).length) * 100).toFixed(2),
    keysOnlyInVietnamese: extraKeys.length,
  },
  otherLocales: Object.fromEntries(
    fs.readdirSync(path.join(ROOT, 'locales'))
      .filter(d => fs.existsSync(path.join(ROOT, 'locales', d, 'messages.json')))
      .map(d => [d, Object.keys(JSON.parse(
        fs.readFileSync(path.join(ROOT, 'locales', d, 'messages.json'), 'utf8'))).length])
  ),
  blocking: {
    missingKeys: findings.missing.length,
    placeholderMismatches: findings.placeholderMismatch.length,
    markupMismatches: findings.markupMismatch.length,
  },
  acceptedExceptions: ACCEPTED_EXCEPTIONS,
  advisory: {
    untranslatedValues: findings.untranslated.length,
    glossaryDeviations: findings.glossary.reduce((n, g) => n + g.count, 0),
  },
  details: findings,
};

fs.mkdirSync(path.dirname(OUT), {recursive: true});
fs.writeFileSync(OUT, JSON.stringify(report, null, 2));

console.log(`English keys      : ${report.counts.englishKeys}`);
console.log(`Vietnamese keys   : ${report.counts.vietnameseKeys}`);
console.log(`Coverage          : ${report.counts.coveragePercent}%`);
console.log(`Missing           : ${findings.missing.length}`);
console.log(`Placeholder errors: ${findings.placeholderMismatch.length}`);
console.log(`Markup errors     : ${findings.markupMismatch.length}`);
console.log(`Untranslated      : ${findings.untranslated.length}`);
console.log(`Glossary deviations: ${report.advisory.glossaryDeviations}`);
console.log('\nOther locales:', JSON.stringify(report.otherLocales));
console.log('wrote', OUT);

const blocking = Object.values(report.blocking).reduce((a, b) => a + b, 0);
process.exit(blocking === 0 ? 0 : 1);
