import React, { useEffect, useRef, useState } from 'react';
import { startMotionDiagnosticCapture } from '../../performance/motionDiagnostics.js';
import { getWebVitalsSnapshot } from '../../utils/webVitals.js';
import { getGlobalMotionConfig } from '../../utils/globalMotionSystem.js';
import './BrianPerformanceMonitor.css';

function downloadDiagnostic(report) {
  if (!report || typeof document === 'undefined') return;
  // The report contains only numeric timings, a generic route group and motion config.
  // Never export URL, email, student data, user ID, query parameters or DOM content.
  const file = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'brian-bmpe-motion-lab.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function Metric({ label, value, unit = '' }) {
  return <div className="bmpe-metric"><small>{label}</small><strong>{value == null ? '—' : value}<em>{value == null ? '' : unit}</em></strong></div>;
}

export default function BrianPerformanceMonitor({ language = 'vi' }) {
  const vi = language !== 'en';
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState(null);
  const sampler = useRef(null);
  const mounted = useRef(false);

  useEffect(() => {
    mounted.current = true;
    return () => {
      // Stop and release observers/rAF without setting state after unmount.
      mounted.current = false;
      sampler.current?.stop();
      sampler.current = null;
    };
  }, []);

  const start = () => {
    sampler.current?.stop();
    setReport(null);
    setRunning(true);
    const motion = getGlobalMotionConfig();
    sampler.current = startMotionDiagnosticCapture({
      durationMs: 8500,
      onComplete: (result) => {
        if (!mounted.current) return;
        const snapshot = getWebVitalsSnapshot();
        setReport({
          ...result,
          motionPreset: motion.preset,
          motionSpeed: motion.speed,
          viewportBand: window.innerWidth <= 680 ? 'phone' : window.innerWidth <= 1100 ? 'tablet' : 'desktop',
          // These are NOT certified p75 Core Web Vitals. Keep the labels honest.
          officialCoreWebVitalsSinglePage: {
            lcpMs: snapshot.lcp,
            cls: snapshot.cls,
            inpMs: snapshot.inp,
            algorithm: snapshot.library,
            availability: snapshot.cwvStatus,
            populationP75: false,
          },
        });
        setRunning(false);
      },
    });
  };

  const stop = () => {
    sampler.current?.stop();
  };

  return (
    <section className="bmpe-monitor" aria-label={vi ? 'Bộ kiểm tra chuyển động Brian' : 'Brian motion diagnostics'}>
      <div className="bmpe-monitor__heading">
        <div><span>BMPE · LOCAL LAB</span>
          <h3>{vi ? 'Kiểm tra độ mượt của thiết bị này' : 'Measure smoothness on this device'}</h3>
          <p>{vi ? 'Đo theo yêu cầu, không thu thập dữ liệu học sinh và không gửi kết quả lên máy chủ.' : 'Opt-in measurement; no student data collected or sent to a server.'}</p>
        </div>
        <span className="bmpe-monitor__chip">{running ? (vi ? 'Đang đo' : 'Measuring') : (vi ? 'Sẵn sàng' : 'Ready')}</span>
      </div>
      <div className="bmpe-monitor__actions">
        <button type="button" onClick={start} disabled={running}>{vi ? 'Đo chuyển động 8,5 giây' : 'Measure for 8.5 seconds'}</button>
        <button type="button" onClick={stop} disabled={!running}>{vi ? 'Dừng đo' : 'Stop'}</button>
        <button type="button" onClick={() => downloadDiagnostic(report)} disabled={!report}>{vi ? 'Xuất báo cáo JSON' : 'Export JSON'}</button>
      </div>
      <div className="bmpe-monitor__metrics" aria-live="polite">
        <Metric label="Frame p50" value={report?.frameIntervalP50Ms} unit="ms" />
        <Metric label="Frame p95" value={report?.frameIntervalP95Ms} unit="ms" />
        <Metric label={vi ? 'Frame hụt (ước tính)' : 'Missed frames (estimate)'} value={report?.missedFramesApprox} />
        <Metric label={vi ? 'Long tasks' : 'Long tasks'} value={report?.longTaskCount} />
      </div>
      {report && <p className="bmpe-monitor__note" role="status">{vi
        ? `Đã lấy ${report.visibleFrameSamples} khoảng frame trong ${report.sampledDurationMs} ms. ${report.pageWasHidden ? 'Có lúc tab bị ẩn; phép đo cần được lặp lại.' : 'Tab hiển thị liên tục.'}`
        : `Captured ${report.visibleFrameSamples} frame intervals over ${report.sampledDurationMs} ms. ${report.pageWasHidden ? 'Tab was hidden during capture; repeat measurement.' : 'Tab remained visible.'}`}</p>}
      <p className="bmpe-monitor__disclaimer">{vi
        ? 'Đây chỉ là mẫu rAF trong trình duyệt, không phải số FPS GPU hay điểm Core Web Vitals chính thức. Muốn chứng nhận phát hành vẫn cần trace trên Safari/Edge thực và dữ liệu LCP/INP/CLS đạt chuẩn.'
        : 'This rAF sample is not GPU FPS or official Core Web Vitals. Release certification still requires controlled Safari/Edge tracing and valid LCP/INP/CLS measurements.'}</p>
    </section>
  );
}
