# Góp nội dung cho Toán THĐ

Mỗi yêu cầu ghi mã câu hoặc mã học liệu, thay đổi cần làm và người duyệt. Tạo nhánh công việc từ nhánh tích hợp ghi trong yêu cầu. Người sửa có thể dùng trình soạn thảo hoặc giao cùng yêu cầu cho AI. Ngân hàng Toán 10–12 có nguồn biên tập theo từng câu. Học liệu Monty Hall có mã nguồn riêng.

[Sơ đồ mô-đun và bản đồ tệp](docs/KIEN_TRUC.md) chỉ đường dẫn cho từng chức năng.

| Phần | Nguồn để sửa | Lệnh sau khi sửa |
| --- | --- | --- |
| Câu hỏi Toán 10–11 | `data/course-bank/src/<khối>/<chương>/<bài>/<id>.json`. Mỗi tệp chứa một câu. | `npm run content:build -- bank --chapter 11-C07` |
| Câu hỏi Toán 12 | `data/course-bank/src/12/<chương>/<bài>/<id>.json`. Mỗi tệp chứa một câu. | `npm run content:build -- bank --chapter 12-C02` |
| Biến thể Toán 12 | `data/chapter-variants/src/12/<chương>/<bài>/<id>.json`. Mỗi tệp chứa nhóm biến thể của một câu gốc. | `npm run content:build -- variants --chapter 12-C02` |
| Monty Hall | `data/digital-library/src/12/C06/12-monty-hall-game-577dcd0/` | `npm run content:build -- library` |
| Giao diện, quyền, cơ sở dữ liệu | `app/`, `lib/`, `drizzle/` | `npm run typecheck` và `npm test` |

Thay mã trong ví dụ bằng chương đang sửa. Toán 10 và 11 dùng `10-C01`–`10-C09` và `11-C01`–`11-C09`. Toán 12 dùng `12-C01`–`12-C06`. Với Toán 11, đặt bài có mã gốc `8H` trong `11/C07`, `9D` trong `11/C08` và `7D` trong `11/C09` theo mục lục Kết nối tri thức. Giữ nguyên mã bài và mã câu gốc.

Nguồn Toán 10–11 gồm 4.799 câu trong 58 bài. Khi tách tệp theo câu, giữ nội dung và trạng thái nguồn của 87 câu chờ duyệt và 1.035 câu tham khảo. Các câu tham khảo vẫn có trong ngân hàng để tra cứu. Việc duyệt thay đổi đáp án và khả năng chấm tự động đi qua quy trình duyệt nguồn.

## Thử một thay đổi

1. Mở [câu 13 trong thư mục B02](data/course-bank/src/12/C06/B02/dc-12-hk2-6D2-q013-v4.json). Sửa trường `solution` và giữ mã, số câu gốc, dạng câu và `based_on`. Nội dung dùng HTML và MathML giống các câu bên cạnh. Với đáp án số, kiểm tra cả `accepted_answers`. Khi giao cả phần, ghi thư mục bài và danh sách mã hoặc dạng câu cần soát.
2. Chạy `npm run content:preview -- bank --chapter 12-C06` để xem câu bị đổi và dấu vân tay mới. Chạy `npm run content:build -- bank --chapter 12-C06` để sinh gói câu hỏi của chương. Các biến thể gắn với dấu vân tay cũ tạm ẩn trong lần soạn đề tiếp theo. Muốn phát hành lại chúng, soát từng biến thể, cập nhật `source_fingerprint` trong tệp biến thể tương ứng, rồi đóng gói phần `variants` của chương đó.
3. Trên một nhánh khác, thay `cover.jpg` của Monty Hall bằng ảnh JPEG phù hợp. Chỉnh tên hoặc mô tả trong `manifest.json` nếu cần. Chạy `npm run content:build -- library`. Bìa được xuất với đường dẫn theo SHA-256 và gói học liệu nhận phiên bản riêng.
4. Chạy `npm run content:check` và mở pull request. Đính kèm tệp nguồn cùng tệp sinh ra của phần vừa chỉnh. Người phụ trách kiểm tra nội dung toán hoặc bìa. Tác vụ GitHub Actions kiểm gói, kiểu dữ liệu, bộ kiểm thử và bản build.

Khi hai người sửa hai câu khác nhau trong một bài, ghép các tệp câu trên nhánh tích hợp mới nhất rồi chạy lại `content:build` cho phần đó. Công cụ sẽ tạo gói từ các bài được cấu hình trong phạm vi đang biên tập.

Chương II gồm đủ ba bài. Câu `dc-12-hk1-2H1-q058-v4` của Bài 1 đã được giáo viên duyệt đổi nhãn lời giải ý b thành **Đúng**, giữ khóa đáp án gốc. Giáo viên đã duyệt thêm bảy câu gốc trong Chương II, IV và V. Các câu đã sửa đủ điều kiện chấm tự động. Hai mươi bốn biến thể gắn với dấu vân tay cũ tạm ẩn trong lần soạn đề tiếp theo. [Hướng dẫn nạp ngân hàng](docs/NAP_NGAN_HANG_HTTPS.md)

`questions.json.gz` chứa ngân hàng nền. `data/chapter-variants/source/` chứa nguồn biến thể Toán 12 đã nghiệm thu. Bộ đóng gói đối chiếu tệp biên tập trong `src/` với nguồn nền theo mã câu và sinh bản cập nhật theo chương trong `generated/`. Chạy `npm run local:setup` để cài hoặc cập nhật ngân hàng trên bản cục bộ. Trên HTTPS, đóng gói từ commit đã duyệt, xem trước, kích hoạt từng chương và kiểm tra biên nhận. Bản cài sao lưu toàn thư mục lưu cả đề đã giao và dữ liệu của giáo viên.

## Đưa bản thử lên GitHub

- Dùng repo riêng tư khi chia sẻ ngân hàng kèm đáp án. Từ mẫu `.github/CODEOWNERS.example`, tạo `.github/CODEOWNERS` với tài khoản hoặc nhóm thật. Cấu hình yêu cầu pull request, kiểm tra tự động và người duyệt cho nhánh `main` khi gói GitHub hỗ trợ. [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) · [Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).
- Tệp SGK offline khoảng 124,6 MiB. Nếu có quyền phân phối, đính kèm tệp theo tên trong `data/digital-library/large-assets.json` vào bản phát hành có quyền truy cập phù hợp. Sau khi tải, chạy `npm run library:install-asset -- "đường-dẫn-tới-tệp.html"` để kiểm SHA-256 và cài. Gói ZIP chạy cục bộ có sẵn tệp này. [Giới hạn tệp](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github#file-size-limits) · [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).
- Git lưu mã, dữ liệu biên tập và cấu hình mẫu. Tài khoản, danh sách lớp, bài làm, học liệu riêng và bản sao lưu thuộc bản cài vận hành.

Hai lệnh sau chạy lại bài thử độc lập trên dữ liệu mẫu.

```text
npm run content:check
node --test tests/content-pilot.test.mjs
```
