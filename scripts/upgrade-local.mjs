import {cpSync,existsSync,mkdirSync,mkdtempSync,readdirSync,renameSync,rmSync} from 'node:fs';
import path from 'node:path';
import {firstBusyPort} from './local-ports.mjs';
import {fileURLToPath} from 'node:url';
import {createInterface} from 'node:readline/promises';
export function separateFolders(source,target,paths=path){
 const outside=(a,b)=>{const relative=paths.relative(paths.resolve(a),paths.resolve(b));return paths.isAbsolute(relative)||relative==='..'||relative.startsWith('..'+paths.sep);};
 return outside(source,target)&&outside(target,source);
}
export async function copyPrevious(source,target,{checkPorts=true}={}){
 source=path.resolve(source);target=path.resolve(target);
 if(!separateFolders(source,target))throw new Error('Giải nén v0.14 sang thư mục riêng, không nằm bên trong hoặc chứa thư mục bản cũ.');
 if(!existsSync(path.join(source,'.dev.vars'))||!existsSync(path.join(source,'.wrangler','state')))throw new Error('Chưa tìm thấy .dev.vars và .wrangler/state trong thư mục bản cũ đã chọn.');
 if(existsSync(path.join(target,'.dev.vars'))||existsSync(path.join(target,'.wrangler','state')))throw new Error('Thư mục v0.14 đã có cấu hình hoặc dữ liệu. Hãy dùng một thư mục giải nén mới để tránh ghi đè.');
 if(checkPorts){const port=await firstBusyPort();if(port)throw new Error('Đang có web chạy tại cổng '+port+'. Dừng web và cửa sổ chỉnh source trước khi nâng cấp.');}
 const temp=mkdtempSync(path.join(target,'.upgrade-incoming-'));let installedState=false,installedVars=false;
 try{
  cpSync(path.join(source,'.wrangler','state'),path.join(temp,'state'),{recursive:true});cpSync(path.join(source,'.dev.vars'),path.join(temp,'.dev.vars'));
  mkdirSync(path.join(target,'.wrangler'),{recursive:true});renameSync(path.join(temp,'state'),path.join(target,'.wrangler','state'));installedState=true;
  renameSync(path.join(temp,'.dev.vars'),path.join(target,'.dev.vars'));installedVars=true;
 }catch(e){if(installedState)rmSync(path.join(target,'.wrangler','state'),{recursive:true,force:true});if(installedVars)rmSync(path.join(target,'.dev.vars'),{force:true});throw e;}
 finally{rmSync(temp,{recursive:true,force:true});}
 return {copied:true};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const root=fileURLToPath(new URL('../',import.meta.url)),rl=createInterface({input:process.stdin,output:process.stdout});
 try{console.log('TOÁN THĐ v0.14 — Giữ dữ liệu từ bản cũ');console.log('Dừng web cũ trước. Bản cũ được giữ nguyên.');const source=(await rl.question('Đường dẫn thư mục bản cũ (ví dụ D:\\ToanTHD_v0.4): ')).trim().replace(/^"|"$/g,'');await copyPrevious(source,root);console.log('Đã sao chép dữ liệu và cấu hình. Tiếp tục bước cài để áp dụng cấu trúc v0.14.');}
 catch(e){console.error(e.message);process.exitCode=1;}finally{rl.close();}
}
