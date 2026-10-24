import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, Pause, Play, Volume2, VolumeX, Youtube } from 'lucide-react';
import {
  buildFocusYoutubeEmbedUrl, commandFocusYoutubePlayer, videoIdFromFocusPath,
} from './focusYoutube.js';

/**
 * YouTube is a cross-origin player in the *background*.
 * The floating controls are outside the aria-hidden visual layer, so every
 * account can start/pause/unmute the shared video independently.
 */
export default function FocusYoutubeBackground({ scene, language = 'vi' }) {
  const vi = language !== 'en';
  const frameRef = useRef(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const id = videoIdFromFocusPath(scene?.mediaPath);
  const src = useMemo(() => id
    ? buildFocusYoutubeEmbedUrl(id, {
      origin: typeof window === 'undefined' ? '' : window.location.origin,
    }) : '', [id]);

  // A newly published YouTube video starts muted to comply with autoplay policies.
  useEffect(() => {
    setMuted(true);
    setPlaying(true);
  }, [id]);

  const sendCommand = useCallback(command => {
    commandFocusYoutubePlayer(frameRef.current, command);
  }, []);

  const play = () => {
    setPlaying(true);
    sendCommand('playVideo');
  };
  const pause = () => {
    setPlaying(false);
    sendCommand('pauseVideo');
  };
  const toggleSound = () => {
    const next = !muted;
    sendCommand(next ? 'mute' : 'unMute');
    setMuted(next);
  };

  if (!id) return null;
  const dim = Math.max(0, Math.min(85, Number(scene.dimPercent) || 0)) / 100;
  return <>
    <div className="bfc-scene-background bfc-youtube-background" aria-hidden="true">
      <iframe
        ref={frameRef}
        className={`bfc-youtube-background__player${scene.mediaFit === 'contain' ? ' is-contain' : ''}`}
        src={src}
        title="YouTube background"
        tabIndex={-1}
        allow="autoplay; encrypted-media; picture-in-picture"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        referrerPolicy="strict-origin-when-cross-origin"
      />
      <div className="bfc-scene-background__shade" style={{ backgroundColor: `rgba(2,8,22,${dim})` }} />
    </div>
    <div className="bfc-youtube-controls" role="group"
      aria-label={vi ? 'Điều khiển video YouTube' : 'YouTube playback controls'}>
      <span className="bfc-youtube-controls__brand" aria-hidden="true"><Youtube size={17}/></span>
      <button type="button" onClick={play}
        aria-label={vi ? 'Phát video YouTube' : 'Play YouTube video'}
        title={vi ? 'Phát video' : 'Play video'}>
        <Play size={15} fill={playing ? 'currentColor' : 'none'}/>
        <span>{vi ? 'Phát' : 'Play'}</span>
      </button>
      <button type="button" onClick={pause}
        aria-label={vi ? 'Tạm dừng video YouTube' : 'Pause YouTube video'}
        title={vi ? 'Tạm dừng' : 'Pause'}>
        <Pause size={15} fill={!playing ? 'currentColor' : 'none'}/>
      </button>
      <span className="bfc-youtube-controls__divider" aria-hidden="true"/>
      <button type="button" onClick={toggleSound} aria-pressed={!muted}
        aria-label={vi ? (muted ? 'Bật âm thanh YouTube' : 'Tắt âm thanh YouTube') :
          (muted ? 'Unmute YouTube' : 'Mute YouTube')}
        title={vi ? (muted ? 'Bật âm thanh' : 'Tắt âm thanh') : (muted ? 'Unmute' : 'Mute')}>
        {muted ? <VolumeX size={16}/> : <Volume2 size={16}/>}
        <span>{vi ? (muted ? 'Bật tiếng' : 'Tắt tiếng') : (muted ? 'Sound on' : 'Mute')}</span>
      </button>
      <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer"
        aria-label={vi ? 'Mở video trên YouTube' : 'Open video on YouTube'} title="YouTube">
        <ExternalLink size={15}/>
      </a>
    </div>
  </>;
}
