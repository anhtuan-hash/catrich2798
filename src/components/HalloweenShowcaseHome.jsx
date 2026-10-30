import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ImagePlus, Maximize2, Minimize2, MonitorPlay, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import { supabase } from '../utils/supabase.js';
import './HalloweenShowcaseHome.css';

const BUCKET = 'brian-slideshows';
const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const bannerPath = albumId => albumId + '/event-home-banner.jpg';

// Save all accepted banner formats as an optimized JPEG, which works on Safari,
// Chromium and Firefox. The path stays fixed so every viewer sees the same
// banner and authenticated editors can replace it without changing metadata.
async function optimizeBanner(file) {
  let source;
  let objectUrl;
  try {
    if (typeof createImageBitmap === 'function') {
      source = await createImageBitmap(file);
    } else {
      objectUrl = URL.createObjectURL(file);
      source = await new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Cannot decode the selected image.'));
        img.src = objectUrl;
      });
    }
    const originalWidth = source.width || source.naturalWidth;
    const originalHeight = source.height || source.naturalHeight;
    if (!originalWidth || !originalHeight) throw new Error('Invalid image dimensions.');
    const scale = Math.min(1, 2560 / originalWidth, 1600 / originalHeight);
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(originalWidth * scale));
    canvas.height = Math.max(1, Math.round(originalHeight * scale));
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot prepare image on this browser.');
    // Canvas JPEG output has no alpha channel; use a neutral backdrop for PNG
    // banners containing transparent areas instead of accidental black pixels.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

    let blob = null;
    if (typeof canvas.toBlob === 'function') {
      blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.92));
    }
    if (blob?.type === 'image/jpeg' && blob.size > 0) return blob;

    // Some older Safari builds lack toBlob or return an unexpected type.
    // toDataURL('image/jpeg') provides a compatible fallback on those versions.
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    if (!dataUrl.startsWith('data:image/jpeg;base64,')) {
      throw new Error('This browser could not convert the image to JPEG.');
    }
    const binary = atob(dataUrl.split(',')[1]);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
    return new Blob([bytes], { type: 'image/jpeg' });
  } finally {
    source?.close?.();
    if (objectUrl) URL.revokeObjectURL(objectUrl);
  }
}

export default function HalloweenShowcaseHome({ albumId, canManage = false, language = 'vi', onOpenShowcase }) {
  const en = language === 'en';
  // Metadata lives in Supabase for every user; no browser-local banner state.
  const [bannerRecord, setBannerRecord] = useState(null);
  const [imageState, setImageState] = useState('loading');
  const revisionRef = useRef(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(() => typeof document !== 'undefined' && document.fullscreenElement === document.documentElement);
  const [notice, setNotice] = useState('');
  const fileRef = useRef(null);
  const path = bannerPath(albumId);
  const publicUrl = bannerRecord?.banner_path
    ? supabase.storage.from(BUCKET).getPublicUrl(bannerRecord.banner_path).data?.publicUrl : '';
  // A shared revision invalidates CDN/browser cache only when an editor publishes.
  const bannerUrl = publicUrl
    ? publicUrl + (publicUrl.includes('?') ? '&' : '?') + 'v=' + encodeURIComponent(bannerRecord.revision)
    : '';

  useEffect(() => {
    let live = true;
    let inFlight = false;
    revisionRef.current = null;
    setBannerRecord(null);
    setImageState('loading');
    setNotice('');

    const refreshSharedBanner = async () => {
      if (!live || inFlight) return;
      inFlight = true;
      try {
        const { data, error } = await supabase
          .from('bes_slideshow_event_banners')
          .select('banner_path,revision')
          .eq('album_id', albumId)
          .maybeSingle();
        if (error) throw error;
        if (!live) return;
        const revision = data?.revision || 'missing';
        if (revisionRef.current !== revision) {
          revisionRef.current = revision;
          setBannerRecord(data || null);
          setImageState(data ? 'loading' : 'missing');
        }
      } catch (error) {
        // Preserve any currently visible banner on transient connectivity issues.
        if (live) console.warn('[BRIAN Showcase] banner sync unavailable:', error?.message || error);
      } finally { inFlight = false; }
    };

    void refreshSharedBanner();
    // Polling covers public visitors who have not authenticated for Realtime.
    const timer = window.setInterval(() => { void refreshSharedBanner(); }, 12000);
    const onFocus = () => { void refreshSharedBanner(); };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') void refreshSharedBanner();
    };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      live = false;
      window.clearInterval(timer);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [albumId]);
  useEffect(() => {
    const syncFullscreen = () => setIsFullscreen(document.fullscreenElement === document.documentElement);
    document.addEventListener('fullscreenchange', syncFullscreen);
    return () => document.removeEventListener('fullscreenchange', syncFullscreen);
  }, []);

  const toggleFullscreen = async () => {
    try {
      // Fullscreen <html>, rather than the image, preserves the header, the
      // bottom controls AND body-mounted YouTube/HTML dialog portals.
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      setNotice(en ? 'Fullscreen is unavailable in this browser.' : 'Trình duyệt không cho phép mở toàn màn hình.');
    }
  };


  const uploadBanner = async files => {
    const file = files?.[0];
    if (!file || !canManage) return;
    if (!ACCEPTED.has(file.type) || file.size > MAX_FILE_BYTES || file.size === 0) {
      setNotice(en
        ? 'Choose a JPG, PNG, WEBP or AVIF image under 10 MB.'
        : 'Chỉ nhận ảnh JPG, PNG, WEBP hoặc AVIF, tối đa 10 MB.');
      return;
    }
    setIsUploading(true);
    setNotice('');
    try {
      // The fixed per-album storage key makes one shared banner accessible on
      // every device, without altering album metadata or slideshow artworks.
      const optimized = await optimizeBanner(file);
      const result = await supabase.storage.from(BUCKET).upload(path, optimized, {
        upsert: true, contentType: 'image/jpeg', cacheControl: '60'
      });
      if (result.error) throw result.error;
      // Publish the new revision after the upload has completed; every account
      // sees the same storage object and picks up the revision within 12s.
      const revision = String(Date.now()) + '-' + crypto.randomUUID();
      const { error: syncError } = await supabase
        .from('bes_slideshow_event_banners')
        .upsert({
          album_id: albumId,
          banner_path: path,
          revision,
          updated_at: new Date().toISOString()
        }, { onConflict: 'album_id' });
      if (syncError) throw new Error((en ? 'Image saved but sync failed: ' : 'Ảnh đã lưu nhưng chưa đồng bộ: ') + syncError.message);
      revisionRef.current = revision;
      setBannerRecord({ banner_path: path, revision });
      setImageState('loading');
      setNotice(en ? 'Banner published for all accounts and public visitors.' : 'Banner đã được lưu đồng bộ và hiển thị cho tất cả tài khoản, kể cả khách chưa đăng nhập.');
    } catch (error) {
      setNotice((en ? 'Upload failed: ' : 'Không thể đăng banner: ') + (error?.message || String(error)));
    } finally { setIsUploading(false); }
  };

  const removeBanner = async () => {
    if (!canManage || isUploading) return;
    if (!window.confirm(en ? 'Remove the event homepage banner?' : 'Xóa banner trang chủ sự kiện?')) return;
    setIsUploading(true);
    setNotice('');
    try {
      const result = await supabase.storage.from(BUCKET).remove([path]);
      if (result.error) throw result.error;
      const { error: syncError } = await supabase
        .from('bes_slideshow_event_banners')
        .delete()
        .eq('album_id', albumId);
      if (syncError) throw new Error((en ? 'Image removed but sync failed: ' : 'Đã gỡ ảnh nhưng chưa đồng bộ: ') + syncError.message);
      revisionRef.current = 'missing';
      setBannerRecord(null);
      setImageState('missing');
      setNotice(en ? 'Banner removed for everyone.' : 'Banner đã được gỡ trên mọi tài khoản.');
    } catch (error) {
      setNotice((en ? 'Could not remove banner: ' : 'Không thể gỡ banner: ') + (error?.message || String(error)));
    } finally { setIsUploading(false); }
  };

  return (
    <section className="bss-event-home" aria-label={en ? 'Halloween Showcase event homepage' : 'Trang chủ sự kiện Halloween Showcase'}>
      <div className="bss-event-home-top">
        <span className="bss-event-home-eyebrow"><span className="bss-live-dot"/> BRIAN ENGLISH · HALLOWEEN 2026</span>
        <span className="bss-event-home-caption">{en ? 'OFFICIAL EVENT HOMEPAGE' : 'TRANG CHỦ SỰ KIỆN'}</span>
      </div>
      <div className={'bss-event-home-stage' + (imageState === 'ready' ? ' has-banner' : '')}
        style={imageState === 'ready' ? { '--bss-home-banner-image': 'url("' + bannerUrl + '")' } : undefined}>
        {bannerUrl && imageState !== 'missing' &&
          <img className="bss-event-home-banner"
            src={bannerUrl}
            alt={en ? 'Halloween Showcase 2026 official event banner' : 'Banner chính thức Halloween Showcase 2026'}
            draggable="false"
            onLoad={() => setImageState('ready')}
            onError={() => setImageState('missing')}/>}
        {imageState !== 'ready' &&
          <div className="bss-event-home-placeholder">
            <span className="bss-event-home-placeholder-icon"><ImagePlus size={42}/></span>
            <span className="bss-event-home-overline">BRIAN · PHOTO STORY</span>
            <h1>Halloween Showcase 2026</h1>
            <p>{en
              ? 'A special celebration of creativity, imagination and Halloween spirit.'
              : 'Không gian giới thiệu chương trình và triển lãm tranh Halloween 2026.'}</p>
            {canManage && <small>{en ? 'Upload the official 16:9 banner using the button below.' : 'Tải banner chính thức khổ ngang 16:9 bằng nút bên dưới.'}</small>}
          </div>}
      </div>
      <div className="bss-event-home-actions">
        <div className="bss-event-home-description">
          <strong>HALLOWEEN SHOWCASE 2026</strong>
          <span>{en ? 'The School Artwork Competition' : 'Triển lãm tranh và cuộc thi nghệ thuật học đường'}</span>
        </div>
        <div className="bss-event-home-buttons">
          <button type="button" className="bss-event-home-fullscreen"
            onClick={() => { void toggleFullscreen(); }}
            aria-label={isFullscreen ? (en ? 'Exit fullscreen' : 'Thoát toàn màn hình') : (en ? 'Fullscreen with all controls' : 'Toàn màn hình có thanh chức năng')}
            title={isFullscreen ? (en ? 'Exit fullscreen (Esc)' : 'Thoát toàn màn hình (Esc)') : (en ? 'Fullscreen' : 'Toàn màn hình')}>
            {isFullscreen ? <Minimize2 size={17}/> : <Maximize2 size={17}/>}
            <span>{isFullscreen ? (en ? 'Exit fullscreen' : 'Thu nhỏ') : (en ? 'Fullscreen' : 'Toàn màn hình')}</span>
          </button>
          {canManage && <>
            <label className={'bss-event-home-upload' + (isUploading ? ' is-busy' : '')}>
              {isUploading ? <RefreshCw size={17} className="bss-event-home-spin"/> : <UploadCloud size={17}/>}
              <span>{isUploading ? (en ? 'Publishing…' : 'Đang đăng…') : (imageState === 'ready' ? (en ? 'Replace banner' : 'Thay banner') : (en ? 'Upload banner' : 'Tải banner lên'))}</span>
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/avif"
                disabled={isUploading} onChange={event => {
                  const chosen = event.target.files;
                  void uploadBanner(chosen);
                  event.target.value = '';
                }}/>
            </label>
            {imageState === 'ready' && <button className="bss-event-home-remove" type="button"
              disabled={isUploading} onClick={() => { void removeBanner(); }}
              title={en ? 'Remove banner' : 'Gỡ banner'}
              aria-label={en ? 'Remove banner' : 'Gỡ banner'}><Trash2 size={17}/></button>}
          </>}
          <button className="bss-event-home-enter" type="button" onClick={onOpenShowcase}>
            <MonitorPlay size={18}/><span>{en ? 'Explore the showcase' : 'Vào triển lãm'}</span><ArrowRight size={18}/>
          </button>
        </div>
      </div>
      {notice && <p className="bss-event-home-status" role="status">{notice}</p>}
    </section>
  );
}
