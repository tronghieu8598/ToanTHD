# Bản tích hợp Toán THĐ v0.11

Ngày bàn giao: 09/11/2026. Nền mã nguồn: **ToanTHD_v0.10_Source.zip** do người dùng cung cấp.
SHA-256 nền: `3c3f9a8d4e2b1a9992f62724c049bece42b70f49078310102c2eb31254c8b17e`.

## Phần đã tích hợp

- Chương I–V: **3.416 biến thể / 854 câu gốc**. Gói nguồn có 920 câu; 66 câu mang quyết định giữ lại được bảo toàn, không tự tạo biến thể thay thế.
- 892 mục hình SVG trong nguồn được lưu thành **822 tệp hình riêng biệt** theo SHA-256. Đường dẫn ổn định giúp giữ hình cho đề và phiên đã lưu.
- Chọn trực tiếp biến thể 01–04, xem đáp án/lời giải, đổi bộ số và đưa vào giỏ. Đúng/Sai hiện đủ bốn ý; tự luận vẫn chấm tay.
- Đề gốc, đáp án đã chốt, trạng thái lưu trữ và mã câu không bị ghi đè. Sáu câu gốc còn trạng thái cần đối chiếu có thể dùng biến thể được nghiệm thu riêng mà không đổi trạng thái câu gốc.
- Giữ tương thích mã biến thể v0.9/v0.10 và các bản chụp đề cũ. Nội dung biến thể mới được chụp khi lưu hoặc giao đề.
- Nhánh học liệu số: **34 tài nguyên, 138 tệp nguồn**, gồm 28 bài HTML, SGK 10–11–12 Tập 1, E-learning Cấp số nhân, tài liệu/PDF và gói ZIP.
- Giao diện học thuật nền trắng, xanh đậm và xanh ngọc theo định hướng cuộc trò chuyện thiết kế và nhánh học liệu được cung cấp. Thư viện/SGK đặt trên tổng quan; có tìm kiếm không dấu, lọc lớp/chương/loại, khung đọc và toàn màn hình.
- SGK lớn được truyền trực tiếp từ ổ đĩa. Cổng học liệu 8789 hỗ trợ bộ nhớ tiến độ riêng, HEAD và tải từng phần cho âm thanh/PDF; không phục vụ API quản trị.

## Căn cứ nghiệm thu

`data/chapter-variants/release.json` giữ nguồn tải và SHA-256. `source/` giữ JSON gzip gốc, gồm đề, lời giải, tham số và thông tin kiểm tra. `manifest.json` ghi đầy đủ danh sách câu giữ lại và trạng thái nguồn.

I–II có trạng thái `approved` trong nguồn. III–V còn trạng thái `pending_teacher`; bản tích hợp ghi riêng xác nhận của người dùng rằng I–V đã nghiệm thu. Không đổi trạng thái trong nguồn và không coi kiểm tra phần mềm là một lần thẩm định toán học toàn bộ.

## Kiểm tra đã thực hiện

- **71/71 kiểm thử đạt**, không bỏ qua: ngân hàng, biến thể cả năm chương, lưu/giao đề, đáp án học sinh, chấm điểm, nhân bản, sao lưu/phục hồi, LAN, âm thanh và tệp lớn.
- TypeScript `tsc --noEmit`: đạt. Bản dựng Vinext: thành công; có cảnh báo kích thước gói JavaScript, không có lỗi dựng.
- Kiểm tra tất cả 3.416 biến thể khớp đề/đáp án/lời giải từ nguồn, đủ hình và HTML hợp lệ. Không thay đổi dữ liệu câu gốc.
- Dựng lại dữ liệu từ cùng nguồn cho kết quả mô-đun không đổi; giữ các đường dẫn SVG cũ khi cập nhật.
- HTTP trên máy: trang chính, thư viện, toàn bộ 34 tài nguyên trả về đúng tệp/dung lượng; âm thanh trả mã 206 khi yêu cầu một đoạn.
- Trình duyệt: chọn Biến thể 02, xem MathML và bảng biến thiên, đưa đúng biến thể vào giỏ; tìm `dao ham` cho đúng hai học liệu; lọc lớp 12; mở bài giảng chương I; mở E-learning Cấp số nhân; mở SGK Toán 12 trong tab riêng và lật từ 0/102 sang 1/102.
- Bố cục thư viện được kiểm tra ở chiều rộng 390 và 1365 px, không tràn ngang trang. Chưa kiểm tra trên điện thoại vật lý hoặc trong lớp học thật.

## Sử dụng

1. Dừng bản web cũ. Giải nén toàn bộ ZIP vào một thư mục mới.
2. Có dữ liệu cũ: chạy **Nang_cap_tu_ban_cu.bat** và chọn thư mục đang dùng. Cài mới: chạy **Cai_dat_lan_dau.bat** (cần Node.js từ 22.13, khuyến nghị 24 LTS, và Internet khi tải thư viện).
3. Sau khi cài xong, chạy **Chay_web.bat**. Muốn học sinh truy cập cùng Wi-Fi, dùng **Mo_lop_LAN.bat**.

ZIP mã nguồn không chứa mật khẩu cá nhân, khóa đăng nhập đang dùng, cơ sở dữ liệu thử nghiệm hoặc node_modules. Các tệp học liệu đã có sẵn. Một số bài có thành phần cần mạng và đã được gắn nhãn; nội dung của học liệu gốc được giữ nguyên.

Xem **README.md** và **HUONG_DAN.html** để biết cách vận hành, sao lưu và cập nhật từng chương. `CHECKSUMS.sha256` ghi dấu kiểm tra cho từng tệp trong gói bàn giao.
