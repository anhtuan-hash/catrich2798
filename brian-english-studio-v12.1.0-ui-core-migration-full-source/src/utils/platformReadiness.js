import { diagnoseRuntime } from '../services/runtime/core.js';
import { getPwaState } from './pwa.js';
import { getWebVitalsSnapshot } from './webVitals.js';
import { readAccessibilityPreferences } from './accessibility.js';

function result(id, label, status, detail, group = 'system') {
  return { id, label, status, detail, group };
}

function safeLocalStorageAudit() {
  const findings = [];
  if (typeof window === 'undefined') return findings;
  try {
    for (let index = 0; index < window.localStorage.length; index += 1) {
      const key = window.localStorage.key(index) || '';
      const value = window.localStorage.getItem(key) || '';
      const combined = `${key} ${value}`;
      if (/service[_-]?role|sb_secret_/i.test(combined)) findings.push(key || `entry-${index}`);
    }
  } catch { /* storage may be blocked */ }
  return findings;
}

async function readSecurityHeaders() {
  if (typeof window === 'undefined') return {};
  try {
    const response = await window.fetch(window.location.href, { method: 'HEAD', cache: 'no-store', credentials: 'same-origin' });
    return {
      hsts: response.headers.get('strict-transport-security') || '',
      nosniff: response.headers.get('x-content-type-options') || '',
      referrer: response.headers.get('referrer-policy') || '',
      permissions: response.headers.get('permissions-policy') || '',
      cspReportOnly: response.headers.get('content-security-policy-report-only') || '',
    };
  } catch {
    return {};
  }
}

export async function runSecurityAudit() {
  const runtime = await diagnoseRuntime().catch((error) => ({ lastError: error?.message || String(error) }));
  const headers = await readSecurityHeaders();
  const suspiciousStorage = safeLocalStorageAudit();
  const url = typeof window !== 'undefined' ? new URL(window.location.href) : null;
  const secure = typeof window !== 'undefined' ? window.isSecureContext : false;
  const urlSecrets = url ? [...url.searchParams.keys()].filter((key) => /key|token|secret|password/i.test(key)) : [];
  const checks = [
    result('secure-context', 'Secure context', secure ? 'pass' : 'warn', secure ? 'HTTPS/secure context is active.' : 'Use HTTPS for production.', 'security'),
    result('runtime-config', 'Supabase runtime', runtime.configured && !runtime.lastError ? 'pass' : runtime.configured ? 'warn' : 'info', runtime.configured ? (runtime.lastError || 'Runtime configured.') : 'Supabase is not configured in this environment.', 'security'),
    result('session', 'Authenticated session', runtime.hasSession ? 'pass' : 'info', runtime.hasSession ? `Role: ${runtime.role || 'unknown'}` : 'No active authenticated session.', 'security'),
    result('service-role', 'Service-role exposure', suspiciousStorage.length ? 'fail' : 'pass', suspiciousStorage.length ? `Sensitive-looking entries: ${suspiciousStorage.join(', ')}` : 'No service-role key pattern found in local storage.', 'security'),
    result('url-secrets', 'Secrets in URL', urlSecrets.length ? 'fail' : 'pass', urlSecrets.length ? `Sensitive query keys: ${urlSecrets.join(', ')}` : 'No token/key parameters detected in the current URL.', 'security'),
    result('nosniff', 'X-Content-Type-Options', /nosniff/i.test(headers.nosniff) ? 'pass' : 'warn', headers.nosniff || 'Header not visible yet; redeploy V10.95 headers.', 'headers'),
    result('referrer-policy', 'Referrer Policy', headers.referrer ? 'pass' : 'warn', headers.referrer || 'Header not visible yet.', 'headers'),
    result('permissions-policy', 'Permissions Policy', headers.permissions ? 'pass' : 'warn', headers.permissions || 'Header not visible yet.', 'headers'),
    result('hsts', 'HSTS', headers.hsts ? 'pass' : 'warn', headers.hsts || 'HSTS appears after production HTTPS deployment.', 'headers'),
    result('csp-report', 'CSP Report-Only', headers.cspReportOnly ? 'pass' : 'info', headers.cspReportOnly || 'No report-only policy detected.', 'headers'),
  ];
  return { checkedAt: new Date().toISOString(), runtime, headers, checks };
}

export function runAccessibilityAudit() {
  if (typeof document === 'undefined') return { checks: [] };
  const preferences = readAccessibilityPreferences();
  const interactive = [...document.querySelectorAll('button,a,input,select,textarea,[tabindex]')];
  const unlabeled = interactive.filter((node) => {
    if (node.getAttribute('aria-hidden') === 'true' || node.hasAttribute('disabled')) return false;
    const label = node.getAttribute('aria-label') || node.getAttribute('title') || node.textContent || node.getAttribute('placeholder');
    return !String(label || '').trim();
  });
  const images = [...document.images];
  const missingAlt = images.filter((image) => !image.hasAttribute('alt'));
  const duplicateIds = [...document.querySelectorAll('[id]')]
    .map((node) => node.id)
    .filter((id, index, all) => id && all.indexOf(id) !== index);
  const checks = [
    result('skip-link', 'Skip link', Boolean(document.querySelector('.bes-skip-link')), document.querySelector('.bes-skip-link') ? 'Skip-to-content link is installed.' : 'Skip link is missing.', 'accessibility'),
    result('main-landmark', 'Main landmark', Boolean(document.querySelector('main#bes-main-content')), document.querySelector('main#bes-main-content') ? 'Main content landmark is available.' : 'Main landmark is missing.', 'accessibility'),
    result('unlabeled-controls', 'Accessible control names', unlabeled.length ? 'warn' : 'pass', unlabeled.length ? `${unlabeled.length} controls may need an accessible name.` : 'Visible controls have labels or names.', 'accessibility'),
    result('image-alt', 'Image alternative text', missingAlt.length ? 'warn' : 'pass', missingAlt.length ? `${missingAlt.length} images do not declare alt text.` : 'All rendered images declare alt attributes.', 'accessibility'),
    result('duplicate-ids', 'Unique element IDs', duplicateIds.length ? 'warn' : 'pass', duplicateIds.length ? `Duplicate IDs: ${[...new Set(duplicateIds)].slice(0, 8).join(', ')}` : 'No duplicate IDs detected in the current view.', 'accessibility'),
    result('focus-style', 'Keyboard focus highlight', preferences.focusHighlight ? 'pass' : 'info', preferences.focusHighlight ? 'Enhanced focus rings are active.' : 'Enhanced focus rings are disabled.', 'accessibility'),
    result('motion-pref', 'Reduced motion preference', preferences.motion === 'reduce' || window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ? 'pass' : 'info', preferences.motion === 'reduce' ? 'Reduced motion is enabled in Brian English.' : 'Motion follows the system preference.', 'accessibility'),
  ];
  return { checkedAt: new Date().toISOString(), preferences, checks };
}

export function runPerformanceAudit() {
  const metrics = getWebVitalsSnapshot();
  const lcp = Number(metrics.lcp || 0);
  const cls = Number(metrics.cls || 0);
  const inp = Number(metrics.inp || 0);
  const checks = [
    result('lcp', 'Largest Contentful Paint', !lcp ? 'info' : lcp <= 2500 ? 'pass' : lcp <= 4000 ? 'warn' : 'fail', lcp ? `${lcp} ms` : 'Collecting data…', 'performance'),
    result('cls', 'Cumulative Layout Shift', cls <= 0.1 ? 'pass' : cls <= 0.25 ? 'warn' : 'fail', String(cls || 0), 'performance'),
    result('inp', 'Interaction to Next Paint', !inp ? 'info' : inp <= 200 ? 'pass' : inp <= 500 ? 'warn' : 'fail', inp ? `${inp} ms` : 'Waiting for user interaction…', 'performance'),
    result('long-tasks', 'Long tasks', Number(metrics.longTasks || 0) <= 3 ? 'pass' : 'warn', `${metrics.longTasks || 0} tasks · ${metrics.longTaskTime || 0} ms`, 'performance'),
    result('resources', 'Loaded resources', Number(metrics.resources?.count || 0) <= 180 ? 'pass' : 'warn', `${metrics.resources?.count || 0} resources`, 'performance'),
    result('transfer', 'Transferred resources', Number(metrics.resources?.transferSize || 0) <= 5 * 1024 * 1024 ? 'pass' : 'warn', `${Math.round(Number(metrics.resources?.transferSize || 0) / 1024)} KB`, 'performance'),
  ];
  return { checkedAt: new Date().toISOString(), metrics, checks };
}

export function runPwaAudit() {
  const pwa = getPwaState();
  const hasManifest = typeof document !== 'undefined' && Boolean(document.querySelector('link[rel="manifest"]'));
  const checks = [
    result('manifest', 'Web app manifest', hasManifest ? 'pass' : 'fail', hasManifest ? 'manifest.webmanifest is linked.' : 'Manifest link is missing.', 'pwa'),
    result('sw-supported', 'Service worker support', pwa.supported ? 'pass' : 'warn', pwa.supported ? 'Browser supports service workers.' : 'Service workers are unavailable.', 'pwa'),
    result('sw-registered', 'Service worker registration', pwa.registered ? 'pass' : 'warn', pwa.registered ? 'Service worker registered.' : (pwa.lastError || 'Registration is pending.'), 'pwa'),
    result('sw-controlled', 'Offline control', pwa.controlled ? 'pass' : 'info', pwa.controlled ? 'This page is controlled by the service worker.' : 'Reload once after first registration.', 'pwa'),
    result('installable', 'Install status', pwa.installed ? 'pass' : pwa.installable ? 'pass' : 'info', pwa.installed ? 'App is running in installed mode.' : pwa.installable ? 'Install prompt is available.' : 'Install prompt depends on browser eligibility.', 'pwa'),
    result('online', 'Network state', navigator.onLine ? 'pass' : 'info', navigator.onLine ? 'Online.' : 'Offline mode active.', 'pwa'),
  ];
  return { checkedAt: new Date().toISOString(), pwa, checks };
}

export function downloadReadinessReport(report) {
  const safe = { version: '10.99.0', exportedAt: new Date().toISOString(), ...report };
  const blob = new Blob([JSON.stringify(safe, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `brian-platform-readiness-${Date.now()}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}
