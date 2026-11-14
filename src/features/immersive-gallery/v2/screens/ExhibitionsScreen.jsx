import React, {useEffect, useState} from 'react';
import {Archive,RotateCcw,ShieldAlert,CheckCircle2,Landmark,RefreshCw} from 'lucide-react';
import EditorialHeading from '../shell/EditorialHeading.jsx';
import MetricStrip from '../shell/MetricStrip.jsx';
import ExhibitionCard from '../shell/ExhibitionCard.jsx';
import ContentPanel from '../shell/ContentPanel.jsx';
import MuseumExhibitionDetail from '../../v3/MuseumExhibitionDetail.jsx';
import {staffRequest as defaultTransport} from '../../v3/museumApi.js';

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
const setExhibitionHash = key => {
  if (typeof window === 'undefined') return;
  const current = window.location.hash.split('?')[0] || '#/tool/immersive-gallery';
  window.history.replaceState(null, '', current + (key ? '?exhibition=' + encodeURIComponent(key) : ''));
};

// ExhibitionsScreen — 03. Full Swiss card grid over real fetched exhibitions.
// 3D entry reuses the existing v3 MuseumExhibitionDetail viewer (behavior preserved).
// Props: {language, data, staff, onNavigate, onRefresh, transport, query}.
export default function ExhibitionsScreen({language='en', data, staff, onNavigate, onRefresh, transport=defaultTransport, query=''}) {
  const payload = data || staff || {};
  const isAdmin = payload?.profile?.role === 'admin' && !payload?.offlineReadOnly;
  const [galleries, setGalleries] = useState(() => payload?.publishedGalleries || []);
  const [showcase, setShowcase] = useState({hiddenCollections: [], archivedGalleries: []});
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showArchived, setShowArchived] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const pull = async () => {
    const api = await import('../../galleryData.js');
    const [clientEnabled, archive] = await Promise.all([api.getGalleryEnabled(), transport('showcase-state')]);
    const enabled = typeof archive.galleryEnabled === 'boolean' ? archive.galleryEnabled : clientEnabled;
    let direct = [], directError = null;
    if (enabled) { try { direct = await api.listExhibitions(); } catch (e) { directError = e; } }
    const published = enabled && Array.isArray(archive.publishedGalleries) ? archive.publishedGalleries : [];
    if (directError && !published.length) throw directError;
    const unique = new Map();
    for (const item of [...direct, ...published]) {
      if (item?.id && item.status !== 'archived' && !isPracticeShowcase(item)) unique.set(item.id, item);
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
        const initial = exhibitionFromHash();
        if (initial && initial !== 'demo' && !initial.startsWith('collection-')) {
          try {
            const match = items.find(g => g.id === initial || g.slug === initial) ||
              (payload?.publishedGalleries || []).find(g => g.id === initial || g.slug === initial);
            if (!match || isPracticeShowcase(match)) throw new Error('This exhibition is unavailable.');
            const full = match?.status === 'published'
              ? (await transport('showcase-exhibition', {id: match.id})).gallery
              : await api.getExhibition(initial);
            if (active && !isPracticeShowcase(full)) setSelected(full);
          } catch (e) { if (active) setError(e.message || 'This exhibition is unavailable.'); }
        }
      } catch (e) { if (active) setError(e.message); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reload = async () => {
    const {items, archive} = await pull();
    setGalleries(items); setShowcase(archive);
  };

  const enter = async item => {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const full = item.status === 'published'
        ? (await transport('showcase-exhibition', {id: item.id})).gallery
        : await (await import('../../galleryData.js')).getExhibition(item.id);
      if (isPracticeShowcase(full)) throw new Error('This exhibition is unavailable.');
      setSelected(full); setExhibitionHash(full.slug || full.id);
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
    return <MuseumExhibitionDetail gallery={selected} language={language} startInCinema
      data={payload} onBack={leave} onNavigate={onNavigate}
      onDelete={isAdmin ? () => changeArchive('gallery', selected.id, selected.title, true) : null}
      busy={busy} />;
  }

  const inventory = new Map();
  for (const g of [...(payload?.publishedGalleries || []), ...galleries]) {
    if (g?.id && g.status !== 'archived' && !isPracticeShowcase(g)) inventory.set(g.id, g);
  }
  const visible = [...inventory.values()].filter(g =>
    (g.title + ' ' + (g.summary || '')).toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
  const publishedInView = visible.filter(g => g.status === 'published');
  const publishedCount = [...inventory.values()].filter(g => g.status === 'published').length;
  const archivedItems = (showcase.archivedGalleries || []).filter(g => !isPracticeShowcase(g))
    .map(g => ({kind: 'gallery', key: g.id, title: g.title, label: 'Student exhibition'}));

  const exhibitionMetrics = [
    {value: String(publishedCount), label: tr(language,'Triển lãm đã công bố','Published exhibitions'), highlight: true},
    {value: String(publishedInView.length), label: tr(language,'Đang hiển thị','Showing in view')},
    {value: String(archivedItems.length), label: tr(language,'Đã lưu trữ','Archived exhibitions')},
    {value: String((payload?.groups || []).length), label: tr(language,'Nhóm học sinh','Student groups')},
  ];

  return (
    <>
      <EditorialHeading
        kicker={tr(language, 'TRƯỞNG BÀY BẢO TÀNG', 'MUSEUM SHOWCASE')}
        title={tr(language, 'Triển lãm của chúng ta.', 'Our exhibitions.')}
        description={tr(language, 'Khám phá các dự án tiếng Anh qua không gian bảo tàng 3D.', 'Explore English projects in interactive 3D museums.')}
        aside={<span>{publishedCount} {tr(language,'triển lãm đã công bố','published exhibitions')} · <b>{archivedItems.length}</b> {tr(language,'đã lưu trữ','archived')}</span>}
      />

      <MetricStrip items={exhibitionMetrics} />
      <div className="content-gap" />

      <div className="section-title">
        <span>{tr(language, 'TRIỂN LÃM ĐÃ CÔNG BỐ', 'PUBLISHED EXHIBITIONS')}</span>
        <span className="right" style={{display:'inline-flex', gap:12, alignItems:'center'}}>
          {publishedInView.length} {tr(language,'đang trực tuyến','live')}
          {isAdmin ? (
            <button type="button" className="small-link" aria-pressed={showArchived} disabled={busy || loading}
              onClick={() => { setShowArchived(v => !v); setNotice(''); }}>
              <Archive size={13} aria-hidden="true" style={{verticalAlign:'middle'}}/>{' '}
              {showArchived ? tr(language,'Về triển lãm','Back to exhibitions') : tr(language,'Đã lưu trữ','Archived') + ' (' + archivedItems.length + ')'}
            </button>
          ) : null}
        </span>
      </div>

      {error ? <div className="info-strip info mt20" role="alert" style={{background:'#fde8e8', borderLeftColor:'#b31c2d', color:'#7a1620'}}><ShieldAlert size={15} aria-hidden="true"/> {error}</div> : null}
      {notice ? <div className="info-strip mt20" role="status"><CheckCircle2 size={15} aria-hidden="true"/> {notice}</div> : null}

      {loading ? (
        <ContentPanel ariaLabel="Loading"><span className="muted"><RefreshCw size={15} aria-hidden="true"/> {tr(language,'Đang tải triển lãm…','Loading exhibitions…')}</span></ContentPanel>
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
        <div className="exhibition-grid">
          {publishedInView.map((g, i) => (
            <ExhibitionCard key={g.id}
              serial={'EXH. ' + String(i + 1).padStart(2, '0')}
              title={g.title}
              description={g.summary || tr(language,'Dự án bảo tàng của học sinh','Student museum project')}
              featured={i === 0}
              statusLabel={tr(language,'Đã công bố','Published')}
              language={language}
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
    </>
  );
}
