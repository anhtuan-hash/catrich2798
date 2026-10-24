import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  buildFocusYoutubeEmbedUrl, commandFocusYoutubePlayer, playlistIdsFromFocusPath,
} from './focusYoutube.js';

const emptySession = (userId = '', videoId = '', autoStart = false, playlistKey = '') => ({
  userId, videoId, playlistKey, mounted: autoStart, playing: autoStart,
  muted: true, explicitlyStopped: false,
});

/**
 * Owner: BrianFocus, NOT FocusOverlay. The same iframe remains mounted across
 * every Focus open/close transition, so neither playback nor currentTime resets.
 * Only explicit Stop, account logout/change, or publishing another scene
 * tears down the embedded player.
 */
export default function usePersistentFocusYoutube({ scene, focusOpen, userId }) {
  const playlist = useMemo(() => scene?.mediaType === 'youtube'
    ? playlistIdsFromFocusPath(scene.mediaPath) : [], [scene?.mediaType, scene?.mediaPath]);
  const playlistKey = playlist.join(',');
  const videoId = playlist[0] || '';
  const ownerId = String(userId || '');
  const iframeRef = useRef(null);
  const [session, setSession] = useState(() => emptySession(ownerId, videoId, false, playlistKey));
  const active = session.userId === ownerId && session.playlistKey === playlistKey;
  const current = active ? session : emptySession(ownerId, videoId, false, playlistKey);
  const source = useMemo(() => videoId && ownerId
    ? buildFocusYoutubeEmbedUrl(videoId, {
      playlistIds: playlist,
      origin: typeof window === 'undefined' ? '' : window.location.origin,
    }) : '', [playlistKey, ownerId]);

  useEffect(() => {
    setSession(previous => {
      if (previous.userId !== ownerId || previous.playlistKey !== playlistKey) {
        return emptySession(ownerId, videoId, Boolean(videoId && ownerId && focusOpen), playlistKey);
      }
      if (focusOpen && videoId && !previous.mounted && !previous.explicitlyStopped) {
        return { ...previous, mounted: true, playing: true };
      }
      return previous; // Closing the overlay must NEVER pause or unmount YouTube.
    });
  }, [ownerId, playlistKey, focusOpen]);

  const send = useCallback(command => commandFocusYoutubePlayer(iframeRef.current, command), []);

  const play = useCallback(() => {
    if (!videoId || !ownerId) return;
    setSession(value => ({
      ...(value.playlistKey === playlistKey && value.userId === ownerId
        ? value : emptySession(ownerId, videoId, false, playlistKey)),
      mounted: true, playing: true, explicitlyStopped: false,
    }));
    send('playVideo');
  }, [videoId, ownerId, playlistKey, send]);

  const pause = useCallback(() => {
    setSession(value => value.playlistKey === playlistKey && value.userId === ownerId
      ? { ...value, playing: false } : value);
    send('pauseVideo');
  }, [playlistKey, ownerId, send]);

  const stop = useCallback(() => {
    // Deliberately unmount only upon a user-initiated STOP, not Close or Escape.
    send('stopVideo');
    setSession(value => value.playlistKey === playlistKey && value.userId === ownerId
      ? { ...value, mounted: false, playing: false, muted: true, explicitlyStopped: true } : value);
  }, [playlistKey, ownerId, send]);

  const mute = useCallback(() => {
    send('mute');
    setSession(value => value.playlistKey === playlistKey && value.userId === ownerId
      ? { ...value, muted: true } : value);
  }, [playlistKey, ownerId, send]);

  const toggleMute = useCallback(() => {
    if (!current.mounted) return;
    if (current.muted) {
      // Existing Soundscape listens for this event and yields audio to YouTube.
      window.dispatchEvent(new Event('bfc-youtube-unmute'));
      send('unMute');
    } else send('mute');
    setSession(value => value.playlistKey === playlistKey && value.userId === ownerId
      ? { ...value, muted: !value.muted } : value);
  }, [current.mounted, current.muted, playlistKey, ownerId, send]);

  // The embedded YouTube player follows playlist IDs in order automatically.
  // Provide manual track navigation without creating or unmounting any iframe.
  const next = useCallback(() => {
    if (playlist.length > 1 && current.mounted) send('nextVideo');
  }, [playlistKey, current.mounted, send]);
  const previous = useCallback(() => {
    if (playlist.length > 1 && current.mounted) send('previousVideo');
  }, [playlistKey, current.mounted, send]);

  const onLoad = useCallback(() => {
    // If another frame was removed by Stop, this only applies to the current iframe.
    if (!iframeRef.current) return;
    send(current.muted ? 'mute' : 'unMute');
    send(current.playing ? 'playVideo' : 'pauseVideo');
  }, [current.muted, current.playing, send]);

  useEffect(() => {
    if (active && current.mounted) send(current.playing ? 'playVideo' : 'pauseVideo');
  }, [active, current.mounted, current.playing, send]);
  useEffect(() => {
    if (active && current.mounted) send(current.muted ? 'mute' : 'unMute');
  }, [active, current.mounted, current.muted, send]);

  // Keep iframe in DOM and at viewport size while Focus is closed. Reducing
  // opacity (not display:none / visibility:hidden) avoids forcing a remount.
  // A timer repaint must not reconcile the persistent YouTube iframe.
  const player = useMemo(() => (
    (typeof document !== 'undefined' && videoId && ownerId) ? createPortal(
    <div className={`bfc-persistent-youtube${focusOpen ? ' is-visible' : ' is-background'}`}
      aria-hidden="true" data-youtube-session={current.mounted ? 'mounted' : 'stopped'}>
      {active && current.mounted && <iframe ref={iframeRef}
        title="Brian Focus persistent YouTube background"
        className={`bfc-youtube-background__player${scene.mediaFit === 'contain' ? ' is-contain' : ''}`}
        src={source} tabIndex={-1}
        allow="autoplay; encrypted-media; picture-in-picture"
        sandbox="allow-scripts allow-same-origin allow-presentation"
        referrerPolicy="strict-origin-when-cross-origin"
        onLoad={onLoad}
      />}
    </div>, document.body
  ) : null
  ), [videoId, ownerId, focusOpen, active, current.mounted, scene.mediaFit, source, onLoad]);
  const controls = useMemo(()=>({play,pause,stop,mute,toggleMute,next,previous}),
    [play,pause,stop,mute,toggleMute,next,previous]);

  return {
    player,
    session: current,
    videoId,
    playlist,
    controls,
  };
}
