import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * Isolated YouTube playlist editor.
 * Brian's many global/light-mode styles can reach a regular <textarea> and
 * paint it white. A native textarea inside an open ShadowRoot keeps native
 * paste, keyboard selection, multiline input and mobile IME, while preventing
 * external styles or dynamically injected themes from changing its appearance.
 * The host remains part of the normal Focus Scene Studio layout.
 */
export default function FocusPlaylistUrlInput({
  value = '', onValueChange, placeholder = '', disabled = false,
  language = 'vi', controlRef,
}) {
  const hostRef = useRef(null);
  const textareaRef = useRef(null);
  const callbackRef = useRef(onValueChange);
  callbackRef.current = onValueChange;

  useLayoutEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const shadow = host.shadowRoot || host.attachShadow({ mode: 'open' });
    const sheet = document.createElement('style');
    sheet.textContent = `
      :host {
        display: block;
        width: 100%;
        min-width: 0;
        max-width: 100%;
        box-sizing: border-box;
        height: 112px;
        border-radius: 8px;
        background: #08162d;
        color-scheme: dark;
        overflow: hidden;
      }
      *, *::before, *::after { box-sizing: border-box; }
      textarea, textarea:focus, textarea:active, textarea:hover {
        display: block;
        width: 100%;
        height: 100%;
        min-width: 0;
        max-width: 100%;
        min-height: 0;
        max-height: 100%;
        margin: 0;
        padding: 9px 10px;
        border: 0;
        outline: 0;
        box-shadow: none;
        background: #08162d !important;
        background-color: #08162d !important;
        color: #eff6ff !important;
        -webkit-text-fill-color: #eff6ff;
        caret-color: #9ed4ff;
        font: 500 12px/1.55 -apple-system, BlinkMacSystemFont,
          "Segoe UI", Inter, system-ui, sans-serif !important;
        overflow: auto;
        overflow-x: hidden;
        overflow-wrap: anywhere;
        word-break: break-word;
        resize: none;
        white-space: pre-wrap;
        -webkit-appearance: none;
        appearance: none;
        color-scheme: dark;
        scrollbar-width: thin;
        scrollbar-color: rgba(148,180,230,.5) #08162d;
      }
      textarea::placeholder {
        color: #92adcc !important;
        -webkit-text-fill-color: #92adcc;
        opacity: 1;
      }
      textarea:disabled { opacity: .58; cursor: not-allowed; }
      textarea::selection { background: #336eaf; color: #fff; }
    `;
    const area = document.createElement('textarea');
    area.id = 'bfc-youtube-url';
    area.rows = 4;
    area.setAttribute('spellcheck', 'false');
    area.setAttribute('autocapitalize', 'off');
    area.setAttribute('autocorrect', 'off');
    area.setAttribute('aria-label', language === 'en'
      ? 'Paste YouTube video URLs, one per line'
      : 'Dán liên kết YouTube, mỗi video một dòng');
    area.value = String(value || '');
    area.placeholder = placeholder;
    area.disabled = Boolean(disabled);
    const onInput = () => callbackRef.current?.(area.value);
    area.addEventListener('input', onInput);
    shadow.append(sheet, area);
    textareaRef.current = area;
    if (controlRef) controlRef.current = area;

    return () => {
      area.removeEventListener('input', onInput);
      if (controlRef?.current === area) controlRef.current = null;
      if (textareaRef.current === area) textareaRef.current = null;
      shadow.replaceChildren();
    };
  }, []);

  useEffect(() => {
    const area = textareaRef.current;
    if (area && area.value !== String(value || '')) area.value = String(value || '');
  }, [value]);

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.disabled = Boolean(disabled);
  }, [disabled]);

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.placeholder = placeholder;
  }, [placeholder]);

  useEffect(() => {
    if (textareaRef.current) textareaRef.current.setAttribute(
      'aria-label', language === 'en'
        ? 'Paste YouTube video URLs, one per line'
        : 'Dán liên kết YouTube, mỗi video một dòng',
    );
  }, [language]);

  return <span ref={hostRef} className="bfc-playlist-shadow-input"
    data-testid="bfc-playlist-shadow-input" />;
}
