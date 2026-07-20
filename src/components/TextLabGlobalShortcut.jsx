import { useEffect } from 'react';

const SHORTCUT_ID = 'brian-textlab-global-nav-shortcut';
const STYLE_ID = 'brian-textlab-global-nav-shortcut-style';

function installStyle() {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    #${SHORTCUT_ID}{display:inline-flex;align-items:center;gap:7px;min-height:34px;padding:0 12px;border:1px solid currentColor;border-radius:999px;background:#eef6ff;color:#15385f;font:700 12px/1 system-ui,-apple-system,"Segoe UI",sans-serif;cursor:pointer;white-space:nowrap}
    #${SHORTCUT_ID}:hover{transform:translateY(-1px);background:#dfeeff}
    #${SHORTCUT_ID} svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.8;stroke-linecap:round;stroke-linejoin:round}
  `;
  document.head.appendChild(style);
}

function findNavigationHost() {
  const candidates = [...document.querySelectorAll('nav,[role="navigation"],header,.navbar,.topbar')];
  return candidates.find((node) => {
    const text = node.textContent || '';
    return text.includes('Trang chủ') && text.includes('Ứng dụng');
  }) || null;
}

function installShortcut() {
  if (document.getElementById(SHORTCUT_ID)) return true;
  const host = findNavigationHost();
  if (!host) return false;
  installStyle();
  const button = document.createElement('button');
  button.id = SHORTCUT_ID;
  button.type = 'button';
  button.title = 'Mở Brian TextLab';
  button.innerHTML = '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="4"></rect><path d="M8 7h5a3 3 0 0 1 0 6H8z"></path><path d="M8 13h6a3 3 0 0 1 0 6H8z"></path></svg><span>TextLab</span>';
  button.addEventListener('click', () => { window.location.hash = '#/tool/textlab-template-library/'; });

  const appItem = [...host.querySelectorAll('a,button')].find((node) => (node.textContent || '').trim().includes('Ứng dụng'));
  if (appItem?.parentElement) appItem.insertAdjacentElement('afterend', button);
  else host.appendChild(button);
  return true;
}

export default function TextLabGlobalShortcut() {
  useEffect(() => {
    installShortcut();
    const observer = new MutationObserver(() => installShortcut());
    observer.observe(document.documentElement, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
