import React, { useEffect, useId, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AlertCircle, Check, CheckCircle2, LockKeyhole, Send, ShieldCheck, X } from 'lucide-react';
import FlatAppIcon from './FlatAppIcon.jsx';
import { getAppDesignProfile } from '../data/designProfiles.js';
import { requestPermission } from '../utils/permissionRequests.js';
import './PermissionRequestButton.css';

function titleFor(item, language) {
  if (!item) return language === 'vi' ? 'Ứng dụng được bảo vệ' : 'Protected app';
  return language === 'vi'
    ? item.titleVi || item.title || item.id || item.slug
    : item.title || item.titleVi || item.id || item.slug;
}

function focusableElements(host) {
  if (!host) return [];
  return [...host.querySelectorAll('button:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])')]
    .filter((element) => !element.hasAttribute('hidden'));
}

export default function PermissionRequestButton({
  currentUser,
  permissionId,
  item,
  language = 'vi',
  className = 'secondary full request-access-btn',
  label,
  compact = false,
}) {
  const [open, setOpen] = useState(false);
  const [state, setState] = useState('idle');
  const [message, setMessage] = useState('');
  const [note, setNote] = useState('');
  const triggerRef = useRef(null);
  const dialogRef = useRef(null);
  const previousFocusRef = useRef(null);
  const stateRef = useRef(state);
  const titleId = useId();
  const descriptionId = useId();
  const noteId = useId();
  const isVi = language !== 'en';
  const appTitle = titleFor(item, language);
  const profile = useMemo(() => getAppDesignProfile(item?.slug), [item?.slug]);
  const text = label || (isVi ? 'Yêu cầu quyền truy cập' : 'Request access');
  const sentText = isVi ? 'Yêu cầu đã được gửi' : 'Request sent';

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const closeDialog = () => {
    if (state === 'sending') return;
    setOpen(false);
    if (state === 'error') {
      setState('idle');
      setMessage('');
    }
  };

  useEffect(() => {
    if (!open) return undefined;
    previousFocusRef.current = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const frame = window.requestAnimationFrame(() => {
      const [first] = focusableElements(dialogRef.current);
      first?.focus();
    });

    const onKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        if (stateRef.current !== 'sending') setOpen(false);
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = focusableElements(dialogRef.current);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      const focusTarget = previousFocusRef.current || triggerRef.current;
      window.requestAnimationFrame(() => focusTarget?.focus?.());
    };
  }, [open]);

  const openDialog = (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (state === 'sending') return;
    setOpen(true);
  };

  const sendRequest = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (state === 'sending' || state === 'sent') return;
    setState('sending');
    setMessage('');
    const result = await requestPermission({
      user: currentUser,
      permissionId,
      item,
      language,
      message: note,
    });
    if (result.ok) {
      setState('sent');
      setMessage(result.message || sentText);
      return;
    }
    setState('error');
    setMessage(result.message || (isVi ? 'Không thể gửi yêu cầu. Vui lòng thử lại.' : 'Could not send the request. Please try again.'));
  };

  const dialog = open ? (
    <div className="permission-request-layer" onMouseDown={(event) => event.target === event.currentTarget && closeDialog()}>
      <section
        ref={dialogRef}
        className={`permission-request-dialog is-${state}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        style={{ '--permission-accent': profile.accent, '--permission-soft': profile.soft, '--permission-ink': profile.ink }}
      >
        {state === 'sent' ? (
          <div className="permission-request-success" role="status">
            <span className="permission-request-success-icon" aria-hidden="true"><CheckCircle2 /></span>
            <span className="permission-request-state-chip is-success"><Check /> {isVi ? 'Đã gửi thành công' : 'Sent successfully'}</span>
            <h2 id={titleId}>{isVi ? 'Yêu cầu đang chờ duyệt' : 'Your request is pending'}</h2>
            <p id={descriptionId}>{message || sentText}</p>
            <div className="permission-request-success-app">
              <span><FlatAppIcon type={profile.icon} slug={item?.slug} /></span>
              <div><small>{isVi ? 'ỨNG DỤNG' : 'APP'}</small><strong>{appTitle}</strong></div>
            </div>
            <p className="permission-request-success-hint">
              {isVi
                ? 'Bạn vẫn có thể sử dụng các ứng dụng khác. Khi quản trị viên duyệt, quyền truy cập sẽ được cập nhật vào tài khoản.'
                : 'You can keep using other apps. Access will be added to your account after an administrator approves it.'}
            </p>
            <button type="button" className="permission-request-primary" onClick={closeDialog}>{isVi ? 'Đã hiểu' : 'Got it'}</button>
          </div>
        ) : (
          <>
            <header className="permission-request-header">
              <div className="permission-request-heading-icon" aria-hidden="true"><LockKeyhole /></div>
              <div>
                <span className="permission-request-state-chip"><ShieldCheck /> {isVi ? 'QUYỀN TRUY CẬP' : 'ACCESS CONTROL'}</span>
                <h2 id={titleId}>{isVi ? 'Yêu cầu quyền truy cập' : 'Request access'}</h2>
                <p id={descriptionId}>
                  {isVi ? 'Ứng dụng này cần được quản trị viên cấp quyền trước khi sử dụng.' : 'An administrator needs to grant access before you can use this app.'}
                </p>
              </div>
              <button type="button" className="permission-request-close" onClick={closeDialog} aria-label={isVi ? 'Đóng hộp thoại' : 'Close dialog'}><X /></button>
            </header>

            <div className="permission-request-content">
              <div className="permission-request-app-card">
                <span className="permission-request-app-icon" aria-hidden="true"><FlatAppIcon type={profile.icon} slug={item?.slug} /></span>
                <div>
                  <small>{isVi ? 'ỨNG DỤNG ĐANG BỊ GIỚI HẠN' : 'RESTRICTED APP'}</small>
                  <strong>{appTitle}</strong>
                  <span>{isVi ? 'Chờ quản trị viên phê duyệt' : 'Administrator approval required'}</span>
                </div>
                <LockKeyhole aria-hidden="true" />
              </div>

              <div className="permission-request-detail-grid">
                <div><span aria-hidden="true"><ShieldCheck /></span><p><small>{isVi ? 'QUYỀN CẦN CẤP' : 'REQUESTED ACCESS'}</small><strong>{isVi ? 'Mở và sử dụng ứng dụng' : 'Open and use this app'}</strong></p></div>
                <div><span aria-hidden="true"><Send /></span><p><small>{isVi ? 'NGƯỜI XÉT DUYỆT' : 'REVIEWER'}</small><strong>{isVi ? 'Quản trị viên hệ thống' : 'System administrator'}</strong></p></div>
              </div>

              <label className="permission-request-note" htmlFor={noteId}>
                <span>{isVi ? 'Lý do cần sử dụng' : 'Why do you need access?'} <small>{isVi ? '(không bắt buộc)' : '(optional)'}</small></span>
                <textarea
                  id={noteId}
                  value={note}
                  maxLength={500}
                  rows={3}
                  onChange={(event) => setNote(event.target.value)}
                  placeholder={isVi ? 'Ví dụ: Tôi cần ứng dụng này để chuẩn bị bài dạy cho lớp…' : 'For example: I need this app to prepare a lesson…'}
                />
                <small>{note.length}/500</small>
              </label>

              {state === 'error' ? <div className="permission-request-error" role="alert"><AlertCircle /><span>{message}</span></div> : null}

              <div className="permission-request-privacy">
                <ShieldCheck aria-hidden="true" />
                <p><strong>{isVi ? 'Yêu cầu minh bạch, không cấp quyền tự động' : 'Transparent request, no automatic access'}</strong><span>{isVi ? 'Quản trị viên sẽ thấy tên, tài khoản, ứng dụng và lý do bạn cung cấp.' : 'The administrator will see your name, account, app, and the reason you provide.'}</span></p>
              </div>
            </div>

            <footer className="permission-request-actions">
              <button type="button" className="permission-request-secondary" onClick={closeDialog} disabled={state === 'sending'}>{isVi ? 'Để sau' : 'Not now'}</button>
              <button type="button" className="permission-request-primary" onClick={sendRequest} disabled={state === 'sending'}>
                {state === 'sending' ? <><span className="permission-request-spinner" />{isVi ? 'Đang gửi yêu cầu…' : 'Sending request…'}</> : <><Send />{isVi ? 'Gửi yêu cầu' : 'Send request'}</>}
              </button>
            </footer>
          </>
        )}
      </section>
    </div>
  ) : null;

  return (
    <div className={compact ? 'permission-request-inline compact' : 'permission-request-inline'} data-request-state={state}>
      <button
        ref={triggerRef}
        type="button"
        className={`${className} permission-request-trigger is-${state}`.trim()}
        disabled={state === 'sending'}
        onClick={openDialog}
        aria-haspopup="dialog"
      >
        {state === 'sent' ? <CheckCircle2 aria-hidden="true" /> : <LockKeyhole aria-hidden="true" />}
        <span>{state === 'sent' ? sentText : text}</span>
      </button>
      {open && typeof document !== 'undefined' ? createPortal(dialog, document.body) : null}
    </div>
  );
}
