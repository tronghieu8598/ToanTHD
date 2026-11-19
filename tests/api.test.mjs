import test from 'node:test';
import assert from 'node:assert/strict';
import nodeCrypto from 'node:crypto';
import {syncBuiltinESMExports} from 'node:module';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdtempSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {newStaffPassword} from '../lib/auth.mjs';
// Exercise the real API module. Only the Cloudflare env binding is substituted;
// SQL is executed by SQLite using the generated D1 schema and the actual seed.
const db=new DatabaseSync(':memory:');
for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())db.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
db.exec(readFileSync(new URL('../data/demo-seed.sql',import.meta.url),'utf8'));
function statement(sql,values=[]){return {bind(...args){return statement(sql,args);},async first(){return db.prepare(sql).get(...values)??null;},async all(){return {results:db.prepare(sql).all(...values),success:true};},async run(){const r=db.prepare(sql).run(...values);return {success:true,meta:{changes:Number(r.changes)}};}};}
const env={DB:{prepare:statement,async batch(items){db.exec('BEGIN');try{const result=[];for(const item of items)result.push(await item.run());db.exec('COMMIT');return result;}catch(e){db.exec('ROLLBACK');throw e;}}},AUTH_SECRET:'unit-test-secret-no-user-data',TEACHER_PASSWORD:'test-password',DEMO_MODE:'true'};
globalThis[Symbol.for('toanthd.test.env')]=env;
const dir=mkdtempSync(path.join(tmpdir(),'toanthd-api-'));
let code=ts.transpileModule(readFileSync(new URL('../lib/api.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
code=code.replace(/import\s*\{\s*env\s*\}\s*from\s*['"]cloudflare:workers['"];?/,"const env=globalThis[Symbol.for('toanthd.test.env')];").replace(/(['"])(\.\/[^'"]+\.mjs)\1/g,(_,quote,module)=>JSON.stringify(new URL('../lib/'+module.slice(2),import.meta.url).href));
const file=path.join(dir,'api.mjs');writeFileSync(file,code);
const {handleApi}=await import(pathToFileURL(file).href);delete globalThis[Symbol.for('toanthd.test.env')];
test.after(()=>{db.close();rmSync(dir,{recursive:true,force:true});});
let cookie='';
async function call(route,{method='GET',body,token,status=200,auth=true,origin}={}){
 const headers={...(auth&&cookie?{cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{}),...(origin?{Origin:origin}:{})};
 const response=await handleApi(new Request('http://test.local/api/'+route,{method,headers,...(body?{body:JSON.stringify(body)}:{})}));
 const data=await response.json();assert.equal(response.status,status,route+': '+JSON.stringify(data));return {data,response};
}
// Legacy scenarios still inspect the entire small fixture, now through the paged bank API.
async function loadBank(){const d=(await call('teacher/bootstrap')).data;d.questions=[];let page=1,total=Infinity;while(d.questions.length<total){const r=(await call('teacher/bank?page='+page++)).data;total=r.total;d.questions.push(...r.questions);if(!r.questions.length)break;}return d;}

test('the configured HTTPS origin protects cookies and writes behind an HTTP reverse proxy',async()=>{
 const origin='https://library-test.example';
 env.THD_PUBLIC_ORIGIN=origin;
 const request=(path,from)=>handleApi(new Request('http://internal.test/api/teacher/'+path,{
  method:'POST',headers:{'Content-Type':'application/json',Origin:from},body:JSON.stringify({password:'test-password'}),
 }));
 try{
  const login=await request('login',origin);
  assert.equal(login.status,200);
  const header=login.headers.get('Set-Cookie')||'';
  assert.ok(header.includes('; Secure')&&header.includes('; HttpOnly')&&header.includes('; SameSite=Strict'));
  assert.equal((await request('login','http://internal.test')).status,403);
  const logout=await request('logout',origin);
  assert.equal(logout.status,200);
  const expired=logout.headers.get('Set-Cookie')||'';
  assert.ok(expired.includes('Max-Age=0')&&expired.includes('; Secure'));
 }finally{delete env.THD_PUBLIC_ORIGIN;}
});

test('a hosted PBKDF2 cap preserves existing teacher passwords and newly generated hashes',async(t)=>{
 const deriveNative=nodeCrypto.pbkdf2Sync;
 const password='Mật khẩu kiểm thử 🔒';
 const existing=newStaffPassword(password);
 const id='worker-fallback-teacher';
 db.prepare(`INSERT INTO teacher_accounts(id,username,display_name,password_salt,password_hash,auth_epoch)
  VALUES (?,?,?,?,?,?)`).run(id,'gv-fallback','Giáo viên mẫu',existing.salt,existing.hash,existing.epoch);
 const limited=t.mock.method(nodeCrypto,'pbkdf2Sync',(...args)=>{
  if(args[2]>100_000)throw new DOMException('PBKDF2 iteration limit','NotSupportedError');
  return deriveNative(...args);
 });
 syncBuiltinESMExports();
 try{
  await call('teacher/login',{method:'POST',auth:false,body:{username:'gv-fallback',password}});
  const generated=newStaffPassword(password);
  assert.equal(generated.hash,deriveNative(password,generated.salt,600_000,32,'sha256').toString('hex'));
  assert.equal(limited.mock.callCount(),2);
 }finally{
  limited.mock.restore();
  syncBuiltinESMExports();
  db.prepare('DELETE FROM teacher_accounts WHERE id=?').run(id);
 }
});

test('API: teacher access, three answer types, original numbers, save/resume, duplicate guards, scoring, closing and export',async()=>{
 await call('teacher/bootstrap',{status:401});
 assert.equal((await call('health')).data.questions,30);
 await call('teacher/login',{method:'POST',body:{password:'wrong'},status:401});
 const login=await call('teacher/login',{method:'POST',body:{password:'test-password'}});cookie=login.response.headers.get('set-cookie').split(';')[0];
 const bank=(await loadBank());
 const selected=['mcq','short','tf'].map(kind=>bank.questions.find(q=>q.lesson_id==='d11-b1'&&q.kind===kind));
 const created=(await call('teacher/sessions',{method:'POST',body:{title:'Integration test',question_ids:selected.map(q=>q.id),classroom_id:'demo-11a1',minutes:15,mode:'online'},status:201})).data;
 await call('teacher/sessions',{method:'POST',body:{title:'Invalid duplicate',question_ids:[selected[0].id,selected[0].id],classroom_id:'demo-11a1',minutes:15,mode:'online'},status:400});
 const a=(await call('public/join',{method:'POST',body:{code:created.code,ordinal:1},status:201})).data;
 assert.deepEqual(a.questions.map(q=>q.original_number),selected.map(q=>q.original_number));
 assert.ok(a.questions.every(q=>!('correct'in q)&&!('solution'in q)));
 await call('public/join',{method:'POST',body:{code:created.code,ordinal:1},status:409});
 const answers=Object.fromEntries(selected.map(q=>[q.id,q.correct]));
 await call('public/save',{method:'POST',body:{answers,expected_revision:0},token:a.token});
 assert.deepEqual((await call('public/attempt',{token:a.token})).data.answers,answers);
 const done=(await call('public/submit',{method:'POST',body:{},token:a.token})).data;assert.equal(done.score,10);
 assert.equal((await call('public/submit',{method:'POST',body:{},token:a.token})).data.submitted_at,done.submitted_at);
 await call('public/save',{method:'POST',body:{answers:{}},token:a.token,status:409});
 const b=(await call('public/join',{method:'POST',body:{code:created.code,ordinal:2},status:201})).data;
 await call('public/save',{method:'POST',body:{answers:{[selected[0].id]:selected[0].correct},expected_revision:0},token:b.token});
 await call('teacher/close',{method:'POST',body:{id:created.id}});
 assert.equal((await call('public/attempt',{token:b.token})).data.score,3.33);
 const report=(await call('teacher/session?id='+created.id)).data;assert.equal(report.attempts.filter(a=>a.submitted_at).length,2);
 await call('public/join',{method:'POST',body:{code:created.code,ordinal:3},status:409});
 const backup=(await call('teacher/export')).data;assert.ok(backup.attempts.every(a=>!('token'in a)));assert.ok(!JSON.stringify(backup).includes(env.AUTH_SECRET));
 await call('teacher/close',{method:'POST',body:{id:created.id},origin:'https://other.example',status:403});
 env.DEMO_MODE='false';await call('teacher/demo',{method:'POST',body:{},status:403});env.DEMO_MODE='true';
});

const bankPayload=()=>({kind:'bank',documents:[{title:'Ngân hàng kiểm thử v0.2',grade:11,edition:'v1',is_sample:true,lessons:[{chapter:'Chương I',title:'Bài nhập thử',questions:[{original_number:137,kind:'short',prompt:'Tính $\\frac{1}{2}$.',choices:[],correct:'0,5',solution:'Giá trị bằng $0.5$.',images:[]},{original_number:140,kind:'tf',prompt:'Xét bốn ý.',choices:['Ý a','Ý b','Ý c','Ý d'].map((text,i)=>({key:'abcd'[i],text})),correct:[true,false,true,false],solution:'Đối chiếu từng ý.',images:[]}]}]}]});
async function importPlan(payload){return (await call('teacher/import/preview',{method:'POST',body:{payload}})).data;}
async function commitPlan(payload,preview,status=200){return call('teacher/import/commit',{method:'POST',body:{payload,digest:preview.digest,revision:preview.revision},status});}

test('v0.2: edits append revisions, old session answers stay fixed, archives cannot enter new sessions',async()=>{
 const bank=(await loadBank()),q=bank.questions.find(q=>q.lesson_id==='d11-b1'&&q.original_number===1),oldSession=bank.sessions.find(s=>s.title==='Integration test');
 const source={original_number:1,kind:'mcq',prompt:'Tính $\\cos0$.',choices:['0','1','-1','2'].map((text,i)=>({key:'ABCD'[i],text})),correct:'B',solution:'$\\cos0=1$.',images:[]};
 const newer=(await call('teacher/questions',{method:'POST',body:{id:q.id,expected_revision:q.revision,lesson_id:q.lesson_id,source},status:201})).data;
 assert.equal(newer.revision,2);
 const history=(await call('teacher/questions/history?id='+newer.id)).data.questions;assert.equal(history.length,2);assert.equal(history[1].correct,'A');assert.equal(history[0].correct,'B');
 const report=(await call('teacher/session?id='+oldSession.id)).data;assert.equal(report.questions.find(v=>v.id===q.id).correct,'A');
 await call('teacher/questions',{method:'POST',body:{id:q.id,expected_revision:1,lesson_id:q.lesson_id,source},status:409});
 await call('teacher/questions/archive',{method:'POST',body:{id:newer.id,archived:true}});
 await call('teacher/sessions',{method:'POST',body:{title:'Archived invalid',question_ids:[newer.id],classroom_id:'demo-11a1',minutes:15,mode:'online'},status:400});
 await call('teacher/questions/archive',{method:'POST',body:{id:newer.id,archived:false}});
});

test('v0.2: preview has no writes, commits are idempotent, invalid/stale files never partially import',async()=>{
 const payload=bankPayload(),before=(await loadBank()).questions.length,preview=await importPlan(payload);assert.equal(preview.errors.length,0);assert.equal(preview.summary.created,2);assert.equal((await loadBank()).questions.length,before);
 await commitPlan(payload,preview);assert.equal((await loadBank()).questions.length,before+2);
 const repeat=await importPlan(payload);assert.equal(repeat.summary.unchanged,2);await commitPlan(payload,repeat);assert.equal((await loadBank()).questions.length,before+2);
 const bad=bankPayload();bad.documents[0].lessons[0].questions.push({...bad.documents[0].lessons[0].questions[0]});const errors=await importPlan(bad);assert.equal(errors.errors.length,1);await commitPlan(bad,errors,422);
 const stale=bankPayload();stale.documents[0].edition='v2';const plan=await importPlan(stale);
 await call('teacher/lessons',{method:'POST',body:{document_id:'demo11-2026-v1',chapter:'Kiểm thử',title:'Thay đổi đồng thời'},status:201});await commitPlan(stale,plan,409);
 const word={...bankPayload(),source_format:'docx',docx_reviewed:false};assert.ok((await importPlan(word)).errors.some(e=>e.location==='Word'));
 const clone=(await call('teacher/documents/version',{method:'POST',body:{id:'demo11-2026-v1',edition:'clone-2026'},status:201})).data;
 const after=(await loadBank());assert.ok(after.documents.find(d=>d.id===clone.id&&d.parent_id==='demo11-2026-v1'));assert.equal(after.questions.filter(q=>q.document_id===clone.id).length,10);
});

test('v0.2: replacing a class preserves identities in earlier sessions and student payloads omit answer sources',async()=>{
 const bank=(await loadBank()),q=bank.questions.find(q=>q.lesson_id==='d11-b1'&&q.original_number===1);
 const session=(await call('teacher/sessions',{method:'POST',body:{title:'Roster frozen',question_ids:[q.id],classroom_id:'demo-11a1',minutes:15,mode:'online'},status:201})).data;
 const payload={kind:'roster',mode:'replace',classrooms:[{id:'demo-11a1',label:'11A1',grade:11,school_year:'2026-2027',is_sample:true,students:[{ordinal:1,name:'Học sinh đã cập nhật'},{ordinal:99,name:'Học sinh mới 99'}]}]};
 const p=await importPlan(payload);assert.equal(p.errors.length,0);assert.equal(p.summary.updated,1);assert.equal(p.summary.archived,11);await commitPlan(payload,p);
 const old=(await call('teacher/session?id='+session.id)).data;assert.equal(old.roster.length,12);assert.equal(old.roster[0].name,'Học sinh minh họa 01');
 const a=(await call('public/join',{method:'POST',body:{code:session.code,ordinal:1},status:201})).data;assert.equal(a.student.name,'Học sinh minh họa 01');assert.ok(!('roster_snapshot'in a.session));
 assert.ok(a.questions.every(q=>!('source'in q)&&!('source_json'in q)&&!('correct'in q)&&!('solution'in q)));
 await call('public/lookup',{method:'POST',body:{code:session.code,ordinal:99},status:404});
 const fresh=(await call('teacher/sessions',{method:'POST',body:{title:'Roster current',question_ids:[q.id],classroom_id:'demo-11a1',minutes:15,mode:'online'},status:201})).data;
 assert.equal((await call('public/lookup',{method:'POST',body:{code:fresh.code,ordinal:99}})).data.name,'Học sinh mới 99');
 const invalid={kind:'roster',classrooms:[{label:'LỚP LỖI',grade:11,school_year:'2026-2027',is_sample:true,students:[{ordinal:1,name:'A'},{ordinal:1,name:'B'}]}]};const errors=await importPlan(invalid);assert.equal(errors.errors.length,1);await commitPlan(invalid,errors,422);
});

test('v0.2: demo access cannot write/read real data; custom password rotates all earlier cookies',async()=>{
 const passwordCookie=cookie,demo=await call('teacher/demo',{method:'POST',body:{}}),demoCookie=demo.response.headers.get('set-cookie').split(';')[0];
 const payload={kind:'roster',mode:'merge',classrooms:[{label:'12-REAL-TEST',grade:12,school_year:'2026-2027',is_sample:false,students:[{ordinal:1,name:'Synthetic real-mode fixture'}]}]};
 const p=await importPlan(payload);cookie=demoCookie;await commitPlan(payload,p,428);cookie=passwordCookie;await commitPlan(payload,p);
 await call('teacher/demo',{method:'POST',body:{},status:403});cookie=demoCookie;await call('teacher/bootstrap',{status:401});cookie=passwordCookie;
 const changed=await call('teacher/password',{method:'POST',body:{old_password:'test-password',new_password:'updated-test-password'}});const updated=changed.response.headers.get('set-cookie').split(';')[0];await call('teacher/bootstrap',{status:401});cookie=updated;assert.equal((await loadBank()).auth.custom_password,true);
 await call('teacher/login',{method:'POST',body:{password:'test-password'},status:401});await call('teacher/login',{method:'POST',body:{password:'updated-test-password'}});
 const output=JSON.stringify((await call('teacher/export')).data);assert.ok(!output.includes('updated-test-password'));assert.ok(!output.includes('password_hash'));
});

test('v0.3: versioned writes reject stale saves; teacher-approved device change preserves answers and revokes the old token',async()=>{
 const bank=(await loadBank()),q=bank.questions.find(q=>q.kind==='mcq'&&!q.archived_at);
 const session=(await call('teacher/sessions',{method:'POST',body:{title:'Device recovery',question_ids:[q.id],classroom_id:'demo-11a1',minutes:15,mode:'online'},status:201})).data;
 const old=(await call('public/join',{method:'POST',body:{code:session.code,ordinal:1},status:201})).data;
 assert.equal(old.save_revision,0);
 await call('public/save',{method:'POST',body:{answers:{[q.id]:'A'},expected_revision:0},token:old.token});
 const stale=await call('public/save',{method:'POST',body:{answers:{[q.id]:'B'},expected_revision:0},token:old.token,status:409});assert.equal(stale.data.code,'stale_write');assert.equal((await call('public/attempt',{token:old.token})).data.answers[q.id],'A');
 const races=await Promise.all(['B','C'].map(answer=>handleApi(new Request('http://test.local/api/public/save',{method:'POST',headers:{Authorization:'Bearer '+old.token,'Content-Type':'application/json'},body:JSON.stringify({answers:{[q.id]:answer},expected_revision:1})}))));
 assert.deepEqual(races.map(r=>r.status).sort(),[200,409]);const saved=(await call('public/attempt',{token:old.token})).data;assert.equal(saved.save_revision,2);
 await call('teacher/device-reset',{method:'POST',body:{attempt_id:old.id}});
 await call('public/attempt',{token:old.token,status:401});await call('public/submit',{method:'POST',body:{},token:old.token,status:401});
 const fresh=(await call('public/join',{method:'POST',body:{code:session.code,ordinal:1},status:201})).data;
 assert.equal(fresh.id,old.id);assert.notEqual(fresh.token,old.token);assert.deepEqual(fresh.answers,saved.answers);assert.equal(fresh.session.closes_at,old.session.closes_at);assert.equal(fresh.save_revision,2);
 await call('public/join',{method:'POST',body:{code:session.code,ordinal:1},status:409});
 assert.equal((await call('public/heartbeat',{method:'POST',body:{},token:fresh.token})).data.state,'open');
 const report=(await call('teacher/session?id='+session.id)).data;assert.ok(report.attempts[0].last_seen_at>0);assert.ok(!('token'in report.attempts[0]));
 await call('teacher/close',{method:'POST',body:{id:session.id}});
 const ended=(await call('public/heartbeat',{method:'POST',body:{},token:fresh.token})).data;assert.ok(ended.attempt.submitted_at);
 await call('teacher/device-reset',{method:'POST',body:{attempt_id:fresh.id},status:409});
});

test('v0.3: 12–4–6 scoring is validated and frozen per session',async()=>{
 const bank=(await loadBank());
 const chosen=['mcq','tf','short'].flatMap((kind,i)=>bank.questions.filter(q=>q.kind===kind&&!q.archived_at).slice(0,[12,4,6][i]));assert.equal(chosen.length,22);
 await call('teacher/sessions',{method:'POST',body:{title:'Bad scoring structure',question_ids:chosen.slice(1).map(q=>q.id),classroom_id:'demo-11a1',minutes:15,mode:'online',scoring_mode:'exam-1246'},status:400});
 const s=(await call('teacher/sessions',{method:'POST',body:{title:'Exact 12-4-6',question_ids:chosen.map(q=>q.id),classroom_id:'demo-11a1',minutes:15,mode:'online',scoring_mode:'exam-1246'},status:201})).data;
 const a=(await call('public/join',{method:'POST',body:{code:s.code,ordinal:1},status:201})).data;assert.equal(a.session.scoring_mode,'exam-1246');
 const answers=Object.fromEntries(chosen.map(q=>[q.id,q.correct]));await call('public/save',{method:'POST',body:{answers,expected_revision:0},token:a.token});assert.equal((await call('public/submit',{method:'POST',body:{},token:a.token})).data.score,10);
 const partial=(await call('public/join',{method:'POST',body:{code:s.code,ordinal:99},status:201})).data;
 const tf=chosen.filter(q=>q.kind==='tf');const partialAnswers=Object.fromEntries(tf.map((q,i)=>[q.id,q.correct.map((v,j)=>j<=i?v:!v)]));
 await call('public/save',{method:'POST',body:{answers:partialAnswers,expected_revision:0},token:partial.token});assert.equal((await call('public/submit',{method:'POST',body:{},token:partial.token})).data.score,1.85);
});

test('v0.3: 40 simulated clients join, save and submit through the HTTP gateway without duplicate attempts or lost scores',async t=>{
 const {createServer}=await import('node:http'),{createGateway}=await import('../scripts/lan-gateway.mjs');
 const bank=(await loadBank()),chosen=['mcq','tf','short'].map(kind=>bank.questions.find(q=>q.kind===kind&&!q.archived_at));
 db.prepare('INSERT INTO classrooms(id,label,grade,school_year,is_sample) VALUES(?,?,?,?,?)').run('load-class','Synthetic 40',11,'2026-2027',1);
 for(let i=1;i<=41;i++)db.prepare('INSERT INTO students(id,classroom_id,ordinal,name) VALUES(?,?,?,?)').run('load-student-'+i,'load-class',i,'Synthetic student '+i);
 const s=(await call('teacher/sessions',{method:'POST',body:{title:'HTTP load fixture',question_ids:chosen.map(q=>q.id),classroom_id:'load-class',minutes:15,mode:'online'},status:201})).data;
 const upstream=createServer(async(req,res)=>{try{const chunks=[];for await(const c of req)chunks.push(c);const body=Buffer.concat(chunks);const response=await handleApi(new Request('http://'+req.headers.host+req.url,{method:req.method,headers:req.headers,...(body.length?{body}: {})}));res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));}catch(e){res.writeHead(500);res.end(String(e));}});
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));const gateway=createGateway({targetPort:upstream.address().port});await new Promise(r=>gateway.listen(0,'127.0.0.1',r));const base='http://127.0.0.1:'+gateway.address().port;
 const started=performance.now();
 async function student(route,body,token){const r=await fetch(base+'/api/public/'+route,{signal:AbortSignal.timeout(5000),method:'POST',headers:{'Content-Type':'application/json',Origin:base,...(token?{Authorization:'Bearer '+token}:{})},body:JSON.stringify(body)});const data=await r.json();assert.ok(r.ok,JSON.stringify(data));return data;}
 try{
  const clients=await Promise.all(Array.from({length:40},(_,i)=>student('join',{code:s.code,ordinal:i+1})));assert.equal(new Set(clients.map(a=>a.id)).size,40);
  const answers=Object.fromEntries(chosen.map(q=>[q.id,q.correct]));await Promise.all(clients.map(a=>student('save',{answers,expected_revision:0},a.token)));
  const results=await Promise.all(clients.map(a=>student('submit',{},a.token)));assert.ok(results.every(a=>a.score===10&&a.submitted_at));
  const competing=await Promise.all([1,2].map(()=>fetch(base+'/api/public/join',{signal:AbortSignal.timeout(5000),method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code:s.code,ordinal:41})})));assert.deepEqual(competing.map(r=>r.status).sort(),[201,409]);
  const report=(await call('teacher/session?id='+s.id)).data;assert.equal(report.attempts.length,41);assert.equal(report.attempts.filter(a=>a.submitted_at).length,40);
  t.diagnostic('40 HTTP clients completed join/save/submit in '+Math.round(performance.now()-started)+' ms on synthetic SQLite/D1 bindings; physical Wi-Fi devices not measured.');
 }finally{gateway.closeAllConnections();await new Promise(r=>gateway.close(r));upstream.closeAllConnections();await new Promise(r=>upstream.close(r));}
});

test('v0.4: teacher reports retain frozen class identities and stored scores, expose a timestamp, and reject public access',async()=>{
 const bank=(await loadBank()),s=bank.sessions.find(s=>s.title==='Integration test');
 const before=db.prepare('SELECT score,answers FROM attempts WHERE session_id=? ORDER BY id').all(s.id);
 db.prepare('UPDATE classrooms SET label=? WHERE id=?').run('Tên lớp sau khi đổi','demo-11a1');
 const bootstrap=(await loadBank());assert.equal(bootstrap.version,'0.14.0');assert.equal(bootstrap.sessions.find(x=>x.id===s.id).class_label,'11A1');
 const report=(await call('teacher/session?id='+s.id)).data;assert.equal(report.session.class_label,'11A1');assert.ok(report.generated_at>0);assert.ok(report.attempts.every(a=>!('token' in a)));
 assert.deepEqual(db.prepare('SELECT score,answers FROM attempts WHERE session_id=? ORDER BY id').all(s.id),before);
 await call('teacher/session?id='+s.id,{auth:false,status:401});assert.equal((await call('teacher/export')).data.schema_version,3);
 db.prepare('UPDATE classrooms SET label=? WHERE id=?').run('11A1','demo-11a1');
});

test('v0.5: backup endpoints enforce teacher access and issue signed read-only previews through the API',async()=>{
 await call('teacher/backup/meta',{auth:false,status:401});await call('teacher/restore/preview',{method:'POST',body:{},auth:false,status:401});const backup=(await call('teacher/export')).data;assert.equal(backup.version,'0.14.0');assert.equal(backup.backup_format_version,2);assert.equal(backup.integrity.algorithm,'SHA-256');assert.ok(!JSON.stringify(backup).includes('password_hash'));const before=(await loadBank()),p=(await call('teacher/restore/preview',{method:'POST',body:{payload:backup}})).data;assert.equal(p.verified,true);assert.equal(p.summary.counts.attempts,backup.attempts.length);assert.ok(p.preview_token);assert.deepEqual((await loadBank()).questions,before.questions);await call('teacher/restore/commit',{method:'POST',body:{payload:backup,...p,confirmed:false,confirmation:'PHUC HOI'},status:400});await call('teacher/restore/preview',{method:'POST',body:{payload:backup},origin:'https://other.example',status:403});
});

test('v0.8: staff onboarding, separate capabilities, session ownership and live revocation', async () => {
 const admin=cookie;
 const post=(route,body,status=200)=>call(route,{method:'POST',body,status});
 const key=r=>r.response.headers.get('set-cookie').split(';')[0];
 const create=async (username,classes)=>{
  const account={username,display_name:'Giáo viên kiểm thử '+username,enabled:true,permissions:{},
   temporary_password:'temporary-test-pass-2026',allowed_class_ids:classes};
  return (await post('teacher/accounts',account,201)).data.id;
 };
 async function finishSetup(username,ids){
  cookie=key(await post('teacher/login',{username,password:'temporary-test-pass-2026'}));
  const initial=(await call('teacher/bootstrap')).data;
  assert.equal(initial.auth.role,'teacher');
  assert.equal(initial.auth.setup_required,true);
  assert.deepEqual(initial.classrooms,[]);
  await call('teacher/exams',{status:403});
  const temporary=cookie;
  cookie=key(await post('teacher/password',{old_password:'temporary-test-pass-2026',new_password:'new-test-staff-pass-2026'}));
  const renewed=cookie;
  cookie=temporary;await call('teacher/bootstrap',{status:401});cookie=renewed;
  await post('teacher/profile',{class_ids:['demo-12a8']},403);
  await post('teacher/profile',{class_ids:ids});
  const active=(await call('teacher/bootstrap')).data;
  assert.equal(active.auth.setup_required,false);
  assert.deepEqual(active.classrooms.map(room=>room.id).sort(),[...ids].sort());
  assert.deepEqual(active.documents,[]);
  assert.deepEqual(active.students,[]);
  assert.deepEqual(active.sessions,[]);
  return cookie;
 }
 try{
  const bank=await loadBank();
  const question=bank.questions.find(q=>q.kind==='mcq'&&!q.archived_at);
  const settings={title:'Đề chung kiểm thử',mode:'online',minutes:15,scoring_mode:'practice',question_ids:[question.id],visibility:'team'};
  const exam=(await post('teacher/exams',settings,201)).data.id;
  const teacherA=await create('staff-a',['demo-11a1','demo-11a8']);
  const teacherB=await create('staff-b',['demo-11a1']);
  const privateAdmin=(await call('teacher/accounts')).data.accounts;
  assert.ok(privateAdmin.every(account=>!Object.keys(account).some(k=>['password_hash','password_salt','auth_epoch','temporary_password'].includes(k))));
  await post('teacher/demo',{},403);

  const a=await finishSetup('STAFF-A',['demo-11a1']);
  const personal=(await call('teacher/profile')).data;
  assert.deepEqual(personal.classes.map(c=>c.id).sort(),['demo-11a1','demo-11a8']);
  assert.ok((await call('teacher/exams')).data.exams.every(e=>!('questions' in e)&&!('snapshot' in e)));
  for(const route of ['teacher/accounts','teacher/bank','teacher/export','teacher/classroom-summary?classroom_id=demo-11a1']){
   await call(route,{status:403});
  }
  for(const route of ['teacher/exams','teacher/sessions','teacher/sessions/clone','teacher/questions','teacher/import/preview','teacher/exams/archive','teacher/bank/variant']){
   await post(route,settings,403);
  }
  await post('teacher/exams/assign',{exam_id:exam,classroom_id:'demo-11a8'},403);
  const session=(await post('teacher/exams/assign',{exam_id:exam,classroom_id:'demo-11a1'},201)).data;
  const joined=(await post('public/join',{code:session.code,ordinal:1},201)).data;
  assert.equal(joined.session.owner_teacher_id,undefined);
  const report=(await call('teacher/session?id='+session.id)).data;
  assert.equal(report.session.owner_teacher_id,teacherA);
  assert.equal(report.questions[0].id,question.id);
  assert.deepEqual((await call('teacher/bootstrap')).data.sessions.map(s=>s.id),[session.id]);

  cookie=admin;
  const b=await finishSetup('staff-b',['demo-11a1']);
  await call('teacher/session?id='+session.id,{status:404});
  for(const route of ['teacher/extend','teacher/close','teacher/device-reset','teacher/grade-free']){
   await post(route,{id:session.id,attempt_id:joined.id,minutes:5,fraction:1,question_id:question.id},404);
  }
  assert.deepEqual((await call('teacher/bootstrap')).data.sessions,[]);
  cookie=admin;
  assert.equal((await call('teacher/session?id='+session.id)).data.session.id,session.id);
  const update=async (id,change)=>{
   const {accounts}=(await call('teacher/accounts')).data;
   const record=accounts.find(account=>account.id===id);
   return post('teacher/accounts',{...record,...change});
  };
  await update(teacherA,{permissions:{author_exams:true,manage_rosters:true}});
  cookie=a;
  await call('teacher/bank');
  await post('teacher/questions',{},403);
  await post('teacher/import/preview',{payload:{kind:'bank'}},403);
  const foreign={kind:'roster',classrooms:[{id:'demo-11a8',label:'11A8',school_year:'2026-2027',grade:11,is_sample:true,students:[{ordinal:1,name:'Synthetic student'}]}]};
  await post('teacher/import/preview',{payload:foreign},403);
  const scoped=(await call('teacher/classroom-summary?classroom_id=demo-11a1')).data;
  assert.deepEqual(scoped.sessions.map(s=>s.id),[session.id]);
  const roster={kind:'roster',classrooms:[{label:'11NEW-TEST',school_year:'2026-2027',grade:11,students:[{ordinal:1,name:'Synthetic student'}]}]};
  const preview=await importPlan(roster);
  assert.deepEqual(preview.errors,[]);
  await commitPlan(roster,preview);
  assert.ok((await call('teacher/bootstrap')).data.classrooms.some(c=>c.label==='11NEW-TEST'));
  const ownedExam=(await post('teacher/exams',{...settings,title:'Đề do giáo viên soạn'},201)).data.id;
  await post('teacher/exams/archive',{id:exam,archived:true},404);
  await post('teacher/exams/archive',{id:ownedExam,archived:true});
  await post('teacher/close',{id:session.id});

  cookie=admin;
  await update(teacherA,{allowed_class_ids:['demo-11a8'],permissions:{edit_bank:true}});
  cookie=a;
  await call('teacher/session?id='+session.id,{status:404});
  await post('teacher/exams',settings,403);
  await post('teacher/render',{source:{original_number:1,kind:'short',prompt:'2+2 bằng bao nhiêu?',choices:[],correct:'4',solution:'4'}});
  await post('teacher/profile',{class_ids:['demo-11a8']});
  assert.deepEqual((await call('teacher/bootstrap')).data.classrooms.map(room=>room.id),['demo-11a8']);

  cookie=admin;
  await update(teacherB,{enabled:false});
  cookie=b;
  await call('teacher/bootstrap',{status:401});
  await post('teacher/login',{username:'staff-b',password:'new-test-staff-pass-2026'},401);
  cookie=admin;
  const backup=(await call('teacher/export')).data;
  assert.ok(backup.sessions.some(s=>s.id===session.id&&s.owner_teacher_id===teacherA));
  assert.ok(!JSON.stringify(backup).includes('password_hash'));
 }finally{cookie=admin;}
});

test('v0.13: library privacy covers the list, original file, permission, and trash recovery', async () => {
 const admin = cookie;
 const post = (route, body, status = 200) => call(route, {method:'POST', body, status});
 async function createStaff(username, upload_library) {
  cookie = admin;
  await post('teacher/accounts',{username,display_name:username,temporary_password:'temporary-upload-test-2026',
   allowed_class_ids:['demo-11a1'],permissions:{upload_library}},201);
  const login = await post('teacher/login',{username,password:'temporary-upload-test-2026'});
  cookie = login.response.headers.get('set-cookie').split(';')[0];
  const changed = await post('teacher/password',{old_password:'temporary-upload-test-2026',new_password:'updated-upload-test-2026'});
  cookie = changed.response.headers.get('set-cookie').split(';')[0];
  await post('teacher/profile',{class_ids:['demo-11a1']});
  return cookie;
 }
 const fileBytes = '<!doctype html><title>Minh họa</title><p>' + 'Kiểm thử.'.repeat(40_000) + '</p>';
 async function upload(status, {chapter = 6, bytes = fileBytes, filename = 'Minh họa.html', origin = 'http://test.local'} = {}) {
  const request = new Request(`http://test.local/api/teacher/library?grade=12&chapter=${chapter}&visibility=private`,{
   method:'POST',headers:{cookie,Origin:origin,'X-File-Name':encodeURIComponent(filename),'X-Title':encodeURIComponent('Học liệu thử')},body:bytes,
  });
  const response = await handleApi(request);
  const data = await response.json();
  assert.equal(response.status,status,JSON.stringify(data));
  if (status === 403) assert.equal(request.bodyUsed,true,'Consume a denied upload before returning the response');
  return data.item;
 }
 async function view(item, status, method = 'GET', auth = cookie) {
  const response = await handleApi(new Request('http://test.local'+item.url,{method,headers:{cookie:auth}}));
  assert.equal(response.status,status);
  return response;
 }
 const library = async () => (await call('teacher/library')).data.items;
 const change = async (item, action, extra = {}, status = 200) =>
   (await post('teacher/library/change',{id:item.id,revision:item.upload.revision,action,...extra},status)).data.item;
 try {
  const owner = await createStaff('library-author',true), colleague = await createStaff('library-reader',false);
  await upload(403);
  cookie = owner;
  await upload(400,{chapter:7});
  await upload(403,{origin:'https://other.example'});
  await upload(415,{filename:'disguised.png'});
  await upload(413,{bytes:'x'.repeat(5_000_001)});
  const item = await upload(201);
  assert.equal(item.chapterNumber,6);
  assert.equal(item.upload.visibility,'private');
  assert.equal((await library()).find(row=>row.id===item.id).upload.owned,true);
  await view(item,401,'GET','');
  await view(item,404,'GET',colleague);
  await view(item,404,'GET',admin);
  const head = await view(item,200,'HEAD');
  assert.equal(Number(head.headers.get('content-length')),Buffer.byteLength(fileBytes));
  const response = await view(item,200);
  assert.match(response.headers.get('content-security-policy'),/sandbox allow-scripts/);
  assert.doesNotMatch(response.headers.get('content-security-policy'),/allow-same-origin/);
  assert.match(response.headers.get('cache-control'),/no-store/);
  assert.equal(await response.text(),fileBytes);

  const shared = await change(item,'visibility',{visibility:'team'});
  cookie = colleague;
  const visible = (await library()).find(row=>row.id===item.id);
  assert.ok(visible);
  assert.equal(visible.upload.canManage,false);
  await view(shared,200);
  await change(shared,'trash',{},404);
  cookie = owner;
  await change(item,'trash',{},409);
  const trashed = await change(shared,'trash');
  assert.ok(trashed.upload.deletedAt);
  await view(trashed,404);
  cookie = colleague;
  assert.ok(!(await library()).some(row=>row.id===item.id));
  await view(trashed,404);
  cookie = owner;
  const restored = await change(trashed,'restore');
  assert.equal(restored.upload.deletedAt,null);
  assert.equal(restored.upload.visibility,'team');
  await view(restored,200,'GET',colleague);
  cookie = admin;
  const moderated = await change(restored,'trash');
  cookie = owner;
  const privateAgain = await change(moderated,'restore');
  assert.equal(privateAgain.upload.visibility,'private');
  await view(privateAgain,404,'GET',colleague);
  assert.equal((await call('teacher/bootstrap')).data.auth.permissions.upload_library,true);
 } finally { cookie = admin; }
});

test('v0.14: only the owner can read a private draft, shared exams can be copied, and account writes are audited', async () => {
 const admin = cookie;
 const post = (route, body, status=200) => call(route,{method:'POST',body,status});
 const session = result => result.response.headers.get('set-cookie').split(';')[0];
 const teacher = async username => {
  cookie = admin;
  const created = await post('teacher/accounts',{username,display_name:username,enabled:true,
   permissions:{author_exams:true},allowed_class_ids:['demo-11a1'],temporary_password:'temporary-private-2026'},201);
  cookie = session(await post('teacher/login',{username,password:'temporary-private-2026'}));
  cookie = session(await post('teacher/password',{old_password:'temporary-private-2026',new_password:'updated-private-2026'}));
  await post('teacher/profile',{class_ids:['demo-11a1']});
  return {id:created.data.id, cookie};
 };
 const exams = async () => (await call('teacher/exams')).data.exams;
 const assign = (exam_id,status=201) => post('teacher/exams/assign',{exam_id,classroom_id:'demo-11a1'},status);
 try {
  const author = await teacher('draft-author'), colleague = await teacher('draft-colleague');
  cookie = author.cookie;
  const q = (await loadBank()).questions.find(item=>item.kind==='mcq'&&!item.archived_at);
  const {data:{id}}=await post('teacher/exams',{title:'Nháp riêng',minutes:15,mode:'online',question_ids:[q.id]},201);
  const draft=(await exams()).find(exam=>exam.id===id);
  assert.equal(draft.visibility,'private');
  assert.equal(draft.owned,true);
  await call('teacher/accounts/audit',{status:403});

  for (const auth of [admin,colleague.cookie]) {
   cookie=auth;
   assert.ok(!(await exams()).some(exam=>exam.id===id));
   await assign(id,404);
   await post('teacher/exams',{source_exam_id:id},404);
   await post('teacher/exams/archive',{id,archived:true},404);
  }
  cookie=author.cookie;
  await post('teacher/exams/details',{id,revision:draft.revision,title:'Nháp riêng đã sửa',minutes:20});
  await post('teacher/exams/visibility',{id,revision:draft.revision,visibility:'team'},409);
  const edited=(await exams()).find(exam=>exam.id===id);
  await post('teacher/exams/visibility',{id,revision:edited.revision,visibility:'team'});
  cookie=colleague.cookie;
  assert.equal((await exams()).find(exam=>exam.id===id).owned,false);
  const copied=(await post('teacher/exams',{source_exam_id:id,title:'Bản sao của tôi',minutes:25},201)).data.id;
  assert.equal((await exams()).find(exam=>exam.id===copied).visibility,'private');
  const assigned=(await assign(copied)).data.id;
  assert.equal((await call('teacher/session?id='+assigned)).data.questions[0].id,q.id);
  await post('teacher/close',{id:assigned});

  cookie=author.cookie;
  assert.ok(!(await exams()).some(exam=>exam.id===copied));
  const shared=(await exams()).find(exam=>exam.id===id);
  await post('teacher/exams/visibility',{id,revision:shared.revision,visibility:'private'});
  cookie=colleague.cookie;
  await assign(id,404);

  cookie=admin;
  const before=(await call('teacher/accounts')).data.accounts.find(account=>account.id===colleague.id);
  await post('teacher/accounts',{...before,allowed_class_ids:['demo-11a8'],enabled:false,
   permissions:{author_exams:false,upload_library:true},temporary_password:'rotated-private-2026'});
  await post('teacher/accounts',{...before,enabled:true},409);
  const history=(await call('teacher/accounts/audit')).data.events.filter(event=>event.account_id===colleague.id);
  assert.deepEqual(history.map(event=>event.actions),[['permissions','classes','locked','password_reset'],['created']]);
  assert.ok(!JSON.stringify(history).includes('rotated-private-2026'));
 } finally {cookie=admin;}
});

test('Studio plans synchronize by teacher and classroom and respect library access', async () => {
 const admin = cookie;
 const classroomA = 'plan-class-a', classroomB = 'plan-class-b';
 const insertClass = db.prepare("INSERT INTO classrooms VALUES (?, ?, 12, '2026-2027', 1)");
 insertClass.run(classroomA, '12 Kế hoạch A');
 insertClass.run(classroomB, '12 Kế hoạch B');
 const monty = '12-monty-hall-game-577dcd0';
 const practice = 'all-de-cuong-toan-10-11-12-dcfe2d2';
 const simulation = '12-phong-thi-nghiem-1-so-bai-thuc-t-3f2a9d7';
 const wrongGrade = '11-giaoan-sp1-adc1846';
 const resourceId = () => 'upload-' + crypto.randomUUID();
 const sharedUpload = resourceId(), privateUpload = resourceId(), trashedUpload = resourceId();
 const post = (route, body, status=200) => call(route,{method:'POST',body,status});
 const session = result => result.response.headers.get('set-cookie').split(';')[0];
 async function teacher(username, classes) {
  cookie = admin;
  const {data:{id}} = await post('teacher/accounts',{username,display_name:username,permissions:{upload_library:true},
   allowed_class_ids:classes,temporary_password:'temporary-plan-2026'},201);
  cookie = session(await post('teacher/login',{username,password:'temporary-plan-2026'}));
  cookie = session(await post('teacher/password',{old_password:'temporary-plan-2026',new_password:'updated-plan-2026'}));
  await post('teacher/profile',{class_ids:classes});
  return {id,cookie,username};
 }
 async function plan(staff, room, change, status=200) {
  const response = await handleApi(new Request('http://test.local/api/teacher/studio-plan' + (change ? '' : '?classroom_id='+room), {
   method:change ? 'POST' : 'GET', headers:{cookie:staff.cookie, ...(change && {'Content-Type':'application/json'})},
   ...(change && {body:JSON.stringify({account_id:staff.id,classroom_id:room,...change})}),
  }));
  const data = await response.json();
  assert.equal(response.status,status,JSON.stringify(data));
  assert.equal(response.headers.get('cache-control'),'no-store');
  return data;
 }
 const add = resource_id => ({action:'add',resource_id});
 const remove = resource_id => ({action:'remove',resource_id});
 const seed = resource_ids => ({action:'import',resource_ids});
 const ids = async (staff,room) => (await plan(staff,room)).resource_ids;
 try {
  const author = await teacher('plan-author',[classroomA,classroomB]);
  const colleague = await teacher('plan-colleague',[classroomA]);
  const authorOnAnotherDevice = {...author,cookie:session(await post('teacher/login',{username:author.username,password:'updated-plan-2026'}))};
  const upload = db.prepare(`INSERT INTO library_uploads(id,owner_key,title,grade,chapter_number,visibility,mime,filename,byte_length,created_at,deleted_at)
   VALUES (?,?,'Học liệu mẫu',12,6,?,'text/html','mau.html',30,1,?)`);
  upload.run(sharedUpload,colleague.id,'team',null);
  upload.run(privateUpload,colleague.id,'private',null);
  upload.run(trashedUpload,colleague.id,'team',1);

  await plan({cookie:''},classroomA,null,401);
  await plan(colleague,classroomB,null,403);
  await plan(colleague,classroomB,add(monty),403);
  await plan(author,classroomA,{...add(monty),account_id:colleague.id},409);
  assert.equal((await plan(author,classroomA)).exists,false);
  await plan(author,classroomA,add(wrongGrade),404);
  await plan(author,classroomA,add(privateUpload),404);
  await plan(author,classroomA,add(trashedUpload),404);
  assert.equal((await plan(author,classroomA)).exists,false);

  const imported = await plan(author,classroomA,seed([monty,monty,wrongGrade,privateUpload,trashedUpload,'missing']));
  assert.deepEqual(imported.resource_ids,[monty]);
  assert.deepEqual(await ids(authorOnAnotherDevice,classroomA),[monty]);
  assert.deepEqual(await ids(colleague,classroomA),[]);
  assert.deepEqual(await ids({cookie:admin},classroomA),[]);

  await Promise.all([
   plan(author,classroomA,add(sharedUpload)),
   plan(authorOnAnotherDevice,classroomA,add(practice)),
   plan(author,classroomB,add(simulation)),
  ]);
  const before = await ids(authorOnAnotherDevice,classroomA);
  assert.equal(before[0],monty);
  assert.deepEqual(new Set(before),new Set([monty,sharedUpload,practice]));
  assert.deepEqual((await plan(author,classroomA,add(monty))).resource_ids,before);
  assert.deepEqual(await ids(author,classroomB),[simulation]);
  assert.deepEqual((await plan(author,classroomA,seed([simulation]))).resource_ids,before);

  cookie=colleague.cookie;
  const revoked=(await post('teacher/library/change',{id:sharedUpload,revision:1,action:'visibility',visibility:'private'})).data.item;
  assert.deepEqual(await ids(author,classroomA),[monty,practice]);
  await plan(author,classroomA,add(sharedUpload),404);
  await post('teacher/library/change',{id:sharedUpload,revision:revoked.upload.revision,action:'visibility',visibility:'team'});
  assert.deepEqual(await ids(author,classroomA),before);

  for (const id of before) await plan(authorOnAnotherDevice,classroomA,remove(id));
  const empty = await plan(author,classroomA,seed([monty]));
  assert.equal(empty.exists,true);
  assert.deepEqual(empty.resource_ids,[]);
  assert.deepEqual(await ids(author,classroomB),[simulation]);
  cookie = admin;
  const {data:{accounts}} = await call('teacher/accounts');
  await post('teacher/accounts',{...accounts.find(a=>a.id===author.id),allowed_class_ids:[classroomA]});
  await plan(author,classroomB,null,403);
 } finally {cookie=admin;}
});
