import React, { useEffect, useMemo, useRef, useState } from 'react';
import { initializeAuthSession, subscribeToAuthChanges } from '../utils/auth.js';
import {
  DEFAULT_HERO_THEME,
  canManageHeroThemeStudio,
  loadHeroThemeStudioSettings,
  normalizeHeroTheme,
  publishHeroThemeStudioTheme,
  readHeroThemeStudioLocal,
  resetHeroThemeStudioToOriginal,
  rollbackHeroThemeStudioTheme,
  saveHeroThemeStudioDraft,
  subscribeToHeroThemeStudioSettings,
  uploadHeroThemeStudioImage,
} from '../utils/heroThemeStudioSettings.js';
import './HeroThemeStudioAdminPanel.css';

function copyTheme(theme) {
  const normalized = normalizeHeroTheme(theme);
  return { ...normalized, heroKeys: [...normalized.heroKeys] };
}

export default function HeroThemeStudioAdminPanel({ route = '', registry = [] }) {
  const managementRoute = route === 'admin' || route === 'settings';
  const [currentUser, setCurrentUser] = useState(null);
  const [open, setOpen] = useState(false);
  const [snapshot, setSnapshot] = useState(readHeroThemeStudioLocal);
  const [draft, setDraft] = useState(() => copyTheme(readHeroThemeStudioLocal().draft));
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const fileRef = useRef(null);
  const canManage = managementRoute && canManageHeroThemeStudio(currentUser);
  const availableHeroes = useMemo(() => registry.filter((item) => item?.key && item?.label), [registry]);

  useEffect(() => {
    if (!managementRoute) {
      setOpen(false);
      return undefined;
    }
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
  }, [managementRoute]);

  useEffect(() => {
    if (!managementRoute) return undefined;
    let active = true;
    loadHeroThemeStudioSettings().then((next) => {
      if (!active) return;
      setSnapshot(next);
      setDraft(copyTheme(next.draft));
    }).catch((error) => setMessage(String(error?.message || error)));
    const unsubscribe = subscribeToHeroThemeStudioSettings((next) => {
      if (!active) return;
      setSnapshot(next);
      if (!busy) setDraft(copyTheme(next.draft));
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [managementRoute, busy]);

  useEffect(() => () => {
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('bes:hero-theme-preview-clear'));
  }, []);

  if (!canManage) return null;

  const patchDraft = (patch) => setDraft((current) => copyTheme({ ...current, ...patch }));
  const toggleHeroKey = (key) => {
    setDraft((current) => {
      const keys = new Set(current.heroKeys || []);
      if (keys.has(key)) keys.delete(key); else keys.add(key);
      return copyTheme({ ...current, heroKeys: [...keys] });
    });
  };

  const run = async (name, task, success) => {
    setBusy(name);
    setMessage('');
    try {
      const next = await task();
      if (next?.draft) {
        setSnapshot(next);
        setDraft(copyTheme(next.draft));
      }
      setMessage(success);
      return next;
    } catch (error) {
      setMessage(String(error?.message || error || 'Có lỗi xảy ra.'));
      return null;
    } finally {
      setBusy('');
    }
  };

  const preview = () => {
    const theme = copyTheme(draft);
    window.dispatchEvent(new CustomEvent('bes:hero-theme-preview', { detail: { theme } }));
    setMessage('Đang preview cục bộ trên tab này.');
  };

  const clearPreview = () => {
    window.dispatchEvent(new CustomEvent('bes:hero-theme-preview-clear'));
    setMessage('Đã quay về theme đang xuất bản.');
  };

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy('upload');
    setMessage('');
    try {
      const uploaded = await uploadHeroThemeStudioImage(file, currentUser);
      patchDraft({ enabled: true, imageUrl: uploaded.url, imageName: uploaded.name });
      setMessage(`Đã tải ${uploaded.name || 'ảnh Hero'} lên kho dùng chung.`);
    } catch (error) {
      setMessage(String(error?.message || error));
    } finally {
      setBusy('');
    }
  };

  const published = snapshot.published || DEFAULT_HERO_THEME;

  return (
    <div className="hero-theme-studio" data-open={open ? 'true' : 'false'}>
      <button
        type="button"
        className="hero-theme-studio__launcher"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
      >
        Hero Theme Studio
      </button>

      {open ? (
        <aside className="hero-theme-studio__panel" aria-label="Hero Theme Studio">
          <header className="hero-theme-studio__header">
            <div>
              <span className="hero-theme-studio__eyebrow">System-wide Hero backgrounds</span>
              <h2>Hero Theme Studio</h2>
              <p>Thiết kế một nền Hero dùng chung, chọn toàn bộ hoặc từng khu vực và xuất bản cho giáo viên.</p>
            </div>
            <button type="button" className="hero-theme-studio__close" onClick={() => setOpen(false)} aria-label="Đóng Hero Theme Studio">×</button>
          </header>

          <div className="hero-theme-studio__body">
            <section className="hero-theme-studio__section">
              <div className="hero-theme-studio__section-title">
                <strong>1. Hình nền</strong>
                <span>{draft.imageName || (draft.imageUrl ? 'Ảnh đang chọn' : 'Chưa chọn ảnh')}</span>
              </div>
              {draft.imageUrl ? (
                <div className="hero-theme-studio__preview" style={{ backgroundImage: `url("${draft.imageUrl}")` }} aria-label="Ảnh Hero đang chọn" />
              ) : (
                <div className="hero-theme-studio__preview hero-theme-studio__preview--empty">Nền gốc của từng Hero vẫn được giữ nguyên.</div>
              )}
              <input ref={fileRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={handleUpload} />
              <div className="hero-theme-studio__row">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={Boolean(busy)}>Tải ảnh lên</button>
                <label className="hero-theme-studio__switch">
                  <input type="checkbox" checked={draft.enabled} onChange={(event) => patchDraft({ enabled: event.target.checked })} />
                  <span>Bật nền tùy chỉnh</span>
                </label>
              </div>
            </section>

            <section className="hero-theme-studio__section">
              <div className="hero-theme-studio__section-title"><strong>2. Phạm vi</strong><span>targetMode · all / selected · heroKeys</span></div>
              <div className="hero-theme-studio__segmented" role="group" aria-label="Phạm vi Hero">
                <button type="button" className={draft.targetMode === 'all' ? 'is-active' : ''} onClick={() => patchDraft({ targetMode: 'all' })}>Tất cả Hero</button>
                <button type="button" className={draft.targetMode === 'selected' ? 'is-active' : ''} onClick={() => patchDraft({ targetMode: 'selected' })}>Chọn Hero</button>
              </div>
              {draft.targetMode === 'selected' ? (
                <div className="hero-theme-studio__heroes">
                  {availableHeroes.map((hero) => (
                    <label key={hero.key}>
                      <input type="checkbox" checked={draft.heroKeys.includes(hero.key)} onChange={() => toggleHeroKey(hero.key)} />
                      <span>{hero.label}</span>
                    </label>
                  ))}
                </div>
              ) : null}
            </section>

            <section className="hero-theme-studio__section hero-theme-studio__controls">
              <label>
                <span>overlay <b>{Math.round(draft.overlay * 100)}%</b></span>
                <input type="range" min="0" max="0.85" step="0.01" value={draft.overlay} onChange={(event) => patchDraft({ overlay: event.target.value })} />
              </label>
              <label>
                <span>position</span>
                <select value={draft.position} onChange={(event) => patchDraft({ position: event.target.value })}>
                  <option value="center center">Giữa</option>
                  <option value="center top">Giữa · trên</option>
                  <option value="center bottom">Giữa · dưới</option>
                  <option value="left center">Trái</option>
                  <option value="right center">Phải</option>
                </select>
              </label>
              <label>
                <span>blur <b>{draft.blur}px</b></span>
                <input type="range" min="0" max="16" step="1" value={draft.blur} onChange={(event) => patchDraft({ blur: event.target.value })} />
              </label>
              <label>
                <span>parallax <b>{draft.parallax}px</b></span>
                <input type="range" min="0" max="24" step="1" value={draft.parallax} onChange={(event) => patchDraft({ parallax: event.target.value })} />
              </label>
            </section>

            <section className="hero-theme-studio__status">
              <span className={snapshot.cloudAvailable ? 'is-online' : 'is-warning'}>{snapshot.cloudAvailable ? 'Cloud sync sẵn sàng' : 'Cần khởi tạo Supabase để đồng bộ'}</span>
              <span>Đang xuất bản: {published.enabled && published.imageUrl ? published.imageName || 'nền tùy chỉnh' : 'nền gốc'}</span>
            </section>

            {message ? <div className="hero-theme-studio__message" role="status">{message}</div> : null}
          </div>

          <footer className="hero-theme-studio__footer">
            <button type="button" onClick={preview} disabled={Boolean(busy)}>Preview</button>
            <button type="button" onClick={clearPreview} disabled={Boolean(busy)}>Hủy preview</button>
            <button type="button" onClick={() => run('save', () => saveHeroThemeStudioDraft(draft, currentUser), 'Đã lưu nháp lên hệ thống.')} disabled={Boolean(busy)}>Lưu nháp</button>
            <button type="button" className="is-primary" onClick={() => run('publish', () => publishHeroThemeStudioTheme(draft, currentUser), 'Đã xuất bản Hero cho toàn hệ thống.')} disabled={Boolean(busy)}>Xuất bản</button>
            <button type="button" onClick={() => run('rollback', () => rollbackHeroThemeStudioTheme(currentUser), 'Đã hoàn tác về phiên bản trước.')} disabled={Boolean(busy)}>Hoàn tác</button>
            <button type="button" className="is-danger" onClick={() => run('reset', () => resetHeroThemeStudioToOriginal(currentUser), 'Đã trả toàn bộ Hero về nền gốc.')} disabled={Boolean(busy)}>Nền gốc</button>
          </footer>
        </aside>
      ) : null}
    </div>
  );
}
