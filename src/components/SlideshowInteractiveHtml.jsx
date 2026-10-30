import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  Code2, Upload, X, Maximize2, Minimize2, ChevronLeft, ChevronRight,
  Play, Trash2, PanelBottomClose, PanelBottomOpen, FileCode2, RotateCcw,
  MonitorPlay, ShieldCheck, AlertCircle, CloudUpload, Cloud, HardDrive
} from 'lucide-react';
import './SlideshowInteractiveHtml.css';
import { isSupabaseConfigured } from '../utils/supabase.js';
import { listCloudHtmlFiles, uploadCloudHtmlFile, downloadCloudHtmlFile, deleteCloudHtmlFile } from './slideshowHtmlCloud.js';

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
 * Cloud files are private Supabase objects exposed to public viewers only for published albums.
 * Older browser-only files can be explicitly migrated by approved managers.
 * Sandbox intentionally omits allow-same-origin, top-navigation and popups.
 */
export default function SlideshowInteractiveHtml({ albumId, language = 'vi', canManage = false }) {
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
  const [cloudHtml, setCloudHtml] = useState({});
  const [cloudBusy, setCloudBusy] = useState(false);
  const panelRef = useRef(null);
  const uploadRef = useRef(null);
  const filesRef = useRef(files);
  const currentIdRef = useRef(currentId);
  filesRef.current = files;
  currentIdRef.current = currentId;

  useEffect(() => {
    let active = true;
    setLoading(true);
    setCloudHtml({});
    async function loadFiles() {
      const warnings = [];
      const [browserFiles, webFiles] = await Promise.all([
        readAlbum(albumId).then(items => items.map(item => ({ ...item, scope: 'local' })))
          .catch(() => { warnings.push(en ? 'Browser-only collection unavailable.' : 'Không đọc được file lưu trên thiết bị.'); return []; }),
        isSupabaseConfigured ? listCloudHtmlFiles(albumId)
          .catch(error => { warnings.push((en ? 'Cloud: ' : 'Kho web: ') + (error.message || error)); return []; })
          : Promise.resolve([])
      ]);
      if (!active) return;
      const combined = [...webFiles, ...browserFiles];
      setFiles(combined);
      setCurrentId(combined[0]?.id || null);
      setNotice(warnings.join(' · '));
      setLoading(false);
    }
    void loadFiles();
    return () => { active = false; };
  }, [albumId, canManage]);

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

  useEffect(() => {
    if (!active?.storagePath || cloudHtml[active.id] !== undefined) return undefined;
    let activeRequest = true;
    downloadCloudHtmlFile(active).then(html => {
      if (activeRequest) setCloudHtml(old => ({ ...old, [active.id]: html }));
    }).catch(error => {
      if (activeRequest) {
        setCloudHtml(old => ({ ...old, [active.id]: null }));
        setNotice((en ? 'Cannot load web file: ' : 'Không mở được file trên web: ') + (error.message || error));
      }
    });
    return () => { activeRequest = false; };
  }, [active?.id, active?.storagePath, cloudHtml[active?.id], en]);

  const saveLocalFile = async item => {
    if (!item?.html || !canManage || !isSupabaseConfigured || cloudBusy) return;
    setCloudBusy(true);
    try {
      const saved = await uploadCloudHtmlFile({ albumId, name: item.name, html: item.html, size: item.size });
      try { await deleteRecord(item.id); } catch { /* Duplicate local copy may remain until browser cleanup. */ }
      setCloudHtml(old => ({ ...old, [saved.id]: item.html }));
      setFiles(old => old.map(file => file.id === item.id ? saved : file));
      setCurrentId(saved.id);
      setNotice(en ? 'Saved on BRIAN website. It will be available on other devices.' : 'Đã lưu file lên website BRIAN. Có thể mở từ thiết bị khác.');
    } catch (error) {
      setNotice((en ? 'Web save failed: ' : 'Lưu lên web thất bại: ') + (error.message || error));
    } finally { setCloudBusy(false); }
  };

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
    const uploaded = [];
    const local = [];
    for (const record of accepted) {
      if (canManage && isSupabaseConfigured) {
        try {
          const saved = await uploadCloudHtmlFile({ albumId, name: record.name, html: record.html, size: record.size });
          uploaded.push(saved);
          setCloudHtml(old => ({ ...old, [saved.id]: record.html }));
        } catch (error) {
          errors.push(record.name + ': ' + (error.message || error));
        }
      } else {
        local.push({ ...record, scope: 'local' });
      }
    }
    if (local.length) {
      try { await writeRecords(local); }
      catch { errors.push(en ? 'Could not persist browser-only files.' : 'Không thể lưu file trên trình duyệt.'); }
    }
    const added = [...uploaded, ...local];
    if (added.length) {
      setFiles(old => [...old, ...added]);
      setCurrentId(added[0].id);
      setReloadKey(v => v + 1);
    }
    setNotice(errors.length ? errors.join(' · ') : (en ? 'Added ' : 'Đã thêm ') +
      (errors.length ? '' : added.length + (en ? ' HTML file(s).' : ' file HTML.') +
        (uploaded.length ? (en ? ' Saved on BRIAN website.' : ' Đã lưu lên website BRIAN.') : '')));
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
    if (!item || (item.storagePath && !canManage)) return;
    if (!window.confirm(item.storagePath
      ? (en ? 'Permanently delete this HTML file from the website?' : 'Xóa vĩnh viễn file HTML này khỏi website?')
      : (en ? 'Remove this HTML file from this browser?' : 'Xóa file HTML này khỏi trình duyệt?'))) return;
    try {
      if (item.storagePath) await deleteCloudHtmlFile(item);
      else await deleteRecord(item.id);
    } catch (error) {
      setNotice((en ? 'Cannot delete file: ' : 'Không xóa được file: ') + (error.message || error));
      return;
    }
    setCloudHtml(old => { const next = { ...old }; delete next[item.id]; return next; });
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
            <small>BRIAN · {files.length} {en ? 'FILES' : 'FILE'} · {en ? 'WEB LIBRARY + DEVICE' : 'KHO WEB + THIẾT BỊ'}</small>
          </div>
          <div className="bss-html-toolbar-actions">
            {canManage && active && !active.storagePath && <button type="button"
              className="bss-html-cloud-save" disabled={cloudBusy}
              title={en ? 'Save this browser-only file to the website' : 'Lưu file từ trình duyệt lên website'}
              onClick={() => { void saveLocalFile(active); }}>
              <CloudUpload size={16}/><span>{en ? 'Save to web' : 'Lưu lên web'}</span>
            </button>}
            <label className="bss-html-upload" title={en ? 'Upload HTML files' : 'Tải lên file HTML'}>
              <Upload size={16}/><span>{en ? 'Upload HTML' : 'Tải HTML'}</span>
              <input ref={uploadRef} type="file" accept=".html,.htm,text/html" multiple disabled={importing || cloudBusy}
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
            {active ? (active.storagePath && cloudHtml[active.id] === undefined
              ? <div className="bss-html-empty"><Cloud size={33}/><h3>{en ? 'Loading HTML from BRIAN…' : 'Đang mở file từ website BRIAN…'}</h3></div>
              : active.storagePath && cloudHtml[active.id] === null
                ? <div className="bss-html-empty"><AlertCircle size={32}/><h3>{en ? 'Could not load the web file' : 'Không tải được file trên web'}</h3>
                    <button type="button" className="bss-html-empty-cta"
                      onClick={() => setCloudHtml(old => { const next = { ...old }; delete next[active.id]; return next; })}>
                      <RotateCcw size={16}/>{en ? 'Try again' : 'Thử lại'}</button></div>
                : <iframe
                    key={active.id + '-' + reloadKey}
                    title={active.name}
                    sandbox="allow-scripts allow-forms allow-modals allow-pointer-lock allow-downloads"
                    allow="autoplay; fullscreen"
                    referrerPolicy="no-referrer"
                    srcDoc={active.storagePath ? cloudHtml[active.id] : active.html}
                  />) : <div className="bss-html-empty">
              <span className="bss-html-empty-icon"><FileCode2 size={37}/></span>
              <h3>{loading ? (en ? 'Loading saved files…' : 'Đang tải file đã lưu…') :
                (en ? 'Run your HTML activities here' : 'Trình chiếu hoạt động HTML ngay tại đây')}</h3>
              <p>{en ? 'Upload a standalone .html file (or several) to launch an interactive game, quiz, presentation or teaching activity.' :
                'Tải lên một hoặc nhiều file .html độc lập để chạy trò chơi, câu hỏi, bài trình chiếu hoặc hoạt động tương tác.'}</p>
              <button type="button" className="bss-html-empty-cta" onClick={() => uploadRef.current?.click()}>
                <Upload size={16}/>{en ? 'Choose HTML files' : 'Chọn file HTML'}
              </button>
              <small><ShieldCheck size={14}/>{canManage ? (en ? 'Managers save HTML to the BRIAN website; activities remain sandboxed.' : 'Tài khoản quản lý lưu HTML lên web; trò chơi vẫn chạy cách ly.') : (en ? 'Local uploads stay on this device. Published web files can be opened by everyone.' : 'File tải lên của khách chỉ lưu trên máy này; file web đã công bố có thể mở trên mọi máy.')}</small>
            </div>}
          </div>
          {!!files.length && <div className="bss-html-filebar">
            {files.map((file, index) => <div key={file.id} className={'bss-html-file-chip' + (file.id === active?.id ? ' is-active' : '')}>
              <button type="button" onClick={() => pick(index)} title={file.name}>
                {file.storagePath ? <Cloud size={14}/> : <HardDrive size={14}/>}<span>{file.name}</span>
              </button>
              {(!file.storagePath || canManage) && <button type="button" className="bss-html-file-delete" onClick={() => { void remove(file); }}
                title={en ? 'Remove file' : 'Xóa file'} aria-label={(en ? 'Remove ' : 'Xóa ') + file.name}><Trash2 size={13}/></button>}
            </div>)}
          </div>}
          <div className="bss-html-foot">
            <span><ShieldCheck size={13}/>{en
              ? 'Sandboxed · Published web files available across devices · Local files marked with drive icon'
              : 'Chạy cách ly · File trên web dùng được nhiều thiết bị · File trên máy có biểu tượng ổ đĩa'}</span>
            {notice && <span className="bss-html-notice" role="status"><AlertCircle size={13}/>{notice}</span>}
          </div>
        </div>
      </section>, document.body)}
  </>;
}
