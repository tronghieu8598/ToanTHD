import {unzipSync,strFromU8} from 'fflate';
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[đĐ]/g,'d').toLowerCase().replace(/[^a-z0-9]/g,'');
export function parseCSV(raw){
 const text=raw.replace(/^\uFEFF/,'').replace(/\r\n/g,'\n').replace(/\r/g,'\n');
 const scored=['\t',';',','].map(delimiter=>{let quoted=false,count=0,rows=[];for(let i=0;i<text.length&&rows.length<25;i++){const c=text[i];if(c==='\"'){if(quoted&&text[i+1]==='\"')i++;else quoted=!quoted;}else if(c===delimiter&&!quoted)count++;else if(c==='\n'&&!quoted){if(count)rows.push(count);count=0;}}if(count)rows.push(count);return {delimiter,score:rows.length*100+(rows.length?Math.max(...rows):0)};});const delimiter=scored.sort((a,b)=>b.score-a.score)[0].delimiter;
 const rows=[];let row=[],cell='',quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else if(quoted||cell==='')quoted=!quoted;else cell+=c;}else if(c===delimiter&&!quoted){row.push(cell);cell='';}else if(c==='\n'&&!quoted){row.push(cell);rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw new Error('CSV có ô mở dấu ngoặc kép nhưng chưa đóng.');if(cell||row.length){row.push(cell);rows.push(row);}return rows;
}
function plainMath(node){
 if(node.nodeType===3)return node.textContent||'';
 const tag=node.localName,children=Array.from(node.children||[]),at=i=>children[i]?plainMath(children[i]):'',join=()=>children.map(plainMath).join(' ');
 if(['annotation','annotation-xml'].includes(tag))return '';
 if(tag==='semantics')return at(0);
 if(tag==='mfrac')return `\\frac{${at(0)}}{${at(1)}}`;
 if(tag==='msqrt')return `\\sqrt{${join()}}`;
 if(tag==='mroot')return `\\sqrt[${at(1)}]{${at(0)}}`;
 if(tag==='msup')return `{${at(0)}}^{${at(1)}}`;
 if(tag==='msub')return `{${at(0)}}_{${at(1)}}`;
 if(tag==='msubsup')return `{${at(0)}}_{${at(1)}}^{${at(2)}}`;
 if(tag==='mover'&&/→/.test(at(1)))return `\\overrightarrow{${at(0)}}`;
 if(!children.length){const s=node.textContent||'';return s.replace(/π/g,'\\pi ').replace(/α/g,'\\alpha ').replace(/β/g,'\\beta ').replace(/−/g,'-').replace(/×/g,'\\times ').replace(/·/g,'\\cdot ').replace(/^(sin|cos|tan)$/,'\\$1 ');}
 return join();
}
export function htmlToSource(html){
 const doc=new DOMParser().parseFromString(html||'','text/html');
 function visit(node){if(node.nodeType===3)return node.textContent||'';const tag=node.localName;if(tag==='math')return '$'+plainMath(node).trim()+'$';if(tag==='br')return '\n';if(tag==='img')return '';return Array.from(node.childNodes||[]).map(visit).join('')+(['p','div','figure'].includes(tag)?'\n':'');}
 return visit(doc.body).trim();
}
export function sourceOf(q){return q.source||{original_number:q.original_number,kind:q.kind,prompt:htmlToSource(q.prompt),choices:q.choices.map(c=>({key:c.key,text:htmlToSource(c.text)})),correct:q.correct,solution:htmlToSource(q.solution||''),images:[]};}
const aliases={grade:['khoi','lopso','grade'],document:['tailieu','tentailieu','document'],edition:['phienban','edition'],chapter:['chuong','chapter'],lesson:['bai','baihoc','tenbai','lesson'],number:['socau','cau','originalnumber','stt'],kind:['dang','dangcau','loaicau','type','kind'],prompt:['noidung','noidungcauhoi','cauhoi','prompt'],correct:['dapan','dapandung','correct','answer'],solution:['loigiai','huongdangiai','solution'],class:['lop','tenlop','class'],year:['namhoc','schoolyear'],ordinal:['stt','sothutu','ordinal'],name:['hovaten','hoten','tenhocsinh','name'],a:['a','ya','phuongan a','phuongana'],b:['b','yb','phuonganb'],c:['c','yc','phuonganc'],d:['d','yd','phuongand']};
export function tableToPayload(rows,kind,defaults,headerRow){
 const headerIndex=headerRow===undefined?rows.slice(0,25).findIndex(r=>kind==='bank'?r.some(v=>aliases.prompt.includes(norm(v)))&&r.some(v=>aliases.number.includes(norm(v))):r.some(v=>aliases.name.includes(norm(v)))&&r.some(v=>aliases.ordinal.includes(norm(v)))):headerRow;
 if(headerIndex<0||!rows[headerIndex])throw new Error('Chưa tìm thấy hàng tiêu đề. Chọn hàng tiêu đề hoặc dùng mẫu tải về.');
 const headers=rows[headerIndex].map(norm),index={};for(const [key,names] of Object.entries(aliases))index[key]=headers.findIndex(h=>names.includes(h));
 const get=(r,k,fallback='')=>index[k]>=0?String(r[index[k]]??'').trim():String(fallback??'');
 const payload=kind==='bank'?{kind,documents:[]}:{kind,mode:defaults.mode||'merge',classrooms:[]};
 const docs=new Map(),classes=new Map();let previous={...defaults};
 for(let ri=headerIndex+1;ri<rows.length;ri++){const r=rows[ri];if(r.slice(headers.length).some(v=>v!==null&&v!==undefined&&String(v).trim()!==''))throw new Error('Dòng '+(ri+1)+' có nhiều cột hơn tiêu đề. Đặt nội dung chứa dấu phẩy trong ngoặc kép hoặc dùng Excel.');if(r.every(v=>v===null||v===undefined||String(v).trim()===''))continue;
  if(kind==='bank'){
   const meta={grade:Number(get(r,'grade',previous.grade)||previous.grade),title:get(r,'document',previous.title),edition:get(r,'edition',previous.edition),chapter:get(r,'chapter',previous.chapter),lesson:get(r,'lesson',previous.lesson)};
   for(const k of Object.keys(meta))if(meta[k]===''||Number.isNaN(meta[k]))meta[k]=previous[k];previous={...previous,...meta};
   const key=JSON.stringify([meta.grade,meta.title,meta.edition]);if(!docs.has(key)){const d={title:meta.title,grade:meta.grade,edition:meta.edition,is_sample:!!defaults.is_sample,lessons:[]};docs.set(key,d);payload.documents.push(d);}
   const doc=docs.get(key);let lesson=doc.lessons.find(l=>l.chapter===meta.chapter&&l.title===meta.lesson);if(!lesson){lesson={chapter:meta.chapter,title:meta.lesson,questions:[]};doc.lessons.push(lesson);}
   const rawKind=norm(get(r,'kind','mcq')),qkind=['tf','dungsai','ds'].includes(rawKind)?'tf':['short','traloi ngan','traloingan','tln'].includes(rawKind)?'short':'mcq';
   let correct=get(r,'correct');if(qkind==='tf')correct=correct.split(/[;,|\s]+/).filter(Boolean).map(v=>['d','dung','true','1'].includes(norm(v))?true:['s','sai','false','0'].includes(norm(v))?false:null);
   lesson.questions.push({original_number:Number(get(r,'number')),kind:qkind,prompt:get(r,'prompt'),choices:qkind==='short'?[]:['a','b','c','d'].map((k,i)=>({key:(qkind==='tf'?'abcd':'ABCD')[i],text:get(r,k)})),correct,solution:get(r,'solution'),images:[],_row:ri+1});
  }else{
   const label=get(r,'class',previous.label)||previous.label,school_year=get(r,'year',previous.school_year)||previous.school_year,grade=Number(get(r,'grade',String(label).match(/^(10|11|12)/)?.[1]||previous.grade)||previous.grade);previous={...previous,label,school_year,grade};
   const key=label+'\0'+school_year;if(!classes.has(key)){const cl={label,school_year,grade,is_sample:!!defaults.is_sample,students:[]};classes.set(key,cl);payload.classrooms.push(cl);}
   classes.get(key).students.push({ordinal:Number(get(r,'ordinal')),name:get(r,'name'),_row:ri+1});
  }
 }
 return {payload,headerIndex};
}
function checkedZip(bytes){let total=0;return unzipSync(bytes,{filter:file=>{total+=file.originalSize;if(file.originalSize>15000000||total>50000000)throw new Error('File giải nén vượt giới hạn 50 MB. Hãy tách file.');return true;}});}
function xml(text){const d=new DOMParser().parseFromString(text,'application/xml');if(d.getElementsByTagName('parsererror').length)throw new Error('Nội dung XML của file không hợp lệ.');return d;}
const local=n=>String(n.localName||'').split(':').pop();
const descendants=(n,tag)=>{const found=[];function walk(parent){for(const child of Array.from(parent.childNodes||[])){if(child.nodeType===1){if(local(child)===tag)found.push(child);walk(child);}}}walk(n);return found;};
const attr=(el,name)=>el?.getAttributeNS('http://schemas.openxmlformats.org/wordprocessingml/2006/main',name)||el?.getAttribute('w:'+name)||el?.getAttribute('m:'+name)||el?.getAttribute(name)||'';
function omml(n,warnings){const tag=local(n),children=Array.from(n.children||[]),child=name=>children.find(c=>local(c)===name),part=name=>child(name)?omml(child(name),warnings):'',join=()=>children.map(c=>omml(c,warnings)).join('');
 if(tag.endsWith('Pr'))return '';if(tag==='t')return n.textContent.replace(/π/g,'\\pi ').replace(/−/g,'-').replace(/α/g,'\\alpha ').replace(/β/g,'\\beta ');
 if(tag==='f')return `\\frac{${part('num')}}{${part('den')}}`;
 if(tag==='rad')return part('deg')?`\\sqrt[${part('deg')}]{${part('e')}}`:`\\sqrt{${part('e')}}`;
 if(tag==='sSup')return `{${part('e')}}^{${part('sup')}}`;if(tag==='sSub')return `{${part('e')}}_{${part('sub')}}`;if(tag==='sSubSup')return `{${part('e')}}_{${part('sub')}}^{${part('sup')}}`;
 if(tag==='acc'){const mark=descendants(n,'chr')[0],chr=attr(mark,'val');if(chr==='→')return `\\overrightarrow{${part('e')}}`;warnings.add('Có dấu nhấn/vectơ trong Word cần đối chiếu.');return part('e');}
 if(tag==='d'){const beg=attr(descendants(n,'begChr')[0],'val')||'(',end=attr(descendants(n,'endChr')[0],'val')||')';return beg+part('e')+end;}
 if(['m','nary','eqArr','limLow','limUpp'].includes(tag))warnings.add('Có công thức Word phức tạp ('+tag+') cần đối chiếu và sửa LaTeX.');return join();}
export function readDocx(bytes,defaults){
 const files=checkedZip(bytes);if(!files['word/document.xml'])throw new Error('Không phải file DOCX hợp lệ.');
 const doc=xml(strFromU8(files['word/document.xml'])),rels=files['word/_rels/document.xml.rels']?xml(strFromU8(files['word/_rels/document.xml.rels'])):null,images=new Map(),warnings=new Set();
 if(rels)for(const r of descendants(rels,'Relationship')){const target=r.getAttribute('Target')||'';if(!/^media\//.test(target))continue;const file=files['word/'+target];if(!file)continue;const extension=target.split('.').pop().toLowerCase(),mime={png:'image/png',jpg:'image/jpeg',jpeg:'image/jpeg',webp:'image/webp'}[extension];if(!mime){warnings.add('Ảnh '+extension.toUpperCase()+' chưa được nhập; thêm PNG/JPG sau khi đối chiếu.');continue;}if(file.length>500000){warnings.add('Có ảnh lớn hơn 500 KB; cần thu nhỏ rồi bổ sung.');continue;}let bin='';for(const b of file)bin+=String.fromCharCode(b);images.set(r.getAttribute('Id'),{mime,data:btoa(bin),caption:''});}
 function line(n){if(local(n)==='oMath')return '$'+omml(n,warnings).trim()+'$';if(local(n)==='t')return n.textContent;if(local(n)==='tab')return '\t';if(local(n)==='br')return '\n';return Array.from(n.children||[]).map(line).join('');}
 const document={grade:Number(defaults.grade),title:defaults.title,edition:defaults.edition,is_sample:!!defaults.is_sample,lessons:[]};let chapter=defaults.chapter,lessonTitle=defaults.lesson,current=null,inSolution=false;
 const blocks=descendants(doc,'p');
 function getLesson(){let l=document.lessons.find(l=>l.chapter===chapter&&l.title===lessonTitle);if(!l){l={chapter,title:lessonTitle,questions:[]};document.lessons.push(l);}return l;}
 for(const paragraph of blocks){const t=line(paragraph).trim();if(/^Chương\s/i.test(t)&&!current){chapter=t;continue;}if(/^Bài\s+\d+/i.test(t)){lessonTitle=t;current=null;continue;}
  const start=t.match(/^Câu\s+(\d+)\s*[.:)]\s*(.*)$/i);if(start){current={original_number:Number(start[1]),kind:'short',prompt:start[2],choices:[],correct:'',solution:'',images:[]};getLesson().questions.push(current);inSolution=false;}
  else if(current){const answer=t.match(/^(?:Đáp\s*án|Chọn)\s*[:：]?\s*(.+)$/i);if(answer){current.correct=answer[1].trim();continue;}
   if(/^(?:Lời\s*giải|Hướng\s*dẫn)\s*[:：]?/i.test(t)){inSolution=true;current.solution+=t.replace(/^(?:Lời\s*giải|Hướng\s*dẫn)\s*[:：]?/i,'');continue;}
   if(inSolution){current.solution+='\n'+t;continue;}
   const option=t.match(/^([ABCDabcd])[.)]\s*(.*)$/);if(option){current.kind=option[1]===option[1].toUpperCase()?'mcq':'tf';const chunks=t.split(/(?=\b[ABCD][.)]\s)/).filter(Boolean);if(current.kind==='mcq')for(const chunk of chunks){const m=chunk.match(/^([ABCD])[.)]\s*(.*)$/);if(m)current.choices.push({key:m[1],text:m[2]});}else current.choices.push({key:option[1],text:option[2]});}
   else if(t)current.prompt+='\n'+t;
  }
  if(current)for(const blip of descendants(paragraph,'blip')){const rid=blip.getAttribute('r:embed'),im=images.get(rid);if(im&&!current.images.some(v=>v.data===im.data))current.images.push(im);}
 }
 for(const l of document.lessons)for(const q of l.questions){if(q.kind==='tf')q.correct=q.correct.split(/[;,|\s]+/).filter(Boolean).map(v=>['d','dung','true','1'].includes(norm(v))?true:['s','sai','false','0'].includes(norm(v))?false:null);else if(q.kind==='mcq')q.correct=q.correct.match(/^[ABCD]\b/i)?.[0].toUpperCase()||'';}
 if(!document.lessons.some(l=>l.questions.length))throw new Error('Chưa tìm thấy nhãn “Câu 1.” trong DOCX. Dùng mẫu Excel/JSON hoặc chuẩn hóa nhãn câu.');
 return {payload:{kind:'bank',documents:[document],source_format:'docx',docx_reviewed:false},warnings:[...warnings,'Word được nhập thành bản nháp. Đối chiếu nội dung, hình, số câu và đáp án trước khi xác nhận.']};
}
export async function readFile(file,kind,defaults){
 if(file.size>10000000)throw new Error('Nhận file tối đa 10 MB. Hãy chia file lớn.');const extension=file.name.split('.').pop().toLowerCase();
 if(extension==='json'){let payload;try{payload=JSON.parse(await file.text());}catch{throw new Error('JSON không hợp lệ.');}if(payload.format==='toanthd-bank-v02')payload={kind:'bank',documents:payload.documents};if(payload.format==='toanthd-roster-v02')payload={kind:'roster',mode:defaults.mode,classrooms:payload.classrooms};if(payload.kind!==kind)throw new Error('Loại dữ liệu JSON không khớp mục đang nhập.');return {payload,warnings:[]};}
 if(extension==='csv'||extension==='tsv')return {tables:[{name:file.name,rows:parseCSV(await file.text())}],warnings:[]};
 if(extension==='docx'){if(kind!=='bank')throw new Error('Nhập danh sách lớp bằng XLSX, CSV hoặc JSON.');return readDocx(new Uint8Array(await file.arrayBuffer()),defaults);}
 if(extension!=='xlsx')throw new Error('Nhận XLSX, CSV, JSON; ngân hàng có thêm DOCX. File XLS/PDF cần chuyển hoặc đối chiếu trước.');
 const bytes=new Uint8Array(await file.arrayBuffer());checkedZip(bytes);
 const module=await import('exceljs/dist/exceljs.min.js'),Excel=module.default||module,book=new Excel.Workbook();await book.xlsx.load(bytes);
 const tables=book.worksheets.map(sheet=>{if(sheet.rowCount>5000||sheet.columnCount>100)throw new Error('Bảng vượt 5000 dòng hoặc 100 cột. Hãy tách file.');const rows=[];for(let r=1;r<=sheet.rowCount;r++){const row=[];for(let c=1;c<=sheet.columnCount;c++){const value=sheet.getCell(r,c).value;if(value&&typeof value==='object'&&('formula'in value||'sharedFormula'in value))throw new Error(`Ô ${sheet.name}!${sheet.getCell(r,c).address} là công thức Excel. Hãy dán giá trị trước khi nhập.`);row.push(value&&typeof value==='object'?(value.richText?value.richText.map(x=>x.text).join(''):value.text||''):value??'');}rows.push(row);}return {name:sheet.name,rows};});return {tables,warnings:[]};
}
export function exportBank(data,questions){return {format:'toanthd-bank-v02',documents:data.documents.map(d=>({...d,lessons:data.lessons.filter(l=>l.document_id===d.id).map(l=>({chapter:l.chapter,title:l.title,questions:questions.filter(q=>q.lesson_id===l.id&&!q.archived_at).map(sourceOf)})).filter(l=>l.questions.length)})).filter(d=>d.lessons.length)};}
