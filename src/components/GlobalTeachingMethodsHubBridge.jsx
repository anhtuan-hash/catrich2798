import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import TeachingMethodsHub from '../pages/TeachingMethodsHub.jsx';
import './GlobalTeachingMethodsHubBridge.css';

export default function GlobalTeachingMethodsHubBridge({ route = 'home', language = 'vi' }) {
  const [host, setHost] = useState(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const findHost = () => setHost(document.querySelector('.tdb-page'));
    findHost();
    const observer = new MutationObserver(findHost);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [route]);

  useEffect(() => {
    if (!open) return undefined;
    const previous = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    const close = (event) => { if (event.key === 'Escape') setOpen(false); };
    window.addEventListener('keydown', close);
    return () => {
      document.documentElement.style.overflow = previous;
      window.removeEventListener('keydown', close);
    };
  }, [open]);

  if (route !== 'dashboard' || !host) return null;

  return (
    <>
      {createPortal(
        <section className="tdb-methods-entry" aria-label="Hub Phương pháp giảng dạy tiếng Anh">
          <div className="tdb-methods-entry-copy">
            <span>PHÁT TRIỂN CHUYÊN MÔN</span>
            <h2>Phương pháp giảng dạy tiếng Anh</h2>
            <p>Lý thuyết cốt lõi, quy trình triển khai, hoạt động mẫu và lưu ý để thiết kế một tiết học tích cực.</p>
            <div className="tdb-methods-tags"><i>CLT</i><i>TBLT</i><i>PBL</i><i>CLIL</i><i>Formative</i></div>
            <button type="button" onClick={() => setOpen(true)}>Mở hub phương pháp <b aria-hidden="true">→</b></button>
          </div>
          <div className="tdb-methods-entry-visual" aria-hidden="true">
            <div className="tdb-methods-mini-board"><small>ACTIVE LEARNING</small><strong>PLAN</strong><em>ENGAGE</em><span>REFLECT</span></div>
            <i className="bubble b1">💬</i><i className="bubble b2">✓</i><i className="bubble b3">◆</i>
            <div className="learners"><span/><span/><span/></div>
          </div>
        </section>,
        host,
      )}
      {open ? createPortal(
        <div className="tmh-overlay" role="dialog" aria-modal="true" aria-label="Hub Phương pháp giảng dạy tiếng Anh">
          <div className="tmh-overlay-bar">
            <div><span>ENGLISH HUB</span><strong>Phương pháp giảng dạy tiếng Anh</strong></div>
            <button type="button" onClick={() => setOpen(false)} aria-label="Đóng hub">×</button>
          </div>
          <div className="tmh-overlay-scroll"><TeachingMethodsHub language={language} /></div>
        </div>,
        document.body,
      ) : null}
    </>
  );
}
