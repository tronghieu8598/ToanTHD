# Kế hoạch đưa Toán THĐ Studio vào sử dụng

Cập nhật theo v0.14 ngày 18/11/2026.

Đích đến là **một địa chỉ HTTPS cho web tổ**. Giáo viên có thể chuẩn bị tiết dạy ở Hôm nay, dùng và chia sẻ học liệu, soạn đề và xem kết quả. Quản trị quản lý tài khoản, quyền và lớp. Học sinh mở phiên bằng QR. Mốc đầu tiên là **chạy các chức năng trên cùng bản cài Windows**, với điện thoại cùng Wi-Fi để thử phần học sinh. Bản LAN có thể dùng cho những buổi tổ chức tại lớp.

## Bản hiện tại

- Mã v0.14 nằm trên nhánh `codex/v0.14-mo-dun`. PR #1 đang ở dạng nháp. GitHub Actions đã cài thư viện, kiểm tra nội dung, chạy 76 kiểm thử và dựng web thành công. [PR #1](https://github.com/tronghieu8598/ToanTHD/pull/1) · [Lần kiểm tra](https://github.com/tronghieu8598/ToanTHD/actions/runs/43423306196)
- Bản cài Windows đã có lệnh chạy trên máy và lệnh mở LAN. Phiếu thử có các tình huống QR, mất mạng, Excel và phục hồi. [Hướng dẫn cài](README.md#cài-mới-trên-windows) · [Phiếu thử tại lớp](public/Phieu_thu_tren_lop.html)
- Chương VI Toán 12 đã tách từng câu và nhóm biến thể. Sơ đồ ghi vị trí mã của các chức năng còn lại và cấu trúc đích. [Bản đồ mô-đun](docs/KIEN_TRUC.md)

## Kế hoạch từng phần của web

Mỗi phần có một đầu việc riêng trên GitHub với người phụ trách, tiêu chí nghiệm thu và bằng chứng đã thử. Vai trò trong bảng là đề xuất để phân công.

| Phần | Việc cần làm | Cách nghiệm thu | Người nghiệm thu đề xuất |
| --- | --- | --- | --- |
| **Hôm nay và kế hoạch tiết dạy** | Giữ trang đầu gọn, tập trung vào lớp đang chọn, học liệu trong tiết và thao tác mở. Rà các trạng thái chưa có lớp, chưa có kế hoạch và học liệu đã gỡ. V0.14 lưu kế hoạch trong trình duyệt. Đưa kế hoạch của bản HTTPS vào database theo giáo viên và lớp để mở trên nhiều thiết bị. | Giáo viên thêm, mở và bỏ học liệu ở hai lớp. Tải lại trang vẫn thấy đúng kế hoạch. Trên bản HTTPS, đăng nhập cùng tài khoản trên máy khác thấy đúng kế hoạch, tài khoản khác chỉ thấy của mình. Kiểm tra bố cục trên laptop và điện thoại. | Giáo viên trực tiếp chuẩn bị tiết dạy |
| **Học liệu chuẩn của tổ** | Soát danh mục theo khối và chương Kết nối tri thức. Ưu tiên mỗi học liệu có mã, thông tin, bìa và tệp gốc xác định rõ như Monty Hall. Rà quyền chia sẻ và đường dẫn cho các học liệu đưa lên HTTPS. | Tìm theo chương và từ khóa. Xem trước, mở và thêm vào tiết. Đổi bìa hoặc mô tả của một mục bằng PR riêng. Bìa, chương, liên kết và các thao tác của tệp HTML được kiểm tra trên máy tính và điện thoại. | Người phụ trách kho học liệu |
| **Học liệu giáo viên** | Hoàn thiện luồng đăng, thử riêng tư, chia sẻ toàn tổ, đưa vào thùng rác và khôi phục. Rà giới hạn dung lượng, loại tệp và thông báo tải lỗi. Quy định thời hạn giữ trong thùng rác trước khi bổ sung chức năng dọn vĩnh viễn. | Dùng hai giáo viên và một quản trị để kiểm danh mục lẫn đường dẫn mở tệp. Chia sẻ thì đồng nghiệp trong tổ mở được. Đưa vào thùng rác thì đường dẫn ngừng hoạt động. Giáo viên khôi phục mục do quản trị gỡ thì mục trở về riêng tư. Tệp khôi phục mở đúng. | Giáo viên đăng học liệu và quản trị |
| **Tài khoản, phân quyền và cài đặt** | Rà cấp tài khoản, đổi mật khẩu lần đầu, chọn lớp đang dạy, cấp hoặc thu hồi từng quyền, khóa, đặt lại mật khẩu và nhật ký. Thử các quyền soạn đề, sửa ngân hàng, nhập danh sách và đăng học liệu riêng. | Quản trị cấp hai giáo viên với phạm vi khác nhau. Mỗi người vào đúng lớp và thao tác đúng quyền. Thu hồi quyền có hiệu lực trong phiên đang đăng nhập. Khóa tài khoản chặn truy cập. Nhật ký phản ánh đúng thay đổi. | Người phụ trách quản trị tổ |
| **Lớp và danh sách học sinh** | Rà tạo lớp, nhập Excel/CSV có xem trước, phát hiện số thứ tự trùng và chỉnh danh sách theo lớp được cấp. Giữ danh sách theo thời điểm giao đề để xem lại kết quả cũ. | Nhập hai lớp mẫu, thử nhập lại và thử tệp có lỗi. Giáo viên mở đúng lớp được cấp. Đổi tên hoặc chuyển một học sinh trong dữ liệu mẫu, rồi đối chiếu danh sách và điểm của phiên đã kết thúc. | Giáo viên phụ trách danh sách lớp |
| **Ngân hàng câu hỏi và nhập nội dung** | Giữ nguồn theo khối, chương, bài và mã câu. Mở rộng mẫu Chương VI sang Chương I. Rà tìm kiếm, bộ lọc, chọn câu, biến thể và xem trước khi nhập Word/Excel/JSON. Kiểm tra công thức và hình. | Hai người sửa hai câu khác nhau qua hai PR rồi dựng chung. Đối chiếu mã, số gốc, đáp án, công thức và hình. Biến thể cần duyệt lại được báo đúng. Dữ liệu đề đã giao đối chiếu được với bản chụp cũ. | Giáo viên duyệt nội dung toán |
| **Đề, phiên và màn hình học sinh** | Rà đề riêng, đề tổ, sao chép, giao lớp, mở và đóng phiên. Với HTTPS, dùng mã cá nhân có thời hạn. Giữ QR, lưu nháp và đổi thiết bị theo phiên. | Thử chia sẻ và sao chép bằng hai giáo viên. Học sinh vào đúng bài, mất mạng ngắn rồi lưu hoặc nộp lại được theo thời hạn. Mã sai bị chặn và mỗi học sinh có một bài trong phiên. | Giáo viên ra đề và người bảo trì |
| **Chấm, thống kê, Excel và chữa bài** | Rà chấm tự động và tự luận, điểm 0, tình trạng chưa nộp, báo cáo theo lớp, xuất Excel và trình chiếu. Kiểm tra thời điểm hiện đáp án. | Đối chiếu đáp án mẫu với điểm trên màn hình và trong Excel. Chữa bài mở được câu, công thức và hình. Màn chiếu chỉ hiện đáp án khi phiên đã đóng. | Giáo viên đối chiếu kết quả |
| **Cài đặt, dữ liệu và vận hành** | Chốt gói cài Windows, cấu hình HTTPS thử và thật, tài nguyên học liệu, theo dõi lỗi, sao lưu và phát hành. Ghi rõ những gì mỗi kiểu sao lưu giữ được. Thêm kế hoạch tiết dạy vào phạm vi sao lưu khi đã đồng bộ. | Cài mới, khởi động lại và phục hồi trên bản thử. Đối chiếu tài khoản, quyền, lớp, đề, phiên, điểm và tệp học liệu. Diễn tập phát hành và quay về phiên bản phù hợp. | Người bảo trì và người vận hành |

Lấy đường dẫn mã của từng phần từ [bản đồ mô-đun](docs/KIEN_TRUC.md#bản-đồ-tệp-v014). Ưu tiên những việc cần cho bản chạy thử. Tách tiếp thư mục giao diện, nghiệp vụ và dữ liệu theo từng phần trong lúc các nhóm đang sử dụng bản thử.

## Các mốc triển khai

| Mốc | Việc làm | Điều kiện nghiệm thu | Phụ trách đề xuất |
| --- | --- | --- | --- |
| **1. Chốt bản nền trên Windows và LAN** | Cài từ mã của PR #1 vào thư mục thử có database riêng. Dùng một quản trị, hai giáo viên và hai lớp mẫu để thử Hôm nay, kho học liệu, tài khoản, lớp, ngân hàng, giao bài, báo cáo và phục hồi. | Có kết quả cho từng luồng trong phiếu việc bên dưới. Web giữ dữ liệu sau khi mở lại. Điện thoại vào đúng phiên và Excel khớp. Khi đạt, duyệt PR #1 và đưa bản đã thử vào `main`. | Người bảo trì cài và ghi kết quả. Thầy thử trên điện thoại và đối chiếu nghiệp vụ. |
| **2. Chuẩn bị luồng dùng qua Internet** | Làm theo ba nhóm có thể chạy song song. Đồng bộ kế hoạch và học liệu giữa thiết bị. Kiểm tra đăng nhập, quyền và đường dẫn tệp. Hoàn thiện QR HTTPS, mã cá nhân có thời hạn và đổi thiết bị. | Kiểm tra được các thay đổi trên bản thử. Kế hoạch và tệp đúng quyền khi đổi thiết bị. Mã học sinh sai, hết hạn hoặc bị thử liên tục được xử lý đúng. Các luồng LAN của mốc 1 chạy lại đạt. | Người bảo trì triển khai. Giáo viên góp ý cách dùng kế hoạch, chia sẻ học liệu và phát mã. |
| **3. Có link HTTPS thử nghiệm** | Dựng một bản Cloudflare Workers dùng D1 riêng và dữ liệu giả. Cài từ database trống, nạp ngân hàng và hình. Thiết lập đường dẫn cho học liệu đang do máy LAN phục vụ. | Từ Wi-Fi và dữ liệu di động, thử quản trị cấp tài khoản, giáo viên mở kế hoạch trên hai thiết bị, mở và chia sẻ học liệu, giao bài, học sinh nộp và giáo viên xem kết quả. Monty Hall, công thức và màn chữa bài mở đúng. Database mẫu có đủ 5.837 câu chuẩn và 75 bài, nhập lại giữ cùng kết quả. | Người bảo trì dựng và kiểm tra. Người quản lý tài khoản hạ tầng cấp quyền triển khai khi tới mốc này. |
| **4. Diễn tập một lớp và phục hồi** | Mô phỏng 40–45 học sinh vào, lưu và nộp gần đồng thời. Dùng vài thiết bị thật để thử Chrome Android, Safari iPhone, mất mạng, đổi thiết bị và hết giờ. Đo phản hồi, lỗi, mức dùng dịch vụ. Diễn tập quay về bản web trước và phục hồi dữ liệu trong môi trường thử. | Số bài nộp, điểm và Excel khớp bộ kết quả dự kiến. Một học sinh chỉ có một bài trong phiên. Bản nháp nối lại đúng quy tắc thời hạn. Khôi phục đối chiếu được đề, lớp, quyền, bài làm và tệp học liệu trong phạm vi thí điểm. | Người bảo trì chạy mô phỏng và phục hồi. Thầy cùng giáo viên thử thao tác bằng thiết bị thật. |
| **5. Dùng thật với một lớp** | Chọn lớp và thời điểm thử, thống nhất phạm vi dữ liệu và người hỗ trợ. Dùng địa chỉ HTTPS chính thức và database riêng. Cấp tài khoản, nhập lớp được chọn, chuẩn bị một tiết có học liệu và một đề ngắn. | Giáo viên mở được kế hoạch và học liệu từ link chính thức. Học sinh nộp từ QR, điểm và Excel khớp, giáo viên xem báo cáo theo quyền. Ghi lỗi và mức dùng dịch vụ để quyết định khi nào thêm lớp. | Thầy chọn lớp và nghiệm thu. Người bảo trì chuẩn bị phát hành và theo dõi buổi đầu. |

Thứ tự bàn giao là **gói cài Windows và biên bản thử LAN → link HTTPS với dữ liệu giả → link chính thức cho lớp thí điểm**. Có thể chuẩn bị cấu hình hạ tầng và cách cấp mã vào bài cùng lúc.

## Phiếu việc đầu tiên

1. **Cài và mở.** Tải mã đúng PR #1 và cài bằng `Cai_dat_lan_dau.bat` trên Windows có Node.js 24. Mở `Chay_web.bat`. Nếu cần thử SGK offline, cài từ bản ZIP hoặc dùng lệnh cài tệp theo hướng dẫn đóng góp. [Cài tệp SGK](CONTRIBUTING.md#đưa-bản-thử-lên-github)
2. **Quản trị và lớp.** Đổi mật khẩu quản trị của bản thử. Nhập hai lớp giả và cấp hai tài khoản giáo viên có quyền khác nhau. Đăng nhập từng tài khoản, đổi mật khẩu lần đầu, chọn lớp, kiểm quyền và nhật ký. [Luồng cấp tài khoản](README.md#tài-khoản-giáo-viên-và-đề-dùng-chung)
3. **Chuẩn bị và mở một tiết học.** Giáo viên tìm Monty Hall theo chương, xem trước, thêm vào tiết và mở từ Hôm nay. Đổi lớp rồi quay lại, tải lại trang để kiểm kế hoạch. Đăng thêm một học liệu mẫu, thử riêng tư, chia sẻ, thùng rác và khôi phục với hai tài khoản.
4. **Soạn, làm và chữa một bài.** Chọn câu có hình và đáp án biết trước. Dừng chế độ trên máy, mở `Mo_lop_LAN.bat`. Cho laptop và điện thoại cùng Wi-Fi. Trên điện thoại, quét QR, vào đúng lớp, lưu nháp, thử rớt mạng ngắn rồi nộp. Soát một bài đúng, một bài điểm 0 và một học sinh chưa nộp trên thống kê, chữa bài và Excel.
5. **Sao lưu và khôi phục.** Dừng web và dùng `Sao_luu_toan_bo.bat`. Phục hồi bằng `Phuc_hoi_tu_thu_muc.bat` trong bản cài thử khác. Đối chiếu tài khoản, lớp, đề, học liệu đăng tải và kết quả. Kiểm kế hoạch của v0.14 bằng tải lại trên trình duyệt đang dùng. Đính kết quả vào PR rồi xử lý lỗi ảnh hưởng các luồng trên trước khi duyệt bản nền.

Biên bản mốc 1 ghi mã phiên bản, thiết bị, kết quả đạt hoặc lỗi của từng luồng và đường dẫn đến lỗi còn mở. Với đề và điểm, ghi cả kết quả dự kiến và thực tế. Dùng dữ liệu giả trong ảnh, tệp Excel và biên bản chia sẻ trên GitHub.

Kết quả chạy trên bản cài Windows, Excel, phục hồi và bước thử QR còn chờ được ghi tại [Biên bản thử mốc 1](docs/NGHIEM_THU_MOC_1.md).

## Việc kỹ thuật để mở link HTTPS

### Đồng bộ kế hoạch tiết dạy

Lưu kế hoạch theo tài khoản và lớp, tham chiếu học liệu bằng mã. API kiểm tra lớp được cấp và quyền mở học liệu khi đọc hoặc ghi. Khi học liệu bị gỡ hoặc đổi quyền, kế hoạch chỉ hiện những mục còn truy cập được. Thử lưu từ hai thiết bị để việc cập nhật một lớp giữ được dữ liệu của lớp khác. Dùng bản sao lưu của môi trường HTTPS để thử phục hồi kế hoạch. [Cách lưu hiện tại](app/studio-plan.tsx)

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
| 2 | **Hôm nay, học liệu và bộ chọn câu** | Tách màn Hôm nay và kế hoạch thành phần giao được riêng. Thêm thư mục thông tin và bìa cho từng học liệu ưu tiên. Dùng mã chương chung với ngân hàng. Tách màn học liệu và bộ chọn câu khỏi màn hình chung theo cấu trúc đích. Thử sửa bìa và sửa một câu trong hai PR độc lập. |
| 3 | **Đề, lớp, tài khoản và phân quyền** | Tách thao tác lưu/giao đề, danh sách lớp, cấp quyền và nhật ký. Mỗi phần có đường dẫn vào và kiểm thử riêng. Dùng đề riêng, đề tổ, học liệu riêng và hai giáo viên để xác nhận quyền sau khi tách. |
| 4 | **Phiên, học sinh, chấm, báo cáo và vận hành** | Tách dần luồng phiên và bài làm khỏi tệp chung. Giữ bản chụp đề và kết quả làm đầu vào cho chấm, báo cáo và Excel. Ghi đường dẫn sửa QR, sao lưu, kết nối và quy trình phát hành. |

Mỗi việc ghi người sửa, người duyệt, mã câu hoặc chức năng, thư mục và phép thử nghiệm thu. Ưu tiên phần đang cần chỉnh hoặc ảnh hưởng lần triển khai kế tiếp. Các đợt tách còn lại có thể tiếp tục sau khi link HTTPS chạy ổn. [Cách giao việc và duyệt thay đổi](docs/KIEN_TRUC.md#giao-việc-trên-github)
