import React, { useEffect, useState } from 'react';
import {
  applyGlobalSubtitlesVisible,
  getGlobalSubtitlesVisible,
  loadGlobalSubtitlesFromServer,
  saveGlobalSubtitlesVisible,
} from '../../utils/globalSubtitleSystem.js';
import './GlobalSubtitleAdminPanel.css';

export default function GlobalSubtitleAdminPanel({ currentUser, language = 'vi' }) {
  const vi = language !== 'en';
  const [draft, setDraft] = useState(() => getGlobalSubtitlesVisible());
  const [saved, setSaved] = useState(() => getGlobalSubtitlesVisible());
  const [schemaReady, setSchemaReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    loadGlobalSubtitlesFromServer({ silent: true }).then((result) => {
      if (!alive) return;
      setDraft(Boolean(result?.visible));
      setSaved(Boolean(result?.visible));
      setSchemaReady(Boolean(result?.schemaReady));
    });
    return () => { alive = false; };
  }, []);

  const preview = (visible) => {
    setDraft(visible);
    setMessage('');
    applyGlobalSubtitlesVisible(visible, { persist: false, source: 'admin-subtitle-preview' });
  };

  const apply = async () => {
    setBusy(true);
    setMessage('');
    const result = await saveGlobalSubtitlesVisible(draft, currentUser);
    setBusy(false);
    if (result?.ok) {
      setDraft(Boolean(result.visible));
      setSaved(Boolean(result.visible));
      setSchemaReady(true);
      setMessage(vi
        ? `Đã ${result.visible ? 'hiện' : 'ẩn'} tiêu đề phụ trên toàn bộ Brian. Các phiên đang mở sẽ nhận thay đổi qua Realtime.`
        : `Subtitles are now ${result.visible ? 'visible' : 'hidden'} site-wide. Open Brian sessions will update through Realtime.`);
    } else {
      setSchemaReady(false);
      setMessage(result?.message || (vi ? 'Không thể đồng bộ cấu hình tiêu đề phụ.' : 'Could not synchronize subtitle visibility.'));
    }
  };

  const changed = draft !== saved;

  return (
    <section className="global-subtitle-admin" data-bes-subtitle-keep="true" aria-labelledby="global-subtitle-admin-title">
      <header className="global-subtitle-admin__head">
        <div>
          <span className="global-subtitle-admin__eyebrow">{vi ? 'Mật độ nội dung' : 'Content density'}</span>
          <h3 id="global-subtitle-admin-title">{vi ? 'Tiêu đề phụ toàn hệ thống' : 'Site-wide subtitles'}</h3>
          <p data-bes-subtitle-keep="true">{vi
            ? 'Ẩn các dòng mô tả ngắn nằm dưới tiêu đề trang, hero và tiêu đề khu vực để Brian gọn hơn. Helper text của biểu mẫu, cảnh báo, lỗi và nội dung chức năng quan trọng luôn được giữ lại.'
            : 'Hide short descriptive lines below page, hero and section headings to make Brian more compact. Form helpers, alerts, errors and essential functional copy are always preserved.'}</p>
        </div>
        <span className={`global-subtitle-admin__status ${draft ? 'is-visible' : 'is-hidden'}`}>
          {draft ? (vi ? 'Đang hiển thị' : 'Visible') : (vi ? 'Đang ẩn' : 'Hidden')}
        </span>
      </header>

      <div className="global-subtitle-admin__choices" role="group" aria-label={vi ? 'Trạng thái tiêu đề phụ' : 'Subtitle visibility'}>
        <button
          type="button"
          className={draft ? 'is-active' : ''}
          aria-pressed={draft}
          onClick={() => preview(true)}
        >
          <span className="global-subtitle-admin__choice-icon" aria-hidden="true">Aa</span>
          <span>
            <strong>{vi ? 'Hiện tiêu đề phụ' : 'Show subtitles'}</strong>
            <small>{vi ? 'Giữ đầy đủ mô tả ngắn dưới các heading.' : 'Keep short supporting copy below headings.'}</small>
          </span>
        </button>

        <button
          type="button"
          className={!draft ? 'is-active' : ''}
          aria-pressed={!draft}
          onClick={() => preview(false)}
        >
          <span className="global-subtitle-admin__choice-icon is-compact" aria-hidden="true">—</span>
          <span>
            <strong>{vi ? 'Ẩn tiêu đề phụ' : 'Hide subtitles'}</strong>
            <small>{vi ? 'Ưu tiên tiêu đề chính và nội dung thao tác.' : 'Prioritize primary headings and actionable content.'}</small>
          </span>
        </button>
      </div>

      <div className="global-subtitle-admin__protect" data-bes-subtitle-keep="true">
        <strong>{vi ? 'Luôn được giữ lại' : 'Always preserved'}</strong>
        <span>{vi
          ? 'Mô tả biểu mẫu · hướng dẫn nhập liệu · cảnh báo · lỗi · trạng thái hệ thống · nội dung trong bảng dữ liệu.'
          : 'Form descriptions · input guidance · warnings · errors · system states · data-table content.'}</span>
      </div>

      {message ? <div className={`global-subtitle-admin__message ${schemaReady ? 'is-success' : ''}`}>{message}</div> : null}

      <footer className="global-subtitle-admin__actions">
        <div>
          <strong>{schemaReady
            ? (vi ? 'Đồng bộ toàn hệ thống' : 'Site-wide sync ready')
            : (vi ? 'Chưa có bảng đồng bộ Supabase' : 'Supabase sync table not ready')}</strong>
          <small>{changed
            ? (vi ? 'Đang xem thử thay đổi chưa lưu' : 'Previewing an unsaved change')
            : (vi ? 'Khớp cấu hình đã lưu' : 'Matches saved configuration')}</small>
        </div>
        <button type="button" className="global-subtitle-admin__save" disabled={busy || !changed} onClick={apply}>
          {busy ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Lưu & áp dụng' : 'Save & apply')}
        </button>
      </footer>
    </section>
  );
}
