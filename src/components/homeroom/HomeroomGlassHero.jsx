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
  return <div className="hr-editorial-detail">
    <span className="hr-editorial-detail__icon"><Icon type={icon} /></span>
    <span><small>{label}</small><strong>{value}</strong></span>
  </div>;
}

function EditorialDossier({ className, activeStudents, vi }) {
  const rows = Math.max(5, Math.min(8, activeStudents || 6));
  return <div className="hr-editorial-dossier" aria-hidden="true">
    <span className="hr-editorial-grid-paper" />
    <span className="hr-editorial-ink-brush" />
    <span className="hr-editorial-dots" />

    <div className="hr-editorial-leaves">
      <i /><i /><i /><i /><i />
    </div>

    <div className="hr-editorial-notebook">
      <span className="hr-editorial-notebook__crest">B</span>
      <strong>BRIAN<br />ENGLISH</strong>
      <small>{vi ? 'HỒ SƠ CHỦ NHIỆM' : 'HOMEROOM DOSSIER'}</small>
      <span className="hr-editorial-notebook__label">{className}</span>
    </div>

    <div className="hr-editorial-roster-paper">
      <span className="hr-editorial-paperclip" />
      <span className="hr-editorial-roster-stamp">{className}</span>
      <small>{vi ? 'DANH SÁCH HỌC SINH' : 'STUDENT ROSTER'}</small>
      <div className="hr-editorial-roster-head"><span>STT</span><span>{vi ? 'HỌ VÀ TÊN' : 'NAME'}</span><span>{vi ? 'GHI CHÚ' : 'NOTE'}</span></div>
      <div className="hr-editorial-roster-rows">
        {Array.from({ length: rows }).map((_, index) => <div key={index}><b>{String(index + 1).padStart(2, '0')}</b><span /><i /></div>)}
      </div>
    </div>

    <div className="hr-editorial-note-card">
      <small>HOMEROOM</small>
      <strong>{className}</strong>
      <span>{vi ? 'Brian English · Class record' : 'Brian English · Class record'}</span>
    </div>
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
    className={`hr-editorial-hero ${subjectMode ? 'is-subject' : 'is-homeroom'}`}
    aria-labelledby="hr-editorial-hero-title"
    data-class-type={classTypeLabel}
  >
    <div className="hr-editorial-hero__copy">
      <div className="hr-editorial-hero__masthead">
        <span>01</span><i /><b>{workspaceLabel}</b>
      </div>

      <h1 id="hr-editorial-hero-title">{vi ? 'Lớp' : 'Class'} <em id="hr-material-hero-title">{className}</em></h1>
      <p className="hr-editorial-hero__teacher-name"><span>{roleShort}</span>{teacherName}</p>
      <p className="hr-editorial-hero__deck">{vi
        ? 'Hồ sơ lớp học, danh sách học sinh và các tác vụ chủ nhiệm được gom trong một không gian làm việc thống nhất.'
        : 'Class records, student roster and homeroom actions in one focused workspace.'}</p>

      <div className="hr-editorial-hero__ledger" aria-label={vi ? 'Thông tin lớp' : 'Class information'}>
        <Detail icon="calendar" label={vi ? 'Năm học' : 'School year'} value={schoolYear} />
        <Detail icon="people" label={vi ? 'Sĩ số' : 'Students'} value={`${activeStudents} ${vi ? 'học sinh' : 'students'}`} />
        <Detail icon="room" label={vi ? 'Phòng học' : 'Room'} value={room} />
        <Detail icon="grade" label={vi ? 'Khối' : 'Grade'} value={grade} />
      </div>

      <div className="hr-editorial-hero__actions" aria-label={vi ? 'Thao tác lớp' : 'Class actions'}>
        <button type="button" className="is-dark" onClick={() => navigate(subjectMode ? 'classes' : 'overview')}><Icon type="class" />{vi ? 'Quản lý lớp' : 'Manage class'}</button>
        <button type="button" onClick={() => navigate('students')}><Icon type="people" />{vi ? 'Học sinh' : 'Students'}</button>
        <button type="button" onClick={exportRoster}><Icon type="download" />{vi ? 'Xuất danh sách' : 'Export roster'}</button>
        <button type="button" className="is-primary" onClick={addStudent}><Icon type="plus" />{vi ? 'Thêm học sinh' : 'Add student'}</button>
      </div>
    </div>

    <div className="hr-editorial-hero__art">
      <EditorialDossier className={className} activeStudents={activeStudents} vi={vi} />

      <aside className="hr-editorial-profile" aria-label={roleLong}>
        <div className="hr-editorial-profile__top">
          <span className="hr-editorial-profile__avatar">{initials}</span>
          <span><strong>{teacherName}</strong><small>{roleLong}</small>{teacherEmail ? <a href={`mailto:${teacherEmail}`}>{teacherEmail}</a> : null}</span>
        </div>
        <div className="hr-editorial-profile__rule" />
        <div className="hr-editorial-profile__stats">
          <span><small>{vi ? 'Lớp phụ trách' : 'Class'}</small><strong>{className}</strong></span>
          <span><small>{vi ? 'Sĩ số' : 'Students'}</small><strong>{activeStudents}</strong></span>
        </div>
        <div className="hr-editorial-profile__status"><i className={syncState === 'cloud' ? 'is-cloud' : ''} />{syncLabel}</div>
      </aside>
    </div>
  </section>;
}
