import React, { useEffect, useMemo, useState } from 'react';
import { consumeAuthNotice, isAuthConfigured, loginOfflineDemo, loginUser, loginWithGoogle, registerTeacher, requestPasswordReset, updatePassword } from '../utils/auth.js';
import './AuthPageGoogle.css';

function FeatureIcon({ type }) {
  if (type === 'shield') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5.5 5.7v5.7c0 4.3 2.7 7.7 6.5 9.6 3.8-1.9 6.5-5.3 6.5-9.6V5.7L12 3Zm0 3.1 3.8 1.6v3.7c0 2.8-1.5 5.2-3.8 6.7-2.3-1.5-3.8-3.9-3.8-6.7V7.7L12 6.1Zm-1 8.2-1.8-1.8-1.4 1.4 3.2 3.2 5.4-5.4-1.4-1.4-4 4Z" /></svg>;
  }
  if (type === 'apps') {
    return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 4h7v7H4V4Zm9 0h7v7h-7V4ZM4 13h7v7H4v-7Zm9 0h7v7h-7v-7Z" /></svg>;
  }
  return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.7 6.3A8 8 0 0 0 4.3 9H2l3.5 3.5L9 9H6.4a5.5 5.5 0 0 1 9.5-1L17.7 6.3ZM18.5 11.5 15 15h2.6a5.5 5.5 0 0 1-9.5 1l-1.8 1.7A8 8 0 0 0 19.7 15H22l-3.5-3.5Z" /></svg>;
}

function AuthVisualPanel({ language, title, recoveryMode, isRegister, configured }) {
  const features = language === 'vi'
    ? [
      ['shield', 'Đăng nhập an toàn', configured ? 'Xác thực qua Supabase Auth.' : 'Chế độ demo dành cho kiểm thử giao diện.'],
      ['apps', 'Truy cập đúng quyền', 'Ứng dụng, trò chơi và học liệu hiển thị theo tài khoản.'],
      ['sync', 'Làm việc liền mạch', 'Nhiệm vụ và nội dung được đồng bộ trong hệ thống.'],
    ]
    : [
      ['shield', 'Secure sign-in', configured ? 'Authentication powered by Supabase Auth.' : 'Demo mode for interface testing.'],
      ['apps', 'Role-based access', 'Apps, games, and resources follow account permissions.'],
      ['sync', 'Connected workflow', 'Tasks and content stay connected across the system.'],
    ];

  const description = recoveryMode
    ? (language === 'vi' ? 'Thiết lập mật khẩu mới để tiếp tục sử dụng English Hub.' : 'Create a new password to continue using English Hub.')
    : isRegister
      ? (language === 'vi' ? 'Tạo tài khoản giáo viên và gửi yêu cầu phê duyệt đến quản trị viên.' : 'Create a teacher account and submit it for administrator approval.')
      : configured
        ? (language === 'vi' ? 'Đăng nhập để truy cập không gian làm việc, học liệu và các công cụ được cấp quyền.' : 'Sign in to access your workspace, resources, and permitted tools.')
        : (language === 'vi' ? 'Supabase chưa được cấu hình. Bạn vẫn có thể mở tài khoản demo để kiểm tra giao diện.' : 'Supabase is not configured. Demo accounts remain available for interface testing.');

  return (
    <section className="auth-google-visual" aria-label={language === 'vi' ? 'Giới thiệu trang đăng nhập English Hub' : 'English Hub sign-in overview'}>
      <div className="auth-google-brand-row">
        <img src="/brian-english-brand-mark.png" alt="" aria-hidden="true" />
        <span>English Hub</span>
      </div>

      <div className="auth-google-copy">
        <span className="auth-google-kicker">{language === 'vi' ? 'Không gian giáo viên' : 'Teacher workspace'}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>

      <div className="auth-google-visual-art" aria-hidden="true">
        <div className="auth-google-orbit auth-google-orbit-a" />
        <div className="auth-google-orbit auth-google-orbit-b" />
        <div className="auth-google-art-card auth-google-art-card-main">
          <span className="auth-google-art-logo"><img src="/brian-english-brand-mark.png" alt="" /></span>
          <div><b>English Hub</b><small>{language === 'vi' ? 'Không gian dạy học số' : 'Digital teaching workspace'}</small></div>
        </div>
        <div className="auth-google-art-card auth-google-art-card-small is-blue"><b>Apps</b><span>▦</span></div>
        <div className="auth-google-art-card auth-google-art-card-small is-green"><b>Auth</b><span>✓</span></div>
        <div className="auth-google-art-card auth-google-art-card-small is-yellow"><b>Sync</b><span>↻</span></div>
      </div>

      <div className="auth-google-feature-list">
        {features.map(([type, heading, text]) => (
          <article key={heading}>
            <span className={`auth-google-feature-icon is-${type}`}><FeatureIcon type={type} /></span>
            <div><strong>{heading}</strong><small>{text}</small></div>
          </article>
        ))}
      </div>

      <div className="auth-google-assurance-row" aria-label={language === 'vi' ? 'Các phương thức và tính năng xác thực' : 'Authentication methods and capabilities'}>
        <span>Supabase Auth</span>
        <span>Google Sign-In</span>
        <span>{language === 'vi' ? 'Phân quyền tài khoản' : 'Role-based access'}</span>
      </div>
    </section>
  );
}

export default function AuthPage({ mode = 'login', language, onLogin, setGlobalLoading }) {
  const isRegister = mode === 'register';
  const configured = isAuthConfigured();
  const [form, setForm] = useState({ name: '', school: '', email: '', password: '', confirm: '' });
  const [msg, setMsg] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [recoveryMode, setRecoveryMode] = useState(() => window.location.href.includes('recovery=1') || window.location.href.includes('type=recovery'));

  useEffect(() => {
    const detectRecovery = () => {
      const href = window.location.href || '';
      setRecoveryMode(href.includes('recovery=1') || href.includes('type=recovery'));
    };
    detectRecovery();
    window.addEventListener('hashchange', detectRecovery);
    return () => window.removeEventListener('hashchange', detectRecovery);
  }, []);

  useEffect(() => {
    const notice = consumeAuthNotice();
    if (!notice?.message) return;
    if (notice.tone === 'success') setOkMsg(notice.message);
    else setMsg(notice.message);
  }, []);

  const title = useMemo(() => {
    if (recoveryMode) return language === 'vi' ? 'Đặt lại mật khẩu' : 'Reset password';
    if (isRegister) return language === 'vi' ? 'Tạo tài khoản giáo viên' : 'Create teacher account';
    return language === 'vi' ? 'Đăng nhập giáo viên' : 'Teacher sign in';
  }, [isRegister, language, recoveryMode]);

  const submit = async (e) => {
    e.preventDefault();
    setMsg('');
    setOkMsg('');

    if (!configured) {
      setMsg(language === 'vi'
        ? 'Chưa cấu hình Supabase. Vui lòng thêm VITE_SUPABASE_URL và VITE_SUPABASE_ANON_KEY trong Vercel.'
        : 'Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in Vercel.');
      return;
    }

    if (recoveryMode) {
      if (!form.password || !form.confirm) {
        setMsg(language === 'vi' ? 'Vui lòng nhập và xác nhận mật khẩu mới.' : 'Please enter and confirm your new password.');
        return;
      }
      if (form.password.length < 8) {
        setMsg(language === 'vi' ? 'Mật khẩu nên có ít nhất 8 kí tự.' : 'Password should contain at least 8 characters.');
        return;
      }
      if (form.password !== form.confirm) {
        setMsg(language === 'vi' ? 'Mật khẩu xác nhận không khớp.' : 'Passwords do not match.');
        return;
      }
      setGlobalLoading?.(true, language === 'vi' ? 'Đang cập nhật mật khẩu...' : 'Updating password...');
      const res = await updatePassword(form.password);
      setGlobalLoading?.(false);
      if (!res.ok) {
        setMsg(language === 'vi' ? translateLoginError(res.message) : res.message);
        return;
      }
      setOkMsg(language === 'vi' ? 'Đã cập nhật mật khẩu. Thầy/cô có thể đăng nhập lại.' : 'Password updated. You can sign in again.');
      setRecoveryMode(false);
      setForm((prev) => ({ ...prev, password: '', confirm: '' }));
      window.location.hash = '#/login';
      return;
    }

    if (isRegister) {
      if (!form.name || !form.school || !form.email || !form.password) {
        setMsg(language === 'vi' ? 'Vui lòng điền đầy đủ thông tin.' : 'Please complete all fields.');
        return;
      }
      if (form.password.length < 8) {
        setMsg(language === 'vi' ? 'Mật khẩu nên có ít nhất 8 kí tự.' : 'Password should contain at least 8 characters.');
        return;
      }
      if (form.password !== form.confirm) {
        setMsg(language === 'vi' ? 'Mật khẩu xác nhận không khớp.' : 'Passwords do not match.');
        return;
      }
      setGlobalLoading?.(true, language === 'vi' ? 'Đang tạo tài khoản...' : 'Creating account...');
      const res = await registerTeacher(form);
      setGlobalLoading?.(false);
      if (!res.ok) {
        setMsg(res.message || (language === 'vi' ? 'Không thể tạo tài khoản.' : 'Could not create account.'));
        return;
      }
      if (res.needsEmailConfirmation) {
        setOkMsg(language === 'vi'
          ? 'Tài khoản đã được tạo. Vui lòng kiểm tra email để xác nhận. Sau đó admin cần duyệt tài khoản trước khi sử dụng.'
          : 'Account created. Please check your email to confirm. An admin must approve the account before first use.');
        return;
      }
      if (res.pendingApproval) {
        setOkMsg(language === 'vi'
          ? 'Tài khoản đã được tạo và đang chờ admin duyệt. Sau khi được duyệt, thầy/cô đăng nhập lại để dùng app.'
          : 'Account created and waiting for admin approval. After approval, sign in again to use the app.');
        return;
      }
      if (res.user) onLogin?.(res.user);
      return;
    }

    if (!form.email || !form.password) {
      setMsg(language === 'vi' ? 'Vui lòng nhập email và mật khẩu.' : 'Please enter your email and password.');
      return;
    }

    setGlobalLoading?.(true, language === 'vi' ? 'Đang đăng nhập...' : 'Signing in...');
    const res = await loginUser(form);
    setGlobalLoading?.(false);
    if (!res.ok) {
      setMsg(language === 'vi' ? translateLoginError(res.message) : res.message);
      return;
    }
    onLogin?.(res.user);
  };

  const resetPassword = async () => {
    setMsg('');
    setOkMsg('');
    if (!form.email) {
      setMsg(language === 'vi' ? 'Nhập email trước khi yêu cầu đặt lại mật khẩu.' : 'Enter your email before requesting a password reset.');
      return;
    }
    setGlobalLoading?.(true, language === 'vi' ? 'Đang gửi email đặt lại mật khẩu...' : 'Sending password reset email...');
    const res = await requestPasswordReset(form.email);
    setGlobalLoading?.(false);
    if (!res.ok) {
      setMsg(res.message || (language === 'vi' ? 'Không thể gửi email đặt lại mật khẩu.' : 'Could not send reset email.'));
      return;
    }
    setOkMsg(language === 'vi' ? 'Đã gửi email đặt lại mật khẩu nếu tài khoản tồn tại.' : 'Password reset email sent if the account exists.');
  };

  const signInGoogle = async () => {
    setMsg('');
    setOkMsg('');
    if (!configured) {
      setMsg(language === 'vi' ? 'Cần cấu hình Supabase trước khi đăng nhập bằng Google.' : 'Configure Supabase before using Google sign-in.');
      return;
    }
    setGoogleLoading(true);
    setGlobalLoading?.(true, language === 'vi' ? 'Đang chuyển đến Google...' : 'Redirecting to Google...');
    const res = await loginWithGoogle();
    if (!res.ok) {
      setGoogleLoading(false);
      setGlobalLoading?.(false);
      setMsg(language === 'vi' ? translateLoginError(res.message) : res.message);
    }
  };

  const openOfflineDemo = async (role = 'admin') => {
    setMsg('');
    setOkMsg('');
    const res = await loginOfflineDemo(role);
    if (!res.ok) {
      setMsg(res.message || (language === 'vi' ? 'Không mở được demo.' : 'Could not open demo.'));
      return;
    }
    onLogin?.(res.user);
  };

  return (
    <div className="page auth-page auth-page-v51 auth-google-page">
      <section className="auth-google-stage">
        <AuthVisualPanel
          language={language}
          title={title}
          recoveryMode={recoveryMode}
          isRegister={isRegister}
          configured={configured}
        />

        <form className="auth-google-form" onSubmit={submit}>
          <header className="auth-google-form-header">
            <span className="auth-google-form-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M17 8h-1V6a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v9h14v-9a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V6Zm7 11H7v-7h10v7Z" /></svg>
            </span>
            <div>
              <span className="auth-google-form-kicker">English Hub</span>
              <h2>{recoveryMode ? (language === 'vi' ? 'Đặt lại mật khẩu' : 'Reset password') : isRegister ? (language === 'vi' ? 'Tạo tài khoản' : 'Create account') : (language === 'vi' ? 'Đăng nhập' : 'Sign in')}</h2>
              <p>{language === 'vi' ? 'Tiếp tục vào không gian làm việc của bạn.' : 'Continue to your teaching workspace.'}</p>
            </div>
          </header>

          {!configured && (
            <div className="auth-google-notice is-warning">
              <strong>{language === 'vi' ? 'Chế độ demo đang khả dụng' : 'Demo mode is available'}</strong>
              <span>{language === 'vi' ? 'Supabase chưa được cấu hình trên môi trường này.' : 'Supabase is not configured in this environment.'}</span>
            </div>
          )}

          <div className="auth-google-fields">
            {!recoveryMode && isRegister && (
              <>
                <label className="auth-google-field">
                  <span>{language === 'vi' ? 'Họ và tên' : 'Full name'}</span>
                  <div><i aria-hidden="true">A</i><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" placeholder={language === 'vi' ? 'Nhập họ và tên' : 'Enter full name'} /></div>
                </label>
                <label className="auth-google-field">
                  <span>{language === 'vi' ? 'Trường / Trung tâm' : 'School / Center'}</span>
                  <div><i aria-hidden="true">S</i><input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} autoComplete="organization" placeholder={language === 'vi' ? 'Nhập trường hoặc trung tâm' : 'Enter school or center'} /></div>
                </label>
              </>
            )}

            {!recoveryMode && (
              <label className="auth-google-field">
                <span>Email</span>
                <div><i aria-hidden="true">@</i><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" placeholder={language === 'vi' ? 'ten@truong.edu.vn' : 'name@school.edu'} /></div>
              </label>
            )}

            <label className="auth-google-field">
              <span className="auth-google-label-row">
                <b>{recoveryMode ? (language === 'vi' ? 'Mật khẩu mới' : 'New password') : (language === 'vi' ? 'Mật khẩu' : 'Password')}</b>
                {!isRegister && !recoveryMode && configured && <button type="button" onClick={resetPassword}>{language === 'vi' ? 'Quên mật khẩu?' : 'Forgot password?'}</button>}
              </span>
              <div><i aria-hidden="true">•</i><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete={isRegister || recoveryMode ? 'new-password' : 'current-password'} placeholder={language === 'vi' ? 'Nhập mật khẩu' : 'Enter password'} /><button type="button" className="auth-google-password-toggle" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? (language === 'vi' ? 'Ẩn mật khẩu' : 'Hide password') : (language === 'vi' ? 'Hiện mật khẩu' : 'Show password')}>{showPassword ? 'Ẩn' : 'Hiện'}</button></div>
            </label>

            {(isRegister || recoveryMode) && (
              <label className="auth-google-field">
                <span>{language === 'vi' ? 'Xác nhận mật khẩu' : 'Confirm password'}</span>
                <div><i aria-hidden="true">✓</i><input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="new-password" placeholder={language === 'vi' ? 'Nhập lại mật khẩu' : 'Confirm password'} /></div>
              </label>
            )}
          </div>

          {msg ? <div className="auth-message auth-google-message is-error">{msg}</div> : null}
          {okMsg ? <div className="auth-message success-message auth-google-message is-success">{okMsg}</div> : null}

          <button className="auth-google-submit" type="submit">
            {recoveryMode ? (language === 'vi' ? 'Cập nhật mật khẩu' : 'Update password') : isRegister ? (language === 'vi' ? 'Tạo tài khoản' : 'Create account') : (language === 'vi' ? 'Đăng nhập' : 'Sign in')}
            <span aria-hidden="true">→</span>
          </button>

          {!recoveryMode && configured ? (
            <>
              <div className="auth-google-divider"><span>{language === 'vi' ? 'hoặc' : 'or'}</span></div>
              <button type="button" className="auth-google-google-button" disabled={googleLoading} onClick={signInGoogle}>
                <span className="auth-google-google-mark" aria-hidden="true">G</span>
                <span>{googleLoading ? (language === 'vi' ? 'Đang mở Google...' : 'Opening Google...') : (language === 'vi' ? 'Tiếp tục với Google' : 'Continue with Google')}</span>
              </button>
              <small className="auth-google-google-note">{language === 'vi' ? 'Tài khoản mới cần được quản trị viên phê duyệt trước khi sử dụng.' : 'New accounts require administrator approval before first use.'}</small>
            </>
          ) : null}

          <button type="button" className="auth-google-secondary" onClick={() => { setRecoveryMode(false); window.location.hash = isRegister || recoveryMode ? '#/login' : '#/register'; }}>
            {recoveryMode
              ? (language === 'vi' ? 'Quay lại đăng nhập' : 'Back to sign in')
              : isRegister
                ? (language === 'vi' ? 'Đã có tài khoản? Đăng nhập' : 'Already have an account? Sign in')
                : (language === 'vi' ? 'Chưa có tài khoản? Tạo tài khoản' : 'New to English Hub? Create account')}
          </button>

          {!configured && !recoveryMode && (
            <div className="auth-google-demo-actions">
              <button type="button" onClick={() => openOfflineDemo('admin')}>Demo Admin</button>
              <button type="button" onClick={() => openOfflineDemo('teacher')}>Demo Teacher</button>
            </div>
          )}

          <div className="auth-google-security-note">
            <FeatureIcon type="shield" />
            <small>{configured
              ? (language === 'vi' ? 'Xác thực qua Supabase Auth và phân quyền theo tài khoản.' : 'Authentication through Supabase Auth with role-based access.')
              : (language === 'vi' ? 'Demo chỉ dùng để kiểm tra giao diện và quy trình.' : 'Demo mode is for interface and workflow testing only.')}</small>
          </div>
        </form>
      </section>

      <footer className="auth-google-page-footer">
        <span>© 2026 English Hub</span>
        <span>{language === 'vi' ? 'Không gian dạy học số dành cho giáo viên' : 'Digital teaching workspace for educators'}</span>
      </footer>
    </div>
  );
}

function translateLoginError(message = '') {
  const text = String(message || '').toLowerCase();
  if (text.includes('invalid login')) return 'Sai email hoặc mật khẩu.';
  if (text.includes('email not confirmed')) return 'Email chưa được xác nhận. Vui lòng kiểm tra hộp thư.';
  if (text.includes('waiting for approval') || text.includes('disabled')) return 'Tài khoản đang chờ duyệt hoặc đã bị khóa.';
  if (text.includes('recovery session')) return 'Không tìm thấy phiên đặt lại mật khẩu. Vui lòng mở lại link mới nhất trong email.';
  return message || 'Không thể đăng nhập.';
}
