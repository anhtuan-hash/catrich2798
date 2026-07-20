import React, { useEffect, useMemo, useState } from 'react';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../data/apps.js';
import { getFirstAllowedRoute, hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import { isAppHiddenForUser } from '../utils/appVisibility.js';
import { visibilityIdForRoute } from '../data/appVisibilityRegistry.js';

const ALL_APPS = [...APPS, ...GAME_APPS, ...SPECIAL_TOOLS];

const copy = {
  vi: {
    welcome: 'Chào mừng bạn trở lại, Brian!',
    welcomeSub: 'Dạy học mỗi ngày — Tiến bộ mỗi ngày.',
    brand: 'Brian English',
    headline: 'Không gian dạy học thông minh & sáng tạo',
    subtitle: 'Tích hợp các công cụ hỗ trợ giảng dạy, học tập và quản lý hiệu quả — tối ưu cho giáo viên và học sinh.',
    start: 'Bắt đầu ngay',
    guide: 'Xem hướng dẫn',
    trust: ['An toàn & bảo mật', 'Nhanh & ổn định', 'Thiết kế cho giáo viên'],
    overview: 'Tổng quan nhanh',
    today: 'Hôm nay',
    realApps: 'Ứng dụng đang có',
    featured: 'Thẻ nổi bật',
    aiStatus: 'Kết nối AI',
    ready: 'Sẵn sàng',
    setup: 'Cần thiết lập',
    lastAccess: 'Cập nhật lúc',
    open: 'Mở',
  },
  en: {
    welcome: 'Welcome back to Brian!',
    welcomeSub: 'Teach every day — improve every day.',
    brand: 'Brian English',
    headline: 'A smart and creative teaching workspace',
    subtitle: 'Teaching, learning and management tools brought together in one efficient workspace for teachers and students.',
    start: 'Get started',
    guide: 'View guide',
    trust: ['Safe & secure', 'Fast & stable', 'Designed for teachers'],
    overview: 'Quick overview',
    today: 'Today',
    realApps: 'Available apps',
    featured: 'Featured cards',
    aiStatus: 'AI connection',
    ready: 'Ready',
    setup: 'Setup needed',
    lastAccess: 'Updated at',
    open: 'Open',
  },
};

const iconPaths = {
  lesson: (
    <>
      <path d="M17 20h28c6 0 10 4 10 10v53c0-6-4-10-10-10H17V20Z" />
      <path d="M83 20H55v63c0-6 4-10 10-10h18V20Z" />
      <path d="M28 38h15M28 50h13M64 38h11M64 50h13" />
    </>
  ),
  exam: (
    <>
      <path d="M27 14h42l13 13v59H27V14Z" />
      <path d="M69 14v15h13M38 42h27M38 54h24M38 66h15" />
      <path d="m59 69 7 7 16-20" />
    </>
  ),
  reading: (
    <>
      <path d="M17 21h28c6 0 10 4 10 10v52c0-6-4-10-10-10H17V21Z" />
      <path d="M83 21H55v62c0-6 4-10 10-10h18V21Z" />
      <path d="M28 38h15M28 50h13M65 38h10M65 50h12" />
    </>
  ),
  textcare: (
    <>
      <path d="M19 20h25v25H19V20ZM56 20h25v25H56V20ZM19 57h25v25H19V57ZM56 57h25v25H56V57Z" />
      <path d="M27 33h9M64 33h9M27 70h9M64 70h9" />
    </>
  ),
  game: (
    <>
      <path d="M24 42h52c9 0 15 7 17 17l3 15c2 10-6 17-15 11L66 75H34L19 85c-9 6-17-1-15-11l3-15c2-10 8-17 17-17Z" />
      <path d="M30 59h18M39 50v18M70 56h1M81 65h1" />
    </>
  ),
  library: (
    <>
      <path d="M16 25h29l8 9h31v43H16V25Z" />
      <path d="M16 40h68M29 53h43M29 65h28" />
    </>
  ),
  bell: (
    <>
      <path d="M25 68h50l-7-10V43c0-12-7-22-18-22S32 31 32 43v15l-7 10Z" />
      <path d="M42 76c2 7 14 7 16 0" />
    </>
  ),
  bot: (
    <>
      <rect x="19" y="30" width="62" height="48" rx="13" />
      <path d="M50 30V18M43 18h14M31 78v9M69 78v9" />
      <circle cx="38" cy="53" r="4" />
      <circle cx="62" cy="53" r="4" />
      <path d="M39 66h22" />
    </>
  ),
  rocket: (
    <>
      <path d="M56 17c14 5 24 15 29 29L61 70 31 40l25-23Z" />
      <path d="M42 58 25 75M32 50l-15 3 8 8M50 68l-3 15-8-8" />
      <circle cx="65" cy="37" r="6" />
    </>
  ),
  play: (
    <>
      <circle cx="50" cy="50" r="33" />
      <path d="m44 37 20 13-20 13V37Z" />
    </>
  ),
  shield: (
    <>
      <path d="M50 14 79 25v21c0 20-11 33-29 41-18-8-29-21-29-41V25l29-11Z" />
      <path d="m36 50 10 10 20-22" />
    </>
  ),
  bolt: <path d="m57 13-30 43h21l-5 31 30-44H52l5-30Z" />,
  heart: <path d="M50 83S18 65 18 40c0-13 16-22 32-6 16-16 32-7 32 6 0 25-32 43-32 43Z" />,
};

function HomeIcon({ type }) {
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

function appTarget(app) {
  if (!app) return '#/apps';
  return app.route ? `#/${app.route}` : `#/tool/${app.slug}`;
}

function isPublicTarget(target) {
  return ['#/home', '#/resources', '#/contact', '#/login', '#/register', '#/setup'].includes(target);
}

function launch(target, label, color, currentUser, sourceEl) {
  const finalTarget = !currentUser && !isPublicTarget(target) ? '#/login' : target;
  launchRoute({ target: finalTarget, label, color, sourceEl });
}

function openCard(item, currentUser, sourceEl) {
  if (item.requiresUser && !currentUser) {
    launch('#/login', 'IN', item.accent, currentUser, sourceEl);
    return;
  }
  if (item.action === 'chatbot') {
    window.dispatchEvent(new CustomEvent('bes-chatbot-drawer-open'));
    return;
  }
  if (item.action === 'notifications') {
    window.dispatchEvent(new CustomEvent('brian:activity-center-open', { detail: { tab: 'notifications' } }));
    return;
  }
  launch(item.target, item.label, item.accent, currentUser, sourceEl);
}

function appCard(slug, options) {
  const app = findApp(slug);
  if (!app) return null;
  return {
    id: slug,
    title: app.titleVi || app.title,
    titleEn: app.title || app.titleVi,
    description: app.descVi || app.desc,
    descriptionEn: app.desc || app.descVi,
    target: appTarget(app),
    visibilityId: app.route ? visibilityIdForRoute(app.route) : `tool:${slug}`,
    requiresUser: true,
    label: app.icon || options.label || 'AP',
    ...options,
  };
}

function FeatureCard({ item, currentUser, language }) {
  const vi = language === 'vi';
  const title = vi ? item.title : (item.titleEn || item.title);
  const description = vi ? item.description : (item.descriptionEn || item.description);
  const actionLabel = currentUser || !item.requiresUser ? (vi ? 'Mở ứng dụng' : 'Open app') : (vi ? 'Đăng nhập để mở' : 'Sign in to open');

  return (
    <button
      type="button"
      className={`boh-card boh-card-${item.id} ${item.featured ? 'is-featured' : ''}`}
      style={{ '--card-accent': item.accent, '--card-soft': item.soft, '--card-rotate': item.rotate || '0deg' }}
      onClick={(event) => openCard(item, currentUser, event.currentTarget)}
      aria-label={`${actionLabel}: ${title}`}
    >
      <span className="boh-card-chrome">
        <span className="boh-traffic" aria-hidden="true"><i /><i /><i /></span>
        <b>{vi ? item.eyebrow : (item.eyebrowEn || item.eyebrow)}</b>
      </span>
      <span className="boh-card-body">
        {item.featured ? (
          <>
            <span className="boh-feature-tabs"><i>{vi ? 'Bài dạy' : 'Lesson'}</i><i>{vi ? 'Thiết kế' : 'Design'}</i><i>{vi ? 'Xuất file' : 'Export'}</i></span>
            <strong className="boh-feature-title">{title}</strong>
            <small className="boh-feature-description">{description}</small>
            <span className="boh-feature-signature">@catrich.mauxanh</span>
            <span className="boh-feature-badge">5512+ {vi ? 'năng lực số' : 'digital competencies'}</span>
            <span className="boh-feature-spark" aria-hidden="true">✦</span>
          </>
        ) : (
          <>
            <span className="boh-card-icon"><HomeIcon type={item.icon} /></span>
            <span className="boh-card-copy">
              <strong>{title}</strong>
              <small>{description}</small>
              <em>{actionLabel}</em>
            </span>
            <span className="boh-card-arrow" aria-hidden="true">→</span>
          </>
        )}
      </span>
    </button>
  );
}

function OverviewMetric({ icon, value, label, tone }) {
  return (
    <article className={`boh-overview-metric tone-${tone}`}>
      <span><HomeIcon type={icon} /></span>
      <div><small>{label}</small><strong>{value}</strong></div>
    </article>
  );
}

export default function Home({ hasApiKey, currentUser, language = 'vi', appVisibility }) {
  const [now, setNow] = useState(() => new Date());
  const t = copy[language] || copy.vi;
  const vi = language === 'vi';
  const visibilitySnapshot = appVisibility?.snapshot;
  const firstRoute = currentUser ? getFirstAllowedRoute(currentUser) : 'login';

  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  const cards = useMemo(() => {
    const list = [
      appCard('textcare', {
        icon: 'textcare', eyebrow: 'Chỉnh sửa tự động', eyebrowEn: 'Automatic editing',
        accent: '#6f4ad8', soft: '#f3efff', rotate: '-1deg',
        description: 'Chuẩn hoá văn bản, sửa lỗi chính tả và ngữ pháp.',
        descriptionEn: 'Normalize documents and fix spelling and grammar.',
      }),
      appCard('exam-studio', {
        icon: 'exam', eyebrow: 'Kiểm tra & đánh giá', eyebrowEn: 'Assessment',
        accent: '#2f76d0', soft: '#edf5ff', rotate: '1deg',
        description: 'Tạo đề, cloze và câu hỏi trắc nghiệm.',
        descriptionEn: 'Create tests, cloze tasks and multiple-choice questions.',
      }),
      appCard('lesson-plan-ai', {
        icon: 'lesson', eyebrow: 'Thiết kế bài dạy thông minh', eyebrowEn: 'Smart lesson design',
        accent: '#7eaa43', soft: '#f2f8e9', rotate: '1.25deg', featured: true,
        description: 'Thiết kế giáo án, học liệu và xuất bài dạy tương tác.',
        descriptionEn: 'Design lesson plans, materials and interactive teaching pages.',
      }),
      appCard('reading-studio', {
        icon: 'reading', eyebrow: 'Đọc hiểu & từ vựng', eyebrowEn: 'Reading & vocabulary',
        accent: '#e7a20a', soft: '#fff8df', rotate: '-1.25deg',
        description: 'Bài đọc, câu hỏi và từ vựng thông minh.',
        descriptionEn: 'Smart reading passages, questions and vocabulary.',
      }),
      {
        id: 'assistant', icon: 'bot', title: 'AI Assistant', titleEn: 'AI Assistant',
        eyebrow: 'Trợ lý AI', eyebrowEn: 'AI assistant',
        description: 'Hỗ trợ giải đáp, gợi ý và tạo nội dung bằng AI.',
        descriptionEn: 'Get help, suggestions and AI-generated content.',
        accent: '#dd5f7e', soft: '#fff0f4', rotate: '.5deg',
        action: 'chatbot', label: 'AI', requiresUser: true,
      },
      appCard('game-hub', {
        icon: 'game', eyebrow: 'Trò chơi học tập', eyebrowEn: 'Learning games',
        accent: '#7552d6', soft: '#f4efff', rotate: '1deg',
        description: 'Mở trò chơi lớp học và hoạt động tương tác.',
        descriptionEn: 'Launch classroom games and interactive activities.',
      }),
      {
        id: 'notifications', icon: 'bell', title: 'Thông báo', titleEn: 'Notifications',
        eyebrow: 'Thông báo & lịch', eyebrowEn: 'Notices & schedule',
        description: 'Cập nhật lịch làm việc, nhiệm vụ và thông báo.',
        descriptionEn: 'See schedules, tasks and notifications.',
        accent: '#159b9a', soft: '#eaf8f7', rotate: '-.75deg',
        action: 'notifications', label: 'TB', requiresUser: true,
      },
      {
        id: 'library', icon: 'library', title: 'Thư viện', titleEn: 'Library',
        eyebrow: 'Thư viện tài liệu', eyebrowEn: 'Resource library',
        description: 'Quản lý và chia sẻ tài liệu dạy học.',
        descriptionEn: 'Manage and share teaching resources.',
        accent: '#ed9100', soft: '#fff5e5', rotate: '.75deg',
        target: '#/library', visibilityId: visibilityIdForRoute('library'),
        permissionRoute: 'library', label: 'TV', requiresUser: true,
      },
    ];

    return list.filter(Boolean).filter((item) => {
      if (item.permissionRoute && currentUser && !hasRouteAccess(currentUser, item.permissionRoute)) return false;
      if (!item.visibilityId) return true;
      return !isAppHiddenForUser(visibilitySnapshot, currentUser, item.visibilityId);
    }).slice(0, 10);
  }, [currentUser, visibilitySnapshot]);

  const time = new Intl.DateTimeFormat(vi ? 'vi-VN' : 'en-US', {
    hour: '2-digit', minute: '2-digit', hour12: false,
  }).format(now);
  const visibleAppCount = ALL_APPS.filter((item) => {
    const visibilityId = item.route ? visibilityIdForRoute(item.route) : `tool:${item.slug}`;
    return !isAppHiddenForUser(visibilitySnapshot, currentUser, visibilityId);
  }).length;

  return (
    <div className="brian-overlap-home" aria-label="Brian English homepage">
      <section className="boh-hero">
        <div className="boh-copy-panel">
          <div className="boh-welcome">
            <span aria-hidden="true">◆</span>
            <div><strong>{t.welcome}</strong><small>{t.welcomeSub}</small></div>
          </div>

          <p className="boh-eyebrow">BRIAN ENGLISH</p>
          <h1>{t.brand}</h1>
          <h2>{t.headline}</h2>
          <p className="boh-subtitle">{t.subtitle}</p>

          <div className="boh-actions">
            <button type="button" className="is-primary" onClick={(event) => launch(currentUser ? `#/${firstRoute}` : '#/login', 'GO', '#4f8d35', currentUser, event.currentTarget)}>
              <HomeIcon type="rocket" /><span>{t.start}</span><b>→</b>
            </button>
            <button type="button" className="is-secondary" onClick={(event) => launch('#/apps', 'AP', '#1f2d35', currentUser, event.currentTarget)}>
              <HomeIcon type="play" /><span>{t.guide}</span>
            </button>
          </div>

          <div className="boh-trust-row">
            <span><HomeIcon type="shield" />{t.trust[0]}</span>
            <span><HomeIcon type="bolt" />{t.trust[1]}</span>
            <span><HomeIcon type="heart" />{t.trust[2]}</span>
          </div>

          <section className="boh-overview" aria-label={t.overview}>
            <header><strong>{t.overview}</strong><span>{t.today}⌄</span></header>
            <div className="boh-overview-grid">
              <OverviewMetric icon="library" value={visibleAppCount} label={t.realApps} tone="teal" />
              <OverviewMetric icon="lesson" value={cards.length} label={t.featured} tone="violet" />
              <OverviewMetric icon="bot" value={hasApiKey ? t.ready : t.setup} label={t.aiStatus} tone="orange" />
            </div>
            <footer><span>◷ {t.lastAccess}: {time}</span><button type="button" onClick={(event) => launch('#/apps', 'AP', '#4f8d35', currentUser, event.currentTarget)}>{t.open} →</button></footer>
          </section>
        </div>

        <div className="boh-stage" aria-label={vi ? 'Các ứng dụng nổi bật' : 'Featured applications'}>
          <span className="boh-stage-orbit" aria-hidden="true" />
          <span className="boh-stage-dots dots-a" aria-hidden="true" />
          <span className="boh-stage-dots dots-b" aria-hidden="true" />
          <span className="boh-stage-spark spark-a" aria-hidden="true">✦</span>
          <span className="boh-stage-spark spark-b" aria-hidden="true">✦</span>
          {cards.map((item) => <FeatureCard key={item.id} item={item} currentUser={currentUser} language={language} />)}
        </div>
      </section>
    </div>
  );
}
