import React, { useMemo } from 'react';
import {
  ArrowRight, BookOpen, Check, ClipboardClock, Clock3, FileCheck2, Files,
  FolderOpen, Gamepad2, GraduationCap, MessageSquareText, NotebookTabs,
  Play, School, Sparkles, UsersRound,
} from 'lucide-react';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../data/apps.js';
import { getFirstAllowedRoute, hasRouteAccess } from '../utils/permissions.js';
import { launchRoute } from '../utils/motion.js';
import { isAppHiddenForUser } from '../utils/appVisibility.js';
import { visibilityIdForRoute } from '../data/appVisibilityRegistry.js';
import './HomeApproved.css';

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
    practiceSub: 'Luyện tập đều đặn, bám sát chương trình và theo dõi tiến độ theo từng khối.',
    allPractice: 'Xem tất cả bài tập & đề thi', weekly: 'Theo tuần', curriculum: 'Bám sát chương trình',
    enter: 'Vào hub', open: 'Mở bài', active: 'Đang mở', minutes: '45 phút', grade: 'KHỐI', english: 'Tiếng Anh',
  },
  en: {
    badge: 'ENGLISH HUB', headline: 'A smart teaching workspace', highlight: '& creative learning',
    subtitle: 'Teaching, learning and management tools in one efficient workspace for teachers and students.',
    start: 'Get started', guide: 'View guide', tools: 'FEATURED TOOLS', all: 'View all',
    practice: 'WEEKLY ENGLISH PRACTICE', practiceTitle: 'Weekly practice hub',
    practiceSub: 'Consistent curriculum-aligned practice organised by grade level.',
    allPractice: 'View all practice & tests', weekly: 'Weekly practice', curriculum: 'Curriculum aligned',
    enter: 'Open hub', open: 'Open lesson', active: 'Open now', minutes: '45 minutes', grade: 'GRADE', english: 'English',
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

function HeroArt() {
  return (
    <div className="bha-art" aria-hidden="true">
      <div className="bha-orb bha-orb-a" /><div className="bha-orb bha-orb-b" />
      <div className="bha-vn-line" />
      <div className="bha-flag"><i /><span>★</span></div>
      <div className="bha-screen">
        <div className="bha-screen-bar"><i /><i /><i /></div>
        <div className="bha-screen-title" />
        <div className="bha-screen-row"><b>+</b><span /></div>
        <div className="bha-screen-row orange"><b>◆</b><span /></div>
        <div className="bha-screen-row green"><b>✓</b><span /></div>
      </div>
      <div className="bha-books"><i /><i /><i /></div>
      <div className="bha-pencil-cup"><i /><i /><i /></div>
      <div className="bha-plant"><i /><i /><i /><b /></div>
    </div>
  );
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

function GradeCard({ item, t, currentUser }) {
  return (
    <article className="bha-grade" style={{ '--accent': item.accent, '--soft': item.soft }}>
      <div className="bha-grade-copy">
        <span>{t.grade} {item.grade}</span><h3>{t.english} {item.grade}</h3>
        <p><Check size={14} /> <b>{t.weekly}</b></p><small>{t.curriculum}</small>
        <button type="button" onClick={(e) => launch(item.target, `G${item.grade}`, item.accent, currentUser, e.currentTarget)}>
          <ArrowRight size={14} /> {t.enter}
        </button>
      </div>
      <GradeArt grade={item.grade} />
      <footer><span><i />{t.active}</span><strong>{item.week}</strong><em><Clock3 size={13} />{t.minutes}</em>
        <button type="button" onClick={(e) => launch(item.target, `G${item.grade}`, item.accent, currentUser, e.currentTarget)}>{t.open}<ArrowRight size={16} /></button>
      </footer>
    </article>
  );
}

export default function HomeApproved({ currentUser, language = 'vi', appVisibility }) {
  const t = TEXT[language] || TEXT.vi;
  const visibilitySnapshot = appVisibility?.snapshot;
  const firstRoute = currentUser ? getFirstAllowedRoute(currentUser) : 'login';
  const practiceTarget = appTarget('thpt-practice-hub', '#/practice');

  const tools = useMemo(() => TOOL_DEFS.map(([id, Icon, title, titleEn, description, descriptionEn, slug, fallback, accent, soft, permissionRoute]) => {
    const target = slug ? appTarget(slug, fallback) : fallback;
    const visibilityId = slug ? `tool:${slug}` : visibilityIdForRoute(permissionRoute);
    return { id, Icon, title, titleEn, description, descriptionEn, target, accent, soft, permissionRoute, visibilityId };
  }).filter((item) => {
    if (item.permissionRoute && currentUser && !hasRouteAccess(currentUser, item.permissionRoute)) return false;
    return !item.visibilityId || !isAppHiddenForUser(visibilitySnapshot, currentUser, item.visibilityId);
  }), [currentUser, visibilitySnapshot]);

  const grades = [
    { grade: 10, accent: '#1a73e8', soft: '#eaf3ff', week: language === 'vi' ? 'Tuần 2 | Học kì 1 | 27/7 - 01/8' : 'Week 2 | Semester 1 | 27/7 - 01/8', target: practiceTarget },
    { grade: 11, accent: '#7e42d3', soft: '#f3edff', week: language === 'vi' ? 'Tuần 7 | Học kì 1 | 31/8 - 05/9' : 'Week 7 | Semester 1 | 31/8 - 05/9', target: practiceTarget },
    { grade: 12, accent: '#24963b', soft: '#edf8ef', week: language === 'vi' ? 'Tuần 2 | Học kì 1 | 27/7 - 01/8' : 'Week 2 | Semester 1 | 27/7 - 01/8', target: practiceTarget },
  ];

  return (
    <div className="bha-home" aria-label="English Hub homepage">
      <div className="bha-top">
        <section className="bha-hero">
          <div className="bha-copy"><span className="bha-badge">{t.badge}</span><h1>{t.headline}</h1><h2>{t.highlight}</h2><p>{t.subtitle}</p>
            <div className="bha-actions">
              <button className="primary" type="button" onClick={(e) => launch(currentUser ? `#/${firstRoute}` : '#/login', 'GO', '#1a73e8', currentUser, e.currentTarget)}><Sparkles size={18} />{t.start}<ArrowRight size={18} /></button>
              <button type="button" onClick={(e) => launch('#/apps', 'AP', '#1a73e8', currentUser, e.currentTarget)}><Play size={17} fill="currentColor" />{t.guide}</button>
            </div>
          </div><HeroArt />
        </section>
        <section className="bha-tools"><header><h2>{t.tools}</h2><button type="button" onClick={(e) => launch('#/apps', 'AP', '#1a73e8', currentUser, e.currentTarget)}>{t.all}<ArrowRight size={15} /></button></header>
          <div>{tools.map((item) => <ToolCard key={item.id} item={item} currentUser={currentUser} language={language} />)}</div>
        </section>
      </div>
      <section className="bha-practice"><header><div><span><ClipboardClock size={17} />{t.practice}</span><h2>{t.practiceTitle}</h2><p>{t.practiceSub}</p></div>
        <button type="button" onClick={(e) => launch(practiceTarget, 'BT', '#1a73e8', currentUser, e.currentTarget)}>{t.allPractice}<ArrowRight size={16} /></button></header>
        <div className="bha-grades">{grades.map((item) => <GradeCard key={item.grade} item={item} t={t} currentUser={currentUser} />)}</div>
      </section>
    </div>
  );
}
