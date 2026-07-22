import React, { useEffect, useState } from 'react';
import './DepartmentMicrofrontend.css';

export default function DepartmentMicrofrontend({ language = 'vi' }) {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Remove classes left by the former fullscreen/focus-mode implementation.
    // The Department Workspace now behaves like every other app inside Brian.
    document.documentElement.classList.remove('department-microfrontend-active');
    document.body.classList.remove('department-microfrontend-active');
  }, []);

  const title = language === 'vi' ? 'Tổ chuyên môn' : 'Department Workspace';
  const eyebrow = language === 'vi' ? 'KHÔNG GIAN QUẢN TRỊ' : 'MANAGEMENT WORKSPACE';
  const loadingLabel = language === 'vi'
    ? 'Đang tải không gian Tổ chuyên môn…'
    : 'Loading Department Workspace…';
  const openLabel = language === 'vi' ? 'Mở cửa sổ riêng' : 'Open separately';

  return (
    <section
      className="department-microfrontend department-microfrontend--embedded"
      aria-label={title}
      data-testid="department-microfrontend"
    >
      <header className="department-microfrontend-header">
        <div>
          <span>{eyebrow}</span>
          <h1>{title}</h1>
        </div>

        <a
          className="department-microfrontend-new"
          href="/to-chuyen-mon/"
          target="_blank"
          rel="noreferrer"
        >
          {openLabel}
        </a>
      </header>

      <div className="department-microfrontend-frame">
        {!loaded ? (
          <div className="department-microfrontend-loading" role="status">
            <span aria-hidden="true" />
            <strong>{loadingLabel}</strong>
          </div>
        ) : null}

        <iframe
          title={title}
          src="/to-chuyen-mon/?embedded=1"
          allow="clipboard-read; clipboard-write"
          onLoad={() => setLoaded(true)}
        />
      </div>
    </section>
  );
}
