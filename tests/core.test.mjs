import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,mkdtempSync,readdirSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {numericValue,gradeQuestion,gradeAttempt,answeredCount} from '../lib/grading.mjs';
import {questions,documents,lessons,students,classrooms} from '../data/demo.mjs';
test('Thirty demonstration questions have unique document/lesson/revision identities',()=>{
 assert.equal(questions.length,30);assert.equal(new Set(questions.map(q=>q.id)).size,30);
 for(const grade of [10,11,12])assert.equal(questions.filter(q=>q.lesson_id.startsWith('d'+grade)).length,10);
 for(const q of questions){const lesson=lessons.find(l=>l.id===q.lesson_id);assert.ok(lesson);assert.ok(documents.find(d=>d.id===lesson.document_id));assert.equal(gradeQuestion(q,q.correct),1);assert.equal(gradeQuestion(q,undefined),0);if(q.kind==='tf')assert.equal(q.correct.length,4);}
 assert.equal(classrooms.length,3);assert.equal(students.length,36);
});
test('Numeric answers handle Vietnamese decimal separators without evaluating code',()=>{
 assert.equal(numericValue(' 0,5 '),.5);assert.equal(numericValue('1/2'),.5);assert.equal(numericValue('−3'),-3);
 for(const bad of ['1/0','NaN','Infinity','1e999','1,2,3','Math.random()','1+1','',null,{}])assert.equal(numericValue(bad),null);
 assert.equal(gradeQuestion({kind:'short',correct:'0.5'},'1/2'),1);
});
test('True/false rubric gives partial credit and never treats blanks as false',()=>{
 const q={id:'tf',kind:'tf',correct:[true,false,true,false]};
 assert.equal(gradeQuestion(q,[true,null,null,null]),.25);
 assert.equal(gradeQuestion(q,[null,null,null,null]),0);
 assert.equal(gradeQuestion(q,[true,true,false,true]),.25);
 assert.equal(answeredCount([q],{tf:[true,false,true,null]}),0);
 assert.equal(answeredCount([q],{tf:[true,false,true,false]}),1);
 assert.equal(gradeAttempt([q],{tf:[true,false,true,null]}).score,7.5);
});
test('Scoring keeps questions with the same printed number separate',()=>{
 const qs=[{id:'lesson-a:q1',kind:'mcq',correct:'A'},{id:'lesson-b:q1',kind:'mcq',correct:'B'}];
 assert.equal(gradeAttempt(qs,{'lesson-a:q1':'A','lesson-b:q1':'B'}).score,10);
 assert.equal(gradeAttempt(qs,{'lesson-a:q1':'A'}).score,5);
});
test('SQL schema, repeated seed, durable reopen and immutable session snapshot',()=>{
 const dir=mkdtempSync(path.join(tmpdir(),'toanthd-test-')),file=path.join(dir,'test.sqlite');let db;
 try{db=new DatabaseSync(file);for(const name of readdirSync(new URL('../drizzle/',import.meta.url)).filter(n=>n.endsWith('.sql')).sort())db.exec(readFileSync(new URL('../drizzle/'+name,import.meta.url),'utf8'));
 const seed=readFileSync(new URL('../data/demo-seed.sql',import.meta.url),'utf8');db.exec(seed);db.exec(seed);
 assert.equal(db.prepare('SELECT COUNT(*) AS n FROM questions').get().n,30);assert.equal(db.prepare('SELECT COUNT(*) AS n FROM students').get().n,36);
 const q=db.prepare('SELECT * FROM questions LIMIT 1').get();
 db.prepare('INSERT INTO sessions(id,code,title,classroom_id,mode,minutes,state,created_at,closes_at) VALUES(?,?,?,?,?,?,?,?,?)').run('test','TST234','Test','demo-11a1','online',15,'open',1,9999999999999);
 db.prepare('INSERT INTO session_questions VALUES(?,?,?,?,?)').run('sq','test',0,q.id,JSON.stringify(q));
 db.prepare('UPDATE questions SET prompt=? WHERE id=?').run('Changed bank',q.id);
 db.close();db=new DatabaseSync(file);
 const snap=JSON.parse(db.prepare('SELECT snapshot FROM session_questions WHERE id=?').get('sq').snapshot);
 assert.equal(snap.prompt,q.prompt);assert.notEqual(snap.prompt,'Changed bank');assert.equal(db.prepare('SELECT title FROM sessions WHERE id=?').get('test').title,'Test');
 assert.throws(()=>db.prepare('INSERT INTO students(id,classroom_id,ordinal,name) VALUES(?,?,?,?)').run('duplicate','demo-11a1',1,'Duplicate'));
 }finally{db?.close();rmSync(dir,{recursive:true,force:true});}
});
