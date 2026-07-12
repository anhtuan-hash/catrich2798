import React, { useEffect, useMemo, useState } from 'react';
import { getActiveAiConfig, getProviderSummary } from '../utils/aiProviders.js';
import { getSupabaseStatus, isSupabaseConfigured, supabase } from '../utils/supabase.js';
import { clearRuntimeErrors, downloadRuntimeReport, getRuntimeErrors } from '../utils/runtimeDiagnostics.js';
import { getTrashStats, purgeExpiredTrash } from '../utils/trash.js';
import { getMigrationReport } from '../utils/configMigration.js';
import { loadWorkspace } from '../utils/workspace.js';
import { listTransfers } from '../utils/contentTransfer.js';
import { listSyncQueue } from '../utils/syncQueue.js';
import { getAiGovernanceSettings, getAiUsageSummary } from '../utils/aiGovernance.js';
import { getFeatureFlags, listFeatureFlagSnapshots } from '../utils/featureFlags.js';
import { listAuditEvents } from '../utils/auditLog.js';
import { getRuntimeBuildInfo } from '../data/release.js';

function formatBytes(value) {
  const bytes = Number(value || 0);
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / (1024 ** index)).toFixed(index > 1 ? 1 : 0)} ${units[index]}`;
}

function elapsed(start) {
  return Math.max(0, Math.round(performance.now() - start));
}

async function timedCheck(name, task, timeoutMs = 7000) {
  const start = performance.now();
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    const detail = await task(controller.signal);
    return { name, ok: true, detail: detail || 'OK', latency: elapsed(start) };
  } catch (error) {
    return { name, ok: false, detail: error?.name === 'AbortError' ? 'Timeout' : (error?.message || String(error)), latency: elapsed(start) };
  } finally {
    window.clearTimeout(timer);
  }
}

async function storageCheck() {
  const key = `bes-health-${Date.now()}`;
  localStorage.setItem(key, 'ok');
  const ok = localStorage.getItem(key) === 'ok';
  localStorage.removeItem(key);
  if (!ok) throw new Error('Local storage read/write failed');
  const estimate = await navigator.storage?.estimate?.();
  return estimate ? `${formatBytes(estimate.usage)} / ${formatBytes(estimate.quota)}` : 'Read/write OK';
}

async function supabaseCheck() {
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase environment is not configured');
  const { error } = await supabase.auth.getSession();
  if (error) throw error;
  return 'Auth session endpoint responded';
}

async function newsroomCheck(signal) {
  const response = await fetch('/api/news-feed?language=en&category=top&limit=1', { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const payload = await response.json();
  const count = Array.isArray(payload?.items) ? payload.items.length : 0;
  return `${count} item${count === 1 ? '' : 's'} returned`;
}

async function uploadGatewayCheck(signal) {
  const response = await fetch('/api/upload-validate', {
    method: 'POST', signal, headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'health-check.pdf', type: 'application/pdf', size: 1024, allowedKinds: ['document'] }),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload.ok) throw new Error(payload.error || `HTTP ${response.status}`);
  return `${payload.kind} · ${payload.serverValidated ? 'server validated' : 'validated'}`;
}


export default function SystemHealthCenter({ language = 'vi', currentUser }) {
  const [rows, setRows] = useState([]);
  const [running, setRunning] = useState(false);
  const [lastRun, setLastRun] = useState(null);
  const [errors, setErrors] = useState(() => getRuntimeErrors());
  const ai = useMemo(() => ({ ...getProviderSummary(), active: getActiveAiConfig() }), []);
  const supabaseStatus = getSupabaseStatus();
  const trashStats = getTrashStats();
  const migrationReport = getMigrationReport();
  const workspaceStats = loadWorkspace(currentUser);
  const transferStats = listTransfers(currentUser);
  const syncStats = listSyncQueue(currentUser);
  const aiGovernance = getAiGovernanceSettings();
  const aiUsage = getAiUsageSummary();
  const release = getRuntimeBuildInfo();
  const featureFlags = getFeatureFlags();
  const flagSnapshots = listFeatureFlagSnapshots();
  const auditEvents = listAuditEvents({ limit: 500 });

  const run = async () => {
    setRunning(true);
    const basic = [
      { name: language === 'vi' ? 'Kết nối mạng' : 'Network', ok: navigator.onLine, detail: navigator.onLine ? 'Online' : 'Offline', latency: 0 },
      { name: language === 'vi' ? 'AI provider' : 'AI provider', ok: Boolean(ai.hasKey), detail: ai.hasKey ? `${ai.providerName} · ${ai.active?.model || 'default model'}` : (language === 'vi' ? 'Chưa cấu hình API key' : 'API key not configured'), latency: 0 },
      { name: language === 'vi' ? 'Cấu hình Supabase' : 'Supabase config', ok: supabaseStatus.configured, detail: supabaseStatus.configured ? 'Environment variables present' : 'Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY', latency: 0 },
      { name: language === 'vi' ? 'Di chuyển cấu hình' : 'Configuration migration', ok: Boolean(migrationReport), detail: migrationReport ? `${migrationReport.results?.filter((item) => item.status === 'migrated').length || 0} migrated · ${migrationReport.results?.filter((item) => item.status === 'failed').length || 0} failed` : 'No migration report', latency: 0 },
      { name: language === 'vi' ? 'Phiên bản phát hành' : 'Release version', ok: release.version === '10.87.0', detail: `V${release.version} · ${release.commit}`, latency: 0 },
      { name: 'Feature Flags', ok: Object.keys(featureFlags.flags || {}).length >= 8, detail: `${Object.values(featureFlags.flags || {}).filter((value) => value !== 'off').length}/${Object.keys(featureFlags.flags || {}).length} enabled · ${flagSnapshots.length} rollback points`, latency: 0 },
      { name: language === 'vi' ? 'Quản trị AI' : 'AI Governance', ok: aiGovernance.enabled && aiUsage.requests < aiGovernance.dailyRequestLimit && aiUsage.tokenTotal < aiGovernance.dailyTokenBudget, detail: aiGovernance.enabled ? `${aiUsage.requests}/${aiGovernance.dailyRequestLimit} requests · ${aiUsage.tokenTotal}/${aiGovernance.dailyTokenBudget} tokens` : (language === 'vi' ? 'AI đang bị tạm dừng bởi Admin' : 'AI is paused by Admin'), latency: 0 },
    ];
    const asyncRows = await Promise.all([
      timedCheck(language === 'vi' ? 'Bộ nhớ trình duyệt' : 'Browser storage', () => storageCheck(), 3500),
      timedCheck('Supabase Auth', () => supabaseCheck(), 6500),
      timedCheck(language === 'vi' ? 'Newsroom RSS API' : 'Newsroom RSS API', (signal) => newsroomCheck(signal), 9000),
      timedCheck('Upload Security Gateway', (signal) => uploadGatewayCheck(signal), 5000),
    ]);
    const performanceRow = (() => {
      const nav = performance.getEntriesByType?.('navigation')?.[0];
      const loadMs = nav ? Math.round(nav.loadEventEnd || nav.domContentLoadedEventEnd || 0) : 0;
      return { name: language === 'vi' ? 'Hiệu suất trang' : 'Page performance', ok: !loadMs || loadMs < 5000, detail: loadMs ? `${loadMs} ms initial load` : 'Timing unavailable', latency: loadMs };
    })();
    setRows([...basic, ...asyncRows, performanceRow]);
    setLastRun(new Date());
    setErrors(getRuntimeErrors());
    setRunning(false);
  };

  useEffect(() => { run(); }, []);

  const passed = rows.filter((row) => row.ok).length;
  const health = rows.length ? Math.round((passed / rows.length) * 100) : 0;

  return (
    <div className="page bes-health-page">
      <button className="back-btn" onClick={() => window.history.back()}>← {language === 'vi' ? 'Quay lại' : 'Back'}</button>
      <section className="bes-health-hero">
        <div>
          <span>V10.87 · RELEASE, SECURITY & PERFORMANCE</span>
          <h1>{language === 'vi' ? 'Trung tâm trạng thái hệ thống' : 'System Health Center'}</h1>
          <p>{language === 'vi' ? 'Kiểm tra nhanh kết nối, lưu trữ, AI, Supabase, Newsroom và các lỗi giao diện gần đây.' : 'Check connectivity, storage, AI, Supabase, Newsroom and recent UI errors.'}</p>
          <div className="bes-health-actions">
            <button type="button" className="primary" onClick={run} disabled={running}>{running ? (language === 'vi' ? 'Đang kiểm tra…' : 'Checking…') : (language === 'vi' ? 'Chạy kiểm tra lại' : 'Run checks')}</button>
            <button type="button" onClick={() => downloadRuntimeReport({ checks: rows, user: { id: currentUser?.id, email: currentUser?.email } })}>{language === 'vi' ? 'Tải báo cáo' : 'Download report'}</button>
            <button type="button" onClick={() => { clearRuntimeErrors(); setErrors([]); }}>{language === 'vi' ? 'Xóa nhật ký lỗi' : 'Clear error log'}</button>
          </div>
        </div>
        <div className={`bes-health-score ${health >= 80 ? 'is-good' : health >= 55 ? 'is-warn' : 'is-bad'}`}>
          <strong>{health}%</strong>
          <span>{passed}/{rows.length || 0} {language === 'vi' ? 'hạng mục đạt' : 'checks passed'}</span>
          {lastRun ? <small>{lastRun.toLocaleTimeString(language === 'vi' ? 'vi-VN' : 'en-US')}</small> : null}
        </div>
      </section>

      <section className="bes-health-grid">
        <article className="bes-health-card wide">
          <header><div><span>01</span><h2>{language === 'vi' ? 'Dịch vụ và thiết bị' : 'Services and device'}</h2></div></header>
          <div className="bes-health-checks">
            {rows.map((row) => (
              <div key={row.name} className={`bes-health-row ${row.ok ? 'ok' : 'fail'}`}>
                <span>{row.ok ? '✓' : '!'}</span>
                <div><strong>{row.name}</strong><small>{row.detail}</small></div>
                <b>{row.latency ? `${row.latency} ms` : '—'}</b>
              </div>
            ))}
          </div>
        </article>

        <article className="bes-health-card">
          <header><div><span>02</span><h2>{language === 'vi' ? 'Bộ nhớ và khôi phục' : 'Storage and recovery'}</h2></div></header>
          <dl>
            <div><dt>{language === 'vi' ? 'Thùng rác' : 'Trash'}</dt><dd>{trashStats.count}</dd></div>
            <div><dt>{language === 'vi' ? 'Dung lượng thùng rác' : 'Trash storage'}</dt><dd>{formatBytes(trashStats.bytes)}</dd></div>
            <div><dt>{language === 'vi' ? 'Thời hạn giữ' : 'Retention'}</dt><dd>{trashStats.retentionDays} days</dd></div>
            <div><dt>{language === 'vi' ? 'Lỗi đã ghi' : 'Logged errors'}</dt><dd>{errors.length}</dd></div>
            <div><dt>{language === 'vi' ? 'Tab đang mở' : 'Open tabs'}</dt><dd>{workspaceStats.tabs.length}</dd></div>
            <div><dt>{language === 'vi' ? 'Nội dung liên ứng dụng' : 'Cross-app items'}</dt><dd>{transferStats.filter((item) => item.status === 'pending').length}</dd></div>
            <div><dt>{language === 'vi' ? 'Chờ đồng bộ' : 'Sync queue'}</dt><dd>{syncStats.filter((item) => item.status !== 'completed').length}</dd></div>
            <div><dt>{language === 'vi' ? 'Yêu cầu AI hôm nay' : 'AI requests today'}</dt><dd>{aiUsage.requests}</dd></div>
            <div><dt>{language === 'vi' ? 'Hành động AI' : 'AI actions'}</dt><dd>{aiUsage.actions}</dd></div>
            <div><dt>Feature Flags</dt><dd>{Object.values(featureFlags.flags || {}).filter((value) => value !== 'off').length}</dd></div>
            <div><dt>{language === 'vi' ? 'Điểm rollback' : 'Rollback points'}</dt><dd>{flagSnapshots.length}</dd></div>
            <div><dt>{language === 'vi' ? 'Sự kiện audit' : 'Audit events'}</dt><dd>{auditEvents.length}</dd></div>
          </dl>
          <div className="bes-health-card-actions">
            <button type="button" onClick={() => { purgeExpiredTrash(); window.location.hash = '#/trash'; }}>{language === 'vi' ? 'Mở thùng rác' : 'Open trash'}</button>
            {currentUser?.role === 'admin' ? <>
              <button type="button" onClick={() => { window.location.hash = '#/updates'; }}>{language === 'vi' ? 'Mở trung tâm cập nhật' : 'Open Update Center'}</button>
              <button type="button" onClick={() => { window.location.hash = '#/ai-governance'; }}>{language === 'vi' ? 'Mở quản trị AI' : 'Open AI Governance'}</button>
            </> : null}
          </div>
        </article>

        <article className="bes-health-card">
          <header><div><span>03</span><h2>{language === 'vi' ? 'Nhật ký lỗi gần đây' : 'Recent errors'}</h2></div></header>
          <div className="bes-error-log">
            {errors.length ? errors.slice(0, 6).map((item) => (
              <details key={item.id}>
                <summary><b>{item.scope}</b><span>{new Date(item.createdAt).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US')}</span></summary>
                <p>{item.message}</p>
              </details>
            )) : <p>{language === 'vi' ? 'Chưa ghi nhận lỗi runtime.' : 'No runtime errors recorded.'}</p>}
          </div>
        </article>
      </section>
    </div>
  );
}
