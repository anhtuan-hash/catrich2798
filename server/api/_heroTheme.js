import { adminClient as createAdminClient } from './_googleDrive.js';
import { appendApiAudit, createRequestId, requireApprovedUser, sendJson } from './_security.js';

export const HERO_THEME_CONFIG_VERSION = 1;
export const HERO_THEME_MAX_CONFIG_BYTES = 512 * 1024;

const HERO_KEY_RE = /^[a-z0-9][a-z0-9._:-]{0,159}$/i;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const clamp = (value, fallback, min, max) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(min, Math.min(max, parsed)) : fallback;
};

const safeColor = (value, fallback = '#000000') => {
  const raw = String(value || '').trim();
  return /^(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-z]+)$/i.test(raw) ? raw : fallback;
};

export function normalizeHeroTheme(input) {
  if (!input || input.mode !== 'custom') return { mode: 'original' };
  const mediaId = String(input.mediaId || '').trim();
  if (!UUID_RE.test(mediaId)) return { mode: 'original' };
  return {
    mode: 'custom',
    mediaId,
    fit: input.fit === 'contain' ? 'contain' : 'cover',
    positionX: clamp(input.positionX, 50, 0, 100),
    positionY: clamp(input.positionY, 50, 0, 100),
    zoom: clamp(input.zoom, 1, 0.5, 2),
    opacity: clamp(input.opacity, 1, 0, 1),
    brightness: clamp(input.brightness, 1, 0.2, 1.8),
    blur: clamp(input.blur, 0, 0, 30),
    overlayColor: safeColor(input.overlayColor, '#000000'),
    overlayOpacity: clamp(input.overlayOpacity, 0, 0, 1),
  };
}

export function normalizeThemeDocument(input) {
  const source = input && typeof input === 'object' ? input : {};
  const heroes = source.heroes && typeof source.heroes === 'object' ? source.heroes : {};
  const normalized = {};
  Object.entries(heroes).slice(0, 400).forEach(([heroKey, theme]) => {
    const key = String(heroKey || '').trim();
    if (!HERO_KEY_RE.test(key)) return;
    normalized[key] = normalizeHeroTheme(theme);
  });
  return { version: HERO_THEME_CONFIG_VERSION, heroes: normalized };
}

export function assertThemeDocumentSize(input) {
  const bytes = Buffer.byteLength(JSON.stringify(input || {}));
  if (bytes > HERO_THEME_MAX_CONFIG_BYTES) {
    const error = new Error('Hero Theme configuration is too large.');
    error.status = 413;
    throw error;
  }
  return bytes;
}

export function isHeroThemeSchemaMissing(error) {
  const text = String(error?.message || error || '');
  return /hero_theme_|schema cache|could not find the function|42P01|PGRST202|PGRST205/i.test(text);
}

export function emptyPublicManifest() {
  return { version: HERO_THEME_CONFIG_VERSION, revisionId: null, themeSetId: null, publishedAt: null, heroes: {} };
}

export async function requireHeroThemeAdmin(req) {
  return requireApprovedUser(req, { roles: ['admin'] });
}

export async function loadPublicManifest() {
  const client = createAdminClient();
  const { data, error } = await client.rpc('hero_theme_public_manifest');
  if (error) {
    if (isHeroThemeSchemaMissing(error)) return { manifest: emptyPublicManifest(), databaseReady: false };
    throw error;
  }
  const raw = data && typeof data === 'object' ? data : emptyPublicManifest();
  const document = normalizeThemeDocument({ heroes: raw.heroes });
  return {
    databaseReady: true,
    manifest: {
      version: HERO_THEME_CONFIG_VERSION,
      revisionId: raw.revisionId || null,
      themeSetId: raw.themeSetId || null,
      publishedAt: raw.publishedAt || null,
      heroes: document.heroes,
    },
  };
}

export async function loadHeroThemeStudioState(context) {
  const client = context.userClient || context.client;
  const [setsResult, draftsResult, revisionsResult, activeResult, mediaResult] = await Promise.all([
    client.from('hero_theme_sets').select('id,name,description,created_at,updated_at').order('updated_at', { ascending: false }),
    client.from('hero_theme_drafts').select('theme_set_id,config,updated_at'),
    client.from('hero_theme_revisions').select('id,theme_set_id,revision_number,config,created_at,published_by').order('created_at', { ascending: false }).limit(60),
    client.from('hero_theme_active').select('revision_id,updated_at').eq('id', true).maybeSingle(),
    client.from('hero_theme_media').select('id,file_name,mime_type,width,height,size_bytes,sha256,created_at').order('created_at', { ascending: false }).limit(120),
  ]);
  const firstError = [setsResult, draftsResult, revisionsResult, activeResult, mediaResult].find((result) => result.error)?.error;
  if (firstError) {
    if (isHeroThemeSchemaMissing(firstError)) return { databaseReady: false, sets: [], drafts: [], revisions: [], activeRevisionId: null, media: [] };
    throw firstError;
  }
  return {
    databaseReady: true,
    sets: setsResult.data || [],
    drafts: (draftsResult.data || []).map((row) => ({ ...row, config: normalizeThemeDocument(row.config) })),
    revisions: (revisionsResult.data || []).map((row) => ({ ...row, config: normalizeThemeDocument(row.config) })),
    activeRevisionId: activeResult.data?.revision_id || null,
    media: mediaResult.data || [],
  };
}

export function heroMediaIds(config) {
  const ids = new Set();
  const normalized = normalizeThemeDocument(config);
  Object.values(normalized.heroes).forEach((theme) => {
    if (theme.mode === 'custom' && theme.mediaId) ids.add(theme.mediaId);
  });
  return ids;
}

export async function getActiveReferencedMedia(mediaId) {
  const id = String(mediaId || '').trim();
  if (!UUID_RE.test(id)) return null;
  const client = createAdminClient();
  const { data: active, error: activeError } = await client.from('hero_theme_active').select('revision_id').eq('id', true).maybeSingle();
  if (activeError || !active?.revision_id) return null;
  const { data: revision, error: revisionError } = await client.from('hero_theme_revisions').select('config').eq('id', active.revision_id).maybeSingle();
  if (revisionError || !revision || !heroMediaIds(revision.config).has(id)) return null;
  const { data: media, error: mediaError } = await client.from('hero_theme_media').select('id,drive_file_id,file_name,mime_type,width,height,size_bytes,sha256').eq('id', id).maybeSingle();
  if (mediaError || !media) return null;
  return media;
}

export async function auditHeroTheme(context, event) {
  return appendApiAudit(context, event);
}

export { createRequestId, sendJson };
