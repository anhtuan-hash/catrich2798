import './department-auth-ui.css';

const SUPABASE_URL = String(import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '');
const SUPABASE_KEY = String(
  import.meta.env.VITE_SUPABASE_ANON_KEY
  || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || '',
).trim();

function authErrorMessage(payload, status) {
  return payload?.error_description
    || payload?.msg
    || payload?.message
    || payload?.error
    || `Không thể đăng nhập (${status}).`;
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

  localStorage.setItem('brian-department-session', JSON.stringify(payload));

  try {
    const projectRef = new URL(SUPABASE_URL).hostname.split('.')[0];
    if (projectRef) localStorage.setItem(`sb-${projectRef}-auth-token`, JSON.stringify(payload));
  } catch {
    // The explicit Department session above is sufficient.
  }
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
          <p>Dùng tài khoản Supabase đang sử dụng cho Brian English Studio.</p>
        </div>
        <button type="button" class="department-auth-close" aria-label="Đóng đăng nhập">×</button>
      </header>
      <label>Email
        <input name="email" type="email" autocomplete="username" value="anhtuanpek@gmail.com" required>
      </label>
      <label>Mật khẩu
        <input name="password" type="password" autocomplete="current-password" required>
      </label>
      <p class="department-auth-error" role="alert" hidden></p>
      <footer>
        <button type="button" class="department-auth-cancel">Hủy</button>
        <button type="submit" class="department-auth-submit">Đăng nhập</button>
      </footer>
      <small>Mật khẩu chỉ được gửi trực tiếp tới Supabase qua HTTPS và không được lưu trong mã nguồn.</small>
    </form>
  `;

  document.body.append(trigger, backdrop);

  const form = backdrop.querySelector('form');
  const emailInput = form.elements.email;
  const passwordInput = form.elements.password;
  const submit = backdrop.querySelector('.department-auth-submit');
  const error = backdrop.querySelector('.department-auth-error');

  const close = () => {
    backdrop.hidden = true;
    passwordInput.value = '';
    error.hidden = true;
    error.textContent = '';
  };

  const open = () => {
    backdrop.hidden = false;
    window.setTimeout(() => passwordInput.focus(), 30);
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

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    error.hidden = true;
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

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', buildAuthUi, { once: true });
} else {
  buildAuthUi();
}
