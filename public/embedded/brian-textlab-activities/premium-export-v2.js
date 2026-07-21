/* TextLab premium single-file exporter: branded UI, effects, sound and accessibility controls */
(() => {
  "use strict";

  const button = document.querySelector("#btnDownload");
  if (!button) return;

  const escapeInlineScript = (source) => String(source).replace(/<\/script/gi, "<\\/script");
  const escapeInlineStyle = (source) => String(source).replace(/<\/style/gi, "<\\/style");
  const escapeHtml = (value) => String(value || "").replace(/[&<>\"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
  }[character]));
  const safeFilename = (value) => String(value || "activity")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70) || "activity";

  const notify = (message, type = "success") => {
    if (typeof showLibraryAlert === "function") {
      showLibraryAlert(message, type);
      return;
    }
    const alert = document.querySelector("#libraryAlert");
    if (!alert) return;
    alert.textContent = message;
    alert.dataset.type = type;
    alert.classList.remove("hidden");
    setTimeout(() => alert.classList.add("hidden"), 3500);
  };

  const stripBuilderStartup = (source) => {
    const marker = 'document.addEventListener("DOMContentLoaded"';
    const index = source.lastIndexOf(marker);
    if (index < 0) throw new Error("Không tìm thấy điểm khởi động của TextLab.");
    return source.slice(0, index).trimEnd();
  };

  const readSource = async (filename) => {
    const url = new URL(filename, window.location.href);
    url.searchParams.set("offline-export", String(Date.now()));
    const response = await fetch(url, { cache: "no-store", credentials: "same-origin" });
    if (!response.ok) throw new Error(`Không thể đọc ${filename} (${response.status}).`);
    return response.text();
  };

  const BRAND_LOGO = `
    <svg class="brian-logo-svg" viewBox="0 0 72 72" role="img" aria-label="Brian English Studio logo">
      <defs><linearGradient id="brianLogoGradient" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#123c69"/><stop offset="1" stop-color="#0c765b"/></linearGradient></defs>
      <rect x="3" y="3" width="66" height="66" rx="19" fill="url(#brianLogoGradient)"/>
      <path d="M21 17h20c10 0 16 5 16 13 0 5-3 9-8 11 6 2 10 6 10 13 0 10-7 16-19 16H21V17Zm17 20c5 0 8-2 8-6s-3-6-8-6h-6v12h6Zm2 25c6 0 9-3 9-8s-3-8-9-8h-8v16h8Z" fill="#fff" transform="translate(-4 -7) scale(.98)"/>
      <circle cx="57" cy="17" r="7" fill="#b2c248"/><path d="M14 55c11 7 27 9 43 3" fill="none" stroke="#8bd9c3" stroke-width="4" stroke-linecap="round" opacity=".9"/>
    </svg>`;

  const PREMIUM_CSS = `
:root{--brian-ink:#173044;--brian-muted:#617786;--brian-navy:#123c69;--brian-green:#0c765b;--brian-lime:#b2c248;--brian-scale:1;--brian-font:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color-scheme:light}
*{box-sizing:border-box}html{min-height:100%;background:#edf6f4;scroll-behavior:smooth}body{min-height:100vh;margin:0!important;padding:0!important;overflow-x:hidden;color:var(--brian-ink);font-family:var(--brian-font)!important;background:radial-gradient(circle at 8% 8%,rgba(178,194,72,.22),transparent 28rem),radial-gradient(circle at 92% 8%,rgba(33,150,243,.17),transparent 30rem),linear-gradient(145deg,#f9fcfb 0%,#edf7f4 48%,#fff8eb 100%)!important}
button,input,select,textarea{font-family:inherit}.brian-export-app{width:min(1320px,100%);min-height:100vh;margin:0 auto;padding:18px clamp(12px,2.2vw,30px) 22px;display:grid;grid-template-rows:auto 1fr auto;gap:16px}.brian-topbar{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 15px;border:1px solid rgba(21,93,75,.16);border-radius:22px;background:rgba(255,255,255,.92);box-shadow:0 12px 35px rgba(18,60,80,.1);backdrop-filter:blur(18px);animation:brianSlideDown .55s ease both}.brian-brand{display:flex;align-items:center;gap:11px}.brian-logo-svg{display:block;width:48px;height:48px;flex:0 0 auto;filter:drop-shadow(0 8px 12px rgba(18,60,105,.18))}.brian-brand-copy{display:grid;gap:1px}.brian-brand-copy strong{font-size:15px;color:#14394d}.brian-brand-copy span{font-size:10px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#5d7a72}.brian-toolbar{display:flex;align-items:center;justify-content:flex-end;gap:7px;flex-wrap:wrap}.brian-tool,.brian-select{min-height:38px;border:1px solid #c8ddd7;border-radius:12px;background:#f7fbf9;color:#214a40;font-weight:800;font-size:12px;transition:.18s ease}.brian-tool{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 11px;cursor:pointer}.brian-tool:hover,.brian-select:hover{transform:translateY(-2px);background:#fff;border-color:#79b7a5;box-shadow:0 8px 18px rgba(12,118,91,.13)}.brian-tool[aria-pressed="true"]{background:#0c765b;color:#fff;border-color:#0c765b}.brian-tool.is-accent{background:#143f69;color:#fff;border-color:#143f69}.brian-select{padding:7px 10px}.brian-size-group{display:inline-flex;align-items:center;border:1px solid #c8ddd7;border-radius:12px;background:#f7fbf9;overflow:hidden}.brian-size-group .brian-tool{border:0;border-radius:0;background:transparent;min-width:34px;padding:7px}.brian-size-value{min-width:48px;text-align:center;font-size:11px;font-weight:900}.brian-main{display:grid;gap:13px}.brian-activity-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:8px 5px 0;animation:brianFadeUp .6s .08s ease both}.brian-kicker{display:inline-flex;align-items:center;gap:7px;margin-bottom:6px;font-size:10px;font-weight:900;letter-spacing:.11em;text-transform:uppercase;color:#0c765b}.brian-kicker::before{content:"";width:20px;height:3px;border-radius:99px;background:#b2c248}.brian-title{margin:0;font-size:clamp(25px,4vw,46px);line-height:1.02;letter-spacing:-.045em;color:#17384c}.brian-template-pill{border:1px solid #c9ddd7;border-radius:999px;background:rgba(255,255,255,.82);padding:8px 12px;font-size:11px;font-weight:850}.brian-stage-card{position:relative;min-height:430px;overflow:hidden;border:1px solid rgba(23,89,72,.15);border-radius:28px;padding:clamp(14px,2.5vw,28px);background:rgba(255,255,255,.94);box-shadow:0 24px 70px rgba(24,65,82,.14);animation:brianFadeUp .66s .14s ease both}.brian-stage-card::before{content:"";position:absolute;inset:0 0 auto;height:5px;background:linear-gradient(90deg,#123c69,#0c765b,#b2c248,#39a0ed)}#stage{position:relative;z-index:1;width:100%;min-height:370px;background:transparent!important;border-radius:20px!important;padding:0!important;font-family:var(--brian-font)!important}#stage,#stage button,#stage input,#stage select,#stage textarea{font-family:var(--brian-font)!important}#stage .act-title{font-size:calc(24px * var(--brian-scale))!important}#stage .act-sub,#stage p,#stage li,#stage label,#stage .feedback,#stage .chip,#stage .option-btn,#stage .btn,#stage input,#stage textarea,#stage select{font-size:calc(14px * var(--brian-scale))!important}#stage .correct{animation:brianCorrect .48s ease both!important}#stage .wrong{animation:brianWrong .38s ease both!important}.brian-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 6px;color:#647c78;font-size:10px;font-weight:750}.brian-footer-brand{display:flex;align-items:center;gap:7px}.brian-footer-brand .brian-logo-svg{width:24px;height:24px;filter:none}.brian-welcome{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:20px;background:linear-gradient(145deg,rgba(10,38,52,.76),rgba(7,62,49,.72));backdrop-filter:blur(12px);transition:.42s ease}.brian-welcome.is-hidden{opacity:0;visibility:hidden;pointer-events:none}.brian-welcome-card{width:min(620px,100%);text-align:center;padding:clamp(28px,6vw,56px);border:1px solid rgba(255,255,255,.45);border-radius:34px;background:rgba(255,255,255,.96);box-shadow:0 36px 100px rgba(0,0,0,.28);animation:brianWelcome .7s ease both}.brian-welcome-logo{width:86px;height:86px;margin:0 auto 18px}.brian-welcome-logo .brian-logo-svg{width:86px;height:86px}.brian-welcome-eyebrow{font-size:11px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;color:#0c765b}.brian-welcome h1{margin:9px 0 10px;font-size:clamp(30px,6vw,54px);line-height:1;color:#17384c}.brian-welcome p{max-width:480px;margin:0 auto 23px;color:#607984;line-height:1.55;font-weight:600}.brian-start-button{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-width:210px;border:0;border-radius:16px;padding:14px 22px;background:linear-gradient(135deg,#123c69,#0c765b);color:#fff;font-size:15px;font-weight:900;cursor:pointer;box-shadow:0 15px 32px rgba(12,118,91,.28)}.brian-welcome-note{display:block;margin-top:14px;font-size:10px;color:#81918e}.brian-toast{position:fixed;z-index:1100;left:50%;bottom:24px;transform:translate(-50%,18px);opacity:0;border-radius:14px;padding:10px 14px;background:#17384c;color:#fff;font-size:12px;font-weight:850;transition:.25s ease}.brian-toast.is-visible{opacity:1;transform:translate(-50%,0)}.brian-confetti{position:fixed;inset:0;z-index:1050;overflow:hidden;pointer-events:none}.brian-confetti-piece{position:absolute;top:-12vh;width:10px;height:18px;border-radius:3px;animation:brianConfettiFall 2.7s ease forwards}.brian-export-app[data-motion="off"] *,body[data-motion="off"] *{animation:none!important;transition:none!important}@keyframes brianSlideDown{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:none}}@keyframes brianFadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}@keyframes brianWelcome{from{opacity:0;transform:translateY(28px) scale(.96)}to{opacity:1;transform:none}}@keyframes brianCorrect{0%{transform:scale(1)}45%{transform:scale(1.025);box-shadow:0 0 0 6px rgba(23,178,106,.13)}100%{transform:scale(1)}}@keyframes brianWrong{0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}50%{transform:translateX(7px)}75%{transform:translateX(-4px)}}@keyframes brianConfettiFall{0%{transform:translate3d(0,-10vh,0) rotate(0);opacity:1}100%{transform:translate3d(var(--drift),112vh,0) rotate(var(--turn));opacity:.9}}@media(max-width:820px){.brian-topbar{align-items:flex-start}.brian-toolbar{max-width:58%}.brian-tool-label{display:none}.brian-activity-heading{align-items:flex-start;flex-direction:column}}@media(max-width:560px){.brian-export-app{padding:9px}.brian-topbar{border-radius:17px;display:grid}.brian-toolbar{max-width:none;justify-content:flex-start}.brian-footer{align-items:flex-start;flex-direction:column}}
`;

  const buildBootstrap = (templateId, raw, title) => `
;(() => {
  const __ID__ = ${JSON.stringify(templateId)};
  const __RAW__ = ${JSON.stringify(raw)};
  const __TITLE__ = ${JSON.stringify(title)};
  const __stage = document.getElementById("stage");
  try {
    selectedTemplate = TEMPLATES.find((template) => template.id === __ID__) || { id: __ID__, name: __TITLE__ };
    const data = parseData(__ID__, __RAW__);
    __stage.className = "activity-stage";
    renderActivity(__stage, __ID__, data, { title: __TITLE__, mode: "ready" });
    if (!__stage.children.length && !__stage.textContent.trim()) throw new Error("Hoạt động không tạo được nội dung hiển thị.");
    window.__BRIAN_ACTIVITY__ = { id: __ID__, raw: __RAW__, title: __TITLE__, data };
    document.documentElement.dataset.offlineReady = "true";
  } catch (error) {
    __stage.innerHTML = '<section data-offline-error style="padding:24px;color:#8b1e2d;background:#fff4f5;border:1px solid #f2c6cc;border-radius:18px"><h2 style="margin-top:0">Không thể mở hoạt động</h2><p>' + String(error?.message || error) + '</p></section>';
    document.documentElement.dataset.offlineReady = "false";
  }
})();`;

  const EXPERIENCE_RUNTIME = `
;(() => {
  const root=document.documentElement,stage=document.getElementById("stage"),welcome=document.getElementById("brianWelcome"),startButton=document.getElementById("brianStart"),soundButton=document.getElementById("brianSound"),motionButton=document.getElementById("brianMotion"),fontSelect=document.getElementById("brianFont"),sizeDown=document.getElementById("brianSizeDown"),sizeUp=document.getElementById("brianSizeUp"),sizeValue=document.getElementById("brianSizeValue"),fullscreenButton=document.getElementById("brianFullscreen"),restartButton=document.getElementById("brianRestart"),toast=document.getElementById("brianToast"),confetti=document.getElementById("brianConfetti");
  const scales=[.85,.95,1,1.1,1.2],fonts={modern:'Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',arial:'Arial,Helvetica,sans-serif',verdana:'Verdana,Geneva,sans-serif',trebuchet:'"Trebuchet MS",Arial,sans-serif',georgia:'Georgia,"Times New Roman",serif'};
  let sizeIndex=2,soundOn=true,motionOn=!matchMedia("(prefers-reduced-motion: reduce)").matches,audioContext=null,toastTimer=0;
  const read=(k,f)=>{try{const v=localStorage.getItem(k);return v===null?f:v}catch{return f}},write=(k,v)=>{try{localStorage.setItem(k,String(v))}catch{}},show=(m)=>{toast.textContent=m;toast.classList.add("is-visible");clearTimeout(toastTimer);toastTimer=setTimeout(()=>toast.classList.remove("is-visible"),1800)},ensure=()=>{if(!audioContext)audioContext=new (AudioContext||webkitAudioContext)();if(audioContext.state==="suspended")audioContext.resume();return audioContext},tone=(f,d,t="sine",v=.05,delay=0)=>{if(!soundOn)return;try{const c=ensure(),o=c.createOscillator(),g=c.createGain(),s=c.currentTime+delay;o.type=t;o.frequency.setValueAtTime(f,s);g.gain.setValueAtTime(.0001,s);g.gain.exponentialRampToValueAtTime(v,s+.018);g.gain.exponentialRampToValueAtTime(.0001,s+d);o.connect(g);g.connect(c.destination);o.start(s);o.stop(s+d+.03)}catch{}},sound=(k)=>{if(k==="start"){tone(392,.12);tone(523,.14,"sine",.055,.1);tone(659,.2,"sine",.06,.2)}else if(k==="correct"){tone(523,.1);tone(659,.16,"sine",.06,.08)}else if(k==="wrong"){tone(190,.13,"square",.035);tone(155,.18,"square",.03,.1)}else tone(350,.055,"sine",.026)};
  const applySize=()=>{sizeIndex=Math.max(0,Math.min(scales.length-1,sizeIndex));root.style.setProperty("--brian-scale",String(scales[sizeIndex]));sizeValue.textContent=Math.round(scales[sizeIndex]*100)+"%";write("brian-export-size",sizeIndex)},applyFont=(k)=>{const x=fonts[k]?k:"modern";root.style.setProperty("--brian-font",fonts[x]);fontSelect.value=x;write("brian-export-font",x)},updateSound=()=>{soundButton.setAttribute("aria-pressed",soundOn?"true":"false");soundButton.querySelector("[data-icon]").textContent=soundOn?"🔊":"🔇";write("brian-export-sound",soundOn?1:0)},updateMotion=()=>{document.querySelector(".brian-export-app").dataset.motion=motionOn?"on":"off";write("brian-export-motion",motionOn?1:0)};
  sizeIndex=Number(read("brian-export-size","2"));soundOn=read("brian-export-sound","1")!=="0";motionOn=read("brian-export-motion",motionOn?"1":"0")!=="0";applySize();applyFont(read("brian-export-font","modern"));updateSound();updateMotion();
  startButton.onclick=()=>{ensure();sound("start");welcome.classList.add("is-hidden")};soundButton.onclick=()=>{soundOn=!soundOn;updateSound();if(soundOn){ensure();sound("start")}show(soundOn?"Đã bật âm thanh":"Đã tắt âm thanh")};motionButton.onclick=()=>{motionOn=!motionOn;updateMotion();show(motionOn?"Đã bật hiệu ứng":"Đã tắt hiệu ứng")};fontSelect.onchange=()=>{applyFont(fontSelect.value);show("Đã đổi font chữ")};sizeDown.onclick=()=>{sizeIndex--;applySize();sound("click")};sizeUp.onclick=()=>{sizeIndex++;applySize();sound("click")};restartButton.onclick=()=>location.reload();fullscreenButton.onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen()}catch{show("Trình duyệt không cho phép toàn màn hình")}};
  const celebrate=()=>{if(!motionOn)return;confetti.innerHTML="";const colors=["#123c69","#0c765b","#b2c248","#39a0ed","#ffad5b","#ef5b7c"];for(let i=0;i<70;i++){const p=document.createElement("i");p.className="brian-confetti-piece";p.style.left=Math.random()*100+"%";p.style.background=colors[i%colors.length];p.style.setProperty("--drift",Math.random()*220-110+"px");p.style.setProperty("--turn",Math.random()*980-490+"deg");confetti.appendChild(p)}setTimeout(()=>confetti.innerHTML="",4200)};
  new MutationObserver((records)=>{records.forEach((record)=>{const elements=[];if(record.target?.nodeType===1)elements.push(record.target);record.addedNodes?.forEach((node)=>{if(node.nodeType===1)elements.push(node)});elements.forEach((element)=>{[element,...(element.querySelectorAll?element.querySelectorAll(".correct,.wrong"):[])].forEach((item)=>{if(item.classList?.contains("correct")&&!item.dataset.brianSound){item.dataset.brianSound="1";sound("correct")}if(item.classList?.contains("wrong")&&!item.dataset.brianSound){item.dataset.brianSound="1";sound("wrong")}})})});const text=stage.textContent.toLowerCase();if(/completed|all correct|correct order|hoàn thành|xuất sắc/.test(text))celebrate()}).observe(stage,{subtree:true,childList:true,attributes:true,attributeFilter:["class","data-done"]});
})();`;

  const buildHtml = async (options = {}) => {
    const raw = String(document.querySelector("#contentInput")?.value || "").trim();
    const templateId = selectedTemplate?.id || "activity";
    const templateName = selectedTemplate?.name || "Brian Activity";
    const title = String(options.titleOverride || templateName).trim();
    const [appSource, extraSource] = await Promise.all([readSource("app.js"), readSource("extra-games.js")]);
    const script = `${stripBuilderStartup(appSource)}\n${extraSource}\n${buildBootstrap(templateId, raw, title)}\n${EXPERIENCE_RUNTIME}`;
    new Function(script);
    const activityCss = typeof EXPORT_CSS !== "undefined" ? EXPORT_CSS : "body{font-family:system-ui,sans-serif;margin:0}.activity-stage{background:#fff;border-radius:20px;padding:22px}";
    const safeTitle = escapeHtml(title), safeTemplate = escapeHtml(templateName), logo = BRAND_LOGO;
    return `<!DOCTYPE html><html lang="vi"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="theme-color" content="#123c69"><meta name="generator" content="Brian TextLab Premium v2"><title>${safeTitle} · Brian English Studio</title><style>${escapeInlineStyle(activityCss)}\n${escapeInlineStyle(PREMIUM_CSS)}</style></head><body><div class="brian-export-app" data-motion="on"><header class="brian-topbar"><div class="brian-brand">${logo}<div class="brian-brand-copy"><strong>Brian English Studio</strong><span>Teach Smarter · Learn Better</span></div></div><div class="brian-toolbar"><button class="brian-tool" id="brianSound" type="button" aria-pressed="true"><span data-icon>🔊</span><span class="brian-tool-label">Âm thanh</span></button><button class="brian-tool" id="brianMotion" type="button" aria-pressed="true"><span>✨</span><span class="brian-tool-label">Hiệu ứng</span></button><select class="brian-select" id="brianFont"><option value="modern">Modern</option><option value="arial">Arial</option><option value="verdana">Verdana</option><option value="trebuchet">Trebuchet</option><option value="georgia">Georgia</option></select><span class="brian-size-group"><button class="brian-tool" id="brianSizeDown" type="button">A−</button><span class="brian-size-value" id="brianSizeValue">100%</span><button class="brian-tool" id="brianSizeUp" type="button">A＋</button></span><button class="brian-tool" id="brianRestart" type="button">↻ <span class="brian-tool-label">Chơi lại</span></button><button class="brian-tool is-accent" id="brianFullscreen" type="button">⛶ <span class="brian-tool-label">Toàn màn hình</span></button></div></header><main class="brian-main"><div class="brian-activity-heading"><div><span class="brian-kicker">Interactive Learning Activity</span><h1 class="brian-title">${safeTitle}</h1></div><span class="brian-template-pill">${safeTemplate}</span></div><section class="brian-stage-card"><div class="activity-stage" id="stage" tabindex="-1"></div></section></main><footer class="brian-footer"><div class="brian-footer-brand">${logo}<span>Created with <strong>Brian TextLab Activities</strong></span></div><span>Hoạt động tự chứa · Chạy trực tiếp không cần Internet</span></footer></div><div class="brian-welcome" id="brianWelcome"><div class="brian-welcome-card"><div class="brian-welcome-logo">${logo}</div><span class="brian-welcome-eyebrow">Brian English Studio</span><h1>${safeTitle}</h1><p>${safeTemplate} · Hoạt động tương tác có hiệu ứng, âm thanh và tùy chỉnh hiển thị.</p><button class="brian-start-button" id="brianStart" type="button">▶ Bắt đầu hoạt động</button><small class="brian-welcome-note">Bạn có thể đổi cỡ chữ, font, âm thanh và chế độ toàn màn hình bất cứ lúc nào.</small></div></div><div class="brian-confetti" id="brianConfetti"></div><div class="brian-toast" id="brianToast"></div><script>${escapeInlineScript(script)}<\/script></body></html>`;
  };

  const validate = (html) => new Promise((resolve, reject) => {
    const frame = document.createElement("iframe"); frame.style.cssText = "position:fixed;width:2px;height:2px;opacity:0;pointer-events:none;left:-9999px;top:-9999px";
    const timeout = setTimeout(() => { frame.remove(); reject(new Error("Bản HTML không khởi động đúng thời gian.")); }, 7000);
    frame.onload = () => setTimeout(() => { try { const doc = frame.contentDocument, stage = doc?.querySelector("#stage"), toolbar = doc?.querySelector("#brianSound"), welcome = doc?.querySelector("#brianWelcome"), ready = doc?.documentElement?.dataset?.offlineReady; clearTimeout(timeout); if (!stage || ready !== "true" || !toolbar || !welcome) throw new Error("Bản premium chưa được đóng gói đầy đủ."); frame.remove(); resolve(); } catch (error) { clearTimeout(timeout); frame.remove(); reject(error); } }, 600);
    frame.srcdoc = html; document.body.appendChild(frame);
  });

  const buildVerifiedHtml = async (options = {}) => { const html = await buildHtml(options); await validate(html); return html; };
  window.BrianTextLabExport = Object.freeze({ buildHtml, validate, buildVerifiedHtml, safeFilename });
  button.addEventListener("click", async (event) => {
    event.preventDefault(); event.stopImmediatePropagation();
    if (!document.querySelector("#contentInput")?.value.trim()) return notify("Hãy nhập nội dung trước khi tải hoạt động.", "error");
    const original = button.textContent; button.disabled = true; button.textContent = "Đang dựng giao diện premium...";
    try { const html = await buildVerifiedHtml(); const filename = `brian-${safeFilename(selectedTemplate?.name || selectedTemplate?.id)}.html`; const blob = new Blob(["\uFEFF", html], { type: "text/html;charset=utf-8" }); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = filename; document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1500); notify(`Đã tải ${filename}. File premium có logo, âm thanh, hiệu ứng và tùy chỉnh hiển thị.`); }
    catch (error) { console.error("Premium HTML export failed", error); notify(`Chưa thể tạo HTML premium: ${error.message || "lỗi không xác định"}.`, "error"); }
    finally { button.disabled = false; button.textContent = original; }
  }, true);
})();
