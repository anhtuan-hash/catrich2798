import React, { useMemo } from 'react';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../data/apps.js';
import { isAppHiddenForUser } from '../utils/appVisibility.js';
import { launchRoute } from '../utils/motion.js';
import HomeExactGraphic from './HomeExactGraphics.jsx';
import './HomeExact.css';

const ALL_APPS = [...APPS, ...GAME_APPS, ...SPECIAL_TOOLS];
const COLORS = { blue: '#2c86e8', coral: '#ff5b5f', yellow: '#e7aa00', mint: '#00aa91', purple: '#7f45da', sky: '#1578e5', orange: '#f18a00', rose: '#ff5467', aqua: '#00a991', lavender: '#9234cc' };

const APP_CARDS = [
  { id: 'grammar', slug: 'grammar-builder', title: 'Grammar Builder', desc: 'Tạo, kiểm định và phân phối học liệu.', tone: 'blue', icon: 'grammar', area: 'grammar' },
  { id: 'textcare', slug: 'textcare', title: 'TextCare Fixer', desc: 'Chuẩn hoá văn bản nhanh chóng.', tone: 'coral', icon: 'text', area: 'textcare' },
  { id: 'lesson', slug: 'lesson-plan-ai', title: 'Lesson Architect', desc: 'Thiết kế giáo án, học liệu và xuất bài dạy tương tác.', tone: 'yellow', icon: 'lesson', area: 'lesson', featured: true },
  { id: 'game', slug: 'game-hub', title: 'Game Hub', desc: 'Thư viện trò chơi học tập hấp dẫn.', tone: 'mint', icon: 'game', area: 'game' },
  { id: 'word', slug: 'word2graph', title: 'WordGraph Studio', desc: 'Khám phá mối liên hệ giữa các từ vựng.', tone: 'purple', icon: 'word', area: 'word' },
  { id: 'reading', title: 'Reading Lab', desc: 'Đọc hiểu, phân tích và trả lời thông minh.', tone: 'sky', icon: 'reading', area: 'reading', target: '#/news', visibilityId: 'route:news' },
  { id: 'listening', title: 'Listening Lab', desc: 'Luyện nghe chủ động và ghi chú hiệu quả.', tone: 'orange', icon: 'listening', area: 'listening', target: '#/apps', visibilityId: 'route:apps' },
  { id: 'worksheet', slug: 'textlab-activities', title: 'Worksheet Factory', desc: 'Tạo phiếu bài tập và học liệu nhanh.', tone: 'rose', icon: 'worksheet', area: 'worksheet' },
  { id: 'exam', slug: 'assessment-core', title: 'Exam Studio', desc: 'Tạo đề, ma trận và chấm chữa.', tone: 'aqua', icon: 'exam', area: 'exam' },
  { id: 'resource', slug: 'resource-library-hub', title: 'Resource Hub', desc: 'Tài liệu, biểu mẫu và mẫu thiết kế.', tone: 'blue', icon: 'resource', area: 'resource' },
  { id: 'ai', slug: 'independent-ai-chatbot', title: 'AI Assistant', desc: 'Trợ lý AI đồng hành trong dạy và học.', tone: 'lavender', icon: 'ai', area: 'ai' },
];

function targetFor(card) {
  if (card.target) return card.target;
  const app = ALL_APPS.find((item) => item.slug === card.slug);
  return app ? (app.route ? `#/${app.route}` : `#/tool/${app.slug}`) : '#/apps';
}

function go(target, label, color, currentUser, sourceEl) {
  const isPublic = ['#/home', '#/news'].includes(target);
  launchRoute({ target: !currentUser && !isPublic ? '#/login' : target, label, color, sourceEl });
}

function Icon({ name }) {
  const common = { viewBox: '0 0 48 48', fill: 'none', stroke: 'currentColor', strokeWidth: 2.8, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    game: <><path d="M13 20h22c5 0 8 3 9 8l2 8c1 5-3 8-7 5l-7-5H16l-7 5c-4 3-8 0-7-5l2-8c1-5 4-8 9-8Z"/><path d="M14 29h8M18 25v8"/><circle cx="33" cy="28" r="1.5" fill="currentColor" stroke="none"/><circle cx="38" cy="33" r="1.5" fill="currentColor" stroke="none"/></>,
    grammar: <text x="24" y="34" textAnchor="middle" fontSize="30" fontWeight="900" fill="currentColor" stroke="none">G</text>,
    text: <text x="24" y="34" textAnchor="middle" fontSize="30" fontWeight="900" fill="currentColor" stroke="none">T</text>,
    lesson: <text x="24" y="34" textAnchor="middle" fontSize="30" fontWeight="900" fill="currentColor" stroke="none">L</text>,
    word: <text x="24" y="34" textAnchor="middle" fontSize="30" fontWeight="900" fill="currentColor" stroke="none">W</text>,
    reading: <><path d="M6 12h15c4 0 7 3 7 7v22c0-4-3-7-7-7H6z"/><path d="M42 12H27c-4 0-7 3-7 7v22c0-4 3-7 7-7h15z"/></>,
    listening: <><path d="M9 27a15 15 0 0 1 30 0"/><rect x="7" y="25" width="8" height="15" rx="4"/><rect x="33" y="25" width="8" height="15" rx="4"/></>,
    worksheet: <><path d="M13 6h17l7 7v29H13z"/><path d="M30 6v8h8"/><path d="M19 23h13M19 29h13M19 35h9"/></>,
    exam: <><rect x="9" y="7" width="30" height="34" rx="5"/><path d="m15 19 4 4 7-8M28 20h6M15 32l4 4 7-8M28 33h6"/></>,
    resource: <><path d="M5 14h15l5 5h18v21H5z"/><path d="M5 21h38"/></>,
    ai: <><path d="M24 5c1 8 5 12 13 13-8 1-12 5-13 13-1-8-5-12-13-13 8-1 12-5 13-13Z"/><path d="M37 27c.7 5 3.3 7.3 8 8-4.7.7-7.3 3-8 8-.7-5-3.3-7.3-8-8 4.7-.7 7.3-3 8-8Z"/></>,
  };
  return <svg {...common}>{paths[name] || paths.grammar}</svg>;
}

function AppCard({ card, currentUser, vi }) {
  const accent = COLORS[card.tone] || COLORS.blue;
  return (
    <button type="button" className={`bhe-app-card bhe-tone-${card.tone} ${card.featured ? 'is-featured' : ''}`} style={{ gridArea: card.area, '--bhe-accent': accent }} onClick={(event) => go(targetFor(card), card.title, accent, currentUser, event.currentTarget)} aria-label={`${vi ? 'Mở' : 'Open'} ${card.title}`}>
      <span className="bhe-window-strip"><i/><i/><i/></span>
      <span className="bhe-card-inner">
        <span className="bhe-app-icon"><Icon name={card.icon}/></span>
        <span className="bhe-card-copy"><strong>{card.title}</strong><small>{card.desc}</small></span>
        <HomeExactGraphic type={card.id}/>
        {card.featured ? <span className="bhe-crown" aria-hidden="true">♛</span> : null}
        <span className="bhe-card-arrow" aria-hidden="true">→</span>
        {card.featured ? <span className="bhe-feature-actions"><i>▰ {vi ? 'Bài dạy' : 'Lesson'}</i><i>✎ {vi ? 'Thiết kế' : 'Design'}</i><i>⇧ {vi ? 'Xuất file' : 'Export'}</i></span> : null}
      </span>
    </button>
  );
}

export default function HomeExact({ currentUser, language = 'vi', appVisibility }) {
  const vi = language === 'vi';
  const name = useMemo(() => {
    const source = currentUser?.name || currentUser?.email || (vi ? 'Khách' : 'Guest');
    const parts = String(source).trim().split(/\s+/).filter(Boolean);
    return parts.at(-1) || source;
  }, [currentUser, vi]);
  const now = new Date();
  const date = new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-US', { weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);
  const time = new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const visibleCards = APP_CARDS.filter((card) => !isAppHiddenForUser(appVisibility?.snapshot, currentUser, card.visibilityId || (card.slug ? `tool:${card.slug}` : 'route:apps')));

  return (
    <div className="brian-home-exact" data-home-exact="true">
      <div className="bhe-layout">
        <section className="bhe-hero-panel">
          <span className="bhe-kicker">BRIAN ENGLISH STUDIO</span><span className="bhe-hero-star" aria-hidden="true">✦</span><span className="bhe-orbit" aria-hidden="true"/>
          <h1><span>BRIAN</span><strong>STUDIO</strong></h1>
          <p>{vi ? 'Không gian dạy học số của Brian English: mở nhanh ứng dụng, trò chơi, thư viện và công cụ quản lý trong một hệ thống thống nhất.' : 'Brian English digital teaching workspace: quickly open apps, games, libraries and management tools in one unified system.'}</p>
          <article className="bhe-info-card bhe-profile-card"><span className="bhe-profile-icon">●</span><div><strong>{vi ? `Xin chào, ${name}!` : `Hello, ${name}!`}</strong><small>{date} · {time}</small></div><span className="bhe-weather">☀<b>27°C</b><small>Hà Nội</small></span></article>
          <article className="bhe-info-card bhe-progress-card"><span className="bhe-progress-icon">▥</span><div><span><strong>{vi ? 'Tiến độ hôm nay' : 'Today progress'}</strong><b>7/10</b></span><i><em/></i></div></article>
          <button type="button" className="bhe-start-card" onClick={(event) => go('#/apps', 'GO', '#8fb315', currentUser, event.currentTarget)}><span>⬆</span><div><strong>{vi ? 'Bắt đầu ngay hôm nay' : 'Start today'}</strong><small>{vi ? 'Khám phá bộ công cụ của bạn' : 'Explore your toolkit'}</small></div><b>→</b></button>
          <span className="bhe-leaves" aria-hidden="true"><i/><i/><i/><i/></span>
        </section>
        <section className="bhe-app-board" aria-label={vi ? 'Bộ ứng dụng của bạn' : 'Your app collection'}><div className="bhe-app-grid">{visibleCards.map((card) => <AppCard key={card.id} card={card} currentUser={currentUser} vi={vi}/>)}</div></section>
      </div>
    </div>
  );
}
