import React, { useEffect, useMemo, useRef, useState } from 'react';
import { B2Button } from './B2UI.jsx';
import { V2_TOOL_BRIDGE } from '../toolBridgeRegistry.js';
import { prepareToolRuntimeFrame } from '../toolRuntimeBridge.js';
import { runToolBehaviorContract } from '../toolBehaviorContract.js';

const BRIDGED = Object.entries(V2_TOOL_BRIDGE)
  .filter(([, meta]) => meta.tested && Number(meta.level || 0) >= 1)
  .map(([slug, meta]) => ({ slug, ...meta }));

export default function B2ToolContractRunner({ onResult, onDone }) {
  const frameRef = useRef(null);
  const timersRef = useRef([]);
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [runId, setRunId] = useState(0);
  const [lastStatus, setLastStatus] = useState('idle');
  const current = BRIDGED[index] || null;
  const progress = useMemo(() => running ? `${Math.min(index + 1, BRIDGED.length)}/${BRIDGED.length}` : `0/${BRIDGED.length}`, [running, index]);

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

    if (index >= BRIDGED.length - 1) {
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
        <strong>{running && current ? `Đang quét: ${current.label}` : lastStatus === 'done' ? 'Đã quét xong toàn bộ bridge' : 'Contract Runner sẵn sàng'}</strong>
        <small>{running ? `Tool ${progress} · Level ${current?.level || 1} · chỉ đọc DOM/runtime, không click hoặc ghi business data.` : `Runner mở tuần tự ${BRIDGED.length} runtime bridge trong iframe off-screen; Level 1 không yêu cầu chrome adapter.`}</small>
      </div>
      <div className="b2-contract-runner__actions">
        {running ? <B2Button variant="danger" onClick={stop}>Dừng</B2Button> : <B2Button variant="primary" onClick={start}>▶ Run all bridges</B2Button>}
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
