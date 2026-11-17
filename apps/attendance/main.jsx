import React, { Suspense, lazy } from 'react';
import { createRoot } from 'react-dom/client';
import AppErrorBoundary from '../../src/components/AppErrorBoundary.jsx';
import '../../src/styles/Foundation.css';
import '../../src/styles/BrianShell.css';
import './standalone.css';

const AttendanceSite = lazy(() => import('./site.jsx'));

function LoadingMessage() {
  return <p className="attendance-site-status" role="status">Đang mở Điểm danh…</p>;
}

createRoot(document.getElementById('root')).render(
  <AppErrorBoundary scope="attendance-site" label="Điểm danh">
    {import.meta.env.VITE_ATTENDANCE_BACKEND_CONFIGURED ? (
      <Suspense fallback={<LoadingMessage />}>
        <AttendanceSite />
      </Suspense>
    ) : (
      <main className="attendance-site-status">
        <h1>Điểm danh</h1>
        <p>Website đang chờ kết nối với cơ sở dữ liệu Điểm danh.</p>
      </main>
    )}
  </AppErrorBoundary>,
);
