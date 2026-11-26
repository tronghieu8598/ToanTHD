import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import {mkdtempSync,writeFileSync,rmSync,openSync,ftruncateSync,closeSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createGateway} from '../scripts/lan-gateway.mjs';

test('Local library streams large files, HEAD and media ranges without exposing sibling files or teacher routes',async()=>{
 const root=mkdtempSync(path.join(tmpdir(),'toanthd-library-'));
 writeFileSync(path.join(root,'sample.mp3'),'0123456789');
 writeFileSync(path.join(root,'.private'),'hidden');
 const fd=openSync(path.join(root,'large.html'),'w');ftruncateSync(fd,30*1024*1024);closeSync(fd);
 const gateway=createGateway({targetPort:1,libraryRoot:root});
 await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));
 const port=gateway.address().port;
 const send=(route,method='GET',headers={})=>new Promise((resolve,reject)=>{
  const req=http.request({host:'127.0.0.1',port,path:route,method,headers},res=>{
   const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks).toString()}));
  });req.on('error',reject);req.end();
 });
 try{
  const base='/hoc-lieu-so/nguon/';
  const full=await send(base+'sample.mp3');assert.equal(full.status,200);assert.equal(full.body,'0123456789');assert.equal(full.headers['content-type'],'audio/mpeg');
  const head=await send(base+'large.html','HEAD');assert.equal(head.status,200);assert.equal(Number(head.headers['content-length']),30*1024*1024);assert.equal(head.body,'');
  const chunk=await send(base+'sample.mp3','GET',{Range:'bytes=2-5'});assert.equal(chunk.status,206);assert.equal(chunk.body,'2345');assert.equal(chunk.headers['content-range'],'bytes 2-5/10');
  assert.equal((await send(base+'sample.mp3','GET',{Range:'bytes=-3'})).body,'789');
  assert.equal((await send(base+'sample.mp3','GET',{Range:'bytes=8-'})).body,'89');
  assert.equal((await send(base+'sample.mp3','GET',{Range:'bytes=50-90'})).status,416);
  assert.equal((await send(base+'sample.mp3','GET',{'If-None-Match':full.headers.etag})).status,304);
  assert.equal((await send(base+'sample.mp3','POST')).status,405);
  assert.equal((await send(base+'%2e%2e%2fsecret.txt')).status,400);
  assert.equal((await send(base+'.private')).status,400);
  assert.equal((await send(base+'missing.html')).status,404);
  assert.equal((await send(base+'sample.mp3','GET',{Host:'evil.example'})).status,403);
 }finally{gateway.closeAllConnections();await new Promise(resolve=>gateway.close(resolve));rmSync(root,{recursive:true,force:true});}
});

test('The storage-enabled library origin serves only resources and permits reads from the classroom app',async()=>{
 const root=mkdtempSync(path.join(tmpdir(),'toanthd-isolated-library-'));
 writeFileSync(path.join(root,'lesson.html'),'<h1>Học liệu</h1>');
 const gateway=createGateway({libraryRoot:root,libraryOnly:true,libraryAppPort:8787});
 await new Promise(resolve=>gateway.listen(0,'127.0.0.1',resolve));
 const base='http://127.0.0.1:'+gateway.address().port;
 try{
  for(const route of ['/api/teacher/bootstrap','/api/teacher/demo','/api/local/library','/'])assert.equal((await fetch(base+route)).status,404);
  const allowed=await fetch(base+'/hoc-lieu-so/nguon/lesson.html',{method:'HEAD',headers:{Origin:'http://127.0.0.1:8787'}});
  assert.equal(allowed.status,200);assert.equal(allowed.headers.get('access-control-allow-origin'),'http://127.0.0.1:8787');
  const other=await fetch(base+'/hoc-lieu-so/nguon/lesson.html',{headers:{Origin:'https://unrelated.example'}});
  assert.equal(other.headers.get('access-control-allow-origin'),null);
 }finally{gateway.closeAllConnections();await new Promise(resolve=>gateway.close(resolve));rmSync(root,{recursive:true,force:true});}
});
