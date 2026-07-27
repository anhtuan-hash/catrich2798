import React, { useEffect, useRef, useState } from 'react';

export default function ClassroomScreenHost({ language = 'vi' }) {
  const stageRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const vi = language === 'vi';

  useEffect(() => {
    const sync = () => setFullscreen(document.fullscreenElement === stageRef.current);
    document.addEventListener('fullscreenchange', sync);
    return () => document.removeEventListener('fullscreenchange', sync);
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stageRef.current?.requestFullscreen?.();
    } catch (error) {
      console.warn('[ClassroomScreenHost] Fullscreen unavailable', error);
    }
  };

  return (
    <section
      ref={stageRef}
      aria-label={vi ? 'Classroom Screen' : 'Classroom Screen'}
      style={{
        position: 'fixed', inset: 0, zIndex: 22000, display: 'flex', flexDirection: 'column',
        background: '#eef2f7', color: '#172033', fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <header style={{
        height: 54, flex: '0 0 54px', display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 14px', background: '#ffffff', borderBottom: '1px solid #d9e1ea',
        boxShadow: '0 2px 10px rgba(15,23,42,.08)',
      }}>
        <button type="button" onClick={() => { window.location.hash = '#/apps'; }} style={buttonStyle}>
          ← {vi ? 'Trở về Brian' : 'Back to Brian'}
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={{ display: 'block', fontSize: 16 }}>Classroom Screen</strong>
          <small style={{ color: '#667085' }}>{vi ? 'Ứng dụng nội bộ của Brian' : 'Built into Brian'}</small>
        </div>
        <button type="button" onClick={toggleFullscreen} style={buttonStyle}>
          {fullscreen ? '⤢' : '⛶'} {fullscreen ? (vi ? 'Thoát toàn màn hình' : 'Exit full screen') : (vi ? 'Toàn màn hình' : 'Full screen')}
        </button>
      </header>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, background: '#f4f7fb' }}>
        {loading ? (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 2, background: '#f4f7fb' }}>
            <strong>{vi ? 'Đang mở Classroom Screen…' : 'Opening Classroom Screen…'}</strong>
          </div>
        ) : null}
        <iframe
          src="/classroom-screen/index.html?embed=1"
          title="Classroom Screen"
          allow="fullscreen; autoplay; camera; microphone; clipboard-read; clipboard-write; display-capture"
          allowFullScreen
          onLoad={() => setLoading(false)}
          style={{ width: '100%', height: '100%', border: 0, display: 'block', background: '#fff' }}
        />
      </div>
    </section>
  );
}

const buttonStyle = {
  border: '1px solid #cfd8e3', borderRadius: 10, background: '#fff', color: '#172033',
  minHeight: 36, padding: '7px 12px', fontWeight: 700, cursor: 'pointer', whiteSpace: 'nowrap',
};
