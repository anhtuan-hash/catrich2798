import React, { useEffect, useMemo, useRef, useState } from 'react';
import { B2Button } from './B2UI.jsx';
import { V2_QUALITY_ROUTES, auditQualityFrame } from '../quality/qualityAudit.js';

export default function B2RouteQualityRunner({ canOpen = () => true, onResult, onDone }) {
  const frameRef = useRef(null);
  const timersRef = useRef([]);
  const mountedRef = useRef(true);
  const [running, setRunning] = useState(false);
  const [index, setIndex] = useState(0);
  const [runId, setRunId] = useState(0);
  const [lastStatus, setLastStatus] = useState('idle');
  const routes = useMemo(() => V2_QUALITY_ROUTES.filter((route) => canOpen(route)), [canOpen]);
  const current = routes[index] || null;

  const clearTimers = () => {
    timersRef.current.forEach((id) => window.clearTimeout(id));
    timersRef.current = [];
  };

  useEffect(() => () => {
    mountedRef.current = false;
    clearTimers();
  }, []);

  const stop = () => {
    clearTimers();
    setRunning(false);
    setLastStatus('stopped');
  };

  const start = () => {
    if (!routes.length) return;
    clearTimers();
    mountedRef.current = true;
    setIndex(0);
    setRunning(true);
    setLastStatus('running');
    setRunId((value) => value + 1);
  };

  const finishCurrent = (route) => {
    if (!mountedRef.current || !running) return;
    clearTimers();
    const result = auditQualityFrame(frameRef.current, route);
    onResult?.(result);
    if (index >= routes.length - 1) {
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
    const audit = window.setTimeout(() => finishCurrent(current), 2100);
    timersRef.current = [audit];
  };

  const progress = running ? `${Math.min(index + 1, routes.length)}/${routes.length}` : `0/${routes.length}`;

  return (
    <div className="b2-quality-runner" data-status={lastStatus}>
      <div>
        <strong>{running && current ? `Đang audit: ${current}` : lastStatus === 'done' ? 'Route quality audit hoàn tất' : 'Route quality runner sẵn sàng'}</strong>
        <small>{running ? `${progress} · accessibility + performance heuristics, không mutate dữ liệu.` : `${routes.length} route được phép sẽ chạy tuần tự trong iframe off-screen.`}</small>
      </div>
      {running ? <B2Button variant="danger" onClick={stop}>Dừng</B2Button> : <B2Button variant="primary" onClick={start} disabled={!routes.length}>▶ Audit routes</B2Button>}
      {running && current ? (
        <iframe
          key={`${current}-${runId}`}
          ref={frameRef}
          className="b2-quality-runner__frame"
          src={`/preview-ui-v2.html?qa=route-quality#${current}`}
          title={`Quality audit · ${current}`}
          tabIndex={-1}
          aria-hidden="true"
          onLoad={handleLoad}
        />
      ) : null}
    </div>
  );
}
