import { supabase } from './supabase.js';

export const PROFILE_SETTINGS_FUNCTION = 'profile-settings';
export const PROFILE_AVATAR_BUCKET = 'profile-avatars';
export const PROFILE_AVATAR_MAX_BYTES = 5 * 1024 * 1024;

const IMAGE_EXTENSIONS = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

function cleanProfile(row = {}) {
  return {
    id: row.id || '',
    email: row.email || '',
    username: row.username || '',
    contactEmail: row.contact_email ?? row.contactEmail ?? '',
    authMode: row.auth_mode ?? row.authMode ?? 'email',
    mustChangePassword: row.must_change_password === true || row.mustChangePassword === true,
    fullName: row.full_name ?? row.fullName ?? '',
    school: row.school || '',
    role: row.role || 'teacher',
    jobTitle: row.job_title ?? row.jobTitle ?? '',
    phone: row.phone || '',
    bio: row.bio || '',
    avatarUrl: row.avatar_url ?? row.avatarUrl ?? '',
  };
}

async function invokeProfileSettings(body = {}) {
  if (!supabase?.functions) return { ok: false, message: 'Supabase Functions chưa được cấu hình.' };
  try {
    const { data, error } = await supabase.functions.invoke(PROFILE_SETTINGS_FUNCTION, { body });
    if (error) return { ok: false, message: String(error?.message || 'Không thể kết nối hồ sơ.') };
    if (data?.ok === false) return { ok: false, ...data };
    return { ok: true, ...(data || {}) };
  } catch (error) {
    return { ok: false, message: String(error?.message || 'Không thể kết nối hồ sơ.') };
  }
}

export async function loadProfileSettings() {
  const result = await invokeProfileSettings({ action: 'get' });
  if (!result.ok) return result;
  return { ...result, profile: cleanProfile(result.profile || {}) };
}

export async function saveProfileSettings(profile = {}) {
  const result = await invokeProfileSettings({
    action: 'update',
    profile: {
      fullName: profile.fullName || '',
      school: profile.school || '',
      contactEmail: profile.contactEmail || '',
      jobTitle: profile.jobTitle || '',
      phone: profile.phone || '',
      bio: profile.bio || '',
      avatarUrl: profile.avatarUrl || '',
    },
  });
  if (!result.ok) return result;
  return { ...result, profile: cleanProfile(result.profile || {}) };
}

export async function uploadProfileAvatar(file, userId) {
  if (!file || !userId) return { ok: false, message: 'Chưa chọn ảnh hồ sơ.' };
  const extension = IMAGE_EXTENSIONS[file.type];
  if (!extension) return { ok: false, message: 'Chỉ hỗ trợ PNG, JPG hoặc WebP.' };
  if (file.size > PROFILE_AVATAR_MAX_BYTES) return { ok: false, message: 'Ảnh hồ sơ tối đa 5 MB.' };
  if (!supabase?.storage) return { ok: false, message: 'Supabase Storage chưa được cấu hình.' };

  const path = `${userId}/avatar.${extension}`;
  try {
    const bucket = supabase.storage.from(PROFILE_AVATAR_BUCKET);
    await bucket.remove([
      `${userId}/avatar.jpg`,
      `${userId}/avatar.jpeg`,
      `${userId}/avatar.png`,
      `${userId}/avatar.webp`,
    ]).catch(() => null);
    const { error } = await bucket.upload(path, file, {
      upsert: true,
      contentType: file.type,
      cacheControl: '3600',
    });
    if (error) return { ok: false, message: error.message || 'Không thể tải ảnh lên.' };
    const { data } = bucket.getPublicUrl(path);
    const baseUrl = String(data?.publicUrl || '');
    if (!baseUrl) return { ok: false, message: 'Không tạo được đường dẫn ảnh hồ sơ.' };
    const avatarUrl = `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
    return { ok: true, avatarUrl, path };
  } catch (error) {
    return { ok: false, message: String(error?.message || 'Không thể tải ảnh hồ sơ.') };
  }
}

export async function removeProfileAvatar(userId) {
  if (!userId) return { ok: false, message: 'Không xác định được tài khoản.' };
  if (!supabase?.storage) return { ok: false, message: 'Supabase Storage chưa được cấu hình.' };
  try {
    const { error } = await supabase.storage.from(PROFILE_AVATAR_BUCKET).remove([
      `${userId}/avatar.jpg`,
      `${userId}/avatar.jpeg`,
      `${userId}/avatar.png`,
      `${userId}/avatar.webp`,
    ]);
    if (error) return { ok: false, message: error.message || 'Không thể xoá ảnh hồ sơ.' };
    return { ok: true };
  } catch (error) {
    return { ok: false, message: String(error?.message || 'Không thể xoá ảnh hồ sơ.') };
  }
}
