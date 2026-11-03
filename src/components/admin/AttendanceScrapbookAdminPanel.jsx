import React, { useEffect, useState } from 'react';
import { isAdminRole } from '../../utils/roles.js';
import { loadAttendanceScrapbookTheme, saveAttendanceScrapbookTheme, useAttendanceScrapbookTheme } from '../../utils/attendanceScrapbookTheme.js';
import './AttendanceScrapbookAdminPanel.css';

export default function AttendanceScrapbookAdminPanel({ currentUser, language = 'vi' }) {
  const theme = useAttendanceScrapbookTheme();
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const en = language === 'en';
  const admin = isAdminRole(currentUser?.role) && currentUser?.provider === 'supabase';
  useEffect(() => {
    if (!admin) return undefined;
    let active = true;
    loadAttendanceScrapbookTheme().then(result => {
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
          : (en ? 'Attendance appearance saved for everyone.' : 'Đã lưu giao diện Điểm danh cho mọi tài khoản.'))
        : result.error });
    } catch (error) { setFeedback({ error: true, text: error.message }); }
    finally { setBusy(false); }
  };
  return <article className="settings-google-card attendance-scrapbook-admin" id="settings-attendance-scrapbook" aria-labelledby="attendance-scrapbook-heading" aria-busy={busy}>
    <div className="attendance-scrapbook-admin__layout">
    <div className="attendance-scrapbook-admin__preview" aria-hidden="true"><span>Brian English</span><b>Attendance</b><i>classes · calendar · reports</i></div>
    <div className="attendance-scrapbook-admin__copy">
      <small>BRIAN ENGLISH · LAYERED PAPER COLLAGE</small>
      <h2 id="attendance-scrapbook-heading">{en ? 'Attendance · Scrapbook' : 'Điểm danh · Scrapbook'}</h2>
      <p>{en ? 'Sky blue paper, pastel tabs and notebook sheets for roll call, schedules, classes, history, supplemental learning and reports.' : 'Nền trời xanh, thẻ pastel và các trang vở cho điểm danh, lịch, quản lý lớp, lịch sử, học bổ sung và báo cáo.'}</p>
      <p>{en ? 'Turn off to restore the original attendance workspace.' : 'Tắt công tắc để trở về giao diện Điểm danh gốc.'}</p>
      <strong className="attendance-scrapbook-admin__status" aria-live="polite">{busy ? (en ? 'Saving…' : 'Đang lưu…') : !theme.verified ? (en ? 'Waiting for server settings' : 'Đang chờ cấu hình máy chủ') : theme.enabled ? (en ? 'Scrapbook enabled' : 'Đang bật Scrapbook') : (en ? 'Original Attendance' : 'Điểm danh nguyên bản')}</strong>
      <small>{en ? 'Approved administrators only · Syncs across accounts and devices' : 'Chỉ Admin đã duyệt · Đồng bộ giữa các tài khoản và thiết bị'}</small>
    </div>
    <button type="button" className="attendance-scrapbook-admin__switch" role="switch"
      aria-label={en ? 'Attendance Scrapbook' : 'Giao diện Điểm danh Scrapbook'}
      aria-checked={theme.enabled} disabled={busy || !theme.verified}
      onClick={() => run(() => saveAttendanceScrapbookTheme(!theme.enabled))}><span /></button>
    </div>
    {feedback && <p className={`attendance-scrapbook-admin__feedback${feedback.error ? ' is-error' : ''}`} role={feedback.error ? 'alert' : 'status'}>{feedback.text}</p>}
    {(!theme.verified || feedback?.error) && <button type="button" className="attendance-scrapbook-admin__retry" disabled={busy} onClick={() => run(loadAttendanceScrapbookTheme, true)}>{en ? 'Reload settings' : 'Tải lại cấu hình'}</button>}
  </article>;
}
