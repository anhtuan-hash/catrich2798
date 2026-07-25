import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

function RandomPickerAppCard({ language = 'vi' }) {
  const isVi = language !== 'en';
  const openApp = () => {
    window.location.hash = '#/random-student-picker';
  };

  return (
    <article
      className="flat-app-window-card flat-app-window-drawer random-picker-app-card"
      style={{ '--app-accent': '#1a73e8', '--app-soft': '#e8f0fe', '--app-ink': '#202124' }}
      data-launcher-item="random-student-picker"
    >
      <button type="button" className="flat-app-window-launch" onClick={openApp}>
        <span className="flat-app-window-chrome">
          <span className="flat-traffic"><i /><i /><i /></span>
          <b>{isVi ? 'Trò chơi lớp học · Native' : 'Classroom game · Native'}</b>
        </span>
        <span className="flat-app-window-body">
          <span className="flat-app-window-art external-app-tile-icon">VQ</span>
          <span className="flat-app-window-copy">
            <small>{isVi ? 'Tiện ích giáo viên' : 'Teacher utility'}</small>
            <strong>{isVi ? 'Gọi tên học sinh' : 'Random Student Picker'}</strong>
            <em>{isVi
              ? '12 chế độ, chia đội, đánh dấu vắng và chống gọi lặp.'
              : '12 modes, team split, absence marking and no-repeat picking.'}</em>
          </span>
          <span className="flat-app-window-cta">{isVi ? 'Mở ứng dụng' : 'Open app'}</span>
          <span className="flat-app-window-decoration" />
        </span>
      </button>
    </article>
  );
}

export default function RandomStudentPickerAppsCard({ currentUser, language = 'vi' }) {
  const [route, setRoute] = useState(() => window.location.hash.replace(/^#\//, '').split('?')[0]);
  const [grid, setGrid] = useState(null);

  useEffect(() => {
    const updateRoute = () => setRoute(window.location.hash.replace(/^#\//, '').split('?')[0]);
    window.addEventListener('hashchange', updateRoute);
    return () => window.removeEventListener('hashchange', updateRoute);
  }, []);

  useEffect(() => {
    if (!currentUser || route !== 'apps') {
      setGrid(null);
      return undefined;
    }

    const findGrid = () => {
      const next = document.querySelector('.metro-clean-system[data-route="apps"] .flat-apps-collage-grid')
        || document.querySelector('.flat-apps-collage-grid');
      setGrid((current) => (current === next ? current : next));
    };

    findGrid();
    const observer = new MutationObserver(findGrid);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [currentUser, route]);

  if (!currentUser || route !== 'apps' || !grid) return null;
  return createPortal(<RandomPickerAppCard language={language} />, grid);
}
