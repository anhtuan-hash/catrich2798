import { parseFocusYoutubePlaylist } from './focusYoutube.js';
import { normalizeFocusWebScenes } from './focusWebScenes.js';

/** A local Focus session choice must never mutate the globally published scene. */
export function getFocusYoutubeIds(scene, videoOverride = '') {
  if (videoOverride) {
    try { return parseFocusYoutubePlaylist([videoOverride]); } catch { /* ignore stale personal IDs */ }
  }
  try { return parseFocusYoutubePlaylist(scene?.youtubeUrl || scene?.playlistIds || []); }
  catch { return []; }
}

export function getFocusSourceAvailability(scene, videoOverride = '') {
  return {
    websites: normalizeFocusWebScenes(scene?.webScenes,
      typeof window === 'undefined' ? '' : window.location.origin).length,
    videos: getFocusYoutubeIds(scene, videoOverride).length,
  };
}

export function resolveFocusSessionScene(scene, choice, videoOverride = '') {
  const current = scene || {};
  if (choice === 'website' && getFocusSourceAvailability(current).websites > 0) {
    return { ...current, mediaType: 'website', mediaPath: '', playlistIds: [] };
  }
  if (choice === 'youtube') {
    const ids = getFocusYoutubeIds(current, videoOverride);
    if (ids.length) {
      return {
        ...current, mediaType: 'youtube', mediaPath: 'youtube:' + ids.join(','),
        playlistIds: ids,
        youtubeUrl: ids.map(id => 'https://www.youtube.com/watch?v=' + id).join('\n'),
      };
    }
  }
  if (choice === 'original' && current.mediaType !== 'website' && current.mediaType !== 'youtube') {
    return current;
  }
  // While the chooser is open, never auto-start a globally published YouTube.
  return { ...current, mediaType: 'default', mediaPath: '', playlistIds: [] };
}
