import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { canManageAiWebsites } from '../utils/aiWebsiteSettings.js';
import {
  approveExternalWebApp,
  embedTransformStyle,
  EXTERNAL_APP_GROUPS,
  loadExternalWebApps,
  normalizeEmbedView,
  normalizeExternalAppDraft,
  rejectExternalWebApp,
  removeApprovedExternalWebApp,
  safeExternalWebAppUrl,
  submitExternalWebApp,
  subscribeExternalWebApps,
  updateApprovedExternalWebAppView,
} from '../utils/externalWebApps.js';
import './ExternalWebApps.css';
import './ExternalWebAppCrop.css';

const EMPTY = { name: '', url: '', icon: 'WEB', description: '', groupId: 'create' };
const DEFAULT_VIEW = normalizeEmbedView();
const DIALOG_LAYOUT_KEY = 'bes-external-app-dialog-layout-v3';
const DIALOG_MARGIN = 10;
const RESIZE_CORNERS = ['nw', 'ne', 'sw', 'se'];

const statusLabel = (status) => ({
  pending: 'Chờ TTCM duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  cancelled: 'Đã hủy',
}[status] || status);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function defaultDialogLayout() {
  if (typeof window === 'undefined') return { x: 20, y: 20, width: 1380, height: 860 };
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const width = Math.min(1680, Math.max(900, viewportWidth - 40));
  const height = Math.min(1040, Math.max(620, viewportHeight - 32));
  return {
    x: Math.max(DIALOG_MARGIN, Math.round((viewportWidth - width) / 2)),
    y: Math.max(DIALOG_MARGIN, Math.round((viewportHeight - height) / 2)),
    width: Math.min(width, viewportWidth - DIALOG_MARGIN * 2),
    height: Math.min(height, viewportHeight - DIALOG_MARGIN * 2),
  };
}

function fitDialogLayout(value = defaultDialogLayout()) {
  if (typeof window === 'undefined') return value;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;
  const maxWidth = Math.max(320, viewportWidth - DIALOG_MARGIN * 2);
  const maxHeight = Math.max(420, viewportHeight - DIALOG_MARGIN * 2);
  const minWidth = Math.min(880, maxWidth);
  const minHeight = Math.min(580, maxHeight);
  const width = clamp(Number(value.width) || maxWidth, minWidth, maxWidth);
  const height = clamp(Number(value.height) || maxHeight, minHeight, maxHeight);
  return {
    x: clamp(Number(value.x) || DIALOG_MARGIN, DIALOG_MARGIN, Math.max(DIALOG_MARGIN, viewportWidth - width - DIALOG_MARGIN)),
    y: clamp(Number(value.y) || DIALOG_MARGIN, DIALOG_MARGIN, Math.max(DIALOG_MARGIN, viewportHeight - height - DIALOG_MARGIN)),
    width,
    height,
  };
}

function readDialogLayout() {
  const fallback = defaultDialogLayout();
  if (typeof window === 'undefined') return fallback;
  try {
    const stored = JSON.parse(window.localStorage.getItem(DIALOG_LAYOUT_KEY) || 'null');
    return fitDialogLayout(stored || fallback);
  } catch {
    return fitDialogLayout(fallback);
  }
}

function saveDialogLayout(layout) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(DIALOG_LAYOUT_KEY, JSON.stringify(layout)); } catch { /* optional preference */ }
}

export default function ExternalWebAppManager({ open, onClose, currentUser, language = 'vi', onChanged }) {
  const vi = language !== 'en';
  const manager = canManageAiWebsites(currentUser);
  const [data, setData] = useState({ approved: [], mine: [], requests: [] });
  const [tab, setTab] = useState('submit');
  const [draft, setDraft] = useState(EMPTY);
  const [preview, setPreview] = useState(null);
  const [view, setView] = useState(DEFAULT_VIEW);
  const [check, setCheck] = useState(null);
  const [busy, setBusy] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');
  const [dialogLayout, setDialogLayout] = useState(readDialogLayout);
  const [maximized, setMaximized] = useState(false);
  const restoreLayoutRef = useRef(null);
  const resizingRef = useRef(null);

  const pending = useMemo(() => data.requests.filter((item) => item.status === 'pending'), [data.requests]);
  const clean = normalizeExternalAppDraft(draft);
  const desktopResizable = manager && typeof window !== 'undefined' && window.innerWidth > 900;

  const applyData = (next) => {
    if (!next) return;
    setData(next);
    onChanged?.(next);
  };

  const refresh = async ({ silent = false } = {}) => {
    if (!silent) setRefreshing(true);
    try {
      const next = await loadExternalWebApps(currentUser);
      applyData(next);
      return next;
    } catch (error) {
      if (!silent) setNotice(error?.message || String(error));
      throw error;
    } finally {
      if (!silent) setRefreshing(false);
    }
  };

  useEffect(() => {
    if (!open || !currentUser) return undefined;
    let active = true;
    let unsubscribe = () => {};
    refresh().catch(() => {});
    try {
      unsubscribe = subscribeExternalWebApps(currentUser, (next) => active && applyData(next));
    } catch (error) {
      console.warn('[External apps] realtime unavailable; polling remains active', error);
    }
    const poll = manager ? window.setInterval(() => refresh({ silent: true }).catch(() => {}), 8000) : null;
    return () => {
      active = false;
      unsubscribe?.();
      if (poll) window.clearInterval(poll);
    };
  }, [open, currentUser?.id, currentUser?.email, currentUser?.role, manager]);

  useEffect(() => {
    if (!open) return undefined;
    document.documentElement.classList.add('bes-ext-open');
    setDialogLayout((current) => fitDialogLayout(current));
    const onKey = (event) => event.key === 'Escape' && onClose?.();
    const onViewportResize = () => setDialogLayout((current) => fitDialogLayout(current));
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onViewportResize);
    return () => {
      document.documentElement.classList.remove('bes-ext-open');
      document.body.classList.remove('bes-ext-resizing');
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onViewportResize);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!preview?.url) {
      setCheck(null);
      return undefined;
    }
    const controller = new AbortController();
    setCheck({ checking: true });
    fetch(`/api/check-embed?url=${encodeURIComponent(preview.url)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then(setCheck)
      .catch((error) => {
        if (error?.name !== 'AbortError') setCheck({ embeddable: null, reason: 'Không kiểm tra được chính sách iframe.' });
      });
    return () => controller.abort();
  }, [preview?.url]);

  useEffect(() => {
    setView(normalizeEmbedView(preview?.embedView || DEFAULT_VIEW));
  }, [preview?.id, preview?.request?.id, preview?.approvedApp?.id, preview?.url]);

  if (!open || typeof document === 'undefined') return null;

  const beginResize = (corner, event) => {
    if (!desktopResizable) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const start = {
      corner,
      pointerId: event.pointerId,
      pointerX: event.clientX,
      pointerY: event.clientY,
      layout: { ...dialogLayout },
    };
    resizingRef.current = start;
    setMaximized(false);
    document.body.classList.add('bes-ext-resizing');
    document.body.style.cursor = corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize';

    const move = (moveEvent) => {
      const active = resizingRef.current;
      if (!active) return;
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const minWidth = Math.min(880, viewportWidth - DIALOG_MARGIN * 2);
      const minHeight = Math.min(580, viewportHeight - DIALOG_MARGIN * 2);
      const deltaX = moveEvent.clientX - active.pointerX;
      const deltaY = moveEvent.clientY - active.pointerY;
      const right = active.layout.x + active.layout.width;
      const bottom = active.layout.y + active.layout.height;
      let next = { ...active.layout };

      if (corner.includes('e')) {
        next.width = clamp(active.layout.width + deltaX, minWidth, viewportWidth - active.layout.x - DIALOG_MARGIN);
      }
      if (corner.includes('s')) {
        next.height = clamp(active.layout.height + deltaY, minHeight, viewportHeight - active.layout.y - DIALOG_MARGIN);
      }
      if (corner.includes('w')) {
        next.width = clamp(active.layout.width - deltaX, minWidth, right - DIALOG_MARGIN);
        next.x = right - next.width;
      }
      if (corner.includes('n')) {
        next.height = clamp(active.layout.height - deltaY, minHeight, bottom - DIALOG_MARGIN);
        next.y = bottom - next.height;
      }
      setDialogLayout(fitDialogLayout(next));
    };

    const stop = () => {
      const finalLayout = fitDialogLayout(resizingRef.current?.latest || dialogLayout);
      resizingRef.current = null;
      document.body.classList.remove('bes-ext-resizing');
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
      setDialogLayout((current) => {
        const fitted = fitDialogLayout(current);
        saveDialogLayout(fitted);
        return fitted;
      });
      saveDialogLayout(finalLayout);
    };

    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', stop, { once: true });
    window.addEventListener('pointercancel', stop, { once: true });
  };

  const toggleMaximize = () => {
    if (!desktopResizable) return;
    if (maximized) {
      const restored = fitDialogLayout(restoreLayoutRef.current || readDialogLayout());
      setDialogLayout(restored);
      saveDialogLayout(restored);
      setMaximized(false);
      return;
    }
    restoreLayoutRef.current = { ...dialogLayout };
    setDialogLayout(fitDialogLayout({
      x: DIALOG_MARGIN,
      y: DIALOG_MARGIN,
      width: window.innerWidth - DIALOG_MARGIN * 2,
      height: window.innerHeight - DIALOG_MARGIN * 2,
    }));
    setMaximized(true);
  };

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setBusy('submit');
    setNotice('');
    try {
      const result = await submitExternalWebApp(currentUser, draft, language);
      setDraft(EMPTY);
      await refresh();
      setTab('mine');
      setNotice(result?.alreadyPending
        ? (vi ? 'Website này đã có yêu cầu chờ duyệt.' : 'This website is already pending approval.')
        : (vi ? 'Đã gửi TTCM duyệt.' : 'Submitted for approval.'));
    } catch (error) {
      setNotice(error?.message || String(error));
    } finally {
      setBusy('');
    }
  };

  const openPendingPreview = (request) => {
    setPreview({
      ...request.app,
      id: `request-${request.id}`,
      request,
      embedView: DEFAULT_VIEW,
    });
  };

  const openApprovedPreview = (app) => {
    setPreview({
      id: `approved-${app.id}`,
      name: app.title,
      url: app.externalUrl,
      icon: app.icon,
      approvedApp: app,
      embedView: app.embedView,
    });
  };

  const approvePreview = async () => {
    const request = preview?.request;
    if (!request || busy) return;
    setBusy(request.id);
    setNotice('');
    try {
      await approveExternalWebApp(currentUser, request, view);
      await refresh();
      setNotice(`Đã duyệt “${request.app.name}” với vùng hiển thị đã chọn.`);
      setPreview(null);
    } catch (error) {
      setNotice(error?.message || String(error));
    } finally {
      setBusy('');
    }
  };

  const reject = async (request) => {
    if (busy) return;
    setBusy(request.id);
    setNotice('');
    try {
      await rejectExternalWebApp(request.id);
      await refresh();
      if (preview?.request?.id === request.id) setPreview(null);
      setNotice(`Đã từ chối “${request.app.name}”.`);
    } catch (error) {
      setNotice(error?.message || String(error));
    } finally {
      setBusy('');
    }
  };

  const saveApprovedCrop = async () => {
    const app = preview?.approvedApp;
    if (!app || busy) return;
    setBusy(app.id);
    setNotice('');
    try {
      await updateApprovedExternalWebAppView(currentUser, app.id, view);
      const next = await refresh();
      const updated = next.approved.find((item) => item.id === app.id);
      if (updated) openApprovedPreview(updated);
      setNotice(`Đã lưu vùng hiển thị cho “${app.title}”.`);
    } catch (error) {
      setNotice(error?.message || String(error));
    } finally {
      setBusy('');
    }
  };

  const remove = async (app) => {
    if (!window.confirm(`Gỡ ứng dụng “${app.title}”?`)) return;
    setBusy(app.id);
    try {
      await removeApprovedExternalWebApp(currentUser, app.id);
      await refresh();
      if (preview?.approvedApp?.id === app.id) setPreview(null);
    } catch (error) {
      setNotice(error?.message || String(error));
    } finally {
      setBusy('');
    }
  };

  const tabs = [
    ['submit', 'Thêm ứng dụng'],
    ['mine', 'Yêu cầu của tôi'],
    ...(manager ? [['pending', 'Chờ duyệt'], ['approved', 'Đã duyệt']] : []),
  ];
  const list = tab === 'mine' ? data.mine : tab === 'pending' ? pending : [];
  const previewStyle = embedTransformStyle(view);
  const dialogStyle = desktopResizable ? {
    left: dialogLayout.x,
    top: dialogLayout.y,
    width: dialogLayout.width,
    height: dialogLayout.height,
  } : undefined;
  const dialogClass = [
    'bes-ext-dialog',
    desktopResizable ? 'bes-ext-resizable' : '',
    preview?.url && manager ? 'is-reviewing' : '',
    maximized ? 'is-maximized' : '',
  ].filter(Boolean).join(' ');

  return createPortal(
    <div className="bes-ext-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <section className={dialogClass} style={dialogStyle} role="dialog" aria-modal="true">
        <header className="bes-ext-head">
          <div><span>＋</span><div><strong>Ứng dụng website</strong><small>Đề xuất, TTCM duyệt và chạy trực tiếp trong Brian</small></div></div>
          <div className="bes-ext-head-actions">
            {desktopResizable ? <span className="bes-ext-size-note">Kéo 4 góc để đổi kích thước</span> : null}
            {desktopResizable ? <button type="button" className="bes-ext-expand" onClick={toggleMaximize}>{maximized ? '↙ Thu gọn' : '⛶ Mở rộng'}</button> : null}
            <button type="button" className="bes-ext-refresh" disabled={refreshing} onClick={() => refresh().catch(() => {})}>↻ {refreshing ? 'Đang tải' : 'Làm mới'}</button>
            <button type="button" className="bes-ext-close" onClick={onClose}>×</button>
          </div>
        </header>

        <nav className="bes-ext-tabs">
          {tabs.map(([id, text]) => (
            <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
              {text}{id === 'pending' && pending.length ? <b>{pending.length}</b> : null}
            </button>
          ))}
        </nav>

        <div className="bes-ext-body">
          <main className="bes-ext-main">
            {tab === 'submit' ? (
              <form className="bes-ext-form" onSubmit={submit}>
                <h2>Thêm website làm ứng dụng</h2>
                <p>Chỉ chấp nhận HTTPS. Ứng dụng chỉ xuất hiện sau khi TTCM xem trước, chọn vùng hiển thị và duyệt.</p>
                <label><span>Tên ứng dụng</span><input required value={draft.name} onChange={(event) => setDraft({ ...draft, name: event.target.value })} /></label>
                <label><span>Biểu tượng</span><input maxLength="3" value={draft.icon} onChange={(event) => setDraft({ ...draft, icon: event.target.value.toUpperCase().slice(0, 3) })} /></label>
                <label className="wide"><span>Website URL</span><input required type="url" placeholder="https://…" value={draft.url} onChange={(event) => setDraft({ ...draft, url: event.target.value })} /></label>
                <label><span>Nhóm</span><select value={draft.groupId} onChange={(event) => setDraft({ ...draft, groupId: event.target.value })}>{EXTERNAL_APP_GROUPS.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}</select></label>
                <label className="wide"><span>Mô tả</span><textarea rows="3" value={draft.description} onChange={(event) => setDraft({ ...draft, description: event.target.value })} /></label>
                <footer><button className="bes-ext-primary" disabled={!clean.name || !clean.url || busy === 'submit'}>{busy === 'submit' ? 'Đang gửi…' : 'Gửi TTCM duyệt'}</button></footer>
              </form>
            ) : null}

            {['mine', 'pending'].includes(tab) ? (
              <div className="bes-ext-list">
                {list.map((request) => (
                  <article className="bes-ext-item" key={request.id}>
                    <div>
                      <span className={`bes-ext-chip ${request.status}`}>{statusLabel(request.status)}</span>
                      <strong>{request.app.name || request.item_title}</strong>
                      <small>{request.requester_name || request.requester_email || ''} {request.app.url}</small>
                      <p>{request.app.description}</p>
                    </div>
                    <div className="bes-ext-actions">
                      <button type="button" onClick={() => tab === 'pending' ? openPendingPreview(request) : setPreview({ ...request.app, id: request.id })}>{tab === 'pending' ? 'Xem & duyệt' : 'Xem trước'}</button>
                      {tab === 'pending' && manager ? <button type="button" className="reject" disabled={busy === request.id} onClick={() => reject(request)}>Từ chối</button> : null}
                    </div>
                  </article>
                ))}
                {!list.length ? <div className="bes-ext-empty">{tab === 'pending' ? 'Chưa có yêu cầu chờ duyệt. Danh sách tự làm mới mỗi 8 giây.' : 'Chưa có yêu cầu.'}</div> : null}
              </div>
            ) : null}

            {tab === 'approved' && manager ? (
              <div className="bes-ext-list">
                {data.approved.map((app) => (
                  <article className="bes-ext-item" key={app.id}>
                    <div><span className="bes-ext-chip approved">Đang hiển thị</span><strong>{app.title}</strong><small>{app.externalUrl}</small><p>{app.descVi}</p></div>
                    <div className="bes-ext-actions"><button type="button" onClick={() => openApprovedPreview(app)}>Sửa vùng hiển thị</button><button type="button" className="reject" disabled={busy === app.id} onClick={() => remove(app)}>Gỡ</button></div>
                  </article>
                ))}
                {!data.approved.length ? <div className="bes-ext-empty">Chưa có ứng dụng website đã duyệt.</div> : null}
              </div>
            ) : null}
          </main>

          <aside className="bes-ext-preview">
            <header><div><strong>{preview?.name || 'Bản xem trước'}</strong><small>{preview?.url || 'Chọn website để kiểm tra'}</small></div></header>
            {preview?.url ? (
              <>
                <div className={`bes-ext-check ${check?.embeddable === false ? 'blocked' : check?.embeddable === true ? 'ok' : ''}`}>
                  {check?.checking ? 'Đang kiểm tra khả năng nhúng…' : check?.embeddable === false ? `Có thể chặn iframe: ${check.reason || ''}` : 'Không phát hiện chính sách chặn iframe.'}
                </div>
                {manager && (preview.request || preview.approvedApp) ? (
                  <section className="bes-ext-crop-controls">
                    <div className="bes-ext-crop-title"><div><strong>Crop vùng hiển thị</strong><small>Kéo thanh trượt đến khi chỉ còn phần TTCM muốn giáo viên nhìn thấy.</small></div><button type="button" onClick={() => setView(DEFAULT_VIEW)}>Đặt lại</button></div>
                    <label><span>Phóng to <b>{Math.round(view.zoom * 100)}%</b></span><input type="range" min="100" max="240" step="5" value={Math.round(view.zoom * 100)} onChange={(event) => setView({ ...view, zoom: Number(event.target.value) / 100 })} /></label>
                    <label><span>Dịch ngang <b>{Math.round(view.offsetX)}%</b></span><input type="range" min="0" max="70" step="1" value={view.offsetX} onChange={(event) => setView({ ...view, offsetX: Number(event.target.value) })} /></label>
                    <label><span>Dịch dọc <b>{Math.round(view.offsetY)}%</b></span><input type="range" min="0" max="85" step="1" value={view.offsetY} onChange={(event) => setView({ ...view, offsetY: Number(event.target.value) })} /></label>
                    <label><span>Chiều cao khung <b>{Math.round(view.previewHeight)} px</b></span><input type="range" min="420" max="900" step="20" value={view.previewHeight} onChange={(event) => setView({ ...view, previewHeight: Number(event.target.value) })} /></label>
                    <div className="bes-ext-crop-actions">
                      {preview.request ? <button type="button" className="approve" disabled={busy === preview.request.id || check?.embeddable === false} onClick={approvePreview}>{busy === preview.request.id ? 'Đang duyệt…' : 'Duyệt với vùng này'}</button> : null}
                      {preview.approvedApp ? <button type="button" className="approve" disabled={busy === preview.approvedApp.id} onClick={saveApprovedCrop}>{busy === preview.approvedApp.id ? 'Đang lưu…' : 'Lưu vùng hiển thị'}</button> : null}
                    </div>
                  </section>
                ) : null}
                <div className="bes-ext-crop-stage" style={previewStyle}>
                  <iframe src={safeExternalWebAppUrl(preview.url)} title={preview.name || 'Preview'} sandbox="allow-forms allow-modals allow-presentation allow-same-origin allow-scripts allow-downloads" allow="clipboard-read; clipboard-write; microphone; camera; fullscreen" />
                </div>
              </>
            ) : <div className="bes-ext-empty">TTCM chọn một yêu cầu để xem website, crop nội dung và duyệt.</div>}
          </aside>
        </div>
        {notice ? <div className="bes-ext-notice">{notice}</div> : null}
        {desktopResizable ? RESIZE_CORNERS.map((corner) => (
          <div
            key={corner}
            className={`bes-ext-resize-handle is-${corner}`}
            role="separator"
            aria-label={`Kéo góc ${corner} để đổi kích thước cửa sổ duyệt`}
            onPointerDown={(event) => beginResize(corner, event)}
          />
        )) : null}
      </section>
    </div>,
    document.body,
  );
}
