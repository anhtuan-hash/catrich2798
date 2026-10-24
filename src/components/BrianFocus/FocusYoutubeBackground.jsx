import React from 'react';
import { ExternalLink, Pause, Play, Square, Volume2, VolumeX, Youtube, MoonStar } from 'lucide-react';
import { videoIdFromFocusPath } from './focusYoutube.js';

/** Controls are part of Focus's accessible modal, while the iframe lives
 * permanently in BrianFocus, one level above the Focus overlay lifecycle. */
export default function FocusYoutubeBackground({
  scene, language = 'vi', session, controls, compact = false, onOpenFocus,
}) {
  const vi = language !== 'en';
  const id = videoIdFromFocusPath(scene?.mediaPath);
  if (!id) return null;

  return <div className={`bfc-youtube-controls${compact ? ' bfc-youtube-controls--mini' : ''}`}
    role="group" aria-label={vi ? 'Điều khiển YouTube chạy nền' : 'Background YouTube controls'}>
    <span className="bfc-youtube-controls__brand" aria-hidden="true"><Youtube size={17}/></span>
    {compact && <span className="bfc-youtube-controls__status" aria-live="polite">
      {session?.playing ? (vi ? 'YouTube đang chạy nền' : 'YouTube playing in background')
        : (vi ? 'YouTube đã tạm dừng' : 'YouTube paused')}
    </span>}
    <button type="button" onClick={controls?.play} disabled={Boolean(session?.playing && session?.mounted)}
      aria-label={vi ? 'Phát video YouTube' : 'Play YouTube video'}
      title={vi ? 'Tiếp tục phát' : 'Resume video'}>
      <Play size={15}/>
      {!compact && <span>{vi ? 'Phát' : 'Play'}</span>}
    </button>
    <button type="button" onClick={controls?.pause} disabled={!session?.mounted || !session?.playing}
      aria-label={vi ? 'Tạm dừng YouTube' : 'Pause YouTube'}
      title={vi ? 'Tạm dừng, giữ vị trí phát' : 'Pause without resetting playback'}>
      <Pause size={15}/>
    </button>
    <span className="bfc-youtube-controls__divider" aria-hidden="true"/>
    <button type="button" onClick={controls?.toggleMute} disabled={!session?.mounted}
      aria-pressed={Boolean(session?.mounted && !session?.muted)}
      aria-label={vi ? (session?.muted ? 'Bật tiếng YouTube' : 'Tắt tiếng YouTube') :
        (session?.muted ? 'Unmute YouTube' : 'Mute YouTube')}
      title={vi ? (session?.muted ? 'Bật tiếng' : 'Tắt tiếng') : (session?.muted ? 'Unmute' : 'Mute')}>
      {session?.muted ? <VolumeX size={16}/> : <Volume2 size={16}/>}
      {!compact && <span>{vi ? (session?.muted ? 'Bật tiếng' : 'Tắt tiếng') :
        (session?.muted ? 'Unmute' : 'Mute')}</span>}
    </button>
    <button type="button" className="bfc-youtube-controls__stop" onClick={controls?.stop}
      disabled={!session?.mounted} aria-label={vi ? 'Tắt hẳn video YouTube' : 'Stop YouTube completely'}
      title={vi ? 'Tắt video (dừng hẳn, không phát nền)' : 'Stop and unload background video'}>
      <Square size={14} fill="currentColor"/>
      {!compact && <span>{vi ? 'Tắt video' : 'Stop'}</span>}
    </button>
    {compact && <button type="button" onClick={onOpenFocus}
      aria-label={vi ? 'Mở lại Focus không tải lại YouTube' : 'Reopen Focus without reloading YouTube'}
      title={vi ? 'Mở Focus' : 'Open Focus'}><MoonStar size={16}/></button>}
    {!compact && <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank" rel="noopener noreferrer"
      aria-label={vi ? 'Mở video trên YouTube' : 'Open YouTube video'} title="YouTube">
      <ExternalLink size={15}/>
    </a>}
  </div>;
}
