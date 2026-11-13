'use strict';
/* THD Ink 3.0 — offline geometry tools; legacy stroke and backup compatibility. */
function createThdInk({store,getContext:baseContext,getSurface:baseSurface,onChange}){
  const $=id=>document.getElementById(id),NS='http://www.w3.org/2000/svg',copy=x=>JSON.parse(JSON.stringify(x));
  const shapes=[
    ['line','Đoạn thẳng','Nét & hệ trục'],['arrow','Mũi tên','Nét & hệ trục'],['doublearrow','Mũi tên hai đầu','Nét & hệ trục'],['angle','Góc','Nét & hệ trục'],['rightangle','Góc vuông','Nét & hệ trục'],['axes2d','Hệ trục Oxy','Nét & hệ trục'],['axes3d','Hệ trục Oxyz','Nét & hệ trục'],
    ['triangle','Tam giác','Hình phẳng'],['righttriangle','Tam giác vuông','Hình phẳng'],['equilateral','Tam giác đều','Hình phẳng'],['rect','Hình chữ nhật','Hình phẳng'],['square','Hình vuông','Hình phẳng'],['parallelogram','Hình bình hành','Hình phẳng'],['rhombus','Hình thoi','Hình phẳng'],['trapezoid','Hình thang','Hình phẳng'],['circle','Đường tròn','Hình phẳng'],['ellipse','Elip / khoanh','Hình phẳng'],['pentagon','Ngũ giác đều','Hình phẳng'],['hexagon','Lục giác đều','Hình phẳng'],
    ['cube','Hình lập phương','Hình không gian'],['cuboid','Hình hộp chữ nhật','Hình không gian'],['prism','Lăng trụ tam giác','Hình không gian'],['pyramid','Chóp tứ giác','Hình không gian'],['tetrahedron','Tứ diện','Hình không gian'],['cylinder','Hình trụ','Hình không gian'],['cone','Hình nón','Hình không gian'],['sphere','Hình cầu','Hình không gian']
  ];
  const shapeIds=new Set(shapes.map(s=>s[0])),names=Object.fromEntries(shapes.map(s=>[s[0],s[1]]));
  const toolbar=$('ink-toolbar'),history=new Map();
  // Exported or browser-saved HTML can contain a previous runtime UI snapshot.
  if(toolbar.closest('.ink-v3-dialog'))$('reader-ink-slot').append(toolbar);
  if($('teaching-pointer').closest('.ink-v3-dialog'))document.body.append($('teaching-pointer'));
  document.querySelectorAll('.ink-v3-dialog,#ink-home-board,.thd-ink-layer').forEach(e=>e.remove());
  let records=[],tool='move',color=store.COLORS[0],width=3,dash='solid',filled=false,labels=true,hidden=true,penOnly=false,pressure=false,snap=false,bg='plain';
  let drawing=null,selection=null,observer=null,frame=0,ignoreClickUntil=0,lastShape='triangle',lastFocus=null,boardPrev=null;
  const boardContext='__whiteboard__',prefsKey='thd-ink-ui-v3';
  const svg=(tag,attrs={})=>{const e=document.createElementNS(NS,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e;};
  const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon=(path)=>'<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+path+'</svg>';
  const icons={move:'<path d="m5 3 2 17 4-6 7-1z"/>',select:'<rect x="5" y="5" width="14" height="14" stroke-dasharray="3 3"/><path d="M3 8V3h5m8 0h5v5M3 16v5h5m8 0h5v-5"/>',pen:'<path d="m15 4 5 5M4 20l5-1L21 7a2 2 0 0 0-4-4L5 15z"/>',highlight:'<path d="m5 13 7-9 7 6-8 9zM3 21h9"/>',eraser:'<path d="m4 15 9-11 7 6-9 11H8zM9 9l7 6M13 21h8"/>',shapes:'<path d="m4 11 5-8 5 8z"/><rect x="11" y="12" width="10" height="9"/><circle cx="6" cy="17" r="4"/>',text:'<path d="M4 5h16M12 5v16M8 21h8M4 5v3m16-3v3"/>',undo:'<path d="m9 5-5 5 5 5M4 10h10a6 6 0 0 1 0 12"/>',redo:'<path d="m15 5 5 5-5 5M20 10H10a6 6 0 0 0 0 12"/>',settings:'<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2" fill="white"/><circle cx="15" cy="12" r="2" fill="white"/><circle cx="8" cy="18" r="2" fill="white"/>',board:'<rect x="3" y="3" width="18" height="14" rx="2"/><path d="m8 22 4-5 4 5M8 8h8"/>',duplicate:'<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V4H4v12h4"/>',delete:'<path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6M14 11v6"/>',download:'<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',laser:'<circle cx="12" cy="12" r="3"/><path d="M12 2v4m0 12v4M2 12h4m12 0h4"/>',spotlight:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/>',help:'<circle cx="12" cy="12" r="9"/><path d="M9 8a3 3 0 0 1 6 0c0 2-3 2-3 5m0 4v.1"/>'};
  const btn=(id,label,ic,extra='')=>'<button type="button" class="ink-tool" '+(id?'id="'+id+'" ':'')+'title="'+label+'" aria-label="'+label+'" '+extra+'>'+icon(icons[ic]||icons.shapes)+'<span>'+label+'</span></button>';
  toolbar.innerHTML='<div class="ink-v3-main">'+['move','select','pen','highlight','eraser'].map(t=>btn('',{move:'Chọn / cuộn',select:'Sửa hình',pen:'Bút',highlight:'Đánh dấu',eraser:'Tẩy'}[t],t,'data-ink-tool="'+t+'" aria-pressed="false"')).join('')+btn('ink-shapes','Hình học','shapes')+btn('','Chữ / nhãn','text','data-ink-tool="text"')+'<i></i><input id="ink-color" type="color" value="'+color+'" title="Màu nét" aria-label="Màu nét"><select id="ink-width" aria-label="Độ dày nét"><option value="2">Mảnh</option><option value="3" selected>Vừa</option><option value="5">Đậm</option><option value="8">Rất đậm</option></select><select id="ink-dash" aria-label="Kiểu nét"><option value="solid">Nét liền</option><option value="dashed">Nét đứt</option><option value="dotted">Nét chấm</option></select>'+btn('ink-settings','Tùy chỉnh','settings')+'<i></i>'+btn('ink-undo','Hoàn tác (Ctrl+Z)','undo')+btn('ink-redo','Làm lại (Ctrl+Y)','redo')+btn('ink-board-open','Bảng trắng','board')+btn('ink-more','Thao tác khác','help')+'</div><div id="ink-selection-bar" class="ink-v3-selection" hidden><strong id="ink-selection-title">Đã chọn hình</strong>'+btn('ink-duplicate','Nhân đôi','duplicate')+btn('ink-delete','Xóa hình đã chọn','delete')+'<button type="button" id="ink-rename">Tên đỉnh / chữ</button><button type="button" id="ink-rotate-reset">Bỏ xoay</button><span>Kéo hình để di chuyển · Kéo góc để đổi cỡ · Chấm tròn để xoay</span></div><div id="ink-status" class="ink-v3-status" aria-live="polite"></div>';
  function dialog(id,title,body){const d=document.createElement('dialog');d.id=id;d.className='ink-v3-dialog';d.innerHTML='<header><div><small>CÔNG CỤ GIẢNG DẠY</small><h2>'+title+'</h2></div><button type="button" data-ink-close aria-label="Đóng">×</button></header><div class="ink-v3-dialog-body">'+body+'</div>';document.body.append(d);d.addEventListener('click',e=>{if(e.target.closest('[data-ink-close]')||e.target===d)d.close();});d.addEventListener('cancel',e=>{e.stopPropagation();});return d;}
  const gallery=dialog('ink-gallery','Chọn hình để vẽ','<p>Chọn một hình, rồi kéo trên bài để đặt hình. Hình không gian là hình biểu diễn 2D có nét khuất.</p><div id="ink-gallery-groups"></div>');
  const settings=dialog('ink-settings-dialog','Nét vẽ & bút cảm ứng','<div class="ink-v3-checks"><label><input id="ink-labels" type="checkbox" checked> Hiện tên đỉnh / tên trục</label><label><input id="ink-hidden" type="checkbox" checked> Hiện cạnh khuất bằng nét đứt</label><label><input id="ink-filled" type="checkbox"> Tô nhẹ bên trong hình phẳng</label><label><input id="ink-snap" type="checkbox"> Bắt điểm theo ô 20 px</label><label><input id="ink-pen-only" type="checkbox"> Bỏ qua chạm tay khi vẽ</label><p>Nhận bút cảm ứng và chuột; bỏ qua nét do ngón tay hoặc lòng bàn tay. Chọn “Chọn / cuộn” khi cần cuộn bằng tay.</p><label><input id="ink-pressure" type="checkbox"> Độ dày theo lực ấn bút</label><p>Áp dụng cho Bút khi thiết bị có báo lực ấn. Chưa kiểm thử trên iPad / tablet thật.</p><label>Nền bảng trắng <select id="ink-background"><option value="plain">Trắng</option><option value="grid">Ô vuông</option><option value="dots">Chấm</option></select></label></div>');
  const more=dialog('ink-more-dialog','Thao tác & phím tắt','<div class="ink-v3-actions">'+btn('ink-export','Tải hình SVG','download')+btn('ink-clear','Xóa nét trang này','delete')+btn('','Laser','laser','data-ink-tool="laser"')+btn('','Soi vùng','spotlight','data-ink-tool="spotlight"')+'</div><p>SVG chứa các nét và hình đã vẽ trên trang hiện tại. Nét vẽ đi theo từng câu trong lần mở trình chiếu.</p><dl><dt>B / E / V / Esc</dt><dd>Bút / Tẩy / Sửa hình / trở về Chọn</dd><dt>Ctrl+Z / Ctrl+Y</dt><dd>Hoàn tác / làm lại</dd><dt>Ctrl+D / Delete</dt><dd>Nhân đôi / xóa hình được chọn</dd><dt>Shift khi kéo</dt><dd>Giữ tỉ lệ hoặc hướng 45°</dd></dl><p>Với hình đã chọn, màu, độ dày, kiểu nét và các tùy chỉnh hình sẽ áp dụng trực tiếp. Thay đổi lớn cỡ chữ/bố cục bài có thể làm chú thích lệch vị trí; hãy đặt bố cục trước khi viết.</p>');
  const textDialog=dialog('ink-text-dialog','Tên đỉnh / chú thích','<label id="ink-text-label" for="ink-text-value">Nội dung</label><input id="ink-text-value" type="text" maxlength="160" autocomplete="off"><p id="ink-text-tip"></p><button id="ink-text-save" type="button" class="ink-v3-primary">Áp dụng</button>');
  const board=dialog('ink-whiteboard','Bảng trắng','<div id="ink-board-slot"></div><div id="ink-board-surface" tabindex="0" aria-label="Bảng trắng để viết và vẽ"><div class="ink-board-paper"></div></div>');
  board.querySelector('h2').id='ink-board-title';board.querySelector('[data-ink-close]').setAttribute('aria-label','Trở lại bài');
  const getContext=()=>board.open?boardContext:baseContext(),getSurface=()=>board.open?'board':baseSurface();
  const strokes=c=>store.active().ink[c]||[],uid=()=> 's_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,8);
  const key=c=>store.active().id+':'+c;
  function stacks(c){if(!history.has(key(c)))history.set(key(c),{undo:[],redo:[]});return history.get(key(c));}
  function remember(c,old=strokes(c)){const h=stacks(c);h.undo.push(copy(old));if(h.undo.length>40)h.undo.shift();h.redo=[];}
  function saved(){store.save();onChange?.();}
  function feedback(s){$('ink-status').textContent=s;}
  function prefs(){try{localStorage.setItem(prefsKey,JSON.stringify({color,width,dash,filled,labels,hidden,penOnly,pressure,snap,bg}));}catch{}}
  try{const p=JSON.parse(localStorage.getItem(prefsKey)||'{}');if(/^#[0-9a-f]{6}$/i.test(p.color))color=p.color;if([2,3,5,8].includes(p.width))width=p.width;if(['solid','dashed','dotted'].includes(p.dash))dash=p.dash;filled=p.filled===true;labels=p.labels!==false;hidden=p.hidden!==false;penOnly=p.penOnly===true;pressure=p.pressure===true;snap=p.snap===true;if(['plain','grid','dots'].includes(p.bg))bg=p.bg;}catch{}
  function syncSettings(){for(const [id,v] of Object.entries({'ink-labels':labels,'ink-hidden':hidden,'ink-filled':filled,'ink-snap':snap,'ink-pen-only':penOnly,'ink-pressure':pressure}))$(id).checked=v;$('ink-background').value=bg;$('ink-color').value=color;$('ink-width').value=String(width);$('ink-dash').value=dash;$('ink-board-surface').dataset.background=bg;}
  syncSettings();
  /* Geometry definitions use a unit rectangle; the hidden flag belongs to each edge. */
  function geometryOf(s,pts){
    const a=pts[0],b=pts.at(-1),x=Math.min(a[0],b[0]),y=Math.min(a[1],b[1]),w=Math.max(1,Math.abs(b[0]-a[0])),h=Math.max(1,Math.abs(b[1]-a[1]));
    const paths=[],verts=[],pos=p=>[x+p[0]*w,y+p[1]*h];
    const path=(p,dotted=false,closed=false,fill=false)=>paths.push({p:p.map(pos),hidden:dotted,closed,fill});
    const polygon=(p,namesList)=>{path(p,false,true,true);if(namesList)p.forEach((p,i)=>verts.push({p:pos(p),label:namesList[i]}));};
    const vertex=(p,label,dx=0,dy=0)=>verts.push({p:pos(p),label,dx,dy});
    const arc=(cx,cy,rx,ry,start=0,end=Math.PI*2,dotted=false)=>{path(Array.from({length:65},(_,i)=>[cx+rx*Math.cos(start+(end-start)*i/64),cy+ry*Math.sin(start+(end-start)*i/64)]),dotted);paths.at(-1).arc={cx:x+cx*w,cy:y+cy*h,rx:rx*w,ry:ry*h,start,end};};
    const head=(p,q)=>{const angle=Math.atan2(q[1]-p[1],q[0]-p[0]),l=Math.min(15,9+s.width);paths.push({p:[[q[0]-l*Math.cos(angle-.45),q[1]-l*Math.sin(angle-.45)],q,[q[0]-l*Math.cos(angle+.45),q[1]-l*Math.sin(angle+.45)]],decoration:true});};
    const axes=(o,ends,letters)=>{for(let i=0;i<ends.length;i++){path([o,ends[i]]);head(pos(o),pos(ends[i]));vertex(ends[i],letters[i],8,-8);}vertex(o,'O',-12,14);};
    switch(s.tool){
      case 'pen':case 'highlight':paths.push({p:pts});break;
      case 'line':case 'arrow':case 'doublearrow':paths.push({p:[a,b]});if(s.tool!=='line')head(a,b);if(s.tool==='doublearrow')head(b,a);break;
      case 'ellipse':case 'circle':arc(.5,.5,.49,.49);paths[0].closed=true;paths[0].fill=true;break;
      case 'triangle':polygon([[.5,0],[0,1],[1,1]],['A','B','C']);break;
      case 'equilateral':polygon([[.5,0],[0,1],[1,1]],['A','B','C']);break;
      case 'righttriangle':polygon([[0,0],[0,1],[1,1]],['A','B','C']);path([[0,.85],[.12,.85],[.12,1]]);break;
      case 'rect':case 'square':polygon([[0,0],[1,0],[1,1],[0,1]],['A','B','C','D']);break;
      case 'parallelogram':polygon([[.25,0],[1,0],[.75,1],[0,1]],['A','B','C','D']);break;
      case 'rhombus':polygon([[.5,0],[1,.5],[.5,1],[0,.5]],['A','B','C','D']);break;
      case 'trapezoid':polygon([[.25,0],[.75,0],[1,1],[0,1]],['A','B','C','D']);break;
      case 'pentagon':case 'hexagon':{const n=s.tool==='pentagon'?5:6;polygon(Array.from({length:n},(_,i)=>[.5+.5*Math.cos(-Math.PI/2+i*2*Math.PI/n),.5+.5*Math.sin(-Math.PI/2+i*2*Math.PI/n)]),'ABCDEF'.slice(0,n).split(''));break;}
      case 'angle':{path([[1,.15],[0,1],[1,1]]);const radius=.22*Math.min(w,h);arc(0,1,radius/w,radius/h,-Math.atan2(.85*h,w),0);vertex([.27,.89],'α');break;}
      case 'rightangle':path([[0,0],[0,1],[1,1]]);path([[0,.78],[.22,.78],[.22,1]]);break;
      case 'axes2d':axes([.25,.75],[[1,.75],[.25,0]],['x','y']);path([[0,.75],[.25,.75]]);path([[.25,.75],[.25,1]]);for(let t=.4;t<.96;t+=.15)path([[t,.73],[t,.77]]);for(let t=.15;t<.7;t+=.15)path([[.23,t],[.27,t]]);break;
      case 'axes3d':axes([.4,.65],[[.06,.96],[.98,.65],[.4,0]],['x','y','z']);break;
      case 'cube':case 'cuboid':{
        const v=[[.05,.94],[.69,.94],[.95,.68],[.31,.68],[.05,.30],[.69,.30],[.95,.04],[.31,.04]];
        [[0,1],[1,2],[0,4],[1,5],[2,6],[4,5],[5,6],[6,7],[7,4]].forEach(([i,j])=>path([v[i],v[j]]));[[0,3],[3,2],[3,7]].forEach(([i,j])=>path([v[i],v[j]],true));v.forEach((p,i)=>vertex(p,['A','B','C','D','A′','B′','C′','D′'][i]));break;}
      case 'prism':{
        const v=[[.05,.80],[.44,.97],[.95,.68],[.05,.20],[.44,.37],[.95,.08]];
        [[0,1],[1,2],[0,3],[1,4],[2,5],[3,4],[4,5],[5,3]].forEach(([i,j])=>path([v[i],v[j]]));path([v[0],v[2]],true);v.forEach((p,i)=>vertex(p,['A','B','C','A′','B′','C′'][i]));break;}
      case 'pyramid':{
        const v=[[.05,.72],[.60,.97],[.95,.64],[.40,.39],[.43,.03]];
        [[0,1],[1,2],[4,0],[4,1],[4,2]].forEach(([i,j])=>path([v[i],v[j]]));[[0,3],[3,2],[4,3]].forEach(([i,j])=>path([v[i],v[j]],true));v.forEach((p,i)=>vertex(p,['A','B','C','D','S'][i]));break;}
      case 'tetrahedron':{
        const v=[[.04,.80],[.55,.97],[.96,.65],[.43,.02]];
        [[0,1],[1,2],[3,0],[3,1],[3,2]].forEach(([i,j])=>path([v[i],v[j]]));path([v[0],v[2]],true);v.forEach((p,i)=>vertex(p,['A','B','C','S'][i]));break;}
      case 'cylinder':arc(.5,.14,.43,.11);arc(.5,.86,.43,.11,0,Math.PI);arc(.5,.86,.43,.11,Math.PI,2*Math.PI,true);path([[.07,.14],[.07,.86]]);path([[.93,.14],[.93,.86]]);vertex([.5,.14],'O′',8,-8);vertex([.5,.86],'O',8,-8);break;
      case 'cone':arc(.5,.86,.43,.11,0,Math.PI);arc(.5,.86,.43,.11,Math.PI,2*Math.PI,true);path([[.07,.86],[.5,.03],[.93,.86]]);path([[.5,.03],[.5,.86]],true);vertex([.5,.03],'S',0,-10);vertex([.5,.86],'O',8,-8);break;
      case 'sphere':arc(.5,.5,.47,.47);arc(.5,.5,.47,.14,0,Math.PI);arc(.5,.5,.47,.14,Math.PI,2*Math.PI,true);arc(.5,.5,.16,.47,-Math.PI/2,Math.PI/2);arc(.5,.5,.16,.47,Math.PI/2,3*Math.PI/2,true);vertex([.5,.5],'O',10,-8);break;
    }
    return {paths,verts,box:{x,y,w,h}};
  }
  function geometry(r){
    const b=r.target.getBoundingClientRect();if(!r.full)return {left:b.left,top:b.top,width:b.width,height:b.height};
    const host=r.host,top=b.top+host.clientTop-host.scrollTop;let height=host.clientHeight;
    for(const child of host.children){if(child.classList.contains('thd-ink-layer')||!child.getClientRects().length)continue;const cs=getComputedStyle(child);if(['absolute','fixed'].includes(cs.position))continue;height=Math.max(height,child.getBoundingClientRect().bottom-top+(parseFloat(cs.marginBottom)||0)+(parseFloat(getComputedStyle(host).paddingBottom)||0));}
    return {left:b.left+host.clientLeft-host.scrollLeft,top,width:host.clientWidth,height:Math.ceil(height)};
  }
  const yScale=(s,g)=>s.coord==='page-width'&&s.basis?s.basis[1]*g.width/s.basis[0]:g.height;
  const renderedPoints=(s,g)=>s.points.map(p=>[p[0]*g.width,p[1]*yScale(s,g)]);
  function bounds(s,pts){let xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);if(s.tool==='text'){const p=pts[0],size=s.fontSize||24;return {x:p[0],y:p[1]-size,w:Math.max(size,String(s.text||'').length*size*.64),h:size*1.3};}return {x:Math.min(...xs),y:Math.min(...ys),w:Math.max(1,Math.max(...xs)-Math.min(...xs)),h:Math.max(1,Math.max(...ys)-Math.min(...ys))};}
  const rotate=(p,box,angle)=>{const cx=box.x+box.w/2,cy=box.y+box.h/2,t=angle*Math.PI/180;return [cx+(p[0]-cx)*Math.cos(t)-(p[1]-cy)*Math.sin(t),cy+(p[0]-cx)*Math.sin(t)+(p[1]-cy)*Math.cos(t)];};
  function strokeNode(s,pts,preview=false){
    const box=bounds(s,pts),group=svg('g',{'data-stroke-id':s.id||'',transform:'rotate('+(s.rotation||0)+' '+(box.x+box.w/2)+' '+(box.y+box.h/2)+')'});
    if(s.tool==='text'){const text=svg('text',{x:pts[0][0],y:pts[0][1],fill:s.color,'font-size':s.fontSize||24,'font-family':'Georgia, serif','font-weight':500});text.textContent=s.text||'';group.append(text);return group;}
    const geo=geometryOf(s,pts),common={fill:'none',stroke:s.color,'stroke-width':s.tool==='highlight'?s.width*6:s.width,'stroke-linecap':'round','stroke-linejoin':'round','vector-effect':'non-scaling-stroke'};
    if(s.tool==='highlight')group.setAttribute('opacity','.30');
    if(s.tool==='pen'&&s.pressures?.length===pts.length&&pts.length>1){
      const side=sign=>pts.map((p,i)=>{const a=pts[Math.max(0,i-1)],b=pts[Math.min(pts.length-1,i+1)],len=Math.hypot(b[0]-a[0],b[1]-a[1])||1,r=s.width*(.45+.95*s.pressures[i])/2;return [p[0]-sign*(b[1]-a[1])/len*r,p[1]+sign*(b[0]-a[0])/len*r];});
      const poly=[...side(1),...side(-1).reverse()];group.append(svg('path',{d:'M'+poly.map(p=>p.join(' ')).join('L')+'Z',fill:s.color}));for(const i of [0,pts.length-1])group.append(svg('circle',{cx:pts[i][0],cy:pts[i][1],r:s.width*(.45+.95*s.pressures[i])/2,fill:s.color}));
    }else for(const p of geo.paths){
      if(p.hidden&&s.hidden===false)continue;
      const d=p.hidden?'6 5':s.dash==='dashed'?'9 6':s.dash==='dotted'?'1 6':null,attrs={...common};if(d&&!p.decoration)attrs['stroke-dasharray']=d;
      if(p.p.length===1){group.append(svg('circle',{cx:p.p[0][0],cy:p.p[0][1],r:common['stroke-width']/2,fill:s.color}));continue;}
      let pathData='M'+p.p.map(p=>p.join(' ')).join('L')+(p.closed?'Z':'');
      if(p.arc){const a=p.arc,arcCmd='A'+a.rx+' '+a.ry+' 0 ';if(Math.abs(a.end-a.start)>=Math.PI*2-.00001)pathData='M'+(a.cx+a.rx)+' '+a.cy+arcCmd+'1 1 '+(a.cx-a.rx)+' '+a.cy+arcCmd+'1 1 '+(a.cx+a.rx)+' '+a.cy+'Z';else pathData='M'+p.p[0].join(' ')+arcCmd+(Math.abs(a.end-a.start)>Math.PI?1:0)+' 1 '+p.p.at(-1).join(' ');}
      if(p.closed&&p.fill&&s.filled)group.append(svg('path',{d:pathData,fill:s.color,'fill-opacity':.10}));
      group.append(svg('path',{...attrs,d:pathData}));
    }
    if(s.labels&&!preview)geo.verts.forEach((v,i)=>{const center=[box.x+box.w/2,box.y+box.h/2],dx=v.dx||((v.p[0]-center[0])<-.1?-11:(v.p[0]-center[0])>.1?11:0),dy=v.dy||((v.p[1]-center[1])<0?-12:19);if(v.label.startsWith('O'))group.append(svg('circle',{cx:v.p[0],cy:v.p[1],r:2.3,fill:s.color}));const t=svg('text',{x:v.p[0]+dx,y:v.p[1]+dy,fill:s.color,'font-size':18,'font-family':'Georgia, serif','font-style':'italic','text-anchor':'middle',stroke:'white','stroke-width':3,'paint-order':'stroke fill'});t.textContent=s.vertexLabels?.[i]||v.label;group.append(t);});
    return group;
  }
  function handlePoints(box){return [[box.x,box.y],[box.x+box.w,box.y],[box.x+box.w,box.y+box.h],[box.x,box.y+box.h],[box.x+box.w/2,box.y-32]];}
  function paint(r){
    const g=geometry(r),h=r.host.getBoundingClientRect();if(!g.width||!g.height)return;
    Object.assign(r.layer.style,{left:(r.full?0:g.left-h.left+r.host.scrollLeft)+'px',top:(r.full?0:g.top-h.top+r.host.scrollTop)+'px',width:g.width+'px',height:g.height+'px'});r.layer.setAttribute('viewBox','0 0 '+g.width+' '+g.height);r.layer.replaceChildren();
    const list=strokes(r.context).filter(s=>s.zone===r.zone);if(drawing?.stroke&&drawing.context===r.context&&drawing.stroke.zone===r.zone)list.push(drawing.stroke);
    for(const s of list){const pts=renderedPoints(s,g);r.layer.append(strokeNode(s,pts));if(selection?.id===s.id&&selection.context===r.context&&tool==='select'){
      const box=bounds(s,pts),group=svg('g',{'data-selection':s.id,transform:'rotate('+(s.rotation||0)+' '+(box.x+box.w/2)+' '+(box.y+box.h/2)+')'});group.append(svg('rect',{x:box.x-5,y:box.y-5,width:box.w+10,height:box.h+10,rx:3,fill:'none',stroke:'#169a88','stroke-width':1.5,'stroke-dasharray':'5 4'}));group.append(svg('path',{d:'M'+(box.x+box.w/2)+' '+(box.y-5)+'v-27',stroke:'#169a88'}));handlePoints(box).forEach((p,i)=>group.append(svg(i===4?'circle':'rect',i===4?{cx:p[0],cy:p[1],r:7,fill:'white',stroke:'#169a88','stroke-width':2}:{x:p[0]-5,y:p[1]-5,width:10,height:10,rx:2,fill:'white',stroke:'#169a88','stroke-width':2})));r.layer.append(group);
    }}
  }
  function redraw(){records.forEach(paint);}
  function schedule(){if(!frame)frame=requestAnimationFrame(()=>{frame=0;redraw();});}
  function selected(){return selection?.context===getContext()?strokes(selection.context).find(s=>s.id===selection.id):null;}
  function updateButtons(){
    toolbar.querySelectorAll('[data-ink-tool]').forEach(b=>{const yes=b.dataset.inkTool===tool;b.classList.toggle('active',yes);b.setAttribute('aria-pressed',String(yes));});$('ink-shapes').classList.toggle('active',shapeIds.has(tool));$('ink-shapes').title=shapeIds.has(tool)?names[tool]+' — chọn hình khác':'Hình học';
    const c=getContext(),h=stacks(c);$('ink-undo').disabled=!h.undo.length;$('ink-redo').disabled=!h.redo.length;$('ink-clear').disabled=!strokes(c).length;
    const s=selected();$('ink-selection-bar').hidden=!s||tool!=='select';$('ink-selection-title').textContent=s?(names[s.tool]||{pen:'Nét bút',highlight:'Nét đánh dấu',text:'Chữ / nhãn'}[s.tool]||'Hình'):'';
    $('ink-rename').disabled=!(s&&(s.tool==='text'||geometryOf(s,renderedPoints(s,{width:100,height:100})).verts.length));
    records.forEach(r=>{r.host.classList.toggle('ink-drawing',r.full&&!['move','laser','spotlight'].includes(tool)&&!toolbar.hidden);r.host.classList.toggle('ink-selecting',tool==='select');});
    const hint={move:'Chọn đáp án / cuộn trang',select:'Chạm vào nét hoặc hình để sửa',pen:'Viết trên toàn vùng bài',highlight:'Đánh dấu',eraser:'Chạm hoặc kéo qua nét cần xóa',text:'Chạm để đặt chữ / nhãn',laser:'Di chuyển để chỉ bài',spotlight:'Di chuyển để soi vùng'}[tool]||names[tool]+' · Kéo để vẽ';feedback(hint+(penOnly?' · Bỏ qua chạm tay':'')+' · '+strokes(c).length+' đối tượng');
  }
  function hidePointer(){$('teaching-pointer').hidden=true;}
  function setTool(t){finish();tool=t;selection=null;hidePointer();updateButtons();redraw();}
  function mount(){
    finish(false);selection=null;observer?.disconnect();records.forEach(r=>{r.layer.remove();r.host.classList.remove('ink-host','ink-drawing','ink-page-host','ink-selecting');});records=[];
    const context=getContext(),surface=getSurface(),slot=$(surface==='board'?'ink-board-slot':surface==='figure'?'figure-ink-slot':surface==='question'?'q-ink-slot':'reader-ink-slot');if(slot&&toolbar.parentElement!==slot)slot.append(toolbar);
    document.querySelectorAll('[data-ink-toggle]').forEach(b=>{b.setAttribute('aria-expanded',String(!toolbar.hidden));b.classList.toggle('active',!toolbar.hidden);});(surface==='board'?board:document.body).append($('teaching-pointer'));if(!context){toolbar.hidden=true;tool='move';updateButtons();return;}
    function add(host,target,zone,full=false){if(!host||!target)return;host.classList.add('ink-host');if(full)host.classList.add('ink-page-host');const layer=svg('svg',{'class':'thd-ink-layer'+(full?' ink-fullpage':''),'aria-hidden':'true','data-ink-zone':zone});host.append(layer);records.push({host,target,layer,zone,context,full});}
    let root;
    if(surface==='board'){add($('ink-board-surface'),$('ink-board-surface'),'page',true);}
    else if(surface==='figure'){const asset=$('figure-image').dataset.inkAsset;add($('figure-canvas'),$('figure-image'),'figure-'+asset);add($('figure-viewport'),$('figure-viewport'),'figureboard-'+asset,true);}
    else if(surface==='question'){add($('q-stem'),$('q-stem'),'stem');$('answer-controls').querySelectorAll('.option-content').forEach((e,i)=>add(e,e,'option-'+i));add($('q-solution'),$('q-solution'),'solution');root=$('q-body');add(root,root,'page',true);}
    else{root=$('theory-content');add(root,root,'stem');add($('stage'),$('stage'),'reader-page',true);}
    root?.querySelectorAll('[data-figure]').forEach(e=>add(e,e.querySelector('img'),'figure-'+e.dataset.figure));
    if(typeof ResizeObserver!=='undefined'){observer=new ResizeObserver(schedule);for(const r of records){observer.observe(r.target);if(r.full)for(const child of r.host.children)if(!child.classList.contains('thd-ink-layer'))observer.observe(child);}}
    updateButtons();schedule();
  }
  function pick(target){if(!target?.closest||target.closest('#ink-toolbar,input,textarea,select,[contenteditable="true"],button:not([data-figure]),a'))return null;return records.find(r=>r.full&&(r.host===target||r.host.contains(target)));}
  function pixel(e,r){const g=geometry(r);return [e.clientX-g.left,e.clientY-g.top];}
  function normalize(p,r,s){const g=geometry(r);return [Math.max(0,Math.min(1,p[0]/g.width)),Math.max(0,Math.min(1,p[1]/yScale(s,g)))];}
  function distance(p,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy,t=l?Math.max(0,Math.min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l)):0;return Math.hypot(p[0]-a[0]-t*dx,p[1]-a[1]-t*dy);}
  function hit(e,inside=false){
    const list=strokes(getContext());for(let i=list.length-1;i>=0;i--){const s=list[i],r=records.find(r=>r.zone===s.zone);if(!r||!r.target.getClientRects().length)continue;const pts=renderedPoints(s,geometry(r)),box=bounds(s,pts),p=rotate(pixel(e,r),box,-(s.rotation||0)),radius=10+(s.tool==='highlight'?s.width*3:s.width/2);
      if((inside&&shapeIds.has(s.tool))||s.tool==='text'){if(p[0]>=box.x-8&&p[0]<=box.x+box.w+8&&p[1]>=box.y-8&&p[1]<=box.y+box.h+8)return {s,r};}
      else if(geometryOf(s,pts).paths.filter(path=>!path.hidden||s.hidden!==false).some(path=>{const pps=path.closed?[...path.p,path.p[0]]:path.p;return pps.length===1?Math.hypot(p[0]-pps[0][0],p[1]-pps[0][1])<radius:pps.some((b,j)=>j&&distance(p,pps[j-1],b)<radius);}))return {s,r};
    }return null;
  }
  function eraseAt(e){const found=hit(e);if(found){const list=strokes(drawing.context);list.splice(list.indexOf(found.s),1);drawing.changed=true;schedule();updateButtons();}}
  function changeSelected(fn){finish();const s=selected();if(s){remember(getContext());fn(s);saved();redraw();}updateButtons();}
  function choose(s,r){selection={id:s.id,context:r.context};color=s.color;width=s.width;dash=s.dash||'solid';filled=!!s.filled;labels=s.labels!==false;hidden=s.hidden!==false;syncSettings();updateButtons();}
  function finish(commit=true){
    if(!drawing)return;const d=drawing;drawing=null;try{d.record.host.releasePointerCapture(d.pointerId);}catch{}
    if(d.kind==='erase'||d.kind==='transform'){if(d.changed){if(commit)remember(d.context,d.before);else store.active().ink[d.context]=d.before;saved();}}
    else if(commit&&d.stroke){const pts=renderedPoints(d.stroke,geometry(d.record));if(!shapeIds.has(d.stroke.tool)||Math.hypot(pts.at(-1)[0]-pts[0][0],pts.at(-1)[1]-pts[0][1])>5){remember(d.context);(store.active().ink[d.context]??=[]).push(d.stroke);saved();if(shapeIds.has(d.stroke.tool)){tool='select';choose(d.stroke,d.record);}}}
    if(commit)ignoreClickUntil=Date.now()+450;redraw();updateButtons();
  }
  function undo(redo=false){finish();const c=getContext(),h=stacks(c),from=redo?h.redo:h.undo,to=redo?h.undo:h.redo;if(!from.length)return;to.push(copy(strokes(c)));store.active().ink[c]=from.pop();selection=null;saved();redraw();updateButtons();}
  function transformStart(e,r){
    const s=selected();if(s){const sr=records.find(r=>r.zone===s.zone);if(sr){const box=bounds(s,renderedPoints(s,geometry(sr))),p=rotate(pixel(e,sr),box,-(s.rotation||0)),hp=handlePoints(box),idx=hp.findIndex(q=>Math.hypot(p[0]-q[0],p[1]-q[1])<14);if(idx>=0)return {s,r:sr,mode:idx===4?'rotate':'resize',handle:idx};}}
    const found=hit(e,true);if(!found){selection=null;updateButtons();redraw();return null;}choose(found.s,found.r);return {...found,mode:'move'};
  }
  function transformMove(e,d){
    const s=strokes(d.context).find(s=>s.id===d.id),g=geometry(d.record),cur=pixel(e,d.record),old=renderedPoints(d.original,g),box=bounds(d.original,old);if(!s)return;
    if(d.mode==='rotate'){const cx=box.x+box.w/2,cy=box.y+box.h/2;let angle=d.original.rotation||0;angle+=(Math.atan2(cur[1]-cy,cur[0]-cx)-Math.atan2(d.start[1]-cy,d.start[0]-cx))*180/Math.PI;if(e.shiftKey||snap)angle=Math.round(angle/15)*15;s.rotation=((angle%360)+360)%360;}
    else if(d.mode==='move'){let dx=cur[0]-d.start[0],dy=cur[1]-d.start[1];if(snap){dx=Math.round(dx/20)*20;dy=Math.round(dy/20)*20;}dx=Math.max(-box.x,Math.min(g.width-box.x-box.w,dx));dy=Math.max(-box.y,Math.min(g.height-box.y-box.h,dy));s.points=old.map(p=>normalize([p[0]+dx,p[1]+dy],d.record,s));}
    else{const p=rotate(cur,box,-(d.original.rotation||0)),opposite=handlePoints(box)[(d.handle+2)%4],sx=p[0]<opposite[0]?-1:1,sy=p[1]<opposite[1]?-1:1,limitX=sx<0?opposite[0]:g.width-opposite[0],limitY=sy<0?opposite[1]:yScale(s,g)-opposite[1];let nw=Math.min(Math.max(20,Math.abs(p[0]-opposite[0])),limitX),nh=Math.min(Math.max(20,Math.abs(p[1]-opposite[1])),limitY);if(e.shiftKey||['circle','square','sphere','cube','equilateral','pentagon','hexagon'].includes(s.tool)){const ratio=box.h/box.w;nw=Math.min(nw,limitY/ratio);nh=nw*ratio;}const nx=sx<0?opposite[0]-nw:opposite[0],ny=sy<0?opposite[1]-nh:opposite[1];s.points=old.map(p=>normalize([nx+(p[0]-box.x)*nw/box.w,ny+(p[1]-box.y)*nh/box.h],d.record,s));if(s.tool==='text')s.fontSize=Math.max(12,Math.min(120,(d.original.fontSize||24)*nw/box.w));}
    d.changed=true;schedule();
  }
  let pendingText=null;
  function openText(info){pendingText=info;const s=info.stroke,names=s&&s.tool!=='text'?geometryOf(s,renderedPoints(s,geometry(info.r))).verts.map((v,i)=>s.vertexLabels?.[i]||v.label):null;$('ink-text-value').value=names?names.join(', '):s?.text||'';$('ink-text-label').textContent=names?'Tên đỉnh theo thứ tự':'Nội dung chữ / nhãn';$('ink-text-tip').textContent=names?'Ngăn cách bằng dấu phẩy. Có thể dùng A′, B₁, M, N…':'Gõ chữ hoặc ký hiệu Unicode: α, β, Δ, ⟂, ∥, A′…';textDialog.showModal();$('ink-text-value').focus();}
  $('ink-text-save').onclick=()=>{const v=$('ink-text-value').value.trim();if(!v)return;const p=pendingText;if(!p)return;if(p.stroke){changeSelected(s=>{if(s.tool==='text')s.text=v;else{s.vertexLabels=v.split(',').map(v=>v.trim().slice(0,12)).slice(0,12);s.labels=true;labels=true;syncSettings();}});}else if(getContext()===p.context&&strokes(p.context).length<300){remember(p.context);const s={...p.base,tool:'text',text:v,fontSize:26};(store.active().ink[p.context]??=[]).push(s);tool='select';choose(s,p.r);saved();redraw();}pendingText=null;textDialog.close();updateButtons();};
  document.addEventListener('pointerdown',e=>{
    if(toolbar.hidden||['move','laser','spotlight'].includes(tool)||e.button!==0)return;
    const r=pick(e.target);if(!r||!r.target.getClientRects().length)return;
    if(penOnly&&e.pointerType==='touch')return;
    if(drawing){if(e.pointerType==='pen'&&drawing.pointerType==='touch')finish(false);else return;}
    e.preventDefault();e.stopImmediatePropagation();
    if(tool==='select'){const f=transformStart(e,r);if(!f)return;drawing={kind:'transform',record:f.r,context:f.r.context,pointerId:e.pointerId,pointerType:e.pointerType,before:copy(strokes(f.r.context)),id:f.s.id,original:copy(f.s),start:pixel(e,f.r),mode:f.mode,handle:f.handle};}
    else if(tool==='eraser'){drawing={kind:'erase',record:r,context:r.context,pointerId:e.pointerId,pointerType:e.pointerType,before:copy(strokes(r.context))};eraseAt(e);}
    else{
      if(strokes(r.context).length>=300){feedback('Đã có 300 đối tượng. Xóa bớt trước khi vẽ tiếp.');return;}
      const g=geometry(r),base={id:uid(),zone:r.zone,tool,color,width,dash,filled,labels,hidden,coord:'page-width',basis:[g.width,g.height]},p=pixel(e,r);if(snap&&shapeIds.has(tool)){p[0]=Math.round(p[0]/20)*20;p[1]=Math.round(p[1]/20)*20;}base.points=[normalize(p,r,base)];
      if(tool==='text'){openText({context:r.context,r,base});return;}
      if(pressure&&dash==='solid'&&tool==='pen'&&e.pointerType==='pen'&&e.pressure>0)base.pressures=[e.pressure];
      drawing={kind:'new',record:r,context:r.context,pointerId:e.pointerId,pointerType:e.pointerType,stroke:base};
    }
    try{drawing.record.host.setPointerCapture(e.pointerId);}catch{}redraw();
  },true);
  function addPoints(e){
    const d=drawing,s=d.stroke,g=geometry(d.record);let p=pixel(e,d.record),first=renderedPoints(s,g)[0];
    if(shapeIds.has(s.tool)){
      if(snap){p=p.map(v=>Math.round(v/20)*20);}
      let dx=p[0]-first[0],dy=p[1]-first[1];
      if(['line','arrow','doublearrow'].includes(s.tool)){if(e.shiftKey||snap){const ang=Math.round(Math.atan2(dy,dx)/(Math.PI/4))*Math.PI/4,len=Math.hypot(dx,dy);p=[first[0]+len*Math.cos(ang),first[1]+len*Math.sin(ang)];}}
      else if(e.shiftKey||['circle','square','sphere','cube','equilateral','pentagon','hexagon'].includes(s.tool)){const ratio=s.tool==='equilateral'?Math.sqrt(3)/2:1,limitX=dx<0?first[0]:g.width-first[0],limitY=dy<0?first[1]:yScale(s,g)-first[1],len=Math.min(Math.max(Math.abs(dx),Math.abs(dy)/ratio),limitX,limitY/ratio);p=[first[0]+(dx<0?-1:1)*len,first[1]+(dy<0?-1:1)*len*ratio];}
      s.points=[s.points[0],normalize(p,d.record,s)];
    }else{
      const events=typeof e.getCoalescedEvents==='function'?e.getCoalescedEvents():[],list=events.length?events:[e];
      for(const ev of list){const p=normalize(pixel(ev,d.record),d.record,s),last=s.points.at(-1);if(Math.hypot((p[0]-last[0])*g.width,(p[1]-last[1])*yScale(s,g))>.65){s.points.push(p);if(s.pressures)s.pressures.push(ev.pressure>0?ev.pressure:s.pressures.at(-1));}}
      if(s.points.length>1500){s.points=s.points.filter((_,i)=>i%2===0);if(s.pressures)s.pressures=s.pressures.filter((_,i)=>i%2===0);}
    }
  }
  document.addEventListener('pointermove',e=>{
    if(drawing){if(e.pointerId!==drawing.pointerId)return;e.preventDefault();if(drawing.kind==='erase')eraseAt(e);else if(drawing.kind==='transform')transformMove(e,drawing);else addPoints(e);schedule();return;}
    if(toolbar.hidden||!['laser','spotlight'].includes(tool)){hidePointer();return;}if(!pick(e.target))return;const dot=$('teaching-pointer');dot.hidden=false;dot.className=tool;dot.style.left=e.clientX+'px';dot.style.top=e.clientY+'px';
  },{capture:true,passive:false});
  document.addEventListener('pointerup',e=>{if(drawing&&e.pointerId===drawing.pointerId){e.preventDefault();e.stopImmediatePropagation();if(drawing.kind==='new')addPoints(e);finish();}},true);
  document.addEventListener('pointercancel',e=>{if(drawing&&e.pointerId===drawing.pointerId)finish(false);},true);
  document.addEventListener('click',e=>{if(Date.now()<ignoreClickUntil&&pick(e.target)){e.preventDefault();e.stopImmediatePropagation();}},true);
  document.addEventListener('click',e=>{const b=e.target.closest?.('[data-ink-tool],[data-ink-toggle]');if(!b)return;if(b.hasAttribute('data-ink-tool')){setTool(b.dataset.inkTool);if(more.open)more.close();}else{toolbar.hidden=!toolbar.hidden;if(toolbar.hidden)tool='move';mount();}});
  function show(d){finish();lastFocus=document.activeElement;d.showModal();}
  for(const d of [gallery,settings,more,textDialog])d.addEventListener('close',()=>{lastFocus?.isConnected&&lastFocus.focus({preventScroll:true});});
  $('ink-shapes').onclick=()=>show(gallery);$('ink-settings').onclick=()=>{syncSettings();show(settings);};$('ink-more').onclick=()=>show(more);
  const groups=$('ink-gallery-groups');for(const category of [...new Set(shapes.map(s=>s[2]))]){const section=document.createElement('section');section.innerHTML='<h3>'+category+'</h3><div class="ink-v3-shape-grid"></div>';for(const [id,label,cat] of shapes.filter(s=>s[2]===category)){const b=document.createElement('button');b.type='button';b.dataset.shape=id;b.setAttribute('aria-label',label);const pic=svg('svg',{viewBox:'0 0 110 88','aria-hidden':'true'});let previewPoints=[[16,15],[94,72]];if(['circle','square','sphere','cube','pentagon','hexagon'].includes(id))previewPoints=[[24,12],[88,76]];if(id==='equilateral')previewPoints=[[19,12],[91,12+72*Math.sqrt(3)/2]];pic.append(strokeNode({tool:id,color:'#287c78',width:1.8,hidden:true,labels:false},previewPoints,true));const t=document.createElement('span');t.textContent=label;b.append(pic,t);b.onclick=()=>{lastShape=id;setTool(id);gallery.close();};section.lastElementChild.append(b);}groups.append(section);}
  $('ink-color').addEventListener('input',e=>{color=e.target.value;});$('ink-color').addEventListener('change',()=>{changeSelected(s=>s.color=color);prefs();});
  $('ink-width').onchange=e=>{width=Number(e.target.value);changeSelected(s=>s.width=width);prefs();};$('ink-dash').onchange=e=>{dash=e.target.value;changeSelected(s=>{s.dash=dash;if(dash!=='solid')delete s.pressures;});prefs();};
  for(const [id,prop] of [['ink-labels','labels'],['ink-hidden','hidden'],['ink-filled','filled']])$(id).onchange=e=>{const v=e.target.checked;if(prop==='labels')labels=v;if(prop==='hidden')hidden=v;if(prop==='filled')filled=v;changeSelected(s=>s[prop]=v);prefs();};
  $('ink-pen-only').onchange=e=>{penOnly=e.target.checked;prefs();updateButtons();};$('ink-pressure').onchange=e=>{pressure=e.target.checked;prefs();};$('ink-snap').onchange=e=>{snap=e.target.checked;prefs();};$('ink-background').onchange=e=>{bg=e.target.value;syncSettings();prefs();};
  $('ink-undo').onclick=()=>undo();$('ink-redo').onclick=()=>undo(true);
  function removeSelected(){if(!selected())return;remember(getContext());store.active().ink[getContext()]=strokes(getContext()).filter(s=>s.id!==selection.id);selection=null;saved();redraw();updateButtons();}
  function duplicate(){const s=selected();if(!s||strokes(getContext()).length>=300)return;const r=records.find(r=>r.zone===s.zone),g=geometry(r),cp=copy(s),pts=renderedPoints(s,g),box=bounds(s,pts),dx=Math.min(24,g.width-box.x-box.w),dy=Math.min(24,g.height-box.y-box.h);cp.id=uid();cp.points=pts.map(p=>normalize([p[0]+dx,p[1]+dy],r,cp));remember(getContext());strokes(getContext()).push(cp);choose(cp,r);saved();redraw();}
  $('ink-delete').onclick=removeSelected;$('ink-duplicate').onclick=duplicate;$('ink-rotate-reset').onclick=()=>changeSelected(s=>s.rotation=0);$('ink-rename').onclick=()=>{const s=selected();if(s)openText({stroke:s,r:records.find(r=>r.zone===s.zone)});};
  $('ink-clear').onclick=()=>{finish();const c=getContext();if(strokes(c).length){remember(c);store.active().ink[c]=[];selection=null;saved();redraw();updateButtons();}more.close();};
  function openBoard(){if(board.open)return;finish();boardPrev={tool,hidden:toolbar.hidden};board.showModal();$('ink-board-title').textContent='Bảng trắng · '+store.active().name;toolbar.hidden=false;tool='pen';mount();}
  $('ink-board-open').onclick=openBoard;board.addEventListener('close',()=>{finish();toolbar.hidden=boardPrev?.hidden??true;tool=boardPrev?.tool||'move';boardPrev=null;mount();});
  const homeButton=document.createElement('button');homeButton.type='button';homeButton.id='ink-home-board';homeButton.className='ink-v3-home-button';homeButton.innerHTML=icon(icons.board)+'<span><strong>Mở bảng trắng</strong><small>Bút viết · 27 hình học · Bảng ô vuông</small></span><b>↗</b>';homeButton.onclick=openBoard;document.querySelector('.home-help')?.before(homeButton);
  $('ink-export').onclick=()=>{
    finish();const r=records.find(r=>r.full);if(!r)return;const g=geometry(r),out=svg('svg',{xmlns:NS,viewBox:'0 0 '+g.width+' '+g.height,width:g.width,height:g.height});out.append(svg('rect',{width:'100%',height:'100%',fill:'white'}));const title=svg('title');title.textContent='Hình vẽ Toán THPT';out.append(title);
    for(const sr of records){const sg=geometry(sr);const group=svg('g',{transform:'translate('+(sg.left-g.left)+' '+(sg.top-g.top)+')'});for(const s of strokes(sr.context).filter(s=>s.zone===sr.zone))group.append(strokeNode(s,renderedPoints(s,sg)));out.append(group);}
    const blob=new Blob([new XMLSerializer().serializeToString(out)],{type:'image/svg+xml;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='Hinh_ve_Toan_THPT.svg';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);more.close();
  };
  document.addEventListener('keydown',e=>{
    if(toolbar.hidden)return;const editing=e.target.closest?.('input,textarea,select,[contenteditable="true"]'),dialogOpen=[gallery,settings,more,textDialog].some(d=>d.open);
    if(dialogOpen){e.stopPropagation();if(e.key==='Escape'){e.preventDefault();[gallery,settings,more,textDialog].filter(d=>d.open).at(-1)?.close();}return;}
    if(editing)return;const mod=e.ctrlKey||e.metaKey,k=e.key.toLowerCase();
    if(e.key==='Escape'&&(drawing||tool!=='move'||board.open)){e.preventDefault();e.stopImmediatePropagation();if(drawing)finish(false);else if(tool!=='move')setTool('move');else board.close();return;}
    let handled=true;if(mod&&k==='z')undo(e.shiftKey);else if(mod&&k==='y')undo(true);else if(mod&&k==='d'&&selected())duplicate();else if((e.key==='Delete'||e.key==='Backspace')&&selected())removeSelected();else if(!mod&&!e.altKey&&['b','e','v'].includes(k))setTool({b:'pen',e:'eraser',v:'select'}[k]);else handled=false;
    if(handled){e.preventDefault();e.stopImmediatePropagation();}else if(board.open)e.stopImmediatePropagation();
  },true);
  window.addEventListener('resize',schedule);window.addEventListener('blur',()=>{finish();hidePointer();});document.addEventListener('pointerout',e=>{if(!e.relatedTarget)hidePointer();});
  return {mount,redraw:schedule,reset(){finish();if(board.open)board.close();toolbar.hidden=true;tool='move';selection=null;mount();},hidePointer,setTool};
}
