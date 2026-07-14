import React, { useState } from 'react';
import { requestPermission } from '../utils/permissionRequests.js';

export default function PermissionRequestButton({
  currentUser,
  permissionId,
  item,
  language,
  className = 'secondary full request-access-btn',
  label,
  compact = false,
}) {
  const [state, setState] = useState('idle');
  const [message, setMessage] = useState('');

  const text = label || (language === 'vi' ? 'Xin quyền' : 'Request access');
  const pendingText = language === 'vi' ? 'Đang gửi...' : 'Sending...';
  const sentText = language === 'vi' ? 'Đã gửi yêu cầu' : 'Request sent';

  const sendRequest = async (event) => {
    event?.preventDefault?.();
    event?.stopPropagation?.();
    if (state === 'sending' || state === 'sent') return;
    setState('sending');
    setMessage('');
    const res = await requestPermission({ user: currentUser, permissionId, item, language });
    if (res.ok) {
      setState('sent');
      setMessage(res.message || sentText);
    } else {
      setState('idle');
      setMessage(res.message || (language === 'vi' ? 'Không thể gửi yêu cầu.' : 'Could not send request.'));
    }
  };

  return (
    <div className={compact ? 'permission-request-inline compact' : 'permission-request-inline'}>
      <button className={className} disabled={state === 'sending' || state === 'sent'} onClick={sendRequest}>
        {state === 'sending' ? pendingText : state === 'sent' ? sentText : text}
      </button>
      {message ? <small className={state === 'sent' ? 'permission-request-msg success' : 'permission-request-msg'}>{message}</small> : null}
    </div>
  );
}
