# Phát hành thử ngân hàng theo chương trên HTTPS

Chạy từ checkout của mã đã duyệt. Trình đóng gói đọc câu chuẩn cùng bản chỉnh theo mã câu và đối chiếu biến thể đã duyệt. Mỗi gói ghi commit nguồn, phiên bản nội dung, danh sách câu và SHA-256 từng hình. Phạm vi thử nghiệm HTTPS đã duyệt ở Toán 12 gồm Chương I với 230 câu chuẩn và 900 biến thể, cùng Chương VI với 118 câu chuẩn và 436 biến thể. [Quy trình sửa một câu](../CONTRIBUTING.md)

Triển khai mã cùng phiên bản biến thể và tệp hình lên bản thử trước. Cấp cấu hình cho lệnh nạp qua `TOANTHD_RELEASE_ORIGIN`, `TOANTHD_RELEASE_ADMIN_PASSWORD` và `TOANTHD_RELEASE_SITES_TOKEN` khi dùng Sites. Lệnh cũng nhận một dòng JSON trên stdin với các trường `origin`, `password` và `sitesToken`. Giữ thông tin xác thực ngoài Git.

```powershell
New-Item -ItemType Directory -Force .wrangler | Out-Null
node scripts/build-bank-release.mjs --chapter 12-C01 --output .wrangler/chuong-i.json
node scripts/publish-bank-release.mjs stage .wrangler/chuong-i.json
node scripts/publish-bank-release.mjs activate <digest-tu-buoc-stage> --chapter 12-C01
```

`stage` đối chiếu hình trên web và trả về mã câu thêm, thay đổi và số câu giữ nguyên. Lệnh lưu gói xem trước tại R2. Sau khi đối chiếu, `activate` dùng đúng mã nhận từ bước xem trước và ghi các bài trong phạm vi phát hành cùng mốc phiên bản trong một giao dịch D1. Khi dữ liệu thay đổi giữa hai bước, chạy lại `stage` để lấy danh sách mới. Mỗi lệnh kích hoạt trả biên nhận và báo khi gói trùng với phiên bản đang dùng. [Giao dịch theo lô trong D1](https://developers.cloudflare.com/d1/observability/find-expensive-queries/)

Đối chiếu số câu của từng bài, thử mở công thức và hình, rồi chạy lại lệnh kích hoạt. Mỗi chương có biên nhận riêng. Trên bộ dữ liệu thử, kiểm tra rằng lỗi giữa giao dịch giữ nguyên câu, đề đã giao và điểm đã nộp. Khi câu chuẩn đổi dấu vân tay, đối chiếu lại xác nhận đáp án và các biến thể liên quan.

## Kiểm tra bài B01 Chương II trên máy

Phạm vi `12-C02` hiện mô tả riêng bài B01 “Vectơ và các phép toán trong không gian”. Bản biên tập chứa 107 câu gốc, 256 biến thể đã nghiệm thu và 43 câu giữ quyết định hoãn tạo biến thể. Câu `dc-12-hk1-2H1-q058-v4` giữ trạng thái chờ duyệt vì nhãn ở ý b trong lời giải mâu thuẫn với khóa đáp án. Phạm vi biên tập bài B01 đang ở bước xác minh trên máy. Hai bài B02 và B03 vẫn nằm trong gói nguồn nền của chương.

```powershell
npm run content:preview -- bank --chapter 12-C02
npm run content:preview -- variants --chapter 12-C02
npm run content:check -- all --chapter 12-C02
node --test tests/content-pilot.test.mjs
```

Kết quả đối chiếu cần có 107 câu nguồn, 256 biến thể khả dụng và danh sách `changed` rỗng ở cả hai gói. Sau khi commit, chạy `node scripts/build-bank-release.mjs --chapter 12-C02` để kiểm tra phiên bản và dấu vân tay hình trên máy. Chỉ chạy các bước `stage` và `activate` khi người phụ trách duyệt phạm vi phát hành HTTPS.
