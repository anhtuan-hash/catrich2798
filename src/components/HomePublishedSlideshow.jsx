import HalloweenScene from '../features/halloween-home/HalloweenScene.jsx';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Expand, Images, Maximize2, Pause, Play } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../utils/supabase.js';
import PhotoTransitionStage from './PhotoTransitionStage.jsx';
import SlideshowLinkedText from './SlideshowLinkedText.jsx';
import './HomePublishedSlideshow.css';
import './HomePublishedSlideshowRefinement.css';
import './HomePublishedSlideshowExhibition.css';
import './HomePublishedSlideshowHalloween.css';
import {useHalloweenHomeTheme} from '../utils/halloweenHomeTheme.js';

const BUCKET = 'brian-slideshows';
const CHANGE_EVENT = 'bes-slideshow-published-updated';
const CHANGE_KEY = 'bes-slideshow-published-revision';
const RECHECK_MS = 15000;

function publicImage(path) {
  if (!path) return '';
  return supabase.storage.from(BUCKET).getPublicUrl(path).data?.publicUrl || '';
}

/** Skin activation is album-scoped, not a site-wide Halloween theme. */
function isHalloweenAlbum(album) {
  return /halloween/i.test(String(album?.slug || '') + ' ' + String(album?.title || ''));
}

function orderedGallery(albums, slides) {
  const grouped = new Map();
  for (const slide of slides || []) {
    if (!grouped.has(slide.album_id)) grouped.set(slide.album_id, []);
    grouped.get(slide.album_id).push(slide);
  }
  return (albums || []).map((album) => ({
    ...album,
    photos: (grouped.get(album.id) || []).sort((a, b) =>
      (a.sort_order - b.sort_order) || String(a.created_at).localeCompare(String(b.created_at))),
  })).filter((album) => album.photos.length > 0);
}

/**
 * Published-only, guest-safe homepage slideshow. Returns null (no placeholder
 * and no reserved height) if there are no published albums containing photos.
 */
export default function HomePublishedSlideshow({ language = 'vi' }) {
  const seasonalHome = useHalloweenHomeTheme();
  const en = language === 'en';
  const [galleries, setGalleries] = useState([]);
  const [albumId, setAlbumId] = useState('');
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [direction, setDirection] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const stageRef = useRef(null);
  const requestId = useRef(0);
  const touchStart = useRef(null);

  const refresh = useCallback(async () => {
    const sequence = ++requestId.current;
    if (!isSupabaseConfigured) { setGalleries([]); return; }
    try {
      const albumsResult = await supabase.from('bes_slideshow_albums')
        .select('id,slug,title,description,slide_interval,transition,updated_at')
        .eq('is_published', true)
        .order('updated_at', { ascending: false })
        .limit(12);
      if (albumsResult.error) throw albumsResult.error;
      const published = albumsResult.data || [];
      if (!published.length) {
        if (sequence === requestId.current) setGalleries([]);
        return;
      }
      const imagesResult = await supabase.from('bes_slideshow_slides')
        .select('id,album_id,image_path,caption,sort_order,created_at')
        .in('album_id', published.map((album) => album.id))
        .order('sort_order', { ascending: true });
      if (imagesResult.error) throw imagesResult.error;
      if (sequence === requestId.current) setGalleries(orderedGallery(published, imagesResult.data));
    } catch (error) {
      // Fail closed: never leave potentially unpublished content visible on error.
      if (sequence === requestId.current) {
        console.warn('[HomeSlideshow] Cannot verify publication status.', error);
        setGalleries([]);
      }
    }
  }, []);

  useEffect(() => {
    void refresh();
    const handleChange = () => void refresh();
    const handleVisibility = () => { if (document.visibilityState === 'visible') void refresh(); };
    const interval = window.setInterval(() => {
      if (document.visibilityState === 'visible') void refresh();
    }, RECHECK_MS);
    window.addEventListener(CHANGE_EVENT, handleChange);
    // Storage listener must be stable to remove on cleanup.
    const handleStorage = (event) => { if (event.key === CHANGE_KEY) handleChange(); };
    window.addEventListener('storage', handleStorage);
    window.addEventListener('focus', handleChange);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      requestId.current += 1;
      window.clearInterval(interval);
      window.removeEventListener(CHANGE_EVENT, handleChange);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('focus', handleChange);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [refresh]);

  const selected = useMemo(() =>
    galleries.find((album) => album.id === albumId) || galleries[0] || null,
  [galleries, albumId]);
  const photos = selected?.photos || [];
  const count = photos.length;
  const currentIndex = Math.min(index, Math.max(0, count - 1));
  const photo = photos[currentIndex] || null;

  useEffect(() => { setIndex(0); }, [selected?.id]);
  useEffect(() => {
    if (!count || !photo) return;
    const next = photos[(currentIndex + 1) % count];
    const previous = photos[(currentIndex - 1 + count) % count];
    [next, previous].forEach((item) => { if (item?.image_path) { const img = new Image(); img.src = publicImage(item.image_path); } });
  }, [selected?.id, currentIndex, count]);
  useEffect(() => {
    if (!playing || count < 2 || !selected || document.visibilityState === 'hidden') return undefined;
    const delay = Math.min(30000, Math.max(2000, Number(selected.slide_interval || 6) * 1000));
    const timer = window.setTimeout(() => { setDirection(1); setIndex((old) => (old + 1) % count); }, delay);
    return () => window.clearTimeout(timer);
  }, [playing, selected?.id, selected?.slide_interval, currentIndex, count]);

  useEffect(() => {
    const handler = () => setIsFullscreen(Boolean(document.fullscreenElement === stageRef.current));
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);
  useEffect(() => {
    if (!selected) return undefined;
    const key = (event) => {
      if (document.fullscreenElement !== stageRef.current) return;
      if (event.key === 'ArrowRight' && count > 1) { event.preventDefault(); setDirection(1); setIndex((old) => (old + 1) % count); }
      if (event.key === 'ArrowLeft' && count > 1) { event.preventDefault(); setDirection(-1); setIndex((old) => (old - 1 + count) % count); }
      if (event.code === 'Space') { event.preventDefault(); setPlaying((old) => !old); }
    };
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [selected?.id, count]);

  const fullscreen = async () => {
    try {
      if (document.fullscreenElement === stageRef.current) await document.exitFullscreen();
      else await stageRef.current?.requestFullscreen?.();
    } catch (error) {
      console.warn('[HomeSlideshow] Fullscreen unavailable', error);
    }
  };
  const changeAlbum = (id) => { setAlbumId(id); setDirection(1); setIndex(0); setPlaying(true); };
  const previous = () => { setDirection(-1); setIndex((old) => (old - 1 + count) % count); };
  const next = () => { setDirection(1); setIndex((old) => (old + 1) % count); };

  const captionText = photo?.caption?.trim() || '';
  const separatorIndex = captionText.indexOf('|');
  const artworkTitle = separatorIndex >= 0 ? captionText.slice(0, separatorIndex).trim() : '';
  const artworkStory = separatorIndex >= 0 ? captionText.slice(separatorIndex + 1).trim() : captionText;

  if (!selected || !photo) return null;

  return (
    <section className="bhs-home" data-halloween-theme={seasonalHome.enabled && isHalloweenAlbum(selected) ? "true" : "false"} data-guest-allow="slideshow-viewer" data-home-published-slideshow="true" aria-label={en ? 'Published photo slideshow' : 'Trình chiếu ảnh đã công bố'}>
      {seasonalHome.enabled && isHalloweenAlbum(selected) ? <HalloweenScene zone="gallery" /> : null}
      <header className="bhs-home__header">
        <div className="bhs-home__headline">
          <div className="bhs-home__kicker"><Images size={15} /> BRIAN PHOTO STORY <i /> {en ? 'NOW SHOWING' : 'ĐANG TRÌNH CHIẾU'}</div>
          <h2>{selected.title}</h2>
          {selected.description && <div className="bhs-home__summary">
            <p><SlideshowLinkedText text={selected.description} /></p>
          </div>}
        </div>
        <a href={'#/slideshow?album=' + encodeURIComponent(selected.slug)}
          className="bhs-home__open">
          {en ? 'Open full gallery' : 'Xem bộ ảnh đầy đủ'} <ArrowRight size={17} />
        </a>
      </header>

      {galleries.length > 1 && <nav className="bhs-home__albums" aria-label={en ? 'Choose a gallery' : 'Chọn bộ ảnh'}>
        {galleries.map((album) =>
          <button type="button" key={album.id} aria-pressed={selected.id === album.id}
            className={selected.id === album.id ? 'is-active' : ''}
            onClick={() => changeAlbum(album.id)}>{album.title}</button>)}
      </nav>}

      <div className="bhs-home__exhibition" data-home-exhibition-layout="info-left-artwork-right">
        <aside className="bhs-home__story-panel" aria-label={en ? 'Current artwork information' : 'Thông tin tác phẩm đang xem'}>
          <div className="bhs-home__story-top">
            <span className="bhs-home__story-kicker">{en ? 'CURRENT ARTWORK' : 'TÁC PHẨM ĐANG XEM'}</span>
            <div className="bhs-home__story-count-row">
              <strong className="bhs-home__story-count">
                {String(currentIndex + 1).padStart(2, '0')} <i>/</i> {String(count).padStart(2, '0')}
              </strong>
              {count > 1 && <div className="bhs-home__story-navigation">
                <button type="button" onClick={previous} aria-label={en ? 'Previous artwork' : 'Tác phẩm trước'}><ChevronLeft size={20} /></button>
                <button type="button" onClick={next} aria-label={en ? 'Next artwork' : 'Tác phẩm tiếp theo'}><ChevronRight size={20} /></button>
              </div>}
            </div>
          </div>
          <div className="bhs-home__story-main" aria-live="polite" aria-atomic="true">
            <h3>{artworkTitle || (en ? 'Artwork ' : 'Tác phẩm ') + String(currentIndex + 1).padStart(2, '0')}</h3>
            <p><SlideshowLinkedText text={artworkStory || (en ? 'A school story told through images.' : 'Những câu chuyện được kể qua từng bức tranh.')} /></p>
          </div>
        </aside>
      <div className="bhs-home__stage" ref={stageRef}
        onTouchStart={(event) => { touchStart.current = event.touches[0]?.clientX ?? null; }}
        onTouchEnd={(event) => {
          if (touchStart.current === null || count < 2) return;
          const delta = (event.changedTouches[0]?.clientX ?? touchStart.current) - touchStart.current;
          touchStart.current = null;
          if (Math.abs(delta) >= 55) {
            if (delta < 0) next(); else previous();
          }
        }}>
        {seasonalHome.enabled && isHalloweenAlbum(selected) && <span className="bhs-home__halloween-ghost" aria-hidden="true" />}
        <PhotoTransitionStage photo={photo} src={publicImage(photo.image_path)}
          alt={photo.caption || (en ? 'Gallery photo ' : 'Ảnh số ') + (currentIndex + 1)}
          mode={selected.transition} direction={direction} />
        {count > 1 && <>
          <button type="button" className="bhs-home__arrow is-previous" onClick={previous}
            aria-label={en ? 'Previous photo' : 'Ảnh trước'}><ChevronLeft size={26} /></button>
          <button type="button" className="bhs-home__arrow is-next" onClick={next}
            aria-label={en ? 'Next photo' : 'Ảnh sau'}><ChevronRight size={26} /></button>
        </>}
        <div className="bhs-home__controls">
          <span className="bhs-home__counter">{String(currentIndex + 1).padStart(2, '0')} <i>/</i> {String(count).padStart(2, '0')}</span>
          <div className="bhs-home__progress" aria-hidden="true">
            <span key={photo.id + ':' + selected.id}
              style={{
                animationDuration: Math.min(30, Math.max(2, Number(selected.slide_interval || 6))) + 's',
                animationPlayState: playing && count > 1 ? 'running' : 'paused'
              }} />
          </div>
          {count > 1 && <button type="button" onClick={() => setPlaying((old) => !old)}
            aria-label={playing ? (en ? 'Pause slideshow' : 'Tạm dừng trình chiếu') : (en ? 'Play slideshow' : 'Tiếp tục trình chiếu')}>
            {playing ? <Pause size={19} /> : <Play size={19} />}
          </button>}
          <button type="button" onClick={() => void fullscreen()}
            aria-label={isFullscreen ? (en ? 'Exit fullscreen' : 'Thoát toàn màn hình') : (en ? 'Fullscreen' : 'Toàn màn hình')}>
            {isFullscreen ? <Expand size={20} /> : <Maximize2 size={20} />}
          </button>
        </div>
      </div>
      {seasonalHome.enabled && isHalloweenAlbum(selected) && count > 1 ? (
        <nav className="bhs-home__filmstrip" aria-label={en ? 'Choose Halloween artwork' : 'Chọn tranh Halloween'} data-halloween-filmstrip="true">
          {photos.map((item, photoIndex) => (
            <button
              type="button"
              className={'bhs-home__filmstrip-item' + (photoIndex === currentIndex ? ' is-active' : '')}
              aria-label={en ? 'View artwork ' + (photoIndex + 1) : 'Xem tranh ' + (photoIndex + 1)}
              aria-pressed={photoIndex === currentIndex}
              key={item.id}
              onClick={() => { setPlaying(false); setDirection(photoIndex > currentIndex ? 1 : -1); setIndex(photoIndex); }}
            >
              <img src={publicImage(item.image_path)} loading={photoIndex < 4 ? 'eager' : 'lazy'} alt="" decoding="async" />
              <span>{String(photoIndex + 1).padStart(2, '0')}</span>
            </button>
          ))}
        </nav>
      ) : null}
      </div>
      <div className="bhs-home__footer">
        <span>{en ? 'A school story in pictures' : 'Những khoảnh khắc đáng nhớ của nhà trường'}</span>
        <span>{count} {en ? 'photos' : 'ảnh'} <i /> {en ? 'Public gallery' : 'Album công khai'}</span>
      </div>
    </section>
  );
}
