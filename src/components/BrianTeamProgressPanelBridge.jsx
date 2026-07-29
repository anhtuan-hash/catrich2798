import React, { useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import { isSupabaseConfigured, supabase } from '../utils/supabase.js';
import { rememberWorkHubItem } from '../utils/workHubDelivery.js';

const WORKSPACE_PREFIX = 'bes-brian-team-workspace-v1';
const SOURCE_MODULE = 'brian-team';
const POLL_INTERVAL = 5000;

const STATUS_ORDER = [
  'draft', 'assigned', 'accepted', 'in_progress', 'submitted',
  'changes_requested', 'approved', 'completed', 'archived',
];

function scopeOf(user) {
  return String(user?.id || user?.email || 'department-leader')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '-') || 'department-leader';
}

function workspaceKey(user) {
  return `${WORKSPACE_PREFIX}:${scopeOf(user)}`;
}

function safeRead(key, fallback) {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function unique(values = []) {
  return [...new Set((values || []).map(String).filter(Boolean))];
}

function activeDepartment(workspace) {
  return workspace?.departments?.find((item) => item.id === workspace.activeDepartmentId)
    || workspace?.departments?.[0]
    || null;
}

function statusMeta(status, language = 'vi') {
  const english = language === 'en';
  const labels = {
    draft: english ? 'Draft' : 'Nháp',
    assigned: english ? 'Assigned' : 'Đã giao',
    accepted: english ? 'Accepted' : 'Đã nhận',
    in_progress: english ? 'In progress' : 'Đang làm',
    submitted: english ? 'Submitted' : 'Đã nộp',
    changes_requested: english ? 'Needs revision' : 'Cần sửa',
    approved: english ? 'Approved' : 'Đã duyệt',
    completed: english ? 'Completed' : 'Hoàn thành',
    archived: english ? 'Archived' : 'Lưu trữ',
  };
  const tones = {
    draft: 'neutral', assigned: 'neutral', accepted: 'blue', in_progress: 'blue',
    submitted: 'amber', changes_requested: 'red', approved: 'green',
    completed: 'green', archived: 'green',
  };
  return { label: labels[status] || status, tone: tones[status] || 'neutral' };
}

function summarize(rows = []) {
  const counts = Object.fromEntries(STATUS_ORDER.map((status) => [status, 0]));
  rows.forEach((row) => {
    const status = String(row.status || 'assigned');
    counts[status] = (counts[status] || 0) + 1;
  });
  const total = rows.length;
  const assigned = (counts.draft || 0) + (counts.assigned || 0);
  const working = (counts.accepted || 0) + (counts.in_progress || 0);
  const submitted = counts.submitted || 0;
  const revision = counts.changes_requested || 0;
  const finished = (counts.approved || 0) + (counts.completed || 0) + (counts.archived || 0);
  const progress = total ? Math.round(((submitted + finished) / total) * 100) : 0;
  return { total, assigned, working, submitted, revision, finished, progress };
}

function initials(value) {
  const words = String(value || 'GV').trim().split(/\s+/).filter(Boolean);
  return words.slice(-2).map((word) => word[0]).join('').toUpperCase() || 'GV';
}

function openWorkItem(itemId) {
  if (itemId) rememberWorkHubItem(itemId);
  window.location.hash = '#/work-hub';
}

function ProgressPanel({ task, rows, people, currentUser, language }) {
  const english = language === 'en';
  const summary = summarize(rows);
  const metrics = [
    ['assigned', english ? 'Assigned' : 'Đã giao', summary.assigned],
    ['working', english ? 'Working' : 'Đang làm', summary.working],
    ['submitted', english ? 'Submitted' : 'Đã nộp', summary.submitted],
    ['revision', english ? 'Revision' : 'Cần sửa', summary.revision],
    ['finished', english ? 'Finished' : 'Hoàn thành', summary.finished],
  ];

  return (
    <section className="bes-bt-progress-panel" aria-label={english ? 'Work Hub progress' : 'Tiến độ Work Hub'}>
      <header className="bes-bt-progress-head">
        <div>
          <span>{english ? 'LIVE WORK HUB PROGRESS' : 'TIẾN ĐỘ WORK HUB TRỰC TIẾP'}</span>
          <b>{summary.total
            ? (english ? `${summary.progress}% submitted or completed` : `${summary.progress}% đã nộp hoặc hoàn thành`)
            : (english ? 'Waiting for Work Hub linkage' : 'Đang chờ tạo liên kết Work Hub')}</b>
        </div>
        <button type="button" onClick={() => openWorkItem(rows[0]?.id)} disabled={!rows.length}>
          {english ? 'Open Work Hub' : 'Mở Work Hub'}
        </button>
      </header>

      <div className="bes-bt-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow={summary.progress}>
        <i style={{ width: `${summary.progress}%` }} />
      </div>

      <div className="bes-bt-progress-metrics">
        {metrics.map(([tone, label, value]) => (
          <span key={tone} data-tone={tone}><b>{value}</b><small>{label}</small></span>
        ))}
      </div>

      {rows.length ? (
        <div className="bes-bt-assignee-progress">
          {rows.map((row) => {
            const assigneeId = String(row.metadata?.brian_team_assignee_id || row.assignee_ids?.[0] || '');
            const person = people.get(assigneeId);
            const name = assigneeId === currentUser?.id
              ? (currentUser?.name || currentUser?.email || (english ? 'You' : 'Bạn'))
              : (person?.name || person?.email || (english ? 'Teacher account' : 'Tài khoản giáo viên'));
            const meta = statusMeta(String(row.status || 'assigned'), language);
            return (
              <button
                type="button"
                key={row.id}
                className="bes-bt-assignee-pill"
                data-tone={meta.tone}
                onClick={() => openWorkItem(row.id)}
                title={english ? `Open ${name}'s work` : `Mở công việc của ${name}`}
              >
                <i>{initials(name)}</i>
                <span><b>{name}</b><small>{meta.label}</small></span>
              </button>
            );
          })}
        </div>
      ) : (
        <p className="bes-bt-progress-empty">
          {task?.assigneeIds?.length
            ? (english ? 'The assignment will appear here after Work Hub finishes creating linked tasks.' : 'Tiến độ sẽ xuất hiện sau khi Work Hub tạo xong các công việc liên kết.')
            : (english ? 'Assign at least one teacher to start tracking.' : 'Hãy giao cho ít nhất một giáo viên để bắt đầu theo dõi.')}
        </p>
      )}
    </section>
  );
}

async function loadPeople(ids = []) {
  const wanted = unique(ids);
  if (!wanted.length || !supabase) return new Map();
  const attempts = [
    ['id,full_name,email,avatar_url', 'id'],
    ['id,full_name,email', 'id'],
    ['user_id,full_name,email,avatar_url', 'user_id'],
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
          avatarUrl: profile.avatar_url || '',
        }];
      }).filter(([id]) => id));
    }
    if (!/column .* does not exist|42703/i.test(error.message || '')) break;
  }
  return new Map();
}

export default function BrianTeamProgressPanelBridge({ currentUser, language = 'vi' }) {
  const rootsRef = useRef(new Map());
  const rowsRef = useRef([]);
  const peopleRef = useRef(new Map());
  const scanFrameRef = useRef(0);

  useEffect(() => {
    if (!currentUser?.id || !isDepartmentLeaderRole(currentUser.role) || !isSupabaseConfigured || !supabase) return undefined;

    let stopped = false;
    let interval = 0;
    let loading = false;
    let rowsFingerprint = '';
    let peopleFingerprint = '';

    const cleanupStaleRoots = (activeHosts = new Set()) => {
      rootsRef.current.forEach((root, host) => {
        if (activeHosts.has(host) && document.body.contains(host)) return;
        try { root.unmount(); } catch { /* already unmounted */ }
        host.remove();
        rootsRef.current.delete(host);
      });
    };

    const renderPanels = () => {
      scanFrameRef.current = 0;
      if (stopped) return;
      const onBrianTeam = window.location.hash.includes('brian-team');
      const pageHead = [...document.querySelectorAll('.bt-page-head span')]
        .find((node) => String(node.textContent || '').trim().toUpperCase() === 'PHÂN CÔNG');
      const list = pageHead?.closest('.bt-content')?.querySelector('.bt-list') || null;
      if (!onBrianTeam || !pageHead || !list) {
        cleanupStaleRoots();
        return;
      }

      const workspace = safeRead(workspaceKey(currentUser), null);
      const department = activeDepartment(workspace);
      const tasks = department?.assignments || [];
      const articles = [...list.children].filter((node) => node.tagName === 'ARTICLE');
      const byAssignment = new Map();
      rowsRef.current.forEach((row) => {
        const assignmentId = String(row.metadata?.brian_team_assignment_id || '');
        if (!assignmentId) return;
        const bucket = byAssignment.get(assignmentId) || [];
        bucket.push(row);
        byAssignment.set(assignmentId, bucket);
      });

      const activeHosts = new Set();
      articles.forEach((article, index) => {
        const task = tasks[index];
        if (!task?.id) return;
        let host = article.querySelector('.bes-bt-progress-host');
        if (host && host.dataset.assignmentId !== String(task.id)) {
          const oldRoot = rootsRef.current.get(host);
          try { oldRoot?.unmount(); } catch { /* optional */ }
          rootsRef.current.delete(host);
          host.remove();
          host = null;
        }
        if (!host) {
          host = document.createElement('div');
          host.className = 'bes-bt-progress-host';
          host.dataset.assignmentId = String(task.id);
          article.appendChild(host);
        }
        activeHosts.add(host);
        let root = rootsRef.current.get(host);
        if (!root) {
          root = createRoot(host);
          rootsRef.current.set(host, root);
        }
        const rows = (byAssignment.get(String(task.id)) || [])
          .slice()
          .sort((left, right) => String(left.metadata?.brian_team_assignee_id || '').localeCompare(String(right.metadata?.brian_team_assignee_id || '')));
        root.render(<ProgressPanel task={task} rows={rows} people={peopleRef.current} currentUser={currentUser} language={language} />);
      });
      cleanupStaleRoots(activeHosts);
    };

    const scheduleScan = () => {
      if (scanFrameRef.current || stopped) return;
      scanFrameRef.current = window.requestAnimationFrame(renderPanels);
    };

    const loadRemote = async () => {
      if (stopped || loading || !window.location.hash.includes('brian-team')) return;
      loading = true;
      try {
        const { data, error } = await supabase
          .from('work_hub_items')
          .select('id,status,assignee_ids,metadata,updated_at')
          .eq('owner_id', currentUser.id)
          .eq('source_module', SOURCE_MODULE)
          .limit(900);
        if (error) throw error;
        const rows = data || [];
        const fingerprint = JSON.stringify(rows.map((row) => [row.id, row.status, row.updated_at, row.assignee_ids]));
        if (fingerprint !== rowsFingerprint) {
          rowsFingerprint = fingerprint;
          rowsRef.current = rows;
        }
        const assigneeIds = unique(rows.flatMap((row) => [
          row.metadata?.brian_team_assignee_id,
          ...(Array.isArray(row.assignee_ids) ? row.assignee_ids : []),
        ]));
        const nextPeopleFingerprint = assigneeIds.slice().sort().join('|');
        if (nextPeopleFingerprint !== peopleFingerprint) {
          peopleFingerprint = nextPeopleFingerprint;
          peopleRef.current = await loadPeople(assigneeIds);
        }
        scheduleScan();
      } catch {
        scheduleScan();
      } finally {
        loading = false;
      }
    };

    const observer = new MutationObserver(scheduleScan);
    observer.observe(document.body, { childList: true, subtree: true });
    const onHash = () => { scheduleScan(); loadRemote(); };
    const onFocus = () => { loadRemote(); scheduleScan(); };
    const onVisibility = () => { if (document.visibilityState === 'visible') onFocus(); };
    window.addEventListener('hashchange', onHash);
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    interval = window.setInterval(loadRemote, POLL_INTERVAL);
    loadRemote();
    scheduleScan();

    return () => {
      stopped = true;
      window.clearInterval(interval);
      if (scanFrameRef.current) window.cancelAnimationFrame(scanFrameRef.current);
      observer.disconnect();
      window.removeEventListener('hashchange', onHash);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
      cleanupStaleRoots();
    };
  }, [currentUser?.id, currentUser?.role, language]);

  return (
    <style>{`
      .bes-bt-progress-host{grid-column:2/-1;min-width:0}
      .bes-bt-progress-panel{display:grid;gap:11px;margin-top:2px;padding:14px 15px;border:1px solid color-mix(in srgb,var(--bt-accent,#B2C248) 34%,rgba(41,52,31,.14));border-radius:17px;background:linear-gradient(135deg,color-mix(in srgb,var(--bt-accent,#B2C248) 9%,#fff),#fff 72%)}
      .bes-bt-progress-head{display:flex;align-items:center;justify-content:space-between;gap:14px}.bes-bt-progress-head>div{display:flex;flex-direction:column;gap:3px}.bes-bt-progress-head span{font-size:.66em;font-weight:900;letter-spacing:.12em;color:#69734c}.bes-bt-progress-head b{font-size:.86em;color:#343d25}
      .bes-bt-progress-head button{min-height:34px;padding:0 11px;border:1px solid rgba(70,84,39,.16);border-radius:11px;background:#fff;color:#344019;font-size:.74em;font-weight:850}.bes-bt-progress-head button:disabled{cursor:default;opacity:.46}
      .bes-bt-progress-track{height:8px;overflow:hidden;border-radius:99px;background:#e9eddf}.bes-bt-progress-track i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#8fa52e,var(--bt-accent,#B2C248));transition:width .35s ease}
      .bes-bt-progress-metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:7px}.bes-bt-progress-metrics>span{display:flex;align-items:center;gap:7px;min-width:0;padding:8px 9px;border-radius:12px;background:#f5f7ef;color:#56604a}.bes-bt-progress-metrics b{font-size:1.05em}.bes-bt-progress-metrics small{overflow:hidden;font-size:.67em;font-weight:780;text-overflow:ellipsis;white-space:nowrap}.bes-bt-progress-metrics [data-tone="submitted"]{background:#fff4d8;color:#7a5311}.bes-bt-progress-metrics [data-tone="revision"]{background:#fff0ed;color:#9a4034}.bes-bt-progress-metrics [data-tone="finished"]{background:#eaf6e6;color:#35652c}
      .bes-bt-assignee-progress{display:flex;gap:7px;overflow-x:auto;padding:1px 0 2px;scrollbar-width:thin}.bes-bt-assignee-pill{display:flex!important;align-items:center;gap:8px;min-width:max-content;padding:7px 10px!important;border:1px solid rgba(58,69,42,.12)!important;border-radius:13px!important;background:#fff!important;color:#333d2b!important;text-align:left}.bes-bt-assignee-pill>i{display:grid;place-items:center;width:30px;height:30px;border-radius:10px;background:#edf1e1;color:#465421;font-size:.65em;font-style:normal;font-weight:900}.bes-bt-assignee-pill>span{display:flex;flex-direction:column}.bes-bt-assignee-pill b{max-width:180px;overflow:hidden;font-size:.75em;text-overflow:ellipsis;white-space:nowrap}.bes-bt-assignee-pill small{font-size:.64em!important;font-weight:780}.bes-bt-assignee-pill[data-tone="blue"]>i{background:#e4efff;color:#235f9b}.bes-bt-assignee-pill[data-tone="amber"]>i{background:#fff0cb;color:#835916}.bes-bt-assignee-pill[data-tone="red"]>i{background:#ffebe7;color:#9a3c31}.bes-bt-assignee-pill[data-tone="green"]>i{background:#e5f4df;color:#326528}
      .bes-bt-progress-empty{margin:0!important;color:#737b69!important;font-size:.72em!important}
      @media(max-width:900px){.bes-bt-progress-host{grid-column:1/-1}.bes-bt-progress-metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.bes-bt-progress-metrics>span:last-child{grid-column:1/-1}.bes-bt-progress-head{align-items:flex-start}.bes-bt-progress-head button{flex:0 0 auto}}
      @media(max-width:560px){.bes-bt-progress-head{display:grid}.bes-bt-progress-head button{width:100%}.bes-bt-progress-metrics{grid-template-columns:1fr}.bes-bt-progress-metrics>span:last-child{grid-column:auto}}
    `}</style>
  );
}
