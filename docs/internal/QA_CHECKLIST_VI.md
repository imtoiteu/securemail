# Checklist kiểm thử (QA Checklist)

> Tài liệu nội bộ. Thực hiện trên bản build production TRƯỚC khi phát hành.
> Môi trường chuẩn: Chrome mới nhất + Gmail desktop. Lặp lại các mục chính trên Edge.

## 1. Cài đặt

- [ ] Load unpacked thư mục `extension/` thành công, không lỗi trong `chrome://extensions`.
- [ ] Icon extension hiển thị, popup (action menu) mở được.
- [ ] Trang cài đặt/dashboard mở được, không lỗi console nghiêm trọng.
- [ ] Reload extension không mất dữ liệu khóa.

## 2. Quản lý khóa

- [ ] Tạo cặp khóa mới (tên + Gmail + passphrase) thành công.
- [ ] Export public key (.asc) thành công.
- [ ] Export private key (backup) thành công, có cảnh báo phù hợp.
- [ ] Import public key của người khác từ file .asc thành công.
- [ ] Fingerprint hiển thị và khớp khi đối chiếu.
- [ ] Xóa khóa hoạt động đúng.

## 3. Gmail — luồng chính

- [ ] Extension nhận diện khung soạn thư Gmail (nút compose bảo mật xuất hiện).
- [ ] Gửi email mã hóa cho người có public key → người nhận giải mã đọc được.
- [ ] Nhận email mã hóa → khung giải mã hiện, nhập passphrase giải mã thành công.
- [ ] Nhập sai passphrase → báo lỗi, không crash.
- [ ] Gửi cho người KHÔNG có public key → có cảnh báo/chặn hợp lý.
- [ ] Ký (sign) và xác minh chữ ký hoạt động.
- [ ] File đính kèm mã hóa (nếu dùng) gửi/nhận đúng.

## 4. Trường hợp biên

- [ ] Email tiếng Việt có dấu: mã hóa/giải mã không hỏng ký tự.
- [ ] Email dài / nhiều người nhận.
- [ ] Trả lời (reply) và chuyển tiếp (forward) thư mã hóa.
- [ ] Hai tài khoản Gmail trong cùng trình duyệt (nếu áp dụng).

## 5. Cập nhật & gỡ

- [ ] Ghi đè bản mới + Reload → khóa và cài đặt còn nguyên.
- [ ] Gỡ extension sau khi đã backup khóa → cài lại + import backup → giải mã lại được thư cũ.

## 6. Gói phát hành

- [ ] SHA-256 của zip khớp `SHA256SUMS.txt`.
- [ ] Giải nén zip trên máy sạch → cài và chạy được theo `INSTALL_CHROME_EDGE_VI.md`.
- [ ] Tài liệu VI trong gói mở đọc bình thường.

Kết quả kiểm thử ghi tại: [TODO: nơi lưu biên bản QA] — ghi rõ phiên bản, ngày, người test, môi trường.
