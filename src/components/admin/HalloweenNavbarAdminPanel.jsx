import React, { useEffect, useState } from 'react';
import { isAdminRole } from '../../utils/roles.js';
import {
  useHalloweenNavbarTheme,
  loadHalloweenNavbarTheme,
  saveHalloweenNavbarTheme,
} from '../../utils/halloweenNavbarTheme.js';
import './HalloweenNavbarAdminPanel.css';

const TEXT = {
  vi: {
    eyebrow:'GIAO DIỆN MÙA LỄ', title:'Nền Halloween cho thanh điều hướng',
    description:'Áp dụng cho thanh điều hướng BRIAN trên máy tính và điện thoại, kể cả khi người xem chưa đăng nhập. Tắt công tắc để trở về đúng giao diện nguyên bản.',
    enabled:'Đang bật Halloween', disabled:'Giao diện gốc', loading:'Đang lưu…',
    busy:'Đang đồng bộ với Supabase', saved:'Đã cập nhật cho toàn hệ thống.',
    error:'Không thể lưu. Giao diện hiện tại được giữ nguyên.',
    unavailable:'Không đọc được cấu hình từ Supabase. Không thể thay đổi.',
    footer:'Chỉ Admin được chỉnh sửa · Đồng bộ cho tất cả tài khoản',
  },
  en: {
    eyebrow:'SEASONAL APPEARANCE', title:'Halloween navigation background',
    description:'Apply the Halloween theme to BRIAN navigation on desktop and mobile, including guests. Turn it off to restore the exact original navigation design.',
    enabled:'Halloween enabled', disabled:'Original appearance', loading:'Saving…',
    busy:'Syncing from Supabase', saved:'Site-wide appearance updated.',
    error:'Could not save; the previous appearance is unchanged.',
    unavailable:'Could not fetch this setting from Supabase.',
    footer:'Admins only · Synced for every visitor',
  },
};

export default function HalloweenNavbarAdminPanel({ currentUser,language='vi' }) {
  const admin = isAdminRole(currentUser?.role) && currentUser?.provider === 'supabase';
  const t = TEXT[language === 'en' ? 'en' : 'vi'];
  const settings = useHalloweenNavbarTheme();
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState('');
  const [message,setMessage] = useState('');
  const [available,setAvailable] = useState(false);

  useEffect(() => {
    if (!admin) return undefined;
    let active = true;
    loadHalloweenNavbarTheme().then((result) => {
      if (!active) return;
      setAvailable(Boolean(result.ok));
      if (!result.ok) setError(result.message || t.unavailable);
    });
    return () => { active = false; };
  }, [admin]);

  if (!admin) return null;

  const toggle = async () => {
    if (busy || !available) return;
    setBusy(true); setError(''); setMessage('');
    const result = await saveHalloweenNavbarTheme(!settings.enabled);
    setBusy(false);
    if (result.ok) setMessage(t.saved);
    else setError(result.message || t.error);
  };

  return (
    <article id="settings-halloween-navbar" className="settings-google-card halloween-navbar-admin">
      <div className="halloween-navbar-admin__illustration" aria-hidden="true" />
      <div className="halloween-navbar-admin__copy">
        <span className="halloween-navbar-admin__eyebrow">🎃 {t.eyebrow}</span>
        <h2>{t.title}</h2>
        <p>{t.description}</p>
        <small>{t.footer}</small>
      </div>
      <div className="halloween-navbar-admin__action">
        <span>{busy ? t.loading : settings.verified ? settings.enabled ? t.enabled : t.disabled : t.busy}</span>
        <button type="button" role="switch" aria-label={t.title}
          aria-checked={Boolean(settings.enabled)}
          className={'halloween-navbar-admin__switch' + (settings.enabled ? ' is-on' : '')}
          disabled={busy || !available || !settings.verified}
          onClick={toggle}><span /></button>
      </div>
      {error ? <p className="halloween-navbar-admin__feedback is-error" role="alert">{error}</p> : null}
      {message ? <p className="halloween-navbar-admin__feedback is-success" role="status">{message}</p> : null}
    </article>
  );
}
