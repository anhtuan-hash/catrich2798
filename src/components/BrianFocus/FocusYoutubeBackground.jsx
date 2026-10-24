import React, { useState } from 'react';
import { ExternalLink, Pause, Play, Square, Volume2, VolumeX, Youtube, MoonStar, ChevronDown, ChevronUp, SkipBack, SkipForward } from 'lucide-react';
import { videoIdFromFocusPath, playlistIdsFromFocusPath } from './focusYoutube.js';

/** Controls an existing persistent iframe; NEVER creates a second video player.
 * Stop is explicit; merely closing Focus only hides the overlay, not playback. */
export default function FocusYoutubeBackground({
  scene, language='vi', session, controls, compact=false, onOpenFocus,
}) {
  const vi=language!=='en';
  const [expanded,setExpanded]=useState(false);
  const videoId=videoIdFromFocusPath(scene?.mediaPath);
  const playlistIds=playlistIdsFromFocusPath(scene?.mediaPath);
  const multi=playlistIds.length>1;
  if(!videoId)return null;
  const mini=!compact&&!expanded;
  const playing=Boolean(session?.playing&&session?.mounted);
  const mounted=Boolean(session?.mounted);
  return <div className={'bfc-youtube-controls'+(compact?' bfc-youtube-controls--mini':'')+(mini?' bfc6-youtube-mini':'')}
    role="group" aria-label={vi ? 'Điều khiển YouTube chạy nền' : 'Background YouTube controls'}>
    <span className="bfc-youtube-controls__brand" aria-hidden="true"><Youtube size={17}/></span>
    {compact&&<span className="bfc-youtube-controls__status" aria-live="polite">
      {playing?(vi?'YouTube đang chạy nền':'YouTube playing in background'):(vi?'YouTube tạm dừng':'YouTube paused')}
    </span>}
    <button type="button" onClick={playing?controls?.pause:controls?.play}
      aria-label={playing?(vi?'Tạm dừng YouTube':'Pause YouTube'):(vi?'Phát YouTube':'Play YouTube')}
      title={playing?(vi?'Tạm dừng':'Pause'):(vi?'Phát':'Play')}>
      {playing?<Pause size={16}/>:<Play size={16}/>}
      {!mini&&!compact&&<span>{playing?(vi?'Tạm dừng':'Pause'):(vi?'Phát':'Play')}</span>}
    </button>
    {multi&&<>
      <button type="button" onClick={controls?.previous} disabled={!mounted}
        aria-label={vi?'Video trước trong danh sách':'Previous video in playlist'} title={vi?'Video trước':'Previous video'}>
        <SkipBack size={16}/>
      </button>
      <button type="button" onClick={controls?.next} disabled={!mounted}
        aria-label={vi?'Video tiếp theo trong danh sách':'Next video in playlist'} title={vi?'Video tiếp theo':'Next video'}>
        <SkipForward size={16}/>
      </button>
      {!compact&&!mini&&<span className="bfc-youtube-controls__playlist-count" aria-label={vi?'Số video trong danh sách':'Playlist video count'}>
        {playlistIds.length} {vi?'video':'videos'}
      </span>}
    </>}
    <span className="bfc-youtube-controls__divider" aria-hidden="true"/>
    <button type="button" onClick={controls?.toggleMute} disabled={!mounted}
      aria-pressed={mounted&&!session?.muted}
      aria-label={session?.muted?(vi?'Bật tiếng YouTube':'Unmute YouTube'):(vi?'Tắt tiếng YouTube':'Mute YouTube')}>
      {session?.muted?<VolumeX size={16}/>:<Volume2 size={16}/>}
      {!mini&&!compact&&<span>{session?.muted?(vi?'Bật tiếng':'Unmute'):(vi?'Tắt tiếng':'Mute')}</span>}
    </button>
    {!mini&&<button type="button" className="bfc-youtube-controls__stop" onClick={controls?.stop}
      disabled={!mounted} aria-label={vi?'Tắt hẳn video YouTube':'Stop YouTube completely'}
      title={vi?'Dừng hẳn video; đóng Focus không dừng':'Stop video; Focus Close does not stop playback'}>
      <Square size={14} fill="currentColor"/>
      {!compact&&<span>{vi?'Tắt video':'Stop'}</span>}
    </button>}
    {compact?<button type="button" onClick={onOpenFocus}
      aria-label={vi?'Mở lại Focus':'Reopen Focus'}><MoonStar size={16}/></button>:
      <button type="button" className="bfc6-youtube-more" onClick={()=>setExpanded(x=>!x)}
        aria-expanded={expanded} aria-label={expanded?(vi?'Thu nhỏ trình phát':'Collapse player'):(vi?'Mở rộng trình phát':'Expand player')}>
        {expanded?<ChevronDown size={16}/>:<ChevronUp size={16}/>}
      </button>}
    {expanded&&!compact&&<a href={'https://www.youtube.com/watch?v='+videoId} target="_blank" rel="noopener noreferrer"
      aria-label={vi?'Mở video trên YouTube':'Open on YouTube'} title="YouTube"><ExternalLink size={15}/></a>}
  </div>;
}
