import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeSession,questionPoints,answerText,hasAnswer} from '../lib/analytics.mjs';
import {gradeAttempt} from '../lib/grading.mjs';
import {reportFixture} from './fixtures/report.mjs';

test('v0.4: known cohort keeps real zero, excludes working/absent, and calculates distribution/median/population SD',()=>{
  const d=reportFixture(),before=JSON.stringify(d),a=analyzeSession(d);
  assert.deepEqual([a.n,a.working,a.absent],[4,1,1]);
  assert.deepEqual(a.done.map(r=>r.score),[10,6.25,0,6.25]);
  assert.equal(a.stats.mean,5.625);assert.equal(a.stats.median,6.25);assert.equal(a.stats.min,0);assert.equal(a.stats.max,10);
  assert.ok(Math.abs(a.stats.sd-Math.sqrt(12.890625))<1e-10);
  assert.deepEqual(a.histogram.map(b=>b.count),[1,2,0,0,1]);assert.deepEqual(a.thresholds.map(t=>t.count),[3,1,1]);
  assert.equal(a.students[4].answered,2);assert.equal(a.students[4].score,null);assert.equal(a.students[5].score,null);assert.equal(JSON.stringify(d),before);
});
test('v0.4: question denominators, TF blanks, numeric variants, names and duplicate source numbers remain distinct',()=>{
  const a=analyzeSession(reportFixture()),[mc,tf,short,dup]=a.items;
  assert.deepEqual([mc.full,mc.partial,mc.wrong,mc.blank],[2,0,1,1]);assert.equal(mc.fullRate,.5);assert.deepEqual(mc.topWrong,['A']);
  assert.deepEqual(mc.choices.find(c=>c.key==='A').students.map(s=>s.id),['s2']);
  assert.deepEqual([tf.full,tf.partial,tf.wrong,tf.blank],[1,2,0,1]);assert.deepEqual(tf.parts.map(p=>[p.yes.length,p.no.length,p.blank.length,p.right]),[[3,0,1,3],[0,2,2,2],[2,1,1,2],[1,1,2,1]]);
  assert.equal(short.groups.find(g=>g.correct).students.length,3);assert.deepEqual(short.groups.find(g=>g.correct).variants,['0,5','1/2','0.5']);
  assert.notEqual(mc.q.id,dup.q.id);assert.equal(mc.q.original_number,dup.q.original_number);assert.equal(dup.full,2);
  assert.equal(hasAnswer(tf.q,[false,null,null,null]),true);assert.equal(answerText(tf.q,[false,null,true,null]),'a) S; b) —; c) Đ; d) —');
});
test('v0.4: empty cohorts show no fabricated statistics and stored scores are never silently replaced',()=>{
  const d=reportFixture();d.attempts=[];let a=analyzeSession(d);
  assert.equal(a.n,0);assert.equal(a.absent,6);for(const key of ['mean','median','min','max','sd'])assert.equal(a.stats[key],null);
  assert.ok(a.items.every(q=>q.fullRate===null&&q.meanPoints===null));assert.ok(a.thresholds.every(t=>t.rate===null));
  const original=reportFixture();original.attempts[0].score=9;a=analyzeSession(original);
  assert.equal(a.students[0].score,9);assert.deepEqual(a.mismatches.map(s=>s.id),['s1']);assert.equal(original.attempts[0].score,9);
});
test('v0.4: per-question report points follow frozen exam-1246 rubric and sum to the saved total',()=>{
  const d=reportFixture();d.questions=[...Array.from({length:12},(_,i)=>({...d.questions[0],id:'mc'+i})),...Array.from({length:4},(_,i)=>({...d.questions[1],id:'tf'+i})),...Array.from({length:6},(_,i)=>({...d.questions[2],id:'sn'+i}))];d.session.scoring_mode='exam-1246';
  const answers=Object.fromEntries(d.questions.map(q=>[q.id,q.correct]));for(let i=0;i<4;i++)answers['tf'+i]=d.questions[12+i].correct.map((v,j)=>j<=i?v:!v);
  const grade=gradeAttempt(d.questions,answers,'exam-1246');assert.equal(grade.score,7.85);
  d.roster=d.roster.slice(0,1);d.attempts=[{...d.attempts[0],answers,score:grade.score}];const a=analyzeSession(d);
  assert.deepEqual(a.items.slice(12,16).map(q=>q.meanPoints),[.1,.25,.5,1]);assert.equal(a.mismatches.length,0);
  assert.ok(Math.abs(a.items.reduce((n,q)=>n+q.meanPoints,0)-7.85)<1e-9);assert.equal(questionPoints(d.questions[12],answers.tf0,'practice',22),10/22/4);
});
