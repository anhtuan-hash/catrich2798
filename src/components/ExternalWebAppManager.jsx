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
const CROP_CORNERS = ['nw', 'ne', 'sw', 'se'];
const MIN_CROP_WIDTH = 18;
const MIN_CROP_HEIGHT = 18;

const statusLabel = (status) => ({
  pending: 'Chờ TTCM duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  cancelled: 'Đã hủy',
}[status] || status);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
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
  const [controlsOpen, setControlsOpen] = useState(false);
  const cropStageRef = useRef(null);
  const cropActionRef = useRef(null);

  const pending = useMemo(() => data.requests.filter((item) => item.status === 'pending'), [data.requests]);
  const clean = normalizeExternalAppDraft(draft);

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
    const onKey = (event) => event.key === 'Escape' && onClose?.();
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.classList.remove('bes-ext-open');
      document.body.classList.remove('bes-ext-cropping');
      window.removeEventListener('keydown', onKey);
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
    setControlsOpen(false);
  }, [preview?.id, preview?.request?.id, preview?.approvedApp?.id, preview?.url]);

  if (!open || typeof document === 'undefined') return null;

  const beginCropAction = (mode, event) => {
    if (!manager || !cropStageRef.current) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = cropStageRef.current.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const startView = normalizeEmbedView(view);
    cropActionRef.current = {
      mode,
      x: event.clientX,
      y: event.clientY,
      bounds,
      view: startView,
    };
    document.body.classList.add('bes-ext-cropping');
    document.body.style.cursor = mode === 'move'
      ? 'move'
      : mode === 'nw' || mode === 'se' ? 'nwse-resize' : 'nesw-resize';

    const move = (moveEvent) => {
      const active = cropActionRef.current;
      if (!active) return;
      moveEvent.preventDefault();
      const deltaX = ((moveEvent.clientX - active.x) / active.bounds.width) * 100;
      const deltaY = ((moveEvent.clientY - active.y) / active.bounds.height) * 100;
      const source = active.view;
      const right = source.cropX + source.cropWidth;
      const bottom = source.cropY + source.cropHeight;
      let cropX = source.cropX;
      let cropY = source.cropY;
      let cropWidth = source.cropWidth;
      let cropHeight = source.cropHeight;

      if (active.mode === 'move') {
        cropX = clamp(source.cropX + deltaX, 0, 100 - source.cropWidth);
        cropY = clamp(source.cropY + deltaY, 0, 100 - source.cropHeight);
      } else {
        if (active.mode.includes('w')) {
          cropX = clamp(source.cropX + deltaX, 0, right - MIN_CROP_WIDTH);
          cropWidth = right - cropX;
        }
        if (active.mode.includes('e')) {
          cropWidth = clamp(source.cropWidth + deltaX, MIN_CROP_WIDTH, 100 - source.cropX);
        }
        if (active.mode.includes('n')) {
          cropY = clamp(source.cropY + deltaY, 0, bottom - MIN_CROP_HEIGHT);
          cropHeight = bottom - cropY;
        }
        if (active.mode.includes('s')) {
          cropHeight = clamp(source.cropHeight + deltaY, MIN_CROP_HEIGHT, 100 - source.cropY);
        }
      }

      setView(normalizeEmbedView({
        ...source,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
      }));
    };

    const stop = () => {
      cropActionRef.current = null;
      document.body.classList.remove('bes-ext-cropping');
      document.body.style.cursor = '';
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', stop);
      window.removeEventListener('pointercancel', stop);
    };

    window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', stop, { once: true });
    window.addEventListener('pointercancel', stop, { once: true });
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
  const cropFrameStyle = {
    left: `${view.cropX}%`,
    top: `${view.cropY}%`,
    width: `${view.cropWidth}%`,
    height: `${view.cropHeight}%`,
  };
  const reviewing = Boolean(preview?.url && manager && (preview.request || preview.approvedApp));

  return createPortal(
    <div className="bes-ext-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <section className={`bes-ext-dialog ${reviewing ? 'is-reviewing' : ''}`} role="dialog" aria-modal="true">
        <header className="bes-ext-head">
          <div><span>＋</span><div><strong>Ứng dụng website</strong><small>Đề xuất, TTCM duyệt và chạy trực tiếp trong Brian</small></div></div>
          <div className="bes-ext-head-actions">
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
            <header className="bes-ext-preview-head">
              <div><strong>{preview?.name || 'Bản xem trước'}</strong><small>{preview?.url || 'Chọn website để kiểm tra'}</small></div>
              {preview?.url ? <span className={`bes-ext-embed-state ${check?.embeddable === false ? 'blocked' : 'ok'}`}>{check?.checking ? 'Đang kiểm tra…' : check?.embeddable === false ? 'Có thể chặn iframe' : 'Có thể nhúng'}</span> : null}
            </header>

            {preview?.url ? (
              <>
                <div className="bes-ext-crop-toolbar">
                  <div className="bes-ext-crop-toolbar-copy">
                    <strong>Chọn vùng website sẽ hiển thị</strong>
                    <small>Kéo thanh xanh để di chuyển; kéo bốn góc của khung để cắt.</small>
                  </div>
                  <div className="bes-ext-crop-toolbar-actions">
                    <button type="button" aria-label="Thu nhỏ website" onClick={() => setView((current) => normalizeEmbedView({ ...current, zoom: current.zoom - 0.1 }))}>−</button>
                    <span>{Math.round(view.zoom * 100)}%</span>
                    <button type="button" aria-label="Phóng to website" onClick={() => setView((current) => normalizeEmbedView({ ...current, zoom: current.zoom + 0.1 }))}>＋</button>
                    <button type="button" className={controlsOpen ? 'active' : ''} onClick={() => setControlsOpen((value) => !value)}>Điều chỉnh</button>
                    <button type="button" onClick={() => setView(DEFAULT_VIEW)}>Đặt lại</button>
                    {preview.request ? <button type="button" className="approve" disabled={busy === preview.request.id || check?.embeddable === false} onClick={approvePreview}>{busy === preview.request.id ? 'Đang duyệt…' : 'Duyệt vùng này'}</button> : null}
                    {preview.approvedApp ? <button type="button" className="approve" disabled={busy === preview.approvedApp.id} onClick={saveApprovedCrop}>{busy === preview.approvedApp.id ? 'Đang lưu…' : 'Lưu vùng này'}</button> : null}
                  </div>
                </div>

                {controlsOpen ? (
                  <section className="bes-ext-crop-popover">
                    <header><div><strong>Điều chỉnh website</strong><small>Các thanh này chỉ xuất hiện khi cần tinh chỉnh.</small></div><button type="button" onClick={() => setControlsOpen(false)}>×</button></header>
                    <label><span>Phóng to <b>{Math.round(view.zoom * 100)}%</b></span><input type="range" min="100" max="240" step="5" value={Math.round(view.zoom * 100)} onChange={(event) => setView((current) => normalizeEmbedView({ ...current, zoom: Number(event.target.value) / 100 }))} /></label>
                    <label><span>Dịch nội dung ngang <b>{Math.round(view.offsetX)}%</b></span><input type="range" min="0" max="70" step="1" value={view.offsetX} onChange={(event) => setView((current) => normalizeEmbedView({ ...current, offsetX: Number(event.target.value) }))} /></label>
                    <label><span>Dịch nội dung dọc <b>{Math.round(view.offsetY)}%</b></span><input type="range" min="0" max="85" step="1" value={view.offsetY} onChange={(event) => setView((current) => normalizeEmbedView({ ...current, offsetY: Number(event.target.value) }))} /></label>
                    <label><span>Chiều cao trang nguồn <b>{Math.round(view.canvasHeight)} px</b></span><input type="range" min="1000" max="2600" step="100" value={view.canvasHeight} onChange={(event) => setView((current) => normalizeEmbedView({ ...current, canvasHeight: Number(event.target.value) }))} /></label>
                  </section>
                ) : null}

                <div ref={cropStageRef} className="bes-ext-crop-stage" style={previewStyle}>
                  <iframe src={safeExternalWebAppUrl(preview.url)} title={preview.name || 'Preview'} sandbox="allow-forms allow-modals allow-presentation allow-same-origin allow-scripts allow-downloads" allow="clipboard-read; clipboard-write; microphone; camera; fullscreen" />
                  {reviewing ? (
                    <div className="bes-ext-crop-frame" style={cropFrameStyle}>
                      <button type="button" className="bes-ext-crop-drag" onPointerDown={(event) => beginCropAction('move', event)}>↕ Kéo vùng crop</button>
                      <span className="bes-ext-crop-dimensions">{Math.round(view.cropWidth)}% × {Math.round(view.cropHeight)}%</span>
                      {CROP_CORNERS.map((corner) => (
                        <button
                          type="button"
                          key={corner}
                          className={`bes-ext-crop-handle is-${corner}`}
                          aria-label={`Kéo góc ${corner} của vùng crop`}
                          onPointerDown={(event) => beginCropAction(corner, event)}
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              </>
            ) : <div className="bes-ext-empty">TTCM chọn một yêu cầu để xem website, kéo khung crop và duyệt.</div>}
          </aside>
        </div>
        {notice ? <div className="bes-ext-notice">{notice}</div> : null}
      </section>
    </div>,
    document.body,
  );
}
