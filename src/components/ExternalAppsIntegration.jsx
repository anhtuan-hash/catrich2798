import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { canManageAiWebsites } from '../utils/aiWebsiteSettings.js';
import { loadExternalWebApps, subscribeExternalWebApps } from '../utils/externalWebApps.js';
import ExternalWebAppManager from './ExternalWebAppManager.jsx';
import ExternalWebAppViewer from './ExternalWebAppViewer.jsx';
import './ExternalWebApps.css';
import './ExternalAppsIntegration.css';

const GROUP_LABELS = { plan: 'Soạn bài', create: 'Tạo học liệu', assess: 'Kiểm tra', manage: 'Quản lý' };
const TONES = ['#1a73e8', '#188038', '#e37400', '#9334e6', '#12b5cb', '#d93025'];

function toneFor(value = '') {
  let hash = 0;
  for (const char of String(value)) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return TONES[hash % TONES.length];
}

function WebsiteAppCard({ app, onOpen }) {
  const accent = app.accent || toneFor(app.externalUrl || app.title);
  return (
    <article className="flat-app-window-card flat-app-window-drawer external-website-app-card" style={{ '--app-accent': accent, '--app-soft': '#e8f0fe', '--app-ink': '#202124' }}>
      <button type="button" className="flat-app-window-launch" onClick={() => onOpen(app)} aria-label={`Mở ứng dụng: ${app.title}`}>
        <span className="flat-app-window-chrome"><span className="flat-traffic"><i /><i /><i /></span><b>Website nhúng · Đã duyệt</b></span>
        <span className="flat-app-window-body">
          <span className="flat-app-window-art external-app-tile-icon" aria-hidden="true">{app.icon || 'WEB'}</span>
          <span className="flat-app-window-copy"><small>{GROUP_LABELS[app.groupId] || 'Ứng dụng website'}</small><strong>{app.title}</strong><em>{app.descVi || 'Chạy trực tiếp ngay trong Brian.'}</em></span>
          <span className="flat-app-window-cta">Mở ứng dụng</span><span className="flat-app-window-decoration" />
        </span>
      </button>
    </article>
  );
}

export default function ExternalAppsIntegration({ currentUser, language = 'vi' }) {
  const vi = language !== 'en';
  const manager = canManageAiWebsites(currentUser);
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#\//, '').split('?')[0]);
  const [hosts, setHosts] = useState({ hero: null, grid: null });
  const [snapshot, setSnapshot] = useState({ approved: [], mine: [], requests: [] });
  const [managerOpen, setManagerOpen] = useState(false);
  const [activeApp, setActiveApp] = useState(null);

  const pendingCount = useMemo(() => snapshot.requests.filter((request) => request.status === 'pending').length, [snapshot.requests]);

  useEffect(() => {
    const onHash = () => setRoute(window.location.hash.replace(/^#\//, '').split('?')[0]);
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (route !== 'apps') { setHosts({ hero: null, grid: null }); return undefined; }
    const findHosts = () => {
      const hero = document.querySelector('.metro-clean-system[data-route="apps"] .flat-apps-hero-copy') || document.querySelector('.flat-apps-hero-copy');
      const grid = document.querySelector('.metro-clean-system[data-route="apps"] .flat-apps-collage-grid') || document.querySelector('.flat-apps-collage-grid');
      setHosts((current) => current.hero === hero && current.grid === grid ? current : { hero, grid });
    };
    findHosts();
    const frame = requestAnimationFrame(findHosts);
    const observer = new MutationObserver(findHosts);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => { cancelAnimationFrame(frame); observer.disconnect(); };
  }, [route]);

  useEffect(() => {
    if (!currentUser || route !== 'apps') return undefined;
    let active = true;
    loadExternalWebApps(currentUser).then((next) => { if (active) setSnapshot(next); }).catch((error) => console.warn('[External apps] initial load failed', error));
    const unsubscribe = subscribeExternalWebApps(currentUser, (next) => { if (active) setSnapshot(next); });
    return () => { active = false; unsubscribe?.(); };
  }, [currentUser?.id, currentUser?.email, currentUser?.role, route]);

  if (!currentUser || route !== 'apps') return null;

  return (
    <>
      {hosts.hero ? createPortal(
        <div className="external-app-integration-actions">
          <button type="button" className="launcher-add-external-app" onClick={() => setManagerOpen(true)}>＋ {manager ? (vi ? 'Thêm / duyệt ứng dụng' : 'Add / approve apps') : (vi ? 'Thêm ứng dụng' : 'Add app')}{manager && pendingCount ? <b>{pendingCount}</b> : null}</button>
        </div>, hosts.hero,
      ) : null}
      {hosts.grid ? createPortal(snapshot.approved.map((app) => <WebsiteAppCard key={app.id} app={app} onOpen={setActiveApp} />), hosts.grid) : null}
      <ExternalWebAppManager open={managerOpen} onClose={() => setManagerOpen(false)} currentUser={currentUser} language={language} onChanged={setSnapshot} />
      <ExternalWebAppViewer app={activeApp} onClose={() => setActiveApp(null)} language={language} />
    </>
  );
}
