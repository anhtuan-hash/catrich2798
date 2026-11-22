import React, { useEffect, useRef, useState } from 'react';
import { defaultDisplay, isDisplayConfig, maxDisplayOpacity } from './display-config.js';
import './display-settings.css';

const endpoint = '/api/display';

export function useMuseumDisplay(accessToken) {
  const [saved, setSaved] = useState(defaultDisplay);
  const [draft, setDraft] = useState(null);
  const activeRead = useRef(null);
  const saving = useRef(false);

  useEffect(() => {
    async function refresh() {
      if (saving.current || document.hidden) return;
      activeRead.current?.abort();
      const request = new AbortController();
      activeRead.current = request;
      try {
        const response = await fetch(endpoint, { signal: request.signal });
        const values = response.ok && await response.json();
        if (!request.signal.aborted && isDisplayConfig(values)) setSaved(values);
      } catch {
        // Preserve the last saved or default settings when temporarily offline.
      }
    }

    refresh();
    const timer = window.setInterval(refresh, 60_000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      activeRead.current?.abort();
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);

  async function save(values) {
    saving.current = true;
    activeRead.current?.abort();
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify(values),
      });
      const persisted = response.ok && await response.json();
      if (!isDisplayConfig(persisted)) throw new Error('Could not save display settings');
      setSaved(persisted);
    } finally {
      saving.current = false;
    }
  }

  return { saved, draft: accessToken ? draft : null, setDraft, save };
}

export function DisplayFrame({ display, children }) {
  return (
    <div className="museum-display-frame" data-wallpaper={display.opacity > 0}
      data-high-contrast={display.highContrast}
      style={{ '--museum-wallpaper-opacity': display.opacity / 100 }}>
      <div className="museum-display-wallpaper" aria-hidden="true" />
      {children}
    </div>
  );
}

export function DisplaySettings({ draft, onChange, onClose, onSave, language }) {
  const dialog = useRef(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const t = (vi, en) => language === 'en' ? en : vi;

  useEffect(() => {
    const element = dialog.current;
    element.showModal();
    return () => element.close();
  }, []);

  function close() {
    dialog.current?.close();
    onClose();
  }

  async function submit(event) {
    event.preventDefault();
    setError(false);
    setBusy(true);
    try {
      await onSave(draft);
      close();
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <dialog className="museum-display-dialog" ref={dialog} lang={language}
      aria-labelledby="museum-display-title" onCancel={event => {
        event.preventDefault();
        if (!busy) close();
      }}>
      <form onSubmit={submit}>
        <h2 id="museum-display-title">{t('Hiển thị toàn website', 'Site appearance')}</h2>
        <p>{t('Thiết lập đã lưu áp dụng cho giáo viên, học sinh và khách truy cập.', 'Saved settings apply to teachers, students, and visitors.')}</p>
        <div className="museum-display-preview" data-high-contrast={draft.highContrast}
          style={{ '--museum-wallpaper-opacity': draft.opacity / 100 }}>
          <div className="museum-display-preview-wallpaper" aria-hidden="true" />
          <div className="museum-display-preview-copy">
            <strong>{t('Xem trước nền trống đồng', 'Bronze drum background preview')}</strong>
            <span>{t('Bài học · Bài nộp · Triển lãm', 'Lessons · Submissions · Exhibitions')}</span>
          </div>
        </div>
        <label className="museum-display-range">
          <span>{t('Độ đậm của nền', 'Background opacity')} <output>{draft.opacity}%</output></span>
          <input type="range" min="0" max={maxDisplayOpacity} value={draft.opacity} disabled={busy}
            onChange={event => onChange({ ...draft, opacity: event.target.valueAsNumber })} />
        </label>
        <p className="museum-display-hint">{t('Kéo về 0% để tắt nền.', 'Set to 0% to hide the background.')}</p>
        <label className="museum-display-check">
          <input type="checkbox" checked={draft.highContrast} disabled={busy}
            onChange={event => onChange({ ...draft, highContrast: event.target.checked })} />
          {t('Tăng tương phản để dễ đọc', 'Increase contrast for readability')}
        </label>
        {error && <p role="alert">{t('Chưa lưu được cài đặt. Hãy kiểm tra phiên đăng nhập rồi thử lại.', 'Settings could not be saved. Check your sign-in and try again.')}</p>}
        <footer>
          <button type="button" className="museum-display-reset" disabled={busy} onClick={() => onChange(defaultDisplay)}>{t('Mặc định', 'Reset')}</button>
          <button type="button" disabled={busy} onClick={close}>{t('Hủy', 'Cancel')}</button>
          <button type="submit" disabled={busy}>{busy ? t('Đang lưu…', 'Saving…') : t('Lưu cho toàn web', 'Save for everyone')}</button>
        </footer>
      </form>
    </dialog>
  );
}
