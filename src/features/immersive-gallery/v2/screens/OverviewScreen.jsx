import React from 'react';
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  ClipboardCheck,
  Edit3,
  Image as ImageIcon,
  Landmark,
  Users,
} from 'lucide-react';
import './OverviewScreen.css';

const SUBMITTED_STATES = ['submitted', 'ttcm_review', 'approved_locked', 'published'];

const tr = (lang, vi, en) => (lang === 'en' ? en : vi);

export default function OverviewScreen({
  data,
  staff,
  language = 'en',
  onNavigate,
  onCreate,
}) {
  const payload = data || staff || {};
  const groups = payload.groups || [];
  const assignments = payload.assignments || [];
  const exitTickets = payload.exitTickets || [];
  const primary = assignments[0] || null;
  const linked = primary ? groups.filter((g) => g.assignment_id === primary.id) : groups;
  const total = linked.length;
  const submittedCount = linked.filter((g) => SUBMITTED_STATES.includes(g.state || g.status)).length;
  const exitCount = linked.filter((g) => exitTickets.some((t) => t.group_id === g.id)).length;

  const exitPct = total > 0 ? Math.min(100, Math.round((exitCount / total) * 100)) : 0;
  const projectPct = total > 0 ? Math.min(100, Math.round((submittedCount / total) * 100)) : 0;

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

  const quickActions = [
    {
      id: 'create-lesson',
      icon: Edit3,
      title: tr(language, 'Tạo bài học mới', 'Create a Lesson'),
      desc: tr(
        language,
        'Bài học Unit 5, chia nhóm và cấp mã QR',
        'Unit 5 lessons, groups and QR access'
      ),
      onClick: onCreate,
    },
    {
      id: 'review-submissions',
      icon: Users,
      title: tr(language, 'Duyệt bài nộp', 'Review Submissions'),
      desc: tr(
        language,
        'Theo dõi tiến độ và nhận xét học sinh',
        'Track progress and provide feedback'
      ),
      onClick: () => onNavigate?.('submissions'),
    },
    {
      id: 'explore-museums',
      icon: ImageIcon,
      title: tr(language, 'Khám phá bảo tàng', 'Explore Museums'),
      desc: tr(
        language,
        'Xem, chia sẻ và xuất bản phòng trưng bày',
        'Browse, share and publish exhibitions'
      ),
      onClick: () => onNavigate?.('gallery'),
    },
  ];

  return (
    <div className="igv2-screen ov-root" data-testid="igv2-overview-screen">
      {/* Band 1: Swiss Editorial Hero + Slanted School Architectural Visual */}
      <section className="ov-hero" aria-label={tr(language, 'Giới thiệu hệ sinh thái Brian English', 'Brian English ecosystem hero')}>
        <div className="ov-hero-copy">
          <div className="ov-hero-kicker">BRIAN ENGLISH</div>
          <div className="ov-hero-lockup">
            <div className="ov-hero-row-top">
              <h1 className="ov-hero-title">
                <span>BRIAN</span>
                <span className="ov-hero-sr-space"> </span>
                <span className="ov-hero-title-sub">ENGLISH</span>
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
                <span>ENGLISH</span>
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
      </section>

      {/* Band 2: 4 Numbered Diagonal-Chamfered Destination Tiles */}
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
              className={`ov-tile ov-tile--${tile.tone}`}
              data-testid={`ov-tile-${tile.id}`}
              onClick={() => onNavigate?.(tile.target)}
            >
              <span className="ov-tile-bg" aria-hidden="true" />
              <div className="ov-tile-content">
                <div className="ov-tile-left">
                  <span className="ov-tile-num">{tile.num}</span>
                  <span className="ov-tile-icon" aria-hidden="true">
                    <Icon size={38} strokeWidth={1.95} />
                  </span>
                </div>
                <div className="ov-tile-text">
                  <strong>{tile.title}</strong>
                  <span>{tile.desc}</span>
                </div>
                <span className="ov-tile-arrow" aria-hidden="true">
                  <ArrowRight size={13} strokeWidth={2.4} />
                </span>
              </div>
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
              <span className="ov-red-slash" aria-hidden="true">/</span>
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
                <img
                  src="/museum/swiss-editorial/recent-lesson-climate.png"
                  alt={tr(language, 'Minh họa hành động khí hậu', 'Climate Action Earth and Wind Energy')}
                  className="ov-climate-img"
                  width={201}
                  height={145}
                  loading="lazy"
                  decoding="async"
                />
              </div>

              <div className="ov-recent-info">
                <h3>
                  {primary?.title ||
                    tr(
                      language,
                      'Bảo tàng Hành động Khí hậu của Chúng ta',
                      'Our Climate Action Museum'
                    )}
                </h3>
                <p className="ov-recent-sub">
                  {primary?.subtitle ||
                    primary?.theme ||
                    tr(language, 'Tiếng Anh theo dự án', 'Project-based English')}
                </p>

                <div className="ov-meta-pills">
                  <span className="ov-meta-pill">
                    {tr(language, 'Lớp:', 'Class:')} {primary?.class_scope || '—'}
                  </span>
                  <span className="ov-meta-pill">
                    {tr(language, 'Số nhóm:', 'Groups:')} {total}
                  </span>
                </div>

                <div className="ov-progress-list">
                  <div className="ov-progress-row">
                    <CheckCircle2 size={14} className="ov-check-icon" aria-hidden="true" />
                    <span className="ov-progress-label">
                      {tr(language, 'Phiếu thoát', 'Exit Tickets')}
                    </span>
                    <div className="ov-bar-track" aria-hidden="true">
                      <span className="ov-bar-fill" style={{ width: `${exitPct}%` }} />
                    </div>
                    <strong className="ov-progress-ratio">
                      {exitCount}/{total}
                    </strong>
                  </div>

                  <div className="ov-progress-row">
                    <CheckCircle2 size={14} className="ov-check-icon" aria-hidden="true" />
                    <span className="ov-progress-label">
                      {tr(language, 'Dự án bảo tàng', 'Museum Projects')}
                    </span>
                    <div className="ov-bar-track" aria-hidden="true">
                      <span className="ov-bar-fill" style={{ width: `${projectPct}%` }} />
                    </div>
                    <strong className="ov-progress-ratio">
                      {submittedCount}/{total}
                    </strong>
                  </div>
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
                <span className="ov-red-slash" aria-hidden="true">/</span>
              </h2>
            </header>

            <div className="ov-stat-stack">
              <div className="ov-stat-item">
                <span className="ov-stat-icon" aria-hidden="true">
                  <Users size={22} strokeWidth={1.8} />
                </span>
                <div className="ov-stat-copy">
                  <strong className="ov-stat-number">
                    {exitCount}/{total}
                  </strong>
                  <span className="ov-stat-label">
                    {tr(language, 'Phiếu thoát đã hoàn thành', 'Exit Tickets Completed')}
                  </span>
                </div>
              </div>

              <div className="ov-stat-item">
                <span className="ov-stat-icon" aria-hidden="true">
                  <ImageIcon size={22} strokeWidth={1.8} />
                </span>
                <div className="ov-stat-copy">
                  <strong className="ov-stat-number">
                    {submittedCount}/{total}
                  </strong>
                  <span className="ov-stat-label">
                    {tr(language, 'Dự án bảo tàng đã nộp', 'Museum Projects Submitted')}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="ov-progress-media" aria-hidden="true">
            <img
              src="/museum/swiss-editorial/learning-progress-gallery.png"
              alt=""
              className="ov-progress-img"
              width={246}
              height={201}
              loading="lazy"
              decoding="async"
            />
          </div>
        </article>
      </section>

      {/* Band 4: 3 Quick Action Cards */}
      <section className="ov-quick-row" aria-label={tr(language, 'Thao tác nhanh', 'Quick actions')}>
        {quickActions.map((act) => {
          const Icon = act.icon;
          return (
            <button
              key={act.id}
              type="button"
              className="ov-quick-card"
              data-testid={`ov-quick-${act.id}`}
              onClick={act.onClick}
            >
              <span className="ov-quick-icon" aria-hidden="true">
                <Icon size={21} strokeWidth={1.8} />
              </span>
              <div className="ov-quick-copy">
                <strong>{act.title}</strong>
                <span>{act.desc}</span>
              </div>
              <span className="ov-quick-arrow-badge" aria-hidden="true">
                <ArrowRight size={14} strokeWidth={2.2} className="ov-quick-arrow" />
              </span>
            </button>
          );
        })}
      </section>
    </div>
  );
}
