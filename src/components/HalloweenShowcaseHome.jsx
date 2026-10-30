import React, { useEffect, useRef, useState } from 'react';
import { ArrowRight, ImagePlus, MonitorPlay, RefreshCw, Trash2, UploadCloud } from 'lucide-react';
import { supabase } from '../utils/supabase.js';
import './HalloweenShowcaseHome.css';

const BUCKET = 'brian-slideshows';
const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/avif']);
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const bannerPath = albumId => albumId + '/event-home-banner';

export default function HalloweenShowcaseHome({ albumId, canManage = false, language = 'vi', onOpenShowcase }) {
  const en = language === 'en';
  const [version, setVersion] = useState(() => Date.now());
  const [imageState, setImageState] = useState('loading');
  const [isUploading, setIsUploading] = useState(false);
  const [notice, setNotice] = useState('');
  const fileRef = useRef(null);
  const path = bannerPath(albumId);
  const publicUrl = supabase.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl;
  const bannerUrl = publicUrl ? publicUrl + (publicUrl.includes('?') ? '&' : '?') + 'v=' + version : '';
  useEffect(() => { setImageState('loading'); setNotice(''); setVersion(Date.now()); }, [albumId]);

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
      const result = await supabase.storage.from(BUCKET).upload(path, file, {
        upsert: true, contentType: file.type, cacheControl: '60'
      });
      if (result.error) throw result.error;
      setImageState('loading');
      setVersion(Date.now());
      setNotice(en ? 'Banner published. Visitors can see it on this homepage.' : 'Banner đã đăng thành công và hiển thị công khai trên trang chủ sự kiện.');
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
      setImageState('missing');
      setVersion(Date.now());
      setNotice(en ? 'Banner removed.' : 'Đã gỡ banner.');
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
      <div className={'bss-event-home-stage' + (imageState === 'ready' ? ' has-banner' : '')}>
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
