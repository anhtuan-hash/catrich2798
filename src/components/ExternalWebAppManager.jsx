import { useEffect, useMemo, useState } from 'react';
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
const statusLabel = (status) => ({
  pending: 'Chờ TTCM duyệt',
  approved: 'Đã duyệt',
  rejected: 'Từ chối',
  cancelled: 'Đã hủy',
}[status] || status);

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
  }, [preview?.id, preview?.request?.id, preview?.approvedApp?.id, preview?.url]);

  if (!open || typeof document === 'undefined') return null;

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

  return createPortal(
    <div className="bes-ext-layer" onMouseDown={(event) => event.target === event.currentTarget && onClose?.()}>
      <section className="bes-ext-dialog" role="dialog" aria-modal="true">
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
      </section>
    </div>,
    document.body,
  );
}
