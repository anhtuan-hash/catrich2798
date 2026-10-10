const normalize = (value) => String(value || '')
  .trim()
  .toLowerCase()
  .replace(/^#\/?/, '')
  .replace(/^\/+|\/+$/g, '');

// These apps are permanently removed. Keep both the real production slugs and
// older aliases here so stale shortcuts/bookmarks can never resurrect them.
export const RETIRED_APP_SLUGS = Object.freeze([
  'assessment-preview',
  'shared-game-games4esl',
  'shared-game-wordwall',
  'shared-game-educaplay',
  'shared-game-learningapps',
  'shared-game-h5p',
  'shared-game-genially',
  'shared-game-bookwidgets',
  'shared-game-classtools',
  'shared-game-kahoot',
  'shared-game-scattergories',
  'shared-game-baamboozle',
  'shared-game-c36c61c3-2b71-475d-bf3a-65e27756e483',
  'shared-game-f8bcfe95-67ef-49e9-b3e9-5f5ac2a12381',
  'shared-game-17ec8366-0af1-4503-8176-656749a610b7',
  'shared-game-4f5cb56c-9c4e-4476-a810-2bb60cb1fa7c',
  'shared-game-e2bf22d2-b958-451b-8c12-e628cc6424af',
  'shared-game-e1baa91e-4c2a-4006-9c40-0cd531b6302d',
]);

export const RETIRED_ROUTE_IDS = Object.freeze(['assessment-preview']);

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
