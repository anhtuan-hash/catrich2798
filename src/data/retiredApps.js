const normalize = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/^#\/?/, '')
  .replace(/^\/+|\/+$/g, '');

export const RETIRED_APP_SLUGS = Object.freeze([
  'top5-studio',
  'brian-top-5-arena',
  'top-5-arena',
  'tesol-methodology',
  'teaching-methods-hub',
  'teaching-tool-hub',
  'seating-chart-studio',
  'game-hub',
]);

export const RETIRED_ROUTE_IDS = Object.freeze([
  'tesol-methodology',
  'teaching-methods-hub',
  'teaching-tool-hub',
  'seating-chart-studio',
  'games',
  'game',
  'game-hub',
]);

const RETIRED_SLUG_SET = new Set(RETIRED_APP_SLUGS);
const RETIRED_ROUTE_SET = new Set(RETIRED_ROUTE_IDS);

export function isRetiredApp(item) {
  if (!item) return false;

  const slug = normalize(item.slug || item.id);
  const route = normalize(item.route)
    .replace(/^route\//, '')
    .replace(/^tool\//, '');

  return RETIRED_SLUG_SET.has(slug)
    || RETIRED_ROUTE_SET.has(route)
    || RETIRED_SLUG_SET.has(route);
}

export function isRetiredPath(path) {
  const normalized = normalize(path);
  const route = normalized
    .replace(/^route\//, '')
    .replace(/^tool\//, '');

  return RETIRED_ROUTE_SET.has(route)
    || RETIRED_SLUG_SET.has(route);
}
