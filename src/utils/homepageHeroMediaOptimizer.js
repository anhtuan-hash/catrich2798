import { isSupabaseConfigured, supabase } from './supabase.js';
import { HOME_HERO_STORAGE_BUCKET, validateHomeHeroMedia } from './homepageHeroCms.js';

const STATIC_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const MAX_IMAGE_WIDTH = 2400;
const MAX_IMAGE_HEIGHT = 1600;
const WEBP_QUALITY = 0.84;
const IMMUTABLE_CACHE_SECONDS = '31536000';

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

async function canvasToBlob(canvas, type, quality) {
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

  const path = `${currentUser.id}/${Date.now()}-${safeFileName(uploadFile.name)}`;
  const { error } = await supabase.storage
    .from(HOME_HERO_STORAGE_BUCKET)
    .upload(path, uploadFile, {
      cacheControl: IMMUTABLE_CACHE_SECONDS,
      upsert: false,
      contentType: uploadFile.type,
    });
  if (error) throw error;

  const { data } = supabase.storage.from(HOME_HERO_STORAGE_BUCKET).getPublicUrl(path);
  return {
    source: 'supabase',
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
