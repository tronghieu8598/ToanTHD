# Diễn tập một lớp trên HTTPS

Dùng một địa chỉ HTTPS diễn tập với D1 và R2 riêng. Tạo tài khoản giáo viên, lớp, đề và tệp học liệu giả. Ghi lại phiên bản mã nguồn đang thử và người có quyền quản trị hạ tầng. Cấu hình `THD_PUBLIC_ORIGIN` bằng đúng địa chỉ truy cập, rồi quét QR từ Wi-Fi và dữ liệu di động.

## Lượt vào bài có bảo vệ

Phiên mới cho lớp thực tế trên HTTPS yêu cầu mã cá nhân trước khi xác nhận họ tên. Trong chi tiết phiên, mở **Cấp mã cá nhân** để phát cho cả lớp chưa vào hoặc theo một STT. Gửi riêng từng mã. Mã có hiệu lực đến 15 phút hoặc đến lúc phiên đóng, tùy mốc nào đến trước.

Nếu không nhận được phản hồi khi phát mã, cấp lại theo STT chưa vào bài. Nếu học sinh đã vào và mất thiết bị hoặc mất phiên, dùng **Đổi thiết bị** để cấp mã mới và thu hồi quyền của thiết bị cũ. Mã chỉ xuất hiện khi giáo viên cấp và hệ thống chỉ lưu giá trị băm. Phiên cũ, lớp minh họa và bản LAN dùng luồng tương thích của chúng.

## Chạy 40–45 học sinh giả

1. Chọn mã đợt gồm 6–12 chữ in hoa hoặc số, ví dụ `Q7J41X`. Tạo lớp khối 11 có tên `11 Dien tap HTTPS Q7J41X`. Dùng chế độ **Lớp thực tế** trên cơ sở dữ liệu diễn tập để kiểm tra luồng yêu cầu mã cá nhân với tên học sinh giả.
2. Tạo CSV với số lượng đã chọn. Sau khi nhập, kiểm tra đủ STT liên tiếp và tên `Dien tap 01`, `Dien tap 02` đến hết danh sách.

   ```powershell
   node scripts/https-rehearsal.mjs --roster 42 | Set-Content -Encoding utf8 "$env:TEMP/toanthd-dien-tap-roster.csv"
   ```

3. Soạn một câu trắc nghiệm riêng có nội dung `Dien tap HTTPS - 1 + 1 bang bao nhieu?`, đáp án A là 2, B là 3. Mở một phiên **Luyện tập** kiểu **Online** với đúng câu này, thời lượng 15 phút, tên `Dien tap HTTPS Q7J41X`. Cấp mã cá nhân cho cả lớp. Phiên cần mới vì mỗi mã chỉ dùng cho một lượt vào bài.
4. Lưu JSON dưới đây trên máy dưới dạng UTF-8 ngoài Git. Thay địa chỉ thử, mã phiên và toàn bộ danh sách bằng giấy phát mã thực tế của **phiên giả**. Mỗi phần tử có `ordinal` là số và `code` là mã cá nhân.

   ```json
   {
     "origin": "https://dien-tap.example.invalid",
     "marker": "Q7J41X",
     "code": "ABC234",
     "codes": []
   }
   ```

5. Chạy bước kiểm tra tệp cục bộ rồi chạy thử đúng một lần. Công cụ xác minh tên phiên, lớp, danh sách và yêu cầu mã cá nhân trước khi ghi bài làm. Khi cần chạy lại sau lỗi, tạo phiên mới và cấp bộ mã mới. Nếu địa chỉ thử yêu cầu đăng nhập qua trang trung gian, luồng tự động cần điểm vào học sinh hợp lệ trên môi trường diễn tập.

   ```powershell
   node scripts/https-rehearsal.mjs --plan "$env:TEMP/toanthd-dien-tap.json"
   node scripts/https-rehearsal.mjs --plan "$env:TEMP/toanthd-dien-tap.json" --run
   ```

6. Giáo viên mở **Thống kê & chữa bài**, xuất báo cáo 6 sheet và chạy đối chiếu. Kỳ vọng mọi học sinh đã nộp, STT cuối đạt 0 điểm, các STT còn lại đạt 10 điểm. Công cụ ghi thời gian p95 và tối đa cho từng đợt tra, vào, lưu và nộp. Phép thử gửi lại bản lưu với số phiên bản cũ để kiểm tra cách nhận lại bản nháp, sau đó nộp lại để đối chiếu thời điểm nộp.

   ```powershell
   node scripts/https-rehearsal.mjs --plan "$env:TEMP/toanthd-dien-tap.json" --excel "C:/duong-dan/bao-cao.xlsx"
   ```

## Nghiệm thu trên thiết bị thật

Dùng một phiên giả khác với vài mã dự phòng. Ghi loại máy, trình duyệt, mạng, phiên bản phát hành và kết quả từng ca. Kiểm thử tự động đo kết quả API, còn bảng dưới đây đo thao tác trong trình duyệt và mạng thực.

| Ca | Cách kiểm tra | Qua khi |
| --- | --- | --- |
| Vào bài | Trên Safari iPhone và Chrome Android, quét QR bằng Wi-Fi và dữ liệu di động. Thử STT, mã đúng, một mã sai, một mã hết hạn, và một mã đã dùng trong cửa sổ riêng. | Chỉ xem họ tên khi mã đúng. Mã sai hoặc hết hạn bị từ chối. Cửa sổ khác không giành được bài từ mã đã dùng. |
| Mất mạng và tải lại | Trên mỗi điện thoại, lưu đáp án đầu rồi ngắt mạng, sửa một đáp án, cuộn đến nút nộp, bật mạng lại và chờ báo đã lưu. Tải lại cùng thiết bị. | Không nhảy lên đầu, không mất sửa đổi. Bản nháp và số câu đã trả lời đúng, trạng thái đã lưu khớp báo cáo giáo viên. |
| Đổi thiết bị | Trên laptop, giáo viên bấm cho đổi thiết bị trước khi nộp. Dùng mã mới trên máy khác và thử thao tác lại trên máy cũ. | Máy mới tiếp tục đúng bản đã lưu. Máy cũ hết quyền lưu hoặc nộp. Một bài trong báo cáo. |
| Nộp và hết giờ | Nộp trên điện thoại với mạng chập chờn. Với em khác, để hết giờ khi thiết bị đang mất mạng rồi kết nối lại. | Máy chủ giữ một thời điểm nộp. Bài hết giờ chỉ chấm từ đáp án đã tới máy chủ. Báo cáo và Excel khớp điểm, kể cả điểm 0. |
| Quyền giáo viên | Tạo hai giáo viên thử, cấp hai phạm vi lớp. Mở báo cáo và tệp của lớp còn lại từ địa chỉ trực tiếp. Thử khóa tài khoản khi đang đăng nhập. | Tài khoản chỉ thấy lớp và học liệu đúng quyền. Quyền tệp và phiên đăng nhập thay đổi đúng sau khi thu hồi. |

## Diễn tập phục hồi D1 và R2

1. Sau một phiên đã nộp, khóa ghi trên môi trường giả. Ghi các số đối chiếu như tài khoản, quyền, học liệu giáo viên, phiên, lượt làm đã nộp và điểm. Chụp phiên bản đang phục vụ, mốc D1 và danh sách khóa R2 cùng dung lượng, loại nội dung và SHA-256 của tệp mẫu. Với kho chuẩn, ghi mã bản đang kích hoạt tại `/api/library-release/status`. [Kho học liệu HTTPS](NAP_HOC_LIEU_HTTPS.md)
2. Người phụ trách hạ tầng chuẩn bị bản sao D1 và các tệp R2 trong kho khôi phục riêng. Nếu có quyền trên tài nguyên Cloudflare, dùng công cụ sao lưu hoặc Time Travel phù hợp cho D1 thử. Với R2, lưu bản sao các đối tượng, giữ nguyên đường dẫn và metadata. Dùng bản sao dữ liệu cùng mốc để con trỏ bản học liệu trong D1 trùng phiên bản tệp bên R2. [Cloudflare D1 Time Travel](https://developers.cloudflare.com/d1/reference/time-travel/) · [Cloudflare R2 Objects](https://developers.cloudflare.com/api/resources/r2/subresources/buckets/subresources/objects/)
3. Trên môi trường khôi phục, xác nhận đăng nhập, quyền theo lớp, kế hoạch tiết dạy, học liệu riêng của giáo viên, điểm đã nộp và tệp R2 có thể mở. Với học liệu chuẩn, đối chiếu mã phiên bản rồi mở tệp, kiểm SHA-256 và dung lượng từ nội dung đã tải về. Diễn tập quay về bản web tương thích với cấu trúc D1 đã phục hồi. Ghi thời gian phục hồi và sai lệch.

Bản JSON **Sao lưu & phục hồi** chỉ bao phủ ngân hàng, lớp, học sinh, phiên và bài làm. Phần tài khoản, kế hoạch, học liệu và tệp R2 cần được kiểm trong bản sao hạ tầng. Nếu tài khoản Sites đang dùng chưa có quyền tạo bản sao tài nguyên hạ tầng, ghi ca phục hồi là chờ quyền. [Phạm vi JSON](../lib/backup-model.mjs) · [Hướng dẫn sao lưu ứng dụng](../README.md#sao-lưu--phục-hồi-mới-trong-v05)

Khi bàn giao, đính kèm số bài và điểm tổng hợp, thời gian từng đợt, kết quả thiết bị và thời gian phục hồi. Mã cá nhân, tệp JSON có mã, khóa và bản sao dữ liệu lưu trong phạm vi diễn tập.
