import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  BellRing, Check, CheckCheck, ChevronRight, Clock3, Inbox,
  LockKeyhole, RefreshCw, ShieldCheck, X, XCircle
} from 'lucide-react';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import { isSupabaseConfigured, supabase } from '../utils/supabase.js';
import {
  getPermissionRequests, PERMISSION_REQUESTS_EVENT
} from '../utils/permissionRequests.js';
import './PermissionApprovalInbox.css';

const REFRESH_MS = 45000;
const STATUS_LABELS = {
  pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Đã từ chối',
};
const LABELS = {
  vi: { title: 'Yêu cầu quyền truy cập', subtitle: 'Duyệt yêu cầu của giáo viên trên toàn hệ thống',
    pending: 'Chờ duyệt', approved: 'Đã duyệt', rejected: 'Đã từ chối',
    quickTitle: 'Yêu cầu chờ duyệt', all: 'Xem tất cả yêu cầu', none: 'Không có yêu cầu trong mục này.',
    reject: 'Từ chối', approve: 'Duyệt', cancel: 'Hủy', confirm: 'Xác nhận',
    refresh: 'Làm mới', expand: 'Xem và duyệt quyền', reason: 'Lý do',
    scope: 'Quyền yêu cầu', error: 'Không thể tải danh sách yêu cầu.',
    readOnly: 'Đang tải dữ liệu…' },
  en: { title: 'Access requests', subtitle: 'Review teachers’ permissions across Brian English',
    pending: 'Pending', approved: 'Approved', rejected: 'Rejected',
    quickTitle: 'Awaiting approval', all: 'See all requests', none: 'No requests in this category.',
    reject: 'Reject', approve: 'Approve', cancel: 'Cancel', confirm: 'Confirm',
    refresh: 'Refresh', expand: 'Review access requests', reason: 'Reason',
    scope: 'Requested permission', error: 'Could not load requests.',
    readOnly: 'Loading…' },
};

function timeLabel(date, language) {
  const timestamp = new Date(date || 0);
  if (!Number.isFinite(timestamp.valueOf())) return '';
  return timestamp.toLocaleString(language === 'en' ? 'en-GB' : 'vi-VN', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

function RequestAvatar({ item }) {
  const letter = String(item.requester_name || item.requester_email || '?').trim().slice(0, 1).toLocaleUpperCase('vi');
  return <span className="bes-approval-avatar" aria-hidden="true">{letter}</span>;
}

export default function PermissionApprovalInbox({ currentUser, language = 'vi' }) {
  const canReview = Boolean(
    isSupabaseConfigured &&
    currentUser?.id &&
    currentUser?.approved === true &&
    isDepartmentLeaderRole(currentUser.role)
  );
  const copy = LABELS[language === 'en' ? 'en' : 'vi'];
  const [requests, setRequests] = useState([]);
  const [activeTab, setActiveTab] = useState('pending');
  const [panel, setPanel] = useState('closed'); // closed | quick | drawer
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [confirmation, setConfirmation] = useState(null);
  const [toast, setToast] = useState(null);
  const knownIds = useRef(null);
  const requestVersion = useRef(0);
  const lastFocus = useRef(null);
  const triggerRef = useRef(null);
  const drawerRef = useRef(null);
  const toastTimer = useRef(null);
  const mounted = useRef(true);

  const showToast = useCallback((message, kind = 'info') => {
    window.clearTimeout(toastTimer.current);
    setToast({ message, kind });
    toastTimer.current = window.setTimeout(() => setToast(null), 6500);
  }, []);

  const refresh = useCallback(async ({ quiet = false } = {}) => {
    if (!canReview) return;
    const version = ++requestVersion.current;
    if (!quiet) setLoading(true);
    try {
      const items = await getPermissionRequests({ force: true });
      if (version !== requestVersion.current || !mounted.current) return;
      const incoming = (items || []).filter((entry) => entry.status === 'pending');
      if (knownIds.current !== null) {
        const recentlyAdded = incoming.find((entry) => !knownIds.current.has(entry.id));
        if (recentlyAdded) {
          showToast((language === 'en' ? 'New request: ' : 'Yêu cầu mới: ')
            + (recentlyAdded.requester_name || recentlyAdded.requester_email || 'Giáo viên')
            + ' · ' + (recentlyAdded.item_title || recentlyAdded.permission_id));
        }
      }
      knownIds.current = new Set(incoming.map((entry) => entry.id));
      setRequests(items || []);
      setError('');
    } catch (failure) {
      if (version !== requestVersion.current || !mounted.current) return;
      setError(failure?.message || copy.error);
    } finally {
      if (version === requestVersion.current && mounted.current) setLoading(false);
    }
  }, [canReview, showToast, language, copy.error]);

  useEffect(() => {
    mounted.current = true;
    knownIds.current = null;
    if (!canReview) return undefined;
    refresh();
    const notify = () => refresh({ quiet: true });
    const onVisible = () => { if (document.visibilityState === 'visible') notify(); };
    window.addEventListener(PERMISSION_REQUESTS_EVENT, notify);
    window.addEventListener('focus', notify);
    document.addEventListener('visibilitychange', onVisible);
    // Realtime gives immediate updates if Postgres changes are published.
    // The 45-second visible-tab refresh remains a safe fallback when disabled.
    const channel = supabase
      .channel('bes-approval-inbox-' + currentUser.id)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'permission_requests' }, notify)
      .subscribe();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') notify();
    }, REFRESH_MS);
    return () => {
      requestVersion.current++;
      window.clearInterval(timer);
      window.clearTimeout(toastTimer.current);
      window.removeEventListener(PERMISSION_REQUESTS_EVENT, notify);
      window.removeEventListener('focus', notify);
      document.removeEventListener('visibilitychange', onVisible);
      supabase.removeChannel(channel);
    };
  }, [canReview, currentUser?.id, refresh]);

  useEffect(() => () => { mounted.current = false; window.clearTimeout(toastTimer.current); }, []);

  const close = useCallback(() => {
    setPanel('closed');
    setConfirmation(null);
    window.requestAnimationFrame(() => (lastFocus.current || triggerRef.current)?.focus?.({ preventScroll: true }));
  }, []);
  const open = useCallback((mode = 'quick') => {
    lastFocus.current = document.activeElement;
    setActiveTab('pending');
    setConfirmation(null);
    setPanel(mode);
    refresh({ quiet: true });
  }, [refresh]);

  useEffect(() => {
    if (panel !== 'drawer') return undefined;
    const keydown = (event) => {
      if (event.key === 'Escape') { event.preventDefault(); close(); return; }
      if (event.key !== 'Tab') return;
      const controls = [...(drawerRef.current?.querySelectorAll('button:not(:disabled),a[href]') || [])];
      if (!controls.length) return;
      const first = controls[0];
      const last = controls[controls.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', keydown);
    const raf = window.requestAnimationFrame(() => drawerRef.current?.querySelector('button')?.focus?.({ preventScroll: true }));
    return () => { document.removeEventListener('keydown', keydown); window.cancelAnimationFrame(raf); };
  }, [panel, close]);

  const pending = useMemo(() => requests.filter((r) => r.status === 'pending'), [requests]);
  const selected = useMemo(() => requests.filter((r) => r.status === activeTab), [requests, activeTab]);

  const decide = async (item, decision) => {
    if (busyId || !canReview) return;
    // The database RPC verifies role/MFA, checks a pending status under row lock,
    // updates the teacher's actual permissions, and writes an audit event atomically.
    setBusyId(item.id);
    setError('');
    try {
      const { data, error: rpcError } = await supabase.rpc('bes_review_permission_request', {
        p_request_id: item.id, p_decision: decision,
      });
      if (rpcError) throw rpcError;
      if (data?.ok !== true) throw new Error('Quyết định chưa được lưu vào máy chủ.');
      setConfirmation(null);
      showToast((decision === 'approved' ? 'Đã duyệt: ' : 'Đã từ chối: ')
        + (item.requester_name || item.requester_email || item.item_title), 'success');
      await refresh({ quiet: true });
    } catch (failure) {
      setError(failure?.message || 'Không thể cập nhật quyền. Hãy thử lại.');
    } finally {
      setBusyId('');
    }
  };

  if (!canReview) return null;

  const renderCard = (item, quick = false) => (
    <article className="bes-approval-request" key={item.id}>
      <div className="bes-approval-request-top">
        <RequestAvatar item={item} />
        <div className="bes-approval-request-heading">
          <strong>{item.requester_name || item.requester_email || 'Giáo viên'}</strong>
          <small>{item.requester_email || 'Giáo viên'} · {timeLabel(item.created_at, language)}</small>
        </div>
        <span className={'bes-approval-status is-' + item.status}>{STATUS_LABELS[item.status] || item.status}</span>
      </div>
      <dl className="bes-approval-meta">
        <div><dt>{copy.scope}</dt><dd>{item.item_title || item.permission_id}</dd></div>
        {!quick && <div><dt>Mã quyền</dt><dd>{item.permission_id}</dd></div>}
        {!quick && item.message ? <div><dt>{copy.reason}</dt><dd>{item.message}</dd></div> : null}
      </dl>
      {item.status === 'pending' && (!quick || panel === 'quick') ? (
        confirmation?.id === item.id ? (
          <div className="bes-approval-confirm">
            <p>{confirmation.decision === 'approved'
              ? 'Xác nhận cấp quyền sử dụng mục này cho giáo viên?'
              : 'Xác nhận từ chối yêu cầu của giáo viên?'}</p>
            <div>
              <button type="button" disabled={Boolean(busyId)} onClick={() => setConfirmation(null)}>{copy.cancel}</button>
              <button type="button" className={confirmation.decision === 'approved' ? 'is-primary' : 'is-danger'}
                disabled={Boolean(busyId)} onClick={() => decide(item, confirmation.decision)}>
                {busyId === item.id ? copy.readOnly : copy.confirm}
              </button>
            </div>
          </div>
        ) : <div className="bes-approval-actions">
          <button type="button" disabled={Boolean(busyId)} onClick={() => setConfirmation({ id: item.id, decision: 'rejected' })}>
            <XCircle size={15} aria-hidden="true" />{copy.reject}
          </button>
          <button type="button" className="is-primary" disabled={Boolean(busyId)}
            onClick={() => { if (quick) setPanel('drawer'); setConfirmation({ id: item.id, decision: 'approved' }); }}>
            <Check size={16} aria-hidden="true" />{copy.approve}
          </button>
        </div>
      ) : null}
    </article>
  );

  return createPortal(
    <div className="bes-approval-root" data-panel={panel}>
      {toast ? <div className={'bes-approval-toast is-' + toast.kind} role="status" aria-live="polite">
        <BellRing size={19} aria-hidden="true"/><span>{toast.message}</span>
        <button type="button" onClick={() => setToast(null)} aria-label="Đóng thông báo"><X size={16}/></button>
      </div> : null}
      {panel === 'drawer' ? (
        <div className="bes-approval-drawer-layer">
          <button className="bes-approval-drawer-scrim" aria-label="Đóng ngăn duyệt quyền" type="button" onClick={close}/>
          <aside className="bes-approval-drawer" role="dialog" aria-modal="true"
            aria-label={copy.title} ref={drawerRef}>
            <header className="bes-approval-drawer-header">
              <span className="bes-approval-heading-icon"><ShieldCheck size={23}/></span>
              <div><h2>{copy.title}</h2><p>{copy.subtitle}</p></div>
              <button type="button" className="bes-approval-icon-button" aria-label="Đóng" onClick={close}><X size={21}/></button>
            </header>
            <nav className="bes-approval-tabs" aria-label="Trạng thái yêu cầu">
              {['pending','approved','rejected'].map((tab) => (
                <button type="button" key={tab} className={activeTab === tab ? 'is-selected' : ''}
                  aria-current={activeTab === tab ? 'page' : undefined}
                  onClick={() => { setActiveTab(tab); setConfirmation(null); }}>
                  {copy[tab]} {tab === 'pending' ? <b>{pending.length}</b> : null}
                </button>
              ))}
            </nav>
            <div className="bes-approval-drawer-toolbar">
              <span>{selected.length} yêu cầu</span>
              <button type="button" onClick={() => refresh()} disabled={loading}>
                <RefreshCw size={16} className={loading ? 'is-spinning' : ''}/>{copy.refresh}
              </button>
            </div>
            {error ? <div className="bes-approval-error" role="alert">{error}</div> : null}
            <div className="bes-approval-list">
              {selected.length ? selected.map((item) => renderCard(item)) : (
                <div className="bes-approval-empty"><CheckCheck size={29}/><p>{loading ? copy.readOnly : copy.none}</p></div>
              )}
            </div>
            <footer className="bes-approval-drawer-footer">
              <LockKeyhole size={16}/><span>Chỉ TTCM/Admin có quyền mới có thể phê duyệt. Mọi quyết định được lưu lịch sử.</span>
            </footer>
          </aside>
        </div>
      ) : null}

      {panel === 'quick' ? <div className="bes-approval-quick" role="region" aria-label={copy.quickTitle}>
        <header><span><Inbox size={18}/><strong>{copy.quickTitle}</strong><b>{pending.length}</b></span>
          <button type="button" aria-label="Đóng danh sách" onClick={close}><X size={18}/></button>
        </header>
        {error ? <div className="bes-approval-error" role="alert">{error}</div> : null}
        <div className="bes-approval-quick-list">
          {pending.slice(0,3).map((item) => renderCard(item,true))}
          {!pending.length ? <div className="bes-approval-empty"><CheckCheck size={25}/><p>{loading ? copy.readOnly : copy.none}</p></div> : null}
        </div>
        <button type="button" className="bes-approval-see-all"
          onClick={() => { setPanel('drawer'); setActiveTab('pending'); setConfirmation(null); }}>
          {copy.all}<ChevronRight size={18}/>
        </button>
      </div> : null}

      {panel !== 'drawer' && <button type="button" ref={triggerRef} className="bes-approval-fab"
        aria-haspopup="dialog" aria-expanded={panel === 'quick'} aria-label={copy.expand}
        title={copy.expand} onClick={() => panel === 'quick' ? close() : open('quick')}>
        <ShieldCheck size={25} strokeWidth={2.1}/><BellRing size={15} className="bes-approval-fab-bell"/>
        {pending.length > 0 ? <span className="bes-approval-count">{pending.length > 99 ? '99+' : pending.length}</span> : null}
      </button>}
    </div>, document.body
  );
}
