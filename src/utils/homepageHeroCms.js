import { isSupabaseConfigured, supabase } from './supabase.js';

export const HOME_HERO_TABLE = 'homepage_hero_settings';
export const HOME_HERO_PUBLIC_TABLE = 'homepage_hero_public';
export const HOME_HERO_STORAGE_BUCKET = 'homepage-hero-media';
export const HOME_HERO_ROW_ID = 'home';
export const HOME_HERO_EVENT = 'bes-home-hero-updated';
export const HOME_HERO_LOCAL_KEY = 'bes-home-hero-cms-v1';
export const HOME_HERO_STATIC_PATH = '/hero/hero-current.json';

const MAX_MEDIA_BYTES = 25 * 1024 * 1024;
const STATIC_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ACCEPTED_IMAGE_TYPES = new Set([
  ...STATIC_IMAGE_TYPES,
  'image/gif',
  'image/apng',
]);
const ACCEPTED_VIDEO_TYPES = new Set(['video/mp4', 'video/webm']);
const MAX_IMAGE_WIDTH = 2400;
const MAX_IMAGE_HEIGHT = 1600;
const WEBP_QUALITY = 0.84;
const STATIC_POLL_INTERVAL_MS = 8000;
const STATIC_POLL_TIMEOUT_MS = 5 * 60 * 1000;

export const DEFAULT_HOME_HERO_CONFIG = Object.freeze({
  version: 1,
  badge: {
    enabled: true,
    textVi: 'ENGLISH HUB',
    textEn: 'ENGLISH HUB',
    logoUrl: '',
    color: '#0b57d0',
    background: 'rgba(255,255,255,0.86)',
  },
  content: {
    headlineVi: 'Không gian\ndạy học\nthông minh',
    headlineEn: 'A smart\nteaching\nworkspace',
    highlightVi: '& sáng tạo',
    highlightEn: '& creative learning',
    descriptionVi: 'Tích hợp các công cụ hỗ trợ giảng dạy, học tập và quản lý hiệu quả — tối ưu cho giáo viên và học sinh.',
    descriptionEn: 'Teaching, learning and management tools in one efficient workspace for teachers and students.',
    headlineColor: '#102b55',
    highlightColor: '#185ee8',
    descriptionColor: '#566b88',
  },
  buttons: [
    {
      id: 'primary',
      enabled: true,
      labelVi: 'Bắt đầu ngay',
      labelEn: 'Get started',
      target: '#/apps',
      newTab: false,
      style: 'primary',
      color: '#1a73e8',
      icon: 'rocket',
    },
    {
      id: 'secondary',
      enabled: true,
      labelVi: 'Xem hướng dẫn',
      labelEn: 'View guide',
      target: '#/apps',
      newTab: false,
      style: 'secondary',
      color: '#0b57d0',
      icon: 'play',
    },
  ],
  infoItems: [
    {
      id: 'security',
      enabled: true,
      icon: 'shield',
      titleVi: 'Phân quyền an toàn',
      titleEn: 'Secure access',
      textVi: 'Dữ liệu được bảo vệ',
      textEn: 'Protected by permissions',
      color: '#1a73e8',
    },
    {
      id: 'sync',
      enabled: true,
      icon: 'cloud',
      titleVi: 'Đồng bộ ổn định',
      titleEn: 'Stable sync',
      textVi: 'Cập nhật theo thời gian thực',
      textEn: 'Updates in real time',
      color: '#188038',
    },
    {
      id: 'workspace',
      enabled: true,
      icon: 'users',
      titleVi: 'Không gian thống nhất',
      titleEn: 'One workspace',
      textVi: 'Dạy học và quản lý',
      textEn: 'Teaching and management',
      color: '#7e57c2',
    },
  ],
  background: {
    type: 'none',
    url: '',
    posterUrl: '',
    fileName: '',
    mimeType: '',
    fit: 'cover',
    positionX: 70,
    positionY: 50,
    scale: 100,
    opacity: 100,
    brightness: 100,
    blur: 0,
    autoplay: true,
    loop: true,
    muted: true,
  },
  overlay: {
    enabled: true,
    color: '#ffffff',
    opacity: 10,
    leftProtection: 92,
    leftProtectionWidth: 56,
  },
  layout: {
    minHeight: 590,
    contentWidth: 42,
    contentAlign: 'left',
    verticalAlign: 'center',
    borderRadius: 32,
  },
  animation: {
    enabled: true,
    contentReveal: true,
    mediaMotion: false,
    buttonPulse: true,
  },
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function number(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, parsed));
}

function text(value, fallback = '', max = 500) {
  const clean = String(value ?? fallback).replace(/\u0000/g, '').trim();
  return clean.slice(0, max);
}

function bool(value, fallback = false) {
  return typeof value === 'boolean' ? value : fallback;
}

function safeTarget(value, fallback = '#/apps') {
  const clean = text(value, fallback, 500);
  if (/^#\/[a-z0-9_?=&/.-]*$/i.test(clean)) return clean;
  if (/^https:\/\//i.test(clean)) return clean;
  return fallback;
}

function safeColor(value, fallback) {
  const clean = text(value, fallback, 64);
  return /^(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\)|[a-z]+)$/i.test(clean) ? clean : fallback;
}

function normalizeButton(button, fallback, index) {
  return {
    id: text(button?.id, fallback.id || `button-${index}`, 60),
    enabled: bool(button?.enabled, fallback.enabled),
    labelVi: text(button?.labelVi, fallback.labelVi, 80),
    labelEn: text(button?.labelEn, fallback.labelEn, 80),
    target: safeTarget(button?.target, fallback.target),
    newTab: bool(button?.newTab, fallback.newTab),
    style: ['primary', 'secondary', 'ghost'].includes(button?.style) ? button.style : fallback.style,
    color: safeColor(button?.color, fallback.color),
    icon: ['rocket', 'play', 'arrow', 'sparkles', 'none'].includes(button?.icon) ? button.icon : fallback.icon,
  };
}

function normalizeInfoItem(item, fallback, index) {
  return {
    id: text(item?.id, fallback?.id || `info-${index}`, 60),
    enabled: bool(item?.enabled, fallback?.enabled ?? true),
    icon: ['shield', 'cloud', 'users', 'book', 'star', 'clock', 'none'].includes(item?.icon) ? item.icon : (fallback?.icon || 'star'),
    titleVi: text(item?.titleVi, fallback?.titleVi || '', 80),
    titleEn: text(item?.titleEn, fallback?.titleEn || '', 80),
    textVi: text(item?.textVi, fallback?.textVi || '', 120),
    textEn: text(item?.textEn, fallback?.textEn || '', 120),
    color: safeColor(item?.color, fallback?.color || '#1a73e8'),
  };
}

export function normalizeHomeHeroConfig(input) {
  const defaults = clone(DEFAULT_HOME_HERO_CONFIG);
  const source = input && typeof input === 'object' ? input : {};
  const backgroundType = ['none', 'image', 'gif', 'video'].includes(source.background?.type)
    ? source.background.type
    : defaults.background.type;
  const buttons = Array.isArray(source.buttons) ? source.buttons.slice(0, 2) : clone(defaults.buttons);
  while (buttons.length < 2) buttons.push(defaults.buttons[buttons.length]);
  const infoItems = Array.isArray(source.infoItems) ? source.infoItems.slice(0, 4) : clone(defaults.infoItems);

  return {
    version: 1,
    badge: {
      enabled: bool(source.badge?.enabled, defaults.badge.enabled),
      textVi: text(source.badge?.textVi, defaults.badge.textVi, 80),
      textEn: text(source.badge?.textEn, defaults.badge.textEn, 80),
      logoUrl: text(source.badge?.logoUrl, defaults.badge.logoUrl, 1000),
      color: safeColor(source.badge?.color, defaults.badge.color),
      background: safeColor(source.badge?.background, defaults.badge.background),
    },
    content: {
      headlineVi: text(source.content?.headlineVi, defaults.content.headlineVi, 240),
      headlineEn: text(source.content?.headlineEn, defaults.content.headlineEn, 240),
      highlightVi: text(source.content?.highlightVi, defaults.content.highlightVi, 120),
      highlightEn: text(source.content?.highlightEn, defaults.content.highlightEn, 120),
      descriptionVi: text(source.content?.descriptionVi, defaults.content.descriptionVi, 600),
      descriptionEn: text(source.content?.descriptionEn, defaults.content.descriptionEn, 600),
      headlineColor: safeColor(source.content?.headlineColor, defaults.content.headlineColor),
      highlightColor: safeColor(source.content?.highlightColor, defaults.content.highlightColor),
      descriptionColor: safeColor(source.content?.descriptionColor, defaults.content.descriptionColor),
    },
    buttons: buttons.map((button, index) => normalizeButton(button, defaults.buttons[index], index)),
    infoItems: infoItems.map((item, index) => normalizeInfoItem(item, defaults.infoItems[index], index)),
    background: {
      type: backgroundType,
      url: text(source.background?.url, '', 2000),
      posterUrl: text(source.background?.posterUrl, '', 2000),
      fileName: text(source.background?.fileName, '', 240),
      mimeType: text(source.background?.mimeType, '', 120),
      fit: ['cover', 'contain', 'fill'].includes(source.background?.fit) ? source.background.fit : defaults.background.fit,
      positionX: number(source.background?.positionX, defaults.background.positionX, 0, 100),
      positionY: number(source.background?.positionY, defaults.background.positionY, 0, 100),
      scale: number(source.background?.scale, defaults.background.scale, 50, 200),
      opacity: number(source.background?.opacity, defaults.background.opacity, 0, 100),
      brightness: number(source.background?.brightness, defaults.background.brightness, 20, 180),
      blur: number(source.background?.blur, defaults.background.blur, 0, 30),
      autoplay: bool(source.background?.autoplay, defaults.background.autoplay),
      loop: bool(source.background?.loop, defaults.background.loop),
      muted: true,
    },
    overlay: {
      enabled: bool(source.overlay?.enabled, defaults.overlay.enabled),
      color: safeColor(source.overlay?.color, defaults.overlay.color),
      opacity: number(source.overlay?.opacity, defaults.overlay.opacity, 0, 100),
      leftProtection: number(source.overlay?.leftProtection, defaults.overlay.leftProtection, 0, 100),
      leftProtectionWidth: number(source.overlay?.leftProtectionWidth, defaults.overlay.leftProtectionWidth, 20, 90),
    },
    layout: {
      minHeight: number(source.layout?.minHeight, defaults.layout.minHeight, 420, 850),
      contentWidth: number(source.layout?.contentWidth, defaults.layout.contentWidth, 28, 70),
      contentAlign: ['left', 'center', 'right'].includes(source.layout?.contentAlign) ? source.layout.contentAlign : defaults.layout.contentAlign,
      verticalAlign: ['start', 'center', 'end'].includes(source.layout?.verticalAlign) ? source.layout.verticalAlign : defaults.layout.verticalAlign,
      borderRadius: number(source.layout?.borderRadius, defaults.layout.borderRadius, 0, 60),
    },
    animation: {
      enabled: bool(source.animation?.enabled, defaults.animation.enabled),
      contentReveal: bool(source.animation?.contentReveal, defaults.animation.contentReveal),
      mediaMotion: bool(source.animation?.mediaMotion, defaults.animation.mediaMotion),
      buttonPulse: bool(source.animation?.buttonPulse, defaults.animation.buttonPulse),
    },
  };
}

function readLocal() {
  try {
    const parsed = JSON.parse(localStorage.getItem(HOME_HERO_LOCAL_KEY) || '{}');
    return {
      draft: normalizeHomeHeroConfig(parsed.draft || parsed.published || DEFAULT_HOME_HERO_CONFIG),
      published: normalizeHomeHeroConfig(parsed.published || DEFAULT_HOME_HERO_CONFIG),
      revision: text(parsed.revision, '', 120),
      publishedAt: text(parsed.publishedAt, '', 120),
      updatedAt: text(parsed.updatedAt, '', 120),
    };
  } catch {
    const fallback = normalizeHomeHeroConfig(DEFAULT_HOME_HERO_CONFIG);
    return { draft: fallback, published: fallback, revision: '', publishedAt: '', updatedAt: '' };
  }
}

function writeLocal(next) {
  const payload = {
    draft: normalizeHomeHeroConfig(next.draft || next.published || DEFAULT_HOME_HERO_CONFIG),
    published: normalizeHomeHeroConfig(next.published || DEFAULT_HOME_HERO_CONFIG),
    revision: text(next.revision, '', 120),
    publishedAt: text(next.publishedAt, '', 120),
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(HOME_HERO_LOCAL_KEY, JSON.stringify(payload));
  return payload;
}

function isMissingDatabase(error) {
  const code = String(error?.code || '');
  const message = String(error?.message || '').toLowerCase();
  return code === '42P01'
    || code === 'PGRST205'
    || message.includes('homepage_hero_settings')
    || message.includes('schema cache');
}

async function fetchStaticDocument({ noStore = false } = {}) {
  const separator = HOME_HERO_STATIC_PATH.includes('?') ? '&' : '?';
  const url = noStore ? `${HOME_HERO_STATIC_PATH}${separator}t=${Date.now()}` : HOME_HERO_STATIC_PATH;
  const response = await fetch(url, {
    cache: noStore ? 'no-store' : 'no-cache',
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Static Hero is unavailable (${response.status})`);
  const document = await response.json();
  const config = normalizeHomeHeroConfig(document?.config || document);
  return {
    config,
    revision: text(document?.revision, '', 120),
    publishedAt: text(document?.publishedAt, '', 120),
    delivery: text(document?.delivery, '', 80),
    bootstrap: document?.revision === 'bootstrap' || !document?.publishedAt,
  };
}

async function readLegacyPublishedHero(fallback) {
  if (!isSupabaseConfigured || !supabase) return null;
  const { data, error } = await supabase
    .from(HOME_HERO_PUBLIC_TABLE)
    .select('published_config,published_at,updated_at')
    .eq('id', HOME_HERO_ROW_ID)
    .maybeSingle();
  if (error) return null;
  if (!data?.published_config) return null;
  return {
    config: normalizeHomeHeroConfig(data.published_config || fallback),
    revision: 'legacy-supabase',
    publishedAt: data.published_at || data.updated_at || '',
  };
}

export async function loadHomeHeroSettings({ forceLocal = false, canEdit = false } = {}) {
  const local = readLocal();
  if (forceLocal) return { ...local, source: 'local', databaseReady: false };

  let staticResult = null;
  try {
    staticResult = await fetchStaticDocument();
  } catch {
    staticResult = null;
  }

  let published = staticResult?.config || local.published;
  let revision = staticResult?.revision || local.revision;
  let publishedAt = staticResult?.publishedAt || local.publishedAt;
  let source = staticResult ? 'vercel-static' : 'local-cache';

  // One-time migration fallback: until the first static Hero is published, keep
  // the current Supabase Hero visible. After a real static revision exists,
  // normal visitors no longer query Supabase for Hero content.
  const localHasMedia = Boolean(local.published?.background?.url);
  if (staticResult?.bootstrap) {
    if (localHasMedia) {
      published = local.published;
      revision = local.revision || 'local-migration-cache';
      publishedAt = local.publishedAt;
      source = 'local-migration-cache';
    } else {
      const legacy = await readLegacyPublishedHero(local.published);
      if (legacy) {
        published = legacy.config;
        revision = legacy.revision;
        publishedAt = legacy.publishedAt;
        source = 'supabase-migration-fallback';
      }
    }
  }

  let draft = published;
  let databaseReady = false;
  let updatedBy = '';
  let updatedAt = '';

  if (canEdit && isSupabaseConfigured && supabase) {
    const { data, error } = await supabase
      .from(HOME_HERO_TABLE)
      .select('draft_config,updated_at,updated_by')
      .eq('id', HOME_HERO_ROW_ID)
      .maybeSingle();
    if (!error) {
      draft = normalizeHomeHeroConfig(data?.draft_config || published);
      updatedAt = data?.updated_at || '';
      updatedBy = data?.updated_by || '';
      databaseReady = true;
    } else if (!isMissingDatabase(error)) {
      throw error;
    }
  }

  const result = {
    draft,
    published,
    revision,
    publishedAt,
    updatedAt,
    updatedBy,
    source,
    databaseReady,
  };
  writeLocal(result);
  return result;
}

export async function saveHomeHeroDraft(config, currentUser) {
  const normalized = normalizeHomeHeroConfig(config);
  const local = readLocal();
  writeLocal({ ...local, draft: normalized });
  if (!isSupabaseConfigured || !supabase || !currentUser?.id) {
    return { ok: true, source: 'local', databaseReady: false, config: normalized };
  }

  const payload = {
    id: HOME_HERO_ROW_ID,
    draft_config: normalized,
    updated_by: currentUser.id,
    updated_at: new Date().toISOString(),
  };
  const { error } = await supabase.from(HOME_HERO_TABLE).upsert(payload, { onConflict: 'id' });
  if (error) {
    if (isMissingDatabase(error)) return { ok: true, source: 'local', databaseReady: false, warning: error.message, config: normalized };
    throw error;
  }
  window.dispatchEvent(new CustomEvent(HOME_HERO_EVENT, { detail: { mode: 'draft', config: normalized } }));
  return { ok: true, source: 'supabase', databaseReady: true, config: normalized };
}

async function waitForStaticRevision(revision) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < STATIC_POLL_TIMEOUT_MS) {
    await new Promise((resolve) => window.setTimeout(resolve, STATIC_POLL_INTERVAL_MS));
    try {
      const result = await fetchStaticDocument({ noStore: true });
      if (result.revision === revision) return result;
    } catch {
      // A deployment may still be building. Keep the current Hero visible.
    }
  }
  return null;
}

export async function publishHomeHero(config, currentUser) {
  const normalized = normalizeHomeHeroConfig(config);
  if (!currentUser?.id) throw new Error('Bạn cần đăng nhập bằng tài khoản TTCM/Admin để công bố Hero.');
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase Auth chưa được cấu hình.');

  const { data, error: sessionError } = await supabase.auth.getSession();
  const accessToken = data?.session?.access_token;
  if (sessionError || !accessToken) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');

  const response = await fetch('/api/homepage-hero-publish', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ config: normalized }),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result?.error || `Không thể công bố Hero (${response.status}).`);

  const staticConfig = normalizeHomeHeroConfig(result.config || normalized);
  window.dispatchEvent(new CustomEvent(HOME_HERO_EVENT, {
    detail: {
      mode: 'deployment-pending',
      config: normalized,
      staticConfig,
      revision: result.revision,
      commitSha: result.commitSha,
    },
  }));

  // Do not replace the current public Hero with an undeployed /hero/media URL.
  // Poll Vercel in the background and switch only after the matching static
  // revision is actually available at the production domain.
  waitForStaticRevision(result.revision).then((published) => {
    if (!published) return;
    const local = readLocal();
    writeLocal({
      ...local,
      published: published.config,
      revision: published.revision,
      publishedAt: published.publishedAt,
    });
    window.dispatchEvent(new CustomEvent(HOME_HERO_EVENT, {
      detail: {
        mode: 'published',
        config: published.config,
        revision: published.revision,
      },
    }));
  });

  return {
    ...result,
    ok: true,
    source: 'github-vercel-static',
    databaseReady: true,
    config: staticConfig,
  };
}

function safeFileName(name) {
  return String(name || 'hero-media')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 140);
}

function webpName(name) {
  const base = safeFileName(name).replace(/\.[^.]+$/, '') || 'hero-media';
  return `${base}.webp`;
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function optimizeStaticImage(file) {
  if (!STATIC_IMAGE_TYPES.has(file.type)) return { file, optimized: false, originalBytes: file.size, outputBytes: file.size };
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') {
    return { file, optimized: false, originalBytes: file.size, outputBytes: file.size };
  }

  let bitmap;
  try {
    bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_IMAGE_WIDTH / bitmap.width, MAX_IMAGE_HEIGHT / bitmap.height);
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d', { alpha: true });
    if (!context) return { file, optimized: false, originalBytes: file.size, outputBytes: file.size };
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, width, height);
    const blob = await canvasToBlob(canvas, 'image/webp', WEBP_QUALITY);
    if (!blob || blob.size >= file.size * 0.96) {
      return { file, optimized: false, originalBytes: file.size, outputBytes: file.size };
    }
    const optimizedFile = new File([blob], webpName(file.name), {
      type: 'image/webp',
      lastModified: Date.now(),
    });
    return {
      file: optimizedFile,
      optimized: true,
      originalBytes: file.size,
      outputBytes: optimizedFile.size,
      width,
      height,
    };
  } catch {
    return { file, optimized: false, originalBytes: file.size, outputBytes: file.size };
  } finally {
    bitmap?.close?.();
  }
}

export function validateHomeHeroMedia(file) {
  if (!file) return { ok: false, message: 'Chưa chọn tệp.' };
  if (file.size > MAX_MEDIA_BYTES) return { ok: false, message: 'Tệp nền không được vượt quá 25 MB khi công bố qua GitHub/Vercel.' };
  if (!ACCEPTED_IMAGE_TYPES.has(file.type) && !ACCEPTED_VIDEO_TYPES.has(file.type)) {
    return { ok: false, message: 'Chỉ hỗ trợ JPG, PNG, WebP, GIF, APNG, MP4 hoặc WebM.' };
  }
  return { ok: true };
}

export async function uploadHomeHeroMedia(file, currentUser) {
  const validation = validateHomeHeroMedia(file);
  if (!validation.ok) throw new Error(validation.message);
  const optimized = await optimizeStaticImage(file);
  const uploadFile = optimized.file;
  const mediaType = uploadFile.type.startsWith('video/')
    ? 'video'
    : (uploadFile.type.includes('gif') || uploadFile.type.includes('apng') ? 'gif' : 'image');

  if (!isSupabaseConfigured || !supabase || !currentUser?.id) {
    return {
      source: 'local',
      databaseReady: false,
      url: URL.createObjectURL(uploadFile),
      type: mediaType,
      mimeType: uploadFile.type,
      fileName: uploadFile.name,
      temporary: true,
      optimized: optimized.optimized,
      originalBytes: optimized.originalBytes,
      outputBytes: optimized.outputBytes,
    };
  }

  // Supabase Storage is used only as a temporary editor/draft source. The
  // publish API copies this object into public/hero/media, after which normal
  // visitors receive it exclusively from Vercel CDN.
  const path = `${currentUser.id}/draft-${Date.now()}-${safeFileName(uploadFile.name)}`;
  const { error } = await supabase.storage
    .from(HOME_HERO_STORAGE_BUCKET)
    .upload(path, uploadFile, {
      cacheControl: '3600',
      upsert: false,
      contentType: uploadFile.type,
    });
  if (error) throw error;
  const { data } = supabase.storage.from(HOME_HERO_STORAGE_BUCKET).getPublicUrl(path);
  return {
    source: 'supabase-draft',
    databaseReady: true,
    url: data?.publicUrl || '',
    path,
    type: mediaType,
    mimeType: uploadFile.type,
    fileName: uploadFile.name,
    optimized: optimized.optimized,
    originalBytes: optimized.originalBytes,
    outputBytes: optimized.outputBytes,
    width: optimized.width,
    height: optimized.height,
  };
}

// Published Hero updates are delivered by a Vercel deployment rather than a
// Supabase Realtime channel. This compatibility export intentionally does not
// open a WebSocket connection, keeping public Hero egress at zero on Supabase.
export function subscribeToPublishedHomeHero() {
  return () => {};
}
