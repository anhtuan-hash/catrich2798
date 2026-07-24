import React, { useEffect, useRef, useState } from 'react';
import { initializeAuthSession, subscribeToAuthChanges } from '../utils/auth.js';
import {
  DEFAULT_VIETNAM_ATMOSPHERE_SETTINGS,
  VIETNAM_ATMOSPHERE_LIMITS,
  canManageVietnamAtmosphere,
  loadVietnamAtmosphereSettings,
  readVietnamAtmosphereLocal,
  removeVietnamAtmosphereImage,
  saveVietnamAtmosphereSettings,
  setVietnamAtmosphereImageEnabled,
  subscribeVietnamAtmosphereSettings,
  uploadVietnamAtmosphereImage,
} from '../utils/vietnamAtmosphereSettings.js';
import './VietnamAtmosphereAdminPanel.css';

function currentRoute() {
  if (typeof window === 'undefined') return '';
  return window.location.hash.replace(/^#\/?/, '').split(/[?&]/)[0].trim();
}

function editableSettings(snapshot) {
  return {
    enabled: snapshot.enabled !== false,
    showBuiltIns: snapshot.showBuiltIns !== false,
    opacity: Number(snapshot.opacity) || DEFAULT_VIETNAM_ATMOSPHERE_SETTINGS.opacity,
    speed: Number(snapshot.speed) || DEFAULT_VIETNAM_ATMOSPHERE_SETTINGS.speed,
    density: Number(snapshot.density) || DEFAULT_VIETNAM_ATMOSPHERE_SETTINGS.density,
  };
}

function formatSize(bytes, language) {
  const value = Math.max(0, Number(bytes) || 0);
  if (!value) return '';
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

export default function VietnamAtmosphereAdminPanel({ language = 'vi' }) {
  const vi = language === 'vi';
  const [route, setRoute] = useState(currentRoute);
  const [currentUser, setCurrentUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(readVietnamAtmosphereLocal);
  const [draft, setDraft] = useState(() => editableSettings(readVietnamAtmosphereLocal()));
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);
  const messageTimerRef = useRef(null);

  const onAdminRoute = route === 'admin';
  const canManage = onAdminRoute && canManageVietnamAtmosphere(currentUser);

  useEffect(() => {
    const onHashChange = () => {
      const nextRoute = currentRoute();
      setRoute(nextRoute);
      if (nextRoute !== 'admin') setOpen(false);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!onAdminRoute) return undefined;
    let active = true;
    initializeAuthSession().then((user) => {
      if (active) setCurrentUser(user);
    }).catch(() => null);
    const unsubscribe = subscribeToAuthChanges((user) => {
      if (active) setCurrentUser(user);
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [onAdminRoute]);

  useEffect(() => {
    let active = true;
    loadVietnamAtmosphereSettings().then((next) => {
      if (!active) return;
      setSnapshot(next);
      setDraft(editableSettings(next));
    }).catch(() => null);
    const unsubscribe = subscribeVietnamAtmosphereSettings((next) => {
      if (!active) return;
      setSnapshot(next);
      setDraft(editableSettings(next));
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  useEffect(() => () => window.clearTimeout(messageTimerRef.current), []);

  const notify = (text, duration = 3200) => {
    setMessage(text);
    window.clearTimeout(messageTimerRef.current);
    if (duration > 0) messageTimerRef.current = window.setTimeout(() => setMessage(''), duration);
  };

  const patchDraft = (patch) => setDraft((current) => ({ ...current, ...patch }));

  const save = async () => {
    if (!canManage || busy) return;
    setBusy('save');
    setMessage('');
    try {
      const next = await saveVietnamAtmosphereSettings(currentUser, draft);
      setSnapshot(next);
      setDraft(editableSettings(next));
      notify(vi ? 'Đã áp dụng lớp phủ mới cho toàn bộ website.' : 'The overlay settings are now live across the website.');
    } catch (error) {
      notify(error?.message || (vi ? 'Không thể lưu cấu hình.' : 'Could not save settings.'), 0);
    } finally {
      setBusy('');
    }
  };

  const resetDraft = () => {
    patchDraft({
      enabled: true,
      showBuiltIns: true,
      opacity: DEFAULT_VIETNAM_ATMOSPHERE_SETTINGS.opacity,
      speed: DEFAULT_VIETNAM_ATMOSPHERE_SETTINGS.speed,
      density: DEFAULT_VIETNAM_ATMOSPHERE_SETTINGS.density,
    });
    notify(vi ? 'Đã đưa các thanh chỉnh về mức đề xuất. Bấm Lưu để áp dụng.' : 'Recommended values restored. Press Save to apply.');
  };

  const uploadFiles = async (event) => {
    const files = Array.from(event.target.files || []);
    event.target.value = '';
    if (!files.length || !canManage || busy) return;
    setBusy('upload');
    setMessage('');
    try {
      let next = snapshot;
      for (const file of files) {
        next = await uploadVietnamAtmosphereImage(currentUser, file);
      }
      setSnapshot(next);
      notify(vi ? `Đã thêm ${files.length} hình ảnh vào lớp phủ.` : `${files.length} image(s) added to the overlay.`);
    } catch (error) {
      notify(error?.message || (vi ? 'Không thể tải ảnh lên.' : 'Could not upload the image.'), 0);
    } finally {
      setBusy('');
    }
  };

  const removeImage = async (image) => {
    if (!canManage || busy) return;
    setBusy(`remove:${image.id}`);
    setMessage('');
    try {
      const next = await removeVietnamAtmosphereImage(currentUser, image.id);
      setSnapshot(next);
      notify(vi ? 'Đã xóa hình khỏi lớp phủ.' : 'Image removed from the overlay.');
    } catch (error) {
      notify(error?.message || (vi ? 'Không thể xóa hình.' : 'Could not remove the image.'), 0);
    } finally {
      setBusy('');
    }
  };

  const toggleImage = async (image) => {
    if (!canManage || busy) return;
    setBusy(`toggle:${image.id}`);
    setMessage('');
    try {
      const next = await setVietnamAtmosphereImageEnabled(currentUser, image.id, !image.enabled);
      setSnapshot(next);
    } catch (error) {
      notify(error?.message || (vi ? 'Không thể đổi trạng thái hình.' : 'Could not update the image.'), 0);
    } finally {
      setBusy('');
    }
  };

  if (!canManage) return null;

  return (
    <div className={`bes-vn-admin ${open ? 'is-open' : ''}`}>
      <button
        type="button"
        className="bes-vn-admin__launcher"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls="bes-vn-admin-panel"
        title={vi ? 'Điều chỉnh lớp phủ Việt Nam' : 'Configure Vietnam atmosphere'}
      >
        <span aria-hidden="true">★</span>
        <b>{vi ? 'Không khí Việt Nam' : 'Vietnam atmosphere'}</b>
      </button>

      {open ? (
        <section id="bes-vn-admin-panel" className="bes-vn-admin__panel" aria-label={vi ? 'Cấu hình lớp phủ Việt Nam' : 'Vietnam atmosphere settings'}>
          <header className="bes-vn-admin__head">
            <div>
              <span className="eyebrow">{vi ? 'Cấu hình toàn hệ thống' : 'System-wide settings'}</span>
              <h2>{vi ? 'Không khí Việt Nam' : 'Vietnam atmosphere'}</h2>
              <p>{vi ? 'Quản lý hình ảnh và chuyển động trang trí trên toàn bộ Brian.' : 'Manage decorative images and motion across Brian.'}</p>
            </div>
            <button type="button" className="bes-vn-admin__close" onClick={() => setOpen(false)} aria-label={vi ? 'Đóng' : 'Close'}>×</button>
          </header>

          {snapshot.setupRequired ? (
            <div className="bes-vn-admin__setup" role="status">
              <strong>{vi ? 'Cần cài đặt Supabase một lần' : 'One-time Supabase setup required'}</strong>
              <p>{snapshot.error}</p>
              <code>supabase/vietnam_atmosphere.sql</code>
            </div>
          ) : null}

          <div className="bes-vn-admin__switches">
            <label className="bes-vn-admin__switch-row">
              <span>
                <b>{vi ? 'Bật lớp phủ' : 'Enable overlay'}</b>
                <small>{vi ? 'Ẩn hoặc hiện toàn bộ hiệu ứng.' : 'Show or hide the entire effect.'}</small>
              </span>
              <input type="checkbox" checked={draft.enabled} onChange={(event) => patchDraft({ enabled: event.target.checked })} />
            </label>
            <label className="bes-vn-admin__switch-row">
              <span>
                <b>{vi ? 'Giữ biểu tượng mặc định' : 'Keep built-in symbols'}</b>
                <small>{vi ? 'Cờ, nón lá, sen, tre, trống đồng và Hạ Long.' : 'Flag, conical hat, lotus, bamboo, bronze drum and Ha Long.'}</small>
              </span>
              <input type="checkbox" checked={draft.showBuiltIns} onChange={(event) => patchDraft({ showBuiltIns: event.target.checked })} />
            </label>
          </div>

          <div className="bes-vn-admin__ranges">
            <label>
              <span><b>{vi ? 'Độ mờ' : 'Opacity'}</b><output>{Math.round(draft.opacity * 100)}%</output></span>
              <input type="range" min="3" max="28" step="1" value={Math.round(draft.opacity * 100)} onChange={(event) => patchDraft({ opacity: Number(event.target.value) / 100 })} />
              <small>{vi ? 'Nên giữ trong khoảng 8–14% để không lấn át giao diện.' : '8–14% is recommended to preserve readability.'}</small>
            </label>
            <label>
              <span><b>{vi ? 'Tốc độ hoạt ảnh' : 'Animation speed'}</b><output>{draft.speed.toFixed(1)}×</output></span>
              <input type="range" min="0.4" max="2.5" step="0.1" value={draft.speed} onChange={(event) => patchDraft({ speed: Number(event.target.value) })} />
              <small>{vi ? '0,4× rất chậm; 1× cân bằng; 2,5× nhanh.' : '0.4× is very slow, 1× balanced and 2.5× fast.'}</small>
            </label>
            <label>
              <span><b>{vi ? 'Mật độ biểu tượng' : 'Symbol density'}</b><output>{draft.density}</output></span>
              <input type="range" min="3" max="18" step="1" value={draft.density} onChange={(event) => patchDraft({ density: Number(event.target.value) })} />
              <small>{vi ? 'Điện thoại sẽ tự giảm số lượng để giữ hiệu năng.' : 'Mobile devices automatically use fewer items.'}</small>
            </label>
          </div>

          <div className="bes-vn-admin__actions">
            <button type="button" className="primary" disabled={Boolean(busy) || snapshot.setupRequired} onClick={save}>
              {busy === 'save' ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Lưu và áp dụng' : 'Save and apply')}
            </button>
            <button type="button" className="secondary" disabled={Boolean(busy)} onClick={resetDraft}>{vi ? 'Mức đề xuất' : 'Recommended'}</button>
          </div>

          <div className="bes-vn-admin__library">
            <div className="bes-vn-admin__section-title">
              <div>
                <h3>{vi ? 'Hình ảnh do Admin thêm' : 'Admin-added images'}</h3>
                <p>{vi ? 'SVG, PNG hoặc WebP; tối đa 3 MB mỗi ảnh.' : 'SVG, PNG or WebP; up to 3 MB each.'}</p>
              </div>
              <span>{snapshot.images.length}/{VIETNAM_ATMOSPHERE_LIMITS.maxImages}</span>
            </div>

            <input ref={fileInputRef} type="file" accept=".svg,.png,.webp,image/svg+xml,image/png,image/webp" multiple hidden onChange={uploadFiles} />
            <button
              type="button"
              className="bes-vn-admin__upload"
              disabled={Boolean(busy) || snapshot.setupRequired || snapshot.images.length >= VIETNAM_ATMOSPHERE_LIMITS.maxImages}
              onClick={() => fileInputRef.current?.click()}
            >
              <span aria-hidden="true">＋</span>
              <b>{busy === 'upload' ? (vi ? 'Đang tải lên…' : 'Uploading…') : (vi ? 'Thêm hình ảnh' : 'Add images')}</b>
              <small>{vi ? 'Ảnh sẽ được đồng bộ cho toàn bộ website.' : 'Images will be shared across the website.'}</small>
            </button>

            {snapshot.images.length ? (
              <div className="bes-vn-admin__image-grid">
                {snapshot.images.map((image) => (
                  <article key={image.id} className={image.enabled ? '' : 'is-disabled'}>
                    <div className="bes-vn-admin__thumb"><img src={image.url} alt="" /></div>
                    <div className="bes-vn-admin__image-copy">
                      <b title={image.name}>{image.name}</b>
                      <small>{formatSize(image.size, language)}</small>
                    </div>
                    <div className="bes-vn-admin__image-actions">
                      <button type="button" disabled={Boolean(busy)} onClick={() => toggleImage(image)}>{image.enabled ? (vi ? 'Ẩn' : 'Hide') : (vi ? 'Hiện' : 'Show')}</button>
                      <button type="button" className="danger" disabled={Boolean(busy)} onClick={() => removeImage(image)}>{vi ? 'Xóa' : 'Delete'}</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="bes-vn-admin__empty">{vi ? 'Chưa có ảnh tùy chỉnh. Các biểu tượng mặc định vẫn đang hoạt động.' : 'No custom images yet. Built-in symbols remain active.'}</div>
            )}
          </div>

          {message ? <div className={`bes-vn-admin__message ${snapshot.setupRequired || /không|could not|cannot|chưa/i.test(message) ? 'error' : 'success'}`} role="status">{message}</div> : null}
          <footer>{vi ? 'Thay đổi được đồng bộ theo thời gian thực. Giáo viên không có quyền chỉnh sửa.' : 'Changes sync in real time. Teachers cannot edit these settings.'}</footer>
        </section>
      ) : null}
    </div>
  );
}
