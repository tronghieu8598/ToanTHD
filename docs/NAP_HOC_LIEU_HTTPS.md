# Học liệu số

Mỗi học liệu có một mã ổn định và một thư mục biên tập `data/digital-library/src/<khối>/<chương>/<id>/`. Tài nguyên chung dùng `chung` ở cấp tương ứng. Tên, mô tả, chương, bìa và clip nằm trong `library-item.json`. Danh mục nền `data/digital-library/catalog.json` ghi tên gốc, đường dẫn và dung lượng của bản đã tiếp nhận.

## Giao từng phần

- **Nội dung thẻ**. Sửa `library-item.json`. Dùng số chương trong `data/curriculum/kntt-math.json`.
- **Mã bài tương tác**. Tìm tệp mở từ `url` trong danh mục nền và sửa trong `public/hoc-lieu-so/nguon/`. Khi sửa nội dung gốc đã duyệt, cập nhật số byte trong danh mục. Giữ mã và đường dẫn để kế hoạch tiết dạy đã lưu vẫn mở đúng bài.
- **Bìa và clip**. Đặt `cover.jpg` hoặc `preview.mp4` cạnh tệp biên tập rồi khai báo trong `library-item.json`. Clip quay trực tiếp từ học liệu, dài 5–10 giây, MP4 H.264 không âm thanh và dưới 2 MB. Ghi `durationSeconds` theo thời lượng đã kiểm. Thiếu clip thì thẻ dùng bìa.

Sau khi sửa, chạy `npm run library:build` rồi `npm run library:check`. Đính kèm nguồn và tệp sinh ra trong pull request. Hai người có thể sửa hai thư mục học liệu khác nhau. Sau khi ghép nhánh, chạy lại lệnh sinh danh mục.

## Phát hành học liệu chuẩn

1. Từ checkout GitHub đã duyệt, chạy `npm run library:stage -- --out <thư-mục-bàn-giao>`. Lệnh tạo thư mục `hoc-lieu-<phiên-bản>` với đường dẫn nguồn đã đối chiếu và gói danh mục chứa số byte cùng SHA-256 của từng tệp.
2. Đồng bộ mã giao diện và danh mục sinh ra lên Sites. Giữ danh mục nền HTTPS với các học liệu đang phục vụ. Sau khi trang quản trị chạy, mở `/quan-tri/nap-hoc-lieu` bằng tài khoản quản trị và chọn đúng thư mục trên.
3. Nạp và đối chiếu. Trang gửi từng tệp và tiếp tục từ các tệp đã xác nhận nếu bị gián đoạn. Khi đủ tệp, hệ thống cập nhật phiên bản đang dùng trong một giao dịch D1. Bản cũ vẫn mở được trong lúc chuẩn bị bản mới.
4. Kiểm tra biên nhận và mở ít nhất một học liệu mới của mỗi khối. Với HTML dùng thư viện ngoài, kiểm tra thao tác thực tế trên máy có kết nối. Tải lại trang học liệu sau khi phát hành.

Các tệp phát hành được lưu theo phiên bản trong R2. Ba SGK giữ quy trình nạp riêng theo khối. Học liệu giáo viên tự đăng vẫn dùng quyền chia sẻ, thùng rác và lịch sử riêng của thư viện.
