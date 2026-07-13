export const AUTOSAVE_EVENT = 'bes-autosave-state';
const PREFIX = 'bes-global-draft-v1084';

function safeToken(value) {
  return String(value || 'guest').replace(/[^a-zA-Z0-9._/-]+/g, '-').slice(0, 180) || 'guest';
}

export function draftStorageKey(user, routeKey) {
  return `${PREFIX}:${safeToken(user?.id || user?.email || 'guest')}:${safeToken(routeKey || 'home')}`;
}

export function readDraft(user, routeKey) {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(draftStorageKey(user, routeKey)) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeDraft(user, routeKey, snapshot) {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(draftStorageKey(user, routeKey), JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function deleteDraft(user, routeKey) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.removeItem(draftStorageKey(user, routeKey)); } catch { /* optional */ }
}

export function emitAutosaveState(detail) {
  if (typeof window === 'undefined') return;
  try { window.dispatchEvent(new CustomEvent(AUTOSAVE_EVENT, { detail })); } catch { /* optional */ }
}
