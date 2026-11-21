import {validateRichHtml} from './rich-html.mjs';
import {isCourseDocument,courseRowPayload,canEnterSession} from './course-bank.mjs';
import {COURSE_ROW_FINGERPRINTS,COURSE_ROW_META} from './course-fingerprints.mjs';
import {PREVIOUS_COURSE_ROW_FINGERPRINTS} from './course-previous.mjs';
import chapterOne from '../data/course-bank/generated/12-C01.json' with {type: 'json'};
import chapterSix from '../data/course-bank/generated/12-C06.json' with {type: 'json'};
import {COURSE_METADATA} from './course-metadata.mjs';
import {normalizeSource,ValidationError} from './content.mjs';
import {numericValue,gradeAttempt,validExamStructure} from './grading.mjs';
const editedFingerprints = new Map([chapterOne,chapterSix].flatMap(chapter=>chapter.rows.map(row=>[row.id,row.bank_fingerprint])));
const currentCourseFingerprint = id => editedFingerprints.get(id) ?? COURSE_ROW_FINGERPRINTS.get(id);
export const MAX_BACKUP_BYTES=10*1024*1024;
export const BACKUP_COLUMNS={
 documents:['id','grade','title','edition','parent_id','is_sample'],lessons:['id','document_id','chapter','title'],
 questions:['id','lesson_id','original_number','revision','kind','prompt','choices','correct','solution','family_id','source_json','archived_at','updated_at','bank_status','bank_origin','bank_tex','bank_meta','bank_note','bank_search','bank_fingerprint'],
 classrooms:['id','label','grade','school_year','is_sample'],students:['id','classroom_id','ordinal','name','archived_at'],
 sessions:['id','code','title','classroom_id','mode','minutes','state','created_at','closes_at','roster_snapshot','scoring_mode','owner_teacher_id'],
 session_questions:['id','session_id','position','source_id','snapshot'],
 attempts:['id','session_id','student_id','answers','submitted_at','earned','score','updated_at','last_seen_at','save_revision','allow_rejoin']
};
export const BACKUP_TABLES=Object.keys(BACKUP_COLUMNS);
export const canonical=v=>Array.isArray(v)?'['+v.map(canonical).join(',')+']':v&&typeof v==='object'?'{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+canonical(v[k])).join(',')+'}':JSON.stringify(v);
export async function sha256(v){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(typeof v==='string'?v:canonical(v))))].map(n=>n.toString(16).padStart(2,'0')).join('');}
const check=(ok,message)=>{if(!ok)throw new ValidationError(message);};
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
function str(v,label,max=200,empty=false){check(typeof v==='string'&&v.length<=max&&(empty||v.trim().length>0)&&!v.includes('\0'),label+' không hợp lệ.');return v;}
function integer(v,label,min=0,max=Number.MAX_SAFE_INTEGER){check(Number.isSafeInteger(v)&&v>=min&&v<=max,label+' không hợp lệ.');return v;}
const timestamp=(v,label,nullable=false)=>nullable&&v==null?null:integer(v,label);
function parse(v,label){try{check(typeof v==='string',label+' phải là JSON.');return JSON.parse(v);}catch{throw new ValidationError(label+' không đọc được.');}}
function unique(rows,key,label){const seen=new Set();for(const row of rows){const k=key(row);check(!seen.has(k),label+' bị trùng.');seen.add(k);}}
export function summarizeBackup(t){return {counts:Object.fromEntries(BACKUP_TABLES.map(k=>[k,t[k].length])),has_real:t.documents.some(r=>r.is_sample===0&&!isCourseDocument(r.id))||t.classrooms.some(r=>r.is_sample===0),open_sessions:t.sessions.filter(s=>s.state==='open').length,pending_attempts:t.attempts.filter(a=>a.submitted_at==null).length,submitted:t.attempts.filter(a=>a.submitted_at!=null).length};}
export async function sealBackup(t,{now=Date.now(),version='0.14.0'}={}){
 check(BACKUP_TABLES.reduce((n,k)=>n+t[k].length,0)<=12000,'Dữ liệu vượt 12.000 bản ghi. Dùng Sao_luu_toan_bo.bat để giữ toàn bộ thư mục.');
 const p={format:'toanthd-local-backup',schema_version:3,backup_format_version:2,version,exported_at:new Date(now).toISOString()};
 for(const k of BACKUP_TABLES)p[k]=t[k].map(r=>k==='questions'&&(r.course_ref||(currentCourseFingerprint(r.id)&&currentCourseFingerprint(r.id)===r.bank_fingerprint))?{id:r.id,course_ref:r.course_ref||r.bank_fingerprint,archived_at:r.archived_at??null,updated_at:r.updated_at??0}:Object.fromEntries(BACKUP_COLUMNS[k].map(c=>[c,r[c]??(c==='bank_status'?'auto':['bank_note','bank_search'].includes(c)?'':null)])));
 p.integrity={algorithm:'SHA-256',digest:await sha256(p)};check(new TextEncoder().encode(JSON.stringify(p)).length<=MAX_BACKUP_BYTES,'Bản sao lưu vượt 10 MB. Dừng web và sao lưu toàn bộ thư mục bằng Sao_luu_toan_bo.bat.');return p;
}
// A checksum detects damage; it does not make imported HTML trusted.
export const validateLegacyHtml=validateRichHtml;
function question(raw){
 check(object(raw),'Câu hỏi không hợp lệ.');const kind=raw.kind;check(['mcq','tf','short','free'].includes(kind),'Dạng câu không hợp lệ.');const status=raw.bank_status||'auto';check(['auto','review','reference'].includes(status),'Trạng thái đáp án không hợp lệ.');check(kind!=='free'||status==='reference','Tự luận chỉ dùng tham khảo.');integer(raw.original_number,'Số câu',1,99999);
 const choices=typeof raw.choices==='string'?parse(raw.choices,'Phương án'):raw.choices,correct=typeof raw.correct==='string'&&raw._stored?parse(raw.correct,'Đáp án'):raw.correct;check(Array.isArray(choices),'Phương án phải là danh sách.');
 if(status==='auto'){if(kind==='mcq')check(typeof correct==='string'&&/^[ABCD]$/.test(correct),'Đáp án trắc nghiệm không hợp lệ.');if(kind==='tf')check(Array.isArray(correct)&&correct.length===4&&correct.every(v=>typeof v==='boolean'),'Đáp án Đúng/Sai không hợp lệ.');if(kind==='short')check(typeof correct==='string'&&numericValue(correct)!==null,'Đáp án ngắn không hợp lệ.');}
 let source=raw.source||null;if(raw.source_json!=null)source=parse(raw.source_json,'Nguồn câu');if(source){const n=normalizeSource(source);check(n.rendered.kind===kind&&n.rendered.original_number===raw.original_number&&canonical(n.rendered.correct)===canonical(correct),'Nguồn và đáp án đã lưu không khớp.');return {...n.rendered,source:n.source};}
 check(['short','free'].includes(kind)?choices.length===0:choices.length===4,'Số phương án/ý không hợp lệ.');const safe=choices.map((c,i)=>{check(object(c)&&c.key===(kind==='mcq'?'ABCD':'abcd')[i],'Nhãn phương án không hợp lệ.');str(c.text,'Nội dung phương án',100000);return {key:c.key,text:validateLegacyHtml(c.text)};});str(raw.prompt,'Nội dung câu',2200000);return {kind,original_number:raw.original_number,prompt:validateLegacyHtml(raw.prompt),choices:safe,correct,solution:validateLegacyHtml(raw.solution||''),source:null,bank_status:status,accepted_answers:Array.isArray(raw.accepted_answers)?raw.accepted_answers.map(v=>{check(numericValue(v)!==null,'Đáp án thay thế không hợp lệ.');return v;}):[],answer_unit:typeof raw.answer_unit==='string'?raw.answer_unit.slice(0,100):''};
}
function answers(qs,input){
 check(object(input),'Bài làm phải là đối tượng đáp án.');
 const byId=new Map(qs.map(q=>[q.id,q])),out={};
 const manualPrefix='__free_score:';
 for(const [key,value] of Object.entries(input)){
  if(key.startsWith(manualPrefix)){
   check(byId.get(key.slice(manualPrefix.length))?.kind==='free'&&
    [0,0.25,0.5,0.75,1].includes(value),'Điểm tự luận không hợp lệ.');
   out[key]=value;
   continue;
  }
  const q=byId.get(key);
  check(q,'Bài làm tham chiếu câu không có trong phiên.');
  if(q.kind==='mcq')check(typeof value==='string'&&q.choices.some(c=>c.key===value),'Lựa chọn trắc nghiệm không hợp lệ.');
  else if(q.kind==='tf')check(Array.isArray(value)&&value.length===4&&value.every(x=>x===null||typeof x==='boolean'),'Câu trả lời Đúng/Sai không hợp lệ.');
  else if(q.kind==='free')str(value,'Ghi chú tự luận',500,true);
  else str(value,'Câu trả lời ngắn',80,true);
  out[key]=value;
 }
 return out;
}
export async function validateBackup(raw,{courseRows=[],teacherIds=[]}={}){
 check(object(raw),'Chọn file JSON sao lưu toàn bộ dữ liệu.');check(new TextEncoder().encode(JSON.stringify(raw)).length<=MAX_BACKUP_BYTES,'File sao lưu vượt 10 MB.');check(raw.format==='toanthd-local-backup'&&raw.schema_version===3,'Chỉ phục hồi bản sao lưu toàn bộ dữ liệu schema 3 từ v0.3 trở lên. Ngân hàng câu hỏi dùng mục Nhập câu hỏi.');check(raw.backup_format_version==null||[1,2].includes(raw.backup_format_version),'Định dạng sao lưu mới hơn bản ứng dụng này.');str(raw.version,'Phiên bản',40);str(raw.exported_at,'Ngày sao lưu',80);check(Number.isFinite(Date.parse(raw.exported_at)),'Ngày sao lưu không hợp lệ.');
 const allowed=new Set(['format','schema_version','backup_format_version','version','exported_at','integrity',...BACKUP_TABLES]);check(Object.keys(raw).every(k=>allowed.has(k)),'File chứa trường ngoài định dạng sao lưu.');const warnings=[];let verified=false;
 if(raw.integrity){const {integrity,...p}=raw;check(object(integrity)&&integrity.algorithm==='SHA-256'&&/^[a-f0-9]{64}$/.test(integrity.digest)&&await sha256(p)===integrity.digest,'Mã kiểm tra SHA-256 không khớp. File có thể bị sửa hoặc hỏng.');verified=true;}else{check(raw.backup_format_version==null,'Bản sao lưu v0.5 thiếu mã kiểm tra.');warnings.push('File v0.3/v0.4 chưa có SHA-256; đã kiểm tra cấu trúc và các tham chiếu.');}
 const tables={};let total=0;for(const t of BACKUP_TABLES){check(Array.isArray(raw[t]),'Thiếu bảng dữ liệu '+t+'.');total+=raw[t].length;check(total<=12000,'Tối đa 12.000 bản ghi trong một lần phục hồi.');tables[t]=raw[t].map(r=>{check(object(r),'Bản ghi không hợp lệ.');str(r.id,'Mã bản ghi',160);check(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/.test(r.id)&&!['constructor','prototype','__proto__'].includes(r.id),'Mã bản ghi không hợp lệ.');return {...r};});unique(tables[t],r=>r.id,'Mã '+t);}
 const installed=new Map(courseRows.map(q=>[q.id,q]));
 const refs=tables.questions.filter(q=>q.course_ref);
 let migrated=0;
 function verifyCourseRow(q, fingerprint) {
  const current=currentCourseFingerprint(q.id);
  check(current&&installed.get(q.id)?.course_ref===current&&
    (fingerprint===current||fingerprint===COURSE_ROW_FINGERPRINTS.get(q.id)||fingerprint===PREVIOUS_COURSE_ROW_FINGERPRINTS.get(q.id)),
    'Thiếu hoặc sai phiên bản đề cương đóng gói. Chạy cài đặt/nâng cấp trước khi phục hồi.');
  if(fingerprint!==current)migrated++;
  q.course_ref=current;
 }
 for(const q of refs){
  check(raw.backup_format_version===2,'Tham chiếu đề cương yêu cầu định dạng sao lưu 2.');
  verifyCourseRow(q,q.course_ref);
  Object.assign(q,COURSE_ROW_META.get(q.id));
 }
 if(installed.size){
  const ids=new Set(tables.questions.map(q=>q.id)),missing=courseRows.filter(q=>!ids.has(q.id));
  if(missing.length)warnings.push('Đề cương tích hợp được giữ lại khi phục hồi bản sao lưu cũ.');
  tables.questions.push(...missing.map(q=>({...q,...COURSE_ROW_META.get(q.id)})));
  for(const key of ['documents','lessons']){const built=new Set(COURSE_METADATA[key].map(r=>r.id));tables[key]=[...tables[key].filter(r=>!built.has(r.id)),...COURSE_METADATA[key].map(r=>({...r}))];}
 }
 const maps=Object.fromEntries(BACKUP_TABLES.map(t=>[t,new Map(tables[t].map(r=>[r.id,r]))]));const ref=(t,id,label)=>{check(maps[t].has(id),label+' tham chiếu dữ liệu không tồn tại.');return maps[t].get(id);};
 for(const d of tables.documents){integer(d.grade,'Khối',10,12);str(d.title,'Tài liệu');str(d.edition,'Phiên bản',80);check([0,1].includes(d.is_sample),'Cờ minh họa không hợp lệ.');d.parent_id=d.parent_id??null;if(d.parent_id){ref('documents',d.parent_id,'Phiên bản cha');const seen=new Set([d.id]);let p=d.parent_id;while(p){check(!seen.has(p),'Chuỗi phiên bản có vòng lặp.');seen.add(p);p=maps.documents.get(p)?.parent_id;}}}
 for(const l of tables.lessons){ref('documents',l.document_id,'Bài học');str(l.title,'Tên bài');str(l.chapter,'Chương');}
 for(const q of tables.questions){ref('lessons',q.lesson_id,'Câu hỏi');integer(q.revision,'Bản sửa',1);if(q.course_ref){q.archived_at=timestamp(q.archived_at,'Ngày lưu trữ',true);q.updated_at=timestamp(q.updated_at??0,'Ngày sửa');continue;}if(COURSE_ROW_FINGERPRINTS.has(q.id)){verifyCourseRow(q,await sha256(courseRowPayload(q)));q.archived_at=timestamp(q.archived_at,'Ngày lưu trữ',true);q.updated_at=timestamp(q.updated_at??0,'Ngày sửa');continue;}check(!COURSE_METADATA.lessons.some(l=>l.id===q.lesson_id),'Không thêm câu tùy chỉnh vào nguồn đề cương cố định.');q.bank_status=q.bank_status||'auto';q.bank_origin=null;q.bank_tex=null;q.bank_meta=null;q.bank_fingerprint=null;q.bank_note=q.bank_note||'';q.bank_search=q.bank_search||'';const n=question({...q,_stored:true});q.prompt=n.prompt;q.choices=JSON.stringify(n.choices);q.correct=JSON.stringify(n.correct);q.solution=n.solution;q.source_json=n.source?JSON.stringify(n.source):null;q.family_id=q.family_id||q.id;ref('questions',q.family_id,'Họ câu hỏi');q.archived_at=timestamp(q.archived_at,'Ngày lưu trữ',true);q.updated_at=timestamp(q.updated_at??0,'Ngày sửa');}unique(tables.questions,q=>JSON.stringify([q.lesson_id,q.original_number,q.revision]),'Số câu/bản sửa');
 for(const c of tables.classrooms){integer(c.grade,'Khối lớp',10,12);str(c.label,'Tên lớp',40);str(c.school_year,'Năm học',30);check([0,1].includes(c.is_sample),'Cờ minh họa lớp không hợp lệ.');}
 for(const s of tables.students){ref('classrooms',s.classroom_id,'Học sinh');integer(s.ordinal,'STT',1,999);str(s.name,'Họ tên');s.archived_at=timestamp(s.archived_at,'Ngày lưu trữ học sinh',true);}unique(tables.students,s=>JSON.stringify([s.classroom_id,s.ordinal]),'STT trong lớp');
 const rosters=new Map(),qsBySession=new Map(),owners=new Set(teacherIds);
 let missingOwners=0;
 for(const s of tables.sessions){const cl=ref('classrooms',s.classroom_id,'Phiên');str(s.title,'Tên phiên',160);check(typeof s.code==='string'&&/^[A-Z0-9]{6}$/.test(s.code),'Mã phiên không hợp lệ.');check(['online','paper'].includes(s.mode)&&['open','closed'].includes(s.state),'Chế độ/trạng thái phiên không hợp lệ.');integer(s.minutes,'Thời gian',1,180);timestamp(s.created_at,'Ngày tạo');timestamp(s.closes_at,'Hạn phiên');check(s.closes_at>=s.created_at,'Hạn phiên trước ngày tạo.');s.scoring_mode=s.scoring_mode||'practice';check(['practice','exam-1246'].includes(s.scoring_mode),'Cách chấm không hợp lệ.');if(s.owner_teacher_id!=null){str(s.owner_teacher_id,'Mã chủ phiên',160);if(!owners.has(s.owner_teacher_id)){s.owner_teacher_id=null;missingOwners++;}}
  let snap=s.roster_snapshot?parse(s.roster_snapshot,'Danh sách chụp'):{class_label:cl.label,school_year:cl.school_year,students:tables.students.filter(st=>st.classroom_id===cl.id).map(({id,ordinal,name})=>({id,ordinal,name}))};check(object(snap)&&Array.isArray(snap.students)&&snap.students.length<=1000,'Danh sách chụp không hợp lệ.');str(snap.class_label,'Tên lớp chụp',40);str(snap.school_year,'Năm học chụp',30);snap={class_label:snap.class_label,school_year:snap.school_year,students:snap.students.map(st=>{check(object(st),'Học sinh chụp không hợp lệ.');check(ref('students',st.id,'Học sinh chụp').classroom_id===s.classroom_id,'Học sinh chụp thuộc lớp khác.');integer(st.ordinal,'STT chụp',1,999);str(st.name,'Họ tên chụp');return {id:st.id,ordinal:st.ordinal,name:st.name};})};unique(snap.students,st=>st.id,'Học sinh chụp');unique(snap.students,st=>st.ordinal,'STT chụp');s.roster_snapshot=JSON.stringify(snap);rosters.set(s.id,snap.students);qsBySession.set(s.id,[]);
 }unique(tables.sessions,s=>s.code,'Mã tham gia');
 for(const sq of tables.session_questions){
  const session=ref('sessions',sq.session_id,'Câu trong phiên');
  const bank=ref('questions',sq.source_id,'Câu nguồn');
  integer(sq.position,'Vị trí câu',0,99);
  const snap=parse(sq.snapshot,'Câu đã chụp');
  check(object(snap)&&snap.id===sq.source_id&&snap.lesson_id===bank.lesson_id,'Câu chụp không khớp câu nguồn.');
  const q={id:snap.id,lesson_id:snap.lesson_id,revision:integer(snap.revision??bank.revision,'Bản sửa chụp',1),...question(snap)};
  check(canEnterSession(q,{allowFree:session.scoring_mode==='practice'}),'Phiên chứa câu chưa đủ điều kiện chấm.');
  if(snap.variant!==undefined){
   check(object(snap.variant),'Thông tin biến thể không hợp lệ.');
   q.variant={key:str(snap.variant.key,'Mã biến thể',30),number:integer(snap.variant.number,'Số biến thể',1,9999)};
  }
  for(const k of ['lesson_title','chapter','document_title','edition'])q[k]=str(snap[k]||'',k,200,true);
  const doc=ref('documents',ref('lessons',q.lesson_id,'Bài câu chụp').document_id,'Tài liệu');
  q.grade=doc.grade;q.document_id=doc.id;q.is_sample=doc.is_sample;
  sq.snapshot=JSON.stringify(q);
  qsBySession.get(sq.session_id).push({position:sq.position,q});
 }
 for(const s of tables.sessions){const entries=qsBySession.get(s.id).sort((a,b)=>a.position-b.position);check(entries.length>=1&&entries.length<=100,'Phiên phải có từ 1 đến 100 câu.');check(entries.every((e,i)=>e.position===i),'Thứ tự câu bị thiếu hoặc trùng.');unique(entries,e=>e.q.id,'Câu nguồn trong phiên');const qs=entries.map(e=>e.q);qsBySession.set(s.id,qs);if(s.scoring_mode==='exam-1246')check(validExamStructure(qs),'Phiên 12–4–6 không đủ cấu trúc.');}
 let mismatches=0;for(const a of tables.attempts){check(!('token'in a),'File sao lưu không được chứa token làm bài.');const s=ref('sessions',a.session_id,'Bài làm');check(rosters.get(s.id).some(st=>st.id===a.student_id),'Bài làm không thuộc danh sách đã chụp.');const qs=qsBySession.get(s.id);a.answers=JSON.stringify(answers(qs,parse(a.answers,'Đáp án học sinh')));a.submitted_at=timestamp(a.submitted_at,'Ngày nộp',true);a.updated_at=timestamp(a.updated_at,'Ngày lưu');a.last_seen_at=timestamp(a.last_seen_at??0,'Tín hiệu');a.save_revision=integer(a.save_revision??0,'Phiên bản bài');a.allow_rejoin=[0,1].includes(a.allow_rejoin)?a.allow_rejoin:0;
  if(a.submitted_at!=null){check(typeof a.score==='number'&&Number.isFinite(a.score)&&a.score>=0&&a.score<=10,'Điểm đã nộp không hợp lệ.');check(typeof a.earned==='number'&&Number.isFinite(a.earned)&&a.earned>=0&&a.earned<=(s.scoring_mode==='exam-1246'?10:qs.length),'Điểm thô không hợp lệ.');if(Math.abs(a.score-gradeAttempt(qs,JSON.parse(a.answers),s.scoring_mode).score)>.005)mismatches++;}else{check(a.score==null&&a.earned==null,'Bài chưa nộp phải để trống điểm.');a.score=null;a.earned=null;}}
 unique(tables.attempts,a=>JSON.stringify([a.session_id,a.student_id]),'Bài làm trong phiên');if(mismatches)warnings.push(`${mismatches} bài có điểm đã lưu khác chi tiết câu; phục hồi giữ điểm tổng để đối chiếu.`);const summary=summarizeBackup(tables);if(summary.open_sessions||summary.pending_attempts)warnings.push('Khi phục hồi, mọi phiên được đóng; bài chưa nộp được chấm từ phần đã sao lưu.');
 if(missingOwners)warnings.push(`${missingOwners} phiên thuộc tài khoản chưa có trên máy này sẽ do quản trị quản lý.`);
 if(migrated)warnings.push('Tham chiếu đề cương cũ được nối vào ngân hàng hiện tại theo mã câu gốc.');
 const normalized=Object.fromEntries(BACKUP_TABLES.map(t=>[t,tables[t].map(r=>t==='questions'&&r.course_ref?{id:r.id,course_ref:r.course_ref,lesson_id:r.lesson_id,original_number:r.original_number,kind:r.kind,revision:r.revision,archived_at:r.archived_at,updated_at:r.updated_at}:Object.fromEntries(BACKUP_COLUMNS[t].map(k=>[k,r[k]??null])))]));return {tables:normalized,summary,warnings,verified,digest:await sha256(normalized),source_version:raw.version,exported_at:raw.exported_at};
}
