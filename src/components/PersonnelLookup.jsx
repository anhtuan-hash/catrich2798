import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { listTeamTeacherAccounts } from '../utils/personnelHub.js';
import {
  cleanPersonnelRecord,
  createEmptyPersonnelDegree,
  emptyPersonnelRecord,
  listPersonnelDirectoryItems,
  migrateLegacyPersonnelRecords,
  reviewPersonnelProposal,
  saveApprovedPersonnelProfile,
  submitPersonnelProposal,
  subscribePersonnelDirectory,
  PERSONNEL_DIRECTORY_EVENT,
} from '../utils/personnelDirectoryCloud.js';
import '../styles/personnel-lookup-google.css';
import '../styles/personnel-workflow-google.css';
import '../styles/personnel-multiple-degrees.css';

const DEGREE_LEVELS = [
  { id: 'doctorate', vi: 'Tiến sĩ', en: 'Doctorate', rank: 5 },
  { id: 'doctoral_candidate', vi: 'Nghiên cứu sinh', en: 'Doctoral candidate', rank: 4 },
  { id: 'master', vi: 'Thạc sĩ', en: "Master's", rank: 3 },
  { id: 'bachelor', vi: 'Cử nhân', en: "Bachelor's", rank: 2 },
  { id: 'college', vi: 'Cao đẳng', en: 'College diploma', rank: 1 },
];

const COPY = {
  vi: {
    eyebrow: 'Tổ Tiếng Anh', title: 'Tra cứu thông tin nhân sự', subtitle: 'Hồ sơ chuyên môn đồng bộ giữa giáo viên và TTCM trên mọi thiết bị.',
    teacherTitle: 'Hồ sơ chuyên môn của tôi', teacherSubtitle: 'Xem thông tin đã được TTCM duyệt và gửi đề xuất khi cần cập nhật.',
    search: 'Tìm theo tên, email, văn bằng, chuyên ngành hoặc phân công', total: 'Tổng nhân sự', postgraduate: 'Sau đại học', masters: 'Có bằng Thạc sĩ', incomplete: 'Thiếu hồ sơ', pending: 'Chờ duyệt',
    all: 'Tất cả', doctorate: 'Tiến sĩ', doctoral_candidate: 'Nghiên cứu sinh', master: 'Thạc sĩ', bachelor: 'Cử nhân', college: 'Cao đẳng', missing: 'Chưa cập nhật', pendingFilter: 'Đề xuất chờ duyệt',
    teacher: 'Giáo viên', position: 'Chức vụ', qualification: 'Trình độ chuyên môn', assignment: 'Phân công', status: 'Trạng thái', workflow: 'Phê duyệt',
    active: 'Đang công tác', leave: 'Tạm nghỉ', inactive: 'Ngừng công tác', core: 'Cơ hữu', visiting: 'Thỉnh giảng',
    approved: 'Đã duyệt', submitted: 'Đang chờ TTCM', changes_requested: 'Cần chỉnh sửa', draft: 'Chưa gửi',
    noQualification: 'Chưa cập nhật trình độ', noMajor: 'Chưa cập nhật chuyên ngành', noAssignment: 'Chưa cập nhật phân công',
    records: 'hồ sơ', loading: 'Đang đồng bộ hồ sơ nhân sự…', empty: 'Không tìm thấy nhân sự phù hợp.',
    profile: 'Hồ sơ nhân sự', linkedAccount: 'Tài khoản giáo viên đã liên kết', professional: 'Trình độ chuyên môn', employment: 'Công tác và phân công',
    highestLevel: 'Trình độ cao nhất', degreeName: 'Tên văn bằng', major: 'Chuyên ngành', specialization: 'Định hướng/chuyên sâu', institution: 'Cơ sở đào tạo', graduationYear: 'Năm tốt nghiệp',
    department: 'Tổ chuyên môn', employmentType: 'Loại nhân sự', phone: 'Điện thoại', otherDegrees: 'Chứng chỉ/văn bằng khác chưa cấu trúc',
    edit: 'Cập nhật trực tiếp', propose: 'Đề xuất chỉnh sửa', updateProposal: 'Cập nhật đề xuất', save: 'Lưu và duyệt', submitProposal: 'Gửi TTCM duyệt', cancel: 'Hủy', close: 'Đóng',
    saved: 'Đã lưu hồ sơ dùng chung.', proposed: 'Đã gửi đề xuất đến TTCM.', approvedNotice: 'Đã duyệt và cập nhật hồ sơ giáo viên.', rejectedNotice: 'Đã gửi yêu cầu chỉnh sửa lại cho giáo viên.',
    positionTtcm: 'TTCM', positionTeacher: 'Giáo viên', suggestedMajor: 'Ví dụ: Ngôn ngữ Anh', suggestedSpecialization: 'Ví dụ: Lý luận và PPDH Tiếng Anh',
    suggestedInstitution: 'Tên trường/cơ sở đào tạo', suggestedAssignment: 'Ví dụ: Khối 12 · Lớp 12.1, 12.6', suggestedOther: 'Mỗi chứng chỉ hoặc văn bằng chưa khai báo ở trên trên một dòng',
    accountNotice: 'Hồ sơ được gắn trực tiếp với tài khoản giáo viên hiện có.', missingNotice: 'Hồ sơ chưa đủ trình độ chuyên môn', updateNow: 'Cập nhật ngay',
    cloudError: 'Không thể đồng bộ hồ sơ dùng chung. Vui lòng kiểm tra kết nối Supabase.', proposalHeading: 'Đề xuất đang chờ duyệt', proposalNote: 'Ghi chú gửi TTCM', proposalNotePlaceholder: 'Nêu ngắn gọn nội dung đã thay đổi hoặc minh chứng cần đối chiếu',
    reviewHeading: 'Đối chiếu thay đổi', currentValue: 'Đang áp dụng', proposedValue: 'Giáo viên đề xuất', reviewNote: 'Phản hồi của TTCM', reviewNotePlaceholder: 'Lý do duyệt, yêu cầu bổ sung hoặc nội dung cần chỉnh sửa', approve: 'Duyệt đề xuất', requestChanges: 'Yêu cầu chỉnh sửa',
    noApprovedProfile: 'Hồ sơ chưa có dữ liệu được duyệt.', waitingMessage: 'Đề xuất của bạn đã được gửi và đang chờ TTCM duyệt.', changesMessage: 'TTCM đã yêu cầu chỉnh sửa lại đề xuất.', syncMessage: 'Dữ liệu được lưu trên Supabase và tự đồng bộ giữa các thiết bị.',
    migrated: 'Đã chuyển dữ liệu cũ trên trình duyệt lên hồ sơ dùng chung.', lastUpdated: 'Cập nhật gần nhất', reviewerFeedback: 'Phản hồi TTCM', noChanges: 'Đề xuất không có thay đổi so với hồ sơ hiện tại.',
    degrees: 'Danh sách văn bằng', degreeCount: 'văn bằng', addDegree: 'Thêm văn bằng', noDegrees: 'Chưa khai báo văn bằng. Nhấn “Thêm văn bằng” để bắt đầu.', degreeNumber: 'Văn bằng', setHighest: 'Đặt làm trình độ cao nhất', highestBadge: 'Cao nhất', removeDegree: 'Xóa văn bằng', multipleDegreeHint: 'Có thể thêm nhiều bằng cùng cấp, ví dụ 2 bằng Thạc sĩ hoặc 2 bằng Cử nhân.', selectLevel: 'Chọn trình độ',
  },
  en: {
    eyebrow: 'English Department', title: 'Personnel directory', subtitle: 'Professional profiles synced between teachers and department leaders on every device.',
    teacherTitle: 'My professional profile', teacherSubtitle: 'View approved information and propose updates for department-leader review.',
    search: 'Search name, email, degree, major or assignment', total: 'Total staff', postgraduate: 'Postgraduate', masters: "Has Master's", incomplete: 'Incomplete', pending: 'Pending review',
    all: 'All', doctorate: 'Doctorate', doctoral_candidate: 'Doctoral candidate', master: "Master's", bachelor: "Bachelor's", college: 'College', missing: 'Not updated', pendingFilter: 'Pending proposals',
    teacher: 'Teacher', position: 'Position', qualification: 'Professional qualification', assignment: 'Assignment', status: 'Status', workflow: 'Approval',
    active: 'Active', leave: 'On leave', inactive: 'Inactive', core: 'Core staff', visiting: 'Visiting',
    approved: 'Approved', submitted: 'Waiting for review', changes_requested: 'Changes requested', draft: 'Not submitted',
    noQualification: 'Qualification not updated', noMajor: 'Major not updated', noAssignment: 'Assignment not updated',
    records: 'records', loading: 'Syncing personnel profiles…', empty: 'No matching personnel found.',
    profile: 'Personnel profile', linkedAccount: 'Linked teacher account', professional: 'Professional qualification', employment: 'Employment and assignment',
    highestLevel: 'Highest qualification', degreeName: 'Degree name', major: 'Major', specialization: 'Specialization', institution: 'Institution', graduationYear: 'Graduation year',
    department: 'Department', employmentType: 'Employment type', phone: 'Phone', otherDegrees: 'Other unstructured degrees/certificates',
    edit: 'Update directly', propose: 'Propose changes', updateProposal: 'Update proposal', save: 'Save and approve', submitProposal: 'Send for review', cancel: 'Cancel', close: 'Close',
    saved: 'Shared profile saved.', proposed: 'Proposal sent to the department leader.', approvedNotice: 'Proposal approved and teacher profile updated.', rejectedNotice: 'Revision request sent to the teacher.',
    positionTtcm: 'Department head', positionTeacher: 'Teacher', suggestedMajor: 'Example: English Language', suggestedSpecialization: 'Example: English Language Teaching',
    suggestedInstitution: 'University or institution', suggestedAssignment: 'Example: Grade 12 · Classes 12.1, 12.6', suggestedOther: 'One remaining certificate or degree per line',
    accountNotice: 'The profile is directly linked to an existing teacher account.', missingNotice: 'Professional qualification is incomplete', updateNow: 'Update now',
    cloudError: 'The shared profile could not be synced. Check the Supabase connection.', proposalHeading: 'Proposal awaiting review', proposalNote: 'Note to department leader', proposalNotePlaceholder: 'Briefly explain what changed or what evidence should be checked',
    reviewHeading: 'Review changes', currentValue: 'Current approved', proposedValue: 'Teacher proposal', reviewNote: 'Department-leader feedback', reviewNotePlaceholder: 'Approval note, missing evidence or requested correction', approve: 'Approve proposal', requestChanges: 'Request changes',
    noApprovedProfile: 'No approved profile data yet.', waitingMessage: 'Your proposal was sent and is waiting for department-leader review.', changesMessage: 'The department leader requested changes to your proposal.', syncMessage: 'Data is stored in Supabase and automatically synced across devices.',
    migrated: 'Legacy browser data was moved to the shared directory.', lastUpdated: 'Last updated', reviewerFeedback: 'Leader feedback', noChanges: 'The proposal contains no changes from the approved profile.',
    degrees: 'Degree list', degreeCount: 'degrees', addDegree: 'Add degree', noDegrees: 'No degree declared. Select “Add degree” to begin.', degreeNumber: 'Degree', setHighest: 'Set as highest qualification', highestBadge: 'Highest', removeDegree: 'Remove degree', multipleDegreeHint: 'Multiple degrees at the same level are supported, such as two master’s or bachelor’s degrees.', selectLevel: 'Select level',
  },
};

const MATERIAL_PATHS = {
  groups: 'M16 11c1.66 0 3-1.34 3-3s-1.34-3-3 1.34-3 3 1.34 3 3 3Zm-8 0c1.66 0 3-1.34 3-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 1.34 3 3 3Zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5C15 14.17 10.33 13 8 13Zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5Z',
  search: 'M9.5 3a6.5 6.5 0 1 0 3.98 11.64L19.85 21 21 19.85l-6.36-6.37A6.5 6.5 0 0 0 9.5 3Zm0 2a4.5 4.5 0 1 1 0 9 4.5 4.5 0 0 1 0-9Z',
  school: 'M12 3 1 9l4 2.18v6L12 21l7-3.82v-6L21 10v7h2V9L12 3Zm0 2.18L18.74 9 12 12.82 5.26 9 12 5.18ZM7 12.27l5 2.73 5-2.73v3.73l-5 2.73-5-2.73v-3.73Z',
  badge: 'M19 5h-3.18C15.4 3.84 14.3 3 13 3h-2c-1.3 0-2.4.84-2.82 2H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2Zm-8 0h2v2h-2V5Zm1 5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5Zm5 8H7v-1.25c0-1.66 3.33-2.5 5-2.5s5 .84 5 2.5V18Z',
  warning: 'M1 21h22L12 2 1 21Zm12-3h-2v2h2v-2Zm0-2h-2v-4h2v4Z',
  close: 'M18.3 5.71 12 12l6.3 6.29-1.41 1.42L10.59 13.4 4.29 19.71 2.88 18.3 9.17 12 2.88 5.71 4.29 4.29l6.3 6.3 6.3-6.3 1.41 1.42Z',
  edit: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25Zm2.92 1.75H5v-.92l9.06-9.06.92.92L5.92 19ZM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83Z',
  save: 'M17 3H5a2 2 0 0 0-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V7l-4-4Zm-5 16a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm3-10H5V5h10v4Z',
  arrow: 'm9.29 6.71 4.59 4.59-4.59 4.59L10.7 17.3l6-6-6-6-1.41 1.41Z',
  account: 'M12 2a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 12c-4.42 0-8 2.24-8 5v3h16v-3c0-2.76-3.58-5-8-5Z',
  work: 'M20 6h-4V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2H4a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2ZM10 4h4v2h-4V4Zm10 15H4v-7h6v2h4v-2h6v7Zm-8-6h-2v-2h2v2Z',
  sync: 'M12 4V1L8 5l4 4V6c3.31 0 6 2.69 6 6 0 1.01-.25 1.96-.69 2.79l1.46 1.46A7.93 7.93 0 0 0 20 12c0-4.42-3.58-8-8-8Zm-6 6c0-1.01.25-1.96.69-2.79L5.23 5.75A7.93 7.93 0 0 0 4 10c0 4.42 3.58 8 8 8v3l4-4-4-4v3c-3.31 0-6-2.69-6-6Z',
  send: 'M2 21 23 12 2 3v7l15 2-15 2v7Z',
  approve: 'M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z',
  reject: 'M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20Zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59Z',
  add: 'M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2Z',
};

function MaterialIcon({ name, size = 22 }) {
  return <svg className="gpl-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d={MATERIAL_PATHS[name] || MATERIAL_PATHS.badge} /></svg>;
}

function initials(value) {
  return String(value || 'GV').trim().split(/\s+/).slice(-2).map((part) => part[0] || '').join('').toUpperCase() || 'GV';
}

function degreeLabel(level, language) {
  const option = DEGREE_LEVELS.find((item) => item.id === level);
  return option ? option[language === 'en' ? 'en' : 'vi'] : '';
}

function isLeader(user) {
  return ['admin', 'department_head', 'department-head', 'ttcm', 'to_truong', 'tổ trưởng', 'department_leader', 'department leader', 'subject_leader', 'subject leader', 'leader']
    .includes(String(user?.role || '').trim().toLowerCase());
}

function mergeUniqueUsers(users, currentUser) {
  const map = new Map();
  [...(Array.isArray(users) ? users : []), currentUser].filter(Boolean).forEach((user) => {
    const id = String(user.id || user.authId || user.email || '').trim();
    if (!id || user.approved === false) return;
    map.set(id, {
      ...user,
      id,
      name: user.name || user.full_name || user.email?.split('@')?.[0] || 'Giáo viên',
      avatarUrl: user.avatarUrl || user.avatar_url || '',
    });
  });
  return [...map.values()].sort((a, b) => String(a.name || '').localeCompare(String(b.name || ''), 'vi'));
}

function statusLabel(status, t) { return t[status] || t.draft; }
function employmentLabel(type, t) { return t[type] || t.core; }
function degreeList(record) { return Array.isArray(record?.degrees) ? record.degrees : []; }
function hasDegreeLevel(record, level) { return degreeList(record).some((degree) => degree.level === level); }

function formatMoment(value, language) {
  const date = new Date(value || '');
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(language === 'vi' ? 'vi-VN' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function comparableDegrees(record) {
  return degreeList(record).map(({ id, ...degree }) => degree);
}

function degreeLine(degree, language) {
  const main = [degreeLabel(degree.level, language), degree.degreeName, degree.major].filter(Boolean).join(' · ');
  const extra = [degree.institution, degree.graduationYear].filter(Boolean).join(' · ');
  return [main || '—', extra].filter(Boolean).join(' — ');
}

function DegreesView({ record, language, t }) {
  const degrees = degreeList(record);
  if (!degrees.length) return <p className="gpl-empty-profile">{t.noDegrees}</p>;
  return <div className="gpl-degree-list">{degrees.map((degree, index) => (
    <article className={`gpl-degree-view${degree.isHighest ? ' is-highest' : ''}`} key={degree.id || `${index}-${degreeLine(degree, language)}`}>
      <header className="gpl-degree-view-head"><div><strong>{degreeLabel(degree.level, language) || t.noQualification}{degree.degreeName ? ` · ${degree.degreeName}` : ''}</strong><small>{degree.major || t.noMajor}</small></div>{degree.isHighest ? <span className="gpl-degree-highest-chip">{t.highestBadge}</span> : null}</header>
      {degree.specialization ? <p>{degree.specialization}</p> : null}
      <div className="gpl-degree-meta">{degree.institution ? <span>{degree.institution}</span> : null}{degree.graduationYear ? <span>{degree.graduationYear}</span> : null}</div>
    </article>
  ))}</div>;
}

function DegreeEditor({ draft, setDraft, language, t }) {
  const degrees = degreeList(draft);
  const setDegrees = (nextDegrees) => setDraft((current) => ({ ...current, degrees: nextDegrees }));
  const updateDegree = (index, patch) => setDegrees(degrees.map((degree, itemIndex) => itemIndex === index ? { ...degree, ...patch } : degree));
  const setHighest = (index) => setDegrees(degrees.map((degree, itemIndex) => ({ ...degree, isHighest: itemIndex === index })));
  const addDegree = () => {
    const next = createEmptyPersonnelDegree(degrees.length);
    next.isHighest = degrees.length === 0;
    setDegrees([...degrees, next]);
  };
  const removeDegree = (index) => {
    const removedHighest = degrees[index]?.isHighest;
    const next = degrees.filter((_, itemIndex) => itemIndex !== index);
    if (removedHighest && next.length) next[0] = { ...next[0], isHighest: true };
    setDegrees(next);
  };

  return <div className="gpl-degree-editor">
    <div className="gpl-degree-editor-head"><div><strong>{t.degrees}<span className="gpl-degree-count">{degrees.length}</span></strong><small>{t.multipleDegreeHint}</small></div><button type="button" className="gpl-add-degree" onClick={addDegree}><MaterialIcon name="add" size={18} />{t.addDegree}</button></div>
    {!degrees.length ? <div className="gpl-degree-empty">{t.noDegrees}</div> : degrees.map((degree, index) => <article className={`gpl-degree-card${degree.isHighest ? ' is-highest' : ''}`} key={degree.id || index}>
      <header className="gpl-degree-card-head"><div><span className="gpl-degree-index">{index + 1}</span><strong>{degreeLabel(degree.level, language) || `${t.degreeNumber} ${index + 1}`}</strong>{degree.isHighest ? <span className="gpl-degree-highest-chip">{t.highestBadge}</span> : null}</div><button type="button" className="gpl-remove-degree" onClick={() => removeDegree(index)} aria-label={t.removeDegree}>×</button></header>
      <div className="gpl-degree-fields">
        <label><span>{t.highestLevel}</span><select value={degree.level} onChange={(event) => updateDegree(index, { level: event.target.value })}><option value="">{t.selectLevel}</option>{DEGREE_LEVELS.map((level) => <option key={level.id} value={level.id}>{level[language === 'en' ? 'en' : 'vi']}</option>)}</select></label>
        <label><span>{t.degreeName}</span><input value={degree.degreeName} onChange={(event) => updateDegree(index, { degreeName: event.target.value })} /></label>
        <label className="is-wide"><span>{t.major}</span><input value={degree.major} onChange={(event) => updateDegree(index, { major: event.target.value })} placeholder={t.suggestedMajor} /></label>
        <label className="is-wide"><span>{t.specialization}</span><input value={degree.specialization} onChange={(event) => updateDegree(index, { specialization: event.target.value })} placeholder={t.suggestedSpecialization} /></label>
        <label className="is-wide"><span>{t.institution}</span><input value={degree.institution} onChange={(event) => updateDegree(index, { institution: event.target.value })} placeholder={t.suggestedInstitution} /></label>
        <label><span>{t.graduationYear}</span><input inputMode="numeric" value={degree.graduationYear} onChange={(event) => updateDegree(index, { graduationYear: event.target.value.replace(/[^0-9]/g, '').slice(0, 4) })} maxLength={4} /></label>
        <label className="gpl-highest-control"><input type="radio" name="highest-personnel-degree" checked={degree.isHighest} onChange={() => setHighest(index)} /><span>{t.setHighest}</span></label>
      </div>
    </article>)}
  </div>;
}

function DegreeCompareValue({ record, language }) {
  const degrees = degreeList(record);
  if (!degrees.length) return <>—</>;
  return <span className="gpl-compare-degree-stack">{degrees.map((degree, index) => <i key={degree.id || index}>{degree.isHighest ? '★ ' : ''}{degreeLine(degree, language)}</i>)}</span>;
}

export default function PersonnelLookup({ currentUser, language = 'vi' }) {
  const t = COPY[language] || COPY.vi;
  const leaderView = isLeader(currentUser);
  const [accounts, setAccounts] = useState(() => mergeUniqueUsers([], currentUser));
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(null);
  const [proposalNote, setProposalNote] = useState('');
  const [reviewNote, setReviewNote] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const loadDirectory = useCallback(async ({ silent = false } = {}) => {
    if (!currentUser?.id) return;
    if (!silent) setLoading(true);
    setLoadError('');
    try {
      const nextAccounts = leaderView
        ? mergeUniqueUsers(await listTeamTeacherAccounts(currentUser), currentUser)
        : mergeUniqueUsers([], currentUser);
      const cloud = await listPersonnelDirectoryItems();
      setAccounts(nextAccounts);
      setItems(cloud.items || []);
      if (cloud.error) setLoadError(cloud.error);
      if (leaderView && cloud.cloudReady) {
        const migration = await migrateLegacyPersonnelRecords({ currentUser, accounts: nextAccounts, cloudItems: cloud.items || [] });
        if (migration.migrated) {
          setItems((current) => [...migration.items, ...current]);
          setNotice(`${t.migrated} (${migration.migrated})`);
        }
        if (!migration.ok && migration.message) setLoadError(migration.message);
      }
    } catch (error) {
      setLoadError(error?.message || t.cloudError);
    } finally {
      if (!silent) setLoading(false);
    }
  }, [currentUser?.id, currentUser?.email, currentUser?.role, leaderView, language]);

  useEffect(() => { loadDirectory(); }, [loadDirectory]);
  useEffect(() => {
    const refresh = () => loadDirectory({ silent: true });
    const unsubscribe = subscribePersonnelDirectory(refresh);
    window.addEventListener(PERSONNEL_DIRECTORY_EVENT, refresh);
    return () => {
      unsubscribe();
      window.removeEventListener(PERSONNEL_DIRECTORY_EVENT, refresh);
    };
  }, [loadDirectory]);

  const itemMap = useMemo(() => new Map(items.map((item) => [item.profileUserId, item])), [items]);
  const people = useMemo(() => accounts.map((user) => {
    const item = itemMap.get(user.id) || null;
    const fallback = emptyPersonnelRecord({ position: isLeader(user) ? t.positionTtcm : t.positionTeacher, department: t.eyebrow });
    const approved = item?.approvedProfile || null;
    const proposed = item?.proposedProfile || null;
    const displayRecord = approved || (!leaderView ? proposed : null) || fallback;
    return {
      ...fallback,
      ...displayRecord,
      id: user.id,
      name: user.name || user.email?.split('@')?.[0] || t.teacher,
      email: user.email || '',
      avatarUrl: user.avatarUrl || '',
      accountRole: user.role || 'teacher',
      item,
      approvedProfile: approved,
      proposedProfile: proposed,
      workflowStatus: item?.status || 'draft',
      proposalNote: item?.proposalNote || '',
      reviewNote: item?.reviewNote || '',
      updatedAt: item?.updated_at || displayRecord?.updatedAt || '',
    };
  }), [accounts, itemMap, language, leaderView]);

  const filteredPeople = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase(language === 'vi' ? 'vi' : 'en');
    return people.filter((person) => {
      const degrees = degreeList(person);
      const incomplete = !degrees.length || !person.major;
      const matchesFilter = filter === 'all'
        || (filter === 'missing' && incomplete)
        || (filter === 'pending' && person.workflowStatus === 'submitted')
        || hasDegreeLevel(person, filter);
      if (!matchesFilter) return false;
      if (!needle) return true;
      const degreeText = degrees.flatMap((degree) => [degreeLabel(degree.level, language), degree.degreeName, degree.major, degree.specialization, degree.institution, degree.graduationYear]);
      return [person.name, person.email, person.position, person.assignment, person.department, ...degreeText]
        .join(' ').toLocaleLowerCase(language === 'vi' ? 'vi' : 'en').includes(needle);
    });
  }, [people, query, filter, language]);

  const stats = useMemo(() => ({
    total: people.length,
    postgraduate: people.filter((person) => degreeList(person).some((degree) => ['doctorate', 'doctoral_candidate', 'master'].includes(degree.level))).length,
    masters: people.filter((person) => hasDegreeLevel(person, 'master')).length,
    incomplete: people.filter((person) => !degreeList(person).length || !person.major).length,
    pending: people.filter((person) => person.workflowStatus === 'submitted').length,
  }), [people]);

  const selected = people.find((person) => person.id === selectedId) || (!leaderView ? people[0] : null) || null;

  useEffect(() => {
    if (!selectedId) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') { setSelectedId(''); setEditing(false); }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [selectedId]);

  const openProfile = (person) => {
    setSelectedId(person.id);
    setEditing(false);
    setDraft(null);
    setProposalNote('');
    setReviewNote('');
    setNotice('');
  };

  const startEditingPerson = (person) => {
    const source = !leaderView && person.proposedProfile ? person.proposedProfile : person.approvedProfile || person;
    setSelectedId(person.id);
    setDraft(cleanPersonnelRecord(source));
    setProposalNote(person.proposalNote || '');
    setEditing(true);
    setNotice('');
  };

  const replaceItem = (item) => {
    setItems((current) => [item, ...current.filter((entry) => entry.profileUserId !== item.profileUserId)]);
  };

  const saveProfile = async (event) => {
    event.preventDefault();
    if (!selected || !draft || busy) return;
    setBusy(true);
    setLoadError('');
    const normalizedDraft = cleanPersonnelRecord(draft);
    const result = leaderView
      ? await saveApprovedPersonnelProfile({ currentUser, targetUser: selected, record: normalizedDraft, existingItem: selected.item })
      : await submitPersonnelProposal({ currentUser, record: normalizedDraft, proposalNote, existingItem: selected.item });
    setBusy(false);
    if (!result.ok) {
      setLoadError(result.message || t.cloudError);
      return;
    }
    replaceItem(result.item);
    setEditing(false);
    setDraft(null);
    setNotice(leaderView ? t.saved : t.proposed);
  };

  const reviewProposal = async (decision) => {
    if (!selected?.item || busy) return;
    setBusy(true);
    setLoadError('');
    const result = await reviewPersonnelProposal({ currentUser, targetUser: selected, existingItem: selected.item, decision, reviewNote });
    setBusy(false);
    if (!result.ok) {
      setLoadError(result.message || t.cloudError);
      return;
    }
    replaceItem(result.item);
    setReviewNote('');
    setNotice(decision === 'approve' ? t.approvedNotice : t.rejectedNotice);
  };

  const profileFields = useMemo(() => [
    ['degrees', t.degrees, (record) => <DegreeCompareValue record={record} language={language} />],
    ['position', t.position], ['department', t.department],
    ['employmentType', t.employmentType, (value) => employmentLabel(value, t)],
    ['employmentStatus', t.status, (value) => statusLabel(value, t)],
    ['assignment', t.assignment], ['phone', t.phone], ['otherDegrees', t.otherDegrees],
  ], [language]);

  const changedFields = useMemo(() => {
    if (!selected?.proposedProfile) return [];
    const current = selected.approvedProfile || emptyPersonnelRecord({ position: t.positionTeacher, department: t.eyebrow });
    return profileFields.filter(([key]) => {
      if (key === 'degrees') return JSON.stringify(comparableDegrees(current)) !== JSON.stringify(comparableDegrees(selected.proposedProfile));
      return String(current[key] || '') !== String(selected.proposedProfile[key] || '');
    });
  }, [selected?.id, selected?.proposedProfile, selected?.approvedProfile, profileFields, language]);

  const filters = ['all', 'pending', 'doctorate', 'doctoral_candidate', 'master', 'bachelor', 'missing'];
  const metrics = [
    ['groups', t.total, stats.total, 'blue', 'all'],
    ['sync', t.pending, stats.pending, 'purple', 'pending'],
    ['school', t.postgraduate, stats.postgraduate, 'green', 'all'],
    ['badge', t.masters, stats.masters, 'yellow', 'master'],
    ['warning', t.incomplete, stats.incomplete, 'red', 'missing'],
  ];

  const renderProfileDetails = (person) => <div className="gpl-profile-content">
    <section><h4><MaterialIcon name="account" size={19} />{t.linkedAccount}</h4><dl><div><dt>Email</dt><dd>{person.email || '—'}</dd></div><div><dt>{t.department}</dt><dd>{person.department || '—'}</dd></div></dl><p className="gpl-account-note"><MaterialIcon name="sync" size={17} />{t.syncMessage}</p></section>
    <section><h4><MaterialIcon name="school" size={19} />{t.professional}<span className="gpl-degree-count">{degreeList(person).length}</span></h4>{person.approvedProfile ? <DegreesView record={person} language={language} t={t} /> : <p className="gpl-empty-profile">{t.noApprovedProfile}</p>}{person.otherDegrees ? <div className="gpl-other-degrees"><span>{t.otherDegrees}</span>{person.otherDegrees.split('\n').filter(Boolean).map((item) => <p key={item}>{item}</p>)}</div> : null}</section>
    <section><h4><MaterialIcon name="work" size={19} />{t.employment}</h4><dl><div><dt>{t.position}</dt><dd>{person.position || '—'}</dd></div><div><dt>{t.employmentType}</dt><dd>{employmentLabel(person.employmentType, t)}</dd></div><div><dt>{t.assignment}</dt><dd>{person.assignment || t.noAssignment}</dd></div><div><dt>{t.phone}</dt><dd>{person.phone || '—'}</dd></div></dl></section>
  </div>;

  return <article className={`gpl-directory gpl-workflow${leaderView ? ' is-leader' : ' is-teacher'}`} id="dashboard-personnel" aria-labelledby="gpl-title">
    <header className="gpl-header">
      <div className="gpl-title-group"><span className="gpl-brand-icon"><MaterialIcon name={leaderView ? 'groups' : 'account'} size={26} /></span><div><span className="gpl-eyebrow">{t.eyebrow}</span><h2 id="gpl-title">{leaderView ? t.title : t.teacherTitle}</h2><p>{leaderView ? t.subtitle : t.teacherSubtitle}</p></div></div>
      <div className="gpl-cloud-chip"><MaterialIcon name="sync" size={17} /><span>Supabase</span></div>
    </header>

    <div className="gpl-body">
      {notice ? <div className="gpl-save-notice"><MaterialIcon name="save" size={18} />{notice}</div> : null}
      {loadError ? <div className="gpl-inline-alert"><MaterialIcon name="warning" size={19} /><span>{loadError}</span><button type="button" onClick={() => loadDirectory()}>{t.updateNow}</button></div> : null}

      {leaderView ? <>
        <div className="gpl-metrics gpl-metrics-five" aria-label={t.total}>{metrics.map(([icon, label, value, tone, target]) => <button type="button" key={label} className={`gpl-metric is-${tone}`} onClick={() => setFilter(target)}><span><MaterialIcon name={icon} size={21} /></span><div><small>{label}</small><strong>{value}</strong></div></button>)}</div>
        <div className="gpl-toolbar"><label className="gpl-search"><MaterialIcon name="search" size={21} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t.search} aria-label={t.search} />{query ? <button type="button" onClick={() => setQuery('')} aria-label={t.close}><MaterialIcon name="close" size={18} /></button> : null}</label><span className="gpl-result-count">{filteredPeople.length} {t.records}</span></div>
        <div className="gpl-filter-row" role="group" aria-label={t.qualification}>{filters.map((item) => <button type="button" key={item} className={`gpl-filter-chip${filter === item ? ' is-active' : ''}`} onClick={() => setFilter(item)} aria-pressed={filter === item}>{item === 'pending' ? t.pendingFilter : t[item]}</button>)}</div>
        {stats.pending > 0 ? <button type="button" className="gpl-pending-banner" onClick={() => setFilter('pending')}><span><MaterialIcon name="sync" size={21} /></span><div><strong>{stats.pending} {t.pendingFilter.toLocaleLowerCase(language === 'vi' ? 'vi' : 'en')}</strong><small>{t.reviewHeading}</small></div><b>{t.approve}</b><MaterialIcon name="arrow" size={18} /></button> : null}
        {stats.incomplete > 0 ? <button type="button" className="gpl-missing-banner" onClick={() => setFilter('missing')}><span><MaterialIcon name="warning" size={20} /></span><div><strong>{stats.incomplete} {t.missingNotice.toLocaleLowerCase(language === 'vi' ? 'vi' : 'en')}</strong><small>{t.accountNotice}</small></div><b>{t.updateNow}</b><MaterialIcon name="arrow" size={18} /></button> : null}
        <div className="gpl-table-wrap"><div className="gpl-table-head" aria-hidden="true"><span>{t.teacher}</span><span>{t.position}</span><span>{t.qualification}</span><span>{t.assignment}</span><span>{t.workflow}</span><span /></div><div className="gpl-table" aria-live="polite">
          {loading && !people.length ? <div className="gpl-empty"><span className="gpl-loader" /><p>{t.loading}</p></div> : null}
          {!loading && !filteredPeople.length ? <div className="gpl-empty"><MaterialIcon name="search" size={28} /><p>{t.empty}</p></div> : null}
          {filteredPeople.map((person) => <button type="button" className={`gpl-person-row${person.workflowStatus === 'submitted' ? ' has-pending' : ''}`} key={person.id} onClick={() => openProfile(person)}><span className="gpl-person-cell"><span className="gpl-avatar">{person.avatarUrl ? <img src={person.avatarUrl} alt="" /> : initials(person.name)}</span><span className="gpl-person-name"><strong>{person.name}</strong><small>{person.email}</small></span></span><span className="gpl-position-cell"><strong>{person.position || t.positionTeacher}</strong><small>{employmentLabel(person.employmentType, t)}</small></span><span className={`gpl-qualification-cell${degreeList(person).length ? '' : ' is-missing'}`}><b>{person.degreeLevel ? degreeLabel(person.degreeLevel, language) : t.noQualification}<span className="gpl-degree-count">{degreeList(person).length}</span></b><small>{person.major || t.noMajor}</small></span><span className="gpl-assignment-cell"><strong>{person.assignment || t.noAssignment}</strong><small>{person.department}</small></span><span><em className={`gpl-workflow-status is-${person.workflowStatus}`}>{statusLabel(person.workflowStatus, t)}</em></span><span className="gpl-row-arrow"><MaterialIcon name="arrow" size={20} /></span></button>)}
        </div></div>
      </> : selected ? <section className="gpl-teacher-summary">
        <div className="gpl-teacher-identity"><span className="gpl-profile-avatar">{selected.avatarUrl ? <img src={selected.avatarUrl} alt="" /> : initials(selected.name)}</span><div><span>{t.linkedAccount}</span><h3>{selected.name}</h3><p>{selected.email}</p></div><em className={`gpl-workflow-status is-${selected.workflowStatus}`}>{statusLabel(selected.workflowStatus, t)}</em></div>
        {selected.workflowStatus === 'submitted' ? <div className="gpl-teacher-message is-pending"><MaterialIcon name="sync" size={21} /><div><strong>{t.waitingMessage}</strong><small>{selected.proposalNote || t.proposalHeading}</small></div></div> : null}
        {selected.workflowStatus === 'changes_requested' ? <div className="gpl-teacher-message is-changes"><MaterialIcon name="warning" size={21} /><div><strong>{t.changesMessage}</strong><small>{selected.reviewNote || t.reviewerFeedback}</small></div></div> : null}
        <div className="gpl-teacher-facts"><div><small>{t.highestLevel}</small><strong>{selected.degreeLevel ? degreeLabel(selected.degreeLevel, language) : t.noQualification}</strong><span>{degreeList(selected).length} {t.degreeCount} · {selected.major || t.noMajor}</span></div><div><small>{t.assignment}</small><strong>{selected.assignment || t.noAssignment}</strong><span>{selected.department}</span></div><div><small>{t.lastUpdated}</small><strong>{formatMoment(selected.updatedAt, language)}</strong><span>{t.syncMessage}</span></div></div>
        <div className="gpl-teacher-actions"><button type="button" className="gpl-button outlined" onClick={() => openProfile(selected)}>{t.profile}<MaterialIcon name="arrow" size={18} /></button><button type="button" className="gpl-button filled" onClick={() => startEditingPerson(selected)}><MaterialIcon name="edit" size={18} />{selected.proposedProfile ? t.updateProposal : t.propose}</button></div>
      </section> : null}
    </div>

    {selectedId && selected ? <div className="gpl-drawer-layer" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setSelectedId(''); setEditing(false); } }}><aside className="gpl-drawer gpl-workflow-drawer" role="dialog" aria-modal="true" aria-labelledby="gpl-profile-title">
      <header className="gpl-drawer-header"><button type="button" className="gpl-icon-button" onClick={() => { setSelectedId(''); setEditing(false); }} aria-label={t.close}><MaterialIcon name="close" size={22} /></button><span>{t.profile}</span>{!editing ? <button type="button" className="gpl-edit-button" onClick={() => startEditingPerson(selected)}><MaterialIcon name="edit" size={18} />{leaderView ? t.edit : (selected.proposedProfile ? t.updateProposal : t.propose)}</button> : <span />}</header>
      <div className="gpl-profile-hero"><span className="gpl-profile-avatar">{selected.avatarUrl ? <img src={selected.avatarUrl} alt="" /> : initials(selected.name)}</span><div><h3 id="gpl-profile-title">{selected.name}</h3><p>{selected.position || t.positionTeacher}</p><em className={`gpl-workflow-status is-${selected.workflowStatus}`}>{statusLabel(selected.workflowStatus, t)}</em></div></div>
      {notice ? <div className="gpl-save-notice"><MaterialIcon name="save" size={18} />{notice}</div> : null}
      {loadError ? <div className="gpl-inline-alert"><MaterialIcon name="warning" size={19} /><span>{loadError}</span></div> : null}

      {editing && draft ? <form className="gpl-form" onSubmit={saveProfile}>
        <section><h4><MaterialIcon name="school" size={19} />{t.professional}</h4><div className="gpl-form-grid"><DegreeEditor draft={draft} setDraft={setDraft} language={language} t={t} /><label className="is-wide"><span>{t.otherDegrees}</span><textarea value={draft.otherDegrees} onChange={(event) => setDraft({ ...draft, otherDegrees: event.target.value })} placeholder={t.suggestedOther} rows={3} /></label></div></section>
        <section><h4><MaterialIcon name="work" size={19} />{t.employment}</h4><div className="gpl-form-grid"><label><span>{t.position}</span><input value={draft.position} onChange={(event) => setDraft({ ...draft, position: event.target.value })} /></label><label><span>{t.department}</span><input value={draft.department} onChange={(event) => setDraft({ ...draft, department: event.target.value })} /></label><label><span>{t.employmentType}</span><select value={draft.employmentType} onChange={(event) => setDraft({ ...draft, employmentType: event.target.value })}><option value="core">{t.core}</option><option value="visiting">{t.visiting}</option></select></label><label><span>{t.status}</span><select value={draft.employmentStatus} onChange={(event) => setDraft({ ...draft, employmentStatus: event.target.value })}><option value="active">{t.active}</option><option value="leave">{t.leave}</option><option value="inactive">{t.inactive}</option></select></label><label className="is-wide"><span>{t.assignment}</span><input value={draft.assignment} onChange={(event) => setDraft({ ...draft, assignment: event.target.value })} placeholder={t.suggestedAssignment} /></label><label className="is-wide"><span>{t.phone}</span><input value={draft.phone} onChange={(event) => setDraft({ ...draft, phone: event.target.value })} inputMode="tel" /></label></div></section>
        {!leaderView ? <section className="gpl-proposal-note"><h4><MaterialIcon name="send" size={19} />{t.proposalNote}</h4><textarea value={proposalNote} onChange={(event) => setProposalNote(event.target.value)} placeholder={t.proposalNotePlaceholder} rows={3} /></section> : null}
        <div className="gpl-form-actions"><button type="button" className="gpl-button outlined" onClick={() => { setEditing(false); setDraft(null); }}>{t.cancel}</button><button type="submit" className="gpl-button filled" disabled={busy}><MaterialIcon name={leaderView ? 'save' : 'send'} size={18} />{busy ? t.loading : (leaderView ? t.save : t.submitProposal)}</button></div>
      </form> : <>
        {renderProfileDetails(selected)}
        {selected.proposedProfile ? <section className="gpl-review-card"><header><div><span>{t.proposalHeading}</span><h4>{t.reviewHeading}</h4></div><em className={`gpl-workflow-status is-${selected.workflowStatus}`}>{statusLabel(selected.workflowStatus, t)}</em></header>{selected.proposalNote ? <p className="gpl-proposal-message"><MaterialIcon name="send" size={18} />{selected.proposalNote}</p> : null}<div className="gpl-compare-list">{changedFields.length ? changedFields.map(([key, label, formatter]) => {
          const currentRecord = selected.approvedProfile || emptyPersonnelRecord({ position: t.positionTeacher, department: t.eyebrow });
          const proposedRecord = selected.proposedProfile;
          const current = currentRecord[key] || '';
          const proposed = proposedRecord[key] || '';
          const show = formatter || ((value) => value || '—');
          return <div className="gpl-compare-row" key={key}><strong>{label}</strong><span><small>{t.currentValue}</small><b>{key === 'degrees' ? show(currentRecord) : show(current)}</b></span><MaterialIcon name="arrow" size={18} /><span className="is-proposed"><small>{t.proposedValue}</small><b>{key === 'degrees' ? show(proposedRecord) : show(proposed)}</b></span></div>;
        }) : <p className="gpl-empty-profile">{t.noChanges}</p>}</div>{leaderView && selected.workflowStatus === 'submitted' ? <div className="gpl-review-actions"><label><span>{t.reviewNote}</span><textarea value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} placeholder={t.reviewNotePlaceholder} rows={3} /></label><div><button type="button" className="gpl-button danger" onClick={() => reviewProposal('changes')} disabled={busy}><MaterialIcon name="reject" size={18} />{t.requestChanges}</button><button type="button" className="gpl-button filled" onClick={() => reviewProposal('approve')} disabled={busy}><MaterialIcon name="approve" size={18} />{t.approve}</button></div></div> : null}{!leaderView && selected.reviewNote ? <p className="gpl-review-feedback"><strong>{t.reviewerFeedback}</strong>{selected.reviewNote}</p> : null}</section> : null}
      </>}
    </aside></div> : null}
  </article>;
}
