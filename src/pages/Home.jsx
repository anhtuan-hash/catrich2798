import React, { useMemo } from 'react';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../data/apps.js';
import { getFirstAllowedRoute, hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import { isAppHiddenForUser } from '../utils/appVisibility.js';
import { visibilityIdForRoute } from '../data/appVisibilityRegistry.js';
import './HomeProposal5.css';
import './HomeExactScreenshot.css';

const ALL_APPS = [...APPS, ...GAME_APPS, ...SPECIAL_TOOLS];

const copy = {
  vi: {
    badge: 'ENGLISH HUB',
    firstLine: 'Không gian',
    secondLine: 'dạy học thông minh',
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
    firstLine: 'A smart',
    secondLine: 'teaching workspace',
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
    <svg className="eh7-hero-illustration" viewBox="0 0 920 620" role="img" aria-label="Không gian dạy học thông minh với biểu tượng Việt Nam">
      <defs>
        <linearGradient id="eh7Sky" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f8fbff" />
          <stop offset=".56" stopColor="#edf5ff" />
          <stop offset="1" stopColor="#e8efff" />
        </linearGradient>
        <linearGradient id="eh7HillA" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#78bda8" />
          <stop offset="1" stopColor="#4e957f" />
        </linearGradient>
        <linearGradient id="eh7HillB" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a6d584" />
          <stop offset="1" stopColor="#63a86f" />
        </linearGradient>
        <linearGradient id="eh7BlueBook" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#4386f6" />
          <stop offset="1" stopColor="#1767d8" />
        </linearGradient>
        <linearGradient id="eh7PurpleBook" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#8b5de3" />
          <stop offset="1" stopColor="#6337c6" />
        </linearGradient>
        <linearGradient id="eh7Screen" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2e67ba" />
          <stop offset="1" stopColor="#173f79" />
        </linearGradient>
        <radialGradient id="eh7Halo" cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".92" />
          <stop offset="1" stopColor="#dce9fb" stopOpacity="0" />
        </radialGradient>
        <filter id="eh7Shadow" x="-40%" y="-40%" width="180%" height="200%">
          <feDropShadow dx="0" dy="16" stdDeviation="13" floodColor="#254b77" floodOpacity=".18" />
        </filter>
        <filter id="eh7SmallShadow" x="-40%" y="-40%" width="180%" height="200%">
          <feDropShadow dx="0" dy="9" stdDeviation="8" floodColor="#254b77" floodOpacity=".16" />
        </filter>
      </defs>

      <rect width="920" height="620" fill="url(#eh7Sky)" />
      <circle cx="446" cy="142" r="238" fill="url(#eh7Halo)" />
      <circle cx="456" cy="132" r="188" fill="none" stroke="#c9d9ef" strokeWidth="2" opacity=".24" />
      <circle cx="456" cy="132" r="157" fill="none" stroke="#c9d9ef" strokeWidth="2" opacity=".18" />

      <path d="M0 352C112 258 201 235 303 307c75 53 123 66 211 3 98-70 188-72 406 24V620H0Z" fill="#87b9b0" />
      <path d="M0 393C105 334 184 318 276 371c86 49 151 34 235-39 101-87 222-67 409 33V620H0Z" fill="url(#eh7HillA)" />
      <path d="M278 398c132-99 257-81 370 13 82-84 165-103 272-74v283H278Z" fill="url(#eh7HillB)" />
      <path d="M0 466c116-49 202-33 295 23 96 58 181 43 269 0 113-56 226-40 356 25v106H0Z" fill="#67aa74" />
      <path d="M96 620c51-103 117-184 222-225 86-34 153-29 240-1-144 70-219 139-279 226Z" fill="#d6e5ad" opacity=".84" />
      <path d="M119 620c42-92 104-163 207-205 62-25 113-31 181-22-119 75-184 144-225 227Z" fill="#edf3c8" opacity=".9" />

      <g opacity=".5" fill="#6d9fc7">
        <path d="M78 316h54v100H78z" opacity=".16" />
        <path d="M105 236 70 300h70Z" />
        <path d="M105 260 78 309h54Z" />
        <path d="M105 286 84 326h42Z" />
        <rect x="99" y="300" width="12" height="104" rx="5" />
      </g>

      <g transform="translate(730 150)" opacity=".58" fill="#6b9db2">
        <path d="M0 88h145v82H0z" />
        <path d="M-15 88 20 57h105l35 31Z" />
        <path d="M15 54 44 29h56l29 25Z" />
        <path d="M48 25 72 2l24 23Z" />
        <rect x="67" y="105" width="18" height="65" rx="6" fill="#e7f1f4" />
      </g>

      <g transform="translate(116 82)" filter="url(#eh7SmallShadow)">
        <rect x="0" y="5" width="9" height="260" rx="4.5" fill="#8a5b2f" />
        <circle cx="4.5" cy="0" r="11" fill="#c17a32" />
        <path d="M9 30c56-12 105 1 145 35v94c-43-27-93-29-145-10Z" fill="#e73b32" />
        <path d="m84 66 12 27 29 3-22 19 7 29-26-15-26 15 7-29-22-19 29-3Z" fill="#ffdb3d" />
        <ellipse cx="4.5" cy="269" rx="23" ry="9" fill="#456b48" />
      </g>

      <g transform="translate(320 146)" filter="url(#eh7Shadow)">
        <rect width="355" height="243" rx="30" fill="url(#eh7Screen)" />
        <rect x="18" y="17" width="319" height="204" rx="20" fill="#f8fbff" />
        <rect x="18" y="17" width="319" height="34" rx="20" fill="#edf3fb" />
        <circle cx="308" cy="34" r="5" fill="#34a853" />
        <circle cx="290" cy="34" r="5" fill="#a9c6ed" />
        <rect x="34" y="66" width="54" height="137" rx="15" fill="#eef4ff" />
        <path d="M50 94h22v22H50z" fill="#2d7cf0" opacity=".2" />
        <path d="m61 91 13 10v15H48v-15Z" fill="#2d7cf0" />
        <rect x="111" y="72" width="194" height="92" rx="16" fill="#fff" stroke="#dce6f4" />
        <rect x="127" y="91" width="58" height="58" rx="12" fill="#347ff1" />
        <path d="M143 120h26M156 107v26" stroke="#fff" strokeWidth="7" strokeLinecap="round" />
        <rect x="203" y="94" width="78" height="10" rx="5" fill="#d8e1ee" />
        <rect x="203" y="116" width="66" height="10" rx="5" fill="#d8e1ee" />
        <circle cx="206" cy="142" r="6" fill="#4a8af0" />
        <rect x="121" y="176" width="72" height="30" rx="9" fill="#fff" stroke="#dbe5f1" />
        <rect x="205" y="176" width="72" height="30" rx="9" fill="#fff" stroke="#dbe5f1" />
        <path d="M151 221h54l19 42H132Z" fill="#24508c" />
        <path d="M104 263h147l28 18H76Z" fill="#1c4a86" />
      </g>

      <g transform="translate(495 345)" filter="url(#eh7Shadow)">
        <rect x="0" y="128" width="282" height="63" rx="19" fill="url(#eh7PurpleBook)" />
        <rect x="15" y="70" width="269" height="66" rx="19" fill="#3aaa55" />
        <rect x="0" y="12" width="289" height="68" rx="20" fill="url(#eh7BlueBook)" />
        <path d="M26 49h156M42 105h152M24 164h164" stroke="#fff" strokeOpacity=".38" strokeWidth="7" strokeLinecap="round" />
        <path d="M117 6h109l74 42-117 22-93-37Z" fill="#252d3a" />
        <path d="M223 48c28 12 34 35 28 66" fill="none" stroke="#f6ba28" strokeWidth="6" strokeLinecap="round" />
        <circle cx="251" cy="115" r="9" fill="#f6ba28" />
        <path d="M218 23h16l-4 50h-10Z" fill="#f7d239" opacity=".9" />
      </g>

      <g transform="translate(135 410)" filter="url(#eh7SmallShadow)">
        <path d="M0 32c75-34 139-29 196 12v116H0Z" fill="#fff" />
        <path d="M196 44c66-39 131-39 194-3v119H196Z" fill="#f7f8fb" />
        <path d="M196 44v116" stroke="#c9d5e5" strokeWidth="5" />
        <path d="M31 61h125M31 81h111M31 101h121M226 61h124M226 81h104M226 101h118" stroke="#d7dee9" strokeWidth="4" strokeLinecap="round" />
        <path d="m207 46 58 7-18 69-30-20-35 18Z" fill="#3c80ef" opacity=".85" />
      </g>

      <g transform="translate(72 392)" filter="url(#eh7SmallShadow)">
        <path d="M0 48h78l-8 118H10Z" fill="#fff" />
        <ellipse cx="39" cy="48" rx="39" ry="12" fill="#f6f8fb" />
        <path d="M23 48 28 3M39 48 48 0M54 48 66 9" stroke="#f1a632" strokeWidth="8" strokeLinecap="round" />
        <path d="M28 3h0M48 0h0M66 9h0" stroke="#2d78eb" strokeWidth="12" strokeLinecap="round" />
      </g>

      <g transform="translate(804 330)" filter="url(#eh7SmallShadow)">
        <path d="M0 130h95l-9 116H12Z" fill="#f6f7f5" />
        <path d="M17 130c-9-79 16-117 62-129 4 61-18 105-62 129ZM52 132c6-70 37-102 91-96-12 55-42 88-91 96ZM40 133C17 75 22 30 59 0c27 44 20 88-19 133Z" fill="#65aa48" />
      </g>

      <g opacity=".8" fill="#f2d89a">
        <path d="m746 318 49-42 48 42Z" />
        <path d="M793 318v82" stroke="#b98e4e" strokeWidth="5" />
        <path d="m829 270 38-31 37 31Z" />
        <path d="M866 270v60" stroke="#b98e4e" strokeWidth="4" />
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
    <div className="eh5-home eh7-home" aria-label="English Hub homepage">
      <section className="eh5-hero eh7-hero">
        <div className="eh5-hero-copy eh7-hero-copy">
          <span className="eh5-badge eh7-badge">{t.badge}</span>
          <h1 className="eh7-title">
            <span>{t.firstLine}</span>
            <span className="eh7-title-blue">{t.secondLine}</span>
          </h1>
          <h2 className="eh7-highlight">{t.highlight}</h2>
          <p>{t.subtitle}</p>
          <div className="eh5-actions eh7-actions">
            <button type="button" className="eh5-primary eh7-primary" onClick={(event) => launch(currentUser ? `#/${firstRoute}` : '#/login', 'GO', '#6d35d8', currentUser, event.currentTarget)}>
              <span>✦</span>{t.start}<b>→</b>
            </button>
            <button type="button" className="eh5-secondary eh7-secondary" onClick={(event) => launch('#/apps', 'AP', '#1a73e8', currentUser, event.currentTarget)}>
              <span>▶</span>{t.guide}
            </button>
          </div>
        </div>

        <div className="eh5-hero-visual eh7-hero-visual">
          <HeroIllustration />
        </div>
      </section>

      <section className="eh5-section eh5-tools-section eh7-tools" aria-labelledby="eh5-tools-title">
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
