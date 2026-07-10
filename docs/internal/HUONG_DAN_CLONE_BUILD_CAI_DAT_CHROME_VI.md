# Hướng dẫn clone, build và cài Secure Mail vào Chrome/Edge

Tài liệu này hướng dẫn cách lấy mã nguồn Secure Mail từ GitHub, build extension trên máy tính cá nhân, sau đó cài vào Chrome hoặc Microsoft Edge bằng chế độ **Load unpacked**.

Secure Mail là bản build nội bộ, không thương mại, dựa trên Mailvelope và OpenPGP.js. Công cụ này dùng để hỗ trợ mã hóa/giải mã email trên Gmail web ở máy tính để bàn.

> Lưu ý quan trọng: Admin chỉ quản lý **public key** và **fingerprint**. Admin không quản lý, không thu thập và không giữ **private key** của người dùng.

---

## 1. Mục tiêu sử dụng

Secure Mail được dùng cho một số cá nhân được chỉ định. Công cụ này không phát hành công khai, không đưa lên Chrome Web Store và không dùng cho mục đích thương mại.

Người dùng sẽ tự cài extension vào Chrome/Edge bằng cách:

    chrome://extensions
    Developer mode
    Load unpacked

Sau khi cài, người dùng có thể tạo/import khóa, import public key của người khác và dùng Gmail web để gửi/nhận email mã hóa.

---

## 2. Yêu cầu trước khi cài

Máy tính cần có:

- Google Chrome hoặc Microsoft Edge.
- Git.
- Node.js và npm.
- Quyền truy cập repo GitHub:

    https://github.com/imtoiteu/securemail

Khuyến nghị:

- Dùng Chrome/Edge bản mới.
- Dùng máy cá nhân hoặc máy công ty tin cậy.
- Không cài extension lạ trên trình duyệt dùng cho email nhạy cảm.
- Luôn backup private key sau khi tạo khóa.

---

## 3. Cài Git và Node.js

### 3.1. Trên macOS

Nếu đã có Homebrew, chạy:

    brew install git node

Kiểm tra:

    git --version
    node -v
    npm -v

### 3.2. Trên Windows

Cài:

- Git for Windows
- Node.js LTS

Sau đó mở PowerShell hoặc Git Bash và kiểm tra:

    git --version
    node -v
    npm -v

### 3.3. Trên Ubuntu/Debian

Chạy:

    sudo apt update
    sudo apt install -y git nodejs npm

Kiểm tra:

    git --version
    node -v
    npm -v

---

## 4. Clone repo Secure Mail về máy

Chọn một thư mục dễ nhớ, ví dụ Desktop.

### macOS/Linux

    cd ~/Desktop
    git clone https://github.com/imtoiteu/securemail.git
    cd securemail
    git checkout internal-stable-v1

### Windows PowerShell

    cd $HOME\Desktop
    git clone https://github.com/imtoiteu/securemail.git
    cd securemail
    git checkout internal-stable-v1

Kiểm tra branch hiện tại:

    git branch

Branch đúng là:

    internal-stable-v1

---

## 5. Cài thư viện phụ thuộc

Trong thư mục `securemail`, chạy:

    npm ci

Nếu máy báo thiếu `grunt`, cài thêm:

    npm install -g grunt-cli

Kiểm tra:

    npx grunt --version

---

## 6. Build extension

Trong thư mục `securemail`, chạy:

    npx grunt prod

Sau khi build xong, kiểm tra thư mục build.

Trên macOS/Linux:

    ls build/chrome

Trên Windows PowerShell:

    dir build\chrome

Nếu build thành công, thư mục dùng để cài extension là:

    securemail/build/chrome

Đây là thư mục sẽ được chọn trong bước **Load unpacked**.

---

## 7. Cài Secure Mail vào Google Chrome

Mở Chrome và truy cập:

    chrome://extensions

Sau đó thực hiện:

1. Bật **Developer mode** ở góc trên bên phải.
2. Chọn **Load unpacked**.
3. Chọn thư mục:

       securemail/build/chrome

4. Sau khi cài xong, Chrome sẽ hiện extension **Secure Mail**.
5. Có thể bấm biểu tượng ghim extension để hiện trên thanh công cụ.

Lưu ý: Không chọn nhầm thư mục `securemail`. Phải chọn đúng thư mục `build/chrome`.

---

## 8. Cài Secure Mail vào Microsoft Edge

Mở Edge và truy cập:

    edge://extensions

Sau đó thực hiện:

1. Bật **Developer mode**.
2. Chọn **Load unpacked**.
3. Chọn thư mục:

       securemail/build/chrome

4. Kiểm tra extension **Secure Mail** đã xuất hiện.

---

## 9. Mở Secure Mail lần đầu

Sau khi cài extension:

1. Bấm biểu tượng **Secure Mail** trên thanh công cụ.
2. Mở trang thiết lập ban đầu.
3. Chọn một trong hai cách:
   - **Generate key** nếu chưa có khóa.
   - **Import Key** nếu đã có khóa từ máy khác.

Nếu là lần đầu sử dụng, chọn:

    Generate key

---

## 10. Tạo key mới

Khi tạo key, cần lưu ý:

- Dùng đúng địa chỉ Gmail sẽ sử dụng với Secure Mail.
- Đặt passphrase mạnh.
- Không chia sẻ passphrase cho người khác.
- Không gửi private key qua email, chat hoặc kênh không an toàn.

Sau khi tạo key, người dùng cần export **public key** để gửi cho admin.

---

## 11. Gửi public key cho admin

Người dùng chỉ gửi cho admin:

    Public key
    Fingerprint
    Email Gmail tương ứng

Không gửi:

    Private key
    Passphrase
    File backup private key chưa mã hóa

Admin sẽ thêm public key vào bảng quản lý nội bộ.

Bảng quản lý public key nên gồm:

    ID
    Họ tên
    Gmail
    Fingerprint
    Public key
    Ngày thêm
    Ngày xác minh
    Người xác minh
    Trạng thái: Active / Replaced / Revoked / Suspended
    Ghi chú

---

## 12. Import public key của người khác

Để gửi email mã hóa cho người khác, bạn cần public key của họ.

Cách làm:

1. Admin cung cấp file public key tổng hợp, ví dụ:

       company-public-keys.asc

2. Mở Secure Mail.
3. Vào phần quản lý key.
4. Chọn import public key.
5. Import file `.asc` do admin cung cấp.

Sau khi import, bạn có thể gửi email mã hóa cho những người có public key trong danh bạ khóa.

---

## 13. Gửi email mã hóa trên Gmail

1. Mở Gmail trên Chrome/Edge.
2. Soạn email mới.
3. Sử dụng chức năng mã hóa của Secure Mail.
4. Chọn người nhận đã có public key.
5. Soạn nội dung trong khung mã hóa an toàn.
6. Mã hóa nội dung trước khi gửi.

Lưu ý:

- Không nên gõ nội dung nhạy cảm trực tiếp vào Gmail nếu chưa chắc nội dung đó sẽ được mã hóa.
- Chỉ email được xử lý qua luồng mã hóa của Secure Mail mới được xem là email mã hóa đầu cuối.
- Subject, người gửi, người nhận và thời gian gửi có thể vẫn không được mã hóa như nội dung email.

---

## 14. Đọc email mã hóa

Khi nhận email mã hóa:

1. Mở email trong Gmail.
2. Secure Mail sẽ nhận diện nội dung được mã hóa.
3. Chọn decrypt/giải mã.
4. Nhập passphrase private key nếu được yêu cầu.
5. Đọc nội dung đã giải mã.

Nếu không giải mã được, kiểm tra:

- Có đúng private key không.
- Có nhập đúng passphrase không.
- Email có được mã hóa cho đúng public key của bạn không.
- Key có bị thay thế hoặc thu hồi không.

---

## 15. Backup private key

Đây là bước rất quan trọng.

Sau khi tạo key, người dùng nên export và backup private key ở nơi an toàn.

Khuyến nghị:

- Lưu file backup trong ổ mã hóa hoặc nơi lưu trữ bảo mật.
- Đặt passphrase mạnh.
- Không gửi private key qua email/chat.
- Không đưa private key cho admin nếu chưa có quy chế riêng của công ty.
- Không lưu private key ở nơi người khác dễ truy cập.

Nếu mất private key và không có backup, các email cũ đã mã hóa cho key đó có thể không đọc lại được.

---

## 16. Khi đổi máy

Nếu còn private key backup:

1. Cài Secure Mail trên máy mới.
2. Import private key cũ.
3. Dùng lại bình thường.

Nếu mất private key:

1. Tạo key mới.
2. Báo admin đánh dấu key cũ là `Replaced` hoặc `Revoked`.
3. Gửi public key mới cho admin.
4. Những người khác cần import public key mới của bạn.

---

## 17. Khi nghi ngờ lộ key

Nếu nghi ngờ private key hoặc passphrase bị lộ:

1. Ngừng dùng key đó.
2. Báo admin.
3. Admin đánh dấu key là `Suspended` hoặc `Revoked`.
4. Tạo key mới.
5. Gửi public key mới cho admin.
6. Thông báo người dùng khác import key mới.

---

## 18. Cập nhật Secure Mail

Khi có bản mới, trong thư mục `securemail`, chạy:

    git pull
    npm ci
    npx grunt prod

Sau đó vào Chrome:

    chrome://extensions

Bấm **Reload** ở extension Secure Mail.

Nếu thay đổi lớn, có thể remove extension cũ rồi **Load unpacked** lại thư mục:

    securemail/build/chrome

---

## 19. Gỡ Secure Mail khỏi Chrome/Edge

Vào:

    chrome://extensions

hoặc:

    edge://extensions

Sau đó chọn **Remove** ở Secure Mail.

Lưu ý:

- Trước khi gỡ, hãy chắc chắn đã backup private key nếu còn cần đọc email mã hóa cũ.
- Gỡ extension có thể làm mất dữ liệu local nếu chưa backup đúng cách.

---

## 20. Lỗi thường gặp

### Không thấy nút Load unpacked

Kiểm tra đã bật **Developer mode** chưa.

### Load unpacked báo lỗi manifest

Kiểm tra đã chọn đúng thư mục chưa.

Phải chọn:

    securemail/build/chrome

Không chọn nhầm thư mục repo gốc:

    securemail

### Build lỗi

Thử chạy lại:

    npm ci
    npx grunt prod

Nếu vẫn lỗi, gửi nội dung lỗi cho admin kỹ thuật.

### Gmail không hiện chức năng mã hóa

Thử:

1. Reload Gmail.
2. Reload extension trong `chrome://extensions`.
3. Đóng mở lại Chrome.
4. Kiểm tra đang dùng đúng thư mục `build/chrome`.

### Không giải mã được email

Kiểm tra:

- Đúng private key chưa.
- Đúng passphrase chưa.
- Email có được mã hóa cho key của bạn không.
- Key đã bị thay thế/thu hồi chưa.

---

## 21. Nguyên tắc an toàn cần nhớ

- Public key có thể chia sẻ.
- Private key phải giữ bí mật.
- Admin không cần private key của người dùng.
- Không gửi private key qua email/chat.
- Luôn backup private key.
- Luôn xác minh fingerprint khi thêm key mới.
- Không cài bản Secure Mail từ nguồn không rõ.
- Chỉ dùng bản do admin cung cấp hoặc repo chính thức của nhóm.
- Không tự ý sửa source nếu không biết rõ tác động.

---

## 22. Tóm tắt nhanh

Clone và build:

    git clone https://github.com/imtoiteu/securemail.git
    cd securemail
    git checkout internal-stable-v1
    npm ci
    npx grunt prod

Thư mục cài vào Chrome/Edge:

    securemail/build/chrome

Cài vào Chrome:

    chrome://extensions
    Developer mode → Load unpacked → chọn securemail/build/chrome

Cài vào Edge:

    edge://extensions
    Developer mode → Load unpacked → chọn securemail/build/chrome
