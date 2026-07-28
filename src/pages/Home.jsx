import React, { useEffect, useMemo, useState } from 'react';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../data/apps.js';
import { getFirstAllowedRoute, hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import { isAppHiddenForUser } from '../utils/appVisibility.js';
import { visibilityIdForRoute } from '../data/appVisibilityRegistry.js';
import './HomeProposal5.css';

const ALL_APPS = [...APPS, ...GAME_APPS, ...SPECIAL_TOOLS];

const copy = {
  vi: {
    badge: 'ENGLISH HUB',
    brand: 'English Hub',
    headline: 'Không gian dạy học thông minh & sáng tạo',
    subtitle: 'Tích hợp các công cụ hỗ trợ giảng dạy, học tập và quản lý hiệu quả — tối ưu cho giáo viên và học sinh.',
    start: 'Bắt đầu ngay',
    guide: 'Xem hướng dẫn',
    benefits: ['Hiệu quả', 'Sáng tạo', 'Kết nối', 'Tiện lợi'],
    toolsKicker: 'CÔNG CỤ NỔI BẬT',
    toolsTitle: 'Mở nhanh công cụ bạn cần',
    toolsSub: 'Một hệ thẻ thống nhất, rõ chức năng và luôn sẵn sàng cho công việc hằng ngày.',
    customize: 'Xem tất cả',
  },
  en: {
    badge: 'ENGLISH HUB',
    brand: 'English Hub',
    headline: 'A smart and creative teaching workspace',
    subtitle: 'Teaching, learning and management tools brought together in one efficient workspace for teachers and students.',
    start: 'Get started',
    guide: 'View guide',
    benefits: ['Effective', 'Creative', 'Connected', 'Convenient'],
    toolsKicker: 'FEATURED TOOLS',
    toolsTitle: 'Open the tool you need',
    toolsSub: 'One consistent card system with clear purposes for everyday teaching work.',
    customize: 'View all',
  },
};

const iconPaths = {
  lesson: (
    <>
      <path d="M18 18h28c6 0 10 4 10 10v54c0-6-4-10-10-10H18V18Z" />
      <path d="M82 18H54v64c0-6 4-10 10-10h18V18Z" />
      <path d="M29 36h15M29 48h12M64 36h11M64 48h13" />
    </>
  ),
  textcare: (
    <>
      <rect x="18" y="18" width="64" height="64" rx="10" />
      <path d="M30 35h40M30 49h31M30 63h23" />
      <path d="m58 63 7 7 15-20" />
    </>
  ),
  library: (
    <>
      <path d="M16 28h29l8 9h31v39H16V28Z" />
      <path d="M16 41h68M29 54h42M29 66h28" />
    </>
  ),
  practice: (
    <>
      <path d="M25 15h45l12 12v58H25V15Z" />
      <path d="M70 15v14h12M37 41h32M37 53h25M37 65h16" />
      <circle cx="72" cy="69" r="13" />
      <path d="M72 62v8l6 4" />
    </>
  ),
  game: (
    <>
      <path d="M23 42h54c9 0 15 7 17 17l3 14c2 10-6 17-15 11L66 75H34L18 84c-9 6-17-1-15-11l3-14c2-10 8-17 17-17Z" />
      <path d="M30 59h18M39 50v18M70 56h1M81 65h1" />
    </>
  ),
  homeroom: (
    <>
      <circle cx="36" cy="37" r="13" />
      <circle cx="66" cy="40" r="11" />
      <path d="M15 82c3-18 12-28 22-28s19 10 22 28M51 82c2-15 9-23 17-23s15 8 17 23" />
      <path d="M42 20h34v21" />
      <path d="m64 31 12 10 10-12" />
    </>
  ),
  arrow: <path d="M24 50h50M58 34l16 16-16 16" />,
};

function HubIcon({ type }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        {iconPaths[type] || iconPaths.lesson}
      </g>
    </svg>
  );
}

function findApp(slug) {
  return ALL_APPS.find((item) => item.slug === slug);
}

function appTarget(slug, fallback = '#/apps') {
  const app = findApp(slug);
  if (!app) return fallback;
  return app.route ? `#/${app.route}` : `#/tool/${app.slug}`;
}

function isPublicTarget(target) {
  return ['#/home', '#/resources', '#/contact', '#/login', '#/register', '#/setup'].includes(target);
}

function launch(target, label, color, currentUser, sourceEl) {
  const finalTarget = !currentUser && !isPublicTarget(target) ? '#/login' : target;
  launchRoute({ target: finalTarget, label, color, sourceEl });
}

function HeroIllustration() {
  return (
    <svg className="eh5-hero-illustration" viewBox="0 0 720 420" role="img" aria-label="English Hub classroom workspace illustration">
      <defs>
        <linearGradient id="eh5Sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4fbff" />
          <stop offset="1" stopColor="#dff4f5" />
        </linearGradient>
        <linearGradient id="eh5Desk" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9c99f" />
          <stop offset="1" stopColor="#c99461" />
        </linearGradient>
        <linearGradient id="eh5Book" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#315f9b" />
          <stop offset="1" stopColor="#244974" />
        </linearGradient>
        <filter id="eh5Shadow" x="-20%" y="-20%" width="140%" height="160%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#315d68" floodOpacity=".16" />
        </filter>
      </defs>

      <rect x="10" y="14" width="700" height="330" rx="30" fill="url(#eh5Sky)" />
      <path d="M22 307C120 267 199 275 279 302c104 36 201-10 271-29 66-18 116-3 148 17v54H22Z" fill="#d8eee3" />
      <path d="M22 326c91-34 179-20 258 2 105 29 213-15 299-22 51-4 91 7 119 23v15H22Z" fill="#c8e5d8" />

      <g opacity=".72" stroke="#b8d8d9" strokeWidth="5">
        <path d="M167 16v265" />
        <path d="M356 16v265" />
        <path d="M545 16v265" />
      </g>
      <g opacity=".25" stroke="#91c2bf" strokeWidth="3">
        <path d="M25 118h670" />
        <path d="M25 213h670" />
      </g>

      <g opacity=".76" fill="#76b487">
        <rect x="632" y="30" width="9" height="223" rx="5" />
        <rect x="670" y="18" width="8" height="238" rx="4" />
        <path d="M637 76c-37-14-55 2-66 23 27 4 50-3 66-23ZM637 127c-31-8-50 7-59 27 27 2 47-8 59-27ZM673 63c26-17 49-10 61 6-21 12-43 11-61-6ZM673 145c30-14 52-3 61 15-24 8-45 4-61-15Z" />
      </g>

      <ellipse cx="358" cy="359" rx="310" ry="24" fill="#5c7f82" opacity=".13" />
      <rect x="34" y="306" width="650" height="50" rx="18" fill="url(#eh5Desk)" filter="url(#eh5Shadow)" />
      <rect x="54" y="350" width="18" height="60" rx="7" fill="#b37848" />
      <rect x="648" y="350" width="18" height="60" rx="7" fill="#b37848" />

      <g transform="translate(80 171)" filter="url(#eh5Shadow)">
        <rect x="0" y="9" width="7" height="137" rx="3" fill="#a06e42" />
        <path d="M7 18c38-8 63 1 83 20v75c-25-14-52-20-83-13Z" fill="#e64b43" />
        <path d="m48 48 6 13 14 2-10 10 2 14-12-7-13 7 3-14-10-10 14-2Z" fill="#ffd44f" />
        <rect x="-8" y="145" width="25" height="8" rx="4" fill="#815734" />
      </g>

      <g transform="translate(253 203)" filter="url(#eh5Shadow)">
        <rect x="0" y="74" width="164" height="28" rx="7" fill="#cc704d" />
        <rect x="12" y="49" width="152" height="28" rx="7" fill="#4f8f82" />
        <rect x="4" y="24" width="165" height="28" rx="7" fill="url(#eh5Book)" />
        <path d="M20 35h76M22 59h93M18 84h84" stroke="#fff" strokeOpacity=".45" strokeWidth="4" strokeLinecap="round" />
        <rect x="104" y="0" width="54" height="25" rx="8" fill="#fbf7ec" transform="rotate(-8 104 0)" />
      </g>

      <g transform="translate(463 203)" filter="url(#eh5Shadow)">
        <path d="M0 62c22-20 44-19 67 0v30H0Z" fill="#fffdf6" />
        <path d="M67 62c22-20 44-19 67 0v30H67Z" fill="#f8f1df" />
        <path d="M67 61v31" stroke="#c7aa7d" strokeWidth="3" />
        <path d="M14 69h39M80 69h39M14 79h32M80 79h32" stroke="#c9b99f" strokeWidth="3" strokeLinecap="round" />
      </g>

      <g transform="translate(576 213)" filter="url(#eh5Shadow)">
        <path d="M4 48h75l-8 55H13Z" fill="#e6a46d" />
        <path d="M22 51c-4-27 5-43 24-50 6 23-1 41-24 50ZM50 51c0-27 12-42 34-45 1 23-10 38-34 45ZM39 53C28 30 31 12 47 0c12 20 9 37-8 53Z" fill="#5ea978" />
      </g>

      <g opacity=".9">
        <circle cx="49" cy="72" r="5" fill="#4da8b4" />
        <circle cx="74" cy="54" r="3" fill="#e7b94f" />
        <path d="M107 68h18M116 59v18" stroke="#69b29b" strokeWidth="4" strokeLinecap="round" />
      </g>
    </svg>
  );
}

function ToolCard({ item, currentUser, language }) {
  const vi = language === 'vi';
  const label = currentUser || !item.requiresUser ? (vi ? 'Mở ứng dụng' : 'Open app') : (vi ? 'Đăng nhập để mở' : 'Sign in to open');
  return (
    <button
      type="button"
      className="eh5-tool-card"
      style={{ '--tool-accent': item.accent, '--tool-soft': item.soft }}
      onClick={(event) => launch(item.target, item.label, item.accent, currentUser, event.currentTarget)}
      aria-label={`${label}: ${vi ? item.title : item.titleEn}`}
    >
      <span className="eh5-tool-icon"><HubIcon type={item.icon} /></span>
      <span className="eh5-tool-copy">
        <strong>{vi ? item.title : item.titleEn}</strong>
        <small>{vi ? item.description : item.descriptionEn}</small>
      </span>
      <span className="eh5-tool-arrow"><HubIcon type="arrow" /></span>
    </button>
  );
}

export default function Home({ currentUser, language = 'vi', appVisibility }) {
  const [now, setNow] = useState(() => new Date());
  const t = copy[language] || copy.vi;
  const vi = language === 'vi';
  const visibilitySnapshot = appVisibility?.snapshot;
  const firstRoute = currentUser ? getFirstAllowedRoute(currentUser) : 'login';

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 60000);
    return () => window.clearInterval(timer);
  }, []);

  const toolCards = useMemo(() => {
    const items = [
      {
        id: 'lesson', icon: 'lesson', title: 'Lesson Architect', titleEn: 'Lesson Architect',
        description: 'Soạn bài và thiết kế học liệu.', descriptionEn: 'Plan lessons and design materials.',
        target: appTarget('lesson-plan-ai'), visibilityId: 'tool:lesson-plan-ai',
        accent: '#2f86dc', soft: '#eaf5ff', label: 'LA', requiresUser: true,
      },
      {
        id: 'textcare', icon: 'textcare', title: 'TextCare Fixer', titleEn: 'TextCare Fixer',
        description: 'Chuẩn hoá văn bản, sửa lỗi chính tả.', descriptionEn: 'Polish documents and fix writing errors.',
        target: appTarget('textcare'), visibilityId: 'tool:textcare',
        accent: '#28a88f', soft: '#e9f8f4', label: 'TC', requiresUser: true,
      },
      {
        id: 'library', icon: 'library', title: 'Thư viện', titleEn: 'Library',
        description: 'Quản lý và chia sẻ tài liệu dạy học.', descriptionEn: 'Manage and share teaching resources.',
        target: '#/library', visibilityId: visibilityIdForRoute('library'), permissionRoute: 'library',
        accent: '#ed9b2d', soft: '#fff5e7', label: 'TV', requiresUser: true,
      },
      {
        id: 'weekly', icon: 'practice', title: 'Bài tập theo tuần', titleEn: 'Weekly Practice',
        description: 'Học theo ngày với lộ trình khối 10–12.', descriptionEn: 'Daily practice paths for Grades 10–12.',
        target: appTarget('thpt-practice-hub', '#/practice'), visibilityId: 'tool:thpt-practice-hub',
        accent: '#22a6c8', soft: '#eaf9fc', label: 'BT', requiresUser: true,
      },
      {
        id: 'games', icon: 'game', title: 'Trò chơi', titleEn: 'Games',
        description: 'Hoạt náo và trò chơi lớp học.', descriptionEn: 'Classroom games and engaging activities.',
        target: appTarget('game-hub', '#/games'), visibilityId: 'tool:game-hub',
        accent: '#e6538a', soft: '#fff0f6', label: 'TG', requiresUser: true,
      },
      {
        id: 'homeroom', icon: 'homeroom', title: 'Chủ nhiệm', titleEn: 'Homeroom',
        description: 'Quản lý lớp học và học sinh.', descriptionEn: 'Manage classes and student records.',
        target: '#/homeroom', visibilityId: visibilityIdForRoute('homeroom'), permissionRoute: 'homeroom',
        accent: '#3c86c9', soft: '#edf6ff', label: 'CN', requiresUser: true,
      },
    ];

    return items.filter((item) => {
      if (item.permissionRoute && currentUser && !hasRouteAccess(currentUser, item.permissionRoute)) return false;
      if (!item.visibilityId) return true;
      return !isAppHiddenForUser(visibilitySnapshot, currentUser, item.visibilityId);
    });
  }, [currentUser, visibilitySnapshot]);

  const dateLabel = new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-US', {
    weekday: 'long', day: '2-digit', month: '2-digit', year: 'numeric',
  }).format(now);

  return (
    <div className="eh5-home" aria-label="English Hub homepage proposal 5">
      <section className="eh5-hero">
        <div className="eh5-hero-copy">
          <span className="eh5-badge">{t.badge}</span>
          <h1>{t.brand}</h1>
          <h2>{t.headline}</h2>
          <p>{t.subtitle}</p>
          <div className="eh5-actions">
            <button type="button" className="eh5-primary" onClick={(event) => launch(currentUser ? `#/${firstRoute}` : '#/login', 'GO', '#11a0a8', currentUser, event.currentTarget)}>
              <span>✦</span>{t.start}<b>→</b>
            </button>
            <button type="button" className="eh5-secondary" onClick={(event) => launch('#/apps', 'AP', '#1f6170', currentUser, event.currentTarget)}>
              <span>▶</span>{t.guide}
            </button>
          </div>
          <small className="eh5-date">{dateLabel}</small>
        </div>

        <div className="eh5-hero-visual">
          <div className="eh5-benefits" aria-label={vi ? 'Ưu điểm của English Hub' : 'English Hub benefits'}>
            {t.benefits.map((item, index) => (
              <span key={item} className={`benefit-${index + 1}`}>
                <i>{['✓', '✦', '◎', '▣'][index]}</i><b>{item}</b>
              </span>
            ))}
          </div>
          <HeroIllustration />
        </div>
      </section>

      <section className="eh5-section eh5-tools-section" aria-labelledby="eh5-tools-title">
        <header className="eh5-section-head">
          <div>
            <span>{t.toolsKicker}</span>
            <h2 id="eh5-tools-title">{t.toolsTitle}</h2>
            <p>{t.toolsSub}</p>
          </div>
          <button type="button" onClick={(event) => launch('#/apps', 'AP', '#198fa1', currentUser, event.currentTarget)}>{t.customize} <b>→</b></button>
        </header>
        <div className="eh5-tool-grid">
          {toolCards.map((item) => <ToolCard key={item.id} item={item} currentUser={currentUser} language={language} />)}
        </div>
      </section>
    </div>
  );
}
