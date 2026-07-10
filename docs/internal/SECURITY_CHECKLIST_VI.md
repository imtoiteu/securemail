# Checklist an ninh (Security Checklist)

> Tài liệu nội bộ. Rà soát TRƯỚC MỖI LẦN phát hành và định kỳ trong vận hành.

## A. Trước mỗi lần phát hành

### Toàn vẹn mã nguồn
- [ ] Nguồn build đúng snapshot cố định (`SOURCE_SNAPSHOT.md`: Mailvelope v6.3.0, commit `ffaa27af...`).
- [ ] Không có thay đổi nào trong lõi mật mã: `src/modules/crypto*`, luồng mã hóa/giải mã, xử lý khóa riêng, passphrase (đối chiếu `git diff master...internal-stable-v1 -- src/`).
- [ ] `npm ci` chạy từ `package-lock.json` gốc — không nâng cấp dependency tùy tiện.
- [ ] Không thêm dependency mới ngoài kế hoạch đã duyệt.

### Quyền và hành vi extension
- [ ] `manifest.json` build ra không thêm permission/host mới so với upstream.
- [ ] Không có telemetry, analytics, tracker, remote code loading nào được thêm vào.
- [ ] Không có endpoint mạng mới (grep các URL lạ trong diff).

### Khóa và dữ liệu người dùng
- [ ] Gói phát hành không chứa khóa riêng, passphrase, dữ liệu người dùng thật.
- [ ] Tài liệu không hướng dẫn hành vi nguy hiểm (gửi private key, lưu passphrase plaintext...).

### Gói phát hành
- [ ] `LICENSE` (AGPL) và ghi công Mailvelope còn nguyên trong gói.
- [ ] `SHA256SUMS.txt` được tạo và khớp toàn bộ file.
- [ ] Zip phát hành không chứa `node_modules`, `.git`, file tạm, file cá nhân.

## B. Vận hành định kỳ

- [ ] Danh bạ khóa công khai đúng trạng thái (Active/Replaced/Revoked/Suspended).
- [ ] Không có khóa Suspended tồn đọng chưa xử lý.
- [ ] Kênh phân phối gói phát hành vẫn là kênh nội bộ tin cậy.
- [ ] Nhắc người dùng: admin không bao giờ hỏi khóa riêng/passphrase.

## C. Ứng phó sự cố

- [ ] Có quy trình xử lý khóa lộ (xem `ADMIN_PUBLIC_KEY_MANAGEMENT_VI.md` mục 5).
- [ ] Có đầu mối nhận báo cáo sự cố: [TODO]
- [ ] Ghi nhận sự cố vào sổ theo dõi nội bộ: [TODO: vị trí]

## D. Điều cấm tuyệt đối (nhắc lại)

- Thu thập/lưu trữ khóa riêng của người dùng dưới mọi hình thức.
- Làm yếu hành vi bảo vệ khóa riêng/passphrase của Mailvelope.
- Thêm telemetry/analytics/remote code.
- Phát hành công khai (Web Store, repo public).
