import React, { useEffect, useState } from 'react';
import { activatePwaUpdate, getPwaState, subscribePwaState } from '../utils/pwa.js';

export default function PwaUpdateBanner({ language = 'vi' }) {
  const [state, setState] = useState(getPwaState());
  useEffect(() => subscribePwaState(setState), []);
  if (!state.updateReady && !state.refreshNeeded) return null;

  const refreshOnly = state.refreshNeeded && !state.updateReady;
  return (
    <aside className="bes-pwa-update" role="status">
      <strong>{language === 'vi'
        ? (refreshOnly ? 'Brian cần đồng bộ lại phiên bản' : 'Đã có bản Brian English mới')
        : (refreshOnly ? 'Brian needs a version refresh' : 'A new Brian English version is ready')}</strong>
      <button type="button" onClick={activatePwaUpdate}>{language === 'vi'
        ? (refreshOnly ? 'Tải lại' : 'Cập nhật')
        : (refreshOnly ? 'Reload' : 'Update')}</button>
    </aside>
  );
}
