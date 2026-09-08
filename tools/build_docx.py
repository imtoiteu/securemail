# -*- coding: utf-8 -*-
"""
Markdown -> DOCX for the Secure Mail innovation dossier.

The dossier is authored in Markdown so it stays diffable, reviewable and
editable, and rendered to DOCX here with the layout Vietnamese administrative
documents use (Thông tư 01/2011/TT-BNV): Times New Roman 13 pt, 1.5 line
spacing, margins 30/20/20/20 mm, first-line indent 1.0 cm, page numbers in the
footer.

Supported Markdown subset
    ---                     front-matter fence (YAML-ish key: value)
    # .. ####               headings (## are numbered automatically)
    paragraph text          with **bold**, *italic*, `code`
    - item / 1. item        lists (one level)
    | a | b |               tables, first row is the header
    !fig[caption](path)     figure: image, centred, auto-numbered caption
    > text                  callout box (shaded, boxed)
    ```code```              monospace block
    <!--pagebreak-->        hard page break
    {{TOC}}                 table of contents field
    {{SIGNATURE}}           two-column signature block
"""
import os
import re
import sys

from docx import Document
from docx.enum.section import WD_SECTION
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.text import WD_ALIGN_PARAGRAPH, WD_BREAK, WD_LINE_SPACING
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from docx.shared import Cm, Mm, Pt, RGBColor

BODY_FONT = 'Times New Roman'
MONO_FONT = 'Consolas'
BODY_SIZE = Pt(13)
ACCENT = RGBColor(0x1D, 0x4E, 0xD8)
MUTED = RGBColor(0x47, 0x55, 0x69)


# --------------------------------------------------------------- helpers ---
def _shade(element, fill):
    shd = OxmlElement('w:shd')
    shd.set(qn('w:val'), 'clear')
    shd.set(qn('w:color'), 'auto')
    shd.set(qn('w:fill'), fill)
    element.append(shd)


def _border(pPr, colour='CBD5E1', size='6', sides=('top', 'left', 'bottom', 'right')):
    pbdr = OxmlElement('w:pBdr')
    for side in sides:
        el = OxmlElement(f'w:{side}')
        el.set(qn('w:val'), 'single')
        el.set(qn('w:sz'), size)
        el.set(qn('w:space'), '6')
        el.set(qn('w:color'), colour)
        pbdr.append(el)
    pPr.append(pbdr)


def _field(paragraph, instr):
    r = paragraph.add_run()
    fld = OxmlElement('w:fldChar'); fld.set(qn('w:fldCharType'), 'begin'); r._r.append(fld)
    r = paragraph.add_run()
    it = OxmlElement('w:instrText'); it.set(qn('xml:space'), 'preserve'); it.text = instr
    r._r.append(it)
    r = paragraph.add_run()
    fld = OxmlElement('w:fldChar'); fld.set(qn('w:fldCharType'), 'separate'); r._r.append(fld)
    r = paragraph.add_run('…')
    r = paragraph.add_run()
    fld = OxmlElement('w:fldChar'); fld.set(qn('w:fldCharType'), 'end'); r._r.append(fld)


INLINE = re.compile(r'(\*\*.+?\*\*|\*[^*]+?\*|`[^`]+?`)')


def add_runs(paragraph, text, size=BODY_SIZE, colour=None, base_bold=False, base_italic=False):
    for part in INLINE.split(text):
        if not part:
            continue
        bold, italic, mono = base_bold, base_italic, False
        if part.startswith('**') and part.endswith('**') and len(part) > 4:
            part, bold = part[2:-2], True
        elif part.startswith('*') and part.endswith('*') and len(part) > 2:
            part, italic = part[1:-1], True
        elif part.startswith('`') and part.endswith('`') and len(part) > 2:
            part, mono = part[1:-1], True
        run = paragraph.add_run(part)
        run.bold, run.italic = bold, italic
        run.font.name = MONO_FONT if mono else BODY_FONT
        run.font.size = Pt(11.5) if mono else size
        if colour is not None:
            run.font.color.rgb = colour
        rpr = run._element.get_or_add_rPr()
        rf = OxmlElement('w:rFonts')
        name = MONO_FONT if mono else BODY_FONT
        for a in ('w:ascii', 'w:hAnsi', 'w:cs'):
            rf.set(qn(a), name)
        rpr.append(rf)
    return paragraph


class Builder:
    def __init__(self, meta):
        self.meta = meta
        self.doc = Document()
        self.fig_no = 0
        self.tbl_no = 0
        self.h2_no = 0
        self.h3_no = 0
        self._setup()

    # ------------------------------------------------------------ layout ---
    def _setup(self):
        s = self.doc.sections[0]
        s.page_height, s.page_width = Mm(297), Mm(210)
        s.top_margin, s.bottom_margin = Mm(20), Mm(20)
        s.left_margin, s.right_margin = Mm(30), Mm(20)

        st = self.doc.styles['Normal']
        st.font.name = BODY_FONT
        st.font.size = BODY_SIZE
        rf = st.element.rPr.rFonts
        for a in ('w:ascii', 'w:hAnsi', 'w:cs', 'w:eastAsia'):
            rf.set(qn(a), BODY_FONT)
        pf = st.paragraph_format
        pf.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
        pf.space_after = Pt(6)
        pf.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY

    def footer(self, text):
        # The cover carries neither header nor footer.
        self.doc.sections[0].different_first_page_header_footer = True
        p = self.doc.sections[0].footer.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_runs(p, text + '  |  Trang ', size=Pt(10), colour=MUTED)
        _field(p, ' PAGE ')

    def header(self, text):
        self.doc.sections[0].different_first_page_header_footer = True
        p = self.doc.sections[0].header.paragraphs[0]
        p.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        add_runs(p, text, size=Pt(9.5), colour=MUTED, base_italic=True)

    # ------------------------------------------------------------ blocks ---
    def para(self, text, indent=True, align=WD_ALIGN_PARAGRAPH.JUSTIFY, size=BODY_SIZE,
             colour=None, italic=False, space_after=6):
        p = self.doc.add_paragraph()
        p.alignment = align
        p.paragraph_format.space_after = Pt(space_after)
        if indent:
            p.paragraph_format.first_line_indent = Cm(1.0)
        add_runs(p, text, size=size, colour=colour, base_italic=italic)
        return p

    def heading(self, level, text):
        p = self.doc.add_paragraph()
        p.paragraph_format.space_before = Pt(16 if level <= 2 else 10)
        p.paragraph_format.space_after = Pt(6)
        p.paragraph_format.keep_with_next = True
        sizes = {1: 16, 2: 14, 3: 13, 4: 13}
        colours = {1: ACCENT, 2: ACCENT, 3: RGBColor(0x0F, 0x17, 0x2A), 4: RGBColor(0x0F, 0x17, 0x2A)}
        if level == 1:
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_runs(p, text, size=Pt(sizes[level]), colour=colours[level],
                 base_bold=True, base_italic=(level == 4))
        # Outline level so the TOC field picks it up.
        pPr = p._p.get_or_add_pPr()
        ol = OxmlElement('w:outlineLvl'); ol.set(qn('w:val'), str(level - 1)); pPr.append(ol)
        return p

    def bullet(self, text, numbered=False, level=0):
        p = self.doc.add_paragraph(style='List Number' if numbered else 'List Bullet')
        p.paragraph_format.left_indent = Cm(0.8 + 0.7 * level)
        p.paragraph_format.space_after = Pt(3)
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.ONE_POINT_FIVE
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        add_runs(p, text)
        return p

    def callout(self, lines):
        p = self.doc.add_paragraph()
        p.paragraph_format.left_indent = Cm(0.4)
        p.paragraph_format.right_indent = Cm(0.4)
        p.paragraph_format.space_before = Pt(8)
        p.paragraph_format.space_after = Pt(10)
        pPr = p._p.get_or_add_pPr()
        _shade(pPr, 'F1F5F9')
        _border(pPr, colour='94A3B8', size='8', sides=('left',))
        for i, ln in enumerate(lines):
            if i:
                p.add_run().add_break()
            add_runs(p, ln, size=Pt(12.5), colour=RGBColor(0x1E, 0x29, 0x3B))
        return p

    def code(self, text):
        p = self.doc.add_paragraph()
        p.paragraph_format.left_indent = Cm(0.5)
        p.paragraph_format.space_before = Pt(6)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
        pPr = p._p.get_or_add_pPr()
        _shade(pPr, 'F8FAFC')
        _border(pPr, colour='CBD5E1', size='4')
        for i, ln in enumerate(text.split('\n')):
            if i:
                p.add_run().add_break()
            r = p.add_run(ln)
            r.font.name = MONO_FONT
            r.font.size = Pt(10)
            rpr = r._element.get_or_add_rPr()
            rf = OxmlElement('w:rFonts')
            for a in ('w:ascii', 'w:hAnsi', 'w:cs'):
                rf.set(qn(a), MONO_FONT)
            rpr.append(rf)
        return p

    def figure(self, caption, path, width_cm=15.5):
        p = self.doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_before = Pt(10)
        p.paragraph_format.space_after = Pt(2)
        if os.path.exists(path):
            p.add_run().add_picture(path, width=Cm(width_cm))
        else:
            add_runs(p, f'[THIẾU HÌNH: {path}]', colour=RGBColor(0xB9, 0x1C, 0x1C), base_bold=True)
        self.fig_no += 1
        c = self.doc.add_paragraph()
        c.alignment = WD_ALIGN_PARAGRAPH.CENTER
        c.paragraph_format.space_after = Pt(12)
        add_runs(c, caption, size=Pt(11.5), colour=MUTED, base_italic=True)
        return p

    def table(self, rows, caption=None):
        if caption:
            self.tbl_no += 1
            c = self.doc.add_paragraph()
            c.alignment = WD_ALIGN_PARAGRAPH.CENTER
            c.paragraph_format.space_before = Pt(10)
            c.paragraph_format.space_after = Pt(3)
            add_runs(c, caption, size=Pt(11.5), colour=MUTED, base_italic=True)
        t = self.doc.add_table(rows=len(rows), cols=len(rows[0]))
        t.style = 'Table Grid'
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        for ri, row in enumerate(rows):
            for ci, cell in enumerate(row):
                tc = t.cell(ri, ci)
                tc.paragraphs[0].text = ''
                p = tc.paragraphs[0]
                p.paragraph_format.space_after = Pt(2)
                p.paragraph_format.space_before = Pt(2)
                p.paragraph_format.line_spacing_rule = WD_LINE_SPACING.SINGLE
                p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                add_runs(p, cell, size=Pt(11.5), base_bold=(ri == 0))
                if ri == 0:
                    _shade(tc._tc.get_or_add_tcPr(), 'E2E8F0')
        self.doc.add_paragraph().paragraph_format.space_after = Pt(6)
        return t

    def pagebreak(self):
        self.doc.add_paragraph().add_run().add_break(WD_BREAK.PAGE)

    def toc(self):
        h = self.doc.add_paragraph()
        h.alignment = WD_ALIGN_PARAGRAPH.CENTER
        h.paragraph_format.space_after = Pt(10)
        add_runs(h, 'MỤC LỤC', size=Pt(14), colour=ACCENT, base_bold=True)
        p = self.doc.add_paragraph()
        _field(p, r'TOC \o "1-3" \h \z \u')
        note = self.doc.add_paragraph()
        note.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_runs(note, '(Mở tệp trong Word và nhấn Ctrl+A rồi F9 để cập nhật mục lục và số trang)',
                 size=Pt(10), colour=MUTED, base_italic=True)

    def signature(self):
        t = self.doc.add_table(rows=1, cols=2)
        t.alignment = WD_TABLE_ALIGNMENT.CENTER
        for ci, (title, name) in enumerate([
                ('XÁC NHẬN CỦA ĐƠN VỊ', '[Ký, ghi rõ họ tên, đóng dấu]'),
                ('TÁC GIẢ SÁNG KIẾN', self.meta.get('author', '[Họ và tên]'))]):
            c = t.cell(0, ci)
            c.paragraphs[0].text = ''
            p = c.paragraphs[0]
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            add_runs(p, title, base_bold=True)
            for _ in range(4):
                c.add_paragraph()
            p2 = c.add_paragraph()
            p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
            add_runs(p2, name, base_bold=True)

    # ------------------------------------------------------------- cover ---
    def cover(self):
        m = self.meta
        for line, size, bold in [
                (m.get('org_top', ''), 13, True),
                (m.get('org', ''), 13, True)]:
            if line:
                p = self.doc.add_paragraph()
                p.alignment = WD_ALIGN_PARAGRAPH.CENTER
                p.paragraph_format.space_after = Pt(2)
                add_runs(p, line, size=Pt(size), base_bold=bold)
        p = self.doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_runs(p, '───────────', colour=MUTED)

        for _ in range(3):
            self.doc.add_paragraph()

        p = self.doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(4)
        add_runs(p, m.get('kind', ''), size=Pt(14), colour=MUTED, base_bold=True)

        p = self.doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.space_after = Pt(10)
        add_runs(p, m['title'].upper(), size=Pt(22), colour=ACCENT, base_bold=True)

        if m.get('subtitle'):
            p = self.doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            add_runs(p, m['subtitle'], size=Pt(13.5), colour=MUTED, base_italic=True)

        if m.get('cover_image') and os.path.exists(m['cover_image']):
            p = self.doc.add_paragraph()
            p.alignment = WD_ALIGN_PARAGRAPH.CENTER
            p.paragraph_format.space_before = Pt(20)
            p.add_run().add_picture(m['cover_image'], width=Cm(13.0))

        for _ in range(2):
            self.doc.add_paragraph()

        rows = [r.split('|') for r in m.get('cover_rows', '').split(';;') if r.strip()]
        if rows:
            t = self.doc.add_table(rows=len(rows), cols=2)
            t.alignment = WD_TABLE_ALIGNMENT.CENTER
            for ri, (k, v) in enumerate(rows):
                for ci, txt in enumerate((k.strip(), v.strip())):
                    cell = t.cell(ri, ci)
                    cell.paragraphs[0].text = ''
                    p = cell.paragraphs[0]
                    p.paragraph_format.space_after = Pt(2)
                    p.alignment = WD_ALIGN_PARAGRAPH.LEFT
                    add_runs(p, txt, base_bold=(ci == 0))

        for _ in range(2):
            self.doc.add_paragraph()
        p = self.doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        add_runs(p, m.get('place_date', ''), base_italic=True)


# ------------------------------------------------------------------ parse ---
def parse(md_path, assets_root):
    text = open(md_path, encoding='utf-8').read()
    meta = {}
    if text.startswith('---\n'):
        fm, text = text[4:].split('\n---\n', 1)
        for line in fm.split('\n'):
            if ':' in line:
                k, v = line.split(':', 1)
                meta[k.strip()] = v.strip()

    b = Builder(meta)
    if meta.get('header'):
        b.header(meta['header'])
    if meta.get('footer'):
        b.footer(meta['footer'])
    if meta.get('cover', 'yes') == 'yes':
        b.cover()
        b.pagebreak()

    lines = text.split('\n')
    i = 0
    while i < len(lines):
        ln = lines[i]
        s = ln.strip()

        if s == '{{TOC}}':
            b.toc(); b.pagebreak(); i += 1; continue
        if s == '{{SIGNATURE}}':
            b.signature(); i += 1; continue
        if s == '<!--pagebreak-->':
            b.pagebreak(); i += 1; continue
        if not s:
            i += 1; continue

        if s.startswith('```'):
            buf = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith('```'):
                buf.append(lines[i]); i += 1
            i += 1
            b.code('\n'.join(buf)); continue

        m = re.match(r'^(#{1,4})\s+(.*)$', s)
        if m:
            b.heading(len(m.group(1)), m.group(2)); i += 1; continue

        m = re.match(r'^!fig\[(.*?)\]\((.*?)\)(?:\{(\d+(?:\.\d+)?)\})?$', s)
        if m:
            width = float(m.group(3)) if m.group(3) else 15.5
            b.figure(m.group(1), os.path.join(assets_root, m.group(2)), width)
            i += 1; continue

        if s.startswith('|'):
            rows, cap = [], None
            if i and lines[i - 1].strip().startswith('^table:'):
                cap = lines[i - 1].strip()[7:].strip()
            while i < len(lines) and lines[i].strip().startswith('|'):
                cells = [c.strip() for c in lines[i].strip().strip('|').split('|')]
                if not all(re.fullmatch(r':?-{2,}:?', c) for c in cells):
                    rows.append(cells)
                i += 1
            b.table(rows, cap); continue

        if s.startswith('^table:'):
            i += 1; continue

        if s.startswith('>'):
            buf = []
            while i < len(lines) and lines[i].strip().startswith('>'):
                buf.append(lines[i].strip().lstrip('>').strip()); i += 1
            b.callout([x for x in buf if x]); continue

        m = re.match(r'^(\s*)[-*]\s+(.*)$', ln)
        if m:
            b.bullet(m.group(2), numbered=False, level=len(m.group(1)) // 2)
            i += 1; continue
        m = re.match(r'^(\s*)\d+\.\s+(.*)$', ln)
        if m:
            b.bullet(m.group(2), numbered=True, level=len(m.group(1)) // 2)
            i += 1; continue

        # Paragraph: gather continuation lines.
        buf = [s]
        i += 1
        while i < len(lines) and lines[i].strip() and not re.match(
                r'^(#{1,4}\s|\||>|```|!fig|\s*[-*]\s|\s*\d+\.\s|\{\{|<!--|\^table:)', lines[i].strip()):
            buf.append(lines[i].strip()); i += 1
        b.para(' '.join(buf))

    return b


if __name__ == '__main__':
    md = sys.argv[1]
    out = sys.argv[2]
    assets = sys.argv[3] if len(sys.argv) > 3 else os.path.dirname(md)
    parse(md, assets).doc.save(out)
    print('wrote', out)
