# Học liệu trên bản HTTPS thử

## Kho học liệu chuẩn

Worker đọc tệp đã chọn từ binding `BUCKET`. Một tệp mở ở `/hoc-lieu-so/nguon/duong-dan/tep.html` được lưu với khóa `library/duong-dan/tep.html`. Chọn tệp được phép đưa lên bản thử. Với học liệu nhiều tệp, nạp kèm ảnh, âm thanh hoặc mã JavaScript và giữ nguyên đường dẫn tương đối. Bản Windows/LAN phục vụ cùng đường dẫn từ thư mục `public/hoc-lieu-so/nguon/`. [Đường dẫn HTTPS](../lib/library-hosted.mjs) · [Đường dẫn LAN](../scripts/library-static.mjs) · [R2 qua Worker](https://developers.cloudflare.com/r2/api/workers/workers-api-reference/)

Tệp lớn được truyền theo luồng và hỗ trợ `Range`. HTML mở trong khung cách ly, kể cả khi mở trực tiếp từ đường dẫn. Tệp ZIP trả về dạng tải xuống. Dùng `HEAD` để kiểm tra tệp có sẵn và đối chiếu dung lượng, rồi mở bài và kiểm tra tệp đi kèm trên trang Học liệu.

Trên bản Sites chỉ dành cho chủ sở hữu, JavaScript bên trong khung cách ly không dùng được phiên đăng nhập của trang để tải tệp phụ. Học liệu mẫu gói dữ liệu đáp án vào HTML để chạy trong khung. Tệp JSON đi kèm vẫn mở được từ đường dẫn riêng sau khi đăng nhập Sites.

## Học liệu giáo viên

Tệp giáo viên lưu qua API của ứng dụng và chỉ mở được với tài khoản có quyền. Dùng hai giáo viên mẫu trên cùng bản thử. Giáo viên B mở được mục A chia sẻ cho tổ. Với mục riêng tư hoặc đã vào thùng rác, đường dẫn tệp trả về 404 cho B. Sau khi A khôi phục, đối chiếu phạm vi chia sẻ và nội dung đọc lại. [API học liệu giáo viên](../lib/library-uploads.mjs)

Khi đặt Worker sau lớp chuyển tiếp HTTPS, cấu hình `THD_PUBLIC_ORIGIN` bằng địa chỉ gốc của bản thử. Ứng dụng dùng địa chỉ này để đặt cookie `Secure` và kiểm tra nguồn gửi yêu cầu thay đổi dữ liệu. [Mã xác thực](../lib/auth.mjs)

Khi thư viện gốc trên Worker báo giới hạn số vòng PBKDF2, ứng dụng dùng `@noble/hashes` để giữ nguyên 600.000 vòng và định dạng băm của tài khoản hiện có. [Giới hạn của Workerd](https://github.com/cloudflare/workerd/issues/1346) · [Noble Hashes](https://github.com/paulmillr/noble-hashes)
