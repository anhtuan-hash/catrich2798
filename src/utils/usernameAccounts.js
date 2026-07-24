import { supabase } from './supabase.js';

export const INTERNAL_USERNAME_DOMAIN = 'accounts.brianenglish.studio';
export const TEACHER_ACCOUNT_FUNCTION = 'teacher-accounts';
export const TEACHER_ACCOUNT_API = '/api/teacher-accounts';

let bridgeInstalled = false;

export function normalizeUsername(value = '') {
  const normalized = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z0-9._-]/g, '')
    .replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '')
    .slice(0, 32);
  return normalized;
}

export function isUsernameIdentifier(value = '') {
  const clean = String(value || '').trim();
  return Boolean(clean && !clean.includes('@'));
}

export function usernameToInternalEmail(username = '') {
  const clean = normalizeUsername(username);
  return clean ? `${clean}@${INTERNAL_USERNAME_DOMAIN}` : '';
}

export function loginIdentifierToEmail(identifier = '') {
  const clean = String(identifier || '').trim().toLowerCase();
  if (!clean || clean.includes('@')) return clean;
  return usernameToInternalEmail(clean);
}

export function installUsernameAuthBridge() {
  if (bridgeInstalled || !supabase?.auth) return;
  bridgeInstalled = true;

  const signIn = supabase.auth.signInWithPassword?.bind(supabase.auth);
  if (signIn) {
    supabase.auth.signInWithPassword = (credentials = {}) => signIn({
      ...credentials,
      email: loginIdentifierToEmail(credentials.email),
    });
  }

  const reset = supabase.auth.resetPasswordForEmail?.bind(supabase.auth);
  if (reset) {
    supabase.auth.resetPasswordForEmail = (identifier, options) => {
      if (isUsernameIdentifier(identifier)) {
        return Promise.resolve({
          data: null,
          error: new Error('Tài khoản dùng tên đăng nhập cần liên hệ Admin để đặt lại mật khẩu.'),
        });
      }
      return reset(identifier, options);
    };
  }
}

async function parseApiResponse(response) {
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = null; }
  return {
    status: response.status,
    ok: response.ok && data?.ok !== false,
    data: data && typeof data === 'object' ? data : null,
    message: data?.message || (text && text.length < 300 ? text : ''),
  };
}

async function invokeVercelTeacherAccounts(body) {
  if (!supabase?.auth) return { unavailable: true, message: 'Supabase Auth chưa được cấu hình.' };
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (sessionError || !token) {
    return { unavailable: false, ok: false, status: 401, message: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.' };
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(TEACHER_ACCOUNT_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body || {}),
      signal: controller.signal,
    });
    const parsed = await parseApiResponse(response);
    return {
      unavailable: response.status === 404 || response.status === 503,
      ok: parsed.ok,
      status: parsed.status,
      ...(parsed.data || {}),
      message: parsed.message || (parsed.ok ? '' : 'Dịch vụ tài khoản giáo viên trả về lỗi.'),
    };
  } catch (error) {
    return {
      unavailable: true,
      ok: false,
      status: 0,
      message: error?.name === 'AbortError'
        ? 'Dịch vụ tạo tài khoản phản hồi quá chậm. Vui lòng thử lại.'
        : 'Không kết nối được dịch vụ tài khoản trên Vercel.',
    };
  } finally {
    window.clearTimeout(timer);
  }
}

async function invokeEdgeTeacherAccounts(body) {
  if (!supabase?.functions) {
    return { ok: false, message: 'Supabase Functions chưa được cấu hình.' };
  }
  try {
    const { data, error } = await supabase.functions.invoke(TEACHER_ACCOUNT_FUNCTION, { body });
    if (error) {
      const raw = String(error?.message || error || '').trim();
      let message = raw || 'Không thể gọi Edge Function teacher-accounts.';
      if (/404|not found/i.test(raw)) message = 'Edge Function teacher-accounts chưa được triển khai.';
      else if (/failed to send|fetch|network/i.test(raw)) message = 'Không kết nối được Edge Function teacher-accounts.';
      return { ok: false, message };
    }
    if (data?.ok === false) return { ok: false, ...data };
    return { ok: true, ...(data || {}) };
  } catch (error) {
    return { ok: false, message: String(error?.message || 'Không thể gọi Edge Function teacher-accounts.') };
  }
}

export async function invokeTeacherAccounts(body = {}) {
  const primary = await invokeVercelTeacherAccounts(body);
  if (!primary.unavailable) return primary;

  const fallback = await invokeEdgeTeacherAccounts(body);
  if (fallback.ok || fallback.results) return fallback;

  return {
    ok: false,
    message: [primary.message, fallback.message].filter(Boolean).join(' ')
      || 'Dịch vụ quản trị tài khoản chưa sẵn sàng.',
  };
}

export function generateStrongPassword(length = 12) {
  const targetLength = Math.max(10, Math.min(24, Number(length) || 12));
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnopqrstuvwxyz';
  const digits = '23456789';
  const symbols = '!@#$%&*?';
  const all = `${upper}${lower}${digits}${symbols}`;
  const randomIndex = (max) => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
      const buffer = new Uint32Array(1);
      crypto.getRandomValues(buffer);
      return buffer[0] % max;
    }
    return Math.floor(Math.random() * max);
  };
  const chars = [
    upper[randomIndex(upper.length)],
    lower[randomIndex(lower.length)],
    digits[randomIndex(digits.length)],
    symbols[randomIndex(symbols.length)],
  ];
  while (chars.length < targetLength) chars.push(all[randomIndex(all.length)]);
  for (let i = chars.length - 1; i > 0; i -= 1) {
    const j = randomIndex(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

installUsernameAuthBridge();
