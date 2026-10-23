import { isSupabaseConfigured, supabase } from './supabase.js';

export const DASHBOARD_HERO_UPDATED_EVENT = 'bes-dashboard-hero-cms-updated';
export const DEFAULT_DASHBOARD_HERO = Object.freeze({
  eyebrowVi: 'TỔNG QUAN HÔM NAY',
  eyebrowEn: 'TODAY OVERVIEW',
  descriptionVi: 'Theo dõi lịch làm việc và cập nhật thông tin quan trọng trong Dashboard gọn gàng, dễ dàng.',
  descriptionEn: 'Keep your work calendar and important updates together in a clean, easy Dashboard.',
  backgroundUrl: '',
  backgroundType: 'none',
  backgroundFit: 'cover',
  positionX: 50,
  positionY: 50,
  opacity: 100,
  shade: 16,
  headingColor: '#0e263e',
  showArtwork: true,
  showDoodles: true,
  showClouds: true,
});

const clamp = (v, fallback, min, max) => {
  if (v == null || v === '') return fallback;
  const parsed = Number(v);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
};
const clean = (v, fallback, max = 350) => String(v ?? fallback).replace(/\u0000/g, '').slice(0, max);
const mediaUrl = (value) => {
  const raw = clean(value, '', 2000).trim();
  if (!raw) return '';
  if (raw.startsWith('/hero/media/')) return raw;
  if (/^https:\/\//i.test(raw)) return raw;
  if (raw.startsWith('blob:')) return raw; // preview only; publish rejects
  return '';
};

export function normalizeDashboardHero(input) {
  const c = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const d = DEFAULT_DASHBOARD_HERO;
  const url = mediaUrl(c.backgroundUrl);
  return {
    eyebrowVi: clean(c.eyebrowVi, d.eyebrowVi, 110),
    eyebrowEn: clean(c.eyebrowEn, d.eyebrowEn, 110),
    descriptionVi: clean(c.descriptionVi, d.descriptionVi, 600),
    descriptionEn: clean(c.descriptionEn, d.descriptionEn, 600),
    backgroundUrl: url,
    backgroundType: url && ['image','gif','video'].includes(c.backgroundType) ? c.backgroundType : 'none',
    backgroundFit: ['cover','contain'].includes(c.backgroundFit) ? c.backgroundFit : d.backgroundFit,
    positionX: clamp(c.positionX, d.positionX, 0, 100),
    positionY: clamp(c.positionY, d.positionY, 0, 100),
    opacity: clamp(c.opacity, d.opacity, 0, 100),
    shade: clamp(c.shade, d.shade, 0, 80),
    headingColor: /^#[0-9a-f]{6}$/i.test(c.headingColor) ? c.headingColor : d.headingColor,
    showArtwork: c.showArtwork !== false,
    showDoodles: c.showDoodles !== false,
    showClouds: c.showClouds !== false,
  };
}

export async function readDashboardHero({ includeDraft = false } = {}) {
  const fallback = normalizeDashboardHero(DEFAULT_DASHBOARD_HERO);
  if (!isSupabaseConfigured || !supabase) return { published: fallback, draft: fallback, databaseReady: false };
  const { data, error } = await supabase.from('dashboard_hero_public')
    .select('published_config,updated_at').eq('id','dashboard').maybeSingle();
  if (error) throw error;
  const published = normalizeDashboardHero(data?.published_config);
  if (!includeDraft) return { published, databaseReady: true };
  const { data: draftRow, error: draftError } = await supabase.from('dashboard_hero_drafts')
    .select('draft_config,updated_at').eq('id','dashboard').maybeSingle();
  if (draftError) throw draftError;
  return { published, draft: draftRow ? normalizeDashboardHero(draftRow.draft_config) : published, databaseReady: true };
}

function requireConnected(currentUser) {
  if (!isSupabaseConfigured || !supabase || !currentUser?.id) {
    throw new Error('Cần đăng nhập và kết nối Supabase để lưu Hero Dashboard.');
  }
}

function checkPersistentMedia(config) {
  if (config.backgroundUrl.startsWith('blob:')) {
    throw new Error('Ảnh/video đang là tệp xem trước tạm thời. Hãy tải lên Storage trước khi lưu hoặc công bố.');
  }
}

export async function saveDashboardHeroDraft(config, currentUser) {
  requireConnected(currentUser);
  const normalized = normalizeDashboardHero(config);
  checkPersistentMedia(normalized);
  const { error } = await supabase.from('dashboard_hero_drafts').upsert({
    id: 'dashboard', draft_config: normalized, updated_by: currentUser.id, updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) throw error;
  return normalized;
}

export async function publishDashboardHero(config, currentUser) {
  requireConnected(currentUser);
  const normalized = normalizeDashboardHero(config);
  checkPersistentMedia(normalized);
  // RLS is the actual authorization boundary; UI visibility is advisory only.
  const { error } = await supabase.from('dashboard_hero_public').upsert({
    id: 'dashboard', published_config: normalized, updated_by: currentUser.id, updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) throw error;
  // Keep draft in sync only after publishing; never silently publish a draft.
  window.dispatchEvent(new CustomEvent(DASHBOARD_HERO_UPDATED_EVENT, { detail: { published: normalized } }));
  return normalized;
}
