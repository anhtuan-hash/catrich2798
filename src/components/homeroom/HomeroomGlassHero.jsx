import React from 'react';
import { downloadCsv } from '../../utils/homeroomOfflineTools.js';

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'GV';
  return parts.slice(-2).map((part) => part.charAt(0)).join('').toUpperCase();
}

function Icon({ type }) {
  const paths = {
    calendar: <><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M8 3.5v3.5M16 3.5v3.5M3.5 9.5h17" /></>,
    people: <><circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.4" /><path d="M3.5 20c.4-4.1 2.2-6.2 5.5-6.2s5.1 2.1 5.5 6.2M14.5 14.7c3.6-.4 5.6 1.3 6 4.5" /></>,
    room: <><path d="M5 21V5.8c0-.8.5-1.5 1.3-1.7l9-2.1c1.1-.3 2.2.6 2.2 1.7V21" /><path d="M3 21h18M9 9h3M9 13h3M9 17h3" /></>,
    grade: <><path d="m4 8 8-4 8 4-8 4-8-4Z" /><path d="M7 10.5v5.2c2.1 2.2 7.9 2.2 10 0v-5.2M20 8v6" /></>,
    class: <><path d="M4 6.5h16v11H4z" /><path d="M8 21h8M12 17.5V21M8 10h8M8 13.5h5" /></>,
    download: <><path d="M12 3v12m0 0 4-4m-4 4-4-4" /><path d="M5 19h14" /></>,
    plus: <path d="M12 5v14M5 12h14" />,
  };
  return <svg viewBox="0 0 24 24" aria-hidden="true">{paths[type] || paths.class}</svg>;
}

function Detail({ icon, label, value }) {
  return <div className="hr-campus-detail">
    <span className="hr-campus-detail__icon"><Icon type={icon} /></span>
    <span><small>{label}</small><strong>{value}</strong></span>
  </div>;
}

function CampusScene() {
  const leftWindows = Array.from({ length: 12 });
  const sideWindows = Array.from({ length: 8 });

  return <div className="hr-campus-scene" aria-hidden="true">
    <svg className="hr-campus-scene__svg" viewBox="0 0 820 540" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="hrSky" x1="0" y1="0" x2=".9" y2="1">
          <stop offset="0" stopColor="#a8d5ff" />
          <stop offset=".48" stopColor="#d8ecff" />
          <stop offset="1" stopColor="#f8fbff" />
        </linearGradient>
        <linearGradient id="hrSun" x1=".2" y1="0" x2=".8" y2="1">
          <stop offset="0" stopColor="#fff5cf" stopOpacity=".96" />
          <stop offset=".5" stopColor="#ffffff" stopOpacity=".5" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="hrGlassDark" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#315c88" />
          <stop offset=".35" stopColor="#547da5" />
          <stop offset=".72" stopColor="#90b9da" />
          <stop offset="1" stopColor="#d7ebf8" />
        </linearGradient>
        <linearGradient id="hrGlassLight" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#edf8ff" />
          <stop offset=".35" stopColor="#c2e4fb" />
          <stop offset=".7" stopColor="#75add7" />
          <stop offset="1" stopColor="#3f6f9e" />
        </linearGradient>
        <linearGradient id="hrFacade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".5" stopColor="#f7f9fb" />
          <stop offset="1" stopColor="#dfe7ef" />
        </linearGradient>
        <linearGradient id="hrFacadeEdge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#edf3f8" />
          <stop offset="1" stopColor="#b6c7d7" />
        </linearGradient>
        <linearGradient id="hrGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b9d99b" />
          <stop offset="1" stopColor="#6f9f5f" />
        </linearGradient>
        <linearGradient id="hrLeaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#78b56e" />
          <stop offset=".55" stopColor="#3d865c" />
          <stop offset="1" stopColor="#245f48" />
        </linearGradient>
        <filter id="hrBuildingShadow" x="-30%" y="-30%" width="170%" height="190%">
          <feDropShadow dx="0" dy="18" stdDeviation="16" floodColor="#294c70" floodOpacity=".22" />
        </filter>
        <filter id="hrSoftBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="13" />
        </filter>
        <filter id="hrLeafBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" />
        </filter>
      </defs>

      <rect width="820" height="540" fill="url(#hrSky)" />
      <ellipse cx="670" cy="48" rx="180" ry="126" fill="url(#hrSun)" filter="url(#hrSoftBlur)" />
      <ellipse cx="120" cy="58" rx="120" ry="78" fill="#ffffff" opacity=".22" filter="url(#hrSoftBlur)" />

      <path d="M0 475 C112 448 225 447 336 468 C461 493 583 501 820 450 L820 540 L0 540 Z" fill="url(#hrGround)" />
      <path d="M0 503 C148 474 305 482 433 506 C564 532 688 512 820 486 L820 540 L0 540 Z" fill="#dceccf" opacity=".78" />

      <g filter="url(#hrBuildingShadow)">
        <path d="M118 224 L354 91 L402 101 L402 447 L148 447 Z" fill="url(#hrGlassDark)" />
        <path d="M402 101 L689 58 C728 52 758 79 760 116 L772 447 L402 447 Z" fill="url(#hrFacade)" />
        <path d="M689 58 C726 55 755 79 758 116 L770 447 L706 447 L699 112 C698 91 690 75 674 65 Z" fill="url(#hrFacadeEdge)" opacity=".98" />
        <path d="M402 101 L436 96 L447 447 L402 447 Z" fill="#d3dee9" />
        <path d="M447 111 L504 102 L510 447 L452 447 Z" fill="#f8fafc" />
        <path d="M150 414 L771 414 L772 447 L148 447 Z" fill="#ccd9e5" opacity=".92" />
      </g>

      <g opacity=".92">
        {leftWindows.map((_, index) => {
          const col = index % 3;
          const row = Math.floor(index / 3);
          return <rect
            key={`left-${index}`}
            x={166 + col * 64}
            y={196 + row * 59}
            width="46"
            height="39"
            rx="2.5"
            fill="url(#hrGlassLight)"
            opacity={.8 + (col * .05)}
          />;
        })}
      </g>

      <g fill="none" stroke="#cad5df" strokeWidth="2" opacity=".72">
        <path d="M523 101 L530 423" />
        <path d="M582 92 L588 423" />
        <path d="M641 83 L646 423" />
        <path d="M704 82 L712 423" />
      </g>

      <g opacity=".94">
        {sideWindows.map((_, index) => {
          const col = index % 4;
          const row = Math.floor(index / 4);
          return <rect
            key={`side-${index}`}
            x={528 + col * 53}
            y={260 + row * 72}
            width="33"
            height="50"
            rx="2"
            fill="url(#hrGlassLight)"
          />;
        })}
      </g>

      <g transform="translate(544 166) rotate(-6)">
        <text x="0" y="0" fill="#75859a" fontFamily="Georgia, 'Times New Roman', serif" fontSize="21" opacity=".9">Better</text>
        <text x="-2" y="28" fill="#75859a" fontFamily="Georgia, 'Times New Roman', serif" fontSize="21" opacity=".9">Students</text>
        <text x="-5" y="56" fill="#75859a" fontFamily="Georgia, 'Times New Roman', serif" fontSize="21" opacity=".9">Brighter</text>
        <text x="-8" y="84" fill="#75859a" fontFamily="Georgia, 'Times New Roman', serif" fontSize="21" opacity=".9">Tomorrows</text>
      </g>

      <g opacity=".96">
        <path d="M42 540 C49 478 72 426 116 380 C113 431 114 486 111 540 Z" fill="#245f48" />
        <path d="M93 438 C58 423 31 395 16 360 C52 365 87 382 112 409 Z" fill="url(#hrLeaf)" />
        <path d="M109 409 C90 368 95 333 112 304 C137 339 146 377 133 414 Z" fill="url(#hrLeaf)" />
        <path d="M112 469 C154 444 194 438 227 451 C201 478 164 495 120 499 Z" fill="url(#hrLeaf)" />
        <path d="M130 421 C165 389 203 375 236 381 C213 414 178 436 139 448 Z" fill="url(#hrLeaf)" />

        <path d="M700 540 C704 492 720 452 753 418 C758 465 757 506 755 540 Z" fill="#255f47" />
        <path d="M739 457 C707 442 684 419 671 391 C703 394 732 408 754 431 Z" fill="url(#hrLeaf)" />
        <path d="M753 423 C741 387 748 354 768 329 C785 363 789 397 777 429 Z" fill="url(#hrLeaf)" />
      </g>

      <g opacity=".66" filter="url(#hrLeafBlur)">
        <circle cx="36" cy="37" r="35" fill="#4c8a5c" />
        <circle cx="77" cy="22" r="27" fill="#6fa66c" />
        <circle cx="112" cy="47" r="32" fill="#457b55" />
        <circle cx="804" cy="36" r="27" fill="#5c985f" />
      </g>

      <g opacity=".24" fill="#ffffff" filter="url(#hrSoftBlur)">
        <circle cx="628" cy="88" r="42" />
        <circle cx="742" cy="126" r="26" />
      </g>
    </svg>
    <div className="hr-campus-scene__veil" />
  </div>;
}

export default function HomeroomGlassHero({
  workspace,
  currentUser,
  syncState = 'local',
  language = 'vi',
  subjectMode = false,
  classTypeLabel = '',
  activeStudents = 0,
}) {
  const vi = language === 'vi';
  const profile = workspace?.classProfile || {};
  const className = profile.className || (vi ? 'Chưa thiết lập' : 'Not configured');
  const schoolYear = profile.schoolYear || '—';
  const room = profile.room || (vi ? 'Chưa cập nhật' : 'Not set');
  const grade = profile.grade || '—';
  const teacherName = profile.adviserName || currentUser?.name || currentUser?.email || (vi ? 'Giáo viên' : 'Teacher');
  const teacherEmail = profile.adviserEmail || currentUser?.email || '';
  const initials = getInitials(teacherName);
  const roleLong = vi
    ? (subjectMode ? 'Giáo viên bộ môn' : 'Giáo viên chủ nhiệm')
    : (subjectMode ? 'Subject teacher' : 'Homeroom teacher');
  const syncLabel = syncState === 'cloud'
    ? (vi ? 'Đã đồng bộ' : 'Synced')
    : (vi ? 'Lưu trên thiết bị' : 'Saved locally');

  const navigate = (tab) => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(new CustomEvent('bes-homeroom-command', {
      detail: { type: 'homeroom.navigate', workspaceId: workspace?.id || '', tab },
    }));
  };

  const exportRoster = () => {
    const students = Array.isArray(workspace?.students) ? workspace.students : [];
    downloadCsv(`danh-sach-${className || 'lop'}.csv`, [
      ['Mã HS', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'Ghi chú'],
      ...students.map((item) => [item.code || '', item.fullName || '', item.birthDate || '', item.gender || '', item.notes || '']),
    ]);
  };

  const addStudent = () => {
    navigate('students');
    if (typeof window !== 'undefined') {
      window.setTimeout(() => {
        const target = document.querySelector('.hr-subject-student-form, .hr-student-form, .hr-workspace-body');
        target?.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
        target?.querySelector?.('input')?.focus?.();
      }, 180);
    }
  };

  return <section
    className={`hr-campus-hero ${subjectMode ? 'is-subject' : 'is-homeroom'}`}
    aria-labelledby="hr-campus-hero-title"
    data-class-type={classTypeLabel}
    data-workspace-id={workspace?.id || ''}
  >
    <CampusScene />

    <div className="hr-campus-hero__copy">
      <p className="hr-campus-hero__eyebrow">{vi ? 'Chào mừng đến với Brian English' : 'Welcome to Brian English'}</p>
      <h1 id="hr-campus-hero-title">{vi ? 'Lớp' : 'Class'} <em id="hr-material-hero-title">{className}</em></h1>
      <span className="hr-campus-hero__accent" />

      <blockquote className="hr-campus-hero__quote">
        {vi ? '“Những điều lớn lao luôn bắt đầu từ những nỗ lực bền bỉ mỗi ngày.”' : '“Great things begin with consistent effort, every day.”'}
      </blockquote>
      <p className="hr-campus-hero__tagline">SAME CLASS &nbsp;•&nbsp; BRIGHTER TOMORROW</p>

      <div className="hr-campus-hero__ledger" aria-label={vi ? 'Thông tin lớp' : 'Class information'}>
        <Detail icon="calendar" label={vi ? 'Năm học' : 'School year'} value={schoolYear} />
        <Detail icon="people" label={vi ? 'Sĩ số' : 'Students'} value={`${activeStudents} ${vi ? 'học sinh' : 'students'}`} />
        <Detail icon="room" label={vi ? 'Phòng học' : 'Room'} value={room} />
        <Detail icon="grade" label={vi ? 'Khối' : 'Grade'} value={grade} />
      </div>

      <div className="hr-campus-hero__actions" aria-label={vi ? 'Thao tác lớp' : 'Class actions'}>
        <button type="button" className="is-dark" onClick={() => navigate(subjectMode ? 'classes' : 'overview')}><Icon type="class" />{vi ? 'Quản lý lớp' : 'Manage class'}</button>
        <button type="button" onClick={() => navigate('students')}><Icon type="people" />{vi ? 'Học sinh' : 'Students'}</button>
        <button type="button" onClick={exportRoster}><Icon type="download" />{vi ? 'Xuất danh sách' : 'Export roster'}</button>
        <button type="button" className="is-primary" onClick={addStudent}><Icon type="plus" />{vi ? 'Thêm học sinh' : 'Add student'}</button>
      </div>
    </div>

    <div className="hr-campus-hero__art-copy" aria-hidden="true">
      <span className="hr-campus-hero__class-mark">• &nbsp; {className} &nbsp; •</span>
      <span className="hr-campus-hero__motto">DISCIPLINE<br />CREATES<br />FREEDOM</span>
      <span className="hr-campus-hero__brand">BRIAN ENGLISH</span>
    </div>

    <aside className="hr-campus-profile" aria-label={roleLong}>
      <div className="hr-campus-profile__top">
        <span className="hr-campus-profile__avatar">{initials}</span>
        <span><strong>{teacherName}</strong><small>{roleLong}</small>{teacherEmail ? <a href={`mailto:${teacherEmail}`}>{teacherEmail}</a> : null}</span>
      </div>
      <div className="hr-campus-profile__rule" />
      <div className="hr-campus-profile__stats">
        <span><small>{vi ? 'Lớp phụ trách' : 'Class'}</small><strong>{className}</strong></span>
        <span><small>{vi ? 'Sĩ số' : 'Students'}</small><strong>{activeStudents}</strong></span>
      </div>
      <div className="hr-campus-profile__status"><i className={syncState === 'cloud' ? 'is-cloud' : ''} />{syncLabel}</div>
      <span className="hr-campus-profile__next" aria-hidden="true">›</span>
    </aside>
  </section>;
}
