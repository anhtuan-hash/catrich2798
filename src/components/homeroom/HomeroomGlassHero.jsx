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
    <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
    <path d="M8 3.5v3.5M16 3.5v3.5M3.5 9.5h17" />
    <path d="M8 13.5h2M14 13.5h2M8 17h2M14 17h2" />
  </svg>;
}

function PeopleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="9" cy="8" r="3" />
    <circle cx="17" cy="9" r="2.4" />
    <path d="M3.5 20c.4-4.1 2.2-6.2 5.5-6.2s5.1 2.1 5.5 6.2" />
    <path d="M14.5 14.7c3.6-.4 5.6 1.3 6 4.5" />
  </svg>;
}

function RoomIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 21V5.8c0-.8.5-1.5 1.3-1.7l9-2.1c1.1-.3 2.2.6 2.2 1.7V21" />
    <path d="M3 21h18M9 9h3M9 13h3M9 17h3" />
  </svg>;
}

function GradeIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m4 8 8-4 8 4-8 4-8-4Z" />
    <path d="M7 10.5v5.2c2.1 2.2 7.9 2.2 10 0v-5.2M20 8v6" />
  </svg>;
}

function BookIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 5.5c3.3-.8 5.8-.2 8 1.7v12c-2.2-1.9-4.7-2.5-8-1.7v-12Z" />
    <path d="M20 5.5c-3.3-.8-5.8-.2-8 1.7v12c2.2-1.9 4.7-2.5 8-1.7v-12Z" />
  </svg>;
}

function ChartIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 19V11M12 19V5M19 19v-7" />
  </svg>;
}

function CheckIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="12" cy="12" r="9" />
    <path d="m8 12.1 2.6 2.6 5.8-5.8" />
  </svg>;
}

function SparkleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3c.7 5.2 3.8 8.3 9 9-5.2.7-8.3 3.8-9 9-.7-5.2-3.8-8.3-9-9 5.2-.7 8.3-3.8 9-9Z" />
  </svg>;
}

function RichMaterialIllustration() {
  return <svg className="hr-material-hero__illustration" viewBox="0 0 520 380" aria-hidden="true">
    <defs>
      <linearGradient id="hr-rich-board" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#dbeafe" />
        <stop offset="1" stopColor="#c2e7ff" />
      </linearGradient>
      <linearGradient id="hr-rich-cap" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#4f8df7" />
        <stop offset="1" stopColor="#0b57d0" />
      </linearGradient>
      <linearGradient id="hr-rich-book" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#34a853" />
        <stop offset="1" stopColor="#188038" />
      </linearGradient>
      <filter id="hr-rich-shadow" x="-30%" y="-30%" width="160%" height="160%">
        <feDropShadow dx="0" dy="10" stdDeviation="12" floodColor="#3c4043" floodOpacity=".16" />
      </filter>
    </defs>

    <path d="M80 86c28-52 88-73 139-47 44-42 117-40 159 7 63-7 112 37 112 96 0 57-44 100-101 102-23 61-88 92-147 71-45 36-113 29-150-16-67-2-107-69-77-128 8-38 31-67 65-85Z" fill="#edf4ff" />
    <circle cx="94" cy="91" r="28" fill="#fef7e0" />
    <circle cx="445" cy="278" r="31" fill="#e6f4ea" />
    <circle cx="421" cy="80" r="18" fill="#fce8e6" />
    <rect x="104" y="68" width="312" height="222" rx="42" fill="#fff" stroke="#d2e3fc" strokeWidth="2" filter="url(#hr-rich-shadow)" />
    <rect x="132" y="94" width="256" height="150" rx="28" fill="url(#hr-rich-board)" />

    <rect x="154" y="116" width="94" height="15" rx="7.5" fill="#fff" />
    <rect x="154" y="143" width="130" height="10" rx="5" fill="#fff" opacity=".82" />
    <rect x="154" y="163" width="105" height="10" rx="5" fill="#fff" opacity=".65" />

    <g transform="translate(221 121)">
      <path fill="url(#hr-rich-cap)" d="M0 42 68 9l68 33-68 33L0 42Z" />
      <path fill="#174ea6" d="M27 58v31c15 16 67 16 82 0V58L68 78 27 58Z" />
      <path d="M127 49v34" fill="none" stroke="#8ab4f8" strokeLinecap="round" strokeWidth="6" />
      <circle cx="127" cy="92" r="8" fill="#8ab4f8" />
    </g>

    <circle cx="357" cy="119" r="19" fill="#34a853" />
    <path d="m348 119 6 6 12-13" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="5" />

    <g transform="translate(85 234) rotate(-8)" filter="url(#hr-rich-shadow)">
      <rect width="90" height="72" rx="18" fill="#fff" stroke="#f9ab00" strokeWidth="2" />
      <rect x="15" y="14" width="60" height="9" rx="4.5" fill="#f9ab00" opacity=".8" />
      <rect x="15" y="34" width="27" height="23" rx="7" fill="#fef7e0" />
      <rect x="48" y="34" width="27" height="23" rx="7" fill="#fef7e0" />
    </g>

    <g transform="translate(362 228) rotate(7)" filter="url(#hr-rich-shadow)">
      <rect width="86" height="76" rx="18" fill="#fff" stroke="#34a853" strokeWidth="2" />
      <path d="M18 55V34M40 55V20M62 55V29" fill="none" stroke="#34a853" strokeLinecap="round" strokeWidth="8" />
    </g>

    <g transform="translate(198 270)" filter="url(#hr-rich-shadow)">
      <path d="M0 28c25-11 45-8 62 7v52c-17-15-37-18-62-7V28Z" fill="url(#hr-rich-book)" />
      <path d="M124 28c-25-11-45-8-62 7v52c17-15 37-18 62-7V28Z" fill="#5bb974" />
      <path d="M62 35v52" stroke="#d7f3df" strokeWidth="4" />
    </g>

    <rect x="170" y="310" width="180" height="17" rx="8.5" fill="#bdc1c6" opacity=".5" />
    <rect x="214" y="338" width="92" height="10" rx="5" fill="#dadce0" />

    <g fill="#4285f4">
      <circle cx="60" cy="171" r="7" /><circle cx="470" cy="172" r="8" />
    </g>
    <g fill="#ea4335">
      <circle cx="72" cy="133" r="5" /><circle cx="457" cy="125" r="6" />
    </g>
    <g fill="#fbbc04">
      <circle cx="112" cy="334" r="7" /><circle cx="405" cy="336" r="6" />
    </g>
    <g fill="#34a853">
      <circle cx="51" cy="221" r="6" /><circle cx="471" cy="226" r="7" />
    </g>
  </svg>;
}

function DetailTile({ tone, icon, label, value }) {
  return <div className={`hr-material-hero__detail tone-${tone}`} role="listitem">
    <span className="hr-material-hero__detail-icon">{icon}</span>
    <span className="hr-material-hero__detail-copy">
      <small>{label}</small>
      <strong>{value}</strong>
    </span>
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
    className={`hr-glass-hero hr-material-hero ${subjectMode ? 'is-subject' : 'is-homeroom'}`}
    aria-labelledby="hr-material-hero-title"
    data-class-type={classTypeLabel}
  >
    <div className="hr-material-hero__accent" aria-hidden="true">
      <span className="blue" /><span className="red" /><span className="yellow" /><span className="green" />
    </div>
    <span className="hr-material-hero__shape shape-one" aria-hidden="true" />
    <span className="hr-material-hero__shape shape-two" aria-hidden="true" />
    <span className="hr-material-hero__shape shape-three" aria-hidden="true" />

    <article className="hr-material-hero__class-panel">
      <div className="hr-material-hero__eyebrow">
        <span className="hr-material-hero__eyebrow-icon"><GridIcon /></span>
        <span>{workspaceLabel}</span>
      </div>

      <div className="hr-material-hero__class-row">
        <span>{vi ? 'Lớp' : 'Class'}</span>
        <h1 id="hr-material-hero-title">{className}</h1>
      </div>

      <div className="hr-material-hero__teacher-line">
        <span>{roleShort}</span>
        <strong>{teacherName}</strong>
      </div>

      <div className="hr-material-hero__details" role="list" aria-label={vi ? 'Thông tin lớp' : 'Class information'}>
        <DetailTile tone="blue" icon={<CalendarIcon />} label={vi ? 'Năm học' : 'School year'} value={schoolYear} />
        <DetailTile tone="green" icon={<PeopleIcon />} label={vi ? 'Sĩ số' : 'Students'} value={`${activeStudents} ${vi ? 'học sinh' : 'students'}`} />
        <DetailTile tone="yellow" icon={<RoomIcon />} label={vi ? 'Phòng học' : 'Room'} value={room} />
        <DetailTile tone="red" icon={<GradeIcon />} label={vi ? 'Khối' : 'Grade'} value={grade} />
      </div>
    </article>

    <div className="hr-material-hero__visual" aria-hidden="true">
      <RichMaterialIllustration />
      <span className="hr-material-hero__visual-chip chip-book"><BookIcon /></span>
      <span className="hr-material-hero__visual-chip chip-chart"><ChartIcon /></span>
      <span className="hr-material-hero__visual-chip chip-people"><PeopleIcon /></span>
    </div>

    <aside className="hr-material-hero__teacher-card" aria-label={roleLong}>
      <div className="hr-material-hero__teacher-banner">
        <span className="hr-material-hero__teacher-dot" />
        <span>{roleLong}</span>
      </div>

      <div className="hr-material-hero__profile">
        <span className="hr-material-hero__avatar" aria-hidden="true">{initials}</span>
        <span className="hr-material-hero__profile-copy">
          <strong>{teacherName}</strong>
          {teacherEmail
            ? <a href={`mailto:${teacherEmail}`}>{teacherEmail}</a>
            : <small>{vi ? 'Chưa có email' : 'No email provided'}</small>}
        </span>
      </div>

      <div className="hr-material-hero__teacher-summary">
        <span><small>{vi ? 'Lớp phụ trách' : 'Class'}</small><strong>{className}</strong></span>
        <span><small>{vi ? 'Sĩ số' : 'Students'}</small><strong>{activeStudents}</strong></span>
      </div>

      <div className="hr-material-hero__divider" />

      <div className="hr-material-hero__status-list">
        <span className={`hr-material-hero__status status-${syncState}`}>
          <CheckIcon />
          {syncLabel}
        </span>
        <span className="hr-material-hero__status status-focus">
          <SparkleIcon />
          {focusLabel}
        </span>
      </div>
    </aside>
  </section>;
}
