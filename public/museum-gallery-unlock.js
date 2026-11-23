/* Brian Museum Lab immersive gallery entry. Never runs on the Brianverse website. */
(() => {
  'use strict';
  const host=window.location.hostname.toLowerCase();
  const museumHost=/^brian-museum(?:-lab)?(?:-[a-z0-9-]+)?\.vercel\.app$/.test(host);
  const preview=new URLSearchParams(location.search).get('museumIntro')==='preview';
  const disabled=new URLSearchParams(location.search).get('museumIntro')==='off';
  if(disabled || (!museumHost && !(preview && ['localhost','127.0.0.1'].includes(host))))return;

  const isGallery=()=>/^#\/tool\/immersive-gallery(?:[/?]|$)/i.test(location.hash);
  let shown=false,active=null;
  const drum=()=>{
    const rays=Array.from({length:32},(_,i)=>{
      const a=i*360/32;
      return '<path d="M 0 -84 L -5 -99 L 5 -99 Z" transform="rotate('+a+')" fill="#f4d69d" opacity=".65"/>';
    }).join('');
    return '<svg class="mg-drum" viewBox="-200 -200 400 400" aria-hidden="true" xmlns="http://www.w3.org/2000/svg"><g fill="none" stroke="#f6dca6" stroke-width="1.35"><circle r="182"/><circle r="174"/><circle r="160"/><circle r="147"/><circle r="130"/><circle r="118"/><circle r="103"/><circle r="70"/><circle r="50"/><circle r="18"/></g><g>'+rays+'</g><path d="M 0 -44 L 9 -14 L 43 -14 L 16 6 L 26 38 L 0 18 L -26 38 L -16 6 L -43 -14 L -9 -14 Z" fill="#f4d69d" opacity=".64"/></svg>';
  };

  const preloadStyle=()=>{
    if(document.getElementById('museum-gallery-unlock-styles'))return;
    const l=document.createElement('link');
    l.id='museum-gallery-unlock-styles';l.rel='stylesheet';l.href='/museum-gallery-unlock.css?v=1';
    document.head.appendChild(l);
  };

  function mount(){
    if(shown || !isGallery() || !document.body || document.getElementById('museum-gallery-unlock')) return;
    shown=true;
    preloadStyle();
    const app=document.getElementById('root');
    const wasInert=app?app.inert:false;
    const focused=document.activeElement;
    if(app)app.inert=true;
    const el=document.createElement('section');
    el.id='museum-gallery-unlock';
    el.tabIndex=-1;
    el.setAttribute('role','dialog');
    el.setAttribute('aria-modal','true');
    el.setAttribute('aria-label','Mở cửa phòng triển lãm Brian Museum Lab');
    el.innerHTML=[
      '<div class="mg-scene" aria-hidden="true"></div>',
      '<div class="mg-red" aria-hidden="true"></div>',
      drum(),
      '<div class="mg-watermark" aria-hidden="true">B</div>',
      '<svg class="mg-glyph" viewBox="0 0 120 120" aria-hidden="true"><polygon points="60,17 72,47 104,47 78,66 88,99 60,79 32,99 42,66 16,47 48,47" fill="#ffe060"/></svg>',
      '<div class="mg-grid">',
      '  <header class="mg-header"><div class="mg-identity"><img class="mg-logo" src="/brian-english-brand-mark.png" alt="" width="38" height="38"><span>BRIAN MUSEUM LAB</span></div><span class="mg-edition">VIỆT NAM<br>IMMERSIVE GALLERY / 01</span></header>',
      '  <main class="mg-heading"><div class="mg-kicker">KHÔNG GIAN TRIỂN LÃM</div><h1><span>MUSEUM</span><span class="mg-accent">LAB.</span></h1><p class="mg-sub">Một hành trình khám phá qua hình ảnh, âm thanh và những ý tưởng sáng tạo.</p></main>',
      '  <footer class="mg-footer"><span class="mg-footnote">HẠ LONG / VIỆT NAM <span aria-hidden="true">·</span> BRIAN MUSEUM LAB</span><div class="mg-gesture"><button class="mg-enter" type="button"><span class="mg-up" aria-hidden="true">↑</span><span>Vuốt lên để vào triển lãm</span></button><button class="mg-skip" type="button">Bỏ qua</button></div></footer>',
      '</div><div class="mg-drag-hint" aria-hidden="true"></div>'
    ].join('');
    document.body.appendChild(el);
    active=el;
    el.focus({preventScroll:true});

    let finished=false,pointer=null,lastY=0,raf=0,cleanupTimer=0,wheel=0,wheelTime=0;
    const reduced=!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    const paint=()=>{
      raf=0;
      if(finished || !el.isConnected)return;
      const delta=Math.max(0,Math.min(155,pointer?pointer.start-lastY:0));
      el.style.transform='translate3d(0,'+(-delta)+'px,0)';
      el.style.setProperty('--mg-progress',String(Math.min(1,delta/100)));
    };
    function cleanup(){
      window.clearTimeout(cleanupTimer);
      if(raf)cancelAnimationFrame(raf);
      document.removeEventListener('keydown',onKey,true);
      window.removeEventListener('hashchange',onRoute);
      el.remove();
      active=null;
      if(app)app.inert=wasInert;
      if(focused?.isConnected && focused !== document.body)focused.focus?.({preventScroll:true});
      if(preview){
        const replay=document.createElement('button');
        replay.id='museum-gallery-replay';
        replay.type='button';
        replay.textContent='↻ Xem lại mở khóa';
        replay.style.cssText='position:fixed;right:16px;bottom:16px;z-index:2147483400;padding:11px 15px;background:#082f41;color:#fff;border:1px solid #d9c49b;font:700 12px Arial;cursor:pointer';
        replay.addEventListener('click',()=>{replay.remove();shown=false;mount()},{once:true});
        document.body.appendChild(replay);
      }
    }
    function unlock(){
      if(finished)return;
      finished=true;pointer=null;
      if(raf)cancelAnimationFrame(raf);
      el.classList.remove('mg-dragging');
      el.style.transform='';
      el.style.removeProperty('--mg-progress');
      // Force one style/layout checkpoint so release animation starts from current swipe position.
      void el.offsetHeight;
      el.classList.add('mg-unlocking');
      cleanupTimer=setTimeout(cleanup,reduced?30:740);
    }
    function onKey(e){
      if(finished||e.altKey||e.ctrlKey||e.metaKey)return;
      if(['Escape','Enter',' ','ArrowUp'].includes(e.key)){e.preventDefault();unlock();}
    }
    function onRoute(){if(!isGallery())unlock();}
    document.addEventListener('keydown',onKey,true);
    window.addEventListener('hashchange',onRoute);
    el.querySelector('.mg-enter').addEventListener('click',unlock);
    el.querySelector('.mg-skip').addEventListener('click',unlock);
    el.addEventListener('pointerdown',e=>{
      if(finished||e.button!==0)return;
      pointer={id:e.pointerId,start:e.clientY};
      lastY=e.clientY;
      el.classList.add('mg-dragging');
    });
    el.addEventListener('pointermove',e=>{
      if(finished||!pointer||e.pointerId!==pointer.id)return;
      lastY=e.clientY;
      if(!raf)raf=requestAnimationFrame(paint);
    });
    el.addEventListener('pointerup',e=>{
      if(!pointer||pointer.id!==e.pointerId)return;
      const delta=pointer.start-e.clientY;
      pointer=null;
      el.classList.remove('mg-dragging');
      if(delta>70)unlock();
      else{el.style.transform='';el.style.setProperty('--mg-progress','0');}
    });
    el.addEventListener('pointercancel',()=>{
      pointer=null;el.classList.remove('mg-dragging');el.style.transform='';el.style.setProperty('--mg-progress','0');
    });
    el.addEventListener('wheel',e=>{
      if(finished||e.deltaY<=0)return;
      const now=performance.now();
      if(now-wheelTime>550)wheel=0;
      wheelTime=now;wheel+=e.deltaY;
      if(wheel>80)unlock();
    },{passive:true});
  }

  function ready(){
    if(isGallery())mount();
    window.addEventListener('hashchange',()=>{if(isGallery())mount()});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});
  else ready();
})();