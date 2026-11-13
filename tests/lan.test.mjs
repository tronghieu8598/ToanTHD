import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import jsQR from 'jsqr';
import {joinURL,manualLanBase,qrData,isPrivateIPv4} from '../lib/share.mjs';
import {lanAddresses,routeAccess,createGateway} from '../scripts/lan-gateway.mjs';

test('QR decodes to the exact join URL with a four-module quiet zone',()=>{
 const url=joinURL('http://192.168.137.1:8787/path?old=x','ABC234'),qr=qrData(url),scale=8,size=qr.size*scale,pixels=new Uint8ClampedArray(size*size*4);pixels.fill(255);
 for(let y=0;y<qr.modules.size;y++)for(let x=0;x<qr.modules.size;x++)if(qr.modules.get(y,x))for(let dy=0;dy<scale;dy++)for(let dx=0;dx<scale;dx++){const i=(((y+4)*scale+dy)*size+(x+4)*scale+dx)*4;pixels[i]=pixels[i+1]=pixels[i+2]=0;}
 assert.equal(jsQR(pixels,size,size).data,url);assert.equal(url,'http://192.168.137.1:8787/hoc-sinh?code=ABC234');assert.throws(()=>joinURL('javascript:alert(1)','ABC234'));
});

test('LAN discovery rejects public, loopback, malformed and non-IPv4 interfaces',()=>{
 for(const ip of ['10.0.0.1','172.16.1.2','172.31.255.1','192.168.137.1'])assert.ok(isPrivateIPv4(ip));
 for(const ip of ['127.0.0.1','8.8.8.8','172.32.1.1','192.168.01.1','192.168.1.256','::1','example.com'])assert.ok(!isPrivateIPv4(ip));
 const found=lanAddresses({WiFi:[{family:'IPv4',internal:false,address:'192.168.1.2'}],VPN:[{family:'IPv4',internal:false,address:'10.1.1.1'}],Loop:[{family:'IPv4',internal:true,address:'127.0.0.1'}]});assert.equal(found[0].address,'192.168.1.2');
 assert.equal(manualLanBase('192.168.1.2'),'http://192.168.1.2:8787');assert.throws(()=>manualLanBase('8.8.8.8'));
 assert.equal(routeAccess('/api/teacher/bootstrap','192.168.1.4'),'deny');assert.equal(routeAccess('/api/teacher/demo','192.168.1.4','POST'),'deny');assert.equal(routeAccess('/api/local/network','192.168.1.4'),'deny');assert.equal(routeAccess('/api/public/save','192.168.1.4','POST'),'allow');
 assert.equal(routeAccess('/api/public/save','8.8.8.8','POST'),'deny');assert.equal(routeAccess('/api/public/save','::ffff:192.168.1.4','POST'),'allow');
});

test('LAN gateway validates Host/Origin, strips untrusted forwarding headers and limits teachers to the laptop',async()=>{
 const upstream=http.createServer(async(req,res)=>{const chunks=[];for await(const chunk of req)chunks.push(chunk);res.setHeader('Content-Type','application/json');res.end(JSON.stringify({host:req.headers.host,origin:req.headers.origin,cookie:req.headers.cookie,forwarded:req.headers['x-forwarded-host'],body:Buffer.concat(chunks).toString()}));});
 await new Promise(r=>upstream.listen(0,'127.0.0.1',r));
 const targetPort=upstream.address().port,gateway=createGateway({targetPort,lan:true,addresses:()=>[{address:'192.168.1.2',name:'WiFi'}]});await new Promise(r=>gateway.listen(0,'127.0.0.1',r));const port=gateway.address().port;
 async function send(path,{remote=false,headers={},method='GET',body}={}){
  return new Promise((resolve,reject)=>{const req=http.request({hostname:'127.0.0.1',port,path,localAddress:remote?'127.0.0.2':'127.0.0.1',method,headers:{Host:`192.168.1.2:${port}`,...headers}},res=>{const chunks=[];res.on('data',c=>chunks.push(c));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,data:Buffer.concat(chunks).toString()}));});req.on('error',reject);req.end(body);});
 }
 try{
  assert.equal((await send('/api/teacher/bootstrap',{remote:true})).status,403);
  assert.equal((await send('/api/%74eacher/bootstrap',{remote:true})).status,403);
  assert.equal((await send('/api/local/network',{remote:true})).status,403);
  assert.equal((await send('/',{remote:true})).headers.location,'/hoc-sinh');
  assert.equal((await send('/api/health',{headers:{Host:`evil.example:${port}`}})).status,403);
  assert.equal((await send('/api/public/save',{remote:true,method:'POST',headers:{Origin:'http://evil.example'},body:'{}'})).status,403);
  const response=await send('/api/public/save',{remote:true,method:'POST',headers:{Origin:`http://192.168.1.2:${port}`,Cookie:'toanthd_teacher=secret','X-Forwarded-Host':'evil.example','Content-Type':'application/json'},body:'{"answers":{}}'});
  assert.equal(response.status,200);const proxied=JSON.parse(response.data);assert.equal(proxied.host,`127.0.0.1:${targetPort}`);assert.equal(proxied.origin,`http://127.0.0.1:${targetPort}`);assert.equal(proxied.cookie,undefined);assert.equal(proxied.forwarded,undefined);assert.equal(proxied.body,'{"answers":{}}');
  const metadata=JSON.parse((await send('/api/local/network')).data);assert.equal(metadata.mode,'lan');assert.equal(metadata.addresses[0].base,`http://192.168.1.2:${port}`);
 }finally{gateway.closeAllConnections();await new Promise(r=>gateway.close(r));upstream.closeAllConnections();await new Promise(r=>upstream.close(r));}
});
