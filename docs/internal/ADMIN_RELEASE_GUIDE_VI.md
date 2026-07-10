# Hướng dẫn phát hành nội bộ (dành cho Admin)

> Tài liệu nội bộ. Quy trình đóng gói và phân phối Secure Mail cho người dùng nội bộ.
> KHÔNG phát hành công khai. KHÔNG đưa lên Chrome Web Store.

## 1. Môi trường build

- Node.js ≥ 24 (đã dùng: v24.15.0 qua nvm), npm ≥ 11 (đã dùng: 11.12.1).
- Nguồn: snapshot cố định — xem `SOURCE_SNAPSHOT.md` (v6.3.0, commit `ffaa27af...`).
- Không tự ý sync code mới từ upstream Mailvelope.

## 2. Lệnh build

```sh
source ~/.nvm/nvm.sh && nvm use v24.15.0
npm ci            # cài đúng phiên bản theo package-lock.json
npx grunt prod    # build production → build/chrome/
npx grunt dist-cr # đóng gói zip → dist/mailvelope.chrome.zip
```

Chi tiết build và các quyết định liên quan: xem `BUILD_NOTES.md`.

## 3. Cấu trúc thư mục phát hành

```
releases/secure-mail-vX.Y.Z/
├── extension/                      # nội dung build/chrome/ (Load unpacked)
├── INSTALL_CHROME_EDGE_VI.md
├── USER_GUIDE_GMAIL_VI.md
├── ADMIN_PUBLIC_KEY_MANAGEMENT_VI.md
├── ADMIN_RELEASE_GUIDE_VI.md
├── SECURITY_CHECKLIST_VI.md
├── QA_CHECKLIST_VI.md
├── SOURCE_SNAPSHOT.md
├── BUILD_NOTES.md
├── CHANGELOG.md
├── SHA256SUMS.txt
└── LICENSE                         # AGPL — bắt buộc giữ nguyên
```

Kèm file nén: `secure-mail-vX.Y.Z.zip`.

## 4. Quy trình phát hành

1. Chốt thay đổi trên nhánh `internal-stable-v1`, cập nhật `CHANGELOG_INTERNAL.md`.
2. Build theo mục 2. Kiểm thử theo `QA_CHECKLIST_VI.md`.
3. Rà soát `SECURITY_CHECKLIST_VI.md`.
4. Tạo thư mục phát hành theo mục 3, copy `build/chrome/` → `extension/`.
5. Tạo checksum:
   ```sh
   cd releases/secure-mail-vX.Y.Z
   find . -type f ! -name SHA256SUMS.txt -exec sha256sum {} \; > SHA256SUMS.txt
   cd .. && zip -r secure-mail-vX.Y.Z.zip secure-mail-vX.Y.Z
   sha256sum secure-mail-vX.Y.Z.zip >> secure-mail-vX.Y.Z/SHA256SUMS.txt
   ```
6. Gắn tag git nội bộ: `git tag internal-vX.Y.Z` (không push remote công khai).
7. Phân phối zip + mã SHA-256 qua kênh nội bộ tin cậy (mã hash gửi qua kênh KHÁC với file).

## 5. Đánh số phiên bản

- Bản nội bộ dùng `secure-mail-vX.Y.Z` (từ `v0.1.2`; các bản `v0.1.0`/`v0.1.1` trước đây dùng tiền tố `company-secure-mail-`).
- Ghi rõ trong CHANGELOG bản này dựa trên Mailvelope v6.3.0.

## 6. Điều cấm

- Không đưa lên Chrome Web Store / addons.mozilla.org.
- Không push lên repo công khai.
- Không xóa/sửa file LICENSE và ghi công Mailvelope.
- Không kèm khóa riêng hoặc dữ liệu người dùng vào gói phát hành.
