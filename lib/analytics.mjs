import {gradeQuestion, gradeAttempt, answeredCount, numericValue, freeScoreValue} from './grading.mjs';

export const kindNames = {mcq:'Trắc nghiệm', tf:'Đúng / Sai', short:'Trả lời ngắn', free:'Tự luận'};
export const statusNames = {submitted:'Đã nộp', working:'Đang làm', absent:'Chưa vào'};
export function hasAnswer(q, answer, allAnswers) {
  if (q.kind === 'free') {
    if (freeScoreValue(answer, allAnswers, q.id) !== null) return true;
    return answer !== null && answer !== undefined && String(answer).trim() !== '';
  }
  return q.kind === 'tf' ? Array.isArray(answer) && answer.some(v => typeof v === 'boolean')
    : answer !== null && answer !== undefined && String(answer).trim() !== '';
}
export function answerText(q, answer, allAnswers) {
  if (q.kind === 'free') {
    const manual = freeScoreValue(answer, allAnswers, q.id);
    const note = typeof answer === 'string' && answer.trim() ? answer.trim() : '';
    if (manual !== null && note) return `${note} (Chấm: ${Math.round(manual * 100)}%)`;
    if (manual !== null) return `Đã chấm: ${Math.round(manual * 100)}%`;
    return note || 'Làm trên giấy / chờ chấm';
  }
  if (!hasAnswer(q, answer, allAnswers)) return '—';
  if (q.kind === 'tf') return 'abcd'.split('').map((key,i) => `${key}) ${typeof answer[i] === 'boolean' ? answer[i] ? 'Đ' : 'S' : '—'}`).join('; ');
  return String(answer);
}
export function questionLabel(q) { return `Câu ${q.original_number} · ${q.lesson_title || ''} · ${q.document_title || ''}${q.edition ? ' / '+q.edition : ''}`; }
export function questionPoints(q, answer, mode, count, allAnswers) {
  const fraction = gradeQuestion(q, answer, allAnswers);
  return mode === 'exam-1246' ? q.kind === 'mcq' ? fraction * .25 : q.kind === 'short' ? fraction * .5 : q.kind === 'tf' ? [0,.1,.25,.5,1][Math.round(fraction*4)] : fraction : count ? fraction * 10/count : 0;
}
export function responseState(q, answer, allAnswers) {
  if (q.kind === 'free') {
    const manual = freeScoreValue(answer, allAnswers, q.id);
    if (manual === null) return 'blank';
    return manual === 1 ? 'full' : manual > 0 ? 'partial' : 'wrong';
  }
  if (!hasAnswer(q, answer, allAnswers)) return 'blank';
  const fraction = gradeQuestion(q, answer, allAnswers);
  return fraction === 1 ? 'full' : fraction > 0 ? 'partial' : 'wrong';
}

// One shared model for the dashboard and exported workbook. Only submitted
// attempts enter aggregate denominators; missing attempts never become zeros.
export function analyzeSession(detail) {
  const {session, questions} = detail, mode = session.scoring_mode || 'practice';
  const byStudent = new Map(detail.attempts.map(a => [a.student_id,a]));
  const students = [...detail.roster].sort((a,b) => a.ordinal-b.ordinal).map(student => {
    const attempt=byStudent.get(student.id), submitted=attempt?.submitted_at != null;
    return {student,attempt,status:submitted?'submitted':attempt?'working':'absent',score:submitted && typeof attempt.score === 'number' && Number.isFinite(attempt.score) ? attempt.score : null,answered:attempt?answeredCount(questions,attempt.answers):0};
  });
  const done=students.filter(r=>r.status==='submitted'), n=done.length;
  const scores=done.filter(r=>r.score!==null).map(r=>r.score).sort((a,b)=>a-b);
  const mean=scores.length?scores.reduce((s,x)=>s+x,0)/scores.length:null;
  const stats={mean,median:scores.length?(scores[Math.floor(scores.length/2)]+scores[Math.ceil(scores.length/2)-1])/2:null,min:scores.length?scores[0]:null,max:scores.length?scores.at(-1):null,sd:mean===null?null:Math.sqrt(scores.reduce((s,x)=>s+(x-mean)**2,0)/scores.length),validScores:scores.length};
  const histogram=[[0,5,'0 – <5'],[5,6.5,'5 – <6,5'],[6.5,8,'6,5 – <8'],[8,9,'8 – <9'],[9,10,'9 – 10']].map(([min,max,label],i)=>({min,max,label,count:scores.filter(x=>x>=min&&(i===4?x<=max:x<max)).length}));
  const thresholds=[5,6.5,8].map(value=>({value,count:scores.filter(x=>x>=value).length,rate:scores.length?scores.filter(x=>x>=value).length/scores.length:null}));
  const items=questions.map(q=>{
    const responses=done.map(r=>({student:r.student,answer:r.attempt.answers[q.id],allAnswers:r.attempt.answers,state:responseState(q,r.attempt.answers[q.id],r.attempt.answers),fraction:gradeQuestion(q,r.attempt.answers[q.id],r.attempt.answers),points:questionPoints(q,r.attempt.answers[q.id],mode,questions.length,r.attempt.answers)}));
    const counts=Object.fromEntries(['full','partial','wrong','blank'].map(state=>[state,responses.filter(r=>r.state===state).length]));
    const choices=q.kind==='mcq'?q.choices.map(c=>({...c,correct:c.key===q.correct,count:responses.filter(r=>r.answer===c.key).length,students:responses.filter(r=>r.answer===c.key).map(r=>r.student)})):[];
    const parts=q.kind==='tf'?q.choices.map((c,i)=>({...c,correct:q.correct[i],yes:responses.filter(r=>r.answer?.[i]===true).map(r=>r.student),no:responses.filter(r=>r.answer?.[i]===false).map(r=>r.student),blank:responses.filter(r=>typeof r.answer?.[i]!=='boolean').map(r=>r.student),right:responses.filter(r=>typeof r.answer?.[i]==='boolean'&&r.answer[i]===q.correct[i]).length})):[];
    const grouped=new Map();
    if(q.kind==='short') for(const r of responses){
      const value=numericValue(r.answer),key=!hasAnswer(q,r.answer)?'blank':value!==null?'n:'+value:'t:'+String(r.answer).trim();
      if(!grouped.has(key))grouped.set(key,{key,label:key==='blank'?'Bỏ trống':value!==null?String(value):String(r.answer).trim(),variants:[],students:[],correct:r.fraction===1});
      const group=grouped.get(key);group.students.push(r.student);
      if(hasAnswer(q,r.answer)&&!group.variants.includes(String(r.answer)))group.variants.push(String(r.answer));
    }
    const maxFraction = q.kind === 'free' ? 1 : gradeQuestion(q, q.correct);
    const maxPoints = mode === 'exam-1246' ? (q.kind === 'mcq' ? 0.25 : q.kind === 'short' ? 0.5 : q.kind === 'tf' ? 1 : maxFraction) : questions.length ? maxFraction * 10 / questions.length : 0;
    const wrongChoices=choices.filter(c=>!c.correct),topCount=Math.max(0,...wrongChoices.map(c=>c.count));
    return {q,...counts,n,fullRate:n?counts.full/n:null,maxPoints,meanPoints:n?responses.reduce((s,r)=>s+r.points,0)/n:null,responses,choices,parts,groups:[...grouped.values()].sort((a,b)=>b.students.length-a.students.length),topWrong:topCount?wrongChoices.filter(c=>c.count===topCount).map(c=>c.key):[]};
  });
  const mismatches=done.filter(r=>r.score!==null&&Math.abs(gradeAttempt(questions,r.attempt.answers,mode).score-r.score)>.005).map(r=>r.student);
  return {session,mode,students,done,n,working:students.filter(r=>r.status==='working').length,absent:students.filter(r=>r.status==='absent').length,stats,histogram,thresholds,items,mismatches,generatedAt:detail.generated_at||Date.now()};
}
