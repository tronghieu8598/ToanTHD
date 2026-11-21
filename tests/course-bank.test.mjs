import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,writeFileSync,mkdtempSync,readdirSync,rmSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';import path from 'node:path';import {pathToFileURL} from 'node:url';
import ts from 'typescript';
import {readCourseBank,courseBankSQL} from '../scripts/course-bank-data.mjs';
import {decodeQuestion,canAutoGrade,courseRowPayload} from '../lib/course-bank.mjs';
import {buildQuestionVariant,questionVariantKeys} from '../lib/question-variants.mjs';
import {availableQuestionVariantKeys,resolveQuestionVariant} from '../lib/accepted-variants.mjs';
import chapterIndex from '../lib/chapter-variants/index.mjs';
import {sha256,validateBackup} from '../lib/backup-model.mjs';
import {PREVIOUS_COURSE_ROW_FINGERPRINTS} from '../lib/course-previous.mjs';
import {layoutMathHtml} from '../lib/client/math-display.mjs';
const bundle=readCourseBank(),db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');
for(const n of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())db.exec(readFileSync(new URL('../drizzle/'+n,import.meta.url),'utf8'));
db.exec(readFileSync(new URL('../data/demo-seed.sql',import.meta.url),'utf8'));for(const sql of courseBankSQL(bundle))db.exec(sql);
const statement=(sql,args=[])=>({bind(...v){return statement(sql,v);},async first(){return db.prepare(sql).get(...args)??null;},async all(){return {results:db.prepare(sql).all(...args)};},async run(){const p=db.prepare(sql);if(p.columns().length)return {results:p.all(...args)};const r=p.run(...args);return {success:true,meta:{changes:Number(r.changes)}};}});
const env={DB:{prepare:statement,async batch(stmts){db.exec('BEGIN');try{const r=[];for(const s of stmts)r.push(await s.run());db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}}},AUTH_SECRET:'course-bank-test-secret',TEACHER_PASSWORD:'private-course-test-password',DEMO_MODE:'true'};
globalThis[Symbol.for('course.test.env')]=env;const temp=mkdtempSync(path.join(tmpdir(),'toanthd-course-'));
let code=ts.transpileModule(readFileSync(new URL('../lib/api.ts',import.meta.url),'utf8'),{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.ES2022}}).outputText;
code=code.replace(/import\s*\{\s*env\s*\}\s*from\s*['"]cloudflare:workers['"];?/,"const env=globalThis[Symbol.for('course.test.env')];").replace(/(['"])(\.\/[^'"]+\.mjs)\1/g,(_,quote,module)=>JSON.stringify(new URL('../lib/'+module.slice(2),import.meta.url).href));
const file=path.join(temp,'api.mjs');writeFileSync(file,code);const {handleApi}=await import(pathToFileURL(file).href);delete globalThis[Symbol.for('course.test.env')];
let cookie='';async function call(route,{body,status=200,auth=true,token}={}){const r=await handleApi(new Request('http://test.local/api/'+route,{method:body?'POST':'GET',headers:{...(auth&&cookie?{cookie}:{}),...(body?{'Content-Type':'application/json'}:{}),...(token?{Authorization:'Bearer '+token}:{})},...(body?{body:JSON.stringify(body)}:{})}));const d=await r.json();assert.equal(r.status,status,route+': '+JSON.stringify(d).slice(0,500));return {data:d,response:r};}
test.after(()=>{db.close();rmSync(temp,{recursive:true,force:true});});
test('Vietnamese MathML text and overlines display with the bundled math font',()=>{
 const vector=bundle.questions.find(q=>q.id==='dc-10-hk1-4H1-q039-v4');
 const repaired=layoutMathHtml(vector.solution);
 assert.doesNotMatch(repaired, />ˋ<\/mo>/u);
 assert.match(repaired, /<mtext[^>]*>\s*cùng\s+hướng<\/mtext>/u);
 assert.match(repaired, /class="math-scroll math-scroll-block"/);
 const statistics=bundle.questions.find(q=>q.id==='dc-10-hk1-5TK1-q001-v4');
 assert.match(statistics.solution, />‾<\/mo>/u);
 assert.match(layoutMathHtml(statistics.solution), />̅<\/mo>/u);
});
test('v0.6: all 5,837 original identities, 75 lessons, answer keys, assets and review flags survive an idempotent installation',async()=>{
 const m=bundle.manifest;assert.deepEqual(Object.fromEntries(Object.entries(m.summary.by_grade).map(([g,v])=>[g,v.total])),{10:2118,11:2681,12:1038});assert.equal(m.lessons.length,75);assert.equal(m.summary.by_status.auto,4653);assert.equal(m.summary.by_status.review,111);assert.equal(m.summary.by_status.reference,1073);
 assert.equal(db.prepare('SELECT COUNT(*) n FROM questions').get().n,5867);
 const before=db.prepare("SELECT prompt FROM questions WHERE id='q11-1'").get();for(const sql of courseBankSQL(bundle))db.exec(sql);assert.equal(db.prepare('SELECT COUNT(*) n FROM questions').get().n,5867);if(before)assert.deepEqual(db.prepare("SELECT prompt FROM questions WHERE id='q11-1'").get(),before);
 const ids=new Set(),refs=new Set();for(const q of bundle.questions){assert.ok(!ids.has(q.id));ids.add(q.id);assert.equal(q.bank_fingerprint,await sha256(courseRowPayload(q)));assert.equal(JSON.parse(q.bank_meta).sourceNumber,q.original_number);assert.equal(canAutoGrade(decodeQuestion(q)),q.bank_status==='auto');for(const s of (q.prompt+q.choices+q.solution).matchAll(/\/bank-assets\/[a-f0-9]{64}\.svg/g))refs.add(s[0]);}
 for(const src of refs)assert.ok(existsSync(new URL('../public'+src,import.meta.url)),src);assert.equal(refs.size,1988);
 const conflict=bundle.questions.find(q=>q.bank_origin==='10:hk1-1D1-q045');assert.equal(conflict.bank_status,'review');assert.deepEqual(JSON.parse(conflict.correct),[false,false,true,true]);assert.match(conflict.bank_note,/không khớp/);
});
test('upgrading a bundled row preserves its archive state and refreshes its fingerprint and content',()=>{
 const q=bundle.questions.find(q=>q.bank_status==='auto');
 const archived=1700000000000;
 db.prepare('UPDATE questions SET prompt=?,bank_tex=?,bank_fingerprint=?,archived_at=?,updated_at=? WHERE id=?')
  .run('Nội dung đã đóng gói cũ','Nguồn cũ',PREVIOUS_COURSE_ROW_FINGERPRINTS.get(q.id),archived,archived,q.id);
 for(const sql of courseBankSQL(bundle))db.exec(sql);
 const stored=db.prepare('SELECT prompt,bank_tex,bank_fingerprint,archived_at,updated_at FROM questions WHERE id=?').get(q.id);
 assert.equal(stored.prompt,q.prompt);
 assert.equal(stored.bank_tex,null);
 assert.equal(stored.bank_fingerprint,q.bank_fingerprint);
 assert.equal(stored.archived_at,archived);
 assert.equal(stored.updated_at,archived);
 db.prepare('UPDATE questions SET archived_at=NULL,updated_at=0 WHERE id=?').run(q.id);
});
test('v0.6: bootstrap stays small; paged filters retain grade/document/lesson/numbers and separate manual/free questions',async()=>{
 await call('teacher/bank',{auth:false,status:401});assert.equal((await call('public/meta')).data.demo_available,true);
 const login=await call('teacher/demo',{body:{}});cookie=login.response.headers.get('set-cookie').split(';')[0];
 const boot=(await call('teacher/bootstrap')).data;assert.equal(boot.questions.length,0);assert.equal(boot.question_count,5867);assert.ok(JSON.stringify(boot).length<100000);assert.equal(boot.documents.filter(d=>d.is_bundled).length,6);
 const all=(await call('teacher/bank?grade=10')).data;assert.equal(all.total,2128);assert.equal(all.questions.length,20);assert.ok(all.questions.every(q=>q.grade===10));
 const second=(await call('teacher/bank?grade=10&page=2')).data;assert.ok(second.questions.every(q=>!all.questions.some(a=>a.id===q.id)));
 const builtIn=(await call('teacher/bank?grade=10&course=1')).data;assert.equal(builtIn.total,2118);
 const numbered=await call('teacher/bank?grade=12&course=1&chapter='+encodeURIComponent('Xác suất có điều kiện')+'&q='+encodeURIComponent('Câu 1'));
 assert.equal(numbered.data.total,2);
 assert.ok(numbered.data.questions.every(q=>q.original_number===1));
 const smart=await call('teacher/bank/select',{body:{mode:'all',grade:12,course:'1',chapter:'Xác suất có điều kiện',q:'Câu 1',status:'auto'}});
 assert.deepEqual(smart.data.questions.map(q=>q.id),numbered.data.questions.map(q=>q.id));
 const filtered=(await call('teacher/bank?grade=11&document_id=dc-11-hk1-v4&lesson_id=dc-11-hk1-1D1-v4&from=45&to=55&kind=mcq')).data;assert.ok(filtered.questions.every(q=>q.lesson_id==='dc-11-hk1-1D1-v4'&&q.original_number>=45&&q.original_number<=55&&q.kind==='mcq'));
 assert.equal((await call('teacher/bank?grade=10&status=review')).data.total,39);assert.equal((await call('teacher/bank?grade=11&kind=free')).data.total,573);
 const accented=(await call('teacher/bank?grade=10&q='+encodeURIComponent('mệnh đề'))).data,ascii=(await call('teacher/bank?grade=10&q=menh%20de')).data;assert.equal(accented.total,ascii.total);assert.ok(ascii.total>0);
 const source=(await call('teacher/bank/export?document_id=dc-12-hk2-v4')).data;assert.equal(source.is_bundled,true);assert.ok(source.questions.every(q=>q.prompt&&Array.isArray(q.choices)&&!('bank_tex' in q)));assert.equal(source.questions.length,bundle.questions.filter(q=>q.lesson_id.startsWith('dc-12-hk2-')).length);
 const privateLogin=await call('teacher/login',{body:{password:env.TEACHER_PASSWORD}});cookie=privateLogin.response.headers.get('set-cookie').split(';')[0];
});
test('v0.6: only gradable questions enter sessions; answer keys stay teacher-only; alternate source answers are respected',async()=>{
 const choose=kind=>decodeQuestion(bundle.questions.find(q=>q.kind===kind&&q.bank_status==='auto'));
 const chosen=['mcq','tf'].map(choose),short=decodeQuestion(bundle.questions.find(q=>q.bank_origin==='12:hk2-4D3-q058'));chosen.push(short);
 for(const q of [bundle.questions.find(q=>q.bank_status==='review'),bundle.questions.find(q=>q.kind==='free')])await call('teacher/sessions',{body:{title:'Must reject',question_ids:[q.id],classroom_id:'demo-11a1',minutes:15,mode:'online'},status:400});
 const s=(await call('teacher/sessions',{body:{title:'Đề cương thật',question_ids:chosen.map(q=>q.id),classroom_id:'demo-11a1',minutes:15,mode:'online'},status:201})).data;
 const attempt=(await call('public/join',{body:{code:s.code,ordinal:1},status:201})).data;
 for(const q of attempt.questions)for(const k of ['correct','solution','source','source_json','bank_tex','bank_meta','accepted_answers','bank_note','bank_fingerprint'])assert.ok(!(k in q),k);
 assert.deepEqual(attempt.questions.map(q=>q.original_number),chosen.map(q=>q.original_number));
 const answers=Object.fromEntries(chosen.map(q=>[q.id,q.id===short.id?'6300000':q.correct]));await call('public/save',{body:{answers,expected_revision:0},token:attempt.token});assert.equal((await call('public/submit',{body:{},token:attempt.token})).data.score,10);
 await call('teacher/close',{body:{id:s.id}});
 await call('teacher/questions',{body:{id:chosen[0].id,lesson_id:chosen[0].lesson_id,expected_revision:1,source:{}},status:400});
});
test('v0.6: compact bank backups restore archive flags and scores without losing the bundled bank or inflating JSON',async()=>{
 const backup=(await call('teacher/export')).data;assert.equal(backup.backup_format_version,2);assert.equal(backup.questions.filter(q=>q.course_ref).length,5837);assert.ok(Buffer.byteLength(JSON.stringify(backup))<3000000);
 const bankRefs=backup.questions.filter(q=>q.course_ref);assert.ok(bankRefs.every(q=>!('prompt'in q)&&!('bank_tex'in q)));
 const q=bundle.questions.find(q=>q.bank_status==='auto');await call('teacher/questions/archive',{body:{id:q.id,archived:true}});assert.ok(db.prepare('SELECT archived_at FROM questions WHERE id=?').get(q.id).archived_at);
 const preview=(await call('teacher/restore/preview',{body:{payload:backup}})).data;assert.equal(preview.summary.counts.questions,5867);
 const result=(await call('teacher/restore/commit',{body:{payload:backup,...preview,confirmed:true,confirmation:'PHUC HOI'}})).data;assert.equal(result.ok,true);assert.equal(db.prepare('SELECT archived_at FROM questions WHERE id=?').get(q.id).archived_at,null);assert.equal(db.prepare('SELECT COUNT(*) n FROM questions').get().n,5867);assert.equal(db.prepare('SELECT score FROM attempts').get().score,10);
 const cp=(await call('teacher/backup/checkpoint?id='+result.checkpoint_id)).data;assert.ok(cp.questions.find(x=>x.id===q.id).archived_at);
 const tampered=structuredClone(backup);tampered.questions.find(q=>q.course_ref).course_ref='0'.repeat(64);delete tampered.integrity;tampered.integrity={algorithm:'SHA-256',digest:await sha256(tampered)};await call('teacher/restore/preview',{body:{payload:tampered},status:422});
 await assert.rejects(validateBackup(backup),/đề cương/);
 const legacy=structuredClone(backup);
 legacy.version='0.6.1';
 for(const q of legacy.questions.filter(q=>q.course_ref))q.course_ref=PREVIOUS_COURSE_ROW_FINGERPRINTS.get(q.id);
 delete legacy.integrity;
 legacy.integrity={algorithm:'SHA-256',digest:await sha256(legacy)};
 const legacyPreview=(await call('teacher/restore/preview',{body:{payload:legacy}})).data;
 assert.ok(legacyPreview.warnings.some(w=>w.includes('Tham chiếu đề cương cũ')));
 const legacyRestore=(await call('teacher/restore/commit',{body:{payload:legacy,...legacyPreview,confirmed:true,confirmation:'PHUC HOI'}})).data;
 assert.equal(legacyRestore.ok,true);
 assert.equal(db.prepare('SELECT score FROM attempts').get().score,10);
 const old=structuredClone(backup);old.questions=old.questions.filter(q=>!q.course_ref);old.documents=old.documents.filter(d=>!d.id.startsWith('dc-'));old.lessons=old.lessons.filter(l=>!l.id.startsWith('dc-'));old.sessions=[];old.session_questions=[];old.attempts=[];delete old.integrity;delete old.backup_format_version;old.version='0.5.0';
 const earlier=(await call('teacher/restore/preview',{body:{payload:old}})).data;assert.equal(earlier.summary.counts.questions,5867);assert.ok(earlier.warnings.some(w=>w.includes('giữ lại')));
});
test('v0.6 upgrades: smart 12-4-6 selector, review key resolution, session extension, session cloning, free-question grading and classroom summary',async()=>{
 // 1. Smart 12-4-6 and number range selection
 const picked1246=(await call('teacher/bank/select',{body:{mode:'exam-1246',grade:'11',document_id:'dc-11-hk1-v4'}})).data.questions;
 assert.equal(picked1246.length,22);
 assert.deepEqual(['mcq','tf','short'].map(k=>picked1246.filter(q=>q.kind===k).length),[12,4,6]);
 const pickedNums=(await call('teacher/bank/select',{body:{mode:'numbers',grade:'10',document_id:'dc-10-hk1-v4',lesson_id:'dc-10-hk1-1D1-v4',numbers_spec:'20-25, 30'}})).data.questions;
 assert.ok(pickedNums.length>=5);assert.ok(pickedNums.every(q=>[20,21,22,23,24,25,30].includes(q.original_number)));

 // 2. Review key resolution unlocks question for auto-grading without breaking course_ref
 const reviewQ=bundle.questions.find(q=>q.bank_origin==='10:hk1-1D1-q045');
 const resolved=(await call('teacher/questions/resolve-key',{body:{id:reviewQ.id,correct:[true,false,true,true]}})).data.question;
 assert.equal(resolved.bank_status,'auto');assert.equal(resolved.verified_override,true);
 const revSession=(await call('teacher/sessions',{body:{title:'Phiên câu đã duyệt',question_ids:[reviewQ.id],classroom_id:'demo-11a1',minutes:10,mode:'online'},status:201})).data;
 await call('teacher/close',{body:{id:revSession.id}});
 const resetRes=(await call('teacher/questions/resolve-key',{body:{id:reviewQ.id,reset:true}})).data.question;
 assert.equal(resetRes.bank_status,'review');

 // 3. Session extension & session cloning
 const ext=(await call('teacher/extend',{body:{id:revSession.id,minutes:5}})).data;
 assert.equal(ext.ok,true);assert.equal(ext.minutes,15);
 const cloned=(await call('teacher/sessions/clone',{body:{session_id:revSession.id,classroom_id:'demo-11a8',title:'Nhân bản sang 11A8',minutes:20},status:201})).data;
 assert.ok(cloned.id&&cloned.code);
 await call('teacher/close',{body:{id:revSession.id}});await call('teacher/close',{body:{id:cloned.id}});

 // 4. Free-response question workflow & manual grading
 const mcqQ=decodeQuestion(bundle.questions.find(q=>q.kind==='mcq'&&q.bank_status==='auto'));
 const freeQ=decodeQuestion(bundle.questions.find(q=>q.kind==='free'));
 const freeSession=(await call('teacher/sessions',{body:{title:'Đề hỗn hợp có tự luận',question_ids:[mcqQ.id,freeQ.id],classroom_id:'demo-11a1',minutes:15,mode:'online',allow_free:true},status:201})).data;
 const stAttempt=(await call('public/join',{body:{code:freeSession.code,ordinal:2},status:201})).data;
 await call('public/save',{body:{answers:{[mcqQ.id]:mcqQ.correct,[freeQ.id]:'Em giải ra x = 2'},expected_revision:0},token:stAttempt.token});
 const subBefore=(await call('public/submit',{body:{},token:stAttempt.token})).data;
 assert.equal(subBefore.score,5); // 1/2 from MCQ, 0/2 from ungraded free question
 const graded=(await call('teacher/grade-free',{body:{attempt_id:stAttempt.id,question_id:freeQ.id,fraction:0.75}})).data;
 assert.equal(graded.score,8.75); // (1 + 0.75) / 2 * 10 = 8.75
 await call('teacher/close',{body:{id:freeSession.id}});

 // 5. Classroom gradebook summary
 const summary=(await call('teacher/classroom-summary?classroom_id=demo-11a1')).data;
 assert.equal(summary.classroom.id,'demo-11a1');
 assert.ok(summary.sessions.length>=2);
 const st2=summary.rows.find(r=>r.student.ordinal===2);
 assert.equal(st2.submitted_count,1);assert.equal(st2.mean_score,8.75);
});

const pilotLesson='dc-12-hk1-1D3-v4';
const numericSlots=html=>[...html.matchAll(/<mn>(\d+)<\/mn>/g)].map(match=>Number(match[1]));
const withoutNumbers=html=>html.replace(/<mn>\d+<\/mn>/g,'<mn>#</mn>');
const lastNumber=html=>numericSlots(html).at(-1);

test('v0.9: all 40 reviewed variants change only numeric slots and have valid mathematics',()=>{
 const approved=bundle.questions.filter(q=>q.lesson_id===pilotLesson).map(q=>decodeQuestion(q))
  .filter(q=>[2,16,34,50,51].includes(q.original_number)&&questionVariantKeys(q).length);
 assert.deepEqual(approved.map(q=>q.original_number),[2,16,34,50,51]);
 for(const original of approved){
  const keys=questionVariantKeys(original);
  assert.equal(keys.length,8);
  assert.equal(buildQuestionVariant(original,'tc1-2-99'),null);
  assert.deepEqual(questionVariantKeys({...original,verified_override:true}),[]);
  assert.deepEqual(questionVariantKeys({...original,archived_at:1}),[]);
  assert.deepEqual(questionVariantKeys({...original,prompt:original.prompt.replace(/<mn>\d+<\/mn>/,'<mn>99</mn>')}),[]);
  const answers=[];
  for(const key of keys){
   const q=buildQuestionVariant(original,key);
   assert.equal(q.id,original.id);
   assert.equal(q.kind,original.kind);
   assert.equal(q.original_number,original.original_number);
   assert.notEqual(q.prompt,original.prompt);
   assert.equal(withoutNumbers(q.prompt),withoutNumbers(original.prompt));
   assert.equal(withoutNumbers(q.solution),withoutNumbers(original.solution));
   assert.deepEqual(q.choices.map(c=>withoutNumbers(c.text)),original.choices.map(c=>withoutNumbers(c.text)));
   assert.deepEqual(q.accepted_answers,[]);
   assert.equal(q.variant.key,key);
   const inputs=numericSlots(q.prompt);
   const values=q.choices.map(c=>numericSlots(c.text));
   if(q.original_number===2){
    const [constant,coefficient,shift]=inputs;
    const pole=shift/coefficient;
    assert.ok(Number.isInteger(pole)&&pole+constant>0);
    const truths=[
     values[0][0]/values[0][1]===pole,
     -values[1][0]/values[1][1]===1/coefficient,
     values[2][0]/values[2][1]===1/coefficient,
     values[3][0]===pole,
    ];
    assert.deepEqual(truths,[false,false,true,false]);
    assert.equal(q.correct,'C');
    answers.push(1/coefficient);
   }else if(q.original_number===16){
    const [constant]=inputs;
    const squares=[values[0][0]**2,values[1][0],values[2][0]**2,values[3][0]**2*values[3][1]];
    assert.equal(new Set(squares).size,4);
    const x=2;
    const product=Math.abs(x)*Math.abs((x+constant)/x-1);
    assert.equal(squares[2],product**2);
    assert.equal(q.correct,'C');
    assert.equal(lastNumber(q.solution),product);
    answers.push(product);
   }else if(q.original_number===34){
    const [a,constant,shift]=inputs;
    assert.notEqual(a+constant,0);
    const choices=[values[0][0],-values[1][0],values[2][0],values[3][0]];
    assert.equal(new Set(choices).size,4);
    assert.equal(choices[3],a-shift);
    assert.equal(q.correct,'D');
    assert.equal(lastNumber(q.solution),a-shift);
    answers.push(choices[3]);
   }else if(q.original_number===50){
    const [constant,pole,,height]=inputs;
    assert.notEqual(height*pole+constant,0);
    assert.equal(Number(q.correct),height);
    assert.equal(lastNumber(q.solution),height);
    answers.push(height);
   }else{
    const [constant,shift,pole,numerator,denominator]=inputs;
    const b=shift/pole;
    const a=b*numerator/denominator;
    assert.ok(Number.isInteger(a)&&Number.isInteger(b)&&a*pole+constant!==0);
    assert.equal(Number(q.correct),a+b);
    assert.equal(lastNumber(q.solution),a+b);
    answers.push(a+b);
   }
  }
  assert.equal(new Set(answers).size,8);
 }
});

test('v0.10: the six added templates keep numeric slots, poles, quotient and distractors consistent',()=>{
 const approved=bundle.questions.filter(q=>q.lesson_id===pilotLesson).map(q=>decodeQuestion(q))
  .filter(q=>questionVariantKeys(q).length);
 assert.deepEqual(approved.map(q=>q.original_number),[2,3,8,10,11,12,16,17,34,50,51]);
 for(const original of approved.filter(q=>[3,8,10,11,12,17].includes(q.original_number))){
  const keys=questionVariantKeys(original),prompts=new Set();
  assert.equal(keys.length,8);
  for(const changed of [
   {...original,revision:2},
   {...original,bank_fingerprint:'0'.repeat(64)},
   {...original,verified_override:true},
   {...original,archived_at:1},
   {...original,solution:original.solution.replace(/<mn>\d+<\/mn>/,'<mn>99</mn>')},
  ])assert.deepEqual(questionVariantKeys(changed),[]);
  for(const key of keys){
   const q=buildQuestionVariant(original,key);
   assert.equal(q.correct,original.correct);
   assert.notEqual(q.prompt,original.prompt);
   assert.equal(withoutNumbers(q.prompt),withoutNumbers(original.prompt));
   assert.equal(withoutNumbers(q.solution),withoutNumbers(original.solution));
   assert.deepEqual(q.choices.map(c=>withoutNumbers(c.text)),original.choices.map(c=>withoutNumbers(c.text)));
   prompts.add(q.prompt);
   const input=numericSlots(q.prompt),options=q.choices.map(c=>numericSlots(c.text));
   if(q.original_number===3){
    const [a,b,,square]=input,pole=Math.sqrt(square);
    assert.ok(Number.isInteger(pole)&&a*pole>b);
    assert.deepEqual(options.map(v=>v[0]),[2,1,4,3]);
    assert.equal(lastNumber(q.solution),3);
   }else if(q.original_number===17){
    const [,sum,product,,square]=input,pole=Math.sqrt(square),other=product/pole;
    assert.ok(Number.isInteger(pole)&&other>pole);
    assert.equal(sum,pole+other);
    assert.equal(((-pole)**2-sum*(-pole)+product),2*pole*(pole+other));
    const [numerator,denominator]=numericSlots(q.solution).slice(-5,-3);
    assert.equal(numerator/denominator,(other-pole)/(2*pole));
    if(pole===2&&other===4)assert.deepEqual([numerator,denominator],[1,2]);
    assert.deepEqual(options.map(v=>v[0]),[2,3,0,1]);
   }else{
    let quadratic,linear,constant,denominator,shift,lines;
    if(q.original_number===8){
     const [a,,b,c,d,e]=input;
     [quadratic,linear,constant,denominator,shift]=[-a,-b,-c,d,-e];
     lines=[[-options[0][0],options[0][1]],[-options[1][0],options[1][1]],[-options[2][0],-options[2][1]],[-options[3][0],-options[3][1]]];
    }else if(q.original_number===10){
     const [a,,b,c,d,e]=input;
     [quadratic,linear,constant,denominator,shift]=[a,-b,-c,-d,-e];
     lines=[[options[0][0]/options[0][1],1],[-1,-options[1][0]/options[1][1]],[options[2][0]/options[2][1],-1],[-1,options[3][0]/options[3][1]]];
    }else if(q.original_number===11){
     const [a,,b,c,e]=input;
     [quadratic,linear,constant,denominator,shift]=[-a,-b,-c,-1,-e];
     lines=[[-options[0][0],-options[0][1]],[-options[1][0],options[1][1]],[options[2][0],options[2][1]],[options[3][0],-options[3][1]]];
    }else{
     const [a,,c,d,e]=input;
     [quadratic,linear,constant,denominator,shift]=[a,1,-c,d,e];
     lines=[[-options[0][0]/options[0][1],options[0][2]/options[0][3]],[options[1][0]/options[1][1],options[1][2]/options[1][3]],[-options[2][0]/options[2][1],-options[2][2]/options[2][3]],[options[3][0]/options[3][1],-options[3][2]/options[3][3]]];
    }
    const slope=quadratic/denominator,intercept=(linear-slope*shift)/denominator;
    const remainder=constant-intercept*shift;
    assert.ok(Math.abs(remainder)>1e-9);
    assert.equal(new Set(lines.map(v=>JSON.stringify(v))).size,4);
    assert.deepEqual(lines.map(([m,n])=>Math.abs(m-slope)<1e-9&&Math.abs(n-intercept)<1e-9),[false,false,false,true]);
   }
  }
  assert.equal(prompts.size,8);
 }
});

test('v0.9: creating and assigning a saved exam freezes variants and grades the new answer',async()=>{
 const login=await call('teacher/login',{body:{password:env.TEACHER_PASSWORD}});
 cookie=login.response.headers.get('set-cookie').split(';')[0];
 const filter='teacher/bank?lesson_id='+pilotLesson;
 const bank=(await call(filter+'&from=1&to=2')).data.questions;
 assert.equal(bank[0].variant_count,4);
 const original=bank[1];
 assert.equal(original.variant_available,true);
 const short=(await call(filter+'&from=50&to=50')).data.questions[0];
 assert.equal(short.variant_available,true);
 const generate=(id,previous_key)=>call('teacher/bank/variant',{body:{question_id:id,previous_key}});
 await call('teacher/bank/variant',{body:{question_id:original.id},auth:false,status:401});
 const held=Object.keys(chapterIndex).find(id=>chapterIndex[id].count===0);
 await call('teacher/bank/variant',{body:{question_id:held},status:409});
 const first=(await generate(original.id)).data.question;
 const next=(await generate(original.id,first.variant.key)).data.question;
 assert.notEqual(next.variant.key,first.variant.key);
 // Saved selections from v0.9 still resolve after curated chapters are installed.
 const mcq=buildQuestionVariant(original,questionVariantKeys(original)[0]);
 const reply=buildQuestionVariant(short,questionVariantKeys(short)[0]);
 assert.notEqual(reply.correct,short.correct);
 const question_ids=[original.id,short.id];
 const question_variants={[original.id]:mcq.variant.key,[short.id]:reply.variant.key};
 const body={title:'Thử đề biến thể',classroom_id:'demo-12a8',minutes:15,mode:'online',question_ids,question_variants};
 await call('teacher/exams',{body:{...body,mode:'paper'},status:400});
 await call('teacher/sessions',{body:{...body,question_variants:{[short.id]:mcq.variant.key}},status:409});
 await call('teacher/sessions',{body:{...body,question_variants:{[bank[0].id]:mcq.variant.key}},status:400});
 const direct=(await call('teacher/sessions',{body,status:201})).data;
 assert.equal((await call('teacher/session?id='+direct.id)).data.questions[1].correct,reply.correct);
 await call('teacher/close',{body:{id:direct.id}});
 const saved=(await call('teacher/exams',{body,status:201})).data;
 const assigned=(await call('teacher/exams/assign',{body:{exam_id:saved.id,classroom_id:'demo-12a8'},status:201})).data;
 for(const [ordinal,answer,score] of [[1,reply.correct,10],[2,short.correct,5]]){
  const attempt=(await call('public/join',{body:{code:assigned.code,ordinal},status:201})).data;
  assert.deepEqual(attempt.questions.map(q=>q.id),question_ids);
  assert.deepEqual(attempt.questions.map(q=>q.prompt),[mcq.prompt,reply.prompt]);
  for(const q of attempt.questions){
   assert.ok(!('variant' in q)&&!('correct' in q)&&!('solution' in q));
  }
  await call('public/save',{body:{answers:{[mcq.id]:mcq.correct,[reply.id]:answer},expected_revision:0},token:attempt.token});
  assert.equal((await call('public/submit',{body:{},token:attempt.token})).data.score,score);
 }
 await call('teacher/close',{body:{id:assigned.id}});
 const report=(await call('teacher/session?id='+assigned.id)).data;
 assert.deepEqual(report.questions.map(q=>q.variant),[mcq.variant,reply.variant]);
 assert.deepEqual(report.questions.map(q=>q.solution),[mcq.solution,reply.solution]);
 const clone=(await call('teacher/sessions/clone',{body:{session_id:assigned.id,classroom_id:'demo-11a8'},status:201})).data;
 assert.deepEqual((await call('teacher/session?id='+clone.id)).data.questions,report.questions);
 await call('teacher/close',{body:{id:clone.id}});
 const backup=(await call('teacher/export')).data;
 const courseRows=db.prepare('SELECT id,bank_fingerprint AS course_ref,archived_at,updated_at FROM questions WHERE bank_fingerprint IS NOT NULL').all();
 const restored=await validateBackup(backup,{courseRows});
 const snapshot=restored.tables.session_questions.find(q=>q.session_id===assigned.id&&q.source_id===reply.id);
 assert.deepEqual(JSON.parse(snapshot.snapshot).variant,reply.variant);
 assert.equal(JSON.parse(snapshot.snapshot).correct,reply.correct);
 const unchanged=(await call(filter+'&from=50&to=50')).data.questions[0];
 assert.equal(unchanged.prompt,short.prompt);
 assert.equal(unchanged.correct,short.correct);
});

test('v0.10: added variants survive saved exams, assignment, grading, cloning and backup validation',async()=>{
 const login=await call('teacher/login',{body:{password:env.TEACHER_PASSWORD}});
 cookie=login.response.headers.get('set-cookie').split(';')[0];
 const originals=[],variants=[];
 for(const number of [3,8,10,11,12,17]){
  const filter='teacher/bank?lesson_id='+pilotLesson+'&from='+number+'&to='+number;
  const original=(await call(filter)).data.questions[0];
  assert.equal(original.variant_available,true);
  originals.push(original);
  const first=(await call('teacher/bank/variant',{body:{question_id:original.id}})).data.question;
  const next=(await call('teacher/bank/variant',{body:{question_id:original.id,previous_key:first.variant.key}})).data.question;
  assert.notEqual(next.variant.key,first.variant.key);
  assert.notEqual(next.prompt,first.prompt);
  variants.push(next);
 }
 const question_ids=originals.map(q=>q.id);
 const body={
  title:'Sáu mẫu tạo sinh Chương I',classroom_id:'demo-12a8',minutes:15,mode:'online',
  question_ids,question_variants:Object.fromEntries(variants.map(q=>[q.id,q.variant.key])),
 };
 const direct=(await call('teacher/sessions',{body,status:201})).data;
 assert.deepEqual((await call('teacher/session?id='+direct.id)).data.questions.map(q=>q.prompt),variants.map(q=>q.prompt));
 await call('teacher/close',{body:{id:direct.id}});
 const saved=(await call('teacher/exams',{body,status:201})).data;
 const session=(await call('teacher/exams/assign',{body:{exam_id:saved.id,classroom_id:'demo-12a8'},status:201})).data;
 for(const [ordinal,right,score] of [[1,true,10],[2,false,0]]){
  const attempt=(await call('public/join',{body:{code:session.code,ordinal},status:201})).data;
  assert.deepEqual(attempt.questions.map(q=>q.prompt),variants.map(q=>q.prompt));
  for(const q of attempt.questions){
   assert.ok(!('correct' in q)&&!('solution' in q)&&!('variant' in q));
  }
  const answers=Object.fromEntries(variants.map(q=>[q.id,right?q.correct:q.correct==='A'?'B':'A']));
  await call('public/save',{body:{answers,expected_revision:0},token:attempt.token});
  assert.equal((await call('public/submit',{body:{},token:attempt.token})).data.score,score);
 }
 await call('teacher/close',{body:{id:session.id}});
 const report=(await call('teacher/session?id='+session.id)).data;
 for(const field of ['prompt','choices','correct','solution','variant']){
  assert.deepEqual(report.questions.map(q=>q[field]),variants.map(q=>q[field]));
 }
 const clone=(await call('teacher/sessions/clone',{body:{session_id:session.id,classroom_id:'demo-11a8'},status:201})).data;
 assert.deepEqual((await call('teacher/session?id='+clone.id)).data.questions,report.questions);
 await call('teacher/close',{body:{id:clone.id}});
 const backup=(await call('teacher/export')).data;
 const courseRows=db.prepare('SELECT id,bank_fingerprint AS course_ref,archived_at,updated_at FROM questions WHERE bank_fingerprint IS NOT NULL').all();
 const restored=await validateBackup(backup,{courseRows});
 for(const expected of variants){
  const entry=restored.tables.session_questions.find(q=>q.session_id===session.id&&q.source_id===expected.id);
  assert.deepEqual(JSON.parse(entry.snapshot).variant,expected.variant);
  const bankRow=decodeQuestion(db.prepare('SELECT * FROM questions WHERE id=?').get(expected.id));
  assert.equal(bankRow.prompt,originals.find(q=>q.id===expected.id).prompt);
 }
});

test('all six chapters and independently approved review-source variants survive assignment and backup',async()=>{
 const login=await call('teacher/login',{body:{password:env.TEACHER_PASSWORD}});
 cookie=login.response.headers.get('set-cookie').split(';')[0];
 const originals=[],variants=[];
 for(const chapter of ['12-C01','12-C02','12-C03','12-C04','12-C05','12-C06']){
  for(const kind of ['mcq','tf','short']){
   const row=bundle.questions.find(q=>chapterIndex[q.id]?.chapter===chapter && q.kind===kind && q.bank_status==='auto' &&
    availableQuestionVariantKeys(decodeQuestion(q)).length && db.prepare('SELECT revision,archived_at FROM questions WHERE id=?').get(q.id)?.revision===1);
   assert.ok(row,`${chapter} has an eligible ${kind} question`);
   const q=decodeQuestion(row),key=availableQuestionVariantKeys(q)[2];
   const response=(await call('teacher/bank/variant',{body:{question_id:q.id,variant_key:key}})).data;
   assert.equal(response.question.variant.key,key);assert.equal(response.variants.length,4);
   originals.push(q);variants.push(response.question);
  }
 }
 const review=bundle.questions.filter(q=>q.bank_status==='review' && availableQuestionVariantKeys(decodeQuestion(q)).some(key=>key.startsWith('cv-')));
 assert.ok(review.length>0);
 for(const row of review){
  const q=decodeQuestion(row);
  await call('teacher/exams',{body:{title:'Câu gốc chưa duyệt',minutes:15,mode:'online',question_ids:[q.id]},status:400});
  originals.push(q);variants.push(await resolveQuestionVariant(q,availableQuestionVariantKeys(q)[0]));
 }
 const free=decodeQuestion(bundle.questions.find(q=>q.kind==='free' && availableQuestionVariantKeys(decodeQuestion(q)).length));
 const freeVariant=await resolveQuestionVariant(free,availableQuestionVariantKeys(free)[0]);
 await call('teacher/exams',{body:{title:'Tự luận',minutes:15,mode:'online',question_ids:[free.id],question_variants:{[free.id]:freeVariant.variant.key}},status:400});
 await call('teacher/exams',{body:{title:'Tự luận',minutes:15,mode:'online',allow_free:true,question_ids:[free.id],question_variants:{[free.id]:freeVariant.variant.key}},status:201});
 const body={title:'Toán 12 chương I–VI',minutes:20,mode:'online',question_ids:variants.map(q=>q.id),question_variants:Object.fromEntries(variants.map(q=>[q.id,q.variant.key]))};
 const saved=(await call('teacher/exams',{body,status:201})).data;
 const session=(await call('teacher/exams/assign',{body:{exam_id:saved.id,classroom_id:'demo-12a8'},status:201})).data;
 const attempt=(await call('public/join',{body:{code:session.code,ordinal:1},status:201})).data;
 for(const q of attempt.questions)for(const key of ['correct','solution','variant','accepted_answers'])assert.ok(!(key in q));
 assert.deepEqual(attempt.questions.map(q=>q.prompt),variants.map(q=>q.prompt));
 await call('public/save',{body:{answers:Object.fromEntries(variants.map(q=>[q.id,q.correct])),expected_revision:0},token:attempt.token});
 assert.equal((await call('public/submit',{body:{},token:attempt.token})).data.score,10);
 await call('teacher/close',{body:{id:session.id}});
 const backup=(await call('teacher/export')).data;
 const courseRows=db.prepare('SELECT id,bank_fingerprint AS course_ref,archived_at,updated_at FROM questions WHERE bank_fingerprint IS NOT NULL').all();
 const restored=await validateBackup(backup,{courseRows});
 for(const v of variants){
  const snap=JSON.parse(restored.tables.session_questions.find(q=>q.session_id===session.id&&q.source_id===v.id).snapshot);
  for(const key of ['prompt','solution','correct','variant'])assert.deepEqual(snap[key],v[key]);
  const original=originals.find(q=>q.id===v.id),stored=decodeQuestion(db.prepare('SELECT * FROM questions WHERE id=?').get(v.id));
  assert.deepEqual(stored.correct,original.correct);assert.equal(stored.bank_status,original.bank_status);
 }
});
