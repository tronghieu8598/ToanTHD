import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {courseRowPayload} from '../lib/course-bank.mjs';
import {bankReleaseChapters} from '../lib/bank-release-chapters.mjs';
const dataRoot=fileURLToPath(new URL('../data/course-bank/',import.meta.url));
export function readFrozenCourseBank(folder=dataRoot){
 const manifest=JSON.parse(fs.readFileSync(path.join(folder,'manifest.json'),'utf8')),packed=fs.readFileSync(path.join(folder,'questions.json.gz'));
 if(createHash('sha256').update(packed).digest('hex')!==manifest.questions_sha256)throw new Error('Ngân hàng đóng gói không khớp SHA-256. Giải nén lại bộ source.');
 const questions=JSON.parse(gunzipSync(packed));
 if(!Array.isArray(questions)||questions.length!==manifest.summary.total)throw new Error('Ngân hàng đóng gói thiếu câu hỏi.');return {manifest,questions};
}
export function readCourseBank(){
 const bundle=readFrozenCourseBank();
 const originals=new Map(bundle.questions.map(row=>[row.id,row]));
 const patches=new Map();
 const versions=[];
 const summary=structuredClone(bundle.manifest.summary);
 for(const [scope,chapter] of Object.entries(bankReleaseChapters)){
   const overlay=JSON.parse(fs.readFileSync(path.join(dataRoot,'generated',scope+'.json'),'utf8'));
   if(overlay.format!=='toanthd.bank-overlay/1'||overlay.base_sha256!==bundle.manifest.questions_sha256)
     throw new Error('Gói '+scope+' không khớp ngân hàng nguồn. Chạy npm run content:check.');
   const lessons=new Set(chapter.lessons.map(lesson=>lesson.id));
   for(const row of overlay.rows){
     const original=originals.get(row.id);
     if(!original||patches.has(row.id)||!lessons.has(original.lesson_id)
         ||row.lesson_id!==original.lesson_id||row.original_number!==original.original_number||row.revision!==original.revision||row.kind!==original.kind
         ||!['auto','review','reference'].includes(row.bank_status)
         ||createHash('sha256').update(courseRowPayload(row)).digest('hex')!==row.bank_fingerprint)
       throw new Error('Bản ghi '+scope+' không hợp lệ '+row.id+'.');
     if(row.bank_status!==original.bank_status){
       for(const counts of [summary.by_status,summary.by_grade[chapter.grade]]){
         counts[original.bank_status]--;
         counts[row.bank_status]=(counts[row.bank_status]??0)+1;
       }
     }
     patches.set(row.id,row);
   }
   if(overlay.rows.length)versions.push(overlay.version);
 }
 if(!patches.size)return bundle;
 return {
   manifest:{...bundle.manifest,summary,version:[bundle.manifest.version,...versions].join('+')},
   questions:bundle.questions.map(row=>patches.get(row.id)??row),
 };
}
export const sqlValue=v=>v===null||v===undefined?'NULL':typeof v==='number'?String(v):"'"+String(v).replace(/'/g,"''")+"'";
export function* courseBankSQL({manifest,questions}, maxBytes=3000000) {
  let chunk = '', size = 0;
  const tables = [
    ['documents', manifest.documents, ['title', 'edition']],
    ['lessons', manifest.lessons, ['chapter', 'title']],
    ['questions', questions, Object.keys(questions[0]).filter(key => !['id', 'archived_at', 'updated_at'].includes(key))],
  ];
  for (const [table, rows, fields] of tables) {
    const updates = fields.map(key => key + '=excluded.' + key).join(',');
    const guard = table === 'questions'
      ? ' WHERE questions.bank_fingerprint IS NOT NULL AND questions.bank_fingerprint<>excluded.bank_fingerprint'
      : '';
    for (const row of rows) {
      const cols = Object.keys(row);
      const values = cols.map(key => sqlValue(row[key])).join(',');
      const statement = `INSERT INTO ${table}(${cols.join(',')}) VALUES(${values}) ON CONFLICT(id) DO UPDATE SET ${updates}${guard};\n`;
      const bytes = Buffer.byteLength(statement);
      if (size && size + bytes > maxBytes) {
        yield chunk;
        chunk = '';
        size = 0;
      }
      chunk += statement;
      size += bytes;
    }
  }
  if (chunk) yield chunk;
  yield `INSERT INTO workspace_settings(key,value) VALUES('course_bank_version',${sqlValue(manifest.version)}) ON CONFLICT(key) DO UPDATE SET value=excluded.value;\n`;
}
