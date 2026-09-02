import { isSupabaseConfigured, supabase } from '../utils/supabase.js';
import { normalizeThemeDocument } from './heroThemeModel.js';

export const HERO_THEME_PUBLISHED_EVENT = 'bes-hero-theme-published';
const MANIFEST_CACHE_MS = 30_000;
let manifestCache = null;
let manifestStoredAt = 0;
let manifestPromise = null;

const emptyManifest = () => ({ version: 1, revisionId: null, themeSetId: null, publishedAt: null, heroes: {} });

function normalizeManifest(input) {
  const raw = input && typeof input === 'object' ? input : {};
  const normalized = normalizeThemeDocument({ heroes: raw.heroes });
  return {
    version: 1,
    revisionId: raw.revisionId || null,
    themeSetId: raw.themeSetId || null,
    publishedAt: raw.publishedAt || null,
    heroes: normalized.heroes,
  };
}

export async function loadPublicHeroManifest({ force = false } = {}) {
  if (!force && manifestCache && Date.now() - manifestStoredAt < MANIFEST_CACHE_MS) return manifestCache;
  if (!force && manifestPromise) return manifestPromise;
  manifestPromise = fetch('/api/hero-theme-manifest', {
    method: 'GET',
    credentials: 'same-origin',
    headers: { Accept: 'application/json' },
  }).then(async (response) => {
    if (!response.ok) throw new Error(`Hero manifest request failed (${response.status})`);
    return normalizeManifest(await response.json());
  }).catch((error) => {
    console.warn('[HeroTheme] using original Hero because manifest failed:', error?.message || error);
    return emptyManifest();
  }).then((manifest) => {
    manifestCache = manifest;
    manifestStoredAt = Date.now();
    return manifest;
  }).finally(() => { manifestPromise = null; });
  return manifestPromise;
}

export function invalidatePublicHeroManifest() {
  manifestCache = null;
  manifestStoredAt = 0;
}

async function accessToken() {
  if (!isSupabaseConfigured) throw new Error('Supabase is not configured.');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token;
  if (!token) throw new Error('Admin session is required.');
  return token;
}

async function adminJson(method = 'GET', body = null) {
  const token = await accessToken();
  const response = await fetch('/api/hero-theme-admin', {
    method,
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `Hero Theme Studio request failed (${response.status})`);
  return payload;
}

export function loadHeroThemeStudioState() {
  return adminJson('GET');
}

export function createHeroTheme(name, description = '') {
  return adminJson('POST', { action: 'createTheme', name, description, config: { version: 1, heroes: {} } });
}

export function saveHeroThemeDraft(themeSetId, config) {
  return adminJson('POST', { action: 'saveDraft', themeSetId, config: normalizeThemeDocument(config) });
}

export async function publishHeroTheme(themeSetId) {
  const payload = await adminJson('POST', { action: 'publish', themeSetId });
  invalidatePublicHeroManifest();
  window.dispatchEvent(new CustomEvent(HERO_THEME_PUBLISHED_EVENT, { detail: payload.result }));
  return payload;
}

export async function restoreHeroThemeRevision(revisionId) {
  const payload = await adminJson('POST', { action: 'restore', revisionId });
  invalidatePublicHeroManifest();
  window.dispatchEvent(new CustomEvent(HERO_THEME_PUBLISHED_EVENT, { detail: payload.result }));
  return payload;
}

export async function uploadHeroThemeMedia(file) {
  const token = await accessToken();
  const response = await fetch('/api/hero-theme-upload', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': file.type || 'application/octet-stream',
      'X-File-Name': encodeURIComponent(file.name || `hero-${Date.now()}.webp`),
    },
    body: file,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload?.error || `Hero image upload failed (${response.status})`);
  return payload.media;
}
