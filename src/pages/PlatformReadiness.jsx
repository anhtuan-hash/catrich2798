import React, { useEffect, useMemo, useState } from 'react';
import { clearPwaCaches, getPwaState, requestPwaInstall, subscribePwaState } from '../utils/pwa.js';
import { DEFAULT_ACCESSIBILITY_PREFERENCES, readAccessibilityPreferences, resetAccessibilityPreferences, saveAccessibilityPreferences } from '../utils/accessibility.js';
import { downloadReadinessReport, runAccessibilityAudit, runPerformanceAudit, runPwaAudit, runSecurityAudit } from '../utils/platformReadiness.js';
import { subscribeWebVitals } from '../utils/webVitals.js';

const COPY = {
  vi: {
    eyebrow: 'V10.95 · PLATFORM READINESS', title: 'PWA, bảo mật, khả năng tiếp cận & hiệu năng',
    desc: 'Cài Brian English như ứng dụng, kiểm tra các lớp bảo vệ, điều chỉnh trải nghiệm tiếp cận và theo dõi chỉ số hiệu năng thực tế.',
    overview: 'Tổng quan', pwa: 'Ứng dụng PWA', security: 'Bảo mật', accessibility: 'Tiếp cận', performance: 'Hiệu năng',
    refresh: 'Kiểm tra lại', export: 'Xuất báo cáo', install: 'Cài ứng dụng', installed: 'Đã cài', clearCache: 'Xóa cache PWA', reset: 'Khôi phục mặc định', save: 'Lưu thiết lập',
  },
  en: {
    eyebrow: 'V10.95 · PLATFORM READINESS', title: 'PWA, security, accessibility & performance',
    desc: 'Install Brian English as an app, audit protection layers, tune accessibility and monitor real-user performance metrics.',
    overview: 'Overview', pwa: 'PWA app', security: 'Security', accessibility: 'Accessibility', performance: 'Performance',
    refresh: 'Run checks', export: 'Export report', install: 'Install app', installed: 'Installed', clearCache: 'Clear PWA cache', reset: 'Reset defaults', save: 'Save settings',
  },
};

function tone(status) {
  return status === 'pass' ? 'good' : status === 'fail' ? 'bad' : status === 'warn' ? 'warn' : 'info';
}

function CheckGrid({ items = [] }) {
  return <div className="v1095-check-grid">{items.map((item) => (
    <article key={item.id} className="v1095-check" data-tone={tone(item.status)}>
      <span>{item.status === 'pass' ? '✓' : item.status === 'fail' ? '!' : item.status === 'warn' ? '△' : 'i'}</span>
      <div><strong>{item.label}</strong><p>{item.detail}</p></div>
    </article>
  ))}</div>;
}

export default function PlatformReadiness({ language = 'vi' }) {
  const t = COPY[language] || COPY.vi;
  const [tab, setTab] = useState('overview');
  const [pwaState, setPwaState] = useState(getPwaState());
  const [preferences, setPreferences] = useState(readAccessibilityPreferences());
  const [report, setReport] = useState({ pwa: runPwaAudit(), accessibility: runAccessibilityAudit(), performance: runPerformanceAudit(), security: { checks: [] } });
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setBusy(true);
    const security = await runSecurityAudit();
    setReport({ pwa: runPwaAudit(), accessibility: runAccessibilityAudit(), performance: runPerformanceAudit(), security });
    setBusy(false);
  };

  useEffect(() => {
    refresh();
    const unsubPwa = subscribePwaState((next) => { setPwaState(next); setReport((previous) => ({ ...previous, pwa: runPwaAudit() })); });
    const unsubPerf = subscribeWebVitals(() => setReport((previous) => ({ ...previous, performance: runPerformanceAudit() })));
    return () => { unsubPwa(); unsubPerf(); };
  }, []);

  const allChecks = useMemo(() => [
    ...(report.pwa?.checks || []), ...(report.security?.checks || []), ...(report.accessibility?.checks || []), ...(report.performance?.checks || []),
  ], [report]);
  const summary = useMemo(() => ({
    pass: allChecks.filter((item) => item.status === 'pass').length,
    warn: allChecks.filter((item) => item.status === 'warn').length,
    fail: allChecks.filter((item) => item.status === 'fail').length,
  }), [allChecks]);

  const savePreferences = () => {
    const next = saveAccessibilityPreferences(preferences);
    setPreferences(next);
    setReport((previous) => ({ ...previous, accessibility: runAccessibilityAudit() }));
  };

  const resetPreferences = () => {
    const next = resetAccessibilityPreferences();
    setPreferences(next);
    setReport((previous) => ({ ...previous, accessibility: runAccessibilityAudit() }));
  };

  const tabs = [
    ['overview', t.overview], ['pwa', t.pwa], ['security', t.security], ['accessibility', t.accessibility], ['performance', t.performance],
  ];

  return (
    <div className="page v1095-readiness-page">
      <section className="v1095-hero">
        <div>
          <p>{t.eyebrow}</p>
          <h1>{t.title}</h1>
          <p>{t.desc}</p>
        </div>
        <div className="v1095-hero-actions">
          <button type="button" className="primary" onClick={refresh} disabled={busy}>{busy ? '…' : t.refresh}</button>
          <button type="button" className="secondary" onClick={() => downloadReadinessReport(report)}>{t.export}</button>
        </div>
      </section>

      <section className="v1095-summary" aria-label={t.overview}>
        <article><strong>{summary.pass}</strong><span>{language === 'vi' ? 'kiểm tra đạt' : 'checks passed'}</span></article>
        <article><strong>{summary.warn}</strong><span>{language === 'vi' ? 'cần xem xét' : 'need review'}</span></article>
        <article><strong>{summary.fail}</strong><span>{language === 'vi' ? 'cần xử lý' : 'need action'}</span></article>
        <article><strong>{pwaState.installed ? 'PWA' : navigator.onLine ? 'ONLINE' : 'OFFLINE'}</strong><span>{language === 'vi' ? 'trạng thái hiện tại' : 'current state'}</span></article>
      </section>

      <div className="v1095-tabs" role="tablist">
        {tabs.map(([id, label]) => <button key={id} type="button" role="tab" aria-selected={tab === id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>{label}</button>)}
      </div>

      {tab === 'overview' && <section className="v1095-panel"><CheckGrid items={allChecks} /></section>}

      {tab === 'pwa' && <section className="v1095-panel">
        <header><div><span>PWA</span><h2>{t.pwa}</h2></div><div className="v1095-inline-actions">
          <button type="button" className="primary" disabled={pwaState.installed || !pwaState.installable} onClick={requestPwaInstall}>{pwaState.installed ? t.installed : t.install}</button>
          <button type="button" className="secondary" onClick={async () => { await clearPwaCaches(); await refresh(); }}>{t.clearCache}</button>
        </div></header>
        <CheckGrid items={report.pwa?.checks} />
        <p className="v1095-note">{language === 'vi' ? 'Safari trên macOS có thể không hiện beforeinstallprompt; hãy dùng Chia sẻ → Thêm vào Dock nếu trình duyệt hỗ trợ.' : 'Safari on macOS may not expose beforeinstallprompt; use Share → Add to Dock when available.'}</p>
      </section>}

      {tab === 'security' && <section className="v1095-panel">
        <header><div><span>SEC</span><h2>{t.security}</h2></div></header>
        <CheckGrid items={report.security?.checks} />
        <div className="v1095-callout"><strong>{language === 'vi' ? 'Nguyên tắc V10.95' : 'V10.95 principle'}</strong><p>{language === 'vi' ? 'Không hiển thị API key, access token hoặc service-role key trong báo cáo tải xuống.' : 'Downloaded reports never include API keys, access tokens or service-role key values.'}</p></div>
      </section>}

      {tab === 'accessibility' && <section className="v1095-panel">
        <header><div><span>A11Y</span><h2>{t.accessibility}</h2></div><div className="v1095-inline-actions"><button type="button" className="secondary" onClick={resetPreferences}>{t.reset}</button><button type="button" className="primary" onClick={savePreferences}>{t.save}</button></div></header>
        <div className="v1095-settings-grid">
          <label><span>{language === 'vi' ? 'Độ tương phản' : 'Contrast'}</span><select value={preferences.contrast} onChange={(event) => setPreferences({ ...preferences, contrast: event.target.value })}><option value="standard">{language === 'vi' ? 'Tiêu chuẩn' : 'Standard'}</option><option value="high">{language === 'vi' ? 'Tương phản cao' : 'High contrast'}</option></select></label>
          <label><span>{language === 'vi' ? 'Chuyển động' : 'Motion'}</span><select value={preferences.motion} onChange={(event) => setPreferences({ ...preferences, motion: event.target.value })}><option value="system">{language === 'vi' ? 'Theo hệ thống' : 'Follow system'}</option><option value="reduce">{language === 'vi' ? 'Giảm chuyển động' : 'Reduce motion'}</option></select></label>
          <label><span>{language === 'vi' ? 'Kích thước vùng bấm' : 'Target size'}</span><select value={preferences.targetSize} onChange={(event) => setPreferences({ ...preferences, targetSize: event.target.value })}><option value="standard">{language === 'vi' ? 'Tiêu chuẩn' : 'Standard'}</option><option value="large">{language === 'vi' ? 'Lớn, dễ chạm' : 'Large touch targets'}</option></select></label>
          <label className="v1095-toggle"><input type="checkbox" checked={preferences.readableFont} onChange={(event) => setPreferences({ ...preferences, readableFont: event.target.checked })}/><span>{language === 'vi' ? 'Dùng font hệ thống dễ đọc' : 'Use readable system font'}</span></label>
          <label className="v1095-toggle"><input type="checkbox" checked={preferences.underlineLinks} onChange={(event) => setPreferences({ ...preferences, underlineLinks: event.target.checked })}/><span>{language === 'vi' ? 'Gạch chân liên kết' : 'Underline links'}</span></label>
          <label className="v1095-toggle"><input type="checkbox" checked={preferences.focusHighlight} onChange={(event) => setPreferences({ ...preferences, focusHighlight: event.target.checked })}/><span>{language === 'vi' ? 'Làm nổi bật focus bàn phím' : 'Enhanced keyboard focus'}</span></label>
          <label className="v1095-toggle"><input type="checkbox" checked={preferences.announcements} onChange={(event) => setPreferences({ ...preferences, announcements: event.target.checked })}/><span>{language === 'vi' ? 'Thông báo cho trình đọc màn hình' : 'Screen-reader announcements'}</span></label>
        </div>
        <CheckGrid items={report.accessibility?.checks} />
      </section>}

      {tab === 'performance' && <section className="v1095-panel">
        <header><div><span>PERF</span><h2>{t.performance}</h2></div></header>
        <CheckGrid items={report.performance?.checks} />
        <div className="v1095-budget"><strong>{language === 'vi' ? 'Ngân sách build V10.95' : 'V10.95 build budgets'}</strong><span>JS chunk ≤ 750 KB</span><span>CSS total ≤ 1.3 MB</span><span>Total dist assets ≤ 25 MB</span></div>
      </section>}
    </div>
  );
}
