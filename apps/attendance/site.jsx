import React, { useEffect, useRef, useState } from 'react';
import AdminMfaSecurity from '../../src/components/AdminMfaSecurity.jsx';
import TeacherFirstLoginPasswordGate from '../../src/components/TeacherFirstLoginPasswordGate.jsx';
import { LoginPaperMasthead } from '../../src/features/login-scrapbook/LoginPaperArtwork.jsx';
import AttendanceWorkspace from '../../src/pages/AttendanceWorkspace.jsx';
import AuthPage from '../../src/pages/AuthPage.jsx';
import { bootRuntimeCore } from '../../src/services/runtime/core.js';
import { useRuntimeCore } from '../../src/services/runtime/useRuntimeCore.js';
import { withAttendanceReadOnlyAccess } from '../../src/utils/attendanceReadonlyAccess.js';
import { logoutUser } from '../../src/utils/auth.js';
import { hasRouteAccess } from '../../src/utils/permissions.js';
import { installUsernameAuthBridge } from '../../src/utils/usernameAccounts.js';
import '../../src/supplementalLearningRouteBootstrap.js';

installUsernameAuthBridge();

function readRoute() {
  const { hash, href } = window.location;
  if (href.includes('type=recovery') || href.includes('recovery=1')) return 'login';
  if (/^#\/register(?:$|\?)/.test(hash)) return 'register';
  return 'attendance';
}

export default function AttendanceSite() {
  const runtime = useRuntimeCore();
  const [route, setRoute] = useState(readRoute);
  const [signOutError, setSignOutError] = useState(false);
  const attendanceHash = useRef(
    /^#\/attendance(?:$|\?)/.test(window.location.hash) ? window.location.hash : '#/attendance',
  );
  const user = runtime.profile;
  const isSignedIn = user?.provider === 'supabase' && user.approved === true;
  const showLogin = !isSignedIn || route === 'login';
  const canAccess = isSignedIn && hasRouteAccess(withAttendanceReadOnlyAccess(user), 'attendance');

  useEffect(() => {
    const syncRoute = () => setRoute(readRoute());
    window.addEventListener('hashchange', syncRoute);
    return () => window.removeEventListener('hashchange', syncRoute);
  }, []);

  async function handleLogout() {
    setSignOutError(false);
    try {
      await logoutUser();
      attendanceHash.current = '#/attendance';
      window.location.hash = '#/login';
    } catch {
      setSignOutError(true);
    }
  }

  if (!runtime.ready) {
    return runtime.phase === 'error' ? (
      <main className="attendance-site-status">
        <h1>Điểm danh</h1>
        <p role="alert">Chưa thể kết nối để kiểm tra phiên đăng nhập.</p>
        <button type="button" onClick={() => bootRuntimeCore({ force: true }).catch(() => {})}>Thử lại</button>
      </main>
    ) : <p className="attendance-site-status" role="status">Đang kiểm tra phiên đăng nhập…</p>;
  }

  return (
    <div className="app-shell attendance-site" data-route={showLogin ? 'login' : 'attendance'}
      data-login-scrapbook={showLogin && route !== 'register' ? 'on' : undefined}>
      {showLogin ? (
        <>
          {route !== 'register' && <LoginPaperMasthead language="vi" />}
          <main>
            <AuthPage language="vi" mode={route === 'register' ? 'register' : 'login'}
              scrapbookActive={route !== 'register'} onLogin={() => { window.location.hash = attendanceHash.current; }} />
          </main>
        </>
      ) : (
        <>
          <header className="attendance-site-header">
            <a href="#/attendance" aria-label="Trang chính Điểm danh">
              <img src="/brian-english-brand-logo.png" alt="" width="38" height="38" />
              <strong>Điểm danh</strong>
            </a>
            <div>
              <span>{user.name}</span>
              <button type="button" onClick={handleLogout}>Đăng xuất</button>
            </div>
          </header>
          {signOutError && <p className="attendance-site-status" role="alert">Chưa đăng xuất được. Vui lòng thử lại.</p>}
          {canAccess ? (
            <main className="attendance-site-content">
              <AttendanceWorkspace currentUser={user} language="vi" />
            </main>
          ) : (
            <main className="attendance-site-status">
              <h1>Điểm danh</h1>
              <p role="alert">Tài khoản này chưa có quyền truy cập Điểm danh.</p>
            </main>
          )}
          {user.role === 'admin' && <AdminMfaSecurity user={user} route="attendance" language="vi" />}
          <TeacherFirstLoginPasswordGate currentUser={user} language="vi" />
        </>
      )}
    </div>
  );
}
