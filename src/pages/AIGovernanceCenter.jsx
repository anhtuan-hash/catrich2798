import React, { useEffect, useMemo, useState } from 'react';
import {
  AI_GOVERNANCE_EVENT,
  clearAiAudit,
  exportAiGovernanceReport,
  getAiGovernanceSettings,
  getAiUsageDays,
  getAiUsageSummary,
  readAiAudit,
  resetAiGovernanceSettings,
  resetAiUsage,
  saveAiGovernanceSettings,
} from '../utils/aiGovernance.js';

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
  default: ['Mặc định', 'Default'],
};

function formatNumber(value) {
  return new Intl.NumberFormat('vi-VN').format(Number(value) || 0);
}

function percent(value) {
  return `${Math.min(100, Math.max(0, Number(value) || 0))}%`;
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
  const [days, setDays] = useState(getAiUsageDays);
  const [audit, setAudit] = useState(readAiAudit);
  const [filter, setFilter] = useState('all');
  const [saved, setSaved] = useState(false);

  const refresh = () => {
    setSettings(getAiGovernanceSettings());
    setSummary(getAiUsageSummary());
    setDays(getAiUsageDays());
    setAudit(readAiAudit());
  };

  useEffect(() => {
    const onUpdate = () => refresh();
    window.addEventListener(AI_GOVERNANCE_EVENT, onUpdate);
    const timer = window.setInterval(refresh, 5000);
    return () => { window.removeEventListener(AI_GOVERNANCE_EVENT, onUpdate); window.clearInterval(timer); };
  }, []);

  const filteredAudit = useMemo(() => audit.filter((item) => filter === 'all' || item.type === filter || item.status === filter).slice(0, 120), [audit, filter]);
  const providerRows = useMemo(() => Object.entries(summary.providers || {}).sort((a, b) => b[1] - a[1]), [summary.providers]);

  const patch = (next) => setSettings((current) => ({ ...current, ...next }));
  const save = () => {
    setSettings(saveAiGovernanceSettings(settings));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1800);
  };

  if (currentUser?.role !== 'admin') {
    return <div className="page narrow"><section className="metro-panel empty-state"><h1>{vi ? 'Chỉ Admin được truy cập' : 'Admin access only'}</h1><p>{vi ? 'Trung tâm quản trị AI chứa giới hạn và nhật ký toàn hệ thống.' : 'AI Governance contains system-wide limits and audit logs.'}</p></section></div>;
  }

  return (
    <div className="ai-governance-page">
      <section className="ai-gov-hero">
        <div className="ai-gov-hero-copy">
          <span className="ai-gov-eyebrow">V10.86 · AI GOVERNANCE</span>
          <h1>{vi ? 'Trung tâm quản trị Brian AI' : 'Brian AI Governance Center'}</h1>
          <p>{vi ? 'Kiểm soát hạn mức, hành động liên ứng dụng, hồ sơ model và nhật ký vận hành AI trên toàn hệ thống.' : 'Control limits, cross-app actions, model profiles and AI audit activity across the system.'}</p>
          <div className="ai-gov-hero-actions">
            <button type="button" className="primary" onClick={save}>{saved ? (vi ? 'Đã lưu' : 'Saved') : (vi ? 'Lưu cấu hình' : 'Save settings')}</button>
            <button type="button" className="secondary" onClick={() => downloadJson(`Brian-AI-Governance-${new Date().toISOString().slice(0, 10)}.json`, exportAiGovernanceReport())}>{vi ? 'Xuất báo cáo JSON' : 'Export JSON report'}</button>
          </div>
        </div>
        <div className="ai-gov-orbit" aria-hidden="true"><span>AI</span><i/><i/><i/></div>
      </section>

      <section className="ai-gov-stats" aria-label={vi ? 'Thống kê hôm nay' : 'Today statistics'}>
        <article><small>{vi ? 'Yêu cầu hôm nay' : 'Requests today'}</small><strong>{formatNumber(summary.requests)}<em>/ {formatNumber(summary.requestLimit)}</em></strong><div><i style={{ width: percent(summary.requestPercent) }}/></div></article>
        <article><small>{vi ? 'Token ước tính' : 'Estimated tokens'}</small><strong>{formatNumber(summary.tokenTotal)}<em>/ {formatNumber(summary.tokenBudget)}</em></strong><div><i style={{ width: percent(summary.tokenPercent) }}/></div></article>
        <article><small>{vi ? 'Thành công' : 'Successful'}</small><strong>{formatNumber(summary.successes)}</strong><p>{summary.requests ? Math.round((summary.successes / summary.requests) * 100) : 0}% {vi ? 'tỉ lệ thành công' : 'success rate'}</p></article>
        <article><small>{vi ? 'Hành động AI' : 'AI actions'}</small><strong>{formatNumber(summary.actions)}</strong><p>{vi ? 'đã thực hiện có kiểm soát' : 'controlled actions executed'}</p></article>
      </section>

      <div className="ai-gov-layout">
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
            {Object.entries(settings.profiles || {}).map(([id, profile]) => <label key={id}><div><strong>{vi ? PROFILE_LABELS[id]?.[0] || profile.label : PROFILE_LABELS[id]?.[1] || profile.label}</strong><small>{id}</small></div><input type="number" min="256" max="8192" step="128" value={profile.maxOutputTokens} onChange={(event) => patch({ profiles: { ...settings.profiles, [id]: { ...profile, maxOutputTokens: event.target.value } } })}/><span>tokens</span></label>)}
          </div>
        </section>

        <section className="ai-gov-card ai-gov-providers">
          <header><div><span>04</span><div><h2>{vi ? 'Provider hôm nay' : 'Providers today'}</h2><p>{vi ? 'Số yêu cầu được xử lý bởi từng provider hoặc fallback.' : 'Requests handled by each provider or fallback.'}</p></div></div></header>
          <div className="ai-gov-provider-list">
            {providerRows.length ? providerRows.map(([provider, count]) => <article key={provider}><span>{provider.slice(0, 2).toUpperCase()}</span><div><strong>{provider}</strong><small>{formatNumber(count)} {vi ? 'yêu cầu' : 'requests'}</small></div><b>{summary.requests ? Math.round((count / summary.requests) * 100) : 0}%</b></article>) : <p className="ai-gov-empty">{vi ? 'Chưa có yêu cầu AI hôm nay.' : 'No AI requests today.'}</p>}
          </div>
        </section>
      </div>

      <section className="ai-gov-card ai-gov-history">
        <header><div><span>05</span><div><h2>{vi ? 'Lịch sử sử dụng' : 'Usage history'}</h2><p>{vi ? 'Theo dõi 45 ngày gần nhất trên thiết bị này.' : 'Track the last 45 days on this device.'}</p></div></div><button type="button" className="danger-text" onClick={() => { if (window.confirm(vi ? 'Đặt lại toàn bộ bộ đếm sử dụng AI?' : 'Reset all AI usage counters?')) { resetAiUsage(); refresh(); } }}>{vi ? 'Đặt lại bộ đếm' : 'Reset counters'}</button></header>
        <div className="ai-gov-table-wrap"><table><thead><tr><th>{vi ? 'Ngày' : 'Date'}</th><th>{vi ? 'Yêu cầu' : 'Requests'}</th><th>{vi ? 'Thành công' : 'Success'}</th><th>{vi ? 'Lỗi' : 'Errors'}</th><th>Input</th><th>Output</th><th>{vi ? 'Hành động' : 'Actions'}</th></tr></thead><tbody>{days.slice(0, 14).map((day) => <tr key={day.date}><td>{day.date}</td><td>{formatNumber(day.requests)}</td><td>{formatNumber(day.successes)}</td><td>{formatNumber(day.errors)}</td><td>{formatNumber(day.inputTokens)}</td><td>{formatNumber(day.outputTokens)}</td><td>{formatNumber(day.actions)}</td></tr>)}{!days.length && <tr><td colSpan="7">{vi ? 'Chưa có dữ liệu sử dụng.' : 'No usage data.'}</td></tr>}</tbody></table></div>
      </section>

      <section className="ai-gov-card ai-gov-audit">
        <header><div><span>06</span><div><h2>{vi ? 'Nhật ký AI & hành động' : 'AI and action audit'}</h2><p>{vi ? 'Lưu yêu cầu, lỗi, chặn hạn mức và hành động liên ứng dụng.' : 'Requests, failures, blocked quotas and cross-app actions.'}</p></div></div><div className="ai-gov-audit-actions"><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">{vi ? 'Tất cả' : 'All'}</option><option value="request">Request</option><option value="action">Action</option><option value="settings">Settings</option><option value="error">Error</option><option value="blocked">Blocked</option></select><button type="button" onClick={() => { if (window.confirm(vi ? 'Xóa nhật ký AI trên thiết bị này?' : 'Clear the AI audit log?')) { clearAiAudit(); refresh(); } }}>{vi ? 'Xóa nhật ký' : 'Clear log'}</button></div></header>
        <div className="ai-gov-audit-list">{filteredAudit.map((item) => <article key={item.id} data-status={item.status}><span>{item.type === 'action' ? '↳' : item.status === 'error' || item.status === 'blocked' ? '!' : 'AI'}</span><div><strong>{item.label}</strong><p>{[item.provider, item.model, item.target].filter(Boolean).join(' · ') || (vi ? 'Sự kiện hệ thống' : 'System event')}</p><small>{new Date(item.createdAt).toLocaleString(vi ? 'vi-VN' : 'en-US')} · {item.actor?.email || item.actor?.name || 'guest'}</small></div><b>{item.status}</b></article>)}{!filteredAudit.length && <p className="ai-gov-empty">{vi ? 'Không có sự kiện phù hợp.' : 'No matching events.'}</p>}</div>
      </section>

      <section className="ai-gov-footer-actions"><button type="button" className="secondary" onClick={() => { if (window.confirm(vi ? 'Khôi phục cấu hình AI Governance mặc định?' : 'Restore default AI Governance settings?')) { setSettings(resetAiGovernanceSettings()); refresh(); } }}>{vi ? 'Khôi phục mặc định' : 'Restore defaults'}</button><p>{vi ? 'Các giới hạn được thực thi tập trung tại callAI và áp dụng cho toàn bộ ứng dụng.' : 'Limits are enforced centrally in callAI and apply across all apps.'}</p></section>
    </div>
  );
}
