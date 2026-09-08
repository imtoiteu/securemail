# -*- coding: utf-8 -*-
"""
One declarative diagram definition -> three artefacts.

Every figure in the dossier is defined once, in Python, and emitted as:

  * .drawio  — uncompressed mxGraphModel XML, so the figure can be opened and
               edited in diagrams.net if a layout ever needs adjusting;
  * .svg     — vector, for on-screen reading and for print;
  * .png     — raster at 2x, for embedding in DOCX.

Keeping one source avoids the usual failure where the editable file and the
published image drift apart.
"""
import html
import os
import xml.etree.ElementTree as ET

# ---------------------------------------------------------------- palette ---
# Chosen to stay legible when printed in greyscale: fills differ in lightness,
# not only in hue.
STYLES = {
    'process':  {'fill': '#e8f0fe', 'stroke': '#1d4ed8', 'text': '#0f172a', 'rx': 8},
    'core':     {'fill': '#dbeafe', 'stroke': '#1e3a8a', 'text': '#0f172a', 'rx': 8, 'bold': True},
    'store':    {'fill': '#fef3c7', 'stroke': '#b45309', 'text': '#0f172a', 'rx': 8},
    'external': {'fill': '#f1f5f9', 'stroke': '#64748b', 'text': '#334155', 'rx': 8, 'dash': True},
    'danger':   {'fill': '#fee2e2', 'stroke': '#b91c1c', 'text': '#450a0a', 'rx': 8},
    'ok':       {'fill': '#dcfce7', 'stroke': '#15803d', 'text': '#052e16', 'rx': 8},
    'actor':    {'fill': '#ffffff', 'stroke': '#0f172a', 'text': '#0f172a', 'rx': 24},
    'note':     {'fill': '#ffffff', 'stroke': '#cbd5e1', 'text': '#475569', 'rx': 4, 'italic': True},
    'boundary': {'fill': 'none',    'stroke': '#1d4ed8', 'text': '#1d4ed8', 'rx': 12, 'dash': True},
    'boundary_ext': {'fill': 'none','stroke': '#b91c1c', 'text': '#b91c1c', 'rx': 12, 'dash': True},
}

FONT = "'Segoe UI','Noto Sans',Arial,Helvetica,sans-serif"

# Figures are printed at ~155 mm wide on A4. At that scale a 13 px label on a
# 1180 px canvas comes out near 5 pt, which is unreadable on paper. Type is
# therefore set larger relative to the canvas; boxes grow to match via fit().
S = 1.5
F_LABEL = 13.5 * S
F_SUB = 11.5 * S
F_EDGE = 11.5 * S
F_BOUND = 13.0 * S
F_TITLE = 19.0 * S


class Node:
    def __init__(self, nid, label, x, y, w, h, style='process', sub=None, align='middle'):
        self.id, self.x, self.y, self.w, self.h = nid, x, y, w, h
        self.label, self.style, self.sub, self.align = label, style, sub, align


class Edge:
    def __init__(self, src, dst, label='', dashed=False, style='', bend=None):
        self.src, self.dst, self.label, self.dashed = src, dst, label, dashed
        self.style, self.bend = style, bend


class Diagram:
    def __init__(self, name, title, width, height, nodes, edges, caption=''):
        self.name, self.title = name, title
        self.width, self.height = width, height
        self.nodes, self.edges = nodes, edges
        self.caption = caption
        self._by_id = {n.id: n for n in nodes}

    def node(self, nid):
        return self._by_id[nid]


# ------------------------------------------------------------- text utils ---
def wrap(text, width_px, font_px):
    """Greedy wrap using an average glyph width. Vietnamese diacritics do not
    change advance width materially, so a single ratio is accurate enough."""
    if not text:
        return []
    avg = font_px * 0.57
    max_chars = max(6, int(width_px / avg))
    out = []
    # Explicit newlines are respected: they are how a definition asks for a
    # deliberate break (a blank line stays blank).
    for para in text.split('\n'):
        if not para.strip():
            out.append('')
            continue
        line = ''
        for word in para.split():
            trial = f'{line} {word}'.strip()
            if len(trial) <= max_chars:
                line = trial
            else:
                if line:
                    out.append(line)
                line = word
        if line:
            out.append(line)
    return out


def fit(d, verbose=False):
    """Grow any box whose text would overflow, so a long Vietnamese label is
    never silently clipped. Applied before both the SVG and the .drawio are
    written, so the two stay identical."""
    for n in d.nodes:
        if n.style.startswith('boundary'):
            continue
        lines = wrap(n.label, n.w - 18, F_LABEL)
        subs = wrap(n.sub, n.w - 18, F_SUB) if n.sub else []
        need = len(lines) * (F_LABEL + 3) + (len(subs) * F_SUB * 1.28 + 6 if subs else 0) + 20
        if need > n.h:
            if verbose:
                print(f'  fit: {n.id} {n.h} -> {int(need)}')
            n.h = int(need)
    return d


# ------------------------------------------------------------------- SVG ---
def to_svg(d):
    W, H = d.width, d.height
    p = [f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" '
         f'viewBox="0 0 {W} {H}" font-family="{FONT}">']
    p.append('<defs>'
             '<marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" '
             'markerHeight="7" orient="auto-start-reverse">'
             '<path d="M 0 0 L 10 5 L 0 10 z" fill="#334155"/></marker>'
             '<marker id="arrow-r" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" '
             'markerHeight="7" orient="auto-start-reverse">'
             '<path d="M 0 0 L 10 5 L 0 10 z" fill="#b91c1c"/></marker>'
             '</defs>')
    p.append(f'<rect width="{W}" height="{H}" fill="#ffffff"/>')
    if d.title:
        p.append(f'<text x="{W/2}" y="{F_TITLE + 15:.0f}" text-anchor="middle" '
                 f'font-size="{F_TITLE:.1f}" font-weight="600" fill="#0f172a">'
                 f'{html.escape(d.title)}</text>')

    # Boundaries first so they sit behind the boxes they enclose.
    order = sorted(d.nodes, key=lambda n: 0 if n.style.startswith('boundary') else 1)
    for n in order:
        s = STYLES[n.style]
        dash = ' stroke-dasharray="7 5"' if s.get('dash') else ''
        p.append(f'<rect x="{n.x}" y="{n.y}" width="{n.w}" height="{n.h}" rx="{s["rx"]}" '
                 f'fill="{s["fill"]}" stroke="{s["stroke"]}" stroke-width="1.6"{dash}/>')
        if n.style.startswith('boundary'):
            # Wrap, so a long panel title never runs past the panel it names.
            yy = n.y + F_BOUND + 8
            for ln in wrap(n.label, n.w - 28, F_BOUND):
                p.append(f'<text x="{n.x + 14}" y="{yy:.1f}" font-size="{F_BOUND:.1f}" '
                         f'font-weight="600" fill="{s["text"]}">{html.escape(ln)}</text>')
                yy += F_BOUND * 1.25
            continue

        fs = F_LABEL
        lines = wrap(n.label, n.w - 18, fs)
        sub_lines = wrap(n.sub, n.w - 18, F_SUB) if n.sub else []
        sub_lh = F_SUB * 1.28
        total = len(lines) * (fs + 3) + (len(sub_lines) * sub_lh + 5 if sub_lines else 0)
        y = n.y + n.h / 2 - total / 2 + fs
        weight = '600' if s.get('bold') else '500'
        for ln in lines:
            p.append(f'<text x="{n.x + n.w/2}" y="{y:.1f}" text-anchor="middle" font-size="{fs}" '
                     f'font-weight="{weight}" fill="{s["text"]}">{html.escape(ln)}</text>')
            y += fs + 3
        y += 3
        for ln in sub_lines:
            p.append(f'<text x="{n.x + n.w/2}" y="{y:.1f}" text-anchor="middle" font-size="{F_SUB:.1f}" '
                     f'fill="#475569">{html.escape(ln)}</text>')
            y += sub_lh

    for e in d.edges:
        a, b = d.node(e.src), d.node(e.dst)
        x1, y1, x2, y2 = _anchor(a, b)
        red = e.style == 'danger'
        colour = '#b91c1c' if red else '#334155'
        marker = 'arrow-r' if red else 'arrow'
        dash = ' stroke-dasharray="6 4"' if e.dashed else ''
        if e.bend:
            mx, my = e.bend
            path = f'M {x1} {y1} Q {mx} {my} {x2} {y2}'
            p.append(f'<path d="{path}" fill="none" stroke="{colour}" stroke-width="1.7"{dash} '
                     f'marker-end="url(#{marker})"/>')
            lx, ly = mx, my
        else:
            p.append(f'<line x1="{x1}" y1="{y1}" x2="{x2}" y2="{y2}" stroke="{colour}" '
                     f'stroke-width="1.7"{dash} marker-end="url(#{marker})"/>')
            lx, ly = (x1 + x2) / 2, (y1 + y2) / 2
        if e.label:
            for i, ln in enumerate(wrap(e.label, 260, F_EDGE)):
                tw = len(ln) * F_EDGE * 0.55 + 10
                yy = ly - 6 + i * (F_EDGE * 1.25)
                p.append(f'<rect x="{lx - tw/2:.1f}" y="{yy - F_EDGE * 0.85:.1f}" width="{tw:.1f}" '
                         f'height="{F_EDGE * 1.2:.1f}" rx="3" fill="#ffffff" fill-opacity="0.92"/>')
                p.append(f'<text x="{lx:.1f}" y="{yy:.1f}" text-anchor="middle" font-size="{F_EDGE:.1f}" '
                         f'fill="{colour}">{html.escape(ln)}</text>')
    p.append('</svg>')
    return '\n'.join(p)


def _anchor(a, b):
    """Connect the nearest edge midpoints of two boxes."""
    ax, ay = a.x + a.w / 2, a.y + a.h / 2
    bx, by = b.x + b.w / 2, b.y + b.h / 2
    dx, dy = bx - ax, by - ay
    if abs(dx) * a.h > abs(dy) * a.w:
        x1 = a.x + a.w if dx > 0 else a.x
        y1 = ay
        x2 = b.x if dx > 0 else b.x + b.w
        y2 = by
    else:
        x1 = ax
        y1 = a.y + a.h if dy > 0 else a.y
        x2 = bx
        y2 = b.y if dy > 0 else b.y + b.h
    return x1, y1, x2, y2


# --------------------------------------------------------------- draw.io ---
_DRAWIO_STYLE = {
    'process':  'rounded=1;whiteSpace=wrap;html=1;fillColor=#e8f0fe;strokeColor=#1d4ed8;',
    'core':     'rounded=1;whiteSpace=wrap;html=1;fillColor=#dbeafe;strokeColor=#1e3a8a;fontStyle=1;',
    'store':    'rounded=1;whiteSpace=wrap;html=1;fillColor=#fef3c7;strokeColor=#b45309;',
    'external': 'rounded=1;whiteSpace=wrap;html=1;fillColor=#f1f5f9;strokeColor=#64748b;dashed=1;',
    'danger':   'rounded=1;whiteSpace=wrap;html=1;fillColor=#fee2e2;strokeColor=#b91c1c;',
    'ok':       'rounded=1;whiteSpace=wrap;html=1;fillColor=#dcfce7;strokeColor=#15803d;',
    'actor':    'rounded=1;arcSize=40;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#0f172a;',
    'note':     'rounded=0;whiteSpace=wrap;html=1;fillColor=#ffffff;strokeColor=#cbd5e1;fontStyle=2;',
    'boundary': 'rounded=1;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#1d4ed8;dashed=1;'
                'verticalAlign=top;align=left;spacingLeft=10;spacingTop=4;fontStyle=1;fontColor=#1d4ed8;',
    'boundary_ext': 'rounded=1;whiteSpace=wrap;html=1;fillColor=none;strokeColor=#b91c1c;dashed=1;'
                    'verticalAlign=top;align=left;spacingLeft=10;spacingTop=4;fontStyle=1;fontColor=#b91c1c;',
}


def to_drawio(d):
    mxfile = ET.Element('mxfile', {'host': 'securemail-dossier', 'type': 'device'})
    diag = ET.SubElement(mxfile, 'diagram', {'name': d.title or d.name, 'id': d.name})
    model = ET.SubElement(diag, 'mxGraphModel', {
        'dx': str(d.width), 'dy': str(d.height), 'grid': '1', 'gridSize': '10',
        'guides': '1', 'tooltips': '1', 'connect': '1', 'arrows': '1', 'fold': '1',
        'page': '1', 'pageScale': '1', 'pageWidth': '1169', 'pageHeight': '826',
        'math': '0', 'shadow': '0'})
    root = ET.SubElement(model, 'root')
    ET.SubElement(root, 'mxCell', {'id': '0'})
    ET.SubElement(root, 'mxCell', {'id': '1', 'parent': '0'})

    if d.title:
        c = ET.SubElement(root, 'mxCell', {
            'id': 'title', 'value': d.title, 'parent': '1', 'vertex': '1',
            'style': 'text;html=1;align=center;fontSize=18;fontStyle=1;'})
        ET.SubElement(c, 'mxGeometry', {'x': '0', 'y': '8', 'width': str(d.width),
                                        'height': '30', 'as': 'geometry'})

    order = sorted(d.nodes, key=lambda n: 0 if n.style.startswith('boundary') else 1)
    for n in order:
        value = n.label if not n.sub else f'<b>{html.escape(n.label)}</b><br/><font style="font-size:10px">{html.escape(n.sub)}</font>'
        c = ET.SubElement(root, 'mxCell', {
            'id': n.id, 'value': value, 'parent': '1', 'vertex': '1',
            'style': _DRAWIO_STYLE[n.style]})
        ET.SubElement(c, 'mxGeometry', {'x': str(n.x), 'y': str(n.y), 'width': str(n.w),
                                        'height': str(n.h), 'as': 'geometry'})

    for i, e in enumerate(d.edges):
        style = 'edgeStyle=orthogonalEdgeStyle;rounded=1;html=1;'
        if e.dashed:
            style += 'dashed=1;'
        if e.style == 'danger':
            style += 'strokeColor=#b91c1c;fontColor=#b91c1c;'
        c = ET.SubElement(root, 'mxCell', {
            'id': f'e{i}', 'value': e.label, 'parent': '1', 'edge': '1',
            'source': e.src, 'target': e.dst, 'style': style})
        ET.SubElement(c, 'mxGeometry', {'relative': '1', 'as': 'geometry'})

    ET.indent(mxfile, space='  ')
    return '<?xml version="1.0" encoding="UTF-8"?>\n' + ET.tostring(mxfile, encoding='unicode')


def emit(d, outdir, verbose=False):
    fit(d, verbose)
    os.makedirs(outdir, exist_ok=True)
    svg_path = os.path.join(outdir, f'{d.name}.svg')
    drawio_path = os.path.join(outdir, f'{d.name}.drawio')
    png_path = os.path.join(outdir, f'{d.name}.png')
    with open(svg_path, 'w', encoding='utf-8') as f:
        f.write(to_svg(d))
    with open(drawio_path, 'w', encoding='utf-8') as f:
        f.write(to_drawio(d))
    import cairosvg
    cairosvg.svg2png(url=svg_path, write_to=png_path, scale=2.0, background_color='#ffffff')
    return svg_path, drawio_path, png_path
