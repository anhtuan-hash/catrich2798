import React, { useEffect, useMemo, useRef, useState } from 'react';
import { B2Button } from './B2UI.jsx';
import { V2_TOOL_BRIDGE } from '../toolBridgeRegistry.js';
import { prepareToolRuntimeFrame } from '../toolRuntimeBridge.js';
import { runToolBehaviorContract } from '../toolBehaviorContract.js';

const LEVEL2 = Object.entries(V2_TOOL_BRIDGE)
  .filter(([, meta]) => Number(meta.level || 0) >= 2)
  .map(([slug, meta]) => ({ slug, ...meta }));

export default function B2ToolContractRunner({ onResult, onDone }) {
  const frameRef = useRef(null);
  const timersRef = useRef([]);
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [runId, setRunId] = useState(0);
  const [lastStatus, setLastStatus] = useState('idle');
  const current = LEVEL2[index] || null;
  const progress = useMemo(() => running ? `${Math.min(index + 1, LEVEL2.length)}/${LEVEL2.length}` : `0/${LEVEL2.length}`, [running, index]);

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  }, []);

  const stop = () => {
    clearTimers();
    setRunning(false);
    setLastStatus('stopped');
  };

  const start = () => {
    clearTimers();
    setIndex(0);
    setRunning(true);
    setLastStatus('running');
    setRunId((value) => value + 1);
  };

  const finishCurrent = (slug) => {
    const prepared = prepareToolRuntimeFrame(frameRef.current, slug);
    const result = runToolBehaviorContract(frameRef.current, slug, { level2: prepared.level2 });
    onResult?.(result);

    if (index >= LEVEL2.length - 1) {
      setRunning(false);
      setLastStatus('done');
      onDone?.();
      return;
    }
    setIndex((value) => value + 1);
  };

  const handleLoad = () => {
    if (!running || !current) return;
    clearTimers();
    const first = window.setTimeout(() => prepareToolRuntimeFrame(frameRef.current, current.slug), 650);
    const second = window.setTimeout(() => prepareToolRuntimeFrame(frameRef.current, current.slug), 1350);
    const audit = window.setTimeout(() => finishCurrent(current.slug), 2100);
    timersRef.current = [first, second, audit];
  };

  return (
    <div className="b2-contract-runner" data-status={lastStatus}>
      <div className="b2-contract-runner__copy">
        <strong>{running && current ? `Đang quét: ${current.label}` : lastStatus === 'done' ? 'Đã quét xong Level 2' : 'Contract Runner sẵn sàng'}</strong>
        <small>{running ? `Tool ${progress} · chỉ đọc DOM/runtime, không click hoặc ghi business data.` : 'Runner mở tuần tự 10 runtime trong iframe off-screen và ghi kết quả vào QA ledger.'}</small>
      </div>
      <div className="b2-contract-runner__actions">
        {running ? <B2Button variant="danger" onClick={stop}>Dừng</B2Button> : <B2Button variant="primary" onClick={start}>▶ Run all Level 2</B2Button>}
      </div>
      {running && current ? (
        <iframe
          key={`${current.slug}-${runId}`}
          ref={frameRef}
          className="b2-contract-runner__frame"
          src={`/#/tool/${encodeURIComponent(current.slug)}`}
          title={`Contract runner · ${current.label}`}
          tabIndex={-1}
          aria-hidden="true"
          onLoad={handleLoad}
        />
      ) : null}
    </div>
  );
}
