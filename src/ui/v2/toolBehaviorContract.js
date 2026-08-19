const CONTRACT_STORAGE_KEY = 'brian-v2-tool-contract-ledger-v1';
export const TOOL_CONTRACT_EVENT = 'brian-v2-tool-contract';

const DUPLICATE_CHROME = [
  '.bes-top-chrome',
  '.global-flat-navigation',
  '.status-menu-bar',
  '.brian-briefing-bar',
  '.transfer-inbox-banner',
  '.site-footer',
  '.global-footer',
  'footer[role="contentinfo"]',
];

function safeLedger() {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(CONTRACT_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function readToolContractLedger() {
  return safeLedger();
}

export function clearToolContractLedger() {
  try { window.localStorage.removeItem(CONTRACT_STORAGE_KEY); } catch { /* optional QA persistence */ }
  window.dispatchEvent?.(new CustomEvent(TOOL_CONTRACT_EVENT, { detail: { cleared: true } }));
}

function persistResult(result) {
  try {
    const ledger = safeLedger();
    ledger[result.slug] = result;
    window.localStorage.setItem(CONTRACT_STORAGE_KEY, JSON.stringify(ledger));
  } catch {
    /* QA ledger must never break the tool runtime. */
  }
  window.dispatchEvent?.(new CustomEvent(TOOL_CONTRACT_EVENT, { detail: result }));
}

function hiddenOrMissing(doc, selector) {
  const nodes = [...doc.querySelectorAll(selector)];
  if (!nodes.length) return true;
  return nodes.every((node) => {
    const style = doc.defaultView?.getComputedStyle?.(node);
    return !style || style.display === 'none' || style.visibility === 'hidden' || node.hidden;
  });
}

function check(id, label, pass, { critical = false, detail = '' } = {}) {
  return { id, label, pass: Boolean(pass), critical, detail };
}

function resolveAdapterEvidence(doc) {
  const candidates = [
    {
      phase: 1,
      tag: doc.documentElement.dataset.b2ToolAdapter || '',
      style: doc.getElementById('b2-v2-tool-chrome-adapter'),
    },
    {
      phase: 2,
      tag: doc.documentElement.dataset.b2ToolAdapterPhase2 || '',
      style: doc.getElementById('b2-v2-tool-chrome-adapter-phase2'),
    },
    {
      phase: 3,
      tag: doc.documentElement.dataset.b2ToolAdapterPhase3 || '',
      style: doc.getElementById('b2-v2-tool-chrome-adapter-phase3'),
    },
  ];
  return candidates.find((item) => item.tag && item.style) || { phase: 0, tag: '', style: null };
}

export function runToolBehaviorContract(frame, slug, { level2 = false } = {}) {
  const checkedAt = new Date().toISOString();
  const checks = [];
  let doc = null;
  let href = '';

  try {
    doc = frame?.contentDocument || null;
    href = frame?.contentWindow?.location?.href || '';
    checks.push(check('same-origin', 'Same-origin runtime access', Boolean(doc?.documentElement), { critical: true, detail: href || 'document unavailable' }));
  } catch (error) {
    checks.push(check('same-origin', 'Same-origin runtime access', false, { critical: true, detail: error?.message || 'cross-origin access blocked' }));
  }

  if (doc?.documentElement) {
    const routeOk = href.includes(`/tool/${encodeURIComponent(slug)}`) || href.includes(`/tool/${slug}`);
    const bodyMounted = Boolean(doc.body && (doc.body.children.length || String(doc.body.textContent || '').trim()));
    const interactiveCount = doc.querySelectorAll('button,a[href],input,textarea,select,[role="button"],[tabindex]:not([tabindex="-1"])').length;
    const duplicateChromeOk = DUPLICATE_CHROME.every((selector) => hiddenOrMissing(doc, selector));
    const nestedV2 = doc.querySelector('.b2-shell,[data-brian-ui="v2"]');
    const adapter = resolveAdapterEvidence(doc);
    const adapterOk = !level2 || (adapter.tag === slug && Boolean(adapter.style));
    const rootWidth = Math.max(doc.documentElement.scrollWidth || 0, doc.body?.scrollWidth || 0);
    const viewportWidth = frame?.clientWidth || doc.documentElement.clientWidth || 0;
    const overflow = viewportWidth > 0 && rootWidth > viewportWidth + 96;

    checks.push(check('route', 'Correct legacy tool route', routeOk, { critical: true, detail: href }));
    checks.push(check('mounted', 'Runtime root mounted', bodyMounted, { critical: true }));
    checks.push(check('interactive', 'Interactive controls present', interactiveCount > 0, { detail: `${interactiveCount} interactive nodes` }));
    checks.push(check('chrome-cleanup', 'Duplicate global chrome removed', duplicateChromeOk, { critical: true }));
    checks.push(check('adapter', level2 ? 'Level 2 adapter installed' : 'Level 1 bridge does not require adapter', adapterOk, { critical: level2, detail: adapter.tag ? `phase ${adapter.phase} · ${adapter.tag}` : 'no adapter tag' }));
    checks.push(check('isolation', 'No nested Metro Next shell', !nestedV2, { critical: true }));
    checks.push(check('horizontal-overflow', 'No severe horizontal overflow', !overflow, { detail: `${rootWidth}px content / ${viewportWidth}px viewport` }));
  }

  const failedCritical = checks.filter((item) => item.critical && !item.pass);
  const warnings = checks.filter((item) => !item.critical && !item.pass);
  const status = failedCritical.length ? 'fail' : warnings.length ? 'warn' : 'pass';
  const result = {
    slug,
    status,
    level: level2 ? 2 : 1,
    checkedAt,
    passCount: checks.filter((item) => item.pass).length,
    totalCount: checks.length,
    checks,
  };
  persistResult(result);
  return result;
}
