/**
 * Install the teacher's exact HOC LIEU SO.zip without npm dependencies.
 * Node 22+ only. Uses ZIP central-directory offsets so 130 MB HTML is read
 * one file at a time, keeping the original relative E-learning asset paths.
 * Usage: node scripts/install-digital-library.mjs "C:\\...\\HOC LIEU SO.zip"
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { inflateRawSync, crc32 } from 'node:zlib';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const input = path.resolve(process.argv[2] || path.join(root, 'HOC LIEU SO.zip'));
const catalog = JSON.parse(fs.readFileSync(path.join(root,'data/digital-library/catalog.json'), 'utf8'));
const outputDir = path.resolve(root, 'public');
const e = catalog.find(item => item.kind === 'elearning');
const ePrefix = e?.sourcePath.replace(/index\.html$/i,'');
const eDest = 'hoc-lieu-so/nguon/e-learning-csn/';
const wanted = new Map(catalog.filter(item => item.kind !== 'elearning').map(item => [item.sourcePath, item.url.replace(/^\//, '')]));
const installed = new Set();
function stop(message) { console.error(message); process.exit(1); }
if(!fs.existsSync(input))stop(`Không tìm thấy ZIP gốc: ${input}\nHãy đưa đường dẫn file HOC LIEU SO.zip của thầy vào lệnh.`);
const fd = fs.openSync(input,'r');
const fileSize = fs.fstatSync(fd).size;
function read(length, offset) {
 if (length<0 || length>220_000_000 || offset<0 || offset+length>fileSize) throw new Error('Dữ liệu ZIP không hợp lệ.');
 const buf = Buffer.allocUnsafe(length); let done=0;
 while(done<length){const bytes=fs.readSync(fd,buf,done,length-done,offset+done);if(!bytes)throw new Error('ZIP bị cắt mất dữ liệu.');done+=bytes;}
 return buf;
}
try {
 const tailSize=Math.min(65557,fileSize), tail=read(tailSize,fileSize-tailSize);
 let end=-1;
 for(let i=tail.length-22;i>=0;i--)if(tail.readUInt32LE(i)===0x06054b50){end=i;break;}
 if(end<0)throw new Error('Không có thư mục trung tâm ZIP.');
 const entries=tail.readUInt16LE(end+10), dirSize=tail.readUInt32LE(end+12), dirOffset=tail.readUInt32LE(end+16);
 if(entries===0xffff || dirOffset===0xffffffff)throw new Error('ZIP64 chưa được hỗ trợ.');
 const dir=read(dirSize,dirOffset); let pos=0, files=0, bytes=0;
 for(let i=0;i<entries;i++){
  if(pos+46>dir.length || dir.readUInt32LE(pos)!==0x02014b50)throw new Error('Mục lục ZIP không hợp lệ.');
  const method=dir.readUInt16LE(pos+10), compressed=dir.readUInt32LE(pos+20), uncompressed=dir.readUInt32LE(pos+24);
  const zipcrc=dir.readUInt32LE(pos+16), nameLength=dir.readUInt16LE(pos+28), extraLength=dir.readUInt16LE(pos+30), commentLength=dir.readUInt16LE(pos+32), offset=dir.readUInt32LE(pos+42);
  const source=dir.subarray(pos+46,pos+46+nameLength).toString('utf8');
  pos+=46+nameLength+extraLength+commentLength;
  const target = wanted.get(source) || (ePrefix && source.startsWith(ePrefix) ? eDest + source.slice(ePrefix.length) : null);
  if(!target || target.endsWith('/'))continue;
  const absolute=path.resolve(outputDir,...target.split('/'));
  if(!absolute.startsWith(outputDir+path.sep))throw new Error('Đường dẫn nguồn không an toàn: '+source);
  const loc=read(30,offset);
  if(loc.readUInt32LE(0)!==0x04034b50)throw new Error('Header nguồn ZIP lỗi: '+source);
  const dataOffset=offset+30+loc.readUInt16LE(26)+loc.readUInt16LE(28);
  const packed=read(compressed,dataOffset);
  const data=method===8?inflateRawSync(packed):method===0?packed:null;
  if(!data)throw new Error('Định dạng nén không được hỗ trợ: '+source);
  if(data.length!==uncompressed || crc32(data)!==zipcrc)throw new Error('Sai dung lượng hoặc checksum: '+source);
  fs.mkdirSync(path.dirname(absolute),{recursive:true});
  fs.writeFileSync(absolute,data);installed.add(source);files++;bytes+=data.length;
 }
 const missing=catalog.filter(item=>!installed.has(item.sourcePath));
 if(missing.length)throw new Error('Thiếu các tệp trong ZIP: '+missing.map(r=>r.sourcePath).join('; '));
 console.log(`Đã cài ${files} tệp (${(bytes/1e6).toFixed(1)} MB); ${catalog.length} tài nguyên được lập danh mục.`);
 console.log('Mở web và truy cập /hoc-lieu-so.');
} finally { fs.closeSync(fd); }
