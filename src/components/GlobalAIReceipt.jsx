import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

function compactDuration(value) {
  const ms = Math.max(0, Number(value) || 0);
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms >= 10000 ? 0 : 1)} s`;
}

export default function GlobalAIReceipt({ language = 'vi' }) {
  const vi = language === 'vi';
  const [receipt, setReceipt] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    const onEnd = (event) => {
      const detail = event?.detail || {};
      window.clearTimeout(timerRef.current);
      setReceipt({
        id: detail.operationId || detail.id || `ai-receipt-${Date.now()}`,
        success: detail.success !== false && !detail.error,
        provider: detail.providerName || detail.provider || 'Brian AI',
        model: detail.model || '',
        taskId: detail.taskId || detail.profile || 'default',
        transport: detail.transport || 'browser-unified',
        durationMs: detail.durationMs || detail.runtime?.durationMs || 0,
        fallbackUsed: Boolean(detail.fallbackUsed),
        validated: detail.validated !== false && detail.validation?.valid !== false,
        repaired: Boolean(detail.validation?.repaired),
        privacyApplied: Boolean(detail.privacy?.applied),
        maskedCount: Number(detail.privacy?.maskedCount) || 0,
        error: String(detail.error || ''),
      });
      timerRef.current = window.setTimeout(() => setReceipt(null), detail.error ? 9000 : 6500);
    };
    window.addEventListener('bes-ai-operation-end', onEnd);
    return () => {
      window.removeEventListener('bes-ai-operation-end', onEnd);
      window.clearTimeout(timerRef.current);
    };
  }, []);

  if (!receipt || typeof document === 'undefined') return null;

  return createPortal(
    <aside className={`bes-ai-receipt ${receipt.success ? 'is-success' : 'is-error'}`} role="status" aria-live="polite">
      <div className="bes-ai-receipt__mark" aria-hidden="true">{receipt.success ? 'AI' : '!'}</div>
      <div className="bes-ai-receipt__copy">
        <div className="bes-ai-receipt__heading">
          <strong>{receipt.success ? (vi ? 'AI đã hoàn tất' : 'AI completed') : (vi ? 'Tác vụ AI gặp lỗi' : 'AI task failed')}</strong>
          <span>{compactDuration(receipt.durationMs)}</span>
        </div>
        <p>{receipt.error || [receipt.provider, receipt.model].filter(Boolean).join(' · ')}</p>
        <div className="bes-ai-receipt__chips">
          <span>{receipt.taskId}</span>
          <span>{receipt.transport}</span>
          {receipt.fallbackUsed ? <span className="is-warn">Fallback</span> : null}
          {receipt.validated ? <span className="is-ok">{receipt.repaired ? (vi ? 'Đã sửa & kiểm định' : 'Repaired & validated') : (vi ? 'Đã kiểm định' : 'Validated')}</span> : <span className="is-warn">{vi ? 'Chưa kiểm định' : 'Unvalidated'}</span>}
          {receipt.privacyApplied ? <span className="is-private">{vi ? `Đã che ${receipt.maskedCount}` : `${receipt.maskedCount} redacted`}</span> : null}
        </div>
      </div>
      <button type="button" aria-label={vi ? 'Đóng biên nhận AI' : 'Dismiss AI receipt'} onClick={() => setReceipt(null)}>×</button>
    </aside>,
    document.body,
  );
}
