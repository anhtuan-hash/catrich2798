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

function currentRoute() {
  return window.location.hash.replace(/^#\//, '').split('?')[0] || 'home';
}

export default function GlobalFontSettingsBridge({ currentUser, language = 'vi' }) {
  const [route, setRoute] = useState(currentRoute);
  const [host, setHost] = useState(null);
  const [fontId, setFontId] = useState(readSiteFontLocal);
  const [savedFontId, setSavedFontId] = useState(readSiteFontLocal);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const selected = useMemo(() => getSiteFontOption(fontId), [fontId]);
  const vi = language === 'vi';

  useEffect(() => {
    const update = () => setRoute(currentRoute());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  useEffect(() => {
    let active = true;
    loadSiteFontSetting(currentUser).then((option) => {
      if (!active) return;
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
    if (route !== 'admin' || !isAdminRole(currentUser?.role)) {
      setHost(null);
      return undefined;
    }
    const findHost = () => {
      const main = document.querySelector('.metro-clean-system[data-route="admin"] .admin-v41-main')
        || document.querySelector('.admin-page-v41 .admin-v41-main');
      setHost((current) => current === main ? current : main);
    };
    findHost();
    const observer = new MutationObserver(findHost);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [route, currentUser?.role]);

  const save = async () => {
    setLoading(true);
    setMessage('');
    try {
      const option = await saveSiteFontSetting(currentUser, fontId);
      setSavedFontId(option.id);
      setMessage(vi
        ? `Đã đặt “${option.labelVi}” làm font mặc định cho toàn website.`
        : `“${option.label}” is now the website-wide default font.`);
    } catch (error) {
      setMessage(error?.message || (vi ? 'Không thể lưu font dùng chung.' : 'Could not save the shared font.'));
    } finally {
      setLoading(false);
    }
  };

  if (!host || route !== 'admin' || !isAdminRole(currentUser?.role)) return null;

  return createPortal(
    <section className="admin-global-font-card" id="admin-global-font-settings" aria-labelledby="admin-global-font-title">
      <div className="admin-global-font-copy">
        <span className="admin-global-font-kicker">{vi ? 'GIAO DIỆN TOÀN HỆ THỐNG' : 'SYSTEM-WIDE APPEARANCE'}</span>
        <h2 id="admin-global-font-title">{vi ? 'Font chữ mặc định' : 'Default website font'}</h2>
        <p>{vi
          ? 'Admin chọn một lần; hệ thống đồng bộ lựa chọn này làm font mặc định cho mọi tài khoản trên toàn website.'
          : 'Choose once and use the selection as the default font for every account across the website.'}</p>
        <label className="admin-global-font-field">
          <span>{vi ? 'Chọn font chữ' : 'Choose a font'}</span>
          <select value={fontId} onChange={(event) => { setFontId(event.target.value); setMessage(''); }}>
            {SITE_FONT_OPTIONS.map((option) => (
              <option key={option.id} value={option.id}>{vi ? option.labelVi : option.label}</option>
            ))}
          </select>
        </label>
        <div className="admin-global-font-note">
          <strong>{vi ? selected.labelVi : selected.label}</strong>
          <span>{vi ? selected.noteVi : selected.note}</span>
        </div>
        <div className="admin-global-font-actions">
          <button type="button" disabled={loading || fontId === savedFontId} onClick={save}>
            {loading ? (vi ? 'Đang đồng bộ…' : 'Syncing…') : (vi ? 'Áp dụng cho mọi tài khoản' : 'Apply to every account')}
          </button>
          <small>{fontId === savedFontId
            ? (vi ? 'Đây là font mặc định hiện tại.' : 'This is the current default font.')
            : (vi ? 'Bấm áp dụng để công bố thay đổi.' : 'Apply to publish this change.')}</small>
        </div>
        {message ? <div className="admin-global-font-message">{message}</div> : null}
      </div>
      <div className="admin-global-font-preview" style={{ fontFamily: selected.family }}>
        <span>{vi ? 'XEM TRƯỚC' : 'PREVIEW'}</span>
        <strong>Brian English Studio</strong>
        <p>Tiếng Việt rõ dấu · English learning made beautifully simple.</p>
        <div><b>Aa</b><i>Ă Â Ê Ô Ơ Ư Đ</i><em>0123456789</em></div>
      </div>
    </section>,
    host,
  );
}
