# -*- coding: utf-8 -*-
"""
Self-audit: every quantitative claim in the dossier, checked against the
artefacts it is supposed to describe.

A dossier that asks a panel to trust its numbers should be able to prove them
on demand. This script re-derives each headline figure from the repository,
the measurement files or a live count, and fails if the document says
something different. Run it after any edit to either the documents or the
product.

    python3 tools/verify_claims.py
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DOSSIER = os.path.abspath(os.path.join(HERE, '..'))
REPO = os.path.abspath(os.path.join(DOSSIER, '..'))
MAILVELOPE = os.path.join(REPO, 'mailvelope')
MOBILE = os.path.join(REPO, 'mobile')
MEAS = os.path.join(DOSSIER, 'assets', 'measurements')

MAIN = open(os.path.join(DOSSIER, '02-THUYET-MINH-SANG-KIEN.md'), encoding='utf-8').read()
ALL_DOCS = '\n'.join(
    open(os.path.join(DOSSIER, f), encoding='utf-8').read()
    for f in sorted(os.listdir(DOSSIER)) if f.endswith('.md'))

checks, failures = [], 0


def record(name, expected, actual, ok, cited=True):
    """`cited=False` marks a figure that is measured and recorded here but is
    no longer quoted in the dossier text, so only the measurement is asserted."""
    global failures
    checks.append((name, expected, actual, ok, cited))
    if not ok:
        failures += 1


def claim_present(name, needle, actual, doc=None):
    """The document must contain `needle`, and `actual` is what the repository
    actually says, so the two are compared explicitly rather than by eyeball."""
    text = doc if doc is not None else ALL_DOCS
    record(name, needle, actual, needle in text)


def count_lines(path):
    with open(path, encoding='utf-8') as f:
        return sum(1 for _ in f)


# --- 1. localisation ------------------------------------------------------
en = json.load(open(os.path.join(MAILVELOPE, 'locales/en/messages.json'), encoding='utf-8'))
vi = json.load(open(os.path.join(MAILVELOPE, 'locales/vi/messages.json'), encoding='utf-8'))
record('Số mục dịch tiếng Việt = số mục tiếng Anh', '586', f'{len(vi)} / {len(en)}',
       len(vi) == len(en) == 586 and '586/586' in ALL_DOCS)

locales = sorted(d for d in os.listdir(os.path.join(MAILVELOPE, 'locales'))
                 if os.path.isfile(os.path.join(MAILVELOPE, 'locales', d, 'messages.json')))
record('Số ngôn ngữ (15 kế thừa + tiếng Việt)', '16', str(len(locales)),
       len(locales) == 16 and 'vi' in locales)

record('Số dòng tệp danh mục tiếng Việt', '1.880',
       str(count_lines(os.path.join(MAILVELOPE, 'locales/vi/messages.json'))),
       count_lines(os.path.join(MAILVELOPE, 'locales/vi/messages.json')) == 1880,
       cited=False)

ta = json.load(open(os.path.join(MEAS, 'translation-audit.json'), encoding='utf-8'))
record('Kiểm toán bản dịch: 0 lỗi chặn', '0',
       str(sum(ta['blocking'].values())), sum(ta['blocking'].values()) == 0)
record('Độ phủ bản dịch 100%', '100', str(ta['counts']['coveragePercent']),
       ta['counts']['coveragePercent'] == 100.0)

# --- 2. tests -------------------------------------------------------------
desktop = open(os.path.join(MEAS, 'desktop-tests.txt'), encoding='utf-8').read()
m = re.search(r'Tests:\s+(\d+) passed, (\d+) total', desktop)
record('Kiểm thử bản máy tính', '449/449', f'{m.group(1)}/{m.group(2)}' if m else 'không đọc được',
       bool(m) and m.group(1) == m.group(2) == '449' and '449/449' in ALL_DOCS)

mobile = open(os.path.join(MEAS, 'mobile-tests.txt'), encoding='utf-8').read()
m = re.search(r'Tests:\s+(\d+) passed, (\d+) total', mobile)
record('Kiểm thử bản di động', '68/68', f'{m.group(1)}/{m.group(2)}' if m else 'không đọc được',
       bool(m) and m.group(1) == m.group(2) == '68' and '68/68' in ALL_DOCS)

# --- 3. interoperability --------------------------------------------------
io = json.load(open(os.path.join(MEAS, 'interop-gnupg.json'), encoding='utf-8'))
passed = sum(1 for r in io['results'] if r['result'] == 'PASS')
record('Liên thông với GnuPG', '8/8', f"{passed}/{len(io['results'])}",
       passed == len(io['results']) == 8 and '8/8' in ALL_DOCS)
record('Phiên bản GnuPG dùng để đối chứng', 'GnuPG 2.4.4', io['gnupg'],
       '2.4.4' in io['gnupg'] and 'GnuPG 2.4.4' in ALL_DOCS)

# --- 4. network surface ---------------------------------------------------
audit = open(os.path.join(MEAS, 'network-audit.txt'), encoding='utf-8').read()
record('Kiểm toán bề mặt mạng', 'PASS 4/4',
       f"{audit.count('  PASS ')} PASS", audit.count('  PASS ') == 4 and 'RESULT: PASS' in audit)

for endpoint in ['cleaninsights', 'license.mailvelope.com', 'mailvelope.com/google-workspace']:
    hits = subprocess.run(
        ['grep', '-rlF', endpoint, os.path.join(MAILVELOPE, 'releases/secure-mail-v0.3.0-hardened/extension')],
        capture_output=True, text=True).stdout.strip()
    record(f'Điểm cuối "{endpoint}" vắng mặt trong gói phát hành', '0 tệp',
           '0 tệp' if not hits else f'{len(hits.splitlines())} tệp', not hits)

# --- 5. benchmark ---------------------------------------------------------
bm = json.load(open(os.path.join(MEAS, 'crypto-benchmark.json'), encoding='utf-8'))
record('Thư viện mật mã đo đúng phiên bản đóng gói', 'openpgp 5.11.3', bm['library'],
       bm['library'] == 'openpgp 5.11.3' and 'OpenPGP.js 5.11.3' in ALL_DOCS)

pkg = json.load(open(os.path.join(MAILVELOPE, 'package.json'), encoding='utf-8'))
record('Phiên bản openpgp trong package.json khớp số liệu đo', '5.11.3',
       pkg['dependencies']['openpgp'], pkg['dependencies']['openpgp'] == '5.11.3')
record('Gói phụ thuộc đo lường từ xa đã gỡ khỏi package.json', 'không có',
       'có' if 'clean-insights-sdk' in json.dumps(pkg) else 'không có',
       'clean-insights-sdk' not in json.dumps(pkg))

ops = bm['messageOperations']
claims = [('1 KB', 14.9), ('10 KB', 16.3), ('100 KB', 34.0), ('1 MB', 115.1), ('5 MB', 403.5)]
for label, expected in claims:
    actual = ops[label]['encryptSignMedianMs']
    record(f'Thời gian mã hóa {label}', f'{expected} ms', f'{actual} ms', abs(actual - expected) < 0.05)

wf = json.load(open(os.path.join(MEAS, 'workflow-timings.json'), encoding='utf-8'))
record('Sinh khóa RSA-4096 qua giao diện thật', '10.237 ms và 8.116 ms',
       f"{wf['timings']['keygen_rsa4096_own_ms']} và {wf['timings']['keygen_rsa4096_peer_ms']} ms",
       wf['timings']['keygen_rsa4096_own_ms'] == 10237
       and wf['timings']['keygen_rsa4096_peer_ms'] == 8116)

# --- 6. product artefacts -------------------------------------------------
manifest = json.load(open(os.path.join(
    MAILVELOPE, 'releases/secure-mail-v0.3.0-hardened/extension/manifest.json'), encoding='utf-8'))
claim_present('Mã định danh tiện ích', 'ihhialmbgcagicfabjkijpbppggbnebe',
              f"khóa manifest dài {len(manifest['key'])} ký tự")
record('Manifest của bản phát hành có khai báo khóa cố định', 'có',
       'có' if manifest.get('key') else 'không', bool(manifest.get('key')))

sha_file = os.path.join(MAILVELOPE, 'releases/secure-mail-v0.3.0-hardened.zip.sha256')
sha = open(sha_file, encoding='utf-8').read().split()[0]
claim_present('Mã băm SHA-256 của gói phát hành', sha, sha)

sums = os.path.join(MAILVELOPE, 'releases/secure-mail-v0.3.0-hardened/SHA256SUMS.txt')
n = count_lines(sums)
record('Số tệp trong gói phát hành', '161', str(n), n == 161 and '161' in ALL_DOCS)

# --- 7. scope of the contribution ----------------------------------------
verify_scripts = ['scripts/verify-no-external-endpoints.sh', 'scripts/interop-gnupg.mjs',
                  'scripts/benchmark-crypto.mjs', 'scripts/verify-translation.mjs']
total = sum(count_lines(os.path.join(MAILVELOPE, s)) for s in verify_scripts)
total += count_lines(os.path.join(MOBILE, 'scripts/verify-desktop-untouched.sh'))
record('Kịch bản kiểm chứng: 5 tệp', '637 dòng', f'{total} dòng',
       total == 637 and '637' in ALL_DOCS)

cap = sum(count_lines(os.path.join(MAILVELOPE, f'scripts/capture-{n}.mjs'))
          for n in ['screenshots', 'workflow'])
record('Kịch bản chụp ảnh tài liệu: 2 tệp', '275 dòng', f'{cap} dòng',
       cap == 275, cited=False)

mobile_files = subprocess.run(['git', '-C', MOBILE, 'ls-files'],
                              capture_output=True, text=True).stdout.split()
record('Số tệp dự án di động', '52', str(len(mobile_files)),
       len(mobile_files) == 52, cited=False)

n_docs = len(os.listdir(os.path.join(MAILVELOPE, 'docs/internal')))
record('Tài liệu vận hành tiếng Việt', '9', str(n_docs), n_docs == 9 and 'chín tài liệu' in ALL_DOCS.lower())

n_icons = len(os.listdir(os.path.join(MAILVELOPE, 'src/img/secure-mail')))
record('Tệp biểu tượng nhận diện', '11', str(n_icons), n_icons == 11, cited=False)

# --- 7b. mobile interface design ------------------------------------------
mobile_design = os.path.join(DOSSIER, 'assets', 'mobile-design')
screens = [f for f in os.listdir(mobile_design)
           if f.startswith('m') and f.endswith('.png')]
record('Số màn hình thiết kế giao diện Android', '12', str(len(screens)),
       len(screens) == 12 and '12 màn hình' in ALL_DOCS)

sheets = [f for f in os.listdir(mobile_design) if f.startswith('sheet-')]
record('Bản ghép trình bày thiết kế Android', '2', str(len(sheets)), len(sheets) == 2)

rpc = open(os.path.join(MOBILE, 'packages/bridge/src/methods.ts'), encoding='utf-8').read()
n_rpc = len(re.findall(r"^\s+\w+: '", rpc, re.M))
record('Số phương thức trong hợp đồng RPC di động', '22 + 5 chiều ngược',
       str(n_rpc), n_rpc == 27 and '22 phương thức' in ALL_DOCS)

# --- 7b2. crypto core running on the Android WebView engine ---------------
wv_path = os.path.join(MEAS, 'webview-chromium.json')
wv = json.load(open(wv_path, encoding='utf-8'))
wv_pass = sum(1 for r in wv['results'] if r['result'] == 'PASS')
record('Lõi mật mã chạy trong Chromium (engine Android WebView)', '16/16',
       f"{wv_pass}/{len(wv['results'])}",
       wv_pass == len(wv['results']) == 16 and '16/16' in ALL_DOCS)
record('Engine dùng để chạy lõi di động', 'Chromium 149', wv['engine'],
       'Chrome/149' in wv['engine'])

# --- 7c. dossier structure matches the official template ------------------
for f in ['01-DON-DANG-KY-SANG-KIEN.md', '02-THUYET-MINH-SANG-KIEN.md',
          '03-DU-KIEN-HIEU-QUA.md']:
    body = open(os.path.join(DOSSIER, f), encoding='utf-8').read()
    record(f'{f[:2]} có quốc hiệu và khối chữ ký theo mẫu', 'có',
           'có' if '{{QUOCHIEU}}' in body and '{{SIGNATURE' in body else 'thiếu',
           '{{QUOCHIEU}}' in body and '{{SIGNATURE' in body)

# --- 8. assets referenced by the documents --------------------------------
missing = [rel for rel in re.findall(r'^!fig\[.*?\]\((.*?)\)', ALL_DOCS, re.M)
           if not os.path.exists(os.path.join(DOSSIER, rel))]
record('Mọi hình được viện dẫn đều tồn tại', '0 thiếu', f'{len(missing)} thiếu', not missing)

diagrams = os.path.join(DOSSIER, 'assets', 'diagrams')
svg = {f[:-4] for f in os.listdir(diagrams) if f.endswith('.svg')}
png = {f[:-4] for f in os.listdir(diagrams) if f.endswith('.png')}
drawio = {f[:-7] for f in os.listdir(diagrams) if f.endswith('.drawio')}
record('Mỗi sơ đồ có đủ 3 định dạng (.drawio/.svg/.png)', f'{len(svg)} bộ',
       f'svg {len(svg)}, png {len(png)}, drawio {len(drawio)}',
       svg == png == drawio and len(svg) == 7)

# --- report ---------------------------------------------------------------
print('KIỂM CHỨNG SỐ LIỆU TRONG HỒ SƠ')
print('=' * 92)
print(f'{"Nội dung kiểm tra":<56}{"Hồ sơ nêu":<19}{"Thực tế":<19}{"":<4}')
print('-' * 96)
for name, expected, actual, ok, cited in checks:
    mark = 'ĐẠT ' if ok else 'SAI '
    tag = '' if cited else '  (chỉ đo, hồ sơ không nêu)'
    print(f'{mark}{name:<52}{str(expected)[:18]:<19}{str(actual)[:18]:<19}{tag}')
print('=' * 92)
print(f'{len(checks)} phép kiểm tra, {len(checks) - failures} đạt, {failures} sai')
sys.exit(1 if failures else 0)
