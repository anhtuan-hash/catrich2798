/**
 * Dashboard 2.3 personal layout preferences. Client-only, per-account and versioned.
 * No persistence of student data, login credentials or private workload details.
 */
export const DASHBOARD_LAYOUT_PREFIX = 'bes-dashboard-personal-layout-v23';
export const DASHBOARD_CARD_IDS = Object.freeze(['today', 'overdue', 'dueSoon', 'approvals', 'notices']);
export const DASHBOARD_BOARD_IDS = Object.freeze(['calendar', 'quickActions', 'dropZone', 'news']);
export const DASHBOARD_WIDGET_SIZES = Object.freeze(['small','wide','tall']);
export const DASHBOARD_SECTION_IDS = Object.freeze([
  'nextEvent', 'priority', 'continue', 'homeroom', 'calendar', 'quickActions', 'dropZone', 'news',
]);

export function defaultDashboardLayout() {
  return { version: 1, cardOrder: [...DASHBOARD_CARD_IDS], hiddenCards: [], hiddenSections: [], density: 'comfortable',
    boardOrder: [...DASHBOARD_BOARD_IDS], widgetSizes: { calendar: 'wide', quickActions: 'small', dropZone: 'small', news: 'wide' }, preset: 'default', theme: 'daylight', focusMode: false };
}

const uniqueAllowed = (values, allowed) => [...new Set(Array.isArray(values) ? values.filter((value) => allowed.includes(value)) : [])];

export function normalizeDashboardLayout(value) {
  const fallback = defaultDashboardLayout();
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.version !== 1) return fallback;
  const selectedOrder = uniqueAllowed(value.cardOrder, DASHBOARD_CARD_IDS);
  const order = [...selectedOrder, ...DASHBOARD_CARD_IDS.filter((id) => !selectedOrder.includes(id))];
  const hiddenCards = uniqueAllowed(value.hiddenCards, DASHBOARD_CARD_IDS);
  // Never allow an empty overview: at least one visible card for each role.
  if (DASHBOARD_CARD_IDS.filter((id) => !hiddenCards.includes(id)).length < 2) return normalizeDashboardLayout({ ...value, hiddenCards: [] });
  return {
    version: 1,
    cardOrder: order,
    hiddenCards,
    hiddenSections: uniqueAllowed(value.hiddenSections, DASHBOARD_SECTION_IDS),
    density: value.density === 'compact' ? 'compact' : 'comfortable',
    boardOrder: [...uniqueAllowed(value.boardOrder, DASHBOARD_BOARD_IDS), ...DASHBOARD_BOARD_IDS.filter((id) => !uniqueAllowed(value.boardOrder, DASHBOARD_BOARD_IDS).includes(id))],
    widgetSizes: Object.fromEntries(DASHBOARD_BOARD_IDS.map((id) => [id, DASHBOARD_WIDGET_SIZES.includes(value.widgetSizes?.[id]) ? value.widgetSizes[id] : fallback.widgetSizes[id]])),
    preset: ['default','teacher','homeroom','leader'].includes(value.preset) ? value.preset : 'default',
    theme: value.theme === 'midnight' ? 'midnight' : 'daylight',
    focusMode: value.focusMode === true,
  };
}

export function dashboardLayoutStorageKey(user) {
  const rawId = String(user?.id || user?.email || '').trim();
  if (!rawId) return null;
  return `${DASHBOARD_LAYOUT_PREFIX}:${encodeURIComponent(rawId.slice(0, 256))}`;
}

export function readDashboardLayout(user, storage = typeof window !== 'undefined' ? window.localStorage : null) {
  const key = dashboardLayoutStorageKey(user);
  if (!key || !storage) return defaultDashboardLayout();
  try { return normalizeDashboardLayout(JSON.parse(storage.getItem(key) || 'null')); }
  catch { return defaultDashboardLayout(); }
}

export function writeDashboardLayout(user, value, storage = typeof window !== 'undefined' ? window.localStorage : null) {
  const normalized = normalizeDashboardLayout(value);
  const key = dashboardLayoutStorageKey(user);
  if (key && storage) {
    try { storage.setItem(key, JSON.stringify(normalized)); }
    catch { /* Optional browser storage may be blocked; the in-memory layout still works. */ }
  }
  return normalized;
}

export function setDashboardSectionVisible(layout, sectionId, visible) {
  const previous = normalizeDashboardLayout(layout);
  if (!DASHBOARD_SECTION_IDS.includes(sectionId)) return previous;
  return { ...previous, hiddenSections: visible
    ? previous.hiddenSections.filter((id) => id !== sectionId)
    : [...previous.hiddenSections.filter((id) => id !== sectionId), sectionId] };
}

export function setDashboardCardVisible(layout, cardId, visible, availableCards = DASHBOARD_CARD_IDS) {
  const previous = normalizeDashboardLayout(layout);
  if (!DASHBOARD_CARD_IDS.includes(cardId)) return previous;
  const hidden = visible
    ? previous.hiddenCards.filter((id) => id !== cardId)
    : [...previous.hiddenCards.filter((id) => id !== cardId), cardId];
  const available = availableCards.filter((id) => DASHBOARD_CARD_IDS.includes(id));
  // The dashboard always retains at least one visible stat for its current role.
  if (!available.some((id) => !hidden.includes(id))) return previous;
  return { ...previous, hiddenCards: hidden };
}

export function moveDashboardCard(layout, id, direction, availableCards = DASHBOARD_CARD_IDS) {
  const previous = normalizeDashboardLayout(layout);
  if (!DASHBOARD_CARD_IDS.includes(id) || ![-1, 1].includes(direction)) return previous;
  const order = previous.cardOrder.filter((cardId) => availableCards.includes(cardId));
  const index = order.indexOf(id);
  const target = index + direction;
  if (index < 0 || target < 0 || target >= order.length) return previous;
  [order[index], order[target]] = [order[target], order[index]];
  // Keep hidden role-specific cards in a stable trailing position, rather than deleting them.
  return { ...previous, cardOrder: [...order, ...previous.cardOrder.filter((cardId) => !order.includes(cardId))] };
}

export function moveDashboardWidget(layout, id, direction) {
  const current = normalizeDashboardLayout(layout);
  if (!DASHBOARD_BOARD_IDS.includes(id) || ![-1, 1].includes(direction)) return current;
  const boardOrder = [...current.boardOrder];
  const from = boardOrder.indexOf(id), to = from + direction;
  if (from < 0 || to < 0 || to >= boardOrder.length) return current;
  [boardOrder[from], boardOrder[to]] = [boardOrder[to], boardOrder[from]];
  return { ...current, boardOrder, preset: 'default' };
}
export function resizeDashboardWidget(layout, id, size) {
  const current = normalizeDashboardLayout(layout);
  if (!DASHBOARD_BOARD_IDS.includes(id) || !DASHBOARD_WIDGET_SIZES.includes(size)) return current;
  return { ...current, widgetSizes: { ...current.widgetSizes, [id]: size }, preset: 'default' };
}
export function applyDashboardLayoutPreset(preset) {
  const base = defaultDashboardLayout();
  if (preset === 'teacher') return normalizeDashboardLayout({ ...base, preset, boardOrder: ['quickActions', 'calendar', 'dropZone', 'news'], density: 'compact' });
  if (preset === 'homeroom') return normalizeDashboardLayout({ ...base, preset, boardOrder: ['calendar', 'quickActions', 'dropZone', 'news'], widgetSizes: { ...base.widgetSizes, calendar: 'wide', dropZone: 'wide' } });
  if (preset === 'leader') return normalizeDashboardLayout({ ...base, preset, boardOrder: ['calendar', 'quickActions', 'news', 'dropZone'], density: 'compact' });
  return base;
}

/** Dashboard presentation preferences are local and never affect other apps. */
export function setDashboardTheme(layout, theme) {
  const current = normalizeDashboardLayout(layout);
  return { ...current, theme: theme === 'midnight' ? 'midnight' : 'daylight' };
}
export function setDashboardFocusMode(layout, enabled) {
  const current = normalizeDashboardLayout(layout);
  return { ...current, focusMode: Boolean(enabled) };
}
