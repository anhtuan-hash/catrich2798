import React, { useEffect, useMemo, useState } from 'react';
import {
  GLOBAL_FONT_PRESETS,
  applyGlobalFontPreset,
  getGlobalFontPreset,
  loadGlobalFontPresetFromServer,
  saveGlobalFontPreset,
} from '../../utils/globalFontSystem.js';
import './GlobalFontAdminPanel.css';

export default function GlobalFontAdminPanel({ currentUser, language = 'vi' }) {
  const vi = language !== 'en';
  const [selected, setSelected] = useState(getGlobalFontPreset());
  const [saved, setSaved] = useState(getGlobalFontPreset());
  const [syncReady, setSyncReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const current = useMemo(() => GLOBAL_FONT_PRESETS.find((item) => item.id === selected) || GLOBAL_FONT_PRESETS[0], [selected]);

  useEffect(() => {
    let alive = true;
    loadGlobalFontPresetFromServer({ silent: true }).then((result) => {
      if (!alive) return;
      const preset = result?.preset || getGlobalFontPreset();
      setSelected(preset);
      setSaved(preset);
      setSyncReady(Boolean(result?.ok));
    });
    return () => { alive = false; };
  }, []);

  const choose = (id) => {
    setSelected(id);
    setMessage('');
  };

  const apply = async () => {
    setBusy(true);
    setMessage('');
    const result = await saveGlobalFontPreset(selected, currentUser);
    setBusy(false);
    setSaved(result?.preset || selected);
    setSyncReady(Boolean(result?.ok));
    setMessage(result?.ok
      ? (vi ? 'Đã áp dụng font cho toàn hệ thống. Các tài khoản giáo viên đang mở Brian sẽ nhận thay đổi qua Realtime.' : 'Font applied site-wide. Open teacher sessions will receive the change through Realtime.')
      : (result?.message || (vi ? 'Đã áp dụng cục bộ nhưng chưa thể đồng bộ toàn hệ thống.' : 'Applied locally but server sync is not available.')));
  };

  const preview = () => {
    applyGlobalFontPreset(selected, { persist: false, source: 'admin-preview' });
    setMessage(vi ? 'Đang xem thử font trên giao diện Admin. Bấm “Áp dụng toàn hệ thống” để lưu.' : 'Previewing this font in Admin. Click “Apply site-wide” to save it.');
  };

  return (
    <section className="admin-global-font metro-panel" id="admin-global-font">
      <header className="admin-global-font__head">
        <div>
          <span className="eyebrow">{vi ? 'Giao diện toàn hệ thống' : 'Site-wide appearance'}</span>
          <h2>{vi ? 'Font chữ toàn hệ thống' : 'Global font'}</h2>
          <p>{vi
            ? 'Admin chọn một font duy nhất cho Brian. Sau khi áp dụng, font được dùng trên toàn site và đồng bộ đến mọi tài khoản giáo viên.'
            : 'Choose one font for Brian. Once applied, it is used site-wide and synced to every teacher account.'}</p>
        </div>
        <span className={`admin-global-font__status ${syncReady ? 'is-ready' : 'is-local'}`}>
          {syncReady ? (vi ? 'Đồng bộ toàn hệ thống' : 'Site-wide sync') : (vi ? 'Cần bật đồng bộ Supabase' : 'Supabase sync required')}
        </span>
      </header>

      <div className="admin-global-font__grid" role="radiogroup" aria-label={vi ? 'Chọn font chữ' : 'Choose font'}>
        {GLOBAL_FONT_PRESETS.map((item) => (
          <button
            key={item.id}
            type="button"
            role="radio"
            aria-checked={selected === item.id}
            className={`admin-global-font__option ${selected === item.id ? 'is-selected' : ''}`}
            onClick={() => choose(item.id)}
            style={{ '--font-preview-family': item.family }}
          >
            <span className="admin-global-font__radio" aria-hidden="true" />
            <span className="admin-global-font__sample">{item.sample}</span>
            <strong>{item.label}{item.recommended ? <em>{vi ? 'Khuyên dùng' : 'Recommended'}</em> : null}</strong>
            <small>{vi ? item.descriptionVi : item.description}</small>
          </button>
        ))}
      </div>

      <div className="admin-global-font__preview" style={{ '--font-preview-family': current.family }}>
        <span>{vi ? 'Xem trước' : 'Preview'}</span>
        <strong>Brian English · Giáo viên · Thông báo TTCM</strong>
        <p>ABCDEFGHIJKLMNOPQRSTUVWXYZ · abcdefghijklmnopqrstuvwxyz · 0123456789 · Ă Â Ê Ô Ơ Ư Đ</p>
      </div>

      {message ? <div className={`admin-global-font__message ${syncReady ? 'is-success' : ''}`}>{message}</div> : null}

      <footer className="admin-global-font__actions">
        <div><span>{vi ? 'Đang chọn:' : 'Selected:'}</span><strong>{current.label}</strong>{saved === selected ? <small>✓ {vi ? 'đang áp dụng' : 'active'}</small> : null}</div>
        <button type="button" className="metro-small-btn" onClick={preview}>{vi ? 'Xem thử' : 'Preview'}</button>
        <button type="button" className="metro-small-btn active" disabled={busy} onClick={apply}>{busy ? (vi ? 'Đang áp dụng…' : 'Applying…') : (vi ? 'Áp dụng toàn hệ thống' : 'Apply site-wide')}</button>
      </footer>
    </section>
  );
}