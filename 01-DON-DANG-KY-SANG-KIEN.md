---
title: Đơn đăng ký sáng kiến
kind: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
org_top: [TÊN CƠ QUAN CHỦ QUẢN]
org: [TÊN ĐƠN VỊ]
author: [Họ và tên tác giả]
header: Đơn đăng ký sáng kiến — Secure Mail
footer: Secure Mail
cover: no
---

# CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM

## Độc lập — Tự do — Hạnh phúc

*[Địa danh], ngày ….. tháng ….. năm 2026*

# ĐƠN ĐĂNG KÝ SÁNG KIẾN

**Kính gửi:** Hội đồng xét duyệt sáng kiến [Tên cơ quan]

## I. THÔNG TIN TÁC GIẢ

| | |
| --- | --- |
| Họ và tên | [Họ và tên] |
| Ngày tháng năm sinh | [……/……/………] |
| Cấp bậc, chức vụ | Giảng viên |
| Đơn vị công tác | [Tên đơn vị] |
| Trình độ chuyên môn | [Trình độ] |
| Chuyên ngành giảng dạy | An toàn thông tin trên không gian mạng |
| Điện thoại | [………………] |
| Thư điện tử | [………………] |
| Tỷ lệ đóng góp vào sáng kiến | 100% |

*Ghi chú: nếu sáng kiến có đồng tác giả, bổ sung bảng tương tự và ghi rõ tỷ lệ đóng góp của từng người.*

## II. THÔNG TIN SÁNG KIẾN

| | |
| --- | --- |
| Tên sáng kiến | **Secure Mail — Giải pháp mã hóa đầu cuối thư điện tử trên nền Gmail, bản địa hóa tiếng Việt, phục vụ giảng dạy và công tác bảo đảm an toàn thông tin** |
| Lĩnh vực áp dụng | Công nghệ thông tin — An toàn thông tin |
| Thời gian bắt đầu áp dụng | [……/……/2026] |
| Đơn vị áp dụng | [Tên đơn vị] |
| Phạm vi áp dụng | Giảng dạy và thực hành An toàn thông tin; bảo vệ tài liệu giảng dạy và trao đổi nghiệp vụ nội bộ không thuộc danh mục bí mật nhà nước |

## III. MÔ TẢ TÓM TẮT NỘI DUNG SÁNG KIẾN

### 1. Tình trạng trước khi có sáng kiến

Thư điện tử thông thường chỉ được mã hóa trên đường truyền; tại máy chủ của nhà cung cấp, nội dung thư nằm ở dạng rõ trong suốt thời gian lưu trữ. Tài liệu giảng dạy, đề thi chưa công bố, kết quả học tập, dữ liệu cá nhân của người học và trao đổi nghiệp vụ nội bộ khi gửi qua thư điện tử đều tồn tại ở dạng đọc được trên hạ tầng mà đơn vị không kiểm soát.

Các công cụ mã hóa đầu cuối hiện có đều không đáp ứng được điều kiện triển khai của đơn vị: hoặc buộc phải chuyển toàn bộ hộp thư sang nhà cung cấp nước ngoài, hoặc đòi hỏi hạ tầng chứng thực số, hoặc có rào cản sử dụng quá cao. Nhóm gần nhất — tiện ích mã hóa cho trình duyệt — thì **không có giao diện tiếng Việt, mặc định tra cứu máy chủ khóa ở nước ngoài, có kèm thư viện đo lường từ xa trong gói cài đặt, và chặn tài khoản Google Workspace bằng cơ chế kiểm tra giấy phép thương mại gọi về máy chủ của nhà phát triển**.

Đồng thời, công tác giảng dạy An toàn thông tin thiếu một công cụ thực hành mật mã ứng dụng bằng tiếng Việt: người học phải vượt cùng lúc rào cản khái niệm và rào cản ngôn ngữ.

### 2. Nội dung sáng kiến

Xây dựng **Secure Mail** — tiện ích trình duyệt bổ sung lớp mã hóa đầu cuối theo chuẩn OpenPGP ngay trong giao diện Gmail. Nội dung thư được mã hóa trên máy người dùng trước khi giao cho Gmail; khóa riêng tư không bao giờ rời khỏi máy trạm. Giải pháp không đòi hỏi đổi nhà cung cấp thư điện tử, không cần hạ tầng mới, không cần chứng thư số.

Sáng kiến kế thừa phần mềm nguồn mở Mailvelope 6.3.0 (giấy phép AGPL-3.0), **giữ nguyên lõi mật mã đã được kiểm chứng** — một quyết định kỹ thuật có chủ đích — và thực hiện năm nhóm công việc để biến nó thành sản phẩm triển khai được:

1. **Bản địa hóa hoàn chỉnh tiếng Việt**: 586/586 chuỗi giao diện, độ phủ 100%, kèm bộ thuật ngữ mật mã tiếng Việt được chuẩn hóa và kiểm tra nhất quán bằng công cụ.
2. **Xây dựng cơ chế chọn ngôn ngữ trong ứng dụng**: thay lớp phân giải chuỗi của nền tảng để người dùng chọn ngôn ngữ độc lập với ngôn ngữ trình duyệt, mà không phá vỡ cơ chế đa ngữ sẵn có.
3. **Chuyển mô hình tin cậy sang mô hình khép kín**: tắt toàn bộ bốn cơ chế tra cứu máy chủ khóa bên ngoài, chuyển trách nhiệm xác nhận danh tính về đơn vị, kèm quy trình quản trị khóa công khai được tài liệu hóa.
4. **Cắt bỏ phụ thuộc vào bên thứ ba**: gỡ khỏi mã nguồn thư viện đo lường từ xa và cơ chế kiểm tra giấy phép thương mại; làm luồng xác thực Gmail API an toàn và triển khai được bằng định danh tiện ích cố định kết hợp PKCE (RFC 7636).
5. **Xây dựng kiến trúc mở rộng sang thiết bị di động** tái sử dụng nguyên vẹn lõi mật mã, chứng minh tương đương bằng bộ phép thử đối chứng.

Kèm theo sản phẩm là **bộ năm kịch bản kiểm chứng** cho phép kiểm tra lại mọi khẳng định về an toàn trên chính gói phát hành, và **chín tài liệu vận hành bằng tiếng Việt**.

### 3. Kết quả đạt được

| Chỉ tiêu | Kết quả |
| --- | --- |
| Kiểm thử tự động | 517/517 đạt (449 bản máy tính, 68 bản di động) |
| Kiểm chứng liên thông với GnuPG 2.4.4 | 8/8 phép thử đạt, cả hai chiều |
| Kiểm toán bề mặt mạng trên gói phát hành | 4/4 điểm cuối bên thứ ba đã gỡ: vắng mặt |
| Độ phủ bản dịch tiếng Việt | 586/586 = 100%, 0 lỗi chặn |
| Độ trễ mã hóa một bức thư thông thường | 15–36 mili giây |
| Sản phẩm | Secure Mail v0.3.0, mã định danh cố định, gói cài đặt niêm phong bằng SHA-256 |

### 4. Tính mới và tính sáng tạo

**Tính mới.** Đây là trình khách mã hóa thư điện tử đầu cuối theo chuẩn OpenPGP **đầu tiên có giao diện tiếng Việt hoàn chỉnh** cùng bộ thuật ngữ mật mã tiếng Việt được chuẩn hóa; bổ sung cơ chế chọn ngôn ngữ vượt giới hạn kiến trúc của nền tảng; chuyển mô hình tin cậy sang mô hình khép kín do đơn vị kiểm soát; loại bỏ triệt để phụ thuộc vào bên thứ ba, qua đó **mở khóa khả năng sử dụng cho tài khoản Google Workspace** vốn bị bản gốc chặn; và xây dựng kiến trúc di động giữ nguyên lõi mật mã đã kiểm chứng.

**Tính sáng tạo.** Điểm sáng tạo cốt lõi là phương pháp: **biến mọi khẳng định về an toàn thành một phép kiểm tra chạy lại được**, thay vì để chúng ở dạng lời tuyên bố. Chính phương pháp này đã tự phát hiện sáu lỗi dịch thuật — trong đó hai lỗi làm mất khuyến cáo an toàn — và ba phép kiểm thử hỏng, tất cả đã được sửa. Bên cạnh đó là kỷ luật "không sửa lõi mật mã đã được kiểm chứng", việc chọn đúng biện pháp cho đúng mô hình đe dọa, và việc thiết kế phần bản địa hóa theo tiêu chí sư phạm để sản phẩm đồng thời là học cụ.

### 5. Khả năng áp dụng và hiệu quả dự kiến

Giải pháp áp dụng được ngay: không cần hạ tầng, không cần máy chủ, chỉ cần trình duyệt sẵn có trên máy trạm. Đối tượng áp dụng gồm công tác giảng dạy và thực hành An toàn thông tin, bảo vệ tài liệu giảng dạy và dữ liệu người học, trao đổi nghiệp vụ nội bộ, và trao đổi dữ liệu nghiên cứu chưa công bố. Vì không phụ thuộc hạ tầng riêng, giải pháp nhân rộng được cho các đơn vị khác.

Hiệu quả dự kiến: thu hẹp bề mặt rò rỉ thông tin; loại bỏ rò rỉ siêu dữ liệu quan hệ liên lạc ra nước ngoài; giảm phụ thuộc vào nhà cung cấp bên ngoài; nâng cao năng lực làm chủ công nghệ; và nâng chất lượng đào tạo nhân lực an toàn thông tin. Chi tiết và căn cứ trình bày tại tài liệu *Dự kiến hiệu quả khi đưa vào ứng dụng trong thực tiễn*.

### 6. Cam kết về phạm vi

Tác giả cam kết trình bày trung thực và **không khẳng định** sáng kiến đủ điều kiện pháp lý để truyền, nhận thông tin thuộc danh mục bí mật nhà nước. Việc đó phải sử dụng sản phẩm mật mã và tuân thủ quy định về cơ yếu theo Luật Bảo vệ bí mật nhà nước năm 2018 và Nghị định số 26/2020/NĐ-CP. Sáng kiến chưa được kiểm định và chưa được cấp phép cho mục đích này.

## IV. HỒ SƠ KÈM THEO

1. Tóm tắt sáng kiến
2. Bản thuyết minh sáng kiến (kèm 12 hình minh họa và 17 bảng số liệu)
3. Phụ lục kỹ thuật — toàn văn kết quả kiểm thử, đo đạc và kiểm toán
4. Dự kiến hiệu quả khi đưa vào ứng dụng trong thực tiễn
5. Bộ tệp minh họa: sơ đồ dạng `.drawio`, `.svg`, `.png`; ảnh chụp giao diện; tệp kết quả đo dạng `.json` và `.txt`

## V. CAM ĐOAN

Tôi xin cam đoan mọi thông tin nêu trong đơn và trong hồ sơ kèm theo là trung thực, không sao chép hoặc vi phạm bản quyền của người khác. Sáng kiến được xây dựng trên nền phần mềm nguồn mở Mailvelope theo giấy phép AGPL-3.0; toàn bộ thông báo bản quyền và giấy phép của tác giả gốc được giữ nguyên, nguồn gốc mã nguồn được ghi nhận đầy đủ trong hồ sơ. Những nội dung chưa có cơ sở thực tế đã được ghi rõ là chưa có, không được ước lượng thành số liệu.

Tôi xin chịu trách nhiệm trước pháp luật về lời cam đoan này.

{{SIGNATURE}}
