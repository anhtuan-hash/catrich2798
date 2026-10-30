import React, { useState } from 'react';
import { isAdminRole } from '../../utils/roles.js';
import { uploadHomeHeroMedia } from '../../utils/homepageHeroCms.js';
import { useNovemberHomeTheme, saveNovemberHomeTheme, saveNovemberAvatar, loadNovemberHomeTheme } from '../../utils/novemberHomeTheme.js';
import './NovemberHomeAdminPanel.css';

export default function NovemberHomeAdminPanel({ currentUser, language = 'vi' }) {
  const theme = useNovemberHomeTheme();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(false);
  const en = language === 'en';
  if (!isAdminRole(currentUser?.role) || currentUser?.provider !== 'supabase') return null;
  const run = async action => {
    setBusy(true); setMessage(''); setError(false);
    try {
      const result = await action();
      if (!result.ok) throw new Error(result.error);
      setMessage(en ? 'Saved for everyone.' : 'Đã lưu và đồng bộ cho mọi người.');
    } catch (err) { setError(true); setMessage(err.message || (en ? 'Could not save.' : 'Không lưu được.')); }
    finally { setBusy(false); }
  };
  const upload = event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    void run(async () => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error(en ? 'Choose a JPG, PNG or WebP up to 5 MB.' : 'Chọn ảnh JPG, PNG hoặc WebP tối đa 5 MB.');
      const result = await uploadHomeHeroMedia(file, currentUser);
      if (!result.databaseReady || result.temporary || !result.url?.startsWith('https://')) throw new Error(en ? 'Image has not been uploaded.' : 'Ảnh chưa được tải lên máy chủ.');
      return saveNovemberAvatar(result.url);
    });
  };
  return <article className="settings-google-card november-admin" id="settings-november-home">
    <div className="november-admin__preview" aria-hidden="true"><span>{en ? 'Thank you' : 'Tri ân'}<br /><b>20/11</b></span></div>
    <div className="november-admin__copy">
      <small>BRIAN ENGLISH · NOVEMBER</small>
      <h2>{en ? 'November · Teachers’ Day' : 'Tháng 11 · Tri ân 20/11'}</h2>
      <p>{en ? 'Layered paper scrapbook for Home, weekly practice and footer. Turning it off restores the original appearance. Enabling this theme replaces Halloween.' : 'Lớp giấy scrapbook cho trang chủ, bài tập tuần và footer. Tắt để trở về giao diện gốc. Bật chủ đề này sẽ thay thế Halloween.'}</p>
      <p className="november-admin__status">{theme.verified ? (theme.enabled ? (en ? 'Theme is on' : 'Đang bật chủ đề 20/11') : (en ? 'Theme is off' : 'Đang tắt chủ đề 20/11')) : (en ? 'Loading settings…' : 'Đang đọc cấu hình…')}</p>
      {!theme.verified && <button type="button" disabled={busy} onClick={() => run(loadNovemberHomeTheme)}>{en ? 'Reload settings' : 'Tải lại cấu hình'}</button>}
      <div className="november-admin__avatar">
        {theme.avatarUrl && <img src={theme.avatarUrl} alt={en ? 'Footer portrait' : 'Ảnh đại diện footer'} />}
        <label><span>{en ? 'Upload footer portrait' : 'Tải ảnh đại diện footer'}</span><input type="file" accept="image/png,image/jpeg,image/webp" disabled={busy || !theme.verified} onChange={upload} /></label>
        {theme.avatarUrl && <button type="button" disabled={busy} onClick={() => run(() => saveNovemberAvatar(''))}>{en ? 'Remove portrait' : 'Gỡ ảnh'}</button>}
      </div>
      <small>{en ? 'Admin only · Visible to guests and all accounts' : 'Chỉ admin được thay đổi · Áp dụng cho khách và mọi tài khoản'}</small>
    </div>
    <button type="button" className="november-admin__switch" role="switch" aria-label={en ? 'November Teachers’ Day theme' : 'Chủ đề tháng 11 Tri ân 20/11'} aria-checked={theme.enabled} disabled={busy || !theme.verified} onClick={() => run(() => saveNovemberHomeTheme(!theme.enabled))}><span /></button>
    {message && <p className={`november-admin__feedback${error ? ' is-error' : ''}`} role={error ? 'alert' : 'status'}>{message}</p>}
  </article>;
}
