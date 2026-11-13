import {BACKUP_TABLES,BACKUP_COLUMNS,MAX_BACKUP_BYTES,canonical,sealBackup,validateBackup,sha256,summarizeBackup} from './backup-model.mjs';
import {gradeAttempt} from './grading.mjs';
import {COURSE_DOCUMENT_SQL,isCourseDocument} from './course-bank.mjs';
import {COURSE_METADATA} from './course-metadata.mjs';
const courseLessons=new Set(COURSE_METADATA.lessons.map(l=>l.id));
const courseLessonSQL=[...courseLessons].map(id=>"'"+id+"'").join(',');
// Exact JSON from a single SQLite SELECT is also the atomic transaction guard.
// Its private fields are hashed for preview and never appear in backup files.
const rowJson=(t,cols)=>{
 const full=`json_object(${cols.flatMap(k=>["'"+k+"'",k]).join(',')})`;
 const value=t==='questions'?`CASE WHEN bank_fingerprint IS NOT NULL THEN json_object('id',id,'course_ref',bank_fingerprint,'archived_at',archived_at,'updated_at',updated_at) ELSE ${full} END`:full;
 return `json((SELECT json_group_array(json(${value})) FROM (SELECT ${cols.join(',')} FROM ${t} ORDER BY id)))`;
};
export const SNAPSHOT_SQL=`SELECT json_object(${BACKUP_TABLES.flatMap(t=>["'"+t+"'",rowJson(t,t==='attempts'?[...BACKUP_COLUMNS[t],'token']:BACKUP_COLUMNS[t])]).join(',')},'_revision',(SELECT COALESCE(MAX(revision),0) FROM mutation_log),'_epoch',COALESCE((SELECT value FROM workspace_settings WHERE key='auth_epoch'),'1')) AS basis`;
const chunks=text=>{const out=[];for(let i=0;i<text.length;){let j=Math.min(i+120000,text.length);if(j<text.length&&/[\uD800-\uDBFF]/.test(text[j-1]))j--;out.push(text.slice(i,j));i=j;}return out;};
async function hmac(secret,v){const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);return [...new Uint8Array(await crypto.subtle.sign('HMAC',key,new TextEncoder().encode(canonical(v))))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export async function handleBackup(path,request,c){
 if(!['teacher/export','teacher/backup/meta','teacher/backup/checkpoint','teacher/restore/preview','teacher/restore/commit'].includes(path))return null;
 const {database,first,must,json,readBody,auth,authTools,env}=c,read=async key=>(await first('SELECT value FROM workspace_settings WHERE key=?',key))?.value;
 const put=(k,v)=>database().prepare('INSERT INTO workspace_settings(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').bind(k,v);
 const snapshot=async()=>{const basis=(await first(SNAPSHOT_SQL)).basis;return {basis,data:JSON.parse(basis),revision:await sha256(basis)};};
 const validate=async raw=>{
  const [course,teachers]=await Promise.all([
   database().prepare('SELECT id,bank_fingerprint AS course_ref,archived_at,updated_at FROM questions WHERE bank_fingerprint IS NOT NULL').all(),
   database().prepare('SELECT id FROM teacher_accounts').all(),
  ]);
  return validateBackup(raw,{courseRows:course.results,teacherIds:teachers.results.map(row=>row.id)});
 };
 const history=async()=>JSON.parse(await read('restore_history')||'[]');
 const permission=async incoming=>{if(incoming||await authTools.hasReal())await authTools.requireReal(auth);};
 async function checkpoint(id){const m=(await history()).find(x=>x.id===id);must(m,'Không tìm thấy bản dự phòng này.',404);await permission(m.has_real);must(Number.isInteger(m.chunks)&&m.chunks>0&&m.chunks<=200,'Bản dự phòng thiếu thông tin.',422);const parts=[];for(let i=0;i<m.chunks;i++){const p=await read('restore_chunk:'+id+':'+i);must(typeof p==='string','Bản dự phòng thiếu dữ liệu.',422);parts.push(p);}const text=parts.join('');must(await sha256(text)===m.digest,'Bản dự phòng không khớp mã kiểm tra.',422);return JSON.parse(text);}
 async function source(b){must(b&&typeof b==='object'&&!!b.checkpoint_id!==!!b.payload,'Chọn một nguồn phục hồi.');return b.checkpoint_id?checkpoint(b.checkpoint_id):b.payload;}
 if(path==='teacher/export'&&request.method==='GET'){const s=await snapshot();return json(await sealBackup(s.data),200,{'Content-Disposition':`attachment; filename="ToanTHD_sao_luu_${new Date().toISOString().replace(/[:.]/g,'-')}.json"`});}
 if(path==='teacher/backup/meta'&&request.method==='GET'){const s=await snapshot();return json({version:'0.14.0',current:summarizeBackup(s.data),active_sessions:s.data.sessions.filter(x=>x.state==='open'&&x.closes_at>Date.now()).map(({id,title,code})=>({id,title,code})),checkpoints:(await history()).map(({id,created_at,counts,has_real})=>({id,created_at,counts,has_real})),last_restore:JSON.parse(await read('last_restore')||'null'),max_bytes:MAX_BACKUP_BYTES});}
 if(path==='teacher/backup/checkpoint'&&request.method==='GET'){const id=new URL(request.url).searchParams.get('id');return json(await checkpoint(id),200,{'Content-Disposition':`attachment; filename="ToanTHD_du_phong_${id}.json"`});}
 if(path==='teacher/restore/preview'&&request.method==='POST'){const b=await readBody(request,MAX_BACKUP_BYTES+8192),p=await validate(await source(b));await permission(p.summary.has_real);const s=await snapshot(),issued_at=Date.now(),current_revision=s.revision;return json({summary:p.summary,warnings:p.warnings,verified:p.verified,source_version:p.source_version,exported_at:p.exported_at,digest:p.digest,current_revision,issued_at,preview_token:await hmac(env.AUTH_SECRET,[p.digest,current_revision,issued_at,auth.scope]),current:summarizeBackup(s.data),active_current:s.data.sessions.filter(x=>x.state==='open'&&x.closes_at>issued_at).length,expires_at:issued_at+900000});}
 if(path==='teacher/restore/commit'&&request.method==='POST'){
  const b=await readBody(request,MAX_BACKUP_BYTES+8192);must(b.confirmed===true&&b.confirmation==='PHUC HOI','Tích xác nhận và nhập PHUC HOI trước khi phục hồi.',400);const p=await validate(await source(b));await permission(p.summary.has_real);
  must(b.digest===p.digest&&typeof b.current_revision==='string'&&Number.isSafeInteger(b.issued_at)&&b.issued_at<=Date.now()+5000&&Date.now()-b.issued_at<900000,'Bản xem trước đã thay đổi hoặc hết hạn. Xem trước lại.',409);const expected=await hmac(env.AUTH_SECRET,[p.digest,b.current_revision,b.issued_at,auth.scope]);must(typeof b.preview_token==='string'&&await authTools.equal(expected,b.preview_token),'Cần xem trước trên phiên đăng nhập này trước khi phục hồi.',409);
  const operation_id=await sha256(b.preview_token),last=JSON.parse(await read('last_restore')||'null');if(last?.operation_id===operation_id)return json({ok:true,...last,replayed:true});
  const s=await snapshot(),now=Date.now();must(s.revision===b.current_revision,'Dữ liệu hiện tại vừa thay đổi. Xem trước lại để không ghi đè bản mới.',409);must(!s.data.sessions.some(x=>x.state==='open'&&x.closes_at>now),'Còn phiên đang mở. Đóng các phiên rồi xem trước lại trước khi phục hồi.',409);
  const text=JSON.stringify(await sealBackup(s.data,{now})),parts=chunks(text),id=crypto.randomUUID(),beforeSummary=summarizeBackup(s.data),m={id,created_at:now,counts:beforeSummary.counts,has_real:beforeSummary.has_real,chunks:parts.length,digest:await sha256(text)},old=await history();
  const t=structuredClone(p.tables),qs=new Map(t.sessions.map(session=>[session.id,t.session_questions.filter(q=>q.session_id===session.id).sort((a,b)=>a.position-b.position).map(q=>JSON.parse(q.snapshot))])),sessions=new Map(t.sessions.map(x=>[x.id,x]));
  for(const session of t.sessions)session.state='closed';for(const a of t.attempts){if(a.submitted_at==null){const result=gradeAttempt(qs.get(a.session_id),JSON.parse(a.answers),sessions.get(a.session_id).scoring_mode);a.submitted_at=now;a.earned=result.earned;a.score=result.score;a.updated_at=now;}a.token=crypto.randomUUID()+crypto.randomUUID();a.save_revision++;a.last_seen_at=0;a.allow_rejoin=0;}
  const receipt={operation_id,restored_at:now,checkpoint_id:id,summary:p.summary,source_version:p.source_version};
  const guard=database().prepare(`INSERT INTO workspace_settings(key,value) VALUES('restore_guard',CASE WHEN (${SNAPSHOT_SQL.replace(/^SELECT /,'').replace(/ AS basis$/,'')})=? AND NOT EXISTS(SELECT 1 FROM sessions WHERE state='open' AND closes_at>?) THEN ? ELSE NULL END) ON CONFLICT(key) DO UPDATE SET value=excluded.value`).bind(s.basis,now,id);
  const statements=[guard,...parts.map((part,i)=>put('restore_chunk:'+id+':'+i,part)),put('restore_history',JSON.stringify([m,...old.slice(0,1)]))];for(const x of old.slice(1))for(let i=0;i<x.chunks;i++)statements.push(database().prepare('DELETE FROM workspace_settings WHERE key=?').bind('restore_chunk:'+x.id+':'+i));
  for(const table of [...BACKUP_TABLES].reverse()){
   const where=table==='questions'?' WHERE bank_fingerprint IS NULL':table==='lessons'?' WHERE id NOT IN ('+courseLessonSQL+')':table==='documents'?' WHERE id NOT IN ('+COURSE_DOCUMENT_SQL+')':'';
   statements.push(database().prepare('DELETE FROM '+table+where));
  }
  const currentCourse=new Map(s.data.questions.filter(q=>q.course_ref).map(q=>[q.id,q]));
  for(const q of t.questions.filter(q=>q.course_ref)){const before=currentCourse.get(q.id);if(before?.archived_at!==q.archived_at||before?.updated_at!==q.updated_at)statements.push(database().prepare('UPDATE questions SET archived_at=?,updated_at=? WHERE id=? AND bank_fingerprint=?').bind(q.archived_at,q.updated_at,q.id,q.course_ref));}
  t.documents=t.documents.filter(d=>!isCourseDocument(d.id));t.lessons=t.lessons.filter(l=>!courseLessons.has(l.id));t.questions=t.questions.filter(q=>!q.course_ref);

  for(const table of BACKUP_TABLES){const cols=table==='attempts'?[...BACKUP_COLUMNS[table],'token']:BACKUP_COLUMNS[table],size=Math.max(1,Math.floor(90/cols.length));for(let i=0;i<t[table].length;i+=size){const rows=t[table].slice(i,i+size);statements.push(database().prepare(`INSERT INTO ${table}(${cols.join(',')}) VALUES ${rows.map(()=>`(${cols.map(()=>'?').join(',')})`).join(',')}`).bind(...rows.flatMap(r=>cols.map(k=>r[k]??null))));}}
  if(p.summary.has_real||m.has_real)statements.push(put('backup_has_real','1'));statements.push(put('last_restore',JSON.stringify(receipt)),database().prepare('INSERT INTO mutation_log(id,revision,created_at,summary) VALUES(?,?,?,?)').bind(crypto.randomUUID(),s.data._revision+1,now,'Phục hồi bản sao lưu; dự phòng '+id));
  try{await database().batch(statements);}catch(e){if(String(e.message).includes('NOT NULL constraint failed: workspace_settings.value')||String(e.message).includes('UNIQUE constraint failed: mutation_log.revision'))must(false,'Dữ liệu thay đổi trong lúc phục hồi. Chưa ghi thay đổi; hãy xem trước lại.',409);throw e;}return json({ok:true,...receipt});
 }must(false,'Phương thức không được hỗ trợ.',405);
}
