import React, { useEffect, useState } from 'react';
import { isAdminRole } from '../../utils/roles.js';
import {
  useHalloweenFooterTheme, loadHalloweenFooterTheme, saveHalloweenFooterTheme,
} from '../../utils/halloweenFooterTheme.js';
// Reuse the approved seasonal Admin switch design, not global navbar styles.
import './HalloweenNavbarAdminPanel.css';
import './HalloweenFooterAdminPanel.css';

const COPY = {
  vi: {
    eyebrow:'GIAO DIỆN MÙA LỄ',title:'Nền Halloween cho footer',
    description:'Tùy chỉnh phần chân trang BRIAN với trăng, dơi, bí ngô và tông màu Halloween. Giữ nguyên logo, thông tin, học vấn, chứng chỉ và nút Portfolio. Tắt để trở về đúng footer gốc.',
    on:'Đang bật Halloween',off:'Giao diện gốc',saving:'Đang lưu…',
    syncing:'Đang đồng bộ Supabase',
    saved:'Đã cập nhật footer cho toàn hệ thống.',
    failed:'Không thể lưu cài đặt. Footer hiện tại vẫn được giữ nguyên.',
    footer:'Chỉ Admin được chỉnh sửa · Hiển thị cho cả khách và mọi tài khoản',
  },
  en: {
    eyebrow:'SEASONAL APPEARANCE',title:'Halloween footer background',
    description:'Give the BRIAN footer an atmospheric Halloween sky with moon, bats and pumpkins. Keep all school logos, credentials and Portfolio intact. Turn off to return to the exact original footer.',
    on:'Halloween enabled',off:'Original footer',saving:'Saving…',
    syncing:'Syncing with Supabase',
    saved:'The footer appearance is updated for everyone.',
    failed:'Could not save; the current footer remains unchanged.',
    footer:'Admins only · Visible to guests and all accounts',
  },
};
export default function HalloweenFooterAdminPanel({currentUser,language='vi'}) {
  const admin=isAdminRole(currentUser?.role)&&currentUser?.provider==='supabase';
  const t=COPY[language==='en'?'en':'vi'];
  const settings=useHalloweenFooterTheme();
  const [available,setAvailable]=useState(false);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');

  useEffect(()=>{
    if(!admin)return undefined;
    let alive=true;
    loadHalloweenFooterTheme().then(result=>{
      if(!alive)return;
      setAvailable(Boolean(result.ok));
      setError(result.ok?'':result.message||t.failed);
    });
    return()=>{alive=false;};
  },[admin]);

  if(!admin)return null;
  const toggle=async()=>{
    if(busy||!available||!settings.verified)return;
    setBusy(true);setError('');setMessage('');
    const result=await saveHalloweenFooterTheme(!settings.enabled);
    setBusy(false);
    if(result.ok)setMessage(t.saved);
    else setError(result.message||t.failed);
  };
  return (
    <article id="settings-halloween-footer" className="settings-google-card halloween-navbar-admin halloween-footer-admin">
      <div className="halloween-navbar-admin__illustration" aria-hidden="true" />
      <div className="halloween-navbar-admin__copy">
        <span className="halloween-navbar-admin__eyebrow">🎃 {t.eyebrow}</span>
        <h2>{t.title}</h2>
        <p>{t.description}</p>
        <small>{t.footer}</small>
      </div>
      <div className="halloween-navbar-admin__action">
        <span>{busy?t.saving:settings.verified?settings.enabled?t.on:t.off:t.syncing}</span>
        <button type="button" role="switch" aria-label={t.title}
          aria-checked={Boolean(settings.enabled)}
          className={'halloween-navbar-admin__switch'+(settings.enabled?' is-on':'')}
          disabled={busy||!available||!settings.verified}
          onClick={toggle}><span /></button>
      </div>
      {error?<p className="halloween-navbar-admin__feedback is-error" role="alert">{error}</p>:null}
      {message?<p className="halloween-navbar-admin__feedback is-success" role="status">{message}</p>:null}
    </article>
  );
}
