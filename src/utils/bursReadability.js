import { FONT_SCALE_OPTIONS, normalizeFontScale } from './fontScale.js';

const STYLE_ID = 'bes-burs-shadow-style';
const DOCUMENT_STYLE_ID = 'bes-burs-document-style';
const MIN_TEXT_PX = 14;
const MIN_CONTROL_PX = 15;
const MOBILE_MIN_WIDTH = 700;
const meaningfulPattern = /[\p{L}\p{N}]/u;
const controlSelector = 'button,input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]):not([type="file"]),textarea,select,option,[role="button"],[role="tab"],[role="menuitem"],a[href]';
const cardSelector = [
  '.card', '.panel', '.tile', '.surface', '.metric', '.widget',
  '.settings-m3-card', '.department-v40-card', '.hrp-card', '.library-section', '.admin-v41-panel',
  '.document-paper', '.ai-output-card', '.modal', '.drawer', '.sheet',
  '[class$="-card"]', '[class*="-card "]',
  '[class$="-panel"]', '[class*="-panel "]',
  '[class$="-tile"]', '[class*="-tile "]',
  '[class$="-surface"]', '[class*="-surface "]',
  '[class$="-metric"]', '[class*="-metric "]',
  '[class$="-widget"]', '[class*="-widget "]',
].join(',');
const metricCardPattern = /(^|\s|[-_])(metric|stat|kpi|summary)([-_]|\s|$)/i;

const globalTypographyCss = `
html[data-burs="comfortable"]{
  --brian-font-display:clamp(3rem,4.5vw,4rem);
  --brian-font-page-title:clamp(2.25rem,3.2vw,2.75rem);
  --brian-font-section-title:clamp(1.375rem,1.8vw,1.625rem);
  --brian-font-card-title:clamp(1.125rem,1.35vw,1.3125rem);
  --brian-font-body-lg:1.125rem;
  --brian-font-body:1rem;
  --brian-font-support:.9375rem;
  --brian-font-label:.875rem;
  --brian-font-caption:.875rem;
  --brian-font-control:1rem;
  --brian-font-kpi:clamp(2.125rem,3vw,2.625rem);
  --brian-font-learning-title:clamp(1.75rem,3vw,2.5rem);
  --brian-font-learning-question:clamp(1.1875rem,1.8vw,1.375rem);
  --brian-line-body:1.62;
  --brian-line-support:1.48;
  --brian-touch-size:2.75rem;
  --brian-control-height:3.25rem;
  --brian-card-title-size:var(--brian-font-card-title);
  --brian-card-body-size:var(--brian-font-body);
  --brian-card-support-size:var(--brian-font-support);
  --brian-card-meta-size:var(--brian-font-label);
  --brian-card-action-size:var(--brian-font-support);
  --brian-card-value-size:var(--brian-font-kpi);
  text-rendering:optimizeLegibility;
  -webkit-text-size-adjust:100%;
}
html[data-burs="comfortable"] body,
html[data-burs="comfortable"] .app-shell{
  font-size:var(--brian-font-body);
  line-height:var(--brian-line-body);
}
html[data-burs="comfortable"] :where(p,li,dd,dt,td,th){line-height:var(--brian-line-body)}
html[data-burs="comfortable"] .app-shell :where(h1,.page-title,[class$="-page-title"],[class*="-page-title "]){font-size:var(--brian-font-page-title)!important;line-height:1.1!important;letter-spacing:-.035em}
html[data-burs="comfortable"] .app-shell :where(.hero h1,[class$="-hero"] h1,[class*="-hero "] h1,[class$="-display"],[class*="-display "]){font-size:var(--brian-font-display)!important;line-height:1.08!important;letter-spacing:-.04em}
html[data-burs="comfortable"] .app-shell :where(h2,.section-title,[class$="-section-title"],[class*="-section-title "]){font-size:var(--brian-font-section-title)!important;line-height:1.18!important;letter-spacing:-.018em}
html[data-burs="comfortable"] .app-shell :where(h3){font-size:var(--brian-font-card-title)!important;line-height:1.25!important}
html[data-burs="comfortable"] .app-shell :where(h4){font-size:1.125rem!important;line-height:1.3!important}
html[data-burs="comfortable"] .app-shell :where(.page-lead,[class$="-lead"],[class*="-lead "],.hero p,[class$="-hero"] p,[class*="-hero "] p){font-size:var(--brian-font-body-lg)!important;line-height:1.58!important}

.burs-card-typography{
  --burs-card-title-size:var(--brian-card-title-size,var(--brian-font-card-title,1.25rem));
  --burs-card-body-size:var(--brian-card-body-size,var(--brian-font-body,1rem));
  --burs-card-support-size:var(--brian-card-support-size,var(--brian-font-support,.9375rem));
  --burs-card-meta-size:var(--brian-card-meta-size,var(--brian-font-label,.875rem));
  --burs-card-action-size:var(--brian-card-action-size,var(--brian-font-support,.9375rem));
  --burs-card-value-size:var(--brian-card-value-size,var(--brian-font-kpi,2.25rem));
  text-rendering:optimizeLegibility;
}
.burs-card-typography>:where(header,[class$="-header"],[class*="-header "]) :where(h2,h3,h4,[class$="-title"],[class*="-title "]),
.burs-card-typography>:where(h2,h3,h4,[class$="-title"],[class*="-title "]){font-size:var(--burs-card-title-size)!important;line-height:1.24!important;letter-spacing:-.012em}
.burs-card-typography :where(p,li,dd,[class$="-body-text"],[class*="-body-text "]){font-size:var(--burs-card-body-size)!important;line-height:1.58!important}
.burs-card-typography :where(small,[class$="-subtitle"],[class*="-subtitle "],[class$="-description"],[class*="-description "],[class$="-support"],[class*="-support "]){font-size:var(--burs-card-support-size)!important;line-height:1.48!important}
.burs-card-typography :where(.eyebrow,.kicker,[class$="-eyebrow"],[class*="-eyebrow "],[class$="-kicker"],[class*="-kicker "],[class$="-meta"],[class*="-meta "],[class$="-label"],[class*="-label "],[class$="-badge"],[class*="-badge "],[class$="-chip"],[class*="-chip "],[class*="status-pill"],[class*="count-pill"]){font-size:var(--burs-card-meta-size)!important;line-height:1.4!important}
.burs-card-typography :where(button,[role="button"],a[class*="btn"],a[class*="button"]){font-size:var(--burs-card-action-size)!important;line-height:1.3!important}
.burs-card-typography.burs-metric-card :where(strong,[class$="-value"],[class*="-value "]){font-size:var(--burs-card-value-size)!important;line-height:1.05!important;letter-spacing:-.025em}

html[data-burs="comfortable"] .app-shell :where(label,[class$="-field"]>span,[class*="-field "]>span,[class$="-label"],[class*="-label "]){font-size:var(--brian-font-support)!important;line-height:1.4!important}
html[data-burs="comfortable"] .app-shell :where(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]),textarea,select,option){font-size:var(--brian-font-control)!important;line-height:1.45!important}
html[data-burs="comfortable"] .app-shell :where(input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="color"]),textarea,select){min-height:var(--brian-control-height);padding:.75rem 1rem}
html[data-burs="comfortable"] .app-shell :where(.helper-text,[class$="-helper"],[class*="-helper "],[class$="-error"],[class*="-error "]){font-size:var(--brian-font-label)!important;line-height:1.45!important}
html[data-burs="comfortable"] .app-shell :where(button:not([class*="icon"]),[role="button"]:not([class*="icon"]),a[class*="btn"],a[class*="button"]){font-size:var(--brian-font-support)!important;line-height:1.3!important;min-height:var(--brian-touch-size)}
html[data-burs="comfortable"] .app-shell :where([class*="primary-button"],[class*="filled-button"],[class*="button-primary"]){font-size:var(--brian-font-body)!important}

html[data-burs="comfortable"] .app-shell :where(nav,[role="navigation"],[class*="navigation"],[class*="sidebar"],[class*="menu"]){font-size:var(--brian-font-support)}
html[data-burs="comfortable"] .app-shell :where(nav,[role="navigation"],[class*="navigation"],[class*="sidebar"],[class*="menu"]) :where(a,button,[role="menuitem"],[role="tab"]){font-size:var(--brian-font-support)!important;line-height:1.35!important}
html[data-burs="comfortable"] .app-shell :where([class$="-nav-group"],[class*="-nav-group "],[class$="-menu-group"],[class*="-menu-group "])> :where(span,strong,small){font-size:var(--brian-font-label)!important}

html[data-burs="comfortable"] .app-shell :where(table){font-size:var(--brian-font-support)!important}
html[data-burs="comfortable"] .app-shell :where(th){font-size:var(--brian-font-label)!important;line-height:1.4!important}
html[data-burs="comfortable"] .app-shell :where(td){font-size:var(--brian-font-support)!important;line-height:1.5!important}
html[data-burs="comfortable"] .app-shell :where(th,td){padding:.75rem .875rem}
html[data-burs="comfortable"] .app-shell :where([class*="table-wrap"],[class*="table-scroll"],[class*="data-grid"]){overflow-x:auto;-webkit-overflow-scrolling:touch}

html[data-burs="comfortable"] :where(dialog,[role="dialog"],.modal,[class$="-modal"],[class*="-modal "],.drawer,[class$="-drawer"],[class*="-drawer "],.sheet,[class$="-sheet"],[class*="-sheet "]) :where(h1,h2,h3,[class$="-title"],[class*="-title "]){font-size:clamp(1.25rem,2vw,1.625rem)!important;line-height:1.22!important}
html[data-burs="comfortable"] :where(dialog,[role="dialog"],.modal,[class$="-modal"],[class*="-modal "],.drawer,[class$="-drawer"],[class*="-drawer "],.sheet,[class$="-sheet"],[class*="-sheet "]) :where(p,li,dd){font-size:var(--brian-font-body)!important;line-height:1.58!important}
html[data-burs="comfortable"] :where(.toast,[class$="-toast"],[class*="-toast "],.alert,[class$="-alert"],[class*="-alert "],.notice,[class$="-notice"],[class*="-notice "],.banner,[class$="-banner"],[class*="-banner "]) :where(strong){font-size:var(--brian-font-body)!important;line-height:1.4!important}
html[data-burs="comfortable"] :where(.toast,[class$="-toast"],[class*="-toast "],.alert,[class$="-alert"],[class*="-alert "],.notice,[class$="-notice"],[class*="-notice "],.banner,[class$="-banner"],[class*="-banner "]) :where(p,span,small){font-size:var(--brian-font-support)!important;line-height:1.48!important}

html[data-burs="comfortable"] .app-shell :where([class*="calendar"],[class*="schedule"],[class*="timetable"]) :where([class*="event"] strong,[class*="item"] strong){font-size:var(--brian-font-body)!important;line-height:1.4!important}
html[data-burs="comfortable"] .app-shell :where([class*="calendar"],[class*="schedule"],[class*="timetable"]) :where(small,[class*="time"],[class*="date"],[class*="source"]){font-size:var(--brian-font-label)!important;line-height:1.4!important}

html[data-burs="comfortable"] .app-shell :where(.lesson,.worksheet,.exercise,.quiz,.practice,[class$="-lesson"],[class*="-lesson "],[class$="-worksheet"],[class*="-worksheet "],[class$="-exercise"],[class*="-exercise "],[class$="-quiz"],[class*="-quiz "],[class$="-practice"],[class*="-practice "]) :where(h1,h2,[class*="activity-title"]){font-size:var(--brian-font-learning-title)!important;line-height:1.18!important}
html[data-burs="comfortable"] .app-shell :where(.lesson,.worksheet,.exercise,.quiz,.practice,[class$="-lesson"],[class*="-lesson "],[class$="-worksheet"],[class*="-worksheet "],[class$="-exercise"],[class*="-exercise "],[class$="-quiz"],[class*="-quiz "],[class$="-practice"],[class*="-practice "]) :where([class*="instruction"],[class*="question"],.prompt){font-size:var(--brian-font-learning-question)!important;line-height:1.55!important}
html[data-burs="comfortable"] .app-shell :where(.lesson,.worksheet,.exercise,.quiz,.practice,[class$="-lesson"],[class*="-lesson "],[class$="-worksheet"],[class*="-worksheet "],[class$="-exercise"],[class*="-exercise "],[class$="-quiz"],[class*="-quiz "],[class$="-practice"],[class*="-practice "]) :where([class*="answer"],[class*="option"],label){font-size:var(--brian-font-body-lg)!important;line-height:1.5!important}
html[data-burs="comfortable"] .app-shell :where(.document-paper,.reading-content,.report-content,[class*="document"],[class*="report"]) :where(p,li){font-size:var(--brian-font-body-lg)!important;line-height:1.72!important}

html[data-burs="comfortable"] .burs-readable-text{font-size:var(--brian-font-label)!important;line-height:1.45!important}
html[data-burs="comfortable"] .burs-readable-control{font-size:var(--brian-font-support)!important;min-height:var(--brian-touch-size)}
html[data-burs="comfortable"] .burs-layout-safe{min-width:0!important;max-width:100%}

html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-hero-copy>span,.gpl-eyebrow){font-size:var(--brian-font-label)!important;line-height:1.35!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] .gd-hero-copy h1{font-size:var(--brian-font-display)!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-hero-copy p,.gpl-title-group p){font-size:var(--brian-font-body-lg)!important;line-height:1.55!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-button,.gd-text-button,.gd-quick-action,.gpl-button,.gpl-edit-button,.gpl-filter-chip){font-size:var(--brian-font-support)!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-metric-copy>span,.gpl-metric small){font-size:var(--brian-font-support)!important;line-height:1.4!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-metric-copy strong,.gpl-metric strong){font-size:var(--brian-font-kpi)!important;line-height:1.05!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-metric-copy small,.gd-alert small,.gd-calendar-title p,.gd-surface-heading p,.gd-calendar-toolbar span:not(.gd-count-chip),.gd-row-copy small,.gd-tile-copy small,.gd-empty p,.gpl-result-count,.gpl-inline-alert,.gpl-missing-banner small){font-size:var(--brian-font-label)!important;line-height:1.45!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-calendar-title h2,.gd-surface-heading h2,.gpl-title-group h2){font-size:var(--brian-font-section-title)!important;line-height:1.22!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-calendar-toolbar strong,.gd-agenda>header h3,.gd-selected-day h3,.gd-row-copy strong,.gd-tile-copy strong,.gd-event-copy strong,.gpl-person-row strong,.gpl-person-row b){font-size:var(--brian-font-body)!important;line-height:1.35!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-count-chip,.gd-status-chip,.gd-day>span,.gd-day>small,.gd-day>em,.gd-selected-day>span,.gd-selected-day>div span,.gd-agenda>header>div>span,.gd-event-time small,.gd-event-copy small,.gd-homeroom span,.gpl-filter-chip,.gpl-table-head,.gpl-person-row small,.gpl-status,.gpl-missing-banner strong,.gpl-missing-banner b){font-size:var(--brian-font-label)!important;line-height:1.4!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gd-event-time strong,.gd-selected-day p,.gd-event-copy p,.gpl-search input){font-size:var(--brian-font-support)!important;line-height:1.48!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] .gpl-profile-hero h3{font-size:1.5rem!important;line-height:1.2!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gpl-drawer-header>span,.gpl-profile-content h4,.gpl-form h4){font-size:var(--brian-font-body)!important;line-height:1.35!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gpl-profile-hero p,.gpl-save-notice,.gpl-profile-content dd,.gpl-other-degrees p,.gpl-form input,.gpl-form select,.gpl-form textarea){font-size:var(--brian-font-support)!important;line-height:1.48!important}
html[data-burs="comfortable"] .app-shell[data-route="dashboard"] :where(.gpl-profile-content dt,.gpl-account-note,.gpl-other-degrees>span,.gpl-form label>span){font-size:var(--brian-font-label)!important;line-height:1.42!important}

html[data-typography-mode="projector"] .app-shell :where(.lesson,.worksheet,.exercise,.quiz,.practice,[class*="lesson"],[class*="worksheet"],[class*="exercise"],[class*="quiz"],[class*="practice"]) :where([class*="instruction"],[class*="question"],.prompt){font-size:clamp(1.5rem,2.6vw,2rem)!important}
html[data-typography-mode="projector"] .app-shell :where(.lesson,.worksheet,.exercise,.quiz,.practice,[class*="lesson"],[class*="worksheet"],[class*="exercise"],[class*="quiz"],[class*="practice"]) :where([class*="answer"],[class*="option"],label){font-size:clamp(1.375rem,2.2vw,1.75rem)!important}

@media(max-width:699px){
  html[data-burs="comfortable"]{--brian-font-display:clamp(2.125rem,10vw,2.5rem);--brian-font-page-title:clamp(1.875rem,8vw,2.125rem);--brian-font-section-title:clamp(1.25rem,5.8vw,1.5rem);--brian-font-card-title:1.125rem;--brian-font-kpi:clamp(1.875rem,9vw,2.25rem)}
  html[data-burs="comfortable"] .app-shell :where([class*="table-wrap"],[class*="table-scroll"],[class*="data-grid"]){max-width:100%;overflow-x:auto}
  html[data-burs="comfortable"] .app-shell :where(.burs-card-typography){min-width:0}
}
@media(max-width:420px){
  html[data-burs="comfortable"]{--brian-font-display:2.125rem;--brian-font-page-title:1.875rem;--brian-font-section-title:1.25rem}
}
`;

const shadowTypographyCss = `
:host{
  --brian-font-display:clamp(3rem,4.5vw,4rem);
  --brian-font-page-title:clamp(2.25rem,3.2vw,2.75rem);
  --brian-font-section-title:clamp(1.375rem,1.8vw,1.625rem);
  --brian-font-card-title:clamp(1.125rem,1.35vw,1.3125rem);
  --brian-font-body-lg:1.125rem;
  --brian-font-body:1rem;
  --brian-font-support:.9375rem;
  --brian-font-label:.875rem;
  --brian-font-control:1rem;
  --brian-font-kpi:clamp(2.125rem,3vw,2.625rem);
  --brian-touch-size:2.75rem;
  --brian-control-height:3.25rem;
  --brian-card-title-size:var(--brian-font-card-title);
  --brian-card-body-size:var(--brian-font-body);
  --brian-card-support-size:var(--brian-font-support);
  --brian-card-meta-size:var(--brian-font-label);
  --brian-card-action-size:var(--brian-font-support);
  --brian-card-value-size:var(--brian-font-kpi);
}
:host,*{text-rendering:optimizeLegibility}
:host{font-size:inherit;line-height:1.62}
h1,.page-title,[class$="-page-title"],[class*="-page-title "]{font-size:var(--brian-font-page-title)!important;line-height:1.1!important}
h2,[class$="-section-title"],[class*="-section-title "]{font-size:var(--brian-font-section-title)!important;line-height:1.18!important}
h3{font-size:var(--brian-font-card-title)!important;line-height:1.25!important}
button,input,textarea,select,option,[role="button"],[role="tab"]{font-size:var(--brian-font-control)!important}
button,[role="button"],[role="tab"]{min-height:var(--brian-touch-size)}
input:not([type="checkbox"]):not([type="radio"]):not([type="range"]),textarea,select{min-height:var(--brian-control-height);padding:.75rem 1rem;border-radius:.875rem}
small,.burs-readable-text,.kicker,.eyebrow,.badge,[class$="-badge"],[class*="-badge "],[class$="-chip"],[class*="-chip "]{font-size:var(--brian-font-label)!important;line-height:1.45!important}
.burs-readable-control{font-size:var(--brian-font-support)!important;min-height:var(--brian-touch-size)}
.card,.panel,.workspace-page,.change-list,.review-pane,.document-paper,.ai-output-card,.modal{border-radius:1.125rem}
.workspace-large-display .document-paper p,.document-paper p,.review-content p{font-size:var(--brian-font-body-lg)!important;line-height:1.72!important}
.change-scroll strong{font-size:var(--brian-font-body)!important}.change-scroll small,.change-scroll em{font-size:var(--brian-font-label)!important}
.pane-heading h2{font-size:var(--brian-font-section-title)!important}.proposal-metadata span{font-size:var(--brian-font-label)!important}.proposal-metadata strong{font-size:var(--brian-font-support)!important}
.ai-action-grid strong{font-size:1.0625rem!important}.ai-action-grid small,.ai-run-row small,.ai-provider-status small{font-size:var(--brian-font-label)!important}
.ai-prompt-field textarea{font-size:var(--brian-font-body)!important;min-height:8rem}
${globalTypographyCss.replaceAll('html[data-burs="comfortable"] .app-shell ', '').replaceAll('html[data-burs="comfortable"] ', '').replaceAll('html[data-burs="comfortable"]', ':host')}
@media(max-width:1180px){.workspace-layout{grid-template-columns:18.75rem minmax(0,1fr)!important}.review-pane{width:min(31rem,60vw)}.ai-action-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:760px){.workspace-layout{grid-template-columns:6.5rem minmax(0,1fr)!important}.review-pane{width:92vw}.ai-action-grid{grid-template-columns:1fr!important}}
`;

const documentCss = globalTypographyCss;
const shadowCss = shadowTypographyCss;

function directText(element) {
  return Array.from(element.childNodes || [])
    .filter((node) => node.nodeType === Node.TEXT_NODE)
    .map((node) => node.textContent || '')
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isMeaningful(element) {
  if (!element || element.matches?.('script,style,svg,path,canvas,video,audio,br,hr')) return false;
  if (element.getAttribute?.('aria-hidden') === 'true' || element.hasAttribute?.('data-burs-skip')) return false;
  const text = directText(element);
  return text.length >= 2 && meaningfulPattern.test(text);
}

function readAppearanceState() {
  try { return JSON.parse(localStorage.getItem('bes-appearance-v2') || '{}') || {}; } catch { return {}; }
}

function readRequestedScale() {
  const stored = Number(localStorage.getItem('bes-font-scale'));
  if (FONT_SCALE_OPTIONS.includes(stored)) return stored;
  const appearance = readAppearanceState();
  if (appearance.projector) return 135;
  return normalizeFontScale(appearance.textScale, 100);
}

function typographyMode(scale) {
  if (scale >= 135) return 'projector';
  if (scale >= 120) return 'xlarge';
  if (scale >= 110) return 'large';
  if (scale <= 90) return 'compact';
  return 'standard';
}

function applyTypographyScale(value, { persist = false } = {}) {
  const requested = normalizeFontScale(value, readRequestedScale());
  const mobile = window.matchMedia?.(`(max-width:${MOBILE_MIN_WIDTH - 1}px)`)?.matches;
  const effective = mobile && requested < 100 ? 100 : requested;
  const root = document.documentElement;
  root.dataset.fontScaleRequested = String(requested);
  root.dataset.fontScale = String(effective);
  root.dataset.typographyMode = typographyMode(requested);
  root.dataset.brianTypography = 'v1';
  root.style.fontSize = `${effective}%`;
  root.style.setProperty('--brian-font-scale-factor', String(effective / 100));
  if (persist) {
    try { localStorage.setItem('bes-font-scale', String(requested)); } catch { /* optional */ }
  }
  return { requested, effective };
}

function writeAppearanceScale(scale) {
  const current = readAppearanceState();
  const next = { ...current, textScale: scale, projector: scale === 135, updatedAt: Date.now() };
  try { localStorage.setItem('bes-appearance-v2', JSON.stringify(next)); } catch { /* optional */ }
  window.dispatchEvent(new CustomEvent('bes:appearance-changed', { detail: { state: next } }));
}

function enhanceFontScaleControls() {
  const container = document.querySelector('.brian-nav__font-options');
  if (!container) return;
  const requested = Number(document.documentElement.dataset.fontScaleRequested || readRequestedScale());
  const labels = new Map(Array.from(container.querySelectorAll('button')).map((button) => [Number.parseInt(button.textContent || '', 10), button]));
  const orderedButtons = FONT_SCALE_OPTIONS.map((scale) => {
    let button = labels.get(scale);
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.textContent = `${scale}%`;
      button.dataset.bursFontScale = String(scale);
      button.addEventListener('click', () => {
        applyTypographyScale(scale, { persist: true });
        writeAppearanceScale(scale);
        enhanceFontScaleControls();
      });
      labels.set(scale, button);
    }
    button.classList.toggle('is-selected', scale === requested);
    button.setAttribute('aria-pressed', String(scale === requested));
    return button;
  });

  const currentButtons = Array.from(container.querySelectorAll(':scope > button'));
  const orderChanged = currentButtons.length !== orderedButtons.length
    || currentButtons.some((button, index) => button !== orderedButtons[index]);
  if (orderChanged) container.replaceChildren(...orderedButtons);
}

function applyElementRules(element) {
  if (!(element instanceof Element)) return;
  if (element.matches(cardSelector) && !element.matches('svg,path,input,textarea,select,option')) {
    element.classList.add('burs-card-typography');
    if (metricCardPattern.test(element.className || '')) element.classList.add('burs-metric-card');
  }
  if (element.matches(controlSelector)) {
    const size = Number.parseFloat(getComputedStyle(element).fontSize || '0');
    if (size && size < MIN_CONTROL_PX) element.classList.add('burs-readable-control');
  }
  if (isMeaningful(element)) {
    const size = Number.parseFloat(getComputedStyle(element).fontSize || '0');
    if (size && size < MIN_TEXT_PX) element.classList.add('burs-readable-text');
  }
  if (element.scrollWidth > element.clientWidth + 2 && !element.matches('pre,code,table,textarea,input')) {
    element.classList.add('burs-layout-safe');
  }
}

function ensureDocumentStyle() {
  let style = document.getElementById(DOCUMENT_STYLE_ID);
  if (!style) {
    style = document.createElement('style');
    style.id = DOCUMENT_STYLE_ID;
    style.dataset.styleId = DOCUMENT_STYLE_ID;
    style.textContent = documentCss;
  }
  if (document.head?.lastElementChild !== style) document.head?.append(style);
}

function ensureShadowStyle(root) {
  if (!(root instanceof ShadowRoot)) return;
  let style = root.querySelector(`style[data-style-id="${STYLE_ID}"]`);
  if (!style) {
    style = document.createElement('style');
    style.dataset.styleId = STYLE_ID;
    style.textContent = shadowCss;
    root.prepend(style);
  }
}

function scanRoot(root) {
  if (!root) return;
  if (root instanceof Document) {
    ensureDocumentStyle();
    enhanceFontScaleControls();
  }
  if (root instanceof ShadowRoot) ensureShadowStyle(root);
  const start = root instanceof Document ? root.documentElement : root;
  if (start instanceof Element) applyElementRules(start);
  const walker = document.createTreeWalker(start, NodeFilter.SHOW_ELEMENT);
  let node = walker.nextNode();
  while (node) {
    applyElementRules(node);
    if (node.shadowRoot) scanRoot(node.shadowRoot);
    node = walker.nextNode();
  }
}

export function installBursReadability() {
  if (typeof window === 'undefined' || window.__BURS_READABILITY_INSTALLED__) return;
  window.__BURS_READABILITY_INSTALLED__ = true;
  document.documentElement.dataset.burs = 'comfortable';
  ensureDocumentStyle();
  applyTypographyScale(readRequestedScale());

  let frame = 0;
  const schedule = (root = document) => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => {
      frame = 0;
      try { scanRoot(root); } catch (error) { console.warn('[BURS] readability scan skipped', error); }
    });
  };

  const observer = new MutationObserver((mutations) => {
    const root = mutations.find((mutation) => mutation.addedNodes?.length)?.target?.getRootNode?.() || document;
    schedule(root instanceof ShadowRoot ? root : document);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });

  const onFontScale = (event) => {
    const stored = readRequestedScale();
    const requested = normalizeFontScale(event?.detail?.scale, stored);
    applyTypographyScale(requested, { persist: true });
    schedule(document);
  };
  const onAppearance = (event) => {
    const state = event?.detail?.state || readAppearanceState();
    const requested = state.projector ? 135 : normalizeFontScale(state.textScale, readRequestedScale());
    applyTypographyScale(requested, { persist: true });
    schedule(document);
  };
  const onResize = () => applyTypographyScale(readRequestedScale());

  window.addEventListener('hashchange', () => schedule(document));
  window.addEventListener('bes:font-scale-changed', onFontScale);
  window.addEventListener('bes:appearance-changed', onAppearance);
  window.addEventListener('bes:appearance-ready', onAppearance);
  window.addEventListener('resize', onResize, { passive: true });
  window.addEventListener('load', () => schedule(document), { once: true });
  schedule(document);

  window.BURS = Object.freeze({
    mode: 'comfortable',
    minTextPx: MIN_TEXT_PX,
    minControlPx: MIN_CONTROL_PX,
    cardTypography: true,
    scales: [...FONT_SCALE_OPTIONS],
    applyScale: (scale) => applyTypographyScale(scale, { persist: true }),
    rescan: () => schedule(document),
  });
}
