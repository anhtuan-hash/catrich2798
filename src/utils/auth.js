import { isSupabaseConfigured, supabase } from './supabase.js';
import { createAllAccessPermissions, normalizePermissions } from './permissions.js';
import { normalizeSystemRole } from './roles.js';

export const AUTH_EVENT = 'bes-auth-session-updated';
export const USERS_EVENT = 'bes-auth-users-updated';
export const PROFILE_TABLE = 'profiles';
export const OFFLINE_DEMO_SESSION_KEY = 'bes-offline-demo-user-v943';
export const AUTH_NOTICE_KEY = 'bes-auth-notice-v1065';

const PROFILE_COLUMNS = 'id,email,full_name,school,role,approved,permissions,created_at,updated_at';
const PROFILE_CACHE_MAX_AGE = 30 * 60 * 1000;
const AUTH_SESSION_CACHE_MAX_AGE = 5 * 60 * 1000;

const authListeners = new Set();
const profileCache = new Map();
const profilePromises = new Map();
let authInitPromise = null;
let sharedAuthSubscription = null;
let authEventChain = Promise.resolve();
let cachedAuthUser;
let cachedAuthUserAt = 0;

export function createOfflineDemoUser(role = 'admin') {
  const isAdmin = role === 'admin';
  return {
    id: isAdmin ? 'offline-demo-admin' : 'offline-demo-teacher',
    authId: isAdmin ? 'offline-demo-admin' : 'offline-demo-teacher',
    role: isAdmin ? 'admin' : 'teacher',
    name: isAdmin ? 'Demo Teacher Admin' : 'Demo Teacher',
    school: 'Brian English Studio Demo',
    email: isAdmin ? 'demo.admin@brianenglish.local' : 'demo.teacher@brianenglish.local',
    approved: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    permissions: createAllAccessPermissions(),
    provider: 'offline-demo',
    demo: true,
  };
}

function readOfflineDemoUser() {
  try {
    const raw = localStorage.getItem(OFFLINE_DEMO_SESSION_KEY);
    if (!raw) return null;
    const user = JSON.parse(raw);
    return user?.id ? user : null;
  } catch {
    return null;
  }
}

function saveOfflineDemoUser(user) {
  localStorage.setItem(OFFLINE_DEMO_SESSION_KEY, JSON.stringify(user));
  dispatchAuth(user);
  return user;
}

export async function loginOfflineDemo(role = 'admin') {
  if (isSupabaseConfigured) return { ok: false, message: 'Offline demo is only available when Supabase is not configured.' };
  const user = saveOfflineDemoUser(createOfflineDemoUser(role));
  return { ok: true, user };
}

function dispatchAuth(user = null) {
  cachedAuthUser = user || null;
  cachedAuthUserAt = Date.now();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(AUTH_EVENT, { detail: { user: cachedAuthUser } }));
  }
  authListeners.forEach((listener) => {
    try { listener(cachedAuthUser); } catch (error) { console.warn('Auth listener failed:', error); }
  });
}

function invalidateProfileCache(userId = '') {
  if (userId) profileCache.delete(String(userId));
  else profileCache.clear();
}

function cacheProfile(userId, profile) {
  if (!userId || !profile) return;
  profileCache.set(String(userId), { profile, storedAt: Date.now() });
}

function dispatchUsers() {
  window.dispatchEvent(new CustomEvent(USERS_EVENT));
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function getAuthProviders(user) {
  const appProviders = Array.isArray(user?.app_metadata?.providers) ? user.app_metadata.providers : [];
  const identityProviders = Array.isArray(user?.identities)
    ? user.identities.map((identity) => identity?.provider).filter(Boolean)
    : [];
  const primaryProvider = user?.app_metadata?.provider ? [user.app_metadata.provider] : [];
  return [...new Set([...appProviders, ...identityProviders, ...primaryProvider].map((item) => String(item || '').toLowerCase()).filter(Boolean))];
}

function saveAuthNotice(message, tone = 'info') {
  try {
    sessionStorage.setItem(AUTH_NOTICE_KEY, JSON.stringify({ message, tone, createdAt: new Date().toISOString() }));
  } catch {
    // Ignore storage failures.
  }
}

export function consumeAuthNotice() {
  try {
    const raw = sessionStorage.getItem(AUTH_NOTICE_KEY);
    sessionStorage.removeItem(AUTH_NOTICE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed?.message ? parsed : null;
  } catch {
    return null;
  }
}

function getAdminEmails() {
  return String(import.meta.env.VITE_ADMIN_EMAILS || '')
    .split(',')
    .map((email) => normalizeEmail(email))
    .filter(Boolean);
}

function isConfiguredAdmin(email) {
  return getAdminEmails().includes(normalizeEmail(email));
}

async function claimConfiguredAdminInDatabase() {
  if (!isSupabaseConfigured) return { ok: false, message: 'Supabase is not configured.' };
  const allowedEmails = getAdminEmails();
  if (!allowedEmails.length) return { ok: false, message: 'VITE_ADMIN_EMAILS is empty.' };
  const { data, error } = await supabase.rpc('bes_admin_claim_configured_admin', {
    allowed_emails: allowedEmails,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: data === true };
}

async function promoteConfiguredAdminIfNeeded(user, existingProfile = null) {
  if (!user?.id || !isConfiguredAdmin(user.email)) return existingProfile;
  if (existingProfile?.role === 'admin' && existingProfile?.approved === true) return existingProfile;

  // First try the V5.7 security-definer RPC. This breaks the circular RLS problem:
  // the UI knows the email is configured as admin, but RLS will not let that user
  // update/list profiles until the database profile is also role=admin.
  const claim = await claimConfiguredAdminInDatabase();
  if (claim.ok) {
    invalidateProfileCache(user.id);
    const reread = await readProfile(user.id, { force: true });
    return reread.profile || existingProfile;
  }

  // Fallback for projects with permissive/self-update policies.
  const { data } = await supabase
    .from(PROFILE_TABLE)
    .update({ role: 'admin', approved: true, updated_at: new Date().toISOString() })
    .eq('id', user.id)
    .select(PROFILE_COLUMNS)
    .maybeSingle();
  if (data) cacheProfile(user.id, data);
  return data || existingProfile;
}

export async function repairCurrentAdminDatabaseRole() {
  const { data: sessionData } = await supabase.auth.getSession();
  const user = sessionData?.session?.user;
  if (!user?.id) return { ok: false, message: 'No active Supabase session.' };
  if (!isConfiguredAdmin(user.email)) {
    return { ok: false, message: 'This email is not listed in VITE_ADMIN_EMAILS.' };
  }
  const claim = await claimConfiguredAdminInDatabase();
  dispatchUsers();
  if (!claim.ok) {
    return {
      ok: false,
      message: claim.message || 'Could not promote this account in public.profiles. Run the V5.7 Supabase SQL upgrade first.',
    };
  }
  invalidateProfileCache(user.id);
  dispatchAuth(await ensureProfile(user, {}, { force: true }));
  return { ok: true };
}

function mapProfile(user, profile = null) {
  if (!user) return null;
  const meta = user.user_metadata || {};
  const email = normalizeEmail(user.email || profile?.email);
  const role = normalizeSystemRole(isConfiguredAdmin(email) ? 'admin' : (profile?.role || meta.role || 'teacher'));
  const approved = role === 'admin' ? true : profile?.approved === true;
  return {
    id: user.id,
    authId: user.id,
    role,
    name: profile?.full_name || meta.full_name || meta.name || email.split('@')[0] || 'Teacher',
    school: profile?.school || meta.school || '',
    email,
    approved,
    createdAt: profile?.created_at || user.created_at || '',
    updatedAt: profile?.updated_at || '',
    permissions: normalizePermissions(profile?.permissions),
    provider: 'supabase',
    authProviders: getAuthProviders(user),
    avatarUrl: meta.avatar_url || meta.picture || '',
  };
}

function cleanProfilePayload(user, defaults = {}) {
  const email = normalizeEmail(user?.email || defaults.email);
  const role = normalizeSystemRole(isConfiguredAdmin(email) ? 'admin' : (defaults.role || 'teacher'));
  return {
    id: user.id,
    email,
    full_name: String(defaults.name || defaults.full_name || user.user_metadata?.full_name || email.split('@')[0] || 'Teacher').trim(),
    school: String(defaults.school || user.user_metadata?.school || '').trim(),
    role,
    approved: role === 'admin' ? true : defaults.approved === true,
    permissions: defaults.permissions || createAllAccessPermissions(),
    updated_at: new Date().toISOString(),
  };
}

async function readProfile(userId, { force = false } = {}) {
  if (!isSupabaseConfigured || !userId) return { profile: null, error: null };
  const key = String(userId);
  const cached = profileCache.get(key);
  if (!force && cached && Date.now() - cached.storedAt < PROFILE_CACHE_MAX_AGE) {
    return { profile: cached.profile, error: null, cached: true };
  }
  if (!force && profilePromises.has(key)) return profilePromises.get(key);

  const task = (async () => {
    const { data, error } = await supabase
      .from(PROFILE_TABLE)
      .select(PROFILE_COLUMNS)
      .eq('id', userId)
      .maybeSingle();
    if (!error && data) cacheProfile(key, data);
    return { profile: data || null, error };
  })();
  profilePromises.set(key, task);
  try { return await task; }
  finally { profilePromises.delete(key); }
}

async function ensureProfile(user, defaults = {}, { force = false } = {}) {
  if (!isSupabaseConfigured || !user?.id) return mapProfile(user, null);
  const existing = await readProfile(user.id, { force });
  if (existing.profile) {
    const adminSyncedProfile = await promoteConfiguredAdminIfNeeded(user, existing.profile);
    const selected = adminSyncedProfile || existing.profile;
    cacheProfile(user.id, selected);
    return mapProfile(user, selected);
  }

  const payload = cleanProfilePayload(user, defaults);
  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .upsert(payload, { onConflict: 'id' })
    .select(PROFILE_COLUMNS)
    .maybeSingle();

  if (error) {
    console.warn('Profile table is not ready or RLS blocked profile upsert:', error.message);
    const claimed = await promoteConfiguredAdminIfNeeded(user, null);
    if (claimed) cacheProfile(user.id, claimed);
    return mapProfile(user, claimed);
  }
  cacheProfile(user.id, data || payload);
  const adminSyncedProfile = await promoteConfiguredAdminIfNeeded(user, data || payload);
  const selected = adminSyncedProfile || data || payload;
  cacheProfile(user.id, selected);
  return mapProfile(user, selected);
}

async function resolveSessionUser(session, { forceProfile = false } = {}) {
  const authUser = session?.user;
  if (!authUser?.id) return null;
  if (!forceProfile && cachedAuthUser?.id === authUser.id && Date.now() - cachedAuthUserAt < AUTH_SESSION_CACHE_MAX_AGE) {
    return cachedAuthUser;
  }
  const user = await ensureProfile(authUser, {}, { force: forceProfile });
  if (user?.approved === false) {
    saveAuthNotice('Tài khoản đã đăng nhập thành công nhưng đang chờ quản trị viên duyệt.', 'warning');
    window.setTimeout(() => supabase.auth.signOut(), 0);
    return null;
  }
  return user;
}

function ensureSharedAuthSubscription() {
  if (!isSupabaseConfigured || sharedAuthSubscription) return;
  const { data } = supabase.auth.onAuthStateChange((event, session) => {
    authEventChain = authEventChain.then(async () => {
      if (!session?.user) {
        dispatchAuth(null);
        return;
      }
      const forceProfile = event === 'USER_UPDATED' || event === 'PASSWORD_RECOVERY';
      const user = await resolveSessionUser(session, { forceProfile });
      dispatchAuth(user);
    }).catch((error) => console.warn('Shared auth session handler failed:', error));
  });
  sharedAuthSubscription = data?.subscription || null;
}

export function isAuthConfigured() {
  return isSupabaseConfigured;
}

export async function initializeAuthSession({ force = false } = {}) {
  if (!isSupabaseConfigured) return readOfflineDemoUser();
  ensureSharedAuthSubscription();
  if (!force && cachedAuthUser !== undefined && Date.now() - cachedAuthUserAt < AUTH_SESSION_CACHE_MAX_AGE) {
    return cachedAuthUser;
  }
  if (!force && authInitPromise) return authInitPromise;

  authInitPromise = (async () => {
    const { data, error } = await supabase.auth.getSession();
    if (error || !data?.session?.user) {
      dispatchAuth(null);
      return null;
    }
    const user = await resolveSessionUser(data.session, { forceProfile: force });
    dispatchAuth(user);
    return user;
  })();
  try { return await authInitPromise; }
  finally { authInitPromise = null; }
}

export function subscribeToAuthChanges(callback) {
  if (!isSupabaseConfigured) {
    const handler = (event) => callback?.(event.detail?.user || readOfflineDemoUser());
    window.addEventListener(AUTH_EVENT, handler);
    return () => window.removeEventListener(AUTH_EVENT, handler);
  }
  if (typeof callback !== 'function') return () => {};
  authListeners.add(callback);
  ensureSharedAuthSubscription();
  if (cachedAuthUser !== undefined) queueMicrotask(() => callback(cachedAuthUser));
  else initializeAuthSession().catch(() => {});
  return () => authListeners.delete(callback);
}

export async function getCurrentUser() {
  return initializeAuthSession();
}

export async function registerTeacher({ name, school, email, password }) {
  if (!isSupabaseConfigured) {
    const user = {
      ...createOfflineDemoUser('teacher'),
      id: `offline-demo-teacher-${Date.now()}`,
      authId: `offline-demo-teacher-${Date.now()}`,
      name: String(name || 'Demo Teacher').trim(),
      school: String(school || 'Brian English Studio Demo').trim(),
      email: normalizeEmail(email || 'demo.teacher@brianenglish.local'),
    };
    saveOfflineDemoUser(user);
    return { ok: true, user, demo: true };
  }

  const normalizedEmail = normalizeEmail(email);
  const { data, error } = await supabase.auth.signUp({
    email: normalizedEmail,
    password: String(password || ''),
    options: {
      data: {
        full_name: String(name || '').trim(),
        school: String(school || '').trim(),
      },
    },
  });

  if (error) return { ok: false, message: error.message };
  if (!data?.user) return { ok: false, message: 'Could not create account.' };

  const user = await ensureProfile(data.user, { name, school, email: normalizedEmail, approved: false });
  dispatchUsers();

  if (!data.session) {
    return {
      ok: true,
      user: null,
      needsEmailConfirmation: true,
      message: 'Account created. Please confirm your email before signing in. An admin must approve the account before first use.',
    };
  }

  if (user?.approved === false) {
    await logoutUser();
    return {
      ok: true,
      user: null,
      pendingApproval: true,
      message: 'Account created. Please wait for an admin to approve it before signing in.',
    };
  }

  dispatchAuth(user);
  return { ok: true, user };
}

export async function loginUser({ email, password }) {
  if (!isSupabaseConfigured) {
    const cleanEmail = normalizeEmail(email || 'demo.admin@brianenglish.local');
    const user = {
      ...createOfflineDemoUser(cleanEmail.includes('teacher') ? 'teacher' : 'admin'),
      email: cleanEmail,
      name: cleanEmail.includes('teacher') ? 'Demo Teacher' : 'Demo Teacher Admin',
    };
    saveOfflineDemoUser(user);
    return { ok: true, user, demo: true };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizeEmail(email),
    password: String(password || ''),
  });

  if (error) return { ok: false, message: error.message };
  const user = await ensureProfile(data.user);
  if (user?.approved === false) {
    await logoutUser();
    return { ok: false, message: 'Your account is waiting for approval or has been disabled.' };
  }

  dispatchAuth(user);
  return { ok: true, user };
}

export async function loginWithGoogle() {
  if (!isSupabaseConfigured) {
    return { ok: false, message: 'Supabase is not configured.' };
  }
  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, data };
}

export async function logoutUser() {
  if (isSupabaseConfigured) {
    await supabase.auth.signOut();
    invalidateProfileCache();
  } else {
    localStorage.removeItem(OFFLINE_DEMO_SESSION_KEY);
  }
  dispatchAuth(null);
}

export async function requestPasswordReset(email) {
  if (!isSupabaseConfigured) {
    return { ok: false, message: 'Supabase is not configured.' };
  }
  const redirectTo = `${window.location.origin}${window.location.pathname}#/login?recovery=1`;
  const { error } = await supabase.auth.resetPasswordForEmail(normalizeEmail(email), { redirectTo });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}

export async function updatePassword(password) {
  if (!isSupabaseConfigured) {
    return { ok: false, message: 'Supabase is not configured.' };
  }
  const cleanPassword = String(password || '');
  if (cleanPassword.length < 8) {
    return { ok: false, message: 'Password should contain at least 8 characters.' };
  }
  const { data: sessionData } = await supabase.auth.getSession();
  if (!sessionData?.session) {
    return { ok: false, message: 'Password recovery session was not found. Open the latest reset link from your email and try again.' };
  }
  const { error } = await supabase.auth.updateUser({ password: cleanPassword });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}


export async function changeCurrentPassword({ currentPassword = '', newPassword = '' } = {}) {
  if (!isSupabaseConfigured) {
    return { ok: false, message: 'Supabase is not configured.' };
  }
  const nextPassword = String(newPassword || '');
  if (nextPassword.length < 8) {
    return { ok: false, message: 'Password should contain at least 8 characters.' };
  }

  const { data: userData, error: userError } = await supabase.auth.getUser();
  const authUser = userData?.user;
  if (userError || !authUser?.email) {
    return { ok: false, message: userError?.message || 'No active account was found.' };
  }

  const providers = getAuthProviders(authUser);
  const hasEmailPassword = providers.includes('email');
  const cleanCurrentPassword = String(currentPassword || '');

  if (hasEmailPassword) {
    if (!cleanCurrentPassword) {
      return { ok: false, message: 'Enter your current password before changing it.' };
    }
    const verify = await supabase.auth.signInWithPassword({
      email: normalizeEmail(authUser.email),
      password: cleanCurrentPassword,
    });
    if (verify.error) {
      return { ok: false, message: 'Current password is incorrect.' };
    }
  }

  const payload = { password: nextPassword };
  if (cleanCurrentPassword) payload.current_password = cleanCurrentPassword;
  const { error } = await supabase.auth.updateUser(payload);
  if (error) return { ok: false, message: error.message };
  return { ok: true, createdPassword: !hasEmailPassword };
}


function mapDbProfile(profile) {
  const email = normalizeEmail(profile?.email);
  return {
    id: profile.id,
    authId: profile.id,
    role: profile.role || 'teacher',
    name: profile.full_name || email?.split('@')[0] || 'Teacher',
    school: profile.school || '',
    email,
    approved: profile.approved === true,
    createdAt: profile.created_at || '',
    updatedAt: profile.updated_at || '',
    permissions: normalizePermissions(profile.permissions),
    provider: 'supabase',
  };
}

export async function getUsers() {
  if (!isSupabaseConfigured) {
    const active = readOfflineDemoUser();
    const demoAdmin = active?.role === 'admin' ? active : createOfflineDemoUser('admin');
    return [demoAdmin, createOfflineDemoUser('teacher')];
  }

  // Repair configured-admin database role before listing. Without this, the UI can
  // show the account as admin via VITE_ADMIN_EMAILS while Supabase RLS still treats
  // the same profile as teacher and only returns one row.
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const sessionUser = sessionData?.session?.user;
    if (sessionUser?.id && isConfiguredAdmin(sessionUser.email)) {
      await promoteConfiguredAdminIfNeeded(sessionUser, null);
    }
  } catch (error) {
    console.warn('Could not auto-repair configured admin profile:', error?.message || error);
  }

  // Prefer the security-definer RPC when the project has been upgraded.
  // It prevents the Admin page from being limited by old/partial RLS policies.
  const rpc = await supabase.rpc('bes_admin_list_profiles');
  if (!rpc.error && Array.isArray(rpc.data)) {
    return rpc.data.map(mapDbProfile);
  }

  // Fallback for older databases that have not run the V5.6 SQL yet.
  const { data, error } = await supabase
    .from(PROFILE_TABLE)
    .select(PROFILE_COLUMNS)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data || []).map(mapDbProfile);
}

export async function syncMissingProfilesFromAuth() {
  if (!isSupabaseConfigured) return { ok: false, message: 'Supabase is not configured.' };
  const { data, error } = await supabase.rpc('bes_admin_sync_missing_profiles');
  if (error) {
    return {
      ok: false,
      message: error.message || 'Could not sync auth users. Run the V5.6 Supabase SQL upgrade first.',
    };
  }
  dispatchUsers();
  return { ok: true, created: Number(data || 0) };
}

async function updateProfile(id, updates) {
  if (!isSupabaseConfigured) return { ok: false, message: 'Supabase is not configured.' };
  const cleanUpdates = { ...updates, updated_at: new Date().toISOString() };

  const rpc = await supabase.rpc('bes_admin_update_profile', {
    target_id: id,
    patch: cleanUpdates,
  });
  if (!rpc.error) {
    invalidateProfileCache(id);
    dispatchUsers();
    return { ok: true };
  }

  const { error } = await supabase
    .from(PROFILE_TABLE)
    .update(cleanUpdates)
    .eq('id', id);
  if (error) return { ok: false, message: error.message };
  invalidateProfileCache(id);
  dispatchUsers();
  return { ok: true };
}

export function saveUsers() {
  console.warn('saveUsers is disabled in Supabase Auth mode. Use profile updates instead.');
}

export async function updateUserRole(id, role) {
  return updateProfile(id, { role: role === 'admin' ? 'admin' : 'teacher' });
}

export async function updateUserApproval(id, approved) {
  return updateProfile(id, { approved: Boolean(approved) });
}

export async function updateUserPermissions(id, permissions) {
  return updateProfile(id, { permissions: normalizePermissions(permissions) });
}

export async function deleteUser(id) {
  return updateProfile(id, { approved: false });
}

const YOUTUBE_API_METADATA_KEY = 'youtube_api_key';
const YOUTUBE_API_LOCAL_KEY = 'bes-youtube-api-key';

function accountStorageScope(user = null) {
  return String(user?.id || user?.email || 'guest')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9@._-]+/g, '-') || 'guest';
}

function youtubeApiLocalKey(user = null) {
  return `${YOUTUBE_API_LOCAL_KEY}:${accountStorageScope(user)}`;
}

export function readLocalAccountYouTubeApiKey(user = null) {
  try {
    return localStorage.getItem(youtubeApiLocalKey(user)) || '';
  } catch {
    return '';
  }
}

export async function getAccountYouTubeApiKey(user = null) {
  const localValue = readLocalAccountYouTubeApiKey(user);
  if (!isSupabaseConfigured) return localValue;

  try {
    const { data, error } = await supabase.auth.getSession();
    const sessionUser = data?.session?.user;
    if (error || !sessionUser) return localValue;
    const remoteValue = String(sessionUser.user_metadata?.[YOUTUBE_API_METADATA_KEY] || '').trim();
    if (remoteValue) {
      localStorage.setItem(youtubeApiLocalKey(user || { id: sessionUser.id, email: sessionUser.email }), remoteValue);
      return remoteValue;
    }
  } catch {
    // Fall back to the account-scoped browser copy.
  }
  return localValue;
}

export async function saveAccountYouTubeApiKey(value, user = null) {
  const cleanValue = String(value || '').trim();
  try {
    if (cleanValue) localStorage.setItem(youtubeApiLocalKey(user), cleanValue);
    else localStorage.removeItem(youtubeApiLocalKey(user));
  } catch {
    // Continue and try the authenticated account store.
  }

  if (!isSupabaseConfigured) {
    return { ok: true, storage: 'browser-account' };
  }

  try {
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    const sessionUser = sessionData?.session?.user;
    if (sessionError || !sessionUser) {
      return { ok: false, message: sessionError?.message || 'No active Supabase account.' };
    }
    const currentMetadata = sessionUser.user_metadata || {};
    const nextMetadata = {
      ...currentMetadata,
      [YOUTUBE_API_METADATA_KEY]: cleanValue || null,
    };
    const { error } = await supabase.auth.updateUser({ data: nextMetadata });
    if (error) return { ok: false, message: error.message };
    return { ok: true, storage: 'supabase-account' };
  } catch (error) {
    return { ok: false, message: error?.message || 'Could not save the YouTube API key.' };
  }
}
