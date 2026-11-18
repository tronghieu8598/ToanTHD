import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DOMParser as TestDOMParser} from 'linkedom';
import {readDocx,sourceOf} from '../lib/client/importers.mjs';
import {normalizeSource} from '../lib/content.mjs';
import {questions} from '../data/demo.mjs';
globalThis.DOMParser=class {parseFromString(input,type){return new TestDOMParser().parseFromString(type==='text/html'?'<html><body>'+input+'</body></html>':input,type);}};
test('DOCX draft retains printed numbers, OMML fractions, answer types and an embedded image',()=>{
 const bytes=new Uint8Array(readFileSync(new URL('./fixtures/word-basic.docx',import.meta.url)));
 const result=readDocx(bytes,{grade:11,title:'Word fixture',edition:'v1',chapter:'Chương mẫu',lesson:'Bài mẫu',is_sample:true});
 const qs=result.payload.documents.flatMap(d=>d.lessons.flatMap(l=>l.questions));
 assert.deepEqual(qs.map(q=>q.original_number),[137,140,145]);assert.deepEqual(qs.map(q=>q.kind),['mcq','short','tf']);assert.ok(qs[0].prompt.includes('\\frac{1}{2}'));assert.equal(qs[0].correct,'A');assert.equal(qs[1].correct,'1');assert.deepEqual(qs[2].correct,[true,false,true,true]);assert.equal(qs[2].images.length,1);assert.equal(result.payload.docx_reviewed,false);
 qs.forEach(q=>assert.doesNotThrow(()=>normalizeSource(q)));
});
test('Legacy v0.1 MathML can be edited without losing the vector/fraction notation',()=>{
 for(const q of [questions.find(q=>q.lesson_id==='d11-b1'&&q.original_number===1),questions.find(q=>q.lesson_id==='d12-b1'&&q.original_number===1)]){
  const source=sourceOf(q);assert.ok(source.prompt.includes('$'));assert.doesNotThrow(()=>normalizeSource(source));
 }
 const vector=sourceOf(questions.find(q=>q.lesson_id==='d12-b1'&&q.original_number===1));assert.ok(vector.prompt.includes('\\overrightarrow{AB}'));
});
