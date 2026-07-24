import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { canManageAiWebsites } from '../utils/aiWebsiteSettings.js';
import { loadExternalWebApps, subscribeExternalWebApps } from '../utils/externalWebApps.js';
import ExternalWebAppManager from './ExternalWebAppManager.jsx';
import ExternalWebAppViewer from './ExternalWebAppViewer.jsx';
import './ExternalWebApps.css';

const GROUPS = { plan: 'Soạn bài', create: 'Tạo học liệu', assess: 'Kiểm tra', manage: 'Quản lý' };
const TONES = ['#1a73e8', '#188038', '#e37400', '#9334e6', '#12b5cb', '#d93025'];

function tone(value = '') {
  let hash = 0;
  for (const char of String(value)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

function WebsiteAppCard({ app, onOpen }) {
  const accent = app.accent || tone(app.externalUrl);
  return (
    <article
      className="flat-app-window-card flat-app-window-drawer external-website-app-card"
      style={{ '--app-accent': accent, '--app-soft': '#e8f0fe', '--app-ink': '#202124' }}
    >
      <button type="button" className="flat-app-window-launch" onClick={() => onOpen(app)}>
        <span className="flat-app-window-chrome">
          <span className="flat-traffic"><i /><i /><i /></span>
          <b>Website nhúng · Đã duyệt</b>
        </span>
        <span className="flat-app-window-body">
          <span className="flat-app-window-art external-app-tile-icon">{app.icon || 'WEB'}</span>
          <span className="flat-app-window-copy">
            <small>{GROUPS[app.groupId] || 'Ứng dụng website'}</small>
            <strong>{app.title}</strong>
            <em>{app.descVi || 'Chạy trực tiếp ngay trong Brian.'}</em>
          </span>
          <span className="flat-app-window-cta">Mở ứng dụng</span>
          <span className="flat-app-window-decoration" />
        </span>
      </button>
    </article>
  );
}

export default function ExternalAppsIntegration({ currentUser, language = 'vi' }) {
  const manager = canManageAiWebsites(currentUser);
  const [route, setRoute] = useState(() => location.hash.replace(/^#\//, '').split('?')[0]);
  const [hosts, setHosts] = useState({ hero: null, grid: null });
  const [data, setData] = useState({ approved: [], requests: [] });
  const [dialog, setDialog] = useState(false);
  const [active, setActive] = useState(null);
  const pending = useMemo(() => data.requests.filter((request) => request.status === 'pending').length, [data.requests]);

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
      const hero = document.querySelector('.metro-clean-system[data-route="apps"] .flat-apps-hero-copy')
        || document.querySelector('.flat-apps-hero-copy');
      const grid = document.querySelector('.metro-clean-system[data-route="apps"] .flat-apps-collage-grid')
        || document.querySelector('.flat-apps-collage-grid');
      setHosts((current) => (current.hero === hero && current.grid === grid ? current : { hero, grid }));
    };

    findHosts();
    const observer = new MutationObserver(findHosts);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [route]);

  useEffect(() => {
    if (!currentUser || route !== 'apps') return undefined;
    let activeSubscription = true;
    let unsubscribe = () => {};
    const applyData = (next) => { if (activeSubscription && next) setData(next); };

    loadExternalWebApps(currentUser)
      .then(applyData)
      .catch((error) => console.warn('[External apps] initial load failed; add-app controls remain available', error));

    try {
      unsubscribe = subscribeExternalWebApps(currentUser, applyData) || (() => {});
    } catch (error) {
      console.warn('[External apps] realtime disabled; add-app controls remain available', error);
    }

    return () => {
      activeSubscription = false;
      try { unsubscribe?.(); } catch (error) { console.warn('[External apps] subscription cleanup failed', error); }
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.role, route]);

  if (!currentUser || route !== 'apps') return null;

  return (
    <>
      {hosts.hero ? createPortal(
        <div className="external-app-integration-actions">
          <button type="button" className="launcher-add-external-app" onClick={() => setDialog(true)}>
            ＋ {manager ? 'Thêm / duyệt ứng dụng' : 'Thêm ứng dụng'}
            {manager && pending ? <b>{pending}</b> : null}
          </button>
        </div>,
        hosts.hero,
      ) : null}

      {hosts.grid ? createPortal(
        data.approved.map((app) => <WebsiteAppCard key={app.id} app={app} onOpen={setActive} />),
        hosts.grid,
      ) : null}

      <ExternalWebAppManager
        open={dialog}
        onClose={() => setDialog(false)}
        currentUser={currentUser}
        language={language}
        onChanged={setData}
      />
      <ExternalWebAppViewer app={active} onClose={() => setActive(null)} />
    </>
  );
}
