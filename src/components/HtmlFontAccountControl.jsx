import React, { useEffect, useRef, useState } from 'react';
import {
  loadAccountHtmlFont,
  MAX_ACCOUNT_FONT_SIZE,
  removeAllAccountHtmlFonts,
  uploadAccountHtmlFont,
} from '../utils/htmlFontProfile.js';
import './HtmlFontAccountControl.css';

export default function HtmlFontAccountControl({ currentUser, language = 'vi', onChange }) {
  const vi = language === 'vi';
  const inputRef = useRef(null);
  const userKey = currentUser?.id || currentUser?.email || '';
  const [profile, setProfile] = useState(null);
  const [busy, setBusy] = useState('load');
  const [message, setMessage] = useState('');

  const publish = (next) => {
    setProfile(next);
    onChange?.(next);
  };

  useEffect(() => {
    if (!userKey) {
      setBusy('');
      publish(null);
      return undefined;
    }
    let active = true;
    setBusy('load');
    setMessage('');
    loadAccountHtmlFont()
      .then((next) => {
        if (!active) return;
        publish(next);
      })
      .catch((error) => {
        if (!active) return;
        publish(null);
        setMessage(error.message || (vi ? 'Không thể tải font của tài khoản.' : 'Could not load the account font.'));
      })
      .finally(() => { if (active) setBusy(''); });
    return () => { active = false; };
  }, [userKey, vi]);

  const chooseFont = async (event) => {
    const selected = event.target.files?.[0] || null;
    if (!selected) return;
    setBusy('upload');
    setMessage('');
    try {
      const next = await uploadAccountHtmlFont(selected, currentUser, profile?.item || null);
      publish(next);
      setMessage(vi
        ? `Đã lưu “${selected.name}” vào tài khoản. Font sẽ tự dùng trên các thiết bị khác.`
        : `“${selected.name}” was saved to your account and will follow you to other devices.`);
    } catch (error) {
      setMessage(error.message || (vi ? 'Không thể tải font lên.' : 'Could not upload the font.'));
    } finally {
      setBusy('');
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeFont = async () => {
    if (!profile?.item) return;
    const confirmed = window.confirm(vi
      ? 'Xoá font này khỏi tài khoản và dùng lại font gốc của từng bài HTML?'
      : 'Remove this font from your account and restore each HTML lesson’s original font?');
    if (!confirmed) return;
    setBusy('remove');
    setMessage('');
    try {
      await removeAllAccountHtmlFonts();
      publish(null);
      setMessage(vi ? 'Đã xoá font khỏi tài khoản. Các bài sẽ dùng font gốc.' : 'The account font was removed. Lessons now use their original fonts.');
    } catch (error) {
      setMessage(error.message || (vi ? 'Không thể xoá font.' : 'Could not remove the font.'));
    } finally {
      setBusy('');
    }
  };

  const fontName = profile?.item?.fileName || profile?.item?.title || '';

  return (
    <section className="thpt-account-font" aria-label={vi ? 'Font tài khoản cho bài HTML' : 'Account font for HTML lessons'}>
      <div className="thpt-account-font-copy">
        <span>04 · ACCOUNT HTML FONT</span>
        <h3>{vi ? 'Font cho bài HTML' : 'HTML lesson font'}</h3>
        <p>{vi
          ? 'Font được lưu riêng theo tài khoản và tự đồng bộ khi đăng nhập bằng browser hoặc thiết bị khác.'
          : 'The font is saved privately to your account and syncs across browsers and devices.'}</p>
      </div>

      <div className="thpt-account-font-actions">
        <div className={profile ? 'thpt-font-state is-active' : 'thpt-font-state'}>
          <small>{busy === 'load' ? (vi ? 'Đang đồng bộ…' : 'Syncing…') : (vi ? 'Font đang dùng' : 'Current font')}</small>
          <strong>{busy === 'load' ? '—' : (fontName || (vi ? 'Font gốc của bài HTML' : 'Original HTML font'))}</strong>
          {profile?.dataUrl ? <span className="thpt-font-sample" style={{ fontFamily: 'BESAccountHtmlFont, sans-serif' }}>Aa ĂÂĐÊÔƠƯ · English 12</span> : null}
        </div>

        <label className="thpt-font-upload-button">
          <input
            ref={inputRef}
            type="file"
            accept=".ttf,.otf,.woff,.woff2,font/ttf,font/otf,font/woff,font/woff2"
            onChange={chooseFont}
            disabled={Boolean(busy)}
          />
          {busy === 'upload'
            ? (vi ? 'Đang tải font…' : 'Uploading font…')
            : profile
              ? (vi ? 'Thay font khác' : 'Replace font')
              : (vi ? 'Tải font lên' : 'Upload font')}
        </label>
        {profile ? <button type="button" className="thpt-font-remove-button" onClick={removeFont} disabled={Boolean(busy)}>{busy === 'remove' ? (vi ? 'Đang xoá…' : 'Removing…') : (vi ? 'Dùng font gốc' : 'Use original font')}</button> : null}
        <small className="thpt-font-limit">{vi ? `TTF, OTF, WOFF, WOFF2 · tối đa ${Math.round(MAX_ACCOUNT_FONT_SIZE / 1024 / 1024)} MB` : `TTF, OTF, WOFF, WOFF2 · up to ${Math.round(MAX_ACCOUNT_FONT_SIZE / 1024 / 1024)} MB`}</small>
      </div>

      {profile?.dataUrl ? (
        <style>{`@font-face{font-family:'BESAccountHtmlFont';src:url("${String(profile.dataUrl).replace(/"/g, '%22')}");font-display:block;}`}</style>
      ) : null}
      {message ? <p className="thpt-font-message" role="status">{message}</p> : null}
    </section>
  );
}
