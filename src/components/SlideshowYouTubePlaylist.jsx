import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Music2, Play, Pause, SkipBack, SkipForward, Plus, Trash2,
  Repeat, Shuffle, ChevronDown, ChevronUp, Volume2, X, ListMusic, Pencil, ArrowUp, ArrowDown
} from 'lucide-react';
import './SlideshowYouTubePlaylist.css';

const STORAGE_PREFIX = 'brian-slideshow-youtube-v1:';
const MAX_TRACKS = 80;
let youtubeApiPromise;

export function extractYouTubeId(value) {
  try {
    let text = String(value || '').trim();
    if (/^(www\.|m\.|music\.)?youtube\.com\//i.test(text) || /^youtu\.be\//i.test(text)) {
      text = 'https://' + text;
    }
    const url = new URL(text);
    const host = url.hostname.toLowerCase().replace(/^www\./, '');
    let id = '';
    if (host === 'youtu.be') id = url.pathname.split('/')[1] || '';
    else if (['youtube.com', 'm.youtube.com', 'music.youtube.com', 'youtube-nocookie.com'].includes(host)) {
      const path = url.pathname.split('/').filter(Boolean);
      if (path[0] === 'watch') id = url.searchParams.get('v') || '';
      if (['shorts', 'embed', 'live', 'v'].includes(path[0])) id = path[1] || '';
    }
    return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
  } catch { return null; }
}

export function parseYouTubeLinks(text) {
  const lines = String(text || '').split(/\r?\n/);
  const parsed = [];
  lines.forEach(line => {
    const urls = line.match(/(?:https?:\/\/|www\.)[^\s,|]+/gi);
    const candidates = urls?.length ? urls : line.split(/[\s,]+/).filter(Boolean);
    candidates.forEach((url, i) => {
      const videoId = extractYouTubeId(url);
      if (!videoId) return;
      const prefix = line.slice(0, line.indexOf(url)).replace(/[|:\-–—\s]+$/g, '').trim();
      parsed.push({
        videoId,
        title: urls?.length === 1 && prefix ? prefix.slice(0, 70) : 'YouTube · ' + videoId
      });
    });
  });
  return parsed;
}

function readSaved(albumId) {
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_PREFIX + albumId) || '{}');
    return {
      tracks: Array.isArray(data.tracks) ? data.tracks
        .filter(t => t && extractYouTubeId('https://youtu.be/' + t.videoId) === t.videoId)
        .slice(0, MAX_TRACKS).map(t => ({ videoId: t.videoId, title: String(t.title || 'YouTube · ' + t.videoId).slice(0, 90) })) : [],
      volume: Number.isFinite(data.volume) ? Math.max(0, Math.min(100, data.volume)) : 70,
      repeat: ['all', 'one', 'off'].includes(data.repeat) ? data.repeat : 'all',
      shuffle: Boolean(data.shuffle)
    };
  } catch { return { tracks: [], volume: 70, repeat: 'all', shuffle: false }; }
}

function loadYouTubeApi() {
  if (typeof window === 'undefined') return Promise.reject(new Error('Browser required'));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (youtubeApiPromise) return youtubeApiPromise;
  youtubeApiPromise = new Promise((resolve, reject) => {
    const original = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof original === 'function') original();
      resolve(window.YT);
    };
    if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      tag.async = true;
      tag.onerror = () => reject(new Error('Cannot load YouTube player'));
      document.head.appendChild(tag);
    }
  }).catch(e => { youtubeApiPromise = null; throw e; });
  return youtubeApiPromise;
}

/**
 * Personal, per-browser playlist for the current slideshow.
 * The YouTube player remains visible (at least 200px high) while playing.
 * Opening/closing the panel never changes the slideshow's image playback.
 */
export default function SlideshowYouTubePlaylist({ albumId, language = 'vi' }) {
  const en = language === 'en';
  const [saved] = useState(() => readSaved(albumId));
  const [tracks, setTracks] = useState(saved.tracks);
  const [volume, setVolume] = useState(saved.volume);
  const [repeat, setRepeat] = useState(saved.repeat);
  const [shuffle, setShuffle] = useState(saved.shuffle);
  const [opened, setOpened] = useState(false);
  const [compact, setCompact] = useState(false);
  const [input, setInput] = useState('');
  const [active, setActive] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [notice, setNotice] = useState('');
  const hostRef = useRef(null);
  const playerRef = useRef(null);
  const loadedRef = useRef('');
  const autoPlayRef = useRef(false);
  const tracksRef = useRef(tracks);
  const activeRef = useRef(active);
  const settingsRef = useRef({ shuffle, repeat, volume });
  const nextRef = useRef(() => {});
  tracksRef.current = tracks;
  activeRef.current = active;
  settingsRef.current = { shuffle, repeat, volume };

  useEffect(() => {
    try { localStorage.setItem(STORAGE_PREFIX + albumId, JSON.stringify({ tracks, volume, repeat, shuffle })); }
    catch { /* Private browsing / blocked storage: playlist remains available this session. */ }
  }, [albumId, tracks, volume, repeat, shuffle]);

  const playAt = (nextIndex) => {
    const item = tracksRef.current[nextIndex];
    if (!item) return;
    activeRef.current = nextIndex;
    setActive(nextIndex);
    setNotice('');
    autoPlayRef.current = true;
    if (!opened) { setOpened(true); return; }
    if (playerRef.current?.loadVideoById) {
      loadedRef.current = item.videoId;
      playerRef.current.loadVideoById(item.videoId);
    }
  };

  const advance = (manual = false) => {
    const count = tracksRef.current.length;
    if (!count) return;
    const { shuffle: shuffled, repeat: mode } = settingsRef.current;
    if (!manual && mode === 'one') { playAt(activeRef.current); return; }
    let next = activeRef.current + 1;
    if (shuffled && count > 1) {
      next = (activeRef.current + 1 + Math.floor(Math.random() * (count - 1))) % count;
    } else if (next >= count) {
      if (!manual && mode === 'off') {
        setIsPlaying(false);
        autoPlayRef.current = false;
        return;
      }
      next = 0;
    }
    playAt(next);
  };
  nextRef.current = advance;

  useEffect(() => {
    if (!opened || tracks.length === 0 || !hostRef.current) return undefined;
    let cancelled = false;
    loadYouTubeApi().then(YT => {
      if (cancelled || !hostRef.current) return;
      playerRef.current = new YT.Player(hostRef.current, {
        width: '100%', height: '100%',
        videoId: tracksRef.current[activeRef.current]?.videoId,
        playerVars: {
          autoplay: 0, playsinline: 1, controls: 1,
          origin: window.location.origin, rel: 0
        },
        events: {
          onReady: event => {
            if (cancelled) return;
            event.target.setVolume(settingsRef.current.volume);
            const id = tracksRef.current[activeRef.current]?.videoId;
            if (!id) return;
            loadedRef.current = id;
            if (autoPlayRef.current) event.target.loadVideoById(id);
            else event.target.cueVideoById(id);
          },
          onStateChange: event => {
            if (cancelled) return;
            if (event.data === YT.PlayerState.PLAYING) setIsPlaying(true);
            if (event.data === YT.PlayerState.PAUSED) setIsPlaying(false);
            if (event.data === YT.PlayerState.ENDED) nextRef.current(false);
          },
          onError: () => {
            if (!cancelled) {
              setIsPlaying(false);
              setNotice(en ? 'This video cannot be embedded. Try another link.' : 'Video này không cho phép nhúng. Hãy chọn link khác.');
            }
          }
        }
      });
    }).catch(() => {
      if (!cancelled) setNotice(en ? 'Unable to load YouTube. Check your connection.' : 'Không tải được YouTube. Hãy kiểm tra kết nối.');
    });
    return () => {
      cancelled = true;
      try { playerRef.current?.destroy?.(); } catch { /* Player may already be removed. */ }
      playerRef.current = null;
      loadedRef.current = '';
      autoPlayRef.current = false;
      setIsPlaying(false);
    };
  }, [opened, tracks.length > 0]);

  useEffect(() => {
    const item = tracks[active];
    if (!opened || !item || !playerRef.current || loadedRef.current === item.videoId) return;
    loadedRef.current = item.videoId;
    if (autoPlayRef.current) playerRef.current.loadVideoById(item.videoId);
    else playerRef.current.cueVideoById(item.videoId);
  }, [tracks, active, opened]);

  useEffect(() => {
    if (opened && playerRef.current?.setVolume) playerRef.current.setVolume(volume);
  }, [opened, volume]);

  useEffect(() => {
    if (!opened) return undefined;
    const onKey = event => {
      if (event.key === 'Escape') { event.stopPropagation(); setOpened(false); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [opened]);

  const togglePlay = () => {
    if (!tracks.length) { setNotice(en ? 'Add a YouTube link first.' : 'Hãy thêm link YouTube trước.'); return; }
    if (isPlaying) { autoPlayRef.current = false; playerRef.current?.pauseVideo?.(); setIsPlaying(false); }
    else playAt(activeRef.current);
  };
  const addTracks = () => {
    const parsed = parseYouTubeLinks(input);
    const existing = new Set(tracks.map(item => item.videoId));
    const additions = parsed.filter(item => {
      if (existing.has(item.videoId)) return false;
      existing.add(item.videoId);
      return true;
    }).slice(0, MAX_TRACKS - tracks.length);
    if (!additions.length) {
      setNotice(en ? 'No new valid YouTube video links found.' : 'Không tìm thấy link video YouTube mới hợp lệ.');
      return;
    }
    setTracks(old => old.concat(additions));
    setInput('');
    setNotice(en ? 'Added ' + additions.length + ' track(s).' : 'Đã thêm ' + additions.length + ' bài hát.');
  };
  const removeTrack = position => {
    const removed = tracks[position];
    const next = tracks.filter((_, index) => index !== position);
    setTracks(next);
    if (!next.length) { setActive(0); activeRef.current = 0; setIsPlaying(false); autoPlayRef.current = false; }
    else if (position === activeRef.current) {
      const at = Math.min(position, next.length - 1);
      setActive(at);
      activeRef.current = at;
      loadedRef.current = '';
    } else if (position < activeRef.current) {
      setActive(activeRef.current - 1);
      activeRef.current -= 1;
    }
    setNotice((en ? 'Removed: ' : 'Đã xoá: ') + removed.title);
  };
  const renameTrack = position => {
    const old = tracks[position];
    if (!old) return;
    const result = window.prompt(en ? 'Track name:' : 'Tên bài hát:', old.title);
    if (result === null) return;
    const name = result.trim().slice(0, 90);
    if (!name) return;
    setTracks(items => items.map((item, index) => index === position ? { ...item, title: name } : item));
  };
  const moveTrack = (from, to) => {
    if (to < 0 || to >= tracks.length) return;
    const next = [...tracks];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setTracks(next);
    if (activeRef.current === from) { activeRef.current = to; setActive(to); }
    else if (from < activeRef.current && to >= activeRef.current) { activeRef.current -= 1; setActive(activeRef.current); }
    else if (from > activeRef.current && to <= activeRef.current) { activeRef.current += 1; setActive(activeRef.current); }
  };
  const closePlayer = () => { setOpened(false); setCompact(false); };
  const current = tracks[active] || null;

  return <>
    <button type="button" className={'bss-pill bss-music-trigger' + (isPlaying ? ' is-playing' : '')}
      title={en ? 'YouTube music playlist' : 'Danh sách nhạc YouTube'}
      aria-expanded={opened} onClick={() => setOpened(value => !value)}>
      <Music2 size={17}/><span>{en ? 'Music' : 'Nhạc YouTube'}</span>
      {isPlaying && <span className="bss-music-signal" aria-hidden="true"/>}
    </button>
    {opened && createPortal(
      <aside className={'bss-music-panel' + (compact ? ' is-compact' : '')}
        role="dialog" aria-label={en ? 'YouTube music playlist' : 'Danh sách nhạc YouTube'}>
        <div className="bss-music-heading">
          <span className="bss-music-heading-icon"><Music2 size={18}/></span>
          <div><strong>{en ? 'Showcase soundtrack' : 'Nhạc nền Showcase'}</strong><small>YOUTUBE PLAYLIST · {tracks.length} {en ? 'TRACKS' : 'BÀI'}</small></div>
          <button type="button" onClick={() => setCompact(v => !v)} title={compact ? (en ? 'Expand list' : 'Mở danh sách') : (en ? 'Minimize list' : 'Thu gọn danh sách')}
            aria-label={compact ? (en ? 'Expand list' : 'Mở danh sách') : (en ? 'Minimize list' : 'Thu gọn danh sách')}>
            {compact ? <ChevronUp size={19}/> : <ChevronDown size={19}/>}
          </button>
          <button type="button" onClick={closePlayer} title={en ? 'Close and stop music' : 'Đóng và dừng nhạc'}
            aria-label={en ? 'Close and stop music' : 'Đóng và dừng nhạc'}><X size={19}/></button>
        </div>
        <div className="bss-music-video">
          {tracks.length ? <div className="bss-music-youtube-host" ref={hostRef}/> :
            <div className="bss-music-empty"><ListMusic size={32}/><strong>{en ? 'Your soundtrack starts here' : 'Thêm nhạc cho buổi triển lãm'}</strong><small>{en ? 'Paste YouTube links below.' : 'Dán các đường dẫn YouTube ở bên dưới.'}</small></div>}
        </div>
        <div className="bss-music-now">
          <span className="bss-music-now-disc"><Music2 size={17}/></span>
          <span className="bss-music-now-title">{current?.title || (en ? 'No track selected' : 'Chưa có bài hát')}<small>{tracks.length ? (active + 1) + ' / ' + tracks.length : 'BRIAN PHOTO STORY'}</small></span>
        </div>
        <div className="bss-music-controls">
          <button type="button" className={shuffle ? 'active' : ''} onClick={() => setShuffle(value => !value)}
            title={en ? 'Shuffle' : 'Phát ngẫu nhiên'} aria-label={en ? 'Shuffle' : 'Phát ngẫu nhiên'} aria-pressed={shuffle}><Shuffle size={16}/></button>
          <button type="button" disabled={!tracks.length} onClick={() => playAt((activeRef.current - 1 + tracks.length) % tracks.length)}
            title={en ? 'Previous' : 'Bài trước'} aria-label={en ? 'Previous' : 'Bài trước'}><SkipBack size={19}/></button>
          <button type="button" className="bss-music-play" disabled={!tracks.length} onClick={togglePlay}
            title={isPlaying ? (en ? 'Pause' : 'Tạm dừng') : (en ? 'Play' : 'Phát')}
            aria-label={isPlaying ? (en ? 'Pause' : 'Tạm dừng') : (en ? 'Play' : 'Phát')}>
            {isPlaying ? <Pause size={19} fill="currentColor"/> : <Play size={19} fill="currentColor"/>}
          </button>
          <button type="button" disabled={!tracks.length} onClick={() => advance(true)}
            title={en ? 'Next' : 'Bài tiếp'} aria-label={en ? 'Next' : 'Bài tiếp'}><SkipForward size={19}/></button>
          <button type="button" className={repeat !== 'off' ? 'active' : ''} onClick={() => setRepeat(v => v === 'all' ? 'one' : v === 'one' ? 'off' : 'all')}
            title={(en ? 'Repeat: ' : 'Lặp lại: ') + repeat} aria-label={(en ? 'Repeat: ' : 'Lặp lại: ') + repeat}>
            <Repeat size={16}/>{repeat === 'one' && <sup>1</sup>}
          </button>
          <label className="bss-music-volume" title={(en ? 'Volume: ' : 'Âm lượng: ') + volume + '%'}>
            <Volume2 size={16}/><input type="range" min="0" max="100" value={volume} onChange={e => setVolume(Number(e.target.value))}
              aria-label={en ? 'Music volume' : 'Âm lượng nhạc'}/>
          </label>
        </div>
        {!compact && <>
          <div className="bss-music-add">
            <label htmlFor="bss-music-links">{en ? 'Paste YouTube video links' : 'Dán link YouTube (mỗi dòng một link; có thể thêm Tên bài | Link)'}</label>
            <textarea id="bss-music-links" rows={2} value={input} onChange={e => setInput(e.target.value)}
              placeholder={'https://youtu.be/xxxxxxxxxxx\nhttps://www.youtube.com/watch?v=xxxxxxxxxxx'}/>
            <button type="button" onClick={addTracks} disabled={!input.trim() || tracks.length >= MAX_TRACKS}>
              <Plus size={15}/>{en ? 'Add to playlist' : 'Thêm vào danh sách'}
            </button>
          </div>
          <div className="bss-music-list-head"><span>{en ? 'NEXT UP' : 'DANH SÁCH PHÁT'}</span><small>{tracks.length} / {MAX_TRACKS}</small></div>
          <ol className="bss-music-list">
            {tracks.map((track, position) => <li key={track.videoId} className={position === active ? 'is-active' : ''}>
              <button type="button" className="bss-music-track-select" onClick={() => playAt(position)}
                aria-label={(en ? 'Play ' : 'Phát ') + track.title}>
                <span>{String(position + 1).padStart(2, '0')}</span><strong title={track.title}>{track.title}</strong>
              </button>
              <button type="button" className="bss-music-remove" disabled={position === 0} onClick={() => moveTrack(position, position - 1)}
                title={en ? 'Move up' : 'Đưa lên'} aria-label={(en ? 'Move up ' : 'Đưa lên ') + track.title}><ArrowUp size={14}/></button>
              <button type="button" className="bss-music-remove" disabled={position === tracks.length - 1} onClick={() => moveTrack(position, position + 1)}
                title={en ? 'Move down' : 'Đưa xuống'} aria-label={(en ? 'Move down ' : 'Đưa xuống ') + track.title}><ArrowDown size={14}/></button>
              <button type="button" className="bss-music-remove" onClick={() => renameTrack(position)}
                title={en ? 'Rename' : 'Đổi tên bài hát'} aria-label={(en ? 'Rename ' : 'Đổi tên ') + track.title}><Pencil size={14}/></button>
              <button type="button" className="bss-music-remove" onClick={() => removeTrack(position)}
                title={en ? 'Remove' : 'Xoá bài hát'} aria-label={(en ? 'Remove ' : 'Xoá ') + track.title}><Trash2 size={15}/></button>
            </li>)}
            {!tracks.length && <li className="bss-music-list-placeholder">{en ? 'No songs yet.' : 'Chưa có bài hát nào.'}</li>}
          </ol>
          <p className="bss-music-note">{en
            ? 'Saved on this browser for this album. Music starts after you press Play. Closing pauses playback.'
            : 'Danh sách lưu trên trình duyệt này theo album. Nhấn Phát để nghe; đóng bảng sẽ dừng nhạc.'}</p>
        </>}
        {notice && <p className="bss-music-notice" role="status">{notice}</p>}
      </aside>, document.body)}
  </>;
}
