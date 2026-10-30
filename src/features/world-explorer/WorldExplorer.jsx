import React, { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, CalendarDays, Globe2, Settings2, X } from 'lucide-react';
import { isSupabaseConfigured, supabase } from '../../utils/supabase.js';
import { isAdminRole } from '../../utils/roles.js';
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

function Reader({ article, onClose, language }) {
  useEffect(() => {
    if (!article) return undefined;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onEscape = (event) => { if (event.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onEscape);
    return () => { document.body.style.overflow = previous; document.removeEventListener('keydown', onEscape); };
  }, [article, onClose]);
  if (!article) return null;
  const vocabulary = Array.isArray(article.vocabulary) ? article.vocabulary : [];
  return (
    <div className="we-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <article className="we-reader" role="dialog" aria-modal="true" aria-label={article.title_en}>
        <button className="we-close" type="button" aria-label="Close" onClick={onClose}><X size={19} /></button>
        {article.image_url ? <img className="we-reader-image" src={article.image_url} alt={article.image_alt_en || article.title_en} loading="lazy" /> : <div className="we-art we-reader-art"><Globe2 size={66} aria-hidden="true" /></div>}
        <div className="we-reader-body">
          <span className="we-kicker"><Globe2 size={15} /> {CATEGORIES[article.category]?.[0] || 'World Explorer'} · {publicationDate(article.publication_date, language)}</span>
          <h2>{article.title_en}</h2>
          <h3>{article.title_vi}</h3>
          <p className="we-content" lang="en">{article.body_en}</p>
          <div className="we-bilingual-divider">BẢN DỊCH TIẾNG VIỆT</div>
          <p className="we-content" lang="vi">{article.body_vi}</p>
          {article.fact_en ? <div className="we-fact"><strong >{language === 'en' ? 'Did you know?' : 'Bạn có biết?'}</strong><p lang="en">{article.fact_en}</p><p lang="vi">{article.fact_vi}</p></div> : null}
          {vocabulary.length ? <div className="we-words"><strong>{language === 'en' ? 'Word Bank' : 'Góc từ vựng'}</strong><div>{vocabulary.map((v, i) => <span key={i}><b>{v.word}</b> — {v.meaning}</span>)}</div></div> : null}
          <footer className="we-sources">
            <strong>{language === 'en' ? 'Source' : 'Nguồn tham khảo'}</strong>
            {article.source_url ? <a href={article.source_url} target="_blank" rel="noopener noreferrer">{article.source_title || article.source_url}</a> : null}
            {article.image_credit ? <small>{article.image_credit}</small> : null}
          </footer>
        </div>
      </article>
    </div>
  );
}

export default function WorldExplorer({ currentUser, language = 'vi' }) {
  const vi = language !== 'en';
  const isAdmin = isAdminRole(currentUser?.role);
  const [enabled, setEnabled] = useState(true);
  const [articles, setArticles] = useState([]);
  const [selected, setSelected] = useState(null);
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
    return () => { active = false; document.removeEventListener('visibilitychange', onVisibility); };
  }, [load]);

  const closeReader = useCallback(() => { setSelected(null); setArchive(false); }, []);
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
          {articles.length > 1 ? <button type="button" className="we-archive-btn" onClick={() => setArchive(true)}><BookOpen size={16} /> {vi ? 'Kho khám phá' : 'Discoveries'} <ArrowRight size={15} /></button> : null}
        </div>
      </div>
      {!enabled ? <p className="we-disabled">{vi ? 'World Explorer đang tắt với khách truy cập.' : 'World Explorer is hidden from visitors.'}</p> : featured ? (
        <div className="we-featured">
          <div className="we-picture">
            {featured.image_url ? <img src={featured.image_url} alt={featured.image_alt_en || featured.title_en} loading="lazy" decoding="async" /> : <div className="we-art"><Globe2 size={82} aria-hidden="true" /><span>DISCOVER THE WORLD</span></div>}
            <span className="we-picture-tape" aria-hidden="true" />
          </div>
          <div className="we-copy">
            <span className="we-label"><CalendarDays size={14} /> {publicationDate(featured.publication_date, language)} · {CATEGORIES[featured.category]?.[vi ? 1 : 0] || 'World Culture'}</span>
            <h3 lang="en">{featured.title_en}</h3>
            <p className="we-translation" lang="vi">{featured.title_vi}</p>
            <p className="we-teaser" lang={vi ? 'vi' : 'en'}>{vi ? featured.intro_vi : featured.intro_en}</p>
            <button type="button" className="we-read-btn" onClick={() => setSelected(featured)}>{vi ? 'Khám phá ngay' : 'Read discovery'} <ArrowRight size={17} /></button>
          </div>
        </div>
      ) : <div className="we-empty"><div className="we-art"><Globe2 size={54}/></div><div><strong>{vi ? 'Chuyến khám phá đầu tiên đang được chuẩn bị' : 'Our first discovery is being prepared'}</strong><p>{vi ? 'Các bài viết đều được kiểm chứng và duyệt trước khi xuất bản.' : 'Every story is verified and reviewed before publication.'}</p></div></div>}
      {loading ? <span className="we-loading" aria-live="polite">{vi ? 'Đang tải khám phá...' : 'Loading discoveries...'}</span> : null}
      <div className="we-bottom"><span>LEARN · DISCOVER · GROW</span><span>{vi ? 'Tri thức không biên giới' : 'Knowledge without borders'} ✿</span></div>
      {selected ? <Reader article={selected} language={language} onClose={closeReader} /> : null}
      {archive ? <div className="we-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setArchive(false); }}><div className="we-archive" role="dialog" aria-modal="true" aria-label="World Explorer Archive"><button type="button" className="we-close" onClick={() => setArchive(false)} aria-label="Close"><X/></button><h2>{vi ? 'Kho khám phá' : 'Discovery Archive'}</h2><div className="we-archive-list">{articles.map((a) => <button type="button" key={a.id} onClick={() => { setArchive(false); setSelected(a); }}><span>{publicationDate(a.publication_date, language)}</span><strong>{a.title_en}</strong><small>{a.title_vi}</small><ArrowRight size={16}/></button>)}</div><button type="button" className="we-back" onClick={() => setArchive(false)}><ArrowLeft size={16}/>{vi ? 'Quay lại' : 'Back'}</button></div></div> : null}
      {adminOpen && isAdmin ? <Suspense fallback={null}><WorldExplorerAdmin currentUser={currentUser} language={language} onClose={() => { setAdminOpen(false); load().catch(() => {}); }} /></Suspense> : null}
    </section>
  );
}
