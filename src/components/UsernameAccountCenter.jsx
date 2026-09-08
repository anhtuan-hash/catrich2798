import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { changeCurrentPassword, initializeAuthSession, subscribeToAuthChanges } from '../utils/auth.js';
import { invokeTeacherAccounts } from '../utils/usernameAccounts.js';
import {
  loadProfileSettings,
  removeProfileAvatar,
  saveProfileSettings,
  uploadProfileAvatar,
} from '../utils/profileSettings.js';
import './UsernameAccountCenter.css';

const EMPTY_DRAFT = Object.freeze({
  fullName: '',
  jobTitle: '',
  school: '',
  phone: '',
  bio: '',
  contactEmail: '',
  avatarUrl: '',
});

function currentRoute() {
  if (typeof window === 'undefined') return '';
  return window.location.hash.replace(/^#\/?/, '').split(/[?&]/)[0].trim();
}

function roleLabel(role, vi) {
  const normalized = String(role || '').toLowerCase();
  if (normalized === 'admin') return vi ? 'Quản trị viên' : 'Administrator';
  if (normalized === 'teacher') return vi ? 'Giáo viên' : 'Teacher';
  return role || (vi ? 'Thành viên' : 'Member');
}

function toDraft(profile = {}, currentUser = {}) {
  const normalEmail = profile.authMode !== 'username' ? (profile.email || currentUser?.email || '') : '';
  return {
    fullName: profile.fullName || currentUser?.name || '',
    jobTitle: profile.jobTitle || '',
    school: profile.school || '',
    phone: profile.phone || '',
    bio: profile.bio || '',
    contactEmail: profile.contactEmail || normalEmail,
    avatarUrl: profile.avatarUrl || '',
  };
}

export default function UsernameAccountCenter({ language = 'vi' }) {
  const vi = language === 'vi';
  const [route, setRoute] = useState(currentRoute);
  const [currentUser, setCurrentUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileHost, setProfileHost] = useState(null);
  const [draft, setDraft] = useState({ ...EMPTY_DRAFT });
  const [savedDraft, setSavedDraft] = useState({ ...EMPTY_DRAFT });
  const [profileState, setProfileState] = useState({ loading: false, saving: false, message: '', ok: false });
  const [avatarState, setAvatarState] = useState({ loading: false, message: '' });
  const [passwordForm, setPasswordForm] = useState({ current: '', next: '', confirm: '' });
  const [passwordState, setPasswordState] = useState({ loading: false, message: '' });
  const avatarInputRef = useRef(null);

  const hydrateProfile = (nextProfile, user) => {
    const normalized = {
      ...(nextProfile || {}),
      id: nextProfile?.id || user?.id || '',
      email: nextProfile?.email || user?.email || '',
      role: nextProfile?.role || user?.role || 'teacher',
    };
    const nextDraft = toDraft(normalized, user);
    setProfile(normalized);
    setDraft(nextDraft);
    setSavedDraft(nextDraft);
    return normalized;
  };

  const loadSelf = async (user) => {
    if (!user?.id || user.provider !== 'supabase') {
      setProfile(null);
      setDraft({ ...EMPTY_DRAFT });
      setSavedDraft({ ...EMPTY_DRAFT });
      return;
    }

    setProfileState((current) => ({ ...current, loading: true, message: '' }));
    const rich = await loadProfileSettings();
    if (rich.ok && rich.profile) {
      hydrateProfile(rich.profile, user);
      setProfileState({ loading: false, saving: false, message: '', ok: true });
      return;
    }

    const legacy = await invokeTeacherAccounts({ action: 'get_self' });
    if (legacy.ok && legacy.profile) {
      hydrateProfile(legacy.profile, user);
      setProfileState({ loading: false, saving: false, message: '', ok: true });
      return;
    }

    hydrateProfile({
      id: user.id,
      email: user.email || '',
      fullName: user.name || '',
      role: user.role || 'teacher',
      authMode: 'email',
    }, user);
    setProfileState({
      loading: false,
      saving: false,
      ok: false,
      message: rich.message || legacy.message || (vi ? 'Chưa tải được hồ sơ từ máy chủ.' : 'Could not load the server profile.'),
    });
  };

  useEffect(() => {
    const onHash = () => setRoute(currentRoute());
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

  useEffect(() => {
    if (route !== 'settings' || currentUser?.provider !== 'supabase') {
      setProfileHost(null);
      return undefined;
    }

    let host = null;
    let observer = null;
    const attach = () => {
      host = document.querySelector('.settings-google-profile-fallback');
      if (!host) return false;
      host.classList.add('has-account-center');
      setProfileHost(host);
      observer?.disconnect();
      return true;
    };

    if (!attach()) {
      observer = new MutationObserver(attach);
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      host?.classList.remove('has-account-center');
      setProfileHost(null);
    };
  }, [route, currentUser?.id, currentUser?.provider]);

  const usernameAccount = profile?.authMode === 'username' && Boolean(profile?.username);
  const mustChangePassword = usernameAccount && profile?.mustChangePassword === true;
  const dirty = useMemo(() => JSON.stringify(draft) !== JSON.stringify(savedDraft), [draft, savedDraft]);
  const identity = draft.fullName || profile?.fullName || currentUser?.name || profile?.username || currentUser?.email || 'B';
  const initials = identity.trim().split(/\s+/).slice(-2).map((part) => part.charAt(0)).join('').toUpperCase() || 'B';
  const identityEmail = profile?.contactEmail || (profile?.authMode === 'username' ? profile?.username : profile?.email || currentUser?.email) || '';

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

  const saveProfile = async (event) => {
    event?.preventDefault?.();
    if (profileState.saving || !currentUser?.id) return;
    if (draft.bio.length > 320) return;
    setProfileState({ loading: false, saving: true, message: '', ok: false });
    const result = await saveProfileSettings(draft);
    if (!result.ok || !result.profile) {
      setProfileState({ loading: false, saving: false, ok: false, message: result.message || (vi ? 'Không thể lưu hồ sơ.' : 'Could not save profile.') });
      return;
    }
    const next = hydrateProfile(result.profile, currentUser);
    setProfileState({ loading: false, saving: false, ok: true, message: vi ? 'Hồ sơ đã được cập nhật.' : 'Profile updated.' });
    window.dispatchEvent(new CustomEvent('bes-profile-updated', { detail: next }));
  };

  const undoProfile = () => {
    setDraft({ ...savedDraft });
    setProfileState((current) => ({ ...current, message: '' }));
    setAvatarState({ loading: false, message: '' });
  };

  const onAvatarSelected = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !currentUser?.id || avatarState.loading) return;
    setAvatarState({ loading: true, message: '' });
    const uploaded = await uploadProfileAvatar(file, currentUser.id);
    if (!uploaded.ok) {
      setAvatarState({ loading: false, message: uploaded.message || (vi ? 'Không thể tải ảnh lên.' : 'Could not upload image.') });
      return;
    }
    const nextDraft = { ...draft, avatarUrl: uploaded.avatarUrl };
    const saved = await saveProfileSettings(nextDraft);
    if (!saved.ok || !saved.profile) {
      setAvatarState({ loading: false, message: saved.message || (vi ? 'Ảnh đã tải lên nhưng chưa lưu vào hồ sơ.' : 'Image uploaded but profile was not updated.') });
      return;
    }
    hydrateProfile(saved.profile, currentUser);
    setAvatarState({ loading: false, message: '' });
    setProfileState({ loading: false, saving: false, ok: true, message: vi ? 'Đã cập nhật ảnh hồ sơ.' : 'Profile image updated.' });
  };

  const removeAvatar = async () => {
    if (!currentUser?.id || avatarState.loading || !draft.avatarUrl) return;
    setAvatarState({ loading: true, message: '' });
    const removed = await removeProfileAvatar(currentUser.id);
    if (!removed.ok) {
      setAvatarState({ loading: false, message: removed.message || (vi ? 'Không thể xoá ảnh.' : 'Could not remove image.') });
      return;
    }
    const saved = await saveProfileSettings({ ...draft, avatarUrl: '' });
    if (!saved.ok || !saved.profile) {
      setAvatarState({ loading: false, message: saved.message || (vi ? 'Đã xoá tệp nhưng chưa cập nhật hồ sơ.' : 'Image removed but profile was not updated.') });
      return;
    }
    hydrateProfile(saved.profile, currentUser);
    setAvatarState({ loading: false, message: '' });
    setProfileState({ loading: false, saving: false, ok: true, message: vi ? 'Đã xoá ảnh hồ sơ.' : 'Profile image removed.' });
  };

  if (!currentUser) return null;

  const profileEditor = profileHost ? (
    <form className="bes-settings-profile" onSubmit={saveProfile}>
      <div className="bes-settings-profile__identity">
        <div className="bes-settings-profile__avatar" aria-label={vi ? 'Ảnh hồ sơ' : 'Profile image'}>
          {draft.avatarUrl ? <img src={draft.avatarUrl} alt="" /> : <span>{initials}</span>}
        </div>
        <div className="bes-settings-profile__who">
          <small>{vi ? 'HỒ SƠ CÁ NHÂN' : 'PERSONAL PROFILE'}</small>
          <strong>{identity}</strong>
          <p>{roleLabel(profile?.role, vi)}{draft.school ? ` · ${draft.school}` : ''}</p>
          <div className="bes-settings-profile__badges">
            <span>{roleLabel(profile?.role, vi)}</span>
            {identityEmail ? <span>{identityEmail}</span> : null}
          </div>
        </div>
        <div className="bes-settings-profile__avatar-actions">
          <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/webp" onChange={onAvatarSelected} hidden />
          <button type="button" className="is-upload" onClick={() => avatarInputRef.current?.click()} disabled={avatarState.loading}>{avatarState.loading ? (vi ? 'Đang xử lý…' : 'Working…') : (vi ? 'Tải ảnh lên' : 'Upload photo')}</button>
          <button type="button" className="is-remove" onClick={removeAvatar} disabled={avatarState.loading || !draft.avatarUrl}>{vi ? 'Xóa ảnh' : 'Remove'}</button>
          <small>PNG, JPG {vi ? 'hoặc' : 'or'} WebP · {vi ? 'tối đa' : 'max'} 5 MB</small>
        </div>
      </div>

      <div className="bes-settings-profile__grid">
        <label><span>{vi ? 'Tên hiển thị' : 'Display name'}</span><input value={draft.fullName} maxLength={120} onChange={(event) => setDraft((current) => ({ ...current, fullName: event.target.value }))} placeholder={vi ? 'Họ và tên' : 'Full name'} /></label>
        <label><span>{vi ? 'Chức danh / vị trí' : 'Job title / position'}</span><input value={draft.jobTitle} maxLength={120} onChange={(event) => setDraft((current) => ({ ...current, jobTitle: event.target.value }))} placeholder={vi ? 'Ví dụ: Giáo viên Tiếng Anh' : 'Example: English teacher'} /></label>
        <label><span>{vi ? 'Trường / đơn vị' : 'School / organization'}</span><input value={draft.school} maxLength={160} onChange={(event) => setDraft((current) => ({ ...current, school: event.target.value }))} placeholder={vi ? 'Trường / đơn vị công tác' : 'School / organization'} /></label>
        <label><span>{vi ? 'Số điện thoại' : 'Phone number'}</span><input type="tel" value={draft.phone} maxLength={40} onChange={(event) => setDraft((current) => ({ ...current, phone: event.target.value }))} placeholder={vi ? 'Chỉ dùng cho thông tin hồ sơ' : 'Profile contact number'} /></label>
        <label><span>{vi ? 'Email liên hệ' : 'Contact email'}</span><input type="email" value={draft.contactEmail} maxLength={254} onChange={(event) => setDraft((current) => ({ ...current, contactEmail: event.target.value }))} placeholder="teacher@school.edu.vn" /></label>
        <label className="bes-settings-profile__bio"><span>{vi ? 'Giới thiệu ngắn' : 'Short bio'}</span><textarea value={draft.bio} maxLength={320} rows={3} onChange={(event) => setDraft((current) => ({ ...current, bio: event.target.value }))} placeholder={vi ? 'Chuyên môn, lớp đang phụ trách hoặc thông tin bạn muốn hiển thị…' : 'Teaching focus, classes or information you want to show…'} /><small>{draft.bio.length}/320</small></label>
      </div>

      <footer className="bes-settings-profile__footer">
        <div>
          {profileState.loading ? <span>{vi ? 'Đang tải hồ sơ…' : 'Loading profile…'}</span> : null}
          {profileState.message ? <span className={profileState.ok ? 'is-ok' : 'is-error'}>{profileState.message}</span> : null}
          {avatarState.message ? <span className="is-error">{avatarState.message}</span> : null}
        </div>
        <div className="bes-settings-profile__actions">
          <button type="button" className="is-undo" onClick={undoProfile} disabled={!dirty || profileState.saving}>{vi ? 'Hoàn tác' : 'Undo'}</button>
          <button type="submit" className="is-save" disabled={!dirty || profileState.saving}>{profileState.saving ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Lưu thay đổi' : 'Save changes')}</button>
        </div>
      </footer>
    </form>
  ) : null;

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

      {route === 'settings' && profileHost && profileEditor ? createPortal(profileEditor, profileHost) : null}
    </>
  );
}
