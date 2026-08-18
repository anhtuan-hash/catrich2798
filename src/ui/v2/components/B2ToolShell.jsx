import React, { useMemo, useRef, useState } from 'react';
import { B2Badge, B2Button } from './B2UI.jsx';
import { getToolBridgeMeta } from '../toolBridgeRegistry.js';
import { applyToolChromeAdapter, hasLevel2ChromeAdapter } from '../toolChromeAdapters.js';
import { applyPhase2ToolChromeAdapter, hasPhase2Level2Adapter } from '../toolChromeAdaptersPhase2.js';
import { runToolBehaviorContract } from '../toolBehaviorContract.js';
import './B2ToolShell.css';

function injectBridgeCleanup(frame) {
  try {
    const doc = frame?.contentDocument;
    if (!doc?.head) return;
    let style = doc.getElementById('b2-v2-bridge-cleanup');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'b2-v2-bridge-cleanup';
      doc.head.appendChild(style);
    }
    style.textContent = `
      .bes-top-chrome,
      .global-flat-navigation,
      .status-menu-bar,
      .brian-briefing-bar,
      .transfer-inbox-banner,
      .site-footer,
      .global-footer,
      footer[role="contentinfo"] { display:none !important; }
      html, body, #root { min-height:100% !important; background:#fff !important; }
      body { margin:0 !important; }
      .app-shell { padding-top:0 !important; min-height:100vh !important; }
      #bes-main-content { margin-top:0 !important; padding-top:0 !important; min-height:100vh !important; }
    `;
  } catch {
    /* Same-origin preview is expected; if auth/navigation changes origin, keep the tool usable without cleanup. */
  }
}

export default function B2ToolShell({ tool, onBack }) {
  const frameRef = useRef(null);
  const surfaceRef = useRef(null);
  const [frameKey, setFrameKey] = useState(0);
  const [state, setState] = useState('loading');
  const [compact, setCompact] = useState(false);
  const [adapterReady, setAdapterReady] = useState(false);
  const [contract, setContract] = useState(null);
  const meta = useMemo(() => getToolBridgeMeta(tool?.slug), [tool?.slug]);
  const title = tool?.titleVi || tool?.title || meta.label || tool?.slug;
  const description = tool?.descVi || tool?.desc || 'Công cụ Brian đang chạy trong Metro Next Tool Shell.';
  const legacyPath = `/#/tool/${encodeURIComponent(tool?.slug || '')}`;
  const level2 = hasLevel2ChromeAdapter(tool?.slug) || hasPhase2Level2Adapter(tool?.slug);

  const reload = () => {
    setState('loading');
    setAdapterReady(false);
    setContract(null);
    setFrameKey((value) => value + 1);
  };

  const openLegacy = () => window.open(legacyPath, '_blank', 'noopener,noreferrer');

  const enterFullscreen = async () => {
    try {
      await surfaceRef.current?.requestFullscreen?.();
    } catch {
      /* Fullscreen remains optional on unsupported browsers. */
    }
  };

  const refreshRuntimeChrome = () => {
    injectBridgeCleanup(frameRef.current);
    if (!level2) return false;
    const phase1Ready = hasLevel2ChromeAdapter(tool?.slug)
      ? applyToolChromeAdapter(frameRef.current, tool?.slug)
      : false;
    const phase2Ready = hasPhase2Level2Adapter(tool?.slug)
      ? applyPhase2ToolChromeAdapter(frameRef.current, tool?.slug)
      : false;
    const ready = phase1Ready || phase2Ready;
    setAdapterReady(ready);
    return ready;
  };

  const auditRuntime = () => {
    const result = runToolBehaviorContract(frameRef.current, tool?.slug, { level2 });
    setContract(result);
    return result;
  };

  const handleLoad = () => {
    refreshRuntimeChrome();
    window.setTimeout(refreshRuntimeChrome, 180);
    window.setTimeout(() => { refreshRuntimeChrome(); auditRuntime(); }, 520);
    window.setTimeout(() => { refreshRuntimeChrome(); auditRuntime(); }, 1450);
    setState('ready');
  };

  const contractTone = contract?.status === 'pass' ? 'green' : contract?.status === 'fail' ? 'red' : contract ? 'amber' : 'neutral';
  const contractLabel = contract ? `Contract ${contract.passCount}/${contract.totalCount}` : 'Contract pending';

  return (
    <section className={`b2-tool-shell ${compact ? 'is-compact' : ''}`} ref={surfaceRef} data-tool-slug={tool?.slug || ''} data-bridge-level={meta.level || 1}>
      <header className="b2-tool-shell__header">
        <div className="b2-tool-shell__identity">
          <button type="button" className="b2-tool-shell__back" onClick={onBack} aria-label="Quay lại">←</button>
          <span className={`b2-tool-shell__mark tone-${meta.tone || tool?.tone || 'blue'}`}>{tool?.icon || String(title).slice(0, 2).toUpperCase()}</span>
          <div>
            <span className="b2-tool-shell__eyebrow">METRO NEXT · TOOL SHELL</span>
            <h1>{title}</h1>
            <p>{description}</p>
          </div>
        </div>
        <div className="b2-tool-shell__badges">
          <B2Badge tone={meta.tested ? 'green' : 'amber'}>{meta.tested ? 'Bridge verified' : 'Bridge preview'}</B2Badge>
          {level2 ? <B2Badge tone={adapterReady ? 'violet' : 'amber'}>{adapterReady ? 'Level 2 chrome' : 'Applying Level 2…'}</B2Badge> : <B2Badge>Level 1 runtime</B2Badge>}
          <B2Badge tone={contractTone}>{contractLabel}</B2Badge>
          <B2Badge tone="blue">V1 logic preserved</B2Badge>
        </div>
      </header>

      <div className="b2-tool-shell__bar">
        <div className="b2-tool-shell__status">
          <span className={`b2-tool-shell__dot is-${state}`} />
          <strong>{state === 'ready' ? 'Công cụ sẵn sàng' : 'Đang tải runtime…'}</strong>
          <small>{meta.family || 'tool'} · same-origin bridge · migration level {meta.level || 1}{contract ? ` · contract ${contract.status}` : ''}</small>
        </div>
        <div className="b2-tool-shell__commands">
          <B2Button variant="ghost" onClick={() => setCompact((value) => !value)}>{compact ? 'Hiện thông tin' : 'Chế độ tập trung'}</B2Button>
          <B2Button variant="ghost" onClick={auditRuntime} disabled={state !== 'ready'}>✓ Recheck</B2Button>
          <B2Button variant="ghost" onClick={reload}>↻ Tải lại</B2Button>
          <B2Button variant="ghost" onClick={openLegacy}>Mở V1 ↗</B2Button>
          <B2Button variant="primary" onClick={enterFullscreen}>Toàn màn hình</B2Button>
        </div>
      </div>

      <div className="b2-tool-shell__runtime">
        {state === 'loading' ? (
          <div className="b2-tool-shell__loading" aria-live="polite">
            <span />
            <strong>Đang nối Metro Next với runtime hiện tại…</strong>
            <small>{level2 ? 'Đang áp dụng V2 chrome adapter; engine và dữ liệu vẫn giữ nguyên.' : 'Business logic, dữ liệu và export/import vẫn do tool V1 xử lý.'}</small>
          </div>
        ) : null}
        <iframe
          key={frameKey}
          ref={frameRef}
          src={legacyPath}
          title={`${title} runtime`}
          onLoad={handleLoad}
          className={state === 'ready' ? 'is-ready' : ''}
          allow="clipboard-read; clipboard-write; fullscreen"
        />
      </div>
    </section>
  );
}
