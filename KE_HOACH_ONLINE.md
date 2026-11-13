# Kế hoạch đưa Toán THĐ Studio vào sử dụng

Cập nhật theo v0.14 ngày 13/11/2026.

Đích đến là **một địa chỉ HTTPS** để giáo viên đăng nhập, giao đề và xem kết quả, còn học sinh quét QR trên điện thoại để làm bài. Mốc chạy sớm là **một lớp mẫu trên Windows và Wi-Fi nội bộ**. Bản LAN cũng dùng được cho những buổi cần tổ chức tại lớp.

## Bản hiện tại

- Mã v0.14 nằm trên nhánh `codex/v0.14-mo-dun`. PR #1 đang ở dạng nháp. GitHub Actions đã cài thư viện, kiểm tra nội dung, chạy 76 kiểm thử và dựng web thành công. [PR #1](https://github.com/tronghieu8598/ToanTHD/pull/1) · [Lần kiểm tra](https://github.com/tronghieu8598/ToanTHD/actions/runs/43423306196)
- Bản cài Windows đã có lệnh chạy trên máy và lệnh mở LAN. Phiếu thử có các tình huống QR, mất mạng, Excel và phục hồi. [Hướng dẫn cài](README.md#cài-mới-trên-windows) · [Phiếu thử tại lớp](public/Phieu_thu_tren_lop.html)
- Chương VI Toán 12 đã tách từng câu và nhóm biến thể. Sơ đồ ghi vị trí mã của các chức năng còn lại và cấu trúc đích. [Bản đồ mô-đun](docs/KIEN_TRUC.md)

## Các mốc triển khai

| Mốc | Việc làm | Điều kiện nghiệm thu | Phụ trách đề xuất |
| --- | --- | --- | --- |
| **1. Chốt bản nền trên Windows và LAN** | Cài từ mã của PR #1 vào thư mục thử có database riêng. Tạo một quản trị, hai giáo viên và hai lớp mẫu. Soạn đề, lưu riêng rồi chia sẻ một bản, giao đúng lớp, quét QR trên điện thoại, nộp và xem điểm. Thử một học liệu riêng, chia sẻ, đưa vào thùng rác và khôi phục. | Chạy được bằng tệp `.bat`. Điện thoại vào đúng phiên. Điểm và Excel khớp đáp án mẫu. Giáo viên lớp khác bị chặn khi mở đề riêng hoặc phiên ngoài quyền. Kiểm tra lại sau khi tắt rồi mở web. Khi đạt, duyệt PR #1 và đưa bản đã thử vào `main`. | Người bảo trì cài và ghi kết quả. Thầy thử trên điện thoại và đối chiếu nghiệp vụ. |
| **2. Chuẩn bị luồng dùng qua Internet** | Dùng QR dẫn vào phiên và mã cá nhân có thời hạn cho từng học sinh. Xác thực trước khi hiện tên hoặc nhận bài. Kiểm tra đăng nhập, quyền theo lớp, quyền tải tệp và đổi thiết bị. QR dùng địa chỉ HTTPS của bản online. | Người chỉ có QR và số thứ tự bị chặn khi tra tên hoặc nhận bài. Mã hết hạn và thử sai liên tục bị chặn. Sau khi đổi thiết bị, máy cũ hết quyền và máy mới tiếp tục đúng bài. Các API giáo viên và đường dẫn học liệu riêng kiểm tra quyền truy cập trực tiếp. Bản LAN chạy lại bộ kiểm tra của mốc 1. | Người bảo trì triển khai và viết kiểm thử. Thầy xác nhận cách phát mã cá nhân trong lớp. |
| **3. Có link HTTPS thử nghiệm** | Dựng một bản Cloudflare Workers dùng D1 riêng và dữ liệu giả. Tạo cấu hình triển khai, khóa riêng và quy trình cài từ database trống. Nạp ngân hàng và hình. Thiết lập đường dẫn cho học liệu đang do máy LAN phục vụ. | Quản trị, giáo viên và học sinh mẫu hoàn tất một phiên qua HTTPS. Thử từ Wi-Fi và dữ liệu di động. Hình câu hỏi, công thức, Monty Hall, màn chữa bài và tài nguyên được chọn cho đợt thử đều mở đúng. Database mẫu có đủ 5.837 câu chuẩn và 75 bài, nhập lại giữ cùng kết quả. | Người bảo trì dựng và kiểm tra. Người quản lý tài khoản hạ tầng cấp quyền triển khai khi tới mốc này. |
| **4. Diễn tập một lớp và phục hồi** | Mô phỏng 40–45 học sinh vào, lưu và nộp gần đồng thời. Dùng vài thiết bị thật để thử Chrome Android, Safari iPhone, mất mạng, đổi thiết bị và hết giờ. Đo phản hồi, lỗi, mức dùng dịch vụ. Diễn tập quay về bản web trước và phục hồi dữ liệu trong môi trường thử. | Số bài nộp, điểm và Excel khớp bộ kết quả dự kiến. Một học sinh chỉ có một bài trong phiên. Bản nháp nối lại đúng quy tắc thời hạn. Khôi phục đối chiếu được đề, lớp, quyền, bài làm và tệp học liệu trong phạm vi thí điểm. | Người bảo trì chạy mô phỏng và phục hồi. Thầy cùng giáo viên thử thao tác bằng thiết bị thật. |
| **5. Dùng thật với một lớp** | Chọn lớp và thời điểm thử, thống nhất phạm vi dữ liệu và người hỗ trợ. Dùng địa chỉ HTTPS chính thức và database riêng của bản thật. Tạo tài khoản thật, nhập lớp được chọn và kiểm tra một đề ngắn trước buổi dùng. | Thầy giao đề, học sinh nộp từ QR, điểm và Excel khớp, giáo viên xem được báo cáo theo quyền. Sau buổi thử ghi nhận lỗi và mức dùng dịch vụ để quyết định khi nào thêm lớp. | Thầy chọn lớp và nghiệm thu. Người bảo trì chuẩn bị phát hành và theo dõi buổi đầu. |

Thứ tự bàn giao là **gói cài Windows và biên bản thử LAN → link HTTPS với dữ liệu giả → link chính thức cho lớp thí điểm**. Có thể chuẩn bị cấu hình hạ tầng và cách cấp mã vào bài cùng lúc.

## Phiếu việc đầu tiên

1. Tải mã đúng PR #1 và cài bằng `Cai_dat_lan_dau.bat` trên Windows có Node.js 24. Mở `Chay_web.bat`. Kiểm tra trang đăng nhập, ngân hàng, ảnh câu và Monty Hall. Nếu cần thử SGK offline, cài từ bản ZIP hoặc dùng lệnh cài tệp theo hướng dẫn đóng góp. [Cài tệp SGK](CONTRIBUTING.md#đưa-bản-thử-lên-github)
2. Đổi mật khẩu quản trị của bản thử. Tạo hai lớp giả, hai tài khoản giáo viên với quyền khác nhau và một đề mẫu. Đăng nhập từng tài khoản, đổi mật khẩu lần đầu và chọn lớp được cấp. Chọn câu có đáp án biết trước để đối chiếu một bài đúng, một bài có điểm 0 và một học sinh chưa nộp. [Luồng cấp tài khoản](README.md#tài-khoản-giáo-viên-và-đề-dùng-chung)
3. Dừng chế độ trên máy, mở `Mo_lop_LAN.bat`. Cho laptop và điện thoại cùng Wi-Fi. Trên điện thoại, quét QR, vào đúng lớp, lưu nháp, thử rớt mạng ngắn rồi nộp. Trên máy giáo viên, mở thống kê, chữa bài và Excel, ghi số bài và điểm đối chiếu.
4. Dừng web và dùng `Sao_luu_toan_bo.bat`. Phục hồi bằng `Phuc_hoi_tu_thu_muc.bat` trong bản cài thử khác. Kiểm tra lại tài khoản thử, đề đã lưu, học liệu, số bài nộp và điểm. Đính kết quả phiếu thử vào PR, xử lý lỗi còn ảnh hưởng luồng chính rồi duyệt bản nền.

Biên bản mốc 1 ghi mã phiên bản, thiết bị đã thử, số bài và điểm dự kiến/thực tế, kết quả phân quyền và đường dẫn đến lỗi còn mở. Dùng dữ liệu giả trong ảnh, tệp Excel và biên bản chia sẻ trên GitHub.

## Việc kỹ thuật để mở link HTTPS

### Đăng nhập, QR và quyền xem

Luồng LAN hiện tra tên và nhận bài qua mã phiên và số thứ tự. Bản Internet dùng mã cá nhân gắn với học sinh và phiên, có thời hạn và giới hạn thử sai. Kiểm tra hạn mức trên mạng dùng chung để cả lớp vẫn vào bài cùng lúc. Dùng cơ chế đổi thiết bị có giáo viên xác nhận và thu hồi quyền thiết bị cũ. Tắt chế độ demo trên bản HTTPS và bật lớp bảo vệ bổ sung cho tài khoản quản trị. Kiểm tra các quyền ở API, gồm đăng nhập, sửa ngân hàng, mở phiên, xem báo cáo và mở tệp. [Luồng hiện tại](lib/api.ts) · [Quyền hiện tại](lib/access.mjs)

### Cấu hình, dữ liệu và học liệu

- Dùng **Workers và D1** làm lựa chọn đầu tiên vì mã hiện đã dùng mô hình này. Tạo cấu hình cho bản thử và bản thật với database, kho tệp và khóa riêng. Bản thử dùng dữ liệu giả. Chạy dựng thử trước khi triển khai, áp dụng migration vào đúng database, nạp ngân hàng và kiểm số câu, bài, ảnh. Sau khi qua đợt thử tải, chọn cấu hình dịch vụ theo tải đo được. [Môi trường Workers](https://developers.cloudflare.com/workers/wrangler/environments/) · [Migration D1](https://developers.cloudflare.com/d1/reference/migrations/) · [Khóa bí mật](https://developers.cloudflare.com/workers/configuration/secrets/)
- Các tệp nguồn học liệu hiện được cổng LAN phục vụ. Chọn các học liệu được phép dùng trong bản HTTPS thử. Tệp đề cương tương tác khoảng 36,2 MiB và SGK offline 124,6 MiB vượt giới hạn 25 MiB mỗi tệp của Workers Static Assets. Dùng kho tệp như R2 qua đường dẫn có kiểm quyền hoặc để mục đó ở gói cài offline. Xác nhận quyền chia sẻ trước khi đưa tài liệu gốc lên Internet. Với HTML tương tác, thử cách mở cách ly và kiểm tra trình chiếu, lưu trạng thái và tải tệp trên điện thoại. [Đường dẫn hiện tại](public/.assetsignore) · [Giới hạn tài nguyên Workers](https://developers.cloudflare.com/workers/platform/limits/#static-assets) · [R2 qua Worker](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)
- Với học liệu giáo viên, duy trì quyền riêng tư, chia sẻ toàn tổ, thùng rác và khôi phục qua API. Mốc thử có thể dùng giới hạn tệp hiện hành và tập học liệu nhỏ. Khi chuyển sang kho tệp riêng, đối chiếu SHA-256 và thử mở lại từng tệp trên database thử trước khi đổi nơi lưu đang dùng. [Mã tải học liệu](lib/library-uploads.mjs)

### Phát hành và quay về bản trước

Gắn mỗi lần triển khai với phiên bản mã và gói nội dung. Trước khi cập nhật bản thật, lưu mốc D1 và bản sao của dữ liệu, quyền, đề, bài làm và kho tệp theo phạm vi vận hành. Thử phục hồi trên dữ liệu mẫu và đối chiếu số dòng, điểm cùng mã kiểm tra tệp. Diễn tập quay về phiên bản web trước trên database tương thích. Khi gián đoạn trong buổi thử thật, đối chiếu số bài máy chủ đã nhận và xử lý các bản nháp còn chờ trước khi dùng phương án LAN cho phiên kế tiếp. [Quay về phiên bản Worker](https://developers.cloudflare.com/workers/versions-and-deployments/rollbacks/) · [Sao lưu và phục hồi D1](https://developers.cloudflare.com/d1/reference/time-travel/)

## Tách mô-đun song song sau khi chốt bản nền

| Thứ tự | Phần giao được | Kết quả cần bàn giao |
| --- | --- | --- |
| 1 | **Ngân hàng và biến thể** | Dùng Chương VI làm mẫu. Thử hai thay đổi ở hai câu khác nhau qua hai PR. Sau đó tách Chương I Toán 12 theo bài và mã câu, đối chiếu 230 câu gốc và 900 biến thể đã tích hợp. Khi quy trình ổn, áp dụng lần lượt cho Chương II–V rồi mở rộng khối 10–11. |
| 2 | **Học liệu và bộ chọn câu** | Thêm thư mục thông tin và bìa cho từng học liệu ưu tiên. Dùng mã chương chung với ngân hàng. Tách màn học liệu và bộ chọn câu khỏi màn hình chung theo cấu trúc đích. Thử sửa bìa và sửa một câu trong hai PR độc lập. |
| 3 | **Đề, lớp, tài khoản và phân quyền** | Tách thao tác lưu/giao đề, danh sách lớp, cấp quyền và nhật ký. Mỗi phần có đường dẫn vào và kiểm thử riêng. Dùng đề riêng, đề tổ và hai giáo viên để xác nhận quyền sau khi tách. |
| 4 | **Phiên, học sinh, chấm, báo cáo và vận hành** | Tách dần luồng phiên và bài làm khỏi tệp chung. Giữ bản chụp đề và kết quả làm đầu vào cho chấm, báo cáo và Excel. Ghi đường dẫn sửa QR, sao lưu, kết nối và quy trình phát hành. |

Mỗi việc ghi người sửa, người duyệt, mã câu hoặc chức năng, thư mục và phép thử nghiệm thu. Ưu tiên phần đang cần chỉnh hoặc ảnh hưởng lần triển khai kế tiếp. Các đợt tách còn lại có thể tiếp tục sau khi link HTTPS chạy ổn. [Cách giao việc và duyệt thay đổi](docs/KIEN_TRUC.md#giao-việc-trên-github)
