import {
  ArrowDownRight,
  ArrowLeft,
  Boxes,
  ExternalLink,
  FileCode2,
  Gauge,
  Globe2,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { EXTERNAL_APP_SOURCE_HTML } from '../utils/externalWebApps.js';
import './ExternalAppHero.css';

const GROUP_LABELS = {
  plan: { vi: 'Soạn bài', en: 'Lesson planning' },
  create: { vi: 'Tạo học liệu', en: 'Content creation' },
  assess: { vi: 'Kiểm tra', en: 'Assessment' },
  manage: { vi: 'Quản lý', en: 'Management' },
};

function hashString(value = '') {
  let hash = 2166136261;
  for (const char of String(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function variantForApp(app = {}) {
  return hashString(app.id || app.title || app.name || 'external-app') % 6;
}

function accentForApp(app = {}) {
  const value = String(app.accent || '').trim();
  return /^#[0-9a-f]{6}$/i.test(value) ? value : '#2563eb';
}

export default function ExternalAppHero({ app, language = 'vi' }) {
  if (!app) return null;

  const vi = language !== 'en';
  const htmlApp = app.sourceType === EXTERNAL_APP_SOURCE_HTML;
  const title = app.title || app.name || (vi ? 'Ứng dụng Brian' : 'Brian application');
  const description = app.descVi || app.description || app.desc || (vi
    ? 'Ứng dụng đã được TTCM duyệt và chạy độc lập trong Brian.'
    : 'An approved application running independently inside Brian.');
  const group = GROUP_LABELS[app.groupId] || null;
  const groupLabel = group ? group[vi ? 'vi' : 'en'] : (vi ? 'Ứng dụng chuyên môn' : 'Professional application');
  const sourceLabel = htmlApp ? 'HTML App' : 'Web App';
  const accent = accentForApp(app);
  const variant = variantForApp(app);

  const openRuntime = () => {
    document.getElementById('external-app-runtime')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <section
      className="external-app-hero"
      data-hero-variant={variant}
      style={{ '--external-app-accent': accent }}
      aria-labelledby="external-app-hero-title"
    >
      <div className="external-app-hero-orb external-app-hero-orb-a" aria-hidden="true" />
      <div className="external-app-hero-orb external-app-hero-orb-b" aria-hidden="true" />
      <div className="external-app-hero-mesh" aria-hidden="true" />

      <div className="external-app-hero-inner">
        <div className="external-app-hero-copy">
          <button type="button" className="external-app-hero-back" onClick={() => { window.location.hash = '#/apps'; }}>
            <ArrowLeft size={16} />
            <span>{vi ? 'Tất cả ứng dụng' : 'All apps'}</span>
          </button>

          <div className="external-app-hero-eyebrow">
            <span className="external-app-hero-icon" aria-hidden="true">
              {app.icon ? String(app.icon).slice(0, 3) : (htmlApp ? <FileCode2 size={20} /> : <Globe2 size={20} />)}
            </span>
            <span>{groupLabel}</span>
            <i />
            <span>{sourceLabel}</span>
          </div>

          <h1 id="external-app-hero-title">{title}</h1>
          <p className="external-app-hero-lead">{description}</p>

          <div className="external-app-hero-actions">
            <button type="button" className="external-app-hero-primary" onClick={openRuntime}>
              <span>{vi ? 'Mở ứng dụng' : 'Open application'}</span>
              <ArrowDownRight size={18} />
            </button>
            <button type="button" className="external-app-hero-secondary" onClick={() => { window.location.hash = '#/dashboard'; }}>
              <LayoutDashboard size={17} />
              <span>Dashboard</span>
            </button>
          </div>

          <div className="external-app-hero-trust" aria-label={vi ? 'Thông tin ứng dụng' : 'Application information'}>
            <span><ShieldCheck size={16} /> {vi ? 'TTCM đã duyệt' : 'Approved'}</span>
            <span><Boxes size={16} /> {vi ? 'Không gian độc lập' : 'Independent workspace'}</span>
            <span><Gauge size={16} /> {vi ? 'Chạy trực tiếp trong Brian' : 'Runs inside Brian'}</span>
          </div>
        </div>

        <div className="external-app-hero-visual" aria-hidden="true">
          <div className="external-app-showcase">
            <div className="external-app-showcase-topbar">
              <div className="external-app-showcase-mark">
                {app.icon ? String(app.icon).slice(0, 3) : (htmlApp ? 'HTM' : 'WEB')}
              </div>
              <div>
                <strong>{title}</strong>
                <small>{sourceLabel} · Brian English</small>
              </div>
              <span className="external-app-showcase-live"><i /> LIVE</span>
            </div>

            <div className="external-app-showcase-stage">
              <div className="external-app-showcase-card is-main">
                <Sparkles size={21} />
                <span>{vi ? 'Không gian làm việc riêng' : 'Dedicated workspace'}</span>
                <strong>{title}</strong>
                <small>{vi ? 'Hero, URL và runtime riêng cho ứng dụng này.' : 'Its own hero, URL and application runtime.'}</small>
              </div>
              <div className="external-app-showcase-card is-side">
                <Globe2 size={19} />
                <span>{sourceLabel}</span>
                <strong>{vi ? 'Sandbox an toàn' : 'Safe sandbox'}</strong>
              </div>
              <div className="external-app-showcase-card is-mini">
                <ExternalLink size={18} />
                <strong>{vi ? 'Sẵn sàng' : 'Ready'}</strong>
              </div>
              <span className="external-app-showcase-ring ring-a" />
              <span className="external-app-showcase-ring ring-b" />
            </div>

            <div className="external-app-showcase-footer">
              <span>{groupLabel}</span>
              <strong>{vi ? 'Ứng dụng độc lập · Một trải nghiệm riêng' : 'Independent app · Dedicated experience'}</strong>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
