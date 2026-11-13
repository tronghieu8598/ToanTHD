# Toán THĐ Studio v0.14

Chương VI Toán 12 có một tệp nguồn cho mỗi câu. Xem [sơ đồ mô-đun](docs/KIEN_TRUC.md) để tìm phần cần chỉnh, và [hướng dẫn góp nội dung](CONTRIBUTING.md) để sửa câu, kiểm tra biến thể, đổi bìa Monty Hall và đóng gói từng phần.

Ngân hàng được dựng trực tiếp từ ba bộ đề cương tương tác gốc và đóng gói thành JSON nén gzip. Màn chữa bài dùng bố cục, thanh vẽ hình học, phóng hình, đồng hồ và công cụ gọi STT từ khung THD 3.0 của thầy. Nút **Thống kê** lấy số liệu của phiên đang xem.

Nếu đang dùng bản cũ, dừng web rồi giải nén bản này vào một thư mục mới. Chạy `Nang_cap_tu_ban_cu.bat` và chọn thư mục đang dùng để chuyển dữ liệu. Nếu cài lần đầu, chạy `Cai_dat_lan_dau.bat`. Khi cài xong, mở `Chay_web.bat`.

Để xem bản mới trên máy trong khi giữ bản cũ mở, chạy `Chay_thu_song_song.bat` từ thư mục mới đã cài. Bản thử mở ở `http://localhost:8827` và dùng cơ sở dữ liệu trong chính thư mục đó.

Nguyễn Trọng Hiếu — THPT Trịnh Hoài Đức. Bản tích hợp ngày 11/11/2026.

## Kho học liệu và soạn đề

- Mở **Ngân hàng → Toán 12 → Chương VI** để chọn câu Xác suất có điều kiện, Xác suất toàn phần và Bayes. Gói đã duyệt gồm 436 biến thể từ 109 câu gốc và 9 câu hoãn. Dấu vân tay của cả 118 mã đã được đối chiếu với ngân hàng.
- Ngân hàng mở sẵn đề cương tích hợp của cả năm. Chọn **Khối → Chương → Bài học**, lọc dạng hoặc tìm kiếm. Gõ **Câu 15** để tìm đúng số câu gốc. **Xem trước** để đọc đề và lời giải hoặc thêm vào đề. **Chọn nhanh** dùng bộ lọc hiện tại. Bốc đề 12–4–6 dùng cả ba dạng và hỏi trước khi thay bộ câu đã chọn. Chọn **Rà đề và giao** để đặt tên, thời gian, quy tắc chấm, lưu đề hoặc giao cho lớp. Mục **Bộ lọc** có nguồn tài liệu, số câu gốc, trạng thái, tùy chọn tự luận và công cụ nhập/xuất theo quyền.
- Trong **Ngân hàng câu hỏi**, bấm **Biến thể (4)**, chọn **Biến thể 01–04**, xem đề, đáp án và lời giải rồi bấm **Dùng biến thể**. Giỏ giữ nguyên mã và số câu gốc; đề biến thể dùng chế độ **Đề đầy đủ**. Tự luận cần bật **Cho phép câu tự luận** trong chế độ **Luyện tập**.
- Nội dung đã chọn được chụp lại khi lưu đề hoặc mở phiên. Các đề và mã biến thể từ v0.9/v0.10 vẫn dùng được. Biến thể được chấp nhận riêng không thay đổi đáp án hoặc trạng thái duyệt của câu gốc.
- Trang **Học liệu số** có 34 tài nguyên: 28 bài giảng tương tác, 1 thư viện SGK Toán 10–11–12 Tập 1, 1 bài E-learning, 2 tài liệu và 2 gói ZIP. Toàn bộ 138 tệp nguồn đã đóng gói; không cần chạy lại công cụ nhập học liệu.
- **Học liệu** nhóm theo 24 chương Toán 10–12 của bộ Kết nối tri thức với cuộc sống, có số học liệu ở từng chương và một nhóm **Tài liệu dùng chung**. Tìm kiếm không dấu trong toàn khối; mở từng chương khi duyệt. Bìa gồm 31 ảnh chụp học liệu HTML gốc, trang đầu giáo án PDF và bìa E-learning dùng chung với hai gói đi kèm. Các tệp gốc giữ nguyên. **/hoc-lieu-so** chỉ hiển thị danh mục đi kèm web.
- Chọn **Học liệu**, bấm một thẻ để xem nhanh, rồi chọn **Thêm vào tiết**. Trang **Hôm nay** hiển thị kế hoạch của lớp đang chọn. Kế hoạch lưu theo tài khoản và lớp trên trình duyệt đang dùng.
- Mục **Công cụ và tài khoản** có Phiên kiểm tra, Kết nối LAN / QR, Sao lưu & Phục hồi và các công cụ theo quyền tài khoản.

| Chương | Câu gốc có biến thể | Biến thể | Câu giữ lại |
|---|---:|---:|---:|
| I | 225 | 900 | 5 |
| II | 175 | 700 | 43 |
| III | 151 | 604 | 0 |
| IV | 144 | 576 | 9 |
| V | 159 | 636 | 9 |
| VI | 109 | 436 | 9 |
| **Tổng** | **963** | **3.852** | **75** |

Hồ sơ nguồn, dấu vân tay và trạng thái duyệt được giữ tại **data/chapter-variants/**. Gói I–II và VI ghi trạng thái `approved`. Gói III–V giữ `pending_teacher` trong tệp gốc và có xác nhận nghiệm thu riêng ngày 09/11/2026. Chương VI lấy từ gói APPROVED trong chat “Nghiệm thu lần hai”.

Các gói nguồn chứa 988 mục hình SVG. Những hình giống hệt nhau dùng chung tệp theo SHA-256 để giữ đường dẫn ổn định cho đề đã lưu. Bản gốc nằm trong các tệp JSON nén.

Web chính chạy ở cổng 8787; cổng 8789 chỉ phục vụ học liệu để SGK có bộ nhớ trình duyệt riêng. Cả hai được mở/dừng cùng Chay_web.bat hoặc Mo_lop_LAN.bat. Khi mở LAN, điện thoại và máy tính phải cùng mạng và cho phép ứng dụng Node.js trên mạng Riêng tư.

### Bảo trì chương và học liệu

- **data/chapter-variants/source/** chứa 6 tệp nguồn JSON gzip đã đối chiếu SHA-256.
- **release.json**: nguồn tải, SHA-256 và căn cứ chấp nhận. **manifest.json**: số lượng, trạng thái nguồn, danh sách câu giữ lại.
- Chạy **npm run variants:rebuild** sau khi cập nhật có kiểm soát các gói nguồn và release.json; chương trình kiểm tra dấu vân tay câu, loại câu, đáp án, HTML và hình trước khi sinh mô-đun.
- **public/variant-assets/**: giữ các hình cũ khi cập nhật, vì đề đã lưu có thể còn tham chiếu chúng.
- **public/hoc-lieu-so/nguon/**: học liệu gốc; **data/digital-library/catalog.json**: danh mục và bộ lọc.
- **data/curriculum/kntt-math.json**: tên chương; **public/studio/covers/**: ảnh bìa. Đối chiếu mục lục [Toán 10](https://sachdientu.nxbgd.vn/thu-vien-so/doc-sach/shs-toan-tap-1.4491362330), [Toán 11](https://sachdientu.nxbgd.vn/thu-vien-so/doc-sach/shs-toan-tap-2.4491480186) của NXBGDVN và SGK Toán 12 trong thư viện tích hợp.

## Tài khoản giáo viên và đề dùng chung

**Quản trị**

1. Đăng nhập bằng tên `admin` và mật khẩu quản trị của bản đang dùng. Ở bản cài mới, đặt mật khẩu riêng trong **Cài đặt tài khoản** trước khi thêm giáo viên.
2. Mở **Công cụ và tài khoản → Tài khoản & Phân quyền → Cấp tài khoản**. Nhập tên đăng nhập, tên hiển thị, tạo mật khẩu tạm và chọn các lớp được cấp.
3. Chọn mẫu **Chỉ giao đề** hoặc **Soạn đề và đăng học liệu**, hoặc cấp từng quyền riêng. Nút **Sửa quyền** dùng để điều chỉnh quyền, đổi phạm vi lớp, đặt lại mật khẩu tạm hoặc khóa tài khoản. Màn bàn giao có nút sao chép thông tin để quản trị gửi riêng cho giáo viên.
4. Chọn câu trong ngân hàng, mở **Rà đề và giao → Lưu nháp riêng**. Có thể mở một phiên cũ và bấm **Lưu thành đề** để lưu bản nháp từ phiên đó.
5. Mở **Nhật ký** để xem 50 lần cấp tài khoản, thay quyền, đổi lớp, khóa hoặc đặt lại mật khẩu gần nhất. Nhật ký ghi tài khoản quản trị cục bộ `admin`.

**Giáo viên**

1. Đăng nhập bằng tài khoản đã được cấp, đổi mật khẩu tạm và chọn lớp đang dạy trong các lớp quản trị đã cấp.
2. Mở **Đề đã lưu**. **Đề của tôi** có bản nháp và đề do mình chia sẻ. **Đề của tổ** có đề được chia sẻ, gồm đề lưu từ các bản cũ. Trong **Tùy chọn**, chủ đề có thể chia sẻ hoặc chuyển về riêng tư. Giáo viên có quyền soạn đề có thể sao chép đề và sửa tên, thời lượng của bản sao riêng.
3. Chọn **Giao cho lớp**. Danh sách giao bài lấy từ lớp đang dạy. Sau khi mở phiên có thể lấy QR, theo dõi, chấm và chữa bài trong **Phiên của tôi**.
4. Dùng **Cài đặt tài khoản** để đổi mật khẩu hoặc đổi lớp giảng dạy. Nếu được cấp quyền nhập danh sách, có thể tạo lớp mới. Lớp do giáo viên tạo được thêm vào phạm vi của tài khoản đó.

Giáo viên mặc định xem được kho chung, đề đã lưu, các phiên do mình mở và cài đặt tài khoản. Đề đã lưu giữ nguyên câu hỏi và đáp án tại thời điểm lưu. Phiên từ các bản trước do quản trị xem và có thể lưu lại thành đề dùng chung. Bản LAN dùng máy chủ cục bộ cho màn giáo viên và Wi-Fi cho học sinh.

### Đăng và gỡ học liệu của giáo viên

- Cần quyền **Đăng học liệu**. Trong **Học liệu**, chọn **Đăng học liệu**, tải một tệp PDF, JPG/PNG/WebP, HTML UTF-8 độc lập hoặc ZIP (tối đa 5 MB), chọn khối và chương. HTML đăng tải chỉ chạy nội dung tích hợp trong tệp; ZIP tải xuống, không chạy trong web.
- Mặc định **Riêng tư**, chỉ chủ học liệu xem và mở tệp, kể cả qua đường dẫn trực tiếp. Vào **Của tôi** để thử trước hoặc đổi sang **Chia sẻ với tổ**; chỉ tài khoản giáo viên và quản trị đã đăng nhập xem được mục đã chia sẻ.
- Trong thẻ học liệu, mở **Quản lý học liệu → Chuyển vào Thùng rác**. Tệp biến mất khỏi kho và đường dẫn ngừng hoạt động. Chủ bài có thể **Khôi phục** từ Thùng rác. Quản trị có thể gỡ hoặc khôi phục mục đã chia sẻ; nếu giáo viên tự khôi phục mục do quản trị gỡ, bài trở lại ở chế độ riêng tư. Thùng rác chưa tự xóa vĩnh viễn.
- Bản này chạy trên máy chủ cục bộ hiện có. Muốn giáo viên đăng và chia sẻ từ nhiều máy, dùng chung một máy chủ giáo viên có đăng nhập qua HTTPS, phân vai và nơi lưu tệp lâu dài. Chưa mở cổng quản trị/giáo viên trên LAN của học sinh.

**Sao lưu toàn thư mục** để lưu tài khoản, phạm vi lớp, đề đã lưu, học liệu đăng tải và Thùng rác. Sao lưu JSON chỉ chuyển ngân hàng, lớp, phiên và kết quả. Khôi phục JSON trên cùng máy giữ các tài khoản, đề và học liệu đã lưu hiện có. Mã nguồn sạch không kèm cơ sở dữ liệu hoặc mật khẩu của bản thử.

Xem [KE_HOACH_ONLINE.md](KE_HOACH_ONLINE.md) để chuẩn bị bản chạy qua Internet.

## Ngân hàng đề cương đã có sẵn

Cài đặt/nâng cấp tự tích hợp **5.837 câu thật từ ba tệp `De_cuong_Toan_10_tuong_tac.html`, `De_cuong_Toan_11_tuong_tac.html` và `De_cuong_Toan_12_tuong_tac.html`**, chia thành 6 tài liệu học kỳ và 75 bài. Bộ 30 câu minh họa cũ vẫn nằm trong tài liệu minh họa riêng.

| Khối | Tổng câu | Có thể chấm tự động | Cần đối chiếu / chấm tay | Tự luận tham khảo | Bài |
|---|---:|---:|---:|---:|---:|
| 10 | 2.118 | 1.617 | 39 | 462 | 27 |
| 11 | 2.681 | 2.060 | 48 | 573 | 31 |
| 12 | 1.038 | 977 | 23 | 38 | 17 |
| **Tổng** | **5.837** | **4.654** | **110** | **1.073** | **75** |

- **Giữ nguyên số câu gốc**, khối, học kỳ, bài, khóa đáp án và lời giải. Hai câu cùng số ở hai bài/khối là hai câu khác nhau. Công thức dùng MathML/KaTeX tại máy; 1.988 tệp hình của câu hỏi được đóng gói cục bộ, không cần CDN.
- Vào **Ngân hàng câu hỏi** → chọn khối → tài liệu học kỳ → bài. Có bộ lọc khoảng số câu, dạng, nội dung và trạng thái đáp án. Tải 20 câu/trang; chọn ở nhiều trang vẫn giữ danh sách. Các nút chọn trang/lẻ/chẵn/ngẫu nhiên áp dụng cho trang đang mở; tối đa 100 câu/phiên.
- **Cần đối chiếu / chấm tay:** 27 câu được nguồn đánh dấu chấm tay/thiếu khóa và 83 câu phát hiện khóa không khớp các dòng đáp án rõ ràng trong lời giải. Giáo viên mở đề, hình và lời giải để đối chiếu rồi chốt khóa trước khi dùng chấm tự động.
- **Tự luận:** có 1.073 câu để tham khảo hoặc đưa vào phiên Luyện tập có chấm tay.
- **Có thể chấm tự động** có nghĩa là có khóa hợp lệ và vượt qua các kiểm tra cấu trúc/mâu thuẫn đã triển khai. Chưa thẩm định toán học từng câu; giáo viên vẫn cần xem trước khi dùng để lấy điểm.
- Nguồn đề cương được giữ cố định để tránh mất hình/công thức khi đi qua trình sửa văn bản. Tạo tài liệu riêng để soạn/chỉnh câu của thầy. Có thể lưu trữ/khôi phục câu đề cương sau khi đăng nhập bằng mật khẩu riêng. Nút **Xuất nguồn** tải cả tài liệu học kỳ đang chọn dưới dạng `.json.gz`. Hình trong gói tham chiếu các tệp cục bộ đi kèm app.
- Mở nhanh vẫn xem được bộ đề cương và lớp minh họa. Khi đã nhập lớp/tài liệu riêng, ứng dụng yêu cầu mật khẩu như các bản trước.

### Cài mới hoặc nâng cấp

**Cài mới:** giải nén toàn bộ ZIP, có Node.js 24 LTS và Internet rồi chạy `Cai_dat_lan_dau.bat`; lần sau chạy `Chay_web.bat`. Ngân hàng có ngay sau bước cài đặt, không phải nhập HTML thủ công. Sau khi cài thư viện và dựng xong có thể dùng offline.

**Đang dùng bản cũ.** Dừng web, giải nén v0.11 vào thư mục mới, rồi chạy `Nang_cap_tu_ban_cu.bat` trong thư mục đó và chọn thư mục bản đang dùng. Bước nâng cấp chép dữ liệu cũ, chuyển các câu tích hợp theo mã câu gốc và giữ bài làm, điểm, bản chụp nội dung phiên, trạng thái lưu trữ và đáp án đã chốt.

### Sao lưu khi có đề cương

Bản sao lưu toàn app vẫn là JSON schema 3. Tham chiếu từ bản v0.6 hoặc v0.6.1 được đối chiếu theo mã câu và dấu vân tay trước khi nối vào ngân hàng hiện tại. Bản chụp câu của các phiên cũ giữ nội dung tại thời điểm tạo. Vẫn có thể phục hồi bản sao lưu v0.3–v0.5. Giới hạn là 10 MB và 12.000 bản ghi. Với dữ liệu lớn hơn, sao lưu toàn thư mục.

### Dữ liệu nguồn

- Dữ liệu đề cương và trình chiếu dùng JSON nén gzip. Giữ mã câu, số câu, loại câu, đề, phương án, đáp án và lời giải ở các trường riêng.
- `data/course-bank/questions.json.gz` chứa ngân hàng. `manifest.json` ghi số lượng và SHA-256. `review.json` ghi các câu cần đối chiếu. Hình nằm trong `public/bank-assets/`.
- Dựng lại ngân hàng bằng `npm run bank:rebuild -- <HTML-Toán-10> <HTML-Toán-11> <HTML-Toán-12>`. Lệnh chỉ đọc khối dữ liệu của ba tệp gốc.
- `public/thd-3.0/` chứa phần lấy từ `C2_BTU_THD_3_0_Trinh_chieu.html` và bộ kết nối phiên. Khi phiên đang mở, màn chiếu chỉ nhận đề và phương án. Đóng phiên để công bố đáp án, lời giải và thống kê.


## Sao lưu & phục hồi (mới trong v0.5)

### Sao lưu JSON trong ứng dụng

Vào **Sao lưu & phục hồi** → **Tạo & tải bản sao lưu**. Giữ file `.json` trong thư mục riêng và kiểm tra file đã tải xuống. Nếu trình duyệt chưa tải, dùng **Tải JSON đã tạo**. Nút báo file đã sẵn sàng không tự xác nhận file đã được lưu xuống máy.

File giữ ngân hàng và lịch sử sửa, lớp/học sinh cả phần lưu trữ, các phiên, nội dung/danh sách đã chụp, đáp án và điểm. Không chứa mật khẩu, khóa cục bộ, token thiết bị hoặc các bản dự phòng của lần phục hồi trước. SHA-256 phát hiện file bị sửa/hỏng; không phải chữ ký xác minh người gửi.

### Phục hồi JSON

1. Thử trước trên một bản cài riêng. Đóng tất cả phiên đang mở trên bản cài đích.
2. Chọn file JSON toàn bộ dữ liệu → **Kiểm tra & xem trước**. File ngân hàng/lớp riêng dùng chức năng nhập tương ứng.
3. So sánh số lượng hiện tại với file, phiên bản, ngày sao lưu và cảnh báo. Nhận schema 3 từ v0.3/v0.4/v0.5; bản cũ không có SHA-256 được cảnh báo. File thiếu bảng, sai tham chiếu/đáp án hoặc chứa HTML chủ động bị chặn.
4. Tích xác nhận và nhập **PHUC HOI** → **Tạo dự phòng & phục hồi**. Bước này thay dữ liệu hiện tại bằng dữ liệu đã chọn và giữ ngân hàng đề cương đóng gói.
5. Ứng dụng giữ bản dự phòng trước thay đổi trong cùng giao dịch; lỗi giữa chừng quay lui toàn bộ. Nếu dữ liệu thay đổi sau khi xem trước, cần xem trước lại. Bản xem trước hết hạn sau 15 phút.
6. Kiểm tra ngân hàng, lớp, câu gốc và một bài đã nộp. Điểm đã nộp, tên/STT đã chụp và cách chấm được giữ. Mọi phiên trong JSON được đóng; bài chưa nộp được chấm từ phần đã sao lưu; quyền thiết bị cũ được thay. Tạo phiên mới cho buổi tiếp theo.

Mật khẩu của bản cài đích vẫn giữ nguyên. Với dữ liệu thật phải đăng nhập bằng mật khẩu riêng. Khi còn bản dự phòng có dữ liệu thật, chế độ mở nhanh minh họa tiếp tục bị khóa.

Ứng dụng giữ **hai bản dự phòng gần nhất** ở mục bên dưới. Chọn **Tải JSON** hoặc **Dùng bản này** → xem trước/xác nhận để quay lại. Bản dự phòng nằm cùng DB, nên không thay thế việc giữ một file trên ổ khác. Nếu mất kết nối khi xác nhận, bấm **Nhận lại trạng thái** xem lần phục hồi gần nhất; gửi lại cùng yêu cầu không thực hiện phục hồi hai lần.

Giới hạn JSON: **10 MB, 12.000 bản ghi** (tính cả lịch sử câu và các câu trong phiên). Khi vượt giới hạn hoặc cần giữ cả mật khẩu/khóa, dùng phương thức toàn thư mục.

### Sao lưu toàn bộ thư mục

1. Dừng `Chay_web.bat`, `Mo_lop_LAN.bat` và cửa sổ chỉnh source. Không làm giữa lúc học sinh đang làm bài.
2. Chạy **Sao_luu_toan_bo.bat**. Đọc đường dẫn thư mục được tạo trong `ban-sao-luu`.
3. Giữ nguyên toàn bộ thư mục, gồm `snapshot.json`; từng file được kiểm tra SHA-256. Sao chép thư mục hoàn tất sang ổ dự phòng khi cần.
4. Phục hồi: giải nén source v0.10 vào thư mục mới **chưa chạy bộ cài**, chạy **Phuc_hoi_tu_thu_muc.bat**, nhập đường dẫn thư mục sao lưu. Script kiểm tra trước, từ chối ghi đè dữ liệu đã có, rồi tiếp tục cài và dựng web.

Bản toàn thư mục giữ cả DB, WAL, mật khẩu và khóa máy. Giữ riêng, không gửi cho người khác khi báo lỗi. Đây là khôi phục nguyên trạng: soát và đóng phiên cũ trước khi mở LAN cho buổi mới; thời hạn phiên không được gia hạn.

### Phiếu thử tại lớp

Mục **Phiếu thử trước khi dùng cho cả lớp** có 9 nội dung cần thử trên Windows, điện thoại/router, Excel và bản cài phục hồi riêng. Các dấu tích do thầy xác nhận thủ công và chỉ lưu trong trình duyệt đó. Bấm **Mở phiếu để in**, hoặc mở `public/Phieu_thu_tren_lop.html` trực tiếp. Chưa coi giai đoạn thử lớp hoàn tất chỉ vì kiểm tra tự động đạt.

## Thống kê và chữa bài (từ v0.4)

Mở **Phiên kiểm tra** → chọn một phiên. Dữ liệu tự cập nhật khoảng 5 giây; bấm **Làm mới** để lấy lại ngay.

- **Toàn lớp:** số bài đã nộp, trung bình, trung vị, thấp nhất/cao nhất, độ lệch chuẩn tổng thể, phổ điểm và ngưỡng ≥5 / ≥6,5 / ≥8. Nhấn câu cần xem lại để mở phân tích.
- **Từng câu:** lọc theo bài/dạng, sắp theo thứ tự đề hoặc tỷ lệ đạt trọn câu thấp trước. Trắc nghiệm có phân bố A–D và danh sách từng nhóm; Đúng/Sai tách Đúng/Sai/bỏ trống cho mỗi ý; trả lời ngắn gộp các giá trị như `0,5`, `0.5`, `1/2` nhưng giữ cách nhập.
- **Bài từng em:** tìm tên/STT, lọc chưa vào/đang làm/đã nộp, xem tiến độ, điểm và thiết bị. Nhấn tên hoặc ô câu để xem đáp án đã chọn, điểm câu và lời giải. Có bộ lọc câu chưa đạt trọn câu/bỏ trống. **Đổi thiết bị** vẫn hoạt động như v0.3.

### Hiểu đúng số liệu

Thống kê lớp/câu chỉ tính **bài đã nộp**; điểm 0 thật vẫn được tính. Bài đang làm và học sinh chưa vào không biến thành điểm 0. Khi chưa có bài nộp, các thống kê hiển thị `—`.

Mỗi câu chia thành bốn nhóm không trùng nhau: **trọn câu**, **đúng một phần**, **sai có trả lời**, **bỏ trống cả câu**. Với Đúng/Sai, một ý đã chọn cũng tính là có trả lời; tiến độ “trả lời đủ” chỉ tăng khi đã chọn cả 4 ý. Tỷ lệ trọn câu lấy mẫu là tất cả bài đã nộp, gồm cả câu bỏ trống.

Tên lớp, STT, tên học sinh, số câu, nội dung, đáp án và cách chấm lấy từ bản chụp của phiên. Hai câu cùng số ở hai bài/phiên bản khác nhau vẫn là hai câu riêng. Tổng điểm là điểm đã lưu; nếu phát hiện chênh với chi tiết tính từ câu, ứng dụng cảnh báo để đối chiếu, không tự đổi điểm.

### Xuất Excel

Bấm **Xuất Excel**. Ứng dụng lấy lại toàn phiên tại thời điểm bấm và tạo file `.xlsx` trên máy. Bộ lọc giao diện không làm mất học sinh/câu trong file. Nếu trình duyệt chưa tải tự động, bấm **Tải Excel đã tạo**.

| Sheet | Nội dung |
|---|---|
| Tổng quan | Tên phiên/lớp, giờ xuất Việt Nam, mẫu thống kê, cách chấm, các chỉ số |
| Bảng điểm | Toàn bộ danh sách khi tạo phiên, trạng thái, tiến độ, điểm tổng và điểm câu |
| Phổ điểm | Số lượng, tỷ lệ theo 5 khoảng điểm |
| Từng câu | Số câu/bài/tài liệu/phiên bản gốc, đáp án, trọn/một phần/sai/trống, điểm câu |
| Lựa chọn | Nhóm A–D, từng ý Đúng/Sai hoặc nhóm trả lời ngắn và danh sách học sinh |
| Chi tiết trả lời | Đáp án đã lưu của mỗi học sinh đã vào, phân biệt tạm thời và đã chấm |

Điểm chưa nộp để ô trống, điểm 0 là số 0. Công thức xuất dạng LaTeX; ảnh không nhúng vào Excel, cần mở phần xem câu trong ứng dụng. Báo cáo có họ tên và đáp án; chia sẻ đúng phạm vi lớp. File không chứa khóa máy chủ, mật khẩu hoặc token làm bài.

### Trình chiếu chữa bài

1. Bấm **Trình chiếu chữa bài** để mở khung THD 3.0. Khi phiên đang mở, khung chỉ hiện đề và phương án.
2. Đóng phiên để dùng **Công bố đáp án**, **Xem lời giải** và **Thống kê**. Màn chiếu hiện số liệu tổng hợp theo câu.
3. Dùng ← / → để chuyển câu hoặc chọn **Đến câu** trong menu ⋯. Phím C công bố đáp án, L hoặc Space mở lời giải, F phóng khung. Trong menu ⋯ có cỡ chữ và chế độ toàn màn hình.
4. Bấm hình để phóng to. Nút bút mở công cụ viết, tô sáng, hình phẳng, hình không gian và bảng trắng. Nét vẽ đi theo từng câu trong lần mở trình chiếu. Có thể tải nét vẽ dạng SVG từ thanh công cụ.
5. Đồng hồ đếm ngược và gọi học sinh theo STT ở góc dưới. Bấm **Đóng** hoặc Esc để trở về báo cáo.


## Cài mới trên Windows

1. Giải nén **toàn bộ** ZIP vào thư mục có quyền ghi, ví dụ `D:\ToanTHD_v0.10`. Không chạy ngay trong cửa sổ ZIP.
2. Cài **Node.js 24 LTS** từ https://nodejs.org/ nếu chưa có.
3. Khi có Internet, chạy **Cai_dat_lan_dau.bat**. Chờ đến dòng `DA HOAN TAT`.
4. Chạy **Chay_web.bat**; trình duyệt tự mở tại `http://127.0.0.1:8787/`. Giữ cửa sổ chạy web mở trong khi dùng; dừng bằng Ctrl+C.
5. Chọn **Mở nhanh · đề cương & lớp minh họa** để thử, hoặc đăng nhập mật khẩu ban đầu `toanthd-demo`.

Sau khi cài và dựng xong, ứng dụng, công thức và cơ sở dữ liệu chạy tại máy. Không cần tải công thức, phông chữ hoặc thư viện từ CDN khi sử dụng. Chạy `Chay_web.bat` chỉ mở trên laptop. Chạy `Mo_lop_LAN.bat` để cho điện thoại trong mạng nội bộ kết nối.

## Nâng cấp từ v0.1–v0.8

1. **Dừng web cũ** bằng Ctrl+C và dừng cửa sổ chỉnh source. Không nâng cấp giữa một phiên học sinh đang làm.
2. Giữ nguyên thư mục cũ. Giải nén ZIP v0.10 sang **một thư mục mới riêng biệt**, nằm ngoài thư mục cũ.
3. Trong thư mục mới, chạy **Nang_cap_tu_ban_cu.bat** trước khi chạy bộ cài mới.
4. Nhập đường dẫn thư mục đang dùng, ví dụ `D:\ToanTHD_v0.4`. Script sao chép `.wrangler/state` và `.dev.vars`; không xóa hoặc sửa bản cũ.
5. Script tiếp tục cài thư viện, áp dụng migration và dựng v0.10. Chờ `DA HOAN TAT`.
6. Mở **Chay_web.bat** hoặc **Mo_lop_LAN.bat** của thư mục v0.10. Kiểm tra ngân hàng, danh sách lớp, các phiên và điểm cũ.

Script từ chối nếu đích đã có cấu hình/dữ liệu, hoặc cổng 8787/8788/5173 đang có web chạy. Dùng một thư mục giải nén mới khi cần thử lại; không tự xóa dữ liệu. Nếu nâng từ v0.1, danh sách cũ được chụp trước khi cho sửa lớp. Nếu nâng từ v0.2, mật khẩu riêng, bản sửa câu, điểm và danh sách đã chụp được giữ nguyên. Phiên v0.1/v0.2 giữ cách chấm luyện tập; phiên v0.3 giữ cách chấm đã chọn (luyện tập hoặc 12–4–6). Thời gian không được gia hạn do nâng cấp. V0.5 không thêm migration, không chấm lại hoặc sửa điểm đã lưu.

## Mở lớp qua LAN và QR

1. Laptop và điện thoại cùng Wi-Fi/router hoặc cùng điểm phát sóng. Sau khi cài xong, mạng nội bộ không bắt buộc có Internet.
2. Dừng `Chay_web.bat` nếu đang chạy; mở **Mo_lop_LAN.bat**. Hai chế độ dùng cùng DB nên không chạy đồng thời.
3. Trên **laptop giáo viên**, mở `http://127.0.0.1:8787/`. Cửa sổ LAN cũng in các địa chỉ cho học sinh.
4. Nếu Windows hỏi quyền Node.js, chỉ cho phép trên mạng **Riêng tư / Private** đang dùng. Không cần tắt toàn bộ tường lửa.
5. Chọn câu, lớp, thời gian và cách chấm → **Tạo phiên kiểm tra**. Màn hình QR tự mở; có thể mở lại bằng **QR & kết nối** hoặc **Kết nối lớp**.
6. Chọn IPv4 của laptop thuộc cùng mạng với điện thoại, ví dụ `192.168.1.20`. Nếu có nhiều card mạng/VPN, thử mở đường dẫn trên một điện thoại trước khi chiếu QR cho lớp.
7. Học sinh quét QR bằng Camera, mở đường dẫn, nhập **STT trong danh sách**, kiểm tra họ tên rồi vào làm bài. Mã phiên được điền sẵn. Phiên đã gắn với lớp nên không phải nhập tên lớp lại.
8. Giữ laptop, cửa sổ LAN và trang bài làm mở. Theo dõi báo cáo giáo viên; bấm **Phóng to QR** để chiếu trên màn hình lớn, hoặc tải QR dạng SVG.

**Thời gian tính từ lúc tạo phiên**, không tính riêng từ lúc từng em vào. Học sinh vào muộn chỉ còn thời gian của phiên. Chọn đủ thời lượng cho bước quét/tra tên. Laptop ngủ, đổi Wi-Fi, đổi IP hoặc đóng cửa sổ LAN sẽ ngắt kết nối; không có website Internet thay thế trong bản này.

Quyền giáo viên chỉ mở từ loopback trên laptop. Thiết bị LAN chỉ vào màn hình/API học sinh; nút mở nhanh minh họa cũng không cấp quyền giáo viên qua LAN. Không dùng địa chỉ LAN để mở dashboard trên điện thoại. Cổng 8788 là máy chủ nội bộ, chỉ lắng nghe ở loopback; địa chỉ dùng cho giáo viên/học sinh là cổng 8787.

### Khi điện thoại chưa vào được

- Chạy **Kiem_tra_ket_noi.bat** để xem địa chỉ và máy chủ có đang mở LAN hay không. Công cụ không tự đổi cấu hình mạng hoặc tường lửa.
- Trên điện thoại, không nhập `127.0.0.1`: địa chỉ đó chỉ về chính điện thoại.
- Kiểm tra cùng Wi-Fi; tránh Wi-Fi khách có AP/client isolation. Có thể dùng router riêng hoặc điểm phát sóng của laptop, nhưng số thiết bị thực tế phụ thuộc bộ phát.
- Kiểm tra quyền Node.js trên mạng Private. Không mở cổng ra Internet, không port-forward router và không tắt tường lửa để xử lý nhanh.
- Nếu IP laptop đổi, bấm **Nhận lại địa chỉ**, chọn IP mới và chiếu QR mới. Dùng cùng một địa chỉ trong cả buổi để bản nháp/token trong trình duyệt tiếp tục đọc được.
- Dùng mạng lớp được quản lý. LAN hiện dùng HTTP, chưa có HTTPS hoặc truy cập từ xa.

## Mất kết nối và đổi thiết bị

- Thay đổi được gộp và tự gửi sau khoảng 0,45 giây. **Đã lưu trên máy chủ** mới là xác nhận laptop đã nhận đáp án.
- Khi chưa gửi được, bản nháp lưu trong trình duyệt và tự thử lại sau khoảng 5 giây. Giữ trang mở; khi kết nối lại, hệ thống tiếp tục đồng bộ.
- Nếu trình duyệt không cho lưu bản nháp, trang có cảnh báo riêng. Không xóa dữ liệu trình duyệt hoặc dùng địa chỉ khác giữa buổi.
- Tải lại trang hoặc mở lại cùng đường dẫn trên cùng thiết bị sẽ tiếp tục bài và đồng hồ. Nếu máy chủ có bản khác mới hơn, học sinh chọn **bản trên máy chủ** hoặc **bản nháp thiết bị**; hệ thống không tự ghi đè.
- Khi cần đổi điện thoại: giáo viên vào báo cáo phiên → dòng học sinh → **Đổi thiết bị** → kiểm tra tên và xác nhận. Thiết bị cũ mất quyền lưu/nộp. Học sinh quét lại QR trên máy mới, nhập đúng STT để tiếp tục cùng bài, đáp án đã lưu và thời hạn cũ.
- Phần chưa tới laptop trên máy cũ **không chuyển sang điện thoại mới**. Chỉ cho đổi khi phiên đang mở và bài chưa nộp.
- Tín hiệu “Vừa kết nối” là liên lạc gần đây với máy chủ, không chứng minh em đang nhìn màn hình. Trang gửi tín hiệu khoảng 10 giây; dashboard tải lại khoảng 5 giây.
- Khi hết giờ hoặc giáo viên đóng phiên, chỉ chấm đáp án **đã tới máy chủ**. Bản nháp gửi muộn không được cộng sau thời hạn. Nếu bấm nộp lúc mất mạng, trang tự thử nộp lại khi nối lại; không nên đóng trang.
- Mã QR + STT không phải xác minh danh tính/chống làm hộ. Chỉ cho học sinh đúng lớp dùng mã và đối chiếu trên lớp.

## Thử nhanh ngân hàng và lớp

- Ngân hàng → **Nhập câu hỏi** → tải **Mẫu Excel** hoặc **Mẫu CSV** → chọn file → tích **Đây là dữ liệu minh họa để thử** → **Phân tích & xem trước** → kiểm tra các dòng → **Xác nhận nhập dữ liệu**.
- Danh sách lớp → **Nhập danh sách** → tải mẫu → chọn file và sheet → xem trước → xác nhận. Có thể thêm lớp và sửa danh sách trực tiếp.
- Ngân hàng → **Sửa câu** → nhập văn bản/công thức/đáp án → **Xem trước** → **Lưu bản sửa mới**.
- **Lịch sử** xem lại bản trước. Phục hồi nội dung cũ sẽ mở trình sửa và tạo một bản tiếp theo khi lưu.
- **Lưu trữ** loại câu khỏi danh sách chọn đề. Tích **Xem câu lưu trữ** để khôi phục.
- Tài liệu & phiên bản → **Tạo tài liệu** → **Thêm bài**. **Phiên bản mới** nhân bản các bài/câu đang dùng; bản cũ vẫn chọn được.

## Nhập dữ liệu thật và mật khẩu

Chế độ mở nhanh xem được đề cương đóng gói và lớp minh họa. Để nhập tài liệu riêng hoặc học sinh thật:

1. Đăng xuất bản minh họa, đăng nhập bằng mật khẩu hiện tại (lần đầu: `toanthd-demo`).
2. Vào **Thiết lập**, đặt mật khẩu riêng từ 8 ký tự trở lên. Mật khẩu được băm PBKDF2 và lưu trong cơ sở dữ liệu, không lưu dạng văn bản trong file xuất.
3. Nhập dữ liệu, **bỏ tích minh họa**, xem trước và xác nhận.

Khi đã có dữ liệu thật, nút mở nhanh không còn cho truy cập. Những cookie mở nhanh trước đó cũng bị từ chối. Thay mật khẩu làm hết hiệu lực các phiên đăng nhập cũ. Không gửi `.dev.vars`, cơ sở dữ liệu hoặc mật khẩu cho người khác khi báo lỗi.

## Các định dạng nhập

| Định dạng | Ngân hàng | Danh sách lớp | Cách xử lý |
|---|---|---|---|
| XLSX | Có | Có | Chọn sheet và hàng tiêu đề; nhận diện trong 25 hàng đầu hoặc chọn thủ công. |
| CSV/TSV | Có | Có | Đọc Unicode, ô có dấu phẩy/ngoặc kép/xuống dòng; có thể dán bảng vào giao diện. |
| JSON | Có | Có | Dùng định dạng xuất/mẫu v0.2, không dùng bản xuất toàn bộ DB thay cho ngân hàng. |
| DOCX | Bản nháp | Không | Nhận nhãn “Câu 137.”, phương án, dòng đáp án, lời giải, một số OMML và ảnh nhúng. Phải đối chiếu trước khi nhập. |
| XLS cũ / PDF | Chưa | Chưa | Lưu lại XLSX hoặc chuyển/đối chiếu nội dung trước; không tự đoán dữ liệu từ PDF. |

### Cột Excel/CSV cho ngân hàng

`Khối | Tài liệu | Phiên bản | Chương | Bài | Số câu | Dạng | Nội dung | A | B | C | D | Đáp án | Lời giải`

- Dạng: `mcq` (trắc nghiệm), `tf` (Đúng/Sai), `short` (trả lời ngắn).
- MCQ: đủ bốn phương án A–D, đáp án A/B/C/D.
- Đúng/Sai: bốn cột A–D chứa bốn ý a–d; đáp án ví dụ `Đ;S;Đ;Đ`.
- Trả lời ngắn: bỏ trống A–D, đáp án là số hoặc phân số đơn giản như `0,5`, `1/2`.
- Số câu lấy từ tài liệu gốc. Không tự đổi thành 1, 2, 3 khi chỉ nhập một phần.
- Các câu cùng số ở hai bài/phiên bản khác nhau được phân biệt theo tài liệu, chương, bài và phiên bản.
- Dòng trùng số câu trong cùng bài của file bị báo lỗi. Số đã có trong ngân hàng được báo là cập nhật/tạo bản sửa; nội dung giống nguồn v0.2 được giữ nguyên.
- Các ô thông tin tài liệu/chương/bài bỏ trống có thể dùng thông tin dự phòng trên biểu mẫu; không tự lấp số câu hoặc đáp án.

### Cột Excel/CSV cho lớp

`Lớp | Năm học | Khối | STT | Họ và tên`

Nhận tiêu đề tương đương như “Họ tên”, “Số thứ tự”. Giữ STT nguyên từ file, kể cả danh sách không liên tục, ví dụ 7 và 15. STT phải là số nguyên 1–999 và không lặp trong lớp. Lớp được phân biệt bằng tên và năm học.

- **Gộp/cập nhật:** thêm STT mới và sửa tên của STT có trong file; giữ những STT không được gửi lên.
- **Thay danh sách:** STT không còn trong file được lưu trữ khỏi danh sách hiện tại, không xóa các bài cũ.
- Xem kỹ các dòng tên cũ → tên mới trước khi xác nhận.
- Các phiên đã tạo giữ riêng tên lớp, STT và họ tên tại thời điểm tạo. Thay danh sách hiện tại không làm thay đổi tên trong phiên cũ.

Công thức ô Excel phải được dán thành **giá trị** trước khi nhập; ứng dụng không tính lại công thức Excel.

## Công thức và hình

Công thức viết trong `$...$`, công thức riêng dòng dùng `$$...$$`. Ví dụ:

- `$\frac{1}{2}$`
- `$\sqrt{x^2+1}$`
- `$\overrightarrow{AB}+\overrightarrow{BC}=\overrightarrow{AC}$`
- `$\sin x=0$`

Trong file hay ô nhập thực tế dùng một dấu gạch chéo ngược: `\frac`, `\sqrt`, `\sin`. Nút ký hiệu trong trình sửa tự chèn đúng cú pháp.

Công thức được dựng bằng KaTeX đóng gói tại máy và xuất MathML; không dùng lệnh liên kết/HTML. Có thể thêm tối đa 3 ảnh PNG/JPG/WebP mỗi câu, mỗi ảnh tối đa 500 KB. Ảnh SVG, WMF, EMF cần chuyển/đối chiếu trước.

## Word: luôn qua bản nháp đối chiếu

- Chuẩn bị nhãn **Câu 137.**, phương án ở đầu dòng **A. ...**, các ý **a) ...**, dòng **Đáp án: ...**, và **Lời giải: ...**.
- Trình đọc nhận một số cấu trúc Equation/OMML như phân số, căn, số mũ, chỉ số và vectơ. Công thức phức tạp được cảnh báo để kiểm tra; không bảo đảm tự chuyển đúng mọi Equation.
- Đặt tên tài liệu/phiên bản và thông tin chương/bài dự phòng trên biểu mẫu trước khi chọn Word, hoặc bổ sung sau khi đọc file.
- Có thể bấm từng câu trong bản nháp để sửa nội dung, đáp án và hình trước khi ghi vào ngân hàng.
- Nếu Word chỉ bôi đậm đáp án nhưng không có dòng đáp án rõ ràng, hãy bổ sung đáp án ở bản nháp. Hệ thống không tự đoán từ màu/bôi đậm.
- Phải tích xác nhận đã đối chiếu Word gốc và xem trước lại. File còn lỗi sẽ bị chặn toàn bộ, không âm thầm nhập một phần.

## Giới hạn và tính nhất quán

- File tối đa 10 MB; dữ liệu gửi một lần tối đa khoảng 5 MB; tối đa 500 câu mỗi lần nhập, 30 tài liệu/lớp mỗi lần. Hãy chia tài liệu lớn thành nhiều phần theo bài.
- Bảng đọc tối đa 5.000 dòng và 100 cột; nội dung ZIP giải nén tối đa 50 MB.
- Xem trước không ghi vào DB. Khi xác nhận, dữ liệu được kiểm tra lại và ghi theo giao dịch. Nếu ngân hàng vừa thay đổi, phải xem trước lại.
- Sửa câu tạo revision mới, giữ số câu gốc. Nếu cần đổi số hoặc đổi bài, thêm câu tại vị trí đúng rồi lưu trữ câu cũ.
- Ảnh nằm cùng nguồn câu; file JSON ngân hàng có thể lớn. Chỉ xuất/import trên máy thầy quản lý.
- Bản sao lưu JSON toàn bộ schema 3 (v0.3 trở lên) phục hồi ở mục Sao lưu & phục hồi. Giới hạn 10 MB / 12.000 bản ghi; dùng sao lưu toàn bộ thư mục khi vượt giới hạn.
- Đã kiểm tra mô phỏng 40 lượt HTTP; chưa đo tải Wi-Fi với 40 điện thoại thật. Chưa có chống làm hộ hoặc triển khai Internet. Phục hồi JSON có xem trước và bản dự phòng.

## Cách chấm được giữ theo phiên

Chọn trước khi tạo phiên; không thay đổi giữa chừng và không chấm lại các bài cũ khi đổi lựa chọn cho phiên sau.

| Cách chấm | Quy tắc |
|---|---|
| Luyện tập (mặc định, tương thích v0.1/v0.2) | Các câu cùng trọng số; mỗi ý Đúng/Sai bằng 1/4 câu. Tổng quy về 10, làm tròn hai chữ số. |
| Cấu trúc 12–4–6 | Chỉ nhận đúng 12 câu MCQ, 4 câu TF và 6 câu trả lời ngắn. MCQ 0,25/câu; TLN 0,5/câu; mỗi câu TF đúng 0/1/2/3/4 ý được 0/0,1/0,25/0,5/1 điểm. Tổng tối đa 10. |

Ô bỏ trống không được tính là “Sai” trong dạng Đúng/Sai. Trả lời ngắn nhận dấu chấm/phẩy và phân số đơn giản; không thực thi biểu thức nhập. Báo cáo ô từng câu thể hiện **tỉ lệ đạt câu**; tổng điểm dùng cách chấm của phiên. Cần soát câu/đáp án và thử kết quả trước khi dùng để lấy điểm.

## Dữ liệu và phát triển tiếp

Dữ liệu nằm ở `.wrangler/state`, khóa cục bộ ở `.dev.vars`. Dừng web trước khi sao chép cả thư mục để giữ một bản đầy đủ. ZIP bàn giao không chứa bài thử, mật khẩu riêng hoặc khóa trên máy phát triển.

| Vị trí | Vai trò |
|---|---|
| `app/backup-panel.tsx`, `app/backup.css` | Giao diện sao lưu, phục hồi và phiếu thử thủ công. |
| `lib/backup-model.mjs`, `lib/backup-service.mjs` | Kiểm tra file, bản dự phòng, giao dịch phục hồi và chống ghi đè dữ liệu mới. |
| `scripts/snapshot-local.mjs` | Sao lưu/kiểm tra/phục hồi toàn bộ thư mục khi web đã dừng. |
| `app/workspace.tsx` | Màn hình chính, tạo phiên và học sinh. |
| `app/report-panels.tsx` | Dashboard và xem bài làm. |
| `app/thd-projector.tsx`, `public/thd-3.0/` | Khung trình chiếu THD 3.0 và kết nối với phiên kiểm tra. |
| `lib/analytics.mjs` | Một bộ tính thống kê dùng chung cho giao diện và Excel. |
| `lib/client/report-export.mjs` | Báo cáo XLSX 6 sheet, tạo tại máy. |
| `app/admin-panels.tsx` | Biểu mẫu câu, nhập file, lớp, tài liệu/phiên bản và thiết lập. |
| `lib/admin.mjs` | Kiểm tra nhập, giao dịch, lịch sử và quản lý ngân hàng/lớp. |
| `lib/content.mjs` | Chuẩn hóa nguồn văn bản/LaTeX và tạo MathML an toàn. |
| `lib/client/importers.mjs` | XLSX/CSV/JSON/DOCX, OMML cơ bản và nguồn cũ. |
| `lib/auth.mjs` | Quyền minh họa/mật khẩu và mật khẩu riêng. |
| `db/schema.ts`, `drizzle/` | Schema và migration nối tiếp v0.1. Không sửa migration cũ. |
| `data/upgrade-v02.sql` | Chụp danh sách cho các phiên cũ; không ghi đè snapshot đã có. |
| `scripts/upgrade-local.mjs` | Sao chép trạng thái sang bản mới, từ chối ghi đè. |
| `scripts/lan-gateway.mjs` | Cổng LAN, giới hạn quyền giáo viên ở laptop và kiểm tra Host/Origin. |
| `app/lan-panels.tsx` | Hướng dẫn kết nối, QR, phóng to và tải QR tại máy. |
| `lib/client/attempt-sync.mjs` | Hàng đợi lưu, kiểm tra revision, bản nháp và tự thử lại. |
| `tests/` | Kiểm tra dữ liệu, API, nhập file, Word và nâng cấp. |

Lệnh: `npm test`, `npm run typecheck`, `npm run local:setup`, `npm run build`, `npm run local:run`, `npm run local:lan`, `npm run network:check`. Chỉnh source bằng `npm run dev`. Bộ source dùng React/Vinext/Vite, Workers/D1 và Drizzle; KaTeX, ExcelJS và fflate đóng gói tại máy. `qrcode` tạo QR tại máy; `jsqr` và `linkedom` chỉ dùng cho kiểm tra tự động.

Mở **HUONG_DAN.html** để đọc hướng dẫn bằng trình duyệt.
