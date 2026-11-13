import {DOMParser} from 'linkedom/worker';
import {ValidationError,normalizeSource} from './content.mjs';
import {COURSE_ASSET_PATHS} from './course-assets.mjs';
import {VARIANT_ASSET_PATHS} from './chapter-variants/assets.mjs';
const ACCEPTED_ASSET_PATHS=new Set([...COURSE_ASSET_PATHS,...VARIANT_ASSET_PATHS]);
const tags=new Set('html head body p br b strong em i u s small sub sup ul ol li figure figcaption img span div code table thead tbody tr th td math semantics annotation mi mn mo mrow mfrac msqrt mroot msup msub msubsup munder mover munderover mtext mspace mfenced mtable mtr mtd menclose mpadded mstyle mmultiscripts mprescripts none'.split(' '));
const attrs=new Set('class aria-hidden xmlns display encoding mathvariant stretchy fence separator accent accentunder largeop movablelimits form lspace rspace columnalign rowalign columnspacing rowspacing columnspan rowspan colspan width height depth lquote rquote open close separators notation scriptlevel displaystyle mathsize minsize maxsize voffset mathbackground mathcolor'.split(' '));
const check=(ok,message)=>{if(!ok)throw new ValidationError(message);};
function safeStyle(value){return value.split(';').filter(v=>v.trim()).every(v=>/^\s*text-align\s*:\s*(?:left|center|right)\s*$/i.test(v)||/^\s*(?:width|max-width|height|max-height)\s*:\s*(?:auto|\d+(?:\.\d+)?(?:px|em|rem|%|cm|mm|pt))\s*$/i.test(v)||/^\s*color\s*:\s*(?:#[0-9a-f]{3,8}|[a-z]{1,20})\s*$/i.test(v));}
export function validateRichHtml(html,{assets=ACCEPTED_ASSET_PATHS}={}){
 check(typeof html==='string'&&html.length<=2200000&&!html.includes('\0'),'Nội dung HTML không hợp lệ.');
 const doc=new DOMParser().parseFromString('<html><body>'+html+'</body></html>','text/html');let embedded=0;
 for(const el of doc.querySelectorAll('*')){
  const tag=el.localName.toLowerCase();check(tags.has(tag),'Bản sao lưu chứa thẻ HTML không được phép: '+tag+'.');
  for(const a of Array.from(el.attributes)){
   const name=a.name.toLowerCase();
   if(tag==='img'&&['src','alt','loading'].includes(name))continue;
   if(name==='style'){check(safeStyle(a.value),'Nội dung HTML chứa định dạng không được phép.');continue;}
   check(attrs.has(name),'Bản sao lưu chứa thuộc tính HTML không được phép: '+name+'.');check(!/[<>\u0000-\u001f]/.test(a.value),'Thuộc tính HTML không hợp lệ.');
  }
  if(tag==='img'){
   const src=el.getAttribute('src')||'';if(assets.has(src))continue;
   const m=/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(src);check(m&&++embedded<=3,'Ảnh trong bản sao lưu không hợp lệ.');
   normalizeSource({kind:'short',original_number:1,prompt:'Ảnh',choices:[],correct:'0',images:[{mime:m[1],data:m[2],caption:''}]});
  }
 }
 return html;
}
