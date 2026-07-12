import React, { useMemo } from 'react';
import PermissionRequestButton from '../components/PermissionRequestButton.jsx';
import FlatAppIcon from '../components/FlatAppIcon.jsx';
import { getAppDesignProfile } from '../data/designProfiles.js';
import { getRoutePermissionId, getToolPermissionId, hasRouteAccess, hasToolAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';

const APP_ORDER = [
  'resource-library-hub',
  'lesson-plan-ai',
  'textlab-activities',
  'exam-studio',
  'reading-studio',
  'news-reader',
  'smart-id',
  'vietnam-tax',
  'speaking-studio',
  'word2graph',
  'textcare',
  'student-practice',
  'game-hub',
  'department-workspace',
  'homeroom-hub',
  'library-hub',
  'practice-hub',
  'games-hub',
  'admin-hub',
];

const ROUTE_APPS = [
  { slug: 'homeroom-hub', route: 'homeroom', title: 'Homeroom Teacher', titleVi: 'Giáo viên chủ nhiệm', desc: 'Learning analytics, subject feedback, team competition, family/student portals and school-wide summaries.', descVi: 'Phân tích học tập, nhận xét bộ môn, thi đua, cổng phụ huynh/học sinh và thống kê toàn trường.', status: 'Phase 2 · Connected' },
  { slug: 'library-hub', route: 'library', title: 'Library', titleVi: 'Thư viện', desc: 'Saved teaching resources, prompts, questions, reports and exported lesson materials.', descVi: 'Kho tài liệu, prompt, câu hỏi, báo cáo và học liệu đã lưu.', status: 'Resource shelf' },
  { slug: 'practice-hub', route: 'practice', title: 'Classroom', titleVi: 'Lớp học', desc: 'Scored practice sessions with progress tracking for learners.', descVi: 'Giao bài luyện, theo dõi tiến độ và chấm điểm học sinh.', status: 'Practice flow' },
  { slug: 'games-hub', route: 'games', title: 'Games', titleVi: 'Trò chơi', desc: 'Open classroom games and interactive learning launchers.', descVi: 'Mở nhanh trò chơi lớp học và hoạt động tương tác.', status: 'Game launchers' },
  { slug: 'admin-hub', route: 'admin', title: 'Admin', titleVi: 'Quản trị', desc: 'Manage users, permissions, system configuration and activity logs.', descVi: 'Quản lý người dùng, vai trò, quyền truy cập và cấu hình hệ thống.', status: 'Control room', adminOnly: true },
];

const GROUPS = [
  { id: 'plan', label: 'Planning', labelVi: 'Soạn bài', accent: '#E86D1F' },
  { id: 'create', label: 'Creation', labelVi: 'Tạo học liệu', accent: '#F05A7E' },
  { id: 'assess', label: 'Assessment', labelVi: 'Kiểm tra', accent: '#123C69' },
  { id: 'manage', label: 'Workspace', labelVi: 'Quản lý', accent: '#3B4CCA' },
];

const copy = {
  vi: {
    brand: 'Brian English',
    kicker: 'Creative App Directory',
    titleA: 'cửa sổ',
    titleB: 'ứng dụng',
    titleC: 'sáng tạo',
    subtitle: 'Toàn bộ công cụ được trình bày như các cửa sổ website phẳng, cùng ngôn ngữ thiết kế với trang chủ nhưng mỗi thẻ có màu nhận diện riêng.',
    open: 'Mở ứng dụng',
    locked: 'Cần quyền',
    request: 'Yêu cầu quyền',
    aiOn: 'AI sẵn sàng',
    aiOff: 'Cài AI',
    role: 'Vai trò',
    total: 'Công cụ',
    pinned: 'Ghim nhanh',
    flow: 'Soạn bài · Tạo hoạt động · Kiểm tra · Quản lý',
    nav: {
      home: 'Trang chủ', apps: 'Ứng dụng', games: 'Trò chơi', dept: 'Tổ chuyên môn', library: 'Thư viện', settings: 'Cài đặt', admin: 'Quản trị', resources: 'Tài nguyên', contact: 'Liên hệ',
    },
  },
  en: {
    brand: 'Brian English',
    kicker: 'Creative App Directory',
    titleA: 'creative',
    titleB: 'app',
    titleC: 'windows',
    subtitle: 'Every tool is presented as a flat website-style window, matching the homepage design language while keeping a distinct color identity for each app.',
    open: 'Open app',
    locked: 'Locked',
    request: 'Request access',
    aiOn: 'AI ready',
    aiOff: 'Set up AI',
    role: 'Role',
    total: 'Tools',
    pinned: 'Quick pins',
    flow: 'Plan · Create · Assess · Manage',
    nav: {
      home: 'Home', apps: 'Apps', games: 'Games', dept: 'Department', library: 'Library', settings: 'Settings', admin: 'Admin', resources: 'Resources', contact: 'Contact',
    },
  },
};

function titleOf(item, language) {
  return language === 'vi' ? item.titleVi || item.title : item.title;
}

function descOf(item, language) {
  return language === 'vi' ? item.descVi || item.desc : item.desc;
}

function statusOf(item, language) {
  const profile = getAppDesignProfile(item.slug);
  return language === 'vi' ? profile.styleVi || item.statusVi || item.status : profile.style || item.status;
}

function shortDesc(item, language) {
  const vi = {
    'lesson-plan-ai': 'Giáo án, học liệu, năng lực số.',
    'textlab-activities': '18 hoạt động tương tác từ văn bản.',
    textcare: 'Chuẩn hoá văn bản hành chính.',
    'reading-studio': 'Bài đọc, câu hỏi và từ vựng.',
    'news-reader': 'Tin giáo dục Việt Nam và báo tiếng Anh.',
    'smart-id': 'Ảnh thẻ AI, crop chuẩn và tờ in 10 × 15.',
    'vietnam-tax': 'Thuế TNCN, bảo hiểm và lương Net 2026.',
    'speaking-studio': 'Thẻ nói, debate, presentation.',
    word2graph: 'Word family và collocation.',
    'exam-studio': 'Đề kiểm tra, cloze, word form.',
    'student-practice': 'Bài luyện có chấm điểm.',
    'department-workspace': 'Lịch, hồ sơ, nhiệm vụ tổ.',
    'homeroom-hub': 'Học sinh, điểm danh và phụ huynh.',
    'resource-library-hub': 'Kho học liệu dùng chung trên Drive TTCM.',
    'library-hub': 'Kho tài liệu và bài đã lưu.',
    'practice-hub': 'Giao bài và theo dõi tiến độ.',
    'games-hub': 'Game lớp học và launcher.',
    'admin-hub': 'Người dùng, quyền, cấu hình.',
  };
  const en = {
    'lesson-plan-ai': 'Lessons, materials and competencies.',
    'textlab-activities': '18 interactive activities from text.',
    textcare: 'Clean official documents.',
    'reading-studio': 'Readings and vocabulary.',
    'news-reader': 'Vietnam education and English news.',
    'smart-id': 'AI ID portraits and exact-size print sheets.',
    'vietnam-tax': 'Vietnam PIT, insurance and 2026 net salary.',
    'speaking-studio': 'Speaking cards and debates.',
    word2graph: 'Word families and collocations.',
    'exam-studio': 'Tests, cloze and word form.',
    'student-practice': 'Scored learner practice.',
    'department-workspace': 'Schedules, files and tasks.',
    'homeroom-hub': 'Students, attendance and parents.',
    'resource-library-hub': 'Shared department Drive resources.',
    'library-hub': 'Saved teaching resources.',
    'practice-hub': 'Assign and track practice.',
    'games-hub': 'Classroom game launchers.',
    'admin-hub': 'Users and permissions.',
  };
  return (language === 'vi' ? vi[item.slug] : en[item.slug]) || descOf(item, language);
}

function targetFor(item) {
  return item.route ? `#/${item.route}` : `#/tool/${item.slug}`;
}

function launch(target, label, color, sourceEl = null) {
  launchRoute({ target, label, color: color || '#191515', sourceEl });
}

function navLaunch(route, label, color, sourceEl) {
  const target = route.startsWith('#/') ? route : `#/${route}`;
  launch(target, label, color, sourceEl);
}

function groupOf(item) {
  if (['lesson-plan-ai', 'textcare', 'library-hub', 'resource-library-hub'].includes(item.slug)) return 'plan';
  if (item.slug === 'homeroom-hub') return 'manage';
  if (item.slug === 'textlab-activities') return 'create';
  if (['reading-studio', 'news-reader', 'smart-id', 'vietnam-tax', 'speaking-studio', 'word2graph', 'game-hub', 'games-hub'].includes(item.slug)) return 'create';
  if (['exam-studio', 'student-practice', 'practice-hub'].includes(item.slug)) return 'assess';
  return 'manage';
}

function permissionFor(item) {
  if (!item.route) return getToolPermissionId(item.slug);
  if (item.route === 'department' && item.slug) return getToolPermissionId(item.slug);
  return getRoutePermissionId(item.route) || '';
}

function lockedFor(item, currentUser) {
  if (!currentUser || currentUser.role === 'admin') return false;
  if (item.adminOnly) return true;
  if (item.route) return !hasRouteAccess(currentUser, item.route, item);
  return !hasToolAccess(currentUser, item.slug);
}

function cardSize() {
  return 'drawer';
}

function AppWindowCard({ item, index, language, currentUser }) {
  const t = copy[language] || copy.vi;
  const profile = getAppDesignProfile(item.slug);
  const locked = lockedFor(item, currentUser);
  const permissionId = permissionFor(item);
  const size = cardSize(item, index);
  const target = locked ? '#/apps' : targetFor(item);

  return (
    <article
      className={`flat-app-window-card flat-app-window-${size} ${locked ? 'is-locked' : ''}`}
      style={{ '--app-accent': profile.accent, '--app-soft': profile.soft, '--app-ink': profile.ink }}
    >
      <button
        type="button"
        className="flat-app-window-launch"
        onClick={(event) => { if (!locked) launch(target, item.icon || titleOf(item, language).slice(0, 2), profile.accent, event.currentTarget); }}
        aria-label={`${t.open}: ${titleOf(item, language)}`}
      >
        <span className="flat-app-window-chrome">
          <span className="flat-traffic"><i /><i /><i /></span>
          <b>{statusOf(item, language)}</b>
        </span>
        <span className="flat-app-window-body">
          <span className="flat-app-window-art" aria-hidden="true">
            <FlatAppIcon type={profile.icon} slug={item.slug} />
          </span>
          <span className="flat-app-window-copy">
            <small>{GROUPS.find((g) => g.id === groupOf(item))?.[language === 'vi' ? 'labelVi' : 'label']}</small>
            <strong>{titleOf(item, language)}</strong>
            <em>{shortDesc(item, language)}</em>
          </span>
          <span className="flat-app-window-cta">{locked ? t.locked : t.open}</span>
          <span className="flat-app-window-decoration" />
        </span>
      </button>
      {locked && permissionId ? (
        <div className="flat-app-window-request">
          <PermissionRequestButton currentUser={currentUser} permissionId={permissionId} item={item} language={language} />
        </div>
      ) : null}
    </article>
  );
}

function TopMenu({ language, setLanguage, theme, setTheme, hasApiKey, currentUser }) {
  const t = copy[language] || copy.vi;
  const isAdmin = currentUser?.role === 'admin';
  const nav = [
    { key: 'home', label: t.nav.home, icon: 'home', color: '#ffc69d' },
    { key: 'apps', label: t.nav.apps, icon: 'apps', color: '#2bb7b3' },
    { key: 'games', label: t.nav.games, icon: 'game', color: '#5B2A86' },
    ...(isAdmin ? [{ key: 'admin', label: t.nav.admin, icon: 'admin', color: '#D13438' }] : []),
  ];
  return (
    <nav className="flat-pinned-menu flat-apps-menu" aria-label="Apps navigation">
      <button type="button" className="flat-brand-button" onClick={(event) => navLaunch('home', 'BE', '#ffc69d', event.currentTarget)}>
        <span className="flat-brand-mark">be</span>
        <strong>{t.brand}</strong>
      </button>
      <div className="flat-nav-links">
        {nav.map((item) => (
          <button key={item.key} type="button" className="flat-nav-link" style={{ '--nav-hover': item.color }} onClick={(event) => navLaunch(item.key, item.label, item.color, event.currentTarget)}>
            <FlatAppIcon type={item.icon} />
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div className="flat-menu-actions">
        <button type="button" className="flat-menu-pill" onClick={(event) => navLaunch('settings', 'AI', hasApiKey ? '#2bb7b3' : '#f7d23b', event.currentTarget)}>{hasApiKey ? t.aiOn : t.aiOff}</button>
        <button type="button" className="flat-menu-pill" onClick={() => setLanguage?.(language === 'vi' ? 'en' : 'vi')}>{language === 'vi' ? 'VI' : 'EN'}</button>
        <button type="button" className="flat-menu-pill" onClick={() => setTheme?.(theme === 'dark' ? 'light' : 'dark')}>{theme === 'dark' ? '☀' : '☾'}</button>
        <button type="button" className="flat-account-button" onClick={(event) => navLaunch('settings', 'ME', '#191515', event.currentTarget)}>
          <span>{(currentUser?.name || currentUser?.email || 'U').slice(0, 1).toUpperCase()}</span>
          <strong>{currentUser?.role || 'user'}</strong>
        </button>
      </div>
    </nav>
  );
}

function GroupRail({ group, count, language }) {
  return (
    <span className="flat-apps-group-chip" style={{ '--group-accent': group.accent }}>
      <b>{language === 'vi' ? group.labelVi : group.label}</b>
      <small>{count}</small>
    </span>
  );
}

export default function WebApps({ apps, language = 'vi', hasApiKey, currentUser, setLanguage, theme, setTheme }) {
  const t = copy[language] || copy.vi;
  const launchItems = useMemo(() => {
    const routeApps = ROUTE_APPS.filter((item) => !item.adminOnly || currentUser?.role === 'admin');
    const merged = [...apps, ...routeApps];
    const seen = new Set();
    return merged
      .filter((item) => {
        const key = item.route ? `${item.route}:${item.slug}` : item.slug;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => {
        const ai = APP_ORDER.indexOf(a.slug);
        const bi = APP_ORDER.indexOf(b.slug);
        return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
      });
  }, [apps, currentUser?.role]);

  const groupCounts = GROUPS.reduce((acc, group) => {
    acc[group.id] = launchItems.filter((item) => groupOf(item) === group.id).length;
    return acc;
  }, {});

  const pinned = launchItems.slice(0, 6);

  return (
    <div className="flat-design-home flat-apps-directory" aria-label="Creative apps directory">
      <TopMenu language={language} setLanguage={setLanguage} theme={theme} setTheme={setTheme} hasApiKey={hasApiKey} currentUser={currentUser} />

      <header className="flat-apps-hero">
        <div className="flat-apps-hero-copy">
          <p className="flat-kicker">{t.kicker}</p>
          <h1>
            <span className="flat-bubble-word">{t.titleA}</span>
            <span>{t.titleB}</span>
            <span>{t.titleC}</span>
          </h1>
          <p className="flat-subtitle">{t.subtitle}</p>
        </div>
        <aside className="flat-apps-stats" aria-label="Apps summary">
          <div><strong>{launchItems.length}</strong><small>{t.total}</small></div>
          <div><strong>{hasApiKey ? 'ON' : 'OFF'}</strong><small>AI</small></div>
          <div><strong>{currentUser?.role || 'user'}</strong><small>{t.role}</small></div>
        </aside>
      </header>

      <section className="flat-apps-group-rail" aria-label="Workflow groups">
        {GROUPS.map((group) => <GroupRail key={group.id} group={group} count={groupCounts[group.id] || 0} language={language} />)}
      </section>

      <main className="flat-apps-collage-grid" aria-label="Application windows">
        {launchItems.map((item, index) => <AppWindowCard key={`${item.route || 'tool'}-${item.slug}`} item={item} index={index} language={language} currentUser={currentUser} />)}
      </main>

      <aside className="flat-pinned-apps flat-apps-pins" aria-label="Pinned apps">
        <div>
          <strong>{t.pinned}</strong>
          <small>{t.flow}</small>
        </div>
        <div className="flat-chip-row">
          {pinned.map((item) => {
            const profile = getAppDesignProfile(item.slug);
            return (
              <button key={`pin-${item.slug}`} type="button" className="flat-app-chip" style={{ '--chip-bg': profile.accent }} onClick={(event) => launch(targetFor(item), item.icon || 'AP', profile.accent, event.currentTarget)}>
                <FlatAppIcon type={profile.icon} slug={item.slug} />
                <span>{titleOf(item, language)}</span>
              </button>
            );
          })}
        </div>
      </aside>
    </div>
  );
}
