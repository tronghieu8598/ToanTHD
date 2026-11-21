# Phát hành thử ngân hàng theo chương trên HTTPS

Chạy từ checkout của mã đã duyệt. Trình đóng gói đọc câu chuẩn cùng bản chỉnh theo mã câu và đối chiếu biến thể đã duyệt. Mỗi gói ghi commit nguồn, phiên bản nội dung, danh sách câu và SHA-256 từng hình. Bảng dưới liệt kê các phạm vi có thể đóng gói trong kho mã. Kiểm tra biên nhận của từng chương trên bản thử để xác định gói đang hoạt động. [Quy trình sửa một câu](../CONTRIBUTING.md)

| Chương | Mã gói | Số câu chuẩn | Số biến thể khả dụng |
| --- | --- | ---: | ---: |
| I | `12-C01` | 230 | 900 |
| II | `12-C02` | 218 | 696 |
| III | `12-C03` | 151 | 604 |
| IV | `12-C04` | 153 | 568 |
| V | `12-C05` | 168 | 624 |
| VI | `12-C06` | 118 | 436 |

Triển khai mã cùng phiên bản biến thể và tệp hình lên bản thử trước. Cấp cấu hình cho lệnh nạp qua `TOANTHD_RELEASE_ORIGIN`, `TOANTHD_RELEASE_ADMIN_PASSWORD` và `TOANTHD_RELEASE_SITES_TOKEN` khi dùng Sites. Lệnh cũng nhận một dòng JSON trên stdin với các trường `origin`, `password` và `sitesToken`. Giữ thông tin xác thực ngoài Git.

```powershell
New-Item -ItemType Directory -Force .wrangler | Out-Null
node scripts/build-bank-release.mjs --chapter 12-C01 --output .wrangler/chuong-i.json
node scripts/publish-bank-release.mjs stage .wrangler/chuong-i.json
node scripts/publish-bank-release.mjs activate <digest-tu-buoc-stage> --chapter 12-C01
```

`stage` đối chiếu hình trên web và trả về mã câu thêm, thay đổi và số câu giữ nguyên. Lệnh lưu gói xem trước tại R2. Sau khi đối chiếu, `activate` dùng đúng mã nhận từ bước xem trước và ghi các bài trong phạm vi phát hành cùng mốc phiên bản trong một giao dịch D1. Khi dữ liệu thay đổi giữa hai bước, chạy lại `stage` để lấy danh sách mới. Mỗi lệnh kích hoạt trả biên nhận và báo khi gói trùng với phiên bản đang dùng. [Giao dịch theo lô trong D1](https://developers.cloudflare.com/d1/observability/find-expensive-queries/)

Đối chiếu số câu của từng bài, thử mở công thức và hình, rồi chạy lại lệnh kích hoạt. Mỗi chương có biên nhận riêng. Trên bộ dữ liệu thử, kiểm tra rằng lỗi giữa giao dịch giữ nguyên câu, đề đã giao và điểm đã nộp. Khi câu chuẩn đổi dấu vân tay, đối chiếu lại xác nhận đáp án và các biến thể liên quan.

## Kiểm tra gói Chương II–V trên máy

Phạm vi `12-C02` gồm cả ba bài B01, B02 và B03. Câu `dc-12-hk1-2H1-q058-v4` đã được giáo viên duyệt sửa nhãn ý b trong lời giải thành **Đúng** và giữ khóa đáp án gốc. Giáo viên đã duyệt thêm bảy câu gốc sau khi đối chiếu lời giải, phương án và đáp số. Các bản sửa đã duyệt đủ điều kiện chấm tự động. Hai mươi bốn biến thể tạm ẩn vì còn gắn với dấu vân tay cũ của các câu gốc vừa sửa.

```powershell
npm run content:preview -- bank --chapter 12-C02
npm run content:preview -- variants --chapter 12-C02
npm run content:check -- all --chapter 12-C02
node --test tests/content-pilot.test.mjs
```

Đối chiếu số câu và biến thể với bảng. Mục `changed` của gói câu hỏi Chương II có hai mã câu đã duyệt, Chương IV và V có ba mã mỗi chương. Sau khi commit, chạy `node scripts/build-bank-release.mjs --chapter 12-C02` để kiểm tra phiên bản và dấu vân tay hình trên máy. Dùng mã chương tương ứng khi kiểm tra Chương III–V. Chỉ chạy các bước `stage` và `activate` khi người phụ trách duyệt phạm vi phát hành HTTPS.
