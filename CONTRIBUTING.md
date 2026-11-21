# Góp nội dung cho Toán THĐ

Mỗi yêu cầu ghi mã câu hoặc mã học liệu, thay đổi cần làm và người duyệt. Tạo nhánh công việc từ nhánh tích hợp ghi trong yêu cầu. Người sửa có thể dùng trình soạn thảo hoặc giao cùng yêu cầu cho AI. Nguồn biên tập theo từng câu đã có cho Chương I, bài B01 Chương II và Chương VI Toán 12. Học liệu Monty Hall có mã nguồn riêng.

[Sơ đồ mô-đun và bản đồ tệp](docs/KIEN_TRUC.md) chỉ đường dẫn cho từng chức năng.

| Phần | Nguồn để sửa | Lệnh sau khi sửa |
| --- | --- | --- |
| Câu hỏi Chương I | `data/course-bank/src/12/C01/B01/` đến `B04/`. Mỗi tệp mang mã một câu. | `npm run content:build -- bank --chapter 12-C01` |
| Biến thể Chương I | `data/chapter-variants/src/12/C01/B01/` đến `B04/`. Mỗi tệp mang mã câu gốc. | `npm run content:build -- variants --chapter 12-C01` |
| Câu hỏi bài B01 Chương II | `data/course-bank/src/12/C02/B01/`. Mỗi tệp mang mã một câu. | `npm run content:build -- bank --chapter 12-C02` |
| Biến thể bài B01 Chương II | `data/chapter-variants/src/12/C02/B01/`. Mỗi tệp mang mã câu gốc. | `npm run content:build -- variants --chapter 12-C02` |
| Câu hỏi Chương VI | `data/course-bank/src/12/C06/B01/` và `B02/`. Mỗi tệp mang mã một câu. | `npm run content:build -- bank` |
| Biến thể Chương VI | `data/chapter-variants/src/12/C06/B01/` và `B02/`. Mỗi tệp mang mã câu gốc. | `npm run content:build -- variants` |
| Monty Hall | `data/digital-library/src/12/C06/12-monty-hall-game-577dcd0/` | `npm run content:build -- library` |
| Giao diện, quyền, cơ sở dữ liệu | `app/`, `lib/`, `drizzle/` | `npm run typecheck` và `npm test` |

## Thử một thay đổi

1. Mở [câu 13 trong thư mục B02](data/course-bank/src/12/C06/B02/dc-12-hk2-6D2-q013-v4.json). Sửa trường `solution` và giữ mã, số câu gốc, dạng câu và `based_on`. Nội dung dùng HTML và MathML giống các câu bên cạnh. Với đáp án số, kiểm tra cả `accepted_answers`. Khi giao cả phần, ghi thư mục bài và danh sách mã hoặc dạng câu cần soát.
2. Chạy `npm run content:preview -- bank` để xem câu bị đổi và dấu vân tay mới. Chạy `npm run content:build -- bank` để sinh gói câu hỏi. Các biến thể gắn với dấu vân tay cũ tạm ẩn trong lần soạn đề tiếp theo. Muốn phát hành lại chúng, soát từng biến thể, cập nhật `source_fingerprint` trong tệp biến thể tương ứng, rồi đóng gói phần `variants`.
3. Trên một nhánh khác, thay `cover.jpg` của Monty Hall bằng ảnh JPEG phù hợp. Chỉnh tên hoặc mô tả trong `manifest.json` nếu cần. Chạy `npm run content:build -- library`. Bìa được xuất với đường dẫn theo SHA-256 và gói học liệu nhận phiên bản riêng.
4. Chạy `npm run content:check` và mở pull request. Đính kèm tệp nguồn cùng tệp sinh ra của phần vừa chỉnh. Người phụ trách kiểm tra nội dung toán hoặc bìa. Tác vụ GitHub Actions kiểm gói, kiểu dữ liệu, bộ kiểm thử và bản build.

Khi hai người sửa hai câu khác nhau trong một bài, ghép các tệp câu trên nhánh tích hợp mới nhất rồi chạy lại `content:build` cho phần đó. Công cụ sẽ tạo gói từ các bài được cấu hình trong phạm vi đang biên tập.

Bài B01 Chương II là “Vectơ và các phép toán trong không gian”, mã `dc-12-hk1-2H1-v4`. Phạm vi có 107 câu gốc và 256 biến thể đã nghiệm thu. 43 câu giữ quyết định hoãn tạo biến thể trong nguồn đã duyệt. Với câu `dc-12-hk1-2H1-q058-v4`, giáo viên đã duyệt đổi nhãn lời giải ý b thành **Đúng** và giữ khóa đáp án gốc. Xem phạm vi thử nghiệm tại [hướng dẫn nạp ngân hàng](docs/NAP_NGAN_HANG_HTTPS.md).

Các tệp `questions.json.gz`, `data/chapter-variants/source/` và mô-đun biến thể cũ là dữ liệu nền của bản thử. Bộ đóng gói ghép bản sửa theo mã và giữ phiên bản gói riêng trong `generated/`. Sau khi duyệt câu hỏi, chạy bước cài đặt/nâng cấp cơ sở dữ liệu trên bản thử rồi dựng lại web. Bản cài sao lưu toàn thư mục lưu cả đề đã giao và dữ liệu của giáo viên.

## Đưa bản thử lên GitHub

- Dùng repo riêng tư khi chia sẻ ngân hàng kèm đáp án. Từ mẫu `.github/CODEOWNERS.example`, tạo `.github/CODEOWNERS` với tài khoản hoặc nhóm thật. Cấu hình yêu cầu pull request, kiểm tra tự động và người duyệt cho nhánh `main` khi gói GitHub hỗ trợ. [CODEOWNERS](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-code-owners) · [Rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/available-rules-for-rulesets).
- Tệp SGK offline khoảng 124,6 MiB. Nếu có quyền phân phối, đính kèm tệp theo tên trong `data/digital-library/large-assets.json` vào bản phát hành có quyền truy cập phù hợp. Sau khi tải, chạy `npm run library:install-asset -- "đường-dẫn-tới-tệp.html"` để kiểm SHA-256 và cài. Gói ZIP chạy cục bộ có sẵn tệp này. [Giới hạn tệp](https://docs.github.com/en/repositories/working-with-files/managing-large-files/about-large-files-on-github#file-size-limits) · [GitHub Releases](https://docs.github.com/en/repositories/releasing-projects-on-github/about-releases).
- Git lưu mã, dữ liệu biên tập và cấu hình mẫu. Tài khoản, danh sách lớp, bài làm, học liệu riêng và bản sao lưu thuộc bản cài vận hành.

Hai lệnh sau chạy lại bài thử độc lập trên dữ liệu mẫu.

```text
npm run content:check
node --test tests/content-pilot.test.mjs
```
