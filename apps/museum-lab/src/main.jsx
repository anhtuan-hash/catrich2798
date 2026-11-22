import React, { lazy, Suspense, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from '../../../src/utils/supabase.js';
import './standalone.css';
import { DisplayFrame, DisplaySettings, useMuseumDisplay } from './DisplaySettings.jsx';

const MuseumLab = lazy(() => import('../../../src/features/immersive-gallery/v3/MuseumLabApp.jsx'));
const StudentWorkshop = lazy(() => import('../../../src/features/immersive-gallery/v3/MuseumLabStudent.jsx'));
const home = '#/tool/immersive-gallery';
const staffLogin = '#/staff-login';
const siteName = '@brian.universe';

function useHash() {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const update = () => setHash(window.location.hash);
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);
  return hash;
}

function StaffLogin({ onSignedIn }) {
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
      const { data, error } = await supabase.auth.signInWithPassword({
        email: String(form.get('email')).trim(),
        password: String(form.get('password')),
      });
      if (error || !data?.session) {
        setError(`Không đăng nhập được. Hãy kiểm tra email và mật khẩu ${siteName}.`);
        return;
      }
      onSignedIn(data.session);
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
  const [session, setSession] = useState(() => supabase ? undefined : null);
  const [signOutError, setSignOutError] = useState('');
  const [settingsLanguage, setSettingsLanguage] = useState('vi');
  const { saved, draft, setDraft, save } = useMuseumDisplay(session?.access_token);
  const openDisplaySettings = language => {
    setSettingsLanguage(language);
    setDraft(saved);
  };
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, next) => setSession(current => event === 'INITIAL_SESSION' && current !== undefined ? current : next),
    );
    return () => subscription.unsubscribe();
  }, []);
  const route = hash.split('?')[0];
  const signedIn = (next) => {
    setSession(next);
    window.location.hash = home;
  };
  const signOut = async () => {
    setSignOutError('');
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      setSignOutError('Không đăng xuất được. Vui lòng thử lại.');
      return;
    }
    setSession(null);
    setDraft(null);
    window.location.hash = home;
  };
  if (route === '#/gallery-create') {
    return (
      <DisplayFrame display={saved}>
        <Suspense fallback={<p role="status">Đang mở bài nộp…</p>}><StudentWorkshop /></Suspense>
      </DisplayFrame>
    );
  }
  return (
    <DisplayFrame display={draft ?? saved}>
      <header className="museum-site-bar">
        <a className="museum-site-title" href={home}>{siteName}</a>
        {session === undefined ? <span role="status">Đang kiểm tra phiên đăng nhập…</span> : session ? (
          <div className="museum-staff-session">
            <span>Đã đăng nhập</span>
            <button type="button" onClick={signOut}>Đăng xuất</button>
          </div>
        ) : <a href={staffLogin}>Đăng nhập giáo viên</a>}
      </header>
      {signOutError && <p role="alert">{signOutError}</p>}
      {session === undefined ? <p className="museum-site-loading">Đang mở {siteName}…</p> : route === staffLogin && !session ? (
        <StaffLogin onSignedIn={signedIn} />
      ) : (
        <Suspense fallback={<p className="museum-site-loading" role="status">Đang tải {siteName}…</p>}>
          <MuseumLab key={session?.user.id ?? 'guest'} currentUser={session?.user}
            publicReadOnly={!session} language="vi" standalone onDisplaySettings={openDisplaySettings} />
        </Suspense>
      )}
      {draft && <DisplaySettings draft={draft} onChange={setDraft} onSave={save}
        onClose={() => setDraft(null)} language={settingsLanguage} />}
    </DisplayFrame>
  );
}

createRoot(document.getElementById('root')).render(<App />);
