import React, { Suspense, lazy, useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, ChevronUp, Globe2, Settings2 } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../utils/supabase.js';
import { isAdminRole } from '../../utils/roles.js';
import { useNovemberHomeTheme } from '../../utils/novemberHomeTheme.js';
import './world-explorer.css';

const WorldExplorerAdmin = lazy(() => import('./WorldExplorerAdmin.jsx'));
const CATEGORIES = {
  culture: ['Culture & Traditions', 'Văn hóa & Truyền thống'],
  history: ['World History', 'Lịch sử thế giới'],
  places: ['Places & Wonders', 'Địa danh & Kỳ quan'],
  science: ['Science & Discovery', 'Khoa học & Khám phá'],
  language: ['Language & Society', 'Ngôn ngữ & Xã hội'],
  international: ['International Days', 'Ngày quốc tế'],
};

function publicationDate(value, language) {
  if (!value) return '';
  const [y, m, d] = String(value).split('-').map(Number);
  if (!y || !m || !d) return '';
  return new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'vi-VN', {
    timeZone: 'Asia/Ho_Chi_Minh', year: 'numeric', month: 'long', day: 'numeric',
  }).format(new Date(Date.UTC(y, m - 1, d, 5)));
}

function Reader({ article, onClose, language, panelRef }) {
  if (!article) return null;
  const vi = language !== 'en';
  const vocabulary = Array.isArray(article.vocabulary) ? article.vocabulary : [];
  return (
    <article
      ref={panelRef}
      id="we-expanded-story"
      className="we-expanded-reader"
      aria-labelledby="we-expanded-title"
      tabIndex={-1}
      data-world-explorer-inline-reader
    >
      <div className="we-expanded-heading">
        <div>
          <span className="we-kicker"><BookOpen size={16} aria-hidden="true" /> {vi ? 'BÀI KHÁM PHÁ ĐẦY ĐỦ' : 'FULL DISCOVERY'} · {publicationDate(article.publication_date, language)}</span>
          <h3 id="we-expanded-title" lang="en">{article.title_en}</h3>
          <p lang="vi" className="we-expanded-subtitle">{article.title_vi}</p>
        </div>
        <button type="button" className="we-collapse-button" onClick={onClose} aria-label={vi ? 'Thu gọn bài viết' : 'Collapse article'}>
          <ChevronUp size={17} aria-hidden="true" /> {vi ? 'Thu gọn' : 'Collapse'}
        </button>
      </div>

      <div className="we-article-columns">
        <section className="we-article-language" lang="en" aria-label="English article">
          <h4>ENGLISH</h4>
          <p className="we-content">{article.body_en}</p>
        </section>
        <section className="we-article-language we-article-language--vi" lang="vi" aria-label={vi ? 'Bản dịch tiếng Việt' : 'Vietnamese translation'}>
          <h4>{vi ? 'TIẾNG VIỆT' : 'VIETNAMESE'}</h4>
          <p className="we-content">{article.body_vi}</p>
        </section>
      </div>

      {article.fact_en ? (
        <section className="we-fact">
          <strong>{vi ? '✦ Bạn có biết?' : '✦ Did you know?'}</strong>
          <p lang="en">{article.fact_en}</p>
          {article.fact_vi ? <p lang="vi">{article.fact_vi}</p> : null}
        </section>
      ) : null}

      {vocabulary.length ? (
        <section className="we-words" aria-label="Word bank">
          <strong>{vi ? 'Góc từ vựng' : 'Word Bank'}</strong>
          <div>{vocabulary.map((item, index) => (
            <span key={index}><b>{item.word}</b> — {item.meaning}</span>
          ))}</div>
        </section>
      ) : null}

      <footer className="we-sources">
        <strong>{vi ? 'Nguồn tham khảo' : 'Sources & credits'}</strong>
        {article.source_url ? <a href={article.source_url} target="_blank" rel="noopener noreferrer">{article.source_title || article.source_url}</a> : null}
        {article.image_credit ? <small>{article.image_credit}</small> : null}
      </footer>
      <div className="we-reader-end">
        <span>BRIAN WORLD EXPLORER · LEARN · DISCOVER · GROW</span>
        <button type="button" className="we-collapse-button" onClick={onClose}><ChevronUp size={16} aria-hidden="true" /> {vi ? 'Thu gọn bài viết' : 'Collapse story'}</button>
      </div>
    </article>
  );
}

export default function WorldExplorer({ currentUser, language = 'vi' }) {
  const november = useNovemberHomeTheme();
  const vi = language !== 'en';
  const isAdmin = isAdminRole(currentUser?.role);
  const [enabled, setEnabled] = useState(true);
  const [articles, setArticles] = useState([]);
  const [selected, setSelected] = useState(null);
  const readerRef = useRef(null);
  const readButtonRef = useRef(null);
  const [archive, setArchive] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!isSupabaseConfigured) { setLoading(false); setError('Not configured'); return; }
    const [settings, publications] = await Promise.all([
      supabase.from('world_explorer_settings').select('enabled').eq('id', 1).maybeSingle(),
      supabase.from('world_explorer_publications')
        .select('id,slug,category,title_en,title_vi,intro_en,intro_vi,body_en,body_vi,fact_en,fact_vi,image_url,image_alt_en,image_credit,source_title,source_url,vocabulary,publication_date')
        .eq('is_visible', true).order('publication_date', { ascending: false }).limit(30),
    ]);
    if (settings.error || publications.error) {
      setError(settings.error?.message || publications.error?.message || 'Unavailable');
    } else {
      setEnabled(settings.data?.enabled !== false);
      setArticles(publications.data || []);
      setError('');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    let active = true;
    load().catch(() => { if (active) { setLoading(false); setError('Unavailable'); } });
    const onVisibility = () => { if (!document.hidden) load().catch(() => {}); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('bes-world-explorer-updated', load);
    return () => { active = false; document.removeEventListener('visibilitychange', onVisibility); window.removeEventListener('bes-world-explorer-updated', load); };
  }, [load]);

  useEffect(() => {
    if (!selected) return undefined;
    const frame = requestAnimationFrame(() => {
      readerRef.current?.focus({ preventScroll: true });
      readerRef.current?.scrollIntoView({
        behavior: window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches ? 'auto' : 'smooth',
        block: 'start',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [selected]);

  const closeReader = useCallback(() => {
    setSelected(null);
    requestAnimationFrame(() => readButtonRef.current?.focus({ preventScroll: true }));
  }, []);
  const closeAdmin = useCallback(() => {
    setAdminOpen(false);
    load().catch(() => {});
  }, [load]);
  if (!enabled && !isAdmin) return null;
  if (error && !isAdmin) return null; // Keep existing homepage unchanged on backend failures.
  const featured = articles[0];
  return (
    <section className="we-wrap" aria-labelledby="we-heading" data-brian-world-explorer>
      <div className="we-decoration we-decoration--left" aria-hidden="true">✿</div>
      <div className="we-masthead">
        <div><span className="we-kicker"><Globe2 size={16} /> BRIAN ENGLISH · DAILY DISCOVERY</span><h2 id="we-heading">World Explorer <span>✦</span></h2><p>{vi ? 'Mỗi ngày, một góc nhìn mới về thế giới.' : 'Discover something new about our world every day.'}</p></div>
        <div className="we-masthead-actions">
          {isAdmin ? <button type="button" className="we-admin-btn" onClick={() => setAdminOpen(true)}><Settings2 size={16} /> {vi ? 'Quản lý' : 'Manage'}</button> : null}
          {articles.length > 1 ? <button type="button" className="we-archive-btn" onClick={() => setArchive((value) => !value)} aria-expanded={archive} aria-controls="we-archive-list"><BookOpen size={16} /> {vi ? 'Kho khám phá' : 'Discoveries'} <ArrowRight size={15} /></button> : null}
        </div>
      </div>
      {!enabled ? <p className="we-disabled">{vi ? 'World Explorer đang tắt với khách truy cập.' : 'World Explorer is hidden from visitors.'}</p> : featured ? (
        <div className="we-featured">
          {november.enabled ? <img className="november-discovery-postcard" src="/assets/home/november/discover-world-postcard.webp" alt="" aria-hidden="true" loading="lazy" decoding="async" /> : null}
          <div className="we-picture">
            {featured.image_url ? <img src={featured.image_url} alt={featured.image_alt_en || featured.title_en} loading="lazy" decoding="async" /> : <div className="we-art"><Globe2 size={82} aria-hidden="true" /><span>DISCOVER THE WORLD</span></div>}
            <span className="we-picture-tape" aria-hidden="true" />
            {november.enabled ? <span className="november-discovery-caption" aria-hidden="true">Explore the world<br />Grow every day</span> : null}
          </div>
          <div className="we-copy">
            <span className="we-label"><CalendarDays size={14} /> {publicationDate(featured.publication_date, language)} · {CATEGORIES[featured.category]?.[vi ? 1 : 0] || 'World Culture'}</span>
            <h3 lang="en">{featured.title_en}</h3>
            <p className="we-translation" lang="vi">{featured.title_vi}</p>
            <p className="we-teaser" lang={vi ? 'vi' : 'en'}>{vi ? featured.intro_vi : featured.intro_en}</p>
            <button type="button" ref={readButtonRef} className="we-read-btn" onClick={() => setSelected((current) => current?.id === featured.id ? null : featured)} aria-expanded={selected?.id === featured.id} aria-controls="we-expanded-story">{selected?.id === featured.id ? (vi ? 'Thu gọn bài viết' : 'Collapse story') : (vi ? 'Khám phá ngay' : 'Read discovery')} {selected?.id === featured.id ? <ChevronUp size={17} /> : <ArrowRight size={17} />}</button>
          </div>
        </div>
      ) : <div className="we-empty"><div className="we-art"><Globe2 size={54}/></div><div><strong>{vi ? 'Chuyến khám phá đầu tiên đang được chuẩn bị' : 'Our first discovery is being prepared'}</strong><p>{vi ? 'Các bài viết đều được kiểm chứng và duyệt trước khi xuất bản.' : 'Every story is verified and reviewed before publication.'}</p></div></div>}
      {loading ? <span className="we-loading" aria-live="polite">{vi ? 'Đang tải khám phá...' : 'Loading discoveries...'}</span> : null}
      {selected ? <Reader article={selected} language={language} onClose={closeReader} panelRef={readerRef} /> : null}
      {archive ? (
        <section className="we-archive-inline" id="we-archive-list" aria-label={vi ? 'Kho khám phá' : 'Discovery archive'} data-world-explorer-inline-archive>
          <div className="we-archive-heading">
            <div><span className="we-kicker">WORLD EXPLORER · ARCHIVE</span><h3>{vi ? 'Những chuyến khám phá trước' : 'Previous discoveries'}</h3></div>
            <button type="button" className="we-collapse-button" onClick={() => setArchive(false)}><ChevronUp size={16} />{vi ? 'Thu gọn' : 'Collapse'}</button>
          </div>
          <div className="we-archive-list">{articles.map((item) => (
            <button type="button" key={item.id} onClick={() => { setArchive(false); setSelected(item); }}>
              <span>{publicationDate(item.publication_date, language)}</span>
              <strong>{item.title_en}</strong>
              <small>{item.title_vi}</small>
              <ArrowRight size={17} aria-hidden="true" />
            </button>
          ))}</div>
        </section>
      ) : null}
      <div className="we-bottom"><span>LEARN · DISCOVER · GROW</span><span>{vi ? 'Tri thức không biên giới' : 'Knowledge without borders'} ✿</span></div>
      {adminOpen && isAdmin ? <Suspense fallback={null}><WorldExplorerAdmin currentUser={currentUser} language={language} onClose={closeAdmin} /></Suspense> : null}
    </section>
  );
}
