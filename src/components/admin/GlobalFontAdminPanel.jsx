import React, { useEffect, useMemo, useState } from 'react';
import {
  GLOBAL_FONT_PRESETS,
  applyGlobalFontPreset,
  getGlobalFontPreset,
  loadGlobalFontPresetFromServer,
  saveGlobalFontPreset,
} from '../../utils/globalFontSystem.js';
import {
  applyGlobalCustomFont,
  loadGlobalCustomFontSettings,
  previewGlobalCustomFont,
  saveExistingGlobalCustomFont,
  saveGlobalCustomFont,
  validateGlobalCustomFont,
} from '../../utils/globalCustomFont.js';
import './GlobalFontAdminPanel.css';

function fileSizeLabel(size = 0) {
  const bytes = Number(size || 0);
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function baseName(name = '') {
  return String(name || '').replace(/\.[^.]+$/, '').trim();
}

export default function GlobalFontAdminPanel({ currentUser, language = 'vi' }) {
  const vi = language !== 'en';
  const [selected, setSelected] = useState(getGlobalFontPreset());
  const [saved, setSaved] = useState(getGlobalFontPreset());
  const [syncReady, setSyncReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [fontFile, setFontFile] = useState(null);
  const [customName, setCustomName] = useState('');
  const [customConfig, setCustomConfig] = useState(null);
  const current = useMemo(
    () => GLOBAL_FONT_PRESETS.find((item) => item.id === selected) || GLOBAL_FONT_PRESETS[0],
    [selected],
  );

  useEffect(() => {
    let alive = true;
    Promise.all([
      loadGlobalFontPresetFromServer({ silent: true }),
      loadGlobalCustomFontSettings({ silent: true, apply: getGlobalFontPreset() === 'custom' }),
    ]).then(([fontResult, customResult]) => {
      if (!alive) return;
      const preset = fontResult?.preset || getGlobalFontPreset();
      setSelected(preset);
      setSaved(preset);
      setSyncReady(Boolean(fontResult?.ok));
      if (customResult?.config) {
        setCustomConfig(customResult.config);
        setCustomName(customResult.config.name || '');
      }
    });
    return () => { alive = false; };
  }, []);

  const choose = (id) => {
    setSelected(id);
    setMessage('');
  };

  const chooseFile = (event) => {
    const file = event.target.files?.[0] || null;
    if (!file) return;
    const validation = validateGlobalCustomFont(file);
    if (!validation.ok) {
      setFontFile(null);
      setMessage(validation.message);
      event.target.value = '';
      return;
    }
    setFontFile(file);
    setSelected('custom');
    if (!customName || customName === customConfig?.name) setCustomName(baseName(file.name));
    setMessage(vi
      ? 'Đã chọn tệp font. Bạn có thể xem thử trước hoặc tải lên và áp dụng cho toàn hệ thống.'
      : 'Font file selected. Preview it or upload and apply it site-wide.');
  };

  const preview = () => {
    setMessage('');
    if (selected === 'custom') {
      if (fontFile) {
        const result = previewGlobalCustomFont(fontFile, customName || baseName(fontFile.name));
        setMessage(result.ok
          ? (vi ? 'Đang xem thử font tải lên trên giao diện Admin. Font chưa được lưu.' : 'Previewing the uploaded font in Admin. It is not saved yet.')
          : result.message);
        return;
      }
      if (customConfig?.url) {
        applyGlobalCustomFont({ ...customConfig, name: customName || customConfig.name }, { persist: false, source: 'admin-existing-custom-preview' });
        setMessage(vi
          ? 'Đang xem thử font tùy chỉnh đã lưu. Bấm “Áp dụng toàn hệ thống” để dùng lại font này.'
          : 'Previewing the saved custom font. Click “Apply site-wide” to use it again.');
        return;
      }
      setMessage(vi ? 'Hãy chọn một tệp font trước khi xem thử.' : 'Choose a font file before previewing.');
      return;
    }

    applyGlobalFontPreset(selected, { persist: false, source: 'admin-preview' });
    setMessage(vi
      ? 'Đang xem thử font trên giao diện Admin. Bấm “Áp dụng toàn hệ thống” để lưu.'
      : 'Previewing this font in Admin. Click “Apply site-wide” to save it.');
  };

  const apply = async () => {
    setBusy(true);
    setMessage('');
    let result;

    if (selected === 'custom') {
      if (fontFile) {
        result = await saveGlobalCustomFont(
          fontFile,
          customName || baseName(fontFile.name),
          currentUser,
          customConfig,
        );
      } else if (customConfig?.url) {
        result = await saveExistingGlobalCustomFont(
          { ...customConfig, name: customName || customConfig.name },
          currentUser,
        );
      } else {
        result = {
          ok: false,
          message: vi
            ? 'Chưa có font tùy chỉnh. Hãy bấm “Chọn file font” rồi tải lên.'
            : 'No custom font is available. Choose a font file first.',
        };
      }
    } else {
      result = await saveGlobalFontPreset(selected, currentUser);
    }

    setBusy(false);
    if (result?.ok) {
      setSaved(result?.preset || selected);
      setSyncReady(true);
      if (result?.config) {
        setCustomConfig(result.config);
        setCustomName(result.config.name || customName);
        setFontFile(null);
      }
      setMessage(vi
        ? 'Đã áp dụng font cho toàn hệ thống. Các tài khoản giáo viên đang mở Brian sẽ nhận thay đổi qua Realtime.'
        : 'Font applied site-wide. Open teacher sessions will receive the change through Realtime.');
    } else {
      setSyncReady(false);
      setMessage(result?.message || (vi
        ? 'Không thể đồng bộ font toàn hệ thống.'
        : 'Could not synchronize the font site-wide.'));
    }
  };

  return (
    <section className="admin-global-font metro-panel" id="admin-global-font">
      <header className="admin-global-font__head">
        <div>
          <span className="eyebrow">{vi ? 'Giao diện toàn hệ thống' : 'Site-wide appearance'}</span>
          <h2>{vi ? 'Font chữ toàn hệ thống' : 'Global font'}</h2>
          <p>{vi
            ? 'Admin chọn font có sẵn hoặc tải font riêng lên. Sau khi áp dụng, Brian dùng font đó trên toàn site và đồng bộ đến mọi tài khoản giáo viên.'
            : 'Choose a built-in font or upload your own. Once applied, Brian uses it across the site and syncs it to every teacher account.'}</p>
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
            className={`admin-global-font__option ${item.custom ? 'is-custom' : ''} ${selected === item.id ? 'is-selected' : ''}`}
            onClick={() => choose(item.id)}
            style={{ '--font-preview-family': item.family }}
          >
            <span className="admin-global-font__radio" aria-hidden="true" />
            <span className="admin-global-font__sample">{item.custom && customConfig?.name ? `Aa  ${customConfig.name} · 123` : item.sample}</span>
            <strong>
              {item.label}
              {item.recommended ? <em>{vi ? 'Khuyên dùng' : 'Recommended'}</em> : null}
              {item.custom && customConfig?.url ? <em className="is-custom-ready">{vi ? 'Đã tải lên' : 'Uploaded'}</em> : null}
            </strong>
            <small>{vi ? item.descriptionVi : item.description}</small>
          </button>
        ))}
      </div>

      <div className={`admin-global-font__upload ${selected === 'custom' ? 'is-active' : ''}`}>
        <div className="admin-global-font__upload-icon" aria-hidden="true">Aa</div>
        <div className="admin-global-font__upload-copy">
          <strong>{vi ? 'Font do Admin tải lên' : 'Admin-uploaded font'}</strong>
          <p>{vi
            ? 'Hỗ trợ .woff2, .woff, .ttf, .otf · tối đa 8 MB. Nên ưu tiên WOFF2 để tải nhanh hơn.'
            : 'Supports .woff2, .woff, .ttf and .otf up to 8 MB. WOFF2 is recommended for faster loading.'}</p>
          {customConfig?.url ? (
            <span className="admin-global-font__existing">
              ✓ {vi ? 'Đang lưu trên hệ thống:' : 'Stored on the system:'} <b>{customConfig.name}</b>
              {customConfig.size ? ` · ${fileSizeLabel(customConfig.size)}` : ''}
            </span>
          ) : null}
        </div>

        <div className="admin-global-font__upload-controls">
          <label className="admin-global-font__name-field">
            <span>{vi ? 'Tên hiển thị' : 'Display name'}</span>
            <input
              type="text"
              value={customName}
              onChange={(event) => setCustomName(event.target.value)}
              placeholder={vi ? 'Ví dụ: SVN-Gilroy' : 'Example: SVN-Gilroy'}
              maxLength={80}
            />
          </label>

          <label className="admin-global-font__file-button">
            <input
              type="file"
              accept=".woff2,.woff,.ttf,.otf,font/woff2,font/woff,font/ttf,font/otf"
              onChange={chooseFile}
            />
            <span>↑</span>
            {vi ? 'Chọn file font' : 'Choose font file'}
          </label>

          <div className={`admin-global-font__file-state ${fontFile ? 'has-file' : ''}`}>
            {fontFile ? (
              <>
                <strong>{fontFile.name}</strong>
                <small>{fileSizeLabel(fontFile.size)}</small>
              </>
            ) : (
              <small>{vi ? 'Chưa chọn tệp mới' : 'No new file selected'}</small>
            )}
          </div>
        </div>
      </div>

      <div className="admin-global-font__preview" style={{ '--font-preview-family': current.family }}>
        <span>{vi ? 'Xem trước' : 'Preview'}</span>
        <strong>Brian English · Giáo viên · Thông báo TTCM</strong>
        <p>ABCDEFGHIJKLMNOPQRSTUVWXYZ · abcdefghijklmnopqrstuvwxyz · 0123456789 · Ă Â Ê Ô Ơ Ư Đ</p>
      </div>

      {message ? <div className={`admin-global-font__message ${syncReady ? 'is-success' : ''}`}>{message}</div> : null}

      <footer className="admin-global-font__actions">
        <div>
          <span>{vi ? 'Đang chọn:' : 'Selected:'}</span>
          <strong>{selected === 'custom' && (customName || customConfig?.name) ? `${current.label} · ${customName || customConfig.name}` : current.label}</strong>
          {saved === selected ? <small>✓ {vi ? 'đang áp dụng' : 'active'}</small> : null}
        </div>
        <button type="button" className="metro-small-btn" disabled={busy} onClick={preview}>{vi ? 'Xem thử' : 'Preview'}</button>
        <button type="button" className="metro-small-btn active" disabled={busy} onClick={apply}>
          {busy
            ? (selected === 'custom' && fontFile ? (vi ? 'Đang tải font…' : 'Uploading font…') : (vi ? 'Đang áp dụng…' : 'Applying…'))
            : (selected === 'custom' && fontFile ? (vi ? 'Tải lên & áp dụng' : 'Upload & apply') : (vi ? 'Áp dụng toàn hệ thống' : 'Apply site-wide'))}
        </button>
      </footer>
    </section>
  );
}
