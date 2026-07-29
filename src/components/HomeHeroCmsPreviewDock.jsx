import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Eye } from 'lucide-react';
import HomeHeroCmsPreview from './HomeHeroCmsPreview.jsx';

export default function HomeHeroCmsPreviewDock({ open, config, language = 'vi', device = 'desktop' }) {
  const [target, setTarget] = useState(null);

  useEffect(() => {
    if (!open) {
      setTarget(null);
      return undefined;
    }

    let frame = 0;
    let stopped = false;
    const resolve = () => {
      if (stopped) return;
      const body = document.querySelector('.hero-editor__body');
      if (body) {
        setTarget(body);
        return;
      }
      frame = window.requestAnimationFrame(resolve);
    };
    resolve();
    return () => {
      stopped = true;
      if (frame) window.cancelAnimationFrame(frame);
      setTarget(null);
    };
  }, [open]);

  if (!open || !target || !config) return null;

  return createPortal(
    <aside className="hero-editor__preview-pane" aria-label="Xem trước Hero trực tiếp">
      <header><span><Eye size={17} /></span><div><strong>Xem trước trực tiếp</strong><small>{device === 'desktop' ? 'Màn hình máy tính' : device === 'tablet' ? 'Máy tính bảng' : 'Điện thoại'}</small></div></header>
      <div className="hero-editor__preview-stage">
        <HomeHeroCmsPreview config={config} language={language} device={device} />
      </div>
      <p>Nội dung, ảnh/video nền, lớp phủ và bố cục được cập nhật ngay khi thay đổi thiết lập.</p>
    </aside>,
    target,
  );
}
