import React, { useEffect, useState } from 'react';
import { loadTtcmScrapbookTheme, saveTtcmScrapbookTheme, useTtcmScrapbookTheme } from './theme.js';

export default function TtcmScrapbookSetting({ language }) {
  const vi = language !== 'en';
  const theme = useTtcmScrapbookTheme();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let mounted = true;
    loadTtcmScrapbookTheme().then(result => {
      if (mounted && !result.ok) setError(result.error);
    });
    return () => { mounted = false; };
  }, []);
  useEffect(() => { if (theme.verified) setError(''); }, [theme.verified]);

  async function update(reload) {
    setBusy(true);
    setError('');
    try {
      const result = await (reload ? loadTtcmScrapbookTheme() : saveTtcmScrapbookTheme(!theme.enabled));
      if (!result.ok) setError(result.error);
    } finally { setBusy(false); }
  }

  return <article id="settings-ttcm-scrapbook" className="settings-google-card tone-blue" aria-labelledby="ttcm-appearance-title" aria-busy={busy}>
    <header className="settings-m3-card-head">
      <div><h2 id="ttcm-appearance-title">{vi ? 'Kênh TTCM · Scrapbook' : 'Department channel · Scrapbook'}</h2>
        <p>{vi ? 'Giấy xếp lớp cho thông báo, lịch làm việc, hồ sơ nhân sự và tệp giáo viên.' : 'Layered paper for announcements, schedules, staff profiles and teacher files.'}</p></div>
    </header>
    <div className="settings-m3-row"><div>
      <strong role="status">{!theme.verified ? (vi ? 'Đang chờ cấu hình máy chủ' : 'Waiting for settings') : theme.enabled
        ? (vi ? 'Đang dùng giao diện Scrapbook' : 'Scrapbook is on') : (vi ? 'Đang dùng giao diện gốc' : 'Original appearance is on')}</strong>
      <small>{vi ? 'Áp dụng cho mọi tài khoản có quyền mở TTCM. Tắt để trở về giao diện gốc.' : 'Applies to everyone with channel access. Turn off to restore the original appearance.'}</small>
    </div><div className="settings-m3-row-control">
      <button type="button" className={'settings-m3-toggle' + (theme.enabled ? ' is-on' : '')} role="switch" aria-checked={theme.enabled}
        aria-label={vi ? 'Giao diện TTCM Scrapbook' : 'Department channel Scrapbook'} disabled={busy || !theme.verified}
        onClick={() => update(false)}><span /></button>
    </div></div>
    {error && <p role="alert">{error}</p>}
    {(error || !theme.verified) && <button type="button" className="settings-m3-outlined-button" disabled={busy} onClick={() => update(true)}>
      {vi ? 'Tải lại cấu hình' : 'Reload settings'}</button>}
  </article>;
}
