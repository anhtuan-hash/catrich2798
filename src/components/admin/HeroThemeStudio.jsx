import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  applyThemeToAll,
  applyThemeToSelected,
  normalizeHeroTheme,
  normalizeThemeDocument,
  resetHeroTheme,
  resolveHeroTheme,
  setHeroTheme,
} from '../../heroTheme/heroThemeModel.js';
import { getHeroRegistryForStudio } from '../../heroTheme/heroRegistry.js';
import {
  createHeroTheme,
  loadHeroThemePreviewBlob,
  loadHeroThemeStudioState,
  publishHeroTheme,
  restoreHeroThemeRevision,
  saveHeroThemeDraft,
  uploadHeroThemeMedia,
} from '../../heroTheme/heroThemeClient.js';
import '../../styles/HeroThemeStudio.css';

const EMPTY_DOCUMENT = Object.freeze({ version: 1, heroes: {} });
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function formatDate(value, language) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-GB', {
    dateStyle: 'medium', timeStyle: 'short',
  }).format(date);
}

function fileBaseName(name) {
  return String(name || 'hero').replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9À-ỹ._ -]/g, '_').slice(0, 120) || 'hero';
}

async function optimizeHeroImage(file) {
  if (!ALLOWED_IMAGE_TYPES.has(file?.type)) throw new Error('Chỉ hỗ trợ JPG, PNG hoặc WebP.');
  if (file.size > MAX_UPLOAD_BYTES) throw new Error('Ảnh Hero tối đa 10 MB.');
  if (typeof createImageBitmap !== 'function') return file;

  const bitmap = await createImageBitmap(file);
  try {
    const maxSide = 2560;
    const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * ratio));
    const height = Math.max(1, Math.round(bitmap.height * ratio));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);
    const webp = await new Promise((resolve) => canvas.toBlob(resolve, 'image/webp', 0.88));
    if (!webp || webp.size > MAX_UPLOAD_BYTES) return file;
    if (ratio === 1 && webp.size >= file.size * 0.98) return file;
    return new File([webp], `${fileBaseName(file.name)}.webp`, { type: 'image/webp', lastModified: Date.now() });
  } finally {
    bitmap.close?.();
  }
}

function RangeControl({ label, value, min, max, step, onChange, suffix = '' }) {
  return (
    <label className="hero-theme-studio__range">
      <span><b>{label}</b><output>{Number(value).toFixed(step < 1 ? 2 : 0)}{suffix}</output></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} />
    </label>
  );
}

function themeForNewMedia(mediaId) {
  return normalizeHeroTheme({
    mode: 'custom', mediaId, fit: 'cover', positionX: 50, positionY: 50, zoom: 1,
    opacity: 1, brightness: 1, blur: 0, overlayColor: '#000000', overlayOpacity: 0.18,
  });
}

export default function HeroThemeStudio({ currentUser, language = 'vi' }) {
  const vi = language === 'vi';
  const registry = useMemo(() => getHeroRegistryForStudio(), []);
  const allHeroKeys = useMemo(() => registry.map((entry) => entry.heroKey), [registry]);
  const [state, setState] = useState({ databaseReady: true, sets: [], drafts: [], revisions: [], media: [], activeRevisionId: null });
  const [selectedSetId, setSelectedSetId] = useState('');
  const [selectedHeroKey, setSelectedHeroKey] = useState(registry[0]?.heroKey || 'home.main');
  const [selectedHeroKeys, setSelectedHeroKeys] = useState(() => new Set([registry[0]?.heroKey || 'home.main']));
  const [draft, setDraft] = useState(EMPTY_DOCUMENT);
  const [newThemeName, setNewThemeName] = useState('');
  const [heroSearch, setHeroSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const uploadRef = useRef(null);

  const selectedDescriptor = registry.find((entry) => entry.heroKey === selectedHeroKey) || registry[0];
  const currentTheme = resolveHeroTheme(draft, selectedHeroKey);
  const selectedSet = state.sets.find((item) => item.id === selectedSetId) || null;
  const selectedRevisions = state.revisions.filter((item) => item.theme_set_id === selectedSetId).slice(0, 12);
  const activeRevision = state.revisions.find((item) => item.id === state.activeRevisionId) || null;
  const filteredRegistry = registry.filter((entry) => {
    const query = heroSearch.trim().toLowerCase();
    if (!query) return true;
    return `${entry.heroKey} ${entry.labelVi} ${entry.labelEn}`.toLowerCase().includes(query);
  });

  const applyPayload = (payload, preferredSetId = '') => {
    const next = {
      databaseReady: payload?.databaseReady !== false,
      sets: payload?.sets || [],
      drafts: payload?.drafts || [],
      revisions: payload?.revisions || [],
      media: payload?.media || [],
      activeRevisionId: payload?.activeRevisionId || null,
    };
    setState(next);
    const nextId = preferredSetId && next.sets.some((item) => item.id === preferredSetId)
      ? preferredSetId
      : (selectedSetId && next.sets.some((item) => item.id === selectedSetId) ? selectedSetId : next.sets[0]?.id || '');
    setSelectedSetId(nextId);
    const draftRow = next.drafts.find((item) => item.theme_set_id === nextId);
    setDraft(normalizeThemeDocument(draftRow?.config || EMPTY_DOCUMENT));
  };

  const refresh = async (preferredSetId = '') => {
    setBusy(true);
    setMessage('');
    try {
      const payload = await loadHeroThemeStudioState();
      applyPayload(payload, preferredSetId);
    } catch (error) {
      setMessage(error?.message || (vi ? 'Không thể tải Hero Theme Studio.' : 'Could not load Hero Theme Studio.'));
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    if (currentUser?.role === 'admin') refresh();
  }, [currentUser?.id]);

  useEffect(() => {
    let alive = true;
    let objectUrl = '';
    setPreviewUrl('');
    if (currentTheme.mode !== 'custom' || !currentTheme.mediaId) return () => {};
    loadHeroThemePreviewBlob(currentTheme.mediaId).then((blob) => {
      if (!alive) return;
      objectUrl = URL.createObjectURL(blob);
      setPreviewUrl(objectUrl);
    }).catch(() => {
      if (alive) setPreviewUrl('');
    });
    return () => {
      alive = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [currentTheme.mode, currentTheme.mediaId]);

  if (currentUser?.role !== 'admin') return null;

  const chooseSet = (id) => {
    setSelectedSetId(id);
    const row = state.drafts.find((item) => item.theme_set_id === id);
    setDraft(normalizeThemeDocument(row?.config || EMPTY_DOCUMENT));
    setMessage('');
  };

  const updateCurrentTheme = (patch) => {
    if (currentTheme.mode !== 'custom') return;
    setDraft((previous) => setHeroTheme(previous, selectedHeroKey, { ...currentTheme, ...patch, mode: 'custom' }));
  };

  const createTheme = async () => {
    const name = newThemeName.trim();
    if (!name) return setMessage(vi ? 'Nhập tên bộ theme trước.' : 'Enter a theme name first.');
    setBusy(true);
    setMessage('');
    try {
      const payload = await createHeroTheme(name);
      applyPayload(payload, payload?.result?.themeSetId);
      setNewThemeName('');
      setMessage(vi ? 'Đã tạo bộ theme mới.' : 'Theme set created.');
    } catch (error) {
      setMessage(error?.message || 'Could not create theme.');
    } finally { setBusy(false); }
  };

  const saveDraft = async ({ quiet = false } = {}) => {
    if (!selectedSetId) throw new Error(vi ? 'Hãy tạo hoặc chọn một bộ theme.' : 'Create or select a theme set.');
    const payload = await saveHeroThemeDraft(selectedSetId, draft);
    applyPayload(payload, selectedSetId);
    if (!quiet) setMessage(vi ? 'Đã lưu bản nháp. Người dùng chưa thấy thay đổi.' : 'Draft saved. Users still see the published revision.');
    return payload;
  };

  const onSaveDraft = async () => {
    setBusy(true); setMessage('');
    try { await saveDraft(); } catch (error) { setMessage(error?.message || 'Could not save draft.'); } finally { setBusy(false); }
  };

  const onPublish = async () => {
    setBusy(true); setMessage('');
    try {
      await saveHeroThemeDraft(selectedSetId, draft);
      const payload = await publishHeroTheme(selectedSetId);
      applyPayload(payload, selectedSetId);
      setMessage(vi ? 'Đã xuất bản. Revision mới đang hoạt động cho mọi người dùng.' : 'Published. The new revision is active for every user.');
    } catch (error) { setMessage(error?.message || 'Publish failed.'); } finally { setBusy(false); }
  };

  const onRestore = async (revision) => {
    if (!revision?.id) return;
    if (!window.confirm(vi ? `Khôi phục Revision ${revision.revision_number} thành một revision mới?` : `Restore Revision ${revision.revision_number} as a new revision?`)) return;
    setBusy(true); setMessage('');
    try {
      const payload = await restoreHeroThemeRevision(revision.id);
      applyPayload(payload, revision.theme_set_id);
      setMessage(vi ? 'Đã khôi phục bằng một revision mới.' : 'Restored as a new revision.');
    } catch (error) { setMessage(error?.message || 'Restore failed.'); } finally { setBusy(false); }
  };

  const onUpload = async (event) => {
    const source = event.target.files?.[0];
    event.target.value = '';
    if (!source) return;
    setBusy(true); setMessage(vi ? 'Đang tối ưu và tải ảnh lên Google Drive…' : 'Optimizing and uploading to Google Drive…');
    try {
      const optimized = await optimizeHeroImage(source);
      const media = await uploadHeroThemeMedia(optimized);
      setState((previous) => ({ ...previous, media: [media, ...previous.media.filter((item) => item.id !== media.id)] }));
      setDraft((previous) => setHeroTheme(previous, selectedHeroKey, themeForNewMedia(media.id)));
      setMessage(vi
        ? `Đã tải ${media.file_name} (${media.width}×${media.height}) lên Drive. Hãy lưu bản nháp hoặc xuất bản khi sẵn sàng.`
        : `Uploaded ${media.file_name} (${media.width}×${media.height}) to Drive. Save the draft or publish when ready.`);
    } catch (error) { setMessage(error?.message || 'Upload failed.'); } finally { setBusy(false); }
  };

  const reuseMedia = (mediaId) => {
    if (!mediaId) return;
    setDraft((previous) => setHeroTheme(previous, selectedHeroKey, themeForNewMedia(mediaId)));
  };

  const toggleSelected = (heroKey) => {
    setSelectedHeroKeys((previous) => {
      const next = new Set(previous);
      if (next.has(heroKey)) next.delete(heroKey); else next.add(heroKey);
      return next;
    });
  };

  const previewImageStyle = currentTheme.mode === 'custom' && previewUrl ? {
    backgroundImage: `url(${JSON.stringify(previewUrl)})`,
    backgroundSize: currentTheme.fit,
    backgroundPosition: `${currentTheme.positionX}% ${currentTheme.positionY}%`,
    opacity: currentTheme.opacity,
    filter: `brightness(${currentTheme.brightness}) blur(${currentTheme.blur}px)`,
    transform: `scale(${currentTheme.zoom})`,
  } : {};

  return (
    <section className="hero-theme-studio" id="admin-hero-theme-studio" aria-label={vi ? 'Hero Theme Studio' : 'Hero Theme Studio'}>
      <header className="hero-theme-studio__header">
        <div>
          <span className="hero-theme-studio__eyebrow">HERO THEME STUDIO · V1</span>
          <h2>{vi ? 'Quản lý nền Hero toàn hệ thống' : 'Site-wide Hero background management'}</h2>
          <p>{vi ? 'Bản nháp tách biệt hoàn toàn với Published. ORIGINAL luôn giữ nguyên Hero gốc.' : 'Draft is isolated from Published. ORIGINAL always preserves the native Hero.'}</p>
        </div>
        <div className="hero-theme-studio__status">
          <span className={state.databaseReady ? 'is-ready' : 'is-warning'}>{state.databaseReady ? (vi ? 'Database sẵn sàng' : 'Database ready') : (vi ? 'Cần cài SQL V1' : 'V1 SQL required')}</span>
          <span>{activeRevision ? `Published #${activeRevision.revision_number}` : (vi ? 'Chưa có Published' : 'No published revision')}</span>
        </div>
      </header>

      {!state.databaseReady ? (
        <div className="hero-theme-studio__notice is-warning">
          <strong>{vi ? 'Theme Runtime đang fail-open nên website vẫn giữ Hero gốc.' : 'Theme Runtime is fail-open, so the website keeps its original Heros.'}</strong>
          <span>{vi ? 'Database cần áp dụng supabase/brian_hero_theme_studio.sql trước khi lưu theme.' : 'Apply supabase/brian_hero_theme_studio.sql before saving themes.'}</span>
        </div>
      ) : null}

      <div className="hero-theme-studio__topbar">
        <label>
          <span>{vi ? 'Bộ theme' : 'Theme set'}</span>
          <select value={selectedSetId} onChange={(event) => chooseSet(event.target.value)} disabled={busy || !state.sets.length}>
            {!state.sets.length ? <option value="">{vi ? 'Chưa có bộ theme' : 'No theme sets'}</option> : null}
            {state.sets.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
        </label>
        <div className="hero-theme-studio__new-theme">
          <input value={newThemeName} onChange={(event) => setNewThemeName(event.target.value)} placeholder={vi ? 'Tên bộ mới, ví dụ: Tết 2027' : 'New set, e.g. Summer 2027'} maxLength={120} />
          <button type="button" onClick={createTheme} disabled={busy || !state.databaseReady}>{vi ? '+ Tạo theme' : '+ New theme'}</button>
        </div>
      </div>

      <div className="hero-theme-studio__workspace">
        <aside className="hero-theme-studio__heroes">
          <div className="hero-theme-studio__section-title">
            <strong>{vi ? 'Hero Registry' : 'Hero Registry'}</strong>
            <small>{registry.length} Hero</small>
          </div>
          <input className="hero-theme-studio__search" value={heroSearch} onChange={(event) => setHeroSearch(event.target.value)} placeholder={vi ? 'Tìm Hero…' : 'Find a Hero…'} />
          <div className="hero-theme-studio__hero-list">
            {filteredRegistry.map((entry) => {
              const mode = resolveHeroTheme(draft, entry.heroKey).mode;
              return (
                <div key={entry.heroKey} className={`hero-theme-studio__hero-row${entry.heroKey === selectedHeroKey ? ' is-current' : ''}`}>
                  <input type="checkbox" checked={selectedHeroKeys.has(entry.heroKey)} onChange={() => toggleSelected(entry.heroKey)} aria-label={`${vi ? 'Chọn' : 'Select'} ${entry.heroKey}`} />
                  <button type="button" onClick={() => setSelectedHeroKey(entry.heroKey)}>
                    <b>{vi ? entry.labelVi : entry.labelEn}</b><small>{entry.heroKey}</small>
                  </button>
                  <em className={mode === 'custom' ? 'is-custom' : ''}>{mode.toUpperCase()}</em>
                </div>
              );
            })}
          </div>
          <div className="hero-theme-studio__bulk-actions">
            <button type="button" disabled={!selectedHeroKeys.size || !selectedSetId} onClick={() => setDraft((previous) => applyThemeToSelected(previous, currentTheme, [...selectedHeroKeys]))}>{vi ? 'Áp dụng cho đã chọn' : 'Apply to selected'}</button>
            <button type="button" disabled={!selectedSetId} onClick={() => setDraft((previous) => applyThemeToAll(previous, currentTheme, allHeroKeys))}>{vi ? 'Áp dụng cho tất cả' : 'Apply to all'}</button>
          </div>
        </aside>

        <div className="hero-theme-studio__preview-column">
          <div className="hero-theme-studio__section-title">
            <strong>{vi ? 'Live preview' : 'Live preview'}</strong>
            <small>{selectedDescriptor?.heroKey}</small>
          </div>
          <div className={`hero-theme-studio__preview${currentTheme.mode === 'custom' ? ' is-custom' : ' is-original'}`}>
            {currentTheme.mode === 'custom' ? <div className="hero-theme-studio__preview-image" style={previewImageStyle} /> : null}
            {currentTheme.mode === 'custom' ? <div className="hero-theme-studio__preview-overlay" style={{ background: currentTheme.overlayColor, opacity: currentTheme.overlayOpacity }} /> : null}
            <div className="hero-theme-studio__preview-content">
              <span>{currentTheme.mode === 'custom' ? 'CUSTOM THEME' : 'ORIGINAL HERO'}</span>
              <h3>{vi ? selectedDescriptor?.labelVi : selectedDescriptor?.labelEn}</h3>
              <p>{currentTheme.mode === 'custom'
                ? (vi ? 'Chỉ lớp nền được thay đổi. Nội dung, nút và logic Hero thật vẫn giữ nguyên.' : 'Only the background layer changes. Real Hero content, buttons and logic remain untouched.')
                : (vi ? 'Theme Runtime không can thiệp. Hero thật giữ 100% nền hiện tại.' : 'Theme Runtime does nothing. The native Hero keeps its current background.')}</p>
              <div><button type="button">{vi ? 'Nút Hero mẫu' : 'Sample Hero button'}</button><span>{vi ? 'Preview nền' : 'Background preview'}</span></div>
            </div>
          </div>
          {currentTheme.mode === 'custom' && !previewUrl ? <small className="hero-theme-studio__preview-note">{vi ? 'Đang tải preview riêng tư từ Google Drive…' : 'Loading private preview from Google Drive…'}</small> : null}

          <div className="hero-theme-studio__history">
            <div className="hero-theme-studio__section-title"><strong>{vi ? 'Lịch sử Published' : 'Published history'}</strong><small>{selectedRevisions.length}</small></div>
            {!selectedRevisions.length ? <p>{vi ? 'Chưa có revision cho bộ này.' : 'No revisions for this set yet.'}</p> : selectedRevisions.map((revision) => (
              <div key={revision.id} className={revision.id === state.activeRevisionId ? 'is-active' : ''}>
                <span><b>Revision {revision.revision_number}</b><small>{formatDate(revision.created_at, language)}</small></span>
                {revision.id === state.activeRevisionId ? <em>ACTIVE</em> : <button type="button" onClick={() => onRestore(revision)} disabled={busy}>{vi ? 'Khôi phục' : 'Restore'}</button>}
              </div>
            ))}
          </div>
        </div>

        <aside className="hero-theme-studio__controls">
          <div className="hero-theme-studio__section-title"><strong>{vi ? 'Điều khiển nền' : 'Background controls'}</strong><small>{currentTheme.mode.toUpperCase()}</small></div>
          <input ref={uploadRef} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={onUpload} />
          <button type="button" className="hero-theme-studio__upload" onClick={() => uploadRef.current?.click()} disabled={busy || !selectedSetId}>{vi ? '↑ Tải ảnh mới lên Drive' : '↑ Upload new image to Drive'}</button>
          {state.media.length ? (
            <label className="hero-theme-studio__field"><span>{vi ? 'Dùng lại ảnh đã tải' : 'Reuse uploaded media'}</span>
              <select value={currentTheme.mode === 'custom' ? currentTheme.mediaId : ''} onChange={(event) => reuseMedia(event.target.value)}>
                <option value="">{vi ? 'Chọn ảnh…' : 'Choose media…'}</option>
                {state.media.map((media) => <option key={media.id} value={media.id}>{media.file_name} · {media.width}×{media.height}</option>)}
              </select>
            </label>
          ) : null}

          {currentTheme.mode === 'custom' ? <>
            <div className="hero-theme-studio__segmented">
              <button type="button" className={currentTheme.fit === 'cover' ? 'active' : ''} onClick={() => updateCurrentTheme({ fit: 'cover' })}>Cover</button>
              <button type="button" className={currentTheme.fit === 'contain' ? 'active' : ''} onClick={() => updateCurrentTheme({ fit: 'contain' })}>Contain</button>
            </div>
            <RangeControl label={vi ? 'Vị trí ngang' : 'Position X'} value={currentTheme.positionX} min={0} max={100} step={1} onChange={(positionX) => updateCurrentTheme({ positionX })} suffix="%" />
            <RangeControl label={vi ? 'Vị trí dọc' : 'Position Y'} value={currentTheme.positionY} min={0} max={100} step={1} onChange={(positionY) => updateCurrentTheme({ positionY })} suffix="%" />
            <RangeControl label="Zoom" value={currentTheme.zoom} min={0.5} max={2} step={0.01} onChange={(zoom) => updateCurrentTheme({ zoom })} />
            <RangeControl label={vi ? 'Độ trong ảnh' : 'Image opacity'} value={currentTheme.opacity} min={0} max={1} step={0.01} onChange={(opacity) => updateCurrentTheme({ opacity })} />
            <RangeControl label="Brightness" value={currentTheme.brightness} min={0.2} max={1.8} step={0.01} onChange={(brightness) => updateCurrentTheme({ brightness })} />
            <RangeControl label="Blur" value={currentTheme.blur} min={0} max={30} step={1} onChange={(blur) => updateCurrentTheme({ blur })} suffix="px" />
            <label className="hero-theme-studio__color"><span>{vi ? 'Màu overlay' : 'Overlay color'}</span><input type="color" value={/^#[0-9a-f]{6}$/i.test(currentTheme.overlayColor) ? currentTheme.overlayColor : '#000000'} onChange={(event) => updateCurrentTheme({ overlayColor: event.target.value })} /></label>
            <RangeControl label={vi ? 'Độ đậm overlay' : 'Overlay opacity'} value={currentTheme.overlayOpacity} min={0} max={1} step={0.01} onChange={(overlayOpacity) => updateCurrentTheme({ overlayOpacity })} />
          </> : <div className="hero-theme-studio__original-note">{vi ? 'Hero đang ở ORIGINAL. Tải/chọn một ảnh để chuyển sang CUSTOM.' : 'This Hero is ORIGINAL. Upload/select media to switch to CUSTOM.'}</div>}

          <button type="button" className="hero-theme-studio__reset" disabled={!selectedSetId || currentTheme.mode === 'original'} onClick={() => setDraft((previous) => resetHeroTheme(previous, selectedHeroKey))}>{vi ? '↺ Khôi phục nền gốc' : '↺ Restore original background'}</button>
        </aside>
      </div>

      <footer className="hero-theme-studio__footer">
        <div>
          <strong>{selectedSet?.name || (vi ? 'Chưa chọn theme' : 'No theme selected')}</strong>
          <span>{vi ? `${selectedHeroKeys.size} Hero đang được chọn cho thao tác bulk.` : `${selectedHeroKeys.size} Heros selected for bulk actions.`}</span>
        </div>
        <div>
          <button type="button" onClick={() => refresh(selectedSetId)} disabled={busy}>{vi ? 'Tải lại' : 'Reload'}</button>
          <button type="button" onClick={onSaveDraft} disabled={busy || !selectedSetId || !state.databaseReady}>{vi ? 'Lưu bản nháp' : 'Save draft'}</button>
          <button type="button" className="publish" onClick={onPublish} disabled={busy || !selectedSetId || !state.databaseReady}>{vi ? 'Xuất bản' : 'Publish'}</button>
        </div>
      </footer>
      {message ? <div className="hero-theme-studio__message" role="status">{message}</div> : null}
    </section>
  );
}
