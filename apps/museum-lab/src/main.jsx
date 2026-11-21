import React, { lazy, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '../../../src/utils/supabase.js';
import './standalone.css';

const MuseumLab = lazy(() => import('../../../src/features/immersive-gallery/v3/MuseumLabApp.jsx'));
const StudentWorkshop = lazy(() => import('../../../src/features/immersive-gallery/v3/MuseumLabStudent.jsx'));
const home = '#/tool/immersive-gallery';
const staffLogin = '#/staff-login';

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return hash;
}

function StaffLogin() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function signIn(event) {
    event.preventDefault();
    if (!supabase) {
      setError('Đăng nhập giáo viên chưa được cấu hình.');
      return;
    }
    const form = new FormData(event.currentTarget);
    setBusy(true);
    setError('');
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: String(form.get('email')).trim(),
        password: String(form.get('password')),
      });
      if (error) {
        setError('Không đăng nhập được. Hãy kiểm tra email và mật khẩu Museum Lab.');
        return;
      }
      window.location.hash = home;
    } catch {
      setError('Không kết nối được với hệ thống đăng nhập.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="museum-sign-in">
      <h1>Đăng nhập giáo viên</h1>
      <form onSubmit={signIn}>
        <label>Email<input name="email" type="email" autoComplete="username" required /></label>
        <label>Mật khẩu<input name="password" type="password" autoComplete="current-password" required /></label>
        {error && <p role="alert">{error}</p>}
        <button disabled={busy} type="submit">{busy ? 'Đang đăng nhập…' : 'Đăng nhập'}</button>
      </form>
    </main>
  );
}

function App() {
  const hash = useHash();
  const [session, setSession] = useState(null);
  const [signOutError, setSignOutError] = useState('');
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, next) => setSession(next),
    );
    return () => subscription.unsubscribe();
  }, []);
  const route = hash.split('?')[0];
  const signOut = async () => {
    setSignOutError('');
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      setSignOutError('Không đăng xuất được. Vui lòng thử lại.');
      return;
    }
    window.location.hash = home;
  };
  if (route === '#/gallery-create') {
    return <Suspense fallback={<p role="status">Đang mở bài nộp…</p>}><StudentWorkshop /></Suspense>;
  }
  return (
    <>
      <header className="museum-site-bar">
        <a className="museum-site-title" href={home}>Museum Lab</a>
        {session
          ? <button type="button" onClick={signOut}>Đăng xuất</button>
          : <a href={staffLogin}>Đăng nhập giáo viên</a>}
      </header>
      {signOutError && <p role="alert">{signOutError}</p>}
      {route === staffLogin ? <StaffLogin /> : (
        <Suspense fallback={<p className="museum-site-loading" role="status">Đang tải Museum Lab…</p>}>
          <MuseumLab key={session ? 'staff' : 'guest'} currentUser={session?.user}
            publicReadOnly={!session} language="vi" />
        </Suspense>
      )}
    </>
  );
}

createRoot(document.getElementById('root')).render(<App />);
