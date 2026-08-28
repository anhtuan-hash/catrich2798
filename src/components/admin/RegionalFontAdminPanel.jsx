import React, { useEffect, useMemo, useRef, useState } from 'react';
import { GLOBAL_FONT_PRESETS } from '../../utils/globalFontSystem.js';
import {
  GLOBAL_FONT_REGIONS,
  applyRegionalFontSettings,
  clearRegionalCustomFontPreview,
  getRegionalFontFamily,
  getRegionalFontSettings,
  getRegionalFontSize,
  getRegionalFontSizeLimits,
  loadRegionalFontSettingsFromServer,
  normalizeRegionalFontSettings,
  previewRegionalCustomFont,
  removeRegionalCustomFontAsset,
  saveRegionalFontSettings,
  uploadRegionalCustomFont,
} from '../../utils/globalRegionalFontSystem.js';
import './RegionalFontAdminPanel.css';

const REGION_FONT_OPTIONS = GLOBAL_FONT_PRESETS.filter((item) => !item.custom);

function baseName(name = '') {
  return String(name || '').replace(/\.[^.]+$/, '').trim();
}

function fileSizeLabel(size = 0) {
  const bytes = Number(size || 0);
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function isCustom(value) {
  return Boolean(value && typeof value === 'object' && value.preset === 'custom');
}

function choiceOf(value) {
  if (isCustom(value)) return 'custom';
  return typeof value === 'string' && value ? value : 'inherit';
}

function customDraft(value = null) {
  return isCustom(value) ? { ...value } : {
    preset: 'custom',
    name: '',
    url: '',
    path: '',
    format: '',
    size: 0,
  };
}

export default function RegionalFontAdminPanel({ currentUser, language = 'vi' }) {
  const vi = language !== 'en';
  const [draft, setDraft] = useState(() => getRegionalFontSettings());
  const [saved, setSaved] = useState(() => getRegionalFontSettings());
  const [pendingFiles, setPendingFiles] = useState({});
  const [schemaReady, setSchemaReady] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('info');

  const savedRef = useRef(saved);
  useEffect(() => { savedRef.current = saved; }, [saved]);

  useEffect(() => {
    let alive = true;
    loadRegionalFontSettingsFromServer({ silent: true }).then((result) => {
      if (!alive) return;
      const next = normalizeRegionalFontSettings(result?.settings || {});
      setDraft(next);
      setSaved(next);
      savedRef.current = next;
      setSchemaReady(Boolean(result?.schemaReady));
      setPreviewReady(true);
    });

    return () => {
      alive = false;
      clearRegionalCustomFontPreview();
      applyRegionalFontSettings(savedRef.current, {
        persist: false,
        broadcast: false,
        source: 'admin-region-live-preview-cleanup',
      });
    };
  }, []);

  useEffect(() => {
    if (!previewReady) return;
    applyRegionalFontSettings(draft, {
      persist: false,
      source: 'admin-region-live-preview',
    });
  }, [draft, previewReady]);

  const changed = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(saved) || Object.keys(pendingFiles).length > 0,
    [draft, saved, pendingFiles],
  );
  const customizedCount = useMemo(() => {
    const normalized = normalizeRegionalFontSettings(draft);
    return GLOBAL_FONT_REGIONS.filter((region) => (
      Boolean(normalized[region.id]) || Boolean(getRegionalFontSize(normalized, region.id))
    )).length;
  }, [draft]);

  const setRegionChoice = (regionId, value) => {
    setMessage('');
    if (value !== 'custom') {
      clearRegionalCustomFontPreview(regionId);
      setPendingFiles((current) => {
        if (!current[regionId]) return current;
        const next = { ...current };
        delete next[regionId];
        return next;
      });
    }

    setDraft((current) => {
      const next = { ...current };
      if (!value || value === 'inherit') {
        delete next[regionId];
      } else if (value === 'custom') {
        const existing = isCustom(current[regionId])
          ? current[regionId]
          : (isCustom(savedRef.current[regionId]) ? savedRef.current[regionId] : null);
        next[regionId] = customDraft(existing);
      } else {
        next[regionId] = value;
      }
      return next;
    });
  };

  const setRegionFontSize = (regionId, value) => {
    setMessage('');
    const limits = getRegionalFontSizeLimits(regionId);
    const number = Number(value);
    const nextSize = Number.isFinite(number)
      ? Math.min(limits.max, Math.max(limits.min, Math.round(number)))
      : null;
    setDraft((current) => {
      const next = { ...current };
      const fontSizes = { ...(current.fontSizes || {}) };
      if (nextSize) fontSizes[regionId] = nextSize;
      else delete fontSizes[regionId];
      if (Object.keys(fontSizes).length) next.fontSizes = fontSizes;
      else delete next.fontSizes;
      return next;
    });
  };

  const setCustomName = (regionId, name) => {
    setDraft((current) => ({
      ...current,
      [regionId]: {
        ...customDraft(current[regionId]),
        name,
      },
    }));
  };

  const chooseRegionFile = (region, event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    const currentValue = draft[region.id];
    const displayName = isCustom(currentValue) && currentValue.name
      ? currentValue.name
      : baseName(file.name);
    const result = previewRegionalCustomFont(region.id, file, displayName);
    if (!result?.ok) {
      event.target.value = '';
      setMessageTone('error');
      setMessage(result?.message || (vi ? 'Không thể xem thử font.' : 'Could not preview the font.'));
      return;
    }

    setPendingFiles((current) => ({ ...current, [region.id]: file }));
    setDraft((current) => ({ ...current, [region.id]: result.config }));
    setMessageTone('info');
    setMessage(vi
      ? `Đang xem thử trực tiếp “${displayName}” riêng cho khu vực ${region.labelVi}. Font chưa được tải lên hệ thống.`
      : `Previewing “${displayName}” only for ${region.label}. The font has not been uploaded yet.`);
  };

  const resetRegion = (regionId) => {
    clearRegionalCustomFontPreview(regionId);
    setPendingFiles((current) => {
      const next = { ...current };
      delete next[regionId];
      return next;
    });
    setDraft((current) => {
      const next = { ...current };
      delete next[regionId];
      if (next.fontSizes?.[regionId]) {
        const fontSizes = { ...next.fontSizes };
        delete fontSizes[regionId];
        if (Object.keys(fontSizes).length) next.fontSizes = fontSizes;
        else delete next.fontSizes;
      }
      return next;
    });
  };

  const resetAll = () => {
    clearRegionalCustomFontPreview();
    setPendingFiles({});
    setDraft({});
    setMessageTone('info');
    setMessage(vi
      ? 'Đang xem thử trực tiếp chế độ kế thừa cho mọi khu vực. Bấm “Lưu & áp dụng” để xác nhận.'
      : 'Live preview now shows inheritance for every region. Click “Save & apply” to confirm.');
  };

  const restoreSaved = () => {
    clearRegionalCustomFontPreview();
    setPendingFiles({});
    setDraft({ ...savedRef.current });
    setMessageTone('info');
    setMessage(vi ? 'Đã khôi phục bản cấu hình đã lưu gần nhất.' : 'Restored the most recently saved configuration.');
  };

  const apply = async () => {
    const missing = GLOBAL_FONT_REGIONS.find((region) => {
      const value = draft[region.id];
      return isCustom(value) && !value.url && !pendingFiles[region.id];
    });
    if (missing) {
      setMessageTone('error');
      setMessage(vi
        ? `Khu vực “${missing.labelVi}” đang chọn font cá nhân nhưng chưa có file. Hãy tải font riêng cho khu vực này.`
        : `${missing.label} is set to a custom font but no file has been chosen.`);
      return;
    }

    setBusy(true);
    setMessage('');
    const working = { ...draft };

    for (const region of GLOBAL_FONT_REGIONS) {
      const file = pendingFiles[region.id];
      if (!file) continue;
      const currentValue = customDraft(working[region.id]);
      const upload = await uploadRegionalCustomFont(
        region.id,
        file,
        currentValue.name || baseName(file.name),
        currentUser,
      );
      if (!upload?.ok) {
        setBusy(false);
        setMessageTone('error');
        setMessage(vi
          ? `Không thể tải font riêng cho “${region.labelVi}”: ${upload?.message || 'Lỗi không xác định.'}`
          : `Could not upload the custom font for ${region.label}: ${upload?.message || 'Unknown error.'}`);
        return;
      }
      working[region.id] = upload.config;
    }

    const result = await saveRegionalFontSettings(working, currentUser);
    setBusy(false);
    if (!result?.ok) {
      setSchemaReady(false);
      setMessageTone('error');
      setMessage(result?.message || (vi ? 'Không thể đồng bộ font theo khu vực.' : 'Could not synchronize regional fonts.'));
      return;
    }

    const next = normalizeRegionalFontSettings(result.settings || working);
    const previous = savedRef.current;
    GLOBAL_FONT_REGIONS.forEach((region) => {
      const oldValue = previous[region.id];
      const newValue = next[region.id];
      if (isCustom(oldValue) && oldValue.path && (!isCustom(newValue) || newValue.path !== oldValue.path)) {
        removeRegionalCustomFontAsset(oldValue).catch(() => {});
      }
    });

    clearRegionalCustomFontPreview();
    setPendingFiles({});
    setDraft(next);
    setSaved(next);
    savedRef.current = next;
    setSchemaReady(true);
    setMessageTone('success');
    setMessage(vi
      ? 'Đã lưu font và cỡ chữ theo từng khu vực. Các phiên Brian đang mở sẽ nhận thay đổi qua Realtime.'
      : 'Regional fonts and per-region text sizes saved. Open Brian sessions will receive the change through Realtime.');
  };

  return (
    <section className="regional-font-admin" aria-labelledby="regional-font-admin-title">
      <header className="regional-font-admin__head">
        <div>
          <span className="eyebrow">{vi ? 'Typography theo khu vực' : 'Regional typography'}</span>
          <h3 id="regional-font-admin-title">{vi ? 'Mỗi khu vực có thể dùng font riêng' : 'Give every region its own font'}</h3>
          <p>{vi
            ? 'Mỗi thẻ bên dưới có bộ chọn font, cỡ chữ và nút tải font cá nhân độc lập. Mọi khu vực đều xem thử trực tiếp trước khi lưu.'
            : 'Every card has its own font selector, text size and custom upload with live preview before saving.'}</p>
        </div>
        <div className="regional-font-admin__head-status">
          <span className="regional-font-admin__live"><i />{vi ? 'Xem thử trực tiếp' : 'Live preview'}</span>
          <span className={`regional-font-admin__status ${schemaReady ? 'is-ready' : ''}`}>
            {schemaReady
              ? (vi ? `${customizedCount} khu vực đang tuỳ chỉnh` : `${customizedCount} customized regions`)
              : (vi ? 'Cần migration region_fonts' : 'region_fonts migration required')}
          </span>
        </div>
      </header>

      <div className="regional-font-admin__grid">
        {GLOBAL_FONT_REGIONS.map((region) => {
          const value = draft[region.id];
          const choice = choiceOf(value);
          const customValue = isCustom(value) ? value : null;
          const pendingFile = pendingFiles[region.id] || null;
          const previewFamily = getRegionalFontFamily(region.id, value);
          const customActive = choice === 'custom';
          const fontSizeLimits = getRegionalFontSizeLimits(region.id);
          const regionFontSize = getRegionalFontSize(draft, region.id);
          const fontSizeCustomized = Boolean(regionFontSize);
          const regionCustomized = choice !== 'inherit' || fontSizeCustomized;
          return (
            <article key={region.id} className={`regional-font-card ${regionCustomized ? 'is-customized' : ''} ${customActive ? 'has-custom-font' : ''}`}>
              <div className="regional-font-card__title">
                <div>
                  <strong>{vi ? region.labelVi : region.label}</strong>
                  <small>{vi ? region.descriptionVi : region.description}</small>
                </div>
                {customActive ? (
                  <span className="is-custom-font">{vi ? 'Font cá nhân' : 'Custom font'}</span>
                ) : choice !== 'inherit' ? (
                  <span>{vi ? 'Riêng' : 'Custom'}</span>
                ) : fontSizeCustomized ? (
                  <span className="is-font-size">{vi ? 'Cỡ chữ riêng' : 'Custom size'}</span>
                ) : (
                  <span className="is-inherit">{vi ? 'Kế thừa' : 'Inherit'}</span>
                )}
              </div>

              <label className="regional-font-card__select">
                <span>{vi ? 'Font chữ' : 'Font family'}</span>
                <select value={choice} onChange={(event) => setRegionChoice(region.id, event.target.value)}>
                  <option value="inherit">{vi ? 'Kế thừa font toàn hệ thống' : 'Inherit global font'}</option>
                  {REGION_FONT_OPTIONS.map((font) => (
                    <option key={font.id} value={font.id}>{font.label}</option>
                  ))}
                  <option value="custom">{vi ? 'Font cá nhân cho khu vực này…' : 'Custom font for this region…'}</option>
                </select>
              </label>

              <div
                className="regional-font-card__sample"
                style={{
                  '--region-preview-family': previewFamily,
                  ...(regionFontSize ? { fontSize: `${regionFontSize}px` } : {}),
                }}
              >
                {region.sample}
              </div>

              <div className={`regional-font-card__font-size ${fontSizeCustomized ? 'is-active' : ''}`}>
                <div className="regional-font-card__font-size-head">
                  <div>
                    <strong>{vi ? `Cỡ chữ · ${region.labelVi}` : `${region.label} text size`}</strong>
                    <small>{vi
                      ? `Xem thử trực tiếp · ${fontSizeLimits.min}–${fontSizeLimits.max} px`
                      : `Live preview · ${fontSizeLimits.min}–${fontSizeLimits.max} px`}</small>
                  </div>
                  <b>{regionFontSize
                    ? `${regionFontSize}px`
                    : (vi ? `Mặc định · ${fontSizeLimits.fallback}px` : `Default · ${fontSizeLimits.fallback}px`)}</b>
                </div>
                <div className="regional-font-card__font-size-controls">
                  <span aria-hidden="true">A</span>
                  <input
                    type="range"
                    min={fontSizeLimits.min}
                    max={fontSizeLimits.max}
                    step="1"
                    value={regionFontSize || fontSizeLimits.fallback}
                    onChange={(event) => setRegionFontSize(region.id, event.target.value)}
                    aria-label={vi ? `Cỡ chữ ${region.labelVi}` : `${region.label} text size`}
                  />
                  <span className="is-large" aria-hidden="true">A</span>
                  <label>
                    <input
                      type="number"
                      min={fontSizeLimits.min}
                      max={fontSizeLimits.max}
                      step="1"
                      value={regionFontSize || fontSizeLimits.fallback}
                      onChange={(event) => setRegionFontSize(region.id, event.target.value)}
                      aria-label={vi ? `Cỡ chữ ${region.labelVi} theo pixel` : `${region.label} text size in pixels`}
                    />
                    <small>px</small>
                  </label>
                  <button
                    type="button"
                    disabled={!fontSizeCustomized}
                    onClick={() => setRegionFontSize(region.id, null)}
                  >
                    {vi ? 'Mặc định' : 'Default'}
                  </button>
                </div>
              </div>

              <div className={`regional-font-card__custom-upload ${customActive ? 'is-active' : ''}`}>
                <div className="regional-font-card__custom-head">
                  <div>
                    <strong>{vi ? 'Font cá nhân của khu vực này' : 'Custom font for this region'}</strong>
                    <small>{vi ? '.woff2 · .woff · .ttf · .otf · tối đa 8 MB' : '.woff2 · .woff · .ttf · .otf · max 8 MB'}</small>
                  </div>
                  {customValue?.url && !pendingFile ? (
                    <span className="regional-font-card__stored">✓ {vi ? 'Đã lưu' : 'Saved'}</span>
                  ) : pendingFile ? (
                    <span className="regional-font-card__previewing">● {vi ? 'Đang xem thử' : 'Previewing'}</span>
                  ) : null}
                </div>

                {customActive ? (
                  <label className="regional-font-card__custom-name">
                    <span>{vi ? 'Tên hiển thị' : 'Display name'}</span>
                    <input
                      type="text"
                      value={customValue?.name || ''}
                      onChange={(event) => setCustomName(region.id, event.target.value)}
                      placeholder={vi ? 'Ví dụ: SVN-Gilroy' : 'Example: SVN-Gilroy'}
                      maxLength={80}
                    />
                  </label>
                ) : null}

                <div className="regional-font-card__custom-actions">
                  <label className="regional-font-card__file-button">
                    <input
                      type="file"
                      accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
                      onChange={(event) => chooseRegionFile(region, event)}
                    />
                    <span aria-hidden="true">↑</span>
                    <b>{customActive
                      ? (vi ? 'Chọn / thay font riêng' : 'Choose / replace custom font')
                      : (vi ? 'Tải font riêng' : 'Upload custom font')}</b>
                  </label>
                  {customActive && customValue?.url ? (
                    <small className="regional-font-card__file-state">
                      {pendingFile?.name || customValue.name || (vi ? 'Font cá nhân' : 'Custom font')}
                      {(pendingFile?.size || customValue.size) ? ` · ${fileSizeLabel(pendingFile?.size || customValue.size)}` : ''}
                    </small>
                  ) : null}
                </div>
              </div>

              {regionCustomized ? (
                <button type="button" className="regional-font-card__reset" onClick={() => resetRegion(region.id)}>
                  {vi ? 'Khôi phục kế thừa & mặc định' : 'Restore inheritance & default'}
                </button>
              ) : null}
            </article>
          );
        })}
      </div>

      <div className="regional-font-admin__note">
        <strong>{vi ? 'Font độc lập theo khu vực' : 'Independent regional fonts'}</strong>
        <span>{vi
          ? 'Font cá nhân và cỡ chữ của từng khu vực đều độc lập. Thay đổi được xem thử trực tiếp và chỉ tác động đúng vùng đã chọn.'
          : 'Custom fonts and text sizes are independent per region, previewed live, and applied only to the selected surface.'}</span>
      </div>

      {message ? <div className={`regional-font-admin__message is-${messageTone}`}>{message}</div> : null}

      <footer className="regional-font-admin__actions">
        <div>
          <strong>{vi ? `${customizedCount}/${GLOBAL_FONT_REGIONS.length} khu vực đang tuỳ chỉnh` : `${customizedCount}/${GLOBAL_FONT_REGIONS.length} regions customized`}</strong>
          <small>{changed ? (vi ? 'Đang xem thử · có thay đổi chưa lưu' : 'Live preview · unsaved changes') : (vi ? 'Đã đồng bộ với cấu hình hiện tại' : 'Matches current configuration')}</small>
        </div>
        <button type="button" className="regional-font-btn" disabled={busy} onClick={resetAll}>{vi ? 'Kế thừa tất cả' : 'Inherit all'}</button>
        <button type="button" className="regional-font-btn" disabled={busy || !changed} onClick={restoreSaved}>{vi ? 'Khôi phục bản đã lưu' : 'Restore saved'}</button>
        <button type="button" className="regional-font-btn is-primary" disabled={busy || !changed} onClick={apply}>
          {busy ? (vi ? 'Đang tải & lưu…' : 'Uploading & saving…') : (vi ? 'Lưu & áp dụng' : 'Save & apply')}
        </button>
      </footer>
    </section>
  );
}
