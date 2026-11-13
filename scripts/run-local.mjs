import {spawn} from 'node:child_process';
import {existsSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import net from 'node:net';
import {defaultPort,parallelPort} from './local-ports.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));process.chdir(root);
const lan=process.argv.includes('--lan'),portIndex=process.argv.indexOf('--port');
const port=portIndex===-1?defaultPort:Number(process.argv[portIndex+1]);
if(![defaultPort,parallelPort].includes(port)||lan&&port!==defaultPort){
 console.error('Dùng cổng 8787 cho web chính hoặc 8827 để thử riêng trên máy.');process.exit(1);
}
const targetPort=port+1,libraryPort=port+2;
const teacherUrl=`http://${port===defaultPort?'127.0.0.1':'localhost'}:${port}/`;
for(const file of ['node_modules/wrangler/bin/wrangler.js','dist/server/wrangler.json','.dev.vars']) {
 if(!existsSync(file)){console.error('Chưa sẵn sàng. Chạy Cai_dat_lan_dau.bat và chờ hoàn tất. Thiếu: '+file);process.exit(1);}
}
const {createGateway,lanAddresses}=await import('./lan-gateway.mjs');
for(const [testPort,host] of [[port,lan?'0.0.0.0':'127.0.0.1'],[targetPort,'127.0.0.1'],[libraryPort,lan?'0.0.0.0':'127.0.0.1']]) {
 const available=await new Promise(resolve=>{const s=net.createServer();s.once('error',()=>resolve(false));s.listen(testPort,host,()=>s.close(()=>resolve(true)));});
 if(!available){console.error('Cổng '+testPort+' đang được sử dụng. Dừng cửa sổ chạy web cũ rồi thử lại.');process.exit(1);}
}
console.log('\nTOÁN THĐ v0.14 — '+(lan?'Mở lớp trong mạng LAN':'Chạy trên laptop'));
console.log('Giữ cửa sổ này mở. Dừng bằng Ctrl+C. Dữ liệu đã lưu được giữ nguyên.');
console.log('Đang mở cơ sở dữ liệu…');
const worker=spawn(process.execPath,['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js','dev','--config','dist/server/wrangler.json','--env-file',path.join(root,'.dev.vars'),'--local','--persist-to','.wrangler/state','--ip','127.0.0.1','--port',String(targetPort),'--inspector-port','0'],{cwd:root,stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false',CLOUDFLARE_CF_FETCH_ENABLED:'false'}});
let gateway,library,stopping=false,workerExited=false;
function stop(code=0){if(stopping)return;stopping=true;for(const server of [gateway,library]){server?.closeAllConnections();server?.close();}worker.kill('SIGTERM');process.exitCode=code;}
process.on('SIGINT',()=>stop());process.on('SIGTERM',()=>stop());
worker.on('error',e=>{console.error('Không khởi động được: '+e.message);stop(1);});
worker.on('exit',code=>{workerExited=true;if(!stopping){console.error('Máy chủ đã dừng.');stop(code||1);}});
try{
 let ready=false;
 for(let n=0;n<120&&!stopping&&!workerExited;n++){
  try{const r=await fetch(`http://127.0.0.1:${targetPort}/api/health`,{signal:AbortSignal.timeout(1200)});if(r.ok&&(await r.json()).ready){ready=true;break;}}catch{}
  await new Promise(resolve=>setTimeout(resolve,600));
 }
 if(!ready)throw new Error('Chưa mở được dữ liệu. Chạy lại Cai_dat_lan_dau.bat và xem lỗi trong cửa sổ này.');
 if(!stopping){
  library=createGateway({port:libraryPort,lan,libraryOnly:true,libraryAppPort:port});
  await new Promise((resolve,reject)=>{library.once('error',reject);library.listen(libraryPort,lan?'0.0.0.0':'127.0.0.1',resolve);});
  gateway=createGateway({targetPort,port,lan,libraryPort});
  await new Promise((resolve,reject)=>{gateway.once('error',reject);gateway.listen(port,lan?'0.0.0.0':'127.0.0.1',resolve);});
  console.log(`\nGIÁO VIÊN: ${teacherUrl}`);
  if(lan){
   const addresses=lanAddresses();
   for(const item of addresses)console.log(`HỌC SINH (${item.name}): http://${item.address}:${port}/hoc-sinh`);
   if(!addresses.length)console.log('Chưa thấy IPv4 nội bộ. Kết nối Wi-Fi/router hoặc điểm phát sóng rồi mở lại.');
   console.log('Điện thoại và laptop cần cùng mạng. Mở phiên → QR & kết nối.');
   console.log('Nếu Windows hỏi, chỉ cho phép Node.js trên mạng Riêng tư (Private).');
  }else console.log('Chế độ này chỉ dùng trên laptop. Muốn mở cho điện thoại, dừng web rồi chạy Mo_lop_LAN.bat.');
  if(process.platform==='win32'&&!process.argv.includes('--no-open')){const browser=spawn('rundll32.exe',['url.dll,FileProtocolHandler',teacherUrl],{stdio:'ignore',detached:true});browser.on('error',()=>{});browser.unref();}
 }
}catch(e){console.error(e.message);stop(1);}
