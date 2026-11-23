# Bản Toán THĐ công khai

Trang giới thiệu và thư viện chọn lọc được dựng từ danh sách đã duyệt trong `approvals.json`. Dùng danh sách 36 mã đối chiếu để xác minh nguồn và quyền chia sẻ trước khi thêm mục.

## Duyệt một học liệu

Mỗi mục trong `approved` có `id` và `approval` với `by`, `date` và `evidence`. Chọn một nguồn cho mỗi mục:

- `official` chứa `url` HTTPS và `host` đã xác minh ở chế độ khách. Ba SGK có mã riêng `10-sgk-toan-tap-1`, `11-sgk-toan-tap-1` và `12-sgk-toan-tap-1` để dẫn tới trình đọc của nhà xuất bản.
- `lesson` chứa `sha256` của `public/hoc-lieu-so/nguon/<id>/index.html`. Nếu bài có thư viện đặt trong thư mục `vendor/` cùng bài, ghi từng tên tệp và `sha256` trong `lesson.assets`. Bản dựng đưa đúng tệp đã duyệt tới `lessons/<id>/index.html` và `lessons/<id>/vendor/`. Khi sửa bài, cập nhật danh mục nội bộ bằng `npm run library:build`, kiểm lại nội dung và cập nhật mã kiểm tra của phiên bản đã duyệt.

Có thể thêm `cover` và `preview` khi đã duyệt ảnh hoặc clip. Mỗi trường cần `sha256` của đúng tệp hiện tại và `evidence` cho quyền công bố. Bản dựng gồm trang tĩnh, danh mục tối thiểu và các tệp HTML, ảnh hoặc clip đã duyệt. PDF, ZIP, dữ liệu lớp, bài làm, tài khoản và ngân hàng câu hỏi thuộc hệ thống nội bộ.

Bài Phép chiếu song song dùng tệp từ `three@0.160.0`, gồm OrbitControls và lil-gui 0.17.0. Giấy phép MIT của cả hai thư viện đi cùng học liệu. Khi nâng phiên bản, thay các tệp cùng nhau, chạy thử mô phỏng và duyệt lại mã kiểm tra.

## Dựng và kiểm tra

```powershell
node scripts/build-public-edition.mjs --out ../ToanTHD-RaMat-Preview --preview
node scripts/build-public-edition.mjs --out ../ToanTHD-RaMat
```

Thư mục đầu ra cần mới. Bản xem trước hỗ trợ danh sách trống. Bản phát hành yêu cầu tối thiểu một mục đã duyệt. Kiểm khách mở được các đích HTTPS, lọc theo khối và chương, thao tác trên điện thoại, và đối chiếu danh mục tệp đã dựng trước khi đưa lên một Sites riêng. Chỉ đóng gói đầu ra dành cho khách truy cập.
