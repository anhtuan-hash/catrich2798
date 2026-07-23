import React, { useEffect, useMemo, useState } from 'react';
import { pendingTransferFor, TRANSFER_APPLY_EVENT, TRANSFER_UPDATED_EVENT, updateTransfer } from '../utils/contentTransfer.js';
import { publishGlobalNotificationOnce } from '../utils/globalNotifications.js';

function nativeSetValue(element, value) {
  if (element instanceof HTMLTextAreaElement) {
    const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')?.set;
    if (setter) setter.call(element, value); else element.value = value;
  } else if (element instanceof HTMLInputElement) {
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
    if (setter) setter.call(element, value); else element.value = value;
  } else if (element?.isContentEditable) element.textContent = value;
  element?.dispatchEvent(new Event('input', { bubbles: true }));
  element?.dispatchEvent(new Event('change', { bubbles: true }));
}

function targetKey(route, selectedTool) {
  if (route === 'tool' && selectedTool?.slug) return selectedTool.slug;
  return route;
}

function targetRoute(route, selectedTool) {
  if (route === 'tool' && selectedTool?.slug) return `#/tool/${selectedTool.slug}`;
  return `#/${route || 'home'}`;
}

export default function TransferInboxBanner({ currentUser, route, selectedTool, language = 'vi' }) {
  const target = useMemo(() => targetKey(route, selectedTool), [route, selectedTool?.slug]);
  const notificationTarget = useMemo(() => targetRoute(route, selectedTool), [route, selectedTool?.slug]);
  const [item, setItem] = useState(() => pendingTransferFor(currentUser, target));
  const [notice, setNotice] = useState('');

  useEffect(() => {
    const refresh = () => {
      const next = pendingTransferFor(currentUser, target);
      setItem(next);
      if (!next) return;

      const identity = currentUser?.id || currentUser?.email || 'guest';
      publishGlobalNotificationOnce(`transfer:${identity}:${next.id}`, {
        id: `transfer:${next.id}`,
        title: language === 'vi' ? 'Có nội dung mới được gửi tới' : 'New content was sent to you',
        message: language === 'vi'
          ? `${next.title} · Từ ${next.sourceTitle}`
          : `${next.title} · From ${next.sourceTitle}`,
        source: next.sourceTitle || 'Brian English',
        kind: 'transfer',
        target: notificationTarget,
      });
    };

    refresh();
    window.addEventListener(TRANSFER_UPDATED_EVENT, refresh);
    let channel = null;
    try { channel = new BroadcastChannel('bes-transfer-v1085'); channel.onmessage = refresh; } catch { channel = null; }
    return () => { window.removeEventListener(TRANSFER_UPDATED_EVENT, refresh); channel?.close?.(); };
  }, [currentUser?.id, currentUser?.email, target, notificationTarget, language]);

  if (!currentUser || !item) return null;

  const apply = () => {
    try { window.sessionStorage.setItem('bes-pending-content-transfer', JSON.stringify(item)); } catch { /* optional */ }
    window.dispatchEvent(new CustomEvent(TRANSFER_APPLY_EVENT, { detail: item }));

    window.setTimeout(() => {
      const root = document.querySelector('main.wp8-page-stage');
      const preferred = root?.querySelector('[data-transfer-target="primary"], textarea:not([disabled]), input[type="text"]:not([disabled]), [contenteditable="true"]');
      if (preferred) nativeSetValue(preferred, item.content || '');
    }, 80);

    updateTransfer(currentUser, item.id, { status: 'applied', appliedAt: Date.now() });
    setNotice(language === 'vi' ? 'Đã đưa nội dung vào ứng dụng.' : 'Content added to the app.');
    window.setTimeout(() => setItem(null), 900);
  };

  const dismiss = () => {
    updateTransfer(currentUser, item.id, { status: 'dismissed' });
    setItem(null);
  };

  return (
    <aside className="bes-transfer-inbox" role="status">
      <div className="bes-transfer-inbox-icon">↘</div>
      <div>
        <small>{language === 'vi' ? 'NỘI DUNG ĐƯỢC GỬI TỚI' : 'INCOMING CONTENT'}</small>
        <strong>{item.title}</strong>
        <span>{language === 'vi' ? `Từ ${item.sourceTitle}` : `From ${item.sourceTitle}`} · {item.content.length.toLocaleString()} {language === 'vi' ? 'ký tự' : 'characters'}</span>
      </div>
      {notice ? <b className="bes-transfer-inbox-success">✓ {notice}</b> : <>
        <button type="button" className="primary" onClick={apply}>{language === 'vi' ? 'Dùng nội dung' : 'Use content'}</button>
        <button type="button" onClick={dismiss}>{language === 'vi' ? 'Bỏ qua' : 'Dismiss'}</button>
      </>}
    </aside>
  );
}
