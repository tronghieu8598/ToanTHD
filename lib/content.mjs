import katex from 'katex';
import {numericValue} from './grading.mjs';
export class ValidationError extends Error { constructor(message){super(message);this.name='ValidationError';} }
export const text = (v,max=20000) => {if(typeof v!=='string')throw new ValidationError('Nội dung cần là văn bản.');const s=v.normalize('NFC').trim();if(s.length>max)throw new ValidationError(`Nội dung vượt ${max} ký tự.`);return s;};
export const escape = s => String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderSource(input){
 const s=text(input);let out='',last=0;
 const pattern=/\$\$[\s\S]+?\$\$|\$(?:\\.|[^$])+?\$|\\\([\s\S]+?\\\)|\\\[[\s\S]+?\\\]/g;
 for(const match of s.matchAll(pattern)){
  out+=escape(s.slice(last,match.index)).replace(/\r?\n/g,'<br>');
  const token=match[0],display=token.startsWith('$$')||token.startsWith('\\['),n=token.startsWith('$$')||token.startsWith('\\')?2:1;
  const latex=token.slice(n,-n);
  if(/\\(?:href|url|includegraphics|html\w*)\b/.test(latex))throw new ValidationError('Công thức chỉ nhận ký hiệu toán, không nhận liên kết hay lệnh HTML.');
  out+=katex.renderToString(latex,{output:'mathml',displayMode:display,throwOnError:true,trust:false,strict:'ignore',maxExpand:300,maxSize:20});last=match.index+token.length;
 }
 return '<p>'+out+escape(s.slice(last)).replace(/\r?\n/g,'<br>')+'</p>';
}
export function normalizeSource(raw){
 if(!raw||typeof raw!=='object')throw new ValidationError('Câu hỏi không hợp lệ.');
 const kind=raw.kind;if(!['mcq','tf','short'].includes(kind))throw new ValidationError('Dạng câu cần là mcq, tf hoặc short.');
 const number=Number(raw.original_number);if(!Number.isInteger(number)||number<1||number>99999)throw new ValidationError('Số câu gốc phải là số nguyên từ 1 đến 99999.');
 const prompt=text(raw.prompt||'');if(!prompt)throw new ValidationError('Thiếu nội dung câu hỏi.');
 const solution=text(raw.solution||'');let correct=raw.correct,choices=[];
 if(kind!=='short'){
  if(!Array.isArray(raw.choices)||raw.choices.length!==4)throw new ValidationError('Cần đủ bốn phương án hoặc bốn ý.');
  choices=raw.choices.map((v,i)=>{const t=text(typeof v==='string'?v:v.text||'',8000);if(!t)throw new ValidationError('Có phương án/ý đang để trống.');return {key:(kind==='mcq'?'ABCD':'abcd')[i],text:t};});
 }
 if(kind==='mcq'){correct=String(correct||'').trim().toUpperCase();if(!'ABCD'.includes(correct)||correct.length!==1)throw new ValidationError('Đáp án trắc nghiệm cần là A, B, C hoặc D.');}
 if(kind==='tf'&&(!Array.isArray(correct)||correct.length!==4||correct.some(v=>typeof v!=='boolean')))throw new ValidationError('Cần xác định Đúng/Sai cho đủ bốn ý.');
 if(kind==='short'){correct=text(String(correct??''),80);if(numericValue(correct)===null)throw new ValidationError('Đáp án ngắn cần là số hoặc phân số đơn giản.');}
 const images=(raw.images||[]).map((im,i)=>{
  if(i>=3||!['image/png','image/jpeg','image/webp'].includes(im.mime))throw new ValidationError('Nhận tối đa 3 ảnh PNG/JPG/WebP mỗi câu.');
  if(typeof im.data!=='string'||!/^[-A-Za-z0-9+/=]+$/.test(im.data)||im.data.length>700000)throw new ValidationError('Ảnh không hợp lệ hoặc lớn hơn 500 KB.');
  let bytes;try{bytes=Uint8Array.from(atob(im.data),c=>c.charCodeAt(0));}catch{throw new ValidationError('Ảnh không đọc được.');}
  const valid=im.mime==='image/png'?bytes[0]===137&&bytes[1]===80&&bytes[2]===78&&bytes[3]===71:im.mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216:bytes[0]===82&&bytes[1]===73&&bytes[2]===70&&bytes[3]===70&&bytes[8]===87&&bytes[9]===69&&bytes[10]===66&&bytes[11]===80;
  if(!valid)throw new ValidationError('Nội dung ảnh không khớp định dạng.');return {mime:im.mime,data:im.data,caption:text(im.caption||'',300)};
 });
 const source={original_number:number,kind,prompt,choices,correct,solution,images};
 const imageHtml=images.map(im=>`<figure><img loading="lazy" src="data:${im.mime};base64,${im.data}" alt="${escape(im.caption||'Hình câu hỏi')}">${im.caption?`<figcaption>${escape(im.caption)}</figcaption>`:''}</figure>`).join('');
 return {source,rendered:{kind,original_number:number,prompt:renderSource(prompt)+imageHtml,choices:choices.map(c=>({...c,text:renderSource(c.text)})),correct,solution:renderSource(solution)}};
}
export function normalizeName(v,max=200){const s=text(String(v??''),max).replace(/\s+/g,' ');if(!s)throw new ValidationError('Thiếu tên hoặc nhãn.');return s;}
