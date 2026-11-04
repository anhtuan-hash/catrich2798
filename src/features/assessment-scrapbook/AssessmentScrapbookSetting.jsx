import React, { useEffect, useState } from 'react';
import { isAdminRole } from '../../utils/roles.js';
import { assessmentScrapbook } from './theme.js';

export default function AssessmentScrapbookSetting({ currentUser, language = 'vi' }) {
  const admin = currentUser?.provider === 'supabase' && currentUser.approved === true && isAdminRole(currentUser.role);
  const theme = assessmentScrapbook.useTheme(admin);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const vi = language !== 'en';

  useEffect(() => {
    if (!admin) return;
    let mounted = true;
    assessmentScrapbook.load().then(result => {
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
      const result = await (reload ? assessmentScrapbook.load() : assessmentScrapbook.save(!theme.enabled));
      if (!result.ok) setError(result.error);
    } finally {
      setBusy(false);
    }
  }

  return <article id="settings-assessment-scrapbook" className="settings-google-card tone-blue" aria-labelledby="assessment-paper-title" aria-busy={busy}>
    <header className="settings-m3-card-head"><div>
      <h2 id="assessment-paper-title">{vi ? 'Kiểm tra · Scrapbook' : 'Assessment · Scrapbook'}</h2>
      <p>{vi ? 'Trình bày kho hoạt động, bộ lọc và hàng đợi giảng dạy trên các lớp giấy màu.' : 'Layered paper for the activity library, filters and teaching queue.'}</p>
    </div></header>
    <div className="settings-m3-row"><div>
      <strong role="status">{!theme.verified ? (vi ? 'Đang chờ cấu hình máy chủ' : 'Waiting for settings') : theme.enabled
        ? (vi ? 'Đang dùng giao diện Scrapbook' : 'Scrapbook is on') : (vi ? 'Đang dùng giao diện gốc' : 'Original appearance is on')}</strong>
      <small>{vi ? 'Áp dụng cho mọi tài khoản có quyền mở Kiểm tra. Tắt để khôi phục giao diện gốc.' : 'Applies to everyone with Assessment access. Switch off to restore its original appearance.'}</small>
    </div><div className="settings-m3-row-control">
      <button type="button" role="switch" className={'settings-m3-toggle' + (theme.enabled ? ' is-on' : '')}
        aria-label={vi ? 'Giao diện Kiểm tra Scrapbook' : 'Assessment Scrapbook'} aria-checked={theme.enabled}
        disabled={busy || !theme.verified} onClick={() => update()}><span /></button>
    </div></div>
    {error && <p role="alert">{error}</p>}
    {(error || !theme.verified) && <button type="button" className="settings-m3-outlined-button" disabled={busy}
      onClick={() => update(true)}>{vi ? 'Tải lại cấu hình' : 'Reload settings'}</button>}
  </article>;
}
