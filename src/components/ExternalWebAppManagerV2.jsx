import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { canManageAiWebsites } from '../utils/aiWebsiteSettings.js';
import {
  approveExternalWebApp,
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
import './ExternalWebAppReviewFullscreen.css';

const EMPTY = { name: '', url: '', icon: 'WEB', description: '', groupId: 'create' };
const FULLSCREEN_VIEW = normalizeEmbedView({
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  previewHeight: 900,
  canvasHeight: 1000,
  cropX: 0,
  cropY: 0,
  cropWidth: 100,
  cropHeight: 100,
});
const DEFAULT_CUSTOM_VIEW = normalizeEmbedView({
  zoom: 1,
  offsetX: 0,
  offsetY: 0,
  previewHeight: 900,
  canvasHeight: 1000,
  cropX: 5,
  cropY: 7,
  cropWidth: 90,
  cropHeight: 86,
});
const CORNERS = ['nw', 'ne', 'sw', 'se'];
const MIN_SIZE = 18;

const statusLabel = (status) => ({
  pending: 'Chờ TTCM duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  cancelled: 'Đã hủy',
}[status] || status);

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function isFullscreenView(value = {}) {
  const clean = normalizeEmbedView(value);
  return clean.zoom === FULLSCREEN_VIEW.zoom
    && clean.offsetX === FULLSCREEN_VIEW.offsetX
    && clean.offsetY === FULLSCREEN_VIEW.offsetY
    && clean.previewHeight === FULLSCREEN_VIEW.previewHeight
    && clean.canvasHeight === FULLSCREEN_VIEW.canvasHeight
    && clean.cropX === FULLSCREEN_VIEW.cropX
    && clean.cropY === FULLSCREEN_VIEW.cropY
    && clean.cropWidth === FULLSCREEN_VIEW.cropWidth
    && clean.cropHeight === FULLSCREEN_VIEW.cropHeight;
}

function initialCustomView(value) {
  if (!value || isFullscreenView(value)) return DEFAULT_CUSTOM_VIEW;
  return normalizeEmbedView({
    ...value,
    zoom: 1,
    offsetX: 0,
    offsetY: 0,
    previewHeight: 900,
    canvasHeight: 1000,
  });
}

export default function ExternalWebAppManagerV2({ open, onClose, currentUser, language = 'vi', onChanged }) {
  const vi = language !== 'en';
  const manager = canManageAiWebsites(currentUser);
  const [data, setData] = useState({ approved: [], mine: [], requests: [] });
  const [tab, setTab] = useState('submit');
  const [draft, setDraft] = useState(EMPTY);
  const [review, setReview] = useState(null);
  const [view, setView] = useState(DEFAULT_CUSTOM_VIEW);
  const [check, setCheck] = useState(null);
  const [busy, setBusy] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [notice, setNotice] = useState('');
  const [frameKey, setFrameKey] = useState(0);
  const reviewStageRef = useRef(null);
  const dragRef = useRef(null);

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
      const next = await loadExternalWebApps(currentUser, { force: !silent });
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
    const onKey = (event) => {
      if (event.key !== 'Escape') return;
      if (review) setReview(null);
      else onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.documentElement.classList.remove('bes-ext-open');
      document.body.classList.remove('bes-ext-review-dragging');
      document.body.style.cursor = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [open, review?.id, onClose]);

  useEffect(() => {
    if (!review?.url) {
      setCheck(null);
      return undefined;
    }
    const controller = new AbortController();
    setCheck({ checking: true });
    fetch(`/api/check-embed?url=${encodeURIComponent(review.url)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then(setCheck)
      .catch((error) => {
        if (error?.name !== 'AbortError') setCheck({ embeddable: null, reason: 'Không kiểm tra được chính sách iframe.' });
      });
    return () => controller.abort();
  }, [review?.url, frameKey]);

  useEffect(() => {
    if (!review) return;
    setView(initialCustomView(review.embedView));
    setFrameKey((value) => value + 1);
  }, [review?.id]);

  if (!open || typeof document === 'undefined') return null;

  const openPendingReview = (request) => {
    setReview({
      ...request.app,
      id: `request-${request.id}`,
      request,
      embedView: DEFAULT_CUSTOM_VIEW,
    });
  };

  const openApprovedReview = (app) => {
    setReview({
      id: `approved-${app.id}`,
      name: app.title,
      url: app.externalUrl,
      icon: app.icon,
      approvedApp: app,
      embedView: app.embedView,
    });
  };

  const beginCornerDrag = (corner, event) => {
    if (!reviewStageRef.current || busy) return;
    event.preventDefault();
    event.stopPropagation();
    const bounds = reviewStageRef.current.getBoundingClientRect();
    if (!bounds.width || !bounds.height) return;

    const source = normalizeEmbedView(view);
    dragRef.current = {
      corner,
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      bounds,
      source,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
    document.body.classList.add('bes-ext-review-dragging');
    document.body.style.cursor = corner === 'nw' || corner === 'se' ? 'nwse-resize' : 'nesw-resize';

    const move = (moveEvent) => {
      const active = dragRef.current;
      if (!active) return;
      moveEvent.preventDefault();
      const dx = ((moveEvent.clientX - active.startX) / active.bounds.width) * 100;
      const dy = ((moveEvent.clientY - active.startY) / active.bounds.height) * 100;
      const start = active.source;
      const right = start.cropX + start.cropWidth;
      const bottom = start.cropY + start.cropHeight;
      let cropX = start.cropX;
      let cropY = start.cropY;
      let cropWidth = start.cropWidth;
      let cropHeight = start.cropHeight;

      if (active.corner.includes('w')) {
        cropX = clamp(start.cropX + dx, 0, right - MIN_SIZE);
        cropWidth = right - cropX;
      }
      if (active.corner.includes('e')) {
        cropWidth = clamp(start.cropWidth + dx, MIN_SIZE, 100 - start.cropX);
      }
      if (active.corner.includes('n')) {
        cropY = clamp(start.cropY + dy, 0, bottom - MIN_SIZE);
        cropHeight = bottom - cropY;
      }
      if (active.corner.includes('s')) {
        cropHeight = clamp(start.cropHeight + dy, MIN_SIZE, 100 - start.cropY);
      }

      setView(normalizeEmbedView({
        zoom: 1,
        offsetX: 0,
        offsetY: 0,
        previewHeight: 900,
        canvasHeight: 1000,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
      }));
    };

    const stop = () => {
      dragRef.current = null;
      document.body.classList.remove('bes-ext-review-dragging');
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

  const commitReview = async (mode) => {
    if (!review || busy) return;
    const approvedView = mode === 'fullscreen' ? FULLSCREEN_VIEW : normalizeEmbedView({
      ...view,
      zoom: 1,
      offsetX: 0,
      offsetY: 0,
      previewHeight: 900,
      canvasHeight: 1000,
    });
    const targetId = review.request?.id || review.approvedApp?.id;
    setBusy(targetId || mode);
    setNotice('');
    try {
      if (review.request) {
        await approveExternalWebApp(currentUser, review.request, approvedView);
      } else if (review.approvedApp) {
        await updateApprovedExternalWebAppView(currentUser, review.approvedApp.id, approvedView);
      }
      await refresh();
      const title = review.name || review.request?.app?.name || review.approvedApp?.title || 'Ứng dụng';
      setNotice(mode === 'fullscreen'
        ? `Đã duyệt “${title}” ở chế độ toàn màn hình.`
        : `Đã duyệt “${title}” đúng phạm vi bốn góc đã chọn.`);
      setReview(null);
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
      if (review?.request?.id === request.id) setReview(null);
      setNotice(`Đã từ chối “${request.app.name}”.`);
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
      if (review?.approvedApp?.id === app.id) setReview(null);
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
  const frameStyle = {
    left: `${view.cropX}%`,
    top: `${view.cropY}%`,
    width: `${view.cropWidth}%`,
    height: `${view.cropHeight}%`,
  };
  const reviewBusy = Boolean(busy && review);
  const embedBlocked = check?.embeddable === false;

  return createPortal(
    <>
      <div className="bes-ext-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
        <section className="bes-ext-dialog bes-ext-manager-simple" role="dialog" aria-modal="true">
          <header className="bes-ext-head">
            <div><span>＋</span><div><strong>Ứng dụng website</strong><small>Admin/TTCM duyệt theo hai chế độ: toàn màn hình hoặc tùy chỉnh bốn góc</small></div></div>
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

          <main className="bes-ext-manager-simple-body">
            {tab === 'submit' ? (
              <form className="bes-ext-form" onSubmit={submit}>
                <h2>Thêm website làm ứng dụng</h2>
                <p>Website sẽ được mở toàn màn hình để Admin/TTCM duyệt toàn bộ hoặc kéo bốn góc chọn phạm vi tùy chỉnh.</p>
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
                      <button type="button" onClick={() => tab === 'pending' ? openPendingReview(request) : setReview({ ...request.app, id: request.id })}>{tab === 'pending' ? 'Mở toàn màn hình để duyệt' : 'Xem trước'}</button>
                      {tab === 'pending' && manager ? <button type="button" className="reject" disabled={busy === request.id} onClick={() => reject(request)}>Từ chối</button> : null}
                    </div>
                  </article>
                ))}
                {!list.length ? <div className="bes-ext-empty">{tab === 'pending' ? 'Chưa có yêu cầu chờ duyệt.' : 'Chưa có yêu cầu.'}</div> : null}
              </div>
            ) : null}

            {tab === 'approved' && manager ? (
              <div className="bes-ext-list">
                {data.approved.map((app) => (
                  <article className="bes-ext-item" key={app.id}>
                    <div><span className="bes-ext-chip approved">{isFullscreenView(app.embedView) ? 'Duyệt toàn màn hình' : 'Duyệt tùy chỉnh'}</span><strong>{app.title}</strong><small>{app.externalUrl}</small><p>{app.descVi}</p></div>
                    <div className="bes-ext-actions"><button type="button" onClick={() => openApprovedReview(app)}>Mở toàn màn hình để sửa</button><button type="button" className="reject" disabled={busy === app.id} onClick={() => remove(app)}>Gỡ</button></div>
                  </article>
                ))}
                {!data.approved.length ? <div className="bes-ext-empty">Chưa có ứng dụng website đã duyệt.</div> : null}
              </div>
            ) : null}
          </main>
          {notice ? <div className="bes-ext-notice">{notice}</div> : null}
        </section>
      </div>

      {review?.url ? (
        <section className="bes-ext-review-screen" aria-label={`Duyệt ${review.name || 'ứng dụng'}`}>
          <div ref={reviewStageRef} className="bes-ext-review-stage">
            <iframe
              key={frameKey}
              src={safeExternalWebAppUrl(review.url)}
              title={review.name || 'Ứng dụng đang duyệt'}
              sandbox="allow-forms allow-modals allow-presentation allow-same-origin allow-scripts allow-downloads"
              allow="clipboard-read; clipboard-write; microphone; camera; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
            />

            <div className="bes-ext-review-frame" style={frameStyle}>
              <span className="bes-ext-review-frame-label">
                Phạm vi tùy chỉnh · {Math.round(view.cropWidth)}% × {Math.round(view.cropHeight)}%
              </span>
              {CORNERS.map((corner) => (
                <button
                  type="button"
                  key={corner}
                  className={`bes-ext-review-corner is-${corner}`}
                  aria-label={`Kéo góc ${corner}`}
                  onPointerDown={(event) => beginCornerDrag(corner, event)}
                >
                  <i />
                </button>
              ))}
            </div>
          </div>

          <div className="bes-ext-review-command">
            <div className="bes-ext-review-command-copy">
              <span>{review.icon || 'WEB'}</span>
              <div>
                <strong>{review.name}</strong>
                <small>{check?.checking ? 'Đang kiểm tra website…' : embedBlocked ? 'Website có thể chặn iframe' : 'Kéo trực tiếp bốn góc xanh để chọn đúng phạm vi cần duyệt.'}</small>
              </div>
            </div>
            <div className="bes-ext-review-command-actions">
              <button type="button" className="secondary" disabled={reviewBusy} onClick={() => setFrameKey((value) => value + 1)}>↻ Tải lại</button>
              <button type="button" className="approve-full" disabled={reviewBusy || embedBlocked} onClick={() => commitReview('fullscreen')}>{reviewBusy ? 'Đang lưu…' : 'Duyệt toàn màn hình'}</button>
              <button type="button" className="approve-custom" disabled={reviewBusy || embedBlocked} onClick={() => commitReview('custom')}>{reviewBusy ? 'Đang lưu…' : 'Duyệt tùy chỉnh'}</button>
              <button type="button" className="close" disabled={reviewBusy} onClick={() => setReview(null)}>×</button>
            </div>
          </div>
        </section>
      ) : null}
    </>,
    document.body,
  );
}
