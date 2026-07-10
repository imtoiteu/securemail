# Hướng dẫn sử dụng Secure Mail với Gmail

> Tài liệu nội bộ. Dành cho người dùng cuối. Yêu cầu đã cài extension theo `INSTALL_CHROME_EDGE_VI.md`.

## 1. Khái niệm cơ bản

- **Khóa công khai (public key)**: dùng để MÃ HÓA thư gửi cho bạn. Có thể chia sẻ thoải mái.
- **Khóa riêng (private key)**: dùng để GIẢI MÃ thư. **Tuyệt đối bí mật**, không gửi cho bất kỳ ai, kể cả admin.
- **Mật khẩu khóa (passphrase)**: bảo vệ khóa riêng. Quên passphrase = mất khả năng giải mã.
- **Vân tay khóa (fingerprint)**: chuỗi định danh duy nhất của khóa, dùng để xác minh.

⚠️ Nếu bạn mất khóa riêng và không có bản sao lưu, **các email đã mã hóa cũ sẽ không thể đọc lại được**. Không ai khôi phục được, kể cả admin.

## 2. Tạo cặp khóa lần đầu

1. Bấm biểu tượng extension → mở **Dashboard / Key Management**.
2. Chọn **Generate key** (Tạo khóa).
3. Nhập: Họ tên, địa chỉ Gmail công ty, passphrase mạnh (khuyến nghị ≥ 12 ký tự).
4. [TODO: chụp màn hình từng bước sau khi build xong]
5. Sau khi tạo xong, **sao lưu khóa ngay** (mục 3).

## 3. Sao lưu khóa riêng (bắt buộc)

1. Key Management → chọn khóa của bạn → **Export** → chọn xuất cả khóa riêng (private).
2. Lưu file `.asc` vào nơi an toàn (USB cất riêng, két, ổ mã hóa). KHÔNG lưu trên email/chat/cloud công khai.
3. Không gửi file này cho admin hay bất kỳ ai.

## 4. Gửi khóa công khai cho admin

1. Key Management → chọn khóa → **Export** → chỉ chọn **public key**.
2. Gửi file public key `.asc` + đọc **fingerprint** cho admin qua kênh xác minh riêng
   (gặp trực tiếp / gọi điện video) — xem quy trình trong `ADMIN_PUBLIC_KEY_MANAGEMENT_VI.md`.

## 5. Nhập khóa công khai của đồng nghiệp

1. Nhận file khóa công khai (`.asc`) từ admin hoặc từ danh bạ khóa nội bộ.
2. Key Management → **Import Keys** → chọn file.
3. Đối chiếu fingerprint với danh bạ khóa nội bộ trước khi tin dùng.

## 6. Gửi email mã hóa trong Gmail

1. Mở Gmail trên trình duyệt đã cài extension.
2. Soạn thư — bấm biểu tượng bút của extension trong khung soạn thư.
3. Soạn nội dung trong cửa sổ soạn thảo bảo mật, chọn người nhận (phải đã có public key).
4. Bấm **Encrypt / Send**.
5. [TODO: chụp màn hình]

## 7. Đọc email mã hóa

1. Mở thư — phần mã hóa hiển thị kèm khung giải mã của extension.
2. Nhập passphrase khi được hỏi.
3. [TODO: chụp màn hình]

## 8. Quy tắc an toàn

- Chỉ email được soạn và gửi qua cửa sổ mã hóa của extension mới được xem là đã mã hóa. Soạn thư trực tiếp trong khung Gmail thường = KHÔNG mã hóa.
- Bản nội bộ hiện tại (v0.1.x) chỉ hỗ trợ và kiểm thử trên Gmail desktop (Chrome/Edge). Các webmail khác chưa được kiểm thử.
- Không bao giờ gửi khóa riêng hoặc passphrase cho bất kỳ ai.
- Admin KHÔNG BAO GIỜ hỏi khóa riêng/passphrase của bạn. Ai hỏi = giả mạo, báo ngay.
- Tiêu đề (subject) email có thể KHÔNG được mã hóa — không ghi thông tin nhạy cảm vào subject.
- Nghi ngờ khóa bị lộ → báo admin ngay để đánh dấu Revoked và tạo khóa mới.

## 9. Câu hỏi thường gặp

[TODO: bổ sung sau đợt dùng thử nội bộ đầu tiên]

Liên hệ hỗ trợ: [TODO]
