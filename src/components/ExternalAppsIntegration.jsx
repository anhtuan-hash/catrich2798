import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { CheckCircle2, ChevronRight, FileCode2, Globe2 } from 'lucide-react';
import { canManageAiWebsites } from '../utils/aiWebsiteSettings.js';
import { EXTERNAL_APP_SOURCE_HTML, loadExternalWebApps, subscribeExternalWebApps } from '../utils/externalWebApps.js';
import { TESOL_METHOD_HASH } from '../tesolMethodRouteRegistry.js';
import ExternalWebAppManager from './ExternalWebAppManagerV2.jsx';
import ExternalWebAppViewer from './ExternalWebAppViewer.jsx';
import './ExternalWebApps.css';
import './ExternalAppApprovalRestore.css';
import './ApprovedExternalAppsList.css';

const GROUPS = {
  plan: { label: 'Soạn bài', accent: '#1a73e8' },
  create: { label: 'Tạo học liệu', accent: '#188038' },
  assess: { label: 'Kiểm tra', accent: '#e37400' },
  manage: { label: 'Quản lý', accent: '#9334e6' },
};
const TONES = ['#1a73e8', '#188038', '#e37400', '#9334e6', '#12b5cb', '#d93025'];
const TESOL_METHOD_ROUTE = TESOL_METHOD_HASH.replace(/^#\//, '');

function normalizeTitle(value = '') {
  return String(value)
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function isTesolMethodApp(app = {}) {
  const normalized = normalizeTitle(app.title || app.name || '');
  return normalized === 'phuong phap tesol' || (normalized.includes('tesol') && normalized.includes('phuong phap'));
}

function tone(value = '') {
  let hash = 0;
  for (const char of String(value)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

function WebsiteAppCard({ app, onOpen, language = 'vi' }) {
  const htmlApp = app.sourceType === EXTERNAL_APP_SOURCE_HTML;
  const group = GROUPS[app.groupId] || null;
  const accent = app.accent || group?.accent || tone(app.externalUrl || app.fileName || app.title);
  const appTitle = app.title || (language === 'vi' ? 'Ứng dụng đã duyệt' : 'Approved application');
  const description = app.descVi || app.description || (language === 'vi'
    ? 'Ứng dụng đã được TTCM duyệt và có thể chạy trực tiếp trong Brian.'
    : 'Approved by the department head and available directly in Brian.');
  const sourceLabel = htmlApp ? 'HTML' : 'Website';
  const groupLabel = group?.label || (htmlApp ? 'Ứng dụng HTML' : 'Ứng dụng website');

  return (
    <article
      className={`apps-list-row external-approved-app ${htmlApp ? 'is-html-app' : 'is-url-app'}`}
      style={{ '--app-accent': accent, '--app-soft': htmlApp ? '#fef7e0' : '#e8f0fe', '--app-ink': '#202124' }}
      data-launcher-item={`external-${app.id}`}
      data-app-title={app.title || ''}
      data-app-group={app.groupId || ''}
      data-app-source={app.sourceType || 'url'}
    >
      <button
        type="button"
        className="apps-list-open"
        onClick={() => onOpen(app)}
        aria-label={`${language === 'vi' ? 'Mở' : 'Open'}: ${appTitle}`}
      >
        <span className="apps-list-icon external-approved-list-icon" aria-hidden="true">
          {app.icon ? <span className="external-approved-icon-glyph">{app.icon}</span> : (htmlApp ? <FileCode2 /> : <Globe2 />)}
        </span>
        <span className="apps-list-copy">
          <span className="apps-list-meta">
            <b>{groupLabel}</b>
            <em className="external-approved-badge"><CheckCircle2 /> {language === 'vi' ? 'TTCM đã duyệt' : 'Approved'}</em>
            <em>{sourceLabel}</em>
          </span>
          <strong>{appTitle}</strong>
          <small>{description}</small>
        </span>
        <span className="apps-list-primary-action" aria-hidden="true">
          <b>{language === 'vi' ? 'Mở' : 'Open'}</b>
          <ChevronRight />
        </span>
      </button>
    </article>
  );
}

export default function ExternalAppsIntegration({ currentUser, language = 'vi' }) {
  const manager = canManageAiWebsites(currentUser);
  const [route, setRoute] = useState(() => location.hash.replace(/^#\//, '').split('?')[0]);
  const [hosts, setHosts] = useState({ hero: null, grid: null });
  const [data, setData] = useState({ approved: [], mine: [], requests: [] });
  const [dialog, setDialog] = useState(false);
  const [active, setActive] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const pending = useMemo(() => data.requests.filter((request) => request.status === 'pending').length, [data.requests]);
  const isTesolRoute = route === TESOL_METHOD_ROUTE;
  const tesolApp = useMemo(() => data.approved.find(isTesolMethodApp) || null, [data.approved]);
  const approvedLauncherApps = useMemo(() => data.approved.filter((app) => !isTesolMethodApp(app)), [data.approved]);

  useEffect(() => {
    const updateRoute = () => setRoute(location.hash.replace(/^#\//, '').split('?')[0]);
    addEventListener('hashchange', updateRoute);
    return () => removeEventListener('hashchange', updateRoute);
  }, []);

  useEffect(() => {
    if (route !== 'apps') {
      setHosts({ hero: null, grid: null });
      return undefined;
    }

    const findHosts = () => {
      const scope = document.querySelector('.metro-clean-system[data-route="apps"]') || document;
      const hero = scope.querySelector('.apps-directory-actions')
        || scope.querySelector('.apps-directory-hero-copy')
        || scope.querySelector('.flat-apps-hero-copy')
        || document.querySelector('.apps-directory-actions, .apps-directory-hero-copy, .flat-apps-hero-copy');
      const grid = scope.querySelector('#apps-directory-grid')
        || scope.querySelector('.apps-directory-list-native')
        || scope.querySelector('.apps-directory-grid-native')
        || scope.querySelector('.flat-apps-collage-grid')
        || document.querySelector('#apps-directory-grid, .apps-directory-list-native, .apps-directory-grid-native, .flat-apps-collage-grid');
      setHosts((current) => (current.hero === hero && current.grid === grid ? current : { hero, grid }));
    };

    findHosts();
    const observer = new MutationObserver(findHosts);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [route]);

  useEffect(() => {
    if (!currentUser || (route !== 'apps' && !isTesolRoute)) return undefined;
    let activeSubscription = true;
    let unsubscribe = () => {};
    setLoaded(false);
    const applyData = (next) => {
      if (!activeSubscription || !next) return;
      setData(next);
      setLoaded(true);
    };
    const includeRequests = route === 'apps' && manager;

    loadExternalWebApps(currentUser, { includeRequests })
      .then(applyData)
      .catch((error) => {
        setLoaded(true);
        console.warn('[External apps] initial load failed; add-app controls remain available', error);
      });

    try {
      unsubscribe = subscribeExternalWebApps(currentUser, applyData, { includeRequests }) || (() => {});
    } catch (error) {
      console.warn('[External apps] realtime disabled; add-app controls remain available', error);
    }

    return () => {
      activeSubscription = false;
      try { unsubscribe?.(); } catch (error) { console.warn('[External apps] subscription cleanup failed', error); }
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.role, manager, route, isTesolRoute]);

  const openApprovedApp = (app) => {
    if (isTesolMethodApp(app)) {
      window.location.hash = TESOL_METHOD_HASH;
      return;
    }
    setActive(app);
  };

  if (!currentUser) return null;

  const routeHost = isTesolRoute && typeof document !== 'undefined' ? document.getElementById('bes-main-content') : null;

  return (
    <>
      {route === 'apps' && hosts.hero ? createPortal(
        <div className="external-app-integration-actions">
          <button type="button" className="launcher-add-external-app" onClick={() => setDialog(true)}>
            <span aria-hidden="true">⇧</span>
            <span>{manager ? 'Gửi / duyệt ứng dụng' : 'Gửi ứng dụng cho TTCM'}</span>
            {manager && pending ? <b>{pending}</b> : null}
          </button>
        </div>,
        hosts.hero,
      ) : null}

      {route === 'apps' && hosts.grid ? createPortal(
        approvedLauncherApps.map((app) => <WebsiteAppCard key={app.id} app={app} onOpen={openApprovedApp} language={language} />),
        hosts.grid,
      ) : null}

      {route === 'apps' ? (
        <ExternalWebAppManager
          open={dialog}
          onClose={() => setDialog(false)}
          currentUser={currentUser}
          language={language}
          onChanged={setData}
        />
      ) : null}

      {route === 'apps' ? <ExternalWebAppViewer app={active} onClose={() => setActive(null)} /> : null}

      {isTesolRoute && tesolApp ? (
        <ExternalWebAppViewer app={tesolApp} onClose={() => { window.location.hash = '#/apps'; }} />
      ) : null}

      {isTesolRoute && routeHost && !tesolApp ? createPortal(
        <div style={{ minHeight: '68vh', display: 'grid', placeItems: 'center', padding: '32px' }}>
          <section style={{ maxWidth: '720px', width: '100%', padding: '32px', borderRadius: '28px', background: '#fff', border: '1px solid #d9e4f2', boxShadow: '0 18px 50px rgba(34, 65, 110, .12)', textAlign: 'center' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🌐</div>
            <h1 style={{ margin: '0 0 10px' }}>Phương pháp TESOL</h1>
            <p style={{ margin: '0 0 20px', color: '#5f6368' }}>{loaded ? 'Không tìm thấy bản ứng dụng TESOL đã duyệt trong kho ứng dụng website.' : 'Đang tải ứng dụng TESOL đã duyệt…'}</p>
            {loaded ? <button type="button" onClick={() => { window.location.hash = '#/apps'; }} style={{ border: 0, borderRadius: '999px', padding: '12px 22px', background: '#1a73e8', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Quay lại Ứng dụng</button> : null}
          </section>
        </div>,
        routeHost,
      ) : null}
    </>
  );
}
