'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {Wifi,QrCode,Copy,Download,X,Maximize2,Minimize2,RefreshCw,Monitor,Smartphone,AlertCircle,CheckCircle2} from 'lucide-react';
import {isPrivateIPv4,joinURL,manualLanBase,qrData} from '../lib/share.mjs';
type Any=Record<string,any>;

function useNetwork(enabled=true){
 const [data,setData]=useState<Any>({mode:'loading',addresses:[]});
 async function reload(){
  try{const r=await fetch('/api/local/network',{cache:'no-store',signal:AbortSignal.timeout(4000)});if(!r.ok)throw new Error();setData(await r.json());}
  catch{setData({mode:'unavailable',addresses:[]});}
 }
 useEffect(()=>{if(enabled)void reload();},[enabled]);
 return {data,reload};
}

async function copyText(text:string){
 if(navigator.clipboard?.writeText){try{await navigator.clipboard.writeText(text);return;}catch{}}
 const field=document.createElement('textarea');field.value=text;field.style.position='fixed';field.style.opacity='0';document.body.appendChild(field);field.select();
 const ok=document.execCommand('copy');field.remove();if(!ok)throw new Error('Chọn đường dẫn rồi sao chép thủ công.');
}

function ConnectionNote({data}:{data:Any}){
 if(data.mode==='loading')return <p className="muted">Đang kiểm tra địa chỉ kết nối…</p>;
 if(data.mode==='lan'&&data.addresses.length)return <div className="lan-note good"><CheckCircle2 size={18}/><span>Đã mở LAN. Chọn địa chỉ cùng mạng với điện thoại; có thể thử mở đường dẫn trước khi chiếu QR.</span></div>;
 return <div className="lan-note"><AlertCircle size={19}/><span>{data.mode==='lan'?'Chưa tìm thấy IPv4 nội bộ. Kết nối laptop vào Wi-Fi/router hoặc bật điểm phát sóng rồi kiểm tra lại.':<>Muốn điện thoại kết nối: dừng cửa sổ web hiện tại, chạy <b>Mo_lop_LAN.bat</b> rồi mở lại phiên. QR tại địa chỉ hiện tại chỉ dùng thử.</>}</span></div>;
}

export function NetworkPanel({sessions,onShare}:{sessions:Any[],onShare:(session:Any)=>void}){
 const {data,reload}=useNetwork();
 return <><div className="page-heading"><div><div className="eyebrow">LAPTOP VÀ ĐIỆN THOẠI CÙNG MẠNG</div><h1>Mở lớp qua Wi-Fi.</h1><p>Máy giáo viên lưu bài. Học sinh quét QR để vào đúng phiên.</p></div><button className="btn secondary" onClick={()=>void reload()}><RefreshCw size={16}/> Kiểm tra lại</button></div><section className="card network-card"><ConnectionNote data={data}/><div className="network-steps">{[[Monitor,'1. Mở máy giáo viên','Dùng Mo_lop_LAN.bat. Giáo viên vào 127.0.0.1:8787 trên chính laptop.'],[Wifi,'2. Cùng một mạng','Điện thoại và laptop cùng Wi-Fi/router hoặc điểm phát sóng. Không dùng Wi-Fi khách có cô lập thiết bị.'],[Smartphone,'3. Quét và xác nhận tên','Mở phiên, chiếu QR. Học sinh nhập STT, kiểm tra họ tên rồi vào làm bài.']].map(([Icon,title,text]:any)=><div key={title}><Icon size={25}/><h3>{title}</h3><p>{text}</p></div>)}</div>{data.addresses.length>0&&<div className="lan-address-list">{data.addresses.map((a:Any)=><div key={a.address}><b>{a.name}</b><code>{a.base}/hoc-sinh</code></div>)}</div>}<p className="muted">Nếu Windows hỏi quyền Node.js, chọn mạng Riêng tư (Private). Có thể chạy Kiem_tra_ket_noi.bat để xem địa chỉ và tình trạng máy chủ. Quyền giáo viên chỉ mở trên laptop chạy web.</p></section><section className="card network-card"><h2>Chọn phiên để chiếu QR</h2>{sessions.filter(s=>s.state==='open').length?sessions.filter(s=>s.state==='open').map(s=><button className="network-session" key={s.id} onClick={()=>onShare(s)}><div><b>{s.title}</b><small>{s.class_label} · {s.code}</small></div><QrCode size={23}/></button>):<p>Chưa có phiên đang mở. Vào ngân hàng, chọn câu và tạo phiên trước.</p>}</section></>;
}

export function ShareDialog({session,onClose}:{session:Any,onClose:()=>void}){
 const location=typeof window==='undefined'?null:window.location;
 const origin=location?.origin??'http://127.0.0.1:8787';
 const online=location?.protocol==='https:'&&!isPrivateIPv4(location.hostname)
  && !/^(127\.|\[::1\]$)|(?:^|\.)(localhost|local)$/.test(location.hostname);
 const {data,reload}=useNetwork(!online),[base,setBase]=useState(''),[manual,setManual]=useState(''),[expanded,setExpanded]=useState(false),[message,setMessage]=useState(''),[now,setNow]=useState(Date.now());
 const closeRef=useRef<HTMLButtonElement>(null),onCloseRef=useRef(onClose);onCloseRef.current=onClose;
 useEffect(()=>{
  const before=document.activeElement as HTMLElement,overflow=document.body.style.overflow;document.body.style.overflow='hidden';closeRef.current?.focus();
  const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onCloseRef.current();};document.addEventListener('keydown',key);const timer=setInterval(()=>setNow(Date.now()),1000);
  return()=>{clearInterval(timer);document.removeEventListener('keydown',key);document.body.style.overflow=overflow;before?.focus();};
 },[]);
 const selected=online?origin:base||data.addresses[0]?.base||origin;
 const qr=useMemo(()=>{try{const url=joinURL(selected,session.code);return {url,...qrData(url)};}catch{return null;}},[selected,session.code]);
 const closed=session.state!=='open'||now>=session.closes_at;
 const left=Math.max(0,Math.ceil((session.closes_at-now)/1000));
 async function copy(){try{await copyText(qr!.url);setMessage('Đã sao chép đường dẫn.');}catch(e:any){setMessage(e.message);}}
 function applyManual(){try{setBase(manualLanBase(manual,data.port||8787));setMessage('Đã dùng địa chỉ nhập tay. Thử mở trên điện thoại để xác nhận.');}catch(e:any){setMessage(e.message);}}
 function download(){if(!qr)return;const blob=new Blob([`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 ${qr.size} ${qr.size}"><rect width="100%" height="100%" fill="white"/><path d="${qr.path}" fill="black"/></svg>`],{type:'image/svg+xml'});const href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='ToanTHD_QR_'+session.code+'.svg';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);}
 return <div className="modal-shade share-shade" onClick={onClose}>
  <section className={'share-dialog '+(expanded?'expanded':'')} role="dialog" aria-modal="true" aria-label="QR và kết nối phiên kiểm tra" onClick={e=>e.stopPropagation()}>
   <header>
    <div><small>{session.class_label} · {session.scoring_mode==='exam-1246'?'Cấu trúc 12–4–6':'Luyện tập'}</small><h2>{session.title}</h2></div>
    <div>
     <button className="icon-btn" aria-label={expanded?'Thu nhỏ QR':'Phóng to QR'} onClick={()=>setExpanded(!expanded)}>{expanded?<Minimize2 size={20}/>:<Maximize2 size={20}/>}</button>
     <button ref={closeRef} className="icon-btn" aria-label="Đóng QR" onClick={onClose}><X size={22}/></button>
    </div>
   </header>
   <div className="share-body">
    <div className="qr-stage">{closed
     ? <div className="closed-qr"><AlertCircle size={42}/><h2>Phiên đã đóng hoặc hết giờ</h2><p>Tạo phiên mới để học sinh tham gia.</p></div>
     : qr&&<>
      <svg role="img" aria-label={'Mã QR tham gia phiên '+session.code} viewBox={`0 0 ${qr.size} ${qr.size}`} shapeRendering="crispEdges"><rect width="100%" height="100%" fill="white"/><path d={qr.path} fill="black"/></svg>
      <div className="projector-code">{session.code}</div>
      <p>{session.requires_entry_code?'Quét QR → nhập STT và mã cá nhân → xác nhận họ tên':'Quét QR → nhập STT → xác nhận họ tên'}</p>
      <small>Còn {Math.floor(left/60)}:{String(left%60).padStart(2,'0')} · Tính từ lúc tạo phiên</small>
     </>}
    </div>
    <div className="share-controls">
     {online
      ? <p className="muted">Thử mở đường dẫn trên điện thoại trước khi gửi hoặc chiếu QR.</p>
      : <>
       <ConnectionNote data={data}/>
       <label>Địa chỉ laptop cho học sinh<select value={selected} onChange={e=>{setBase(e.target.value);setMessage('');}}>
        {data.addresses.map((a:Any)=><option key={a.base} value={a.base}>{a.address} · {a.name}</option>)}
        {!data.addresses.some((a:Any)=>a.base===selected)&&<option value={selected}>{selected} · địa chỉ đang dùng</option>}
       </select></label>
      </>}
     <div className="share-link" tabIndex={0}>{qr?.url}</div>
     <div className="toolbar-actions">
      <button className="btn primary" disabled={closed||!qr} onClick={()=>void copy()}><Copy size={16}/> Sao chép link</button>
      <button className="btn secondary" disabled={closed||!qr} onClick={download}><Download size={16}/> Tải QR</button>
     </div>
     {!online&&<>
      <button className="text-btn" onClick={()=>void reload()}><RefreshCw size={15}/> Nhận lại địa chỉ</button>
      <details><summary>Nhập IP nội bộ khác</summary>
       <label>IPv4 của laptop<input placeholder="VD: 192.168.1.20" value={manual} onChange={e=>setManual(e.target.value)} inputMode="decimal"/></label>
       <button className="btn secondary" onClick={applyManual}>Dùng địa chỉ này</button>
      </details>
      <p className="muted">Không đưa 127.0.0.1 cho điện thoại. Giữ laptop và cửa sổ chạy web mở trong suốt buổi học. QR không cấp quyền giáo viên.</p>
     </>}
     {!closed&&Boolean(session.requires_entry_code)&&<p className="muted">Mở Cấp mã cá nhân trong chi tiết phiên và gửi riêng từng mã cho học sinh.</p>}
     {message&&<p className="share-message" role="status">{message}</p>}
    </div>
   </div>
  </section>
 </div>;
}
