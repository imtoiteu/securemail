# Hướng dẫn cài đặt Secure Mail (Chrome / Edge)

> Tài liệu nội bộ — không phổ biến ra ngoài công ty.
> Phiên bản extension: xem `CHANGELOG.md` trong thư mục phát hành.

## 1. Yêu cầu

- Máy tính để bàn (desktop) chạy Windows / macOS / Linux.
- Google Chrome phiên bản 122 trở lên, hoặc Microsoft Edge tương đương.
- Gói phát hành nội bộ do quản trị viên (admin) cung cấp, ví dụ:
  `secure-mail-v0.1.2.zip`
- **Không** cài từ Chrome Web Store. Bản nội bộ chỉ phân phối thủ công.

## 2. Kiểm tra tính toàn vẹn gói cài đặt (khuyến nghị)

1. Nhận file zip và file `SHA256SUMS.txt` từ admin qua kênh nội bộ tin cậy.
2. So sánh mã SHA-256:
   - Windows (PowerShell): `Get-FileHash .\secure-mail-v0.1.2.zip -Algorithm SHA256`
   - macOS/Linux: `shasum -a 256 secure-mail-v0.1.2.zip`
3. Nếu mã không khớp với `SHA256SUMS.txt` → **không cài**, báo lại cho admin.

## 3. Cài đặt trên Chrome

1. Giải nén file zip. Bên trong có thư mục `extension/`.
2. Mở Chrome, vào địa chỉ `chrome://extensions`.
3. Bật **Developer mode** (Chế độ nhà phát triển) ở góc phải trên.
4. Bấm **Load unpacked** (Tải tiện ích đã giải nén).
5. Chọn thư mục `extension/` vừa giải nén.
6. Extension xuất hiện trong danh sách. Ghim (pin) biểu tượng lên thanh công cụ.

## 4. Cài đặt trên Edge

1. Mở Edge, vào địa chỉ `edge://extensions`.
2. Bật **Developer mode** ở cột bên trái.
3. Bấm **Load unpacked** và chọn thư mục `extension/`.

## 5. Sau khi cài đặt

- KHÔNG xóa/di chuyển thư mục `extension/` sau khi cài — trình duyệt đọc trực tiếp từ đó.
- Làm theo `USER_GUIDE_GMAIL_VI.md` để tạo khóa và cấu hình Gmail.

## 6. Cập nhật phiên bản mới

1. Nhận gói phát hành mới từ admin, kiểm tra SHA-256 như mục 2.
2. Giải nén đè vào thư mục cũ (hoặc thư mục mới rồi trỏ lại).
3. Vào `chrome://extensions` → bấm nút **Reload** (↻) trên extension.
4. Khóa và cài đặt của bạn được giữ nguyên (lưu trong trình duyệt, không nằm trong thư mục extension).

## 7. Gỡ cài đặt

- `chrome://extensions` → **Remove**.
- Lưu ý: gỡ extension có thể xóa dữ liệu khóa lưu trong trình duyệt.
  **Hãy sao lưu khóa riêng (private key) trước khi gỡ** — xem `USER_GUIDE_GMAIL_VI.md`.

## 8. Sự cố thường gặp

| Hiện tượng | Cách xử lý |
|---|---|
| Không thấy nút Load unpacked | Chưa bật Developer mode |
| Chrome báo lỗi manifest | Chọn nhầm thư mục — phải chọn đúng thư mục `extension/` chứa `manifest.json` |
| Extension biến mất sau khi khởi động lại | Thư mục `extension/` đã bị xóa/di chuyển |
| Cảnh báo "Developer mode extensions" khi mở trình duyệt | Bình thường với bản cài nội bộ, bấm giữ lại (Keep) |

Liên hệ hỗ trợ: [TODO: tên + kênh liên hệ admin nội bộ]
