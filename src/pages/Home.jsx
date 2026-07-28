import React, { useMemo } from 'react';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../data/apps.js';
import { getFirstAllowedRoute, hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import { isAppHiddenForUser } from '../utils/appVisibility.js';
import { visibilityIdForRoute } from '../data/appVisibilityRegistry.js';
import './HomeProposal5.css';
import './HomeHeroProposal2.css';

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

function MiniIcon({ type }) {
  const icons = {
    game: <><path d="M4 11h16l2 7c.5 2-1.6 3.5-3.2 2.3L16 18h-8l-2.8 2.3C3.6 21.5 1.5 20 2 18l2-7Z"/><path d="M7 13v4M5 15h4M16.5 14.5h.01M19 16.5h.01"/></>,
    chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20V7"/></>,
    users: <><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 21c.8-5 3-8 6-8s5.2 3 6 8M14 21c.5-4 2-6 4.3-6S22 17 22 21"/></>,
    grid: <><rect x="3" y="3" width="7" height="7" rx="2"/><rect x="14" y="3" width="7" height="7" rx="2"/><rect x="3" y="14" width="7" height="7" rx="2"/><rect x="14" y="14" width="7" height="7" rx="2"/></>,
    folder: <><path d="M3 7h7l2 2h9v10H3Z"/></>,
    task: <><rect x="5" y="3" width="14" height="18" rx="3"/><path d="m8 9 2 2 4-4M8 16h8"/></>,
    book: <><path d="M3 5h7c2 0 3 1 3 3v13c0-2-1-3-3-3H3ZM21 5h-7v16c0-2 1-3 3-3h4Z"/></>,
    puzzle: <><path d="M9 3h6v5a3 3 0 1 1 0 6v7H9v-5a3 3 0 1 1 0-6Z"/></>,
    trophy: <><path d="M8 4h8v5c0 4-2 7-4 7s-4-3-4-7Z"/><path d="M8 7H4c0 4 2 6 5 6M16 7h4c0 4-2 6-5 6M12 16v4M8 21h8"/></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="3"/><path d="M7 3v4M17 3v4M3 10h18"/></>,
    notebook: <><rect x="4" y="3" width="16" height="18" rx="3"/><path d="M8 3v18M11 8h6M11 12h6M11 16h4"/></>,
    chat: <><path d="M4 5h16v11H9l-5 4Z"/><path d="M8 9h8M8 12h5"/></>,
    cap: <><path d="m2 9 10-5 10 5-10 5Z"/><path d="M6 12v5c4 3 8 3 12 0v-5M22 9v7"/></>,
    shield: <><path d="M12 2 20 5v6c0 5-3.2 8.5-8 11-4.8-2.5-8-6-8-11V5Z"/><path d="m8 12 2.5 2.5L16 9"/></>,
  };
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <g fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        {icons[type] || icons.grid}
      </g>
    </svg>
  );
}

function LayeredHeroCards({ language = 'vi' }) {
  const vi = language === 'vi';
  return (
    <div className="eh6-cardscape" aria-label={vi ? 'Hệ sinh thái công cụ English Hub' : 'English Hub product ecosystem'}>
      <div className="eh6-orb eh6-orb-a" />
      <div className="eh6-orb eh6-orb-b" />
      <div className="eh6-cultural eh6-pagoda" aria-hidden="true" />
      <div className="eh6-cultural eh6-conical" aria-hidden="true" />

      <article className="eh6-product-card eh6-game-card">
        <header><span className="eh6-card-icon"><MiniIcon type="game" /></span><strong>{vi ? 'Trò chơi' : 'Games'}</strong></header>
        <div className="eh6-game-score">
          <span className="eh6-trophy"><MiniIcon type="trophy" /></span>
          <div><small>{vi ? 'Điểm cao' : 'High score'}</small><b>12,450</b></div>
        </div>
        <div className="eh6-game-tiles"><span>★</span><span>●</span><span>◆</span></div>
      </article>

      <article className="eh6-product-card eh6-dashboard-card">
        <header><span className="eh6-card-icon"><MiniIcon type="chart" /></span><strong>Dashboard</strong><button type="button" aria-label="Mở Dashboard">→</button></header>
        <h3>{vi ? 'Tổng quan lớp học' : 'Class overview'}</h3>
        <div className="eh6-stats">
          <div><MiniIcon type="users" /><b>32</b><small>{vi ? 'Học sinh' : 'Students'}</small></div>
          <div><MiniIcon type="task" /><b>48</b><small>{vi ? 'Bài tập' : 'Tasks'}</small></div>
          <div><MiniIcon type="trophy" /><b>8.6</b><small>{vi ? 'Điểm TB' : 'Average'}</small></div>
        </div>
        <svg className="eh6-chart" viewBox="0 0 260 72" aria-hidden="true">
          <path d="M5 60C30 34 48 55 68 40s41-25 60-8 35 18 51 4 35-24 76-25" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          <path d="M5 62h250" stroke="currentColor" strokeOpacity=".12" />
          {[5,68,128,179,255].map((x, index) => <circle key={x} cx={x} cy={[60,40,32,36,11][index]} r="4" fill="white" stroke="currentColor" strokeWidth="2" />)}
        </svg>
      </article>

      <article className="eh6-product-card eh6-homeroom-card">
        <header><span className="eh6-card-icon"><MiniIcon type="users" /></span><strong>{vi ? 'Chủ nhiệm' : 'Homeroom'}</strong></header>
        <h3>{vi ? 'Thông báo mới' : 'New notices'}</h3>
        <ul>
          <li><span>▣</span>{vi ? 'Lịch kiểm tra giữa kì 1' : 'Midterm schedule'}</li>
          <li><span>♟</span>{vi ? 'Họp phụ huynh tháng 7' : 'Parent meeting'}</li>
          <li><span>★</span>{vi ? 'Hoạt động ngoại khóa' : 'Extracurricular activity'}</li>
        </ul>
      </article>

      <article className="eh6-product-card eh6-apps-card">
        <header><span className="eh6-card-icon"><MiniIcon type="grid" /></span><strong>{vi ? 'Ứng dụng' : 'Apps'}</strong></header>
        <div className="eh6-app-grid">
          <div><MiniIcon type="folder" /><span>{vi ? 'Thư viện' : 'Library'}</span></div>
          <div><MiniIcon type="task" /><span>{vi ? 'Bài tập' : 'Practice'}</span></div>
          <div><MiniIcon type="book" /><span>{vi ? 'Tài liệu' : 'Resources'}</span></div>
          <div><MiniIcon type="puzzle" /><span>{vi ? 'Tiện ích' : 'Utilities'}</span></div>
        </div>
      </article>

      <article className="eh6-product-card eh6-weekly-card">
        <header><span className="eh6-spark">✦</span><strong>Weekly English Practice</strong><a href="#/practice">{vi ? 'Xem tất cả' : 'View all'} →</a></header>
        <h3>{vi ? 'Bài luyện tập tiếng Anh theo tuần' : 'Weekly English practice'}</h3>
        <div className="eh6-grade-grid">
          <div className="eh6-grade eh6-grade-10"><small>{vi ? 'KHỐI 10' : 'GRADE 10'}</small><b>{vi ? 'Tiếng Anh 10' : 'English 10'}</b><span>{vi ? 'Tuần 2 | 27/7 - 01/8' : 'Week 2 | 27/7 - 01/8'}</span><i><MiniIcon type="notebook" /></i></div>
          <div className="eh6-grade eh6-grade-11"><small>{vi ? 'KHỐI 11' : 'GRADE 11'}</small><b>{vi ? 'Tiếng Anh 11' : 'English 11'}</b><span>{vi ? 'Tuần 2 | 27/7 - 01/8' : 'Week 2 | 27/7 - 01/8'}</span><i><MiniIcon type="chat" /></i></div>
          <div className="eh6-grade eh6-grade-12"><small>{vi ? 'KHỐI 12' : 'GRADE 12'}</small><b>{vi ? 'Tiếng Anh 12' : 'English 12'}</b><span>{vi ? 'Tuần 2 | 27/7 - 01/8' : 'Week 2 | 27/7 - 01/8'}</span><i><MiniIcon type="cap" /></i></div>
        </div>
      </article>

      <div className="eh6-calendar-float" aria-hidden="true"><MiniIcon type="calendar" /><span>28</span></div>
    </div>
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
    <div className="eh5-home eh6-home" aria-label="English Hub homepage">
      <section className="eh5-hero eh6-hero">
        <div className="eh5-hero-copy eh6-hero-copy">
          <span className="eh5-badge">{t.badge}</span>
          <h1>{t.headline}</h1>
          <h2>{t.highlight}</h2>
          <p>{t.subtitle}</p>
          <div className="eh5-actions">
            <button type="button" className="eh5-primary" onClick={(event) => launch(currentUser ? `#/${firstRoute}` : '#/login', 'GO', '#6d35d8', currentUser, event.currentTarget)}>
              <span>✦</span>{t.start}<b>→</b>
            </button>
            <button type="button" className="eh5-secondary" onClick={(event) => launch('#/apps', 'AP', '#1a73e8', currentUser, event.currentTarget)}>
              <span>▶</span>{t.guide}
            </button>
          </div>
          <div className="eh6-benefits" aria-label={language === 'vi' ? 'Lợi ích nổi bật' : 'Key benefits'}>
            <span><i className="eh6-benefit-icon eh6-benefit-purple"><MiniIcon type="users" /></i>{language === 'vi' ? 'Dành cho giáo viên và học sinh' : 'For teachers and students'}</span>
            <span><i className="eh6-benefit-icon eh6-benefit-green"><MiniIcon type="shield" /></i>{language === 'vi' ? 'An toàn và bảo mật dữ liệu' : 'Safe and secure data'}</span>
            <span><i className="eh6-benefit-icon eh6-benefit-orange"><MiniIcon type="chart" /></i>{language === 'vi' ? 'Hiệu quả, tiết kiệm thời gian' : 'Efficient and time-saving'}</span>
          </div>
        </div>

        <div className="eh5-hero-visual eh6-hero-visual">
          <LayeredHeroCards language={language} />
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
