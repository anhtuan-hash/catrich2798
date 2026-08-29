import fs from 'node:fs';

const pagePath = 'src/pages/WorkDashboard.jsx';
const oldCssPath = 'src/styles/teacher-dashboard-hero-interactive-2026.css';
const newCssPath = 'src/styles/teacher-dashboard-editorial-hero.css';

let page = fs.readFileSync(pagePath, 'utf8');

const oldImport = "import '../styles/teacher-dashboard-hero-interactive-2026.css';";
const newImport = "import '../styles/teacher-dashboard-editorial-hero.css';";
if (page.includes(oldImport)) page = page.replace(oldImport, newImport);
else if (!page.includes(newImport)) throw new Error('Dashboard hero stylesheet import was not found.');

const illustration = String.raw`function DashboardHeroIllustration() {
  return <svg className="editorial-hero-art" viewBox="0 0 700 430" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id="edCalendarBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#2563eb" /><stop offset="1" stopColor="#0f4fae" /></linearGradient>
      <linearGradient id="edBookBlue" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#3277df" /><stop offset="1" stopColor="#0b4ca7" /></linearGradient>
      <linearGradient id="edPaper" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#f7f9fc" /></linearGradient>
      <filter id="edShadow" x="-30%" y="-30%" width="160%" height="180%"><feDropShadow dx="0" dy="14" stdDeviation="14" floodColor="#102b4d" floodOpacity=".13" /></filter>
    </defs>
    <ellipse cx="405" cy="391" rx="244" ry="24" fill="#c9d4e3" opacity=".34" />
    <circle cx="405" cy="216" r="188" fill="#edf4ff" />
    <g fill="#85afe9" opacity=".72">{[0,1,2,3,4,5].map((row) => [0,1,2,3,4,5].map((col) => <circle key={\`ed-dot-\${row}-\${col}\`} cx={588 + col * 15} cy={80 + row * 15} r="2.25" />))}</g>
    <g filter="url(#edShadow)" transform="translate(278 46)">
      <path d="M30 51 287 65l-7 261-258-12Z" fill="#d8e0ea" opacity=".42" />
      <path d="M18 40 275 54l-7 261-258-12Z" fill="url(#edPaper)" stroke="#cad5e3" strokeWidth="2.4" />
      <path d="M18 40 275 54l-2 60-258-12Z" fill="url(#edCalendarBlue)" />
      {[48,99,150,201,252].map((x) => <g key={x}><line x1={x} y1="13" x2={x - 2} y2="69" stroke="#163d6d" strokeWidth="7" strokeLinecap="round" /><ellipse cx={x - 1} cy="43" rx="7.5" ry="4.5" fill="#eaf2fb" opacity=".9" /></g>)}
      <g stroke="#e2e7ee" strokeWidth="1.4">{[137,174,211,248,285].map((y) => <line key={\`ed-h-\${y}\`} x1="34" y1={y} x2="250" y2={y + 11} />)}{[67,104,141,178,215].map((x) => <line key={\`ed-v-\${x}\`} x1={x} y1="119" x2={x - 5} y2="293" />)}</g>
      <path d="M117 170l12 12 25-28" fill="none" stroke="#2563eb" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M175 224l12 12 25-28" fill="none" stroke="#2563eb" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
    </g>
    <g filter="url(#edShadow)" transform="translate(165 270) rotate(-8 90 54)">
      <rect width="180" height="108" rx="11" fill="url(#edBookBlue)" />
      <path d="M12 92h156" stroke="#77a9ed" strokeWidth="2" opacity=".75" />
      <text x="90" y="48" textAnchor="middle" fill="#fff" fontSize="26" fontWeight="800" fontFamily="Arial, sans-serif">GIÁO ÁN</text>
      <text x="90" y="73" textAnchor="middle" fill="#dceaff" fontSize="13" fontWeight="600" fontFamily="Arial, sans-serif">Tuần 1</text>
    </g>
    <g transform="translate(108 265)">
      <ellipse cx="48" cy="117" rx="45" ry="9" fill="#c9d4e3" opacity=".45" />
      <path d="M17 54h64l-7 64H24Z" fill="#f7f4ed" stroke="#d5d9df" strokeWidth="2" />
      <path d="M31 8v57" stroke="#172f4f" strokeLinecap="round" strokeWidth="7" /><path d="M45 2v63" stroke="#2563eb" strokeLinecap="round" strokeWidth="7" /><path d="M60 11v54" stroke="#eaaa34" strokeLinecap="round" strokeWidth="7" />
    </g>
    <g filter="url(#edShadow)" transform="translate(421 294)">
      <rect x="0" y="15" width="94" height="82" rx="18" fill="#fff" stroke="#d2dbe7" strokeWidth="2" />
      <path d="M93 37h20a18 18 0 0 1 0 36H93" fill="none" stroke="#d2dbe7" strokeWidth="3" />
      <text x="47" y="67" textAnchor="middle" fill="#2563eb" fontSize="24" fontWeight="900" fontFamily="Arial, sans-serif">EH</text>
    </g>
    <g transform="translate(553 273)">
      <rect x="0" y="88" width="102" height="17" rx="8.5" fill="#a8c8ef" />
      <rect x="7" y="71" width="95" height="18" rx="9" fill="#5d97df" />
      <rect x="16" y="54" width="88" height="18" rx="9" fill="#326fc4" />
      <rect x="48" y="7" width="43" height="52" rx="10" fill="#274d79" />
      <path d="M58 18c-14-31-28 1-15 24 9-19 18-16 15-24Zm17 2c10-32 31-10 20 19-11-17-20-10-20-19Zm-5 10c-1-31-25-22-24 6 10-13 18-9 24-6Z" fill="#4ba86b" />
    </g>
    <path d="M160 80l7 16 16 7-16 7-7 16-7-16-16-7 16-7 7-16Z" fill="#fff" opacity=".98" />
  </svg>;
}`;

const illustrationPattern = /function DashboardHeroIllustration\(\) \{[\s\S]*?\n\}\n\nexport default function WorkDashboard/;
if (!illustrationPattern.test(page)) throw new Error('Existing DashboardHeroIllustration block was not found.');
page = page.replace(illustrationPattern, `${illustration}\n\nexport default function WorkDashboard`);

const heroMarkup = String.raw`<header className="editorial-hero">
          <div className="editorial-hero-copy">
            <div className="editorial-hero-meta">
              <span className="editorial-hero-eyebrow"><span aria-hidden="true" />{t.eyebrow}</span>
              <span className="editorial-hero-date">{heroDate}</span>
            </div>

            <div className="editorial-hero-heading">
              <span className="editorial-hero-hello">{t.hello},</span>
              <h1>{name}<span className="editorial-hero-wave" aria-hidden="true">👋</span></h1>
            </div>

            <p className="editorial-hero-lead">{t.lead}</p>

            <div className="editorial-hero-actions">
              <button type="button" className="editorial-primary-action" onClick={scrollToCalendar}><Icon name="calendar" size={20} /><span>{t.calendar}</span><Icon name="arrow" size={18} /></button>
              <button type="button" className="editorial-secondary-action" onClick={() => refresh()} disabled={loading}><Icon name="refresh" size={19} /><span>{loading ? t.refreshing : t.refresh}</span></button>
            </div>

            <div className="editorial-hero-links">
              <button type="button" onClick={focusNearestEvent}><Icon name="event" size={17} /><span>{t.nearest}</span><Icon name="arrow" size={15} /></button>
              <button type="button" onClick={() => openTtcm('schedule')}><Icon name="calendar" size={17} /><span>{t.openCalendar}</span><Icon name="arrow" size={15} /></button>
            </div>
          </div>

          <div className="editorial-hero-stage">
            <div className="editorial-hero-status" aria-label={language === 'vi' ? 'Thông tin nhanh' : 'Quick information'}>
              <button type="button" className="editorial-status-card editorial-status-time" onClick={() => setNow(new Date())} title={t.currentTime}>
                <span className="editorial-status-icon"><Icon name="clock" size={18} /></span>
                <span><small>{t.currentTime}</small><strong>{heroTime}</strong></span>
              </button>
              <button type="button" className="editorial-status-card editorial-status-weather" onClick={refreshWeather} title={t.weather}>
                <span className="editorial-weather-symbol" aria-hidden="true">☀</span>
                <span><small>{weather.loading ? t.weatherLoading : weatherDescription}</small><strong>TP.HCM · {weatherTemperature}</strong></span>
              </button>
            </div>
            <div className="editorial-hero-visual"><DashboardHeroIllustration /></div>
            <button type="button" className="editorial-today-chip" onClick={focusToday} title={t.dateToday}><Icon name="calendar" size={17} /><span>{t.dateToday}</span><strong>{new Intl.DateTimeFormat(locale, { day: '2-digit', month: '2-digit' }).format(now)}</strong></button>
          </div>
        </header>`;

const heroPattern = /<header className="dash-hero">[\s\S]*?<\/header>/;
if (!heroPattern.test(page)) throw new Error('Existing dash-hero markup was not found.');
page = page.replace(heroPattern, heroMarkup);

if (page.includes('className="dash-hero"') || page.includes('dash-hero-left') || page.includes('dash-hero-right')) {
  throw new Error('Legacy dash hero markup remains after replacement.');
}

fs.writeFileSync(pagePath, page, 'utf8');

const css = String.raw`/* Dashboard editorial hero — rebuilt from zero, Aug 2026.
   This namespace intentionally does not reuse any legacy dash-* hero selectors. */

.app-shell[data-route="dashboard"] .gd-top-grid {
  display: block !important;
  width: 100% !important;
  min-width: 0 !important;
}

.app-shell[data-route="dashboard"] .editorial-hero,
.app-shell[data-route="dashboard"] .editorial-hero * {
  box-sizing: border-box;
}

.app-shell[data-route="dashboard"] .editorial-hero {
  --ed-ink: #172033;
  --ed-muted: #687387;
  --ed-blue: #2563eb;
  --ed-blue-deep: #174ea6;
  --ed-line: #dfe5ec;
  --ed-paper: #ffffff;
  --ed-wash: #f4f7fb;
  position: relative;
  isolation: isolate;
  display: grid;
  grid-template-columns: minmax(0, .92fr) minmax(500px, 1.08fr);
  gap: clamp(30px, 5vw, 74px);
  align-items: center;
  width: 100%;
  min-height: 430px;
  margin: 0 0 26px;
  padding: clamp(34px, 4vw, 58px) clamp(34px, 4.7vw, 72px);
  overflow: hidden;
  border: 1px solid #e2e7ed;
  border-radius: 30px;
  background:
    radial-gradient(circle at 84% 18%, rgba(37, 99, 235, .065), transparent 28%),
    linear-gradient(118deg, #fff 0%, #fff 49%, #f8fafc 49.1%, #f4f7fb 100%);
  box-shadow: 0 20px 58px rgba(32, 48, 71, .075);
  color: var(--ed-ink);
}

.app-shell[data-route="dashboard"] .editorial-hero::before {
  content: '';
  position: absolute;
  z-index: -1;
  left: 49%;
  top: -80px;
  width: 1px;
  height: 590px;
  background: linear-gradient(180deg, transparent, #dfe5ec 13%, #dfe5ec 87%, transparent);
  transform: rotate(8deg);
}

.app-shell[data-route="dashboard"] .editorial-hero::after {
  content: 'BRIAN / DASHBOARD';
  position: absolute;
  right: 26px;
  bottom: 18px;
  font: 800 10px/1.2 ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  letter-spacing: .18em;
  color: #a3adbb;
}

.app-shell[data-route="dashboard"] .editorial-hero-copy {
  position: relative;
  z-index: 2;
  min-width: 0;
  max-width: 650px;
}

.app-shell[data-route="dashboard"] .editorial-hero-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  margin-bottom: 30px;
}

.app-shell[data-route="dashboard"] .editorial-hero-eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  color: var(--ed-blue-deep);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.app-shell[data-route="dashboard"] .editorial-hero-eyebrow > span {
  width: 32px;
  height: 2px;
  border-radius: 999px;
  background: var(--ed-blue);
}

.app-shell[data-route="dashboard"] .editorial-hero-date {
  color: #8a95a7;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .02em;
}

.app-shell[data-route="dashboard"] .editorial-hero-heading {
  margin: 0;
}

.app-shell[data-route="dashboard"] .editorial-hero-hello {
  display: block;
  margin-bottom: 3px;
  color: #778195;
  font-family: Georgia, 'Times New Roman', serif;
  font-size: clamp(27px, 2.3vw, 38px);
  font-style: italic;
  font-weight: 400;
  line-height: 1.05;
}

.app-shell[data-route="dashboard"] .editorial-hero h1 {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 14px;
  max-width: 680px;
  margin: 0;
  color: var(--ed-ink);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  font-size: clamp(46px, 5vw, 74px);
  font-weight: 790;
  letter-spacing: -.055em;
  line-height: .98;
  text-wrap: balance;
}

.app-shell[data-route="dashboard"] .editorial-hero-wave {
  display: inline-grid;
  place-items: center;
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
  border: 1px solid #e1e6ed;
  border-radius: 50%;
  background: #fff;
  font-size: 24px;
  letter-spacing: 0;
  box-shadow: 0 8px 24px rgba(31, 47, 70, .09);
}

.app-shell[data-route="dashboard"] .editorial-hero-lead {
  max-width: 570px;
  margin: 25px 0 0;
  color: var(--ed-muted);
  font-size: 16px;
  font-weight: 470;
  line-height: 1.72;
}

.app-shell[data-route="dashboard"] .editorial-hero-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 11px;
  margin-top: 31px;
}

.app-shell[data-route="dashboard"] .editorial-primary-action,
.app-shell[data-route="dashboard"] .editorial-secondary-action {
  appearance: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 48px;
  padding: 0 19px;
  border-radius: 13px;
  font: inherit;
  font-size: 14px;
  font-weight: 750;
  cursor: pointer;
}

.app-shell[data-route="dashboard"] .editorial-primary-action {
  border: 1px solid var(--ed-blue);
  background: var(--ed-blue);
  color: #fff;
  box-shadow: 0 11px 24px rgba(37, 99, 235, .19);
}

.app-shell[data-route="dashboard"] .editorial-primary-action .gd-icon,
.app-shell[data-route="dashboard"] .editorial-secondary-action .gd-icon,
.app-shell[data-route="dashboard"] .editorial-hero-links .gd-icon,
.app-shell[data-route="dashboard"] .editorial-status-icon .gd-icon,
.app-shell[data-route="dashboard"] .editorial-today-chip .gd-icon {
  fill: currentColor;
}

.app-shell[data-route="dashboard"] .editorial-secondary-action {
  border: 1px solid #dbe1e9;
  background: #fff;
  color: #2c3749;
  box-shadow: 0 7px 18px rgba(31, 47, 70, .055);
}

.app-shell[data-route="dashboard"] .editorial-secondary-action:disabled {
  opacity: .55;
  cursor: default;
}

.app-shell[data-route="dashboard"] .editorial-hero-links {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 18px;
  margin-top: 19px;
}

.app-shell[data-route="dashboard"] .editorial-hero-links button {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  border: 0;
  background: transparent;
  color: #526076;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.app-shell[data-route="dashboard"] .editorial-hero-links button:hover,
.app-shell[data-route="dashboard"] .editorial-hero-links button:focus-visible {
  color: var(--ed-blue);
}

.app-shell[data-route="dashboard"] .editorial-hero-stage {
  position: relative;
  z-index: 2;
  min-width: 0;
  min-height: 330px;
  align-self: stretch;
}

.app-shell[data-route="dashboard"] .editorial-hero-visual {
  position: absolute;
  inset: 4px -22px -21px 0;
  display: grid;
  place-items: center;
  pointer-events: none;
}

.app-shell[data-route="dashboard"] .editorial-hero-art {
  display: block;
  width: min(100%, 700px);
  height: auto;
  max-height: 390px;
}

.app-shell[data-route="dashboard"] .editorial-hero-status {
  position: absolute;
  z-index: 3;
  top: 0;
  right: 0;
  display: flex;
  gap: 9px;
}

.app-shell[data-route="dashboard"] .editorial-status-card {
  appearance: none;
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-height: 58px;
  padding: 8px 13px;
  border: 1px solid rgba(211, 219, 229, .94);
  border-radius: 15px;
  background: rgba(255, 255, 255, .9);
  color: #2a3548;
  font: inherit;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 11px 28px rgba(31, 47, 70, .07);
  backdrop-filter: blur(12px);
}

.app-shell[data-route="dashboard"] .editorial-status-icon {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #edf4ff;
  color: var(--ed-blue);
}

.app-shell[data-route="dashboard"] .editorial-weather-symbol {
  display: grid;
  place-items: center;
  width: 34px;
  height: 34px;
  border-radius: 10px;
  background: #fff7dc;
  color: #e3a222;
  font-size: 23px;
}

.app-shell[data-route="dashboard"] .editorial-status-card > span:last-child {
  display: grid;
  gap: 2px;
}

.app-shell[data-route="dashboard"] .editorial-status-card small {
  color: #8993a3;
  font-size: 10px;
  font-weight: 700;
  line-height: 1.15;
}

.app-shell[data-route="dashboard"] .editorial-status-card strong {
  color: #263247;
  font-size: 13px;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

.app-shell[data-route="dashboard"] .editorial-today-chip {
  appearance: none;
  position: absolute;
  z-index: 4;
  right: 20px;
  bottom: 10px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  min-height: 38px;
  padding: 0 12px;
  border: 1px solid #dbe2eb;
  border-radius: 999px;
  background: rgba(255, 255, 255, .92);
  color: #667387;
  font: inherit;
  font-size: 11px;
  font-weight: 720;
  cursor: pointer;
  box-shadow: 0 9px 24px rgba(31, 47, 70, .08);
  backdrop-filter: blur(10px);
}

.app-shell[data-route="dashboard"] .editorial-today-chip strong {
  margin-left: 2px;
  color: var(--ed-blue-deep);
  font-size: 12px;
}

.app-shell[data-route="dashboard"] .editorial-primary-action,
.app-shell[data-route="dashboard"] .editorial-secondary-action,
.app-shell[data-route="dashboard"] .editorial-hero-links button,
.app-shell[data-route="dashboard"] .editorial-status-card,
.app-shell[data-route="dashboard"] .editorial-today-chip {
  transition: border-color .16s ease, box-shadow .16s ease, background-color .16s ease, color .16s ease;
}

.app-shell[data-route="dashboard"] .editorial-primary-action:hover {
  background: #1f58d3;
  border-color: #1f58d3;
  box-shadow: 0 13px 28px rgba(37, 99, 235, .23);
}

.app-shell[data-route="dashboard"] .editorial-secondary-action:hover,
.app-shell[data-route="dashboard"] .editorial-status-card:hover,
.app-shell[data-route="dashboard"] .editorial-today-chip:hover {
  border-color: #c7d1de;
  box-shadow: 0 10px 28px rgba(31, 47, 70, .095);
}

.app-shell[data-route="dashboard"] .editorial-primary-action:focus-visible,
.app-shell[data-route="dashboard"] .editorial-secondary-action:focus-visible,
.app-shell[data-route="dashboard"] .editorial-hero-links button:focus-visible,
.app-shell[data-route="dashboard"] .editorial-status-card:focus-visible,
.app-shell[data-route="dashboard"] .editorial-today-chip:focus-visible {
  outline: 3px solid rgba(37, 99, 235, .22);
  outline-offset: 3px;
}

@media (max-width: 1180px) {
  .app-shell[data-route="dashboard"] .editorial-hero {
    grid-template-columns: minmax(0, .96fr) minmax(430px, 1.04fr);
    gap: 30px;
    padding-left: 40px;
    padding-right: 40px;
  }
  .app-shell[data-route="dashboard"] .editorial-hero h1 { font-size: clamp(43px, 5vw, 62px); }
  .app-shell[data-route="dashboard"] .editorial-status-weather { display: none; }
}

@media (max-width: 920px) {
  .app-shell[data-route="dashboard"] .editorial-hero {
    grid-template-columns: 1fr;
    gap: 18px;
    padding: 34px 30px 24px;
    background: linear-gradient(180deg, #fff 0%, #fff 52%, #f5f8fc 52.1%, #f5f8fc 100%);
  }
  .app-shell[data-route="dashboard"] .editorial-hero::before { display: none; }
  .app-shell[data-route="dashboard"] .editorial-hero-copy { max-width: 720px; }
  .app-shell[data-route="dashboard"] .editorial-hero-stage { min-height: 330px; }
  .app-shell[data-route="dashboard"] .editorial-hero-status { right: 4px; top: 6px; }
  .app-shell[data-route="dashboard"] .editorial-status-weather { display: inline-flex; }
  .app-shell[data-route="dashboard"] .editorial-hero-visual { inset: 0 -10px -30px; }
}

@media (max-width: 640px) {
  .app-shell[data-route="dashboard"] .editorial-hero {
    min-height: 0;
    margin-bottom: 18px;
    padding: 27px 20px 20px;
    border-radius: 22px;
  }
  .app-shell[data-route="dashboard"] .editorial-hero-meta { margin-bottom: 23px; }
  .app-shell[data-route="dashboard"] .editorial-hero-date { display: none; }
  .app-shell[data-route="dashboard"] .editorial-hero h1 { font-size: clamp(39px, 12vw, 54px); }
  .app-shell[data-route="dashboard"] .editorial-hero-wave { width: 42px; height: 42px; font-size: 21px; }
  .app-shell[data-route="dashboard"] .editorial-hero-lead { margin-top: 19px; font-size: 14px; line-height: 1.65; }
  .app-shell[data-route="dashboard"] .editorial-hero-actions { margin-top: 25px; }
  .app-shell[data-route="dashboard"] .editorial-primary-action,
  .app-shell[data-route="dashboard"] .editorial-secondary-action { min-height: 45px; padding: 0 14px; font-size: 13px; }
  .app-shell[data-route="dashboard"] .editorial-hero-links { display: grid; gap: 3px; }
  .app-shell[data-route="dashboard"] .editorial-hero-stage { min-height: 275px; }
  .app-shell[data-route="dashboard"] .editorial-hero-status { position: relative; justify-content: flex-start; top: auto; right: auto; }
  .app-shell[data-route="dashboard"] .editorial-status-card { min-height: 50px; padding: 7px 10px; }
  .app-shell[data-route="dashboard"] .editorial-status-weather { display: none; }
  .app-shell[data-route="dashboard"] .editorial-hero-visual { inset: 33px -42px -24px -34px; }
  .app-shell[data-route="dashboard"] .editorial-today-chip { right: 0; bottom: 0; }
  .app-shell[data-route="dashboard"] .editorial-hero::after { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .app-shell[data-route="dashboard"] .editorial-primary-action,
  .app-shell[data-route="dashboard"] .editorial-secondary-action,
  .app-shell[data-route="dashboard"] .editorial-hero-links button,
  .app-shell[data-route="dashboard"] .editorial-status-card,
  .app-shell[data-route="dashboard"] .editorial-today-chip { transition: none; }
}
`;

fs.writeFileSync(newCssPath, css, 'utf8');
if (fs.existsSync(oldCssPath)) fs.rmSync(oldCssPath);

console.log('Dashboard editorial hero rebuilt from zero.');
console.log(`Updated: ${pagePath}`);
console.log(`Created: ${newCssPath}`);
console.log(`Removed: ${oldCssPath}`);
