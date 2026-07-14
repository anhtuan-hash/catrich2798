import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { diagnoseRuntime, getRuntimeState, subscribeRuntime } from '../services/runtime/core.js';
import { isLeader, formatDate, downloadText } from './v1093/shared.js';
import {
  approveCloudJob,
  cancelCloudJob,
  loadCloudOperationsState,
  retryCloudJob,
  runCloudWorker,
  saveDigestPreferences,
  subscribeCloudOperations,
} from '../utils/cloudOperations.js';

const copy = {
  vi: {
    eyebrow: 'CLOUD OPERATIONS · V10.97', title: 'Tự động hóa nền 24/7',
    intro: 'Hàng đợi bền vững, lịch máy chủ, retry có kiểm soát, digest và nhật ký chuyển giao cho toàn hệ thống.',
    run: 'Chạy worker ngay', refresh: 'Làm mới', export: 'Xuất báo cáo', overview: 'Tổng quan', jobs: 'Hàng đợi', deliveries: 'Chuyển giao', digest: 'Bản tin', diagnostics: 'Chẩn đoán',
    queued: 'Đang chờ', approval: 'Chờ duyệt', failed: 'Thất bại', success: 'Hoàn tất 24 giờ',
    worker: 'Worker nền', scheduler: 'Lịch máy chủ', lastSeen: 'Nhịp gần nhất', mode: 'Chế độ dữ liệu',
    active: 'Hoạt động', inactive: 'Chưa hoạt động', installed: 'Đã cài', unavailable: 'Chưa cài migration', cloud: 'Supabase cloud', local: 'Local fallback',
    approve: 'Duyệt & chạy', retry: 'Chạy lại', cancel: 'Hủy', emptyJobs: 'Chưa có công việc trong hàng đợi.', emptyDelivery: 'Chưa có bản ghi chuyển giao.',
    rule: 'Quy tắc', status: 'Trạng thái', attempts: 'Lần thử', time: 'Thời gian', action: 'Hành động', channel: 'Kênh', content: 'Nội dung',
    digestTitle: 'Thiết lập bản tin vận hành', digestText: 'Tổng hợp công việc hoàn tất, thất bại và chờ duyệt thành một bản tin trong ứng dụng.', enabled: 'Bật bản tin', cadence: 'Chu kỳ', daily: 'Hằng ngày', weekly: 'Hằng tuần', deliveryTime: 'Giờ tạo', timezone: 'Múi giờ', includeSummary: 'Tóm tắt hoạt động', includeFailures: 'Lỗi cần xử lý', includePending: 'Việc chờ duyệt', save: 'Lưu thiết lập',
    serverNote: 'V10.97 sử dụng Supabase Cron. Quy tắc tiếp tục chạy ngay cả khi trình duyệt và PWA đã đóng.',
    approvalNote: 'Hành động nhạy cảm vẫn dừng ở hàng chờ và chỉ chạy sau khi Admin/TTCM phê duyệt.',
    runtime: 'Runtime Core', userRole: 'Vai trò', realtime: 'Realtime channels', online: 'Mạng', db: 'Kho dữ liệu', cron: 'Cron job',
    successMessage: 'Worker đã chạy thành công.', saved: 'Đã lưu thiết lập bản tin.',
  },
  en: {
    eyebrow: 'CLOUD OPERATIONS · V10.97', title: '24/7 background automation',
    intro: 'Durable queues, server schedules, controlled retries, digests and delivery logs across the platform.',
    run: 'Run worker now', refresh: 'Refresh', export: 'Export report', overview: 'Overview', jobs: 'Queue', deliveries: 'Deliveries', digest: 'Digest', diagnostics: 'Diagnostics',
    queued: 'Queued', approval: 'Pending approval', failed: 'Failed', success: 'Completed in 24h',
    worker: 'Background worker', scheduler: 'Server scheduler', lastSeen: 'Last heartbeat', mode: 'Data mode',
    active: 'Active', inactive: 'Inactive', installed: 'Installed', unavailable: 'Migration not installed', cloud: 'Supabase cloud', local: 'Local fallback',
    approve: 'Approve & run', retry: 'Retry', cancel: 'Cancel', emptyJobs: 'No jobs in the queue.', emptyDelivery: 'No delivery records yet.',
    rule: 'Rule', status: 'Status', attempts: 'Attempts', time: 'Time', action: 'Action', channel: 'Channel', content: 'Content',
    digestTitle: 'Operations digest settings', digestText: 'Combine completed, failed and pending jobs into an in-app digest.', enabled: 'Enable digest', cadence: 'Cadence', daily: 'Daily', weekly: 'Weekly', deliveryTime: 'Delivery time', timezone: 'Time zone', includeSummary: 'Activity summary', includeFailures: 'Failures requiring attention', includePending: 'Pending approvals', save: 'Save settings',
    serverNote: 'V10.97 uses Supabase Cron. Rules keep running even when the browser and PWA are closed.',
    approvalNote: 'Sensitive actions still pause in the approval queue until an Admin or Department Head approves them.',
    runtime: 'Runtime Core', userRole: 'Role', realtime: 'Realtime channels', online: 'Network', db: 'Data store', cron: 'Cron job',
    successMessage: 'Worker completed successfully.', saved: 'Digest settings saved.',
  },
};

const emptyState = { jobs: [], deliveries: [], heartbeat: null, digest: {}, status: {}, mode: 'local' };

function statusLabel(status, lang) {
  const labels = {
    vi: { queued: 'Đang chờ', claimed: 'Đã nhận', processing: 'Đang chạy', pending_approval: 'Chờ duyệt', success: 'Thành công', failed: 'Thất bại', dead: 'Ngừng thử', cancelled: 'Đã hủy', ready: 'Sẵn sàng', delivered: 'Đã chuyển' },
    en: { queued: 'Queued', claimed: 'Claimed', processing: 'Processing', pending_approval: 'Pending approval', success: 'Success', failed: 'Failed', dead: 'Dead letter', cancelled: 'Cancelled', ready: 'Ready', delivered: 'Delivered' },
  };
  return labels[lang]?.[status] || status || '—';
}

export default function CloudOperations({ currentUser, language = 'vi' }) {
  const lang = language === 'en' ? 'en' : 'vi';
  const t = copy[lang];
  const leader = isLeader(currentUser);
  const [tab, setTab] = useState('overview');
  const [state, setState] = useState(emptyState);
  const [runtime, setRuntime] = useState(getRuntimeState());
  const [runtimeReport, setRuntimeReport] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setError('');
    try {
      const next = await loadCloudOperationsState(currentUser);
      setState(next);
      setRuntimeReport(await diagnoseRuntime());
    } catch (loadError) {
      setError(loadError?.message || String(loadError));
    }
  }, [currentUser?.id]);

  useEffect(() => subscribeRuntime(setRuntime), []);
  useEffect(() => { load(); }, [load]);
  useEffect(() => subscribeCloudOperations(currentUser, () => load()), [currentUser?.id, load]);

  const metrics = useMemo(() => {
    const since = Date.now() - 24 * 60 * 60 * 1000;
    return {
      queued: state.jobs.filter((item) => ['queued', 'claimed', 'processing'].includes(item.status)).length,
      approval: state.jobs.filter((item) => item.status === 'pending_approval').length,
      failed: state.jobs.filter((item) => ['failed', 'dead'].includes(item.status)).length,
      success: state.jobs.filter((item) => item.status === 'success' && new Date(item.finished_at || item.updated_at).getTime() >= since).length,
    };
  }, [state.jobs]);

  const act = async (operation, successMessage = '') => {
    setBusy(true); setError(''); setMessage('');
    try { await operation(); if (successMessage) setMessage(successMessage); await load(); }
    catch (actionError) { setError(actionError?.message || String(actionError)); }
    finally { setBusy(false); }
  };

  const saveDigest = (event) => {
    event.preventDefault();
    act(() => saveDigestPreferences(state.digest, currentUser), t.saved);
  };

  const exportReport = () => downloadText(`cloud-operations-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ exportedAt: new Date().toISOString(), runtime: runtimeReport, ...state }, null, 2), 'application/json');

  const heartbeatAge = state.heartbeat?.last_seen_at ? Date.now() - new Date(state.heartbeat.last_seen_at).getTime() : Infinity;
  const workerActive = heartbeatAge < 15 * 60 * 1000;
  const cloudInstalled = state.mode === 'cloud' || state.status?.available;

  return <section className="v1097-page">
    <header className="v1097-hero">
      <div><span>{t.eyebrow}</span><h1>{t.title}</h1><p>{t.intro}</p></div>
      <div className="v1097-hero-actions">{leader && <button className="primary" disabled={busy || !cloudInstalled} onClick={() => act(() => runCloudWorker(currentUser), t.successMessage)}>{busy ? '…' : t.run}</button>}<button onClick={load}>{t.refresh}</button><button onClick={exportReport}>{t.export}</button></div>
    </header>

    {error && <div className="v1097-alert error"><b>!</b><span>{error}</span><button onClick={() => setError('')}>×</button></div>}
    {message && <div className="v1097-alert success"><b>✓</b><span>{message}</span><button onClick={() => setMessage('')}>×</button></div>}

    <div className="v1097-metrics"><article><strong>{metrics.queued}</strong><span>{t.queued}</span></article><article><strong>{metrics.approval}</strong><span>{t.approval}</span></article><article><strong>{metrics.failed}</strong><span>{t.failed}</span></article><article><strong>{metrics.success}</strong><span>{t.success}</span></article></div>

    <nav className="v1097-tabs">{[['overview', t.overview], ['jobs', t.jobs], ['deliveries', t.deliveries], ['digest', t.digest], ['diagnostics', t.diagnostics]].map(([id, label]) => <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}</nav>

    {tab === 'overview' && <div className="v1097-overview-grid">
      <section className="v1097-panel"><header><div><span>WORKER</span><h2>{t.worker}</h2></div><em data-ok={workerActive}>{workerActive ? t.active : t.inactive}</em></header><div className="v1097-status-list"><article><b>{t.scheduler}</b><span>{state.status?.scheduler ? t.active : cloudInstalled ? t.installed : t.unavailable}</span></article><article><b>{t.lastSeen}</b><span>{state.heartbeat?.last_seen_at ? formatDate(state.heartbeat.last_seen_at) : '—'}</span></article><article><b>{t.mode}</b><span>{state.mode === 'cloud' ? t.cloud : t.local}</span></article><article><b>{t.cron}</b><span>{state.status?.cron_job_name || 'bes-v1097-worker'}</span></article></div></section>
      <section className="v1097-panel"><header><div><span>GOVERNANCE</span><h2>24/7 + Approval Gate</h2></div></header><div className="v1097-note success">{t.serverNote}</div><div className="v1097-note warning">{t.approvalNote}</div><div className="v1097-mini-chart">{['success', 'pending_approval', 'failed', 'queued'].map((status) => { const count = state.jobs.filter((item) => item.status === status).length; const max = Math.max(1, state.jobs.length); return <div key={status}><span>{statusLabel(status, lang)}</span><i style={{ '--value': `${Math.max(4, Math.round(count / max * 100))}%` }} /><b>{count}</b></div>; })}</div></section>
      <section className="v1097-panel wide"><header><div><span>RECENT QUEUE</span><h2>{t.jobs}</h2></div><button onClick={() => setTab('jobs')}>{t.jobs}</button></header><JobTable jobs={state.jobs.slice(0, 8)} leader={leader} busy={busy} lang={lang} t={t} onApprove={(id) => act(() => approveCloudJob(id), t.successMessage)} onRetry={(id) => act(() => retryCloudJob(id), t.successMessage)} onCancel={(id) => act(() => cancelCloudJob(id))} /></section>
    </div>}

    {tab === 'jobs' && <section className="v1097-panel"><header><div><span>DURABLE QUEUE</span><h2>{state.jobs.length} {t.jobs.toLowerCase()}</h2></div><button onClick={load}>{t.refresh}</button></header><JobTable jobs={state.jobs} leader={leader} busy={busy} lang={lang} t={t} onApprove={(id) => act(() => approveCloudJob(id), t.successMessage)} onRetry={(id) => act(() => retryCloudJob(id), t.successMessage)} onCancel={(id) => act(() => cancelCloudJob(id))} /></section>}

    {tab === 'deliveries' && <section className="v1097-panel"><header><div><span>DELIVERY LOG</span><h2>{state.deliveries.length} {t.deliveries.toLowerCase()}</h2></div></header><div className="v1097-delivery-list">{state.deliveries.map((item) => <article key={item.id}><span className="channel">{item.channel}</span><div><b>{item.title}</b><p>{item.body || '—'}</p><small>{formatDate(item.created_at)}{item.route ? ` · #/${item.route}` : ''}</small></div><em className={item.status}>{statusLabel(item.status, lang)}</em></article>)}</div>{!state.deliveries.length && <div className="v1097-empty">{t.emptyDelivery}</div>}</section>}

    {tab === 'digest' && <form className="v1097-panel v1097-digest" onSubmit={saveDigest}><header><div><span>OPERATIONS DIGEST</span><h2>{t.digestTitle}</h2><p>{t.digestText}</p></div></header><label className="toggle"><input type="checkbox" checked={state.digest?.enabled !== false} onChange={(e) => setState((old) => ({ ...old, digest: { ...old.digest, enabled: e.target.checked } }))}/><span>{t.enabled}</span></label><div className="v1097-form-grid"><label>{t.cadence}<select value={state.digest?.cadence || 'daily'} onChange={(e) => setState((old) => ({ ...old, digest: { ...old.digest, cadence: e.target.value } }))}><option value="daily">{t.daily}</option><option value="weekly">{t.weekly}</option></select></label><label>{t.deliveryTime}<input type="time" value={state.digest?.delivery_time || '17:00'} onChange={(e) => setState((old) => ({ ...old, digest: { ...old.digest, delivery_time: e.target.value } }))}/></label><label>{t.timezone}<input value={state.digest?.timezone || 'Asia/Ho_Chi_Minh'} onChange={(e) => setState((old) => ({ ...old, digest: { ...old.digest, timezone: e.target.value } }))}/></label></div><div className="v1097-checks"><label><input type="checkbox" checked={state.digest?.include_summary !== false} onChange={(e) => setState((old) => ({ ...old, digest: { ...old.digest, include_summary: e.target.checked } }))}/>{t.includeSummary}</label><label><input type="checkbox" checked={state.digest?.include_failures !== false} onChange={(e) => setState((old) => ({ ...old, digest: { ...old.digest, include_failures: e.target.checked } }))}/>{t.includeFailures}</label><label><input type="checkbox" checked={state.digest?.include_pending !== false} onChange={(e) => setState((old) => ({ ...old, digest: { ...old.digest, include_pending: e.target.checked } }))}/>{t.includePending}</label></div><button className="primary large" type="submit" disabled={busy}>{t.save}</button></form>}

    {tab === 'diagnostics' && <div className="v1097-diagnostics-grid"><section className="v1097-panel"><header><div><span>RUNTIME</span><h2>{t.diagnostics}</h2></div></header><div className="v1097-status-list"><article><b>{t.runtime}</b><span>{runtimeReport?.runtimeVersion || runtime.version || '1.4.0'}</span></article><article><b>Supabase</b><span>{runtimeReport?.ready ? t.active : runtimeReport?.configured ? t.inactive : t.local}</span></article><article><b>{t.userRole}</b><span>{runtimeReport?.role || runtime.role}</span></article><article><b>{t.realtime}</b><span>{runtimeReport?.realtimeChannels ?? 0}</span></article><article><b>{t.online}</b><span>{navigator.onLine ? 'Online' : 'Offline'}</span></article><article><b>{t.db}</b><span>{state.mode}</span></article></div></section><section className="v1097-panel"><header><div><span>HEARTBEAT</span><h2>{t.worker}</h2></div></header><pre>{JSON.stringify({ heartbeat: state.heartbeat, status: state.status }, null, 2)}</pre></section></div>}
  </section>;
}

function JobTable({ jobs, leader, busy, lang, t, onApprove, onRetry, onCancel }) {
  if (!jobs.length) return <div className="v1097-empty">{t.emptyJobs}</div>;
  return <div className="v1097-job-table"><header><span>{t.rule}</span><span>{t.status}</span><span>{t.attempts}</span><span>{t.time}</span><span>{t.action}</span></header>{jobs.map((job) => <article key={job.id}><span><b>{job.rule_name}</b>{job.last_error && <small>{job.last_error}</small>}</span><span><em className={job.status}>{statusLabel(job.status, lang)}</em></span><span>{job.attempts}/{job.max_attempts}</span><span>{formatDate(job.created_at)}</span><span className="actions">{job.status === 'pending_approval' && leader && <button className="primary" disabled={busy} onClick={() => onApprove(job.id)}>{t.approve}</button>}{['failed', 'dead'].includes(job.status) && leader && <button disabled={busy} onClick={() => onRetry(job.id)}>{t.retry}</button>}{['queued', 'pending_approval', 'failed'].includes(job.status) && <button className="danger" disabled={busy} onClick={() => onCancel(job.id)}>{t.cancel}</button>}</span></article>)}</div>;
}
