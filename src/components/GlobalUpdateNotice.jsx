import React, { useEffect, useState } from 'react';
import { RELEASE_INFO } from '../data/release.js';

const SEEN_KEY = 'bes-release-notice-seen';

export default function GlobalUpdateNotice({ language = 'vi', currentUser }) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (!currentUser) return;
    try { setVisible(localStorage.getItem(SEEN_KEY) !== RELEASE_INFO.version); } catch { setVisible(false); }
  }, [currentUser?.id, currentUser?.email]);
  if (!visible) return null;
  const dismiss = () => { try { localStorage.setItem(SEEN_KEY, RELEASE_INFO.version); } catch { /* optional */ } setVisible(false); };
  return (
    <aside className="bes-update-notice" role="status">
      <span>↑</span>
      <div><strong>{language === 'vi' ? `Đã cập nhật V${RELEASE_INFO.version}` : `Updated to V${RELEASE_INFO.version}`}</strong><small>{language === 'vi' ? 'Release Guard, Feature Flags, Upload Security và Update Center đã sẵn sàng.' : 'Release Guard, Feature Flags, Upload Security and Update Center are ready.'}</small></div>
      {currentUser?.role === 'admin' ? <button type="button" onClick={() => { dismiss(); window.location.hash = '#/updates'; }}>{language === 'vi' ? 'Xem' : 'View'}</button> : null}
      <button type="button" className="close" onClick={dismiss} aria-label={language === 'vi' ? 'Đóng' : 'Close'}>×</button>
    </aside>
  );
}
