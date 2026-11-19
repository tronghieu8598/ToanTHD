import {createReadStream,realpathSync,statSync} from 'node:fs';
import path from 'node:path';
import {libraryPath as prefix, libraryContentType, parseLibraryRange, validLibraryPath} from '../lib/library-http.mjs';

// Large offline textbooks stay on disk and stream through the local LAN server.
// They do not enter the Worker's 25 MiB static-asset pipeline or JS heap.
export function createLibraryHandler(folder){
 const root=path.resolve(folder);
 return (req,res,pathname)=>{
  if(!pathname.startsWith(prefix))return false;
  const error=(code,headers={})=>{res.writeHead(code,{'Cache-Control':'no-store',...headers});res.end();return true;};
  if(!['GET','HEAD'].includes(req.method))return error(405,{Allow:'GET, HEAD'});
  const relative=pathname.slice(prefix.length);
  if(!validLibraryPath(relative))return error(400);
  let target=path.resolve(root,relative),stat;
  try{
   const realRoot=realpathSync(root);target=realpathSync(target);
   const inside=path.relative(realRoot,target);
   if(!inside || inside.startsWith('..'+path.sep) || path.isAbsolute(inside))return error(403);
   stat=statSync(target);if(!stat.isFile())return error(404);
  }catch{return error(404);}
  const etag='"'+stat.size.toString(16)+'-'+Math.trunc(stat.mtimeMs).toString(16)+'"';
  const headers={'Content-Type':libraryContentType(target),'X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','Cache-Control':'no-cache','Last-Modified':stat.mtime.toUTCString(),ETag:etag};
  if(target.endsWith('.zip'))headers['Content-Disposition']='attachment';
  if(req.headers['if-none-match']===etag){res.writeHead(304,headers);res.end();return true;}
  let start=0,end=stat.size-1,partial=false;
  const range=req.headers.range;
  if(range && (!req.headers['if-range'] || req.headers['if-range']===etag || req.headers['if-range']===headers['Last-Modified'])){
   const requested=parseLibraryRange(range,stat.size);
   if(!requested)return error(416,{'Content-Range':'bytes */'+stat.size});
   ({start,end}=requested);
   partial=true;headers['Content-Range']=`bytes ${start}-${end}/${stat.size}`;
  }
  headers['Content-Length']=stat.size===0?0:end-start+1;
  res.writeHead(partial?206:200,headers);
  if(req.method==='HEAD'||stat.size===0){res.end();return true;}
  const stream=createReadStream(target,{start,end});
  stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);
  return true;
 };
}
