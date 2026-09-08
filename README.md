# Hồ sơ sáng kiến cải tiến kỹ thuật — Secure Mail

Bộ hồ sơ lập theo **Mẫu hồ sơ sáng kiến cải tiến kỹ thuật** kèm Công văn số
324/HVKHQS-PKHQS ngày 14/8/2026 của Phòng Khoa học Quân sự, Học viện Khoa học Quân sự.

Tài liệu được soạn bằng Markdown và kết xuất sang DOCX/PDF bằng công cụ trong `tools/`,
nên nội dung vừa đọc được, vừa sửa được, vừa so sánh được giữa các lần chỉnh.

---

## 1. Thành phần hồ sơ

**Ba tài liệu bắt buộc theo mẫu:**

| Tệp | Tài liệu | Số trang |
|---|---|---|
| `01-DON-DANG-KY-SANG-KIEN` | Đơn đăng ký sáng kiến | 4 |
| `02-THUYET-MINH-SANG-KIEN` | Thuyết minh sáng kiến — nội dung chính | 39 |
| `03-DU-KIEN-HIEU-QUA` | Dự kiến hiệu quả khi đưa vào ứng dụng trong thực tiễn | 11 |

Tài liệu số 3 nộp **thay cho** *Xác nhận đánh giá hiệu quả* — phương án mẫu cho phép —
vì sáng kiến chưa triển khai diện rộng nên chưa có cơ sở để đơn vị xác nhận hiệu quả thực tế.

**Tài liệu kèm theo:**

| Tệp | Vai trò | Số trang |
|---|---|---|
| `00-BIA-HO-SO` | Bìa hồ sơ và danh mục tài liệu | 4 |
| `00-TOM-TAT-SANG-KIEN` | Tóm tắt phục vụ Hội đồng đọc nhanh | 4 |
| `PL-PHU-LUC-KY-THUAT` | Phụ lục của Thuyết minh: toàn văn kết quả kiểm thử, đo đạc, kiểm toán, danh mục chức năng, ma trận kiểm thử Android, hướng dẫn tái lập | 24 |

Mỗi tài liệu có ba dạng: `.md` (nguồn, sửa được), `.docx` (nộp), `.pdf` (đọc và in).

> **Mục lục trong DOCX:** mở bằng Word, nhấn `Ctrl+A` rồi `F9` để cập nhật mục lục và số trang.

---

## 2. Những chỗ cần điền trước khi nộp

```sh
grep -rn '\[\.\{5,\}\]\|\[…\]\|\[Họ và tên\|\[Khoa/Phòng\|\[\.\.\.' *.md
```

**Nhóm 1 — thông tin hành chính:** họ tên, năm sinh, cấp bậc, chức vụ, trình độ, đơn vị
(khoa/phòng), địa chỉ, điện thoại, thư điện tử, ngày tháng.

**Nhóm 2 — số liệu chỉ có sau khi triển khai** (chủ yếu ở `03-DU-KIEN-HIEU-QUA`):
quy mô và thời gian thí điểm, số người dùng, đơn giá phương án so sánh.

**Nhóm 3 — kết quả kiểm thử trên thiết bị Android** (`PL-PHU-LUC-KY-THUAT`, mục G):
38 phép thử, cột *Trạng thái* hiện ghi `CHỜ`. Sau khi chạy, đổi thành `ĐẠT`/`KHÔNG ĐẠT`.

Hồ sơ **cố ý** không điền sẵn nhóm 2 và nhóm 3. Toàn bộ lập luận của hồ sơ dựa trên nguyên
tắc "mọi số liệu đều kiểm chứng được"; một bảng kết quả không có thật sẽ là chỗ duy nhất
phá vỡ nguyên tắc đó, và đó chính là chỗ hội đồng kỹ thuật sẽ hỏi.

---

## 3. Tài liệu minh họa

```
assets/
├─ diagrams/       7 sơ đồ × 3 định dạng (.drawio, .svg, .png)
├─ screenshots/    25 ảnh chụp giao diện bản máy tính, sinh tự động từ gói phát hành
├─ mobile-design/  12 màn hình thiết kế Android + 2 bản ghép trình bày
└─ measurements/   kết quả đo và kiểm toán (.json, .txt)
```

**Sơ đồ có tệp `.drawio` để sửa được.** Nếu một hình bị lệch khi mở trên máy khác hoặc cần
đổi chữ, mở tệp `.drawio` tương ứng bằng [diagrams.net](https://app.diagrams.net) rồi sửa
trực tiếp. Cả ba định dạng sinh từ **một định nghĩa duy nhất** trong `tools/make_diagrams.py`;
nếu sửa thẳng trong `.drawio` thì nhớ xuất lại `.png`.

**Ảnh chụp giao diện máy tính là ảnh thật** — nạp chính gói phát hành vào Chrome không giao
diện rồi chụp, kể cả ảnh chùm khóa với hai cặp khóa RSA-4096 sinh thật trong lúc chụp.

**Hình giao diện Android là bản thiết kế**, dựng ở đúng kích thước màn hình thật
(393 × 852). Hồ sơ ghi rõ điều này và không trình bày chúng như ảnh chụp thiết bị.
Mã nguồn thiết kế ở `tools/mobile-ui/`.

---

## 4. Dựng lại toàn bộ hồ sơ

```sh
cd tools
python3 make_diagrams.py                     # 7 sơ đồ → .drawio + .svg + .png
cd mobile-ui && node capture.mjs && python3 compose.py && cd ..
python3 verify_claims.py                     # đối chiếu số liệu với thực tế
python3 check_consistency.py                 # đánh số và tham chiếu chéo

cd ..
for f in 00-BIA-HO-SO 00-TOM-TAT-SANG-KIEN 01-DON-DANG-KY-SANG-KIEN \
         02-THUYET-MINH-SANG-KIEN 03-DU-KIEN-HIEU-QUA PL-PHU-LUC-KY-THUAT; do
  python3 tools/build_docx.py $f.md $f.docx .
done
soffice --headless --convert-to pdf --outdir . *.docx
```

**Yêu cầu:** Python 3 với `python-docx`, `cairosvg`, `Pillow`; LibreOffice để xuất PDF;
Node.js và Chrome for Testing để dựng lại ảnh.

Tài liệu khai báo phông **Times New Roman** theo thể thức văn bản hành chính. Máy dựng PDF
không cài phông này sẽ thay bằng Liberation Serif — tương đương về kích thước chữ nên bố
cục khớp. Bản `.docx` là bản gốc để nộp.

### Tham chiếu chéo trong bản Thuyết minh

Bảng và hình dùng **tham chiếu ký hiệu**, ví dụ `^table: {{t:rpc}} Hợp đồng RPC…` và trong
văn bản viết `{{t:rpc}}`. Số thứ tự được gán khi dựng tài liệu, nên **chèn thêm một bảng
hay một hình sẽ tự đánh số lại mọi tham chiếu tới nó**. Đừng viết tay "Bảng 15" — con số
viết tay chỉ đúng cho tới khi có thứ gì đó được chèn phía trên.

---

## 5. Chạy lại các phép kiểm chứng của sản phẩm

Đây là phần đáng chú ý nhất của hồ sơ: **mọi khẳng định về an toàn đều có một lệnh để kiểm
tra lại.** Chi tiết trong `PL-PHU-LUC-KY-THUAT`, mục D.

```sh
cd ../mailvelope
npx jest --selectProjects unit                        # 449 phép thử kèm nền tảng
node scripts/verify-translation.mjs                   # 586/586, 0 lỗi chặn
./scripts/verify-no-external-endpoints.sh build/chrome
node scripts/interop-gnupg.mjs                        # 8/8 với GnuPG (cần cài gnupg)
node scripts/benchmark-crypto.mjs                     # số liệu hiệu năng

cd ../mobile
npx jest                                              # 68 phép thử tự xây dựng
node test/webview-chromium.mjs                        # lõi mật mã chạy trong Chromium
./scripts/verify-desktop-untouched.sh                 # 161 tệp khớp mã băm
```

---

## 6. Trạng thái hồ sơ

| Hạng mục | Trạng thái |
|---|---|
| Ba tài liệu bắt buộc theo mẫu | Hoàn thành |
| Tài liệu kèm theo | Hoàn thành |
| Hình vẽ và ảnh minh họa | Hoàn thành — 7 sơ đồ, 25 ảnh chụp, 12 thiết kế Android |
| Số liệu đo và kiểm thử | Hoàn thành, tái lập được |
| Tự kiểm chứng số liệu | Xem `assets/measurements/claims-audit.txt` |
| Kiểm tra đánh số và tham chiếu | Không có vấn đề |
| Thông tin hành chính | **Chờ tác giả điền** |
| Kết quả kiểm thử trên thiết bị Android | **Chờ tác giả thực hiện** (ma trận đã lập sẵn) |
| Số liệu triển khai thực tế | **Chờ kỳ thí điểm** |

---

## 7. Lưu ý về phạm vi và về ghi nhận nguồn gốc

Hồ sơ khẳng định **năng lực kỹ thuật**, không khẳng định **tư cách pháp lý** để bảo vệ
thông tin thuộc danh mục bí mật nhà nước. Việc đó phải dùng sản phẩm mật mã của cơ quan có
thẩm quyền theo Luật Bảo vệ bí mật nhà nước 2018 và Nghị định 26/2020/NĐ-CP.

Sản phẩm được xây dựng trên nền phần mềm nguồn mở Mailvelope (AGPL-3.0) và thư viện
OpenPGP.js, được lựa chọn làm linh kiện sau khi đánh giá. Việc ghi nhận nguồn gốc là **yêu
cầu bắt buộc của giấy phép** và là chuẩn mực liêm chính khoa học; nó chiếm khoảng 5 dòng
trong toàn bộ hồ sơ, và chính nó làm cho phần đóng góp của tác giả — mô hình tin cậy, thuật
toán bản địa hóa, thiết kế luồng xác thực, kiến trúc di động, phương pháp kiểm chứng — đứng
vững trước phản biện.

Hai lưu ý trên được nêu ở nhiều tài liệu, không phải chỉ ở chú thích. Xin đừng bỏ khi biên
tập: chính sự chính xác đó làm phần còn lại của hồ sơ đáng tin.
