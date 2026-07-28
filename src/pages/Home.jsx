import React, { useMemo } from 'react';
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
    headline: 'Không gian dạy học thông minh',
    highlight: '& sáng tạo',
    subtitle: 'Tích hợp các công cụ hỗ trợ giảng dạy, học tập và quản lý hiệu quả — tối ưu cho giáo viên và học sinh.',
    start: 'Bắt đầu ngay',
    guide: 'Xem hướng dẫn',
    toolsKicker: 'CÔNG CỤ NỔI BẬT',
    toolsTitle: 'Mọi công cụ quan trọng trong một nơi',
    toolsSub: 'Truy cập nhanh, giao diện nhất quán và sẵn sàng cho công việc hằng ngày.',
    customize: 'Xem tất cả',
  },
  en: {
    badge: 'ENGLISH HUB',
    headline: 'A smart teaching workspace',
    highlight: '& creative learning',
    subtitle: 'Teaching, learning and management tools brought together in one efficient workspace for teachers and students.',
    start: 'Get started',
    guide: 'View guide',
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

function HeroIllustration() {
  return (
    <svg className="eh5-hero-illustration" viewBox="0 0 760 430" role="img" aria-label="English Hub smart learning workspace">
      <defs>
        <linearGradient id="gHeroSky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#eef7ff" />
          <stop offset=".58" stopColor="#e7f2ff" />
          <stop offset="1" stopColor="#f7fbff" />
        </linearGradient>
        <linearGradient id="gDevice" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2b4f82" />
          <stop offset="1" stopColor="#17345d" />
        </linearGradient>
        <linearGradient id="gBlueBook" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4285f4" />
          <stop offset="1" stopColor="#1a73e8" />
        </linearGradient>
        <filter id="gSoftShadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="14" stdDeviation="12" floodColor="#31557b" floodOpacity=".17" />
        </filter>
      </defs>

      <rect x="8" y="8" width="744" height="400" rx="44" fill="url(#gHeroSky)" />
      <path d="M18 324C130 266 232 278 322 314c101 41 198 23 284-16 55-25 102-28 136-12v102H18Z" fill="#dcefe5" />
      <path d="M18 350c105-29 193-13 282 14 111 34 226-9 316-27 58-12 98-6 126 10v61H18Z" fill="#cfe8dc" />

      <g opacity=".72" fill="none" stroke="#c0d9ea" strokeWidth="5">
        <path d="M69 92c22-24 47-24 70 0M503 74c21-21 44-20 64 0M614 112c20-18 41-18 61 0" />
      </g>

      <g opacity=".7" transform="translate(545 52)">
        <path d="M0 82 72 10l72 72" fill="#dbeafb" />
        <path d="M22 82V42h100v40" fill="#d2e7fb" />
        <path d="M48 42V24h48v18M66 82V55h12v27" fill="none" stroke="#8fbbe9" strokeWidth="6" strokeLinecap="round" />
      </g>

      <g transform="translate(174 83)" filter="url(#gSoftShadow)">
        <rect x="0" y="14" width="7" height="150" rx="4" fill="#5a4b39" />
        <path d="M7 23c39-10 68 0 90 22v77c-27-17-57-22-90-12Z" fill="#ea4335" />
        <path d="m54 54 7 15 16 2-12 11 3 16-14-8-14 8 3-16-12-11 16-2Z" fill="#fbbc04" />
        <rect x="-10" y="164" width="28" height="9" rx="5" fill="#6f5840" />
      </g>

      <g transform="translate(330 148)" filter="url(#gSoftShadow)">
        <rect x="0" y="0" width="205" height="138" rx="20" fill="url(#gDevice)" />
        <rect x="13" y="13" width="179" height="106" rx="13" fill="#f8fbff" />
        <rect x="26" y="27" width="72" height="12" rx="6" fill="#4285f4" opacity=".9" />
        <rect x="26" y="51" width="46" height="42" rx="10" fill="#e8f0fe" />
        <path d="M39 79h20M49 62v27" stroke="#1a73e8" strokeWidth="5" strokeLinecap="round" />
        <rect x="84" y="52" width="86" height="8" rx="4" fill="#d5def2" />
        <rect x="84" y="69" width="70" height="8" rx="4" fill="#d5def2" />
        <rect x="84" y="86" width="90" height="8" rx="4" fill="#d5def2" />
        <circle cx="180" cy="26" r="4" fill="#34a853" />
        <path d="M68 139h70l18 16H50Z" fill="#263f68" />
      </g>

      <g transform="translate(476 244)" filter="url(#gSoftShadow)">
        <rect x="0" y="70" width="184" height="35" rx="11" fill="#ea6f4a" />
        <rect x="14" y="38" width="165" height="35" rx="11" fill="#34a853" />
        <rect x="4" y="6" width="183" height="35" rx="11" fill="url(#gBlueBook)" />
        <path d="M25 23h75M36 55h88M25 87h95" stroke="#fff" strokeOpacity=".45" strokeWidth="5" strokeLinecap="round" />
        <path d="M102 3h58l20 18h-58Z" fill="#202124" />
        <path d="M130 21v18" stroke="#f9ab00" strokeWidth="4" strokeLinecap="round" />
      </g>

      <g transform="translate(284 300)" filter="url(#gSoftShadow)">
        <path d="M0 21c28-21 59-20 91 0v45H0Z" fill="#fff" />
        <path d="M91 21c29-21 60-20 91 0v45H91Z" fill="#f5f7fb" />
        <path d="M91 21v45" stroke="#c9d3e2" strokeWidth="3" />
        <path d="M18 31h53M18 43h44M110 31h53M110 43h44" stroke="#c2cad7" strokeWidth="3" strokeLinecap="round" />
      </g>

      <g transform="translate(652 180)" filter="url(#gSoftShadow)">
        <path d="M4 77h74l-8 82H12Z" fill="#f3b37a" />
        <path d="M24 78c-10-41 3-68 38-79 5 36-8 63-38 79ZM50 78c5-40 24-61 57-61-4 36-23 57-57 61ZM40 80C22 47 24 18 48 0c21 27 18 54-8 80Z" fill="#62ad72" />
      </g>

      <g transform="translate(248 252)" filter="url(#gSoftShadow)">
        <rect x="0" y="34" width="45" height="73" rx="12" fill="#fff" />
        <path d="M10 47h25" stroke="#d2d9e4" strokeWidth="4" strokeLinecap="round" />
        <path d="M14 35 18 2M25 35 32 0M34 35 42 7" stroke="#f9ab00" strokeWidth="5" strokeLinecap="round" />
        <path d="M18 2h0M32 0h0M42 7h0" stroke="#1a73e8" strokeWidth="7" strokeLinecap="round" />
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
    <div className="eh5-home" aria-label="English Hub Google Material homepage">
      <section className="eh5-hero">
        <div className="eh5-hero-copy">
          <span className="eh5-badge">{t.badge}</span>
          <h1>{t.headline}</h1>
          <h2>{t.highlight}</h2>
          <p>{t.subtitle}</p>
          <div className="eh5-actions">
            <button type="button" className="eh5-primary" onClick={(event) => launch(currentUser ? `#/${firstRoute}` : '#/login', 'GO', '#1a73e8', currentUser, event.currentTarget)}>
              <span>✦</span>{t.start}<b>→</b>
            </button>
            <button type="button" className="eh5-secondary" onClick={(event) => launch('#/apps', 'AP', '#1a73e8', currentUser, event.currentTarget)}>
              <span>▶</span>{t.guide}
            </button>
          </div>
        </div>

        <div className="eh5-hero-visual">
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
          <button type="button" onClick={(event) => launch('#/apps', 'AP', '#1a73e8', currentUser, event.currentTarget)}>{t.customize} <b>→</b></button>
        </header>
        <div className="eh5-tool-grid">
          {toolCards.map((item) => <ToolCard key={item.id} item={item} currentUser={currentUser} language={language} />)}
        </div>
      </section>
    </div>
  );
}
