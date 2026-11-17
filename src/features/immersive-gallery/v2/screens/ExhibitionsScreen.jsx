import React, {useEffect, useState} from 'react';
import {Archive,RotateCcw,ShieldAlert,CheckCircle2,Landmark,RefreshCw} from 'lucide-react';
import MetricStrip from '../shell/MetricStrip.jsx';
import ExhibitionCard from '../shell/ExhibitionCard.jsx';
import MuseumExhibitionDetail from '../../v3/MuseumExhibitionDetail.jsx';
import {isAsean} from '../../v3/aseanLesson.js';
import GalleryRenderBoundary from '../../GalleryRenderBoundary.jsx';
import {staffRequest as defaultTransport} from '../../v3/museumApi.js';
import './ExhibitionsScreen.css';

const tr = (lang, vi, en) => lang === 'en' ? en : vi;

// Exclude explicitly non-production exhibitions; never relabel them as student work.
// (Same predicate as v3/MuseumExplore.)
const isPracticeShowcase = item => Boolean(item?.is_sample || item?.is_demo ||
  /(?:^|[\s_-])(demo|sample|synthetic|mock)(?:$|[\s_-])/i.test([item?.title, item?.slug].filter(Boolean).join(' ')));

const exhibitionFromHash = () => {
  if (typeof window === 'undefined') return '';
  try { return new URLSearchParams(window.location.hash.split('?')[1] || '').get('exhibition') || ''; }
  catch { return ''; }
};
const inTemplate=(item,template)=>!template||isAsean(item)===isAsean(template);
const matchesQuery = (item, query) =>
  [item.title, item.summary, item.groupLabel].filter(Boolean).join(' ').toLocaleLowerCase().includes(query);
const findDestinationRoom = (gallery, destinationId) =>
  (gallery.rooms || []).findIndex(room => room.exhibition_id === destinationId);
const roomCountLabel = (language, count) => language === 'en'
  ? count === 1 ? '1 published group room' : count + ' published group rooms'
  : count + ' phòng nhóm đã công bố';
const setExhibitionHash = key => {
  if (typeof window === 'undefined') return;
  const current = window.location.hash.split('?')[0] || '#/tool/immersive-gallery';
  window.history.replaceState(null, '', current + (key ? '?exhibition=' + encodeURIComponent(key) : ''));
};

// ExhibitionsScreen — 03. Full Swiss card grid over real fetched exhibitions.
// 3D entry reuses the existing v3 MuseumExhibitionDetail viewer (behavior preserved).
// Props: {language, data, staff, onNavigate, onRefresh, transport, query}.
export default function ExhibitionsScreen({language='en', data, staff, onNavigate, onRefresh, onTemplateChange, lessonTemplate, transport=defaultTransport, query=''}) {
  const payload = data || staff || {};
  const isAdmin = payload?.profile?.role === 'admin' && !payload?.offlineReadOnly && !payload?.publicReadOnly;
  const [galleries, setGalleries] = useState(() => payload?.publishedGalleries || []);
  const [showcase, setShowcase] = useState({hiddenCollections: [], archivedGalleries: []});
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [covers, setCovers] = useState({});

  const pull = async () => {
    const api = await import('../../galleryData.js');
    const archive = await transport('showcase-state');
    // The public server catalogue already enforces school scope and publication
    // visibility. Do not let optional browser-side reads delay that catalogue.
    const enabled = typeof archive.galleryEnabled === 'boolean'
      ? archive.galleryEnabled : await api.getGalleryEnabled();
    const published = enabled && Array.isArray(archive.publishedGalleries) ? archive.publishedGalleries : [];
    let direct = [], directError = null;
    if (enabled && !payload.publicReadOnly && !isAsean(lessonTemplate)) {
      try { direct = await api.listExhibitions(); } catch (e) { directError = e; }
    }
    if (directError && !published.length) throw directError;
    const destinationIds=new Set(published.flatMap(item=>(item.destinations||[]).map(destination=>destination.id)));
    const unique = new Map();
    // Creator Pass exhibitions use the authoritative catalogue classification.
    // A direct row alone has no lesson metadata and cannot be safely classified.
    const standalone=direct.filter(item=>!item.slug?.startsWith('gcp-'));
    for (const item of [...standalone, ...published]) {
      if (item?.id && item.status !== 'archived' && !isPracticeShowcase(item)&&!destinationIds.has(item.id)) unique.set(item.id, item);
    }
    const items = [...unique.values()].sort((a, b) =>
      new Date(b.updated_at || 0).getTime() - new Date(a.updated_at || 0).getTime());
    return {api, items, archive};
  };

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const {api, items, archive} = await pull();
        if (!active) return;
        setGalleries(items); setShowcase(archive);
        loadCovers(items.filter(item=>inTemplate(item,lessonTemplate))).then(next => { if (active) setCovers(next); }).catch(() => {});
        const initial = exhibitionFromHash();
        if (initial && initial !== 'demo' && !initial.startsWith('collection-')) {
          try {
            const match = items.find(g => g.id === initial || g.slug === initial || g.destinations?.some(destination=>destination.id===initial)) ||
              (payload?.publishedGalleries || []).find(g => g.id === initial || g.slug === initial);
            if (!match || !inTemplate(match,lessonTemplate) || isPracticeShowcase(match)) throw new Error('This exhibition is unavailable.');
            const full = match?.status === 'published'
              ? (await transport('showcase-exhibition', {id: match.id})).gallery
              : await api.getExhibition(initial);
            const destinationId = match.destinations?.some(destination => destination.id === initial) ? initial : '';
            if (active) openGallery(full, destinationId);
          } catch (e) { if (active) setError(e.message || 'This exhibition is unavailable.'); }
        }
      } catch (e) { if (active) setError(e.message); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadCovers = async (items) => {
    const published = (items || []).filter(g => g?.id && g.status === 'published').slice(0, 16);
    const entries = await Promise.all(published.map(async (g) => {
      try {
        const full = (await transport('showcase-exhibition', {id: g.id})).gallery;
        const map = new Map();
        for (const room of full?.rooms || []) {
          const photos = (room.exhibits || []).filter(exhibit => exhibit.image_url);
          const cover = photos.find(exhibit => exhibit.title === 'Place') || photos[0];
          const key = room.exhibition_id || g.id;
          if (cover && !map.has(key)) map.set(key, cover.image_url);
        }
        const cover = map.get(g.id) || map.values().next().value;
        if (cover) map.set(g.id, cover);
        return [...map];
      } catch {
        return [];
      }
    }));
    return Object.fromEntries(entries.flat());
  };

  const reload = async () => {
    const {items, archive} = await pull();
    setGalleries(items); setShowcase(archive);
    setCovers(await loadCovers(items.filter(item=>inTemplate(item,lessonTemplate))));
  };

  const openGallery = (gallery, destinationId = '') => {
    if (!gallery || isPracticeShowcase(gallery)) {
      throw new Error(tr(language, 'Triển lãm này hiện không mở được.', 'This exhibition is unavailable.'));
    }
    const roomIndex = destinationId ? findDestinationRoom(gallery, destinationId) : 0;
    if (roomIndex < 0) {
      throw new Error(tr(language, 'Phòng nhóm này hiện không mở được.', 'This group room is unavailable.'));
    }
    setSelected({gallery, roomIndex});
    onTemplateChange?.(gallery.lesson_template || 'climate');
  };

  const enter = async (item, destinationId = '') => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const full = item.status === 'published'
        ? (await transport('showcase-exhibition', {id: item.id})).gallery
        : await (await import('../../galleryData.js')).getExhibition(item.id);
      openGallery(full, destinationId);
      setExhibitionHash(destinationId || full.slug || full.id);
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  const leave = () => { setSelected(null); setExhibitionHash(''); };

  const changeArchive = async (kind, key, title, archive=true) => {
    if (!isAdmin || busy) return;
    if (archive && !window.confirm('Delete exhibition "' + title + '"? It will be removed from the showcase but student work, scores and learning evidence will be preserved. You can restore it from Archived.')) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await transport(archive ? 'archive-exhibition' : 'restore-exhibition', {kind, key});
      leave(); await reload(); await onRefresh?.();
      setNotice(archive ? 'Exhibition removed from the showcase. You can restore it under Archived.' : 'Exhibition restored.');
    } catch (e) { setError(e.message); }
    finally { setBusy(false); }
  };

  // If a 3D exhibition is open, render the existing viewer (full behavior preserved).
  if (selected) {
    const {gallery, roomIndex} = selected;
    return (
      <GalleryRenderBoundary language={language} onFallback={leave}>
        <MuseumExhibitionDetail gallery={gallery} language={language} startInCinema initialRoomIndex={roomIndex}
          data={payload} onBack={leave} onNavigate={onNavigate}
          onDelete={isAdmin&&!isAsean(gallery) ? () => changeArchive('gallery', gallery.id, gallery.title, true) : null}
          busy={busy} />
      </GalleryRenderBoundary>
    );
  }

  const inventory = new Map();
  for (const g of [...(payload?.publishedGalleries || []), ...galleries]) {
    if (inTemplate(g,lessonTemplate) && g?.id && g.status !== 'archived' && !isPracticeShowcase(g)) inventory.set(g.id, g);
  }
  const term = query.trim().toLocaleLowerCase();
  const published = [...inventory.values()].filter(g => g.status === 'published');
  const publishedInView = published.filter(g => matchesQuery(g, term) ||
    g.destinations?.some(destination => matchesQuery(destination, term)));
  const groupRoomCount = published.reduce((count, g) => count + (g.destinations?.length || 0), 0);
  const archivedItems = (showcase.archivedGalleries || []).filter(g => inTemplate(g,lessonTemplate)&&!isPracticeShowcase(g))
    .map(g => ({kind: 'gallery', key: g.id, title: g.title, label: 'Student exhibition'}));

  const exhibitionMetrics = [
    {value: String(published.length), label: tr(language,'Triển lãm đã công bố','Published exhibitions')},
    {value: String(publishedInView.length), label: tr(language,'Đang hiển thị','Showing in view')},
    {value: String(archivedItems.length), label: tr(language,'Đã lưu trữ','Archived exhibitions')},
    {value: String(groupRoomCount || (payload?.groups || []).length), label: groupRoomCount
      ? tr(language,'Phòng nhóm đã công bố','Published group rooms')
      : tr(language,'Nhóm học sinh','Student groups')},
  ];

  return (
    <div className="swiss-editorial-exhibitions" aria-busy={loading || busy}>
      <header className="swiss-editorial-exhibitions-hero">
        <div>
          <h1>{tr(language, 'Triển lãm của chúng ta', 'Our exhibitions')}<span>.</span></h1>
          <p>{tr(language, 'Khám phá các dự án tiếng Anh qua không gian bảo tàng 3D.', 'Explore English projects in interactive 3D museums.')}</p>
        </div>
        <MetricStrip items={exhibitionMetrics} />
      </header>

      <div className="swiss-editorial-exhibitions-bar">
        <h2>{showArchived && isAdmin
          ? tr(language,'Triển lãm đã lưu trữ','Archived exhibitions')
          : tr(language,'Triển lãm đã công bố','Published exhibitions')}</h2>
        <div className="swiss-editorial-exhibitions-tools">
          <span>{publishedInView.length} {tr(language,'đang trực tuyến','live')}</span>
          {isAdmin ? (
            <button type="button" className="swiss-editorial-exhibition-archive" aria-pressed={showArchived} disabled={busy || loading}
              onClick={() => { setShowArchived(v => !v); setNotice(''); }}>
              {showArchived ? tr(language,'Về triển lãm','Back to exhibitions') : tr(language,'Lưu trữ','Archive')}
            </button>
          ) : null}
        </div>
      </div>

      {error ? <div className="info-strip info mt20" role="alert" style={{background:'#fde8e8', borderLeftColor:'#b31c2d', color:'#7a1620'}}><ShieldAlert size={15} aria-hidden="true"/> {error}</div> : null}
      {notice ? <div className="info-strip mt20" role="status"><CheckCircle2 size={15} aria-hidden="true"/> {notice}</div> : null}

      {loading ? (
        <p className="swiss-editorial-exhibitions-loading" role="status"><RefreshCw size={15} aria-hidden="true"/> {tr(language,'Đang tải triển lãm…','Loading exhibitions…')}</p>
      ) : showArchived && isAdmin ? (
        <div className="exhibition-grid">
          {archivedItems.map(item => (
            <article className="exhibit-card" key={item.kind + ':' + item.key}>
              <div style={{display:'flex', justifyContent:'space-between'}}>
                <span className="serial"><Archive size={14} aria-hidden="true"/> ARCHIVED</span>
              </div>
              <h3>{item.title}</h3>
              <p>{item.label}</p>
              <button type="button" className="small-link" disabled={busy}
                onClick={() => changeArchive(item.kind, item.key, item.title, false)}>
                <RotateCcw size={13} aria-hidden="true" style={{verticalAlign:'middle'}}/> {tr(language,'Khôi phục triển lãm','Restore exhibition')}
              </button>
            </article>
          ))}
          {!archivedItems.length ? <p className="muted">{tr(language,'Không có triển lãm nào đã lưu trữ.','No archived exhibitions.')}</p> : null}
        </div>
      ) : publishedInView.length ? (
        <div className="swiss-editorial-exhibitions-grid">
          {publishedInView.map((g, i) => g.destinations?.length ? (
            <section key={g.id} className="swiss-editorial-exhibition-collection" aria-label={g.title}>
              <header className="swiss-editorial-exhibition-collection-head">
                <div><h3>{g.title}</h3><p>{roomCountLabel(language, g.destinations.length)}</p></div>
                <button type="button" className="swiss-editorial-exhibition-open-all" disabled={busy}
                  onClick={() => enter(g)}>{tr(language,'Mở toàn bộ triển lãm','Open full exhibition')}</button>
              </header>
              <div className="swiss-editorial-exhibitions-grid">
                {(matchesQuery(g, term) ? g.destinations : g.destinations.filter(d => matchesQuery(d, term))).map(destination => (
                  <ExhibitionCard key={destination.id} heading="h4"
                    serial={destination.groupLabel} title={destination.title}
                    cover={covers[destination.id] || ''} statusLabel={tr(language,'Đã công bố','Published')}
                    language={language} ctaLabel={tr(language,'Mở phòng nhóm','Open group room')}
                    disabled={busy} onOpen={() => enter(g, destination.id)} />
                ))}
              </div>
            </section>
          ) : (
            <ExhibitionCard key={g.id}
              serial={'EXH. ' + String(i + 1).padStart(2, '0')}
              title={g.title}
              cover={covers[g.id] || ''}
              statusLabel={tr(language,'Đã công bố','Published')}
              language={language}
              disabled={busy}
              onOpen={() => enter(g)} />
          ))}
        </div>
      ) : (
        <div className="info-strip info mt20" role="note">
          <Landmark size={15} aria-hidden="true"/> {tr(language,'Không có triển lãm nào phù hợp.','No exhibitions match this view.')}{' '}
          <button type="button" className="small-link" onClick={() => reload().catch(e => setError(e.message))}>
            {tr(language,'Tải lại triển lãm','Reload exhibitions')}
          </button>
        </div>
      )}
    </div>
  );
}
