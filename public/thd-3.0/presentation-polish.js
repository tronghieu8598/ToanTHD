(()=>{
  'use strict';
  const layer=document.getElementById('modal-layer');
  const header=layer.querySelector('.q-header');
  const settings=document.getElementById('q-settings');
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let idleTimer=0,wasPresenting=false;
  function wake(){
    clearTimeout(idleTimer);
    layer.classList.remove('controls-idle');
    if(layer.hidden||!layer.classList.contains('is-presenting')||reduced.matches)return;
    idleTimer=setTimeout(()=>{
      if(!layer.hidden&&layer.classList.contains('is-presenting')&&settings.hidden&&!header.matches(':hover')&&!header.querySelector(':focus-visible'))layer.classList.add('controls-idle');
    },3800);
  }
  new MutationObserver(()=>{
    const presenting=layer.classList.contains('is-presenting');
    if(presenting!==wasPresenting){wasPresenting=presenting;wake();}
  }).observe(layer,{attributes:true,attributeFilter:['class']});
  layer.addEventListener('pointermove',wake,{passive:true});
  layer.addEventListener('pointerdown',wake,{passive:true});
  layer.addEventListener('focusin',wake);
  settings.addEventListener('focusout',wake);
  reduced.addEventListener?.('change',wake);

  document.addEventListener('keydown',event=>{
    if(document.getElementById('ed-dialog')?.open)return;
    if(layer.hidden)return;
    wake();
    const path=event.composedPath?event.composedPath():[event.target];
    if(event.repeat||event.ctrlKey||event.altKey||event.metaKey||event.isComposing||
       path.some(el=>el?.id==='__thd_mini_host'||el?.isContentEditable||/^(INPUT|TEXTAREA|SELECT)$/.test(el?.tagName||''))||
       !document.getElementById('figure-layer').hidden)return;
    let control=null;
    if(/^[1-4]$/.test(event.key))control=document.querySelector('#answer-controls [data-choice="'+(Number(event.key)-1)+'"]');
    else if(event.key.toLowerCase()==='c')control=document.getElementById('q-publish');
    else if(event.key.toLowerCase()==='l')control=document.getElementById('q-reveal');
    if(!control||control.disabled)return;
    event.preventDefault();event.stopImmediatePropagation();control.click();
  },true);
})();
