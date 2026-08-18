const QUALITY_STORAGE_KEY = 'brian-v2-quality-ledger-v1';
export const V2_QUALITY_EVENT = 'brian-v2-quality-ledger';

export const V2_QUALITY_ROUTES = Object.freeze([
  'home',
  'apps',
  'resources',
  'news',
  'homeroom',
  'students',
  'dashboard',
  'work-hub',
  'assessment',
  'collaboration',
  'reports',
  'settings',
  'admin',
  'cloud',
]);

export const V2_VIEWPORT_PRESETS = Object.freeze([
  { id: 'phone', label: 'Phone', width: 390, height: 844, note: 'Compact phone portrait' },
  { id: 'ipad-portrait', label: 'iPad portrait', width: 820, height: 1180, note: 'Tablet portrait' },
  { id: 'ipad-landscape', label: 'iPad landscape', width: 1180, height: 820, note: 'Tablet landscape' },
  { id: 'laptop', label: 'Laptop', width: 1366, height: 768, note: 'Compact laptop' },
  { id: 'desktop', label: 'Desktop', width: 1600, height: 900, note: 'Desktop workspace' },
  { id: 'tv-65', label: 'TV 65-inch', width: 3840, height: 2160, note: '4K classroom display simulation' },
]);

function readRawLedger() {
  if (typeof window === 'undefined') return { routes: {}, viewports: {} };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(QUALITY_STORAGE_KEY) || '{}');
    return {
      routes: parsed?.routes && typeof parsed.routes === 'object' ? parsed.routes : {},
      viewports: parsed?.viewports && typeof parsed.viewports === 'object' ? parsed.viewports : {},
    };
  } catch {
    return { routes: {}, viewports: {} };
  }
}

function persistLedger(ledger) {
  try { window.localStorage.setItem(QUALITY_STORAGE_KEY, JSON.stringify(ledger)); } catch { /* QA persistence is optional */ }
  window.dispatchEvent?.(new CustomEvent(V2_QUALITY_EVENT));
  return ledger;
}

export function readQualityLedger() {
  return readRawLedger();
}

export function resetQualityLedger() {
  try { window.localStorage.removeItem(QUALITY_STORAGE_KEY); } catch { /* optional */ }
  window.dispatchEvent?.(new CustomEvent(V2_QUALITY_EVENT, { detail: { cleared: true } }));
  return { routes: {}, viewports: {} };
}

function visible(node, view) {
  if (!node || !view) return false;
  const style = view.getComputedStyle?.(node);
  if (!style || style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity || 1) === 0 || node.hidden) return false;
  const rect = node.getBoundingClientRect?.();
  return Boolean(rect && rect.width > 0 && rect.height > 0);
}

function labelledByText(node, doc) {
  return String(node.getAttribute?.('aria-labelledby') || '')
    .split(/\s+/)
    .filter(Boolean)
    .map((id) => String(doc.getElementById(id)?.textContent || '').trim())
    .filter(Boolean)
    .join(' ');
}

function associatedLabelText(node, doc) {
  const id = node.id;
  const direct = id ? doc.querySelector(`label[for="${CSS.escape(id)}"]`) : null;
  const wrapped = node.closest?.('label');
  return String(direct?.textContent || wrapped?.textContent || '').trim();
}

function accessibleName(node, doc) {
  const aria = String(node.getAttribute?.('aria-label') || '').trim();
  if (aria) return aria;
  const labelled = labelledByText(node, doc);
  if (labelled) return labelled;
  const tag = String(node.tagName || '').toLowerCase();
  if (['input', 'textarea', 'select'].includes(tag)) {
    const label = associatedLabelText(node, doc);
    if (label) return label;
  }
  if (tag === 'img') return String(node.getAttribute?.('alt') || '').trim();
  const text = String(node.textContent || '').replace(/\s+/g, ' ').trim();
  if (text) return text;
  return String(node.getAttribute?.('title') || '').trim();
}

function issue(id, label, nodes = [], { critical = false, detail = '' } = {}) {
  return { id, label, count: nodes.length, critical, detail };
}

export function auditAccessibilityDocument(doc, route = 'current') {
  const view = doc?.defaultView;
  if (!doc?.documentElement || !view) {
    return { route, status: 'fail', criticalCount: 1, warningCount: 0, checkedAt: new Date().toISOString(), issues: [issue('document', 'Document unavailable', [{}], { critical: true })] };
  }

  const issues = [];
  const idNodes = [...doc.querySelectorAll('[id]')];
  const idCounts = new Map();
  idNodes.forEach((node) => idCounts.set(node.id, (idCounts.get(node.id) || 0) + 1));
  const duplicateIds = [...idCounts.entries()].filter(([, count]) => count > 1);
  if (duplicateIds.length) issues.push(issue('duplicate-id', 'Duplicate IDs', duplicateIds, { critical: true, detail: duplicateIds.map(([id, count]) => `${id}×${count}`).slice(0, 8).join(', ') }));

  const mainCount = doc.querySelectorAll('main').length;
  if (mainCount !== 1) issues.push(issue('main-landmark', 'Exactly one main landmark', new Array(Math.abs(mainCount - 1) || 1).fill({}), { critical: true, detail: `${mainCount} main landmarks` }));

  const unnamedInteractive = [...doc.querySelectorAll('button,a[href],[role="button"]')]
    .filter((node) => visible(node, view) && !accessibleName(node, doc));
  if (unnamedInteractive.length) issues.push(issue('interactive-name', 'Interactive controls without accessible name', unnamedInteractive, { critical: true, detail: `${unnamedInteractive.length} visible controls` }));

  const formControls = [...doc.querySelectorAll('input:not([type="hidden"]),textarea,select')].filter((node) => visible(node, view));
  const unnamedForm = formControls.filter((node) => !accessibleName(node, doc));
  if (unnamedForm.length) issues.push(issue('form-name', 'Form controls without accessible label', unnamedForm, { critical: true, detail: `${unnamedForm.length} controls` }));

  const imagesMissingAlt = [...doc.querySelectorAll('img:not([alt])')].filter((node) => visible(node, view));
  if (imagesMissingAlt.length) issues.push(issue('image-alt', 'Visible images missing alt attribute', imagesMissingAlt, { detail: `${imagesMissingAlt.length} images` }));

  const unnamedDialogs = [...doc.querySelectorAll('[role="dialog"],dialog')].filter((node) => visible(node, view) && !accessibleName(node, doc));
  if (unnamedDialogs.length) issues.push(issue('dialog-name', 'Open dialogs without accessible name', unnamedDialogs, { critical: true, detail: `${unnamedDialogs.length} dialogs` }));

  const h1Count = [...doc.querySelectorAll('h1')].filter((node) => visible(node, view)).length;
  if (h1Count === 0) issues.push(issue('h1', 'No visible H1 on route', [{}], { detail: 'Page hierarchy should expose a primary heading.' }));
  if (h1Count > 1) issues.push(issue('h1-multiple', 'Multiple visible H1 headings', new Array(h1Count).fill({}), { detail: `${h1Count} H1 headings` }));

  const tabbables = [...doc.querySelectorAll('button,a[href],input:not([type="hidden"]),textarea,select,[tabindex]:not([tabindex="-1"])')].filter((node) => visible(node, view));
  const smallTargets = tabbables.filter((node) => {
    const rect = node.getBoundingClientRect();
    return rect.width < 32 || rect.height < 32;
  });
  if (smallTargets.length) issues.push(issue('small-target', 'Interactive targets below 32px', smallTargets, { detail: `${smallTargets.length}/${tabbables.length} visible targets` }));

  const criticalCount = issues.filter((item) => item.critical).reduce((sum, item) => sum + item.count, 0);
  const warningCount = issues.filter((item) => !item.critical).reduce((sum, item) => sum + item.count, 0);
  return {
    route,
    status: criticalCount ? 'fail' : warningCount ? 'warn' : 'pass',
    criticalCount,
    warningCount,
    checkedAt: new Date().toISOString(),
    issueCount: issues.length,
    issues,
    metrics: { tabbables: tabbables.length, formControls: formControls.length, h1Count, mainCount },
  };
}

function resourceBytes(resources, kind) {
  return resources
    .filter((entry) => kind === 'js' ? /\.m?js(?:\?|$)/i.test(entry.name) : kind === 'css' ? /\.css(?:\?|$)/i.test(entry.name) : true)
    .reduce((sum, entry) => sum + Number(entry.transferSize || entry.encodedBodySize || 0), 0);
}

export function auditPerformanceWindow(view, doc, route = 'current') {
  if (!view?.performance || !doc?.documentElement) {
    return { route, status: 'fail', checkedAt: new Date().toISOString(), criticalCount: 1, warningCount: 0, metrics: {}, issues: [{ id: 'performance-api', label: 'Performance API unavailable', critical: true, detail: '' }] };
  }
  const resources = view.performance.getEntriesByType?.('resource') || [];
  const longTasks = view.performance.getEntriesByType?.('longtask') || [];
  const domNodes = doc.getElementsByTagName('*').length;
  const iframeCount = doc.querySelectorAll('iframe').length;
  const jsBytes = resourceBytes(resources, 'js');
  const cssBytes = resourceBytes(resources, 'css');
  const longestTask = longTasks.reduce((max, item) => Math.max(max, Number(item.duration || 0)), 0);
  const nav = view.performance.getEntriesByType?.('navigation')?.[0];
  const domContentLoaded = Number(nav?.domContentLoadedEventEnd || 0);

  const issues = [];
  const add = (id, label, critical, detail) => issues.push({ id, label, critical, detail });
  if (domNodes > 6000) add('dom-nodes', 'DOM node count is excessive', true, `${domNodes} nodes`);
  else if (domNodes > 3500) add('dom-nodes', 'DOM node count is high', false, `${domNodes} nodes`);
  if (jsBytes > 4_000_000) add('js-transfer', 'JavaScript transfer is excessive', true, `${Math.round(jsBytes / 1024)} KB`);
  else if (jsBytes > 2_500_000) add('js-transfer', 'JavaScript transfer is high', false, `${Math.round(jsBytes / 1024)} KB`);
  if (iframeCount > 4) add('iframe-count', 'Too many active iframes', false, `${iframeCount} iframes`);
  if (longestTask > 500) add('long-task', 'Very long main-thread task observed', true, `${Math.round(longestTask)} ms`);
  else if (longestTask > 200) add('long-task', 'Long main-thread task observed', false, `${Math.round(longestTask)} ms`);
  if (domContentLoaded > 5000) add('dom-content-loaded', 'DOM content loaded time is high', false, `${Math.round(domContentLoaded)} ms`);

  const criticalCount = issues.filter((item) => item.critical).length;
  const warningCount = issues.filter((item) => !item.critical).length;
  return {
    route,
    status: criticalCount ? 'fail' : warningCount ? 'warn' : 'pass',
    checkedAt: new Date().toISOString(),
    criticalCount,
    warningCount,
    issues,
    metrics: {
      domNodes,
      iframeCount,
      resources: resources.length,
      jsKB: Math.round(jsBytes / 1024),
      cssKB: Math.round(cssBytes / 1024),
      longTasks: longTasks.length,
      longestTaskMs: Math.round(longestTask),
      domContentLoadedMs: Math.round(domContentLoaded),
    },
  };
}

export function auditQualityFrame(frame, route) {
  let doc = null;
  let view = null;
  try {
    doc = frame?.contentDocument || null;
    view = frame?.contentWindow || null;
  } catch {
    doc = null;
    view = null;
  }
  const accessibility = auditAccessibilityDocument(doc, route);
  const performance = auditPerformanceWindow(view, doc, route);
  const observedHash = (() => {
    try { return String(view?.location?.hash || '').replace(/^#/, ''); } catch { return ''; }
  })();
  const result = { route, observedHash, checkedAt: new Date().toISOString(), accessibility, performance };
  const ledger = readRawLedger();
  ledger.routes[route] = result;
  persistLedger(ledger);
  return result;
}

export function setViewportReviewed(id, reviewed) {
  if (!V2_VIEWPORT_PRESETS.some((item) => item.id === id)) return readRawLedger();
  const ledger = readRawLedger();
  ledger.viewports[id] = { reviewed: Boolean(reviewed), at: new Date().toISOString() };
  return persistLedger(ledger);
}

export function getQualitySummary(ledger = readRawLedger(), { routes = V2_QUALITY_ROUTES, viewports = V2_VIEWPORT_PRESETS } = {}) {
  const routeReports = routes.map((route) => ledger?.routes?.[route]).filter(Boolean);
  const routeAuditComplete = routes.length > 0 && routeReports.length === routes.length;
  const accessibilityFailures = routeReports.filter((item) => item?.accessibility?.status === 'fail').length;
  const accessibilityWarnings = routeReports.filter((item) => item?.accessibility?.status === 'warn').length;
  const performanceFailures = routeReports.filter((item) => item?.performance?.status === 'fail').length;
  const performanceWarnings = routeReports.filter((item) => item?.performance?.status === 'warn').length;
  const viewportReviewed = viewports.filter((item) => ledger?.viewports?.[item.id]?.reviewed).length;
  const viewportComplete = viewports.length > 0 && viewportReviewed === viewports.length;
  const accessibilityReady = routeAuditComplete && accessibilityFailures === 0;
  const performanceReady = routeAuditComplete && performanceFailures === 0;
  const automatedReady = accessibilityReady && performanceReady;
  return {
    routeRequired: routes.length,
    routeAudited: routeReports.length,
    routeAuditComplete,
    accessibilityFailures,
    accessibilityWarnings,
    accessibilityReady,
    performanceFailures,
    performanceWarnings,
    performanceReady,
    viewportRequired: viewports.length,
    viewportReviewed,
    viewportComplete,
    automatedReady,
    qualityReady: automatedReady && viewportComplete,
  };
}
