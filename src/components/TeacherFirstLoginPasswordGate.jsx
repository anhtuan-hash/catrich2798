import React, { useCallback, useEffect, useRef, useState } from 'react';
import { LockKeyhole, RefreshCcw, ShieldCheck } from 'lucide-react';
import { changeCurrentPassword, logoutUser } from '../utils/auth.js';
import { invokeTeacherAccounts } from '../utils/usernameAccounts.js';
import './TeacherFirstLoginPasswordGate.css';

const INTERNAL_ACCOUNT_SUFFIX = '@accounts.brianenglish.studio';

/**
 * The normal login must expose the FIRST password-change step to username
 * accounts. The server still independently denies file downloads until its
 * auth.users password-hash trigger clears profiles.must_change_password.
 */
export default function TeacherFirstLoginPasswordGate({ currentUser, language = 'vi' }) {
  const userId = String(currentUser?.id || '');
  const eligible = Boolean(userId && currentUser?.provider === 'supabase');
  const vi = language !== 'en';
  const temporaryAccount = String(currentUser?.email || '').toLowerCase().endsWith(INTERNAL_ACCOUNT_SUFFIX);
  const [profile, setProfile] = useState(null);
  const [checking, setChecking] = useState(false);
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [passwordChanged, setPasswordChanged] = useState(false);
  const [message, setMessage] = useState('');
  const firstInput = useRef(null);
  const requestId = useRef(0);

  const loadProfile = useCallback(async () => {
    if (!eligible) return;
    const request = ++requestId.current;
    setChecking(true);
    const response = await invokeTeacherAccounts({ action: 'get_self' });
    if (request !== requestId.current) return;
    if (response.ok && response.profile) {
      setProfile(response.profile);
      setMessage('');
    } else {
      setMessage(response.message || (vi
        ? 'Không thể kiểm tra trạng thái tài khoản. Vui lòng thử lại.'
        : 'Could not check your account status. Please try again.'));
    }
    setChecking(false);
    return response;
  }, [eligible, userId, vi]);

  useEffect(() => {
    setProfile(null);
    setMessage('');
    setForm({ current: '', next: '', confirm: '' });
    setPasswordChanged(false);
    setSaving(false);
    if (eligible) loadProfile();
    return () => { requestId.current += 1; };
  }, [eligible, userId, loadProfile]);

  const mustChange = profile?.mustChangePassword === true;
  const unresolvedTemporaryAccount = !profile && temporaryAccount;
  const show = eligible && (mustChange || unresolvedTemporaryAccount);

  useEffect(() => {
    if (!show) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => firstInput.current?.focus());
    return () => {
      window.cancelAnimationFrame(frame);
      document.body.style.overflow = previous;
    };
  }, [show]);

  const syncAfterPasswordChange = async () => {
    const verification = await invokeTeacherAccounts({ action: 'password_changed' });
    if (!verification.ok) {
      setMessage(verification.message || (vi
        ? 'Mật khẩu đã đổi nhưng trạng thái tài khoản chưa đồng bộ. Hãy thử lại.'
        : 'Password changed, but your account status has not synchronized. Try again.'));
      return false;
    }

    // Never trust local state as a substitute for server-side authorization.
    const refreshed = await loadProfile();
    if (!refreshed?.ok || refreshed.profile?.mustChangePassword === true) {
      setMessage(vi
        ? 'Đã đổi mật khẩu. Hãy chọn “Kiểm tra lại” để làm mới quyền tải tệp.'
        : 'Password changed. Select “Check again” to refresh access.');
      return false;
    }
    setPasswordChanged(false);
    setForm({ current: '', next: '', confirm: '' });
    window.dispatchEvent(new CustomEvent('bes-teacher-password-rotation-complete'));
    return true;
  };

  const submit = async (event) => {
    event.preventDefault();
    if (saving || checking) return;
    if (passwordChanged) {
      setSaving(true);
      try { await syncAfterPasswordChange(); } finally { setSaving(false); }
      return;
    }
    if (!form.current) {
      setMessage(vi ? 'Vui lòng nhập mật khẩu tạm hiện tại.' : 'Enter your current temporary password.');
      return;
    }
    if (form.next.length < 8 || form.next.length > 128) {
      setMessage(vi ? 'Mật khẩu mới phải có 8–128 ký tự.' : 'New password must have 8–128 characters.');
      return;
    }
    if (form.current === form.next) {
      setMessage(vi ? 'Mật khẩu mới phải khác mật khẩu tạm.' : 'Choose a different password.');
      return;
    }
    if (form.next !== form.confirm) {
      setMessage(vi ? 'Xác nhận mật khẩu mới chưa khớp.' : 'New passwords do not match.');
      return;
    }

    setSaving(true);
    setMessage('');
    try {
      const changed = await changeCurrentPassword({
        currentPassword: form.current, newPassword: form.next,
      });
      if (!changed.ok) {
        setMessage(changed.message || (vi ? 'Không thể thay đổi mật khẩu.' : 'Password change failed.'));
        return;
      }
      // An actual auth password-hash update, NOT a client claim, clears the
      // database flag. The server endpoint verifies it before clearing metadata.
      setPasswordChanged(true);
      setForm({ current: '', next: '', confirm: '' });
      await syncAfterPasswordChange();
    } catch (error) {
      setMessage(error?.message || (vi ? 'Không thể hoàn tất đổi mật khẩu.' : 'Could not complete password change.'));
    } finally {
      setSaving(false);
    }
  };

  if (!show) return null;

  return (
    <div className="bes-first-password-layer" role="presentation" data-global-motion-isolate="true">
      <div className="bes-first-password-overlay" aria-hidden="true" />
      <section className="bes-first-password-sheet" role="dialog" aria-modal="true"
        aria-labelledby="bes-first-password-title" aria-describedby="bes-first-password-details">
        <div className="bes-first-password-ribbon" aria-hidden="true">BRIAN ENGLISH · ACCOUNT SECURITY</div>
        <div className="bes-first-password-heading">
          <span className="bes-first-password-icon"><LockKeyhole size={30} /></span>
          <div>
            <span className="bes-first-password-eyebrow">{vi ? 'BẢO MẬT TÀI KHOẢN' : 'ACCOUNT SECURITY'}</span>
            <h2 id="bes-first-password-title">{vi ? 'Đổi mật khẩu để tiếp tục' : 'Change your password to continue'}</h2>
          </div>
        </div>
        <p id="bes-first-password-details">
          {vi
            ? 'Tài khoản đang sử dụng mật khẩu tạm. Để bảo vệ tài liệu của tổ chuyên môn, hãy đặt mật khẩu riêng trước khi xem và tải tệp.'
            : 'Your account uses a temporary password. Set a private password before viewing or downloading department files.'}
        </p>
        {checking && !profile ? (
          <div className="bes-first-password-checking" role="status">
            {vi ? 'Đang kiểm tra trạng thái tài khoản…' : 'Checking account security…'}
          </div>
        ) : !profile ? (
          <div className="bes-first-password-retry">
            <p role="alert">{message || (vi ? 'Chưa tải được thông tin tài khoản.' : 'Account status is unavailable.')}</p>
            <button type="button" onClick={loadProfile}><RefreshCcw size={16}/>{vi ? 'Thử lại' : 'Retry'}</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            {passwordChanged ? (
              <div className="bes-first-password-success" role="status">
                <ShieldCheck size={20}/>
                <span>{vi
                  ? 'Mật khẩu đã thay đổi. Hệ thống đang xác minh lại quyền truy cập.'
                  : 'Password changed. Verifying access with the server.'}</span>
              </div>
            ) : (
              <>
                <label>
                  <span>{vi ? 'Mật khẩu tạm hiện tại' : 'Current temporary password'}</span>
                  <input ref={firstInput} type="password" value={form.current} autoComplete="current-password"
                    onChange={(event) => setForm((value) => ({ ...value, current: event.target.value }))} required />
                </label>
                <label>
                  <span>{vi ? 'Mật khẩu mới (ít nhất 8 ký tự)' : 'New password (8+ characters)'}</span>
                  <input type="password" value={form.next} autoComplete="new-password" minLength={8} maxLength={128}
                    onChange={(event) => setForm((value) => ({ ...value, next: event.target.value }))} required />
                </label>
                <label>
                  <span>{vi ? 'Xác nhận mật khẩu mới' : 'Confirm your new password'}</span>
                  <input type="password" value={form.confirm} autoComplete="new-password" minLength={8} maxLength={128}
                    onChange={(event) => setForm((value) => ({ ...value, confirm: event.target.value }))} required />
                </label>
              </>
            )}
            {message && <p className="bes-first-password-error" role="alert">{message}</p>}
            <button className="bes-first-password-submit" type="submit" disabled={saving || checking}>
              {saving ? (vi ? 'Đang xác minh…' : 'Verifying…')
                : passwordChanged ? (vi ? 'Đồng bộ quyền truy cập' : 'Sync access')
                  : (vi ? 'Đổi mật khẩu và mở tài liệu' : 'Change password and open files')}
            </button>
          </form>
        )}
        <div className="bes-first-password-footer">
          <span><ShieldCheck size={17}/>{vi ? 'Mật khẩu riêng không gửi về Admin.' : 'Your new password is not shared with Admin.'}</span>
          {passwordChanged ? <button type="button" onClick={loadProfile} disabled={checking || saving}>
            {vi ? 'Kiểm tra lại' : 'Check again'}
          </button> : null}
          <button type="button" onClick={async () => { await logoutUser(); window.location.hash = '#/login'; }}>
            {vi ? 'Đăng xuất' : 'Sign out'}
          </button>
        </div>
      </section>
    </div>
  );
}
