import React, { useEffect, useMemo, useRef, useState } from 'react';
import { B2Badge, B2Button } from './B2UI.jsx';
import { V2_VIEWPORT_PRESETS, setViewportReviewed } from '../quality/qualityAudit.js';

const PREVIEW_ROUTES = [
  { id: 'home', label: 'Home' },
  { id: 'resources', label: 'Resources' },
  { id: 'students', label: 'Students' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'news', label: 'News' },
  { id: 'tool/classroom-screen', label: 'Classroom Stage' },
];

export default function B2ViewportHarness({ ledger = { viewports: {} }, canOpen = () => true, onReview }) {
  const hostRef = useRef(null);
  const [presetId, setPresetId] = useState(V2_VIEWPORT_PRESETS[0].id);
  const [route, setRoute] = useState('home');
  const [scale, setScale] = useState(1);
  const preset = V2_VIEWPORT_PRESETS.find((item) => item.id === presetId) || V2_VIEWPORT_PRESETS[0];
  const routes = useMemo(() => PREVIEW_ROUTES.filter((item) => canOpen(item.id)), [canOpen]);
  const reviewed = Boolean(ledger?.viewports?.[preset.id]?.reviewed);

  useEffect(() => {
    if (!routes.some((item) => item.id === route)) setRoute(routes[0]?.id || 'home');
  }, [routes, route]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return undefined;
    const update = () => {
      const width = Math.max(280, host.clientWidth - 24);
      const heightLimit = 640;
      const next = Math.min(1, width / preset.width, heightLimit / preset.height);
      setScale(Math.max(.12, next));
    };
    update();
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update);
      return () => window.removeEventListener('resize', update);
    }
    const observer = new ResizeObserver(update);
    observer.observe(host);
    return () => observer.disconnect();
  }, [preset.width, preset.height]);

  const toggleReview = () => {
    const next = setViewportReviewed(preset.id, !reviewed);
    onReview?.(next);
  };

  return (
    <div className="b2-viewport-harness">
      <div className="b2-viewport-controls">
        <div className="b2-viewport-presets">
          {V2_VIEWPORT_PRESETS.map((item) => (
            <button key={item.id} type="button" className={preset.id === item.id ? 'is-active' : ''} onClick={() => setPresetId(item.id)}>
              <strong>{item.label}</strong><small>{item.width}×{item.height}</small>
              {ledger?.viewports?.[item.id]?.reviewed ? <span>✓</span> : null}
            </button>
          ))}
        </div>
        <div className="b2-viewport-routebar">
          <label>Route mẫu<select value={route} onChange={(event) => setRoute(event.target.value)}>{routes.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <B2Badge tone={reviewed ? 'green' : 'amber'}>{reviewed ? 'SIMULATED REVIEWED' : 'NOT REVIEWED'}</B2Badge>
          <B2Button variant={reviewed ? 'ghost' : 'primary'} onClick={toggleReview}>{reviewed ? 'Bỏ xác nhận' : '✓ Đã kiểm tra viewport này'}</B2Button>
        </div>
      </div>
      <div className="b2-viewport-stage" ref={hostRef}>
        <div className="b2-viewport-stage__frame" style={{ width: preset.width * scale, height: preset.height * scale }}>
          <iframe
            key={`${preset.id}-${route}`}
            src={`/preview-ui-v2.html?qa=viewport&device=${encodeURIComponent(preset.id)}#${route}`}
            title={`${preset.label} preview · ${route}`}
            style={{ width: preset.width, height: preset.height, transform: `scale(${scale})` }}
          />
        </div>
      </div>
      <p className="b2-viewport-note"><strong>{preset.label}</strong> · {preset.note}. Đây là mô phỏng CSS viewport để bắt layout regression; không thay thế kiểm thử Safari/iPadOS, touch hardware, TV scaling hoặc khoảng cách xem thực tế.</p>
    </div>
  );
}
