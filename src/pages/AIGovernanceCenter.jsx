import React, { useEffect, useMemo, useState } from 'react';
import {
  AI_GOVERNANCE_EVENT,
  clearAiAudit,
  exportAiGovernanceReport,
  getAiGovernanceSettings,
  getAiObservabilitySummary,
  getAiUsageDays,
  getAiUsageSummary,
  readAiAudit,
  resetAiGovernanceSettings,
  resetAiUsage,
  saveAiGovernanceSettings,
  syncAiGovernanceSettingsFromCloud,
} from '../utils/aiGovernance.js';
import {
  AI_RUNTIME_EVENT,
  clearAiRuntimeCache,
  getAiRuntimeSnapshot,
  resetAiProviderCircuits,
  resetAiRuntimeSession,
} from '../utils/aiRuntimeManager.js';
import {
  AI_GOVERNANCE_CLOUD_EVENT,
  clearAiGovernanceCloudQueue,
  fetchAiGovernanceCloudDashboard,
  flushAiGovernanceCloudQueue,
  getAiGovernanceCloudStatus,
} from '../utils/aiGovernanceCloud.js';
import { getAiPromptRegistrySummary, listAiPromptDefinitions } from '../utils/aiPromptRegistry.js';
import {
  AI_TASK_RUNTIME_EVENT,
  getAiTaskRuntimeMetrics,
  resetAiTaskRuntimeMetrics,
} from '../utils/aiTaskRuntime.js';

const ACTION_TARGETS = [
  ['current-app', 'Ứng dụng hiện tại', 'Current app'],
  ['worksheet-factory', 'Worksheet Factory', 'Worksheet Factory'],
  ['exam-studio', 'Exam Studio', 'Exam Studio'],
  ['word2graph', 'WordGraph Studio', 'WordGraph Studio'],
  ['textlab-activities', 'TextLab Activities', 'TextLab Activities'],
  ['library', 'Thư viện', 'Library'],
];

const PROFILE_LABELS = {
  chat: ['Brian AI Chat', 'Brian AI Chat'],
  worksheet: ['Worksheet Factory', 'Worksheet Factory'],
  document: ['Phân tích tài liệu', 'Document analysis'],
  administration: ['Hành chính – chuyên môn', 'School administration'],
  diagnostic: ['Kiểm tra kết nối provider', 'Provider connection test'],
  default: ['Mặc định', 'Default'],
};

function formatNumber(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value) || 0);
}

function percent(value) {
  return `${Math.min(100, Math.max(0, Number(value) || 0))}%`;
}

function formatMs(value) {
  const ms = Math.max(0, Number(value) || 0);
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)} s`;
}

function MetricBars({ rows = [], emptyLabel = 'No data' }) {
  const max = Math.max(1, ...rows.map((item) => Number(item.value) || 0));
  if (!rows.length) return <p className="ai-gov-empty">{emptyLabel}</p>;
  return <div className="ai-gov-observability-bars">{rows.map((item) => <div className="ai-gov-observability-row" key={item.id}><span title={item.id}>{item.id}</span><i><b style={{ width: `${Math.max(4, Math.round(((Number(item.value) || 0) / max) * 100))}%` }}/></i><em>{formatNumber(item.value)}</em></div>)}</div>;
}

function downloadJson(filename, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function AIGovernanceCenter({ language = 'vi', currentUser = null }) {
  const vi = language === 'vi';
  const [settings, setSettings] = useState(getAiGovernanceSettings);
  const [summary, setSummary] = useState(getAiUsageSummary);
  const [observability, setObservability] = useState(getAiObservabilitySummary);
  const [days, setDays] = useState(getAiUsageDays);
  const [audit, setAudit] = useState(readAiAudit);
  const [runtime, setRuntime] = useState(() => getAiRuntimeSnapshot(getAiGovernanceSettings().runtime));
  const [filter, setFilter] = useState('all');
  const [saved, setSaved] = useState(false);
  const [cloudStatus, setCloudStatus] = useState(getAiGovernanceCloudStatus);
  const [cloudDashboard, setCloudDashboard] = useState(null);
  const [cloudBusy, setCloudBusy] = useState(false);
  const [taskMetrics, setTaskMetrics] = useState(getAiTaskRuntimeMetrics);
  const promptRegistrySummary = useMemo(() => getAiPromptRegistrySummary(), []);
  const promptDefinitions = useMemo(() => listAiPromptDefinitions(), []);

  const refresh = () => {
    setSettings(getAiGovernanceSettings());
    setSummary(getAiUsageSummary());
    setObservability(getAiObservabilitySummary());
    setDays(getAiUsageDays());
    setAudit(readAiAudit());
    const currentSettings = getAiGovernanceSettings();
    setRuntime(getAiRuntimeSnapshot(currentSettings.runtime));
    setCloudStatus(getAiGovernanceCloudStatus());
    setTaskMetrics(getAiTaskRuntimeMetrics());
  };

  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener(AI_GOVERNANCE_EVENT, onUpdate);
    window.addEventListener(AI_RUNTIME_EVENT, onUpdate);
    window.addEventListener(AI_GOVERNANCE_CLOUD_EVENT, onUpdate);
    window.addEventListener(AI_TASK_RUNTIME_EVENT, onUpdate);
    const timer = window.setInterval(refresh, 5000);
    return () => { window.removeEventListener(AI_GOVERNANCE_EVENT, onUpdate); window.removeEventListener(AI_RUNTIME_EVENT, onUpdate); window.removeEventListener(AI_GOVERNANCE_CLOUD_EVENT, onUpdate); window.removeEventListener(AI_TASK_RUNTIME_EVENT, onUpdate); window.clearInterval(timer); };
  }, []);

  const filteredAudit = useMemo(() => audit.filter((item) => filter === 'all' || item.type === filter || item.status === filter).slice(0, 120), [audit, filter]);
  const providerRows = useMemo(() => Object.entries(summary.providers || {}).sort((a, b) => b[1] - a[1]), [summary.providers]);

  const patch = (next) => setSettings((current) => ({ ...current, ...next }));
  const save = () => {
    setSettings(saveAiGovernanceSettings(settings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  const syncCloud = async () => {
    setCloudBusy(true);
    await flushAiGovernanceCloudQueue({ force: true });
    const dashboard = await fetchAiGovernanceCloudDashboard(14);
    if (dashboard) setCloudDashboard(dashboard);
    setCloudStatus(getAiGovernanceCloudStatus());
    setCloudBusy(false);
  };

  const pullCloudSettings = async () => {
    setCloudBusy(true);
    const next = await syncAiGovernanceSettingsFromCloud();
    if (next) setSettings(next);
    const dashboard = await fetchAiGovernanceCloudDashboard(14);
    if (dashboard) setCloudDashboard(dashboard);
    setCloudStatus(getAiGovernanceCloudStatus());
    setCloudBusy(false);
  };

  useEffect(() => {
    if (currentUser?.role !== 'admin' || !getAiGovernanceCloudStatus().configured) return;
    let active = true;
    void flushAiGovernanceCloudQueue().then(() => fetchAiGovernanceCloudDashboard(14)).then((dashboard) => {
      if (active && dashboard) setCloudDashboard(dashboard);
      if (active) setCloudStatus(getAiGovernanceCloudStatus());
    });
    return () => { active = false; };
  }, [currentUser?.id, currentUser?.email, currentUser?.role]);

  if (currentUser?.role !== 'admin') {
    return <div className="page narrow"><section className="metro-panel empty-state"><h1>{vi ? 'Chỉ Admin được truy cập' : 'Admin access only'}</h1><p>{vi ? 'Trung tâm quản trị AI chứa giới hạn và nhật ký toàn hệ thống.' : 'AI Governance contains system-wide limits and audit logs.'}</p></section></div>;
  }

  return (
    <div className="ai-governance-page bui-management" data-ui="management" data-management-app="ai-governance">
      <section className="ai-gov-hero bui-management-header">
        <div className="ai-gov-hero-copy">
          <span className="ai-gov-eyebrow">V12.38 · TASK & PROMPT REGISTRY</span>
          <h1>{vi ? 'Trung tâm quản trị Brian AI' : 'Brian AI Governance Center'}</h1>
          <p>{vi ? 'Điều phối provider, quyền riêng tư, kiểm định, ngân sách, task contract và phiên bản prompt từ một AI Registry thống nhất.' : 'Control providers, privacy, validation, budgets, task contracts and prompt versions through one unified AI Registry.'}</p>
          <div className="ai-gov-hero-actions">
            <button type="button" className="primary" onClick={save}>{saved ? (vi ? 'Đã lưu' : 'Saved') : (vi ? 'Lưu cấu hình' : 'Save settings')}</button>
            <button type="button" className="secondary" onClick={() => downloadJson(`Brian-AI-Governance-${new Date().toISOString().slice(0, 10)}.json`, exportAiGovernanceReport())}>{vi ? 'Xuất báo cáo JSON' : 'Export JSON report'}</button>
          </div>
        </div>
        <div className="ai-gov-orbit" aria-hidden="true"><span>AI</span><i/><i/><i/></div>
      </section>

      <section className="ai-gov-stats bui-management-metrics" aria-label={vi ? 'Thống kê hôm nay' : 'Today statistics'}>
        <article><small>{vi ? 'Yêu cầu hôm nay' : 'Requests today'}</small><strong>{formatNumber(summary.requests)}<em>/ {formatNumber(summary.requestLimit)}</em></strong><div><i style={{ width: percent(summary.requestPercent) }}/></div></article>
        <article><small>{vi ? 'Token ước tính' : 'Estimated tokens'}</small><strong>{formatNumber(summary.tokenTotal)}<em>/ {formatNumber(summary.tokenBudget)}</em></strong><div><i style={{ width: percent(summary.tokenPercent) }}/></div></article>
        <article><small>{vi ? 'Thành công' : 'Successful'}</small><strong>{formatNumber(summary.successes)}</strong><p>{summary.requests ? Math.round((summary.successes / summary.requests) * 100) : 0}% {vi ? 'tỉ lệ thành công' : 'success rate'}</p></article>
        <article><small>{vi ? 'Hành động AI' : 'AI actions'}</small><strong>{formatNumber(summary.actions)}</strong><p>{vi ? 'đã thực hiện có kiểm soát' : 'controlled actions executed'}</p></article>
      </section>

      <section className="ai-gov-card ai-gov-cloud-sync" data-cloud-state={cloudStatus.migrationReady === false ? 'migration' : cloudStatus.syncing ? 'syncing' : cloudStatus.lastError ? 'error' : 'ready'}>
        <header>
          <div><span>☁</span><div><h2>{vi ? 'AI Governance Cloud Sync' : 'AI Governance Cloud Sync'}</h2><p>{vi ? 'Nhật ký và số liệu AI được lưu cục bộ trước, sau đó đồng bộ tập trung khi có mạng. Prompt, nội dung trả lời và API key không được tải lên.' : 'AI telemetry is stored locally first and synchronized centrally when online. Prompts, responses and API keys are never uploaded.'}</p></div></div>
          <b className="ai-gov-cloud-badge">{cloudStatus.migrationReady === false ? (vi ? 'Cần chạy SQL' : 'SQL required') : cloudStatus.syncing ? (vi ? 'Đang đồng bộ' : 'Syncing') : cloudStatus.lastError ? (vi ? 'Cần kiểm tra' : 'Needs attention') : cloudStatus.configured ? (vi ? 'Cloud sẵn sàng' : 'Cloud ready') : (vi ? 'Chưa cấu hình' : 'Not configured')}</b>
        </header>
        <div className="ai-gov-cloud-grid">
          <article><small>{vi ? 'Đang chờ tải lên' : 'Pending upload'}</small><strong>{formatNumber(cloudStatus.pending)}</strong><p>{vi ? 'sự kiện trong hàng đợi an toàn' : 'events in the safe queue'}</p></article>
          <article><small>{vi ? 'Đã đồng bộ trên thiết bị' : 'Uploaded by this device'}</small><strong>{formatNumber(cloudStatus.uploaded)}</strong><p>{cloudStatus.lastSyncAt ? new Date(cloudStatus.lastSyncAt).toLocaleString(vi ? 'vi-VN' : 'en-US') : (vi ? 'Chưa đồng bộ' : 'Not synced yet')}</p></article>
          <article><small>{vi ? 'Toàn hệ thống · 14 ngày' : 'System-wide · 14 days'}</small><strong>{formatNumber(cloudDashboard?.totals?.requests || 0)}</strong><p>{vi ? 'request đã ghi nhận trên cloud' : 'requests recorded in cloud'}</p></article>
          <article><small>{vi ? 'Tài khoản hoạt động' : 'Active accounts'}</small><strong>{formatNumber(cloudDashboard?.totals?.activeUsers || 0)}</strong><p>{vi ? 'trong báo cáo tập trung' : 'in the central report'}</p></article>
        </div>
        <div className="ai-gov-cloud-actions">
          <button type="button" className="primary" disabled={cloudBusy || !cloudStatus.configured} onClick={syncCloud}>{cloudBusy ? (vi ? 'Đang xử lý…' : 'Working…') : (vi ? 'Đồng bộ ngay' : 'Sync now')}</button>
          <button type="button" className="secondary" disabled={cloudBusy || !cloudStatus.configured} onClick={pullCloudSettings}>{vi ? 'Tải cấu hình & báo cáo cloud' : 'Pull cloud settings & report'}</button>
          {cloudStatus.pending > 0 && <button type="button" className="danger-text" onClick={() => { if (window.confirm(vi ? 'Xóa hàng đợi chưa đồng bộ trên thiết bị này?' : 'Clear the unsynced queue on this device?')) { clearAiGovernanceCloudQueue(); refresh(); } }}>{vi ? 'Xóa hàng đợi' : 'Clear queue'}</button>}
        </div>
        {cloudStatus.lastError && <p className="ai-gov-cloud-error"><strong>{cloudStatus.lastErrorCode || 'SYNC'}:</strong> {cloudStatus.lastError}</p>}
        {cloudStatus.migrationReady === false && <p className="ai-gov-cloud-migration">{vi ? 'Chạy file supabase/brian_v12_37_ai_governance_cloud.sql trong Supabase SQL Editor, sau đó bấm “Đồng bộ ngay”.' : 'Run supabase/brian_v12_37_ai_governance_cloud.sql in Supabase SQL Editor, then press “Sync now”.'}</p>}
      </section>

      <div className="ai-gov-layout bui-management-layout">
        <section className="ai-gov-card ai-gov-controls">
          <header><div><span>01</span><div><h2>{vi ? 'Kiểm soát toàn hệ thống' : 'System-wide controls'}</h2><p>{vi ? 'Tắt AI khẩn cấp hoặc giới hạn mức sử dụng trong ngày.' : 'Pause AI or cap daily usage.'}</p></div></div></header>
          <div className="ai-gov-switch-grid">
            <label><div><strong>{vi ? 'Bật Brian AI' : 'Enable Brian AI'}</strong><small>{vi ? 'Áp dụng cho toàn bộ ứng dụng dùng callAI.' : 'Applies to every app using callAI.'}</small></div><input type="checkbox" checked={settings.enabled} onChange={(event) => patch({ enabled: event.target.checked })}/><span/></label>
            <label><div><strong>{vi ? 'Cho phép hành động AI' : 'Allow AI actions'}</strong><small>{vi ? 'Cho phép gửi kết quả sang ứng dụng và thư viện.' : 'Allow cross-app and library actions.'}</small></div><input type="checkbox" checked={settings.allowActions} onChange={(event) => patch({ allowActions: event.target.checked })}/><span/></label>
            <label><div><strong>{vi ? 'Luôn yêu cầu xác nhận' : 'Always require confirmation'}</strong><small>{vi ? 'Hiện xem trước trước khi thay đổi dữ liệu.' : 'Preview before changing data.'}</small></div><input type="checkbox" checked={settings.requireActionConfirmation} onChange={(event) => patch({ requireActionConfirmation: event.target.checked })}/><span/></label>
          </div>
          <div className="ai-gov-number-grid">
            <label><span>{vi ? 'Số yêu cầu tối đa/ngày' : 'Daily request limit'}</span><input type="number" min="1" max="5000" value={settings.dailyRequestLimit} onChange={(event) => patch({ dailyRequestLimit: event.target.value })}/></label>
            <label><span>{vi ? 'Ngân sách token/ngày' : 'Daily token budget'}</span><input type="number" min="1000" max="5000000" step="1000" value={settings.dailyTokenBudget} onChange={(event) => patch({ dailyTokenBudget: event.target.value })}/></label>
            <label><span>{vi ? 'Trần output mỗi yêu cầu' : 'Max output per request'}</span><input type="number" min="256" max="8192" step="128" value={settings.maxOutputTokens} onChange={(event) => patch({ maxOutputTokens: event.target.value })}/></label>
          </div>
        </section>

        <section className="ai-gov-card ai-gov-actions-card">
          <header><div><span>02</span><div><h2>{vi ? 'Hành động được phép' : 'Allowed actions'}</h2><p>{vi ? 'Bật hoặc tắt từng đích đến của AI Action Engine.' : 'Enable or disable each AI Action target.'}</p></div></div></header>
          <div className="ai-gov-targets">
            {ACTION_TARGETS.map(([id, labelVi, labelEn]) => <label key={id}><span>{id === 'current-app' ? '↳' : id === 'library' ? '▤' : id.slice(0, 2).toUpperCase()}</span><strong>{vi ? labelVi : labelEn}</strong><input type="checkbox" checked={settings.actionTargets?.[id] !== false} onChange={(event) => patch({ actionTargets: { ...settings.actionTargets, [id]: event.target.checked } })}/><i/></label>)}
          </div>
        </section>

        <section className="ai-gov-card ai-gov-profiles">
          <header><div><span>03</span><div><h2>{vi ? 'Hồ sơ giới hạn model' : 'Model limit profiles'}</h2><p>{vi ? 'Giới hạn output theo loại công việc để tiết kiệm chi phí.' : 'Cap output by task type to control cost.'}</p></div></div></header>
          <div className="ai-gov-profile-list">
            {Object.entries(settings.profiles || {}).map(([id, profile]) => <label key={id}><div><strong>{vi ? PROFILE_LABELS[id]?.[0] || profile.label : PROFILE_LABELS[id]?.[1] || profile.label}</strong><small>{id}</small></div><input type="number" min={id === 'diagnostic' ? 16 : 256} max="8192" step={id === 'diagnostic' ? 16 : 128} value={profile.maxOutputTokens} onChange={(event) => patch({ profiles: { ...settings.profiles, [id]: { ...profile, maxOutputTokens: event.target.value } } })}/><span>tokens</span></label>)}
          </div>
        </section>

        <section className="ai-gov-card ai-gov-providers">
          <header><div><span>04</span><div><h2>{vi ? 'Provider hôm nay' : 'Providers today'}</h2><p>{vi ? 'Số yêu cầu được xử lý bởi từng provider hoặc fallback.' : 'Requests handled by each provider or fallback.'}</p></div></div></header>
          <div className="ai-gov-provider-list">
            {providerRows.length ? providerRows.map(([provider, count]) => <article key={provider}><span>{provider.slice(0, 2).toUpperCase()}</span><div><strong>{provider}</strong><small>{formatNumber(count)} {vi ? 'yêu cầu' : 'requests'}</small></div><b>{summary.requests ? Math.round((count / summary.requests) * 100) : 0}%</b></article>) : <p className="ai-gov-empty">{vi ? 'Chưa có yêu cầu AI hôm nay.' : 'No AI requests today.'}</p>}
          </div>
        </section>

        <section className="ai-gov-card ai-gov-safety">
          <header><div><span>05</span><div><h2>{vi ? 'Privacy Filter & Output Guard' : 'Privacy Filter & Output Guard'}</h2><p>{vi ? 'Che dữ liệu cá nhân trước khi gửi và tự sửa output JSON lỗi trước khi đưa vào ứng dụng.' : 'Redact personal data before sending and repair invalid structured output before apps receive it.'}</p></div></div><div className="ai-gov-safety-metrics"><b>{formatNumber(summary.privacyRedactions)}</b><small>{vi ? 'dữ liệu đã che' : 'redactions'}</small><b>{formatNumber(summary.validationRepairs)}</b><small>{vi ? 'output đã sửa' : 'repairs'}</small></div></header>
          <div className="ai-gov-safety-grid">
            <div>
              <h3>{vi ? 'Bảo vệ dữ liệu' : 'Data privacy'}</h3>
              <label className="ai-gov-select-row"><span>{vi ? 'Chế độ xử lý' : 'Processing mode'}</span><select value={settings.privacy?.mode || 'mask'} onChange={(event) => patch({ privacy: { ...settings.privacy, mode: event.target.value, enabled: event.target.value !== 'off' } })}><option value="mask">{vi ? 'Che dữ liệu trước khi gửi' : 'Mask before sending'}</option><option value="block">{vi ? 'Chặn khi phát hiện dữ liệu nhạy cảm' : 'Block sensitive requests'}</option><option value="off">{vi ? 'Tắt Privacy Filter' : 'Privacy Filter off'}</option></select></label>
              <div className="ai-gov-switch-grid">
                <label><div><strong>{vi ? 'Che tên, email, điện thoại và mã học sinh' : 'Mask names, email, phone and student IDs'}</strong><small>{vi ? 'Dùng mã thay thế ổn định trong từng request.' : 'Uses stable placeholders inside each request.'}</small></div><input type="checkbox" checked={settings.privacy?.maskNamedPeople !== false} onChange={(event) => patch({ privacy: { ...settings.privacy, maskNamedPeople: event.target.checked, maskEmails: event.target.checked, maskPhones: event.target.checked, maskStudentIds: event.target.checked } })}/><span/></label>
                <label><div><strong>{vi ? 'OpenRouter Privacy Guard' : 'OpenRouter Privacy Guard'}</strong><small>{vi ? 'Dữ liệu nhạy cảm được che trước khi gửi qua OpenRouter.' : 'Sensitive data is masked before being sent through OpenRouter.'}</small></div><input type="checkbox" checked={settings.privacy?.mode !== 'off'} onChange={(event) => patch({ privacy: { ...settings.privacy, mode: event.target.checked ? 'mask' : 'off', enabled: event.target.checked, forceLocalForSensitive: false } })}/><span/></label>
                <label><div><strong>{vi ? 'Chặn ảnh đính kèm có dữ liệu nhạy cảm' : 'Block sensitive image attachments'}</strong><small>{vi ? 'Loại ảnh khỏi request khi prompt đã chứa dữ liệu cá nhân.' : 'Removes images when personal data is detected.'}</small></div><input type="checkbox" checked={Boolean(settings.privacy?.blockSensitiveImages)} onChange={(event) => patch({ privacy: { ...settings.privacy, blockSensitiveImages: event.target.checked } })}/><span/></label>
              </div>
            </div>
            <div>
              <h3>{vi ? 'Kiểm định đầu ra' : 'Output validation'}</h3>
              <div className="ai-gov-switch-grid">
                <label><div><strong>{vi ? 'Bật Output Guard' : 'Enable Output Guard'}</strong><small>{vi ? 'Kiểm tra nội dung rỗng, JSON, schema và số lượng mục.' : 'Checks empty output, JSON, schema and item counts.'}</small></div><input type="checkbox" checked={settings.outputValidation?.enabled !== false} onChange={(event) => patch({ outputValidation: { ...settings.outputValidation, enabled: event.target.checked } })}/><span/></label>
                <label><div><strong>{vi ? 'Tự sửa output không hợp lệ' : 'Auto-repair invalid output'}</strong><small>{vi ? 'Gửi một lượt sửa định dạng lại qua OpenRouter trước khi trả kết quả.' : 'Runs a repair pass through OpenRouter before returning the result.'}</small></div><input type="checkbox" checked={settings.outputValidation?.autoRepair !== false} onChange={(event) => patch({ outputValidation: { ...settings.outputValidation, autoRepair: event.target.checked } })}/><span/></label>
                <label><div><strong>{vi ? 'Phát hiện câu/mục trùng' : 'Detect duplicate items'}</strong><small>{vi ? 'Áp dụng cho danh sách câu hỏi có cấu trúc.' : 'Applies to structured question lists.'}</small></div><input type="checkbox" checked={settings.outputValidation?.detectDuplicates !== false} onChange={(event) => patch({ outputValidation: { ...settings.outputValidation, detectDuplicates: event.target.checked } })}/><span/></label>
              </div>
              <div className="ai-gov-number-grid ai-gov-number-grid-single"><label><span>{vi ? 'Số lượt tự sửa tối đa' : 'Maximum repair attempts'}</span><input type="number" min="0" max="2" step="1" value={settings.outputValidation?.maxRepairAttempts ?? 1} onChange={(event) => patch({ outputValidation: { ...settings.outputValidation, maxRepairAttempts: event.target.value } })}/></label></div>
              <p className="ai-gov-safety-note">{vi ? `Hôm nay: ${formatNumber(summary.validationFailures)} request từng lỗi kiểm định; ${formatNumber(summary.validationRepairs)} request đã được tự sửa thành công.` : `Today: ${formatNumber(summary.validationFailures)} validation failures; ${formatNumber(summary.validationRepairs)} repaired requests.`}</p>
            </div>
          </div>
        </section>

        <section className="ai-gov-card ai-gov-runtime">
          <header><div><span>06</span><div><h2>{vi ? 'Độ ổn định AI Runtime' : 'AI Runtime reliability'}</h2><p>{vi ? 'Điều phối hàng đợi, timeout, retry, chống gọi trùng và tự cô lập OpenRouter khi lỗi liên tục.' : 'Manage queues, timeouts, retries, de-duplication and the OpenRouter circuit breaker.'}</p></div></div><b className="ai-gov-runtime-badge">{runtime.activeCount} {vi ? 'đang chạy' : 'active'} · {runtime.queuedCount} {vi ? 'đang chờ' : 'queued'}</b></header>
          <div className="ai-gov-runtime-metrics">
            <article><small>{vi ? 'Đang xử lý' : 'Active'}</small><strong>{formatNumber(runtime.activeCount)}</strong><span>{vi ? `Tối đa ${settings.runtime?.maxConcurrent || 2} request song song` : `Up to ${settings.runtime?.maxConcurrent || 2} concurrent requests`}</span></article>
            <article><small>{vi ? 'Retry phiên này' : 'Session retries'}</small><strong>{formatNumber(runtime.stats?.retries)}</strong><span>{vi ? `${formatNumber(summary.runtimeRetries)} retry đã ghi hôm nay` : `${formatNumber(summary.runtimeRetries)} retries logged today`}</span></article>
            <article><small>{vi ? 'Cache & chống trùng' : 'Cache & de-dupe'}</small><strong>{formatNumber((runtime.stats?.cacheHits || 0) + (runtime.stats?.dedupeHits || 0))}</strong><span>{vi ? `${runtime.cacheEntries} kết quả trong cache phiên` : `${runtime.cacheEntries} cached session results`}</span></article>
            <article><small>{vi ? 'Circuit đang mở' : 'Open circuits'}</small><strong>{formatNumber(runtime.openCircuitCount)}</strong><span>{runtime.openCircuitCount ? runtime.openCircuits.map((item) => item.providerId).join(', ') : (vi ? 'OpenRouter đang khả dụng' : 'OpenRouter available')}</span></article>
          </div>
          <div className="ai-gov-runtime-grid">
            <div className="ai-gov-switch-grid">
              <label><div><strong>{vi ? 'Bật Runtime Manager' : 'Enable Runtime Manager'}</strong><small>{vi ? 'Áp dụng chung cho text, vision và tạo ảnh.' : 'Applies to text, vision and image generation.'}</small></div><input type="checkbox" checked={settings.runtime?.enabled !== false} onChange={(event) => patch({ runtime: { ...settings.runtime, enabled: event.target.checked } })}/><span/></label>
              <label><div><strong>{vi ? 'Chống request trùng đang chạy' : 'De-duplicate in-flight requests'}</strong><small>{vi ? 'Hai thao tác giống nhau dùng chung một lần gọi provider.' : 'Identical requests share one provider call.'}</small></div><input type="checkbox" checked={settings.runtime?.dedupeInFlight !== false} onChange={(event) => patch({ runtime: { ...settings.runtime, dedupeInFlight: event.target.checked } })}/><span/></label>
              <label><div><strong>{vi ? 'Cache tác vụ an toàn' : 'Cache safe tasks'}</strong><small>{vi ? 'Chỉ cache diagnostic hoặc tác vụ được ứng dụng cho phép; không cache dữ liệu đã che.' : 'Only caches diagnostics or explicitly allowed tasks; masked data is never cached.'}</small></div><input type="checkbox" checked={settings.runtime?.cacheEnabled !== false} onChange={(event) => patch({ runtime: { ...settings.runtime, cacheEnabled: event.target.checked } })}/><span/></label>
              <label><div><strong>{vi ? 'Circuit breaker cho provider' : 'Provider circuit breaker'}</strong><small>{vi ? 'Tạm dừng provider lỗi liên tiếp rồi tự mở lại sau thời gian nghỉ.' : 'Temporarily pauses repeatedly failing providers and recovers automatically.'}</small></div><input type="checkbox" checked={settings.runtime?.circuitBreakerEnabled !== false} onChange={(event) => patch({ runtime: { ...settings.runtime, circuitBreakerEnabled: event.target.checked } })}/><span/></label>
            </div>
            <div className="ai-gov-runtime-numbers">
              <label><span>{vi ? 'Request song song' : 'Concurrent requests'}</span><input type="number" min="1" max="6" value={settings.runtime?.maxConcurrent ?? 2} onChange={(event) => patch({ runtime: { ...settings.runtime, maxConcurrent: event.target.value } })}/></label>
              <label><span>{vi ? 'Timeout (giây)' : 'Timeout (seconds)'}</span><input type="number" min="5" max="180" value={Math.round((settings.runtime?.requestTimeoutMs || 45000) / 1000)} onChange={(event) => patch({ runtime: { ...settings.runtime, requestTimeoutMs: Number(event.target.value) * 1000 } })}/></label>
              <label><span>{vi ? 'Retry tạm thời' : 'Transient retries'}</span><input type="number" min="0" max="3" value={settings.runtime?.transientRetries ?? 1} onChange={(event) => patch({ runtime: { ...settings.runtime, transientRetries: event.target.value } })}/></label>
              <label><span>{vi ? 'Cache (phút)' : 'Cache TTL (minutes)'}</span><input type="number" min="1" max="60" value={Math.round((settings.runtime?.cacheTtlMs || 300000) / 60000)} onChange={(event) => patch({ runtime: { ...settings.runtime, cacheTtlMs: Number(event.target.value) * 60000 } })}/></label>
              <label><span>{vi ? 'Lỗi để mở circuit' : 'Failures to open circuit'}</span><input type="number" min="2" max="10" value={settings.runtime?.circuitFailureThreshold ?? 3} onChange={(event) => patch({ runtime: { ...settings.runtime, circuitFailureThreshold: event.target.value } })}/></label>
              <label><span>{vi ? 'Thời gian nghỉ (giây)' : 'Circuit cooldown (seconds)'}</span><input type="number" min="10" max="900" value={Math.round((settings.runtime?.circuitCooldownMs || 90000) / 1000)} onChange={(event) => patch({ runtime: { ...settings.runtime, circuitCooldownMs: Number(event.target.value) * 1000 } })}/></label>
            </div>
          </div>
          <div className="ai-gov-runtime-actions"><button type="button" onClick={() => { clearAiRuntimeCache(); refresh(); }}>{vi ? 'Xóa cache phiên' : 'Clear session cache'}</button><button type="button" onClick={() => { resetAiProviderCircuits(); refresh(); }}>{vi ? 'Mở lại tất cả provider' : 'Reset provider circuits'}</button><button type="button" className="danger-text" onClick={() => { if (window.confirm(vi ? 'Đặt lại toàn bộ thống kê AI Runtime của phiên này?' : 'Reset all AI Runtime session statistics?')) { resetAiRuntimeSession(); refresh(); } }}>{vi ? 'Đặt lại Runtime' : 'Reset runtime'}</button></div>
        </section>

        <section className="ai-gov-card ai-gov-control-plane">
          <header><div><span>07</span><div><h2>{vi ? 'AI Control Plane & quan sát vận hành' : 'AI Control Plane & observability'}</h2><p>{vi ? 'Áp dụng fair-use theo tài khoản và theo dõi task, model, transport, fallback cùng độ trễ trong một nơi.' : 'Apply account-level fair use and trace tasks, models, transports, fallbacks and latency in one place.'}</p></div></div><b className="ai-gov-control-plane-badge">bes-ai-core/1.2</b></header>
          <div className="ai-gov-control-metrics">
            <article><small>{vi ? 'Lượt gọi provider' : 'Provider calls'}</small><strong>{formatNumber(summary.providerCalls)}</strong><span>{observability.providerCallAmplification}× {vi ? 'mỗi request' : 'per request'}</span></article>
            <article><small>Fallback</small><strong>{formatNumber(summary.fallbacks)}</strong><span>{observability.fallbackRate}% {vi ? 'tỷ lệ chuyển provider' : 'provider switch rate'}</span></article>
            <article><small>{vi ? 'Độ trễ trung bình' : 'Average latency'}</small><strong>{formatMs(observability.averageLatencyMs)}</strong><span>{formatMs(observability.averageQueueWaitMs)} {vi ? 'chờ hàng đợi' : 'queue wait'}</span></article>
            <article><small>{vi ? 'Tự sửa đầu ra' : 'Output repairs'}</small><strong>{formatNumber(summary.validationRepairs)}</strong><span>{observability.repairRate}% {vi ? 'trên tổng request' : 'of requests'}</span></article>
          </div>
          <div className="ai-gov-control-grid">
            <div className="ai-gov-fair-use">
              <h3>{vi ? 'Fair-use theo tài khoản' : 'Per-account fair use'}</h3>
              <div className="ai-gov-switch-grid">
                <label><div><strong>{vi ? 'Bật giới hạn theo tài khoản' : 'Enable per-account limits'}</strong><small>{vi ? 'Ngăn một tài khoản sử dụng hết ngân sách AI chung trong ngày.' : 'Prevent one account from consuming the shared daily AI budget.'}</small></div><input type="checkbox" checked={settings.fairUse?.enabled !== false} onChange={(event) => patch({ fairUse: { ...settings.fairUse, enabled: event.target.checked } })}/><span/></label>
                <label><div><strong>{vi ? 'Chặn khi đạt giới hạn' : 'Block at limit'}</strong><small>{vi ? 'Nếu tắt, hệ thống chỉ cảnh báo và vẫn cho phép request.' : 'When disabled, the system warns but still permits requests.'}</small></div><input type="checkbox" checked={settings.fairUse?.blockAtLimit !== false} onChange={(event) => patch({ fairUse: { ...settings.fairUse, blockAtLimit: event.target.checked } })}/><span/></label>
                <label><div><strong>{vi ? 'Miễn giới hạn cho Admin' : 'Exempt administrators'}</strong><small>{vi ? 'Admin vẫn chịu ngân sách chung nhưng không bị quota cá nhân.' : 'Admins still follow global budgets but bypass personal quotas.'}</small></div><input type="checkbox" checked={settings.fairUse?.exemptAdmins !== false} onChange={(event) => patch({ fairUse: { ...settings.fairUse, exemptAdmins: event.target.checked } })}/><span/></label>
              </div>
              <div className="ai-gov-number-grid">
                <label><span>{vi ? 'Request/tài khoản/ngày' : 'Requests/account/day'}</span><input type="number" min="1" max="5000" value={settings.fairUse?.perUserDailyRequestLimit ?? 60} onChange={(event) => patch({ fairUse: { ...settings.fairUse, perUserDailyRequestLimit: event.target.value } })}/></label>
                <label><span>{vi ? 'Token/tài khoản/ngày' : 'Tokens/account/day'}</span><input type="number" min="1000" max="5000000" step="1000" value={settings.fairUse?.perUserDailyTokenBudget ?? 90000} onChange={(event) => patch({ fairUse: { ...settings.fairUse, perUserDailyTokenBudget: event.target.value } })}/></label>
                <label><span>{vi ? 'Cảnh báo từ (%)' : 'Warn from (%)'}</span><input type="number" min="50" max="99" value={settings.fairUse?.warningPercent ?? 80} onChange={(event) => patch({ fairUse: { ...settings.fairUse, warningPercent: event.target.value } })}/></label>
              </div>
              <p className="ai-gov-safety-note">{vi ? `Tài khoản hiện tại: ${summary.userRequests}/${summary.userRequestLimit} request · ${formatNumber(summary.userTokens)}/${formatNumber(summary.userTokenBudget)} token.` : `Current account: ${summary.userRequests}/${summary.userRequestLimit} requests · ${formatNumber(summary.userTokens)}/${formatNumber(summary.userTokenBudget)} tokens.`}</p>
            </div>
            <div className="ai-gov-observability">
              <div className="ai-gov-observability-group"><div><strong>{vi ? 'Task đang dùng nhiều nhất' : 'Top AI tasks'}</strong><small>{vi ? 'số request' : 'requests'}</small></div><MetricBars rows={observability.topTasks.slice(0, 6)} emptyLabel={vi ? 'Chưa có dữ liệu task.' : 'No task data.'}/></div>
              <div className="ai-gov-observability-group"><div><strong>{vi ? 'Provider & model' : 'Providers and models'}</strong><small>{vi ? 'lượt xử lý' : 'handled requests'}</small></div><MetricBars rows={observability.topProviders.slice(0, 4)} emptyLabel={vi ? 'Chưa có dữ liệu provider.' : 'No provider data.'}/></div>
              <div className="ai-gov-observability-group"><div><strong>{vi ? 'Đường vận chuyển' : 'Transports'}</strong><small>{vi ? 'browser / server' : 'browser / server'}</small></div><MetricBars rows={observability.topTransports.slice(0, 4)} emptyLabel={vi ? 'Chưa có dữ liệu transport.' : 'No transport data.'}/></div>
            </div>
          </div>
        </section>

        <section className="ai-gov-card ai-gov-task-registry">
          <header><div><span>08</span><div><h2>{vi ? 'AI Task & Prompt Registry' : 'AI Task & Prompt Registry'}</h2><p>{vi ? 'Mỗi chức năng AI dùng một Task ID, phiên bản prompt, profile riêng tư, routing và hợp đồng đầu ra rõ ràng.' : 'Every AI capability uses a stable Task ID, prompt version, privacy profile, routing policy and output contract.'}</p></div></div><b className="ai-gov-task-badge">{promptRegistrySummary.taskCount} tasks · {promptRegistrySummary.appCount} apps</b></header>
          <div className="ai-gov-task-summary">
            <article><small>{vi ? 'Phiên bản Registry' : 'Registry version'}</small><strong>{promptRegistrySummary.registryVersion}</strong></article>
            <article><small>{vi ? 'Task JSON contract' : 'JSON contract tasks'}</small><strong>{promptRegistrySummary.jsonContractCount}</strong></article>
            <article><small>{vi ? 'Task dữ liệu nhạy cảm' : 'Sensitive-data tasks'}</small><strong>{promptRegistrySummary.sensitiveTaskCount}</strong></article>
            <article><small>{vi ? 'Task đã được sử dụng' : 'Tasks used'}</small><strong>{taskMetrics.filter((item) => item.runs > 0).length}</strong></article>
          </div>
          <div className="ai-gov-task-table-wrap"><table className="ai-gov-task-table"><thead><tr><th>Task ID</th><th>{vi ? 'Ứng dụng' : 'App'}</th><th>{vi ? 'Prompt' : 'Prompt'}</th><th>{vi ? 'Hợp đồng' : 'Contract'}</th><th>{vi ? 'Lượt chạy' : 'Runs'}</th><th>{vi ? 'Thành công' : 'Success'}</th><th>{vi ? 'Repair' : 'Repair'}</th><th>{vi ? 'TB thời gian' : 'Avg time'}</th><th>{vi ? 'Provider gần nhất' : 'Last provider'}</th></tr></thead><tbody>{promptDefinitions.map((definition) => { const metric = taskMetrics.find((item) => item.id === definition.id) || {}; return <tr key={definition.id}><td><code>{definition.id}</code><small>{definition.label}</small></td><td>{definition.app}</td><td><b>v{definition.version}</b><small>{definition.privacyProfile}</small></td><td><span data-contract={definition.output}>{definition.output}</span></td><td>{formatNumber(metric.runs)}</td><td>{metric.runs ? `${metric.successRate}%` : '—'}</td><td>{formatNumber(metric.repairs)}</td><td>{metric.runs ? formatMs(metric.averageDurationMs) : '—'}</td><td>{metric.lastProvider ? <><b>{metric.lastProvider}</b><small>{metric.lastModel || ''}</small></> : '—'}</td></tr>; })}</tbody></table></div>
          <div className="ai-gov-task-footer"><p>{vi ? 'Các component cũ đã được chuyển sang runAITask(); callAI chỉ còn là adapter hạ tầng tương thích.' : 'Legacy components now call runAITask(); callAI remains only as an infrastructure compatibility adapter.'}</p><button type="button" className="secondary" onClick={() => { if (window.confirm(vi ? 'Đặt lại thống kê AI Task trên thiết bị này?' : 'Reset AI Task statistics on this device?')) { resetAiTaskRuntimeMetrics(); refresh(); } }}>{vi ? 'Đặt lại thống kê Task' : 'Reset task metrics'}</button></div>
        </section>

        <section className="ai-gov-card ai-gov-transport">
          <header><div><span>09</span><div><h2>{vi ? 'Độ phủ Unified AI Core' : 'Unified AI Core coverage'}</h2><p>{vi ? 'Ba đường gọi AI cũ đã được đưa về các adapter và hợp đồng dùng chung.' : 'The former AI call paths now use shared adapters and contracts.'}</p></div></div><b className="ai-gov-transport-badge">100% core</b></header>
          <div className="ai-gov-transport-grid">
            <article><span>01</span><div><strong>{vi ? 'Văn bản & tài liệu' : 'Text and documents'}</strong><p>{vi ? 'callAI → Privacy → Governance → Smart Router → Output Guard.' : 'callAI → Privacy → Governance → Smart Router → Output Guard.'}</p></div><b>{vi ? 'Đã hợp nhất' : 'Unified'}</b></article>
            <article><span>02</span><div><strong>{vi ? 'Ảnh & Vision' : 'Images and vision'}</strong><p>{vi ? 'SmartID dùng chung OpenRouter AI Gateway cho Vision và xử lý ảnh.' : 'SmartID uses the shared OpenRouter AI Gateway for vision and image processing.'}</p></div><b>{vi ? 'Đã hợp nhất' : 'Unified'}</b></article>
            <article><span>03</span><div><strong>{vi ? 'Server AI Gateway' : 'Server AI Gateway'}</strong><p>{vi ? '/api/ai và Lesson Integration dùng cùng server provider adapter.' : '/api/ai and Lesson Integration share one server provider adapter.'}</p></div><b>{vi ? 'Đã hợp nhất' : 'Unified'}</b></article>
          </div>
          <p className="ai-gov-transport-note">{vi ? 'Hợp đồng gateway: bes-ai-core/1.4 · Metadata gồm provider, model, transport, thời gian và request ID.' : 'Gateway contract: bes-ai-core/1.4 · Metadata includes provider, model, transport, duration and request ID.'}</p>
        </section>
      </div>

      <section className="ai-gov-card ai-gov-history">
        <header><div><span>10</span><div><h2>{vi ? 'Lịch sử sử dụng' : 'Usage history'}</h2><p>{vi ? 'Theo dõi 45 ngày gần nhất trên thiết bị này.' : 'Track the last 45 days on this device.'}</p></div></div><button type="button" className="danger-text" onClick={() => { if (window.confirm(vi ? 'Đặt lại toàn bộ bộ đếm sử dụng AI?' : 'Reset all AI usage counters?')) { resetAiUsage(); refresh(); } }}>{vi ? 'Đặt lại bộ đếm' : 'Reset counters'}</button></header>
        <div className="ai-gov-table-wrap"><table><thead><tr><th>{vi ? 'Ngày' : 'Date'}</th><th>{vi ? 'Yêu cầu' : 'Requests'}</th><th>{vi ? 'Thành công' : 'Success'}</th><th>{vi ? 'Lỗi' : 'Errors'}</th><th>Input</th><th>Output</th><th>{vi ? 'Provider calls' : 'Provider calls'}</th><th>Fallback</th><th>{vi ? 'Đã che' : 'Redacted'}</th><th>{vi ? 'Tự sửa' : 'Repairs'}</th><th>Retry</th><th>Cache</th><th>{vi ? 'Hành động' : 'Actions'}</th></tr></thead><tbody>{days.slice(0, 14).map((day) => <tr key={day.date}><td>{day.date}</td><td>{formatNumber(day.requests)}</td><td>{formatNumber(day.successes)}</td><td>{formatNumber(day.errors)}</td><td>{formatNumber(day.inputTokens)}</td><td>{formatNumber(day.outputTokens)}</td><td>{formatNumber(day.providerCalls)}</td><td>{formatNumber(day.fallbacks)}</td><td>{formatNumber(day.privacyRedactions)}</td><td>{formatNumber(day.validationRepairs)}</td><td>{formatNumber(day.runtimeRetries)}</td><td>{formatNumber(day.runtimeCacheHits)}</td><td>{formatNumber(day.actions)}</td></tr>)}{!days.length && <tr><td colSpan="13">{vi ? 'Chưa có dữ liệu sử dụng.' : 'No usage data.'}</td></tr>}</tbody></table></div>
      </section>

      <section className="ai-gov-card ai-gov-audit">
        <header><div><span>11</span><div><h2>{vi ? 'Nhật ký AI & hành động' : 'AI and action audit'}</h2><p>{vi ? 'Lưu yêu cầu, lỗi, chặn hạn mức và hành động liên ứng dụng.' : 'Requests, failures, blocked quotas and cross-app actions.'}</p></div></div><div className="ai-gov-audit-actions"><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">{vi ? 'Tất cả' : 'All'}</option><option value="request">Request</option><option value="privacy">Privacy</option><option value="action">Action</option><option value="settings">Settings</option><option value="error">Error</option><option value="blocked">Blocked</option></select><button type="button" onClick={() => { if (window.confirm(vi ? 'Xóa nhật ký AI trên thiết bị này?' : 'Clear the AI audit log?')) { clearAiAudit(); refresh(); } }}>{vi ? 'Xóa nhật ký' : 'Clear log'}</button></div></header>
        <div className="ai-gov-audit-list">{filteredAudit.map((item) => <details key={item.id} data-status={item.status}><summary><article data-status={item.status}><span>{item.type === 'action' ? '↳' : item.status === 'error' || item.status === 'blocked' ? '!' : 'AI'}</span><div><strong>{item.label}</strong><p>{[item.taskId, item.provider, item.model, item.transport, item.target].filter(Boolean).join(' · ') || (vi ? 'Sự kiện hệ thống' : 'System event')}</p><small>{new Date(item.createdAt).toLocaleString(vi ? 'vi-VN' : 'en-US')} · {item.actor?.email || item.actor?.name || 'guest'}</small></div><b>{item.status}</b></article></summary><div className="ai-gov-audit-detail"><dl><div><dt>Task</dt><dd>{item.taskId || '—'}</dd></div><div><dt>Transport</dt><dd>{item.transport || '—'}</dd></div><div><dt>Operation ID</dt><dd>{item.operationId || '—'}</dd></div><div><dt>{vi ? 'Thời lượng' : 'Duration'}</dt><dd>{formatMs(item.detail?.durationMs)}</dd></div></dl><code>{JSON.stringify(item.detail || {}, null, 2)}</code></div></details>)}{!filteredAudit.length && <p className="ai-gov-empty">{vi ? 'Không có sự kiện phù hợp.' : 'No matching events.'}</p>}</div>
      </section>

      <section className="ai-gov-footer-actions"><button type="button" className="secondary" onClick={() => { if (window.confirm(vi ? 'Khôi phục cấu hình AI Governance mặc định?' : 'Restore default AI Governance settings?')) { setSettings(resetAiGovernanceSettings()); refresh(); } }}>{vi ? 'Khôi phục mặc định' : 'Restore defaults'}</button><p>{vi ? 'Các giới hạn được thực thi tại Unified Task Runtime và áp dụng cho toàn bộ ứng dụng.' : 'Limits are enforced centrally in the Unified Task Runtime and apply across all apps.'}</p></section>
    </div>
  );
}
