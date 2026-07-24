import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  USER_PROFILE_EVENT,
  loadUserProfile,
  mergeUserProfile,
  removeCurrentUserAvatar,
  saveCurrentUserProfile,
  uploadCurrentUserAvatar,
} from '../utils/userProfile.js';
import './GlobalUserProfileSettingsBridge.css';

const SLOT_CLASS = 'bes-profile-settings-slot';
const OWNER_ATTR = 'data-bes-profile-settings-owner';
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

function initials(value) {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'U';
  return (parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}` : parts[0].slice(0, 2)).toUpperCase();
}

function profileFromUser(user) {
  return {
    name: user?.name || user?.full_name || user?.email?.split('@')[0] || '',
    jobTitle: user?.jobTitle || '',
    school: user?.school || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
    avatarUrl: user?.avatarUrl || '',
  };
}

function profileSignature(user) {
  return JSON.stringify([
    user?.name || '', user?.school || '', user?.jobTitle || '', user?.phone || '',
    user?.bio || '', user?.avatarUrl || '', user?.profileUpdatedAt || '',
  ]);
}

function escapeCssUrl(value) {
  return String(value || '').replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function applyAvatarToDocument(avatarUrl) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  const clean = String(avatarUrl || '').trim();
  if (clean) {
    root.dataset.besProfileAvatar = 'true';
    root.style.setProperty('--bes-profile-avatar-image', `url("${escapeCssUrl(clean)}")`);
  } else {
    delete root.dataset.besProfileAvatar;
    root.style.removeProperty('--bes-profile-avatar-image');
  }
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Không thể đọc ảnh đã chọn.'));
    image.src = url;
  });
}

function canvasBlob(canvas, type, quality) {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

async function prepareAvatar(file) {
  if (!file?.type?.startsWith('image/')) throw new Error('Vui lòng chọn tệp ảnh PNG, JPG hoặc WebP.');
  if (file.size > MAX_AVATAR_BYTES) throw new Error('Ảnh đại diện phải nhỏ hơn 5 MB.');
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const side = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
    const sourceX = Math.max(0, ((image.naturalWidth || image.width) - side) / 2);
    const sourceY = Math.max(0, ((image.naturalHeight || image.height) - side) / 2);
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const context = canvas.getContext('2d', { alpha: false });
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, sourceX, sourceY, side, side, 0, 0, 512, 512);
    let blob = await canvasBlob(canvas, 'image/webp', 0.82);
    if (!blob) blob = await canvasBlob(canvas, 'image/jpeg', 0.86);
    if (!blob) throw new Error('Không thể tối ưu ảnh đại diện.');
    const dataUrl = canvas.toDataURL(blob.type || 'image/jpeg', 0.84);
    return { blob, dataUrl };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function Field({ label, hint, children, wide = false }) {
  return (
    <label className={`bes-profile-field ${wide ? 'is-wide' : ''}`}>
      <span>{label}</span>
      {children}
      {hint ? <small>{hint}</small> : null}
    </label>
  );
}

export default function GlobalUserProfileSettingsBridge({
  route,
  currentUser,
  setCurrentUser,
  language = 'vi',
  setGlobalLoading,
}) {
  const vi = language === 'vi';
  const [portalTarget, setPortalTarget] = useState(null);
  const [draft, setDraft] = useState(() => profileFromUser(currentUser));
  const [dirty, setDirty] = useState(false);
  const [pendingAvatar, setPendingAvatar] = useState(null);
  const [avatarRemoved, setAvatarRemoved] = useState(false);
  const [status, setStatus] = useState({ loading: false, ok: false, message: '', storage: '' });
  const inputRef = useRef(null);
  const hydratedUserRef = useRef('');

  const displayAvatar = pendingAvatar?.dataUrl ?? (avatarRemoved ? '' : draft.avatarUrl);
  const roleLabel = useMemo(() => {
    const role = String(currentUser?.role || 'teacher').toLowerCase();
    if (role === 'admin') return vi ? 'Quản trị viên' : 'Administrator';
    if (['ttcm', 'department_head', 'department_leader', 'leader'].includes(role)) return vi ? 'Tổ trưởng chuyên môn' : 'Department leader';
    return vi ? 'Giáo viên' : 'Teacher';
  }, [currentUser?.role, vi]);

  useEffect(() => {
    if (!currentUser) {
      applyAvatarToDocument('');
      return undefined;
    }
    applyAvatarToDocument(currentUser.avatarUrl);
    const userKey = String(currentUser.id || currentUser.email || '');
    if (userKey && hydratedUserRef.current !== userKey) {
      hydratedUserRef.current = userKey;
      loadUserProfile(currentUser).then((hydrated) => {
        if (hydrated && profileSignature(hydrated) !== profileSignature(currentUser)) {
          setCurrentUser?.(hydrated);
          applyAvatarToDocument(hydrated.avatarUrl);
        }
      }).catch(() => {});
    }

    const onProfile = (event) => {
      const next = event.detail?.user || mergeUserProfile(currentUser, event.detail?.profile);
      if (!next) return;
      setCurrentUser?.(next);
      applyAvatarToDocument(next.avatarUrl);
    };
    window.addEventListener(USER_PROFILE_EVENT, onProfile);
    return () => window.removeEventListener(USER_PROFILE_EVENT, onProfile);
  }, [currentUser?.id, currentUser?.email, currentUser?.avatarUrl, setCurrentUser]);

  useEffect(() => {
    if (!dirty) setDraft(profileFromUser(currentUser));
    applyAvatarToDocument(currentUser?.avatarUrl);
  }, [currentUser?.name, currentUser?.school, currentUser?.jobTitle, currentUser?.phone, currentUser?.bio, currentUser?.avatarUrl, currentUser?.profileUpdatedAt, dirty]);

  useEffect(() => {
    if (route !== 'settings' || !currentUser || typeof document === 'undefined') {
      setPortalTarget(null);
      return undefined;
    }
    let observer = null;
    let card = null;
    let slot = null;

    const mount = () => {
      card = document.querySelector('.settings-v65-account-card');
      if (!card) return false;
      slot = card.querySelector(`.${SLOT_CLASS}`);
      if (!slot) {
        slot = document.createElement('div');
        slot.className = SLOT_CLASS;
        slot.setAttribute(OWNER_ATTR, 'true');
        const passwordForm = card.querySelector('.settings-v65-password-form');
        if (passwordForm) card.insertBefore(slot, passwordForm);
        else card.appendChild(slot);
      }
      card.classList.add('has-bes-profile-editor');
      setPortalTarget(slot);
      return true;
    };

    if (!mount()) {
      observer = new MutationObserver(() => {
        if (mount()) observer?.disconnect();
      });
      observer.observe(document.body, { childList: true, subtree: true });
    }

    return () => {
      observer?.disconnect();
      card?.classList.remove('has-bes-profile-editor');
      if (slot?.getAttribute(OWNER_ATTR) === 'true') slot.remove();
      setPortalTarget(null);
    };
  }, [route, currentUser?.id]);

  const update = (field, value) => {
    setDraft((current) => ({ ...current, [field]: value }));
    setDirty(true);
    setStatus({ loading: false, ok: false, message: '', storage: '' });
  };

  const chooseAvatar = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      setStatus({ loading: true, ok: false, message: vi ? 'Đang tối ưu ảnh…' : 'Optimizing image…', storage: '' });
      const prepared = await prepareAvatar(file);
      setPendingAvatar(prepared);
      setAvatarRemoved(false);
      setDirty(true);
      setStatus({ loading: false, ok: true, message: vi ? 'Ảnh đã sẵn sàng. Bấm Lưu thay đổi.' : 'Image ready. Save your changes.', storage: '' });
    } catch (error) {
      setStatus({ loading: false, ok: false, message: error.message || (vi ? 'Không thể xử lý ảnh.' : 'Could not process image.'), storage: '' });
    }
  };

  const resetDraft = () => {
    setDraft(profileFromUser(currentUser));
    setPendingAvatar(null);
    setAvatarRemoved(false);
    setDirty(false);
    setStatus({ loading: false, ok: false, message: '', storage: '' });
  };

  const save = async (event) => {
    event.preventDefault();
    if (!draft.name.trim()) {
      setStatus({ loading: false, ok: false, message: vi ? 'Tên hiển thị không được để trống.' : 'Display name is required.', storage: '' });
      return;
    }
    setStatus({ loading: true, ok: false, message: vi ? 'Đang lưu hồ sơ…' : 'Saving profile…', storage: '' });
    setGlobalLoading?.(true, vi ? 'Đang cập nhật hồ sơ...' : 'Updating profile...');
    try {
      let avatarUrl = avatarRemoved ? '' : draft.avatarUrl;
      let avatarWarning = '';
      if (pendingAvatar?.blob) {
        const uploaded = await uploadCurrentUserAvatar(currentUser, pendingAvatar.blob);
        if (uploaded.ok) avatarUrl = uploaded.url;
        else {
          avatarUrl = pendingAvatar.dataUrl;
          avatarWarning = vi ? 'Ảnh đang được lưu trên trình duyệt này.' : 'The avatar is stored on this browser.';
        }
      } else if (avatarRemoved) {
        await removeCurrentUserAvatar(currentUser).catch(() => {});
      }

      const result = await saveCurrentUserProfile(currentUser, { ...draft, avatarUrl });
      if (!result.ok) throw new Error(result.message || 'Could not save profile.');
      setCurrentUser?.(result.user);
      applyAvatarToDocument(result.user?.avatarUrl);
      setDraft(profileFromUser(result.user));
      setPendingAvatar(null);
      setAvatarRemoved(false);
      setDirty(false);
      const cloud = result.storage === 'cloud';
      const storageMessage = cloud
        ? (vi ? 'Đã đồng bộ với tài khoản.' : 'Synced with your account.')
        : (vi ? 'Đã lưu cho tài khoản trên trình duyệt này.' : 'Saved for this account on this browser.');
      setStatus({
        loading: false,
        ok: true,
        storage: result.storage,
        message: `${vi ? 'Đã cập nhật hồ sơ.' : 'Profile updated.'} ${storageMessage}${avatarWarning ? ` ${avatarWarning}` : ''}`,
      });
    } catch (error) {
      setStatus({ loading: false, ok: false, message: error.message || (vi ? 'Không thể lưu hồ sơ.' : 'Could not save profile.'), storage: '' });
    } finally {
      setGlobalLoading?.(false);
    }
  };

  if (!portalTarget) return null;

  const editor = (
    <form className="bes-profile-editor" onSubmit={save}>
      <div className="bes-profile-editor__intro">
        <div className={`bes-profile-editor__avatar ${displayAvatar ? 'has-image' : ''}`} style={displayAvatar ? { backgroundImage: `url("${escapeCssUrl(displayAvatar)}")` } : undefined}>
          {!displayAvatar ? <span>{initials(draft.name || currentUser?.email)}</span> : null}
          <button type="button" onClick={() => inputRef.current?.click()} aria-label={vi ? 'Thay ảnh đại diện' : 'Change avatar'}>✎</button>
        </div>
        <div className="bes-profile-editor__identity">
          <span>{vi ? 'HỒ SƠ CÁ NHÂN' : 'PERSONAL PROFILE'}</span>
          <h3>{draft.name || currentUser?.email}</h3>
          <p>{draft.jobTitle || roleLabel}{draft.school ? ` · ${draft.school}` : ''}</p>
          <div className="bes-profile-editor__chips"><em>{roleLabel}</em><em>{currentUser?.email || '—'}</em></div>
        </div>
        <div className="bes-profile-editor__avatar-actions">
          <input ref={inputRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={chooseAvatar} />
          <button type="button" onClick={() => inputRef.current?.click()}>{vi ? 'Tải ảnh lên' : 'Upload photo'}</button>
          {(displayAvatar || currentUser?.avatarUrl) ? <button type="button" className="is-text" onClick={() => { setPendingAvatar(null); setAvatarRemoved(true); setDirty(true); }}>{vi ? 'Xóa ảnh' : 'Remove'}</button> : null}
          <small>{vi ? 'PNG, JPG hoặc WebP · tối đa 5 MB' : 'PNG, JPG or WebP · up to 5 MB'}</small>
        </div>
      </div>

      <div className="bes-profile-editor__fields">
        <Field label={vi ? 'Tên hiển thị' : 'Display name'}>
          <input value={draft.name} maxLength={120} autoComplete="name" onChange={(event) => update('name', event.target.value)} />
        </Field>
        <Field label={vi ? 'Chức danh / vị trí' : 'Job title'}>
          <input value={draft.jobTitle} maxLength={120} placeholder={vi ? 'Ví dụ: Giáo viên Tiếng Anh' : 'Example: English teacher'} onChange={(event) => update('jobTitle', event.target.value)} />
        </Field>
        <Field label={vi ? 'Trường / đơn vị' : 'School / organization'}>
          <input value={draft.school} maxLength={160} autoComplete="organization" onChange={(event) => update('school', event.target.value)} />
        </Field>
        <Field label={vi ? 'Số điện thoại' : 'Phone number'} hint={vi ? 'Chỉ dùng cho thông tin hồ sơ của bạn.' : 'Used only in your account profile.'}>
          <input value={draft.phone} maxLength={40} inputMode="tel" autoComplete="tel" onChange={(event) => update('phone', event.target.value)} />
        </Field>
        <Field wide label={vi ? 'Giới thiệu ngắn' : 'Short bio'} hint={`${draft.bio.length}/320`}>
          <textarea value={draft.bio} maxLength={320} rows={3} placeholder={vi ? 'Chuyên môn, lớp đang phụ trách hoặc thông tin bạn muốn hiển thị…' : 'Your expertise, classes, or a short introduction…'} onChange={(event) => update('bio', event.target.value)} />
        </Field>
      </div>

      <div className="bes-profile-editor__footer">
        <div className={`bes-profile-editor__status ${status.ok ? 'is-ok' : status.message ? 'is-error' : ''}`} role="status" aria-live="polite">
          {status.message || (dirty ? (vi ? 'Có thay đổi chưa lưu.' : 'You have unsaved changes.') : (vi ? 'Hồ sơ đã được cập nhật.' : 'Profile is up to date.'))}
        </div>
        <div>
          <button type="button" className="is-secondary" disabled={!dirty || status.loading} onClick={resetDraft}>{vi ? 'Hoàn tác' : 'Reset'}</button>
          <button type="submit" className="is-primary" disabled={!dirty || status.loading}>{status.loading ? (vi ? 'Đang lưu…' : 'Saving…') : (vi ? 'Lưu thay đổi' : 'Save changes')}</button>
        </div>
      </div>
    </form>
  );

  return createPortal(editor, portalTarget);
}
