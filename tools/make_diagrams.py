# -*- coding: utf-8 -*-
"""
Figures for the Secure Mail innovation dossier. Run: python3 make_diagrams.py

Layouts are sized for print. Each figure is placed at ~155 mm wide on A4, so a
1180-unit-wide canvas maps at roughly 0.13 mm per unit; type is set at 17–20
units to land near 8 pt on paper, and boxes are sized generously to match.
Height is free — a taller figure only takes more page, it does not shrink the
text — so vertical space is used rather than crowding.

Titles carry no figure number: the document caption owns the numbering, so the
two cannot drift apart.
"""
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from diagram_lib import Diagram, Edge, Node, emit

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'assets', 'diagrams')

D = []

# ---------------------------------------------------------------- Hình 1 ---
D.append(Diagram(
    'h1-kien-truc-tong-the',
    'Kiến trúc tổng thể Secure Mail trên nền Gmail',
    1180, 1060,
    [
        Node('bA', 'Máy trạm của người dùng — ranh giới tin cậy', 30, 90, 720, 810, 'boundary'),
        Node('bB', 'Hạ tầng ngoài tầm kiểm soát của đơn vị', 790, 90, 360, 810, 'boundary_ext'),

        Node('user', 'Người dùng', 60, 150, 220, 110, 'actor', sub='Soạn và đọc thư'),
        Node('editor', 'Khung soạn thảo cách ly', 330, 150, 260, 110, 'process',
             sub='iframe của tiện ích'),
        Node('gmail_ui', 'Trang Gmail trong trình duyệt', 60, 300, 220, 150, 'external',
             sub='DOM thuộc về Google'),
        Node('cs', 'Content script của Secure Mail', 330, 300, 260, 150, 'process',
             sub='Chèn nút và khung soạn thảo riêng'),
        Node('sw', 'Service worker — lõi mật mã', 190, 490, 400, 170, 'core',
             sub='OpenPGP.js 5.11.3\nMã hóa • Ký • Giải mã • Xác minh'),
        Node('keyring', 'Chùm khóa cục bộ', 60, 700, 290, 180, 'store',
             sub='chrome.storage.local\nKhóa riêng tư được mã hóa bằng cụm mật khẩu'),
        Node('pwd', 'Bộ nhớ đệm cụm mật khẩu', 400, 700, 290, 180, 'store',
             sub='chrome.storage.session\nTự xóa sau 30 phút'),

        Node('gapi', 'Gmail API', 820, 200, 300, 150, 'external',
             sub='googleapis.com\nChỉ nhận và trả bản mã'),
        Node('gsrv', 'Máy chủ thư của Google', 820, 430, 300, 150, 'danger',
             sub='Chỉ lưu trữ được bản mã'),
        Node('recv', 'Người nhận', 820, 660, 300, 140, 'actor',
             sub='Secure Mail hoặc GnuPG'),

        Node('note1', 'Bản rõ không bao giờ rời khỏi ranh giới tin cậy: việc mã hóa xảy ra trước khi dữ '
                      'liệu được trao cho Gmail API. Khóa riêng tư không bao giờ rời khỏi máy trạm.',
             30, 930, 1120, 90, 'note'),
    ],
    [
        Edge('user', 'editor', 'bản rõ'),
        Edge('editor', 'cs'),
        Edge('cs', 'sw', 'yêu cầu mã hóa'),
        Edge('sw', 'keyring', 'lấy khóa'),
        Edge('sw', 'pwd', 'mở khóa'),
        Edge('sw', 'gapi', 'bản mã'),
        Edge('gapi', 'gsrv'),
        Edge('gsrv', 'recv', 'bản mã'),
        Edge('gmail_ui', 'cs', 'DOM', dashed=True),
    ],
))

# ---------------------------------------------------------------- Hình 2 ---
D.append(Diagram(
    'h2-luong-ma-hoa',
    'Luồng xử lý một bức thư mã hóa (gửi và nhận)',
    1180, 1180,
    [
        Node('s1', '1. Soạn thư trong khung soạn thảo của Secure Mail', 40, 100, 300, 170, 'process',
             sub='Bản rõ nằm trong iframe của tiện ích, không nằm trong DOM của Gmail'),
        Node('s2', '2. Chọn người nhận', 40, 300, 300, 140, 'process',
             sub='Tra khóa công khai trong chùm khóa cục bộ'),
        Node('s3', '3. Kiểm tra khóa', 40, 470, 300, 160, 'process',
             sub='Đối chiếu dấu vân tay; cảnh báo nếu khóa hết hạn hoặc đã bị thu hồi'),
        Node('s4', '4. Mã hóa và ký số', 40, 660, 300, 210, 'core',
             sub='Khóa phiên AES-256, bọc bằng khóa công khai RSA-4096 của từng người nhận; '
                 'ký bằng khóa riêng tư người gửi'),
        Node('s5', '5. Giao cho Gmail', 40, 900, 300, 150, 'process',
             sub='Chỉ khối bản mã ASCII rời khỏi máy trạm'),

        Node('wire', 'Trên đường truyền và tại máy chủ Google', 400, 400, 380, 400, 'danger',
             sub='Thấy được: người gửi, người nhận, thời gian, kích thước, tiêu đề thư — '
                 'tức là siêu dữ liệu.\n\nKhông thấy được: nội dung thư và tệp đính kèm.'),

        Node('r1', '6. Nhận thư', 840, 100, 300, 150, 'process',
             sub='Nhận diện khối OpenPGP trong thư'),
        Node('r2', '7. Nhập cụm mật khẩu', 840, 280, 300, 150, 'process',
             sub='Hộp thoại của tiện ích, cách ly khỏi trang Gmail'),
        Node('r3', '8. Giải mã và xác minh chữ ký', 840, 460, 300, 210, 'core',
             sub='Mở khóa riêng tư → khôi phục khóa phiên → giải mã → kiểm tra toàn vẹn và chữ ký'),
        Node('r4', '9. Hiển thị trong khung cách ly', 840, 700, 300, 170, 'ok',
             sub='Kèm trạng thái chữ ký: hợp lệ, không hợp lệ, hoặc không có'),

        Node('note2', 'Bước 8 thất bại nếu bản mã bị sửa dù chỉ một ký tự: cơ chế kiểm tra toàn vẹn của '
                      'OpenPGP từ chối bản mã thay vì trả về bản rõ sai. Xem Phụ lục kỹ thuật, phép thử D.',
             40, 1080, 1100, 80, 'note'),
    ],
    [
        Edge('s1', 's2'), Edge('s2', 's3'), Edge('s3', 's4'), Edge('s4', 's5'),
        Edge('s5', 'wire', 'bản mã'),
        Edge('wire', 'r1', 'bản mã'),
        Edge('r1', 'r2'), Edge('r2', 'r3'), Edge('r3', 'r4'),
    ],
))

# ---------------------------------------------------------------- Hình 3 ---
D.append(Diagram(
    'h3-mo-hinh-tin-cay',
    'Hai mô hình phân phối khóa công khai',
    1180, 1030,
    [
        Node('bA', 'A. Mô hình mặc định của Mailvelope: tra cứu máy chủ khóa công cộng',
             30, 90, 1120, 320, 'boundary_ext'),
        Node('a_u1', 'Người dùng A', 70, 160, 220, 100, 'actor'),
        Node('a_ks', 'Máy chủ khóa công cộng đặt ở nước ngoài', 460, 140, 260, 160, 'danger',
             sub='keys.mailvelope.com\nkeys.openpgp.org\nWeb Key Directory'),
        Node('a_u2', 'Người dùng B', 890, 160, 220, 100, 'actor'),
        Node('a_note', 'Mỗi lần tra cứu để lộ "ai đang chuẩn bị liên lạc với ai" cho một bên thứ ba ngoài '
                       'tầm kiểm soát. Tin cậy theo kiểu TOFU: không có thẩm quyền nào xác nhận khóa đó '
                       'thực sự thuộc về ai.',
             70, 300, 1040, 76, 'note'),

        Node('bB', 'B. Mô hình khép kín của Secure Mail (cấu hình mặc định)',
             30, 450, 1120, 320, 'boundary'),
        Node('b_u1', 'Người dùng A', 70, 520, 220, 100, 'actor'),
        Node('b_admin', 'Quản trị viên khóa của đơn vị', 460, 500, 260, 160, 'ok',
             sub='Giữ danh mục khóa công khai và dấu vân tay đã đối chiếu'),
        Node('b_u2', 'Người dùng B', 890, 520, 220, 100, 'actor'),
        Node('b_note', 'Khóa công khai và dấu vân tay được phân phát qua kênh nội bộ đã xác thực. Không '
                       'có truy vấn nào rời khỏi đơn vị. Trách nhiệm xác nhận danh tính thuộc về tổ chức.',
             70, 665, 1040, 90, 'note'),

        Node('cfg', 'Cấu hình kiểm chứng được trong src/res/defaults.json',
             30, 800, 1120, 190, 'process',
             sub='mvelo_tofu_lookup = false   •   oks_lookup = false   •   wkd_lookup = false   •   '
                 'autocrypt_lookup = false   •   tự động tải khóa lên máy chủ = tắt\n\n'
                 'Cả bốn cơ chế tra cứu bên ngoài đều tắt mặc định. Quản trị viên vẫn bật lại được nếu '
                 'đơn vị tự vận hành máy chủ khóa nội bộ.'),
    ],
    [
        Edge('a_u1', 'a_ks', 'tra cứu khóa của B', style='danger'),
        Edge('a_u2', 'a_ks', 'tải khóa lên', style='danger'),
        Edge('b_u1', 'b_admin', 'nhận khóa công khai'),
        Edge('b_u2', 'b_admin', 'nộp khóa công khai'),
    ],
))

# ---------------------------------------------------------------- Hình 4 ---
D.append(Diagram(
    'h4-oauth-pkce',
    'Xác thực Gmail API: định danh tiện ích cố định kết hợp PKCE (RFC 7636)',
    1180, 1200,
    [
        Node('ext', 'Tiện ích Secure Mail', 40, 110, 300, 190, 'core',
             sub='Mã định danh cố định:\nihhialmbgcagicfabjkijpbppggbnebe\n'
                 '(dẫn xuất từ khóa công khai khai báo trong manifest)'),
        Node('v', 'Sinh code_verifier', 40, 340, 300, 150, 'process',
             sub='32 byte ngẫu nhiên từ crypto.getRandomValues'),
        Node('c', 'Tính code_challenge', 40, 530, 300, 150, 'process',
             sub='BASE64URL(SHA-256(verifier)), method = S256'),

        Node('redir', 'Chuyển hướng nội bộ trình duyệt', 420, 110, 320, 190, 'process',
             sub='https://<mã định danh>.chromiumapp.org/\n'
                 'Chrome chặn nội bộ, địa chỉ này không bao giờ ra Internet'),
        Node('g1', 'Màn hình đăng nhập Google', 420, 400, 320, 150, 'external',
             sub='accounts.google.com — nhận code_challenge'),
        Node('g2', 'Điểm cấp token của Google', 420, 610, 320, 160, 'external',
             sub='oauth2.googleapis.com/token\nđối chiếu verifier với challenge'),
        Node('tok', 'Access token và refresh token', 420, 830, 320, 140, 'store',
             sub='Lưu cục bộ trong tiện ích'),

        Node('atk', 'Kẻ tấn công chặn được mã ủy quyền', 820, 400, 320, 170, 'danger',
             sub='Không có code_verifier nên không đổi được mã lấy token'),
        Node('why', 'Vì sao cần cả hai biện pháp', 820, 620, 320, 410, 'note',
             sub='Không khai báo khóa trong manifest thì Chrome sinh mã định danh theo đường dẫn cài '
                 'đặt, nên mỗi máy có một URI chuyển hướng khác nhau và không đăng ký trước được — '
                 'đây là nguyên nhân lỗi redirect_uri_mismatch.\n\n'
                 'Bí mật client không thể giữ kín trong một tiện ích trình duyệt. PKCE mới là biện pháp '
                 'thực sự bảo vệ luồng này. Bản gốc Mailvelope 6.3.0 không có PKCE.'),

        Node('note4', 'Mã nguồn: src/modules/gmail.js (hàm getAuthCode và getAuthTokens). '
                      'Khóa công khai cố định: src/chrome/manifest.json, trường "key".',
             40, 1070, 1100, 90, 'note'),
    ],
    [
        Edge('ext', 'v'), Edge('v', 'c'),
        Edge('c', 'g1', 'gửi challenge'),
        Edge('g1', 'redir', 'trả mã ủy quyền'),
        Edge('redir', 'ext'),
        Edge('ext', 'g2', 'mã kèm verifier'),
        Edge('g2', 'tok'),
        Edge('g1', 'atk', 'mã bị chặn', dashed=True, style='danger'),
    ],
))

# ---------------------------------------------------------------- Hình 5 ---
D.append(Diagram(
    'h5-kien-truc-mobile',
    'Kiến trúc phiên bản di động: tái sử dụng nguyên vẹn lõi mật mã đã kiểm chứng',
    1180, 1020,
    [
        Node('bnd', 'Ứng dụng Android', 30, 90, 740, 720, 'boundary'),
        Node('ui', 'Giao diện gốc React Native', 60, 150, 300, 160, 'process',
             sub='Thiết kế cho màn hình cảm ứng, không thu nhỏ giao diện máy tính'),
        Node('bridge', 'Cầu RPC có kiểu', 60, 350, 300, 180, 'core',
             sub='Gói tin {id, method, params} → {id, ok, result | error}\n'
                 'Có timeout và lan truyền lỗi sập'),
        Node('store', 'Kho dữ liệu mã hóa', 60, 570, 300, 190, 'store',
             sub='DEK bọc bằng Android Keystore, dữ liệu AES-256-GCM, tệp lưu dạng khối mờ'),
        Node('wv', 'WebView ẩn — "core host"', 420, 300, 320, 230, 'core',
             sub='Nạp nguyên vẹn mailvelope/src/modules/*\nOpenPGP.js 5.11.3, DOMPurify\n'
                 'Chromium: cùng họ engine với bản máy tính'),
        Node('shim', 'Lớp đệm thay thế API của Chrome', 420, 570, 320, 190, 'process',
             sub='chrome.storage, chrome.alarms, chrome.identity chuyển tiếp qua cầu RPC'),

        Node('desk', 'Tiện ích trên máy tính (chỉ đọc)', 820, 150, 320, 220, 'external',
             sub='Không sửa một dòng nào. Kiểm chứng bằng verify-desktop-untouched.sh: '
                 'so khớp mã băm SHA-256 của 161 tệp'),
        Node('gold', 'Phép thử đối chứng và liên thông', 820, 420, 320, 220, 'ok',
             sub='68/68 phép thử đạt. Bản mã sinh trên di động giải mã được bằng thư viện độc lập, '
                 'và ngược lại'),

        Node('note5', 'Lý do dùng WebView thay vì chạy thư viện mật mã trên engine JavaScript của React '
                      'Native: giữ nguyên hành vi mật mã đã được kiểm chứng, tránh phải tự bổ sung Web '
                      'Crypto, Web Streams và TextEncoder — những thứ không xác nhận đúng được nếu không '
                      'có thiết bị thật.',
             30, 840, 1120, 110, 'note'),
    ],
    [
        Edge('ui', 'bridge'),
        Edge('bridge', 'wv', 'gọi hàm mật mã'),
        Edge('wv', 'shim'),
        Edge('shim', 'store', 'lưu trữ', dashed=True),
        Edge('bridge', 'store'),
        Edge('desk', 'wv', 'mã nguồn dùng lại', dashed=True),
        Edge('gold', 'wv', 'kiểm chứng', dashed=True),
    ],
))

# ---------------------------------------------------------------- Hình 6 ---
D.append(Diagram(
    'h6-quy-trinh-kiem-chung',
    'Quy trình xây dựng và kiểm chứng một bản phát hành',
    1180, 900,
    [
        Node('src', '1. Mã nguồn', 30, 300, 190, 150, 'process',
             sub='Git, lịch sử đầy đủ, không chứa bí mật'),
        Node('t1', '2. Kiểm thử đơn vị', 270, 110, 220, 150, 'ok',
             sub='449/449 đạt\n(bản máy tính)'),
        Node('t2', '3. Kiểm thử di động', 270, 300, 220, 150, 'ok',
             sub='68/68 đạt\n(cầu RPC và lõi)'),
        Node('t3', '4. Kiểm toán bản dịch', 270, 490, 220, 150, 'ok',
             sub='586/586 khóa\n0 lỗi chặn'),
        Node('build', '5. Biên dịch bản phát hành', 540, 300, 220, 150, 'core',
             sub='grunt prod\nwebpack, rút gọn mã'),
        Node('a1', '6. Kiểm toán bề mặt mạng', 810, 110, 240, 160, 'ok',
             sub='verify-no-external-endpoints.sh\n4/4 điểm cuối đã gỡ: vắng mặt'),
        Node('a2', '7. Kiểm chứng liên thông', 810, 310, 240, 160, 'ok',
             sub='interop-gnupg.mjs\n8/8 phép thử đạt với GnuPG 2.4.4'),
        Node('a3', '8. Đo hiệu năng', 810, 510, 240, 160, 'ok',
             sub='benchmark-crypto.mjs\nSố liệu tại Phụ lục kỹ thuật'),
        Node('rel', '9. Đóng gói và niêm phong', 30, 550, 190, 170, 'store',
             sub='Tệp .zip kèm SHA-256, mã định danh cố định'),

        Node('note6', 'Các bước 6, 7 và 8 đều là kịch bản chạy được, kết quả kèm trong hồ sơ. Người thẩm '
                      'định chạy lại được trên chính bản phát hành để tự kiểm chứng, không phải tin vào '
                      'lời khẳng định.',
             30, 770, 1120, 100, 'note'),
    ],
    [
        Edge('src', 't1'), Edge('src', 't2'), Edge('src', 't3'),
        Edge('t1', 'build'), Edge('t2', 'build'), Edge('t3', 'build'),
        Edge('build', 'a1'), Edge('build', 'a2'), Edge('build', 'a3'),
        Edge('a3', 'rel', 'đạt toàn bộ'),
    ],
))

# ---------------------------------------------------------------- Hình 7 ---
D.append(Diagram(
    'h7-pham-vi-du-lieu',
    'Phạm vi dữ liệu phù hợp và ranh giới pháp lý',
    1180, 880,
    [
        Node('ok1', 'Phù hợp về kỹ thuật và pháp lý', 30, 90, 360, 560, 'ok',
             sub='\nTài liệu phục vụ giảng dạy, đề cương, đề thi chưa công bố\n\n'
                 'Kết quả học tập và dữ liệu cá nhân của người học\n\n'
                 'Tài liệu nghiên cứu, bản thảo chưa công bố\n\n'
                 'Trao đổi nghiệp vụ nội bộ không thuộc danh mục bí mật nhà nước\n\n'
                 'Dữ liệu cần bảo vệ khi truyền qua hạ tầng công cộng'),
        Node('warn', 'Cần đánh giá và phê duyệt riêng', 410, 90, 360, 560, 'store',
             sub='\nThông tin nội bộ nhạy cảm chưa được phân loại\n\n'
                 'Dữ liệu có yêu cầu lưu vết và kiểm toán tập trung\n\n'
                 'Trường hợp cần khôi phục khóa tập trung (key escrow)\n\n'
                 'Cần có quy chế sử dụng của đơn vị trước khi triển khai'),
        Node('no', 'Không áp dụng khi chưa có cơ sở pháp lý', 790, 90, 360, 560, 'danger',
             sub='\nThông tin thuộc danh mục bí mật nhà nước\n\n'
                 'Việc truyền, nhận thông tin bí mật nhà nước qua mạng phải sử dụng sản phẩm mật mã và '
                 'tuân thủ quy định về cơ yếu — Luật Bảo vệ bí mật nhà nước năm 2018 và Nghị định số '
                 '26/2020/NĐ-CP.\n\n'
                 'Secure Mail chưa được kiểm định và chưa được cấp phép cho mục đích này.'),
        Node('note7', 'Hồ sơ này khẳng định năng lực kỹ thuật của giải pháp, không khẳng định tư cách '
                      'pháp lý để bảo vệ bí mật nhà nước. Ranh giới này được nêu ngay từ đầu, không phải '
                      'là hạn chế được phát hiện về sau.',
             30, 690, 1120, 110, 'note'),
    ],
    [],
))

if __name__ == '__main__':
    outdir = os.path.abspath(OUT)
    for d in D:
        emit(d, outdir, verbose=True)
        print(f'{d.name:28s} -> svg, drawio, png')
    print(f'\n{len(D)} figures in {outdir}')
