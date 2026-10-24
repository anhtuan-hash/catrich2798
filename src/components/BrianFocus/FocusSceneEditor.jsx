import React, { useEffect, useRef, useState } from 'react';
import { Check, CloudUpload, FileCode2, FileImage, Film, RotateCcw, ShieldCheck, X, Youtube, Link2, ArrowUp, ArrowDown, Trash2, ListVideo } from 'lucide-react';
import {
  saveFocusScene, sandboxFocusHtml, resolveFocusSceneMedia, validateFocusFile,
} from './focusSceneService.js';
import {
  buildFocusYoutubeEmbedUrl, parseFocusYoutubePlaylist,
  playlistIdsFromFocusPath, FOCUS_YOUTUBE_PLAYLIST_MAX,
} from './focusYoutube.js';

export default function FocusSceneEditor({ language = 'vi', currentUser, scene, onClose, onPublished }) {
  const vi = language !== 'en';
  const [draft, setDraft] = useState(() => ({ ...scene }));
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState({ src: '', html: '' });
  const [busy, setBusy] = useState(false);
  const [publishedPreview, setPublishedPreview] = useState({ src: '', html: '' });
  const [notice, setNotice] = useState('');
  const fileInput = useRef(null);

  useEffect(() => {
    if (file || scene.mediaType === 'default') return undefined;
    let active = true;
    resolveFocusSceneMedia(scene).then(result => {
      if (active) setPublishedPreview(result);
    }).catch(() => null);
    return () => { active = false; };
  }, [file, scene.mediaPath, scene.mediaType]);

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
      setDraft(previous => ({ ...previous, mediaType, mediaPath: '', youtubeUrl: '' }));
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
    setDraft(previous => ({ ...previous, mediaType: 'default', mediaPath: '', youtubeUrl: '' }));
    setNotice('');
  };

  const shownPreview = file ? preview : (
    draft.mediaType !== 'default' && draft.mediaPath === scene.mediaPath ? publishedPreview : { src: '', html: '' }
  );

  let youtubeIds = [];
  let youtubeError = '';
  if (draft.mediaType === 'youtube') {
    try {
      youtubeIds = parseFocusYoutubePlaylist(
        draft.youtubeUrl || playlistIdsFromFocusPath(draft.mediaPath),
      );
    } catch (error) { youtubeError = error?.message || String(error); }
  }
  const youtubePreviewUrl = youtubeIds.length ? buildFocusYoutubeEmbedUrl(youtubeIds[0], {
    autoplay: false, controls: true, playlistIds: youtubeIds,
    origin: typeof window === 'undefined' ? '' : window.location.origin,
  }) : '';
  const chooseYoutube = url => {
    setFile(null);
    setNotice('');
    setDraft(previous => ({
      ...previous, mediaType: 'youtube', mediaPath: '', youtubeUrl: url,
    }));
  };
  const changeYoutubeOrder = (mode, index) => {
    const ids = [...youtubeIds];
    if (mode === 'remove') ids.splice(index, 1);
    else {
      const other = mode === 'up' ? index - 1 : index + 1;
      if (other < 0 || other >= ids.length) return;
      [ids[index], ids[other]] = [ids[other], ids[index]];
    }
    chooseYoutube(ids.map(id => 'https://www.youtube.com/watch?v=' + id).join('\n'));
  };

  const label = draft.mediaType === 'image' ? (vi ? 'Ảnh' : 'Image')
    : draft.mediaType === 'video' ? 'Video'
      : draft.mediaType === 'html' ? 'HTML'
        : draft.mediaType === 'youtube' ? 'YouTube' : (vi ? 'Mặc định' : 'Default');
  const FileIcon = draft.mediaType === 'youtube' ? Youtube : draft.mediaType === 'html' ? FileCode2
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
        {shownPreview.src && draft.mediaType === 'image'
          ? <img src={shownPreview.src} alt="" /> : null}
        {shownPreview.src && draft.mediaType === 'video'
          ? <video src={shownPreview.src} autoPlay muted loop playsInline/> : null}
        {shownPreview.html && draft.mediaType === 'html'
          ? <iframe title="HTML preview" sandbox="allow-scripts" tabIndex={-1}
            referrerPolicy="no-referrer" srcDoc={shownPreview.html}/> : null}
        {youtubePreviewUrl && draft.mediaType === 'youtube'
          ? <iframe className="bfc-scene-editor__youtube-player"
              title={vi ? 'Xem thử video YouTube' : 'YouTube video preview'}
              src={youtubePreviewUrl}
              allow="encrypted-media; picture-in-picture"
              sandbox="allow-scripts allow-same-origin allow-presentation"
              referrerPolicy="strict-origin-when-cross-origin"
            /> : null}
        {!shownPreview.src && !shownPreview.html && !youtubePreviewUrl ? <span><FileIcon size={28}/><strong>{label}</strong>
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
      <div className="bfc-scene-editor__youtube-field">
        <label htmlFor="bfc-youtube-url">
          <Youtube size={18} aria-hidden="true"/>
          <strong>{vi ? 'Danh sách phát YouTube tự động' : 'Automatic YouTube playlist'}</strong>
        </label>
        <div className="bfc-scene-editor__youtube-input">
          <Link2 size={16} aria-hidden="true"/>
          <textarea id="bfc-youtube-url" rows={4}
            value={draft.mediaType === 'youtube' ? (draft.youtubeUrl || '') : ''}
            onChange={event => chooseYoutube(event.target.value)}
            placeholder={['https://www.youtube.com/watch?v=VIDEO_ID_1',
              'https://youtu.be/VIDEO_ID_2',
              'https://www.youtube.com/watch?v=VIDEO_ID_3'].join('\n')}
            disabled={busy} spellCheck={false}
            aria-describedby="bfc-youtube-playlist-hint"
          />
        </div>
        <small id="bfc-youtube-playlist-hint">{vi
          ? `Dán mỗi URL trên một dòng (tối đa ${FOCUS_YOUTUBE_PLAYLIST_MAX} video). Tự phát lần lượt theo thứ tự, chuyển bài khi kết thúc và lặp lại danh sách. Các link trùng sẽ được bỏ qua.`
          : `Paste one URL per line (up to ${FOCUS_YOUTUBE_PLAYLIST_MAX} videos). Plays in order, advances on completion and repeats the playlist. Duplicates are removed.`}</small>
        {draft.mediaType === 'youtube' ? <>
          <span className={`bfc-scene-editor__youtube-status ${youtubeIds.length ? 'is-valid' : 'is-invalid'}`}
            role="status">
            {youtubeIds.length
              ? <><ListVideo size={15}/>{vi ? `${youtubeIds.length} video hợp lệ · Sẵn sàng phát liên tục`
                : `${youtubeIds.length} valid videos · Continuous playback ready`}</>
              : (youtubeError || (vi ? 'Hãy dán liên kết YouTube.' : 'Paste YouTube links.'))}
          </span>
          {youtubeIds.length > 0 && <ol className="bfc-scene-editor__playlist" aria-label={vi?'Thứ tự phát':'Playlist order'}>
            {youtubeIds.map((id,index)=><li key={id} className="bfc-scene-editor__playlist-item">
              <span className="bfc-scene-editor__playlist-number">{index + 1}</span>
              <a href={`https://www.youtube.com/watch?v=${id}`} target="_blank"
                rel="noreferrer noopener" title={vi?'Mở trên YouTube':'Open on YouTube'}>
                {id}</a>
              <div className="bfc-scene-editor__playlist-actions">
                <button type="button" disabled={busy||index===0} onClick={()=>changeYoutubeOrder('up',index)}
                  aria-label={vi?`Đưa video ${index+1} lên`:`Move video ${index+1} up`}><ArrowUp size={14}/></button>
                <button type="button" disabled={busy||index===youtubeIds.length-1} onClick={()=>changeYoutubeOrder('down',index)}
                  aria-label={vi?`Đưa video ${index+1} xuống`:`Move video ${index+1} down`}><ArrowDown size={14}/></button>
                <button type="button" disabled={busy} onClick={()=>changeYoutubeOrder('remove',index)}
                  aria-label={vi?`Xóa video ${index+1}`:`Remove video ${index+1}`}><Trash2 size={14}/></button>
              </div>
            </li>)}
          </ol>}
        </> : null}
      </div>
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
