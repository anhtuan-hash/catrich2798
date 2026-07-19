import React, { useEffect, useMemo, useRef, useState } from 'react';
import { canPublishDepartment } from '../utils/permissions.js';
import {
  createCustomApp,
  deleteCustomApp,
  isCustomAppOwner,
  normalizeCustomAppUrl,
  reviewCustomApp,
  subscribeCustomApps,
  updateCustomApp,
} from '../utils/customApps.js';

const EMPTY_DRAFT = Object.freeze({ name: '', url: '', accent: '#3478d4' });

const copy = {
  vi: {
    title: 'Ứng dụng liên kết',
    subtitle: 'Lưu đường dẫn và chạy ngay bên trong Brian.',
    addLeader: 'Thêm ứng dụng',
    addTeacher: 'Đề xuất ứng dụng',
    review: 'Duyệt đề xuất',
    mine: 'Đề xuất của tôi',
    empty: 'Chưa có ứng dụng liên kết được duyệt.',
    emptyHint: 'Thêm một website dạy học để mở trực tiếp trong launcher.',
    approved: 'Đã duyệt',
    pending: 'Chờ TTCM duyệt',
    rejected: 'Cần chỉnh sửa',
    formTitleLeader: 'Thêm ứng dụng vào launcher',
    formTitleTeacher: 'Gửi ứng dụng cho TTCM duyệt',
    editTitle: 'Chỉnh sửa ứng dụng',
    name: 'Tên ứng dụng',
    namePlaceholder: 'Ví dụ: Quizizz, AI Exam Tools…',
    url: 'Đường dẫn website',
    urlPlaceholder: 'https://example.com',
    accent: 'Màu nhận diện',
    cancel: 'Huỷ',
    saveRun: 'Lưu và chạy ngay',
    submit: 'Gửi TTCM duyệt',
    save: 'Lưu thay đổi',
    approve: 'Duyệt',
    reject: 'Từ chối',
    edit: 'Sửa',
    remove: 'Xoá',
    preview: 'Chạy thử',
    close: 'Đóng ứng dụng',
    reload: 'Tải lại',
    fullscreen: 'Toàn màn hình',
    exitFullscreen: 'Thoát toàn màn hình',
    loading: 'Đang tải ứng dụng…',
    embedWarning: 'Website này có thể đang chặn chế độ nhúng. Brian sẽ không mở tab mới.',
    reviewEmpty: 'Không có đề xuất nào đang chờ duyệt.',
    owner: 'Người gửi',
    reviewNote: 'Ghi chú cho giáo viên',
    reviewNotePlaceholder: 'Nhập lý do cần chỉnh sửa…',
    invalid: 'Hãy nhập tên và một đường dẫn HTTP/HTTPS hợp lệ.',
    savedLeader: 'Đã lưu ứng dụng và thêm vào launcher.',
    sentTeacher: 'Đã gửi ứng dụng cho TTCM duyệt.',
    updated: 'Đã cập nhật ứng dụng.',
    approvedMessage: 'Đã duyệt ứng dụng.',
    rejectedMessage: 'Đã gửi yêu cầu chỉnh sửa.',
    deleted: 'Đã xoá ứng dụng.',
    cloudFallback: 'Đã lưu trên thiết bị này. Cần có bảng custom_game_platforms để đồng bộ giữa tài khoản.',
    noAccount: 'Đăng nhập để thêm hoặc đề xuất ứng dụng.',
    security: 'Chỉ chấp nhận liên kết HTTP/HTTPS. Ứng dụng chạy trong khung sandbox và không được mở tab mới.',
  },
  en: {
    title: 'Linked apps',
    subtitle: 'Save a website and run it directly inside Brian.',
    addLeader: 'Add app',
    addTeacher: 'Suggest app',
    review: 'Review suggestions',
    mine: 'My suggestions',
    empty: 'No approved linked apps yet.',
    emptyHint: 'Add a teaching website to run it directly from the launcher.',
    approved: 'Approved',
    pending: 'Waiting for leader review',
    rejected: 'Needs changes',
    formTitleLeader: 'Add an app to the launcher',
    formTitleTeacher: 'Submit an app for leader review',
    editTitle: 'Edit app',
    name: 'App name',
    namePlaceholder: 'Example: Quizizz, AI Exam Tools…',
    url: 'Website URL',
    urlPlaceholder: 'https://example.com',
    accent: 'Accent color',
    cancel: 'Cancel',
    saveRun: 'Save and run',
    submit: 'Submit for review',
    save: 'Save changes',
    approve: 'Approve',
    reject: 'Reject',
    edit: 'Edit',
    remove: 'Delete',
    preview: 'Preview',
    close: 'Close app',
    reload: 'Reload',
    fullscreen: 'Full screen',
    exitFullscreen: 'Exit full screen',
    loading: 'Loading app…',
    embedWarning: 'This website may block embedding. Brian will not open a new browser tab.',
    reviewEmpty: 'There are no suggestions waiting for review.',
    owner: 'Submitted by',
    reviewNote: 'Teacher note',
    reviewNotePlaceholder: 'Explain what should be changed…',
    invalid: 'Enter a name and a valid HTTP/HTTPS URL.',
    savedLeader: 'The app was saved and added to the launcher.',
    sentTeacher: 'The app was sent for leader review.',
    updated: 'The app was updated.',
    approvedMessage: 'The app was approved.',
    rejectedMessage: 'A revision request was sent.',
    deleted: 'The app was deleted.',
    cloudFallback: 'Saved on this device. The custom_game_platforms table is required for cross-account sync.',
    noAccount: 'Sign in to add or suggest an app.',
    security: 'Only HTTP/HTTPS links are accepted. Apps run in a sandbox and cannot open a new tab.',
  },
};

function initials(name) {
  const words = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return 'AP';
  return words.slice(0, 2).map((word) => word[0]).join('').toUpperCase();
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ''); } catch { return url; }
}

function StatusBadge({ status, t }) {
  return <span className={`launcher-link-status is-${status}`}>{t[status] || status}</span>;
}

function LinkedAppFrame({ app, language, onClose }) {
  const t = copy[language] || copy.vi;
  const shellRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [showWarning, setShowWarning] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement || null;
    const syncFullscreen = () => setIsFullscreen(fullscreenElement() === shellRef.current);
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      if (fullscreenElement()) return;
      onClose?.();
    };

    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', syncFullscreen);
    document.addEventListener('webkitfullscreenchange', syncFullscreen);
    syncFullscreen();

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', syncFullscreen);
      document.removeEventListener('webkitfullscreenchange', syncFullscreen);

      if (fullscreenElement() === shellRef.current) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        try {
          const result = exit?.call(document);
          result?.catch?.(() => {});
        } catch { /* browser may already be leaving fullscreen */ }
      }
    };
  }, [onClose]);

  useEffect(() => {
    const timer = window.setTimeout(() => setShowWarning(true), 7000);
    return () => window.clearTimeout(timer);
  }, [reloadKey]);

  const reload = () => {
    setLoading(true);
    setShowWarning(false);
    setReloadKey((value) => value + 1);
  };

  const toggleFullscreen = async () => {
    const shell = shellRef.current;
    if (!shell) return;

    const active = document.fullscreenElement || document.webkitFullscreenElement || null;
    try {
      if (active === shell) {
        const exit = document.exitFullscreen || document.webkitExitFullscreen;
        await exit?.call(document);
        return;
      }

      const request = shell.requestFullscreen || shell.webkitRequestFullscreen;
      if (!request) return;
      try {
        await request.call(shell, { navigationUI: 'hide' });
      } catch {
        await request.call(shell);
      }
    } catch (error) {
      console.warn('[LinkedAppFrame] Fullscreen unavailable', error);
    }
  };

  return (
    <div
      ref={shellRef}
      className={`launcher-link-frame-shell${isFullscreen ? ' is-fullscreen' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label={app.name}
    >
      <header className="launcher-link-frame-toolbar">
        <button type="button" className="launcher-link-frame-close" onClick={onClose} aria-label={t.close}>← <span>{t.close}</span></button>
        <div className="launcher-link-frame-title">
          <i style={{ '--link-accent': app.accent }}>{initials(app.name)}</i>
          <span><strong>{app.name}</strong><small>{hostOf(app.url)}</small></span>
        </div>
        <div className="launcher-link-frame-actions">
          <button
            type="button"
            className={isFullscreen ? 'is-active' : ''}
            onClick={toggleFullscreen}
            aria-label={isFullscreen ? t.exitFullscreen : t.fullscreen}
            aria-pressed={isFullscreen}
          >
            {isFullscreen ? '⤢' : '⛶'} <span>{isFullscreen ? t.exitFullscreen : t.fullscreen}</span>
          </button>
          <button type="button" onClick={reload}>↻ <span>{t.reload}</span></button>
        </div>
      </header>
      <div className="launcher-link-frame-body">
        {loading ? <div className="launcher-link-frame-loading"><span /><strong>{t.loading}</strong></div> : null}
        {showWarning ? <div className="launcher-link-frame-warning">{t.embedWarning}</div> : null}
        <iframe
          key={`${app.id}-${reloadKey}`}
          src={app.url}
          title={app.name}
          sandbox="allow-same-origin allow-scripts allow-forms allow-downloads allow-modals allow-pointer-lock allow-presentation"
          allow="clipboard-read; clipboard-write; camera; microphone; fullscreen"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          onLoad={() => { setLoading(false); setShowWarning(false); }}
        />
      </div>
    </div>
  );
}

function AppForm({ language, leader, editing, busy, onCancel, onSubmit }) {
  const t = copy[language] || copy.vi;
  const [draft, setDraft] = useState(() => editing ? { name: editing.name, url: editing.url, accent: editing.accent } : { ...EMPTY_DRAFT });
  const [error, setError] = useState('');

  useEffect(() => {
    setDraft(editing ? { name: editing.name, url: editing.url, accent: editing.accent } : { ...EMPTY_DRAFT });
    setError('');
  }, [editing?.id]);

  const submit = (event) => {
    event.preventDefault();
    const url = normalizeCustomAppUrl(draft.url);
    if (!draft.name.trim() || !url) {
      setError(t.invalid);
      return;
    }
    onSubmit?.({ ...draft, name: draft.name.trim(), url });
  };

  return (
    <form className="launcher-link-form" onSubmit={submit}>
      <header>
        <div><small>{leader ? 'TTCM' : language === 'vi' ? 'GIÁO VIÊN' : 'TEACHER'}</small><h3>{editing ? t.editTitle : leader ? t.formTitleLeader : t.formTitleTeacher}</h3></div>
        <button type="button" onClick={onCancel} aria-label={t.cancel}>×</button>
      </header>
      <label><span>{t.name}</span><input autoFocus value={draft.name} maxLength={80} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} placeholder={t.namePlaceholder} /></label>
      <label><span>{t.url}</span><input type="url" inputMode="url" value={draft.url} onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))} placeholder={t.urlPlaceholder} /></label>
      <label className="launcher-link-color-field"><span>{t.accent}</span><input type="color" value={draft.accent} onChange={(event) => setDraft((current) => ({ ...current, accent: event.target.value }))} /><b style={{ '--preview-accent': draft.accent }}>{initials(draft.name)}</b></label>
      <p className="launcher-link-security">⌁ {t.security}</p>
      {error ? <p className="launcher-link-form-error">{error}</p> : null}
      <footer><button type="button" onClick={onCancel}>{t.cancel}</button><button type="submit" className="primary" disabled={busy}>{editing ? t.save : leader ? t.saveRun : t.submit}</button></footer>
    </form>
  );
}

export default function LauncherAppHub({ language = 'vi', currentUser }) {
  const t = copy[language] || copy.vi;
  const leader = canPublishDepartment(currentUser);
  const [apps, setApps] = useState([]);
  const [modal, setModal] = useState('');
  const [editing, setEditing] = useState(null);
  const [frameApp, setFrameApp] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [reviewNotes, setReviewNotes] = useState({});

  useEffect(() => subscribeCustomApps(currentUser, setApps), [currentUser?.id, currentUser?.email, currentUser?.role]);

  const approvedApps = useMemo(() => apps.filter((item) => item.status === 'approved'), [apps]);
  const pendingApps = useMemo(() => apps.filter((item) => item.status === 'pending'), [apps]);
  const myApps = useMemo(() => apps.filter((item) => isCustomAppOwner(currentUser, item)), [apps, currentUser?.id, currentUser?.email]);

  const notify = (value) => {
    setMessage(value);
    window.setTimeout(() => setMessage(''), 3600);
  };

  const openForm = (app = null) => {
    if (!currentUser) {
      notify(t.noAccount);
      return;
    }
    setEditing(app);
    setModal('form');
  };

  const submitForm = async (draft) => {
    if (busy) return;
    setBusy(true);
    const result = editing
      ? await updateCustomApp(currentUser, editing.id, draft)
      : await createCustomApp(currentUser, draft);
    setBusy(false);
    if (!result.ok) {
      notify(result.message || t.invalid);
      return;
    }
    setModal('');
    setEditing(null);
    notify(editing ? t.updated : leader ? t.savedLeader : t.sentTeacher);
    if (!result.cloud) notify(`${editing ? t.updated : leader ? t.savedLeader : t.sentTeacher} ${t.cloudFallback}`);
    if (leader && result.app?.status === 'approved') setFrameApp(result.app);
  };

  const review = async (app, status) => {
    if (busy) return;
    setBusy(true);
    const result = await reviewCustomApp(currentUser, app.id, status, reviewNotes[app.id] || '');
    setBusy(false);
    notify(result.ok ? (status === 'approved' ? t.approvedMessage : t.rejectedMessage) : result.message);
  };

  const remove = async (app) => {
    if (busy) return;
    setBusy(true);
    const result = await deleteCustomApp(currentUser, app.id);
    setBusy(false);
    notify(result.ok ? t.deleted : result.message);
  };

  const managementItems = leader ? apps : myApps;

  return (
    <div className="launcher-link-hub">
      <header className="launcher-link-hub-head">
        <div><strong>{t.title}</strong><small>{t.subtitle}</small></div>
        <div className="launcher-link-hub-actions">
          {leader ? <button type="button" onClick={() => setModal('manage')} className={pendingApps.length ? 'has-alert' : ''}>{t.review}{pendingApps.length ? <b>{pendingApps.length}</b> : null}</button> : myApps.length ? <button type="button" onClick={() => setModal('manage')}>{t.mine}<b>{myApps.length}</b></button> : null}
          <button type="button" className="primary" onClick={() => openForm()}>{leader ? `＋ ${t.addLeader}` : `＋ ${t.addTeacher}`}</button>
        </div>
      </header>

      <div className="launcher-link-approved-list">
        {approvedApps.map((app) => (
          <button key={app.id} type="button" className="launcher-link-app-card" style={{ '--link-accent': app.accent }} onClick={() => setFrameApp(app)}>
            <i>{initials(app.name)}</i><span><strong>{app.name}</strong><small>{hostOf(app.url)}</small></span><em>↗</em>
          </button>
        ))}
        {!approvedApps.length ? (
          <button type="button" className="launcher-link-empty" onClick={() => openForm()}>
            <i>＋</i><span><strong>{t.empty}</strong><small>{t.emptyHint}</small></span>
          </button>
        ) : null}
      </div>

      {message ? <div className="launcher-link-toast" role="status">{message}</div> : null}

      {modal ? (
        <div className="launcher-link-modal-backdrop" role="presentation" onMouseDown={(event) => { if (event.currentTarget === event.target) setModal(''); }}>
          {modal === 'form' ? <AppForm language={language} leader={leader} editing={editing} busy={busy} onCancel={() => { setModal(''); setEditing(null); }} onSubmit={submitForm} /> : (
            <section className="launcher-link-manager" role="dialog" aria-modal="true" aria-label={leader ? t.review : t.mine}>
              <header><div><small>{leader ? 'TTCM' : language === 'vi' ? 'GIÁO VIÊN' : 'TEACHER'}</small><h3>{leader ? t.review : t.mine}</h3></div><button type="button" onClick={() => setModal('')}>×</button></header>
              <div className="launcher-link-manager-list">
                {managementItems.map((app) => (
                  <article key={app.id} className={`is-${app.status}`}>
                    <div className="launcher-link-manager-icon" style={{ '--link-accent': app.accent }}>{initials(app.name)}</div>
                    <div className="launcher-link-manager-copy">
                      <div><strong>{app.name}</strong><StatusBadge status={app.status} t={t} /></div>
                      <a href={app.url} onClick={(event) => event.preventDefault()}>{hostOf(app.url)}</a>
                      {leader ? <small>{t.owner}: {app.ownerName || app.ownerEmail || '—'}</small> : null}
                      {app.reviewNote ? <p>{app.reviewNote}</p> : null}
                      {leader && app.status === 'pending' ? <textarea value={reviewNotes[app.id] || ''} onChange={(event) => setReviewNotes((current) => ({ ...current, [app.id]: event.target.value }))} placeholder={t.reviewNotePlaceholder} /> : null}
                    </div>
                    <div className="launcher-link-manager-actions">
                      <button type="button" onClick={() => setFrameApp(app)}>{t.preview}</button>
                      {(leader || (isCustomAppOwner(currentUser, app) && app.status !== 'approved')) ? <button type="button" onClick={() => openForm(app)}>{t.edit}</button> : null}
                      {leader && app.status === 'pending' ? <><button type="button" className="approve" disabled={busy} onClick={() => review(app, 'approved')}>{t.approve}</button><button type="button" className="reject" disabled={busy} onClick={() => review(app, 'rejected')}>{t.reject}</button></> : null}
                      {(leader || (isCustomAppOwner(currentUser, app) && app.status !== 'approved')) ? <button type="button" className="danger" disabled={busy} onClick={() => remove(app)}>{t.remove}</button> : null}
                    </div>
                  </article>
                ))}
                {!managementItems.length ? <div className="launcher-link-manager-empty">{t.reviewEmpty}</div> : null}
              </div>
              <footer><button type="button" onClick={() => setModal('')}>{t.cancel}</button><button type="button" className="primary" onClick={() => openForm()}>{leader ? t.addLeader : t.addTeacher}</button></footer>
            </section>
          )}
        </div>
      ) : null}

      {frameApp ? <LinkedAppFrame app={frameApp} language={language} onClose={() => setFrameApp(null)} /> : null}
    </div>
  );
}
