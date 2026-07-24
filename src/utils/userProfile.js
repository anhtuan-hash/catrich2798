import { isSupabaseConfigured, supabase } from './supabase.js';

export const USER_PROFILE_EVENT = 'bes-user-profile-updated';
export const PROFILE_AVATAR_BUCKET = 'profile-avatars';

const LOCAL_PROFILE_PREFIX = 'bes-user-profile-v1:';
const OFFLINE_SESSION_KEY = 'bes-offline-demo-user-v943';
const EXTENDED_PROFILE_COLUMNS = 'full_name,school,job_title,phone,bio,avatar_url,updated_at';
const LEGACY_PROFILE_COLUMNS = 'full_name,school,updated_at';

function cleanText(value, maxLength = 240) {
  return String(value || '').trim().slice(0, maxLength);
}

function profileScope(user) {
  return String(user?.id || user?.email || 'guest')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '-') || 'guest';
}

function localProfileKey(user) {
  return `${LOCAL_PROFILE_PREFIX}${profileScope(user)}`;
}

function isRemoteAvatar(value) {
  return /^https?:\/\//i.test(String(value || ''));
}

function dispatchProfile(profile, user = null) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(USER_PROFILE_EVENT, { detail: { profile, user } }));
}

export function readLocalUserProfile(user) {
  if (typeof window === 'undefined') return null;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(localProfileKey(user)) || 'null');
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function writeLocalUserProfile(user, profile) {
  const next = {
    name: cleanText(profile?.name, 120),
    school: cleanText(profile?.school, 160),
    jobTitle: cleanText(profile?.jobTitle, 120),
    phone: cleanText(profile?.phone, 40),
    bio: cleanText(profile?.bio, 320),
    avatarUrl: String(profile?.avatarUrl || '').trim(),
    updatedAt: profile?.updatedAt || new Date().toISOString(),
  };
  try {
    window.localStorage.setItem(localProfileKey(user), JSON.stringify(next));
  } catch {
    // A resized avatar normally fits localStorage. Cloud persistence may still work.
  }
  return next;
}

export function mergeUserProfile(user, profile = null) {
  if (!user) return null;
  if (!profile) return user;
  return {
    ...user,
    name: profile.name || user.name || user.full_name || user.email?.split('@')[0] || 'Teacher',
    full_name: profile.name || user.full_name || user.name || '',
    school: profile.school ?? user.school ?? '',
    jobTitle: profile.jobTitle ?? user.jobTitle ?? '',
    phone: profile.phone ?? user.phone ?? '',
    bio: profile.bio ?? user.bio ?? '',
    avatarUrl: profile.avatarUrl ?? user.avatarUrl ?? '',
    profileUpdatedAt: profile.updatedAt || user.profileUpdatedAt || user.updatedAt || '',
  };
}

function profileFromRemote(authUser, dbProfile = null) {
  const metadata = authUser?.user_metadata || {};
  return {
    name: dbProfile?.full_name || metadata.full_name || metadata.name || '',
    school: dbProfile?.school ?? metadata.school ?? '',
    jobTitle: dbProfile?.job_title ?? metadata.job_title ?? '',
    phone: dbProfile?.phone ?? metadata.phone ?? '',
    bio: dbProfile?.bio ?? metadata.bio ?? '',
    avatarUrl: dbProfile?.avatar_url || metadata.avatar_url || metadata.picture || '',
    updatedAt: dbProfile?.updated_at || authUser?.updated_at || '',
  };
}

async function readOwnDatabaseProfile(userId) {
  if (!isSupabaseConfigured || !userId) return null;
  const extended = await supabase
    .from('profiles')
    .select(EXTENDED_PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  if (!extended.error) return extended.data || null;

  const legacy = await supabase
    .from('profiles')
    .select(LEGACY_PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();
  return legacy.error ? null : (legacy.data || null);
}

export async function loadUserProfile(user) {
  if (!user) return null;
  const local = readLocalUserProfile(user);
  if (!isSupabaseConfigured) return mergeUserProfile(user, local);

  try {
    const [{ data: authData }, dbProfile] = await Promise.all([
      supabase.auth.getUser(),
      readOwnDatabaseProfile(user.id),
    ]);
    const remote = profileFromRemote(authData?.user, dbProfile);
    const remoteTime = Date.parse(remote.updatedAt || '') || 0;
    const localTime = Date.parse(local?.updatedAt || '') || 0;
    const preferred = local && (localTime >= remoteTime || String(local.avatarUrl || '').startsWith('data:'))
      ? { ...remote, ...local }
      : remote;
    return mergeUserProfile(user, preferred);
  } catch {
    return mergeUserProfile(user, local);
  }
}

function sanitizeDraft(draft, currentUser) {
  return {
    name: cleanText(draft?.name || currentUser?.name || currentUser?.email?.split('@')[0], 120),
    school: cleanText(draft?.school, 160),
    jobTitle: cleanText(draft?.jobTitle, 120),
    phone: cleanText(draft?.phone, 40),
    bio: cleanText(draft?.bio, 320),
    avatarUrl: String(draft?.avatarUrl ?? currentUser?.avatarUrl ?? '').trim(),
    updatedAt: new Date().toISOString(),
  };
}

function updateOfflineSession(currentUser, nextUser) {
  if (typeof window === 'undefined' || currentUser?.provider !== 'offline-demo') return;
  try {
    const existing = JSON.parse(window.localStorage.getItem(OFFLINE_SESSION_KEY) || 'null');
    if (existing?.id === currentUser.id) {
      window.localStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify({ ...existing, ...nextUser }));
    }
  } catch {
    // The account-scoped profile copy remains available.
  }
}

export async function saveCurrentUserProfile(currentUser, draft) {
  if (!currentUser) return { ok: false, message: 'No active account.' };
  const profile = writeLocalUserProfile(currentUser, sanitizeDraft(draft, currentUser));
  let nextUser = mergeUserProfile(currentUser, profile);

  if (!isSupabaseConfigured || currentUser.provider === 'offline-demo') {
    updateOfflineSession(currentUser, nextUser);
    dispatchProfile(profile, nextUser);
    return { ok: true, user: nextUser, profile, storage: 'browser-account' };
  }

  let authError = null;
  let profileError = null;
  try {
    const { data: authData, error } = await supabase.auth.getUser();
    if (error || !authData?.user) throw error || new Error('No active Supabase account.');
    const metadata = authData.user.user_metadata || {};
    const avatarForCloud = isRemoteAvatar(profile.avatarUrl)
      ? profile.avatarUrl
      : (profile.avatarUrl ? (metadata.avatar_url || '') : null);
    const authUpdate = await supabase.auth.updateUser({
      data: {
        ...metadata,
        full_name: profile.name,
        name: profile.name,
        school: profile.school,
        job_title: profile.jobTitle,
        phone: profile.phone,
        bio: profile.bio,
        avatar_url: avatarForCloud,
      },
    });
    authError = authUpdate.error || null;

    const remotePatch = {
      full_name: profile.name,
      school: profile.school,
      job_title: profile.jobTitle,
      phone: profile.phone,
      bio: profile.bio,
      avatar_url: isRemoteAvatar(profile.avatarUrl) ? profile.avatarUrl : null,
    };
    const rpc = await supabase.rpc('bes_update_own_profile', { profile_patch: remotePatch });
    profileError = rpc.error || null;

    const remoteUser = authUpdate.data?.user || authData.user;
    nextUser = mergeUserProfile({
      ...currentUser,
      avatarUrl: remoteUser?.user_metadata?.avatar_url || profile.avatarUrl,
    }, profile);
  } catch (error) {
    authError = error;
  }

  dispatchProfile(profile, nextUser);
  const cloudSaved = !authError && !profileError;
  return {
    ok: true,
    user: nextUser,
    profile,
    storage: cloudSaved ? 'cloud' : 'browser-account',
    warning: cloudSaved ? '' : (authError?.message || profileError?.message || 'Cloud profile sync is not ready; saved on this browser.'),
  };
}

export async function uploadCurrentUserAvatar(currentUser, blob) {
  if (!currentUser?.id || !blob || !isSupabaseConfigured) {
    return { ok: false, message: 'Cloud avatar storage is unavailable.' };
  }
  const path = `${currentUser.id}/avatar.webp`;
  const upload = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .upload(path, blob, { upsert: true, cacheControl: '3600', contentType: blob.type || 'image/webp' });
  if (upload.error) return { ok: false, message: upload.error.message };
  const publicResult = supabase.storage.from(PROFILE_AVATAR_BUCKET).getPublicUrl(path);
  const publicUrl = publicResult?.data?.publicUrl || '';
  return publicUrl
    ? { ok: true, url: `${publicUrl}${publicUrl.includes('?') ? '&' : '?'}v=${Date.now()}`, path }
    : { ok: false, message: 'Could not resolve the uploaded avatar URL.' };
}

export async function removeCurrentUserAvatar(currentUser) {
  if (!currentUser?.id || !isSupabaseConfigured) return { ok: true };
  const result = await supabase.storage
    .from(PROFILE_AVATAR_BUCKET)
    .remove([`${currentUser.id}/avatar.webp`]);
  return result.error ? { ok: false, message: result.error.message } : { ok: true };
}
