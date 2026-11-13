import QRCode from 'qrcode';

export function isPrivateIPv4(value) {
 const parts=String(value).split('.');
 if(parts.length!==4||parts.some(p=>!/^\d{1,3}$/.test(p)||String(Number(p))!==p||Number(p)>255))return false;
 const [a,b]=parts.map(Number);
 return a===10||(a===172&&b>=16&&b<=31)||(a===192&&b===168);
}

export function joinURL(base,code) {
 const url=new URL(base);
 if(!['http:','https:'].includes(url.protocol)||url.username||url.password)throw new Error('Địa chỉ kết nối không hợp lệ.');
 if(!/^[A-Z2-9]{6}$/.test(code))throw new Error('Mã phiên không hợp lệ.');
 url.pathname='/hoc-sinh';url.search='';url.hash='';url.searchParams.set('code',code);
 return url.href;
}

export function manualLanBase(ip,port=8787) {
 if(!isPrivateIPv4(ip.trim()))throw new Error('Nhập địa chỉ IPv4 nội bộ, ví dụ 192.168.1.20.');
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('Cổng không hợp lệ.');
 return `http://${ip.trim()}:${port}`;
}

export function qrData(value) {
 const qr=QRCode.create(value,{errorCorrectionLevel:'M'}),size=qr.modules.size,margin=4;
 let path='';
 for(let y=0;y<size;y++)for(let x=0;x<size;x++)if(qr.modules.get(y,x))path+=`M${x+margin} ${y+margin}h1v1h-1z`;
 return {path,size:size+margin*2,modules:qr.modules};
}
