import { isSupabaseConfigured, supabase } from './supabase.js';

// Dedicated Homeroom Hero CMS. No reads or writes to Dashboard or Homepage Hero.
export const HOMEROOM_HERO_UPDATED_EVENT = 'bes-homeroom-hero-cms-updated';
export const DEFAULT_HOMEROOM_HERO = Object.freeze({
  backgroundUrl: '',
  backgroundType: 'none',
  backgroundFit: 'cover',
  positionX: 50,
  positionY: 50,
  opacity: 100,
  shade: 16,
  headingColor: '#173b70',
});

const clamp = (value, fallback, low, high) => {
  const numeric = Number(value);
  return value == null || value === '' || !Number.isFinite(numeric)
    ? fallback : Math.min(high, Math.max(low, numeric));
};
const safeMediaUrl = (value) => {
  const url = String(value ?? '').trim().slice(0, 2000);
  if (!url) return '';
  if (url.startsWith('/hero/media/') || /^https:\/\//i.test(url) || url.startsWith('blob:')) return url;
  return '';
};

export function normalizeHomeroomHero(input) {
  const c = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const fallback = DEFAULT_HOMEROOM_HERO;
  const backgroundUrl = safeMediaUrl(c.backgroundUrl);
  return {
    backgroundUrl,
    backgroundType: backgroundUrl && ['image', 'gif', 'video'].includes(c.backgroundType) ? c.backgroundType : 'none',
    backgroundFit: ['cover', 'contain'].includes(c.backgroundFit) ? c.backgroundFit : fallback.backgroundFit,
    positionX: clamp(c.positionX, fallback.positionX, 0, 100),
    positionY: clamp(c.positionY, fallback.positionY, 0, 100),
    opacity: clamp(c.opacity, fallback.opacity, 0, 100),
    shade: clamp(c.shade, fallback.shade, 0, 80),
    headingColor: /^#[0-9a-f]{6}$/i.test(c.headingColor) ? c.headingColor : fallback.headingColor,
  };
}

export async function readHomeroomHero({ includeDraft = false } = {}) {
  const fallback = normalizeHomeroomHero(DEFAULT_HOMEROOM_HERO);
  if (!isSupabaseConfigured || !supabase) {
    return { published: fallback, draft: fallback, databaseReady: false };
  }
  const { data, error } = await supabase.from('homeroom_hero_public')
    .select('published_config,updated_at').eq('id', 'homeroom').maybeSingle();
  if (error) throw error;
  const published = data ? normalizeHomeroomHero(data.published_config) : fallback;
  if (!includeDraft) return { published, databaseReady: true };
  const { data: draft, error: draftError } = await supabase.from('homeroom_hero_drafts')
    .select('draft_config,updated_at').eq('id', 'homeroom').maybeSingle();
  if (draftError) throw draftError;
  return { published, draft: draft ? normalizeHomeroomHero(draft.draft_config) : published, databaseReady: true };
}

function requireReady(currentUser, normalized) {
  if (!isSupabaseConfigured || !supabase || !currentUser?.id) {
    throw new Error('Cần đăng nhập và kết nối Supabase để lưu Hero Chủ nhiệm.');
  }
  if (normalized.backgroundUrl.startsWith('blob:')) {
    throw new Error('Đây là bản xem trước tạm thời. Hãy tải ảnh/video lên Storage trước khi công bố.');
  }
}

export async function saveHomeroomHeroDraft(config, currentUser) {
  const normalized = normalizeHomeroomHero(config);
  requireReady(currentUser, normalized);
  const { error } = await supabase.from('homeroom_hero_drafts').upsert({
    id: 'homeroom', draft_config: normalized, updated_by: currentUser.id, updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) throw error;
  return normalized;
}

export async function publishHomeroomHero(config, currentUser) {
  const normalized = normalizeHomeroomHero(config);
  requireReady(currentUser, normalized);
  // RLS enforces admin/TTCM rights. This write cannot change Dashboard rows.
  const { error } = await supabase.from('homeroom_hero_public').upsert({
    id: 'homeroom', published_config: normalized, updated_by: currentUser.id, updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) throw error;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(HOMEROOM_HERO_UPDATED_EVENT, { detail: { published: normalized } }));
  }
  return normalized;
}
