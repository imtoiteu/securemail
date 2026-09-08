# -*- coding: utf-8 -*-
"""
Cross-reference and numbering audit for the dossier.

Checks the things that silently rot when a document is edited: table and
figure numbers running out of order, references pointing at a number that
does not exist, and section references pointing at a missing section.
"""
import os
import re
import sys

DOCS = ['00-TOM-TAT-SANG-KIEN.md', '01-DON-DANG-KY-SANG-KIEN.md',
        '02-THUYET-MINH-SANG-KIEN.md', '03-PHU-LUC-KY-THUAT.md',
        '04-DU-KIEN-HIEU-QUA.md']
ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
problems = []

# Sections defined by the technical appendix, so cross-document references
# from the main document can be resolved.
APPENDIX_SECTIONS = set(re.findall(
    r'^#{1,4}\s+([A-Z]\.?\d*(?:\.\d+)*)\.',
    open(os.path.join(ROOT, '03-PHU-LUC-KY-THUAT.md'), encoding='utf-8').read(), re.M))


def check(doc):
    path = os.path.join(ROOT, doc)
    text = open(path, encoding='utf-8').read()

    # --- tables ---------------------------------------------------------
    caps = re.findall(r'^\^table:\s*(?:Bảng|Bảng)\s*([A-Z]?\.?\d+(?:\.\d+)?)\.', text, re.M)
    plain = re.findall(r'^\^table:\s*(.*)$', text, re.M)
    unnumbered = [c for c in plain if not re.match(r'Bảng\s*[A-Z]?\.?\d', c)]
    nums = []
    for c in caps:
        nums.append(c)
    # sequential check for plain integers
    ints = [int(n) for n in nums if n.isdigit()]
    for a, b in zip(ints, ints[1:]):
        if b != a + 1:
            problems.append(f'{doc}: bảng số {a} rồi tới {b} — không liên tiếp')

    refs = set(re.findall(r'Bảng\s+([A-Z]?\.?\d+(?:\.\d+)?)', text))
    defined = set(nums)
    for r in sorted(refs - defined):
        problems.append(f'{doc}: tham chiếu "Bảng {r}" nhưng không có bảng số đó')

    # --- figures --------------------------------------------------------
    figs = re.findall(r'^!fig\[(?:Hình)\s*([A-Z]?\.?\d+(?:\.\d+)?)\.\s*(.*?)\]\((.*?)\)', text, re.M)
    fnums = [f[0] for f in figs]
    fints = [int(n) for n in fnums if n.isdigit()]
    for a, b in zip(fints, fints[1:]):
        if b != a + 1:
            problems.append(f'{doc}: hình số {a} rồi tới {b} — không liên tiếp')
    frefs = set(re.findall(r'Hình\s+([A-Z]?\.?\d+(?:\.\d+)?)', text))
    for r in sorted(frefs - set(fnums)):
        problems.append(f'{doc}: tham chiếu "Hình {r}" nhưng không có hình số đó')

    # --- image files exist ---------------------------------------------
    for _, _, rel in figs:
        if not os.path.exists(os.path.join(ROOT, rel)):
            problems.append(f'{doc}: thiếu tệp ảnh {rel}')

    # --- section references --------------------------------------------
    secs = set()
    for m in re.finditer(r'^#{1,4}\s+(?:PHẦN\s+[IVX]+\.\s*)?([A-Z]?\.?\d+(?:\.\d+)*)\.', text, re.M):
        secs.add(m.group(1))
    # A reference preceded by "Phụ lục kỹ thuật," points into the appendix
    # document, so resolve it against that document's sections instead.
    cross = set(re.findall(r'Phụ lục kỹ thuật,\s*mục\s+([A-Z]?\.?\d+(?:\.\d+)*)', text))
    srefs = set(re.findall(r'[Mm]ục\s+([A-Z]?\.?\d+(?:\.\d+)*)', text)) - cross
    for r in sorted(srefs - secs):
        problems.append(f'{doc}: tham chiếu "mục {r}" nhưng không có mục đó')
    for r in sorted(cross - APPENDIX_SECTIONS):
        problems.append(f'{doc}: tham chiếu "Phụ lục kỹ thuật, mục {r}" nhưng phụ lục không có mục đó')

    print(f'{doc}: {len(nums)} bảng, {len(figs)} hình, {len(secs)} mục đánh số')
    if unnumbered:
        for u in unnumbered:
            print(f'   (bảng không đánh số: {u[:60]})')


for d in DOCS:
    check(d)

print()
if problems:
    print(f'{len(problems)} VẤN ĐỀ:')
    for p in problems:
        print('  -', p)
    sys.exit(1)
print('Không phát hiện vấn đề về đánh số và tham chiếu.')
