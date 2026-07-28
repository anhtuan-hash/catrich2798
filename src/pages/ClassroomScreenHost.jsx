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
      aria-label="Brian Classroom Stage"
      style={{
        position: 'fixed', inset: 0, zIndex: 22000, display: 'flex', flexDirection: 'column',
        background: '#eaf4ff', color: '#17324d', fontFamily: 'var(--bes-font-personal), Inter, system-ui, sans-serif',
      }}
    >
      <header style={{
        height: 46, flex: '0 0 46px', display: 'flex', alignItems: 'center', gap: 12,
        padding: '0 12px', background: 'rgba(255,255,255,.92)', borderBottom: '1px solid #c8dced',
        boxShadow: '0 2px 12px rgba(66,133,244,.12)', backdropFilter: 'blur(14px)',
      }}>
        <button type="button" onClick={() => { window.location.hash = '#/apps'; }} style={buttonStyle}>
          ← {vi ? 'Trở về Brian' : 'Back to Brian'}
        </button>
        <div style={{ minWidth: 0, flex: 1 }}>
          <strong style={{ display: 'block', fontSize: 15 }}>Brian Classroom Stage</strong>
          <small style={{ color: '#617a92' }}>{vi ? 'Tích hợp nội bộ · Không AI · Dữ liệu trên máy' : 'Built into Brian · No AI · Local data'}</small>
        </div>
        <button type="button" onClick={toggleFullscreen} style={buttonStyle}>
          {fullscreen ? '⤢' : '⛶'} {fullscreen ? (vi ? 'Thoát toàn màn hình' : 'Exit full screen') : (vi ? 'Toàn màn hình' : 'Full screen')}
        </button>
      </header>
      <div style={{ position: 'relative', flex: 1, minHeight: 0, background: '#eaf4ff' }}>
        {loading ? (
          <div style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', zIndex: 2, background: '#eaf4ff' }}>
            <strong>{vi ? 'Đang mở Brian Classroom Stage…' : 'Opening Brian Classroom Stage…'}</strong>
          </div>
        ) : null}
        <iframe
          src="/classroom-screen/?embed=1"
          title="Brian Classroom Stage"
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
  border: '1px solid #b8d5ff', borderRadius: 999, background: '#fff', color: '#17324d',
  minHeight: 34, padding: '6px 12px', fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
  boxShadow: '0 3px 10px rgba(66,133,244,.12)',
};
