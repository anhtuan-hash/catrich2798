import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

const localWindows = new Map();
const ROLE_ALIASES = new Map([
  ['admin', 'admin'], ['administrator', 'admin'],
  ['ttcm', 'department_head'], ['leader', 'department_head'], ['head', 'department_head'],
  ['manager', 'department_head'], ['department_head', 'department_head'], ['department-head', 'department_head'],
  ['department_leader', 'department_head'], ['to_truong', 'department_head'], ['tổ trưởng', 'department_head'],
  ['student', 'student'], ['learner', 'student'], ['teacher', 'teacher'], ['editor', 'teacher'],
]);

function normalizeRole(value, fallback = 'teacher') {
  return ROLE_ALIASES.get(String(value || '').trim().toLowerCase()) || fallback;
}

function serverEnv() {
  return {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    publicKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '',
  };
}

export function sendJson(res, status, payload, extraHeaders = {}) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  Object.entries(extraHeaders).forEach(([key, value]) => res.setHeader(key, value));
  res.end(JSON.stringify(payload));
}

function bearer(req) {
  return String(req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
}

function requestIp(req) {
  return String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();
}

function adminClient() {
  const env = serverEnv();
  const key = env.serviceKey || env.publicKey;
  if (!env.url || !key) throw new Error('Supabase server configuration is incomplete.');
  return createClient(env.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function userScopedClient(token) {
  const env = serverEnv();
  if (!env.url || !env.publicKey) throw new Error('Supabase public server configuration is incomplete.');
  return createClient(env.url, env.publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
}

async function readAssignedRole(client, userId) {
  try {
    const { data, error } = await client
      .from('system_roles')
      .select('role,active,scope')
      .eq('user_id', userId)
      .eq('active', true)
      .order('assigned_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!error && data?.role) return normalizeRole(data.role);
  } catch { /* older schema */ }
  return '';
}

async function readProfile(client, userId) {
  for (const column of ['id', 'user_id', 'profile_id']) {
    const { data, error } = await client.from('profiles').select('*').eq(column, userId).limit(1).maybeSingle();
    if (!error && data) return data;
    if (error && !/column .* does not exist|42703/i.test(String(error.message || ''))) break;
  }
  return null;
}

function profileApproved(profile = {}) {
  if (profile.approved === false || profile.is_approved === false) return false;
  const status = String(profile.status || '').trim().toLowerCase();
  return !status || ['approved', 'active', 'enabled'].includes(status);
}

export async function requireApprovedUser(req, { roles = [] } = {}) {
  const token = bearer(req);
  if (!token) {
    const error = new Error('Authentication required.');
    error.status = 401;
    throw error;
  }
  const admin = adminClient();
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data?.user) {
    const authError = new Error('Invalid or expired user session.');
    authError.status = 401;
    throw authError;
  }
  const user = data.user;
  const [assignedRole, profile] = await Promise.all([
    readAssignedRole(admin, user.id),
    readProfile(admin, user.id),
  ]);
  const metadataRole = user.app_metadata?.role || user.user_metadata?.role || '';
  const role = assignedRole || normalizeRole(profile?.role || metadataRole || 'teacher');
  if (!profileApproved(profile || {})) {
    const approvalError = new Error('This account is awaiting approval or has been disabled.');
    approvalError.status = 403;
    throw approvalError;
  }
  const allowed = roles.map((item) => normalizeRole(item));
  if (allowed.length && !allowed.includes(role)) {
    const roleError = new Error('You do not have permission to use this endpoint.');
    roleError.status = 403;
    throw roleError;
  }
  const userClient = userScopedClient(token);
  return { client: userClient, userClient, adminClient: admin, token, user, profile, role, ip: requestIp(req) };
}

function memoryLimit(key, limit, windowMs) {
  const now = Date.now();
  const entry = localWindows.get(key);
  if (!entry || now >= entry.resetAt) {
    localWindows.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }
  entry.count += 1;
  localWindows.set(key, entry);
  return { allowed: entry.count <= limit, remaining: Math.max(0, limit - entry.count), resetAt: entry.resetAt };
}

export async function enforceRateLimit(context, { feature = 'api', perMinute = 20, perDay = 200 } = {}) {
  const minuteKey = `${feature}:minute:${context.user.id}:${context.ip}`;
  const dayKey = `${feature}:day:${context.user.id}`;
  const minute = memoryLimit(minuteKey, perMinute, 60_000);
  const day = memoryLimit(dayKey, perDay, 86_400_000);
  if (!minute.allowed || !day.allowed) {
    const error = new Error('Usage limit reached. Please wait before trying again.');
    error.status = 429;
    error.retryAfter = Math.ceil((Math.min(minute.resetAt, day.resetAt) - Date.now()) / 1000);
    throw error;
  }
  try {
    const { data, error } = await context.client.rpc('bes_v1099_consume_ai_quota', {
      p_user_id: context.user.id,
      p_feature: feature,
      p_ip_hash: crypto.createHash('sha256').update(context.ip).digest('hex'),
      p_per_minute: perMinute,
      p_per_day: perDay,
    });
    if (!error && data === false) {
      const quotaError = new Error('Your server-side AI quota has been reached.');
      quotaError.status = 429;
      throw quotaError;
    }
  } catch (error) {
    if (error?.status === 429) throw error;
    // The memory limiter remains active when the optional database quota is unavailable.
  }
  return { remaining: Math.min(minute.remaining, day.remaining) };
}

export async function appendApiAudit(context, event = {}) {
  try {
    await (context.adminClient || context.client).from('api_security_events').insert({
      actor_id: context.user.id,
      actor_role: context.role,
      endpoint: String(event.endpoint || ''),
      action: String(event.action || 'request'),
      status: String(event.status || 'ok'),
      request_id: String(event.requestId || ''),
      ip_hash: crypto.createHash('sha256').update(context.ip).digest('hex'),
      details: event.details || {},
    });
  } catch { /* audit table is optional during staged rollout */ }
}

export function createRequestId() {
  return crypto.randomUUID();
}
