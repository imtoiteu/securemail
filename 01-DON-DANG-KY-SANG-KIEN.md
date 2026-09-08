---
title: Đơn đăng ký sáng kiến cải tiến kỹ thuật
org_top: TỔNG CỤC II
org: HỌC VIỆN KHOA HỌC QUÂN SỰ
author: [Họ và tên tác giả]
header: Đơn đăng ký sáng kiến — Secure Mail
footer: Secure Mail
cover: no
place_date: Hà Nội, ngày ..... tháng ..... năm 2026
---

{{QUOCHIEU}}

# ĐƠN ĐĂNG KÝ

## SÁNG KIẾN CẢI TIẾN KỸ THUẬT NĂM 2026

## A. THÔNG TIN TÁC GIẢ

| | |
| --- | --- |
| Họ và tên | [.............................................] |
| Đơn vị | [Khoa/Phòng] — Học viện Khoa học Quân sự |
| Cấp bậc | [.............................................] |
| Trình độ | [.............................................] |
| Ngày tháng năm sinh | [....... / ....... / ...............] |
| Địa chỉ liên hệ | [.............................................] |
| Điện thoại | [.......................] |
| Thư điện tử | [.......................] |

Là tác giả của sáng kiến/giải pháp: **"Secure Mail — Hệ thống mã hóa đầu cuối thư điện tử trên nền Gmail, bản địa hóa tiếng Việt, phục vụ giảng dạy và bảo đảm an toàn thông tin"**.

Thuộc lĩnh vực: **Công nghệ thông tin — An toàn thông tin**.

## B. HỒ SƠ KÈM THEO

| | Tài liệu | Có |
| --- | --- | --- |
| 1 | Đơn đăng ký sáng kiến | ☒ |
| 2 | Thuyết minh sáng kiến | ☒ |
| 3 | Xác nhận đánh giá hiệu quả mang lại của sáng kiến/giải pháp | ☐ |
| | *Dự kiến hiệu quả khi đưa vào ứng dụng trong thực tiễn* (nộp thay tài liệu số 3) | ☒ |
| 4 | *Phụ lục kỹ thuật* (kèm theo Thuyết minh) | ☒ |
| 5 | *Tóm tắt sáng kiến* | ☒ |
| 6 | *Sản phẩm phần mềm và dữ liệu kiểm chứng* | ☒ |

**Giải trình về tài liệu số 3.** Sáng kiến đã hoàn thành về sản phẩm và đã được kiểm thử kỹ thuật đầy đủ, nhưng **chưa triển khai diện rộng**, nên chưa có cơ sở để đơn vị xác nhận hiệu quả thực tế. Tác giả nộp tài liệu *Dự kiến hiệu quả khi đưa vào ứng dụng trong thực tiễn* theo phương án thay thế mà mẫu hồ sơ cho phép, trong đó nêu rõ căn cứ, giả thiết và cách đo, không quy đổi thành số liệu khi chưa có cơ sở.

## C. DANH SÁCH CÁC ĐỒNG TÁC GIẢ

| TT | Họ và tên | Đơn vị | Cấp bậc, chức vụ | Tỷ lệ đóng góp |
| --- | --- | --- | --- | --- |
| 1 | [Họ và tên] | [Đơn vị] | [Cấp bậc, chức vụ] | 100% |
| 2 | | | | |

*(Nếu sáng kiến do một tác giả thực hiện thì chỉ ghi dòng 1 và gạch chéo các dòng còn lại.)*

## D. TÓM TẮT NỘI DUNG SÁNG KIẾN

**Vấn đề.** Thư điện tử thông thường chỉ được mã hóa trên đường truyền; tại máy chủ của nhà cung cấp, nội dung thư nằm ở dạng rõ suốt thời gian lưu trữ. Tài liệu giảng dạy, đề thi chưa công bố, kết quả học tập, dữ liệu cá nhân của học viên và trao đổi nghiệp vụ nội bộ khi gửi qua thư điện tử đều tồn tại ở dạng đọc được trên hạ tầng mà đơn vị không kiểm soát. Song song, công tác giảng dạy An toàn thông tin thiếu công cụ để học viên thực hành mật mã ứng dụng bằng tiếng Việt.

**Giải pháp.** Tác giả thiết kế và xây dựng **Secure Mail** — hệ thống bổ sung lớp mã hóa đầu cuối theo chuẩn OpenPGP ngay trong giao diện Gmail, không đòi hỏi đổi nhà cung cấp thư điện tử, không cần hạ tầng chứng thực số, không cần máy chủ. Nội dung được mã hóa trên máy người dùng trước khi giao cho Gmail; khóa riêng tư không bao giờ rời khỏi máy trạm.

**Đóng góp của tác giả.** Sáu nhóm đóng góp: (1) mô hình tin cậy khép kín do đơn vị kiểm soát, kèm quy trình quản lý khóa công khai; (2) hệ thuật ngữ mật mã tiếng Việt và bản địa hóa hoàn chỉnh 586/586 chuỗi; (3) thuật toán phân giải ngôn ngữ đa danh mục cho phép chọn ngôn ngữ độc lập với trình duyệt; (4) thiết kế lại luồng xác thực Gmail API với định danh tất định và PKCE; (5) kiến trúc mở rộng sang thiết bị di động tái sử dụng nguyên vẹn lõi mật mã, kèm hợp đồng RPC 22 phương thức và thiết kế 12 màn hình; (6) phương pháp kiểm chứng biến mọi khẳng định an toàn thành lệnh chạy lại được, hiện thực bằng 5 kịch bản kiểm chứng.

**Kết quả kiểm thử.** 517/517 phép thử tự động đạt; 8/8 phép thử liên thông hai chiều với GnuPG 2.4.4; 4/4 điểm cuối bên thứ ba đã gỡ bỏ vắng mặt trong gói phát hành; bản dịch 586/586 chuỗi, 0 lỗi chặn; độ trễ mã hóa một bức thư 15–36 ms.

## Đ. CAM ĐOAN

Tôi xin cam đoan sáng kiến/giải pháp nêu trên là do tôi nghiên cứu, thiết kế và thực hiện.

Sáng kiến được xây dựng trên nền tảng phần mềm nguồn mở Mailvelope (giấy phép AGPL-3.0) và thư viện mật mã OpenPGP.js, được lựa chọn làm linh kiện sau khi đánh giá. Toàn bộ thông báo bản quyền và giấy phép của tác giả gốc được giữ nguyên; nguồn gốc mã nguồn được ghi nhận đầy đủ trong hồ sơ và trong mã nguồn. Phần thiết kế, kiến trúc, thuật toán bản địa hóa, mô hình tin cậy, phương pháp kiểm chứng và toàn bộ mã nguồn mới nêu tại mục D là công sức của tác giả.

Mọi số liệu trong hồ sơ đều được đo hoặc đếm trực tiếp từ mã nguồn và từ bản phát hành, kèm công cụ để chạy lại. Những nội dung chưa có cơ sở thực tế đã được ghi rõ là chưa có, không ước lượng thành số liệu.

Tôi xin chịu trách nhiệm trước pháp luật về lời cam đoan này.

{{SIGNATURE:TÁC GIẢ SÁNG KIẾN|(Ký, ghi rõ họ tên)||CHỈ HUY ĐƠN VỊ|(Ký, đóng dấu)}}
