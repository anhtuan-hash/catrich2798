import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/auth-standalone.css';
import {
  initializeAuthSession,
  isAuthConfigured,
  loginUser,
  loginWithGoogle,
  registerTeacher,
  requestPasswordReset,
  updatePassword,
} from './utils/auth.js';

function translateAuthError(message = '') {
  const text = String(message || '').toLowerCase();
  if (text.includes('invalid login')) return 'Sai email hoặc mật khẩu.';
  if (text.includes('email not confirmed')) return 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.';
  if (text.includes('waiting for approval') || text.includes('disabled')) return 'Tài khoản đang chờ duyệt hoặc đã bị khóa.';
  if (text.includes('recovery session')) return 'Không tìm thấy phiên đặt lại mật khẩu. Hãy mở lại liên kết mới nhất trong email.';
  return message || 'Không thể hoàn tất yêu cầu.';
}

function getInitialMode() {
  const params = new URLSearchParams(window.location.search);
  if (params.get('recovery') === '1' || window.location.href.includes('type=recovery')) return 'recovery';
  return params.get('mode') === 'register' ? 'register' : 'login';
}

function goToStudio() {
  window.location.replace(`/#/home?auth=${Date.now()}`);
}

function AuthStandalone() {
  const configured = isAuthConfigured();
  const [mode, setMode] = useState(getInitialMode);
  const [form, setForm] = useState({ name: '', school: '', email: '', password: '', confirm: '' });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [success, setSuccess] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const title = useMemo(() => {
    if (mode === 'register') return 'Tạo tài khoản giáo viên';
    if (mode === 'recovery') return 'Đặt lại mật khẩu';
    return 'Đăng nhập giáo viên';
  }, [mode]);

  useEffect(() => {
    document.documentElement.lang = 'vi';
    document.title = `${title} · Brian English Studio`;
  }, [title]);

  useEffect(() => {
    if (mode === 'recovery') return undefined;
    let active = true;
    initializeAuthSession()
      .then((user) => {
        if (active && user) goToStudio();
      })
      .catch(() => {
        if (active) setMessage('Không thể kiểm tra phiên đăng nhập hiện tại. Bạn vẫn có thể đăng nhập lại bên dưới.');
      });
    return () => { active = false; };
  }, [mode]);

  const patch = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setMessage('');
    setSuccess('');

    if (!configured) {
      setMessage('Supabase chưa được cấu hình trên Vercel.');
      return;
    }

    if (mode === 'recovery') {
      if (!form.password || form.password.length < 8) {
        setMessage('Mật khẩu mới cần có ít nhất 8 ký tự.');
        return;
      }
      if (form.password !== form.confirm) {
        setMessage('Mật khẩu xác nhận không khớp.');
        return;
      }
      setBusy(true);
      try {
        const result = await updatePassword(form.password);
        if (!result.ok) setMessage(translateAuthError(result.message));
        else {
          setSuccess('Đã cập nhật mật khẩu. Đang mở lại trang đăng nhập…');
          window.setTimeout(() => {
            window.location.replace('/auth.html?mode=login');
          }, 700);
        }
      } catch (error) {
        setMessage(translateAuthError(error?.message));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (mode === 'register') {
      if (!form.name || !form.school || !form.email || !form.password) {
        setMessage('Vui lòng điền đầy đủ thông tin.');
        return;
      }
      if (form.password.length < 8) {
        setMessage('Mật khẩu cần có ít nhất 8 ký tự.');
        return;
      }
      if (form.password !== form.confirm) {
        setMessage('Mật khẩu xác nhận không khớp.');
        return;
      }
      setBusy(true);
      try {
        const result = await registerTeacher(form);
        if (!result.ok) setMessage(translateAuthError(result.message));
        else if (result.user) goToStudio();
        else if (result.needsEmailConfirmation) setSuccess('Tài khoản đã được tạo. Hãy xác nhận email, sau đó chờ quản trị viên duyệt.');
        else setSuccess('Tài khoản đã được tạo và đang chờ quản trị viên duyệt.');
      } catch (error) {
        setMessage(translateAuthError(error?.message));
      } finally {
        setBusy(false);
      }
      return;
    }

    if (!form.email || !form.password) {
      setMessage('Vui lòng nhập email và mật khẩu.');
      return;
    }

    setBusy(true);
    try {
      const result = await loginUser({ email: form.email, password: form.password });
      if (!result.ok) setMessage(translateAuthError(result.message));
      else goToStudio();
    } catch (error) {
      setMessage(translateAuthError(error?.message));
    } finally {
      setBusy(false);
    }
  };

  const forgotPassword = async () => {
    setMessage('');
    setSuccess('');
    if (!form.email) {
      setMessage('Hãy nhập email trước.');
      return;
    }
    setBusy(true);
    try {
      const result = await requestPasswordReset(form.email);
      if (!result.ok) setMessage(translateAuthError(result.message));
      else setSuccess('Đã gửi email đặt lại mật khẩu nếu tài khoản tồn tại.');
    } catch (error) {
      setMessage(translateAuthError(error?.message));
    } finally {
      setBusy(false);
    }
  };

  const googleSignIn = async () => {
    setMessage('');
    setSuccess('');
    setBusy(true);
    try {
      const result = await loginWithGoogle();
      if (!result.ok) setMessage(translateAuthError(result.message));
    } catch (error) {
      setMessage(translateAuthError(error?.message));
      setBusy(false);
    }
  };

  return (
    <main className="auth-alone-page">
      <section className="auth-alone-shell">
        <aside className="auth-alone-brand">
          <img src="/brian-english-brand-mark.png" alt="Brian English" />
          <span>BRIAN ENGLISH STUDIO</span>
          <h1>Không gian dạy học số dành cho giáo viên tiếng Anh.</h1>
          <p>Trang đăng nhập này chạy độc lập, không tải launcher, AI, thông báo hay các module quản trị.</p>
          <div className="auth-alone-chips"><b>Supabase Auth</b><b>Đồng bộ tài khoản</b><b>Phân quyền an toàn</b></div>
        </aside>

        <form className="auth-alone-card" onSubmit={submit}>
          <div className="auth-alone-heading">
            <span>{mode === 'register' ? 'ĐĂNG KÝ' : mode === 'recovery' ? 'KHÔI PHỤC' : 'ĐĂNG NHẬP'}</span>
            <h2>{title}</h2>
            <p>Chào mừng bạn đến với Brian English Studio.</p>
          </div>

          {!configured ? <div className="auth-alone-message error">Supabase chưa được cấu hình trên Vercel.</div> : null}

          {mode === 'register' ? (
            <>
              <label>Họ tên</label>
              <input value={form.name} onChange={(event) => patch('name', event.target.value)} autoComplete="name" placeholder="Nguyễn Anh Tuấn" />
              <label>Trường / Trung tâm</label>
              <input value={form.school} onChange={(event) => patch('school', event.target.value)} autoComplete="organization" placeholder="Tên trường hoặc trung tâm" />
            </>
          ) : null}

          {mode !== 'recovery' ? (
            <>
              <label>Email</label>
              <input type="email" value={form.email} onChange={(event) => patch('email', event.target.value)} autoComplete="email" placeholder="teacher@example.com" />
            </>
          ) : null}

          <div className="auth-alone-label-row">
            <label>{mode === 'recovery' ? 'Mật khẩu mới' : 'Mật khẩu'}</label>
            {mode === 'login' ? <button type="button" className="auth-alone-link" onClick={forgotPassword} disabled={busy}>Quên mật khẩu?</button> : null}
          </div>
          <div className="auth-alone-password">
            <input
              type={showPassword ? 'text' : 'password'}
              value={form.password}
              onChange={(event) => patch('password', event.target.value)}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="Nhập mật khẩu"
            />
            <button type="button" onClick={() => setShowPassword((value) => !value)} aria-label="Hiện hoặc ẩn mật khẩu">{showPassword ? 'Ẩn' : 'Hiện'}</button>
          </div>

          {mode !== 'login' ? (
            <>
              <label>Xác nhận mật khẩu</label>
              <input type="password" value={form.confirm} onChange={(event) => patch('confirm', event.target.value)} autoComplete="new-password" placeholder="Nhập lại mật khẩu" />
            </>
          ) : null}

          {message ? <div className="auth-alone-message error" role="alert">{message}</div> : null}
          {success ? <div className="auth-alone-message success" role="status">{success}</div> : null}

          <button className="auth-alone-primary" type="submit" disabled={busy || !configured}>
            {busy ? 'Đang xử lý…' : mode === 'register' ? 'Tạo tài khoản' : mode === 'recovery' ? 'Cập nhật mật khẩu' : 'Đăng nhập'}
          </button>

          {mode === 'login' && configured ? (
            <button className="auth-alone-google" type="button" onClick={googleSignIn} disabled={busy}>Đăng nhập bằng Google</button>
          ) : null}

          <button
            className="auth-alone-secondary"
            type="button"
            onClick={() => {
              const next = mode === 'login' ? 'register' : 'login';
              setMode(next);
              setMessage('');
              setSuccess('');
              window.history.replaceState({}, '', `/auth.html?mode=${next}`);
            }}
          >
            {mode === 'login' ? 'Chưa có tài khoản? Tạo tài khoản' : 'Quay lại đăng nhập'}
          </button>
        </form>
      </section>
    </main>
  );
}

function FatalAuthFallback({ error }) {
  return (
    <main className="auth-alone-page">
      <section className="auth-alone-fatal">
        <strong>BE</strong>
        <h1>Không thể mở trang đăng nhập riêng</h1>
        <p>{String(error?.message || error || 'Lỗi không xác định')}</p>
        <button onClick={() => window.location.reload()}>Tải lại trang</button>
      </section>
    </main>
  );
}

try {
  createRoot(document.getElementById('auth-root')).render(<AuthStandalone />);
} catch (error) {
  createRoot(document.getElementById('auth-root')).render(<FatalAuthFallback error={error} />);
}
