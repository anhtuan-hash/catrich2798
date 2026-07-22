import './department-auth-ui.css';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = String(
  import.meta.env.VITE_SUPABASE_ANON_KEY
  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || '',
).trim();
const ADMIN_EMAIL = 'anhtuan@pek.edu.vn';

function authErrorMessage(payload, status) {
  return payload?.error_description
    || payload?.msg
    || payload?.message
    || payload?.error
    || `Không thể xác thực (${status}).`;
}

function saveSession(payload) {
  if (!payload?.access_token) return false;
  localStorage.setItem('brian-department-session', JSON.stringify(payload));

  try {
    const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
    if (projectRef) localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(payload));
  } catch {
    // The explicit Department session above is sufficient.
  }
  return true;
}

function consumeMagicLinkSession() {
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = hash.get('access_token');
  if (!accessToken) return false;

  const payload = {
    access_token: accessToken,
    refresh_token: hash.get('refresh_token') || '',
    expires_in: Number(hash.get('expires_in') || 3600),
    expires_at: Math.floor(Date.now() / 1000) + Number(hash.get('expires_in') || 3600),
    token_type: hash.get('token_type') || 'bearer',
    type: hash.get('type') || 'magiclink',
  };

  const saved = saveSession(payload);
  if (saved) window.history.replaceState({}, document.title, `${window.location.pathname}${window.location.search}`);
  return saved;
}

async function signInWithPassword(email, password) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Ứng dụng chưa có Project URL hoặc publishable/anon key của Supabase.');
  }

  const response = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || !payload?.access_token) {
    throw new Error(authErrorMessage(payload, response.status));
  }

  saveSession(payload);
}

async function sendMagicLink(email) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Ứng dụng chưa có Project URL hoặc publishable/anon key của Supabase.');
  }

  const redirectTo = `${window.location.origin}${window.location.pathname}`;
  const response = await fetch(`${SUPABASE_URL}/auth/v1/otp?redirect_to=${encodeURIComponent(redirectTo)}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, create_user: false }),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(authErrorMessage(payload, response.status));
}

function buildAuthUi() {
  if (document.getElementById('department-auth-trigger')) return;

  const trigger = document.createElement('button');
  trigger.id = 'department-auth-trigger';
  trigger.type = 'button';
  trigger.className = 'department-auth-trigger';
  trigger.textContent = 'Đăng nhập';
  trigger.hidden = true;

  const backdrop = document.createElement('div');
  backdrop.className = 'department-auth-backdrop';
  backdrop.hidden = true;
  backdrop.innerHTML = `
    <form class="department-auth-modal" aria-labelledby="department-auth-title">
      <header>
        <div>
          <span>KẾT NỐI BRIAN</span>
          <h2 id="department-auth-title">Đăng nhập Tổ chuyên môn</h2>
          <p>Dùng tài khoản quản trị Brian English Studio.</p>
        </div>
        <button type="button" class="department-auth-close" aria-label="Đóng đăng nhập">×</button>
      </header>
      <label>Email
        <input name="email" type="email" autocomplete="username" value="${ADMIN_EMAIL}" required>
      </label>
      <label>Mật khẩu
        <input name="password" type="password" autocomplete="current-password">
      </label>
      <p class="department-auth-error" role="alert" hidden></p>
      <p class="department-auth-success" role="status" hidden></p>
      <footer>
        <button type="button" class="department-auth-magic">Gửi liên kết đăng nhập</button>
        <span class="department-auth-footer-spacer"></span>
        <button type="button" class="department-auth-cancel">Hủy</button>
        <button type="submit" class="department-auth-submit">Đăng nhập</button>
      </footer>
      <small>Không biết mật khẩu: chọn “Gửi liên kết đăng nhập”, mở email và nhấn liên kết. Mật khẩu không được lưu trong mã nguồn.</small>
    </form>
  `;

  document.body.append(trigger, backdrop);

  const form = backdrop.querySelector('form');
  const emailInput = form.elements.email;
  const passwordInput = form.elements.password;
  const submit = backdrop.querySelector('.department-auth-submit');
  const magic = backdrop.querySelector('.department-auth-magic');
  const error = backdrop.querySelector('.department-auth-error');
  const success = backdrop.querySelector('.department-auth-success');

  const clearMessages = () => {
    error.hidden = true;
    error.textContent = '';
    success.hidden = true;
    success.textContent = '';
  };

  const close = () => {
    backdrop.hidden = true;
    passwordInput.value = '';
    clearMessages();
  };

  const open = () => {
    backdrop.hidden = false;
    window.setTimeout(() => emailInput.focus(), 30);
  };

  trigger.addEventListener('click', open);
  backdrop.querySelector('.department-auth-close').addEventListener('click', close);
  backdrop.querySelector('.department-auth-cancel').addEventListener('click', close);
  backdrop.addEventListener('mousedown', (event) => {
    if (event.target === backdrop) close();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && !backdrop.hidden) close();
  });

  magic.addEventListener('click', async () => {
    clearMessages();
    magic.disabled = true;
    magic.textContent = 'Đang gửi…';
    try {
      await sendMagicLink(emailInput.value.trim());
      success.textContent = `Đã gửi liên kết đăng nhập đến ${emailInput.value.trim()}. Kiểm tra cả thư Spam.`;
      success.hidden = false;
      magic.textContent = 'Đã gửi liên kết';
    } catch (authError) {
      error.textContent = authError.message || 'Không thể gửi liên kết đăng nhập.';
      error.hidden = false;
      magic.disabled = false;
      magic.textContent = 'Gửi liên kết đăng nhập';
    }
  });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    clearMessages();
    if (!passwordInput.value) {
      error.textContent = 'Nhập mật khẩu hoặc chọn “Gửi liên kết đăng nhập”.';
      error.hidden = false;
      return;
    }

    submit.disabled = true;
    submit.textContent = 'Đang xác thực…';

    try {
      await signInWithPassword(emailInput.value.trim(), passwordInput.value);
      submit.textContent = 'Đã đăng nhập';
      window.location.reload();
    } catch (authError) {
      error.textContent = authError.message || 'Không thể đăng nhập.';
      error.hidden = false;
      submit.disabled = false;
      submit.textContent = 'Đăng nhập';
    }
  });

  const syncVisibility = () => {
    const status = document.querySelector('[data-testid="department-cloud-status"]');
    const signedOut = status?.textContent?.toLowerCase().includes('chưa đăng nhập');
    trigger.hidden = !signedOut;
    if (!signedOut && !backdrop.hidden) close();
  };

  const observer = new MutationObserver(syncVisibility);
  observer.observe(document.body, { childList: true, subtree: true, characterData: true });
  syncVisibility();
}

const resumedFromMagicLink = consumeMagicLinkSession();
if (resumedFromMagicLink) window.setTimeout(() => window.location.reload(), 0);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', buildAuthUi, { once: true });
} else {
  buildAuthUi();
}
