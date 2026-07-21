import React, { useMemo } from 'react';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../data/apps.js';
import { launchRoute } from '../utils/motion.js';
import './HomeProposal2.css';

const ALL_APPS = [...APPS, ...GAME_APPS, ...SPECIAL_TOOLS];

const cards = [
  { slug: 'grammar-builder', title: 'Grammar Builder', text: 'Tạo, kiểm định và phân phối học liệu.', tone: 'blue', icon: 'G', className: 'grammar' },
  { slug: 'textcare', title: 'TextCare Fixer', text: 'Chuẩn hoá văn bản nhanh chóng.', tone: 'coral', icon: 'T', className: 'textcare' },
  { slug: 'lesson-plan-ai', title: 'Lesson Architect', text: 'Thiết kế giáo án, học liệu và xuất bài dạy tương tác.', tone: 'yellow', icon: 'L', className: 'lesson', featured: true },
  { slug: 'game-hub', title: 'Game Hub', text: 'Thư viện trò chơi học tập hấp dẫn.', tone: 'mint', icon: '🎮', className: 'game' },
  { slug: 'word2graph', title: 'WordGraph Studio', text: 'Khám phá mối liên hệ giữa các từ vựng.', tone: 'purple', icon: 'W', className: 'wordgraph' },
  { slug: 'reading-studio', title: 'Reading Lab', text: 'Đọc hiểu, phân tích và trả lời thông minh.', tone: 'blue', icon: '📖', className: 'reading' },
  { slug: 'listening-studio', title: 'Listening Lab', text: 'Luyện nghe chủ động và ghi chú hiệu quả.', tone: 'orange', icon: '🎧', className: 'listening' },
  { slug: 'worksheet-factory', title: 'Worksheet Factory', text: 'Tạo phiếu bài tập và học liệu nhanh.', tone: 'pink', icon: '▤', className: 'worksheet' },
  { slug: 'exam-studio', title: 'Exam Studio', text: 'Tạo đề, ma trận và chấm chữa.', tone: 'aqua', icon: '✓', className: 'exam' },
  { slug: 'resource-library', title: 'Resource Hub', text: 'Tài liệu, biểu mẫu và mẫu thiết kế.', tone: 'blue', icon: '▰', className: 'resource', target: '#/resource-library' },
  { slug: 'independent-ai-chatbot', title: 'AI Assistant', text: 'Trợ lý AI đồng hành trong dạy và học.', tone: 'lavender', icon: '✦', className: 'assistant' },
];

function appTarget(card) {
  if (card.target) return card.target;
  const app = ALL_APPS.find((item) => item.slug === card.slug);
  if (!app) return '#/apps';
  return app.route ? `#/${app.route}` : `#/tool/${app.slug}`;
}

function openCard(card, user, sourceEl) {
  const target = user ? appTarget(card) : '#/login';
  launchRoute({ target, label: card.title.slice(0, 2).toUpperCase(), color: '#7fae2e', sourceEl });
}

function AppCard({ card, currentUser }) {
  return (
    <button
      type="button"
      className={`p2-app-card p2-tone-${card.tone} p2-card-${card.className} ${card.featured ? 'is-featured' : ''}`}
      onClick={(event) => openCard(card, currentUser, event.currentTarget)}
    >
      <span className="p2-window-bar"><i /><i /><i /></span>
      {card.featured ? <span className="p2-crown">♛</span> : null}
      <span className="p2-app-content">
        <span className="p2-app-icon">{card.icon}</span>
        <span className="p2-app-copy">
          <strong>{card.title}</strong>
          <small>{card.text}</small>
        </span>
      </span>
      {card.featured ? (
        <span className="p2-feature-actions"><i>▰ Bài dạy</i><i>✎ Thiết kế</i><i>⇧ Xuất file</i></span>
      ) : null}
      <span className="p2-arrow">→</span>
    </button>
  );
}

export default function HomeProposal2({ currentUser, language = 'vi' }) {
  const vi = language === 'vi';
  const name = useMemo(() => {
    const value = currentUser?.name || currentUser?.email || (vi ? 'Khách' : 'Guest');
    return String(value).split(/\s+/).filter(Boolean).slice(-1)[0] || value;
  }, [currentUser, vi]);

  const now = new Date();
  const time = new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const date = new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-US', { weekday: 'short', day: '2-digit', month: '2-digit', year: 'numeric' }).format(now);

  return (
    <main className="p2-home" aria-label="Brian English homepage">
      <section className="p2-hero-panel">
        <span className="p2-kicker">BRIAN ENGLISH STUDIO</span>
        <span className="p2-spark">✦</span>
        <span className="p2-orbit" aria-hidden="true" />
        <h1><span>brian</span><strong>english</strong></h1>
        <p>{vi ? 'Không gian dạy học số của Brian English: mở nhanh ứng dụng, trò chơi, thư viện và công cụ quản lý trong một hệ thống thống nhất.' : 'A unified digital teaching workspace for apps, games, resources and management.'}</p>

        <div className="p2-user-card">
          <span className="p2-user-icon">●</span>
          <span><strong>Xin chào, {name}!</strong><small>{date} · {time}</small></span>
          <span className="p2-weather"><b>☀</b><strong>27°C</strong><small>Hà Nội</small></span>
        </div>

        <div className="p2-progress-card">
          <span className="p2-progress-icon">▮</span>
          <span><strong>{vi ? 'Tiến độ hôm nay' : 'Today progress'}</strong><i><b /></i></span>
          <em>7/10</em>
        </div>

        <button type="button" className="p2-start-card" onClick={(event) => launchRoute({ target: currentUser ? '#/apps' : '#/login', label: 'GO', color: '#9cc52a', sourceEl: event.currentTarget })}>
          <span>⬆</span>
          <span><strong>{vi ? 'Bắt đầu ngay hôm nay' : 'Start today'}</strong><small>{vi ? 'Khám phá bộ công cụ của bạn' : 'Explore your toolkit'}</small></span>
          <b>→</b>
        </button>
        <span className="p2-leaves" aria-hidden="true" />
      </section>

      <section className="p2-board">
        <div className="p2-board-grid">
          {cards.map((card) => <AppCard key={card.slug} card={card} currentUser={currentUser} />)}
        </div>
      </section>
    </main>
  );
}
