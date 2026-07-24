import { useEffect } from 'react';
import { installUsernameAuthBridge } from '../utils/usernameAccounts.js';
import './UsernameLoginBridge.css';

function currentRoute() {
  if (typeof window === 'undefined') return '';
  return window.location.hash.replace(/^#\/?/, '').split(/[?&]/)[0].trim();
}

function decorateLoginForm(language) {
  if (currentRoute() !== 'login') return;
  const form = document.querySelector('.auth-google-form');
  if (!form) return;
  const input = form.querySelector('.auth-google-fields input[autocomplete="email"], .auth-google-fields input[type="email"]');
  if (!input) return;

  input.type = 'text';
  input.autocomplete = 'username';
  input.inputMode = 'text';
  input.placeholder = language === 'vi' ? 'Tên đăng nhập hoặc email' : 'Username or email';

  const label = input.closest('label');
  const title = label?.querySelector(':scope > span');
  if (title) title.textContent = language === 'vi' ? 'Tên đăng nhập hoặc email' : 'Username or email';

  if (label && !label.querySelector('.bes-username-login-hint')) {
    const hint = document.createElement('small');
    hint.className = 'bes-username-login-hint';
    hint.textContent = language === 'vi'
      ? 'Tài khoản do Admin cấp chỉ cần nhập tên đăng nhập, ví dụ: gv001.'
      : 'For Admin-created accounts, enter only the username, for example: gv001.';
    label.appendChild(hint);
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
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['type', 'placeholder'] });
    window.addEventListener('hashchange', decorate);
    window.addEventListener('input', decorate, true);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener('hashchange', decorate);
      window.removeEventListener('input', decorate, true);
    };
  }, [language]);

  return null;
}
