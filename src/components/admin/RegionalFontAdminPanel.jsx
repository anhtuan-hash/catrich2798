import React, { useEffect, useMemo, useState } from 'react';
import { GLOBAL_FONT_PRESETS } from '../../utils/globalFontSystem.js';
import {
  GLOBAL_FONT_REGIONS,
  applyRegionalFontSettings,
  getRegionalFontSettings,
  loadRegionalFontSettingsFromServer,
  normalizeRegionalFontSettings,
  saveRegionalFontSettings,
} from '../../utils/globalRegionalFontSystem.js';
import './RegionalFontAdminPanel.css';

const REGION_FONT_OPTIONS = GLOBAL_FONT_PRESETS.filter((item) => !item.custom);

function definitionFor(id) {
  return REGION_FONT_OPTIONS.find((item) => item.id === id) || null;
}

export default function RegionalFontAdminPanel({ currentUser, language = 'vi' }) {
  const vi = language !== 'en';
  const [draft, setDraft] = useState(() => getRegionalFontSettings());
  const [saved, setSaved] = useState(() => getRegionalFontSettings());
  const [schemaReady, setSchemaReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    let alive = true;
    loadRegionalFontSettingsFromServer({ silent: true }).then((result) => {
      if (!alive) return;
      const next = normalizeRegionalFontSettings(result?.settings || {});
      setDraft(next);
      setSaved(next);
      setSchemaReady(Boolean(result?.schemaReady));
    });
    return () => { alive = false; };
  }, []);

  const changed = useMemo(() => JSON.stringify(draft) !== JSON.stringify(saved), [draft, saved]);
  const customizedCount = Object.keys(draft).length;

  const setRegion = (regionId, value) => {
    setMessage('');
    setDraft((current) => {
      const next = { ...current };
      if (!value || value === 'inherit') delete next[regionId];
      else next[regionId] = value;
      return next;
    });
  };

  const preview = () => {
    applyRegionalFontSettings(draft, { persist: false, source: 'admin-region-preview' });
    setMessage(vi
      ? 'Đang xem thử font theo từng khu vực. Thay đổi này chưa được lưu.'
      : 'Previewing regional fonts. These changes are not saved yet.');
  };

  const resetAll = () => {
    const next = {};
    setDraft(next);
    applyRegionalFontSettings(next, { persist: false, source: 'admin-region-reset-preview' });
    setMessage(vi
      ? 'Đã đưa mọi khu vực về chế độ kế thừa font toàn hệ thống. Bấm “Lưu & áp dụng” để xác nhận.'
      : 'All regions now inherit the global font. Click “Save & apply” to confirm.');
  };

  const apply = async () => {
    setBusy(true);
    setMessage('');
    const result = await saveRegionalFontSettings(draft, currentUser);
    setBusy(false);
    if (result?.ok) {
      const next = normalizeRegionalFontSettings(result.settings || draft);
      setDraft(next);
      setSaved(next);
      setSchemaReady(true);
      setMessage(vi
        ? 'Đã áp dụng font theo khu vực cho toàn hệ thống. Các phiên Brian đang mở sẽ nhận thay đổi qua Realtime.'
        : 'Regional fonts applied site-wide. Open Brian sessions will receive the update through Realtime.');
    } else {
      setSchemaReady(false);
      setMessage(result?.message || (vi ? 'Không thể đồng bộ font theo khu vực.' : 'Could not synchronize regional fonts.'));
    }
  };

  return (
    <section className="regional-font-admin" aria-labelledby="regional-font-admin-title">
      <header className="regional-font-admin__head">
        <div>
          <span className="eyebrow">{vi ? 'Typography theo khu vực' : 'Regional typography'}</span>
          <h3 id="regional-font-admin-title">{vi ? 'Tuỳ chỉnh font cho từng khu vực' : 'Customize fonts by region'}</h3>
          <p>{vi
            ? 'Mỗi khu vực mặc định kế thừa font toàn hệ thống. Chỉ những khu vực bạn chọn riêng mới được override.'
            : 'Every region inherits the global font by default. Only explicitly customized regions are overridden.'}</p>
        </div>
        <span className={`regional-font-admin__status ${schemaReady ? 'is-ready' : ''}`}>
          {schemaReady
            ? (vi ? `${customizedCount} khu vực đang tuỳ chỉnh` : `${customizedCount} customized regions`)
            : (vi ? 'Cần migration region_fonts' : 'region_fonts migration required')}
        </span>
      </header>

      <div className="regional-font-admin__grid">
        {GLOBAL_FONT_REGIONS.map((region) => {
          const value = draft[region.id] || 'inherit';
          const definition = definitionFor(value);
          const previewFamily = definition?.family || 'var(--bes-global-font-family)';
          return (
            <article key={region.id} className={`regional-font-card ${value !== 'inherit' ? 'is-customized' : ''}`}>
              <div className="regional-font-card__title">
                <div>
                  <strong>{vi ? region.labelVi : region.label}</strong>
                  <small>{vi ? region.descriptionVi : region.description}</small>
                </div>
                {value !== 'inherit' ? <span>{vi ? 'Riêng' : 'Custom'}</span> : <span className="is-inherit">{vi ? 'Kế thừa' : 'Inherit'}</span>}
              </div>

              <label className="regional-font-card__select">
                <span>{vi ? 'Font chữ' : 'Font family'}</span>
                <select value={value} onChange={(event) => setRegion(region.id, event.target.value)}>
                  <option value="inherit">{vi ? 'Kế thừa font toàn hệ thống' : 'Inherit global font'}</option>
                  {REGION_FONT_OPTIONS.map((font) => (
                    <option key={font.id} value={font.id}>{font.label}</option>
                  ))}
                </select>
              </label>

              <div className="regional-font-card__sample" style={{ '--region-preview-family': previewFamily }}>
                {region.sample}
              </div>

              {value !== 'inherit' ? (
                <button type="button" className="regional-font-card__reset" onClick={() => setRegion(region.id, 'inherit')}>
                  {vi ? 'Khôi phục kế thừa' : 'Restore inheritance'}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="regional-font-admin__note">
        <strong>{vi ? 'Thứ tự ưu tiên' : 'Priority'}</strong>
        <span>{vi
          ? 'Font toàn hệ thống → font route (Dashboard/Admin) → Card/Data/Control → Section heading → Page title → Navigation/Newswire.'
          : 'Global font → route font (Dashboard/Admin) → Cards/Data/Controls → Section headings → Page title → Navigation/Newswire.'}</span>
      </div>

      {message ? <div className={`regional-font-admin__message ${schemaReady ? 'is-success' : ''}`}>{message}</div> : null}

      <footer className="regional-font-admin__actions">
        <div>
          <strong>{vi ? `${customizedCount}/${GLOBAL_FONT_REGIONS.length} khu vực có font riêng` : `${customizedCount}/${GLOBAL_FONT_REGIONS.length} regions customized`}</strong>
          <small>{changed ? (vi ? 'Có thay đổi chưa lưu' : 'Unsaved changes') : (vi ? 'Đã đồng bộ với cấu hình hiện tại' : 'Matches current configuration')}</small>
        </div>
        <button type="button" className="regional-font-btn" disabled={busy} onClick={resetAll}>{vi ? 'Kế thừa tất cả' : 'Inherit all'}</button>
        <button type="button" className="regional-font-btn" disabled={busy} onClick={preview}>{vi ? 'Xem thử' : 'Preview'}</button>
        <button type="button" className="regional-font-btn is-primary" disabled={busy} onClick={apply}>
          {busy ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Lưu & áp dụng' : 'Save & apply')}
        </button>
      </footer>
    </section>
  );
}
