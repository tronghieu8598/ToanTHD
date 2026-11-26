// One request in flight per attempt. Changes made while saving are coalesced;
// a lost acknowledgement is resolved against the server's revision and answers.
const fingerprint=a=>JSON.stringify(Object.keys(a||{}).sort().map(k=>[k,typeof a[k]==='string'?a[k].trim():a[k]]));
const equal=(a,b)=>fingerprint(a)===fingerprint(b);
export function createAttemptSync({answers={},revision=0,save,refresh,onPending=(_value)=>{},onAck=()=>{},onStatus=(_status,_text)=>{},onSettled=(_attempt)=>{},delay=450,retryDelay=5000}) {
 let latest=answers,generation=0,acknowledged=0,flight=null,timer=null,disposed=false,blocked=false;
 const clear=()=>{if(timer){clearTimeout(timer);timer=null;}};
 const schedule=ms=>{clear();if(!disposed&&!blocked)timer=setTimeout(()=>{timer=null;void flush().catch(()=>{});},ms);};
 function pending(){if(!disposed)onPending({answers:latest,base_revision:revision});}
 function change(next){if(disposed||blocked)return;latest=next;generation++;pending();onStatus('pending','Đang chờ lưu…');schedule(delay);}
 function fail(e){
  if(disposed)return;
  if(e.status===401||e.code==='stale_write'||e.code==='closed'){
   blocked=true;onStatus('blocked',e.status===401?'Thiết bị đã hết quyền làm bài. Báo giáo viên để vào lại.':'Bài đã thay đổi. Bấm tải lại để đối chiếu bản nháp.');
  }else{onStatus('offline','Chưa tới máy chủ · Bản nháp lưu trên thiết bị');schedule(retryDelay);}
 }
 async function flush(){
  clear();
  if(disposed)return;
  if(blocked)throw Object.assign(new Error('Cần tải lại bài để kiểm tra trạng thái.'),{status:409});
  if(flight)return flight;
  if(acknowledged===generation)return;
  flight=(async()=>{
   while(!disposed&&acknowledged<generation){
    const sent=latest,sentGeneration=generation;
    onStatus('saving','Đang lưu lên máy chủ…');
    let result;
    try{result=await save(sent,revision);}
    catch(e){
     if(e.code==='stale_write'||e.code==='closed'){
      const current=await refresh();
      if(disposed)return;
      if(current.submitted_at){blocked=true;onSettled(current);return;}
      if(e.code==='stale_write'&&equal(current.answers,sent))result={save_revision:current.save_revision};
      else throw e;
     }else throw e;
    }
    if(disposed)return;
    revision=result.save_revision;acknowledged=sentGeneration;
    if(acknowledged===generation){onAck();onStatus('saved','Đã lưu trên máy chủ');}
    else pending();
   }
  })().catch(e=>{fail(e);throw e;}).finally(()=>{flight=null;});
  return flight;
 }
 return {change,flush,dispose(){disposed=true;clear();},get revision(){return revision;},get dirty(){return generation>acknowledged;},get blocked(){return blocked;}};
}

export function readPending(raw,attempt) {
 if(!raw||attempt.submitted_at)return null;
 try{
  const parsed=JSON.parse(raw),hasEnvelope=parsed&&Object.hasOwn(parsed,'base_revision')&&Object.hasOwn(parsed,'answers');
  const pending=hasEnvelope?parsed:{answers:parsed,base_revision:0};
  if(!pending.answers||typeof pending.answers!=='object'||Array.isArray(pending.answers))return null;
  return {...pending,conflict:pending.base_revision!==attempt.save_revision&&!equal(pending.answers,attempt.answers),alreadySaved:equal(pending.answers,attempt.answers)};
 }catch{return null;}
}
