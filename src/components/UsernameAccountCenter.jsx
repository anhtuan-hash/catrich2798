import React, { useEffect, useState } from 'react';
import { changeCurrentPassword, initializeAuthSession, subscribeToAuthChanges } from '../utils/auth.js';
import { invokeTeacherAccounts } from '../utils/usernameAccounts.js';
import './UsernameAccountCenter.css';

function currentRoute() {
  if (typeof window === 'undefined') return '';
  return window.location.hash.replace(/^#\/?/, '').split(/[?&]/)[0].trim();
}

export default function UsernameAccountCenter({ language = 'vi' }) {
  const vi = language === 'vi';
  const [route, setRoute] = useState(currentRoute);
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [openEmail, setOpenEmail] = useState(false);
  const [contactEmail, setContactEmail] = useState('');
  const [emailState, setEmailState] = useState({ loading: false, message: '', ok: false });
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordState, setPasswordState] = useState({ loading: false, message: '' });

  const loadSelf = async (user) => {
    if (!user?.id || user.provider !== 'supabase') {
      setProfile(null);
      return;
    }
    const response = await invokeTeacherAccounts({ action: 'get_self' });
    if (!response.ok || !response.profile) {
      setProfile(null);
      return;
    }
    setProfile(response.profile);
    setContactEmail(response.profile.contactEmail || '');
  };

  useEffect(() => {
    const onHash = () => {
      const next = currentRoute();
      setRoute(next);
      if (next !== 'settings') setOpenEmail(false);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    let active = true;
    initializeAuthSession().then((user) => {
      if (!active) return;
      setCurrentUser(user);
      loadSelf(user).catch(() => null);
    }).catch(() => null);
    const unsubscribe = subscribeToAuthChanges((user) => {
      if (!active) return;
      setCurrentUser(user);
      loadSelf(user).catch(() => null);
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, []);

  const usernameAccount = profile?.authMode === 'username' && Boolean(profile?.username);
  const mustChangePassword = usernameAccount && profile?.mustChangePassword === true;

  const submitPassword = async (event) => {
    event.preventDefault();
    if (passwordState.loading) return;
    if (!passwordForm.current) {
      setPasswordState({ loading: false, message: vi ? 'Nhập mật khẩu tạm hiện tại.' : 'Enter the current temporary password.' });
      return;
    }
    if (passwordForm.next.length < 8) {
      setPasswordState({ loading: false, message: vi ? 'Mật khẩu mới cần ít nhất 8 ký tự.' : 'The new password needs at least 8 characters.' });
      return;
    }
    if (passwordForm.next !== passwordForm.confirm) {
      setPasswordState({ loading: false, message: vi ? 'Phần xác nhận mật khẩu không khớp.' : 'Password confirmation does not match.' });
      return;
    }

    setPasswordState({ loading: true, message: '' });
    const changed = await changeCurrentPassword({ currentPassword: passwordForm.current, newPassword: passwordForm.next });
    if (!changed.ok) {
      setPasswordState({ loading: false, message: changed.message || (vi ? 'Không thể đổi mật khẩu.' : 'Could not change password.') });
      return;
    }
    const marked = await invokeTeacherAccounts({ action: 'password_changed' });
    if (!marked.ok) {
      setPasswordState({ loading: false, message: marked.message || (vi ? 'Đã đổi mật khẩu nhưng chưa cập nhật trạng thái tài khoản.' : 'Password changed, but account status was not updated.') });
      return;
    }
    setProfile((current) => ({ ...current, mustChangePassword: false }));
    setPasswordForm({ current: '', next: '', confirm: '' });
    setPasswordState({ loading: false, message: '' });
  };

  const saveContactEmail = async (event) => {
    event.preventDefault();
    if (emailState.loading) return;
    setEmailState({ loading: true, message: '', ok: false });
    const response = await invokeTeacherAccounts({ action: 'update_contact_email', contactEmail });
    if (!response.ok) {
      setEmailState({ loading: false, ok: false, message: response.message || (vi ? 'Không thể lưu email.' : 'Could not save email.') });
      return;
    }
    setProfile((current) => ({ ...current, contactEmail: response.contactEmail || contactEmail }));
    setContactEmail(response.contactEmail || contactEmail);
    setEmailState({ loading: false, ok: true, message: vi ? 'Đã lưu email liên hệ. Tên đăng nhập không thay đổi.' : 'Contact email saved. Your username is unchanged.' });
  };

  if (!currentUser || !usernameAccount) return null;

  return (
    <>
      {mustChangePassword ? (
        <div className="bes-username-password-gate" role="dialog" aria-modal="true" aria-label={vi ? 'Đổi mật khẩu lần đầu' : 'First password change'}>
          <form onSubmit={submitPassword}>
            <span className="gate-mark" aria-hidden="true">B</span>
            <div className="gate-copy">
              <span>{vi ? 'BẢO MẬT TÀI KHOẢN' : 'ACCOUNT SECURITY'}</span>
              <h2>{vi ? 'Đổi mật khẩu ở lần đăng nhập đầu tiên' : 'Change your password at first sign-in'}</h2>
              <p>{vi ? `Tài khoản ${profile.username} đang dùng mật khẩu tạm do Admin cấp. Hãy đặt mật khẩu riêng trước khi tiếp tục.` : `Account ${profile.username} is using an Admin-issued temporary password. Set your own password to continue.`}</p>
            </div>
            <label><span>{vi ? 'Mật khẩu tạm hiện tại' : 'Current temporary password'}</span><input type="password" autoComplete="current-password" value={passwordForm.current} onChange={(event) => setPasswordForm({ ...passwordForm, current: event.target.value })} /></label>
            <label><span>{vi ? 'Mật khẩu mới' : 'New password'}</span><input type="password" autoComplete="new-password" value={passwordForm.next} onChange={(event) => setPasswordForm({ ...passwordForm, next: event.target.value })} /></label>
            <label><span>{vi ? 'Xác nhận mật khẩu mới' : 'Confirm new password'}</span><input type="password" autoComplete="new-password" value={passwordForm.confirm} onChange={(event) => setPasswordForm({ ...passwordForm, confirm: event.target.value })} /></label>
            {passwordState.message ? <div className="gate-message">{passwordState.message}</div> : null}
            <button type="submit" disabled={passwordState.loading}>{passwordState.loading ? (vi ? 'Đang cập nhật…' : 'Updating…') : (vi ? 'Đổi mật khẩu và tiếp tục' : 'Change password and continue')}</button>
            <small>{vi ? 'Mật khẩu không được hiển thị hoặc gửi cho Admin.' : 'Your new password is never shown or sent to Admin.'}</small>
          </form>
        </div>
      ) : null}

      {route === 'settings' ? (
        <div className={`bes-username-contact ${openEmail ? 'is-open' : ''}`}>
          <button type="button" className="bes-username-contact__launcher" onClick={() => setOpenEmail((value) => !value)} aria-expanded={openEmail}>
            <span aria-hidden="true">@</span>
            <b>{profile.contactEmail ? (vi ? 'Email liên hệ' : 'Contact email') : (vi ? 'Thêm email' : 'Add email')}</b>
            {!profile.contactEmail ? <i /> : null}
          </button>
          {openEmail ? (
            <form className="bes-username-contact__panel" onSubmit={saveContactEmail}>
              <header><div><span>{vi ? 'HỒ SƠ TÀI KHOẢN' : 'ACCOUNT PROFILE'}</span><h3>{vi ? 'Email liên hệ và khôi phục' : 'Contact and recovery email'}</h3></div><button type="button" onClick={() => setOpenEmail(false)}>×</button></header>
              <div className="bes-username-contact__identity"><small>{vi ? 'Tên đăng nhập cố định' : 'Permanent username'}</small><strong>{profile.username}</strong></div>
              <label><span>{vi ? 'Email của thầy/cô' : 'Your email'}</span><input type="email" autoComplete="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="teacher@school.edu.vn" /></label>
              <p>{vi ? 'Email này dùng cho liên hệ và khôi phục về sau. Thầy/cô vẫn đăng nhập bằng tên đăng nhập hiện tại.' : 'This email is used for contact and future recovery. You will still sign in with your current username.'}</p>
              {emailState.message ? <div className={emailState.ok ? 'is-ok' : 'is-error'}>{emailState.message}</div> : null}
              <button type="submit" disabled={emailState.loading}>{emailState.loading ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Lưu email' : 'Save email')}</button>
            </form>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
