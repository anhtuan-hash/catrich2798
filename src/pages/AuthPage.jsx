import React, { useEffect, useMemo, useState } from 'react';
import { consumeAuthNotice, isAuthConfigured, loginOfflineDemo, loginUser, loginWithGoogle, registerTeacher, requestPasswordReset, updatePassword } from '../utils/auth.js';

function AuthVisualPanel({ language, title, recoveryMode, isRegister, configured }) {
  const cards = language === 'vi'
    ? [
      ['🔐', 'Auth bảo mật', 'Supabase Auth chuẩn enterprise'],
      ['☁️', 'Đồng bộ ứng dụng', 'Dữ liệu real-time trong toàn hệ thống'],
      ['🎮', 'Truy cập trò chơi & thư viện', 'Hơn 2.000+ tài liệu và game'],
    ]
    : [
      ['🔐', 'Secure auth', 'Enterprise-ready Supabase Auth'],
      ['☁️', 'System sync', 'Real-time data across the studio'],
      ['🎮', 'Games & Library access', '2,000+ materials and games'],
    ];
  return (
    <section className="auth-v51-visual-card" aria-label="Brian English sign in overview">
      <div className="auth-v51-brand-row">
        <img src="/brian-english-brand-mark.png" alt="Brian English" />
        <strong>Brian English Studio</strong>
      </div>
      <div className="auth-v51-visual-grid">
        <div className="auth-v51-copy">
          <span className="auth-v51-kicker">{language === 'vi' ? 'Teacher workspace' : 'Teacher workspace'}</span>
          <h1>{title}</h1>
          <p>
            {recoveryMode
              ? (language === 'vi' ? 'Thiết lập lại mật khẩu an toàn và quay lại không gian dạy học Brian English.' : 'Reset your password securely and return to the Brian English teaching workspace.')
              : isRegister
                ? (language === 'vi' ? 'Tạo tài khoản giáo viên, chờ duyệt và bắt đầu sử dụng toàn bộ hệ thống.' : 'Create a teacher account, wait for approval, and start using the complete system.')
                : configured
                  ? (language === 'vi' ? 'Đăng nhập bằng Supabase Auth chính thức, bảo mật, ổn định và đồng bộ toàn hệ thống.' : 'Sign in with secure, stable, production-ready Supabase Auth across the whole system.')
                  : (language === 'vi' ? 'Chưa cấu hình Supabase: dùng demo để kiểm tra giao diện và workflow trên máy.' : 'Supabase is not configured: use demo mode to test the interface and workflow locally.')}
          </p>
        </div>
        <div className="auth-v51-illustration" aria-hidden="true">
          <div className="auth-v51-dashboard-card">
            <div className="dash-bar"><span /><span /><span /></div>
            <div className="dash-chart"><i /><i /><i /></div>
            <div className="dash-profile"><b /><b /><b /></div>
          </div>
          <div className="auth-v51-teacher-avatar"><span>👨🏻‍🏫</span></div>
          <div className="auth-v51-ai-chip">AI</div>
          <div className="auth-v51-shield">🛡️</div>
          <div className="auth-v51-books"><i /><i /><i /></div>
        </div>
      </div>
      <div className="auth-v51-feature-row">
        {cards.map(([icon, heading, text]) => (
          <article key={heading}>
            <span>{icon}</span>
            <div>
              <strong>{heading}</strong>
              <small>{text}</small>
            </div>
          </article>
        ))}
      </div>
      <div className="auth-v51-stat-strip">
        <span><b>120+</b><small>{language === 'vi' ? 'Giáo viên' : 'Teachers'}</small></span>
        <span><b>3.200+</b><small>{language === 'vi' ? 'Học sinh' : 'Students'}</small></span>
        <span><b>2.000+</b><small>{language === 'vi' ? 'Tài liệu & Games' : 'Materials & Games'}</small></span>
        <span><b>99.9%</b><small>Uptime</small></span>
      </div>
    </section>
  );
}

function AuthModuleCards({ language }) {
  const items = language === 'vi'
    ? [
      ['🔒', 'Auth', 'Quản lý xác thực & phân quyền'],
      ['🖥️', 'Apps', 'Ứng dụng & công cụ giảng dạy'],
      ['🎮', 'Games', 'Trò chơi học tập tương tác'],
      ['🗂️', 'Vault', 'Thư viện & tài liệu giảng dạy'],
    ]
    : [
      ['🔒', 'Auth', 'Authentication & access control'],
      ['🖥️', 'Apps', 'Teaching apps and tools'],
      ['🎮', 'Games', 'Interactive learning games'],
      ['🗂️', 'Vault', 'Teacher library and resources'],
    ];
  return (
    <section className="auth-v51-module-grid" aria-label="System modules">
      {items.map(([icon, title, text]) => (
        <article key={title}>
          <span>{icon}</span>
          <div><strong>{title}</strong><small>{text}</small></div>
          <b>›</b>
        </article>
      ))}
    </section>
  );
}

function AuthBottomBrand({ language }) {
  return (
    <section className="auth-v51-bottom-brand">
      <div className="auth-v51-bottom-logo">
        <img src="/brian-english-brand-mark.png" alt="Brian English" />
        <strong>Brian English<br />Studio</strong>
      </div>
      <div>
        <strong>{language === 'vi' ? 'Nền tảng giảng dạy tiếng Anh thông minh' : 'Smart English teaching platform'}</strong>
        <p>{language === 'vi' ? 'Giải pháp toàn diện cho giáo viên và học sinh với công nghệ hiện đại.' : 'A complete solution for teachers and learners powered by modern technology.'}</p>
      </div>
      <div className="auth-v51-lang-card active"><b>VI</b><strong>Tiếng Việt</strong><span>{language === 'vi' ? 'Học tập thông minh' : 'Smart learning'}</span></div>
      <div className="auth-v51-lang-card"><b>EN</b><strong>English</strong><span>{language === 'vi' ? 'Kiến tạo tương lai' : 'Better future tomorrow'}</span></div>
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
    <div className="page auth-page auth-page-v51">
      <section className="auth-v51-stage">
        <AuthVisualPanel
          language={language}
          title={title}
          recoveryMode={recoveryMode}
          isRegister={isRegister}
          configured={configured}
        />

        <form className="auth-v51-form-card" onSubmit={submit}>
          <div className="auth-v51-lock">🔒</div>
          <h2>{recoveryMode ? (language === 'vi' ? 'Đặt lại mật khẩu' : 'Reset password') : isRegister ? (language === 'vi' ? 'Tạo tài khoản' : 'Create account') : (language === 'vi' ? 'Đăng nhập' : 'Sign in')}</h2>
          <p>{language === 'vi' ? 'Chào mừng bạn trở lại Brian English Studio' : 'Welcome back to Brian English Studio'}</p>

          {!configured && (
            <div className="auth-v51-warning">
              <strong>{language === 'vi' ? 'Chế độ demo sẵn sàng' : 'Demo mode ready'}</strong>
              <span>{language === 'vi' ? 'Có thể mở demo khi chưa cấu hình Supabase.' : 'You can open demo mode before Supabase is configured.'}</span>
            </div>
          )}

          {!recoveryMode && isRegister && (
            <>
              <label>{language === 'vi' ? 'Họ tên' : 'Full name'}</label>
              <div className="auth-v51-input-wrap"><span>👤</span><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoComplete="name" placeholder={language === 'vi' ? 'Nhập họ tên' : 'Enter full name'} /></div>
              <label>{language === 'vi' ? 'Trường / Trung tâm' : 'School / Center'}</label>
              <div className="auth-v51-input-wrap"><span>🏫</span><input value={form.school} onChange={(e) => setForm({ ...form, school: e.target.value })} autoComplete="organization" placeholder={language === 'vi' ? 'Nhập trường / trung tâm' : 'Enter school / center'} /></div>
            </>
          )}

          {!recoveryMode && (
            <>
              <label>Email</label>
              <div className="auth-v51-input-wrap"><span>✉️</span><input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} autoComplete="email" placeholder={language === 'vi' ? 'Nhập email của bạn' : 'Enter your email'} /></div>
            </>
          )}

          <div className="auth-v51-label-line">
            <label>{recoveryMode ? (language === 'vi' ? 'Mật khẩu mới' : 'New password') : (language === 'vi' ? 'Mật khẩu' : 'Password')}</label>
            {!isRegister && !recoveryMode && configured && <button type="button" onClick={resetPassword}>{language === 'vi' ? 'Quên mật khẩu?' : 'Forgot password?'}</button>}
          </div>
          <div className="auth-v51-input-wrap"><span>🔒</span><input type={showPassword ? 'text' : 'password'} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} autoComplete={isRegister || recoveryMode ? 'new-password' : 'current-password'} placeholder={language === 'vi' ? 'Nhập mật khẩu' : 'Enter password'} /><button type="button" onClick={() => setShowPassword((value) => !value)}>{showPassword ? '🙈' : '👁️'}</button></div>

          {(isRegister || recoveryMode) && (
            <>
              <label>{language === 'vi' ? 'Xác nhận mật khẩu' : 'Confirm password'}</label>
              <div className="auth-v51-input-wrap"><span>✅</span><input type="password" value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} autoComplete="new-password" placeholder={language === 'vi' ? 'Nhập lại mật khẩu' : 'Confirm password'} /></div>
            </>
          )}

          {msg ? <div className="auth-message auth-v51-message">{msg}</div> : null}
          {okMsg ? <div className="auth-message success-message auth-v51-message">{okMsg}</div> : null}

          <button className="auth-v51-submit" type="submit">
            <span>↪</span>{recoveryMode ? (language === 'vi' ? 'Cập nhật mật khẩu' : 'Update password') : isRegister ? (language === 'vi' ? 'Tạo tài khoản' : 'Create account') : (language === 'vi' ? 'Đăng nhập' : 'Sign in')}
          </button>

          {!recoveryMode && configured ? (
            <>
              <div className="auth-v65-divider"><span>{language === 'vi' ? 'hoặc tiếp tục với' : 'or continue with'}</span></div>
              <button type="button" className="auth-v65-google" disabled={googleLoading} onClick={signInGoogle}>
                <span className="auth-v65-google-mark" aria-hidden="true">G</span>
                <span>{googleLoading ? (language === 'vi' ? 'Đang mở Google...' : 'Opening Google...') : (language === 'vi' ? 'Đăng nhập nhanh bằng Google' : 'Continue with Google')}</span>
              </button>
              <small className="auth-v65-google-note">{language === 'vi' ? 'Tài khoản Google mới vẫn cần quản trị viên duyệt trước khi sử dụng.' : 'New Google accounts still require administrator approval before first use.'}</small>
            </>
          ) : null}

          <button type="button" className="auth-v51-secondary" onClick={() => { setRecoveryMode(false); window.location.hash = isRegister || recoveryMode ? '#/login' : '#/register'; }}>
            <span>👥</span>{recoveryMode
              ? (language === 'vi' ? 'Quay lại đăng nhập' : 'Back to sign in')
              : isRegister
                ? (language === 'vi' ? 'Đã có tài khoản? Đăng nhập' : 'Already have an account? Sign in')
                : (language === 'vi' ? 'Tạo tài khoản' : 'Create account')}
          </button>

          {!configured && !recoveryMode && (
            <div className="auth-v51-demo-actions">
              <button type="button" onClick={() => openOfflineDemo('admin')}>{language === 'vi' ? 'Demo Admin' : 'Demo Admin'}</button>
              <button type="button" onClick={() => openOfflineDemo('teacher')}>{language === 'vi' ? 'Demo Teacher' : 'Demo Teacher'}</button>
            </div>
          )}

          <div className="auth-v51-security-note">
            <span>🛡️</span>
            <small>{configured
              ? (language === 'vi' ? 'Xác thực chính thức qua Supabase Auth. Phân quyền rõ ràng cho Admin & Teacher.' : 'Official Supabase Auth. Clear role-based access for Admin & Teacher.')
              : (language === 'vi' ? 'Demo dùng localStorage để kiểm thử UI và workflow; không dùng cho dữ liệu thật.' : 'Demo uses localStorage for UI and workflow testing only.')}</small>
          </div>
        </form>
      </section>
      <AuthModuleCards language={language} />
      <AuthBottomBrand language={language} />
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
