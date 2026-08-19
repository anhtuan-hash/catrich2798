import React, { useEffect, useMemo, useRef, useState } from 'react';
import { B2Button } from './B2UI.jsx';
import { V2_TOOL_BRIDGE } from '../toolBridgeRegistry.js';
import { prepareToolRuntimeFrame } from '../toolRuntimeBridge.js';
import { runToolBehaviorContract } from '../toolBehaviorContract.js';

const BRIDGED = Object.entries(V2_TOOL_BRIDGE)
  .filter(([, meta]) => meta.tested && Number(meta.level || 0) >= 1)
  .map(([slug, meta]) => ({ slug, ...meta }));
const TOOL_WATCHDOG_MS = 12_000;

export default function B2ToolContractRunner({ onResult, onDone }) {
  const frameRef = useRef(null);
  const timersRef = useRef([]);
  const watchdogRef = useRef(null);
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

  const clearWatchdog = () => {
    if (watchdogRef.current) window.clearTimeout(watchdogRef.current);
    watchdogRef.current = null;
  };

  useEffect(() => () => {
    clearTimers();
    clearWatchdog();
  }, []);

  const stop = () => {
    clearTimers();
    clearWatchdog();
    setRunning(false);
    setLastStatus('stopped');
  };

  const start = () => {
    clearTimers();
    clearWatchdog();
    setIndex(0);
    setRunning(true);
    setLastStatus('running');
    setRunId((value) => value + 1);
  };

  const finishCurrent = (slug, { timedOut = false } = {}) => {
    clearTimers();
    clearWatchdog();
    const prepared = prepareToolRuntimeFrame(frameRef.current, slug);
    const result = runToolBehaviorContract(frameRef.current, slug, { level2: prepared.level2 });
    onResult?.(result);

    if (index >= BRIDGED.length - 1) {
      setRunning(false);
      setLastStatus(timedOut ? 'done-with-failures' : 'done');
      onDone?.();
      return;
    }
    setIndex((value) => value + 1);
    setLastStatus(timedOut ? 'running-after-timeout' : 'running');
  };

  useEffect(() => {
    clearWatchdog();
    if (!running || !current) return undefined;
    watchdogRef.current = window.setTimeout(() => finishCurrent(current.slug, { timedOut: true }), TOOL_WATCHDOG_MS);
    return clearWatchdog;
  }, [running, index, runId]);

  const handleLoad = () => {
    if (!running || !current) return;
    clearTimers();
    clearWatchdog();
    const first = window.setTimeout(() => prepareToolRuntimeFrame(frameRef.current, current.slug), 650);
    const second = window.setTimeout(() => prepareToolRuntimeFrame(frameRef.current, current.slug), 1350);
    const audit = window.setTimeout(() => finishCurrent(current.slug), 2100);
    timersRef.current = [first, second, audit];
  };

  return (
    <div className="b2-contract-runner" data-status={lastStatus}>
      <div className="b2-contract-runner__copy">
        <strong>{running && current ? `Đang quét: ${current.label}` : lastStatus.startsWith('done') ? 'Đã quét xong toàn bộ bridge' : 'Contract Runner sẵn sàng'}</strong>
        <small>{running ? `Tool ${progress} · Level ${current?.level || 2} · watchdog ${TOOL_WATCHDOG_MS / 1000}s · chỉ đọc DOM/runtime.` : `Runner mở tuần tự ${BRIDGED.length} Level-2 runtime trong iframe off-screen; timeout được ghi FAIL qua route/mount/adapter contract thay vì treo runner.`}</small>
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
