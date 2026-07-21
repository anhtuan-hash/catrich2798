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
      <defs>
        <linearGradient id="brianLogoGradient" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stop-color="#123c69"/>
          <stop offset="1" stop-color="#0c765b"/>
        </linearGradient>
      </defs>
      <rect x="3" y="3" width="66" height="66" rx="19" fill="url(#brianLogoGradient)"/>
      <path d="M21 17h20c10 0 16 5 16 13 0 5-3 9-8 11 6 2 10 6 10 13 0 10-7 16-19 16H21V17Zm17 20c5 0 8-2 8-6s-3-6-8-6h-6v12h6Zm2 25c6 0 9-3 9-8s-3-8-9-8h-8v16h8Z" fill="#fff" transform="translate(-4 -7) scale(.98)"/>
      <circle cx="57" cy="17" r="7" fill="#b2c248"/>
      <path d="M14 55c11 7 27 9 43 3" fill="none" stroke="#8bd9c3" stroke-width="4" stroke-linecap="round" opacity=".9"/>
    </svg>`;

  const PREMIUM_CSS = `
:root{
  --brian-ink:#173044;
  --brian-muted:#617786;
  --brian-navy:#123c69;
  --brian-green:#0c765b;
  --brian-lime:#b2c248;
  --brian-sky:#eaf5ff;
  --brian-cream:#fffaf0;
  --brian-card:#ffffff;
  --brian-scale:1;
  --brian-font:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;
  color-scheme:light;
}
*{box-sizing:border-box}
html{min-height:100%;background:#edf6f4;scroll-behavior:smooth}
body{
  min-height:100vh;
  margin:0!important;
  padding:0!important;
  overflow-x:hidden;
  color:var(--brian-ink);
  font-family:var(--brian-font)!important;
  background:
    radial-gradient(circle at 8% 8%,rgba(178,194,72,.22),transparent 28rem),
    radial-gradient(circle at 92% 8%,rgba(33,150,243,.17),transparent 30rem),
    linear-gradient(145deg,#f9fcfb 0%,#edf7f4 48%,#fff8eb 100%)!important;
}
body::before,body::after{content:"";position:fixed;z-index:-1;border-radius:999px;filter:blur(2px);pointer-events:none}
body::before{width:260px;height:260px;right:-70px;bottom:-70px;background:rgba(18,60,105,.09)}
body::after{width:180px;height:180px;left:-65px;top:35%;background:rgba(178,194,72,.12)}
button,input,select,textarea{font-family:inherit}
.brian-export-app{width:min(1320px,100%);min-height:100vh;margin:0 auto;padding:18px clamp(12px,2.2vw,30px) 22px;display:grid;grid-template-rows:auto 1fr auto;gap:16px}
.brian-topbar{
  position:relative;
  z-index:20;
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:16px;
  padding:13px 15px;
  border:1px solid rgba(21,93,75,.16);
  border-radius:22px;
  background:rgba(255,255,255,.9);
  box-shadow:0 12px 35px rgba(18,60,80,.1);
  backdrop-filter:blur(18px);
  animation:brianSlideDown .55s cubic-bezier(.2,.8,.2,1) both;
}
.brian-brand{display:flex;align-items:center;gap:11px;min-width:220px}
.brian-logo-svg{display:block;width:48px;height:48px;flex:0 0 auto;filter:drop-shadow(0 8px 12px rgba(18,60,105,.18))}
.brian-brand-copy{display:grid;gap:1px;line-height:1.1}
.brian-brand-copy strong{font-size:15px;letter-spacing:-.015em;color:#14394d}
.brian-brand-copy span{font-size:10px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:#5d7a72}
.brian-toolbar{display:flex;align-items:center;justify-content:flex-end;gap:7px;flex-wrap:wrap}
.brian-tool,.brian-select{
  min-height:38px;
  border:1px solid #c8ddd7;
  border-radius:12px;
  background:#f7fbf9;
  color:#214a40;
  font-weight:800;
  font-size:12px;
  transition:transform .18s ease,background .18s ease,border-color .18s ease,box-shadow .18s ease;
}
.brian-tool{display:inline-flex;align-items:center;justify-content:center;gap:6px;padding:8px 11px;cursor:pointer}
.brian-tool:hover,.brian-tool:focus-visible,.brian-select:hover,.brian-select:focus-visible{transform:translateY(-2px);background:#fff;border-color:#79b7a5;box-shadow:0 8px 18px rgba(12,118,91,.13);outline:none}
.brian-tool[aria-pressed="true"]{background:#0c765b;color:#fff;border-color:#0c765b}
.brian-tool.is-accent{background:#143f69;color:#fff;border-color:#143f69}
.brian-select{padding:7px 31px 7px 10px;cursor:pointer}
.brian-size-group{display:inline-flex;align-items:center;border:1px solid #c8ddd7;border-radius:12px;background:#f7fbf9;overflow:hidden}
.brian-size-group .brian-tool{border:0;border-radius:0;background:transparent;min-width:34px;padding:7px}
.brian-size-value{min-width:48px;text-align:center;font-size:11px;font-weight:900;color:#315b50}
.brian-main{display:grid;gap:13px;min-height:0}
.brian-activity-heading{
  display:flex;align-items:flex-end;justify-content:space-between;gap:16px;padding:8px 5px 0;
  animation:brianFadeUp .6s .08s ease both;
}
.brian-kicker{display:inline-flex;align-items:center;gap:7px;margin-bottom:6px;font-size:10px;font-weight:900;letter-spacing:.11em;text-transform:uppercase;color:#0c765b}
.brian-kicker::before{content:"";width:20px;height:3px;border-radius:99px;background:#b2c248}
.brian-title{margin:0;font-size:clamp(25px,4vw,46px);line-height:1.02;letter-spacing:-.045em;color:#17384c}
.brian-template-pill{flex:0 0 auto;border:1px solid #c9ddd7;border-radius:999px;background:rgba(255,255,255,.82);padding:8px 12px;font-size:11px;font-weight:850;color:#496b62;box-shadow:0 8px 20px rgba(19,56,76,.06)}
.brian-stage-card{
  position:relative;
  min-height:430px;
  overflow:hidden;
  border:1px solid rgba(23,89,72,.15);
  border-radius:28px;
  padding:clamp(14px,2.5vw,28px);
  background:rgba(255,255,255,.94);
  box-shadow:0 24px 70px rgba(24,65,82,.14);
  animation:brianFadeUp .66s .14s cubic-bezier(.2,.8,.2,1) both;
}
.brian-stage-card::before{content:"";position:absolute;inset:0 0 auto;height:5px;background:linear-gradient(90deg,#123c69,#0c765b,#b2c248,#39a0ed)}
#stage{position:relative;z-index:1;width:100%;min-height:370px;background:transparent!important;border-radius:20px!important;padding:0!important;font-family:var(--brian-font)!important;transition:font-size .2s ease}
#stage,#stage button,#stage input,#stage select,#stage textarea{font-family:var(--brian-font)!important}
#stage .act-title{font-size:calc(24px * var(--brian-scale))!important;line-height:1.15!important}
#stage .act-sub,#stage p,#stage li,#stage label,#stage .feedback,#stage .chip,#stage .option-btn,#stage .btn,#stage input,#stage textarea,#stage select{font-size:calc(14px * var(--brian-scale))!important}
#stage .q-card,#stage .prompt-card,#stage .drop-box,#stage .btl-card{transition:transform .2s ease,box-shadow .2s ease,border-color .2s ease}
#stage .q-card:hover,#stage .prompt-card:hover,#stage .drop-box:hover,#stage .btl-card:hover{transform:translateY(-2px);box-shadow:0 14px 32px rgba(18,60,80,.1)}
#stage button{transition:transform .16s ease,box-shadow .16s ease,filter .16s ease}
#stage button:hover{transform:translateY(-1px);filter:saturate(1.06)}
#stage .correct{animation:brianCorrect .48s ease both!important}
#stage .wrong{animation:brianWrong .38s ease both!important}
.brian-footer{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:4px 6px;color:#647c78;font-size:10px;font-weight:750;animation:brianFadeUp .6s .2s ease both}
.brian-footer-brand{display:flex;align-items:center;gap:7px}.brian-footer-brand .brian-logo-svg{width:24px;height:24px;filter:none}
.brian-welcome{
  position:fixed;inset:0;z-index:1000;display:grid;place-items:center;padding:20px;
  background:linear-gradient(145deg,rgba(10,38,52,.76),rgba(7,62,49,.72));
  backdrop-filter:blur(12px);
  transition:opacity .42s ease,visibility .42s ease;
}
.brian-welcome.is-hidden{opacity:0;visibility:hidden;pointer-events:none}
.brian-welcome-card{
  width:min(620px,100%);position:relative;overflow:hidden;text-align:center;padding:clamp(28px,6vw,56px);
  border:1px solid rgba(255,255,255,.45);border-radius:34px;background:rgba(255,255,255,.96);
  box-shadow:0 36px 100px rgba(0,0,0,.28);animation:brianWelcome .7s cubic-bezier(.2,.9,.2,1) both;
}
.brian-welcome-card::before{content:"";position:absolute;inset:0 0 auto;height:8px;background:linear-gradient(90deg,#123c69,#0c765b,#b2c248)}
.brian-welcome-logo{width:86px;height:86px;margin:0 auto 18px}.brian-welcome-logo .brian-logo-svg{width:86px;height:86px}
.brian-welcome-eyebrow{font-size:11px;font-weight:900;letter-spacing:.13em;text-transform:uppercase;color:#0c765b}
.brian-welcome h1{margin:9px 0 10px;font-size:clamp(30px,6vw,54px);line-height:1;letter-spacing:-.05em;color:#17384c}
.brian-welcome p{max-width:480px;margin:0 auto 23px;color:#607984;line-height:1.55;font-weight:600}
.brian-start-button{display:inline-flex;align-items:center;justify-content:center;gap:10px;min-width:210px;border:0;border-radius:16px;padding:14px 22px;background:linear-gradient(135deg,#123c69,#0c765b);color:#fff;font-size:15px;font-weight:900;cursor:pointer;box-shadow:0 15px 32px rgba(12,118,91,.28);transition:transform .2s ease,box-shadow .2s ease}
.brian-start-button:hover,.brian-start-button:focus-visible{transform:translateY(-3px) scale(1.01);box-shadow:0 20px 40px rgba(12,118,91,.34);outline:none}
.brian-welcome-note{display:block;margin-top:14px;font-size:10px;font-weight:750;color:#81918e}
.brian-toast{position:fixed;z-index:1100;left:50%;bottom:24px;transform:translate(-50%,18px);opacity:0;pointer-events:none;border-radius:14px;padding:10px 14px;background:#17384c;color:#fff;font-size:12px;font-weight:850;box-shadow:0 12px 34px rgba(0,0,0,.22);transition:.25s ease}
.brian-toast.is-visible{opacity:1;transform:translate(-50%,0)}
.brian-confetti{position:fixed;inset:0;z-index:1050;overflow:hidden;pointer-events:none}
.brian-confetti-piece{position:absolute;top:-12vh;width:10px;height:18px;border-radius:3px;animation:brianConfettiFall 2.7s cubic-bezier(.15,.65,.3,1) forwards}
.brian-export-app[data-motion="off"] *,body[data-motion="off"] *{animation:none!important;transition:none!important;scroll-behavior:auto!important}
@keyframes brianSlideDown{from{opacity:0;transform:translateY(-14px)}to{opacity:1;transform:none}}
@keyframes brianFadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes brianWelcome{from{opacity:0;transform:translateY(28px) scale(.96)}to{opacity:1;transform:none}}
@keyframes brianCorrect{0%{transform:scale(1)}45%{transform:scale(1.025);box-shadow:0 0 0 6px rgba(23,178,106,.13)}100%{transform:scale(1)}}
@keyframes brianWrong{0%,100%{transform:translateX(0)}25%{transform:translateX(-7px)}50%{transform:translateX(7px)}75%{transform:translateX(-4px)}}
@keyframes brianConfettiFall{0%{transform:translate3d(0,-10vh,0) rotate(0);opacity:1}100%{transform:translate3d(var(--drift),112vh,0) rotate(var(--turn));opacity:.9}}
@media(max-width:820px){
  .brian-topbar{align-items:flex-start}.brian-toolbar{max-width:58%}.brian-tool-label{display:none}.brian-select{max-width:130px}
  .brian-activity-heading{align-items:flex-start;flex-direction:column}.brian-template-pill{align-self:flex-start}.brian-stage-card{border-radius:22px}
}
@media(max-width:560px){
  .brian-export-app{padding:9px}.brian-topbar{border-radius:17px;display:grid}.brian-toolbar{max-width:none;justify-content:flex-start}.brian-brand{min-width:0}
  .brian-title{font-size:29px}.brian-stage-card{padding:11px;min-height:360px}.brian-footer{align-items:flex-start;flex-direction:column}
  .brian-welcome-card{padding:30px 20px;border-radius:25px}
}
@media(prefers-reduced-motion:reduce){*{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important;scroll-behavior:auto!important}}
`;

  const buildBootstrap = (templateId, raw, title) => `
;(() => {
  const __ID__ = ${JSON.stringify(templateId)};
  const __RAW__ = ${JSON.stringify(raw)};
  const __TITLE__ = ${JSON.stringify(title)};
  const __stage = document.getElementById("stage");
  const __fail = (error) => {
    const message = error && error.message ? error.message : String(error || "Unknown error");
    __stage.innerHTML = '<section data-offline-error style="padding:24px;color:#8b1e2d;background:#fff4f5;border:1px solid #f2c6cc;border-radius:18px"><h2 style="margin-top:0">Không thể mở hoạt động</h2><p>' + String(message).replace(/[&<>\"]/g, (character) => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[character])) + '</p></section>';
    document.documentElement.dataset.offlineReady = "false";
  };
  window.addEventListener("error", (event) => { if (!__stage.children.length) __fail(event.error || event.message); });
  window.addEventListener("unhandledrejection", (event) => { if (!__stage.children.length) __fail(event.reason); });
  try {
    selectedTemplate = TEMPLATES.find((template) => template.id === __ID__) || { id: __ID__, name: __TITLE__ };
    const data = parseData(__ID__, __RAW__);
    __stage.className = "activity-stage";
    renderActivity(__stage, __ID__, data, { title: __TITLE__, mode: "ready" });
    if (!__stage.children.length && !__stage.textContent.trim()) throw new Error("Hoạt động không tạo được nội dung hiển thị.");
    window.__BRIAN_ACTIVITY__ = { id: __ID__, raw: __RAW__, title: __TITLE__, data };
    document.documentElement.dataset.offlineReady = "true";
  } catch (error) {
    __fail(error);
  }
})();`;

  const EXPERIENCE_RUNTIME = `
;(() => {
  "use strict";
  const root = document.documentElement;
  const app = document.querySelector(".brian-export-app");
  const stage = document.getElementById("stage");
  const welcome = document.getElementById("brianWelcome");
  const startButton = document.getElementById("brianStart");
  const soundButton = document.getElementById("brianSound");
  const motionButton = document.getElementById("brianMotion");
  const fontSelect = document.getElementById("brianFont");
  const sizeDown = document.getElementById("brianSizeDown");
  const sizeUp = document.getElementById("brianSizeUp");
  const sizeValue = document.getElementById("brianSizeValue");
  const fullscreenButton = document.getElementById("brianFullscreen");
  const restartButton = document.getElementById("brianRestart");
  const toast = document.getElementById("brianToast");
  const confetti = document.getElementById("brianConfetti");
  const scales = [0.85,0.95,1,1.1,1.2];
  const fonts = {
    modern:'Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif',
    arial:'Arial,Helvetica,sans-serif',
    verdana:'Verdana,Geneva,sans-serif',
    trebuchet:'"Trebuchet MS",Arial,sans-serif',
    georgia:'Georgia,"Times New Roman",serif'
  };
  let sizeIndex = 2;
  let soundOn = true;
  let motionOn = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  let audioContext = null;
  let celebrated = false;
  let toastTimer = 0;

  const readSetting = (key, fallback) => { try { const value = localStorage.getItem(key); return value === null ? fallback : value; } catch { return fallback; } };
  const writeSetting = (key, value) => { try { localStorage.setItem(key, String(value)); } catch { /* optional */ } };
  const showToast = (message) => {
    toast.textContent = message;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 1900);
  };
  const ensureAudio = () => {
    if (!audioContext) audioContext = new (window.AudioContext || window.webkitAudioContext)();
    if (audioContext.state === "suspended") audioContext.resume();
    return audioContext;
  };
  const tone = (frequency, duration, type, volume, delay) => {
    if (!soundOn) return;
    try {
      const context = ensureAudio();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const start = context.currentTime + (delay || 0);
      oscillator.type = type || "sine";
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(volume || 0.06, start + 0.018);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(start); oscillator.stop(start + duration + 0.03);
    } catch { /* audio is optional */ }
  };
  const playSound = (kind) => {
    if (!soundOn) return;
    if (kind === "start") { tone(392,.12,"sine",.055,0); tone(523,.14,"sine",.055,.1); tone(659,.2,"sine",.06,.2); return; }
    if (kind === "correct") { tone(523,.1,"sine",.055,0); tone(659,.16,"sine",.06,.08); return; }
    if (kind === "wrong") { tone(190,.13,"square",.035,0); tone(155,.18,"square",.03,.1); return; }
    if (kind === "finish") { tone(523,.12,"sine",.06,0); tone(659,.12,"sine",.06,.1); tone(784,.13,"sine",.065,.2); tone(1046,.28,"sine",.07,.31); return; }
    tone(350,.055,"sine",.026,0);
  };
  const applySize = () => {
    sizeIndex = Math.max(0, Math.min(scales.length - 1, sizeIndex));
    root.style.setProperty("--brian-scale", String(scales[sizeIndex]));
    sizeValue.textContent = Math.round(scales[sizeIndex] * 100) + "%";
    writeSetting("brian-export-size", sizeIndex);
  };
  const applyFont = (key) => {
    const selected = fonts[key] ? key : "modern";
    root.style.setProperty("--brian-font", fonts[selected]);
    fontSelect.value = selected;
    writeSetting("brian-export-font", selected);
  };
  const updateSound = () => {
    soundButton.setAttribute("aria-pressed", soundOn ? "true" : "false");
    soundButton.querySelector("[data-icon]").textContent = soundOn ? "🔊" : "🔇";
    soundButton.querySelector("[data-label]").textContent = soundOn ? "Âm thanh" : "Tắt âm";
    writeSetting("brian-export-sound", soundOn ? "1" : "0");
  };
  const updateMotion = () => {
    app.dataset.motion = motionOn ? "on" : "off";
    document.body.dataset.motion = motionOn ? "on" : "off";
    motionButton.setAttribute("aria-pressed", motionOn ? "true" : "false");
    motionButton.querySelector("[data-label]").textContent = motionOn ? "Hiệu ứng" : "Tắt hiệu ứng";
    writeSetting("brian-export-motion", motionOn ? "1" : "0");
  };
  const launchConfetti = () => {
    if (!motionOn) return;
    confetti.innerHTML = "";
    const colors = ["#123c69","#0c765b","#b2c248","#39a0ed","#ffad5b","#ef5b7c"];
    for (let index = 0; index < 70; index += 1) {
      const piece = document.createElement("i");
      piece.className = "brian-confetti-piece";
      piece.style.left = Math.random() * 100 + "%";
      piece.style.background = colors[index % colors.length];
      piece.style.animationDelay = Math.random() * .65 + "s";
      piece.style.animationDuration = 2.2 + Math.random() * 1.4 + "s";
      piece.style.setProperty("--drift", (Math.random() * 220 - 110) + "px");
      piece.style.setProperty("--turn", (Math.random() * 980 - 490) + "deg");
      confetti.appendChild(piece);
    }
    setTimeout(() => { confetti.innerHTML = ""; }, 4200);
  };
  const celebrate = () => {
    if (celebrated) return;
    celebrated = true;
    playSound("finish");
    launchConfetti();
    showToast("Hoàn thành xuất sắc! 🎉");
  };
  const checkCompletion = () => {
    const cards = Array.from(stage.querySelectorAll(".q-card"));
    if (cards.length && cards.every((card) => card.dataset.done === "1" || card.classList.contains("done") || card.querySelector(".correct,.wrong"))) {
      celebrate(); return;
    }
    const text = stage.textContent.toLowerCase();
    if (/\\b(bingo|completed|all correct|correct order|hoàn thành|xuất sắc)\\b/.test(text)) celebrate();
  };

  sizeIndex = Number(readSetting("brian-export-size", "2"));
  if (!Number.isInteger(sizeIndex)) sizeIndex = 2;
  soundOn = readSetting("brian-export-sound", "1") !== "0";
  motionOn = readSetting("brian-export-motion", motionOn ? "1" : "0") !== "0";
  applySize(); applyFont(readSetting("brian-export-font", "modern")); updateSound(); updateMotion();

  startButton.addEventListener("click", () => {
    ensureAudio(); playSound("start");
    welcome.classList.add("is-hidden");
    stage.focus({ preventScroll: true });
    setTimeout(() => stage.scrollIntoView({ behavior: motionOn ? "smooth" : "auto", block: "start" }), 180);
  });
  soundButton.addEventListener("click", () => { soundOn = !soundOn; updateSound(); if (soundOn) { ensureAudio(); playSound("start"); showToast("Đã bật âm thanh"); } else showToast("Đã tắt âm thanh"); });
  motionButton.addEventListener("click", () => { motionOn = !motionOn; updateMotion(); showToast(motionOn ? "Đã bật hiệu ứng" : "Đã tắt hiệu ứng"); });
  fontSelect.addEventListener("change", () => { applyFont(fontSelect.value); showToast("Đã đổi font chữ"); });
  sizeDown.addEventListener("click", () => { sizeIndex -= 1; applySize(); playSound("click"); });
  sizeUp.addEventListener("click", () => { sizeIndex += 1; applySize(); playSound("click"); });
  fullscreenButton.addEventListener("click", async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch { showToast("Trình duyệt không cho phép toàn màn hình"); }
  });
  document.addEventListener("fullscreenchange", () => {
    fullscreenButton.querySelector("[data-label]").textContent = document.fullscreenElement ? "Thoát" : "Toàn màn hình";
  });
  restartButton.addEventListener("click", () => window.location.reload());
  document.addEventListener("click", (event) => { if (event.target.closest("button") && !event.target.closest("#brianStart")) playSound("click"); }, true);

  const observer = new MutationObserver((records) => {
    let shouldCheck = false;
    records.forEach((record) => {
      const targets = [];
      if (record.type === "attributes") targets.push(record.target);
      record.addedNodes && record.addedNodes.forEach((node) => { if (node.nodeType === 1) targets.push(node); });
      targets.forEach((target) => {
        const elements = [target].concat(Array.from(target.querySelectorAll ? target.querySelectorAll(".correct,.wrong") : []));
        elements.forEach((element) => {
          if (element.classList && element.classList.contains("correct") && !element.dataset.brianCorrectSound) {
            element.dataset.brianCorrectSound = "1"; playSound("correct");
          }
          if (element.classList && element.classList.contains("wrong") && !element.dataset.brianWrongSound) {
            element.dataset.brianWrongSound = "1"; playSound("wrong");
          }
        });
      });
      shouldCheck = true;
    });
    if (shouldCheck) setTimeout(checkCompletion, 120);
  });
  observer.observe(stage, { subtree:true, childList:true, attributes:true, attributeFilter:["class","data-done"] });
})();`;

  const buildHtml = async (options = {}) => {
    const raw = String(document.querySelector("#contentInput")?.value || "").trim();
    const templateId = selectedTemplate?.id || "activity";
    const templateName = selectedTemplate?.name || "Brian Activity";
    const title = String(options.titleOverride || templateName).trim();
    const [appSource, extraSource] = await Promise.all([
      readSource("app.js"),
      readSource("extra-games.js")
    ]);
    const script = `${stripBuilderStartup(appSource)}\n${extraSource}\n${buildBootstrap(templateId, raw, title)}\n${EXPERIENCE_RUNTIME}`;
    new Function(script);
    const activityCss = typeof EXPORT_CSS !== "undefined"
      ? EXPORT_CSS
      : "body{font-family:system-ui,sans-serif;margin:0}.activity-stage{background:#fff;border-radius:20px;padding:22px}";
    const safeTitle = escapeHtml(title);
    const safeTemplate = escapeHtml(templateName);
    const logo = BRAND_LOGO;

    return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
  <meta name="color-scheme" content="light">
  <meta name="theme-color" content="#123c69">
  <meta name="description" content="Hoạt động tương tác được tạo bằng Brian TextLab Activities">
  <title>${safeTitle} · Brian English Studio</title>
  <style>${escapeInlineStyle(activityCss)}\n${escapeInlineStyle(PREMIUM_CSS)}</style>
</head>
<body>
  <div class="brian-export-app" data-motion="on">
    <header class="brian-topbar">
      <div class="brian-brand">${logo}<div class="brian-brand-copy"><strong>Brian English Studio</strong><span>Teach Smarter · Learn Better</span></div></div>
      <div class="brian-toolbar" aria-label="Tùy chỉnh hoạt động">
        <button class="brian-tool" id="brianSound" type="button" aria-pressed="true"><span data-icon>🔊</span><span class="brian-tool-label" data-label>Âm thanh</span></button>
        <button class="brian-tool" id="brianMotion" type="button" aria-pressed="true"><span>✨</span><span class="brian-tool-label" data-label>Hiệu ứng</span></button>
        <label><span class="brian-tool-label" style="position:absolute;clip:rect(0 0 0 0)">Font chữ</span><select class="brian-select" id="brianFont" aria-label="Font chữ"><option value="modern">Modern</option><option value="arial">Arial</option><option value="verdana">Verdana</option><option value="trebuchet">Trebuchet</option><option value="georgia">Georgia</option></select></label>
        <span class="brian-size-group" aria-label="Cỡ chữ"><button class="brian-tool" id="brianSizeDown" type="button" aria-label="Giảm cỡ chữ">A−</button><span class="brian-size-value" id="brianSizeValue">100%</span><button class="brian-tool" id="brianSizeUp" type="button" aria-label="Tăng cỡ chữ">A＋</button></span>
        <button class="brian-tool" id="brianRestart" type="button"><span>↻</span><span class="brian-tool-label">Chơi lại</span></button>
        <button class="brian-tool is-accent" id="brianFullscreen" type="button"><span>⛶</span><span class="brian-tool-label" data-label>Toàn màn hình</span></button>
      </div>
    </header>

    <main class="brian-main">
      <div class="brian-activity-heading">
        <div><span class="brian-kicker">Interactive Learning Activity</span><h1 class="brian-title">${safeTitle}</h1></div>
        <span class="brian-template-pill">${safeTemplate}</span>
      </div>
      <section class="brian-stage-card" aria-label="Nội dung hoạt động"><div class="activity-stage" id="stage" tabindex="-1" aria-live="polite"></div></section>
    </main>

    <footer class="brian-footer"><div class="brian-footer-brand">${logo}<span>Created with <strong>Brian TextLab Activities</strong></span></div><span>Hoạt động tự chứa · Chạy trực tiếp không cần Internet</span></footer>
  </div>

  <div class="brian-welcome" id="brianWelcome" role="dialog" aria-modal="true" aria-labelledby="brianWelcomeTitle">
    <div class="brian-welcome-card">
      <div class="brian-welcome-logo">${logo}</div>
      <span class="brian-welcome-eyebrow">Brian English Studio</span>
      <h1 id="brianWelcomeTitle">${safeTitle}</h1>
      <p>${safeTemplate} · Hoạt động tương tác có hiệu ứng, âm thanh và tùy chỉnh hiển thị.</p>
      <button class="brian-start-button" id="brianStart" type="button"><span>▶</span> Bắt đầu hoạt động</button>
      <small class="brian-welcome-note">Bạn có thể đổi cỡ chữ, font, âm thanh và chế độ toàn màn hình bất cứ lúc nào.</small>
    </div>
  </div>
  <div class="brian-confetti" id="brianConfetti" aria-hidden="true"></div>
  <div class="brian-toast" id="brianToast" role="status" aria-live="polite"></div>
  <script>${escapeInlineScript(script)}<\/script>
</body>
</html>`;
  };

  const validate = (html) => new Promise((resolve, reject) => {
    const frame = document.createElement("iframe");
    frame.style.cssText = "position:fixed;width:2px;height:2px;opacity:0;pointer-events:none;left:-9999px;top:-9999px";
    let settled = false;
    const finish = (error) => {
      if (settled) return;
      settled = true;
      frame.remove();
      error ? reject(error) : resolve();
    };
    const timeout = setTimeout(() => finish(new Error("Bản HTML không khởi động đúng thời gian.")), 7000);
    frame.addEventListener("load", () => {
      setTimeout(() => {
        try {
          const doc = frame.contentDocument;
          const stage = doc?.querySelector("#stage");
          const errorBox = stage?.querySelector("[data-offline-error]");
          const ready = doc?.documentElement?.dataset?.offlineReady;
          const toolbar = doc?.querySelector("#brianSound");
          const welcome = doc?.querySelector("#brianWelcome");
          clearTimeout(timeout);
          if (errorBox) return finish(new Error(errorBox.textContent.trim()));
          if (!stage || ready !== "true" || (!stage.children.length && !stage.textContent.trim())) return finish(new Error("Bản HTML vẫn tạo ra vùng hoạt động trống."));
          if (!toolbar || !welcome) return finish(new Error("Giao diện thương hiệu hoặc thanh tùy chỉnh chưa được đóng gói đầy đủ."));
          finish();
        } catch (error) {
          clearTimeout(timeout);
          finish(error);
        }
      }, 600);
    }, { once: true });
    frame.srcdoc = html;
    document.body.appendChild(frame);
  });

  const buildVerifiedHtml = async (options = {}) => {
    const html = await buildHtml(options);
    await validate(html);
    return html;
  };

  window.BrianTextLabExport = Object.freeze({
    buildHtml,
    validate,
    buildVerifiedHtml,
    safeFilename,
  });

  button.addEventListener("click", async (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const input = document.querySelector("#contentInput");
    if (!input?.value.trim()) return notify("Hãy nhập nội dung trước khi tải hoạt động.", "error");

    const original = button.textContent;
    button.disabled = true;
    button.textContent = "Đang dựng giao diện, âm thanh và hiệu ứng...";
    try {
      const html = await buildVerifiedHtml();
      const filename = `brian-${safeFilename(selectedTemplate?.name || selectedTemplate?.id)}.html`;
      const blob = new Blob(["\uFEFF", html], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1500);
      notify(`Đã tải ${filename}. File có logo, hiệu ứng, âm thanh và tùy chỉnh hiển thị.`);
    } catch (error) {
      console.error("Premium HTML export failed", error);
      notify(`Chưa thể tạo HTML: ${error.message || "lỗi không xác định"}.`, "error");
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }, true);
})();
