# Biên bản thử Toán THĐ v0.14 trên Windows và LAN

Ngày 18/11/2026. Cài riêng từ mã `723861b97edf5a3220521e1518fd833d5b8bcd70` của PR #1, sau đó dựng lại với bản sửa phản hồi API trong cùng PR. Máy thử chạy Windows, Node.js 26.13.0 và trình duyệt Chromium. Các tài khoản, lớp, học liệu tải lên và bài làm trong biên bản là dữ liệu mẫu.

| Phần kiểm tra | Kết quả trên bản cài thử |
| --- | --- |
| Cài đặt | `Cai_dat_lan_dau.bat` cài phụ thuộc, tạo cơ sở dữ liệu và dựng web. Web đọc được 5.837 câu của ngân hàng chuẩn và 30 câu minh họa. |
| Hôm nay và học liệu chuẩn | Tìm Monty Hall ở Chương VI Toán 12, thêm vào tiết, đổi lớp, quay lại và tải lại. Đúng kế hoạch theo lớp. Mở và hoàn thành trò chơi từ web. Đối chiếu danh mục 34 học liệu và kiểm tra cài tệp SGK offline bằng SHA-256. |
| Học liệu giáo viên | Giáo viên khác và quản trị bị chặn cả khi dùng đường dẫn trực tiếp của mục riêng tư. Mục chia sẻ mở được cho đồng nghiệp. Đường dẫn ngừng hoạt động khi đưa vào thùng rác. Mục do quản trị gỡ được giáo viên khôi phục về riêng tư, tệp đọc lại đúng nội dung. |
| Tài khoản và lớp | Cấp hai giáo viên có quyền và phạm vi lớp khác nhau. Kiểm tra đổi mật khẩu lần đầu, chọn lớp, thu hồi quyền đăng ngay trong phiên đang mở, khóa và đặt lại mật khẩu. Nhật ký ghi các thay đổi. Nhập danh sách hai lớp từ CSV, thử nhập lại và thử STT trùng. Đổi tên học sinh trong lớp, phiên đã đóng vẫn hiển thị tên và điểm lúc giao. |
| Ngân hàng và đề | Lọc đến bài công thức Bayes, xem câu 13 có hình và công thức, mở bốn biến thể và chọn một biến thể vào đề đang soạn. Kiểm tra đề riêng, chia sẻ, sao chép và phạm vi được giao lớp. Phiên lưu hai câu theo thời điểm giao. |
| QR và học sinh | Màn hình tạo QR theo địa chỉ LAN. Truy cập địa chỉ đó từ laptop chạy web và xác minh đường dẫn giáo viên bị chặn. Trình duyệt ở khung 390 px vào đúng lớp, chọn đáp án, tải lại vẫn thấy bản nháp rồi nộp. Kiểm tra đổi thiết bị giữ đáp án đã lưu và thu hồi quyền lưu từ thiết bị cũ. |
| Chấm, Excel và chữa bài | Phiên lớp A có ba học sinh. Dự kiến và thực tế đều là bài đúng 10 điểm, bài sai 0 điểm, học sinh chưa vào để trống. Web và tệp Excel tải từ web cùng có 2/3 em đã nộp, trung bình 5 điểm. Excel có sáu trang tính. Trình chiếu mở được công thức và hình, đáp án bị khóa khi phiên còn mở và hiển thị được sau khi đóng. |
| Sao lưu và phục hồi | Dừng web, chạy `Sao_luu_toan_bo.bat` và kiểm SHA-256 của 10 tệp trong bản sao lưu. Phục hồi bằng `Phuc_hoi_tu_thu_muc.bat` vào một thư mục mã mới rồi cài và mở lại. Hai giáo viên đăng nhập được. Phiên lớp A giữ danh sách ba em, hai câu, hai bài và điểm 10/0/trống. Đề riêng, đề chia sẻ, sáu sự kiện nhật ký và quyền xem tệp riêng được giữ. Tệp riêng khớp SHA-256. |

## Lỗi đã xử lý

Khi giáo viên thiếu quyền đăng học liệu, bản cài Windows có lúc trả lỗi 503 hoặc trả thiếu nội dung của lỗi 403. API đọc phần thân chưa được xử lý trong giới hạn nhận của cổng LAN trước khi trả phản hồi. Thử lại trên máy chủ đã dựng cho kết quả 403 đầy đủ ở cả 20 lượt. Bộ kiểm thử kiểm tra cả việc đọc thân yêu cầu bị từ chối. [API](../lib/api.ts) · [Kiểm thử học liệu riêng tư](../tests/api.test.mjs)

`npm run content:check`, `npm run typecheck` và 76 kiểm thử tự động đã qua. Khi chạy bộ kiểm thử từ mã tải qua Git, đặt `TOANTHD_GIT_CHECKOUT=1` nếu tệp SGK offline chưa được cài.

## Phép thử cần thực hiện trên thiết bị thật

Điện thoại cùng Wi-Fi với laptop quét QR của phiên mẫu, xác nhận đúng lớp, chọn một đáp án, ngắt kết nối ngắn, nối lại và nộp. Giáo viên đối chiếu bài máy chủ nhận được. Đây là bước còn chờ trước khi duyệt bản nền vào `main`. [Phiếu thử trên lớp](../public/Phieu_thu_tren_lop.html) · [PR #1](https://github.com/tronghieu8598/ToanTHD/pull/1)
