import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';

export default function GlobalAIIndicator({ active = false, language = 'vi', label = '', provider = '' }) {
  const [portalTarget, setPortalTarget] = useState(() => (
    typeof document === 'undefined' ? null : (document.fullscreenElement || document.body)
  ));

  useEffect(() => {
    const syncTarget = () => setPortalTarget(document.fullscreenElement || document.body);
    syncTarget();
    document.addEventListener('fullscreenchange', syncTarget);
    return () => document.removeEventListener('fullscreenchange', syncTarget);
  }, []);

  if (!active || !portalTarget) return null;
  const isVi = language === 'vi';
  const title = label || (isVi ? 'AI đang xử lý nội dung...' : 'AI is processing your content...');

  return createPortal(
    <div className="global-ai-indicator" role="status" aria-live="assertive" aria-busy="true">
      <div className="global-ai-indicator-backdrop" />
      <section className="global-ai-indicator-card">
        <div className="global-ai-orbit" aria-hidden="true">
          <span className="global-ai-chip">AI</span>
          <i className="orbit-dot dot-a" />
          <i className="orbit-dot dot-b" />
          <i className="orbit-dot dot-c" />
        </div>
        <div className="global-ai-indicator-copy">
          <span className="global-ai-kicker">Brian English AI</span>
          <h2>{title}</h2>
          <p>
            {isVi
              ? 'Hệ thống đang phân tích yêu cầu, tạo nội dung và kiểm tra định dạng đầu ra. Vui lòng giữ nguyên trang này.'
              : 'The system is analysing your request, generating content and validating the output format. Please keep this page open.'}
          </p>
          {provider ? <small>{isVi ? 'Nhà cung cấp' : 'Provider'}: {provider}</small> : null}
        </div>
        <div className="global-ai-progress-track" aria-hidden="true"><span /></div>
        <div className="global-ai-progress-steps" aria-hidden="true">
          <span className="active">1</span><b>{isVi ? 'Phân tích' : 'Analyse'}</b>
          <span>2</span><b>{isVi ? 'Tạo nội dung' : 'Generate'}</b>
          <span>3</span><b>{isVi ? 'Hoàn thiện' : 'Finalise'}</b>
        </div>
      </section>
    </div>,
    portalTarget,
  );
}
