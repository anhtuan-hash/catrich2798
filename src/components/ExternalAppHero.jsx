import { useState } from 'react';
import {
  ArrowDownRight,
  ArrowLeft,
  FileCode2,
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

function issueNumber(variant) {
  return String(variant + 1).padStart(2, '0');
}

export default function ExternalAppHero({ app, language = 'vi' }) {
  const [activePanel, setActivePanel] = useState('profile');
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
  const issue = issueNumber(variant);

  const panels = [
    {
      id: 'profile',
      label: vi ? 'Hồ sơ' : 'Profile',
      eyebrow: vi ? 'ỨNG DỤNG ĐỘC LẬP' : 'INDEPENDENT APPLICATION',
      title: vi ? 'Một không gian. Một nhịp làm việc.' : 'One space. One focused workflow.',
      copy: vi
        ? 'Trang riêng, hero riêng và runtime riêng — nhưng vẫn nằm trong hệ sinh thái Brian English.'
        : 'A dedicated page, hero and runtime — still connected to the Brian English ecosystem.',
    },
    {
      id: 'format',
      label: vi ? 'Định dạng' : 'Format',
      eyebrow: sourceLabel.toUpperCase(),
      title: sourceLabel,
      copy: htmlApp
        ? (vi ? 'Nội dung HTML đã duyệt được chạy trong sandbox riêng, không sửa mã gốc.' : 'Approved HTML runs inside its own sandbox without altering the source.')
        : (vi ? 'Website HTTPS được mở trong viewer riêng và giữ nguyên trải nghiệm nguồn.' : 'The HTTPS website opens in a dedicated viewer while preserving the source experience.'),
    },
    {
      id: 'access',
      label: vi ? 'Truy cập' : 'Access',
      eyebrow: vi ? 'TTCM ĐÃ DUYỆT' : 'APPROVED',
      title: vi ? 'Sẵn sàng để sử dụng.' : 'Ready for use.',
      copy: vi
        ? 'Mở trực tiếp từ Brian, quay lại danh mục hoặc Dashboard bất cứ lúc nào.'
        : 'Launch directly from Brian, then return to Apps or Dashboard at any time.',
    },
  ];
  const selectedPanel = panels.find((panel) => panel.id === activePanel) || panels[0];

  const openRuntime = () => {
    document.getElementById('external-app-runtime')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePointerMove = (event) => {
    if (event.pointerType && event.pointerType !== 'mouse') return;
    const rect = event.currentTarget.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width - 0.5) * 2;
    const y = ((event.clientY - rect.top) / rect.height - 0.5) * 2;
    event.currentTarget.style.setProperty('--editorial-shift-x', `${(x * 12).toFixed(2)}px`);
    event.currentTarget.style.setProperty('--editorial-shift-y', `${(y * 8).toFixed(2)}px`);
    event.currentTarget.style.setProperty('--editorial-tilt', `${(x * 1.6).toFixed(2)}deg`);
  };

  const handlePointerLeave = (event) => {
    event.currentTarget.style.setProperty('--editorial-shift-x', '0px');
    event.currentTarget.style.setProperty('--editorial-shift-y', '0px');
    event.currentTarget.style.setProperty('--editorial-tilt', '0deg');
  };

  return (
    <section
      className="external-app-hero external-app-editorial-shell"
      data-hero-variant={variant}
      style={{ '--external-app-accent': accent }}
      aria-labelledby="external-app-hero-title"
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
    >
      <div className="external-app-editorial-grain" aria-hidden="true" />
      <div className="external-app-editorial-rule" aria-hidden="true" />

      <div className="external-app-editorial-shell-inner">
        <header className="external-app-editorial-masthead">
          <button type="button" className="external-app-hero-back" onClick={() => { window.location.hash = '#/apps'; }}>
            <ArrowLeft size={15} />
            <span>{vi ? 'Tất cả ứng dụng' : 'All apps'}</span>
          </button>
          <div className="external-app-editorial-edition">
            <span>BRIAN / APP EDITION</span>
            <strong>ISSUE {issue}</strong>
          </div>
          <div className="external-app-editorial-type">
            <span>{groupLabel}</span>
            <strong>{sourceLabel}</strong>
          </div>
        </header>

        <div className="external-app-editorial-grid">
          <div className="external-app-editorial-copy">
            <div className="external-app-editorial-kicker">
              <span className="external-app-editorial-icon" aria-hidden="true">
                {app.icon ? String(app.icon).slice(0, 3) : (htmlApp ? <FileCode2 size={20} /> : <Globe2 size={20} />)}
              </span>
              <span>{vi ? 'TTCM tuyển chọn' : 'Curated by department head'}</span>
            </div>

            <h1 id="external-app-hero-title">{title}</h1>
            <p className="external-app-editorial-deck">{description}</p>

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

            <div className="external-app-editorial-footnotes">
              <span><ShieldCheck size={15} /> {vi ? 'Đã duyệt' : 'Approved'}</span>
              <span>01 / {sourceLabel}</span>
              <span>02 / {groupLabel}</span>
            </div>
          </div>

          <div className="external-app-editorial-visual" aria-label={vi ? 'Bản trình bày editorial tương tác' : 'Interactive editorial presentation'}>
            <div className="external-app-editorial-vertical" aria-hidden="true">BRIAN ENGLISH / {issue}</div>

            <article className="external-app-editorial-feature">
              <div className="external-app-editorial-feature-topline">
                <span>{selectedPanel.eyebrow}</span>
                <strong>{app.icon ? String(app.icon).slice(0, 3) : (htmlApp ? 'HTM' : 'WEB')}</strong>
              </div>
              <div className="external-app-editorial-feature-body">
                <span className="external-app-editorial-dropcap" aria-hidden="true">{title.charAt(0).toUpperCase()}</span>
                <div>
                  <small>{vi ? 'TRANG GIỚI THIỆU' : 'FEATURE STORY'}</small>
                  <h2>{selectedPanel.title}</h2>
                  <p>{selectedPanel.copy}</p>
                </div>
              </div>
              <div className="external-app-editorial-accent-block" aria-hidden="true">
                <Sparkles size={24} />
                <span>{sourceLabel}</span>
              </div>
            </article>

            <nav className="external-app-editorial-nav" aria-label={vi ? 'Nội dung hero' : 'Hero stories'}>
              {panels.map((panel, index) => (
                <button
                  key={panel.id}
                  type="button"
                  className={activePanel === panel.id ? 'is-active' : ''}
                  aria-pressed={activePanel === panel.id}
                  onClick={() => setActivePanel(panel.id)}
                >
                  <span>0{index + 1}</span>
                  <strong>{panel.label}</strong>
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
}
