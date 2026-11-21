import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Image as ImageIcon,
  Landmark,
  Users,
} from 'lucide-react';
import AseanActivityArt from '../../v3/AseanActivityArt.jsx';
import {ASEAN_FRAMES, ASEAN_SUBTITLE, ASEAN_TITLE, isAsean} from '../../v3/aseanLesson.js';
import './OverviewScreen.css';

const SUBMITTED_STATES = ['submitted', 'ttcm_review', 'approved_locked', 'published'];
const ASEAN_COVER_PHOTOS = [
  '/museum/asean/presenter/hue-meridian-gate.webp',
  '/museum/asean/presenter/hoi-an-river.webp',
  '/museum/asean/presenter/hoi-an-alley.webp',
];

const tr = (lang, vi, en) => (lang === 'en' ? en : vi);

export default function OverviewScreen({
  data,
  staff,
  language = 'en',
  onNavigate,
  lessonTemplate,
  publicReadOnly = false,
  standalone = false,
}) {
  const payload = data || staff || {};
  const groups = payload.groups || [];
  const assignments = payload.assignments || [];
  const primary = assignments[0] || null;
  const asean = isAsean(lessonTemplate || primary);
  const publicAsean = asean && (publicReadOnly || payload.publicReadOnly);
  const linked = primary ? groups.filter((g) => g.assignment_id === primary.id) : groups;
  const total = linked.length;
  const writtenResponses = asean
    ? (payload.aseanResponses || []).filter((response) => response.stage_index === 5)
    : payload.exitTickets || [];
  const writtenGroupIds = new Set(writtenResponses.map((response) => response.group_id));
  const publishedGroupIds = new Set((payload.reviews || [])
    .filter((review) => review.state === 'published').map((review) => review.group_id));
  const projectCount = linked.filter((group) => publicAsean
    ? publishedGroupIds.has(group.id)
    : SUBMITTED_STATES.includes(group.state || group.status)).length;
  const progress = [
    {
      id: 'writing',
      icon: Users,
      count: linked.filter((group) => writtenGroupIds.has(group.id)).length,
      label: asean ? tr(language, 'Phiếu vận dụng', 'Transfer Cards') : tr(language, 'Phiếu thoát', 'Exit Tickets'),
      detail: asean
        ? tr(language, 'Phiếu vận dụng đã hoàn thành', 'Transfer Cards Completed')
        : tr(language, 'Phiếu thoát đã hoàn thành', 'Exit Tickets Completed'),
    },
    {
      id: 'projects',
      icon: ImageIcon,
      count: projectCount,
      label: publicAsean ? tr(language, 'Đã công bố', 'Published') : tr(language, 'Dự án bảo tàng', 'Museum Projects'),
      detail: publicAsean
        ? tr(language, 'Triển lãm đã công bố', 'Exhibits Published')
        : tr(language, 'Dự án bảo tàng đã nộp', 'Museum Projects Submitted'),
    },
  ];
  const title = primary?.title || (asean
    ? ASEAN_TITLE
    : tr(language, 'Bảo tàng Hành động Khí hậu của Chúng ta', 'Our Climate Action Museum'));
  const subtitle = primary?.subtitle || primary?.theme || (asean
    ? tr(language, 'Tiếng Anh 11 · Global Success · Bài 4: ASEAN và Việt Nam', ASEAN_SUBTITLE)
    : tr(language, 'Tiếng Anh theo dự án', 'Project-based English'));

  const destinations = [
    {
      num: '01',
      id: 'lessons',
      target: 'lessons',
      tone: 'cream',
      icon: BookOpen,
      title: tr(language, 'Bài học', 'Lessons'),
      desc: tr(
        language,
        'Tạo, quản lý và giảng dạy bài học tương tác',
        'Create, manage and deliver interactive lessons'
      ),
    },
    {
      num: '02',
      id: 'submissions',
      target: 'submissions',
      tone: 'yellow',
      icon: ClipboardCheck,
      title: tr(language, 'Bài nộp', 'Submissions'),
      desc: tr(
        language,
        'Theo dõi, chấm điểm và phản hồi bài làm học sinh',
        'Review and evaluate student work'
      ),
    },
    {
      num: '03',
      id: 'exhibitions',
      target: 'gallery',
      tone: 'blue',
      icon: Landmark,
      title: tr(language, 'Triển lãm', 'Exhibitions'),
      desc: tr(
        language,
        'Khám phá bảo tàng 3D và công bố dự án',
        'Explore 3D museums and publish projects'
      ),
    },
    {
      num: '04',
      id: 'teaching-plan',
      target: 'templates',
      tone: 'coral',
      icon: CalendarDays,
      title: tr(language, 'Kế hoạch dạy', 'Teaching Plan'),
      desc: tr(
        language,
        'Xem và điều phối kế hoạch bài dạy số',
        'View and manage the digital lesson plan'
      ),
    },
  ];

  return (
    <div className={standalone ? 'igv2-screen ov-root ov-root--competition' : 'igv2-screen ov-root'} data-testid="igv2-overview-screen">
      {!standalone && <section className="ov-hero" aria-label={tr(language, 'Giới thiệu Pétrus Ký School System', 'Pétrus Ký School System')}>
        <div className="ov-hero-copy">
          <div className="ov-hero-kicker">PÉTRUS KÝ SCHOOL SYSTEM</div>
          <div className="ov-hero-lockup">
            <div className="ov-hero-row-top">
              <h1 className="ov-hero-title">
                <span>PÉTRUS KÝ</span>
              </h1>
              <span className="ov-hero-slash" aria-hidden="true" />
              <p className="ov-hero-strapline">
                <span>{tr(language, 'HỆ SINH THÁI', 'A DIGITAL')}</span>
                <span>{tr(language, 'HỌC TIẾNG ANH', 'ENGLISH LEARNING')}</span>
                <span>{tr(language, 'SỐ', 'ECOSYSTEM')}</span>
              </p>
            </div>

            <div className="ov-hero-row-bottom">
              <div className="ov-hero-word-bottom" aria-hidden="true">
                <span>SCHOOL SYSTEM</span>
                <span className="ov-hero-bar" />
              </div>

              <div className="ov-hero-year">
                <div className="ov-hero-year-label">
                  {tr(language, 'NĂM HỌC', 'ACADEMIC YEAR')}
                </div>
                <div className="ov-hero-year-value">2026 – 2027</div>
                <span className="ov-hero-year-bracket" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        <div className="ov-hero-media">
          <img
            src="/museum/swiss-editorial/hero-petrus-ky-facade.png"
            alt="Pétrus Ký School facade"
            className="ov-hero-img"
            width={402}
            height={188}
            loading="eager"
            decoding="async"
          />
        </div>
      </section>}

      <nav
        className="ov-nav-strip"
        aria-label={tr(language, 'Các phân khu chức năng chính', 'Primary workspace destinations')}
      >
        {destinations.map((tile) => {
          const Icon = tile.icon;
          return (
            <button
              key={tile.id}
              type="button"
              className={standalone ? 'ov-tile' : `ov-tile ov-tile--${tile.tone}`}
              data-testid={`ov-tile-${tile.id}`}
              onClick={() => onNavigate?.(tile.target)}
            >
              {!standalone && <span className="ov-tile-bg" aria-hidden="true" />}
              <span className="ov-tile-content">
                <span className="ov-tile-left">
                  {!standalone && <span className="ov-tile-num">{tile.num}</span>}
                  <span className="ov-tile-icon" aria-hidden="true">
                    <Icon size={standalone ? 29 : 38} strokeWidth={1.95} />
                  </span>
                </span>
                <span className="ov-tile-text">
                  <strong>{tile.title}</strong>
                  <span>{tile.desc}</span>
                </span>
                <span className="ov-tile-arrow" aria-hidden="true">
                  <ArrowRight size={standalone ? 18 : 13} strokeWidth={2.1} />
                </span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* Band 3: 2-Column Live Data Section (Recent Lesson + Learning Progress) */}
      <section className="ov-two-col" aria-label={tr(language, 'Bài học gần đây và tiến độ học tập', 'Recent lesson and learning progress')}>
        {/* Left: Recent Lesson */}
        <article className="ov-card ov-recent-card">
          <header className="ov-card-head">
            <h2 className="ov-card-title">
              <span>{tr(language, 'Bài học gần đây', 'Recent Lesson')}</span>
              {!standalone && <span className="ov-red-slash" aria-hidden="true">/</span>}
            </h2>
            <button
              type="button"
              className="ov-view-all"
              onClick={() => onNavigate?.('lessons')}
            >
              <span>{tr(language, 'Xem tất cả', 'View all')}</span>
              <ArrowRight size={13} strokeWidth={2.2} aria-hidden="true" />
            </button>
          </header>

          <div className="ov-recent-inner">
            <div className="ov-recent-body">
              <div className="ov-recent-art">
                {asean && standalone ? (
                  <ul className="ov-lesson-cover" lang="en">
                    {ASEAN_FRAMES.map((frame, index) => (
                      <li key={frame.key}>
                        <img src={ASEAN_COVER_PHOTOS[index]} alt="" decoding="async" />
                        <strong>{frame.label}</strong>
                      </li>
                    ))}
                  </ul>
                ) : asean ? (
                  <AseanActivityArt activity="build" language={language} />
                ) : (
                  <img
                    src="/museum/swiss-editorial/recent-lesson-climate.png"
                    alt={tr(language, 'Minh họa hành động khí hậu', 'Climate Action Earth and Wind Energy')}
                    className="ov-climate-img"
                    width={201}
                    height={145}
                    loading="lazy"
                    decoding="async"
                  />
                )}
              </div>

              <div className="ov-recent-info">
                <h3>{title}</h3>
                <p className="ov-recent-sub">{subtitle}</p>

                <div className="ov-meta-pills">
                  <span className="ov-meta-pill">
                    {tr(language, 'Lớp:', 'Class:')} {primary?.class_scope || '—'}
                  </span>
                  <span className="ov-meta-pill">
                    {tr(language, 'Số nhóm:', 'Groups:')} {total}
                  </span>
                </div>

                <div className="ov-progress-list">
                  {progress.map(({id, count, label}) => (
                    <div className="ov-progress-row" key={id}>
                      <CheckCircle2 size={14} className="ov-check-icon" aria-hidden="true" />
                      <span className="ov-progress-label">{label}</span>
                      <div className="ov-bar-track" aria-hidden="true">
                        <span className="ov-bar-fill" style={{ width: total ? `${Math.round(count / total * 100)}%` : '0%' }} />
                      </div>
                      <strong className="ov-progress-ratio">{count}/{total}</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </article>

        {/* Right: Learning Progress */}
        <article className="ov-card ov-progress-card">
          <div className="ov-progress-main">
            <header className="ov-card-head">
              <h2 className="ov-card-title">
                <span>{tr(language, 'Tiến độ học tập', 'Learning Progress')}</span>
                {!standalone && <span className="ov-red-slash" aria-hidden="true">/</span>}
              </h2>
            </header>

            <div className="ov-stat-stack">
              {progress.map(({id, icon: Icon, count, detail}) => (
                <div className="ov-stat-item" key={id}>
                  {!standalone && <span className="ov-stat-icon" aria-hidden="true">
                    <Icon size={22} strokeWidth={1.8} />
                  </span>}
                  <div className="ov-stat-copy">
                    <strong className="ov-stat-number">{count}/{total}</strong>
                    <span className="ov-stat-label">{detail}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="ov-progress-media" aria-hidden="true">
            <img
              src={standalone && asean
                ? '/museum/swiss-editorial/asean-gallery-illustration.webp'
                : '/museum/swiss-editorial/learning-progress-gallery.png'}
              alt=""
              className="ov-progress-img"
              width={standalone && asean ? 218 : 246}
              height={standalone && asean ? 253 : 201}
              loading="lazy"
              decoding="async"
            />
          </div>
        </article>
      </section>
    </div>
  );
}
