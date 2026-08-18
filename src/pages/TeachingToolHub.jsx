import React, { useEffect, useMemo, useRef, useState } from 'react';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import {
  createTeachingToolSite,
  deleteTeachingToolSite,
  domainFromUrl,
  listTeachingToolSites,
  moveTeachingToolSite,
  updateTeachingToolSite,
} from '../utils/teachingToolHub.js';
import './TeachingToolHub.css';
import './TeachingToolHubLauncher.css';

const EMPTY_FORM = {
  title: '',
  url: '',
  description: '',
  category: 'Công cụ dạy học',
  icon: '↗',
  isActive: true,
};

function initialForm(site = null) {
  return site ? {
    title: site.title || '',
    url: site.url || '',
    description: site.description || '',
    category: site.category || 'Công cụ dạy học',
    icon: site.icon || '↗',
    isActive: site.isActive !== false,
  } : { ...EMPTY_FORM };
}

function faviconFromUrl(value) {
  try {
    const url = new URL(value);
    return `${url.origin}/favicon.ico`;
  } catch {
    return '';
  }
}

function ToolCard({ site, canManage, onOpen, onEdit, onDelete, onTogglePin, onDragStart, onDragOver, onDrop }) {
  const domain = domainFromUrl(site.url);
  const favicon = faviconFromUrl(site.url);
  return (
    <article
      className={`tth-card tth-launcher-tile${site.isActive ? '' : ' is-paused'}${site.isPinned ? ' is-pinned' : ''}`}
      draggable={canManage}
      onDragStart={(event) => onDragStart?.(event, site)}
      onDragOver={(event) => onDragOver?.(event, site)}
      onDrop={(event) => onDrop?.(event, site)}
    >
      {site.isPinned ? <span className="tth-pin-badge" title="Đã ghim">★</span> : null}
      {canManage ? (
        <div className="tth-tile-admin" onClick={(event) => event.stopPropagation()}>
          <button type="button" className={site.isPinned ? 'is-active' : ''} onClick={() => onTogglePin(site)} title={site.isPinned ? 'Bỏ ghim' : 'Ghim lên đầu'}>★</button>
          <button type="button" onClick={() => onEdit(site)} title="Sửa">✎</button>
          <button type="button" className="is-danger" onClick={() => onDelete(site)} title="Xóa">×</button>
        </div>
      ) : null}
      <button type="button" className="tth-card-main" onClick={() => onOpen(site)} disabled={!site.isActive && !canManage}>
        <span className="tth-site-icon" aria-hidden="true">
          <span className="tth-icon-fallback">{site.icon || '↗'}</span>
          {favicon ? <img src={favicon} alt="" onError={(event) => { event.currentTarget.style.display = 'none'; }} /> : null}
        </span>
        <span className="tth-card-copy">
          <strong>{site.title}</strong>
          <small>{site.category || 'Công cụ dạy học'}</small>
          <span className="tth-domain">{domain}</span>
          <p>{site.description || 'Mở website trực tiếp trong không gian Brian.'}</p>
        </span>
        <span className="tth-open-mark" aria-hidden="true">↗</span>
      </button>
      {canManage && !site.isActive ? <span className="tth-hidden-badge">Đang ẩn</span> : null}
    </article>
  );
}

function SiteModal({ site, onClose, onSave }) {
  const [form, setForm] = useState(() => initialForm(site));
  const [error, setError] = useState('');

  useEffect(() => {
    const onKeyDown = (event) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const submit = (event) => {
    event.preventDefault();
    if (!form.title.trim()) return setError('Hãy nhập tên website.');
    if (!form.url.trim()) return setError('Hãy nhập địa chỉ website.');
    try {
      onSave(form);
    } catch (saveError) {
      setError(saveError?.message || 'Không thể lưu website.');
    }
  };

  return (
    <div className="tth-modal-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
      <form className="tth-modal" onSubmit={submit}>
        <header>
          <div><span>TTCM · TEACHING TOOL HUB</span><h2>{site ? 'Chỉnh sửa website' : 'Thêm website'}</h2></div>
          <button type="button" onClick={onClose} aria-label="Đóng">×</button>
        </header>
        <div className="tth-form-grid">
          <label className="is-wide">Tên website
            <input autoFocus value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ví dụ: Ba Ba Dum" />
          </label>
          <label className="is-wide">Địa chỉ website
            <input value={form.url} onChange={(event) => setForm((current) => ({ ...current, url: event.target.value }))} placeholder="https://example.com" inputMode="url" />
          </label>
          <label>Danh mục
            <input value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} placeholder="Trò chơi / Từ vựng / Trình chiếu..." />
          </label>
          <label>Biểu tượng dự phòng
            <input value={form.icon} maxLength={4} onChange={(event) => setForm((current) => ({ ...current, icon: event.target.value }))} placeholder="↗" />
          </label>
          <label className="is-wide">Mô tả ngắn
            <textarea rows={3} value={form.description} onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))} placeholder="Website này dùng để làm gì trong tiết học?" />
          </label>
          <label className="tth-switch is-wide">
            <input type="checkbox" checked={form.isActive} onChange={(event) => setForm((current) => ({ ...current, isActive: event.target.checked }))} />
            <span><b>Hiển thị trong Hub</b><small>Tắt mục này để tạm ẩn website khỏi giáo viên.</small></span>
          </label>
        </div>
        {error ? <p className="tth-form-error">{error}</p> : null}
        <footer><button type="button" onClick={onClose}>Hủy</button><button type="submit" className="is-primary">{site ? 'Lưu thay đổi' : 'Thêm vào Hub'}</button></footer>
      </form>
    </div>
  );
}

function Viewer({ site, onBack }) {
  const frameRef = useRef(null);
  const [frameKey, setFrameKey] = useState(0);
  const domain = domainFromUrl(site.url);

  const fullscreen = async () => {
    try {
      await frameRef.current?.requestFullscreen?.();
    } catch {
      // Fullscreen is optional and browser-controlled.
    }
  };

  return (
    <section className="tth-viewer">
      <header className="tth-viewer-bar">
        <div className="tth-viewer-left">
          <button type="button" className="tth-back" onClick={onBack}>← Hub</button>
          <span className="tth-viewer-icon">{site.icon || '↗'}</span>
          <div><strong>{site.title}</strong><small>{domain}</small></div>
        </div>
        <div className="tth-viewer-actions">
          <button type="button" onClick={() => setFrameKey((value) => value + 1)}>↻ Tải lại</button>
          <button type="button" onClick={fullscreen}>⛶ Toàn màn hình</button>
          <a href={site.url} target="_blank" rel="noopener noreferrer">Mở tab mới ↗</a>
        </div>
      </header>
      <div className="tth-frame-shell" ref={frameRef}>
        <iframe
          key={frameKey}
          title={site.title}
          src={site.url}
          className="tth-frame"
          allow="fullscreen; clipboard-read; clipboard-write; autoplay; microphone; camera"
          sandbox="allow-forms allow-modals allow-popups allow-popups-to-escape-sandbox allow-presentation allow-same-origin allow-scripts allow-downloads"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      </div>
      <div className="tth-frame-note">
        <span>ⓘ</span>
        <p>Một số website chặn nhúng bằng chính sách bảo mật của họ. Nếu nội dung không hiện, dùng <b>Mở tab mới</b>.</p>
      </div>
    </section>
  );
}

export default function TeachingToolHub(props) {
  const currentUser = props.currentUser || null;
  const canManage = isDepartmentLeaderRole(currentUser?.role);
  const [sites, setSites] = useState(() => listTeachingToolSites({ includeInactive: canManage }));
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [activeSite, setActiveSite] = useState(null);
  const [editingSite, setEditingSite] = useState(undefined);
  const [toast, setToast] = useState('');
  const [draggedId, setDraggedId] = useState('');

  const refresh = () => setSites(listTeachingToolSites({ includeInactive: canManage }));

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener('storage', onUpdate);
    window.addEventListener('brian:teaching-tools-updated', onUpdate);
    return () => {
      window.removeEventListener('storage', onUpdate);
      window.removeEventListener('brian:teaching-tools-updated', onUpdate);
    };
  }, [canManage]);

  useEffect(() => {
    if (!toast) return undefined;
    const timer = window.setTimeout(() => setToast(''), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const categories = useMemo(() => {
    const values = [...new Set(sites.filter((site) => site.isActive || canManage).map((site) => site.category).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'vi'));
    return ['Tất cả', ...values];
  }, [sites, canManage]);

  const visibleSites = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase('vi');
    return sites.filter((site) => {
      if (!canManage && !site.isActive) return false;
      if (category !== 'Tất cả' && site.category !== category) return false;
      if (!needle) return true;
      return [site.title, site.description, site.category, domainFromUrl(site.url)].join(' ').toLocaleLowerCase('vi').includes(needle);
    });
  }, [sites, query, category, canManage]);

  const saveSite = (form) => {
    if (!canManage) throw new Error('Chỉ TTCM mới có quyền quản lý website.');
    if (editingSite) updateTeachingToolSite(editingSite.id, form);
    else createTeachingToolSite(form);
    setEditingSite(undefined);
    refresh();
    setToast(editingSite ? 'Đã cập nhật website.' : 'Đã thêm website vào Teaching Tool Hub.');
  };

  const removeSite = (site) => {
    if (!canManage) return;
    if (!window.confirm(`Xóa “${site.title}” khỏi Teaching Tool Hub?`)) return;
    deleteTeachingToolSite(site.id);
    if (activeSite?.id === site.id) setActiveSite(null);
    refresh();
    setToast('Đã xóa website.');
  };

  const togglePin = (site) => {
    if (!canManage) return;
    updateTeachingToolSite(site.id, { ...site, isPinned: !site.isPinned });
    refresh();
    setToast(site.isPinned ? 'Đã bỏ ghim website.' : 'Đã ghim website lên đầu.');
  };

  const startDrag = (event, site) => {
    if (!canManage) return;
    setDraggedId(site.id);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', site.id);
  };

  const dragOver = (event) => {
    if (!canManage) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const dropOn = (event, targetSite) => {
    if (!canManage) return;
    event.preventDefault();
    const sourceId = draggedId || event.dataTransfer.getData('text/plain');
    setDraggedId('');
    if (!sourceId || sourceId === targetSite.id) return;
    moveTeachingToolSite(sourceId, targetSite.id);
    refresh();
    setToast('Đã đổi thứ tự website.');
  };

  if (activeSite) return <div className="tth-page"><Viewer site={activeSite} onBack={() => setActiveSite(null)} />{toast ? <div className="tth-toast">✓ {toast}</div> : null}</div>;

  return (
    <div className="tth-page tth-launcher-page">
      <section className="tth-hero">
        <div className="tth-hero-copy">
          <span className="tth-kicker">BRIAN · TEACHING TOOL HUB</span>
          <h1>Teaching <em>Launcher</em></h1>
          <p>Kho website dạy học do TTCM tuyển chọn. Chọn một công cụ để mở trực tiếp trong Brian.</p>
          <div className="tth-hero-meta"><span>◉ {sites.filter((site) => site.isActive).length} website</span><span>⌁ Mở trực tiếp trong Brian</span></div>
        </div>
        <div className="tth-hero-actions">
          {canManage ? <button type="button" className="tth-add" onClick={() => setEditingSite(null)}>＋ Thêm website</button> : null}
          <small>{canManage ? 'TTCM · quản lý launcher' : 'Danh mục do TTCM quản lý'}</small>
        </div>
      </section>

      <section className="tth-toolbar">
        <label className="tth-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm công cụ..." /></label>
        <div className="tth-categories">{categories.map((item) => <button type="button" key={item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
        {canManage ? <span className="tth-launcher-hint">Kéo thả để sắp xếp · ★ ghim lên đầu</span> : null}
      </section>

      {visibleSites.length ? (
        <section className="tth-grid tth-launcher-grid">
          {visibleSites.map((site) => (
            <ToolCard
              key={site.id}
              site={site}
              canManage={canManage}
              onOpen={setActiveSite}
              onEdit={(item) => setEditingSite(item)}
              onDelete={removeSite}
              onTogglePin={togglePin}
              onDragStart={startDrag}
              onDragOver={dragOver}
              onDrop={dropOn}
            />
          ))}
        </section>
      ) : (
        <section className="tth-empty">
          <div className="tth-empty-art"><span>↗</span><span>□</span><span>✦</span></div>
          <h2>{sites.length ? 'Không tìm thấy website phù hợp' : 'Teaching Tool Hub đang trống'}</h2>
          <p>{canManage ? 'Thêm website đầu tiên để bắt đầu xây dựng launcher cho tổ chuyên môn.' : 'TTCM chưa thêm website nào vào Hub.'}</p>
          {canManage && !sites.length ? <button type="button" className="tth-add" onClick={() => setEditingSite(null)}>＋ Thêm website đầu tiên</button> : null}
        </section>
      )}

      {editingSite !== undefined ? <SiteModal site={editingSite} onClose={() => setEditingSite(undefined)} onSave={saveSite} /> : null}
      {toast ? <div className="tth-toast">✓ {toast}</div> : null}
    </div>
  );
}
