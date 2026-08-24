import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { isAdminRole } from '../utils/roles.js';
import {
  SITE_FONT_OPTIONS,
  getSiteFontOption,
  loadSiteFontSetting,
  readSiteFontLocal,
  saveSiteFontSetting,
  subscribeSiteFontSetting,
} from '../utils/siteFontSettings.js';
import './GlobalFontSettingsBridge.css';

const HOST_ID = 'settings-global-font-host';
const NAV_BUTTON_ID = 'settings-global-font-nav-button';

function currentRoute() {
  if (typeof window === 'undefined') return 'home';
  return window.location.hash.replace(/^#\/?/, '').split(/[?&]/)[0].trim() || 'home';
}

function scrollToHost() {
  document.getElementById(HOST_ID)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

export default function GlobalFontSettingsBridge({ currentUser, language = 'vi' }) {
  const [route, setRoute] = useState(currentRoute);
  const [host, setHost] = useState(null);
  const [navHost, setNavHost] = useState(null);
  const [fontId, setFontId] = useState(readSiteFontLocal);
  const [savedFontId, setSavedFontId] = useState(readSiteFontLocal);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const selected = useMemo(() => getSiteFontOption(fontId), [fontId]);
  const vi = language === 'vi';
  const isAdmin = isAdminRole(currentUser?.role);

  useEffect(() => {
    const update = () => setRoute(currentRoute());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  useEffect(() => {
    let active = true;
    loadSiteFontSetting(currentUser).then((option) => {
      if (!active || !option) return;
      setFontId(option.id);
      setSavedFontId(option.id);
    }).catch(() => {});
    const unsubscribe = subscribeSiteFontSetting(currentUser, (option) => {
      if (!active || !option) return;
      setFontId(option.id);
      setSavedFontId(option.id);
    });
    return () => {
      active = false;
      unsubscribe?.();
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.role]);

  useEffect(() => {
    let timer = 0;
    let attempts = 0;
    let createdHost = null;
    let cancelled = false;

    if (route !== 'settings' || !isAdmin) {
      setHost(null);
      setNavHost(null);
      return undefined;
    }

    const mount = () => {
      if (cancelled) return;
      const settingsMain = document.querySelector('.settings-google-main');
      const experienceNav = document.getElementById('settings-appearance-merge-nav');
      if (!settingsMain || !experienceNav) {
        attempts += 1;
        if (attempts < 36) timer = window.setTimeout(mount, 80);
        return;
      }

      let nextHost = document.getElementById(HOST_ID);
      if (!nextHost) {
        nextHost = document.createElement('section');
        nextHost.id = HOST_ID;
        nextHost.className = 'settings-global-font-host';
        nextHost.setAttribute('aria-label', vi ? 'Font chữ toàn hệ thống' : 'System-wide font');
        const adminHost = document.getElementById('settings-admin-merge-host');
        const footer = settingsMain.querySelector('.settings-google-footer');
        settingsMain.insertBefore(nextHost, adminHost || footer || null);
        createdHost = nextHost;
      }
      setHost(nextHost);
      setNavHost(experienceNav);

      if (window.location.hash.includes('section=font')) {
        window.requestAnimationFrame(() => nextHost.scrollIntoView({ behavior: 'auto', block: 'start' }));
      }
    };

    mount();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
      setHost(null);
      setNavHost(null);
      createdHost?.remove();
    };
  }, [route, isAdmin, vi]);

  const save = async () => {
    if (!isAdmin || loading) return;
    setLoading(true);
    setMessage('');
    try {
      const option = await saveSiteFontSetting(currentUser, fontId);
      setSavedFontId(option.id);
      setFontId(option.id);
      setMessage(vi
        ? `Đã áp dụng “${option.labelVi}” cho toàn bộ website và mọi tài khoản.`
        : `“${option.label}” is now active across the entire website for every account.`);
    } catch (error) {
      setMessage(error?.message || (vi ? 'Không thể lưu font dùng chung.' : 'Could not save the shared font.'));
    } finally {
      setLoading(false);
    }
  };

  if (route !== 'settings' || !isAdmin || !host || !navHost) return null;

  return (
    <>
      {createPortal(
        <button
          id={NAV_BUTTON_ID}
          type="button"
          className="settings-admin-merge-nav-button settings-global-font-nav-button"
          onClick={scrollToHost}
        >
          <span aria-hidden="true">Aa</span>
          <div><strong>{vi ? 'Font chữ toàn hệ thống' : 'System-wide font'}</strong></div>
        </button>,
        navHost,
      )}

      {createPortal(
        <section className="settings-global-font-card" aria-labelledby="settings-global-font-title">
          <div className="settings-global-font-copy">
            <div className="settings-global-font-title-row">
              <span className="settings-global-font-icon" aria-hidden="true">Aa</span>
              <div>
                <span className="settings-global-font-kicker">{vi ? 'KIỂU CHỮ TOÀN HỆ THỐNG' : 'SYSTEM TYPOGRAPHY'}</span>
                <h2 id="settings-global-font-title">{vi ? 'Font chữ mặc định' : 'Default website font'}</h2>
              </div>
            </div>
            <p>{vi
              ? 'Admin chọn một lần; lựa chọn được đồng bộ làm font mặc định cho toàn bộ Brian English và mọi tài khoản.'
              : 'Choose once; the selection becomes the default font across Brian English for every account.'}</p>

            <label className="settings-global-font-field">
              <span>{vi ? 'Chọn font chữ' : 'Choose a font'}</span>
              <select value={fontId} onChange={(event) => { setFontId(event.target.value); setMessage(''); }}>
                {SITE_FONT_OPTIONS.map((option) => (
                  <option key={option.id} value={option.id}>{vi ? option.labelVi : option.label}</option>
                ))}
              </select>
            </label>

            <div className="settings-global-font-note">
              <strong>{vi ? selected.labelVi : selected.label}</strong>
              <span>{vi ? selected.noteVi : selected.note}</span>
            </div>

            <div className="settings-global-font-actions">
              <button type="button" disabled={loading || fontId === savedFontId} onClick={save}>
                {loading ? (vi ? 'Đang đồng bộ…' : 'Syncing…') : (vi ? 'Áp dụng cho toàn hệ thống' : 'Apply system-wide')}
              </button>
              <small>{fontId === savedFontId
                ? (vi ? 'Đây là font đang dùng trên toàn hệ thống.' : 'This is the current system-wide font.')
                : (vi ? 'Bản xem trước ở bên phải; bấm Áp dụng để công bố.' : 'Preview on the right; apply to publish the change.')}</small>
            </div>
            {message ? <div className="settings-global-font-message" role="status">{message}</div> : null}
          </div>

          <div className="settings-global-font-preview" style={{ fontFamily: selected.family }}>
            <span>{vi ? 'XEM TRƯỚC' : 'PREVIEW'}</span>
            <strong>Brian English Studio</strong>
            <p>Không gian dạy học thông minh & sáng tạo.</p>
            <div><b>Aa</b><i>Ă Â Ê Ô Ơ Ư Đ</i><em>0123456789</em></div>
          </div>
        </section>,
        host,
      )}
    </>
  );
}
