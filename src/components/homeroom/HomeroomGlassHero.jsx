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
  const windows = Array.from({ length: 13 });
  return <div className="hr-campus-scene" aria-hidden="true">
    <svg className="hr-campus-scene__svg" viewBox="0 0 780 560" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="hrSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#94c8ff" />
          <stop offset=".56" stopColor="#dcedff" />
          <stop offset="1" stopColor="#f7fbff" />
        </linearGradient>
        <linearGradient id="hrFacade" x1="0" y1=".1" x2="1" y2=".9">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".54" stopColor="#eef2f8" />
          <stop offset="1" stopColor="#dce5ef" />
        </linearGradient>
        <linearGradient id="hrSide" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#cbd9e8" />
          <stop offset="1" stopColor="#8ea9c3" />
        </linearGradient>
        <linearGradient id="hrGlass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e9f6ff" />
          <stop offset=".5" stopColor="#9cc7ed" />
          <stop offset="1" stopColor="#557ca8" />
        </linearGradient>
        <linearGradient id="hrGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#b6d89c" />
          <stop offset="1" stopColor="#78ab65" />
        </linearGradient>
        <filter id="hrSoftShadow" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="0" dy="16" stdDeviation="14" floodColor="#315274" floodOpacity=".24" />
        </filter>
        <filter id="hrBlur">
          <feGaussianBlur stdDeviation="9" />
        </filter>
      </defs>

      <rect width="780" height="560" fill="url(#hrSky)" />
      <circle cx="680" cy="82" r="96" fill="#ffffff" opacity=".32" filter="url(#hrBlur)" />
      <circle cx="110" cy="90" r="68" fill="#ffffff" opacity=".22" filter="url(#hrBlur)" />
      <path d="M0 500 C140 454 245 470 362 500 C512 536 650 498 780 468 L780 560 L0 560 Z" fill="url(#hrGround)" />

      <g filter="url(#hrSoftShadow)">
        <path d="M208 128 C208 99 229 78 258 74 L568 32 C601 28 628 52 628 84 L628 455 L208 455 Z" fill="url(#hrFacade)" />
        <path d="M628 84 L760 146 L760 455 L628 455 Z" fill="url(#hrSide)" />
        <path d="M249 143 C249 120 266 104 290 101 L325 96 L325 455 L249 455 Z" fill="#dfe8f2" />
        <path d="M325 96 L617 58 L617 455 L325 455 Z" fill="#fbfcfe" />
        <path d="M222 417 L748 417 L748 455 L222 455 Z" fill="#d5e0eb" />
      </g>

      <g opacity=".98">
        <rect x="272" y="161" width="47" height="70" rx="3" fill="url(#hrGlass)" />
        <rect x="272" y="246" width="47" height="70" rx="3" fill="url(#hrGlass)" />
        <rect x="272" y="331" width="47" height="70" rx="3" fill="url(#hrGlass)" />
        {windows.map((_, index) => {
          const col = index % 5;
          const row = Math.floor(index / 5);
          return <rect key={index} x={357 + col * 48} y={143 + row * 91} width="34" height="66" rx="2" fill="url(#hrGlass)" />;
        })}
        <rect x="643" y="183" width="33" height="181" rx="2" fill="#6789aa" />
        <rect x="686" y="203" width="28" height="161" rx="2" fill="#5c7d9e" />
      </g>

      <g fill="none" stroke="#c6d3e1" strokeWidth="2" opacity=".85">
        <path d="M338 117 L338 426" />
        <path d="M403 105 L403 426" />
        <path d="M468 96 L468 426" />
        <path d="M533 85 L533 426" />
        <path d="M597 74 L597 426" />
      </g>

      <g transform="translate(454 158) rotate(-7)">
        <text x="0" y="0" fill="#67809b" fontFamily="Georgia, serif" fontSize="24" opacity=".84">Better</text>
        <text x="-2" y="30" fill="#67809b" fontFamily="Georgia, serif" fontSize="24" opacity=".84">Students</text>
        <text x="-4" y="60" fill="#67809b" fontFamily="Georgia, serif" fontSize="24" opacity=".84">Brighter</text>
        <text x="-6" y="90" fill="#67809b" fontFamily="Georgia, serif" fontSize="24" opacity=".84">Tomorrows</text>
      </g>

      <g opacity=".96">
        <path d="M106 560 C110 476 133 430 184 393 C174 445 169 504 173 560 Z" fill="#2b6f4e" />
        <path d="M150 454 C105 436 80 412 63 377 C102 383 137 399 167 429 Z" fill="#3c8257" />
        <path d="M164 422 C132 383 128 347 138 316 C168 342 183 377 184 414 Z" fill="#4f9563" />
        <path d="M174 476 C217 446 254 438 289 445 C263 476 228 494 184 503 Z" fill="#4a8d5c" />
        <path d="M187 410 C218 374 252 355 286 354 C269 393 238 420 195 435 Z" fill="#4b915d" />
        <path d="M673 560 C676 497 695 455 730 424 C732 475 731 516 729 560 Z" fill="#256646" />
        <path d="M704 468 C672 449 655 426 649 402 C678 407 702 420 721 443 Z" fill="#478c5e" />
      </g>

      <g fill="#ffffff" opacity=".33" filter="url(#hrBlur)">
        <circle cx="81" cy="65" r="30" />
        <circle cx="146" cy="35" r="24" />
        <circle cx="746" cy="72" r="34" />
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
      <p className="hr-campus-hero__tagline">{vi ? 'SAME CLASS  •  BRIGHTER TOMORROW' : 'SAME CLASS  •  BRIGHTER TOMORROW'}</p>

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
      <span className="hr-campus-hero__motto">{vi ? <>DISCIPLINE<br />CREATES<br />FREEDOM</> : <>DISCIPLINE<br />CREATES<br />FREEDOM</>}</span>
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
    </aside>
  </section>;
}
