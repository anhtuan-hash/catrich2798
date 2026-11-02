import React, { useEffect, useState } from 'react';
import { isAdminRole } from '../../utils/roles.js';
import { loadDashboardScrapbookTheme, saveDashboardScrapbookTheme, useDashboardScrapbookTheme } from '../../utils/dashboardScrapbookTheme.js';
import './DashboardScrapbookAdminPanel.css';

export default function DashboardScrapbookAdminPanel({ currentUser, language = 'vi' }) {
  const theme = useDashboardScrapbookTheme();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const en = language === 'en';
  const admin = isAdminRole(currentUser?.role) && currentUser?.provider === 'supabase';
  useEffect(() => {
    if (!admin) return undefined;
    let active = true;
    loadDashboardScrapbookTheme().then(result => {
      if (active && !result.ok) setFeedback({ error: true, text: result.error });
    });
    return () => { active = false; };
  }, [admin]);
  if (!admin) return null;
  const run = async action => {
    if (busy) return;
    setBusy(true); setFeedback(null);
    try {
      const result = await action();
      setFeedback({ error: !result.ok, text: result.ok
        ? (en ? 'Dashboard appearance saved for everyone.' : 'Đã lưu giao diện Dashboard cho mọi tài khoản.')
        : result.error });
    } catch (error) { setFeedback({ error: true, text: error.message }); }
    finally { setBusy(false); }
  };
  return <article className="settings-google-card dashboard-scrapbook-admin" id="settings-dashboard-scrapbook">
    <div className="dashboard-scrapbook-admin__preview" aria-hidden="true"><span>November</span><b>Dashboard</b><i>paper · plans · inspiration</i></div>
    <div className="dashboard-scrapbook-admin__copy">
      <small>BRIAN ENGLISH · LAYERED PAPER COLLAGE</small>
      <h2>{en ? 'November Dashboard · Scrapbook' : 'Dashboard tháng 11 · Scrapbook'}</h2>
      <p>{en ? 'Warm paper, torn edges, pastel layers and handwritten greetings. Covers navigation, the greeting, work planner, news and footer on Dashboard.' : 'Nền giấy sáng, mép xé, nhiều lớp pastel và lời chào viết tay. Áp dụng cho điều hướng, lời chào, lịch làm việc, tin tức và footer trên Dashboard.'}</p>
      <p>{en ? 'Turn off to restore the original Dashboard. Your schedule, articles and published Hero remain unchanged. Independent of the Home theme.' : 'Tắt để khôi phục Dashboard gốc. Giữ nguyên lịch làm việc, tin tức và Hero đã công bố. Hoạt động độc lập với chủ đề Trang chủ.'}</p>
      <strong className="dashboard-scrapbook-admin__status" aria-live="polite">{busy ? (en ? 'Saving…' : 'Đang lưu…') : !theme.verified ? (en ? 'Waiting for server settings' : 'Đang chờ cấu hình máy chủ') : theme.enabled ? (en ? 'Scrapbook enabled' : 'Đang bật Scrapbook') : (en ? 'Original Dashboard' : 'Dashboard nguyên bản')}</strong>
      <small>{en ? 'Approved administrators only · Syncs across accounts and devices' : 'Chỉ Admin đã duyệt · Đồng bộ giữa các tài khoản và thiết bị'}</small>
    </div>
    <button type="button" className="dashboard-scrapbook-admin__switch" role="switch"
      aria-label={en ? 'November Dashboard Scrapbook' : 'Dashboard tháng 11 Scrapbook'}
      aria-checked={theme.enabled} disabled={busy || !theme.verified}
      onClick={() => run(() => saveDashboardScrapbookTheme(!theme.enabled))}><span /></button>
    {feedback && <p className={`dashboard-scrapbook-admin__feedback${feedback.error ? ' is-error' : ''}`} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
    {(!theme.verified || feedback?.error) && <button type="button" className="dashboard-scrapbook-admin__retry" disabled={busy} onClick={() => run(loadDashboardScrapbookTheme)}>{en ? 'Reload settings' : 'Tải lại cấu hình'}</button>}
  </article>;
}
