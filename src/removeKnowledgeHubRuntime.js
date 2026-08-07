import { APPS } from './data/apps.js';

const REMOVED_APP_SLUG = 'knowledge-hub';
const REMOVED_ROUTE_PATTERN = /(^|[\/#?])knowledge-hub(?:$|[\/#?&])/i;

// Remove the retired app from the single shared app registry before the main UI loads.
for (let index = APPS.length - 1; index >= 0; index -= 1) {
  const app = APPS[index];
  if (app?.slug === REMOVED_APP_SLUG || app?.route === REMOVED_APP_SLUG) APPS.splice(index, 1);
}

function redirectRetiredRoute() {
  if (typeof window === 'undefined') return;
  const hash = String(window.location.hash || '');
  if (!REMOVED_ROUTE_PATTERN.test(hash)) return;
  window.location.hash = '#/apps';
}

// Guard old bookmarks / direct URLs so the retired app can no longer be opened.
if (typeof window !== 'undefined') {
  redirectRetiredRoute();
  window.addEventListener('hashchange', redirectRetiredRoute);
}
