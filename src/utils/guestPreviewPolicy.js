/**
 * Anonymous browser surface. This policy grants *rendering of local demo content*
 * only: it never grants access to authenticated components, data APIs, or RLS rows.
 */
export const GUEST_PREVIEW_ROUTES = Object.freeze(['home', 'apps', 'dashboard', 'attendance']);
export const GUEST_PREVIEW_TOOLS = Object.freeze(['lesson-check-studio']);
export const GUEST_LOCKED_ROUTES = Object.freeze(['homeroom']);
export const GUEST_LOCKED_TOOLS = Object.freeze(['gradebook-studio']);

export function isGuestPreviewRoute(route, selectedTool = null) {
  if (route === 'tool') return GUEST_PREVIEW_TOOLS.includes(selectedTool?.slug);
  return GUEST_PREVIEW_ROUTES.includes(route);
}

export function isGuestLockedRoute(route, selectedTool = null) {
  if (route === 'tool') return GUEST_LOCKED_TOOLS.includes(selectedTool?.slug);
  return GUEST_LOCKED_ROUTES.includes(route);
}
