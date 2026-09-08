# Hồ sơ sáng kiến — Secure Mail

Bộ hồ sơ đăng ký sáng kiến cho **Secure Mail** — giải pháp mã hóa đầu cuối thư điện tử
trên nền Gmail, bản địa hóa tiếng Việt, phục vụ giảng dạy và công tác bảo đảm an toàn
thông tin.

Toàn bộ tài liệu được soạn bằng Markdown và kết xuất sang DOCX/PDF bằng công cụ trong
`tools/`, nên nội dung vừa đọc được, vừa sửa được, vừa so sánh được giữa các lần chỉnh.

---

## 1. Các tài liệu

| Tệp | Nội dung | Số trang |
|---|---|---|
| `00-TOM-TAT-SANG-KIEN` | Tóm tắt cho Hội đồng — đọc trước | 4 |
| `01-DON-DANG-KY-SANG-KIEN` | Đơn đăng ký sáng kiến (biểu mẫu) | 5 |
| `02-THUYET-MINH-SANG-KIEN` | Bản thuyết minh chính — 12 hình, 17 bảng | 58 |
| `03-PHU-LUC-KY-THUAT` | Toàn văn kết quả kiểm thử, đo đạc, kiểm toán; hướng dẫn tái lập | 18 |
| `04-DU-KIEN-HIEU-QUA` | Dự kiến hiệu quả khi đưa vào ứng dụng | 11 |

Mỗi tài liệu có ba dạng: `.md` (nguồn, sửa được), `.docx` (nộp), `.pdf` (đọc và in).

> **Mục lục trong DOCX:** mở tệp bằng Word, nhấn `Ctrl+A` rồi `F9` để cập nhật
> mục lục và số trang. Trường mục lục được nhúng sẵn nhưng Word chỉ điền nội
> dung khi được yêu cầu cập nhật.

---

## 2. Những chỗ cần điền trước khi nộp

Các ô đánh dấu `[…]` là thông tin chỉ tác giả hoặc đơn vị mới cung cấp được.
Tìm nhanh bằng:

```sh
grep -rn '\[…\]\|\[Họ và tên\|\[Tên đơn vị\|\[TÊN \|\[Địa danh\|\[Trình độ\|\[…' *.md
```

Nhóm 1 — **thông tin hành chính** (có trong phần đầu mỗi tệp `.md`):
tên cơ quan chủ quản, tên đơn vị, họ tên tác giả, ngày sinh, cấp bậc/chức vụ,
trình độ chuyên môn, điện thoại, thư điện tử, địa danh và ngày tháng.

Nhóm 2 — **số liệu chỉ có sau khi triển khai** (tập trung ở `04-DU-KIEN-HIEU-QUA`):
quy mô và thời gian thí điểm, số người dùng dự kiến, đơn giá phương án thay thế
được chọn để so sánh, và các chỉ tiêu tại Bảng 4 của tài liệu đó.

Hồ sơ **cố ý** không điền sẵn số liệu ước lượng cho nhóm 2. Với một sáng kiến về an
toàn thông tin, một con số hiệu quả kinh tế không có căn cứ sẽ làm hỏng chính độ tin
cậy mà phần còn lại của hồ sơ dựng lên.

---

## 3. Tài liệu minh họa

```
assets/
├─ diagrams/      7 sơ đồ × 3 định dạng (.drawio, .svg, .png)
├─ screenshots/   25 ảnh chụp giao diện, sinh tự động từ gói phát hành
└─ measurements/  kết quả đo và kiểm toán (.json, .txt)
```

**Sơ đồ có tệp `.drawio` để sửa được.** Nếu một hình bị lệch khi mở trên máy khác,
hoặc cần đổi chữ, mở tệp `.drawio` tương ứng bằng [diagrams.net](https://app.diagrams.net)
(hoặc phần mềm draw.io trên máy) rồi sửa trực tiếp — không cần chạy lại công cụ.

Cả ba định dạng sinh ra từ **một định nghĩa duy nhất** trong `tools/make_diagrams.py`,
nên nếu sửa ở đó rồi chạy lại thì cả ba khớp nhau. Nếu sửa thẳng trong `.drawio` thì
nhớ xuất lại `.png` để tài liệu dùng đúng hình đã sửa.

**Ảnh chụp giao diện là ảnh thật.** Chúng được sinh bằng cách nạp chính gói phát hành
vào Chrome ở chế độ không giao diện rồi chụp lại, kể cả ảnh chùm khóa — hai cặp khóa
RSA-4096 trong ảnh được sinh thật qua giao diện trong lúc chụp. Không có ảnh dựng
hay ảnh chỉnh sửa.

---

## 4. Dựng lại toàn bộ hồ sơ

```sh
cd tools

python3 make_diagrams.py                     # 7 sơ đồ → .drawio + .svg + .png
python3 verify_claims.py                     # đối chiếu 33 số liệu với thực tế
python3 check_consistency.py                 # đánh số và tham chiếu chéo

cd ..
for f in 00-TOM-TAT-SANG-KIEN 01-DON-DANG-KY-SANG-KIEN \
         02-THUYET-MINH-SANG-KIEN 03-PHU-LUC-KY-THUAT 04-DU-KIEN-HIEU-QUA; do
  python3 tools/build_docx.py $f.md $f.docx .
done
soffice --headless --convert-to pdf --outdir . *.docx
```

**Yêu cầu:** Python 3 với `python-docx` và `cairosvg`; LibreOffice để xuất PDF.

Tài liệu khai báo phông **Times New Roman** theo thể thức văn bản hành chính. Máy dựng
PDF không cài phông này sẽ thay bằng Liberation Serif — phông tương đương về kích thước
chữ, nên bố cục PDF khớp với DOCX. Bản `.docx` là bản gốc để nộp.

---

## 5. Chạy lại các phép kiểm chứng của sản phẩm

Đây là phần đáng chú ý nhất của hồ sơ: **mọi khẳng định về an toàn đều có một lệnh để
kiểm tra lại.** Chi tiết trong `03-PHU-LUC-KY-THUAT`, mục D.

```sh
cd ../mailvelope
npx jest --selectProjects unit                        # 449 phép thử kế thừa
node scripts/verify-translation.mjs                   # 586/586, 0 lỗi chặn
./scripts/verify-no-external-endpoints.sh build/chrome
node scripts/interop-gnupg.mjs                        # 8/8 với GnuPG (cần cài gnupg)
node scripts/benchmark-crypto.mjs                     # số liệu hiệu năng

cd ../mobile
npx jest                                              # 68 phép thử tự xây dựng
./scripts/verify-desktop-untouched.sh                 # 161 tệp khớp mã băm
```

---

## 6. Trạng thái hồ sơ

| Hạng mục | Trạng thái |
|---|---|
| Nội dung 5 tài liệu | Hoàn thành |
| Hình vẽ và ảnh minh họa | Hoàn thành — 7 sơ đồ, 25 ảnh chụp |
| Số liệu đo và kiểm thử | Hoàn thành, tái lập được |
| Tự kiểm chứng số liệu | 33/33 đạt |
| Kiểm tra đánh số và tham chiếu | Không có vấn đề |
| Thông tin hành chính | **Chờ tác giả điền** |
| Số liệu triển khai thực tế | **Chờ kỳ thí điểm** |

---

## 7. Lưu ý về phạm vi

Hồ sơ khẳng định **năng lực kỹ thuật** của giải pháp, không khẳng định **tư cách pháp lý**
để bảo vệ thông tin thuộc danh mục bí mật nhà nước. Việc truyền, nhận thông tin thuộc
danh mục đó qua mạng phải sử dụng sản phẩm mật mã và tuân thủ quy định về cơ yếu — Luật
Bảo vệ bí mật nhà nước năm 2018 và Nghị định số 26/2020/NĐ-CP. Secure Mail chưa được
kiểm định và chưa được cấp phép cho mục đích này.

Ranh giới này được nêu ở cả năm tài liệu, không phải chỉ ở phần chú thích. Xin đừng bỏ
đi khi biên tập: chính sự chính xác đó làm phần còn lại của hồ sơ đáng tin.
