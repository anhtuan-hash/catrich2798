import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { canPublishDepartment } from '../utils/permissions.js';
import {
  CUSTOM_APPS_EVENT,
  canEditCustomApp,
  createCustomApp,
  deleteCustomApp,
  ensureCustomAppUrl,
  isCustomAppOwner,
  listCustomApps,
  requestCustomAppApproval,
  subscribeCustomApps,
  updateCustomAppStatus,
} from '../utils/customApps.js';

const EMPTY_DRAFT = {
  label: '',
  url: '',
  description: '',
  icon: '↗',
  accent: '#7C5CE7',
};

const STATUS_META = {
  private: { vi: 'Riêng tư', en: 'Private', tone: 'private' },
  pending: { vi: 'Chờ TTCM duyệt', en: 'Awaiting review', tone: 'pending' },
  approved: { vi: 'Đã chia sẻ', en: 'Shared', tone: 'approved' },
  rejected: { vi: 'Chưa được duyệt', en: 'Not approved', tone: 'rejected' },
};

function text(language, vi, en) {
  return language === 'vi' ? vi : en;
}

function hostOf(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

function CustomAppDialog({ open, language, currentUser, leader, draft, setDraft, busy, message, onClose, onSave }) {
  if (!open) return null;
  const valid = Boolean(draft.label.trim() && ensureCustomAppUrl(draft.url));
  return createPortal(
    <div className="custom-app-dialog-backdrop" role="presentation" onMouseDown={onClose}>
      <section className="custom-app-dialog" role="dialog" aria-modal="true" aria-label={text(language, 'Thêm ứng dụng bằng liên kết', 'Add an app by link')} onMouseDown={(event) => event.stopPropagation()}>
        <header>
          <div>
            <span>＋ {text(language, 'Ứng dụng liên kết', 'Linked app')}</span>
            <h2>{text(language, 'Dán liên kết để thêm ứng dụng', 'Paste a link to add an app')}</h2>
            <p>{leader
              ? text(language, 'TTCM có thể thêm trực tiếp vào danh mục dùng chung của giáo viên.', 'Department leaders can publish directly to the shared teacher directory.')
              : text(language, 'Bạn có thể lưu riêng hoặc gửi TTCM duyệt để chia sẻ cho giáo viên.', 'Save it privately or submit it for department-leader approval and teacher sharing.')}</p>
          </div>
          <button type="button" className="custom-app-dialog-close" onClick={onClose}>×</button>
        </header>

        <div className="custom-app-form-grid">
          <label className="wide">
            <span>{text(language, 'Tên ứng dụng', 'App name')}</span>
            <input autoFocus value={draft.label} onChange={(event) => setDraft((current) => ({ ...current, label: event.target.value.slice(0, 80) }))} placeholder="Canva, Quizizz, Padlet..." />
          </label>
          <label className="wide">
            <span>{text(language, 'Liên kết', 'Link')}</span>
            <input value={draft.url} onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))} placeholder="https://..." inputMode="url" />
          </label>
          <label className="wide">
            <span>{text(language, 'Mô tả ngắn', 'Short description')}</span>
            <textarea value={draft.description} onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value.slice(0, 180) }))} placeholder={text(language, 'Ứng dụng hỗ trợ hoạt động nào?', 'What does this app help teachers do?')} />
          </label>
          <label>
            <span>{text(language, 'Biểu tượng', 'Icon')}</span>
            <input value={draft.icon} onChange={(event) => setDraft((current) => ({ ...current, icon: event.target.value.slice(0, 4) }))} placeholder="↗" />
          </label>
          <label>
            <span>{text(language, 'Màu nhận diện', 'Accent color')}</span>
            <input type="color" value={draft.accent} onChange={(event) => setDraft((current) => ({ ...current, accent: event.target.value }))} />
          </label>
        </div>

        {message ? <div className="custom-app-dialog-message">{message}</div> : null}

        <footer>
          <button type="button" className="secondary" onClick={onClose}>{text(language, 'Huỷ', 'Cancel')}</button>
          {!leader ? <button type="button" className="secondary" disabled={!valid || busy || !currentUser} onClick={() => onSave('private')}>{text(language, 'Lưu riêng', 'Save privately')}</button> : null}
          <button type="button" className="primary" disabled={!valid || busy || !currentUser} onClick={() => onSave(leader ? 'approved' : 'pending')}>
            {busy ? text(language, 'Đang lưu…', 'Saving…') : leader
              ? text(language, 'Thêm và chia sẻ', 'Add and share')
              : text(language, 'Gửi TTCM duyệt', 'Submit for review')}
          </button>
        </footer>
      </section>
    </div>,
    document.body,
  );
}

function CustomAppInlinePlayer({ app, language, onClose }) {
  const shellRef = useRef(null);
  const [frameKey, setFrameKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);

  useEffect(() => {
    setLoading(true);
    setSlowLoad(false);
    const scrollTimer = window.setTimeout(() => shellRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' }), 0);
    const slowTimer = window.setTimeout(() => setSlowLoad(true), 10000);
    return () => {
      window.clearTimeout(scrollTimer);
      window.clearTimeout(slowTimer);
    };
  }, [app.id, app.url, frameKey]);

  const reload = () => {
    setLoading(true);
    setSlowLoad(false);
    setFrameKey((current) => current + 1);
  };

  const fullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await shellRef.current?.requestFullscreen?.();
    } catch {
      // The embedded app remains usable even when fullscreen is unavailable.
    }
  };

  return (
    <section ref={shellRef} className="custom-app-inline-player" style={{ '--custom-app-accent': app.accent }} aria-label={`${text(language, 'Ứng dụng đang chạy', 'Running app')}: ${app.label}`}>
      <header>
        <div className="custom-app-inline-identity">
          <span>{app.icon}</span>
          <div><small>{text(language, 'CHẠY TRỰC TIẾP TẠI ĐÂY', 'RUNNING HERE')}</small><strong>{app.label}</strong><em>{hostOf(app.url)}</em></div>
        </div>
        <div className="custom-app-inline-actions">
          <button type="button" onClick={reload}>{text(language, 'Tải lại', 'Reload')}</button>
          <button type="button" onClick={fullscreen}>{text(language, 'Toàn màn hình', 'Full screen')}</button>
          <button type="button" onClick={() => window.open(app.url, '_blank', 'noopener,noreferrer')}>{text(language, 'Mở tab riêng', 'Open separately')} ↗</button>
          <button type="button" className="close" onClick={onClose} aria-label={text(language, 'Đóng trình chạy', 'Close player')}>×</button>
        </div>
      </header>
      <div className="custom-app-inline-viewport">
        {loading ? <div className="custom-app-inline-loading">{text(language, 'Đang tải ứng dụng trực tiếp…', 'Loading the app directly…')}</div> : null}
        <iframe
          key={`${app.id}:${frameKey}`}
          title={app.label}
          src={app.url}
          allow="microphone; camera; clipboard-read; clipboard-write; fullscreen; autoplay; geolocation; display-capture"
          allowFullScreen
          sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-downloads allow-modals allow-presentation allow-top-navigation-by-user-activation"
          referrerPolicy="strict-origin-when-cross-origin"
          onLoad={() => { setLoading(false); setSlowLoad(false); }}
        />
        {slowLoad ? (
          <div className="custom-app-inline-slow">
            <strong>{text(language, 'Website tải lâu hoặc không cho phép nhúng', 'The website is slow or blocks embedding')}</strong>
            <p>{text(language, 'Một số website chặn iframe vì chính sách bảo mật. Khi đó, hãy dùng nút Mở tab riêng.', 'Some websites block iframes for security reasons. Use Open separately when that happens.')}</p>
            <button type="button" onClick={() => window.open(app.url, '_blank', 'noopener,noreferrer')}>{text(language, 'Mở tab riêng', 'Open separately')} ↗</button>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function CustomAppCard({ app, language, currentUser, leader, busy, onOpenInline, onSubmit, onReview, onDelete }) {
  const status = STATUS_META[app.status] || STATUS_META.private;
  const owner = isCustomAppOwner(currentUser, app);
  const editable = canEditCustomApp(currentUser, app);
  const canSubmit = owner && ['private', 'rejected'].includes(app.status);
  const canRunInline = app.status === 'approved' || leader;

  return (
    <article className={`custom-app-card status-${status.tone}`} style={{ '--custom-app-accent': app.accent }}>
      <div className="custom-app-card-visual" aria-hidden="true">
        <span className="custom-app-card-icon">{app.icon}</span>
        <span className="custom-app-card-orbit" />
        <span className="custom-app-card-link">↗</span>
      </div>
      <div className="custom-app-card-copy">
        <span className={`custom-app-status ${status.tone}`}>{language === 'vi' ? status.vi : status.en}</span>
        <strong>{app.label}</strong>
        <small>{app.description || hostOf(app.url)}</small>
        <em>{hostOf(app.url)}</em>
      </div>
      <div className="custom-app-card-actions">
        {canRunInline ? <button type="button" className="open" onClick={() => onOpenInline(app)}>{text(language, 'Chạy tại đây', 'Run here')}</button> : null}
        <button type="button" className={canRunInline ? 'external' : 'open'} onClick={() => window.open(app.url, '_blank', 'noopener,noreferrer')}>{text(language, 'Mở tab riêng', 'Open separately')} ↗</button>
        {canSubmit ? <button type="button" disabled={busy} onClick={() => onSubmit(app.id)}>{text(language, 'Gửi TTCM duyệt', 'Submit')}</button> : null}
        {leader && app.status === 'pending' ? <button type="button" className="approve" disabled={busy} onClick={() => onReview(app.id, 'approved')}>{text(language, 'Duyệt chia sẻ', 'Approve')}</button> : null}
        {leader && app.status === 'pending' ? <button type="button" className="reject" disabled={busy} onClick={() => onReview(app.id, 'rejected')}>{text(language, 'Chưa duyệt', 'Reject')}</button> : null}
        {editable ? <button type="button" className="delete" disabled={busy} onClick={() => onDelete(app.id)} aria-label={text(language, 'Xoá ứng dụng', 'Delete app')}>×</button> : null}
      </div>
      {app.reviewNote ? <p className="custom-app-review-note">{app.reviewNote}</p> : null}
    </article>
  );
}

export default function CustomAppsExtension({ language = 'vi', currentUser }) {
  const leader = canPublishDepartment(currentUser);
  const [actionHost, setActionHost] = useState(null);
  const [panelHost, setPanelHost] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [apps, setApps] = useState([]);
  const [activeApp, setActiveApp] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const refresh = useCallback(async () => {
    const items = await listCustomApps(currentUser);
    setApps(items);
    setActiveApp((current) => {
      if (!current) return null;
      const next = items.find((item) => item.id === current.id);
      return next && (next.status === 'approved' || leader) ? next : null;
    });
  }, [currentUser?.id, currentUser?.email, currentUser?.role, leader]);

  useEffect(() => {
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener(CUSTOM_APPS_EVENT, onUpdate);
    const unsubscribe = subscribeCustomApps(onUpdate);
    return () => {
      window.removeEventListener(CUSTOM_APPS_EVENT, onUpdate);
      unsubscribe();
    };
  }, [refresh]);

  useEffect(() => {
    let cancelled = false;
    let timer = 0;
    const attach = () => {
      if (cancelled) return;
      const page = document.querySelector('.flat-apps-directory');
      const hero = page?.querySelector('.apps-directory-hero-v1216');
      const copy = hero?.querySelector('.flat-apps-hero-copy');
      if (!page || !hero || !copy) {
        timer = window.setTimeout(attach, 40);
        return;
      }
      const action = document.createElement('div');
      action.className = 'custom-app-action-host';
      const panel = document.createElement('div');
      panel.className = 'custom-app-panel-host';
      copy.appendChild(action);
      hero.insertAdjacentElement('afterend', panel);
      setActionHost(action);
      setPanelHost(panel);
    };
    attach();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      setActionHost((node) => { node?.remove(); return null; });
      setPanelHost((node) => { node?.remove(); return null; });
    };
  }, []);

  const pendingCount = useMemo(() => apps.filter((app) => app.status === 'pending').length, [apps]);
  const approvedCount = useMemo(() => apps.filter((app) => app.status === 'approved').length, [apps]);

  const openDialog = () => {
    setDraft(EMPTY_DRAFT);
    setMessage('');
    setDialogOpen(true);
  };

  const saveApp = async (status) => {
    if (!currentUser) {
      setMessage(text(language, 'Hãy đăng nhập để thêm ứng dụng.', 'Sign in to add an app.'));
      return;
    }
    setBusy(true);
    setMessage('');
    const result = await createCustomApp(currentUser, { ...draft, url: ensureCustomAppUrl(draft.url) }, status);
    if (!result.ok) {
      setMessage(result.message || text(language, 'Không thể lưu ứng dụng.', 'Could not save the app.'));
      setBusy(false);
      return;
    }
    setDialogOpen(false);
    setDraft(EMPTY_DRAFT);
    setBusy(false);
    await refresh();
  };

  const submitApp = async (id) => {
    setBusy(true);
    const result = await requestCustomAppApproval(currentUser, id);
    if (!result.ok) setMessage(result.message || text(language, 'Không thể gửi duyệt.', 'Could not submit for review.'));
    await refresh();
    setBusy(false);
  };

  const reviewApp = async (id, status) => {
    setBusy(true);
    const note = status === 'approved'
      ? text(language, 'TTCM đã duyệt và chia sẻ ứng dụng cho giáo viên.', 'Approved and shared with teachers by the department leader.')
      : text(language, 'TTCM chưa duyệt. Ứng dụng vẫn chỉ hiển thị cho người gửi và TTCM.', 'Not approved. The app remains visible only to its owner and department leaders.');
    const result = await updateCustomAppStatus(currentUser, id, status, note);
    if (!result.ok) setMessage(result.message || text(language, 'Không thể cập nhật trạng thái.', 'Could not update the status.'));
    await refresh();
    setBusy(false);
  };

  const removeApp = async (id) => {
    setBusy(true);
    const result = await deleteCustomApp(currentUser, id);
    if (!result.ok) setMessage(result.message || text(language, 'Không thể xoá ứng dụng.', 'Could not delete the app.'));
    if (activeApp?.id === id) setActiveApp(null);
    await refresh();
    setBusy(false);
  };

  return (
    <>
      {actionHost ? createPortal(
        <div className="custom-app-hero-actions">
          <button type="button" className="custom-app-add-button" onClick={openDialog}>＋ {text(language, 'Thêm ứng dụng', 'Add app')}</button>
          <span>{leader
            ? text(language, `${pendingCount} liên kết chờ duyệt`, `${pendingCount} links awaiting review`)
            : text(language, 'Dán link · TTCM duyệt · chia sẻ giáo viên', 'Paste link · leader approval · teacher sharing')}</span>
        </div>,
        actionHost,
      ) : null}

      {panelHost ? createPortal(
        <section className="custom-app-sharing-panel" aria-label={text(language, 'Ứng dụng do giáo viên chia sẻ', 'Teacher-shared apps')}>
          <header>
            <div>
              <span>↗ {text(language, 'APP LINK SHARING', 'APP LINK SHARING')}</span>
              <h2>{text(language, 'Ứng dụng được đề xuất và chia sẻ', 'Suggested and shared apps')}</h2>
              <p>{leader
                ? text(language, 'Duyệt liên kết do giáo viên gửi. Ứng dụng được duyệt sẽ xuất hiện cho toàn bộ giáo viên.', 'Review teacher-submitted links. Approved apps appear for every teacher.')
                : text(language, 'Ứng dụng riêng chỉ bạn và TTCM thấy; ứng dụng được duyệt sẽ được chia sẻ cho toàn tổ.', 'Private apps are visible only to you and department leaders; approved apps are shared department-wide.')}</p>
            </div>
            <div className="custom-app-sharing-metrics"><b>{approvedCount}</b><small>{text(language, 'đã chia sẻ', 'shared')}</small><b>{pendingCount}</b><small>{text(language, 'chờ duyệt', 'pending')}</small></div>
          </header>
          {message ? <div className="custom-app-panel-message">{message}</div> : null}
          <div className="custom-app-card-grid">
            {apps.map((app) => <CustomAppCard key={app.id} app={app} language={language} currentUser={currentUser} leader={leader} busy={busy} onOpenInline={setActiveApp} onSubmit={submitApp} onReview={reviewApp} onDelete={removeApp} />)}
            {!apps.length ? (
              <button type="button" className="custom-app-empty-card" onClick={openDialog}>
                <span>＋</span><strong>{text(language, 'Thêm ứng dụng đầu tiên', 'Add the first app')}</strong><small>{text(language, 'Dán một liên kết để bắt đầu.', 'Paste a link to get started.')}</small>
              </button>
            ) : null}
          </div>
          {activeApp ? <CustomAppInlinePlayer key={activeApp.id} app={activeApp} language={language} onClose={() => setActiveApp(null)} /> : null}
        </section>,
        panelHost,
      ) : null}

      <CustomAppDialog open={dialogOpen} language={language} currentUser={currentUser} leader={leader} draft={draft} setDraft={setDraft} busy={busy} message={message} onClose={() => setDialogOpen(false)} onSave={saveApp} />
    </>
  );
}
