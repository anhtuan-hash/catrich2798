import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft, ArrowRight, Camera, Check, ChevronLeft, ChevronRight, Copy, Expand,
  Eye, EyeOff, Images, Maximize2, Pause, Play, Plus, QrCode, RefreshCw, Save,
  Settings2, Trash2, UploadCloud, X
} from 'lucide-react';
import { supabase, isSupabaseConfigured } from '../utils/supabase.js';
import { isDepartmentLeaderRole, isAdminRole } from '../utils/roles.js';
import PhotoJudgingAdmin from '../components/PhotoJudgingAdmin.jsx';
import PhotoJudgingPage from '../components/PhotoJudgingPage.jsx';
import PhotoJuryLive from '../components/PhotoJuryLive.jsx';
import PhotoAudienceLive from '../components/PhotoAudienceLive.jsx';
import { HALLOWEEN_ALBUM_ID } from '../utils/photoAudienceScreen.js';
import PhotoTransitionStage from '../components/PhotoTransitionStage.jsx';
import SlideshowLinkedText from '../components/SlideshowLinkedText.jsx';
import './PhotoSlideshow.css';
import './PhotoSlideshowGalleryV2.css';
import './PhotoSlideshowFestival.css';

const BUCKET = 'brian-slideshows';
const TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);
const EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif', 'image/avif': 'avif' };
const MAX_SIZE = 10 * 1024 * 1024;

function readSlug() {
  try {
    return String(new URLSearchParams((window.location.hash.split('?')[1] || '')).get('album') || '');
  } catch { return ''; }
}
function shareUrl(slug) {
  const url = new URL(window.location.href);
  url.hash = '#/slideshow' + (slug ? '?album=' + encodeURIComponent(slug) : '');
  return url.toString();
}
function imageUrl(path) {
  if (!path) return '';
  return supabase.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl || '';
}
function slugify(text) {
  return (text || 'album').toLowerCase().replace(/đ/g, 'd')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 65) || 'album';
}
const EMPTY_FORM = { title: '', description: '', slide_interval: 6, transition: 'fade', is_published: false };

function announceSlideshowChange() {
  // Same-tab event and cross-tab storage signal, never containing student data.
  window.dispatchEvent(new Event('bes-slideshow-published-updated'));
  try {
    window.localStorage.setItem('bes-slideshow-published-revision', String(Date.now()));
  } catch { /* Storage may be disabled by the browser. */ }
}

export default function PhotoSlideshow({ currentUser, language = 'vi' }) {
  const en = language === 'en';
  const editorAllowed = Boolean(currentUser?.provider === 'supabase' && isDepartmentLeaderRole(currentUser?.role) && currentUser?.approved !== false);
  const [albums, setAlbums] = useState([]);
  const [slides, setSlides] = useState([]);
  const [slug, setSlug] = useState(readSlug);
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [direction, setDirection] = useState(1);
  const [qr, setQr] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const stageRef = useRef(null);
  const touchRef = useRef(null);
  const preserveEditorOnNavigation = useRef(false);
  const selected = useMemo(() => albums.find(a => a.slug === slug), [albums, slug]);
  const ordered = useMemo(() => selected
    ? slides.filter(s => s.album_id === selected.id).sort((a, b) =>
      (a.sort_order - b.sort_order) || a.created_at.localeCompare(b.created_at)) : [], [slides, selected]);
  const active = ordered[Math.min(index, Math.max(ordered.length - 1, 0))];
  const t = en
    ? { title:'Photo Slideshow', subtitle:'Every school moment, beautifully presented', albums:'Galleries', none:'No published albums yet.', manage:'Manage albums', done:'Back to viewer', create:'New album', open:'Open slideshow', edit:'Edit album', upload:'Upload photos', published:'Public', draft:'Draft', copy:'Copy public link', qr:'Show QR code', play:'Play', pause:'Pause', fullscreen:'Fullscreen', exit:'Exit fullscreen' }
    : { title:'Trình chiếu ảnh', subtitle:'Lưu giữ và trình chiếu những khoảnh khắc đáng nhớ', albums:'Bộ sưu tập ảnh', none:'Chưa có album nào được xuất bản.', manage:'Quản lý album', done:'Trở về trình chiếu', create:'Tạo album mới', open:'Xem trình chiếu', edit:'Chỉnh sửa album', upload:'Tải ảnh lên', published:'Công khai', draft:'Bản nháp', copy:'Sao chép liên kết', qr:'Hiện mã QR', play:'Phát', pause:'Tạm dừng', fullscreen:'Toàn màn hình', exit:'Thoát toàn màn hình' };

  const refresh = useCallback(async () => {
    if (!isSupabaseConfigured) {
      setError('Supabase chưa được cấu hình trên website.');
      setLoading(false);
      return;
    }
    try {
      const [a, s] = await Promise.all([
        supabase.from('bes_slideshow_albums').select('*').order('created_at', { ascending: false }),
        supabase.from('bes_slideshow_slides').select('*').order('sort_order', { ascending: true })
      ]);
      if (a.error) throw a.error;
      if (s.error) throw s.error;
      setAlbums(a.data || []);
      setSlides(s.data || []);
      setError('');
    } catch (e) { setError(e.message || 'Không tải được bộ sưu tập.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const onHash = () => {
      setSlug(readSlug()); setIndex(0); setPlaying(true);
      setEditing(preserveEditorOnNavigation.current);
      preserveEditorOnNavigation.current = false;
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  useEffect(() => { void refresh(); }, [refresh, currentUser?.id]);
  useEffect(() => {
    if (selected && !creating) setForm({
      title: selected.title, description: selected.description,
      slide_interval: selected.slide_interval, transition: selected.transition,
      is_published: selected.is_published
    });
  }, [selected?.id, selected?.updated_at, creating]);
  useEffect(() => { setIndex(0); setDirection(1); }, [selected?.id]);
  useEffect(() => {
    if (ordered.length < 2) return;
    const neighbors = [ordered[(index + 1) % ordered.length], ordered[(index - 1 + ordered.length) % ordered.length]];
    neighbors.forEach((slide) => { if (slide?.image_path) { const image = new Image(); image.src = imageUrl(slide.image_path); } });
  }, [selected?.id, index, ordered.length]);
  useEffect(() => {
    if (!selected || !playing || editing || ordered.length < 2) return undefined;
    const timeout = window.setTimeout(() => { setDirection(1); setIndex(v => (v + 1) % ordered.length); }, selected.slide_interval * 1000);
    return () => window.clearTimeout(timeout);
  }, [selected?.id, selected?.slide_interval, ordered.length, playing, editing, index]);
  useEffect(() => {
    const onFullscreen = () => setFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFullscreen);
    return () => document.removeEventListener('fullscreenchange', onFullscreen);
  }, []);
  useEffect(() => {
    if (!selected || editing) return undefined;
    const onKey = e => {
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName || '')) return;
      if (e.key === 'ArrowRight') { e.preventDefault(); setDirection(1); setIndex(v => (v + 1) % Math.max(ordered.length, 1)); }
      if (e.key === 'ArrowLeft') { e.preventDefault(); setDirection(-1); setIndex(v => (v - 1 + ordered.length) % Math.max(ordered.length, 1)); }
      if (e.code === 'Space') { e.preventDefault(); setPlaying(v => !v); }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [selected?.id, ordered.length, editing]);

  const previousPhoto = () => { if (ordered.length > 1) { setDirection(-1); setIndex(v => (v - 1 + ordered.length) % ordered.length); } };
  const nextPhoto = () => { if (ordered.length > 1) { setDirection(1); setIndex(v => (v + 1) % ordered.length); } };
  const choosePhoto = (photoIndex) => { setDirection(photoIndex < index ? -1 : 1); setIndex(photoIndex); };
  const goAlbum = (value, keepEditor = false) => {
    preserveEditorOnNavigation.current = keepEditor;
    window.location.hash = '#/slideshow' + (value ? '?album=' + encodeURIComponent(value) : '');
  };
  const notify = text => { setMessage(text); setError(''); };
  const fail = e => { setError(e?.message || String(e)); setMessage(''); };
  const run = async operation => {
    setBusy(true); setError(''); setMessage('');
    try { await operation(); } catch (e) { fail(e); } finally { setBusy(false); }
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(shareUrl(selected?.slug)); notify('Đã sao chép liên kết.'); }
    catch { window.prompt('Sao chép liên kết:', shareUrl(selected?.slug)); }
  };
  const showQR = async () => {
    try {
      const { default: QRCode } = await import('qrcode');
      setQr(await QRCode.toDataURL(shareUrl(selected?.slug), { width: 320, margin: 2, errorCorrectionLevel: 'M' }));
    } catch (e) { fail(e); }
  };
  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await stageRef.current?.requestFullscreen?.();
    } catch (e) { fail(e); }
  };
  const save = () => run(async () => {
    if (!editorAllowed) throw new Error('Bạn không có quyền chỉnh sửa.');
    const title = form.title.trim();
    if (!title) throw new Error('Hãy nhập tên album.');
    const data = {
      title, description: form.description.trim().slice(0, 500),
      slide_interval: Number(form.slide_interval), transition: form.transition,
      is_published: Boolean(form.is_published)
    };
    let result;
    if (creating) {
      result = await supabase.from('bes_slideshow_albums').insert({
        ...data, slug: slugify(title).slice(0, 58) + '-' + crypto.randomUUID().slice(0, 6),
        created_by: currentUser.authId || currentUser.id
      }).select('slug').single();
    } else {
      result = await supabase.from('bes_slideshow_albums').update({
        ...data, updated_at: new Date().toISOString()
      }).eq('id', selected.id);
    }
    if (result.error) throw result.error;
    const newSlug = result.data?.slug;
    setCreating(false);
    await refresh();
    announceSlideshowChange();
    notify('Đã lưu album thành công.');
    if (newSlug) goAlbum(newSlug, true);
  });
  const upload = files => run(async () => {
    if (!editorAllowed || !selected) return;
    const list = Array.from(files || []).slice(0, 30);
    if (!list.length) return;
    for (const file of list) {
      if (!TYPES.has(file.type) || file.size > MAX_SIZE) throw new Error('Chỉ hỗ trợ JPG, PNG, WEBP, GIF, AVIF, tối đa 10 MB/ảnh.');
    }
    let count = 0;
    let firstError = null;
    for (const file of list) {
      const path = selected.id + '/' + crypto.randomUUID() + '.' + EXT[file.type];
      const up = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false, cacheControl: '3600' });
      if (up.error) { firstError = up.error; break; }
      const ins = await supabase.from('bes_slideshow_slides').insert({
        album_id: selected.id, image_path: path, caption: '', sort_order: ordered.length + count
      });
      if (ins.error) {
        await supabase.storage.from(BUCKET).remove([path]);
        firstError = ins.error; break;
      }
      count++;
      setMessage('Đã tải ' + count + '/' + list.length + ' ảnh.');
    }
    await refresh();
    announceSlideshowChange();
    if (firstError) throw firstError;
    notify('Đã tải lên ' + count + ' ảnh thành công.');
  });
  const caption = (slide, value) => run(async () => {
    const { error: e } = await supabase.from('bes_slideshow_slides').update({ caption: value.trim().slice(0, 300) }).eq('id', slide.id);
    if (e) throw e;
    await refresh();
    announceSlideshowChange();
  });
  const removePhoto = slide => {
    if (!window.confirm('Xóa ảnh này khỏi album?')) return;
    void run(async () => {
      const r = await supabase.from('bes_slideshow_slides').delete().eq('id', slide.id);
      if (r.error) throw r.error;
      const storage = await supabase.storage.from(BUCKET).remove([slide.image_path]);
      await refresh();
      announceSlideshowChange();
      if (storage.error) throw storage.error;
      notify('Đã xóa ảnh.');
    });
  };
  const reorder = (slide, direction) => run(async () => {
    const i = ordered.findIndex(s => s.id === slide.id), other = ordered[i + direction];
    if (!other) return;
    const a = await supabase.from('bes_slideshow_slides').update({ sort_order: other.sort_order }).eq('id', slide.id);
    if (a.error) throw a.error;
    const b = await supabase.from('bes_slideshow_slides').update({ sort_order: slide.sort_order }).eq('id', other.id);
    if (b.error) throw b.error;
    await refresh();
    announceSlideshowChange();
    notify('Đã đổi vị trí ảnh.');
  });
  const removeAlbum = () => {
    if (!selected || !window.confirm('Xóa toàn bộ album và ảnh bên trong? Hành động này không thể hoàn tác.')) return;
    void run(async () => {
      const paths = ordered.map(x => x.image_path);
      const r = await supabase.from('bes_slideshow_albums').delete().eq('id', selected.id);
      if (r.error) throw r.error;
      if (paths.length) {
        const storage = await supabase.storage.from(BUCKET).remove(paths);
        if (storage.error) setError('Album đã xóa, nhưng có ảnh chưa dọn khỏi kho lưu trữ: ' + storage.error.message);
      }
      setEditing(false); await refresh(); announceSlideshowChange(); goAlbum('');
    });
  };
  const startCreate = () => { setCreating(true); setForm(EMPTY_FORM); setEditing(true); };
  const publicAlbums = albums.filter(a => a.is_published || editorAllowed);
  const audienceEnabled = Boolean(selected?.is_published &&
    (selected.id === HALLOWEEN_ALBUM_ID || selected.audience_screen_url));
  const festivalScreen = Boolean(selected && !editing && !creating && audienceEnabled);
  const judgeToken = new URLSearchParams(window.location.hash.split('?')[1] || '').get('judge');
  if (judgeToken) return <PhotoJudgingPage token={judgeToken}/>;

  return <div className={'bss' + (selected && !editing ? ' bss--gallery-view' : '') + (festivalScreen ? ' bss--festival-screen' : '')}>
    <div className="bss-ambient" aria-hidden="true"/>
    <header className="bss-header">
      <button type="button" className="bss-brand" onClick={() => { setEditing(false); setCreating(false); goAlbum(''); }}>
        <span className="bss-brand-icon"><Camera size={22}/></span>
        <span><strong>BRIAN <em>PHOTO STORY</em></strong><small>THE SCHOOL SLIDESHOW STUDIO</small></span>
      </button>
      {festivalScreen && <div className="bss-festival-header-title" title={selected.title}>
        <strong>{selected.title}</strong>
        <a href="https://qrvote.org/c/halloween-showcase-ry29" target="_blank" rel="noopener noreferrer">{en?'Vote':'Bình chọn'}</a>
      </div>}
      <div className="bss-header-actions">
        {editorAllowed && <button className="bss-pill" onClick={() => { setEditing(v => !v); setCreating(false); }}><Settings2 size={17}/> {editing ? t.done : t.manage}</button>}
        <a className="bss-pill muted" href="#/home"><ArrowLeft size={16}/> {en ? 'Home' : 'Trang chủ'}</a>
      </div>
    </header>

    <div className="bss-container">
      <div className="bss-intro">
        <span className="bss-eyebrow"><span className="bss-live-dot"/> PUBLIC VIEWING · NO LOGIN REQUIRED</span>
        <h1>{selected && !creating ? selected.title : t.title}</h1>
        <p><SlideshowLinkedText text={selected && !creating ? selected.description || t.subtitle : t.subtitle} /></p>
      </div>
      {error && <p className="bss-alert" role="alert">{error} <button onClick={() => { setLoading(true); void refresh(); }}><RefreshCw size={14}/> {en ? "Retry" : "Thử lại"}</button></p>}
      {message && <p className="bss-notice" role="status"><Check size={17}/>{message}</p>}
      {loading ? <div className="bss-state">{en ? "Loading galleries…" : "Đang tải bộ sưu tập…"}</div> : null}
      {!loading && editing && editorAllowed ? <section className="bss-editor">
        <div className="bss-edit-heading"><div><span>BRIAN STUDIO</span><h2>{creating ? t.create : selected ? t.edit : t.albums}</h2></div><div className="bss-header-actions">{selected && !creating && <button type="button" className="bss-pill" onClick={() => goAlbum("", true)}><ArrowLeft size={16}/> {en ? "All albums" : "Tất cả album"}</button>}<button type="button" className="bss-action" onClick={startCreate}><Plus size={17}/> {t.create}</button></div></div>
        {!creating && !selected ? <div className="bss-album-grid">
          {albums.map(a => <button key={a.id} className="bss-album-card" onClick={() => goAlbum(a.slug, true)}>
            <div className="bss-album-cover" style={{ backgroundImage: 'linear-gradient(0deg, rgba(7,12,31,.8),transparent),url("' + imageUrl(slides.find(s => s.album_id === a.id)?.image_path) + '")' }}/>
            <div className="bss-album-meta"><b>{a.title}</b><span>{a.is_published ? t.published : t.draft} · {slides.filter(s => s.album_id === a.id).length} ảnh</span></div>
          </button>)}
        </div> : <>
          {!creating && selected && isAdminRole(currentUser?.role) && <PhotoJudgingAdmin album={selected} slides={ordered}/>}
          <div className="bss-form-grid">
            <label>{en ? "Album title" : "Tên album"}<input value={form.title} maxLength={120} onChange={e => setForm(v => ({ ...v, title:e.target.value }))} placeholder={en ? "E.g. Halloween Showcase 2026" : "Ví dụ: Halloween Showcase 2026"}/></label>
            <label>{en ? "Slide duration" : "Thời gian chuyển ảnh"}<select value={form.slide_interval} onChange={e => setForm(v => ({ ...v, slide_interval:Number(e.target.value) }))}>{[2,3,4,5,6,8,10,12,15,20,30].map(n => <option key={n} value={n}>{n} {en ? "seconds" : "giây"}</option>)}</select></label>
            <label className="wide">{en ? "Description" : "Mô tả"}<textarea rows={2} maxLength={500} value={form.description} onChange={e => setForm(v => ({ ...v, description:e.target.value }))} placeholder={en ? "Introduce this gallery…" : "Một chút giới thiệu về bộ ảnh…"}/></label>
            <label>{en ? "Transition effect" : "Hiệu ứng chuyển ảnh"}<select value={form.transition} onChange={e => setForm(v => ({ ...v, transition:e.target.value }))}><option value="fade">Dissolve / Fade</option><option value="slide">Slide</option><option value="zoom">Cinema Zoom</option><option value="reveal">Silk Reveal</option><option value="blur">Dreamy Focus</option></select></label>
            <label className="bss-toggle"><input type="checkbox" checked={form.is_published} onChange={e => setForm(v => ({ ...v, is_published:e.target.checked }))}/><span>{form.is_published ? <Eye size={17}/> : <EyeOff size={17}/>} {form.is_published ? (en ? "Visible to everyone" : "Cho phép xem công khai") : (en ? "Not published" : "Chưa xuất bản")}</span></label>
          </div>
          <div className="bss-form-actions"><button disabled={busy} className="bss-action" onClick={save}><Save size={17}/> {busy ? (en ? 'Saving…' : 'Đang lưu…') : (en ? 'Save album' : 'Lưu album')}</button>{!creating && <button disabled={busy} className="bss-danger" onClick={removeAlbum}><Trash2 size={16}/> {en ? "Delete album" : "Xóa album"}</button>}</div>
          {!creating && <><div className="bss-upload-row"><div><h3>{en ? "Photo library" : "Thư viện ảnh"} <span>{ordered.length}</span></h3><small>{en ? "Upload multiple images · JPG, PNG, WEBP, GIF, AVIF · 10 MB per image · all uploaded images are public assets" : "Tải nhiều ảnh cùng lúc · JPG, PNG, WEBP, GIF, AVIF · mỗi ảnh tối đa 10 MB · hình ảnh là nội dung công khai"}</small></div><label className="bss-action"><UploadCloud size={18}/>{t.upload}<input type="file" multiple accept="image/jpeg,image/png,image/webp,image/gif,image/avif" disabled={busy} onChange={e => { void upload(e.target.files); e.target.value = ''; }} hidden/></label></div>
            <div className="bss-photo-editor">{ordered.map((s, i) => <div className="bss-photo-item" key={s.id}><img src={imageUrl(s.image_path)} loading="lazy" alt={s.caption || 'Ảnh ' + (i + 1)}/><div className="bss-photo-fields"><span>ẢNH {String(i + 1).padStart(2, '0')}</span><input key={s.id + ':' + s.caption} defaultValue={s.caption} maxLength={300} placeholder={en ? "Add a photo caption…" : "Nhập chú thích ảnh…"} onBlur={e => { if (e.target.value !== s.caption) void caption(s, e.target.value); }}/><div className="bss-inline-actions"><button disabled={busy || i === 0} title={en ? "Move earlier" : "Lùi lên"} onClick={() => reorder(s, -1)}><ChevronLeft size={16}/></button><button disabled={busy || i === ordered.length - 1} title={en ? "Move later" : "Tiến xuống"} onClick={() => reorder(s, 1)}><ChevronRight size={16}/></button><button disabled={busy} title={en ? "Delete photo" : "Xóa ảnh"} onClick={() => removePhoto(s)}><Trash2 size={16}/></button></div></div></div>)}</div>
          </>}
        </>}
      </section> : null}

      {!loading && !editing && !selected ? <>
        <div className="bss-section-top"><span>{t.albums}</span><b>{publicAlbums.length.toString().padStart(2, '0')} COLLECTIONS</b></div>
        {publicAlbums.length ? <div className="bss-album-grid bss-public-grid">{publicAlbums.map(a => {
          const photo = slides.find(s => s.album_id === a.id);
          return <button type="button" className="bss-album-card" key={a.id} onClick={() => goAlbum(a.slug)}>
            <div className="bss-album-cover" style={{ backgroundImage: photo ? 'linear-gradient(0deg, rgba(7,12,31,.88),transparent),url("' + imageUrl(photo.image_path) + '")' : undefined }}><span className="bss-cover-tag"><Images size={14}/>{slides.filter(s => s.album_id === a.id).length} ảnh</span></div>
            <div className="bss-album-meta"><b>{a.title}</b><span>{a.description || t.open}</span><span className="bss-open-label">{t.open} <ArrowRight size={15}/></span></div>
          </button>;
        })}</div> : <div className="bss-state"><Images size={34}/><p>{t.none}</p>{editorAllowed && <button className="bss-action" onClick={startCreate}><Plus size={16}/> {t.create}</button>}</div>}
      </> : null}

      {!loading && !editing && slug && !selected ? <div className="bss-state"><EyeOff size={32}/><h2>{en ? "This album is unavailable or unpublished." : "Album không tồn tại hoặc chưa được xuất bản."}</h2><button onClick={() => goAlbum('')}>{en ? "Browse galleries" : "Xem bộ sưu tập"}</button></div> : null}
      {!loading && !editing && selected ? <section className="bss-viewer-area" aria-label={en ? 'Photo exhibition' : 'Không gian triển lãm ảnh'}>
        <div className="bss-viewer-top">
          <button type="button" className="bss-back" onClick={() => goAlbum('')}><ArrowLeft size={17}/>{en ? 'All collections' : 'Tất cả bộ ảnh'}</button>
          <span className="bss-viewer-live"><span className="bss-live-dot" />{selected.is_published ? (en ? 'PUBLIC EXHIBITION' : 'TRIỂN LÃM CÔNG KHAI') : (en ? 'PRIVATE PREVIEW' : 'XEM TRƯỚC BẢN NHÁP')}</span>
          <div className="bss-share-actions">
            <button type="button" onClick={copy} title={t.copy}><Copy size={16}/><span>{t.copy}</span></button>
            <button type="button" onClick={showQR} title={t.qr}><QrCode size={17}/><span>QR</span></button>
          </div>
        </div>
        <div className={'bss-gallery-layout'+(selected.is_published?' bss-gallery-layout--with-jury':'')+(audienceEnabled?' bss-gallery-layout--festival':'')}>
          <div className="bss-gallery-main">
            <div className="bss-stage" ref={stageRef}
              onTouchStart={e => { touchRef.current = e.touches[0]?.clientX ?? null; }}
              onTouchEnd={e => {
                if (touchRef.current === null) return;
                const dx = (e.changedTouches[0]?.clientX ?? touchRef.current) - touchRef.current;
                touchRef.current = null;
                if (Math.abs(dx) > 55 && ordered.length > 1) { if (dx < 0) nextPhoto(); else previousPhoto(); }
              }}>
              {active ? <PhotoTransitionStage photo={active} src={imageUrl(active.image_path)}
                alt={active.caption || (en ? 'Artwork ' : 'Tác phẩm số ') + (index + 1)}
                mode={selected.transition} direction={direction} />
                : <div className="bss-empty-photos"><Images size={42}/><p>{en ? 'This collection has no photos yet.' : 'Bộ ảnh chưa có tác phẩm.'}</p></div>}
              <div className="bss-stage-curator" aria-hidden="true">
                <span>BRIAN <i/> PHOTO STORIES</span>
                <span>{String(index + 1).padStart(2,'0')} / {String(ordered.length).padStart(2,'0')}</span>
              </div>
              {ordered.length > 1 && <>
                <button type="button" className="bss-stage-prev" onClick={previousPhoto}
                  aria-label={en ? 'Previous artwork' : 'Tác phẩm trước'}><ChevronLeft size={27}/></button>
                <button type="button" className="bss-stage-next" onClick={nextPhoto}
                  aria-label={en ? 'Next artwork' : 'Tác phẩm tiếp theo'}><ChevronRight size={27}/></button>
              </>}
              <div className="bss-stage-controls">
                <span className="bss-stage-counter">{String(index + 1).padStart(2, '0')} <em>/</em> {String(ordered.length).padStart(2,'0')}</span>
                <div className="bss-progress-track" aria-label={en ? 'Slideshow progress' : 'Tiến độ trình chiếu'}>
                  <i key={active?.id || 'none'}
                    style={{ animationDuration: selected.slide_interval + 's',
                      animationPlayState: playing && ordered.length > 1 ? 'running' : 'paused' }}/>
                </div>
                {ordered.length > 1 && <button type="button" onClick={() => setPlaying(v => !v)}
                  aria-label={playing ? t.pause : t.play} title={playing ? t.pause : t.play}>
                  {playing ? <Pause size={18}/> : <Play size={18}/>}
                </button>}
                <button type="button" onClick={toggleFullscreen}
                  aria-label={fullscreen ? t.exit : t.fullscreen} title={fullscreen ? t.exit : t.fullscreen}>
                  {fullscreen ? <Expand size={19}/> : <Maximize2 size={19}/>}
                </button>
              </div>
            </div>
            {ordered.length > 1 && <div className="bss-filmstrip-area">
              <div className="bss-filmstrip-head">
                <span>{en ? 'Explore the collection' : 'Khám phá bộ sưu tập'}</span>
                <span>{ordered.length} {en ? 'artworks' : 'tác phẩm'}</span>
              </div>
              <div className="bss-filmstrip" aria-label={en ? 'Photo thumbnails' : 'Chọn tác phẩm'}>
                {ordered.map((slide, i) => <button type="button" key={slide.id}
                  aria-label={(en ? 'Artwork ' : 'Tác phẩm ') + (i + 1)}
                  aria-current={i === index ? 'true' : undefined}
                  onClick={() => choosePhoto(i)} className={i === index ? 'active' : ''}>
                  <img src={imageUrl(slide.image_path)} loading="lazy" alt="" />
                  <span>{String(i + 1).padStart(2,'0')}</span>
                </button>)}
              </div>
            </div>}
          </div>
          {!audienceEnabled && <aside className="bss-gallery-sidebar">
            <div className="bss-gallery-sidebar-top">
              <span>{en ? 'FEATURED ARTWORK' : 'TÁC PHẨM ĐANG XEM'}</span>
              <span className="bss-gallery-sparkle">✦</span>
            </div>
            <div className="bss-gallery-sidebar-number">{String(index + 1).padStart(2,'0')}<span> / {String(ordered.length).padStart(2,'0')}</span></div>
            <div className="bss-gallery-caption-detail" aria-live="polite" aria-atomic="true">
              <h2>{active?.caption?.split('|')[0]?.trim() || selected.title}</h2>
              <p><SlideshowLinkedText text={active?.caption?.split('|').slice(1).join('|').trim() || active?.caption || (en ? 'A moment worth remembering.' : 'Một khoảnh khắc đáng nhớ.')} /></p>
            </div>
            <div className="bss-gallery-side-nav">
              <button type="button" onClick={previousPhoto} disabled={ordered.length < 2} aria-label={en ? 'Previous artwork' : 'Ảnh trước'}><ChevronLeft size={20}/></button>
              <div><strong>{en ? 'Discover the story' : 'Khám phá câu chuyện'}</strong><small>{en ? 'Navigate between artworks' : 'Chuyển giữa các tác phẩm'}</small></div>
              <button type="button" onClick={nextPhoto} disabled={ordered.length < 2} aria-label={en ? 'Next artwork' : 'Ảnh tiếp theo'}><ChevronRight size={20}/></button>
            </div>
            <div className="bss-gallery-side-details">
              <div><span>{en ? 'TRANSITION' : 'HIỆU ỨNG'}</span><strong>{{fade:'Dissolve',slide:'Glide',zoom:'Cinema Zoom',reveal:'Silk Reveal',blur:'Dreamy Focus'}[selected.transition] || 'Dissolve'}</strong></div>
              <div><span>{en ? 'INTERVAL' : 'THỜI GIAN'}</span><strong>{selected.slide_interval}s</strong></div>
            </div>
            <div className="bss-gallery-side-note">
              <span>BRIAN PHOTO STORY</span>
              <p><SlideshowLinkedText text={selected.description || (en ? 'Every image holds a story.' : 'Mỗi tác phẩm là một câu chuyện.')} /></p>
            </div>
          </aside>}
          {selected.is_published && (audienceEnabled
            ? <div className="bss-festival-live-stack">
                <PhotoJuryLive albumId={selected.id} slideId={active?.id} photoNumber={index+1} slides={ordered.map(item=>({id:item.id,caption:item.caption,imageUrl:imageUrl(item.image_path)}))} language={language}/>
                <PhotoAudienceLive compact={festivalScreen} language={language} albumId={selected.id} screenUrl={selected.audience_screen_url||''} canEdit={editorAllowed && isAdminRole(currentUser?.role)} onSaved={refresh}/>
              </div>
            : <PhotoJuryLive albumId={selected.id} slideId={active?.id} photoNumber={index+1} slides={ordered.map(item=>({id:item.id,caption:item.caption,imageUrl:imageUrl(item.image_path)}))} language={language}/>
          )}
        </div>
        <p className="bss-keyboard-tip">{en ? '← / → Navigate · Space Play or pause · Fullscreen for presentation' : '← / → Chuyển ảnh · Space Phát hoặc dừng · Toàn màn hình để trình chiếu'}</p>
      </section> : null}
    </div>
    <footer className="bss-footer"><span>BRIAN ENGLISH STUDIO</span><span>Made for moments that matter · Public slideshow</span></footer>
    {qr && <div className="bss-qr-backdrop" role="presentation" onMouseDown={() => setQr('')}><div className="bss-qr-dialog" role="dialog" aria-modal="true" aria-label="QR slideshow" onMouseDown={e => e.stopPropagation()}><button className="bss-qr-close" onClick={() => setQr('')}><X size={20}/></button><div className="bss-qr-symbol"><QrCode size={24}/></div><h2>{en ? "Scan to view the gallery" : "Quét mã để xem ảnh"}</h2><p>{en ? "No login needed · Opens on any device" : "Không cần đăng nhập · Mở trực tiếp trên mọi thiết bị"}</p><img src={qr} alt="Mã QR liên kết trình chiếu"/><button className="bss-action" onClick={copy}><Copy size={16}/> {t.copy}</button></div></div>}
  </div>;
}
