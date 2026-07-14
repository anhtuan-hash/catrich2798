import React, { useEffect, useState } from 'react';
import { activatePwaUpdate, getPwaState, subscribePwaState } from '../utils/pwa.js';

export default function PwaUpdateBanner({ language = 'vi' }) {
  const [state, setState] = useState(getPwaState());
  useEffect(() => subscribePwaState(setState), []);
  if (!state.updateReady) return null;
  return (
    <aside className="bes-pwa-update" role="status">
      <strong>{language === 'vi' ? 'Đã có bản Brian English mới' : 'A new Brian English version is ready'}</strong>
      <button type="button" onClick={activatePwaUpdate}>{language === 'vi' ? 'Cập nhật' : 'Update'}</button>
    </aside>
  );
}
