---
title: Dự kiến hiệu quả khi đưa vào ứng dụng
subtitle: Căn cứ, giả thiết và cách đo — thay cho xác nhận hiệu quả đã thực hiện
kind: DỰ KIẾN HIỆU QUẢ
org_top: TỔNG CỤC II
org: HỌC VIỆN KHOA HỌC QUÂN SỰ
author: [Họ và tên tác giả]
header: Dự kiến hiệu quả — Secure Mail
footer: Secure Mail — Dự kiến hiệu quả
cover_image: assets/diagrams/h7-pham-vi-du-lieu.png
cover_rows: Thuộc hồ sơ|Sáng kiến Secure Mail;;Loại tài liệu|Dự kiến hiệu quả khi đưa vào ứng dụng;;Trạng thái triển khai|Chưa triển khai diện rộng
place_date: Hà Nội, ngày ..... tháng ..... năm 2026
---

{{QUOCHIEU}}

# DỰ KIẾN HIỆU QUẢ KHI ĐƯA VÀO ỨNG DỤNG TRONG THỰC TIỄN

{{TOC}}

# 1. VÌ SAO LÀ "DỰ KIẾN" CHỨ KHÔNG PHẢI "XÁC NHẬN"

Theo quy định, hồ sơ sáng kiến cần có *Xác nhận đánh giá hiệu quả mang lại của sáng kiến* **hoặc** *Dự kiến hiệu quả khi đưa vào ứng dụng trong thực tiễn*. Tài liệu này thuộc loại thứ hai.

Lý do: sáng kiến **đã hoàn thành về mặt sản phẩm** — tiện ích chạy được, đã kiểm thử, đã đóng gói, có tài liệu vận hành — nhưng **chưa được triển khai diện rộng**. Chưa có người dùng thực tế ngoài quá trình phát triển và kiểm thử, nên chưa có số liệu sử dụng, chưa có ghi nhận hiệu quả từ đơn vị.

Trong tình huống đó, hồ sơ có hai lựa chọn: ước lượng ra những con số không có căn cứ, hoặc trình bày rõ căn cứ, giả thiết và cách đo, rồi để trống phần số liệu cần thực tế xác nhận. Tài liệu này chọn cách thứ hai. Với một sáng kiến về an toàn thông tin — lĩnh vực mà độ tin cậy của lời khẳng định là giá trị cốt lõi — việc đưa ra một con số hiệu quả kinh tế không có cơ sở sẽ làm hỏng chính điều mà sáng kiến muốn chứng minh.

Mọi chỗ cần số liệu thực tế đều được đánh dấu `[…]` để bổ sung sau khi triển khai.

# 2. NHỮNG GÌ ĐÃ ĐO ĐƯỢC

Cần phân biệt rõ: có một nhóm hiệu quả **đã đo được ngay bây giờ**, vì chúng là thuộc tính của sản phẩm chứ không phải kết quả của việc sử dụng.

^table: Bảng 1. Hiệu quả kỹ thuật đã đo được trên sản phẩm
| Chỉ tiêu | Bản gốc kế thừa | Secure Mail v0.3.0 | Nguồn kiểm chứng |
| --- | --- | --- | --- |
| Chuỗi giao diện tiếng Việt | 0 | 586 (100%) | `verify-translation.mjs` |
| Người dùng chọn được ngôn ngữ | Không | Có | `src/lib/l10n.js`, ảnh chụp |
| Cơ chế tra cứu khóa ra nước ngoài bật mặc định | 3 | **0** | `src/res/defaults.json`, ảnh chụp |
| Thư viện đo lường từ xa trong gói phát hành | Có (9 lần) | **Không (0)** | `verify-no-external-endpoints.sh` |
| Kiểm tra giấy phép gọi ra bên thứ ba | Có | **Không (0)** | `verify-no-external-endpoints.sh` |
| Tài khoản Google Workspace dùng được | Không (bị chặn) | **Có** | Gỡ bỏ `checkLicense` |
| PKCE bảo vệ luồng xác thực | Không | Có (S256) | `src/modules/gmail.js` |
| Định danh tiện ích ổn định giữa các máy | Không | Có | `src/chrome/manifest.json` |
| Phép thử tự động đạt | — | 517/517 | Kết quả kiểm thử |
| Liên thông OpenPGP với GnuPG 2.4.4 | — | 8/8 | `interop-gnupg.mjs` |
| Độ trễ mã hóa một bức thư | — | 15–36 ms | `benchmark-crypto.mjs` |

Đây là những khẳng định **không phụ thuộc vào việc có bao nhiêu người dùng**. Chúng đúng ngay khi sản phẩm được biên dịch, và kiểm tra lại được bằng lệnh.

# 3. HIỆU QUẢ KINH TẾ DỰ KIẾN

## 3.1. Chi phí đã bỏ ra

^table: Bảng 2. Chi phí xây dựng sáng kiến
| Khoản mục | Giá trị |
| --- | --- |
| Bản quyền phần mềm | 0 đồng — nền tảng theo giấy phép AGPL-3.0, sử dụng nội bộ phi thương mại |
| Hạ tầng máy chủ | 0 đồng — giải pháp không cần máy chủ |
| Thiết bị | 0 đồng — dùng máy trạm và trình duyệt sẵn có |
| Công sức xây dựng | Công sức của tác giả trong quá trình công tác |

## 3.2. Chi phí tránh được so với các phương án thay thế

Bảng dưới đây nêu **khoản mục và căn cứ**. Việc quy đổi thành tiền đòi hỏi hai đại lượng hiện chưa có: số người dùng thực tế và phương án thay thế được chọn để so sánh.

^table: Bảng 3. Khoản chi phí tránh được, theo từng phương án thay thế
| Phương án thay thế | Khoản chi phí phát sinh mà giải pháp này tránh được | Đơn vị tính |
| --- | --- | --- |
| Chuyển sang dịch vụ thư điện tử bảo mật | Phí thuê bao | đồng / người dùng / năm |
| | Chi phí di chuyển dữ liệu hộp thư | đồng, một lần |
| | Chi phí đào tạo lại toàn bộ người dùng | đồng, một lần |
| | Rủi ro gián đoạn công tác trong thời gian chuyển đổi | không quy đổi |
| Triển khai hạ tầng S/MIME | Đầu tư hệ thống chứng thực số | đồng, một lần |
| | Chi phí cấp và gia hạn chứng thư | đồng / người dùng / năm |
| | Nhân sự vận hành hệ thống chứng thực | người / năm |
| Mua giấy phép thương mại của sản phẩm gốc để dùng được tài khoản Workspace | Phí giấy phép | đồng / người dùng / tháng |
| Đặt hàng phát triển phần mềm tương đương | Chi phí phát triển, kiểm thử, bản địa hóa, tài liệu hóa | đồng, một lần |

**Các đại lượng cần bổ sung sau triển khai:**

- Số người dùng dự kiến trong năm đầu: `[………]`
- Phương án thay thế được chọn để so sánh: `[………]`
- Đơn giá tham chiếu của phương án đó: `[………]`
- Giá trị chi phí tránh được, quy đổi: `[………]`

## 3.3. Hiệu quả gián tiếp — nêu căn cứ, chưa quy đổi

**Tiết kiệm thời gian nhờ giao diện tiếng Việt.** Căn cứ: người dùng không phải tra cứu thuật ngữ tiếng Anh, thông báo lỗi đọc hiểu ngay, số lần thao tác sai giảm. Chưa quy đổi vì chưa có số liệu so sánh thời gian đào tạo giữa hai phiên bản ngôn ngữ. **Cách đo khi triển khai:** chia nhóm thí điểm thành hai, một nhóm dùng giao diện tiếng Anh, một nhóm dùng tiếng Việt; đo thời gian tới lúc hoàn thành thành công một chu trình đầy đủ (sinh khóa → sao lưu → nhập khóa người nhận → gửi thư mã hóa → giải mã thư nhận được).

**Chi phí tránh được nhờ phòng ngừa rò rỉ thông tin.** Đây là khoản có giá trị lớn nhất về bản chất nhưng cũng khó định lượng nhất, vì nó là chi phí của một sự cố **không xảy ra**. Hồ sơ không quy đổi khoản này thành tiền. Điều nói được chắc chắn là: sau khi áp dụng, nội dung thư trao đổi trong phạm vi triển khai **không còn tồn tại ở dạng rõ** trên hạ tầng của nhà cung cấp — một thay đổi về bản chất, không phải về mức độ.

# 4. HIỆU QUẢ KỸ THUẬT DỰ KIẾN

Bảng 1 đã nêu phần đã đo được. Phần dự kiến, phụ thuộc vào triển khai:

^table: Bảng 4. Chỉ tiêu kỹ thuật cần đo khi triển khai
| Chỉ tiêu | Cách đo | Ngưỡng kỳ vọng | Kết quả thực tế |
| --- | --- | --- | --- |
| Tỷ lệ người dùng hoàn thành thiết lập khóa thành công không cần hỗ trợ | Đếm trên nhóm thí điểm | `[…]` | `[…]` |
| Thời gian trung bình từ cài đặt đến gửi được thư mã hóa đầu tiên | Đo trên nhóm thí điểm | `[…]` | `[…]` |
| Tỷ lệ thư mã hóa gửi/nhận thành công | Ghi nhận trong kỳ thí điểm | `[…]` | `[…]` |
| Số sự cố mất khóa do không sao lưu | Ghi nhận trong kỳ thí điểm | 0 | `[…]` |
| Thời gian trung bình để quản trị viên xử lý một yêu cầu đăng ký khóa công khai | Ghi nhận trong kỳ thí điểm | `[…]` | `[…]` |
| Số lần cần cập nhật do Gmail thay đổi giao diện | Ghi nhận theo năm | `[…]` | `[…]` |

Đưa cột "Kết quả thực tế" vào ngay từ bây giờ là có chủ đích: nó là chỗ để điền sau kỳ thí điểm, và nó cho thấy hồ sơ đã xác định trước sẽ đo cái gì, thay vì tìm số liệu ủng hộ kết luận sau khi đã kết luận.

# 5. HIỆU QUẢ VỀ QUỐC PHÒNG — AN NINH DỰ KIẾN

## 5.1. Những gì khẳng định được ngay

Ba điều dưới đây là thuộc tính của sản phẩm, đúng ngay khi được cài đặt và sử dụng đúng cách:

**Nội dung thư không còn tồn tại ở dạng rõ ngoài máy trạm.** Với thư gửi qua Secure Mail, hạ tầng của nhà cung cấp chỉ lưu được bản mã. Khóa giải mã chỉ tồn tại trên máy người dùng, được bảo vệ bằng cụm mật khẩu.

**Không còn kênh rò rỉ siêu dữ liệu quan hệ liên lạc.** Bốn cơ chế tra cứu máy chủ khóa bên ngoài đều tắt mặc định, nên không có truy vấn nào thông báo cho bên thứ ba rằng "người này sắp liên lạc với người kia".

**Không còn phụ thuộc vào dịch vụ thương mại của bên thứ ba.** Sau khi gỡ bỏ cơ chế kiểm tra giấy phép, khả năng đọc dữ liệu đã mã hóa không phụ thuộc vào bất kỳ máy chủ nào ngoài hạ tầng thư mà đơn vị chủ động chọn. Thư đã tải về giải mã được cả khi mất kết nối Internet.

## 5.2. Những gì phụ thuộc vào triển khai

**Mức độ thu hẹp bề mặt rò rỉ** phụ thuộc vào tỷ lệ trao đổi được bảo vệ. Nếu chỉ một phần nhỏ thư được mã hóa thì tác dụng hạn chế. **Chỉ tiêu cần đo:** tỷ lệ thư thuộc diện cần bảo vệ được gửi ở dạng mã hóa: `[…]`

**Năng lực làm chủ công nghệ.** Toàn bộ mã nguồn nằm trong tầm kiểm soát của đơn vị, đọc được, sửa được, biên dịch lại được. Đây là điều kiện cần để một sản phẩm an toàn thông tin được tin dùng. Mức độ thực tế phụ thuộc vào việc đơn vị có bố trí nhân sự nắm được mã nguồn hay không. **Chỉ tiêu cần đo:** số cán bộ có thể biên dịch lại sản phẩm từ mã nguồn: `[…]`

**Đóng góp vào đào tạo nhân lực an toàn thông tin.** Đây là hiệu quả có tầm dài hạn lớn nhất nhưng cũng gián tiếp nhất. **Chỉ tiêu cần đo:** số lượt người học thực hành trên sản phẩm trong một năm học: `[…]`; số bài thực hành xây dựng được trên nền sản phẩm: `[…]`

## 5.3. Giới hạn cần nêu cùng lúc

Để đánh giá hiệu quả về quốc phòng — an ninh cho đúng, cần nêu đồng thời những gì giải pháp **không** làm được:

- **Không bảo vệ siêu dữ liệu.** Người gửi, người nhận, thời gian, kích thước và **tiêu đề thư** vẫn hiển thị với nhà cung cấp. Hệ quả trực tiếp cho quy chế sử dụng: **không đặt nội dung nhạy cảm vào tiêu đề thư**.
- **Không thay thế được sản phẩm mật mã của cơ quan có thẩm quyền** đối với thông tin thuộc danh mục bí mật nhà nước. Xem mục 7.
- **Không bảo vệ được nếu máy trạm đã bị xâm nhập.** Mã độc ghi phím hoặc đọc bộ nhớ trên máy người dùng vô hiệu hóa mọi cơ chế mã hóa phía người dùng. Giải pháp phải đi cùng các biện pháp bảo vệ máy trạm hiện hành, không thay thế chúng.

# 6. HIỆU QUẢ XÃ HỘI DỰ KIẾN

**Đóng góp cho chuẩn hóa thuật ngữ mật mã tiếng Việt.** Bộ thuật ngữ đã được xây dựng và áp dụng nhất quán trên 586 chuỗi, kiểm tra bằng công cụ. Đây là tài sản dùng lại được ngay cho giáo trình, bài giảng và các phần mềm khác — không phụ thuộc vào việc sản phẩm có được triển khai rộng hay không.

**Góp phần phổ cập mã hóa đầu cuối.** Rào cản ngôn ngữ là một trong những nguyên nhân khiến mã hóa thư điện tử chưa phổ cập ngoài giới chuyên môn. **Chỉ tiêu cần đo:** số đơn vị tiếp nhận và sử dụng: `[…]`

**Chia sẻ được.** Toàn bộ mã nguồn ở giấy phép AGPL-3.0, chia sẻ được cho đơn vị khác cùng dùng và cùng cải tiến. Tài liệu vận hành đã có sẵn bằng tiếng Việt.

# 7. RANH GIỚI PHÁP LÝ — NHẮC LẠI ĐỂ KHÔNG CÓ HIỂU NHẦM

> Secure Mail **chưa được kiểm định, chưa được cấp phép và không được đề xuất** để truyền, nhận thông tin thuộc danh mục bí mật nhà nước.
>
> Việc chuyển, nhận tài liệu, vật chứa bí mật nhà nước qua mạng Internet, mạng máy tính và mạng viễn thông phải thực hiện theo quy định của pháp luật về cơ yếu và phải sử dụng sản phẩm mật mã do cơ quan có thẩm quyền cung cấp — Luật Bảo vệ bí mật nhà nước năm 2018 và Nghị định số 26/2020/NĐ-CP ngày 28/02/2020.
>
> Việc một giải pháp sử dụng thuật toán mạnh và được kiểm thử kỹ **không tự nó tạo ra tư cách pháp lý** cho mục đích trên.

Phạm vi áp dụng được đề xuất: thông tin cần bảo vệ nhưng **không thuộc danh mục bí mật nhà nước** — tài liệu giảng dạy, đề thi chưa công bố, kết quả học tập, dữ liệu cá nhân của người học, tài liệu nghiên cứu chưa công bố, trao đổi nghiệp vụ nội bộ theo quy chế của đơn vị.

# 8. KẾ HOẠCH THÍ ĐIỂM ĐỂ THU THẬP SỐ LIỆU

Đây là việc cần làm ngay, vì nó bổ sung chính phần còn thiếu của hồ sơ.

^table: Bảng 5. Đề xuất nội dung thí điểm
| Nội dung | Chi tiết |
| --- | --- |
| Quy mô | `[… người dùng]` |
| Thời gian | `[… tháng]` |
| Đơn vị thực hiện | `[Khoa/Phòng] — Học viện Khoa học Quân sự` |
| Chuẩn bị | Cử và tập huấn quản trị viên khóa; ban hành quy chế sử dụng; lập danh mục khóa công khai của đơn vị |
| Đào tạo | Một buổi tập huấn cho người dùng: sinh khóa, sao lưu khóa, nhập khóa người nhận, gửi và đọc thư mã hóa, nhận biết chữ ký không hợp lệ |
| Số liệu thu thập | Toàn bộ chỉ tiêu tại Bảng 4 và các chỉ tiêu tại mục 5.2 |
| Kết quả bàn giao | Báo cáo đánh giá hiệu quả thực tế, bổ sung vào hồ sơ này thay cho các ô `[…]` |

Sau kỳ thí điểm, tài liệu này được thay thế hoặc bổ sung bằng *Xác nhận đánh giá hiệu quả mang lại của sáng kiến*, với số liệu thật.

# 9. KẾT LUẬN

Sáng kiến đã hoàn thành phần sản phẩm và phần kiểm chứng kỹ thuật, với số liệu đo được và tái lập được. Phần hiệu quả sử dụng thực tế còn thiếu, và tài liệu này nêu rõ điều đó thay vì lấp bằng ước lượng.

Điều có thể khẳng định ngay, không cần chờ triển khai: **nội dung thư gửi qua Secure Mail không tồn tại ở dạng rõ ngoài máy trạm của người dùng; sản phẩm không liên lạc với bên thứ ba nào ngoài chính dịch vụ thư mà đơn vị chọn dùng; và cả hai điều đó kiểm tra lại được bằng lệnh trên gói phát hành.**

Đó là phần hiệu quả không phụ thuộc vào số lượng người dùng, và là phần mà tác giả đề nghị Hội đồng xem xét trước.

{{SIGNATURE:CÁN BỘ THỰC HIỆN|(Ký, ghi rõ họ tên)||THỦ TRƯỞNG ĐƠN VỊ CHỦ TRÌ THỰC HIỆN|(Ký, đóng dấu)}}
