import { useEffect } from 'react';
import { installUsernameAuthBridge } from '../utils/usernameAccounts.js';
import './UsernameLoginBridge.css';

function currentRoute() {
  if (typeof window === 'undefined') return '';
  return window.location.hash.replace(/^#\/?/, '').split(/[?&]/)[0].trim();
}

function decorateLoginForm(language) {
  if (currentRoute() !== 'login') return false;

  const form = document.querySelector('.auth-google-form');
  if (!form) return false;

  const input = form.querySelector(
    '.auth-google-fields input[autocomplete="username"], .auth-google-fields input[autocomplete="email"], .auth-google-fields input[type="email"]',
  );
  if (!input) return false;

  const placeholder = language === 'vi' ? 'Tên đăng nhập hoặc email' : 'Username or email';

  // Apply the login metadata before typing starts, then leave the controlled
  // React input alone. Rewriting input attributes while the user types can
  // reset the caret to position 0 and make new characters appear in reverse.
  if (input.type !== 'text') input.type = 'text';
  if (input.autocomplete !== 'username') input.autocomplete = 'username';
  if (input.inputMode !== 'text') input.inputMode = 'text';
  if (input.placeholder !== placeholder) input.placeholder = placeholder;
  if (input.getAttribute('dir') !== 'ltr') input.setAttribute('dir', 'ltr');
  if (input.getAttribute('autocapitalize') !== 'none') input.setAttribute('autocapitalize', 'none');
  if (input.getAttribute('spellcheck') !== 'false') input.setAttribute('spellcheck', 'false');

  const label = input.closest('label');
  const title = label?.querySelector(':scope > span');
  if (title && title.textContent !== placeholder) title.textContent = placeholder;

  if (label) {
    let hint = label.querySelector('.bes-username-login-hint');
    if (!hint) {
      hint = document.createElement('small');
      hint.className = 'bes-username-login-hint';
      label.appendChild(hint);
    }
    hint.textContent = language === 'vi'
      ? 'Tài khoản do Admin cấp chỉ cần nhập tên đăng nhập, ví dụ: gv001.'
      : 'For Admin-created accounts, enter only the username, for example: gv001.';
  }

  return true;
}

export default function UsernameLoginBridge({ language = 'vi' }) {
  useEffect(() => {
    installUsernameAuthBridge();

    let retryTimer = 0;
    let attempts = 0;
    let disposed = false;

    const stopRetrying = () => {
      if (retryTimer) window.clearTimeout(retryTimer);
      retryTimer = 0;
    };

    const decorateWhenReady = () => {
      stopRetrying();
      attempts = 0;

      const tryDecorate = () => {
        if (disposed || currentRoute() !== 'login') return;
        if (decorateLoginForm(language)) return;

        attempts += 1;
        if (attempts < 200) retryTimer = window.setTimeout(tryDecorate, 50);
      };

      tryDecorate();
    };

    const handleFocusIn = (event) => {
      if (currentRoute() !== 'login') return;
      if (event.target?.closest?.('.auth-google-form .auth-google-fields')) {
        decorateLoginForm(language);
      }
    };

    decorateWhenReady();
    window.addEventListener('hashchange', decorateWhenReady);
    document.addEventListener('focusin', handleFocusIn, true);

    return () => {
      disposed = true;
      stopRetrying();
      window.removeEventListener('hashchange', decorateWhenReady);
      document.removeEventListener('focusin', handleFocusIn, true);
    };
  }, [language]);

  return null;
}
