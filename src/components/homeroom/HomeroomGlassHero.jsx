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

function GraduationCap() {
  return <svg viewBox="0 0 140 140" aria-hidden="true">
    <defs>
      <linearGradient id="hr-material-cap-top" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#4f8df7" />
        <stop offset="1" stopColor="#0b57d0" />
      </linearGradient>
      <linearGradient id="hr-material-cap-body" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0" stopColor="#2f75e8" />
        <stop offset="1" stopColor="#174ea6" />
      </linearGradient>
    </defs>
    <path fill="url(#hr-material-cap-top)" d="M12 55.5 70 27l58 28.5L70 84 12 55.5Z" />
    <path fill="url(#hr-material-cap-body)" d="M35 69v27c12.5 13.5 57.5 13.5 70 0V69L70 87 35 69Z" />
    <path fill="none" stroke="#8ab4f8" strokeLinecap="round" strokeWidth="5" d="M121 61v29" />
    <circle cx="121" cy="98" r="7" fill="#8ab4f8" />
  </svg>;
}

function MaterialIllustration() {
  return <svg className="hr-material-hero__illustration" viewBox="0 0 420 300" aria-hidden="true">
    <defs>
      <linearGradient id="hr-material-board" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#dbeafe" />
        <stop offset="1" stopColor="#c2e7ff" />
      </linearGradient>
    </defs>
    <circle cx="210" cy="150" r="120" fill="#eef4ff" />
    <circle cx="210" cy="150" r="88" fill="#e8f0fe" />
    <rect x="113" y="73" width="194" height="125" rx="24" fill="url(#hr-material-board)" />
    <rect x="132" y="92" width="76" height="14" rx="7" fill="#fff" />
    <rect x="132" y="116" width="116" height="10" rx="5" fill="#fff" opacity=".76" />
    <rect x="132" y="135" width="93" height="10" rx="5" fill="#fff" opacity=".6" />
    <circle cx="276" cy="111" r="15" fill="#34a853" opacity=".9" />
    <path d="m269 111 5 5 10-11" fill="none" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" />
    <g transform="translate(157 90) scale(.75)"><GraduationCap /></g>
    <rect x="147" y="220" width="126" height="16" rx="8" fill="#bdc1c6" opacity=".5" />
    <rect x="174" y="242" width="72" height="9" rx="4.5" fill="#dadce0" />
    <circle cx="85" cy="92" r="18" fill="#fef7e0" />
    <circle cx="335" cy="208" r="16" fill="#e6f4ea" />
    <rect x="66" y="174" width="38" height="38" rx="12" fill="#fff" stroke="#d2e3fc" />
    <path d="M75 199v-9h7v9M87 199v-15h7v15" fill="none" stroke="#0b57d0" strokeLinecap="round" strokeWidth="3" />
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
    className={`hr-glass-hero hr-material-hero ${subjectMode ? 'is-subject' : 'is-homeroom'}`}
    aria-labelledby="hr-material-hero-title"
    data-class-type={classTypeLabel}
  >
    <div className="hr-material-hero__main">
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

      <div className="hr-material-hero__metrics" role="list" aria-label={vi ? 'Thông tin lớp' : 'Class information'}>
        <div className="hr-material-hero__metric" role="listitem">
          <span className="hr-material-hero__metric-icon"><CalendarIcon /></span>
          <span><small>{vi ? 'Năm học' : 'School year'}</small><strong>{schoolYear}</strong></span>
        </div>
        <div className="hr-material-hero__metric" role="listitem">
          <span className="hr-material-hero__metric-icon"><PeopleIcon /></span>
          <span><small>{vi ? 'Sĩ số' : 'Students'}</small><strong>{activeStudents} {vi ? 'học sinh' : 'students'}</strong></span>
        </div>
      </div>
    </div>

    <div className="hr-material-hero__visual" aria-hidden="true">
      <MaterialIllustration />
    </div>

    <aside className="hr-material-hero__teacher-card" aria-label={roleLong}>
      <div className="hr-material-hero__teacher-kicker">
        <span />
        {roleLong}
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
