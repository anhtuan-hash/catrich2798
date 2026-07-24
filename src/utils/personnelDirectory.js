import { supabase } from './supabase.js';

const REQUEST_TIMEOUT = 14000;

async function accessToken() {
  if (!supabase) throw new Error('Supabase chưa được cấu hình.');
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  const token = data?.session?.access_token || '';
  if (!token) throw new Error('Phiên đăng nhập đã hết hạn. Hãy đăng nhập lại.');
  return token;
}

async function callPersonnelApi(options = {}) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT);
  try {
    const token = await accessToken();
    const response = await fetch('/api/personnel-directory', {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload.ok === false) throw new Error(payload.message || `Không thể xử lý dữ liệu (${response.status}).`);
    return payload;
  } catch (error) {
    if (error?.name === 'AbortError') throw new Error('Yêu cầu nhân sự quá thời gian. Vui lòng kiểm tra mạng và thử lại.');
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export function loadPersonnelDirectory() {
  return callPersonnelApi({ method: 'GET' });
}

export function savePersonnelRecord(userId, record) {
  return callPersonnelApi({
    method: 'POST',
    body: JSON.stringify({ action: 'save-record', userId, record }),
  });
}

export function submitPersonnelChange(proposed, reason = '') {
  return callPersonnelApi({
    method: 'POST',
    body: JSON.stringify({ action: 'submit-change', proposed, reason }),
  });
}

export function reviewPersonnelChange(requestId, decision) {
  return callPersonnelApi({
    method: 'POST',
    body: JSON.stringify({ action: 'review-change', requestId, decision }),
  });
}

export function setPersonnelAccountState(userId, approved) {
  return callPersonnelApi({
    method: 'POST',
    body: JSON.stringify({ action: 'set-account-state', userId, approved }),
  });
}
