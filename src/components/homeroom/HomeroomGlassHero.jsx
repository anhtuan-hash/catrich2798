import React from 'react';

function getInitials(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'GV';
  return parts.slice(-2).map((part) => part.charAt(0)).join('').toUpperCase();
}

function GridIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="3" width="7" height="7" rx="2" />
    <rect x="14" y="3" width="7" height="7" rx="2" />
    <rect x="3" y="14" width="7" height="7" rx="2" />
    <rect x="14" y="14" width="7" height="7" rx="2" />
  </svg>;
}

function CalendarIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="3" y="5" width="18" height="16" rx="3" />
    <path d="M8 3v4M16 3v4M3 10h18" />
    <path d="M8 14h2M14 14h2M8 18h2M14 18h2" />
  </svg>;
}

function PeopleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="9" cy="8" r="3" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M3.5 20c.4-4.1 2.2-6.2 5.5-6.2s5.1 2.1 5.5 6.2" />
    <path d="M14.2 14.5c3.8-.5 5.9 1.3 6.3 4.7" />
  </svg>;
}

function ChartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 19V11M12 19V5M19 19v-7" />
  </svg>;
}

function SparkleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.5c.8 5.6 3.9 8.7 9.5 9.5-5.6.8-8.7 3.9-9.5 9.5-.8-5.6-3.9-8.7-9.5-9.5C8.1 11.2 11.2 8.1 12 2.5Z" />
  </svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12 2.6 2.6L16.5 9" />
  </svg>;
}

function GraduationCap() {
  return <svg viewBox="0 0 140 140" aria-hidden="true">
    <defs>
      <linearGradient id="hr-cap-top" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#4de7ff" />
        <stop offset=".55" stopColor="#238cf7" />
        <stop offset="1" stopColor="#1b45d7" />
      </linearGradient>
      <linearGradient id="hr-cap-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2ea8ff" />
        <stop offset="1" stopColor="#2739c4" />
      </linearGradient>
    </defs>
    <path fill="url(#hr-cap-top)" d="M12 55.5 70 27l58 28.5L70 84 12 55.5Z" />
    <path fill="url(#hr-cap-body)" d="M35 69v27c12.5 13.5 57.5 13.5 70 0V69L70 87 35 69Z" />
    <path fill="none" stroke="#6ef5ff" strokeLinecap="round" strokeWidth="5" d="M121 61v29" />
    <circle cx="121" cy="98" r="7" fill="#6ef5ff" />
  </svg>;
}

function CinematicBackdrop() {
  return <svg className="hr-cinematic-hero__scene" viewBox="0 0 1600 560" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <defs>
      <linearGradient id="hr-scene-sky" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#041c51" />
        <stop offset=".48" stopColor="#083c86" />
        <stop offset="1" stopColor="#087ab5" />
      </linearGradient>
      <radialGradient id="hr-scene-glow" cx="50%" cy="54%" r="48%">
        <stop offset="0" stopColor="#1cd8ff" stopOpacity=".72" />
        <stop offset=".34" stopColor="#0d87df" stopOpacity=".32" />
        <stop offset="1" stopColor="#051a49" stopOpacity="0" />
      </radialGradient>
      <linearGradient id="hr-scene-floor" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#0a63a0" stopOpacity=".06" />
        <stop offset="1" stopColor="#021236" stopOpacity=".8" />
      </linearGradient>
      <filter id="hr-scene-blur"><feGaussianBlur stdDeviation="7" /></filter>
    </defs>

    <rect width="1600" height="560" fill="url(#hr-scene-sky)" />
    <rect width="1600" height="560" fill="url(#hr-scene-glow)" />

    <g opacity=".34" fill="#5bc6e9">
      <path d="M0 382h1600v178H0z" />
      <path d="M80 315h220v80H80zM120 232h146v83H120zM153 185h80v47h-80zM175 139h36v46h-36z" />
      <path d="M1120 282h270v113h-270zM1172 222h166v60h-166zM1214 166h80v56h-80z" />
      <path d="M520 315h410v80H520zM565 252h320v63H565zM720 174l132 78H588l132-78Z" />
      <path d="M710 129h20v57h-20z" />
    </g>

    <g opacity=".36" fill="#d8f8ff">
      <path d="M112 257h24v28h-24zM154 257h24v28h-24zM196 257h24v28h-24zM112 299h24v28h-24zM154 299h24v28h-24zM196 299h24v28h-24z" />
      <path d="M605 278h32v27h-32zM660 278h32v27h-32zM715 278h32v27h-32zM770 278h32v27h-32z" />
      <path d="M1160 309h30v30h-30zM1210 309h30v30h-30zM1260 309h30v30h-30zM1310 309h30v30h-30z" />
    </g>

    <g opacity=".34" fill="#65d9cb">
      <circle cx="42" cy="348" r="54" /><path d="M36 346h12v60H36z" />
      <circle cx="374" cy="356" r="44" /><path d="M369 355h10v53h-10z" />
      <circle cx="1020" cy="348" r="54" /><path d="M1014 347h12v60h-12z" />
      <circle cx="1450" cy="342" r="58" /><path d="M1444 340h12v68h-12z" />
    </g>

    <g fill="none" stroke="#69efff" strokeLinecap="round" opacity=".32">
      <path d="M260 104c175 44 255 103 349 220s229 115 367 42 223-119 374-94" />
      <path d="M210 182c155 19 244 59 342 150s227 111 357 51 238-171 456-146" />
      <path d="M380 67c115 51 177 105 251 181s162 98 270 67 213-113 328-119" />
    </g>

    <g fill="#bdf9ff" opacity=".72">
      <circle cx="260" cy="104" r="4" /><circle cx="441" cy="181" r="3" /><circle cx="609" cy="324" r="4" />
      <circle cx="817" cy="409" r="3" /><circle cx="976" cy="366" r="4" /><circle cx="1166" cy="282" r="3" />
      <circle cx="210" cy="182" r="3" /><circle cx="542" cy="332" r="3" /><circle cx="909" cy="383" r="4" />
      <circle cx="1365" cy="237" r="4" /><circle cx="380" cy="67" r="3" /><circle cx="901" cy="315" r="3" />
    </g>

    <ellipse cx="800" cy="440" rx="340" ry="92" fill="#1cceff" opacity=".12" filter="url(#hr-scene-blur)" />
    <path d="M0 392h1600v168H0z" fill="url(#hr-scene-floor)" />

    <g fill="none" stroke="#5bc7f6" opacity=".14">
      <path d="M0 445h1600M0 485h1600M0 525h1600" />
      <path d="M200 392 60 560M400 392 310 560M600 392 560 560M800 392v168M1000 392l40 168M1200 392l90 168M1400 392l140 168" />
    </g>
  </svg>;
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
  const teacherName = profile.adviserName || currentUser?.name || currentUser?.email || (vi ? 'Giáo viên' : 'Teacher');
  const teacherEmail = profile.adviserEmail || currentUser?.email || '';
  const initials = getInitials(teacherName);
  const roleShort = subjectMode ? 'GVBM' : 'GVCN';
  const roleLong = vi
    ? (subjectMode ? 'Giáo viên bộ môn' : 'Giáo viên chủ nhiệm')
    : (subjectMode ? 'Subject teacher' : 'Homeroom teacher');
  const workspaceLabel = vi
    ? (subjectMode ? 'Không gian lớp bộ môn' : 'Không gian lớp chủ nhiệm')
    : (subjectMode ? 'Subject class workspace' : 'Homeroom workspace');
  const syncLabel = syncState === 'cloud'
    ? (vi ? 'Đã đồng bộ Supabase' : 'Synced with Supabase')
    : (vi ? 'Đang lưu trên thiết bị' : 'Saved on this device');
  const focusLabel = vi
    ? (subjectMode ? 'Không gian bộ môn tinh gọn' : 'Không gian GVCN tinh gọn')
    : (subjectMode ? 'Focused subject workspace' : 'Focused homeroom workspace');

  return <section
    className={`hr-glass-hero hr-cinematic-hero ${subjectMode ? 'is-subject' : 'is-homeroom'}`}
    aria-labelledby="hr-cinematic-title"
    data-class-type={classTypeLabel}
  >
    <div className="hr-cinematic-hero__backdrop" aria-hidden="true">
      <CinematicBackdrop />
      <span className="hr-cinematic-hero__light-beam beam-left" />
      <span className="hr-cinematic-hero__light-beam beam-right" />
      <span className="hr-cinematic-hero__grain" />
    </div>

    <article className="hr-cinematic-hero__card hr-cinematic-hero__class-card">
      <div className="hr-cinematic-hero__eyebrow">
        <span className="hr-cinematic-hero__eyebrow-icon"><GridIcon /></span>
        <span>{workspaceLabel}</span>
      </div>

      <div className="hr-cinematic-hero__class-title">
        <span>{vi ? 'Lớp' : 'Class'}</span>
        <h1 id="hr-cinematic-title">{className}</h1>
      </div>

      <div className="hr-cinematic-hero__teacher-line">
        <span>{roleShort}</span>
        <strong>{teacherName}</strong>
      </div>

      <div className="hr-cinematic-hero__metrics" role="list" aria-label={vi ? 'Thông tin lớp' : 'Class information'}>
        <div className="hr-cinematic-hero__metric" role="listitem">
          <span className="hr-cinematic-hero__metric-icon"><CalendarIcon /></span>
          <span><small>{vi ? 'Năm học' : 'School year'}</small><strong>{schoolYear}</strong></span>
        </div>
        <div className="hr-cinematic-hero__metric" role="listitem">
          <span className="hr-cinematic-hero__metric-icon"><PeopleIcon /></span>
          <span><small>{vi ? 'Sĩ số' : 'Students'}</small><strong>{activeStudents} {vi ? 'học sinh' : 'students'}</strong></span>
        </div>
      </div>
    </article>

    <div className="hr-cinematic-hero__stage" aria-hidden="true">
      <span className="hr-cinematic-hero__floating-icon floating-people"><PeopleIcon /></span>
      <span className="hr-cinematic-hero__floating-icon floating-calendar"><CalendarIcon /></span>
      <span className="hr-cinematic-hero__floating-icon floating-chart"><ChartIcon /></span>
      <span className="hr-cinematic-hero__floating-icon floating-check"><CheckIcon /></span>

      <div className="hr-cinematic-hero__cap-shell">
        <span className="hr-cinematic-hero__cap-aura" />
        <GraduationCap />
      </div>

      <div className="hr-cinematic-hero__pedestal">
        <span className="ring ring-top" />
        <span className="ring ring-middle" />
        <span className="ring ring-bottom" />
        <span className="hr-cinematic-hero__pedestal-light" />
      </div>
    </div>

    <aside className="hr-cinematic-hero__card hr-cinematic-hero__teacher-card" aria-label={roleLong}>
      <div className="hr-cinematic-hero__teacher-kicker">
        <span />
        {roleLong}
      </div>

      <div className="hr-cinematic-hero__profile">
        <span className="hr-cinematic-hero__avatar" aria-hidden="true">{initials}</span>
        <span className="hr-cinematic-hero__profile-copy">
          <strong>{teacherName}</strong>
          {teacherEmail
            ? <a href={`mailto:${teacherEmail}`}>{teacherEmail}</a>
            : <small>{vi ? 'Chưa có email' : 'No email provided'}</small>}
        </span>
      </div>

      <div className="hr-cinematic-hero__divider" />

      <div className="hr-cinematic-hero__status-list">
        <span className={`hr-cinematic-hero__status status-${syncState}`}>
          <CheckIcon />
          {syncLabel}
        </span>
        <span className="hr-cinematic-hero__status status-focus">
          <SparkleIcon />
          {focusLabel}
        </span>
      </div>
    </aside>
  </section>;
}
