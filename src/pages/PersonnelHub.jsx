import React, { useEffect } from 'react';

/**
 * Compatibility tombstone for retired Personnel Management links.
 * The application itself, its API, data client and styles have been removed.
 */
export default function PersonnelHub() {
  useEffect(() => {
    if (window.location.hash.startsWith('#/tool/personnel-hub')) {
      window.location.hash = '#/apps';
    }
  }, []);

  return (
    <main className="page narrow" aria-live="polite">
      <section className="panel empty-state">
        <h1>Ứng dụng Quản lý nhân sự đã được gỡ bỏ</h1>
        <p>Đang chuyển về danh sách ứng dụng…</p>
        <button type="button" className="primary" onClick={() => { window.location.hash = '#/apps'; }}>
          Về trang Ứng dụng
        </button>
      </section>
    </main>
  );
}
