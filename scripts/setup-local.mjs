import {spawnSync} from 'node:child_process';
import {existsSync,readFileSync,writeFileSync} from 'node:fs';
import {randomBytes} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {installCourseBank} from './install-course-bank.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
process.chdir(root);
const [major,minor]=process.versions.node.split('.').map(Number);
if(major<22 || (major===22&&minor<13)) {console.error('Cần Node.js 24 LTS hoặc phiên bản từ 22.13 trở lên.');process.exit(1);}
if(!existsSync('node_modules/wrangler/bin/wrangler.js')) {console.error('Chưa cài thư viện. Chạy Cai_dat_lan_dau.bat trước.');process.exit(1);}
const contentCheck=spawnSync(process.execPath,['scripts/content-pilot.mjs','check'],{cwd:root,stdio:'inherit'});
if(contentCheck.error)throw contentCheck.error;
if(contentCheck.status!==0)process.exit(contentCheck.status||1);
if(!existsSync('.dev.vars')) {
 const sample=readFileSync('.dev.vars.example','utf8');
 writeFileSync('.dev.vars',sample+'\nAUTH_SECRET="'+randomBytes(32).toString('hex')+'"\n',{mode:0o600});
}
const args=['--import','./scripts/sites-env.mjs','./node_modules/wrangler/bin/wrangler.js'];
const run=(extra,label)=>{
 const result=spawnSync(process.execPath,[...args,...extra],{cwd:root,stdio:['ignore','pipe','pipe'],encoding:'utf8',maxBuffer:10*1024*1024,env:{...process.env,CI:'true',WRANGLER_SEND_METRICS:'false',CLOUDFLARE_CF_FETCH_ENABLED:'false'}});
 if(result.error) throw result.error;
 if(result.status!==0) {console.error(result.stderr||'');console.error((result.stdout||'').slice(-6000));process.exit(result.status||1);}
 if(label)console.log(label+': xong.');
 return result.stdout;
};
run(['d1','migrations','apply','DB','--local','--config','wrangler.local.json','--persist-to','.wrangler/state'],'Cấu trúc cơ sở dữ liệu');
run(['d1','execute','DB','--local','--config','wrangler.local.json','--persist-to','.wrangler/state','--file','data/demo-seed.sql'],'Dữ liệu minh họa');
run(['d1','execute','DB','--local','--config','wrangler.local.json','--persist-to','.wrangler/state','--file','data/upgrade-v02.sql'],'Giữ danh sách cho phiên cũ');
installCourseBank(run);
console.log('\nĐã sẵn sàng. Dữ liệu nằm trong .wrangler/state. Cài lại không xóa bài làm cũ.');
