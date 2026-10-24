import React, { useEffect, useState } from 'react';
import { resolveFocusSceneMedia } from './focusSceneService.js';

export default function FocusSceneBackground({ scene, language = 'vi', motionEnabled = true }) {
  const [media, setMedia] = useState({ src: '', html: '' });
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (scene.mediaType === 'default') {
      setMedia({ src: '', html: '' });
      setFailed(false);
      return undefined;
    }
    let active = true;
    const load = () => resolveFocusSceneMedia(scene)
      .then(next => {
        if (active) { setMedia(next); setFailed(false); }
      })
      .catch(() => { if (active) setFailed(true); });
    load();
    // Refresh short-lived signed links for very long active Focus sessions.
    const timer = window.setInterval(load, 50 * 60 * 1000);
    return () => { active = false; window.clearInterval(timer); };
  }, [scene.mediaType, scene.mediaPath]);

  if (scene.mediaType === 'default') return null;
  const dim = Math.max(0, Math.min(85, scene.dimPercent || 0)) / 100;
  const fit = scene.mediaFit === 'contain' ? 'contain' : 'cover';

  return (
    <div className="bfc-scene-background" aria-hidden="true">
      {scene.mediaType === 'image' && media.src &&
        <img className="bfc-scene-background__media" src={media.src} alt=""
          style={{ objectFit: fit }} onError={() => setFailed(true)} />}
      {scene.mediaType === 'video' && media.src &&
        <video className="bfc-scene-background__media" src={media.src}
          autoPlay={motionEnabled} muted loop playsInline preload="auto" controls={false}
          style={{ objectFit: fit }} onError={() => setFailed(true)} />}
      {scene.mediaType === 'html' && media.html &&
        <iframe className="bfc-scene-background__media bfc-scene-background__html"
          title={language === 'vi' ? 'Nền HTML cách ly' : 'Sandboxed HTML scene'}
          tabIndex={-1} sandbox="allow-scripts" referrerPolicy="no-referrer"
          srcDoc={media.html}/>}
      <div className="bfc-scene-background__shade" style={{ backgroundColor: 'rgba(2, 8, 22, ' + dim + ')' }} />
      {failed && <span className="bfc-scene-background__error">
        {language === 'vi' ? 'Không tải được nền dùng chung' : 'Shared background unavailable'}
      </span>}
    </div>
  );
}
