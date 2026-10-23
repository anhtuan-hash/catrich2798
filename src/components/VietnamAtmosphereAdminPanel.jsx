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
import {
  DEFAULT_HALLOWEEN_SETTINGS,
  loadGlobalAtmosphereTheme,
  readGlobalAtmosphereLocal,
  saveGlobalAtmosphereTheme,
  subscribeGlobalAtmosphereTheme,
} from '../utils/globalAtmosphereTheme.js';
import HalloweenMotifArt, { HALLOWEEN_SYMBOLS } from './HalloweenMotifArt.jsx';
import './VietnamAtmosphereAdminPanel.css';

const HALLOWEEN_SYMBOL_LABELS = {
  pumpkin: 'Bí ngô', 'witch-hat': 'Mũ phù thủy', 'black-cat': 'Mèo đen',
  bat: 'Dơi', ghost: 'Bóng ma', 'haunted-house': 'Ngôi nhà ma',
  spider: 'Nhện', 'spider-web': 'Mạng nhện', cauldron: 'Vạc phép',
  'candy-corn': 'Kẹo bắp', skull: 'Đầu lâu', skeleton: 'Bộ xương',
  potion: 'Lọ thuốc phép', broom: 'Chổi phù thủy', owl: 'Cú mèo',
  tombstone: 'Bia mộ', candle: 'Nến', crow: 'Quạ',
  coffin: 'Quan tài', vampire: 'Ma cà rồng', mummy: 'Xác ướp',
  lantern: 'Đèn lồng', eyeball: 'Nhãn cầu', bone: 'Khúc xương',
  'autumn-leaf': 'Lá thu', candy: 'Kẹo Halloween', moon: 'Trăng khuyết',
  star: 'Ngôi sao',
};

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
  const [themeSnapshot, setThemeSnapshot] = useState(readGlobalAtmosphereLocal);
  const [halloweenDraft, setHalloweenDraft] = useState(() => ({ ...readGlobalAtmosphereLocal().halloween }));
  const [editingTheme, setEditingTheme] = useState(() => readGlobalAtmosphereLocal().activeTheme);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const fileInputRef = useRef(null);
  const messageTimerRef = useRef(null);

  // The standalone Admin route is now a compatibility alias that redirects to
  // System Settings. Keep this administrator-only tool available in both places.
  const onManagementRoute = route === 'admin' || route === 'settings';
  const canManage = onManagementRoute && canManageVietnamAtmosphere(currentUser);

  useEffect(() => {
    const onHashChange = () => {
      const nextRoute = currentRoute();
      setRoute(nextRoute);
      if (nextRoute !== 'admin' && nextRoute !== 'settings') setOpen(false);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (!onManagementRoute) return undefined;
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
  }, [onManagementRoute]);

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

  useEffect(() => {
    let active = true;
    const accept = (next) => {
      if (!active) return;
      setThemeSnapshot(next);
      setHalloweenDraft({ ...next.halloween });
      setEditingTheme(next.activeTheme);
    };
    loadGlobalAtmosphereTheme().then(accept).catch(() => null);
    const unsubscribe = subscribeGlobalAtmosphereTheme(accept);
    return () => { active = false; unsubscribe?.(); };
  }, []);

  useEffect(() => () => window.clearTimeout(messageTimerRef.current), []);

  const notify = (text, duration = 3200) => {
    setMessage(text);
    window.clearTimeout(messageTimerRef.current);
    if (duration > 0) messageTimerRef.current = window.setTimeout(() => setMessage(''), duration);
  };

  const patchDraft = (patch) => setDraft((current) => ({ ...current, ...patch }));
  const activeDraft = editingTheme === 'halloween' ? halloweenDraft : draft;
  const patchActiveDraft = (patch) => {
    if (editingTheme === 'halloween') setHalloweenDraft((current) => ({ ...current, ...patch }));
    else patchDraft(patch);
  };

  const save = async () => {
    if (!canManage || busy) return;
    setBusy('save');
    setMessage('');
    try {
      if (editingTheme === 'halloween') {
        const next = await saveGlobalAtmosphereTheme(currentUser, {
          activeTheme: 'halloween',
          halloween: halloweenDraft,
        });
        setThemeSnapshot(next);
        setHalloweenDraft({ ...next.halloween });
        notify(vi ? 'Đã áp dụng không khí Halloween trên toàn bộ Brian.' : 'Halloween atmosphere is now live across Brian.');
      } else {
        // Vietnam's existing images, configuration and storage are never deleted.
        const next = await saveVietnamAtmosphereSettings(currentUser, draft);
        setSnapshot(next);
        setDraft(editableSettings(next));
        if (themeSnapshot.activeTheme !== 'vietnam') {
          const switched = await saveGlobalAtmosphereTheme(currentUser, { activeTheme: 'vietnam' });
          setThemeSnapshot(switched);
        }
        notify(vi ? 'Đã áp dụng không khí Việt Nam trên toàn bộ Brian.' : 'Vietnam atmosphere is now live across Brian.');
      }
    } catch (error) {
      notify(error?.message || (vi ? 'Không thể lưu cấu hình.' : 'Could not save settings.'), 0);
    } finally {
      setBusy('');
    }
  };

  const resetDraft = () => {
    if (editingTheme === 'halloween') {
      setHalloweenDraft({ ...DEFAULT_HALLOWEEN_SETTINGS });
    } else {
      patchDraft({
        enabled: true,
        showBuiltIns: true,
        opacity: DEFAULT_VIETNAM_ATMOSPHERE_SETTINGS.opacity,
        speed: DEFAULT_VIETNAM_ATMOSPHERE_SETTINGS.speed,
        density: DEFAULT_VIETNAM_ATMOSPHERE_SETTINGS.density,
      });
    }
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
        title={vi ? 'Cấu hình lớp không khí' : 'Configure atmosphere'}
      >
        <span aria-hidden="true">★</span>
        <b>{vi ? 'Lớp không khí' : 'Atmosphere'}</b>
      </button>

      {open ? (
        <section id="bes-vn-admin-panel" className="bes-vn-admin__panel" aria-label={vi ? 'Cấu hình không khí theo mùa' : 'Seasonal atmosphere settings'}>
          <header className="bes-vn-admin__head">
            <div>
              <span className="eyebrow">{vi ? 'Cấu hình toàn hệ thống' : 'System-wide settings'}</span>
              <h2>{editingTheme === 'halloween' ? (vi ? 'Không khí Halloween' : 'Halloween atmosphere') : (vi ? 'Không khí Việt Nam' : 'Vietnam atmosphere')}</h2>
              <p>{editingTheme === 'halloween' ? (vi ? 'Sắc cam, tím và các họa tiết Halloween vui nhộn, nhẹ nhàng.' : 'Gentle Halloween details in orange and purple.') : (vi ? 'Quản lý hình ảnh và chuyển động trang trí trên toàn bộ Brian.' : 'Manage decorative images and motion across Brian.')}</p>
            </div>
            <button type="button" className="bes-vn-admin__close" onClick={() => setOpen(false)} aria-label={vi ? 'Đóng' : 'Close'}>×</button>
          </header>

          <div className="bes-atmosphere-theme-picker" role="group" aria-label={vi ? 'Chọn lớp không khí' : 'Select atmosphere'}>
            <button type="button" className={`bes-atmosphere-theme-option ${editingTheme === 'vietnam' ? 'is-selected' : ''}`} aria-pressed={editingTheme === 'vietnam'} onClick={() => setEditingTheme('vietnam')}>
              <span className="bes-atmosphere-theme-art is-vietnam" aria-hidden="true">🌸</span>
              <span className="bes-atmosphere-theme-copy"><strong>{vi ? 'Không khí Việt Nam' : 'Vietnam'}</strong><small>{vi ? 'Giữ trọn bộ hình ảnh đã cài' : 'Preserve existing assets'}</small>{themeSnapshot.activeTheme === 'vietnam' ? <em>{vi ? 'Đang áp dụng' : 'Active'}</em> : null}</span>
            </button>
            <button type="button" className={`bes-atmosphere-theme-option is-halloween ${editingTheme === 'halloween' ? 'is-selected' : ''}`} aria-pressed={editingTheme === 'halloween'} onClick={() => setEditingTheme('halloween')}>
              <span className="bes-atmosphere-theme-art is-halloween" aria-hidden="true">🎃</span>
              <span className="bes-atmosphere-theme-copy"><strong>{vi ? 'Không khí Halloween' : 'Halloween'}</strong><small>{vi ? '28 biểu tượng luân phiên' : '28 rotating illustrations'}</small>{themeSnapshot.activeTheme === 'halloween' ? <em>{vi ? 'Đang áp dụng' : 'Active'}</em> : null}</span>
            </button>
          </div>

          {(editingTheme === 'halloween' ? themeSnapshot.setupRequired : snapshot.setupRequired) ? (
            <div className="bes-vn-admin__setup" role="status">
              <strong>{vi ? 'Cần cài đặt Supabase một lần' : 'One-time Supabase setup required'}</strong>
              <p>{snapshot.error}</p>
              <code>{editingTheme === 'halloween' ? 'supabase/global_atmosphere_theme.sql' : 'supabase/vietnam_atmosphere.sql'}</code>
            </div>
          ) : null}

          <div className="bes-vn-admin__switches">
            <label className="bes-vn-admin__switch-row">
              <span>
                <b>{editingTheme === 'halloween' ? (vi ? 'Bật lớp phủ Halloween' : 'Enable Halloween overlay') : (vi ? 'Bật lớp phủ' : 'Enable overlay')}</b>
                <small>{vi ? 'Ẩn hoặc hiện toàn bộ hiệu ứng.' : 'Show or hide the entire effect.'}</small>
              </span>
              <input type="checkbox" checked={activeDraft.enabled} onChange={(event) => patchActiveDraft({ enabled: event.target.checked })} />
            </label>
            <label className="bes-vn-admin__switch-row">
              <span>
                <b>{vi ? 'Giữ biểu tượng mặc định' : 'Keep built-in symbols'}</b>
                <small>{editingTheme === 'halloween' ? (vi ? '28 mẫu: phù thủy, mèo đen, bí ngô, nhà ma, nhện và nhiều hình khác.' : '28 motifs: witches, black cats, pumpkins, haunted houses and more.') : (vi ? 'Cờ, nón lá, sen, tre, trống đồng và Hạ Long.' : 'Flag, conical hat, lotus, bamboo, bronze drum and Ha Long.')}</small>
              </span>
              <input type="checkbox" checked={activeDraft.showBuiltIns} onChange={(event) => patchActiveDraft({ showBuiltIns: event.target.checked })} />
            </label>
          </div>

          <div className="bes-vn-admin__ranges">
            <label>
              <span><b>{vi ? 'Độ mờ' : 'Opacity'}</b><output>{Math.round(activeDraft.opacity * 100)}%</output></span>
              <input type="range" min="3" max="28" step="1" value={Math.round(activeDraft.opacity * 100)} onChange={(event) => patchActiveDraft({ opacity: Number(event.target.value) / 100 })} />
              <small>{editingTheme === 'halloween' ? (vi ? 'Nên giữ khoảng 8–20% để không lấn át nội dung.' : '8–20% is recommended for readability.') : (vi ? 'Nên giữ trong khoảng 8–14% để không lấn át giao diện.' : '8–14% is recommended to preserve readability.')}</small>
            </label>
            <label>
              <span><b>{vi ? 'Tốc độ hoạt ảnh' : 'Animation speed'}</b><output>{activeDraft.speed.toFixed(1)}×</output></span>
              <input type="range" min="0.4" max="2.5" step="0.1" value={activeDraft.speed} onChange={(event) => patchActiveDraft({ speed: Number(event.target.value) })} />
              <small>{vi ? '0,4× rất chậm; 1× cân bằng; 2,5× nhanh.' : '0.4× is very slow, 1× balanced and 2.5× fast.'}</small>
            </label>
            <label>
              <span><b>{vi ? 'Mật độ biểu tượng' : 'Symbol density'}</b><output>{activeDraft.density}</output></span>
              <input type="range" min="3" max="18" step="1" value={activeDraft.density} onChange={(event) => patchActiveDraft({ density: Number(event.target.value) })} />
              <small>{editingTheme === 'halloween' ? (vi ? '28 mẫu thay phiên xuất hiện. Màn hình nhỏ tự giảm mật độ.' : '28 designs rotate over time; fewer are shown on small screens.') : (vi ? 'Điện thoại sẽ tự giảm số lượng để giữ hiệu năng.' : 'Mobile devices automatically use fewer items.')}</small>
            </label>
          </div>

          <div className="bes-vn-admin__actions">
            <button type="button" className="primary" disabled={Boolean(busy) || (editingTheme === 'halloween' ? themeSnapshot.setupRequired : snapshot.setupRequired)} onClick={save}>
              {busy === 'save' ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Lưu và áp dụng' : 'Save and apply')}
            </button>
            <button type="button" className="secondary" disabled={Boolean(busy)} onClick={resetDraft}>{vi ? 'Mức đề xuất' : 'Recommended'}</button>
          </div>

          {editingTheme === 'vietnam' ? (<div className="bes-vn-admin__library">
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
          </div>) : (
            <div className="bes-atmosphere-halloween-library">
              <div className="bes-atmosphere-halloween-library__heading">
                <div>
                  <strong>{vi ? 'Thư viện biểu tượng Halloween' : 'Halloween icon collection'}</strong>
                  <p>{vi ? 'Các mẫu minh họa sẽ luân phiên xuất hiện, không hiển thị dồn dập cùng lúc.' : 'Illustrations rotate gently without covering the screen.'}</p>
                </div>
                <span>{HALLOWEEN_SYMBOLS.length} {vi ? 'mẫu' : 'designs'}</span>
              </div>
              <div className="bes-atmosphere-halloween-library__grid" role="list" aria-label={vi ? 'Danh sách biểu tượng Halloween' : 'Halloween illustrations'}>
                {HALLOWEEN_SYMBOLS.map((kind) => (
                  <span key={kind} role="listitem" className="bes-atmosphere-halloween-library__icon" title={HALLOWEEN_SYMBOL_LABELS[kind] || kind} aria-label={HALLOWEEN_SYMBOL_LABELS[kind] || kind}>
                    <HalloweenMotifArt kind={kind} />
                  </span>
                ))}
              </div>
              <div className="bes-atmosphere-halloween-note">
                <span aria-hidden="true">✦</span>
                <div>
                  <strong>{vi ? 'Halloween vui nhộn, không làm phiền' : 'Playful, never distracting'}</strong>
                  <p>{vi ? 'Biểu tượng không cản thao tác, tự giảm mật độ trên điện thoại và tôn trọng cài đặt giảm chuyển động.' : 'Decorations do not block controls, reduce automatically on phones, and respect reduced motion.'}</p>
                </div>
              </div>
            </div>
          )}

          {message ? <div className={`bes-vn-admin__message ${(editingTheme === 'halloween' ? themeSnapshot.setupRequired : snapshot.setupRequired) || /không|could not|cannot|chưa/i.test(message) ? 'error' : 'success'}`} role="status">{message}</div> : null}
          <footer>{vi ? 'Thay đổi được đồng bộ theo thời gian thực. Giáo viên không có quyền chỉnh sửa.' : 'Changes sync in real time. Teachers cannot edit these settings.'}</footer>
        </section>
      ) : null}
    </div>
  );
}