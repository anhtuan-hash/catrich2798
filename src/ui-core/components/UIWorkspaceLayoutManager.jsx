import React, { useEffect, useMemo, useState } from 'react';
import '../styles/workspace-layout.css';
import { loadWorkspace } from '../../utils/workspace.js';
import { UIOverlayPortal, UIOverlaySurface } from './UIOverlays.jsx';
import {
  WORKSPACE_LAYOUT_EVENT,
  WORKSPACE_LAYOUT_OPEN_EVENT,
  loadWorkspaceLayout,
  saveWorkspaceLayout,
} from '../runtime/workspaceLayout.js';

function embedUrl(target) {
  if (typeof window === 'undefined' || !String(target || '').startsWith('#/')) return '';
  const url = new URL(window.location.href);
  url.searchParams.set('embed', '1');
  url.hash = target;
  return url.toString();
}

export default function UIWorkspaceLayoutManager({ currentUser, language = 'vi', currentTarget = '' }) {
  const [open, setOpen] = useState(false);
  const [layout, setLayout] = useState(() => loadWorkspaceLayout(currentUser));
  const [workspace, setWorkspace] = useState(() => loadWorkspace(currentUser));
  const copy = language === 'vi' ? {
    title: 'Bố cục không gian', subtitle: 'Làm việc tập trung hoặc mở hai ứng dụng song song.',
    single: 'Một cửa sổ', split: 'Chia đôi', focus: 'Tập trung', side: 'Vị trí cửa sổ phụ', left: 'Bên trái', right: 'Bên phải',
    ratio: 'Độ rộng cửa sổ phụ', choose: 'Chọn ứng dụng thứ hai', close: 'Đóng', apply: 'Áp dụng', clear: 'Tắt chia đôi',
    empty: 'Hãy mở thêm ít nhất một ứng dụng để dùng Chia đôi.', current: 'Đang mở',
  } : {
    title: 'Workspace layout', subtitle: 'Stay focused or work in two apps side by side.',
    single: 'Single pane', split: 'Split view', focus: 'Focus mode', side: 'Secondary pane position', left: 'Left', right: 'Right',
    ratio: 'Secondary pane width', choose: 'Choose second app', close: 'Close', apply: 'Apply', clear: 'Disable split view',
    empty: 'Open at least one more app to use Split View.', current: 'Current',
  };

  useEffect(() => { setLayout(loadWorkspaceLayout(currentUser)); setWorkspace(loadWorkspace(currentUser)); }, [currentUser?.id, currentUser?.email]);
  useEffect(() => { document.documentElement.dataset.brianFocus = layout.focusMode ? 'true' : 'false'; return () => { delete document.documentElement.dataset.brianFocus; }; }, [layout.focusMode]);
  useEffect(() => {
    const onOpen = () => { setWorkspace(loadWorkspace(currentUser)); setLayout(loadWorkspaceLayout(currentUser)); setOpen(true); };
    const onUpdate = (event) => setLayout(event?.detail || loadWorkspaceLayout(currentUser));
    window.addEventListener(WORKSPACE_LAYOUT_OPEN_EVENT, onOpen);
    window.addEventListener(WORKSPACE_LAYOUT_EVENT, onUpdate);
    return () => { window.removeEventListener(WORKSPACE_LAYOUT_OPEN_EVENT, onOpen); window.removeEventListener(WORKSPACE_LAYOUT_EVENT, onUpdate); };
  }, [currentUser?.id, currentUser?.email]);

  const candidates = useMemo(() => workspace.tabs.filter((tab) => tab.target !== currentTarget), [workspace.tabs, currentTarget]);
  const selected = candidates.find((tab) => tab.target === layout.secondaryTarget);
  const update = (patch) => setLayout((value) => ({ ...value, ...patch }));
  const apply = () => { saveWorkspaceLayout(currentUser, layout); setOpen(false); };

  return (
    <>
      {layout.mode === 'split' && layout.secondaryTarget ? (
        <aside
          className={`bui-split-pane is-${layout.side}`}
          style={{ '--bui-split-ratio': `${layout.ratio}%` }}
          data-ui="split-pane"
          aria-label={selected?.titleVi || selected?.title || copy.split}
        >
          <header className="bui-split-pane-header">
            <strong>{language === 'vi' ? (selected?.titleVi || layout.secondaryTitle) : (selected?.title || layout.secondaryTitle)}</strong>
            <div>
              <button type="button" onClick={() => setOpen(true)} aria-label={copy.title}>⚙</button>
              <button type="button" onClick={() => saveWorkspaceLayout(currentUser, { ...layout, mode: 'single', secondaryTarget: '' })} aria-label={copy.clear}>×</button>
            </div>
          </header>
          <iframe title={selected?.title || copy.split} src={embedUrl(layout.secondaryTarget)} loading="lazy" />
        </aside>
      ) : null}

      {open ? (
        <UIOverlayPortal>
          <UIOverlaySurface className="bui-layout-manager" onClose={() => setOpen(false)} ariaLabel={copy.title}>
            <div className="bui-layout-manager-head"><div><h2>{copy.title}</h2><p>{copy.subtitle}</p></div><button type="button" onClick={() => setOpen(false)}>×</button></div>
            <div className="bui-layout-mode-grid">
              <button type="button" className={layout.mode === 'single' ? 'is-active' : ''} onClick={() => update({ mode: 'single' })}><span>▣</span><strong>{copy.single}</strong></button>
              <button type="button" className={layout.mode === 'split' ? 'is-active' : ''} onClick={() => update({ mode: 'split' })}><span>◫</span><strong>{copy.split}</strong></button>
              <button type="button" className={layout.focusMode ? 'is-active' : ''} onClick={() => update({ focusMode: !layout.focusMode })}><span>◎</span><strong>{copy.focus}</strong></button>
            </div>
            {layout.mode === 'split' ? <>
              <label className="bui-layout-field"><span>{copy.choose}</span><select value={layout.secondaryTarget} onChange={(event) => { const tab = candidates.find((item) => item.target === event.target.value); update({ secondaryTarget: event.target.value, secondaryTitle: language === 'vi' ? tab?.titleVi : tab?.title }); }}><option value="">—</option>{candidates.map((tab) => <option key={tab.id} value={tab.target}>{language === 'vi' ? tab.titleVi : tab.title}</option>)}</select></label>
              {!candidates.length ? <p className="bui-layout-empty">{copy.empty}</p> : null}
              <div className="bui-layout-row"><label><span>{copy.side}</span><select value={layout.side} onChange={(event) => update({ side: event.target.value })}><option value="left">{copy.left}</option><option value="right">{copy.right}</option></select></label><label><span>{copy.ratio}: {layout.ratio}%</span><input type="range" min="30" max="70" step="2" value={layout.ratio} onChange={(event) => update({ ratio: Number(event.target.value) })} /></label></div>
            </> : null}
            <div className="bui-layout-actions"><button type="button" className="secondary" onClick={() => setOpen(false)}>{copy.close}</button><button type="button" className="primary" onClick={apply} disabled={layout.mode === 'split' && !layout.secondaryTarget}>{copy.apply}</button></div>
          </UIOverlaySurface>
        </UIOverlayPortal>
      ) : null}
    </>
  );
}
