import React, { useMemo } from 'react';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../data/apps.js';
import { launchRoute } from '../utils/motion.js';
import './HomeProposal2.css';

const ALL_APPS = [...APPS, ...GAME_APPS, ...SPECIAL_TOOLS];

const cards = [
  { slug: 'grammar-builder', title: 'Grammar Builder', text: 'Tạo, kiểm định và phân phối học liệu.', tone: 'blue', size: 'wide' },
  { slug: 'textcare', title: 'TextCare Fixer', text: 'Chuẩn hoá văn bản nhanh chóng.', tone: 'coral', size: 'wide' },
  { slug: 'lesson-plan-ai', title: 'Lesson Architect', text: 'Thiết kế giáo án, học liệu và xuất bài dạy tương tác.', tone: 'yellow', size: 'hero' },
  { slug: 'game-hub', title: 'Game Hub', text: 'Thư viện trò chơi học tập hấp dẫn.', tone: 'purple', size: 'medium' },
  { slug: 'word2graph', title: 'WordGraph Studio', text: 'Khám phá mối liên hệ giữa các từ vựng.', tone: 'aqua', size: 'medium' },
  { slug: 'reading-studio', title: 'Reading Lab', text: 'Đọc hiểu, phân tích và trả lời thông minh.', tone: 'pink', size: 'small' },
  { slug: 'listening-studio', title: 'Listening Lab', text: 'Luyện nghe chủ động và ghi chú hiệu quả.', tone: 'sky', size: 'small' },
  { slug: 'worksheet-factory', title: 'Worksheet Factory', text: 'Tạo phiếu bài tập và học liệu nhanh.', tone: 'mint', size: 'small' },
  { slug: 'exam-studio', title: 'Exam Studio', text: 'Tạo đề, ma trận và chấm chữa.', tone: 'rose', size: 'small' },
  { slug: 'resource-library', title: 'Resource Hub', text: 'Tài liệu, biểu mẫu và mẫu thiết kế.', tone: 'cream', size: 'small', target: '#/resource-library' },
  { slug: 'independent-ai-chatbot', title: 'AI Assistant', text: 'Trợ lý AI đồng hành trong dạy và học.', tone: 'lavender', size: 'small' },
  { slug: 'department-workspace', title: 'Department Hub', text: 'Quản lý kế hoạch và hoạt động tổ chuyên môn.', tone: 'green', size: 'small', target: '#/department' },
];

function appTarget(card) {
  if (card.target) return card.target;
  const app = ALL_APPS.find((item) => item.slug === card.slug);
  if (!app) return '#/apps';
  return app.route ? `#/${app.route}` : `#/tool/${app.slug}`;
}

function openCard(card, user, sourceEl) {
  const target = user ? appTarget(card) : '#/login';
  launchRoute({ target, label: card.title.slice(0, 2).toUpperCase(), color: '#202a21', sourceEl });
}

export default function HomeProposal2({ currentUser, language = 'vi' }) {
  const vi = language === 'vi';
  const name = useMemo(() => {
    const value = currentUser?.name || currentUser?.email || (vi ? 'Khách' : 'Guest');
    return String(value).split(/\s+/).filter(Boolean).slice(-1)[0] || value;
  }, [currentUser, vi]);

  const now = new Date();
  const time = new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-US', { hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  const date = new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-US', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(now);

  return (
    <main className="p2-home" aria-label="Brian English homepage proposal 2">
      <section className="p2-hero">
        <span className="p2-kicker">BRIAN ENGLISH STUDIO</span>
        <div className="p2-logo" aria-label="Brian English">
          <span>brian</span>
          <strong>english</strong>
        </div>
        <p>{vi ? 'Không gian dạy học số của Brian English: mở nhanh ứng dụng, trò chơi, thư viện và công cụ quản lý trong một hệ thống thống nhất.' : 'A unified digital teaching workspace for apps, games, resources and management.'}</p>
        <div className="p2-profile">
          <b>{name}</b>
          <span>{date} · {time}</span>
          <span>☀ 27°C · Hà Nội</span>
        </div>
        <div className="p2-progress">
          <div><small>{vi ? 'Tiến độ hôm nay' : 'Today progress'}</small><strong>7/10</strong></div>
          <div className="p2-progress-track"><i /></div>
        </div>
        <button type="button" className="p2-start" onClick={(event) => launchRoute({ target: currentUser ? '#/apps' : '#/login', label: 'GO', color: '#b2c248', sourceEl: event.currentTarget })}>
          <span>✦</span><div><strong>{vi ? 'Bắt đầu ngay hôm nay' : 'Start today'}</strong><small>{vi ? 'Khám phá bộ công cụ của bạn' : 'Explore your toolkit'}</small></div><b>→</b>
        </button>
      </section>

      <section className="p2-app-board">
        <header><span>{vi ? 'BỘ ỨNG DỤNG CỦA BẠN' : 'YOUR APP COLLECTION'}</span><button type="button" onClick={(event) => launchRoute({ target: currentUser ? '#/apps' : '#/login', label: 'APP', color: '#55c9c3', sourceEl: event.currentTarget })}>{vi ? 'Tất cả ứng dụng' : 'All apps'} →</button></header>
        <div className="p2-grid">
          {cards.map((card, index) => (
            <button
              key={card.slug}
              type="button"
              className={`p2-card p2-${card.tone} p2-${card.size} p2-card-${index + 1}`}
              onClick={(event) => openCard(card, currentUser, event.currentTarget)}
            >
              <span className="p2-card-top"><i /><i /><i /><small>{index < 2 ? 'Workflow V2' : vi ? 'Ứng dụng thông minh' : 'Smart app'}</small></span>
              <span className="p2-card-body">
                <span className="p2-icon">{card.title.slice(0, 1)}</span>
                <span><strong>{card.title}</strong><small>{card.text}</small></span>
              </span>
              <span className="p2-card-footer"><small>{vi ? 'Mở ứng dụng' : 'Open app'}</small><b>→</b></span>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
}
