import React, { useEffect, useMemo, useState } from 'react';
import './ReleaseCenter.css';
import { FEATURE_FLAG_DEFINITIONS, createFeatureFlagSnapshot, defaultFeatureFlags, getFeatureFlags, listFeatureFlagSnapshots, restoreFeatureFlagSnapshotToCloud, saveFeatureFlagsToCloud, subscribeFeatureFlags } from '../utils/featureFlags.js';
import { clearAuditEvents, downloadAuditLog, listAuditEvents } from '../utils/auditLog.js';
import { getRuntimeBuildInfo } from '../data/release.js';

const rolloutOptions = [
  { id: 'off', vi: 'Tắt', en: 'Off' },
  { id: 'admin', vi: 'Chỉ Admin', en: 'Admin only' },
  { id: 'leaders', vi: 'Admin + TTCM', en: 'Admin + leaders' },
  { id: 'all', vi: 'Tất cả', en: 'Everyone' },
];

function formatDate(value, language) {
  try { return new Date(value).toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US'); } catch { return String(value || ''); }
}

function browserCacheSize() {
  try {
    return Object.keys(localStorage).reduce((sum, key) => sum + String(key).length + String(localStorage.getItem(key) || '').length, 0);
  } catch { return 0; }
}

function formatBytes(bytes) {
  const value = Number(bytes || 0);
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / 1024 / 1024).toFixed(1)} MB`;
}

export default function ReleaseCenter({ language = 'vi', currentUser }) {
  const vi = language === 'vi';
  const build = useMemo(() => getRuntimeBuildInfo(), []);
  const [config, setConfig] = useState(getFeatureFlags);
  const [snapshots, setSnapshots] = useState(listFeatureFlagSnapshots);
  const [audit, setAudit] = useState(() => listAuditEvents({ limit: 120 }));
  const [notice, setNotice] = useState('');
  const [auditFilter, setAuditFilter] = useState('');
  const [savingFlags, setSavingFlags] = useState(false);

  useEffect(() => subscribeFeatureFlags((next) => { setConfig(next); setSnapshots(listFeatureFlagSnapshots()); }), []);
  useEffect(() => {
    const refresh = () => setAudit(listAuditEvents({ limit: 120 }));
    window.addEventListener('bes-audit-log-updated', refresh);
    return () => window.removeEventListener('bes-audit-log-updated', refresh);
  }, []);

  const updateRollout = async (id, rollout) => {
    setSavingFlags(true);
    const result = await saveFeatureFlagsToCloud({ ...config, flags: { ...config.flags, [id]: rollout } }, { actor: currentUser });
    setConfig(result.config);
    setSnapshots(listFeatureFlagSnapshots());
    setNotice(result.cloud
      ? (vi ? 'Đã đồng bộ cấu hình toàn hệ thống và tạo điểm khôi phục.' : 'Configuration synced globally with a rollback point.')
      : (vi ? 'Đã lưu cục bộ; chưa đồng bộ Supabase. Hãy kiểm tra migration hoặc kết nối.' : 'Saved locally; Supabase sync is unavailable. Check the migration or connection.'));
    setSavingFlags(false);
  };

  const makeSnapshot = () => {
    createFeatureFlagSnapshot(config, currentUser, 'manual');
    setSnapshots(listFeatureFlagSnapshots());
    setNotice(vi ? 'Đã tạo điểm khôi phục thủ công.' : 'Manual rollback point created.');
  };

  const rollback = async (id) => {
    if (!window.confirm(vi ? 'Khôi phục cấu hình tính năng từ điểm này?' : 'Restore feature flags from this point?')) return;
    setSavingFlags(true);
    try {
      const result = await restoreFeatureFlagSnapshotToCloud(id, currentUser);
      setConfig(result.config);
      setSnapshots(listFeatureFlagSnapshots());
      setNotice(result.cloud
        ? (vi ? 'Đã khôi phục và đồng bộ cấu hình toàn hệ thống.' : 'Configuration restored and synced globally.')
        : (vi ? 'Đã khôi phục cục bộ; chưa đồng bộ Supabase.' : 'Restored locally; Supabase sync is unavailable.'));
    } finally {
      setSavingFlags(false);
    }
  };

  const resetDefaults = async () => {
    if (!window.confirm(vi ? 'Khôi phục toàn bộ cấu hình mặc định?' : 'Reset all flags to defaults?')) return;
    setSavingFlags(true);
    const result = await saveFeatureFlagsToCloud(defaultFeatureFlags(), { actor: currentUser });
    setConfig(result.config);
    setSnapshots(listFeatureFlagSnapshots());
    setNotice(result.cloud
      ? (vi ? 'Đã khôi phục mặc định và đồng bộ toàn hệ thống.' : 'Defaults restored and synced globally.')
      : (vi ? 'Đã khôi phục mặc định cục bộ; chưa đồng bộ Supabase.' : 'Defaults restored locally; Supabase sync is unavailable.'));
    setSavingFlags(false);
  };

  const safeReload = async () => {
    window.dispatchEvent(new CustomEvent('bes-audit', { detail: { action: 'safe_reload_requested', category: 'release', status: 'success', metadata: { version: build.version } } }));
    try {
      if ('caches' in window) {
        const names = await caches.keys();
        await Promise.all(names.filter((name) => /vite|workbox|brian|bes/i.test(name)).map((name) => caches.delete(name)));
      }
      if (navigator.serviceWorker?.getRegistrations) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        await Promise.all(registrations.map((registration) => registration.update().catch(() => null)));
      }
    } catch { /* reload even when cache APIs are unavailable */ }
    const url = new URL(window.location.href);
    url.searchParams.set('v', build.version.replace(/\D/g, ''));
    window.location.replace(url.toString());
  };

  const filteredAudit = audit.filter((item) => !auditFilter || item.category === auditFilter);
  const categories = [...new Set(audit.map((item) => item.category))].sort();

  return (
    <div className="page release-center-page">
      <button type="button" className="back-btn" onClick={() => window.history.back()}>← {vi ? 'Quay lại' : 'Back'}</button>

      <section className="release-hero">
        <div>
          <span>V{build.version} · RELEASE CONTROL</span>
          <h1>{vi ? 'Trung tâm cập nhật & phát hành' : 'Update & Release Center'}</h1>
          <p>{vi ? 'Kiểm soát tính năng, tạo điểm khôi phục, kiểm tra phiên bản và xem nhật ký hoạt động của site.' : 'Control features, create rollback points, inspect the build and review site activity.'}</p>
          <div className="release-hero-actions">
            <button type="button" className="primary" onClick={safeReload}>{vi ? 'Tải lại bản mới an toàn' : 'Safely reload latest build'}</button>
            <button type="button" onClick={makeSnapshot}>{vi ? 'Tạo điểm khôi phục' : 'Create rollback point'}</button>
            <button type="button" onClick={() => window.location.hash = '#/qa'}>{vi ? 'Mở trạng thái hệ thống' : 'Open System Health'}</button>
          </div>
          {notice ? <div className="release-notice" role="status">{notice}</div> : null}
        </div>
        <aside>
          <small>{vi ? 'PHIÊN BẢN ĐANG CHẠY' : 'CURRENT BUILD'}</small>
          <strong>{build.version}</strong>
          <dl>
            <div><dt>{vi ? 'Mã phát hành' : 'Codename'}</dt><dd>{build.codename}</dd></div>
            <div><dt>Commit</dt><dd>{String(build.commit).slice(0, 12)}</dd></div>
            <div><dt>{vi ? 'Môi trường' : 'Environment'}</dt><dd>{build.environment}</dd></div>
            <div><dt>{vi ? 'Ngày phát hành' : 'Released'}</dt><dd>{build.releasedAt}</dd></div>
          </dl>
        </aside>
      </section>

      <section className="release-stats">
        <article><small>{vi ? 'Tính năng đang bật' : 'Enabled features'}</small><strong>{Object.values(config.flags).filter((value) => value !== 'off').length}</strong><span>/{FEATURE_FLAG_DEFINITIONS.length}</span></article>
        <article><small>{vi ? 'Điểm khôi phục' : 'Rollback points'}</small><strong>{snapshots.length}</strong><span>{vi ? 'tối đa 12' : 'max 12'}</span></article>
        <article><small>{vi ? 'Nhật ký trên thiết bị' : 'Device audit events'}</small><strong>{audit.length}</strong><span>{vi ? 'metadata an toàn' : 'safe metadata'}</span></article>
        <article><small>{vi ? 'Bộ nhớ cục bộ' : 'Local storage'}</small><strong>{formatBytes(browserCacheSize())}</strong><span>{vi ? 'ước tính' : 'estimated'}</span></article>
      </section>

      <section className="release-layout">
        <article className="release-card feature-flags-card">
          <header><div><span>01</span><div><h2>Feature Flags</h2><p>{vi ? 'Bật theo nhóm người dùng. Thay đổi có điểm rollback tự động.' : 'Roll out by audience with automatic rollback points.'}</p></div></div><button type="button" disabled={savingFlags} onClick={resetDefaults}>{savingFlags ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Mặc định' : 'Defaults')}</button></header>
          <div className="feature-flag-list">
            {FEATURE_FLAG_DEFINITIONS.map((flag) => (
              <div className="feature-flag-row" key={flag.id}>
                <div><strong>{vi ? flag.vi : flag.en}</strong><small>{vi ? flag.descVi : flag.desc}</small></div>
                <select value={config.flags[flag.id] || 'off'} disabled={savingFlags} onChange={(event) => updateRollout(flag.id, event.target.value)} aria-label={`${vi ? flag.vi : flag.en} rollout`}>
                  {rolloutOptions.map((option) => <option key={option.id} value={option.id}>{vi ? option.vi : option.en}</option>)}
                </select>
              </div>
            ))}
          </div>
        </article>

        <article className="release-card rollback-card">
          <header><div><span>02</span><div><h2>{vi ? 'Khôi phục cấu hình' : 'Configuration rollback'}</h2><p>{vi ? 'Quay lại cấu hình trước mà không cần deploy lại.' : 'Return to a previous configuration without redeploying.'}</p></div></div></header>
          <div className="rollback-list">
            {snapshots.length ? snapshots.map((item) => (
              <div key={item.id}>
                <span>↶</span>
                <div><strong>{item.reason}</strong><small>{formatDate(item.createdAt, language)} · {item.actor}</small></div>
                <button type="button" onClick={() => rollback(item.id)}>{vi ? 'Khôi phục' : 'Restore'}</button>
              </div>
            )) : <p>{vi ? 'Chưa có điểm khôi phục.' : 'No rollback points yet.'}</p>}
          </div>
        </article>

        <article className="release-card security-card">
          <header><div><span>03</span><div><h2>{vi ? 'Bảo vệ phát hành' : 'Release protection'}</h2><p>{vi ? 'Các lớp bảo vệ đang có trong V10.87.' : 'Protection layers active in V10.87.'}</p></div></div></header>
          <ul>
            <li><b>✓</b><span><strong>Release Guard</strong><small>Build, route, version, asset budget and overlay checks.</small></span></li>
            <li><b>✓</b><span><strong>AI Gateway</strong><small>Same-origin, timeout, request-size and rate-limit controls.</small></span></li>
            <li><b>✓</b><span><strong>Upload Gateway</strong><small>Extension, MIME, size, safe name and file-signature checks.</small></span></li>
            <li><b>✓</b><span><strong>Audit Log</strong><small>{vi ? 'Chỉ lưu metadata, không ghi prompt, mật khẩu hoặc API key.' : 'Metadata only; no prompts, passwords or API keys.'}</small></span></li>
          </ul>
        </article>

        <article className="release-card audit-card wide">
          <header>
            <div><span>04</span><div><h2>{vi ? 'Nhật ký hoạt động toàn site' : 'Global site audit log'}</h2><p>{vi ? 'Theo dõi mở route, cập nhật tính năng, rollback và thao tác quản trị trên thiết bị này.' : 'Track route opens, feature changes, rollbacks and admin actions on this device.'}</p></div></div>
            <div className="audit-controls">
              <select value={auditFilter} onChange={(event) => setAuditFilter(event.target.value)}><option value="">{vi ? 'Tất cả nhóm' : 'All categories'}</option>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select>
              <button type="button" onClick={downloadAuditLog}>{vi ? 'Xuất JSON' : 'Export JSON'}</button>
              <button type="button" className="danger" onClick={() => { clearAuditEvents(); setAudit([]); }}>{vi ? 'Xóa log' : 'Clear log'}</button>
            </div>
          </header>
          <div className="release-audit-list">
            {filteredAudit.length ? filteredAudit.slice(0, 80).map((item) => (
              <div key={item.id} data-status={item.status}>
                <span>{item.status === 'success' ? '✓' : item.status === 'error' ? '!' : '•'}</span>
                <div><strong>{item.action}</strong><small>{item.category} · {item.actor?.email || item.actor?.role || 'guest'} · {item.route || '—'}</small></div>
                <time>{formatDate(item.createdAt, language)}</time>
              </div>
            )) : <p>{vi ? 'Chưa có sự kiện audit.' : 'No audit events recorded.'}</p>}
          </div>
        </article>
      </section>
    </div>
  );
}
