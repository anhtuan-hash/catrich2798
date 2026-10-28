import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { launchRoute } from '../utils/navigation.js';
import './GlobalGuestNavigationHub.css';

const guestDestinations = [
  { id: 'apps', vi: 'Ứng dụng', en: 'Apps', target: '#/apps', color: '#20876e' },
  { id: 'dashboard', vi: 'Dashboard', en: 'Dashboard', target: '#/dashboard', color: '#7353db' },
  { id: 'homeroom', vi: 'Chủ nhiệm', en: 'Homeroom', target: '#/homeroom', color: '#c36589', locked: true },
  { id: 'gradebook', vi: 'Sổ điểm', en: 'Gradebook', target: '#/tool/gradebook-studio', color: '#c77550', locked: true },
  { id: 'assessment', vi: 'Kiểm tra', en: 'Assessment', target: '#/tool/lesson-check-studio', color: '#25957f' },
  { id: 'attendance', vi: 'Điểm danh', en: 'Attendance', target: '#/attendance', color: '#35a7cb' },
];
const EXCLUDED_ROUTES = ['login', 'register', 'setup', 'homeroom-portal', 'classroom-join', 'board-live', 'quest-join'];
function LockIcon() {
  return <svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><rect x="4.5" y="8.5" width="11" height="8" rx="2"/><path d="M7 8.5V6.8a3 3 0 0 1 6 0v1.7"/></svg>;
}

/** Navigation labels are visible to every guest. Only five destinations show public previews. */
export default function GlobalGuestNavigationHub({ currentUser, language = 'vi', route = 'home', selectedTool = null, mobile = false }) {
  const [host, setHost] = useState(null);
  const [lockedItem, setLockedItem] = useState(null);
  const enabled = !currentUser && !EXCLUDED_ROUTES.includes(route);

  useEffect(() => {
    if (!enabled || typeof document === 'undefined') { setHost(null); setLockedItem(null); return undefined; }
    let frame = 0;
    let observer;
    const findHost = () => {
      const node = mobile
        ? document.querySelector('.bes-top-chrome')
        : document.querySelector('.bes-top-chrome .brian-nav__primary');
      setHost((old) => old === node ? old : node);
      if (node) observer?.disconnect();
    };
    findHost();
    frame = window.requestAnimationFrame(findHost);
    if (!document.querySelector(mobile ? '.bes-top-chrome' : '.bes-top-chrome .brian-nav__primary')) {
      observer = new MutationObserver(findHost);
      observer.observe(document.body, { childList: true, subtree: true });
    }
    return () => { if (frame) window.cancelAnimationFrame(frame); observer?.disconnect(); };
  }, [enabled, mobile]);

  useEffect(() => {
    if (!lockedItem) return undefined;
    const onKey = (event) => { if (event.key === 'Escape') setLockedItem(null); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [lockedItem]);

  if (!enabled || !host) return null;

  const en = language === 'en';
  const go = (item, event) => {
    if (item.locked) { setLockedItem(item); return; }
    launchRoute({ target: item.target, label: item.id.slice(0, 2).toUpperCase(), color: item.color, sourceEl: event.currentTarget });
  };
  const tabs = guestDestinations.map((item) => {
    const active = item.target === '#/' + route || (route === 'tool' && item.id === 'assessment' && selectedTool?.slug === 'lesson-check-studio');
    const label = en ? item.en : item.vi;
    return <button type="button" key={item.id} data-guest-destination={item.id}
      className={['brian-nav__guest-tab', 'brian-nav__guest-tab--' + item.id, active ? 'is-active' : '', item.locked ? 'is-locked' : ''].filter(Boolean).join(' ')}
      aria-current={active ? 'page' : undefined}
      aria-label={item.locked ? (en ? label + ' · sign in required' : label + ' · cần đăng nhập') : label}
      title={item.locked ? (en ? 'Sign in required' : 'Cần đăng nhập') : label}
      onClick={(event) => go(item, event)}>
      <span>{label}</span>{item.locked && <i className="brian-nav__guest-lock"><LockIcon /></i>}
    </button>;
  });

  return <>
    {createPortal(mobile
      ? <nav className="brian-guest-mobile-destinations" aria-label={en ? 'Guest preview navigation' : 'Điều hướng xem trước'}>
        <button type="button" className={route === 'home' ? 'is-active' : ''} onClick={(event) => go({id:'home',target:'#/home',color:'#4775c5'}, event)}>{en ? 'Home' : 'Trang chủ'}</button>
        {tabs}
      </nav>
      : <>{tabs}</>, host)}
    {lockedItem && createPortal(<div className="brian-guest-lock-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setLockedItem(null); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="brian-guest-lock-title" className="brian-guest-lock-dialog">
        <div className="brian-guest-lock-dialog__icon"><LockIcon /></div>
        <h2 id="brian-guest-lock-title">{en ? 'Sign in required' : 'Vui lòng đăng nhập'}</h2>
        <p>{en
          ? 'The ' + lockedItem.en + ' area is private. Sign in to access it according to your assigned permissions.'
          : 'Khu vực ' + lockedItem.vi + ' được bảo vệ. Hãy đăng nhập để sử dụng theo quyền được cấp.'}</p>
        <div className="brian-guest-lock-dialog__actions">
          <button type="button" onClick={() => setLockedItem(null)}>{en ? 'Continue preview' : 'Tiếp tục xem trước'}</button>
          <a href="#/login" onClick={() => setLockedItem(null)}>{en ? 'Sign in' : 'Đăng nhập'}</a>
        </div>
      </section>
    </div>, document.body)}
  </>;
}
