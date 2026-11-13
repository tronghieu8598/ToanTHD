// Practice rubric: equal question weights, each true/false part worth 1/4.
export function numericValue(input) {
  if (typeof input !== "string" && typeof input !== "number") return null;
  const s = String(input).trim().replace(/−/g, "-").replace(",", ".");
  if (s.length > 80) return null;
  const number = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/;
  if (number.test(s)) return Number.isFinite(Number(s)) ? Number(s) : null;
  const parts = s.split("/");
  if (parts.length === 2 && parts.every((v) => number.test(v.trim()))) {
    const [a,b] = parts.map(Number);
    if (b !== 0 && Number.isFinite(a / b)) return a / b;
  }
  return null;
}
export function freeScoreValue(answer, allAnswers, questionId) {
  const raw = allAnswers && questionId && allAnswers['__free_score:' + questionId] !== undefined
    ? allAnswers['__free_score:' + questionId]
    : (typeof answer === 'number' ? answer : null);
  if (typeof raw === 'number' && Number.isFinite(raw) && raw >= 0 && raw <= 1) return raw;
  return null;
}
export function gradeQuestion(q, answer, allAnswers) {
  if (q.kind === "mcq") return answer === q.correct ? 1 : 0;
  if (q.kind === "tf") {
    if (!Array.isArray(answer)) return 0;
    if (!Array.isArray(q.correct)) return 0;
    return q.correct.reduce((sum, expected, i) => sum + (typeof answer[i] === "boolean" && answer[i] === expected ? 0.25 : 0), 0);
  }
  if (q.kind === "short") {
    const given = numericValue(answer);
    return given !== null && [q.correct,...(q.accepted_answers||[])].some(v=>{const expected=numericValue(v);return expected!==null&&Math.abs(given-expected)<1e-9;}) ? 1 : 0;
  }
  if (q.kind === "free") {
    const manual = freeScoreValue(answer, allAnswers, q.id);
    return manual !== null ? manual : 0;
  }
  return 0;
}
export function validExamStructure(questions) {
 return questions.length===22 && ['mcq','tf','short'].every((kind,i)=>questions.filter(q=>q.kind===kind).length===[12,4,6][i]);
}
export function gradeAttempt(questions, answers, mode='practice') {
  const safeAnswers = answers || {};
  const details = questions.map((q) => {
   const fraction=gradeQuestion(q, safeAnswers[q.id], safeAnswers);
   const earned=mode==='exam-1246'?(q.kind==='mcq'?fraction*0.25:q.kind==='short'?fraction*0.5:q.kind==='tf'?[0,0.1,0.25,0.5,1][Math.round(fraction*4)]:fraction):fraction;
   return {id:q.id,earned};
  });
  const earned = details.reduce((s, item) => s + item.earned, 0);
  return {earned, score:mode==='exam-1246'?Math.round(earned*100)/100:questions.length ? Math.round(earned / questions.length * 1000) / 100 : 0, details};
}
export function answeredCount(questions, answers) {
  const safeAnswers = answers || {};
  return questions.filter(q => q.kind === "tf"
    ? Array.isArray(safeAnswers[q.id]) && safeAnswers[q.id].length === 4 && safeAnswers[q.id].every(v => typeof v === "boolean")
    : typeof safeAnswers[q.id] === "string" && safeAnswers[q.id].trim() !== "").length;
}
