# -*- coding: utf-8 -*-
"""
Lays the rendered Android screens out on two labelled sheets for the dossier.

Twelve separate full-page figures would bury the argument; two sheets of six
let a reader take in the whole flow at once, which is what the section is
actually about.
"""
import os
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.abspath(os.path.join(HERE, '../../assets/mobile-design'))

SHEETS = [
    ('sheet-1-thiet-lap-va-quan-ly-khoa', [
        ('m01-khoa-ung-dung',      '1. Khóa ứng dụng'),
        ('m02-thiet-lap-ban-dau',  '2. Thiết lập ban đầu'),
        ('m03-tao-khoa',           '3. Tạo cặp khóa'),
        ('m04-chum-khoa',          '4. Chùm khóa'),
        ('m05-chi-tiet-khoa',      '5. Chi tiết khóa và dấu vân tay'),
        ('m06-nhap-khoa',          '6. Nhập khóa công khai'),
    ]),
    ('sheet-2-ma-hoa-giai-ma-va-cai-dat', [
        ('m07-soan-thu-ma-hoa',    '7. Soạn thư mã hóa'),
        ('m08-ket-qua-ma-hoa',     '8. Kết quả mã hóa'),
        ('m09-giai-ma',            '9. Giải mã và trạng thái chữ ký'),
        ('m10-nhap-cum-mat-khau',  '10. Nhập cụm mật khẩu'),
        ('m11-sao-luu-khoi-phuc',  '11. Sao lưu và khôi phục'),
        ('m12-cai-dat',            '12. Cài đặt bảo mật'),
    ]),
]

PHONE_W = 560                      # each phone scaled to this width
GAP_X, GAP_Y = 58, 40
PAD = 46
LABEL_H = 62

def font(size, bold=False):
    base = '/usr/share/fonts/truetype/dejavu/DejaVuSans%s.ttf' % ('-Bold' if bold else '')
    return ImageFont.truetype(base, size)

for name, items in SHEETS:
    thumbs = []
    for fid, label in items:
        im = Image.open(os.path.join(SRC, fid + '.png')).convert('RGB')
        h = round(im.height * PHONE_W / im.width)
        thumbs.append((im.resize((PHONE_W, h), Image.LANCZOS), label))

    ph = thumbs[0][0].height
    cols, rows = 3, 2
    W = PAD * 2 + cols * PHONE_W + (cols - 1) * GAP_X
    H = PAD * 2 + rows * (ph + LABEL_H) + (rows - 1) * GAP_Y

    sheet = Image.new('RGB', (W, H), '#ffffff')
    d = ImageDraw.Draw(sheet)
    f = font(27)

    for i, (im, label) in enumerate(thumbs):
        c, r = i % cols, i // cols
        x = PAD + c * (PHONE_W + GAP_X)
        y = PAD + r * (ph + LABEL_H + GAP_Y)
        # hairline frame so a white phone body reads against a white sheet
        d.rounded_rectangle([x - 2, y - 2, x + PHONE_W + 1, y + ph + 1],
                            radius=26, outline='#cbd5e1', width=2)
        sheet.paste(im, (x, y))
        tw = d.textlength(label, font=f)
        d.text((x + (PHONE_W - tw) / 2, y + ph + 20), label, font=f, fill='#334155')

    out = os.path.join(SRC, name + '.png')
    sheet.save(out, optimize=True)
    print(f'{name}.png  {W}x{H}')
