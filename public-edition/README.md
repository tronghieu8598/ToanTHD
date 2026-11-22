# Bản Toán THĐ công khai

Trang giới thiệu và thư viện chọn lọc được dựng từ danh sách đã duyệt trong `approvals.json`. Dùng danh sách 36 mã đối chiếu để xác minh nguồn và quyền chia sẻ trước khi thêm mục.

## Duyệt một học liệu

Mỗi mục trong `approved` có `id`, `approval` với `by`, `date` và `evidence`, cùng `official` với `url` HTTPS và `host` đã xác minh. Người duyệt kiểm lại nội dung ở chế độ khách. Từng SGK có mã riêng `10-sgk-toan-tap-1`, `11-sgk-toan-tap-1` và `12-sgk-toan-tap-1` để dẫn tới trang chính thức.

Có thể thêm `cover` và `preview` khi đã duyệt riêng ảnh hoặc clip. Mỗi trường cần `sha256` của đúng tệp hiện tại và `evidence` cho quyền công bố. Bản dựng gồm trang tĩnh, danh mục tối thiểu và các tệp truyền thông được chọn. Các liên kết mở nguồn chính thức. Tệp HTML, PDF, ZIP gốc, dữ liệu lớp, bài làm, tài khoản và ngân hàng câu hỏi thuộc hệ thống nội bộ.

## Dựng và kiểm tra

```powershell
node scripts/build-public-edition.mjs --out ../ToanTHD-RaMat-Preview --preview
node scripts/build-public-edition.mjs --out ../ToanTHD-RaMat
```

Thư mục đầu ra cần mới. Bản xem trước hỗ trợ danh sách trống. Bản phát hành yêu cầu tối thiểu một mục đã duyệt. Kiểm khách mở được các đích HTTPS, lọc theo khối và chương, thao tác trên điện thoại, và đối chiếu danh mục tệp đã dựng trước khi đưa lên một Sites riêng. Chỉ đóng gói đầu ra dành cho khách truy cập.
