import { useEffect } from 'react';
import { installUsernameAuthBridge } from '../utils/usernameAccounts.js';
import './UsernameLoginBridge.css';

function currentRoute() {
  if (typeof window === 'undefined') return '';
  return window.location.hash.replace(/^#\/?/, '').split(/[?&]/)[0].trim();
}

function setInputProperty(input, property, value) {
  if (input[property] === value) return false;
  input[property] = value;
  return true;
}

function restoreCaret(input, selection) {
  if (!selection || document.activeElement !== input) return;
  const length = input.value.length;
  const start = Math.min(selection.start, length);
  const end = Math.min(selection.end, length);
  try {
    input.setSelectionRange(start, end, selection.direction || 'none');
    input.scrollLeft = selection.scrollLeft;
  } catch {
    // Text inputs support selection ranges, but keep the bridge safe on older browsers.
  }
}

function decorateLoginForm(language) {
  if (currentRoute() !== 'login') return;
  const form = document.querySelector('.auth-google-form');
  if (!form) return;
  const input = form.querySelector(
    '.auth-google-fields input[autocomplete="username"], .auth-google-fields input[autocomplete="email"], .auth-google-fields input[type="email"]',
  );
  if (!input) return;

  const selection = document.activeElement === input && typeof input.selectionStart === 'number'
    ? {
      start: input.selectionStart,
      end: input.selectionEnd,
      direction: input.selectionDirection,
      scrollLeft: input.scrollLeft,
    }
    : null;

  const placeholder = language === 'vi' ? 'Tên đăng nhập hoặc email' : 'Username or email';
  let changed = false;
  changed = setInputProperty(input, 'type', 'text') || changed;
  changed = setInputProperty(input, 'autocomplete', 'username') || changed;
  changed = setInputProperty(input, 'inputMode', 'text') || changed;
  changed = setInputProperty(input, 'placeholder', placeholder) || changed;
  if (input.getAttribute('dir') !== 'ltr') {
    input.setAttribute('dir', 'ltr');
    changed = true;
  }

  const label = input.closest('label');
  const title = label?.querySelector(':scope > span');
  if (title && title.textContent !== placeholder) title.textContent = placeholder;

  if (label && !label.querySelector('.bes-username-login-hint')) {
    const hint = document.createElement('small');
    hint.className = 'bes-username-login-hint';
    hint.textContent = language === 'vi'
      ? 'Tài khoản do Admin cấp chỉ cần nhập tên đăng nhập, ví dụ: gv001.'
      : 'For Admin-created accounts, enter only the username, for example: gv001.';
    label.appendChild(hint);
  }

  // React may briefly restore type="email" after a controlled-input render.
  // Changing the type back to text can reset the caret to position 0, so retain
  // the exact selection before and after synchronizing the login metadata.
  if (changed && selection) {
    restoreCaret(input, selection);
    queueMicrotask(() => restoreCaret(input, selection));
  }
}

export default function UsernameLoginBridge({ language = 'vi' }) {
  useEffect(() => {
    installUsernameAuthBridge();
    let frame = 0;
    const decorate = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => decorateLoginForm(language));
    };
    decorate();
    const observer = new MutationObserver(decorate);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['type', 'placeholder', 'autocomplete', 'inputmode', 'dir'],
    });
    window.addEventListener('hashchange', decorate);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('hashchange', decorate);
    };
  }, [language]);

  return null;
}
