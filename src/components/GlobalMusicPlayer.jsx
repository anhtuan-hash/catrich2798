import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './GlobalMusicNavigationPopover.css';

const DEFAULT_MUSIC_URL = '/audio/brian-soft-loop.wav';
const DEFAULT_SETTINGS = {
  expanded: false,
  enabled: false,
  trackMode: 'default',
  customUrl: '',
  uploadName: '',
  volume: 0.42,
  loop: true,
};

function getMusicUserKey(currentUser) {
  return currentUser?.id || currentUser?.email || 'guest';
}

function getStorageKey(currentUser) {
  return `bes-global-music-v1:${getMusicUserKey(currentUser)}`;
}

function getTrackKey(settings) {
  if (settings.trackMode === 'url') return `url:${settings.customUrl || ''}`;
  if (settings.trackMode === 'upload') return `upload:${settings.uploadName || 'session-file'}`;
  return 'default:brian-soft-loop';
}

function readSettings(currentUser) {
  try {
    const parsed = JSON.parse(localStorage.getItem(getStorageKey(currentUser)) || '{}');
    return { ...DEFAULT_SETTINGS, ...parsed };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function dispatchMusicSettingsUpdate() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('bes-global-music-settings-updated'));
  }
}

function saveSettings(currentUser, settings) {
  try {
    const safeSettings = { ...settings };
    if (safeSettings.trackMode === 'upload') {
      safeSettings.enabled = false;
    }
    localStorage.setItem(getStorageKey(currentUser), JSON.stringify(safeSettings));
    dispatchMusicSettingsUpdate();
  } catch {
    // Ignore localStorage quota/privacy mode errors.
  }
}

function readSavedTime(currentUser, settings) {
  try {
    const key = `${getStorageKey(currentUser)}:time:${getTrackKey(settings)}`;
    const time = Number(localStorage.getItem(key) || '0');
    return Number.isFinite(time) && time > 0 ? time : 0;
  } catch {
    return 0;
  }
}

function saveCurrentTime(currentUser, settings, audio) {
  if (!audio || !Number.isFinite(audio.currentTime)) return;
  try {
    const key = `${getStorageKey(currentUser)}:time:${getTrackKey(settings)}`;
    localStorage.setItem(key, String(Math.floor(audio.currentTime)));
  } catch {
    // Ignore storage errors.
  }
}

export default function GlobalMusicPlayer({ language = 'vi', currentUser, externalLauncher = false }) {
  const [settings, setSettings] = useState(() => readSettings(currentUser));
  const [playing, setPlaying] = useState(false);
  const [fileUrl, setFileUrl] = useState('');
  const [customInput, setCustomInput] = useState(() => readSettings(currentUser).customUrl || '');
  const [message, setMessage] = useState('');
  const [popoverRoot, setPopoverRoot] = useState(null);
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);
  const lastTrackRef = useRef('');

  const labels = language === 'vi' ? {
    title: 'Nhạc nền',
    subtitle: 'Phát xuyên suốt hệ thống',
    play: 'Phát',
    pause: 'Tạm dừng',
    defaultTrack: 'Brian Soft Loop',
    upload: 'Tải nhạc lên',
    url: 'Dùng link nhạc',
    applyUrl: 'Lưu link',
    volume: 'Âm lượng',
    loop: 'Lặp lại',
    collapse: 'Đóng bảng nhạc nền',
    expand: 'Mở nhạc nền',
    note: 'Nhạc tiếp tục phát khi bạn chuyển trang hoặc chức năng.',
    blocked: 'Trình duyệt cần bạn bấm Phát để bắt đầu âm thanh.',
    uploaded: 'Đã nạp nhạc cho phiên hiện tại.',
    badUrl: 'Nhập link âm thanh hợp lệ trước.',
    ready: 'Sẵn sàng phát',
    nowPlaying: 'Đang phát',
    source: 'Nguồn nhạc',
  } : {
    title: 'Background music',
    subtitle: 'Persists across the system',
    play: 'Play',
    pause: 'Pause',
    defaultTrack: 'Brian Soft Loop',
    upload: 'Upload audio',
    url: 'Use audio URL',
    applyUrl: 'Save URL',
    volume: 'Volume',
    loop: 'Loop',
    collapse: 'Close background music',
    expand: 'Open music',
    note: 'Music keeps playing while you move between pages and tools.',
    blocked: 'Your browser needs you to press Play before audio can start.',
    uploaded: 'Audio loaded for this session.',
    badUrl: 'Enter a valid audio URL first.',
    ready: 'Ready to play',
    nowPlaying: 'Now playing',
    source: 'Audio source',
  };

  const trackUrl = useMemo(() => {
    if (settings.trackMode === 'upload' && fileUrl) return fileUrl;
    if (settings.trackMode === 'url' && settings.customUrl) return settings.customUrl;
    return DEFAULT_MUSIC_URL;
  }, [settings.trackMode, settings.customUrl, fileUrl]);

  const patchSettings = (patch) => {
    setSettings((old) => ({ ...old, ...patch }));
  };

  useEffect(() => {
    const next = readSettings(currentUser);
    setSettings(next);
    setCustomInput(next.customUrl || '');
    setPlaying(false);
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    setPopoverRoot(document.getElementById('brian-nav-music-popover-root'));
  }, [currentUser?.id, currentUser?.email, settings.expanded]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('bes-global-music-panel-state', {
      detail: { expanded: settings.expanded, playing },
    }));
  }, [settings.expanded, playing]);

  useEffect(() => {
    if (!settings.expanded) return undefined;

    const closeOutside = (event) => {
      const musicWrap = document.querySelector('.brian-nav__music-wrap');
      if (!musicWrap?.contains(event.target)) patchSettings({ expanded: false });
    };
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') patchSettings({ expanded: false });
    };
    const closeOnRouteChange = () => patchSettings({ expanded: false });

    document.addEventListener('pointerdown', closeOutside);
    window.addEventListener('keydown', closeOnEscape);
    window.addEventListener('hashchange', closeOnRouteChange);
    return () => {
      document.removeEventListener('pointerdown', closeOutside);
      window.removeEventListener('keydown', closeOnEscape);
      window.removeEventListener('hashchange', closeOnRouteChange);
    };
  }, [settings.expanded]);

  useEffect(() => {
    const syncExternalSettings = () => {
      const next = readSettings(currentUser);
      setSettings((current) => JSON.stringify(current) === JSON.stringify(next) ? current : next);
      setCustomInput((current) => current === (next.customUrl || '') ? current : (next.customUrl || ''));
      const audio = audioRef.current;
      if (audio) {
        audio.volume = Math.max(0, Math.min(1, Number(next.volume) || 0));
        audio.loop = Boolean(next.loop);
      }
    };
    window.addEventListener('bes-global-music-settings-updated', syncExternalSettings);
    return () => window.removeEventListener('bes-global-music-settings-updated', syncExternalSettings);
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    saveSettings(currentUser, settings);
  }, [currentUser?.id, currentUser?.email, settings]);

  useEffect(() => {
    const handleCommand = async (event) => {
      const action = event.detail?.action;
      if (action === 'expand') {
        window.dispatchEvent(new CustomEvent('bes-ai-close'));
        window.dispatchEvent(new CustomEvent('bes-sync-queue-close'));
        patchSettings({ expanded: true });
        return;
      }
      if (action === 'toggle-panel') {
        if (!settings.expanded) {
          window.dispatchEvent(new CustomEvent('bes-ai-close'));
          window.dispatchEvent(new CustomEvent('bes-sync-queue-close'));
        }
        patchSettings({ expanded: !settings.expanded });
        return;
      }
      if (action === 'collapse') {
        patchSettings({ expanded: false });
        return;
      }
      if (action === 'toggle') {
        window.dispatchEvent(new CustomEvent('bes-ai-close'));
        window.dispatchEvent(new CustomEvent('bes-sync-queue-close'));
        patchSettings({ expanded: true });
        await togglePlayback();
        return;
      }
      if (action === 'default') {
        patchSettings({ expanded: true, trackMode: 'default', enabled: false });
      }
    };
    window.addEventListener('bes-global-music-command', handleCommand);
    return () => window.removeEventListener('bes-global-music-command', handleCommand);
  }, [currentUser?.id, currentUser?.email, settings, trackUrl]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.volume = Math.max(0, Math.min(1, Number(settings.volume) || 0));
    audio.loop = Boolean(settings.loop);
  }, [settings.volume, settings.loop]);

  const prepareTrack = () => {
    const audio = audioRef.current;
    if (!audio || !trackUrl) return null;
    if (lastTrackRef.current !== trackUrl) {
      lastTrackRef.current = trackUrl;
      audio.src = trackUrl;
      const savedTime = readSavedTime(currentUser, settings);
      if (savedTime > 0) {
        const restore = () => {
          if (audio.duration && savedTime < audio.duration - 1) audio.currentTime = savedTime;
          audio.removeEventListener('loadedmetadata', restore);
        };
        audio.addEventListener('loadedmetadata', restore, { once: true });
      }
    }
    return audio;
  };

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!playing) {
      audio.removeAttribute('src');
      audio.load();
      lastTrackRef.current = '';
    }
  }, [trackUrl, currentUser?.id, currentUser?.email, settings.trackMode, settings.customUrl, settings.uploadName]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const timer = window.setInterval(() => saveCurrentTime(currentUser, settings, audio), 1800);
    const handlePause = () => setPlaying(false);
    const handlePlay = () => setPlaying(true);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('ended', handlePause);
    return () => {
      saveCurrentTime(currentUser, settings, audio);
      window.clearInterval(timer);
      audio.removeEventListener('pause', handlePause);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('ended', handlePause);
    };
  }, [currentUser?.id, currentUser?.email, settings]);

  useEffect(() => () => {
    if (fileUrl) URL.revokeObjectURL(fileUrl);
  }, [fileUrl]);

  const togglePlayback = async () => {
    const audio = prepareTrack();
    if (!audio) return;
    try {
      if (audio.paused) {
        patchSettings({ enabled: true });
        await audio.play();
        setPlaying(true);
      } else {
        audio.pause();
        saveCurrentTime(currentUser, settings, audio);
        patchSettings({ enabled: false });
        setPlaying(false);
      }
    } catch {
      setMessage(labels.blocked);
      window.clearTimeout(togglePlayback.timer);
      togglePlayback.timer = window.setTimeout(() => setMessage(''), 2600);
    }
  };

  const handleUpload = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    const nextUrl = URL.createObjectURL(file);
    setFileUrl(nextUrl);
    patchSettings({ trackMode: 'upload', uploadName: file.name, enabled: false });
    setMessage(labels.uploaded);
    window.clearTimeout(handleUpload.timer);
    handleUpload.timer = window.setTimeout(() => setMessage(''), 2400);
    event.target.value = '';
  };

  const applyCustomUrl = () => {
    const value = customInput.trim();
    if (!/^https?:\/\//i.test(value) && !value.startsWith('/')) {
      setMessage(labels.badUrl);
      window.clearTimeout(applyCustomUrl.timer);
      applyCustomUrl.timer = window.setTimeout(() => setMessage(''), 2400);
      return;
    }
    patchSettings({ trackMode: 'url', customUrl: value, enabled: false });
  };

  const panel = (
    <section id="brian-nav-music-popover" className="brian-nav__popover brian-nav__music-popover" aria-label={labels.title}>
      <header className="brian-music-popover__header">
        <div>
          <strong>{labels.title}</strong>
          <small>{labels.subtitle}</small>
        </div>
        <button type="button" onClick={() => patchSettings({ expanded: false })} aria-label={labels.collapse} title={labels.collapse}>×</button>
      </header>

      <div className="brian-music-popover__body">
        <div className={`brian-music-popover__status ${playing ? 'is-playing' : ''}`}>
          <span aria-hidden="true">{playing ? '♪' : '♫'}</span>
          <div>
            <small>{playing ? labels.nowPlaying : labels.ready}</small>
            <strong>{settings.trackMode === 'upload' ? (settings.uploadName || labels.upload) : settings.trackMode === 'url' ? labels.url : labels.defaultTrack}</strong>
          </div>
          <button type="button" onClick={togglePlayback}>{playing ? labels.pause : labels.play}</button>
        </div>

        <label className="brian-music-popover__field">
          <span>{labels.source}</span>
          <select value={settings.trackMode} onChange={(event) => patchSettings({ trackMode: event.target.value, enabled: false })}>
            <option value="default">{labels.defaultTrack}</option>
            <option value="upload">{settings.uploadName || labels.upload}</option>
            <option value="url">{labels.url}</option>
          </select>
        </label>

        {settings.trackMode === 'url' ? (
          <div className="brian-music-popover__url-row">
            <input value={customInput} onChange={(event) => setCustomInput(event.target.value)} placeholder="https://.../music.mp3" />
            <button type="button" onClick={applyCustomUrl}>{labels.applyUrl}</button>
          </div>
        ) : null}

        <div className="brian-music-popover__controls">
          <button type="button" className="brian-music-popover__upload" onClick={() => fileInputRef.current?.click()}>{labels.upload}</button>
          <label className="brian-music-popover__volume">
            <span>{labels.volume}</span>
            <input type="range" min="0" max="1" step="0.01" value={settings.volume} onChange={(event) => patchSettings({ volume: Number(event.target.value) })} />
          </label>
          <label className="brian-music-popover__loop">
            <input type="checkbox" checked={settings.loop} onChange={(event) => patchSettings({ loop: event.target.checked })} />
            <span>{labels.loop}</span>
          </label>
          <input ref={fileInputRef} type="file" accept="audio/*,.mp3,.wav,.ogg,.m4a" hidden onChange={handleUpload} />
        </div>
      </div>

      <footer className="brian-music-popover__footer" aria-live="polite">{message || labels.note}</footer>
    </section>
  );

  return (
    <>
      <audio ref={audioRef} preload="none" hidden />
      {settings.expanded && popoverRoot ? createPortal(panel, popoverRoot) : null}
      {!externalLauncher && !settings.expanded ? null : null}
    </>
  );
}
