# Kế hoạch đưa Toán THĐ lên online

## Phạm vi

Toán THĐ v0.8 có phân quyền giáo viên, đề dùng chung và phạm vi lớp. Bản cài Windows vẫn vận hành tại máy và thu bài qua LAN. Mục tiêu của bản online là giáo viên vào cùng một địa chỉ HTTPS, giao đề cho lớp được cấp và theo dõi kết quả. Học sinh quét QR bằng điện thoại để vào đúng phiên.

**Hạ tầng đề xuất** là Cloudflare Workers và D1 vì ứng dụng đã dùng Worker và SQLite/D1. Dùng hai môi trường có cơ sở dữ liệu riêng. Môi trường thử nghiệm chạy dữ liệu giả lập. Môi trường chính dùng tên miền và thông tin do trường phê duyệt. [Tài liệu môi trường Workers](https://developers.cloudflare.com/workers/wrangler/environments/) · [Migration D1](https://developers.cloudflare.com/d1/reference/migrations/)

## Các giai đoạn và điều kiện nghiệm thu

| Giai đoạn | Công việc | Điều kiện qua bước |
|---|---|---|
| 1. Chốt quy trình trên v0.8 | Thử một quản trị, hai giáo viên và hai lớp mẫu. Lưu một đề từ ngân hàng và một đề từ phiên cũ. Thử đổi mật khẩu, giao bài, chấm và chữa bài. | Mỗi giáo viên chỉ giao cho lớp đã chọn. Giáo viên cùng dạy một lớp vẫn chỉ mở được báo cáo phiên của mình. Thử cấp rồi thu hồi từng quyền. |
| 2. Làm luồng vào bài qua Internet | Giữ QR dẫn tới phiên. Mỗi học sinh xác thực bằng mã riêng có thời hạn hoặc tài khoản trường. Chỉ trả tên sau khi xác thực. Thêm giới hạn thử sai theo tài khoản và phiên, cơ chế chống thử hàng loạt, khóa tạm khi cần và xác thực đa yếu tố cho quản trị. | Người có QR và STT của bạn khác không thể nhận bài thay. API chặn đọc dữ liệu lớp khác, gọi chức năng không được cấp và thử mã quá mức. Luồng đổi thiết bị và nộp lại vẫn đúng. |
| 3. Dựng môi trường thử nghiệm | Chuẩn bị cấu hình Worker riêng với D1 và secrets riêng. Chạy migration trong `drizzle/`, nạp ngân hàng JSON nén cùng tài nguyên ảnh và font, rồi kiểm số lượng và SHA-256. Tắt demo và khởi tạo quản trị bằng mật khẩu riêng. Đổi QR sang URL HTTPS của môi trường thử nghiệm. | Mở được đề, hình và trình chiếu THD 3.0 từ mạng ngoài. Không có dữ liệu học sinh thật. Cấu hình thử và chính dùng hai cơ sở dữ liệu khác nhau. |
| 4. Thử tải và phục hồi | Cho khoảng 40–45 thiết bị hoặc máy khách thử vào bài, lưu và nộp gần đồng thời. Thử trên Safari và Chrome, đổi thiết bị, rớt mạng và nộp đúng hạn. Đo thời gian phản hồi, lỗi, mức dùng CPU và D1. Diễn tập sao lưu và phục hồi ở môi trường thử. | Số lượt nộp và điểm khớp dữ liệu mô phỏng. Không có bài bị mất hoặc chấm hai lần. Đã chọn cấu hình và gói dịch vụ phù hợp với tải đo được. Có thể phục hồi và đối chiếu dữ liệu. |
| 5. Thí điểm rồi mở rộng | Thống nhất người quản lý, thời hạn lưu và quy trình hỗ trợ với nhà trường. Chỉ chuyển danh sách cần dùng cho lớp thí điểm. Dùng một lớp trước, theo dõi lỗi và tải, sau đó mới thêm các lớp khác. | Nhà trường chấp thuận phạm vi dữ liệu. Có người theo dõi buổi thi và phương án quay về bản LAN khi gặp sự cố. |

## Các hạng mục kỹ thuật trước khi công bố

- **Đăng nhập và quyền.** Giữ kiểm tra quyền tại API và kiểm tra lớp, chủ phiên ở mỗi lần đọc hoặc ghi. Ghi nhật ký khi cấp quyền, đặt lại mật khẩu và mở hoặc đóng phiên. Tách đường dẫn quản trị khỏi đường dẫn học sinh khi cấu hình bảo vệ quản trị. [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html)
- **Mã vào bài.** Bản LAN hiện dùng mã phiên và STT. Mã cá nhân của bản online phải gắn với một học sinh trong bản chụp danh sách phiên. Tách hạn mức đăng nhập giáo viên khỏi hạn mức vào bài để cả lớp dùng chung Wi-Fi vẫn nộp bài được. Với giới hạn theo tài khoản hoặc phiên cần nhất quán giữa các vùng, dùng bộ đếm tập trung và kiểm thử lại. [Cloudflare Workers Rate Limiting](https://developers.cloudflare.com/workers/runtime-apis/bindings/rate-limit/)
- **Cấu hình triển khai.** Khởi tạo secrets riêng theo môi trường và bật HTTPS. Dùng tên cơ sở dữ liệu đích để chạy migration. Chuẩn bị lệnh nạp ngân hàng có thể chạy lại và đối chiếu đủ 5.837 câu cùng 1.988 hình. Đo chi phí mỗi luồng, nhất là chấm cuối giờ, nhập danh sách và phục hồi, trước khi chọn gói. [Workers secrets](https://developers.cloudflare.com/workers/configuration/secrets/) · [Giới hạn D1](https://developers.cloudflare.com/d1/platform/limits/)
- **Sao lưu và quay lui.** Ghi phiên bản app, checksum ngân hàng và mốc D1 trước mỗi lần phát hành. Giữ bản xuất được bảo vệ và diễn tập phục hồi trên cơ sở dữ liệu thử trước khi áp dụng lên cơ sở dữ liệu chính. Bản xuất cần giữ cả tài khoản, phân quyền, đề lưu và phiên nếu dùng để phục hồi nguyên trạng. [D1 Time Travel và sao lưu](https://developers.cloudflare.com/d1/reference/time-travel/)

Bước triển khai tiếp theo là hoàn thiện mã vào bài riêng cho từng học sinh và chuẩn bị cấu hình thử nghiệm. Sau đó mới dùng thử qua Internet với dữ liệu giả lập.
