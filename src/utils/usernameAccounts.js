import { supabase } from './supabase.js';

export const INTERNAL_USERNAME_DOMAIN = 'accounts.brianenglish.studio';
export const TEACHER_ACCOUNT_FUNCTION = 'teacher-accounts';

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

export async function invokeTeacherAccounts(body = {}) {
  if (!supabase?.functions) {
    return { ok: false, message: 'Supabase Functions chưa được cấu hình.' };
  }
  const { data, error } = await supabase.functions.invoke(TEACHER_ACCOUNT_FUNCTION, { body });
  if (error) {
    const message = String(error?.message || error || '').trim();
    return {
      ok: false,
      message: /404|not found/i.test(message)
        ? 'Chưa triển khai Edge Function teacher-accounts trên Supabase.'
        : (message || 'Không thể gọi dịch vụ tài khoản giáo viên.'),
    };
  }
  if (data?.ok === false) return { ok: false, ...data };
  return { ok: true, ...(data || {}) };
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
