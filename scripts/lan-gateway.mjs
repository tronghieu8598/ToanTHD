import http from 'node:http';
import {networkInterfaces} from 'node:os';
import {isPrivateIPv4} from '../lib/share.mjs';
import {fileURLToPath} from 'node:url';
import {createLibraryHandler} from './library-static.mjs';

export function lanAddresses(interfaces) {
 if(!interfaces){try{interfaces=networkInterfaces();}catch{return [];}}
 const found=new Map();
 for(const [name,list] of Object.entries(interfaces))for(const item of list||[]){
  if((item.family==='IPv4'||item.family===4)&&!item.internal&&isPrivateIPv4(item.address))found.set(item.address,{address:item.address,name});
 }
 return [...found.values()].sort((a,b)=>Number(/virtual|vmware|vethernet|vpn|docker/i.test(a.name))-Number(/virtual|vmware|vethernet|vpn|docker/i.test(b.name))||a.name.localeCompare(b.name));
}
export const isLoopback=ip=>ip==='127.0.0.1'||ip==='::1'||ip==='::ffff:127.0.0.1';
const publicPaths=new Set(['/api/health','/api/local/library','/api/public/meta','/api/public/session','/api/public/lookup','/api/public/join','/api/public/attempt','/api/public/save','/api/public/submit','/api/public/heartbeat']);

export function routeAccess(path,remoteAddress,method='GET') {
 if(isLoopback(remoteAddress))return 'allow';
 const peer=String(remoteAddress||'').replace(/^::ffff:/,'');
 if(!isPrivateIPv4(peer)&&!/^127\.\d+\.\d+\.\d+$/.test(peer))return 'deny';
 if(path==='/')return 'student';
 if(path.startsWith('/api/'))return publicPaths.has(path)?'allow':'deny';
 return ['GET','HEAD'].includes(method)?'allow':'deny';
}

export function createGateway({targetPort,lan=false,addresses=()=>lanAddresses(),port=8787,libraryPort=8789,libraryOnly=false,libraryAppPort=8787,libraryRoot=fileURLToPath(new URL('../public/hoc-lieu-so/nguon',import.meta.url))}={}) {
 const agent=new http.Agent({keepAlive:true,maxSockets:128,maxFreeSockets:32});
 const serveLibrary=createLibraryHandler(libraryRoot);
 const limits=new Map();
 const respond=(res,status,data,headers={})=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff',...headers});res.end(JSON.stringify(data));};
 const server=http.createServer((req,res)=>{
  const actualPort=server.address()?.port||port,ip=req.socket.remoteAddress;
  const candidates=addresses();
  const hosts=new Set([`127.0.0.1:${actualPort}`,`localhost:${actualPort}`,`[::1]:${actualPort}`,...candidates.map(v=>`${v.address}:${actualPort}`)]);
  const host=String(req.headers.host||'').toLowerCase();
  if(!hosts.has(host)){respond(res,403,{error:'Địa chỉ máy chủ không hợp lệ.'});return;}
  if(!req.url?.startsWith('/')||req.url.startsWith('//')){respond(res,400,{error:'Đường dẫn không hợp lệ.'});return;}
  const origin='http://'+host;
  let url,path;
  try{url=new URL(req.url,origin);path=decodeURIComponent(url.pathname);}catch{respond(res,400,{error:'Đường dẫn không hợp lệ.'});return;}
  if(path.includes('\\')||path.includes('\0')){respond(res,400,{error:'Đường dẫn không hợp lệ.'});return;}
  if(libraryOnly&&!path.startsWith('/hoc-lieu-so/nguon/')){respond(res,404,{error:'Không tìm thấy học liệu.'});return;}
  if(libraryOnly){
   const appOrigin=new URL(origin);appOrigin.port=String(libraryAppPort);
   if(req.headers.origin===appOrigin.origin){res.setHeader('Access-Control-Allow-Origin',appOrigin.origin);res.setHeader('Vary','Origin');}
  }
  const access=routeAccess(path,ip,req.method);
  if(access==='deny'){respond(res,403,{error:'Không gian giáo viên chỉ mở trên laptop chạy web. Hãy dùng màn hình học sinh.'});return;}
  if(access==='student'){res.writeHead(303,{Location:'/hoc-sinh','Cache-Control':'no-store'});res.end();return;}
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.headers.origin&&req.headers.origin!==origin){respond(res,403,{error:'Yêu cầu đến từ địa chỉ khác không được chấp nhận.'});return;}
  if(serveLibrary(req,res,path))return;
  if(path==='/api/local/library'){
   if(req.method!=='GET'){respond(res,405,{error:'Chỉ nhận GET.'});return;}
   const base=new URL(origin);base.port=String(libraryPort);
   respond(res,200,{base:base.origin});return;
  }
  if(path==='/api/local/network'){
   if(req.method!=='GET'){respond(res,405,{error:'Chỉ nhận GET.'});return;}
   respond(res,200,{mode:lan?'lan':'local',port:actualPort,teacher_url:`http://127.0.0.1:${actualPort}/`,addresses:lan?candidates.map(v=>({...v,base:`http://${v.address}:${actualPort}`})):[],detected:candidates.length});return;
  }
  const contentLength=Number(req.headers['content-length']||0);
  if(!Number.isFinite(contentLength)||contentLength>5_100_000){respond(res,413,{error:'Dữ liệu gửi lên quá lớn.'});return;}
  if(!isLoopback(ip)&&['/api/public/lookup','/api/public/join','/api/public/session'].includes(path)){
   const now=Date.now(),key=ip+':'+path;
   if(limits.size>2000)for(const [k,v] of limits)if(v.until<now)limits.delete(k);
   const entry=limits.get(key);const limit=path==='/api/public/join'?20:60;
   if(entry&&entry.until>now){if(++entry.count>limit){respond(res,429,{error:'Thao tác quá nhanh. Chờ một phút rồi thử lại.'},{'Retry-After':'60'});return;}}
   else limits.set(key,{count:1,until:now+60_000});
  }
  const headers={...req.headers,host:`127.0.0.1:${targetPort}`};
  for(const key of Object.keys(headers))if(key.startsWith('x-forwarded-')||key.startsWith('x-toanthd-')||['forwarded','connection','proxy-connection','upgrade'].includes(key))delete headers[key];
  if(!isLoopback(ip))delete headers.cookie;
  // The gateway validates the browser's original Origin before rewriting both
  // Host and Origin for the loopback worker. No client-forwarded header is trusted.
  if(req.headers.origin)headers.origin=`http://127.0.0.1:${targetPort}`;
  const upstream=http.request({hostname:'127.0.0.1',port:targetPort,path:req.url,method:req.method,headers,agent},incoming=>{
   const outgoing={...incoming.headers};delete outgoing.connection;
   if(typeof outgoing.location==='string'&&outgoing.location.startsWith(`http://127.0.0.1:${targetPort}/`))outgoing.location=outgoing.location.replace(`http://127.0.0.1:${targetPort}`,origin);
   res.writeHead(incoming.statusCode||502,outgoing);incoming.pipe(res);
   incoming.on('error',()=>res.destroy());
  });
  let size=0,ended=false;
  upstream.setTimeout(20_000,()=>upstream.destroy(new Error('timeout')));
  upstream.on('error',()=>{if(!ended&&!res.headersSent)respond(res,502,{error:'Chưa kết nối được máy chủ. Giữ cửa sổ chạy web mở và thử lại.'});else res.destroy();});
  req.on('data',chunk=>{size+=chunk.length;if(size>5_100_000&&!ended){ended=true;respond(res,413,{error:'Dữ liệu gửi lên quá lớn.'});upstream.destroy();}});
  req.on('aborted',()=>{ended=true;upstream.destroy();});
  res.on('close',()=>{if(!res.writableFinished){ended=true;upstream.destroy();}});
  req.pipe(upstream);
 });
 server.requestTimeout=30_000;server.headersTimeout=15_000;server.keepAliveTimeout=5_000;
 server.on('close',()=>agent.destroy());
 return server;
}
