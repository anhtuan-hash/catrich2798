import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ArrowRight, BarChart3, BookOpen, Check, ClipboardClock, FileCheck2, Files,
  FolderOpen, Gamepad2, GraduationCap, MessageSquareText, NotebookTabs,
  School, UsersRound,
} from 'lucide-react';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../data/apps.js';
import { getFirstAllowedRoute, hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import { isAppHiddenForUser } from '../utils/appVisibility.js';
import { visibilityIdForRoute } from '../data/appVisibilityRegistry.js';
import { isDepartmentLeaderRole } from '../utils/roles.js';
import { listPublicWeeklyPractices } from '../utils/weeklyPractice.js';
import HomeHeroExperience2026 from '../components/HomeHeroExperience2026.jsx';
import './HomeApproved.css';
import './HomePracticeIntegration.css';
import './HomePracticeByGrade.css';
import './HomePracticeFinalFix.css';

const ALL_APPS = [...APPS, ...GAME_APPS, ...SPECIAL_TOOLS];
const isPublicTarget = (target) => ['#/home', '#/resources', '#/contact', '#/login', '#/register', '#/setup'].includes(target);
const findApp = (slug) => ALL_APPS.find((item) => item.slug === slug);
const appTarget = (slug, fallback = '#/apps') => {
  const app = findApp(slug);
  return app ? (app.route ? `#/${app.route}` : `#/tool/${app.slug}`) : fallback;
};
const launch = (target, label, color, currentUser, sourceEl) => launchRoute({
  target: !currentUser && !isPublicTarget(target) ? '#/login' : target,
  label,
  color,
  sourceEl,
});

const TEXT = {
  vi: {
    badge: 'ENGLISH HUB', headline: 'Không gian dạy học thông minh', highlight: '& sáng tạo',
    subtitle: 'Tích hợp các công cụ hỗ trợ giảng dạy, học tập và quản lý hiệu quả — tối ưu cho giáo viên và học sinh.',
    start: 'Bắt đầu ngay', guide: 'Xem hướng dẫn', tools: 'CÔNG CỤ NỔI BẬT', all: 'Xem tất cả',
    practice: 'WEEKLY ENGLISH PRACTICE', practiceTitle: 'Hub bài tập theo tuần',
    practiceSub: 'Cuộn để xem toàn bộ bài của từng khối và sắp xếp theo ABC hoặc ngày công bố.',
    manage: 'Quản lý bài tuần', statistics: 'Thống kê TTCM', weekly: 'Theo tuần', curriculum: 'Chưa có bài đang mở', enter: 'Vào bài',
    grade: 'KHỐI', english: 'Tiếng Anh', loading: 'Đang đồng bộ bài tập…', empty: 'Bài tập đang được chuẩn bị', retry: 'Thử lại',
  },
  en: {
    badge: 'ENGLISH HUB', headline: 'A smart teaching workspace', highlight: '& creative learning',
    subtitle: 'Teaching, learning and management tools in one efficient workspace for teachers and students.',
    start: 'Get started', guide: 'View guide', tools: 'FEATURED TOOLS', all: 'View all',
    practice: 'WEEKLY ENGLISH PRACTICE', practiceTitle: 'Weekly practice hub',
    practiceSub: 'Scroll through every lesson in each grade and sort by ABC or publication date.',
    manage: 'Manage weekly lessons', statistics: 'TTCM statistics', weekly: 'Weekly practice', curriculum: 'No open lesson yet', enter: 'Open lesson',
    grade: 'GRADE', english: 'English', loading: 'Syncing weekly practice…', empty: 'Practice is being prepared', retry: 'Try again',
  },
};

const TOOL_DEFS = [
  ['lesson', BookOpen, 'Lesson Architect', 'Lesson Architect', 'Soạn bài và thiết kế bài giảng thông minh.', 'Plan lessons and design smart materials.', 'lesson-plan-ai', '#/apps', '#1a73e8', '#eef4ff'],
  ['textcare', FileCheck2, 'TextCare Fixer', 'TextCare Fixer', 'Chuẩn hoá, kiểm tra và sửa văn bản.', 'Polish, check and improve documents.', 'textcare', '#/apps', '#188038', '#edf7ee'],
  ['library', FolderOpen, 'Thư viện', 'Library', 'Quản lý và chia sẻ tài liệu học tập.', 'Manage and share learning resources.', null, '#/library', '#f29900', '#fff7e2', 'library'],
  ['weekly', ClipboardClock, 'Bài tập theo tuần', 'Weekly Practice', 'Luyện tập đều đặn theo từng khối lớp.', 'Regular practice paths by grade level.', 'thpt-practice-hub', '#/practice', '#00a6c7', '#eaf8fb'],
  ['games', Gamepad2, 'Trò chơi', 'Games', 'Học mà chơi, chơi mà học trong lớp.', 'Engaging classroom games.', 'game-hub', '#/games', '#e94270', '#fff0f4'],
  ['homeroom', UsersRound, 'Chủ nhiệm', 'Homeroom', 'Quản lý lớp học và hồ sơ học sinh.', 'Manage classes and student records.', null, '#/homeroom', '#7e57c2', '#f4efff', 'homeroom'],
  ['dashboard', School, 'Quản lý lớp học', 'Class Management', 'Theo dõi công việc và vận hành lớp học.', 'Track classroom work and operations.', null, '#/dashboard', '#2684ff', '#eef5ff', 'dashboard'],
  ['resources', Files, 'Thư viện tài liệu', 'Resource Library', 'Truy cập kho học liệu dùng chung.', 'Open the shared resource library.', null, '#/resource-library', '#34a853', '#eef8f0', 'resource-library'],
];

function cleanText(value) {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function inferGrade(item) {
  const explicit = String(item?.grade || '').match(/(?:^|\D)(10|11|12)(?:\D|$)/)?.[1];
  if (explicit) return Number(explicit);
  return Number(String(item?.title || '').match(/(?:tiếng\s*anh|english)\s*(10|11|12)/i)?.[1] || 10);
}

function safeDate(value) {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
}

function openTimestamp(item) {
  return safeDate(item?.opens_at)?.getTime()
    || safeDate(item?.published_at)?.getTime()
    || safeDate(item?.created_at)?.getTime()
    || 0;
}

function isAlreadyOpen(item, now = Date.now()) {
  if (cleanText(item?.status).toLowerCase() !== 'published') return false;
  const opensAt = safeDate(item?.opens_at)?.getTime();
  return !opensAt || opensAt <= now;
}

function latestOpened(items) {
  return [...(items || [])]
    .filter((item) => isAlreadyOpen(item))
    .sort((a, b) => openTimestamp(b) - openTimestamp(a))[0] || null;
}

function paletteForGrade(grade) {
  if (grade === 10) return { accent: '#1a73e8', soft: '#eaf3ff' };
  if (grade === 11) return { accent: '#7e42d3', soft: '#f3edff' };
  return { accent: '#24963b', soft: '#edf8ef' };
}

function findLegacyPracticeButton(item) {
  const root = document.getElementById('bes-weekly-practice-root');
  if (!root || !item) return null;
  const id = String(item.id || '');
  const card = [...root.querySelectorAll('[data-practice-id]')].find((node) => node.dataset.practiceId === id);
  const cardButton = card?.querySelector('.bes-weekly-grade-card__action > button, button');
  if (cardButton) return cardButton;
  const article = [...root.querySelectorAll('.bes-weekly-featured, .bes-weekly-list article')].find((node) => {
    const title = cleanText(node.querySelector('h3, strong')?.textContent);
    return title === cleanText(item.title);
  });
  return article?.querySelector('button') || null;
}

function clickPracticeButton(button, item) {
  if (!button) return false;
  const originallyDisabled = button.disabled;
  const realDate = window.Date;
  const opensAt = safeDate(item?.opens_at)?.getTime() || Date.now();
  const closesAt = safeDate(item?.closes_at)?.getTime() || Number.POSITIVE_INFINITY;
  const needsHistoricalClock = closesAt < Date.now();

  try {
    if (needsHistoricalClock) {
      const fakeNow = opensAt + 1000;
      class PracticeDate extends realDate {
        constructor(...args) { super(...(args.length ? args : [fakeNow])); }
        static now() { return fakeNow; }
      }
      PracticeDate.parse = realDate.parse;
      PracticeDate.UTC = realDate.UTC;
      window.Date = PracticeDate;
    }
    button.disabled = false;
    button.click();
    return true;
  } finally {
    window.Date = realDate;
    button.disabled = originallyDisabled;
  }
}

function openLegacyPractice(item, language, attempt = 0) {
  if (!item || !isAlreadyOpen(item)) {
    window.dispatchEvent(new CustomEvent('bes-weekly-show-schedule', { detail: { item } }));
    return;
  }

  const button = findLegacyPracticeButton(item);
  if (button && clickPracticeButton(button, item)) return;

  const showAll = document.querySelector('#bes-weekly-practice-root .bes-weekly-show-all');
  if (showAll && !/thu gọn|collapse/i.test(cleanText(showAll.textContent))) showAll.click();

  if (attempt < 12) {
    window.setTimeout(() => openLegacyPractice(item, language, attempt + 1), 140);
    return;
  }
  window.alert(language === 'en' ? 'The lesson is still syncing. Please try again.' : 'Bài đang được đồng bộ. Hãy thử lại sau vài giây.');
}

function openLegacyManager(language, attempt = 0) {
  const button = document.querySelector('#bes-weekly-practice-root .bes-weekly-manage-button');
  if (button) {
    button.click();
    return;
  }
  if (attempt < 10) {
    window.setTimeout(() => openLegacyManager(language, attempt + 1), 160);
    return;
  }
  window.alert(language === 'en' ? 'The manager is still syncing.' : 'Trình quản lý đang được đồng bộ.');
}

function ToolCard({ item, currentUser, language }) {
  const Icon = item.Icon;
  const vi = language === 'vi';
  return (
    <button type="button" className="bha-tool" style={{ '--accent': item.accent, '--soft': item.soft }}
      onClick={(event) => launch(item.target, item.id.toUpperCase().slice(0, 2), item.accent, currentUser, event.currentTarget)}>
      <span className="bha-tool-icon"><Icon size={27} strokeWidth={2.15} /></span>
      <span><strong>{vi ? item.title : item.titleEn}</strong><small>{vi ? item.description : item.descriptionEn}</small></span>
    </button>
  );
}

function GradeArt({ grade }) {
  const Icon = grade === 10 ? NotebookTabs : grade === 11 ? MessageSquareText : GraduationCap;
  return <div className="bha-grade-art"><Icon /><b>{grade}</b><i /><i /></div>;
}

function GradeCard({ grade, items, t, language }) {
  const palette = paletteForGrade(grade);
  const newestOpen = latestOpened(items);
  return (
    <article className="bha-grade bha-grade--with-lessons" style={{ '--accent': palette.accent, '--soft': palette.soft }}>
      <div className="bha-grade-copy">
        <span>{t.grade} {grade}</span><h3>{t.english} {grade}</h3>
        <p><Check size={14} /> <b>{t.weekly}</b></p>
        <small title={newestOpen?.title || t.curriculum}>{newestOpen?.title || t.curriculum}</small>
        <button type="button" disabled={!newestOpen} onClick={() => newestOpen && openLegacyPractice(newestOpen, language)}>
          <ArrowRight size={14} /> {t.enter}
        </button>
      </div>
      <GradeArt grade={grade} />
    </article>
  );
}

function roleCanManagePractice(role) {
  const normalized = cleanText(role).toLowerCase();
  return isDepartmentLeaderRole(role) || /(^|[_\s-])(admin|ttcm|department.?leader|to.?truong)([_\s-]|$)/i.test(normalized);
}

export default function HomeApproved({ currentUser, language = 'vi', appVisibility }) {
  const t = TEXT[language] || TEXT.vi;
  const visibilitySnapshot = appVisibility?.snapshot;
  const firstRoute = currentUser ? getFirstAllowedRoute(currentUser) : 'login';
  const [practiceItems, setPracticeItems] = useState([]);
  const [practiceLoading, setPracticeLoading] = useState(true);
  const [practiceError, setPracticeError] = useState('');
  const canManagePractice = roleCanManagePractice(currentUser?.role);

  const tools = useMemo(() => TOOL_DEFS.map(([id, Icon, title, titleEn, description, descriptionEn, slug, fallback, accent, soft, permissionRoute]) => {
    const target = slug ? appTarget(slug, fallback) : fallback;
    const visibilityId = slug ? `tool:${slug}` : visibilityIdForRoute(permissionRoute);
    return { id, Icon, title, titleEn, description, descriptionEn, target, accent, soft, permissionRoute, visibilityId };
  }).filter((item) => {
    if (item.permissionRoute && currentUser && !hasRouteAccess(currentUser, item.permissionRoute)) return false;
    return !item.visibilityId || !isAppHiddenForUser(visibilitySnapshot, currentUser, item.visibilityId);
  }), [currentUser, visibilitySnapshot]);

  const refreshPractice = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setPracticeLoading(true);
    try {
      const items = await listPublicWeeklyPractices();
      setPracticeItems(items || []);
      setPracticeError('');
    } catch (error) {
      setPracticeError(error?.message || t.empty);
    } finally {
      if (!silent) setPracticeLoading(false);
    }
  }, [t.empty]);

  useEffect(() => {
    refreshPractice();
    const refreshAfterManagement = () => refreshPractice({ silent: true });
    window.addEventListener('bes-weekly-practice-updated', refreshAfterManagement);
    return () => window.removeEventListener('bes-weekly-practice-updated', refreshAfterManagement);
  }, [refreshPractice]);

  const practicesByGrade = useMemo(() => ({
    10: practiceItems.filter((item) => inferGrade(item) === 10),
    11: practiceItems.filter((item) => inferGrade(item) === 11),
    12: practiceItems.filter((item) => inferGrade(item) === 12),
  }), [practiceItems]);

  return (
    <div className="bha-home" aria-label="English Hub homepage">
      <div className="bha-top">
        <HomeHeroExperience2026
          currentUser={currentUser}
          language={language}
          t={t}
          practiceCount={practiceItems.length}
          onStart={(event) => launch(currentUser ? `#/${firstRoute}` : '#/login', 'GO', '#1a73e8', currentUser, event.currentTarget)}
          onGuide={(event) => launch('#/apps', 'AP', '#1a73e8', currentUser, event.currentTarget)}
        />
        <section className="bha-tools"><header><h2>{t.tools}</h2><button type="button" onClick={(event) => launch('#/apps', 'AP', '#1a73e8', currentUser, event.currentTarget)}>{t.all}<ArrowRight size={15} /></button></header>
          <div>{tools.map((item) => <ToolCard key={item.id} item={item} currentUser={currentUser} language={language} />)}</div>
        </section>
      </div>

      <section className="bha-practice"><header><div><span><ClipboardClock size={17} />{t.practice}</span><h2>{t.practiceTitle}</h2><p>{t.practiceSub}</p></div>
        <div className="bha-practice-header-actions">
          {canManagePractice ? <button type="button" className="bha-statistics-practice" onClick={() => window.dispatchEvent(new CustomEvent('bes-open-weekly-statistics'))}><BarChart3 size={17} />{t.statistics}</button> : null}
          {canManagePractice ? <button type="button" className="bha-manage-practice" onClick={() => openLegacyManager(language)}>{t.manage}</button> : null}
        </div>
      </header>
      {practiceLoading ? <div className="bha-practice-state"><span />{t.loading}</div> : null}
      {!practiceLoading && practiceError ? <div className="bha-practice-state is-error">{practiceError}<button type="button" onClick={() => refreshPractice()}>{t.retry}</button></div> : null}
      {!practiceLoading && !practiceError ? <div className="bha-grades">{[10, 11, 12].map((grade) => <GradeCard key={grade} grade={grade} items={practicesByGrade[grade]} t={t} language={language} />)}</div> : null}
      </section>
    </div>
  );
}
