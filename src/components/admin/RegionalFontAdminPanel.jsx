import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  GLOBAL_FONT_PRESETS,
  applyGlobalFontPreset,
  getGlobalFontPreset,
} from '../../utils/globalFontSystem.js';
import {
  applyGlobalCustomFont,
  clearGlobalCustomFontPreview,
  loadGlobalCustomFontSettings,
  previewGlobalCustomFont,
  saveExistingGlobalCustomFont,
  saveGlobalCustomFont,
  validateGlobalCustomFont,
} from '../../utils/globalCustomFont.js';
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

export default function RegionalFontAdminPanel({ currentUser, language = 'vi' }) {
  const vi = language !== 'en';
  const [draft, setDraft] = useState(() => getRegionalFontSettings());
  const [saved, setSaved] = useState(() => getRegionalFontSettings());
  const [schemaReady, setSchemaReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [previewReady, setPreviewReady] = useState(false);
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('info');
  const [fontFile, setFontFile] = useState(null);
  const [customName, setCustomName] = useState('');
  const [customConfig, setCustomConfig] = useState(null);
  const [customBusy, setCustomBusy] = useState(false);

  const savedRef = useRef(saved);
  const customConfigRef = useRef(customConfig);
  const globalSavedPresetRef = useRef(getGlobalFontPreset());
  const globalPreviewDirtyRef = useRef(false);

  useEffect(() => { savedRef.current = saved; }, [saved]);
  useEffect(() => { customConfigRef.current = customConfig; }, [customConfig]);

  const restoreGlobalPreview = () => {
    if (!globalPreviewDirtyRef.current) return;
    const preset = globalSavedPresetRef.current;
    const savedCustom = customConfigRef.current;
    if (preset === 'custom' && savedCustom?.url) {
      applyGlobalCustomFont(savedCustom, { persist: false, source: 'admin-custom-preview-restore' });
    } else {
      applyGlobalFontPreset(preset, {
        persist: false,
        broadcast: false,
        source: 'admin-custom-preview-restore',
      });
    }
    clearGlobalCustomFontPreview();
    globalPreviewDirtyRef.current = false;
  };

  useEffect(() => {
    let alive = true;
    Promise.all([
      loadRegionalFontSettingsFromServer({ silent: true }),
      loadGlobalCustomFontSettings({ silent: true, apply: getGlobalFontPreset() === 'custom' }),
    ]).then(([regionResult, customResult]) => {
      if (!alive) return;
      const next = normalizeRegionalFontSettings(regionResult?.settings || {});
      setDraft(next);
      setSaved(next);
      savedRef.current = next;
      setSchemaReady(Boolean(regionResult?.schemaReady));
      globalSavedPresetRef.current = getGlobalFontPreset();
      if (customResult?.config) {
        setCustomConfig(customResult.config);
        customConfigRef.current = customResult.config;
        setCustomName(customResult.config.name || '');
      }
      setPreviewReady(true);
    });

    return () => {
      alive = false;
      applyRegionalFontSettings(savedRef.current, {
        persist: false,
        broadcast: false,
        source: 'admin-region-live-preview-cleanup',
      });
      restoreGlobalPreview();
    };
  }, []);

  useEffect(() => {
    if (!previewReady) return;
    applyRegionalFontSettings(draft, {
      persist: false,
      source: 'admin-region-live-preview',
    });
  }, [draft, previewReady]);

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

  const resetAll = () => {
    setDraft({});
    setMessageTone('info');
    setMessage(vi
      ? 'Đang xem thử trực tiếp chế độ kế thừa cho mọi khu vực. Bấm “Lưu & áp dụng” để xác nhận.'
      : 'Live preview now shows inheritance for every region. Click “Save & apply” to confirm.');
  };

  const restoreSaved = () => {
    const next = { ...savedRef.current };
    setDraft(next);
    restoreGlobalPreview();
    setMessageTone('info');
    setMessage(vi
      ? 'Đã khôi phục bản cấu hình đã lưu gần nhất.'
      : 'Restored the most recently saved configuration.');
  };

  const chooseFile = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    const validation = validateGlobalCustomFont(file);
    if (!validation.ok) {
      setFontFile(null);
      setMessageTone('error');
      setMessage(validation.message);
      event.target.value = '';
      return;
    }

    const displayName = customName.trim() || baseName(file.name);
    setFontFile(file);
    if (!customName.trim()) setCustomName(displayName);
    const result = previewGlobalCustomFont(file, displayName);
    if (result.ok) {
      globalPreviewDirtyRef.current = true;
      setMessageTone('info');
      setMessage(vi
        ? 'Đang xem thử trực tiếp font vừa chọn trên chính giao diện này. Font chưa được tải lên hệ thống.'
        : 'The selected font is now previewed live on this page. It has not been uploaded yet.');
    } else {
      setMessageTone('error');
      setMessage(result.message || (vi ? 'Không thể xem thử font.' : 'Could not preview the font.'));
    }
  };

  const previewSavedCustom = () => {
    if (!customConfig?.url) {
      setMessageTone('error');
      setMessage(vi ? 'Chưa có font cá nhân đã lưu.' : 'No saved custom font is available.');
      return;
    }
    applyGlobalCustomFont(
      { ...customConfig, name: customName.trim() || customConfig.name },
      { persist: false, source: 'admin-existing-custom-live-preview' },
    );
    globalPreviewDirtyRef.current = true;
    setMessageTone('info');
    setMessage(vi
      ? 'Đang xem thử trực tiếp font cá nhân đã lưu. Chưa thay đổi cấu hình đã lưu.'
      : 'Previewing the saved custom font live. The saved configuration is unchanged.');
  };

  const saveCustom = async () => {
    if (!fontFile && !customConfig?.url) {
      setMessageTone('error');
      setMessage(vi
        ? 'Hãy chọn một file font trước khi tải lên.'
        : 'Choose a font file before uploading.');
      return;
    }

    setCustomBusy(true);
    setMessage('');
    const result = fontFile
      ? await saveGlobalCustomFont(
        fontFile,
        customName.trim() || baseName(fontFile.name),
        currentUser,
        customConfig,
      )
      : await saveExistingGlobalCustomFont(
        { ...customConfig, name: customName.trim() || customConfig.name },
        currentUser,
      );
    setCustomBusy(false);

    if (result?.ok) {
      const nextConfig = result.config || customConfig;
      if (nextConfig) {
        setCustomConfig(nextConfig);
        customConfigRef.current = nextConfig;
        setCustomName(nextConfig.name || customName);
      }
      setFontFile(null);
      globalSavedPresetRef.current = 'custom';
      globalPreviewDirtyRef.current = false;
      setMessageTone('success');
      setMessage(vi
        ? 'Đã tải font cá nhân lên và áp dụng làm font toàn hệ thống. Các khu vực đang “Kế thừa” sẽ dùng font này.'
        : 'Custom font uploaded and applied site-wide. Regions set to “Inherit” now use this font.');
    } else {
      setMessageTone('error');
      setMessage(result?.message || (vi ? 'Không thể tải font lên hệ thống.' : 'Could not upload the font.'));
    }
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
      savedRef.current = next;
      setSchemaReady(true);
      setMessageTone('success');
      setMessage(vi
        ? 'Đã lưu font theo khu vực cho toàn hệ thống. Các phiên Brian đang mở sẽ nhận thay đổi qua Realtime.'
        : 'Regional fonts saved site-wide. Open Brian sessions will receive the update through Realtime.');
    } else {
      setSchemaReady(false);
      setMessageTone('error');
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
            ? 'Mỗi khu vực mặc định kế thừa font toàn hệ thống. Thay đổi trong các ô chọn được xem thử ngay lập tức trên giao diện và chỉ được lưu khi bạn xác nhận.'
            : 'Every region inherits the global font by default. Selection changes are previewed instantly and saved only after you confirm.'}</p>
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

      <section className="regional-font-upload" aria-labelledby="regional-font-upload-title">
        <div className="regional-font-upload__icon" aria-hidden="true">Aa</div>
        <div className="regional-font-upload__copy">
          <span className="eyebrow">{vi ? 'Font cá nhân' : 'Custom font'}</span>
          <h4 id="regional-font-upload-title">{vi ? 'Tải font của riêng bạn' : 'Upload your own font'}</h4>
          <p>{vi
            ? 'Hỗ trợ .woff2, .woff, .ttf, .otf · tối đa 8 MB. Chọn file là xem thử ngay; chỉ khi bấm tải lên thì font mới được đồng bộ đến toàn hệ thống.'
            : 'Supports .woff2, .woff, .ttf and .otf up to 8 MB. Choosing a file previews it immediately; it is synchronized only after upload.'}</p>
          {customConfig?.url ? (
            <span className="regional-font-upload__stored">
              ✓ {vi ? 'Font đang lưu:' : 'Stored font:'} <b>{customConfig.name}</b>
              {customConfig.size ? ` · ${fileSizeLabel(customConfig.size)}` : ''}
            </span>
          ) : null}
        </div>

        <div className="regional-font-upload__controls">
          <label className="regional-font-upload__name">
            <span>{vi ? 'Tên hiển thị' : 'Display name'}</span>
            <input
              type="text"
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder={vi ? 'Ví dụ: SVN-Gilroy' : 'Example: SVN-Gilroy'}
              maxLength={80}
            />
          </label>

          <label className="regional-font-upload__file">
            <input
              type="file"
              accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
              onChange={chooseFile}
            />
            <span aria-hidden="true">↑</span>
            <b>{vi ? 'Chọn file font' : 'Choose font file'}</b>
          </label>

          <div className={`regional-font-upload__file-state ${fontFile ? 'has-file' : ''}`}>
            {fontFile ? (
              <><strong>{fontFile.name}</strong><small>{fileSizeLabel(fontFile.size)}</small></>
            ) : (
              <small>{vi ? 'Chưa chọn tệp mới' : 'No new file selected'}</small>
            )}
          </div>
        </div>

        <div className="regional-font-upload__preview">
          <span>{vi ? 'Xem ngay tại chỗ' : 'Live sample'}</span>
          <strong style={{ fontFamily: "'BrianGlobalCustom', var(--bes-global-font-family)" }}>
            Brian English · Giáo viên · Tiếng Việt rõ ràng
          </strong>
          <small style={{ fontFamily: "'BrianGlobalCustom', var(--bes-global-font-family)" }}>
            ABCDEFGHIJKLMNOPQRSTUVWXYZ · 0123456789 · Ă Â Ê Ô Ơ Ư Đ
          </small>
        </div>

        <div className="regional-font-upload__actions">
          {customConfig?.url ? (
            <button type="button" className="regional-font-btn" disabled={customBusy} onClick={previewSavedCustom}>
              {vi ? 'Xem font đã lưu' : 'Preview saved font'}
            </button>
          ) : null}
          <button type="button" className="regional-font-btn is-primary" disabled={customBusy || (!fontFile && !customConfig?.url)} onClick={saveCustom}>
            {customBusy
              ? (vi ? 'Đang tải font…' : 'Uploading…')
              : (fontFile
                ? (vi ? 'Tải lên & áp dụng' : 'Upload & apply')
                : (vi ? 'Dùng font này toàn hệ thống' : 'Use site-wide'))}
          </button>
        </div>
      </section>

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
        <strong>{vi ? 'Xem thử trực tiếp' : 'Live preview'}</strong>
        <span>{vi
          ? 'Mọi thay đổi font theo khu vực được áp dụng ngay trên trang hiện tại nhưng chưa ghi vào cấu hình. Nếu rời trang mà chưa lưu, Brian tự khôi phục bản đã lưu.'
          : 'Regional font changes apply immediately on the current page without being persisted. Leaving without saving restores the last saved configuration.'}</span>
      </div>

      {message ? <div className={`regional-font-admin__message is-${messageTone}`}>{message}</div> : null}

      <footer className="regional-font-admin__actions">
        <div>
          <strong>{vi ? `${customizedCount}/${GLOBAL_FONT_REGIONS.length} khu vực có font riêng` : `${customizedCount}/${GLOBAL_FONT_REGIONS.length} regions customized`}</strong>
          <small>{changed ? (vi ? 'Đang xem thử · có thay đổi chưa lưu' : 'Live preview · unsaved changes') : (vi ? 'Đã đồng bộ với cấu hình hiện tại' : 'Matches current configuration')}</small>
        </div>
        <button type="button" className="regional-font-btn" disabled={busy} onClick={resetAll}>{vi ? 'Kế thừa tất cả' : 'Inherit all'}</button>
        <button type="button" className="regional-font-btn" disabled={busy || !changed} onClick={restoreSaved}>{vi ? 'Khôi phục bản đã lưu' : 'Restore saved'}</button>
        <button type="button" className="regional-font-btn is-primary" disabled={busy || !changed} onClick={apply}>
          {busy ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Lưu & áp dụng' : 'Save & apply')}
        </button>
      </footer>
    </section>
  );
}
