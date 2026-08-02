import React from 'react';

function getInitials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!parts.length) return 'GV';
  return parts
    .slice(-2)
    .map((part) => part.charAt(0))
    .join('')
    .toUpperCase();
}

function WorkspaceIcon() {
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

function StudentsIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <circle cx="9" cy="8" r="3" />
    <circle cx="17" cy="9" r="2.5" />
    <path d="M3.5 20c.4-4.1 2.2-6.2 5.5-6.2s5.1 2.1 5.5 6.2" />
    <path d="M14.2 14.5c3.8-.5 5.9 1.3 6.3 4.7" />
  </svg>;
}

function GraduationCapIcon() {
  return <svg viewBox="0 0 120 120" aria-hidden="true">
    <path d="M12 48.5 60 25l48 23.5L60 72 12 48.5Z" />
    <path d="M31 59v22c10.5 11 47.5 11 58 0V59" />
    <path d="M103 51v24" />
    <circle cx="103" cy="81" r="5" />
  </svg>;
}

function SparkleIcon() {
  return <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 2.5c.8 5.6 3.9 8.7 9.5 9.5-5.6.8-8.7 3.9-9.5 9.5-.8-5.6-3.9-8.7-9.5-9.5C8.1 11.2 11.2 8.1 12 2.5Z" />
  </svg>;
}

function CampusBackdrop() {
  return <svg className="hr-glass-hero__campus" viewBox="0 0 1400 420" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
    <g className="hr-glass-hero__campus-skyline">
      <path d="M0 338h1400v82H0z" />
      <path d="M90 302h235v38H90zM125 219h164v83H125zM152 180h110v39H152z" />
      <path d="M170 145h74v35h-74zM188 114h38v31h-38z" />
      <path d="M1110 257h208v82h-208zM1154 210h120v47h-120z" />
      <path d="M455 274h354v66H455zM501 217h262v57H501z" />
      <path d="m632 160 103 57H529l103-57Z" />
      <path d="M623 132h18v37h-18z" />
    </g>
    <g className="hr-glass-hero__campus-windows">
      <path d="M145 239h22v24h-22zM187 239h22v24h-22zM229 239h22v24h-22zM145 275h22v24h-22zM187 275h22v24h-22zM229 275h22v24h-22z" />
      <path d="M538 236h29v22h-29zM588 236h29v22h-29zM638 236h29v22h-29zM688 236h29v22h-29z" />
      <path d="M1140 278h26v26h-26zM1180 278h26v26h-26zM1220 278h26v26h-26zM1260 278h26v26h-26z" />
    </g>
    <g className="hr-glass-hero__campus-trees">
      <circle cx="42" cy="303" r="43" /><path d="M38 302h8v45h-8z" />
      <circle cx="363" cy="315" r="38" /><path d="M359 313h8v35h-8z" />
      <circle cx="855" cy="304" r="46" /><path d="M851 305h8v43h-8z" />
      <circle cx="1056" cy="319" r="35" /><path d="M1052 318h8v31h-8z" />
      <circle cx="1362" cy="301" r="47" /><path d="M1358 301h8v47h-8z" />
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
    className={`hr-glass-hero ${subjectMode ? 'is-subject' : 'is-homeroom'}`}
    aria-labelledby="hr-glass-hero-title"
    data-class-type={classTypeLabel}
  >
    <div className="hr-glass-hero__backdrop" aria-hidden="true">
      <CampusBackdrop />
      <span className="hr-glass-hero__orb orb-one" />
      <span className="hr-glass-hero__orb orb-two" />
      <span className="hr-glass-hero__orb orb-three" />
    </div>

    <div className="hr-glass-hero__primary">
      <div className="hr-glass-hero__eyebrow">
        <span className="hr-glass-hero__eyebrow-icon"><WorkspaceIcon /></span>
        <span>{workspaceLabel}</span>
      </div>

      <div className="hr-glass-hero__class-heading">
        <span>{vi ? 'Lớp' : 'Class'}</span>
        <h1 id="hr-glass-hero-title">{className}</h1>
      </div>

      <div className="hr-glass-hero__teacher-line">
        <span>{roleShort}</span>
        <strong>{teacherName}</strong>
      </div>

      <div className="hr-glass-hero__metrics" role="list" aria-label={vi ? 'Thông tin lớp' : 'Class information'}>
        <div className="hr-glass-hero__metric" role="listitem">
          <span className="hr-glass-hero__metric-icon"><CalendarIcon /></span>
          <span>
            <small>{vi ? 'Năm học' : 'School year'}</small>
            <strong>{schoolYear}</strong>
          </span>
        </div>
        <div className="hr-glass-hero__metric" role="listitem">
          <span className="hr-glass-hero__metric-icon"><StudentsIcon /></span>
          <span>
            <small>{vi ? 'Sĩ số' : 'Students'}</small>
            <strong>{activeStudents} {vi ? 'học sinh' : 'students'}</strong>
          </span>
        </div>
      </div>
    </div>

    <div className="hr-glass-hero__visual" aria-hidden="true">
      <span className="hr-glass-hero__float-tile tile-people"><StudentsIcon /></span>
      <span className="hr-glass-hero__float-tile tile-book"><span>✓</span></span>
      <div className="hr-glass-hero__cap">
        <GraduationCapIcon />
      </div>
      <span className="hr-glass-hero__float-tile tile-calendar"><CalendarIcon /></span>
    </div>

    <aside className="hr-glass-hero__teacher-card" aria-label={roleLong}>
      <div className="hr-glass-hero__teacher-kicker">
        <span />
        {roleLong}
      </div>

      <div className="hr-glass-hero__profile">
        <span className="hr-glass-hero__avatar" aria-hidden="true">{initials}</span>
        <span className="hr-glass-hero__profile-copy">
          <strong>{teacherName}</strong>
          {teacherEmail
            ? <a href={`mailto:${teacherEmail}`}>{teacherEmail}</a>
            : <small>{vi ? 'Chưa có email' : 'No email provided'}</small>}
        </span>
      </div>

      <div className="hr-glass-hero__divider" />

      <div className="hr-glass-hero__status-list">
        <span className={`hr-glass-hero__status status-${syncState}`}>
          <i />
          {syncLabel}
        </span>
        <span className="hr-glass-hero__status status-focus">
          <SparkleIcon />
          {focusLabel}
        </span>
      </div>
    </aside>
  </section>;
}
