import React, { useEffect, useState } from 'react';
import { isAdminRole } from '../../utils/roles.js';
import { loadGradebookScrapbookTheme, saveGradebookScrapbookTheme, useGradebookScrapbookTheme } from '../../utils/gradebookScrapbookTheme.js';
import './GradebookScrapbookAdminPanel.css';

export default function GradebookScrapbookAdminPanel({ currentUser, language = 'vi' }) {
  const theme = useGradebookScrapbookTheme();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const en = language === 'en';
  const admin = isAdminRole(currentUser?.role) && currentUser?.provider === 'supabase';
  useEffect(() => {
    if (!admin) return undefined;
    let active = true;
    loadGradebookScrapbookTheme().then(result => {
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
          : (en ? 'Gradebook appearance saved for everyone.' : 'Đã lưu giao diện Sổ điểm cho mọi tài khoản.'))
        : result.error });
    } catch (error) { setFeedback({ error: true, text: error.message }); }
    finally { setBusy(false); }
  };
  return <article className="settings-google-card gradebook-scrapbook-admin" id="settings-gradebook-scrapbook" aria-labelledby="gradebook-scrapbook-heading" aria-busy={busy}>
    <div className="gradebook-scrapbook-admin__layout">
    <div className="gradebook-scrapbook-admin__preview" aria-hidden="true"><span>Brian English</span><b>Gradebook</b><i>scores · students · reports</i></div>
    <div className="gradebook-scrapbook-admin__copy">
      <small>BRIAN ENGLISH · LAYERED PAPER COLLAGE</small>
      <h2 id="gradebook-scrapbook-heading">{en ? 'Gradebook · Scrapbook' : 'Sổ điểm · Scrapbook'}</h2>
      <p>{en ? 'Warm kraft paper, postcard stickers, colorful score tabs and ruled notebook tables for class scores, students and reports.' : 'Giấy kraft, ảnh bưu thiếp, tab pastel và trang sổ kẻ ô cho nhập điểm, quản lý học sinh và xuất báo cáo.'}</p>
      <p>{en ? 'Turn off to restore the original gradebook workspace.' : 'Tắt công tắc để trở về giao diện Sổ điểm gốc.'}</p>
      <strong className="gradebook-scrapbook-admin__status" aria-live="polite">{busy ? (en ? 'Saving…' : 'Đang lưu…') : !theme.verified ? (en ? 'Waiting for server settings' : 'Đang chờ cấu hình máy chủ') : theme.enabled ? (en ? 'Scrapbook enabled' : 'Đang bật Scrapbook Sổ điểm') : (en ? 'Original Gradebook' : 'Sổ điểm nguyên bản')}</strong>
      <small>{en ? 'Approved administrators only · Syncs across accounts and devices' : 'Chỉ Admin đã duyệt · Đồng bộ giữa các tài khoản và thiết bị'}</small>
    </div>
    <button type="button" className="gradebook-scrapbook-admin__switch" role="switch"
      aria-label={en ? 'Gradebook Scrapbook' : 'Giao diện Sổ điểm Scrapbook'}
      aria-checked={theme.enabled} disabled={busy || !theme.verified}
      onClick={() => run(() => saveGradebookScrapbookTheme(!theme.enabled))}><span /></button>
    </div>
    {feedback && <p className={`gradebook-scrapbook-admin__feedback${feedback.error ? ' is-error' : ''}`} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
    {(!theme.verified || feedback?.error) && <button type="button" className="gradebook-scrapbook-admin__retry" disabled={busy} onClick={() => run(loadGradebookScrapbookTheme, true)}>{en ? 'Reload settings' : 'Tải lại cấu hình'}</button>}
  </article>;
}
