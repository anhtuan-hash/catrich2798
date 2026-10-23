import { isSupabaseConfigured, supabase } from './supabase.js';

// Independent from homepageHeroCms / dashboardHeroCms by design.
// Separate database tables, media bucket, row ID and browser event.
export const LESSON_CHECK_HERO_EVENT = 'bes-lesson-check-hero-updated';
const PUBLIC_TABLE = 'lesson_check_hero_public';
const DRAFT_TABLE = 'lesson_check_hero_drafts';
const MEDIA_BUCKET = 'lesson-check-hero-media';
const HERO_ID = 'lesson-check';
const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPTED_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/webp', 'image/gif',
  'video/mp4', 'video/webm',
]);
const TYPES = new Set(['none','image','gif','video']);
const safeNumber = (value, fallback, min, max) => {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max,Math.max(min,number)) : fallback;
};
export const DEFAULT_LESSON_CHECK_HERO = Object.freeze({
  backgroundUrl: '',
  backgroundType: 'none',
  backgroundFit: 'cover',
  positionX: 50,
  positionY: 50,
  opacity: 100,
  leftProtection: 78,
  showMascot: true,
});
function validUrl(value) {
  const url = String(value || '').trim().slice(0,2048);
  if (!url) return '';
  if (url.startsWith('/hero/media/')) return url;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' ? parsed.href : '';
  } catch { return ''; }
}
export function normalizeLessonCheckHero(input) {
  const raw = input && typeof input === 'object' && !Array.isArray(input) ? input : {};
  const d = DEFAULT_LESSON_CHECK_HERO;
  const backgroundUrl = validUrl(raw.backgroundUrl);
  return {
    backgroundUrl,
    backgroundType: backgroundUrl && TYPES.has(raw.backgroundType) ? raw.backgroundType : 'none',
    backgroundFit: ['cover','contain'].includes(raw.backgroundFit) ? raw.backgroundFit : d.backgroundFit,
    positionX: safeNumber(raw.positionX,d.positionX,0,100),
    positionY: safeNumber(raw.positionY,d.positionY,0,100),
    opacity: safeNumber(raw.opacity,d.opacity,20,100),
    leftProtection: safeNumber(raw.leftProtection,d.leftProtection,25,100),
    showMascot: raw.showMascot !== false,
  };
}
function requireEditor(user) {
  if (!isSupabaseConfigured || !supabase || !user?.id) {
    throw new Error('Cần đăng nhập để chỉnh sửa Hero của phân hệ Kiểm tra.');
  }
}
export async function readLessonCheckHero({includeDraft=false} = {}) {
  const fallback = normalizeLessonCheckHero(DEFAULT_LESSON_CHECK_HERO);
  if (!isSupabaseConfigured || !supabase) {
    return {published:fallback,draft:fallback,databaseReady:false};
  }
  const { data, error } = await supabase.from(PUBLIC_TABLE)
    .select('published_config,updated_at').eq('id',HERO_ID).maybeSingle();
  if (error) throw error;
  const published = normalizeLessonCheckHero(data?.published_config);
  if (!includeDraft) return {published,databaseReady:true};
  const { data:draftRow, error:draftError } = await supabase.from(DRAFT_TABLE)
    .select('draft_config').eq('id',HERO_ID).maybeSingle();
  if (draftError) throw draftError;
  return {
    published,
    draft: draftRow ? normalizeLessonCheckHero(draftRow.draft_config) : published,
    databaseReady:true,
  };
}
async function write(table,column,config,user) {
  requireEditor(user);
  const normalized = normalizeLessonCheckHero(config);
  if (config?.backgroundUrl && !normalized.backgroundUrl) {
    throw new Error('Chỉ chấp nhận đường dẫn ảnh HTTPS hợp lệ.');
  }
  const {error} = await supabase.from(table).upsert({
    id:HERO_ID,[column]:normalized,updated_by:user.id,updated_at:new Date().toISOString(),
  },{onConflict:'id'});
  if(error) throw error;
  return normalized;
}
export async function saveLessonCheckHeroDraft(config,user) {
  return write(DRAFT_TABLE,'draft_config',config,user);
}
export async function publishLessonCheckHero(config,user) {
  const saved = await write(PUBLIC_TABLE,'published_config',config,user);
  // The saved draft never leaks into the published Hero automatically.
  window.dispatchEvent(new CustomEvent(LESSON_CHECK_HERO_EVENT,{detail:{published:saved}}));
  return saved;
}
export async function uploadLessonCheckHeroMedia(file,user) {
  requireEditor(user);
  if (!(file instanceof File)) throw new Error('Vui lòng chọn tệp ảnh hoặc video.');
  if (!ACCEPTED_TYPES.has(file.type)) throw new Error('Hỗ trợ JPG, PNG, WebP, GIF, MP4 hoặc WebM.');
  if (file.size === 0 || file.size > MAX_BYTES) throw new Error('Tệp phải nhỏ hơn 25 MB.');
  const extension = {
    'image/jpeg':'jpg','image/png':'png','image/webp':'webp',
    'image/gif':'gif','video/mp4':'mp4','video/webm':'webm',
  }[file.type];
  const filename = user.id + '/' + Date.now() + '-' + Math.random().toString(36).slice(2,9) + '.' + extension;
  const {error} = await supabase.storage.from(MEDIA_BUCKET).upload(filename,file,{
    contentType:file.type,cacheControl:'3600',upsert:false,
  });
  if(error) throw error;
  const {data} = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(filename);
  if(!data?.publicUrl) throw new Error('Không thể lấy đường dẫn ảnh đã tải lên.');
  return {
    backgroundUrl:data.publicUrl,
    backgroundType:file.type.startsWith('video/')?'video':file.type==='image/gif'?'gif':'image',
    showMascot:false,
  };
}
