export const REAL_DEVICE_EVIDENCE_EVENT = 'brian-v2-real-device-evidence';
const STORAGE_KEY = 'brian-v2-real-device-evidence-v1';

export const REAL_DEVICE_EVIDENCE_GROUPS = Object.freeze({
  responsive: {
    label: 'Responsive hardware',
    items: [
      { id: 'phone', label: 'Phone portrait', detail: 'Layout, bottom nav, scroll, tap targets và overlays trên điện thoại thật.' },
      { id: 'ipad-portrait', label: 'iPad portrait', detail: 'Safari/iPadOS portrait, keyboard/touch, safe-area và drawer/dialog.' },
      { id: 'ipad-landscape', label: 'iPad landscape', detail: 'Safari/iPadOS landscape, sidebar/workspace density và Tool Shell.' },
      { id: 'laptop', label: 'Laptop', detail: '1366px-class laptop, keyboard navigation và route switching.' },
      { id: 'desktop', label: 'Desktop', detail: 'Desktop wide layout, multi-column data pages và overlays.' },
      { id: 'tv-65', label: 'TV 65-inch', detail: 'TV/classroom display thật: scale, readability và viewing distance.' },
    ],
  },
  accessibility: {
    label: 'Accessibility hardware/browser',
    items: [
      { id: 'keyboard-desktop', label: 'Keyboard-only', detail: 'Tab order, focus-visible, skip link, dialog/flyout lifecycle và escape paths.' },
      { id: 'voiceover-ipad', label: 'VoiceOver / iPadOS', detail: 'Landmarks, accessible names, controls, table/card reading order và overlays.' },
      { id: 'zoom-contrast-motion', label: 'Zoom / contrast / motion', detail: '200% zoom, contrast review, reduced motion và forced-colors fallback where available.' },
    ],
  },
  performance: {
    label: 'Real interaction performance',
    items: [
      { id: 'interaction-latency', label: 'Interaction latency', detail: 'Navigation, search, drawer/dialog và data filters phản hồi không có lag khó chịu.' },
      { id: 'tool-bridge-cost', label: 'Tool Shell bridge cost', detail: 'Mở/reload/fullscreen Level-2 tools không gây freeze hoặc memory spike rõ rệt.' },
      { id: 'route-memory', label: 'Repeated-route memory', detail: 'Chuyển qua lại nhiều workspace không tích lũy iframe/timer/listener bất thường.' },
    ],
  },
});

function readRaw() {
  if (typeof window === 'undefined') return {};
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '{}');
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function persist(ledger) {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(ledger)); } catch { /* local QA persistence is optional */ }
  window.dispatchEvent?.(new CustomEvent(REAL_DEVICE_EVIDENCE_EVENT));
  return ledger;
}

export function readRealDeviceEvidence() {
  return readRaw();
}

export function setRealDeviceEvidence(id, status, note = '') {
  const exists = Object.values(REAL_DEVICE_EVIDENCE_GROUPS).some((group) => group.items.some((item) => item.id === id));
  if (!exists) return readRaw();
  const normalized = ['pass', 'fail'].includes(status) ? status : 'pending';
  const ledger = readRaw();
  ledger[id] = {
    status: normalized,
    note: String(note || '').slice(0, 800),
    at: new Date().toISOString(),
  };
  return persist(ledger);
}

export function updateRealDeviceEvidenceNote(id, note) {
  const ledger = readRaw();
  const current = ledger[id] || { status: 'pending', at: '' };
  ledger[id] = { ...current, note: String(note || '').slice(0, 800), at: current.at || new Date().toISOString() };
  return persist(ledger);
}

export function resetRealDeviceEvidence() {
  try { window.localStorage.removeItem(STORAGE_KEY); } catch { /* optional */ }
  window.dispatchEvent?.(new CustomEvent(REAL_DEVICE_EVIDENCE_EVENT, { detail: { cleared: true } }));
  return {};
}

export function summarizeRealDeviceEvidence(ledger = readRaw()) {
  const groups = {};
  let required = 0;
  let passed = 0;
  let failed = 0;
  Object.entries(REAL_DEVICE_EVIDENCE_GROUPS).forEach(([groupId, group]) => {
    const items = group.items.map((item) => {
      const state = ledger?.[item.id] || {};
      const status = ['pass', 'fail'].includes(state.status) ? state.status : 'pending';
      return { ...item, ...state, status };
    });
    const groupPassed = items.filter((item) => item.status === 'pass').length;
    const groupFailed = items.filter((item) => item.status === 'fail').length;
    required += items.length;
    passed += groupPassed;
    failed += groupFailed;
    groups[groupId] = {
      id: groupId,
      label: group.label,
      items,
      required: items.length,
      passed: groupPassed,
      failed: groupFailed,
      complete: items.length > 0 && groupPassed === items.length,
    };
  });
  return {
    required,
    passed,
    failed,
    complete: required > 0 && passed === required,
    responsiveComplete: Boolean(groups.responsive?.complete),
    accessibilityComplete: Boolean(groups.accessibility?.complete),
    performanceComplete: Boolean(groups.performance?.complete),
    groups,
  };
}
