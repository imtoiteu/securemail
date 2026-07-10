# Quy trình quản lý khóa công khai (dành cho Admin)

> Tài liệu nội bộ. Vai trò admin: quản lý **khóa công khai**, fingerprint, trạng thái người dùng và phiên bản phát hành.
> Admin **không** quản lý, không thu thập, không lưu trữ khóa riêng của người dùng.

## 1. Nguyên tắc bất di bất dịch

- Khóa công khai: được phép chia sẻ, lưu trữ, phân phối nội bộ.
- Khóa riêng: bí mật tuyệt đối của từng người dùng. Admin **không bao giờ** yêu cầu khóa riêng hoặc passphrase, dưới bất kỳ hình thức nào.
- Người dùng tự sao lưu khóa riêng. Mất khóa riêng + không có backup = email mã hóa cũ không đọc lại được.
- Fingerprint phải được xác minh **ngoài băng** (out-of-band): gặp trực tiếp, gọi video, hoặc kênh đã xác thực — không tin fingerprint chỉ vì nó nằm trong email.

## 2. Danh bạ khóa nội bộ (Public Key Directory)

Phiên bản 1 KHÔNG dùng keyserver. Dùng file danh bạ do admin quản lý,
mẫu tại `public-key-directory-template.csv`, gồm các cột:

| Cột | Ý nghĩa |
|---|---|
| ID | Mã định danh nội bộ |
| Full name | Họ tên |
| Gmail address | Địa chỉ Gmail |
| Public key fingerprint | Vân tay khóa (40 hex, viết nhóm 4) |
| Public key block | Khối khóa công khai ASCII-armored hoặc đường dẫn file `.asc` |
| Date added | Ngày thêm |
| Date verified | Ngày xác minh fingerprint |
| Verified by | Người xác minh |
| Status | Active / Replaced / Revoked / Suspended |
| Notes | Ghi chú |

Có thể phát hành kèm bundle `.asc` gộp toàn bộ khóa Active
(xem mẫu `company-public-keys-example.asc`).

## 3. Quy trình thêm khóa mới

1. Người dùng tự tạo khóa theo `USER_GUIDE_GMAIL_VI.md` và gửi **public key** cho admin.
2. Admin nhập khóa vào extension của mình, đọc fingerprint.
3. Xác minh fingerprint ngoài băng với chính chủ (đọc đối chiếu từng nhóm ký tự).
4. Ghi vào danh bạ: Status = Active, điền Date verified, Verified by.
5. Phân phối khóa/bundle cập nhật cho các thành viên liên quan.

## 4. Thay khóa (key rotation / user đổi khóa)

1. Khóa cũ → Status = **Replaced**, ghi chú fingerprint khóa thay thế.
2. Khóa mới → quy trình thêm khóa như mục 3.
3. Thông báo cho các thành viên gửi thư cho người này.

## 5. Khóa nghi ngờ bị lộ

1. Đánh dấu ngay Status = **Suspended** (nghi ngờ) hoặc **Revoked** (xác nhận lộ).
2. Yêu cầu người dùng tạo khóa mới, xác minh lại từ đầu.
3. Thông báo toàn bộ nhóm ngừng mã hóa bằng khóa cũ.
4. Ghi sự cố vào Notes (ngày, lý do, người xử lý).

## 6. Người dùng rời công ty / tạm ngưng

- Rời công ty: Status = **Revoked**, ghi ngày.
- Tạm ngưng sử dụng: Status = **Suspended**.

## 7. Checklist định kỳ (gợi ý hàng quý)

- [ ] Đối chiếu danh bạ với danh sách nhân sự thực tế.
- [ ] Kiểm tra các khóa Suspended quá hạn xử lý.
- [ ] Sao lưu file danh bạ (chỉ chứa khóa công khai — được phép sao lưu).
- [ ] [TODO: bổ sung theo thực tế vận hành]
