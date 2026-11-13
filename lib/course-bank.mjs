import {numericValue} from './grading.mjs';
// Stable identities for the bundled, read-only course bank. Other documents remain private.
export const COURSE_BANK_VERSION='thd-course-json-20261106';
export const COURSE_DOCUMENT_IDS=[10,11,12].flatMap(g=>['hk1','hk2'].map(s=>`dc-${g}-${s}-v4`));
export const isCourseDocument=id=>COURSE_DOCUMENT_IDS.includes(id);
export const COURSE_DOCUMENT_SQL=COURSE_DOCUMENT_IDS.map(id=>`'${id}'`).join(',');
export const bankSearch=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/\s+/g,' ').trim();
export function canAutoGrade(q){
 if(q.archived_at||q.bank_status&&q.bank_status!=='auto')return false;
 if(q.kind==='mcq')return typeof q.correct==='string'&&/^[ABCD]$/.test(q.correct);
 if(q.kind==='tf')return Array.isArray(q.correct)&&q.correct.length===4&&q.correct.every(v=>typeof v==='boolean');
 return q.kind==='short'&&q.correct!==null&&q.correct!==undefined&&q.correct!==''&&numericValue(q.correct)!==null;
}
export function canEnterSession(q,{allowFree=false}={}){
 if(q.archived_at)return false;
 if(allowFree&&q.kind==='free')return true;
 return canAutoGrade(q);
}
// Deliberate allowlist: bank_tex, bank_meta and accepted_answers include the answer key.
export function publicQuestion(q){
 return Object.fromEntries(['id','lesson_id','original_number','revision','kind','prompt','choices','lesson_title','chapter','document_id','document_title','edition','grade','is_sample'].filter(k=>q[k]!==undefined).map(k=>[k,q[k]]));
}
/** @param {Record<string, {correct?: string | number | boolean[] | null, accepted_answers?: Array<string | number>}> | null} verifiedOverrides */
export function decodeQuestion(q,verifiedOverrides=null){
 const meta=q.bank_meta?JSON.parse(q.bank_meta):null;
 const override=verifiedOverrides&&q.id?verifiedOverrides[q.id]:null;
 const baseCorrect=typeof q.correct==='string'?JSON.parse(q.correct):q.correct;
 const correct=override&&override.correct!==undefined?override.correct:baseCorrect;
 const bank_status=override?'auto':q.bank_status;
 const out={...q,choices:typeof q.choices==='string'?JSON.parse(q.choices):q.choices,correct,bank_status,source:q.source_json?JSON.parse(q.source_json):null,accepted_answers:override?.accepted_answers||meta?.acceptedAnswers||[],answer_unit:meta?.answerUnit||''};
 if(override)out.verified_override=true;
 return out;
}
export function bankFilter(params,verifiedIds=[]){
 const clauses=[],args=[];
 const add=(sql,value)=>{clauses.push(sql);args.push(value);};
 if(params.get('grade'))add('d.grade=?',Number(params.get('grade')));
 if(params.get('course')==='1')clauses.push('d.id IN ('+COURSE_DOCUMENT_SQL+')');
 if(params.get('document_id'))add('l.document_id=?',params.get('document_id'));
 if(params.get('chapter'))add('l.chapter=?',params.get('chapter'));
 if(params.get('lesson_id'))add('q.lesson_id=?',params.get('lesson_id'));
 if(params.get('kind'))add('q.kind=?',params.get('kind'));
 if(params.get('from'))add('q.original_number>=?',Number(params.get('from')));
 if(params.get('to'))add('q.original_number<=?',Number(params.get('to')));
 clauses.push(params.get('archived')==='1'?'q.archived_at IS NOT NULL':'q.archived_at IS NULL');
 const status=params.get('status');
 if(['auto','review','reference'].includes(status)){
  if(verifiedIds.length&&status==='auto'){
   clauses.push(`(q.bank_status='auto' OR q.id IN (${verifiedIds.map(()=>'?').join(',')}))`);
   args.push(...verifiedIds);
  }else if(verifiedIds.length&&status==='review'){
   clauses.push(`(q.bank_status='review' AND q.id NOT IN (${verifiedIds.map(()=>'?').join(',')}))`);
   args.push(...verifiedIds);
  }else add('q.bank_status=?',status);
 }
 const search=bankSearch(params.get('q'));
 const byNumber=search.match(/^(?:(?:cau\s*)?#?\s*)(\d{1,5})$/);
 if(byNumber)add('q.original_number=?',Number(byNumber[1]));
 else if(search)add("COALESCE(NULLIF(q.bank_search,''),lower(q.prompt)) LIKE ? ESCAPE '\\'",'%'+search.replace(/[\\%_]/g,'\\$&')+'%');
 return {sql:clauses.length?' AND '+clauses.join(' AND '):'',args};
}
export function parseNumberSelection(spec){
 const text=String(spec||'').trim();if(!text)return [];
 const out=new Set();
 for(const part of text.split(/[,\s;]+/).filter(Boolean)){
  const range=part.match(/^(\d+)\s*[-–]\s*(\d+)$/);
  if(range){
   const a=Number(range[1]),b=Number(range[2]);
   if(a>=1&&b>=a&&b-a<=500)for(let n=a;n<=b;n++)out.add(n);
  }else if(/^\d+$/.test(part)){
   const n=Number(part);if(n>=1&&n<=99999)out.add(n);
  }
 }
 return [...out].sort((a,b)=>a-b);
}

export const COURSE_ROW_FIELDS=['id','lesson_id','original_number','revision','kind','prompt','choices','correct','solution','family_id','source_json','bank_status','bank_origin','bank_tex','bank_meta','bank_note','bank_search'];
export const courseRowPayload=q=>JSON.stringify(Object.fromEntries(COURSE_ROW_FIELDS.map(k=>[k,q[k]??null])));
