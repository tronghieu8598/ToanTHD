# Phát hành thử ngân hàng Chương VI trên HTTPS

Chạy từ checkout của mã đã duyệt. Trình đóng gói đọc câu chuẩn cùng bản chỉnh theo mã câu và đối chiếu biến thể đã duyệt. Mỗi gói ghi commit nguồn, phiên bản nội dung, danh sách câu và SHA-256 từng hình. Chương VI hiện có 118 câu chuẩn, 436 biến thể và 101 tệp hình. [Quy trình sửa một câu](../CONTRIBUTING.md)

Triển khai mã cùng phiên bản biến thể và tệp hình lên bản thử trước. Cấp cấu hình cho lệnh nạp qua `TOANTHD_RELEASE_ORIGIN`, `TOANTHD_RELEASE_ADMIN_PASSWORD` và `TOANTHD_RELEASE_SITES_TOKEN` khi dùng Sites. Lệnh cũng nhận một dòng JSON trên stdin với các trường `origin`, `password` và `sitesToken`. Giữ thông tin xác thực ngoài Git.

```powershell
New-Item -ItemType Directory -Force .wrangler | Out-Null
node scripts/build-bank-release.mjs --output .wrangler/chuong-vi.json
node scripts/publish-bank-release.mjs stage .wrangler/chuong-vi.json
node scripts/publish-bank-release.mjs activate <digest-tu-buoc-stage>
```

`stage` đối chiếu hình trên web và trả về mã câu thêm, thay đổi và số câu giữ nguyên. Lệnh lưu gói xem trước tại R2. Sau khi đối chiếu, `activate` dùng đúng mã nhận từ bước xem trước và ghi toàn bộ chương cùng mốc phiên bản trong một giao dịch D1. Khi dữ liệu thay đổi giữa hai bước, chạy lại `stage` để lấy danh sách mới. Mỗi lệnh kích hoạt trả biên nhận và báo khi gói trùng với phiên bản đang dùng. [Giao dịch theo lô trong D1](https://developers.cloudflare.com/d1/observability/find-expensive-queries/)

Kiểm tra đủ hai bài, thử mở công thức và hình, rồi chạy lại lệnh kích hoạt. Trên bộ dữ liệu thử, kiểm tra rằng lỗi giữa giao dịch giữ nguyên câu, đề đã giao và điểm đã nộp. Khi câu chuẩn đổi dấu vân tay, đối chiếu lại xác nhận đáp án và các biến thể liên quan.
