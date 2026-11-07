import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, BellRing, CalendarClock, CheckCheck, ClipboardCheck, Clock3, X } from 'lucide-react';
import { getRuntimeClient } from '../services/runtime/core.js';
import { useRuntimeCore } from '../services/runtime/useRuntimeCore.js';
import { markWorkHubNotificationRead, subscribeWorkHubNotifications } from '../utils/workHubDelivery.js';
import { selectTtcmAssignmentEvents } from '../utils/ttcmAssignmentEvents.mjs';
import './TtcmAssignmentEventPopup.css';

const seenKey = (userId, notificationId) => `bes-ttcm-assignment-event:${userId}:${notificationId}`;
const WORK_COLUMNS = 'id,title,description,item_type,status,priority,owner_id,created_by,assignee_ids,metadata,source_module,due_at,created_at';

function seenThisSession(userId, notificationId) {
  try { return window.sessionStorage.getItem(seenKey(userId, notificationId)) === '1'; }
  catch { return false; }
}

function markSessionSeen(userId, notificationId) {
  try { window.sessionStorage.setItem(seenKey(userId, notificationId), '1'); }
  catch { /* Private browsing: in-memory check still prevents duplicates. */ }
}

function readableDate(value, language) {
  if (!value || Number.isNaN(new Date(value).getTime())) return '';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', {
    dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Ho_Chi_Minh',
  }).format(new Date(value));
}

function openTtcmWorkItem(itemId) {
  // When the TTCM navigation is present, use its existing open event.
  if (document.querySelector('.brian-nav__ttcm-tab')) {
    window.dispatchEvent(new CustomEvent('bes-ttcm-open', { detail: { view: 'feed', itemId } }));
    return;
  }
  // A route without the TTCM toolbar can still open the exact item on Home.
  try {
    window.sessionStorage.setItem('bes-ttcm-open-on-load', JSON.stringify({ view: 'feed', itemId }));
  } catch { /* Session storage is optional. */ }
  window.location.hash = '#/home';
}

/**
 * In-app assignment EVENT: no second task or event database record is created.
 * Existing Work Hub notifications are the source of truth and enforce RLS per user.
 */
export default function TtcmAssignmentEventPopup({ currentUser, language = 'vi' }) {
  const runtime = useRuntimeCore();
  const userId = String(currentUser?.id || '');
  const userRef = useRef(userId);
  userRef.current = userId;
  const [queue, setQueue] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [officialEventOpen, setOfficialEventOpen] = useState(false);
  const seenRef = useRef(new Set());
  const inFlightRef = useRef(null);
  const closeRef = useRef(null);

  useEffect(() => {
    seenRef.current = new Set();
    setQueue([]);
    setBusy(false);
    setError('');
  }, [userId]);

  const scan = useCallback(async () => {
    if (!userId || !runtime.ready || !runtime.session) return;
    const client = getRuntimeClient();
    if (!client) return;
    if (inFlightRef.current) return inFlightRef.current;
    const task = (async () => {
      const { data: notifications, error: notificationError } = await client.from('work_hub_notifications')
        .select('id,user_id,item_id,notification_type,read_at,created_at')
        .eq('user_id', userId)
        .eq('notification_type', 'work_item_assigned')
        .is('read_at', null)
        .order('created_at', { ascending: false })
        .limit(30);
      if (notificationError) throw notificationError;
      if (userRef.current !== userId) return;
      const freshRows = (notifications || []).filter((row) =>
        !seenRef.current.has(String(row.id)) && !seenThisSession(userId, row.id));
      if (!freshRows.length) return;
      const itemIds = [...new Set(freshRows.map((row) => row.item_id).filter(Boolean))];
      if (!itemIds.length) return;
      const { data: items, error: itemsError } = await client.from('work_hub_items')
        .select(WORK_COLUMNS).in('id', itemIds);
      if (itemsError) throw itemsError;
      if (userRef.current !== userId) return;
      const events = selectTtcmAssignmentEvents(freshRows, items || [], userId,
        (id) => seenRef.current.has(String(id)) || seenThisSession(userId, id));
      if (!events.length) return;
      setQueue((current) => {
        const queued = new Set(current.map((event) => event.itemId));
        return [...current, ...events.filter((event) => !queued.has(event.itemId))].slice(0, 30);
      });
    })();
    inFlightRef.current = task;
    try { await task; }
    catch (scanError) {
      // A temporary backend outage must not block login or navigation.
      console.warn('[TTCM assignment events] Notification sync failed:', scanError?.message || scanError);
    } finally {
      if (inFlightRef.current === task) inFlightRef.current = null;
    }
  }, [runtime.ready, runtime.session, userId]);

  useEffect(() => {
    if (!userId || !runtime.ready || !runtime.session) return undefined;
    const startup = window.setTimeout(scan, 600);
    const onRealtime = (payload) => {
      const row = payload?.new;
      if (payload?.eventType !== 'INSERT'
        || row?.notification_type !== 'work_item_assigned'
        || String(row?.user_id || '') !== userId) return;
      window.setTimeout(scan, 700);
    };
    const unsubscribe = subscribeWorkHubNotifications(userId, onRealtime);
    const onFocus = () => { if (document.visibilityState === 'visible') scan(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onFocus);
    const interval = window.setInterval(onFocus, 180000);
    return () => {
      window.clearTimeout(startup);
      window.clearInterval(interval);
      unsubscribe();
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onFocus);
    };
  }, [runtime.ready, runtime.session, scan, userId]);

  // Do not stack this popup on top of an official school-event popup.
  useEffect(() => {
    const inspect = () => setOfficialEventOpen(Boolean(document.querySelector('.be-pop-overlay, .be-pop-inbox-overlay')));
    inspect();
    const observer = new MutationObserver(inspect);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  const active = officialEventOpen ? null : queue[0] || null;
  useEffect(() => {
    if (!active) return undefined;
    const frame = window.requestAnimationFrame(() => closeRef.current?.focus());
    const onKey = (event) => {
      if (event.key === 'Escape' && !busy) {
        event.preventDefault();
        const id = String(active.notificationId);
        seenRef.current.add(id);
        markSessionSeen(userId, id);
        setQueue((current) => current.filter((entry) => entry.notificationId !== id));
      }
    };
    document.addEventListener('keydown', onKey);
    return () => { window.cancelAnimationFrame(frame); document.removeEventListener('keydown', onKey); };
  }, [active?.notificationId, busy, userId]);

  const dismiss = async (action) => {
    if (!active || busy) return;
    setError('');
    setBusy(true);
    try {
      if (action !== 'later') {
        const result = await markWorkHubNotificationRead(active.notificationId);
        if (!result?.ok) throw new Error(result?.message || 'Không thể xác nhận đã nhận công việc.');
      }
      const notificationId = String(active.notificationId);
      seenRef.current.add(notificationId);
      markSessionSeen(userId, notificationId);
      const itemId = active.itemId;
      setQueue((current) => current.filter((entry) => entry.notificationId !== notificationId));
      if (action === 'open') openTtcmWorkItem(itemId);
    } catch (actionError) {
      setError(actionError?.message || 'Không thể xử lý thông báo. Hãy thử lại.');
    } finally { setBusy(false); }
  };

  if (!active || typeof document === 'undefined') return null;
  const due = readableDate(active.item.due_at, language);
  const pastDue = Boolean(active.item.due_at && new Date(active.item.due_at).getTime() < Date.now());
  const english = language === 'en';

  return createPortal(
    <div className="bes-assignment-event-layer" role="presentation">
      <div className="bes-assignment-event-scrim" aria-hidden="true" />
      <section className="bes-assignment-event-card" role="dialog" aria-modal="true"
        aria-labelledby="bes-assignment-event-title" aria-describedby="bes-assignment-event-desc"
        data-global-motion-isolate="true">
        <header className="bes-assignment-event-head">
          <div className="bes-assignment-event-heading">
            <span className="bes-assignment-event-bell"><BellRing size={27} strokeWidth={1.8}/></span>
            <div>
              <span className="bes-assignment-event-overline">BRIAN ENGLISH · TTCM</span>
              <h2 id="bes-assignment-event-title">{english ? 'A task has been assigned to you' : 'Bạn được giao công việc mới'}</h2>
              <p>{english ? 'A department leader has sent a task to your account.' : 'Nhiệm vụ từ Kênh chuyên môn, dành riêng cho tài khoản của bạn.'}</p>
            </div>
          </div>
          <button type="button" ref={closeRef} className="bes-assignment-event-close" aria-label={english ? 'Remind me later' : 'Để sau'}
            disabled={busy} onClick={() => dismiss('later')}><X size={21}/></button>
        </header>
        <div className="bes-assignment-event-body" id="bes-assignment-event-desc">
          <div className="bes-assignment-event-ticket">
            <div className="bes-assignment-event-ticket-top">
              <span className="bes-assignment-event-chip"><ClipboardCheck size={16}/>{english ? 'Assigned to you' : 'Việc được giao'}</span>
              {queue.length > 1 && <span className="bes-assignment-event-count">1 / {queue.length}</span>}
            </div>
            <h3>{active.item.title}</h3>
            <p className="bes-assignment-event-description">{active.item.description || (english
              ? 'Open the TTCM channel to see the requirements and respond.'
              : 'Mở Kênh TTCM để xem yêu cầu và gửi phản hồi.')}</p>
            <div className={`bes-assignment-event-due${pastDue ? ' is-late' : ''}`}>
              <CalendarClock size={20} aria-hidden="true"/>
              <span>
                <small>{english ? 'Deadline' : 'Hạn hoàn thành'}</small>
                <strong>{due || (english ? 'No deadline specified' : 'Chưa quy định thời hạn')}</strong>
              </span>
              {pastDue && <b>{english ? 'Overdue' : 'Đã quá hạn'}</b>}
            </div>
          </div>
          <p className="bes-assignment-event-hint"><Clock3 size={16} aria-hidden="true"/>
            {english ? 'You can respond and submit files in the TTCM channel.' : 'Bạn có thể phản hồi và nộp tệp trực tiếp trong Kênh TTCM.'}
          </p>
          {error && <p className="bes-assignment-event-error" role="alert">{error}</p>}
        </div>
        <footer className="bes-assignment-event-actions">
          <button type="button" className="bes-assignment-event-later" disabled={busy} onClick={() => dismiss('later')}>
            {english ? 'Later' : 'Để sau'}
          </button>
          <button type="button" className="bes-assignment-event-confirm" disabled={busy} onClick={() => dismiss('read')}>
            <CheckCheck size={18}/>{english ? 'Acknowledged' : 'Đã nhận'}
          </button>
          <button type="button" className="bes-assignment-event-open" disabled={busy} onClick={() => dismiss('open')}>
            {english ? 'Open task' : 'Xem và thực hiện'}<ArrowRight size={18}/>
          </button>
        </footer>
      </section>
    </div>, document.body
  );
}
