import fs from 'node:fs';
import path from 'node:path';
import {readCourseBank,courseBankSQL} from './course-bank-data.mjs';
export function installCourseBank(run){
 const bundle=readCourseBank(),expected=bundle.manifest.summary.total;
 // Also count the rows: a restore from an older version may keep settings but remove the bank.
 const check=run(['d1','execute','DB','--local','--config','wrangler.local.json','--persist-to','.wrangler/state','--json','--command',"SELECT (SELECT value FROM workspace_settings WHERE key='course_bank_version') AS version,(SELECT COUNT(*) FROM questions WHERE bank_fingerprint IS NOT NULL) AS count"],null);
 let existing;try{existing=JSON.parse(check).flatMap(r=>r.results||[])[0];}catch{}
 if(existing?.version===bundle.manifest.version&&existing.count===expected){console.log('Ngân hàng đề cương: đã có đủ '+expected+' câu.');return;}
 const temp=path.resolve('.wrangler/bank-install');fs.mkdirSync(temp,{recursive:true});let index=0;
 try{
  for(const sql of courseBankSQL(bundle)){
   const name=path.join(temp,'part-'+String(++index).padStart(3,'0')+'.sql');fs.writeFileSync(name,sql);
   run(['d1','execute','DB','--local','--config','wrangler.local.json','--persist-to','.wrangler/state','--file',name],'Tích hợp đề cương · phần '+index);
   fs.unlinkSync(name);
  }
 }finally{fs.rmSync(temp,{recursive:true,force:true});}
 console.log('Ngân hàng đề cương: '+expected+' câu, Toán 10–11–12. Tự luận và câu cần đối chiếu có nhãn riêng.');
}
