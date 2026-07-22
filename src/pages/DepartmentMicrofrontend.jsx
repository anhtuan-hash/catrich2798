import React, { useEffect, useState } from 'react';
import './DepartmentMicrofrontend.css';

export default function DepartmentMicrofrontend({ language = 'vi' }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, []);

  const backLabel = language === 'vi' ? 'Quay lại Brian' : 'Back to Brian';
  const loadingLabel = language === 'vi' ? 'Đang mở Tổ chuyên môn…' : 'Opening Department Workspace…';

  return (
    <section className="department-microfrontend" aria-label={language === 'vi' ? 'Ứng dụng Tổ chuyên môn' : 'Department Workspace'}>
      {!loaded ? <div className="department-microfrontend-loading"><span /><strong>{loadingLabel}</strong></div> : null}
      <iframe
        title={language === 'vi' ? 'Tổ chuyên môn' : 'Department Workspace'}
        src="/to-chuyen-mon/"
        allow="clipboard-read; clipboard-write"
        onLoad={() => setLoaded(true)}
      />
      <button
        type="button"
        className="department-microfrontend-back"
        onClick={() => { window.location.hash = '#/apps'; }}
        aria-label={backLabel}
      >
        <span aria-hidden="true">←</span><strong>{backLabel}</strong>
      </button>
      <a className="department-microfrontend-new" href="/to-chuyen-mon/" target="_blank" rel="noreferrer">
        {language === 'vi' ? 'Mở cửa sổ riêng' : 'Open separately'}
      </a>
    </section>
  );
}
