import React, { useEffect, useMemo, useRef, useState } from 'react';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import {
  createTeachingToolSite,
  deleteTeachingToolSite,
  domainFromUrl,
  listTeachingToolSites,
  teachingToolHubStorageInfo,
  updateTeachingToolSite,
} from '../utils/teachingToolHub.js';
import './TeachingToolHub.css';

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

function ToolCard({ site, canManage, onOpen, onEdit, onDelete }) {
  const domain = domainFromUrl(site.url);
  return (
    <article className={`tth-card${site.isActive ? '' : ' is-paused'}`}>
      <button type="button" className="tth-card-main" onClick={() => onOpen(site)} disabled={!site.isActive && !canManage}>
        <span className="tth-site-icon" aria-hidden="true">{site.icon || '↗'}</span>
        <span className="tth-card-copy">
          <small>{site.category || 'Công cụ dạy học'}</small>
          <strong>{site.title}</strong>
          <p>{site.description || 'Mở website trực tiếp trong không gian Brian.'}</p>
          <span className="tth-domain">{domain}</span>
        </span>
        <span className="tth-open-mark" aria-hidden="true">→</span>
      </button>
      {canManage ? (
        <div className="tth-card-admin">
          <span className={`tth-status${site.isActive ? ' is-on' : ''}`}>{site.isActive ? 'Đang hiển thị' : 'Đang ẩn'}</span>
          <div>
            <button type="button" onClick={() => onEdit(site)}>Sửa</button>
            <button type="button" className="is-danger" onClick={() => onDelete(site)}>Xóa</button>
          </div>
        </div>
      ) : null}
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
          <label>Biểu tượng
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
  const storageInfo = teachingToolHubStorageInfo();

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

  if (activeSite) return <div className="tth-page"><Viewer site={activeSite} onBack={() => setActiveSite(null)} />{toast ? <div className="tth-toast">✓ {toast}</div> : null}</div>;

  return (
    <div className="tth-page">
      <section className="tth-hero">
        <div className="tth-hero-copy">
          <span className="tth-kicker">BRIAN · TEACHING TOOL HUB</span>
          <h1>Website dạy học, <em>mở ngay trong Brian.</em></h1>
          <p>TTCM tuyển chọn các website hữu ích cho tổ chuyên môn. Giáo viên chỉ cần chọn công cụ và sử dụng ngay mà không phải rời khỏi hệ thống.</p>
          <div className="tth-hero-meta"><span>◉ {sites.filter((site) => site.isActive).length} website đang hiển thị</span><span>⌁ Nhúng trực tiếp bằng iframe</span></div>
        </div>
        <div className="tth-hero-actions">
          {canManage ? <button type="button" className="tth-add" onClick={() => setEditingSite(null)}>＋ Thêm website</button> : null}
          {canManage ? <small>TTCM · quyền quản lý</small> : <small>Danh mục do TTCM quản lý</small>}
        </div>
      </section>

      <section className="tth-toolbar">
        <label className="tth-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Tìm website, công cụ, danh mục..." /></label>
        <div className="tth-categories">{categories.map((item) => <button type="button" key={item} className={category === item ? 'is-active' : ''} onClick={() => setCategory(item)}>{item}</button>)}</div>
      </section>

      {visibleSites.length ? (
        <section className="tth-grid">{visibleSites.map((site) => <ToolCard key={site.id} site={site} canManage={canManage} onOpen={setActiveSite} onEdit={(item) => setEditingSite(item)} onDelete={removeSite} />)}</section>
      ) : (
        <section className="tth-empty">
          <div className="tth-empty-art"><span>↗</span><span>□</span><span>✦</span></div>
          <h2>{sites.length ? 'Không tìm thấy website phù hợp' : 'Teaching Tool Hub đang trống'}</h2>
          <p>{canManage ? 'TTCM có thể thêm website đầu tiên để bắt đầu xây dựng kho công cụ cho tổ chuyên môn.' : 'TTCM chưa thêm website nào vào Hub.'}</p>
          {canManage && !sites.length ? <button type="button" className="tth-add" onClick={() => setEditingSite(null)}>＋ Thêm website đầu tiên</button> : null}
        </section>
      )}

      {canManage ? <section className="tth-admin-note"><span>ⓘ</span><div><b>Phiên bản hiện tại lưu danh mục trên trình duyệt của TTCM.</b><p>{storageInfo.label}. Kiến trúc đã tách riêng lớp lưu trữ để có thể chuyển sang Supabase đồng bộ toàn tổ mà không phải thiết kế lại giao diện.</p></div></section> : null}

      {editingSite !== undefined ? <SiteModal site={editingSite} onClose={() => setEditingSite(undefined)} onSave={saveSite} /> : null}
      {toast ? <div className="tth-toast">✓ {toast}</div> : null}
    </div>
  );
}
