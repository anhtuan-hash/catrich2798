import React, { useMemo } from 'react';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../data/apps.js';
import { getFirstAllowedRoute, hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import { isAppHiddenForUser } from '../utils/appVisibility.js';
import { visibilityIdForRoute } from '../data/appVisibilityRegistry.js';
import WorkDashboard from './WorkDashboard.jsx';
import './HomePremium.css';

const ALL_APPS = [...APPS, ...GAME_APPS, ...SPECIAL_TOOLS];

const copy = {
  vi: {
    welcome: 'Chào mừng trở lại, Brian!',
    headlineA: 'Dạy học thông minh.',
    headlineB: 'Truyền cảm hứng',
    headlineC: 'mỗi ngày.',
    subtitle: 'Bộ công cụ toàn diện giúp giáo viên thiết kế bài giảng, quản lý lớp học và đánh giá hiệu quả học tập trong một không gian thống nhất.',
    primary: 'Tạo bài dạy mới',
    secondary: 'Khám phá ứng dụng',
    toolsTitle: 'Bộ công cụ dành cho giáo viên',
    toolsSub: 'Các ứng dụng được tuyển chọn cho công việc giảng dạy hằng ngày.',
    open: 'Mở ứng dụng',
    signIn: 'Đăng nhập để mở',
    overview: 'Tổng quan không gian làm việc',
    availableApps: 'Ứng dụng khả dụng',
    featuredTools: 'Công cụ nổi bật',
    workspaces: 'Không gian quản lý',
    completion: 'Sẵn sàng sử dụng',
    dashboardTitle: 'Bảng điều hành của bạn',
    dashboardSub: 'Theo dõi công việc, lịch, phê duyệt và học liệu gần đây trong cùng một khu vực.',
    openDashboard: 'Mở toàn màn hình',
    signInDashboard: 'Đăng nhập để xem bảng điều hành',
    lessonTitle: 'Lesson Architect',
    lessonDesc: 'Thiết kế giáo án và kế hoạch bài học một cách khoa học, hiệu quả.',
    readingTitle: 'Reading Studio',
    readingDesc: 'Tạo bài đọc, câu hỏi và hoạt động đọc hiểu hấp dẫn.',
    examTitle: 'Exam Studio',
    examDesc: 'Tạo đề, chấm bài và phân tích kết quả nhanh chóng.',
    homeroomTitle: 'Homeroom',
    homeroomDesc: 'Quản lý lớp học, giao việc và theo dõi tiến độ học sinh.',
    resourceTitle: 'Resource Library',
    resourceDesc: 'Kho tài nguyên được chọn lọc và tổ chức cho giáo viên.',
  },
  en: {
    welcome: 'Welcome back to Brian!',
    headlineA: 'Teach smarter.',
    headlineB: 'Inspire learners',
    headlineC: 'every day.',
    subtitle: 'An integrated workspace for lesson design, classroom management and meaningful assessment — built for teachers who value clarity and progress.',
    primary: 'Create a new lesson',
    secondary: 'Explore applications',
    toolsTitle: 'Tools built for teachers',
    toolsSub: 'A curated collection for everyday teaching workflows.',
    open: 'Open app',
    signIn: 'Sign in to open',
    overview: 'Workspace overview',
    availableApps: 'Available apps',
    featuredTools: 'Featured tools',
    workspaces: 'Management spaces',
    completion: 'Ready to use',
    dashboardTitle: 'Your work dashboard',
    dashboardSub: 'Keep tasks, schedules, approvals and recent resources in one place.',
    openDashboard: 'Open full screen',
    signInDashboard: 'Sign in to view dashboard',
    lessonTitle: 'Lesson Architect',
    lessonDesc: 'Design thoughtful lesson plans and teaching sequences with clarity.',
    readingTitle: 'Reading Studio',
    readingDesc: 'Create engaging texts, questions and reading activities.',
    examTitle: 'Exam Studio',
    examDesc: 'Build assessments, grade work and understand results quickly.',
    homeroomTitle: 'Homeroom',
    homeroomDesc: 'Manage classes, assign work and follow learner progress.',
    resourceTitle: 'Resource Library',
    resourceDesc: 'A carefully organised collection of teaching resources.',
  },
};

const iconPaths = {
  lesson: <><path d="M19 15h35c7 0 12 5 12 12v58c0-7-5-12-12-12H19V15Z"/><path d="M81 15H66v70c0-7 5-12 12-12h3V15Z"/><path d="M30 35h22M30 48h18M30 61h15"/></>,
  reading: <><path d="M15 20h31c7 0 12 5 12 12v54c0-7-5-12-12-12H15V20Z"/><path d="M85 20H58v66c0-7 5-12 12-12h15V20Z"/><path d="M27 39h18M27 52h15M69 39h7M69 52h9"/></>,
  exam: <><path d="M28 15h35l14 14v57H28V15Z"/><path d="M63 15v16h14M39 44h24M39 57h18"/><path d="m45 70 7 7 17-20"/></>,
  people: <><circle cx="40" cy="39" r="13"/><circle cx="69" cy="43" r="10"/><path d="M18 82c2-18 11-27 25-27s23 9 25 27M60 62c13 0 21 7 23 20"/></>,
  folder: <><path d="M14 29h31l10 10h31v40H14V29Z"/><path d="M14 42h72M28 55h42M28 67h27"/></>,
  arrow: <><path d="M24 50h50"/><path d="m59 34 16 16-16 16"/></>,
  spark: <><path d="M50 12c3 21 10 31 31 34-21 3-28 13-31 34-3-21-10-31-31-34 21-3 28-13 31-34Z"/></>,
  play: <><circle cx="50" cy="50" r="34"/><path d="m43 35 23 15-23 15V35Z"/></>,
  chart: <><path d="M20 80V48M43 80V28M66 80V40M89 80V17"/><path d="M15 80h78"/></>,
};

function PremiumIcon({ name }) {
  return (
    <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false">
      <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round">
        {iconPaths[name] || iconPaths.lesson}
      </g>
    </svg>
  );
}

function findApp(slug) {
  return ALL_APPS.find((item) => item.slug === slug);
}

function targetForApp(app) {
  if (!app) return '#/apps';
  return app.route ? `#/${app.route}` : `#/tool/${app.slug}`;
}

function navigate(target, label, color, currentUser, sourceEl) {
  const publicTarget = ['#/home', '#/resources', '#/contact', '#/login', '#/register', '#/setup'].includes(target);
  launchRoute({
    target: !currentUser && !publicTarget ? '#/login' : target,
    label,
    color,
    sourceEl,
  });
}

function createToolCard({ slug, route, title, description, icon, accent, tint, visibilityId, language }) {
  const app = slug ? findApp(slug) : null;
  return {
    id: slug || route,
    title,
    description,
    icon,
    accent,
    tint,
    target: app ? targetForApp(app) : `#/${route}`,
    visibilityId: visibilityId || (app ? (app.route ? visibilityIdForRoute(app.route) : `tool:${app.slug}`) : visibilityIdForRoute(route)),
    permissionRoute: route,
    language,
  };
}

function ToolCard({ item, currentUser, language }) {
  const t = copy[language] || copy.vi;
  return (
    <button
      type="button"
      className="bp-tool-card"
      style={{ '--tool-accent': item.accent, '--tool-tint': item.tint }}
      onClick={(event) => navigate(item.target, item.title, item.accent, currentUser, event.currentTarget)}
      aria-label={`${currentUser ? t.open : t.signIn}: ${item.title}`}
    >
      <span className="bp-tool-card-icon"><PremiumIcon name={item.icon} /></span>
      <span className="bp-tool-card-copy">
        <strong>{item.title}</strong>
        <small>{item.description}</small>
      </span>
      <span className="bp-tool-card-illustration" aria-hidden="true">
        <i /><i /><i />
      </span>
      <span className="bp-tool-card-arrow"><PremiumIcon name="arrow" /></span>
    </button>
  );
}

function OverviewTile({ icon, label, value, note, tone }) {
  return (
    <article className={`bp-overview-tile tone-${tone}`}>
      <span><PremiumIcon name={icon} /></span>
      <div><small>{label}</small><strong>{value}</strong>{note ? <em>{note}</em> : null}</div>
    </article>
  );
}

export default function Home({ currentUser, language = 'vi', appVisibility }) {
  const t = copy[language] || copy.vi;
  const visibilitySnapshot = appVisibility?.snapshot;
  const firstRoute = currentUser ? getFirstAllowedRoute(currentUser) : 'login';
  const canDashboard = Boolean(currentUser && hasRouteAccess(currentUser, 'dashboard'));

  const tools = useMemo(() => {
    const items = [
      createToolCard({ slug: 'lesson-plan-ai', title: t.lessonTitle, description: t.lessonDesc, icon: 'lesson', accent: '#4f8b58', tint: '#edf5e9', language }),
      createToolCard({ slug: 'reading-studio', title: t.readingTitle, description: t.readingDesc, icon: 'reading', accent: '#d49a25', tint: '#fff6e2', language }),
      createToolCard({ slug: 'exam-studio', title: t.examTitle, description: t.examDesc, icon: 'exam', accent: '#4d84d9', tint: '#edf4ff', language }),
      createToolCard({ route: 'homeroom', title: t.homeroomTitle, description: t.homeroomDesc, icon: 'people', accent: '#6c9b64', tint: '#eef5eb', language }),
      createToolCard({ route: 'resource-library', title: t.resourceTitle, description: t.resourceDesc, icon: 'folder', accent: '#4d84d9', tint: '#eef5ff', language }),
    ];

    return items.filter((item) => {
      if (item.permissionRoute && currentUser && !hasRouteAccess(currentUser, item.permissionRoute)) return false;
      return !isAppHiddenForUser(visibilitySnapshot, currentUser, item.visibilityId);
    });
  }, [currentUser, visibilitySnapshot, language, t]);

  const visibleAppCount = ALL_APPS.filter((item) => {
    const id = item.route ? visibilityIdForRoute(item.route) : `tool:${item.slug}`;
    return !isAppHiddenForUser(visibilitySnapshot, currentUser, id);
  }).length;

  return (
    <div className="bp-home" aria-label="Brian English homepage">
      <section className="bp-home-hero">
        <div className="bp-home-copy">
          <span className="bp-welcome-pill"><PremiumIcon name="spark" />{t.welcome}</span>
          <h1>
            <span>{t.headlineA}</span>
            <span>{t.headlineB} <em>{t.headlineC}</em></span>
          </h1>
          <p>{t.subtitle}</p>
          <div className="bp-home-actions">
            <button type="button" className="bp-primary-action" onClick={(event) => navigate(currentUser ? `#/${firstRoute}` : '#/login', 'GO', '#1e5f3d', currentUser, event.currentTarget)}>
              <PremiumIcon name="spark" /><span>{t.primary}</span><b>→</b>
            </button>
            <button type="button" className="bp-secondary-action" onClick={(event) => navigate('#/apps', 'AP', '#17211b', currentUser, event.currentTarget)}>
              <PremiumIcon name="play" /><span>{t.secondary}</span>
            </button>
          </div>
        </div>

        <div className="bp-hero-visual" aria-hidden="true">
          <span className="bp-hero-halo" />
          <div className="bp-hero-window">
            <span className="bp-window-line line-one" />
            <span className="bp-window-line line-two" />
            <span className="bp-window-line line-three" />
          </div>
          <div className="bp-hero-books"><i /><i /><i /></div>
          <div className="bp-hero-pot"><i /><i /><i /><i /></div>
          <div className="bp-hero-floating-card card-a"><PremiumIcon name="lesson" /><span>Lesson</span></div>
          <div className="bp-hero-floating-card card-b"><PremiumIcon name="chart" /><span>Progress</span></div>
        </div>
      </section>

      <section className="bp-tools-section">
        <header className="bp-section-heading">
          <div><h2>{t.toolsTitle}</h2><p>{t.toolsSub}</p></div>
          <button type="button" onClick={(event) => navigate('#/apps', 'AP', '#1e5f3d', currentUser, event.currentTarget)}>{language === 'vi' ? 'Xem tất cả' : 'View all'} <span>→</span></button>
        </header>
        <div className="bp-tools-grid">
          {tools.map((item) => <ToolCard key={item.id} item={item} currentUser={currentUser} language={language} />)}
        </div>
      </section>

      <section className="bp-overview-section" aria-label={t.overview}>
        <header>
          <div><span>BRIAN WORKSPACE</span><h2>{t.overview}</h2></div>
          <button type="button" onClick={(event) => navigate(canDashboard ? '#/dashboard' : '#/login', 'DB', '#4d84d9', currentUser, event.currentTarget)}>{canDashboard ? t.openDashboard : t.signInDashboard} <b>→</b></button>
        </header>
        <div className="bp-overview-grid">
          <OverviewTile icon="lesson" label={t.availableApps} value={visibleAppCount} note="+" tone="green" />
          <OverviewTile icon="spark" label={t.featuredTools} value={tools.length} note="" tone="amber" />
          <OverviewTile icon="people" label={t.workspaces} value={currentUser ? 3 : 0} note="" tone="blue" />
          <OverviewTile icon="chart" label={t.completion} value={currentUser ? '100%' : '—'} note="" tone="violet" />
        </div>
      </section>

      {canDashboard ? (
        <section className="bp-dashboard-section" aria-label={t.dashboardTitle}>
          <header className="bp-dashboard-heading">
            <div><span>WORK DASHBOARD</span><h2>{t.dashboardTitle}</h2><p>{t.dashboardSub}</p></div>
            <button type="button" onClick={(event) => navigate('#/dashboard', 'DB', '#4d84d9', currentUser, event.currentTarget)}>{t.openDashboard} <b>→</b></button>
          </header>
          <div className="bp-dashboard-shell"><WorkDashboard currentUser={currentUser} language={language} /></div>
        </section>
      ) : null}
    </div>
  );
}
