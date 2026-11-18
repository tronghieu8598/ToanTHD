import test from 'node:test';
import assert from 'node:assert/strict';
import {createAttemptSync,readPending} from '../lib/client/attempt-sync.mjs';
const stale=()=>Object.assign(new Error('stale'),{status:409,code:'stale_write'});

test('Autosave coalesces changes and serializes acknowledged revisions',async()=>{
 const calls=[];let release;
 const sync=createAttemptSync({save:async(answers,rev)=>{calls.push({answers,rev});if(calls.length===1)await new Promise(r=>{release=r;});return {save_revision:rev+1};},refresh:async()=>{},delay:60_000});
 sync.change({a:'A'});const flight=sync.flush();sync.change({a:'B'});sync.change({a:'C',b:'1'});release();await flight;
 assert.equal(calls.length,2);assert.deepEqual(calls.map(c=>c.rev),[0,1]);assert.deepEqual(calls[1].answers,{a:'C',b:'1'});assert.equal(sync.dirty,false);sync.dispose();
});

test('Autosave retries a dropped connection and resolves a lost acknowledgement without overwriting newer data',async()=>{
 let attempts=0,acks=0;const pending=[];
 const sync=createAttemptSync({save:async()=>{attempts++;if(attempts===1)throw new Error('offline');throw stale();},refresh:async()=>({save_revision:1,answers:{b:'1',a:'A'},submitted_at:null}),onPending:p=>pending.push(p),onAck:()=>acks++,delay:60_000,retryDelay:60_000});
 sync.change({a:'A',b:'1'});await assert.rejects(sync.flush(),/offline/);assert.equal(sync.dirty,true);assert.deepEqual(pending[0].answers,{a:'A',b:'1'});await sync.flush();assert.equal(acks,1);assert.equal(sync.revision,1);assert.equal(sync.dirty,false);sync.dispose();
});

test('Autosave blocks conflicting writes or a revoked device and never retries a submitted answer',async()=>{
 const statuses=[];
 const sync=createAttemptSync({save:async()=>{throw stale();},refresh:async()=>({save_revision:2,answers:{a:'B'}}),onStatus:s=>statuses.push(s),delay:60_000});
 sync.change({a:'A'});await assert.rejects(sync.flush());assert.equal(sync.blocked,true);assert.equal(statuses.at(-1),'blocked');sync.dispose();
 let settled;
 const closed=createAttemptSync({save:async()=>{throw Object.assign(new Error('closed'),{status:409,code:'closed'});},refresh:async()=>({submitted_at:1,score:5}),onSettled:a=>{settled=a;},delay:60_000});
 closed.change({a:'A'});await closed.flush();assert.equal(settled.score,5);closed.dispose();
 const revoked=createAttemptSync({save:async()=>{throw Object.assign(new Error('revoked'),{status:401});},refresh:async()=>{},delay:60_000});revoked.change({a:'A'});await assert.rejects(revoked.flush());assert.equal(revoked.blocked,true);revoked.dispose();
});

test('Reloaded drafts distinguish unsent work, lost acknowledgements and another tab’s newer revision',()=>{
 const a={save_revision:1,answers:{q:'A'},submitted_at:null};
 assert.equal(readPending(JSON.stringify({answers:{q:'B'},base_revision:1}),a).conflict,false);
 assert.equal(readPending(JSON.stringify({answers:{q:'B'},base_revision:0}),a).conflict,true);
 assert.equal(readPending(JSON.stringify({answers:{q:'A'},base_revision:0}),a).alreadySaved,true);
 assert.equal(readPending('{broken',a),null);assert.equal(readPending('{}',{...a,submitted_at:1}),null);
 assert.deepEqual(readPending('{"q":"B"}',{...a,save_revision:0}).answers,{q:'B'});
});
