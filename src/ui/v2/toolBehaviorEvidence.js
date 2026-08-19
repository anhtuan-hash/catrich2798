import { TOOL_BEHAVIOR_MANIFEST, resetToolBehaviorLedger, setToolBehaviorCheck } from './toolBehaviorManifest.js';

export const TOOL_BEHAVIOR_DETAIL_EVENT = 'brian-v2-tool-behavior-detail';
export const TOOL_BEHAVIOR_DETAIL_STORAGE_KEY = 'brian-v2-tool-behavior-detail-v1';

function readRaw() {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(TOOL_BEHAVIOR_DETAIL_STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function persist(ledger) {
  if (typeof window !== 'undefined') {
    try { window.localStorage.setItem(TOOL_BEHAVIOR_DETAIL_STORAGE_KEY, JSON.stringify(ledger)); } catch { /* QA evidence persistence is best-effort */ }
    window.dispatchEvent?.(new CustomEvent(TOOL_BEHAVIOR_DETAIL_EVENT));
  }
  return ledger;
}

function validCheck(slug, checkId) {
  return Boolean(TOOL_BEHAVIOR_MANIFEST[slug]?.checks?.some((item) => item.id === checkId));
}

function normalizeStatus(status) {
  return ['pass', 'fail'].includes(String(status || '').toLowerCase()) ? String(status).toLowerCase() : 'pending';
}

export function readToolBehaviorDetailLedger() {
  return readRaw();
}

export function setToolBehaviorEvidence(slug, checkId, status, note = '') {
  if (!validCheck(slug, checkId)) return readRaw();
  const normalized = normalizeStatus(status);
  const ledger = readRaw();
  const toolState = ledger[slug] && typeof ledger[slug] === 'object' ? ledger[slug] : {};
  const previous = toolState[checkId] && typeof toolState[checkId] === 'object' ? toolState[checkId] : {};
  toolState[checkId] = {
    status: normalized,
    note: String(note ?? previous.note ?? '').slice(0, 1200),
    at: new Date().toISOString(),
  };
  ledger[slug] = toolState;
  persist(ledger);
  setToolBehaviorCheck(slug, checkId, normalized === 'pass');
  return ledger;
}

export function updateToolBehaviorEvidenceNote(slug, checkId, note) {
  if (!validCheck(slug, checkId)) return readRaw();
  const ledger = readRaw();
  const toolState = ledger[slug] && typeof ledger[slug] === 'object' ? ledger[slug] : {};
  const previous = toolState[checkId] && typeof toolState[checkId] === 'object' ? toolState[checkId] : {};
  toolState[checkId] = {
    status: normalizeStatus(previous.status),
    note: String(note || '').slice(0, 1200),
    at: previous.at || new Date().toISOString(),
  };
  ledger[slug] = toolState;
  return persist(ledger);
}

export function resetToolBehaviorDetailLedger({ resetBooleanLedger = true } = {}) {
  if (typeof window !== 'undefined') {
    try { window.localStorage.removeItem(TOOL_BEHAVIOR_DETAIL_STORAGE_KEY); } catch { /* optional */ }
    window.dispatchEvent?.(new CustomEvent(TOOL_BEHAVIOR_DETAIL_EVENT, { detail: { cleared: true } }));
  }
  if (resetBooleanLedger) resetToolBehaviorLedger();
  return {};
}

export function summarizeToolBehaviorDetail(ledger = readRaw()) {
  let required = 0;
  let passed = 0;
  let failed = 0;
  const tools = Object.entries(TOOL_BEHAVIOR_MANIFEST).map(([slug, manifest]) => {
    const checks = (manifest.checks || []).map((item) => {
      const evidence = ledger?.[slug]?.[item.id] || {};
      const status = normalizeStatus(evidence.status);
      required += 1;
      if (status === 'pass') passed += 1;
      if (status === 'fail') failed += 1;
      return { ...item, status, note: evidence.note || '', at: evidence.at || '' };
    });
    return {
      slug,
      label: manifest.label || slug,
      checks,
      passed: checks.filter((item) => item.status === 'pass').length,
      failed: checks.filter((item) => item.status === 'fail').length,
      complete: checks.length > 0 && checks.every((item) => item.status === 'pass'),
    };
  });
  return {
    required,
    passed,
    failed,
    pending: Math.max(0, required - passed - failed),
    complete: required > 0 && passed === required,
    tools,
  };
}
