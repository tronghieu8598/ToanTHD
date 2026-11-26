# Kiểm tra Toán THĐ v0.5

Ngày 05/11/2026. Bản chuẩn bị chạy thử trong lớp; dùng dữ liệu tổng hợp, chưa thử với DB/laptop/điện thoại thật của thầy. Không triển khai website Internet.

## Kết quả đã xác nhận

- `npm test`: **50/50 đạt**, không bỏ qua bài kiểm tra. Giữ 36 kiểm tra trước và thêm 14 kiểm tra về sao lưu/phục hồi, quyền truy cập và sao lưu thư mục.
- `npm run typecheck`: đạt.
- `npm run build`: đạt; có bản dựng trong `dist/`.
- Không thêm migration hay phiên bản thư viện. Schema sao lưu vẫn là 3; phiên bản ứng dụng là 0.5.0. Linkedom đã có trong bộ nguồn, dùng bản worker để phân tích HTML/MathML cũ.

## Đối chiếu phục hồi

| Ca thử | Kết quả |
|---|---|
| JSON v0.5 và bản cũ schema 3 | SHA-256 khớp; bản v0.3/v0.4 không có checksum được cảnh báo; xem trước không sửa DB. |
| File bị sửa/hỏng | Từ chối checksum sai. Kể cả tự tính lại checksum, script, thuộc tính sự kiện, ảnh ngoài và liên kết MathML chủ động vẫn bị chặn. |
| Dữ liệu sai | Chặn thiếu bảng, trùng ID, tham chiếu câu/lớp/học sinh không tồn tại, đáp án ngoài phiên và điểm không hợp lệ. |
| Bản xem trước | Cần dấu xác nhận và PHUC HOI, có chữ ký nội bộ theo phiên đăng nhập, hết hạn sau 15 phút; không dùng được bản xem trước của dữ liệu khác. |
| Phiên đang mở | Chặn phục hồi vào bản cài còn phiên đang chạy. Dữ liệu đổi sau xem trước bị chặn trước khi ghi. |
| Lưu bài xảy ra đúng lúc phục hồi | So sánh dữ liệu ngay trong giao dịch bắt được lần lưu xen vào; giữ lần lưu đó, không ghi dở bản phục hồi. |
| Lỗi giữa giao dịch | Cố tình gây lỗi ở bước chèn câu sau khi xóa/chèn một phần: toàn bộ hàng, token và metadata dự phòng quay lại như trước. |
| Điểm và danh sách | Bộ bài biết trước giữ điểm 10 và 0; bài chưa nộp được chấm 3,33. Tên lớp/STT/họ tên đã chụp không đổi theo tên hiện tại. Mật khẩu máy đích giữ nguyên. |
| Trạng thái sau phục hồi JSON | Mọi phiên đóng; quyền thiết bị cũ được thay; bài đã nộp không chấm lại; bài chưa nộp chấm từ phần trong file. |
| Bản dự phòng | Hai bản gần nhất đọc lại và dùng để quay về được; phần của bản cũ hơn được loại khỏi DB sau giao dịch thành công. |
| Thử lại yêu cầu | Cùng yêu cầu sau mất phản hồi trả lại kết quả đã hoàn tất, không thực hiện phục hồi lần hai. |
| Quyền dữ liệu thật | Cần đăng nhập bằng mật khẩu riêng. Bản dự phòng có dữ liệu thật không làm lộ qua chế độ mở nhanh minh họa. File không chứa mật khẩu/khóa/token. |
| Unicode lớn | Bản dự phòng chia phần giữ nguyên chuỗi emoji lớn, không cắt hỏng cặp Unicode. |
| Sao lưu toàn thư mục | Giữ DB, WAL và cấu hình; SHA-256 bắt file bị đổi; từ chối đích đã có dữ liệu, từ chối khi cổng web còn chạy. |

Các kiểm tra còn giữ gồm thống kê/Excel tạo–đọc lại, nhập dữ liệu, Word/OMML cơ bản, lịch sử/snapshot, autosave, đổi thiết bị, gateway LAN, QR, hai cách chấm và 40 client HTTP mô phỏng.

## Giao diện và giới hạn kiểm chứng

Trang Sao lưu & phục hồi đã mở trong trình duyệt thử, hiển thị đủ số lượng, ba bước phục hồi, trạng thái nút và phiếu thử 9 mục mặc định chưa đánh dấu. Bộ dữ liệu thử riêng có 30 câu, 36 học sinh, một phiên đóng và ba bài làm.

**Chưa xác nhận hoàn chỉnh thao tác chọn file → xem trước → phục hồi qua trình duyệt**: phiên thử bị treo ở bộ chọn file. Luồng backend từ file JSON và bản dự phòng, gồm giao dịch thực thi bằng SQLite với khóa ngoại, đã qua các kiểm tra tự động ở trên. Không coi thao tác tải JSON/Excel xuống trình duyệt Windows là đã đạt chỉ vì ứng dụng đã tạo Blob và hiện liên kết.

Chưa chạy các file BAT trên Windows, chưa đo 40 điện thoại/router thật, chưa kiểm tra bút cảm ứng vật lý. Phiếu thử là hướng dẫn để thầy xác nhận thủ công tại lớp; không phải kết quả đo tự động. DOCX tiếp tục là bản nháp cần đối chiếu.

## Đóng gói và thử tiếp

ZIP gồm source, bản dựng, bộ kiểm tra, bộ BAT, hướng dẫn và phiếu thử HTML. Không chứa node_modules, DB/bài thử, khóa riêng, bản sao lưu thư mục hoặc trạng thái runtime. CRC/SHA-256 từng file và ba migration cũ được đối chiếu trước bàn giao.

1. Dừng web, giữ bản cũ; giải nén v0.5 riêng rồi chạy Nang_cap_tu_ban_cu.bat.
2. Thử JSON bằng dữ liệu minh họa hoặc bản cài sao chép riêng trước dữ liệu thật.
3. Thử tải JSON/Excel, mở file, nâng cấp và các BAT trên Windows.
4. Thử kết nối, mất mạng, đổi thiết bị và số điện thoại dự kiến trên mạng lớp.
5. Dùng public/Phieu_thu_tren_lop.html để in, ghi thông báo lỗi và đối chiếu kết quả.

Giới hạn JSON: 10 MB / 12.000 bản ghi. Với dữ liệu lớn hơn hoặc cần giữ cả mật khẩu/khóa, dùng Sao_luu_toan_bo.bat khi web đã dừng; phục hồi bằng Phuc_hoi_tu_thu_muc.bat vào source mới chưa cài. Phương thức thư mục khôi phục nguyên trạng nên phải soát/đóng phiên cũ trước khi mở LAN cho buổi mới.
