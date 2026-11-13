import {lanAddresses} from './lan-gateway.mjs';
console.log('\nTOÁN THĐ v0.6 — KIỂM TRA KẾT NỐI\n');
const items=lanAddresses();
for(const item of items)console.log(`${item.name}: http://${item.address}:8787/hoc-sinh`);
if(!items.length)console.log('Chưa có IPv4 nội bộ. Kết nối laptop vào Wi-Fi/router hoặc bật điểm phát sóng.');
try{
 const r=await fetch('http://127.0.0.1:8787/api/local/network',{signal:AbortSignal.timeout(2500)});
 const data=await r.json();
 console.log(data.mode==='lan'?'Đã mở chế độ LAN.':'Chưa mở chế độ LAN. Dừng web và chạy Mo_lop_LAN.bat.');
 const health=await fetch('http://127.0.0.1:8787/api/health',{signal:AbortSignal.timeout(2500)});
 console.log(health.ok?'Cơ sở dữ liệu phản hồi bình thường.':'Chưa đọc được cơ sở dữ liệu. Xem cửa sổ chạy web.');
}catch{console.log('Chưa kết nối được web. Mở Mo_lop_LAN.bat và giữ cửa sổ đó.');}
console.log('\nTrên điện thoại: cùng Wi-Fi, mở đúng địa chỉ ở trên. 127.0.0.1 không phải địa chỉ laptop khi nhập trên điện thoại.');
console.log('Nếu vẫn không vào: kiểm tra quyền Node.js trên mạng Private và tính năng cô lập thiết bị/Guest Wi-Fi của router.');
console.log('Công cụ này chỉ kiểm tra tại laptop, không tự thay đổi tường lửa hoặc mạng.');
