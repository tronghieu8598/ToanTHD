import {isCourseDocument,bankSearch} from './course-bank.mjs';
import {normalizeSource,normalizeName,text} from './content.mjs';
import {can,canUseClass} from './access.mjs';
export const currentBankSQL=`SELECT q.*,l.title AS lesson_title,l.chapter,l.document_id,d.title AS document_title,d.edition,d.grade,d.is_sample FROM questions q JOIN lessons l ON l.id=q.lesson_id JOIN documents d ON d.id=l.document_id WHERE NOT EXISTS(SELECT 1 FROM questions newer WHERE newer.family_id=COALESCE(q.family_id,q.id) AND newer.revision>q.revision) AND NOT EXISTS(SELECT 1 FROM questions newer WHERE newer.family_id IS NULL AND newer.id=COALESCE(q.family_id,q.id) AND newer.revision>q.revision)`;
const year=s=>normalizeName(s,30).replace(/[–—/]/g,'-');
const sample=v=>v===true||v===1;
const id=()=>crypto.randomUUID();
const digest=async v=>[...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(v))))].map(n=>n.toString(16).padStart(2,'0')).join('');
export async function handleAdmin(path,request,c){
 const {all,first,database,must,json,readBody,auth,authTools}=c;
 const revision=async()=>Number((await first('SELECT COALESCE(MAX(revision),0) AS n FROM mutation_log'))?.n||0);
 const log=(r,summary)=>auth.role==='teacher'
  ?database().prepare(`INSERT INTO mutation_log(id,revision,created_at,summary)
    VALUES(?,?,?,CASE WHEN EXISTS(SELECT 1 FROM teacher_accounts WHERE id=? AND revision=? AND enabled=1) THEN ? ELSE NULL END)`)
    .bind(id(),r+1,Date.now(),auth.id,auth.account.revision,summary)
  :database().prepare('INSERT INTO mutation_log(id,revision,created_at,summary) VALUES(?,?,?,?)').bind(id(),r+1,Date.now(),summary);
 const batch=async(statements,r,summary)=>{
  try{await database().batch([log(r,summary),...statements]);}
  catch(e){
   if(/UNIQUE constraint failed|NOT NULL constraint failed: mutation_log.summary/.test(String(e.message)))must(false,'Dữ liệu hoặc quyền vừa thay đổi. Xem trước hoặc tải lại rồi thử lại.',409);
   throw e;
  }
 };
 const real=async value=>{if(!sample(value))await authTools.requireReal(auth);};
 const sqlQuestion=(q,lessonId,previous)=>{
  const newId=id(),family=previous?.family_id||previous?.id||newId,rev=previous?Number(previous.revision)+1:1;
  const {source,rendered:r}=normalizeSource(q);
  const statements=[];
  if(previous)statements.push(database().prepare('UPDATE questions SET archived_at=? WHERE id=?').bind(Date.now(),previous.id));
  statements.push(database().prepare('INSERT INTO questions(id,lesson_id,original_number,revision,kind,prompt,choices,correct,solution,family_id,source_json,archived_at,updated_at,bank_search) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(newId,lessonId,r.original_number,rev,r.kind,r.prompt,JSON.stringify(r.choices),JSON.stringify(r.correct),r.solution,family,JSON.stringify(source),null,Date.now(),bankSearch([source.prompt,...source.choices.map(c=>c.text),r.original_number].join(' '))));
  return {statements,id:newId,revision:rev};
 };
 async function planImport(raw){
  must(raw&&typeof raw==='object','Nội dung nhập không hợp lệ.');
  must(raw.kind==='bank'||raw.kind==='roster','Loại nhập cần là bank hoặc roster.');
  must(can(auth,raw.kind==='bank'?'edit_bank':'manage_rosters'),'Tài khoản chưa được cấp quyền cho loại dữ liệu này.',403);
  const baseRevision=await revision();
  const statements=[],errors=[],rows=[],canonical={kind:raw.kind,mode:raw.mode||'merge',source_format:raw.source_format||'structured',docx_reviewed:raw.docx_reviewed===true,documents:[],classrooms:[]};let hasReal=false;
  const summary={created:0,updated:0,unchanged:0,archived:0,documents:0,classrooms:0};

  let row=0;
  if(raw.kind==='bank'){
   const [knownDocs,knownLessons,knownQuestions]=await Promise.all([
    all('SELECT * FROM documents'),all('SELECT * FROM lessons'),
    all(currentBankSQL.replace('q.*,','q.id,q.lesson_id,q.original_number,q.revision,q.family_id,q.source_json,q.archived_at,')),
   ]);
   must(Array.isArray(raw.documents)&&raw.documents.length>0&&raw.documents.length<=30,'Cần từ 1 đến 30 tài liệu trong mỗi lần nhập.');const docKeys=new Set();
   for(const input of raw.documents){
    try{
     const doc={title:normalizeName(input.title),grade:Number(input.grade),edition:normalizeName(input.edition,80),is_sample:sample(input.is_sample)};
     must([10,11,12].includes(doc.grade),'Khối cần là 10, 11 hoặc 12.');const key=JSON.stringify([doc.grade,doc.title,doc.edition]);must(!docKeys.has(key),'Tài liệu/phiên bản bị lặp trong cùng file.');docKeys.add(key);
     const old=knownDocs.find(d=>d.grade===doc.grade&&d.title===doc.title&&d.edition===doc.edition),docId=old?.id||id();
     must(!old||!isCourseDocument(old.id),'Đề cương tích hợp được giữ nguyên nguồn. Đổi tên tài liệu để nhập vào một bản riêng.');
     if(old&&!!old.is_sample!==doc.is_sample)throw new Error('Cờ dữ liệu minh họa không khớp với tài liệu đã có.');
     if(!doc.is_sample)hasReal=true;
     if(!old){statements.push(database().prepare('INSERT INTO documents(id,title,grade,edition,is_sample) VALUES(?,?,?,?,?)').bind(docId,doc.title,doc.grade,doc.edition,doc.is_sample?1:0));summary.documents++;}
     must(Array.isArray(input.lessons)&&input.lessons.length>0,'Tài liệu chưa có bài học.');const canonicalDoc={...doc,lessons:[]},lessonKeys=new Set();
     for(const inputLesson of input.lessons){
      const l={chapter:normalizeName(inputLesson.chapter),title:normalizeName(inputLesson.title)},lk=l.chapter+'\0'+l.title;must(!lessonKeys.has(lk),'Bài học bị lặp trong tài liệu.');lessonKeys.add(lk);
      const oldLesson=knownLessons.find(x=>x.document_id===docId&&x.chapter===l.chapter&&x.title===l.title),lessonId=oldLesson?.id||id();
      if(!oldLesson)statements.push(database().prepare('INSERT INTO lessons(id,document_id,chapter,title) VALUES(?,?,?,?)').bind(lessonId,docId,l.chapter,l.title));
      const cl={...l,questions:[]},numbers=new Set();must(Array.isArray(inputLesson.questions),'Danh sách câu hỏi không hợp lệ.');
      for(const source of inputLesson.questions){row++;if(row>500)throw new Error('Tối đa 500 câu mỗi lần nhập; chia file lớn thành nhiều phần.');
       try{
        const normalized=normalizeSource(source).source;must(!numbers.has(normalized.original_number),'Số câu trùng trong cùng bài và phiên bản.');numbers.add(normalized.original_number);cl.questions.push(normalized);
        const prev=knownQuestions.find(q=>q.lesson_id===lessonId&&q.original_number===normalized.original_number);
        const identical=prev&&!prev.archived_at&&prev.source_json===JSON.stringify(normalized),action=identical?'unchanged':prev?'updated':'created';
        summary[action]++;rows.push({row:source._row||row,action,number:normalized.original_number,label:l.title,description:normalized.prompt.slice(0,150)});
        if(!identical)statements.push(...sqlQuestion(normalized,lessonId,prev).statements);
       }catch(e){errors.push({row:source._row||row,location:l.title,message:e.message});}
      }
      canonicalDoc.lessons.push(cl);
     }
     canonical.documents.push(canonicalDoc);
    }catch(e){errors.push({row:row||1,location:input.title||'Tài liệu',message:e.message});}
   }
   if(raw.source_format==='docx'&&!raw.docx_reviewed)errors.push({row:0,location:'Word',message:'Cần xác nhận đã đối chiếu nội dung, hình và đáp án với file gốc.'});
   if(row===0)errors.push({row:1,location:'File',message:'Chưa có câu hỏi để nhập.'});
  }else{
   const knownClasses=await all('SELECT * FROM classrooms');
   const knownStudents=auth.role==='teacher'
    ?await all('SELECT * FROM students WHERE classroom_id IN (SELECT value FROM json_each(?))',JSON.stringify(auth.classIds))
    :await all('SELECT * FROM students');
   must(['merge','replace'].includes(canonical.mode),'Cách nhập danh sách không hợp lệ.');must(Array.isArray(raw.classrooms)&&raw.classrooms.length>0&&raw.classrooms.length<=30,'Cần từ 1 đến 30 lớp.');const classKeys=new Set();
   for(const input of raw.classrooms){
    if(input?.id)must(canUseClass(auth,input.id),'Lớp không thuộc phạm vi được cấp.',403);
    try{
     const cl={label:normalizeName(input.label,40).toUpperCase(),grade:Number(input.grade),school_year:year(input.school_year),is_sample:sample(input.is_sample)};
     must([10,11,12].includes(cl.grade),'Khối lớp cần là 10, 11 hoặc 12.');const key=cl.label+'\0'+cl.school_year;must(!classKeys.has(key),'Lớp bị lặp trong file.');classKeys.add(key);
     const old=input.id?knownClasses.find(c=>c.id===input.id):knownClasses.find(c=>c.label===cl.label&&year(c.school_year)===cl.school_year);must(!input.id||old,'Lớp cần sửa không tồn tại.');
     must(!old||canUseClass(auth,old.id),'Lớp không thuộc phạm vi được cấp.',403);
     if(old&&!!old.is_sample!==cl.is_sample)throw new Error('Cờ minh họa không khớp với lớp đã có.');
     if(!cl.is_sample)hasReal=true;const classId=old?.id||id();
     if(!old){
      statements.push(database().prepare('INSERT INTO classrooms(id,label,grade,school_year,is_sample) VALUES(?,?,?,?,?)').bind(classId,cl.label,cl.grade,cl.school_year,cl.is_sample?1:0));
      if(auth.role==='teacher')statements.push(database().prepare(`
        UPDATE teacher_accounts SET allowed_class_ids=json_insert(allowed_class_ids,'$[#]',?),
          selected_class_ids=json_insert(selected_class_ids,'$[#]',?),revision=revision+1 WHERE id=?
      `).bind(classId,classId,auth.id));
      summary.classrooms++;
     }
     else statements.push(database().prepare('UPDATE classrooms SET label=?,grade=?,school_year=? WHERE id=?').bind(cl.label,cl.grade,cl.school_year,classId));
     must(Array.isArray(input.students)&&input.students.length>0&&input.students.length<=500,'Mỗi lớp cần từ 1 đến 500 học sinh.');const numbers=new Set(),cc={...cl,students:[]};
     if(input.id)cc.id=input.id;
     for(const s of input.students){row++;
      try{
       const ordinal=Number(s.ordinal),name=normalizeName(s.name);must(Number.isInteger(ordinal)&&ordinal>=1&&ordinal<=999,'STT phải là số nguyên từ 1 đến 999.');must(!numbers.has(ordinal),'STT bị trùng trong lớp.');numbers.add(ordinal);cc.students.push({ordinal,name});
       const prev=knownStudents.find(s=>s.classroom_id===classId&&s.ordinal===ordinal),same=prev&&!prev.archived_at&&prev.name===name,action=same?'unchanged':prev?'updated':'created';summary[action]++;
       rows.push({row:s._row||row,action,number:ordinal,label:cl.label,description:prev&&prev.name!==name?prev.name+' → '+name:name});
       if(!same){if(prev)statements.push(database().prepare('UPDATE students SET name=?,archived_at=NULL WHERE id=?').bind(name,prev.id));else statements.push(database().prepare('INSERT INTO students(id,classroom_id,ordinal,name) VALUES(?,?,?,?)').bind(id(),classId,ordinal,name));}
      }catch(e){errors.push({row:s._row||row,location:cl.label,message:e.message});}
     }
     if(canonical.mode==='replace'&&old)for(const s of knownStudents.filter(s=>s.classroom_id===classId&&!s.archived_at&&!numbers.has(s.ordinal))){statements.push(database().prepare('UPDATE students SET archived_at=? WHERE id=?').bind(Date.now(),s.id));summary.archived++;rows.push({row:0,action:'archived',number:s.ordinal,label:cl.label,description:s.name});}
     canonical.classrooms.push(cc);
    }catch(e){errors.push({row:row||1,location:input.label||'Lớp',message:e.message});}
   }
  }
  must(baseRevision===await revision(),'Dữ liệu vừa thay đổi trong lúc phân tích. Xem trước lại.',409);return {statements,canonical,hasReal,preview:{summary,errors,rows,digest:await digest(canonical),revision:baseRevision}};
 }
 if(path==='teacher/password'&&request.method==='POST'){
  const cookie=await authTools.change(auth,await readBody(request),request.url);return json({ok:true},200,{'Set-Cookie':cookie});
 }
 if(path==='teacher/render'&&request.method==='POST')return json(normalizeSource((await readBody(request)).source));
 if(path==='teacher/import/preview'&&request.method==='POST'){
  const p=await planImport((await readBody(request)).payload);return json(p.preview);
 }
 if(path==='teacher/import/commit'&&request.method==='POST'){
  const body=await readBody(request),p=await planImport(body.payload);must(p.preview.errors.length===0,'Còn dòng lỗi. Sửa dữ liệu và xem trước lại.',422);must(body.digest===p.preview.digest&&body.revision===p.preview.revision,'Dữ liệu vừa thay đổi. Xem trước lại trước khi nhập.',409);if(p.hasReal)await authTools.requireReal(auth);
  if(p.statements.length)await batch(p.statements,p.preview.revision,'Nhập '+body.payload.kind);return json({ok:true,summary:p.preview.summary});
 }
 if(path==='teacher/documents'&&request.method==='POST'){
  const b=await readBody(request),title=normalizeName(b.title),edition=normalizeName(b.edition,80),grade=Number(b.grade);must([10,11,12].includes(grade),'Khối không hợp lệ.');await real(b.is_sample);
  must(!await first('SELECT id FROM documents WHERE title=? AND grade=? AND edition=?',title,grade,edition),'Đã có tài liệu với tên và phiên bản này.',409);
  const newId=id();await batch([database().prepare('INSERT INTO documents(id,title,grade,edition,is_sample) VALUES(?,?,?,?,?)').bind(newId,title,grade,edition,sample(b.is_sample)?1:0)],await revision(),'Tạo tài liệu');return json({id:newId},201);
 }
 if(path==='teacher/lessons'&&request.method==='POST'){
  const b=await readBody(request),doc=await first('SELECT * FROM documents WHERE id=?',b.document_id);must(doc,'Tài liệu không tồn tại.',404);must(!isCourseDocument(doc.id),'Đề cương tích hợp được giữ nguyên nguồn; hãy tạo tài liệu riêng.');await real(doc.is_sample);const title=normalizeName(b.title),chapter=normalizeName(b.chapter);
  must(!await first('SELECT id FROM lessons WHERE document_id=? AND title=? AND chapter=?',doc.id,title,chapter),'Bài học đã tồn tại.',409);const newId=id();await batch([database().prepare('INSERT INTO lessons(id,document_id,title,chapter) VALUES(?,?,?,?)').bind(newId,doc.id,title,chapter)],await revision(),'Tạo bài học');return json({id:newId},201);
 }
 if(path==='teacher/documents/version'&&request.method==='POST'){
  const b=await readBody(request),old=await first('SELECT * FROM documents WHERE id=?',b.id);must(old,'Tài liệu không tồn tại.',404);must(!isCourseDocument(old.id),'Đề cương tích hợp được giữ nguyên nguồn; hãy tạo tài liệu riêng.');await real(old.is_sample);const edition=normalizeName(b.edition,80);must(!await first('SELECT id FROM documents WHERE title=? AND grade=? AND edition=?',old.title,old.grade,edition),'Phiên bản này đã tồn tại.',409);
  const newId=id(),statements=[database().prepare('INSERT INTO documents(id,title,grade,edition,is_sample,parent_id) VALUES(?,?,?,?,?,?)').bind(newId,old.title,old.grade,edition,old.is_sample,old.id)];
  for(const l of await all('SELECT * FROM lessons WHERE document_id=?',old.id)){const lid=id();statements.push(database().prepare('INSERT INTO lessons(id,document_id,title,chapter) VALUES(?,?,?,?)').bind(lid,newId,l.title,l.chapter));for(const q of await all(currentBankSQL+' AND q.lesson_id=? AND q.archived_at IS NULL',l.id)){const qid=id();statements.push(database().prepare('INSERT INTO questions(id,lesson_id,original_number,revision,kind,prompt,choices,correct,solution,family_id,source_json,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?)').bind(qid,lid,q.original_number,1,q.kind,q.prompt,q.choices,q.correct,q.solution,qid,q.source_json||null,Date.now()));}}
  await batch(statements,await revision(),'Nhân bản phiên bản tài liệu');return json({id:newId},201);
 }
 if(path==='teacher/questions/history'&&request.method==='GET'){
  const q=await first('SELECT * FROM questions WHERE id=?',new URL(request.url).searchParams.get('id'));must(q,'Câu hỏi không tồn tại.',404);
  return json({questions:(await all('SELECT * FROM questions WHERE COALESCE(family_id,id)=? ORDER BY revision DESC',q.family_id||q.id)).map(q=>({...q,choices:JSON.parse(q.choices),correct:JSON.parse(q.correct),source:q.source_json?JSON.parse(q.source_json):null}))});
 }
 if(path==='teacher/questions'&&request.method==='POST'){
  const b=await readBody(request),l=await first('SELECT l.*,d.is_sample FROM lessons l JOIN documents d ON d.id=l.document_id WHERE l.id=?',b.lesson_id);must(l,'Chọn bài học hợp lệ.');must(!isCourseDocument(l.document_id),'Đề cương tích hợp được giữ nguyên nguồn; hãy tạo tài liệu riêng để soạn câu.');await real(l.is_sample);
  const normalized=normalizeSource(b.source),previous=await first('SELECT * FROM questions WHERE lesson_id=? AND original_number=? ORDER BY revision DESC LIMIT 1',l.id,normalized.source.original_number);
  if(b.id){must(previous&&previous.id===b.id&&previous.revision===b.expected_revision,'Câu vừa được sửa hoặc số câu đã thay đổi. Tải lại trước khi lưu.',409);}else must(!previous,'Số câu đã có trong bài. Mở câu đó để sửa hoặc phục hồi.',409);
  const result=sqlQuestion(normalized.source,l.id,previous);await batch(result.statements,await revision(),'Lưu phiên bản câu hỏi');return json({id:result.id,revision:result.revision},201);
 }
 if(path==='teacher/questions/archive'&&request.method==='POST'){
  const b=await readBody(request),q=(await all(currentBankSQL+' AND q.id=?',b.id))[0];must(q,'Câu hỏi đã có phiên bản mới hoặc không tồn tại.',409);await real(q.is_sample);
  await batch([database().prepare('UPDATE questions SET archived_at=? WHERE id=?').bind(b.archived?Date.now():null,q.id)],await revision(),b.archived?'Lưu trữ câu':'Phục hồi câu');return json({ok:true});
 }
 return null;
}
