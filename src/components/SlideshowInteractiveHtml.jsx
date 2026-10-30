import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Code2, Upload, X, Maximize2, Minimize2, ChevronLeft, ChevronRight,
  Play, Trash2, PanelBottomClose, PanelBottomOpen, FileCode2, RotateCcw,
  MonitorPlay, ShieldCheck, AlertCircle
} from 'lucide-react';
import './SlideshowInteractiveHtml.css';

const DB_NAME = 'brian-slideshow-interactive-html-v1';
const STORE = 'html-files';
const MAX_FILES = 30;
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function openDatabase() {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: 'id' });
        store.createIndex('albumId', 'albumId', { unique: false });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Cannot open storage'));
  });
}

async function readAlbum(albumId) {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const request = tx.objectStore(STORE).index('albumId').getAll(albumId);
      request.onsuccess = () => resolve((request.result || []).sort((a, b) =>
        (a.position ?? a.createdAt) - (b.position ?? b.createdAt)));
      request.onerror = () => reject(request.error);
    });
  } finally { db.close(); }
}

async function writeRecords(records) {
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      records.forEach(record => tx.objectStore(STORE).put(record));
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}

async function deleteRecord(id) {
  const db = await openDatabase();
  try {
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
      tx.onabort = () => reject(tx.error);
    });
  } finally { db.close(); }
}

/**
 * A self-contained interactive HTML file runner for the showcase.
 * Files stay on this browser in IndexedDB, never uploaded to the public site.
 * Sandbox intentionally omits allow-same-origin, top-navigation and popups.
 */
export default function SlideshowInteractiveHtml({ albumId, language = 'vi' }) {
  const en = language === 'en';
  const [open, setOpen] = useState(false);
  const [minimized, setMinimized] = useState(false);
  const [files, setFiles] = useState([]);
  const [currentId, setCurrentId] = useState(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const panelRef = useRef(null);
  const uploadRef = useRef(null);
  const filesRef = useRef(files);
  const currentIdRef = useRef(currentId);
  filesRef.current = files;
  currentIdRef.current = currentId;

  useEffect(() => {
    let active = true;
    readAlbum(albumId).then(items => {
      if (!active) return;
      setFiles(items);
      setCurrentId(items[0]?.id || null);
      setLoading(false);
    }).catch(() => {
      if (!active) return;
      setNotice(en ? 'Browser storage is unavailable; files will stay until this page closes.' :
        'Trình duyệt không cho lưu file; dữ liệu chỉ tồn tại trong phiên này.');
      setLoading(false);
    });
    return () => { active = false; };
  }, [albumId]);

  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === panelRef.current);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    const handler = event => {
      if (event.key === 'Escape' && document.fullscreenElement !== panelRef.current) {
        event.stopPropagation();
        setOpen(false);
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  const activeIndex = files.findIndex(item => item.id === currentId);
  const active = files[activeIndex] || files[0] || null;

  const importFiles = async fileList => {
    const candidates = Array.from(fileList || []);
    if (!candidates.length) return;
    setImporting(true);
    const errors = [];
    const accepted = [];
    let index = 0;
    for (const file of candidates) {
      if (!/\.html?$/i.test(file.name)) { errors.push(file.name + ': ' + (en ? 'HTML files only' : 'chỉ nhận file HTML')); continue; }
      if (!file.size || file.size > MAX_FILE_BYTES) { errors.push(file.name + ': ' + (en ? 'limit 8 MB' : 'giới hạn 8 MB')); continue; }
      if (filesRef.current.length + accepted.length >= MAX_FILES) { errors.push(en ? 'Maximum 30 HTML files' : 'Tối đa 30 file HTML'); break; }
      try {
        const html = await file.text();
        if (!html.trim()) throw new Error(en ? 'Empty file' : 'File rỗng');
        const id = albumId + ':' + (typeof crypto?.randomUUID === 'function' ? crypto.randomUUID() : Date.now() + '-' + index);
        accepted.push({
          id, albumId, name: file.name, html,
          createdAt: Date.now() + index, position: Date.now() + index, size: file.size
        });
        index++;
      } catch (error) {
        errors.push(file.name + ': ' + (error?.message || (en ? 'Read error' : 'Không đọc được')));
      }
    }
    if (accepted.length) {
      try { await writeRecords(accepted); }
      catch { errors.push(en ? 'Could not save to this browser; files remain available this session.' :
        'Không lưu được vào trình duyệt; file vẫn dùng được trong phiên hiện tại.'); }
      setFiles(old => [...old, ...accepted]);
      setCurrentId(accepted[0].id);
      setReloadKey(v => v + 1);
    }
    setNotice(errors.length ? errors.join(' · ') : (en ? 'Added ' : 'Đã thêm ') +
      (errors.length ? '' : accepted.length + (en ? ' HTML file(s).' : ' file HTML.')));
    setImporting(false);
  };

  const pick = index => {
    const next = files[(index + files.length) % files.length];
    if (!next) return;
    setCurrentId(next.id);
    setReloadKey(v => v + 1);
    setNotice('');
  };

  const remove = async item => {
    if (!item || !window.confirm(en ? 'Remove this HTML file from your browser?' :
      'Xóa file HTML này khỏi trình duyệt?')) return;
    try { await deleteRecord(item.id); }
    catch { setNotice(en ? 'Browser save unavailable; removing from this session.' :
      'Không thể cập nhật bộ nhớ, file chỉ được xóa trong phiên hiện tại.'); }
    const next = files.filter(f => f.id !== item.id);
    setFiles(next);
    if (currentId === item.id) {
      const selected = next[Math.min(Math.max(activeIndex, 0), next.length - 1)];
      setCurrentId(selected?.id || null);
      setReloadKey(v => v + 1);
    }
  };

  const fullScreen = async () => {
    try {
      if (document.fullscreenElement === panelRef.current) await document.exitFullscreen();
      else await panelRef.current?.requestFullscreen?.();
    } catch {
      setNotice(en ? 'Fullscreen is not available in this browser.' : 'Trình duyệt không cho mở toàn màn hình.');
    }
  };
  const close = async () => {
    if (document.fullscreenElement === panelRef.current) {
      try { await document.exitFullscreen(); } catch { /* Browser may already have exited. */ }
    }
    setOpen(false);
    setMinimized(false);
  };

  return <>
    <button type="button" className="bss-pill bss-html-trigger"
      title={en ? 'Run interactive HTML files' : 'Chạy file HTML tương tác'}
      aria-expanded={open}
      onClick={() => { setOpen(v => !v); setMinimized(false); }}>
      <Code2 size={17}/><span>{en ? 'Interactive HTML' : 'HTML tương tác'}</span>
    </button>
    {open && createPortal(
      <section ref={panelRef}
        className={'bss-html-workspace' + (minimized ? ' is-minimized' : '') + (isFullscreen ? ' is-fullscreen' : '')}
        role="dialog" aria-label={en ? 'Interactive HTML studio' : 'Trình chạy HTML tương tác'}
        onKeyDown={event => {
          if (['Space', 'ArrowLeft', 'ArrowRight'].includes(event.code)) event.stopPropagation();
        }}>
        <header className="bss-html-toolbar">
          <span className="bss-html-logo"><Code2 size={20}/></span>
          <div className="bss-html-heading">
            <strong>{en ? 'Interactive HTML Studio' : 'HTML Interactive Studio'}</strong>
            <small>BRIAN · {files.length} {en ? 'FILES' : 'FILE'} · {en ? 'LOCAL COLLECTION' : 'BỘ SƯU TẬP CỤC BỘ'}</small>
          </div>
          <div className="bss-html-toolbar-actions">
            <label className="bss-html-upload" title={en ? 'Upload HTML files' : 'Tải lên file HTML'}>
              <Upload size={16}/><span>{en ? 'Upload HTML' : 'Tải HTML'}</span>
              <input ref={uploadRef} type="file" accept=".html,.htm,text/html" multiple disabled={importing}
                onChange={event => { const chosen = event.target.files; void importFiles(chosen); event.target.value = ''; }}/>
            </label>
            <button type="button" className="bss-html-square" onClick={() => setMinimized(v => !v)}
              title={minimized ? (en ? 'Restore' : 'Mở rộng') : (en ? 'Minimize' : 'Thu nhỏ')}
              aria-label={minimized ? (en ? 'Restore' : 'Mở rộng') : (en ? 'Minimize' : 'Thu nhỏ')}>
              {minimized ? <PanelBottomOpen size={17}/> : <PanelBottomClose size={17}/>}
            </button>
            <button type="button" className="bss-html-square" onClick={() => { void fullScreen(); }}
              title={isFullscreen ? (en ? 'Exit fullscreen' : 'Thoát toàn màn hình') : (en ? 'Fullscreen' : 'Toàn màn hình')}
              aria-label={isFullscreen ? (en ? 'Exit fullscreen' : 'Thoát toàn màn hình') : (en ? 'Fullscreen' : 'Toàn màn hình')}>
              {isFullscreen ? <Minimize2 size={17}/> : <Maximize2 size={17}/>}
            </button>
            <button type="button" className="bss-html-square" onClick={() => { void close(); }}
              title={en ? 'Close' : 'Đóng'} aria-label={en ? 'Close' : 'Đóng'}><X size={18}/></button>
          </div>
        </header>
        <div className="bss-html-body">
          <div className="bss-html-subtoolbar">
            <div className="bss-html-active-label"><MonitorPlay size={15}/>
              <strong title={active?.name || ''}>{active?.name || (en ? 'No file selected' : 'Chưa chọn file HTML')}</strong>
            </div>
            <div className="bss-html-nav">
              <span>{files.length ? (Math.max(activeIndex, 0) + 1) + ' / ' + files.length : '0 / 0'}</span>
              <button type="button" onClick={() => pick(activeIndex - 1)} disabled={files.length < 2}
                title={en ? 'Previous file' : 'File trước'} aria-label={en ? 'Previous file' : 'File trước'}>
                <ChevronLeft size={19}/>
              </button>
              <button type="button" onClick={() => pick(activeIndex + 1)} disabled={files.length < 2}
                title={en ? 'Next file' : 'File tiếp'} aria-label={en ? 'Next file' : 'File tiếp'}>
                <ChevronRight size={19}/>
              </button>
              <button type="button" onClick={() => setReloadKey(v => v + 1)} disabled={!active}
                title={en ? 'Restart HTML file' : 'Chạy lại file HTML'}
                aria-label={en ? 'Restart HTML file' : 'Chạy lại file HTML'}><RotateCcw size={16}/></button>
            </div>
          </div>
          <div className="bss-html-stage">
            {active ? <iframe
              key={active.id + '-' + reloadKey}
              title={active.name}
              sandbox="allow-scripts allow-forms allow-modals allow-pointer-lock allow-downloads"
              allow="autoplay; fullscreen"
              referrerPolicy="no-referrer"
              srcDoc={active.html}
            /> : <div className="bss-html-empty">
              <span className="bss-html-empty-icon"><FileCode2 size={37}/></span>
              <h3>{loading ? (en ? 'Loading saved files…' : 'Đang tải file đã lưu…') :
                (en ? 'Run your HTML activities here' : 'Trình chiếu hoạt động HTML ngay tại đây')}</h3>
              <p>{en ? 'Upload a standalone .html file (or several) to launch an interactive game, quiz, presentation or teaching activity.' :
                'Tải lên một hoặc nhiều file .html độc lập để chạy trò chơi, câu hỏi, bài trình chiếu hoặc hoạt động tương tác.'}</p>
              <button type="button" className="bss-html-empty-cta" onClick={() => uploadRef.current?.click()}>
                <Upload size={16}/>{en ? 'Choose HTML files' : 'Chọn file HTML'}
              </button>
              <small><ShieldCheck size={14}/>{en ? 'Files stay on this device. HTML is isolated from BRIAN.' :
                'File lưu trên thiết bị này; nội dung HTML được cách ly khỏi BRIAN.'}</small>
            </div>}
          </div>
          {!!files.length && <div className="bss-html-filebar">
            {files.map((file, index) => <div key={file.id} className={'bss-html-file-chip' + (file.id === active?.id ? ' is-active' : '')}>
              <button type="button" onClick={() => pick(index)} title={file.name}>
                <FileCode2 size={14}/><span>{file.name}</span>
              </button>
              <button type="button" className="bss-html-file-delete" onClick={() => { void remove(file); }}
                title={en ? 'Remove file' : 'Xóa file'} aria-label={(en ? 'Remove ' : 'Xóa ') + file.name}><Trash2 size={13}/></button>
            </div>)}
          </div>}
          <div className="bss-html-foot">
            <span><ShieldCheck size={13}/>{en
              ? 'Sandboxed · HTML files stored locally · Standalone HTML recommended'
              : 'Chạy cách ly · File lưu trên trình duyệt · Nên dùng HTML độc lập'}</span>
            {notice && <span className="bss-html-notice" role="status"><AlertCircle size={13}/>{notice}</span>}
          </div>
        </div>
      </section>, document.body)}
  </>;
}
