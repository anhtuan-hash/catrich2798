import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BellRing, CheckCircle2, Radio, RefreshCw, WifiOff, X } from 'lucide-react';
import { subscribeTable } from '../services/runtime/core.js';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import { isSupabaseConfigured, supabase } from '../utils/supabase.js';

const SOURCE_MODULE = 'brian-team';
const FALLBACK_INTERVAL = 60_000;
const ITEM_COLUMNS = 'id,title,status,owner_id,assignee_ids,due_at,metadata,source_module,updated_at,submitted_at';

function unique(values = []) {
  return [...new Set((values || []).map(String).filter(Boolean))];
}

function assignmentIdOf(item) {
  return String(item?.metadata?.brian_team_assignment_id || '');
}

function teacherIdOf(item) {
  return String(item?.metadata?.brian_team_assignee_id || item?.assignee_ids?.[0] || '');
}

function formatDateTime(value, language = 'vi') {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-US' : 'vi-VN', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}

function initials(value) {
  const words = String(value || 'GV').trim().split(/\s+/).filter(Boolean);
  return words.slice(-2).map((word) => word[0]).join('').toUpperCase() || 'GV';
}

async function loadPeople(ids = []) {
  const wanted = unique(ids);
  if (!wanted.length || !supabase) return new Map();
  const attempts = [
    ['id,full_name,email', 'id'],
    ['user_id,full_name,email', 'user_id'],
    ['profile_id,full_name,email', 'profile_id'],
  ];
  for (const [columns, key] of attempts) {
    const { data, error } = await supabase.from('profiles').select(columns).in(key, wanted).limit(500);
    if (!error) {
      return new Map((data || []).map((profile) => {
        const id = String(profile.id || profile.user_id || profile.profile_id || '');
        return [id, {
          id,
          name: profile.full_name || profile.name || profile.email || 'Giáo viên',
          email: profile.email || '',
        }];
      }).filter(([id]) => id));
    }
    if (!/column .* does not exist|42703/i.test(error.message || '')) break;
  }
  return new Map();
}

function TopbarButton({ count, live, language, onClick }) {
  const english = language === 'en';
  return (
    <button
      type="button"
      className={`bes-bt-realtime-button ${count ? 'has-pending' : ''}`}
      onClick={onClick}
      title={english ? 'Open pending Brian Team reviews' : 'Mở các bài đang chờ duyệt trong Brian Team'}
    >
      {live ? <Radio /> : <WifiOff />}
      <span>{count ? `${count} ${english ? 'to review' : 'chờ duyệt'}` : (english ? 'Live updates' : 'Realtime')}</span>
      {count > 0 && <b>{count > 99 ? '99+' : count}</b>}
    </button>
  );
}

export default function BrianTeamRealtimeAlertsBridge({ currentUser, language = 'vi' }) {
  const english = language === 'en';
  const [rows, setRows] = useState([]);
  const [people, setPeople] = useState(new Map());
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [live, setLive] = useState(() => typeof navigator === 'undefined' ? true : navigator.onLine);
  const [error, setError] = useState('');
  const previousStatuses = useRef(new Map());
  const initialized = useRef(false);
  const topbarRoot = useRef(null);
  const topbarHost = useRef(null);
  const toastTimer = useRef(0);

  const canManage = Boolean(
    currentUser?.id
    && isDepartmentLeaderRole(currentUser.role)
    && isSupabaseConfigured
    && supabase,
  );

  const pending = useMemo(() => rows
    .filter((item) => item.status === 'submitted' && assignmentIdOf(item))
    .sort((left, right) => new Date(right.submitted_at || right.updated_at || 0) - new Date(left.submitted_at || left.updated_at || 0)), [rows]);

  const refreshConsumers = useCallback(() => {
    window.dispatchEvent(new CustomEvent('bes-brian-team-realtime-updated'));
    window.dispatchEvent(new CustomEvent('bes-brian-team-review-updated'));
    window.dispatchEvent(new CustomEvent('bes-work-hub-refresh-requested'));
    if (window.location.hash.includes('brian-team')) window.dispatchEvent(new Event('focus'));
  }, []);

  const loadRows = useCallback(async ({ silent = false } = {}) => {
    if (!canManage) return;
    if (!silent) setLoading(true);
    try {
      const { data, error: loadError } = await supabase
        .from('work_hub_items')
        .select(ITEM_COLUMNS)
        .eq('owner_id', currentUser.id)
        .eq('source_module', SOURCE_MODULE)
        .limit(900);
      if (loadError) throw loadError;
      const next = data || [];
      setRows(next);
      next.forEach((item) => previousStatuses.current.set(String(item.id), String(item.status || '')));
      initialized.current = true;
      setError('');
      setLive(typeof navigator === 'undefined' ? true : navigator.onLine);
    } catch (loadError) {
      if (!silent) setError(loadError.message || String(loadError));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [canManage, currentUser?.id]);

  useEffect(() => {
    if (!canManage) {
      setRows([]);
      setPeople(new Map());
      setOpen(false);
      return undefined;
    }

    let stopped = false;
    let fallbackTimer = 0;
    loadRows();

    const unsubscribe = subscribeTable({
      key: `brian-team-realtime-alerts-${currentUser.id}`,
      table: 'work_hub_items',
      filter: `owner_id=eq.${currentUser.id}`,
      onChange: (payload) => {
        if (stopped) return;
        const row = payload?.new && Object.keys(payload.new).length ? payload.new : payload?.old;
        if (!row?.id) {
          loadRows({ silent: true });
          return;
        }
        if (payload?.eventType === 'DELETE') {
          previousStatuses.current.delete(String(row.id));
          setRows((current) => current.filter((item) => item.id !== row.id));
          refreshConsumers();
          return;
        }
        if (String(row.owner_id || '') !== String(currentUser.id) || row.source_module !== SOURCE_MODULE) return;

        const previousStatus = previousStatuses.current.get(String(row.id));
        const nextStatus = String(row.status || '');
        previousStatuses.current.set(String(row.id), nextStatus);
        setRows((current) => [{ ...current.find((item) => item.id === row.id), ...row }, ...current.filter((item) => item.id !== row.id)]);
        setLive(true);
        setError('');
        refreshConsumers();

        if (initialized.current && nextStatus === 'submitted' && previousStatus && previousStatus !== 'submitted') {
          setToast(row);
          window.clearTimeout(toastTimer.current);
          toastTimer.current = window.setTimeout(() => setToast(null), 7000);
        }
      },
    });

    fallbackTimer = window.setInterval(() => loadRows({ silent: true }), FALLBACK_INTERVAL);
    const onOnline = () => { setLive(true); loadRows({ silent: true }); };
    const onOffline = () => setLive(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);

    return () => {
      stopped = true;
      unsubscribe?.();
      window.clearInterval(fallbackTimer);
      window.clearTimeout(toastTimer.current);
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [canManage, currentUser?.id, loadRows, refreshConsumers]);

  const peopleKey = useMemo(() => unique(rows.map(teacherIdOf)).sort().join('|'), [rows]);
  useEffect(() => {
    const ids = peopleKey ? peopleKey.split('|') : [];
    if (!ids.length) {
      setPeople(new Map());
      return undefined;
    }
    let active = true;
    loadPeople(ids).then((next) => active && setPeople(next));
    return () => { active = false; };
  }, [peopleKey]);

  const openReview = useCallback((item) => {
    const assignmentId = assignmentIdOf(item);
    if (!assignmentId) return;
    setOpen(false);
    setToast(null);
    if (!window.location.hash.includes('brian-team')) window.location.hash = '#/tool/brian-team';

    let attempts = 0;
    const locate = () => {
      const assignmentTab = [...document.querySelectorAll('.bt-tabs button')]
        .find((button) => /phân công|assignments/i.test(String(button.textContent || '')));
      if (assignmentTab && !assignmentTab.classList.contains('is-active')) assignmentTab.click();

      const article = [...document.querySelectorAll('.bt-list article[data-assignment-id]')]
        .find((node) => String(node.dataset.assignmentId || '') === assignmentId);
      const trigger = article?.querySelector('.bes-bt-review-trigger');
      if (trigger) {
        article.scrollIntoView({ behavior: 'auto', block: 'center' });
        window.setTimeout(() => trigger.click(), 220);
        return;
      }
      attempts += 1;
      if (attempts < 35) window.setTimeout(locate, 220);
    };
    window.setTimeout(locate, 120);
  }, []);

  useEffect(() => {
    if (!canManage) return undefined;
    const renderTopbar = () => {
      const onBrianTeam = window.location.hash.includes('brian-team');
      const actions = document.querySelector('.bt-topbar .bt-actions');
      if (!onBrianTeam || !actions) {
        if (topbarRoot.current) {
          try { topbarRoot.current.unmount(); } catch { /* already removed */ }
          topbarRoot.current = null;
        }
        topbarHost.current?.remove();
        topbarHost.current = null;
        return;
      }
      if (!topbarHost.current || !document.body.contains(topbarHost.current)) {
        const host = document.createElement('div');
        host.className = 'bes-bt-realtime-host';
        actions.prepend(host);
        topbarHost.current = host;
        topbarRoot.current = createRoot(host);
      }
      topbarRoot.current.render(
        <TopbarButton count={pending.length} live={live} language={language} onClick={() => setOpen(true)} />,
      );
    };

    renderTopbar();
    const observer = new MutationObserver(renderTopbar);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener('hashchange', renderTopbar);
    return () => {
      observer.disconnect();
      window.removeEventListener('hashchange', renderTopbar);
      if (topbarRoot.current) {
        try { topbarRoot.current.unmount(); } catch { /* already removed */ }
      }
      topbarRoot.current = null;
      topbarHost.current?.remove();
      topbarHost.current = null;
    };
  }, [canManage, pending.length, live, language]);

  if (!canManage) return null;

  return (
    <>
      {open && (
        <div className="bes-bt-alert-layer" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
          <aside className="bes-bt-alert-drawer" role="dialog" aria-modal="true" aria-label={english ? 'Pending Brian Team reviews' : 'Bài chờ duyệt trong Brian Team'}>
            <header>
              <div><span>BRIAN TEAM REALTIME</span><h2>{english ? 'Pending reviews' : 'Bài đang chờ duyệt'}</h2><p>{english ? 'Database data is authoritative; realtime delivers updates immediately.' : 'Dữ liệu cơ sở là nguồn chính; realtime chuyển thay đổi đến ngay lập tức.'}</p></div>
              <button type="button" onClick={() => setOpen(false)}><X /></button>
            </header>

            <div className="bes-bt-alert-summary">
              <span className={live ? 'is-live' : 'is-offline'}>{live ? <Radio /> : <WifiOff />}<b>{live ? (english ? 'Live' : 'Đang trực tiếp') : (english ? 'Offline' : 'Mất kết nối')}</b></span>
              <strong>{pending.length}</strong>
              <small>{english ? 'submissions awaiting review' : 'bài nộp đang chờ xử lí'}</small>
              <button type="button" onClick={() => loadRows()} disabled={loading}>{loading ? <RefreshCw className="spin" /> : <RefreshCw />}{english ? 'Refresh' : 'Làm mới'}</button>
            </div>

            {error && <div className="bes-bt-alert-error">{error}</div>}

            <div className="bes-bt-alert-list">
              {pending.length ? pending.map((item) => {
                const teacher = people.get(teacherIdOf(item));
                const name = teacher?.name || teacher?.email || (english ? 'Teacher account' : 'Tài khoản giáo viên');
                return (
                  <button type="button" key={item.id} onClick={() => openReview(item)}>
                    <i>{initials(name)}</i>
                    <span><b>{item.title || (english ? 'Untitled assignment' : 'Nhiệm vụ chưa đặt tên')}</b><small>{name} · {formatDateTime(item.submitted_at || item.updated_at, language)}</small></span>
                    <em>{english ? 'Review' : 'Duyệt'}</em>
                  </button>
                );
              }) : (
                <div className="bes-bt-alert-empty"><CheckCircle2 /><h3>{english ? 'Nothing is waiting' : 'Không có bài chờ duyệt'}</h3><p>{english ? 'New teacher submissions will appear here immediately.' : 'Bài giáo viên vừa nộp sẽ xuất hiện tại đây ngay lập tức.'}</p></div>
              )}
            </div>
          </aside>
        </div>
      )}

      {toast && (
        <div className="bes-bt-realtime-toast" role="status">
          <BellRing />
          <span><b>{english ? 'New submission' : 'Có bài nộp mới'}</b><small>{toast.title || (english ? 'Brian Team assignment' : 'Nhiệm vụ Brian Team')}</small></span>
          <button type="button" onClick={() => openReview(toast)}>{english ? 'Review' : 'Duyệt ngay'}</button>
          <button type="button" className="is-close" onClick={() => setToast(null)}><X /></button>
        </div>
      )}

      <style>{`
        .bes-bt-realtime-host{display:flex}.bes-bt-realtime-button{position:relative;display:flex!important;align-items:center;gap:7px;min-height:48px;padding:0 13px!important;border:1px solid rgba(62,77,34,.13)!important;border-radius:16px!important;background:#fff!important;color:#3a451f!important;box-shadow:0 8px 24px rgba(31,38,25,.07);font-size:.8em!important;font-weight:820!important}.bes-bt-realtime-button svg{width:18px!important;height:18px!important;color:#617123}.bes-bt-realtime-button.has-pending{border-color:rgba(176,111,15,.25)!important;background:#fff8e7!important;color:#704912!important}.bes-bt-realtime-button.has-pending svg{color:#b56f0c}.bes-bt-realtime-button>b{display:grid;place-items:center;min-width:24px;height:24px;padding:0 6px;border-radius:999px;background:#bc7210;color:#fff;font-size:.72em}
        .bes-bt-alert-layer{position:fixed;z-index:100020;inset:0;display:flex;justify-content:flex-end;background:rgba(24,30,18,.28);backdrop-filter:blur(5px)}.bes-bt-alert-drawer{display:flex;flex-direction:column;width:min(520px,100vw);height:100%;padding:22px;background:#f7f8f2;box-shadow:-24px 0 70px rgba(30,38,22,.24);font-family:var(--bes-personal-font,inherit);color:#27301d}.bes-bt-alert-drawer>header{display:flex;align-items:flex-start;justify-content:space-between;gap:20px;padding:4px 4px 20px}.bes-bt-alert-drawer>header span{font-size:.72em;font-weight:900;letter-spacing:.14em;color:#697847}.bes-bt-alert-drawer>header h2{margin:6px 0 4px;font-size:2em;letter-spacing:-.04em}.bes-bt-alert-drawer>header p{margin:0;color:#707769;font-size:.84em}.bes-bt-alert-drawer>header>button{display:grid;place-items:center;padding:9px;border:0;border-radius:12px;background:#fff;color:#49523f}
        .bes-bt-alert-summary{display:grid;grid-template-columns:auto auto 1fr auto;align-items:center;gap:11px;padding:15px;border:1px solid rgba(57,70,39,.12);border-radius:20px;background:#fff}.bes-bt-alert-summary>span{display:flex;align-items:center;gap:6px;padding:7px 10px;border-radius:999px;background:#eaf4e5;color:#35652d;font-size:.75em}.bes-bt-alert-summary>span.is-offline{background:#f1ece8;color:#7a5140}.bes-bt-alert-summary>span svg{width:16px;height:16px}.bes-bt-alert-summary>strong{font-size:1.8em}.bes-bt-alert-summary>small{color:#6f7768}.bes-bt-alert-summary>button{display:flex;align-items:center;gap:6px;min-height:38px;padding:0 11px;border:1px solid rgba(58,72,39,.13);border-radius:12px;background:#f6f8ef;color:#3c471f;font-weight:800}.bes-bt-alert-summary>button svg{width:17px;height:17px}.bes-bt-alert-error{margin-top:12px;padding:11px 13px;border-radius:13px;background:#fff0ed;color:#934338;font-size:.82em}
        .bes-bt-alert-list{display:grid;gap:9px;overflow:auto;margin-top:14px;padding:2px 2px 24px}.bes-bt-alert-list>button{display:grid;grid-template-columns:auto minmax(0,1fr) auto;align-items:center;gap:11px;width:100%;padding:13px;border:1px solid rgba(58,72,39,.11);border-radius:17px;background:#fff;color:#303a27;text-align:left}.bes-bt-alert-list>button:hover{border-color:rgba(134,155,47,.4);box-shadow:0 10px 28px rgba(38,46,29,.08)}.bes-bt-alert-list>button>i{display:grid;place-items:center;width:42px;height:42px;border-radius:14px;background:#edf2df;color:#4a581d;font-style:normal;font-weight:900}.bes-bt-alert-list>button>span{display:flex;flex-direction:column;min-width:0}.bes-bt-alert-list>button b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.bes-bt-alert-list>button small{margin-top:3px;color:#767d70;font-size:.78em}.bes-bt-alert-list>button em{padding:7px 9px;border-radius:10px;background:#fff1d3;color:#80530e;font-size:.72em;font-style:normal;font-weight:850}.bes-bt-alert-empty{display:grid;place-items:center;min-height:250px;padding:28px;border:1px dashed rgba(68,82,43,.25);border-radius:22px;background:#fff;text-align:center}.bes-bt-alert-empty svg{width:46px;height:46px;color:#768b37}.bes-bt-alert-empty h3{margin:12px 0 4px}.bes-bt-alert-empty p{max-width:330px;margin:0;color:#737a6c}
        .bes-bt-realtime-toast{position:fixed;right:24px;bottom:24px;z-index:100030;display:grid;grid-template-columns:auto minmax(0,1fr) auto auto;align-items:center;gap:11px;width:min(520px,calc(100vw - 32px));padding:14px;border:1px solid rgba(76,91,42,.16);border-radius:19px;background:#27311d;color:#fff;box-shadow:0 24px 60px rgba(27,35,20,.3);font-family:var(--bes-personal-font,inherit)}.bes-bt-realtime-toast>svg{width:24px;height:24px;color:#cddd63}.bes-bt-realtime-toast>span{display:flex;flex-direction:column}.bes-bt-realtime-toast small{margin-top:2px;color:rgba(255,255,255,.72)}.bes-bt-realtime-toast>button{min-height:36px;padding:0 12px;border:0;border-radius:11px;background:#c2d050;color:#253016;font-weight:850}.bes-bt-realtime-toast>button.is-close{display:grid;place-items:center;width:36px;padding:0;background:rgba(255,255,255,.1);color:#fff}.bes-bt-realtime-toast>button.is-close svg{width:18px;height:18px}
        @media(max-width:760px){.bes-bt-realtime-button span{display:none}.bes-bt-alert-drawer{padding:16px}.bes-bt-alert-summary{grid-template-columns:auto auto 1fr}.bes-bt-alert-summary>button{grid-column:1/-1;justify-content:center}.bes-bt-realtime-toast{right:16px;bottom:16px;grid-template-columns:auto minmax(0,1fr) auto}.bes-bt-realtime-toast>button:not(.is-close){grid-column:2/-1}.bes-bt-realtime-toast>button.is-close{grid-column:3;grid-row:1}}
      `}</style>
    </>
  );
}
