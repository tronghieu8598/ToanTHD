import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {readCourseBank,readFrozenCourseBank} from '../scripts/course-bank-data.mjs';
import {decodeQuestion,canEnterSession} from '../lib/course-bank.mjs';
import {availableQuestionVariantKeys,resolveQuestionVariant} from '../lib/accepted-variants.mjs';
import {validateRichHtml} from '../lib/rich-html.mjs';
import index from '../lib/chapter-variants/index.mjs';
import loaders from '../lib/chapter-variants/loaders.mjs';
import pilot from '../data/chapter-variants/generated/12-C06.json' with {type:'json'};
import {VARIANT_ASSET_PATHS} from '../lib/chapter-variants/assets.mjs';

const read = p => fs.readFileSync(new URL('../'+p,import.meta.url));
const sha = b => createHash('sha256').update(b).digest('hex');
const bank=new Map(readCourseBank().questions.map(q=>[q.id,decodeQuestion(q)]));
const frozenBank=new Map(readFrozenCourseBank().questions.map(q=>[q.id,decodeQuestion(q)]));
const release=JSON.parse(read('data/chapter-variants/release.json'));

test('I–VI: the retained approvals match their source and runtime variants follow the current question fingerprint',async()=>{
 let total=0,held=0,sourceAssets=0;
 const allKeys=new Set(),counts=[];
 for(const chapter of release.chapters){
  const bytes=read('data/chapter-variants/source/'+chapter.file);
  assert.equal(sha(bytes),chapter.sha256);
  const source=JSON.parse(gunzipSync(bytes));
  const packed=(await loaders[chapter.id]()).default;
  const frozen=JSON.parse(gunzipSync(Buffer.from(packed,'base64')));
  const assetMap=new Map(source.assets.map(a=>[a.path,'/variant-assets/'+sha(a.svg)+'.svg']));
  sourceAssets+=source.assets.length;
  for(const a of source.assets) assert.equal(read('public'+assetMap.get(a.path)).toString(),a.svg);
  let count=0;
  for(const item of source.items){
   const q=frozenBank.get(item.source_id),sourceIndex=index[q.id];
   assert.equal(sourceIndex.fingerprint,q.bank_fingerprint);
   assert.equal(sourceIndex.count,item.variants.length);
   if(!item.variants.length)held++;
   for(const original of item.variants){
    const key='cv-'+sourceIndex.version+'-'+sourceIndex.source+'-'+original.number;
    assert.ok(key.length<=30 && !allKeys.has(key));allKeys.add(key);
    const v=frozen[q.id].find(variant=>variant.number===original.number);
    assert.deepEqual(v.correct,original.kind==='short'?String(original.correct):original.correct);
    assert.equal(v.id,original.id);
    assert.equal(v.prompt,original.prompt.replace(/variant-assets\/[A-Za-z0-9._-]+\.svg/g,p=>assetMap.get(p)));
    assert.equal(v.solution,original.solution.replace(/variant-assets\/[A-Za-z0-9._-]+\.svg/g,p=>assetMap.get(p)));
    for(const html of [v.prompt,v.solution,...v.choices.map(c=>c.text)])validateRichHtml(html);
    total++;count++;
   }
   const current=bank.get(q.id), before=JSON.stringify(current);
   const currentIndex=pilot.entries[q.id]?.index ?? sourceIndex;
   const keys=availableQuestionVariantKeys(current);
   assert.equal(keys.length,currentIndex.fingerprint===current.bank_fingerprint?currentIndex.count:0);
   for(const [i,key] of keys.entries()){
    const expected=(pilot.entries[q.id]?.variants ?? frozen[q.id])[i];
    const variant=await resolveQuestionVariant(current,key);
    assert.equal(variant.id,current.id);
    assert.equal(variant.variant.number,i+1);
    for(const field of ['prompt','choices','correct','solution'])assert.deepEqual(variant[field],expected[field]);
    assert.equal(canEnterSession(variant,{allowFree:true}),true);
    assert.equal(canEnterSession(variant,{allowFree:false}),variant.kind!=='free');
   }
   assert.equal(JSON.stringify(current),before);
  }
  counts.push(count);
 }
 assert.deepEqual(counts,[900,700,604,576,636,436]);assert.equal(total,3852);assert.equal(held,75);assert.equal(sourceAssets,988);
 assert.equal(Object.keys(index).length,1038);
 for(const url of VARIANT_ASSET_PATHS)assert.equal(sha(read('public'+url)),url.match(/[a-f0-9]{64}/)[0]);
});

test('I–VI: archived, revised, mismatched, held and stale selections cannot substitute another source',async()=>{
 const [a,b]=[...bank.values()].filter(q=>availableQuestionVariantKeys(q).length);
 const key=availableQuestionVariantKeys(a)[0];
 for(const change of [{revision:2},{bank_fingerprint:'changed'},{kind:'free'},{archived_at:1}]){
  assert.deepEqual(availableQuestionVariantKeys({...a,...change}),[]);
  assert.equal(await resolveQuestionVariant({...a,...change},key),null);
 }
 assert.equal(await resolveQuestionVariant(b,key),null);
 assert.equal(await resolveQuestionVariant(a,key.replace(/^cv-.{12}/,'cv-000000000000')),null);
 const held=bank.get(Object.keys(index).find(id=>index[id].count===0&&availableQuestionVariantKeys(bank.get(id)).length===0));
 assert.deepEqual(availableQuestionVariantKeys(held),[]);
 assert.equal(await resolveQuestionVariant(held,key),null);
});
