import welcomeCss from './styles/FirstVisitWelcomeStarryNight.css?inline';

const WELCOME_SEEN_KEY = 'bes-first-visit-welcome-v1';
const WELCOME_VERSION = '1';
const WELCOME_ROOT_ID = 'brian-first-visit-welcome';
const WELCOME_PREVIEW_PARAM = 'welcome';
const WELCOME_MOTION_PARAM = 'motion';
const SHELL_WAIT_MS = 20000;
const DISMISS_MS = 740;
let activeCleanup = null;

function params() {
  try { return new URLSearchParams(window.location.search || ''); }
  catch { return new URLSearchParams(); }
}
function isPreview() { return params().get(WELCOME_PREVIEW_PARAM) === 'preview'; }
function isFullMotion() { return params().get(WELCOME_MOTION_PARAM) === 'full'; }
function hasSeenWelcome() {
  if (isPreview()) return false;
  try { return localStorage.getItem(WELCOME_SEEN_KEY) === WELCOME_VERSION; }
  catch { return false; }
}
function markSeen() {
  if (isPreview()) return;
  try { localStorage.setItem(WELCOME_SEEN_KEY, WELCOME_VERSION); } catch {}
}
function isProtectedEntryRoute() {
  const href = String(window.location.href || '');
  const hash = String(window.location.hash || '').toLowerCase();
  return /type=recovery|recovery=1/i.test(href)
    || /^#\/(?:login|register|setup)(?:[/?#]|$)/i.test(hash)
    || /(?:^|[?&])recovery(?:=|&|$)/i.test(hash);
}
function escapeStyleText(value) {
  return String(value || '').replace(/<\/style/gi, '<\\/style');
}

function welcomeMarkup() {
  return `
<section class="welcome-stage" id="welcomeStage" role="dialog" aria-modal="true" aria-labelledby="welcomeTitle" aria-describedby="welcomeSubtitle" tabindex="-1">
  <div class="painting-layer" id="paintingLayer" aria-hidden="true"></div>
  <div class="glow-wash" aria-hidden="true"></div>
  <div class="brush-shimmer" aria-hidden="true"></div>
  <canvas id="starFx" aria-hidden="true"></canvas>
  <div id="transitionFx" class="transition-fx" aria-hidden="true"></div>
  <div class="transition-label" id="transitionLabel" aria-live="polite"></div>
  <div class="stage-vignette" aria-hidden="true"></div>

  <header class="topbar">
    <div class="brand" aria-label="Brian English">
      <span class="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 64 64" fill="none"><path d="M38 10c-10 2-17 10-17 20 0 12 10 21 22 20-6 5-16 6-24 1C6 43 5 25 15 15c6-6 15-8 23-5Z" fill="#FFD75D"/><path d="M45 13l2.5 6.1 6.5.5-5 4.2 1.5 6.2-5.5-3.4-5.5 3.4 1.5-6.2-5-4.2 6.5-.5L45 13Z" fill="#FFE582"/></svg>
      </span>
      <span class="brand__name">Brian English</span>
    </div>
    <button class="skip-button" id="skipWelcome" type="button"><span class="label">Bỏ qua</span><span class="x" aria-hidden="true">×</span></button>
  </header>

  <main class="hero-panel">
    <h1 class="hero-title" id="welcomeTitle">Chạm vào<br>bầu trời sao</h1>
    <p class="hero-subtitle" id="welcomeSubtitle">Bắt đầu một hành trình học tập đầy cảm hứng.</p>
    <div class="hero-divider" aria-hidden="true"></div>
    <div class="hero-actions">
      <button class="cta cta-primary" id="startJourney" type="button">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3v5M12 16v5M3 12h5M16 12h5M6.5 6.5l2.3 2.3M15.2 15.2l2.3 2.3M17.5 6.5l-2.3 2.3M8.8 15.2l-2.3 2.3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        Bắt đầu
      </button>
      <button class="cta cta-secondary" id="exploreWelcome" type="button" aria-haspopup="dialog" aria-expanded="false" aria-controls="paintingInfoPanel">
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 5.8A2.8 2.8 0 0 1 7.8 3H19v15H7.8A2.8 2.8 0 0 0 5 20.8V5.8Z" stroke="currentColor" stroke-width="1.6"/><path d="M5 6v14.8M9 7h6M9 10.5h6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>
        <span class="learn-more-copy"><strong>Xem thêm</strong><small>Learn more</small></span>
      </button>
    </div>
  </main>

  <div class="painting-info-backdrop" id="paintingInfoBackdrop" hidden aria-hidden="true"></div>
  <aside class="painting-info-panel" id="paintingInfoPanel" role="dialog" aria-modal="true" aria-labelledby="paintingInfoTitle" aria-describedby="paintingInfoIntro" hidden tabindex="-1">
    <div class="painting-info-glow" aria-hidden="true"></div>
    <header class="painting-info-header">
      <div><p class="painting-info-kicker">ARTWORK · TÁC PHẨM</p><h2 id="paintingInfoTitle">The Starry Night <span>/ Đêm đầy sao</span></h2><p class="painting-info-author">Vincent van Gogh · 1889</p></div>
      <button class="painting-info-close" id="closePaintingInfo" type="button" aria-label="Đóng thông tin / Close information"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="m7 7 10 10M17 7 7 17" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
    </header>
    <div class="painting-info-scroll">
      <p class="painting-info-intro" id="paintingInfoIntro"><span lang="vi">Một trong những hình ảnh nổi tiếng nhất của nghệ thuật hiện đại, nơi quan sát thực tế hòa vào ký ức, cảm xúc và nhịp điệu của nét cọ.</span><span lang="en">One of modern art's most recognizable images, where observed landscape is transformed through memory, emotion, and the rhythm of paint.</span></p>
      <dl class="painting-meta">
        <div><dt>Nghệ sĩ <small>Artist</small></dt><dd>Vincent van Gogh</dd></div><div><dt>Năm <small>Year</small></dt><dd>1889</dd></div>
        <div><dt>Nơi sáng tác <small>Place</small></dt><dd>Saint-Rémy-de-Provence, France</dd></div><div><dt>Chất liệu <small>Medium</small></dt><dd>Oil on canvas · Sơn dầu trên toan</dd></div>
        <div><dt>Kích thước <small>Dimensions</small></dt><dd>73.7 × 92.1 cm</dd></div><div><dt>Hiện lưu giữ <small>Collection</small></dt><dd>Museum of Modern Art (MoMA), New York</dd></div>
      </dl>
      <div class="painting-story-grid">
        <article class="painting-story"><span class="story-index">01</span><h3>Hoàn cảnh sáng tác <small>Context</small></h3><p lang="vi">Van Gogh vẽ <em>The Starry Night</em> vào tháng 6 năm 1889 khi đang ở Saint-Paul-de-Mausole tại Saint-Rémy. Cảnh quan gợi từ những gì ông có thể quan sát quanh nơi ở, nhưng ngôi làng và bầu trời đã được tái cấu trúc bằng ký ức và tưởng tượng.</p><p lang="en">Van Gogh painted <em>The Starry Night</em> in June 1889 while staying at Saint-Paul-de-Mausole in Saint-Rémy. The landscape draws on what he could observe around him, while the village and sky are reshaped through memory and imagination.</p></article>
        <article class="painting-story"><span class="story-index">02</span><h3>Bầu trời xoáy <small>Swirling sky</small></h3><p lang="vi">Các dải xanh, trắng và vàng uốn thành những dòng chuyển động lớn. Nhịp nét cọ biến không khí thành một trường năng lượng liên tục.</p><p lang="en">Bands of blue, white, and yellow curve into large currents of motion. The brushwork turns the atmosphere into a continuous field of energy.</p></article>
        <article class="painting-story"><span class="story-index">03</span><h3>Cây bách <small>The cypress</small></h3><p lang="vi">Khối cây bách tối ở tiền cảnh tạo đối trọng thẳng đứng cho bầu trời xoáy và nối thị giác giữa mặt đất, ngôi làng và vùng trời rực sáng.</p><p lang="en">The dark cypress provides a vertical counterweight to the swirling sky and visually links earth, village, and luminous heavens.</p></article>
        <article class="painting-story"><span class="story-index">04</span><h3>Ngôi làng tĩnh lặng <small>The quiet village</small></h3><p lang="vi">Những mái nhà thấp và tháp nhà thờ tạo một vùng yên tĩnh phía dưới, khiến chuyển động của bầu trời càng nổi bật.</p><p lang="en">Low rooftops and the church spire form a quiet zone below, making the energetic sky feel even more pronounced.</p></article>
        <article class="painting-story"><span class="story-index">05</span><h3>Màu sắc &amp; nét cọ <small>Colour &amp; brushwork</small></h3><p lang="vi">Xanh lam và cobalt chiếm phần lớn bề mặt; vàng và kem tạo các điểm sáng. Nét sơn ngắn, dày và có hướng tạo cấu trúc cùng nhịp điệu.</p><p lang="en">Blue and cobalt dominate the surface; yellow and cream create concentrated light. Short, directional strokes give the painting texture and rhythm.</p></article>
        <article class="painting-story painting-story-fact"><span class="story-index">✦</span><h3>Bạn có biết? <small>Did you know?</small></h3><p lang="vi">Tác phẩm vào bộ sưu tập Museum of Modern Art tại New York năm 1941 qua di tặng Lillie P. Bliss và ngày nay là một trong những tác phẩm được nhận diện rộng rãi nhất của Van Gogh.</p><p lang="en">The painting entered the Museum of Modern Art's collection in 1941 through the Lillie P. Bliss Bequest and is now among Van Gogh's most widely recognized works.</p></article>
      </div>
    </div>
  </aside>
  <span class="starburst one" aria-hidden="true">✦</span><span class="starburst two" aria-hidden="true">✦</span><span class="starburst three" aria-hidden="true">✦</span>
</section>`;
}

function frameDocument() {
  return `<!doctype html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><style>${escapeStyleText(welcomeCss)}</style></head><body>${welcomeMarkup()}</body></html>`;
}
function styleFrame(frame) {
  const set = (k,v) => frame.style.setProperty(k,v,'important');
  [['position','fixed'],['inset','0'],['width','100vw'],['height','100dvh'],['border','0'],['margin','0'],['padding','0'],['background','#020817'],['z-index','2147483000'],['display','block'],['opacity','1'],['visibility','visible'],['pointer-events','auto']].forEach(([k,v])=>set(k,v));
}

function mountWelcome() {
  if (hasSeenWelcome() || isProtectedEntryRoute() || document.getElementById(WELCOME_ROOT_ID) || !document.body) return;
  const previewMode = isPreview();
  const forceFullMotion = isFullMotion();
  const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
  const previousOverflow = document.body.style.overflow;
  const frame = document.createElement('iframe');
  frame.id = WELCOME_ROOT_ID;
  frame.title = 'Chào mừng đến với Brian English';
  frame.setAttribute('aria-label','Chào mừng đến với Brian English');
  frame.setAttribute('sandbox', 'allow-same-origin');
  frame.srcdoc = frameDocument();
  styleFrame(frame);

  let win, doc, stage, painting, skip, start, explore, infoPanel, infoBackdrop, closeInfo, canvas, ctx, label;
  let initialized=false, closing=false, infoOpen=false, infoPreviousFocus=null, reducedMotion=false, motionEnabled=true;
  let raf=0, resizeObserver=null, cleanupTimer=0, transitionTimer=0, startTransitionIndex=0;
  let width=1,height=1,dpr=1,last=performance.now(),stars=[];
  const pointer={x:0,y:0,tx:0,ty:0,vx:0,vy:0};
  const orbMap=[[.77,.14,68],[.06,.08,27],[.16,.05,21],[.51,.11,31],[.66,.29,20],[.25,.43,18],[.03,.56,14],[.08,.60,16],[.26,.18,16]];
  const transitionTypes=['star-dive','living-brush','galaxy-portal'];
  const transitionLabels={'star-dive':'01 · Star Dive','living-brush':'02 · Living Brush','galaxy-portal':'03 · Galaxy Portal'};

  function focusables(scope){return [...scope.querySelectorAll('button:not([disabled]),a[href],[tabindex]:not([tabindex="-1"])')].filter(el=>!el.hidden&&el.getClientRects().length);}
  function trapFocus(event){if(event.key!=='Tab')return;const items=focusables(infoOpen?infoPanel:stage);if(!items.length)return;const first=items[0],lastItem=items.at(-1),active=doc.activeElement;if(event.shiftKey&&active===first){event.preventDefault();lastItem.focus();}else if(!event.shiftKey&&active===lastItem){event.preventDefault();first.focus();}}
  function openPaintingInfo(){if(infoOpen||closing)return;infoOpen=true;infoPreviousFocus=doc.activeElement;infoPanel.hidden=false;infoBackdrop.hidden=false;infoBackdrop.setAttribute('aria-hidden','false');explore.setAttribute('aria-expanded','true');stage.classList.add('info-open');win.requestAnimationFrame(()=>{infoPanel.classList.add('is-open');infoBackdrop.classList.add('is-open');closeInfo.focus({preventScroll:true});});}
  function closePaintingInfo(){if(!infoOpen)return;infoOpen=false;explore.setAttribute('aria-expanded','false');infoPanel.classList.remove('is-open');infoBackdrop.classList.remove('is-open');infoBackdrop.setAttribute('aria-hidden','true');stage.classList.remove('info-open');win.setTimeout(()=>{if(!infoOpen){infoPanel.hidden=true;infoBackdrop.hidden=true;}},430);win.setTimeout(()=>((infoPreviousFocus?.isConnected?infoPreviousFocus:explore)?.focus({preventScroll:true})),30);}
  function resize(){const r=stage.getBoundingClientRect();width=Math.max(1,Math.round(r.width));height=Math.max(1,Math.round(r.height));dpr=Math.min(win.devicePixelRatio||1,1.35);canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);canvas.style.width=width+'px';canvas.style.height=height+'px';ctx.setTransform(dpr,0,0,dpr,0,0);stars=Array.from({length:84},()=>({x:Math.random()*width,y:Math.random()*height*.66,r:.45+Math.random()*1.3,a:.05+Math.random()*.20,p:Math.random()*Math.PI*2,s:.25+Math.random()*.85}));}
  function animate(now){const dt=Math.min((now-last)/1000,.035);last=now;if(!document.hidden&&!closing){if(motionEnabled){const ax=(pointer.tx-pointer.x)*8.2-pointer.vx*6.7,ay=(pointer.ty-pointer.y)*8.2-pointer.vy*6.7;pointer.vx+=ax*dt;pointer.vy+=ay*dt;pointer.x+=pointer.vx*dt;pointer.y+=pointer.vy*dt;}painting.style.setProperty('--bg-x',(pointer.x*15).toFixed(2)+'px');painting.style.setProperty('--bg-y',(pointer.y*10).toFixed(2)+'px');ctx.clearRect(0,0,width,height);ctx.save();ctx.globalCompositeOperation='screen';for(const s of stars){const pulse=.55+Math.sin((motionEnabled?now:0)*.001*s.s+s.p)*.45;ctx.fillStyle=`rgba(255,236,180,${s.a*pulse})`;ctx.beginPath();ctx.arc(s.x+pointer.x*3,s.y+pointer.y*1.6,s.r,0,Math.PI*2);ctx.fill();}orbMap.forEach((o,i)=>{const x=o[0]*width+pointer.x*6,y=o[1]*height+pointer.y*3,r=o[2];const g=ctx.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,`rgba(255,222,123,${i===0?.12:.085})`);g.addColorStop(.35,'rgba(121,184,255,.045)');g.addColorStop(1,'rgba(0,0,0,0)');ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();});ctx.restore();}raf=win.requestAnimationFrame(animate);}
  function resetTransition(type){stage.classList.remove('is-transitioning','transition-'+type);label.classList.remove('is-visible');start.disabled=false;start.removeAttribute('aria-busy');}
  function finishTransition(type){dismissWelcome('start:'+type,{persist:!previewMode,immediate:true});}
  function runStartTransition(){if(closing||infoOpen||start.disabled)return;const type=transitionTypes[startTransitionIndex%transitionTypes.length];startTransitionIndex=(startTransitionIndex+1)%transitionTypes.length;start.disabled=true;start.setAttribute('aria-busy','true');label.textContent=transitionLabels[type];label.classList.add('is-visible');stage.classList.add('is-transitioning','transition-'+type);const duration=motionEnabled?(type==='living-brush'?2080:type==='galaxy-portal'?2000:1920):420;transitionTimer=win.setTimeout(()=>finishTransition(type),duration+80);}
  function onKeyDown(event){if(event.key==='Escape'){event.preventDefault();if(infoOpen) closePaintingInfo();else dismissWelcome('escape');return;}trapFocus(event);}
  function onStorage(event){if(event.key===WELCOME_SEEN_KEY&&event.newValue===WELCOME_VERSION&&!previewMode)dismissWelcome('storage',{persist:false,immediate:true});}
  function cleanup(){if(cleanupTimer)window.clearTimeout(cleanupTimer);if(transitionTimer&&win)win.clearTimeout(transitionTimer);if(raf&&win)win.cancelAnimationFrame(raf);resizeObserver?.disconnect();window.removeEventListener('storage',onStorage);doc?.removeEventListener('keydown',onKeyDown);frame.remove();document.body.style.overflow=previousOverflow;if(previousFocus?.isConnected)previousFocus.focus({preventScroll:true});if(activeCleanup===cleanup)activeCleanup=null;}
  function dismissWelcome(reason,options={}){if(closing)return;closing=true;const {persist=true,immediate=false}=options;if(persist)markSeen();if(infoOpen) closePaintingInfo();if(!immediate)stage.classList.add('is-leaving');window.dispatchEvent(new CustomEvent('bes-first-visit-welcome-dismissed',{detail:{reason,isolated:true,scene:'starry-night'}}));cleanupTimer=window.setTimeout(cleanup,immediate?0:DISMISS_MS);}
  function init(){if(initialized)return;win=frame.contentWindow;doc=frame.contentDocument;if(!win||!doc){cleanup();return;}stage=doc.getElementById('welcomeStage');painting=doc.getElementById('paintingLayer');skip=doc.getElementById('skipWelcome');start=doc.getElementById('startJourney');explore=doc.getElementById('exploreWelcome');infoPanel=doc.getElementById('paintingInfoPanel');infoBackdrop=doc.getElementById('paintingInfoBackdrop');closeInfo=doc.getElementById('closePaintingInfo');canvas=doc.getElementById('starFx');label=doc.getElementById('transitionLabel');if(!stage||!painting||!skip||!start||!explore||!infoPanel||!infoBackdrop||!closeInfo||!canvas||!label){cleanup();return;}ctx=canvas.getContext('2d');reducedMotion=Boolean(win.matchMedia?.('(prefers-reduced-motion: reduce)').matches);motionEnabled=forceFullMotion||!reducedMotion;initialized=true;skip.addEventListener('click',()=>dismissWelcome('skip'));start.addEventListener('click',runStartTransition);explore.addEventListener('click',openPaintingInfo);closeInfo.addEventListener('click',closePaintingInfo);infoBackdrop.addEventListener('click',closePaintingInfo);stage.addEventListener('pointermove',event=>{if(!motionEnabled)return;const r=stage.getBoundingClientRect();pointer.tx=((event.clientX-r.left)/r.width-.5)*2;pointer.ty=((event.clientY-r.top)/r.height-.5)*2;});stage.addEventListener('pointerleave',()=>{pointer.tx=0;pointer.ty=0;});doc.addEventListener('keydown',onKeyDown);window.addEventListener('storage',onStorage);if(win.ResizeObserver){resizeObserver=new win.ResizeObserver(resize);resizeObserver.observe(stage);}resize();raf=win.requestAnimationFrame(animate);win.focus();win.setTimeout(()=>start.focus({preventScroll:true}),60);window.dispatchEvent(new CustomEvent('bes-first-visit-welcome-shown',{detail:{isolated:true,scene:'starry-night',motion:forceFullMotion?'full':(reducedMotion?'reduced':'auto')}}));}

  frame.addEventListener('load',init,{once:true});
  document.body.style.overflow='hidden';
  document.body.appendChild(frame);
  activeCleanup=cleanup;
}

function waitForApplicationShell(){const startedAt=Date.now();const tick=()=>{if(hasSeenWelcome()||isProtectedEntryRoute()||document.getElementById(WELCOME_ROOT_ID))return;if(document.querySelector('#root .app-shell')){window.setTimeout(mountWelcome,180);return;}if(Date.now()-startedAt<SHELL_WAIT_MS)window.setTimeout(tick,180);};tick();}
export function installFirstVisitWelcome(){if(typeof window==='undefined'||typeof document==='undefined')return;if(activeCleanup||document.getElementById(WELCOME_ROOT_ID))return;if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',waitForApplicationShell,{once:true});else waitForApplicationShell();}
