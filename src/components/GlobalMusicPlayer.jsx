import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  canManageSharedMusic,
  loadSharedMusic,
  readSharedMusicLocal,
  removeSharedMusic,
  setSharedMusicVisibility,
  subscribeSharedMusic,
  uploadAndShareMusic,
} from '../utils/sharedMusic.js';
import './GlobalMusicNavigationPopover.css';
import './GlobalMusicShared.css';

const DEFAULT_PREFERENCES = {
  expanded: false,
  volume: 0.42,
  loop: true,
};

function userKey(currentUser) {
  return currentUser?.id || currentUser?.email || 'guest';
}

function preferenceKey(currentUser) {
  return `bes-global-music-v2:${userKey(currentUser)}`;
}

function readPreferences(currentUser) {
  try {
    const current = JSON.parse(localStorage.getItem(preferenceKey(currentUser)) || '{}');
    const legacy = JSON.parse(localStorage.getItem(`bes-global-music-v1:${userKey(currentUser)}`) || '{}');
    return {
      ...DEFAULT_PREFERENCES,
      volume: Number.isFinite(Number(current.volume ?? legacy.volume)) ? Math.max(0, Math.min(1, Number(current.volume ?? legacy.volume))) : DEFAULT_PREFERENCES.volume,
      loop: typeof current.loop === 'boolean' ? current.loop : (typeof legacy.loop === 'boolean' ? legacy.loop : DEFAULT_PREFERENCES.loop),
      expanded: Boolean(current.expanded),
    };
  } catch {
    return { ...DEFAULT_PREFERENCES };
  }
}

function savePreferences(currentUser, preferences) {
  try {
    localStorage.setItem(preferenceKey(currentUser), JSON.stringify(preferences));
  } catch {
    // Optional local preference only.
  }
}

function formatFileSize(value, language) {
  const bytes = Math.max(0, Number(value) || 0);
  if (!bytes) return '';
  const mb = bytes / (1024 * 1024);
  return `${mb < 1 ? (bytes / 1024).toFixed(0) : mb.toFixed(mb >= 10 ? 0 : 1)} ${mb < 1 ? 'KB' : 'MB'}`;
}

function formatUpdatedAt(value, language) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleString(language === 'vi' ? 'vi-VN' : 'en-US', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function trackKey(track) {
  return track?.path || '';
}

export default function GlobalMusicPlayer({ language = 'vi', currentUser }) {
  const [preferences, setPreferences] = useState(() => readPreferences(currentUser));
  const [snapshot, setSnapshot] = useState(() => readSharedMusicLocal(currentUser));
  const [playing, setPlaying] = useState(false);
  const [busy, setBusy] = useState('');
  const [message, setMessage] = useState('');
  const [popoverRoot, setPopoverRoot] = useState(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastTrackRef = useRef('');
  const messageTimerRef = useRef(null);

  const vi = language === 'vi';
  const isAdmin = canManageSharedMusic(currentUser);
  const track = snapshot.track;
  const playable = Boolean(track?.signedUrl && (snapshot.shared || isAdmin));

  const labels = vi ? {
    title: 'Nhạc nền dùng chung',
    adminSubtitle: 'Admin tải lên và chia sẻ cho giáo viên',
    teacherSubtitle: 'Đồng bộ từ thư viện nhạc của Admin',
    play: 'Phát',
    pause: 'Tạm dừng',
    ready: 'Sẵn sàng phát',
    nowPlaying: 'Đang phát',
    noTrack: 'Admin chưa chia sẻ nhạc',
    noTrackNote: 'Khi Admin tải lên và chia sẻ, bài nhạc sẽ tự động xuất hiện tại đây.',
    adminNoTrack: 'Chưa có nhạc dùng chung',
    uploadShare: 'Tải lên và chia sẻ',
    replacing: 'Đang tải lên…',
    refresh: 'Đồng bộ lại',
    sharing: 'Đang chia sẻ với giáo viên',
    private: 'Đang tạm ngừng chia sẻ',
    stopShare: 'Ngừng chia sẻ',
    resumeShare: 'Chia sẻ lại',
    deleteTrack: 'Xóa nhạc',
    volume: 'Âm lượng',
    loop: 'Lặp lại',
    collapse: 'Đóng bảng nhạc nền',
    sharedByAdmin: 'Nhạc do Admin chia sẻ',
    synced: 'Đã đồng bộ',
    syncing: 'Đang đồng bộ…',
    localFallback: 'Đang dùng bản lưu gần nhất',
    uploadDone: 'Đã tải lên và chia sẻ nhạc cho giáo viên.',
    shareStopped: 'Đã ngừng chia sẻ với giáo viên.',
    shareResumed: 'Đã chia sẻ lại cho giáo viên.',
    deleted: 'Đã xóa nhạc dùng chung.',
    blocked: 'Trình duyệt cần bạn bấm Phát để bắt đầu âm thanh.',
    setup: 'Cần cài đặt Supabase',
    adminHint: 'Chỉ Admin có quyền tải lên, thay thế, chia sẻ hoặc xóa nhạc. Giáo viên chỉ có thể nghe.',
    teacherHint: 'Bạn chỉ có thể nghe bài nhạc do Admin đang chia sẻ. Danh sách được cập nhật tự động.',
  } : {
    title: 'Shared background music',
    adminSubtitle: 'Admin uploads and shares music with teachers',
    teacherSubtitle: 'Synced from the Admin music library',
    play: 'Play',
    pause: 'Pause',
    ready: 'Ready to play',
    nowPlaying: 'Now playing',
    noTrack: 'Admin has not shared music yet',
    noTrackNote: 'A track will appear here automatically when Admin uploads and shares one.',
    adminNoTrack: 'No shared track yet',
    uploadShare: 'Upload and share',
    replacing: 'Uploading…',
    refresh: 'Sync now',
    sharing: 'Shared with teachers',
    private: 'Sharing is paused',
    stopShare: 'Stop sharing',
    resumeShare: 'Share again',
    deleteTrack: 'Delete track',
    volume: 'Volume',
    loop: 'Loop',
    collapse: 'Close background music',
    sharedByAdmin: 'Shared by Admin',
    synced: 'Synced',
    syncing: 'Syncing…',
    localFallback: 'Using the latest cached copy',
    uploadDone: 'Music uploaded and shared with teachers.',
    shareStopped: 'Sharing with teachers has stopped.',
    shareResumed: 'Music is shared with teachers again.',
    deleted: 'Shared music deleted.',
    blocked: 'Your browser needs you to press Play before audio can start.',
    setup: 'Supabase setup required',
    adminHint: 'Only Admin can upload, replace, share or delete music. Teachers can only listen.',
    teacherHint: 'You can only listen to the track currently shared by Admin. It updates automatically.',
  };

  const patchPreferences = (patch) => setPreferences((current) => ({ ...current, ...patch }));

  const showMessage = (value, duration = 2800) => {
    setMessage(value);
    window.clearTimeout(messageTimerRef.current);
    if (duration > 0) messageTimerRef.current = window.setTimeout(() => setMessage(''), duration);
  };

  const stopPlayback = () => {
    const audio = audioRef.current;
    if (audio) {
      audio.pause();
      audio.removeAttribute('src');
      audio.load();
    }
    lastTrackRef.current = '';
    setPlaying(false);
  };

  const refresh = async ({ quiet = false } = {}) => {
    if (!currentUser) return;
    if (!quiet) setBusy('sync');
    try {
      const next = await loadSharedMusic(currentUser);
      setSnapshot(next);
      if (!quiet && next.error) showMessage(next.error, 5000);
    } finally {
      if (!quiet) setBusy('');
    }
  };

  useEffect(() => {
    const nextPreferences = readPreferences(currentUser);
    setPreferences(nextPreferences);
    setSnapshot(readSharedMusicLocal(currentUser));
    stopPlayback();
    refresh({ quiet: true });
    const unsubscribe = subscribeSharedMusic(currentUser, (next) => setSnapshot(next));
    const timer = window.setInterval(() => refresh({ quiet: true }), 25 * 60 * 1000);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [currentUser?.id, currentUser?.email, currentUser?.role]);

  useEffect(() => {
    savePreferences(currentUser, preferences);
  }, [currentUser?.id, currentUser?.email, preferences]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setPopoverRoot(document.getElementById('brian-nav-music-popover-root'));
  }, [currentUser?.id, currentUser?.email, preferences.expanded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('bes-global-music-panel-state', {
      detail: { expanded: preferences.expanded, playing },
    }));
  }, [preferences.expanded, playing]);

  useEffect(() => {
    if (!preferences.expanded) return undefined;
    const closeOutside = (event) => {
      const wrap = document.querySelector('.brian-nav__music-wrap');
      if (!wrap?.contains(event.target)) patchPreferences({ expanded: false });
    };
    const closeEscape = (event) => {
      if (event.key === 'Escape') patchPreferences({ expanded: false });
    };
    const closeRoute = () => patchPreferences({ expanded: false });
    document.addEventListener('pointerdown', closeOutside);
    window.addEventListener('keydown', closeEscape);
    window.addEventListener('hashchange', closeRoute);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      window.removeEventListener('keydown', closeEscape);
      window.removeEventListener('hashchange', closeRoute);
    };
  }, [preferences.expanded]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, Number(preferences.volume) || 0));
    audio.loop = Boolean(preferences.loop);
  }, [preferences.volume, preferences.loop]);

  useEffect(() => {
    if (lastTrackRef.current && lastTrackRef.current !== trackKey(track)) stopPlayback();
  }, [track?.path, track?.signedUrl, snapshot.shared]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return undefined;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onPause);
    return () => {
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onPause);
    };
  }, []);

  const prepareTrack = () => {
    const audio = audioRef.current;
    if (!audio || !playable || !track?.signedUrl) return null;
    if (lastTrackRef.current !== track.path || audio.src !== track.signedUrl) {
      lastTrackRef.current = track.path;
      audio.src = track.signedUrl;
      audio.load();
    }
    audio.volume = Math.max(0, Math.min(1, Number(preferences.volume) || 0));
    audio.loop = Boolean(preferences.loop);
    return audio;
  };

  const togglePlayback = async () => {
    if (!playable) {
      showMessage(labels.noTrackNote);
      return;
    }
    const audio = prepareTrack();
    if (!audio) return;
    try {
      if (audio.paused) await audio.play();
      else audio.pause();
    } catch {
      showMessage(labels.blocked);
    }
  };

  useEffect(() => {
    const handleCommand = async (event) => {
      const action = event.detail?.action;
      if (action === 'expand') patchPreferences({ expanded: true });
      else if (action === 'toggle-panel') patchPreferences({ expanded: !preferences.expanded });
      else if (action === 'collapse') patchPreferences({ expanded: false });
      else if (action === 'toggle') {
        patchPreferences({ expanded: true });
        await togglePlayback();
      }
    };
    window.addEventListener('bes-global-music-command', handleCommand);
    return () => window.removeEventListener('bes-global-music-command', handleCommand);
  }, [preferences.expanded, playable, track?.path, track?.signedUrl, preferences.volume, preferences.loop]);

  useEffect(() => () => window.clearTimeout(messageTimerRef.current), []);

  const handleUpload = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || !isAdmin || busy) return;
    setBusy('upload');
    stopPlayback();
    try {
      const next = await uploadAndShareMusic(currentUser, file);
      setSnapshot(next);
      showMessage(labels.uploadDone);
    } catch (error) {
      showMessage(String(error?.message || error), 6000);
    } finally {
      setBusy('');
    }
  };

  const toggleSharing = async () => {
    if (!isAdmin || !track || busy) return;
    setBusy('share');
    if (snapshot.shared) stopPlayback();
    try {
      const next = await setSharedMusicVisibility(currentUser, !snapshot.shared);
      setSnapshot(next);
      showMessage(next.shared ? labels.shareResumed : labels.shareStopped);
    } catch (error) {
      showMessage(String(error?.message || error), 6000);
    } finally {
      setBusy('');
    }
  };

  const deleteTrack = async () => {
    if (!isAdmin || !track || busy) return;
    const confirmed = window.confirm(vi ? 'Xóa bài nhạc dùng chung này? Giáo viên sẽ không còn nghe được.' : 'Delete this shared track? Teachers will no longer be able to listen.');
    if (!confirmed) return;
    setBusy('delete');
    stopPlayback();
    try {
      const next = await removeSharedMusic(currentUser);
      setSnapshot(next);
      showMessage(labels.deleted);
    } catch (error) {
      showMessage(String(error?.message || error), 6000);
    } finally {
      setBusy('');
    }
  };

  const syncLabel = useMemo(() => {
    if (busy === 'sync' || snapshot.status === 'loading') return labels.syncing;
    if (snapshot.status === 'error') return snapshot.setupRequired ? labels.setup : labels.localFallback;
    return labels.synced;
  }, [busy, snapshot.status, snapshot.setupRequired, language]);

  const panel = (
    <section id="brian-nav-music-popover" className="brian-nav__popover brian-nav__music-popover is-shared-music" aria-label={labels.title}>
      <header className="brian-music-popover__header">
        <div>
          <strong>{labels.title}</strong>
          <small>{isAdmin ? labels.adminSubtitle : labels.teacherSubtitle}</small>
        </div>
        <button type="button" onClick={() => patchPreferences({ expanded: false })} aria-label={labels.collapse} title={labels.collapse}>×</button>
      </header>

      <div className="brian-music-popover__body">
        <div className={`brian-music-popover__sync is-${snapshot.status || 'idle'}`}>
          <span aria-hidden="true">{snapshot.status === 'error' ? '!' : busy === 'sync' ? '↻' : '✓'}</span>
          <b>{syncLabel}</b>
          <button type="button" onClick={() => refresh()} disabled={Boolean(busy)}>{labels.refresh}</button>
        </div>

        {track ? (
          <div className={`brian-music-popover__status ${playing ? 'is-playing' : ''}`}>
            <span aria-hidden="true">{playing ? '♪' : '♫'}</span>
            <div>
              <small>{playing ? labels.nowPlaying : (snapshot.shared ? labels.sharedByAdmin : labels.private)}</small>
              <strong>{track.title}</strong>
              <em>{[formatFileSize(track.size, language), formatUpdatedAt(snapshot.updatedAt, language)].filter(Boolean).join(' · ')}</em>
            </div>
            <button type="button" onClick={togglePlayback} disabled={!playable || Boolean(busy)}>{playing ? labels.pause : labels.play}</button>
          </div>
        ) : (
          <div className="brian-music-popover__empty">
            <span aria-hidden="true">♫</span>
            <div><strong>{isAdmin ? labels.adminNoTrack : labels.noTrack}</strong><small>{labels.noTrackNote}</small></div>
          </div>
        )}

        <div className="brian-music-popover__controls is-listener-only">
          <label className="brian-music-popover__volume">
            <span>{labels.volume}</span>
            <input type="range" min="0" max="1" step="0.01" value={preferences.volume} onChange={(event) => patchPreferences({ volume: Number(event.target.value) })} />
          </label>
          <label className="brian-music-popover__loop">
            <input type="checkbox" checked={preferences.loop} onChange={(event) => patchPreferences({ loop: event.target.checked })} />
            <span>{labels.loop}</span>
          </label>
        </div>

        {isAdmin ? (
          <section className="brian-music-admin">
            <div className="brian-music-admin__heading">
              <div><strong>ADMIN</strong><small>{snapshot.shared ? labels.sharing : labels.private}</small></div>
              <span className={snapshot.shared ? 'is-shared' : 'is-private'}>{snapshot.shared ? (vi ? 'ĐANG CHIA SẺ' : 'SHARED') : (vi ? 'TẠM ẨN' : 'PAUSED')}</span>
            </div>
            <div className="brian-music-admin__actions">
              <button type="button" className="is-primary" onClick={() => fileInputRef.current?.click()} disabled={Boolean(busy)}>{busy === 'upload' ? labels.replacing : labels.uploadShare}</button>
              {track ? <button type="button" onClick={toggleSharing} disabled={Boolean(busy)}>{snapshot.shared ? labels.stopShare : labels.resumeShare}</button> : null}
              {track ? <button type="button" className="is-danger" onClick={deleteTrack} disabled={Boolean(busy)}>{labels.deleteTrack}</button> : null}
              <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm" hidden onChange={handleUpload} />
            </div>
          </section>
        ) : null}
      </div>

      <footer className="brian-music-popover__footer" aria-live="polite">
        {message || snapshot.error || (isAdmin ? labels.adminHint : labels.teacherHint)}
      </footer>
    </section>
  );

  return (
    <>
      <audio ref={audioRef} preload="none" hidden />
      {preferences.expanded && popoverRoot ? createPortal(panel, popoverRoot) : null}
    </>
  );
}
