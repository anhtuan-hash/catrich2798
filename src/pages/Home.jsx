import React, { useMemo } from 'react';
import HomeHero from '../components/home/HomeHero.jsx';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../data/apps.js';
import { getFirstAllowedRoute, hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import { isAppHiddenForUser } from '../utils/appVisibility.js';
import { visibilityIdForRoute } from '../data/appVisibilityRegistry.js';
import './HomeProposal5.css';
import './HomeFinal.css';

const ALL_APPS = [...APPS, ...GAME_APPS, ...SPECIAL_TOOLS];

const copy = {
  vi: {
    toolsKicker: 'CÔNG CỤ NỔI BẬT',
    toolsTitle: 'Mọi công cụ quan trọng trong một nơi',
    toolsSub: 'Truy cập nhanh, giao diện nhất quán và sẵn sàng cho công việc hằng ngày.',
    customize: 'Xem tất cả',
  },
  en: {
    toolsKicker: 'FEATURED TOOLS',
    toolsTitle: 'Everything important in one place',
    toolsSub: 'Fast access, consistent design and ready for everyday teaching work.',
    customize: 'View all',
  },
};

const iconPaths = {
  lesson: (
    <>
      <path d="M20 18h25c7 0 11 4 11 11v53c0-7-4-11-11-11H20V18Z" />
      <path d="M80 18H55v64c0-7 4-11 11-11h14V18Z" />
      <path d="M30 36h15M30 49h12M65 36h9M65 49h12" />
    </>
  ),
  textcare: (
    <>
      <rect x="18" y="18" width="64" height="64" rx="14" />
      <path d="M31 35h38M31 49h29M31 63h20" />
      <path d="m57 64 8 8 16-22" />
    </>
  ),
  library: (
    <>
      <path d="M17 31h29l8 8h29v37H17V31Z" />
      <path d="M17 43h66M30 56h39M30 67h26" />
    </>
  ),
  practice: (
    <>
      <rect x="23" y="18" width="54" height="64" rx="12" />
      <path d="M35 35h30M35 48h24M35 61h16" />
      <circle cx="69" cy="69" r="14" />
      <path d="M69 61v9l6 4" />
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
  const t = copy[language] || copy.vi;
  const visibilitySnapshot = appVisibility?.snapshot;
  const firstRoute = currentUser ? getFirstAllowedRoute(currentUser) : 'login';

  const toolCards = useMemo(() => {
    const items = [
      {
        id: 'lesson', icon: 'lesson', title: 'Lesson Architect', titleEn: 'Lesson Architect',
        description: 'Soạn bài và thiết kế bài giảng thông minh.', descriptionEn: 'Plan lessons and design smart materials.',
        target: appTarget('lesson-plan-ai'), visibilityId: 'tool:lesson-plan-ai',
        accent: '#1a73e8', soft: '#eef4ff', label: 'LA', requiresUser: true,
      },
      {
        id: 'textcare', icon: 'textcare', title: 'TextCare Fixer', titleEn: 'TextCare Fixer',
        description: 'Chuẩn hoá, kiểm tra và sửa văn bản.', descriptionEn: 'Polish, check and improve documents.',
        target: appTarget('textcare'), visibilityId: 'tool:textcare',
        accent: '#188038', soft: '#edf7ee', label: 'TC', requiresUser: true,
      },
      {
        id: 'library', icon: 'library', title: 'Thư viện', titleEn: 'Library',
        description: 'Quản lý và chia sẻ tài liệu học tập.', descriptionEn: 'Manage and share learning resources.',
        target: '#/library', visibilityId: visibilityIdForRoute('library'), permissionRoute: 'library',
        accent: '#f29900', soft: '#fff7e2', label: 'TV', requiresUser: true,
      },
      {
        id: 'weekly', icon: 'practice', title: 'Bài tập theo tuần', titleEn: 'Weekly Practice',
        description: 'Luyện tập đều đặn theo từng khối lớp.', descriptionEn: 'Regular practice paths by grade level.',
        target: appTarget('thpt-practice-hub', '#/practice'), visibilityId: 'tool:thpt-practice-hub',
        accent: '#00a6c7', soft: '#eaf8fb', label: 'BT', requiresUser: true,
      },
      {
        id: 'games', icon: 'game', title: 'Trò chơi', titleEn: 'Games',
        description: 'Học mà chơi, chơi mà học trong lớp.', descriptionEn: 'Engaging classroom games and activities.',
        target: appTarget('game-hub', '#/games'), visibilityId: 'tool:game-hub',
        accent: '#e94270', soft: '#fff0f4', label: 'TG', requiresUser: true,
      },
      {
        id: 'homeroom', icon: 'homeroom', title: 'Chủ nhiệm', titleEn: 'Homeroom',
        description: 'Quản lý lớp học và hồ sơ học sinh.', descriptionEn: 'Manage classes and student records.',
        target: '#/homeroom', visibilityId: visibilityIdForRoute('homeroom'), permissionRoute: 'homeroom',
        accent: '#7e57c2', soft: '#f4efff', label: 'CN', requiresUser: true,
      },
    ];

    return items.filter((item) => {
      if (item.permissionRoute && currentUser && !hasRouteAccess(currentUser, item.permissionRoute)) return false;
      if (!item.visibilityId) return true;
      return !isAppHiddenForUser(visibilitySnapshot, currentUser, item.visibilityId);
    });
  }, [currentUser, visibilitySnapshot]);

  return (
    <div id="english-hub-home-20260729-r3" data-home-build="20260729-r3" className="english-hub-home-final" aria-label="English Hub homepage">
      <HomeHero
        language={language}
        onStart={(event) => launch(currentUser ? `#/${firstRoute}` : '#/login', 'GO', '#6d35d8', currentUser, event.currentTarget)}
        onGuide={(event) => launch('#/apps', 'AP', '#1a73e8', currentUser, event.currentTarget)}
      />

      <section className="eh5-section eh5-tools-section" aria-labelledby="eh5-tools-title">
        <header className="eh5-section-head">
          <div>
            <span>{t.toolsKicker}</span>
            <h2 id="eh5-tools-title">{t.toolsTitle}</h2>
            <p>{t.toolsSub}</p>
          </div>
          <button type="button" onClick={(event) => launch('#/apps', 'AP', '#1a73e8', currentUser, event.currentTarget)}>{t.customize} <b>→</b></button>
        </header>
        <div className="eh5-tool-grid">
          {toolCards.map((item) => <ToolCard key={item.id} item={item} currentUser={currentUser} language={language} />)}
        </div>
      </section>
    </div>
  );
}
