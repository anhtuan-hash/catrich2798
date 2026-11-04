import React, { useEffect, useState } from 'react';
import { isAdminRole } from '../../utils/roles.js';
import { loginScrapbook } from './theme.js';

export default function LoginScrapbookSetting({ currentUser, language = 'vi' }) {
  const admin = currentUser?.provider === 'supabase' && currentUser.approved === true && isAdminRole(currentUser.role);
  const theme = loginScrapbook.useTheme(admin);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const vi = language !== 'en';

  useEffect(() => {
    if (!admin) return;
    let mounted = true;
    loginScrapbook.load().then(result => {
      if (mounted && !result.ok) setError(result.error);
    });
    return () => { mounted = false; };
  }, [admin]);
  useEffect(() => { if (theme.verified) setError(''); }, [theme.verified]);
  if (!admin) return null;

  async function update(reload = false) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await (reload ? loginScrapbook.load() : loginScrapbook.save(!theme.enabled));
      if (!result.ok) setError(result.error);
    } finally {
      setBusy(false);
    }
  }

  return <article id="settings-login-scrapbook" className="settings-google-card tone-blue" aria-labelledby="login-paper-title" aria-busy={busy}>
    <header className="settings-m3-card-head"><div>
      <h2 id="login-paper-title">{vi ? 'Đăng nhập · Scrapbook' : 'Login · Scrapbook'}</h2>
      <p>{vi ? 'Trang đăng nhập giáo viên với sổ tay, giấy xé và hình minh hoạ theo mẫu.' : 'Teacher sign-in with the reference notebook, torn paper and illustrations.'}</p>
    </div></header>
    <div className="settings-m3-row"><div>
      <strong role="status">{!theme.verified ? (vi ? 'Đang chờ cấu hình máy chủ' : 'Waiting for settings') : theme.enabled
        ? (vi ? 'Đang dùng giao diện Scrapbook' : 'Scrapbook is on') : (vi ? 'Đang dùng giao diện gốc' : 'Original appearance is on')}</strong>
      <small>{vi ? 'Áp dụng cho trang đăng nhập trên mọi thiết bị. Tắt để khôi phục giao diện gốc.' : 'Applies to the sign-in page on every device. Switch off to restore its original appearance.'}</small>
    </div><div className="settings-m3-row-control">
      <button type="button" role="switch" className={'settings-m3-toggle' + (theme.enabled ? ' is-on' : '')}
        aria-label={vi ? 'Giao diện Đăng nhập Scrapbook' : 'Login Scrapbook'} aria-checked={theme.enabled}
        disabled={busy || !theme.verified} onClick={() => update()}><span /></button>
    </div></div>
    {error && <p role="alert">{error}</p>}
    {(error || !theme.verified) && <button type="button" className="settings-m3-outlined-button" disabled={busy}
      onClick={() => update(true)}>{vi ? 'Tải lại cấu hình' : 'Reload settings'}</button>}
  </article>;
}
