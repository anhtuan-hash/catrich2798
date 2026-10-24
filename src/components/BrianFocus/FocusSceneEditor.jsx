import React, { useEffect, useRef, useState } from 'react';
import { Check, CloudUpload, FileCode2, FileImage, Film, RotateCcw, ShieldCheck, X } from 'lucide-react';
import {
  saveFocusScene, sandboxFocusHtml, validateFocusFile,
} from './focusSceneService.js';

export default function FocusSceneEditor({ language = 'vi', currentUser, scene, onClose, onPublished }) {
  const vi = language !== 'en';
  const [draft, setDraft] = useState(() => ({ ...scene }));
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState({ src: '', html: '' });
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const fileInput = useRef(null);

  useEffect(() => {
    if (!file) {
      setPreview({ src: '', html: '' });
      return undefined;
    }
    let active = true;
    if (draft.mediaType === 'html') {
      file.text().then(html => {
        if (active) setPreview({ src: '', html: sandboxFocusHtml(html) });
      }).catch(() => setNotice(vi ? 'Không đọc được HTML.' : 'Cannot read HTML file.'));
      return () => { active = false; };
    }
    const url = URL.createObjectURL(file);
    setPreview({ src: url, html: '' });
    return () => { URL.revokeObjectURL(url); };
  }, [file, draft.mediaType, vi]);

  const uploadSelection = event => {
    const selected = event.target.files?.[0];
    event.target.value = '';
    if (!selected) return;
    try {
      const { mediaType } = validateFocusFile(selected);
      setFile(selected);
      setDraft(previous => ({ ...previous, mediaType, mediaPath: '' }));
      setNotice('');
    } catch (error) { setNotice(error?.message || String(error)); }
  };

  const publish = async () => {
    setBusy(true);
    setNotice('');
    try {
      const result = await saveFocusScene(currentUser, draft, file);
      onPublished(result);
      setFile(null);
      setDraft(result);
      onClose();
    } catch (error) {
      setNotice(error?.message || (vi ? 'Không thể lưu cấu hình.' : 'Unable to save configuration.'));
    } finally { setBusy(false); }
  };

  const reset = () => {
    setFile(null);
    setDraft(previous => ({ ...previous, mediaType: 'default', mediaPath: '' }));
    setNotice('');
  };

  const label = draft.mediaType === 'image' ? (vi ? 'Ảnh' : 'Image')
    : draft.mediaType === 'video' ? 'Video'
      : draft.mediaType === 'html' ? 'HTML' : (vi ? 'Mặc định' : 'Default');
  const FileIcon = draft.mediaType === 'html' ? FileCode2
    : draft.mediaType === 'video' ? Film : FileImage;

  return <section className="bfc-scene-editor" role="region"
    aria-label={vi ? 'Cài đặt nền Focus dùng chung' : 'Shared Focus background settings'}>
    <header className="bfc-scene-editor__head">
      <div>
        <small>BRIAN FOCUS / SCENE STUDIO</small>
        <h2>{vi ? 'Nền Focus dùng chung' : 'Shared Focus background'}</h2>
        <p>{vi ? 'Admin / TTCM thay đổi một lần, mọi tài khoản cùng sử dụng.' : 'A single shared background for every approved account.'}</p>
      </div>
      <button type="button" className="bfc-scene-editor__close" onClick={onClose} aria-label={vi ? 'Đóng cài đặt' : 'Close settings'}>
        <X size={19}/>
      </button>
    </header>

    <div className="bfc-scene-editor__body">
      <div className="bfc-scene-editor__preview">
        {preview.src && draft.mediaType === 'image'
          ? <img src={preview.src} alt="" /> : null}
        {preview.src && draft.mediaType === 'video'
          ? <video src={preview.src} autoPlay muted loop playsInline/> : null}
        {preview.html && draft.mediaType === 'html'
          ? <iframe title="HTML preview" sandbox="allow-scripts" tabIndex={-1}
            referrerPolicy="no-referrer" srcDoc={preview.html}/> : null}
        {!preview.src && !preview.html ? <span><FileIcon size={28}/><strong>{label}</strong>
          <small>{vi ? 'Nền hiện hành hoặc hình nền mặc định' : 'Published scene or default background'}</small>
        </span> : null}
      </div>
      <div className="bfc-scene-editor__current">
        <ShieldCheck size={16}/>
        <span>{vi ? 'Đang công bố:' : 'Published:'} <strong>{
          scene.mediaType === 'default' ? (vi ? 'Nền mặc định' : 'Default') : scene.mediaType.toUpperCase()
        }</strong></span>
      </div>
      <input type="file" hidden ref={fileInput}
        accept=".html,text/html,image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm"
        onChange={uploadSelection}/>
      <button type="button" className="bfc-scene-editor__upload" disabled={busy}
        onClick={() => fileInput.current?.click()}>
        <CloudUpload size={23}/>
        <span><strong>{vi ? 'Tải ảnh, video hoặc HTML' : 'Upload image, video or HTML'}</strong>
        <small>JPG / PNG / WebP / GIF ≤ 8 MB · MP4 / WebM ≤ 50 MB · HTML ≤ 512 KB</small></span>
      </button>
      {file ? <p className="bfc-scene-editor__selected"><Check size={14}/>{file.name}</p> : null}
      <p className="bfc-scene-editor__tip">{vi
        ? 'HTML nên là một tệp tự chứa. Nội dung chạy trong khung cách ly, không được truy cập tài khoản, mạng hoặc các trang khác.'
        : 'Use self-contained HTML. It runs in an isolated sandbox without account or network access.'}</p>

      <div className="bfc-scene-editor__setting">
        <label htmlFor="bfc-scene-fit">{vi ? 'Hiển thị ảnh/video' : 'Image/video fit'}</label>
        <select id="bfc-scene-fit" value={draft.mediaFit}
          onChange={event => setDraft(value => ({ ...value, mediaFit: event.target.value }))}>
          <option value="cover">{vi ? 'Phủ kín màn hình' : 'Fill screen'}</option>
          <option value="contain">{vi ? 'Giữ trọn hình' : 'Fit inside screen'}</option>
        </select>
      </div>
      <div className="bfc-scene-editor__setting">
        <label htmlFor="bfc-scene-dim">
          {vi ? 'Lớp tối bảo vệ đồng hồ' : 'Clock contrast overlay'} <output>{draft.dimPercent}%</output>
        </label>
        <input id="bfc-scene-dim" type="range" min="0" max="85" step="5"
          value={draft.dimPercent} onChange={event => setDraft(value => ({ ...value, dimPercent: Number(event.target.value) }))}/>
      </div>
      <button type="button" className="bfc-scene-editor__reset" onClick={reset} disabled={busy}>
        <RotateCcw size={15}/> {vi ? 'Chọn lại nền mặc định' : 'Use default background'}
      </button>
      {notice && <div className="bfc-scene-editor__notice" role="alert">{notice}</div>}
    </div>
    <footer className="bfc-scene-editor__footer">
      <span><ShieldCheck size={15}/>{vi ? 'Lưu trên Supabase · Đồng bộ toàn hệ thống' : 'Supabase · Synced to all accounts'}</span>
      <button type="button" className="bfc-scene-editor__publish"
        disabled={busy} onClick={publish}>
        <Check size={16}/>{busy
          ? (vi ? 'Đang tải lên & lưu…' : 'Uploading & saving…')
          : (vi ? 'Lưu & đồng bộ' : 'Save & sync')}
      </button>
    </footer>
  </section>;
}
