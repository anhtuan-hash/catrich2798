import React, { useEffect, useState } from 'react';
import { isAdminRole } from '../../utils/roles.js';
import { loadAppsScrapbookTheme, saveAppsScrapbookTheme, useAppsScrapbookTheme } from '../../utils/appsScrapbookTheme.js';
import './AppsScrapbookAdminPanel.css';

export default function AppsScrapbookAdminPanel({ currentUser, language = 'vi' }) {
  const theme = useAppsScrapbookTheme();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const en = language === 'en';
  const admin = isAdminRole(currentUser?.role) && currentUser?.provider === 'supabase';
  useEffect(() => {
    if (!admin) return undefined;
    let active = true;
    loadAppsScrapbookTheme().then(result => {
      if (active && !result.ok) setFeedback({ error: true, source: 'load', text: result.error });
    });
    return () => { active = false; };
  }, [admin]);
  useEffect(() => {
    if (theme.verified) setFeedback(previous => previous?.source === 'load' ? null : previous);
  }, [theme.verified]);
  if (!admin) return null;
  const run = async (action, reloading = false) => {
    if (busy) return;
    setBusy(true); setFeedback(null);
    try {
      const result = await action();
      setFeedback({ error: !result.ok, source: reloading ? 'load' : 'save', text: result.ok
        ? (reloading
          ? (en ? 'Settings refreshed.' : 'Đã tải lại cấu hình.')
          : (en ? 'Apps appearance saved for everyone.' : 'Đã lưu giao diện Ứng dụng cho mọi tài khoản.'))
        : result.error });
    } catch (error) { setFeedback({ error: true, text: error.message }); }
    finally { setBusy(false); }
  };
  return <article className="settings-google-card apps-scrapbook-admin" id="settings-apps-scrapbook" aria-labelledby="apps-scrapbook-heading" aria-busy={busy}>
    <div className="apps-scrapbook-admin__layout">
    <div className="apps-scrapbook-admin__preview" aria-hidden="true"><span>Brian English</span><b>App Directory</b><i>paper · tools · creativity</i></div>
    <div className="apps-scrapbook-admin__copy">
      <small>BRIAN ENGLISH · LAYERED PAPER COLLAGE</small>
      <h2 id="apps-scrapbook-heading">{en ? 'App Directory · Scrapbook' : 'Ứng dụng · Scrapbook'}</h2>
      <p>{en ? 'Blue and pink paper layers, a laptop collage and paper app cards. Covers the Apps header, directory, navigation and footer.' : 'Giấy xếp lớp xanh–hồng, minh họa laptop và thẻ ứng dụng viền giấy. Áp dụng cho tiêu đề, kho ứng dụng, điều hướng và footer trên trang Ứng dụng.'}</p>
      <p>{en ? 'Turn off to restore the original App Directory. App access, pins and launcher settings stay the same. Independent of Home and Dashboard.' : 'Tắt để khôi phục giao diện Ứng dụng gốc. Giữ nguyên quyền truy cập, ứng dụng đã ghim và cấu hình launcher. Hoạt động độc lập với Trang chủ và Dashboard.'}</p>
      <strong className="apps-scrapbook-admin__status" aria-live="polite">{busy ? (en ? 'Saving…' : 'Đang lưu…') : !theme.verified ? (en ? 'Waiting for server settings' : 'Đang chờ cấu hình máy chủ') : theme.enabled ? (en ? 'Scrapbook enabled' : 'Đang bật Scrapbook') : (en ? 'Original App Directory' : 'Ứng dụng nguyên bản')}</strong>
      <small>{en ? 'Approved administrators only · Syncs across accounts and devices' : 'Chỉ Admin đã duyệt · Đồng bộ giữa các tài khoản và thiết bị'}</small>
    </div>
    <button type="button" className="apps-scrapbook-admin__switch" role="switch"
      aria-label={en ? 'App Directory Scrapbook' : 'Giao diện Ứng dụng Scrapbook'}
      aria-checked={theme.enabled} disabled={busy || !theme.verified}
      onClick={() => run(() => saveAppsScrapbookTheme(!theme.enabled))}><span /></button>
    </div>
    {feedback && <p className={`apps-scrapbook-admin__feedback${feedback.error ? ' is-error' : ''}`} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
    {(!theme.verified || feedback?.error) && <button type="button" className="apps-scrapbook-admin__retry" disabled={busy} onClick={() => run(loadAppsScrapbookTheme, true)}>{en ? 'Reload settings' : 'Tải lại cấu hình'}</button>}
  </article>;
}
