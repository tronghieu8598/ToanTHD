# Toán THĐ Studio

- Đọc CONTRIBUTING.md để xác định tệp nguồn của phần được giao.
- Tìm câu theo mã `id` và số câu in trên đề. Giữ mã, số gốc, dạng câu và dấu vân tay `based_on`. Đọc dữ liệu MathML hiện có khi sửa lời giải.
- Cập nhật nội dung trong `src/`, chạy `npm run content:build -- <bank|variants|library>` rồi `npm run content:check`. Các tệp trong `generated/` được sinh từ nguồn.
- Báo mã câu có biến thể cần duyệt lại. Giáo viên duyệt phép tính, đáp án và lời giải trước khi phát hành.
- Giao diện ở `app/`, API ở `lib/`, nâng cấp cơ sở dữ liệu ở `drizzle/`. Kiểm tra bằng `npm run typecheck` và `npm test`.
- Dùng dữ liệu mẫu khi kiểm thử. Cấu hình chạy thật, bản sao lưu, danh sách lớp, bài làm và dữ liệu riêng nằm ngoài Git.
