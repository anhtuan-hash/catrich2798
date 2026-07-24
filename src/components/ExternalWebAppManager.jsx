import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { canManageAiWebsites } from '../utils/aiWebsiteSettings.js';
import {
  approveExternalWebApp,
  EXTERNAL_APP_GROUPS,
  loadExternalWebApps,
  normalizeExternalAppDraft,
  rejectExternalWebApp,
  removeApprovedExternalWebApp,
  safeExternalWebAppUrl,
  submitExternalWebApp,
  subscribeExternalWebApps,
} from '../utils/externalWebApps.js';
import './ExternalWebApps.css';

const EMPTY = { name: '', url: '', icon: 'WEB', description: '', groupId: 'create' };

function statusLabel(status, vi) {
  const labels = vi
    ? { pending: 'Chờ TTCM duyệt', approved: 'Đã duyệt', rejected: 'Từ chối', cancelled: 'Đã hủy' }
    : { pending: 'Pending approval', approved: 'Approved', rejected: 'Rejected', cancelled: 'Cancelled' };
  return labels[status] || status;
}

export default function ExternalWebAppManager({ open, onClose, currentUser, language = 'vi', onChanged }) {
  const vi = language !== 'en';
  const manager = canManageAiWebsites(currentUser);
  const [snapshot, setSnapshot] = useState({ approved: [], mine: [], requests: [] });
  const [draft, setDraft] = useState(EMPTY);
  const [tab, setTab] = useState('submit');
  const [preview, setPreview] = useState(null);
  const [embedStatus, setEmbedStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [workingId, setWorkingId] = useState('');
  const [notice, setNotice] = useState('');

  const pending = useMemo(() => snapshot.requests.filter((request) => request.status === 'pending'), [snapshot.requests]);

  const refresh = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const next = await loadExternalWebApps(currentUser);
      setSnapshot(next);
      onChanged?.(next);
    } catch (error) {
      setNotice(String(error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!open || !currentUser) return undefined;
    refresh();
    const unsubscribe = subscribeExternalWebApps(currentUser, (next) => {
      setSnapshot(next);
      onChanged?.(next);
    });
    return unsubscribe;
  }, [open, currentUser?.id, currentUser?.email, currentUser?.role]);

  useEffect(() => {
    if (!open) return undefined;
    document.documentElement.classList.add('bes-external-app-dialog-open');
    const escape = (event) => { if (event.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', escape);
    return () => {
      document.documentElement.classList.remove('bes-external-app-dialog-open');
      window.removeEventListener('keydown', escape);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!preview?.url) { setEmbedStatus(null); return; }
    const controller = new AbortController();
    setEmbedStatus({ checking: true });
    fetch(`/api/check-embed?url=${encodeURIComponent(preview.url)}`, { signal: controller.signal })
      .then((response) => response.json())
      .then((result) => setEmbedStatus(result))
      .catch((error) => { if (error.name !== 'AbortError') setEmbedStatus({ embeddable: null, reason: error.message }); });
    return () => controller.abort();
  }, [preview?.url]);

  if (!open || typeof document === 'undefined') return null;

  const submit = async (event) => {
    event.preventDefault();
    setWorkingId('submit'); setNotice('');
    try {
      await submitExternalWebApp(currentUser, draft, language);
      setDraft(EMPTY);
      setNotice(vi ? 'Đã gửi ứng dụng. TTCM sẽ nhận yêu cầu để xem trước và duyệt.' : 'Application submitted for approval.');
      await refresh();
      setTab('mine');
    } catch (error) {
      setNotice(String(error?.message || error));
    } finally { setWorkingId(''); }
  };

  const approve = async (request) => {
    setWorkingId(request.id); setNotice('');
    try {
      await approveExternalWebApp(currentUser, request);
      setNotice(vi ? `Đã duyệt ${request.app.name}. Thẻ ứng dụng đã xuất hiện cho giáo viên.` : `${request.app.name} approved.`);
      await refresh();
    } catch (error) { setNotice(String(error?.message || error)); }
    finally { setWorkingId(''); }
  };

  const reject = async (request) => {
    setWorkingId(request.id); setNotice('');
    try { await rejectExternalWebApp(request.id); await refresh(); }
    catch (error) { setNotice(String(error?.message || error)); }
    finally { setWorkingId(''); }
  };

  const remove = async (app) => {
    if (!window.confirm(vi ? `Gỡ ứng dụng “${app.title}” khỏi Brian?` : `Remove “${app.title}”?`)) return;
    setWorkingId(app.id); setNotice('');
    try { await removeApprovedExternalWebApp(currentUser, app.id); await refresh(); }
    catch (error) { setNotice(String(error?.message || error)); }
    finally { setWorkingId(''); }
  };

  const cleanDraft = normalizeExternalAppDraft(draft);
  const tabs = [
    { id: 'submit', label: vi ? 'Thêm ứng dụng' : 'Add app' },
    { id: 'mine', label: vi ? 'Yêu cầu của tôi' : 'My submissions', count: snapshot.mine.length },
    ...(manager ? [{ id: 'pending', label: vi ? 'Chờ duyệt' : 'Pending', count: pending.length }, { id: 'approved', label: vi ? 'Đã duyệt' : 'Approved', count: snapshot.approved.length }] : []),
  ];

  return createPortal(
    <div className="external-app-dialog-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.(); }}>
      <section className="external-app-dialog" role="dialog" aria-modal="true" aria-label={vi ? 'Thêm ứng dụng website' : 'Add website app'}>
        <header className="external-app-dialog__header">
          <div><span>＋</span><div><strong>{vi ? 'Ứng dụng website' : 'Website applications'}</strong><small>{vi ? 'Đề xuất, duyệt và chạy website ngay trong Brian' : 'Submit, approve and run websites inside Brian'}</small></div></div>
          <button type="button" onClick={onClose} aria-label={vi ? 'Đóng' : 'Close'}>×</button>
        </header>

        <nav className="external-app-dialog__tabs">
          {tabs.map((item) => <button type="button" key={item.id} className={tab === item.id ? 'is-active' : ''} onClick={() => setTab(item.id)}>{item.label}{item.count ? <b>{item.count}</b> : null}</button>)}
        </nav>

        <div className="external-app-dialog__body">
          <main>
            {tab === 'submit' ? (
              <form className="external-app-form" onSubmit={submit}>
                <div className="external-app-form__intro"><span>🌐</span><div><h2>{vi ? 'Đề xuất website làm ứng dụng' : 'Suggest a website application'}</h2><p>{vi ? 'Website phải dùng HTTPS. TTCM sẽ xem trước trước khi ứng dụng xuất hiện cho toàn bộ giáo viên.' : 'HTTPS is required. A department leader reviews every app before publication.'}</p></div></div>
                <label><span>{vi ? 'Tên ứng dụng' : 'App name'}</span><input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} maxLength={80} placeholder="Canva Education" required /></label>
                <label className="is-wide"><span>Website URL</span><input type="url" value={draft.url} onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))} placeholder="https://…" required /></label>
                <label><span>{vi ? 'Biểu tượng' : 'Icon'}</span><input value={draft.icon} onChange={(event) => setDraft((current) => ({ ...current, icon: event.target.value.toUpperCase().slice(0, 3) }))} maxLength={3} /></label>
                <label><span>{vi ? 'Nhóm' : 'Group'}</span><select value={draft.groupId} onChange={(event) => setDraft((current) => ({ ...current, groupId: event.target.value }))}>{EXTERNAL_APP_GROUPS.map((group) => <option key={group.id} value={group.id}>{group.label}</option>)}</select></label>
                <label className="is-wide"><span>{vi ? 'Mô tả ngắn' : 'Short description'}</span><textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))} maxLength={220} rows={3} /></label>
                <div className="external-app-form__preview"><span>{cleanDraft.icon || 'WEB'}</span><div><strong>{cleanDraft.name || (vi ? 'Tên ứng dụng' : 'App name')}</strong><small>{cleanDraft.url || 'https://…'}</small></div><button type="button" disabled={!cleanDraft.url} onClick={() => setPreview(cleanDraft)}>{vi ? 'Xem thử' : 'Preview'}</button></div>
                <footer><p>{vi ? 'Ứng dụng chỉ được công bố sau khi TTCM duyệt.' : 'Apps are published only after approval.'}</p><button type="submit" disabled={workingId === 'submit' || !cleanDraft.name || !cleanDraft.url}>{workingId === 'submit' ? (vi ? 'Đang gửi…' : 'Submitting…') : (vi ? 'Gửi TTCM duyệt' : 'Submit for approval')}</button></footer>
              </form>
            ) : null}

            {tab === 'mine' ? <div className="external-app-request-list">{snapshot.mine.map((request) => <article key={request.id}><span className={`external-app-status is-${request.status}`}>{statusLabel(request.status, vi)}</span><div><strong>{request.app.name || request.item_title}</strong><small>{request.app.url || request.created_at}</small><p>{request.app.description}</p></div><button type="button" onClick={() => setPreview(request.app)} disabled={!request.app.url}>{vi ? 'Xem' : 'Preview'}</button></article>)}{!snapshot.mine.length ? <div className="external-app-empty">{vi ? 'Bạn chưa gửi ứng dụng nào.' : 'No submissions yet.'}</div> : null}</div> : null}

            {tab === 'pending' && manager ? <div className="external-app-request-list">{pending.map((request) => <article key={request.id} className="is-pending"><span className="external-app-status is-pending">{vi ? 'Chờ duyệt' : 'Pending'}</span><div><strong>{request.app.name || request.item_title}</strong><small>{request.requester_name || request.requester_email} · {request.app.url}</small><p>{request.app.description}</p></div><div className="external-app-request-actions"><button type="button" onClick={() => setPreview(request.app)}>{vi ? 'Xem trước' : 'Preview'}</button><button type="button" className="is-approve" onClick={() => approve(request)} disabled={workingId === request.id}>{vi ? 'Duyệt' : 'Approve'}</button><button type="button" className="is-reject" onClick={() => reject(request)} disabled={workingId === request.id}>{vi ? 'Từ chối' : 'Reject'}</button></div></article>)}{!pending.length ? <div className="external-app-empty">{vi ? 'Không có yêu cầu đang chờ.' : 'No pending requests.'}</div> : null}</div> : null}

            {tab === 'approved' && manager ? <div className="external-app-request-list">{snapshot.approved.map((app) => <article key={app.id}><span className="external-app-status is-approved">{vi ? 'Đang hiển thị' : 'Published'}</span><div><strong>{app.title}</strong><small>{app.externalUrl}</small><p>{app.descVi}</p></div><div className="external-app-request-actions"><button type="button" onClick={() => setPreview({ name: app.title, url: app.externalUrl, icon: app.icon })}>{vi ? 'Xem' : 'Preview'}</button><button type="button" className="is-reject" onClick={() => remove(app)} disabled={workingId === app.id}>{vi ? 'Gỡ' : 'Remove'}</button></div></article>)}{!snapshot.approved.length ? <div className="external-app-empty">{vi ? 'Chưa có ứng dụng website được duyệt.' : 'No approved website apps.'}</div> : null}</div> : null}
          </main>

          <aside className="external-app-preview">
            <header><div><span>{preview?.icon || 'WEB'}</span><div><strong>{preview?.name || (vi ? 'Bản xem trước' : 'Preview')}</strong><small>{preview?.url || (vi ? 'Chọn một website để kiểm tra' : 'Choose a website')}</small></div></div>{preview ? <button type="button" onClick={() => setPreview(null)}>×</button> : null}</header>
            {preview?.url ? <><div className={`external-app-embed-check ${embedStatus?.embeddable === false ? 'is-blocked' : embedStatus?.embeddable === true ? 'is-ok' : ''}`}>{embedStatus?.checking ? (vi ? 'Đang kiểm tra khả năng nhúng…' : 'Checking embed support…') : embedStatus?.embeddable === false ? (vi ? `Website có thể chặn nhúng: ${embedStatus.reason || ''}` : `Embedding may be blocked: ${embedStatus.reason || ''}`) : embedStatus?.embeddable === true ? (vi ? 'Không phát hiện chính sách chặn iframe.' : 'No iframe blocking policy detected.') : (vi ? 'Đang mở bản xem trước an toàn.' : 'Opening safe preview.')}</div><iframe src={safeExternalWebAppUrl(preview.url)} title={preview.name || 'Website preview'} sandbox="allow-forms allow-modals allow-presentation allow-same-origin allow-scripts allow-downloads" allow="clipboard-read; clipboard-write; microphone; camera; fullscreen" /></> : <div className="external-app-preview__blank"><span>▣</span><strong>{vi ? 'Xem trước ngay trong Brian' : 'Preview inside Brian'}</strong><p>{vi ? 'Chọn một đề xuất để TTCM kiểm tra website trước khi duyệt.' : 'Select a submission to review it before approval.'}</p></div>}
          </aside>
        </div>
        {notice ? <div className="external-app-dialog__notice">{notice}</div> : null}
        {loading ? <div className="external-app-dialog__loading"><span /></div> : null}
      </section>
    </div>, document.body,
  );
}
