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
  const towerWindows = Array.from({ length: 15 });
  const wingWindows = Array.from({ length: 12 });

  return <div className="hr-campus-scene" aria-hidden="true">
    <svg className="hr-campus-scene__svg" viewBox="0 0 860 540" preserveAspectRatio="xMidYMid slice">
      <defs>
        <linearGradient id="hrSky" x1="0" y1="0" x2=".9" y2="1">
          <stop offset="0" stopColor="#8ec9ff" />
          <stop offset=".45" stopColor="#cfe9ff" />
          <stop offset=".78" stopColor="#eef8ff" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
        <radialGradient id="hrSun" cx=".78" cy=".08" r=".62">
          <stop offset="0" stopColor="#fff8d8" stopOpacity=".98" />
          <stop offset=".2" stopColor="#fffdf3" stopOpacity=".72" />
          <stop offset=".62" stopColor="#ffffff" stopOpacity=".16" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hrGlassWing" x1=".05" y1=".1" x2=".96" y2=".92">
          <stop offset="0" stopColor="#214c78" />
          <stop offset=".28" stopColor="#467aa7" />
          <stop offset=".62" stopColor="#82b9df" />
          <stop offset="1" stopColor="#d8effc" />
        </linearGradient>
        <linearGradient id="hrGlassWindow" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e8f7ff" />
          <stop offset=".23" stopColor="#bfe4fa" />
          <stop offset=".58" stopColor="#6ca7d2" />
          <stop offset=".86" stopColor="#4777a5" />
          <stop offset="1" stopColor="#315e8b" />
        </linearGradient>
        <linearGradient id="hrGlassReflection" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity=".76" />
          <stop offset=".28" stopColor="#ffffff" stopOpacity=".16" />
          <stop offset=".62" stopColor="#9fd7ff" stopOpacity=".04" />
          <stop offset="1" stopColor="#ffffff" stopOpacity=".38" />
        </linearGradient>
        <linearGradient id="hrFacade" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset=".42" stopColor="#fbfcfd" />
          <stop offset=".74" stopColor="#edf2f6" />
          <stop offset="1" stopColor="#d8e1ea" />
        </linearGradient>
        <linearGradient id="hrFacadeEdge" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6f9fb" />
          <stop offset=".55" stopColor="#d8e2eb" />
          <stop offset="1" stopColor="#a9bdcf" />
        </linearGradient>
        <linearGradient id="hrCanopy" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e8f2f8" />
          <stop offset="1" stopColor="#becfdd" />
        </linearGradient>
        <linearGradient id="hrGround" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#c4dfa8" />
          <stop offset=".6" stopColor="#8dbb73" />
          <stop offset="1" stopColor="#6d9e5e" />
        </linearGradient>
        <linearGradient id="hrLeaf" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#82bf78" />
          <stop offset=".45" stopColor="#4d9665" />
          <stop offset="1" stopColor="#245f49" />
        </linearGradient>
        <filter id="hrBuildingShadow" x="-30%" y="-30%" width="170%" height="190%">
          <feDropShadow dx="0" dy="20" stdDeviation="17" floodColor="#244d74" floodOpacity=".22" />
        </filter>
        <filter id="hrSoftBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
        <filter id="hrLeafBlur" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <filter id="hrFacadeTexture" x="-15%" y="-15%" width="130%" height="130%">
          <feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="8" result="noise" />
          <feColorMatrix in="noise" type="saturate" values="0" result="mono" />
          <feComponentTransfer in="mono" result="faded">
            <feFuncA type="table" tableValues="0 .035" />
          </feComponentTransfer>
          <feBlend in="SourceGraphic" in2="faded" mode="multiply" />
        </filter>
        <filter id="hrWarmGlow" x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="18" />
        </filter>
      </defs>

      <rect width="860" height="540" fill="url(#hrSky)" />
      <rect width="860" height="540" fill="url(#hrSun)" />
      <ellipse cx="670" cy="74" rx="138" ry="82" fill="#fff2b2" opacity=".18" filter="url(#hrWarmGlow)" />
      <path d="M575 -10 L708 -10 L448 540 L337 540 Z" fill="#fff5c9" opacity=".08" />

      <path d="M0 466 C129 438 258 450 379 475 C506 501 653 497 860 446 L860 540 L0 540 Z" fill="url(#hrGround)" />
      <path d="M0 504 C172 476 324 486 455 510 C593 535 731 510 860 482 L860 540 L0 540 Z" fill="#e5f0da" opacity=".76" />

      <g filter="url(#hrBuildingShadow)">
        <path d="M122 237 L335 102 C351 92 371 89 390 94 L431 105 L431 446 L151 446 Z" fill="url(#hrGlassWing)" />
        <path d="M431 105 L678 69 C731 61 771 91 775 139 L786 446 L431 446 Z" fill="url(#hrFacade)" filter="url(#hrFacadeTexture)" />
        <path d="M661 72 C713 66 748 91 752 136 L762 446 L704 446 L698 132 C697 105 686 86 661 72 Z" fill="url(#hrFacadeEdge)" />
        <path d="M430 105 L467 100 L475 446 L431 446 Z" fill="#cfdae4" />
        <path d="M474 113 L520 107 L527 446 L482 446 Z" fill="#f7fafc" />
        <path d="M151 414 L786 414 L787 446 L151 446 Z" fill="url(#hrCanopy)" opacity=".96" />
      </g>

      <g opacity=".92">
        {wingWindows.map((_, index) => {
          const col = index % 3;
          const row = Math.floor(index / 3);
          const x = 172 + col * 67;
          const y = 207 + row * 56;
          return <g key={`wing-${index}`}>
            <rect x={x} y={y} width="48" height="37" rx="3" fill="url(#hrGlassWindow)" />
            <path d={`M${x + 2} ${y + 2} L${x + 35} ${y + 2} L${x + 16} ${y + 35} L${x + 2} ${y + 35} Z`} fill="url(#hrGlassReflection)" opacity=".34" />
          </g>;
        })}
      </g>

      <g fill="none" stroke="#c7d4df" strokeWidth="1.8" opacity=".76">
        <path d="M537 104 L544 423" />
        <path d="M594 96 L600 423" />
        <path d="M651 87 L657 423" />
        <path d="M709 88 L716 423" />
      </g>

      <g opacity=".96">
        {towerWindows.map((_, index) => {
          const col = index % 5;
          const row = Math.floor(index / 5);
          const x = 529 + col * 43;
          const y = 247 + row * 64;
          return <g key={`tower-${index}`}>
            <rect x={x} y={y} width="29" height="45" rx="2.5" fill="url(#hrGlassWindow)" />
            <rect x={x + 2} y={y + 2} width="7" height="40" rx="2" fill="#ffffff" opacity=".16" />
          </g>;
        })}
      </g>

      <path d="M424 116 C500 101 579 90 670 77" fill="none" stroke="#ffffff" strokeWidth="3" opacity=".66" />
      <path d="M434 126 C514 113 594 102 678 91" fill="none" stroke="#dfe9f1" strokeWidth="1" opacity=".72" />

      <g transform="translate(548 171) rotate(-5)">
        <text x="0" y="0" fill="#687c93" fontFamily="Georgia, 'Times New Roman', serif" fontSize="20" opacity=".74">Better</text>
        <text x="-1" y="26" fill="#687c93" fontFamily="Georgia, 'Times New Roman', serif" fontSize="20" opacity=".72">Students</text>
        <text x="-3" y="52" fill="#687c93" fontFamily="Georgia, 'Times New Roman', serif" fontSize="20" opacity=".7">Brighter</text>
        <text x="-5" y="78" fill="#687c93" fontFamily="Georgia, 'Times New Roman', serif" fontSize="20" opacity=".68">Tomorrows</text>
      </g>

      <g opacity=".97">
        <path d="M40 540 C46 476 71 420 116 373 C114 431 114 486 111 540 Z" fill="#235e47" />
        <path d="M93 433 C56 417 29 387 14 350 C54 357 88 373 114 402 Z" fill="url(#hrLeaf)" />
        <path d="M110 403 C91 360 97 323 116 293 C141 329 150 369 134 410 Z" fill="url(#hrLeaf)" />
        <path d="M113 465 C157 438 197 433 233 446 C204 476 166 493 120 497 Z" fill="url(#hrLeaf)" />
        <path d="M131 416 C168 382 208 368 243 375 C219 410 181 432 139 444 Z" fill="url(#hrLeaf)" />

        <path d="M722 540 C726 488 744 445 780 408 C785 460 784 506 782 540 Z" fill="#255f47" />
        <path d="M758 451 C723 434 696 408 683 378 C717 383 747 397 771 422 Z" fill="url(#hrLeaf)" />
        <path d="M778 417 C764 377 772 341 793 314 C812 352 816 390 802 424 Z" fill="url(#hrLeaf)" />
      </g>

      <g opacity=".58" filter="url(#hrLeafBlur)">
        <circle cx="28" cy="36" r="37" fill="#4e8b5d" />
        <circle cx="71" cy="18" r="29" fill="#78ad72" />
        <circle cx="111" cy="46" r="33" fill="#477c57" />
        <circle cx="850" cy="33" r="30" fill="#58945e" />
      </g>

      <g opacity=".18" fill="#ffffff" filter="url(#hrSoftBlur)">
        <circle cx="618" cy="84" r="45" />
        <circle cx="745" cy="118" r="28" />
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
