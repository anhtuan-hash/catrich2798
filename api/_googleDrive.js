import { createClient } from '@supabase/supabase-js';
import crypto from 'node:crypto';

export const env = {
  supabaseUrl: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
  serviceKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  clientId: process.env.GOOGLE_DRIVE_CLIENT_ID || '',
  clientSecret: process.env.GOOGLE_DRIVE_CLIENT_SECRET || '',
  appUrl: (process.env.APP_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || '').replace(/\/$/, ''),
  stateSecret: process.env.GOOGLE_OAUTH_STATE_SECRET || '',
};

export function send(res, status, payload) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(payload));
}

export function adminClient() {
  if (!env.supabaseUrl || !env.serviceKey) throw new Error('Supabase server credentials are missing');
  return createClient(env.supabaseUrl, env.serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function requireUser(req) {
  const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!token) throw new Error('Missing access token');
  const client = adminClient();
  const { data, error } = await client.auth.getUser(token);
  if (error || !data?.user) throw new Error('Invalid user session');
  return data.user;
}

export function callbackUrl(req) {
  if (process.env.GOOGLE_DRIVE_REDIRECT_URI) return process.env.GOOGLE_DRIVE_REDIRECT_URI;
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}/api/google-drive-callback`;
}

export function signState(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', env.stateSecret || env.clientSecret).update(body).digest('base64url');
  return `${body}.${sig}`;
}
export function verifyState(value) {
  const [body, sig] = String(value || '').split('.');
  const expected = crypto.createHmac('sha256', env.stateSecret || env.clientSecret).update(body || '').digest('base64url');
  if (!body || !sig || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) throw new Error('Invalid OAuth state');
  return JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
}

export async function exchangeCode(code, redirectUri) {
  const body = new URLSearchParams({ code, client_id: env.clientId, client_secret: env.clientSecret, redirect_uri: redirectUri, grant_type: 'authorization_code' });
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || 'Google token exchange failed');
  return data;
}

export async function refreshAccessToken(refreshToken) {
  const body = new URLSearchParams({ refresh_token: refreshToken, client_id: env.clientId, client_secret: env.clientSecret, grant_type: 'refresh_token' });
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error_description || data.error || 'Google token refresh failed');
  return data.access_token;
}

export async function getConnection() {
  const client = adminClient();
  const { data, error } = await client.from('resource_drive_connections').select('*').eq('is_active', true).order('updated_at', { ascending: false }).limit(1).maybeSingle();
  if (error || !data) throw new Error(error?.message || 'TTCM has not connected Google Drive');
  return { client, connection: data, accessToken: await refreshAccessToken(data.refresh_token) };
}

async function driveFetch(url, accessToken, options = {}) {
  const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${accessToken}`, ...(options.headers || {}) } });
  const data = response.status === 204 ? {} : await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'Google Drive API error');
  return data;
}

export async function ensureFolder(accessToken, name, parentId = null) {
  const escaped = name.replace(/'/g, "\\'");
  const parentClause = parentId ? ` and '${parentId}' in parents` : '';
  const q = encodeURIComponent(`mimeType='application/vnd.google-apps.folder' and name='${escaped}' and trashed=false${parentClause}`);
  const existing = await driveFetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name)&spaces=drive&pageSize=10`, accessToken);
  if (existing.files?.[0]) return existing.files[0].id;
  const created = await driveFetch('https://www.googleapis.com/drive/v3/files?fields=id,name', accessToken, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', ...(parentId ? { parents: [parentId] } : {}) }) });
  return created.id;
}

export async function ensureStructure(accessToken, rootName = 'BRIAN ENGLISH – KHO HỌC LIỆU TỔ TIẾNG ANH') {
  const rootId = await ensureFolder(accessToken, rootName);
  const names = ['00_CHO_DUYET','01_SACH_VA_TAI_LIEU_THAM_KHAO','02_GIAO_AN','03_WORKSHEETS','04_DE_KIEM_TRA','05_SLIDES_BAI_GIANG','06_AUDIO_VIDEO','07_TAI_LIEU_CHUYEN_MON','08_TRO_CHOI_VA_HOAT_DONG','09_BIEU_MAU','10_TAI_LIEU_NOI_BO','99_LUU_TRU'];
  const folders = {};
  for (const name of names) folders[name] = await ensureFolder(accessToken, name, rootId);
  return { rootId, folders };
}

export const categoryFolder = {
  books: '01_SACH_VA_TAI_LIEU_THAM_KHAO', 'lesson-plans': '02_GIAO_AN', worksheets: '03_WORKSHEETS', tests: '04_DE_KIEM_TRA', slides: '05_SLIDES_BAI_GIANG', media: '06_AUDIO_VIDEO', professional: '07_TAI_LIEU_CHUYEN_MON', games: '08_TRO_CHOI_VA_HOAT_DONG', forms: '09_BIEU_MAU', internal: '10_TAI_LIEU_NOI_BO',
};

export async function uploadFile(accessToken, buffer, metadata, mimeType) {
  const boundary = `bes_${crypto.randomBytes(12).toString('hex')}`;
  const head = Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: ${mimeType || 'application/octet-stream'}\r\n\r\n`);
  const tail = Buffer.from(`\r\n--${boundary}--`);
  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,parents,size,mimeType', { method: 'POST', headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${boundary}` }, body: Buffer.concat([head, buffer, tail]) });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || 'Upload to Google Drive failed');
  return data;
}

export async function moveFile(accessToken, fileId, targetFolderId) {
  const current = await driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents`, accessToken);
  const removeParents = (current.parents || []).join(',');
  return driveFetch(`https://www.googleapis.com/drive/v3/files/${fileId}?addParents=${encodeURIComponent(targetFolderId)}&removeParents=${encodeURIComponent(removeParents)}&fields=id,parents,webViewLink,webContentLink`, accessToken, { method: 'PATCH' });
}
