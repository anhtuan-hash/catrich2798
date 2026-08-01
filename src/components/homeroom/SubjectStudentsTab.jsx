import React, { useMemo, useState } from 'react';
import StudentRosterImportPanel from '../StudentRosterImportPanel.jsx';
import {
  addStudent,
  archiveStudent,
  restoreStudent,
  upsertStudents,
} from '../../utils/homeroomStore.js';
import { downloadCsv, formatViDate } from '../../utils/homeroomOfflineTools.js';

const EMPTY_STUDENT = { code: '', fullName: '', birthDate: '', gender: '', notes: '' };

function hasText(value) {
  return Boolean(String(value ?? '').trim());
}

export default function SubjectStudentsTab({ workspace, onCommit }) {
  const [draft, setDraft] = useState(EMPTY_STUDENT);
  const [editingId, setEditingId] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('active');
  const [showImporter, setShowImporter] = useState(false);
  const students = useMemo(() => (workspace.students || []).filter((student) => {
    const match = `${student.fullName} ${student.code}`.toLowerCase().includes(query.toLowerCase());
    if (!match) return false;
    return filter === 'inactive' ? student.active === false : student.active !== false;
  }), [workspace.students, query, filter]);

  const save = async () => {
    if (!hasText(draft.fullName)) return;
    const next = editingId
      ? { ...workspace, students: workspace.students.map((item) => item.id === editingId ? { ...item, ...draft, id: editingId, updatedAt: new Date().toISOString() } : item) }
      : addStudent(workspace, draft);
    await onCommit(next, editingId ? 'Đã cập nhật học sinh.' : 'Đã thêm học sinh.');
    setDraft(EMPTY_STUDENT);
    setEditingId('');
  };

  const edit = (student) => {
    setDraft({ ...EMPTY_STUDENT, code: student.code || '', fullName: student.fullName || '', birthDate: student.birthDate || '', gender: student.gender || '', notes: student.notes || '' });
    setEditingId(student.id);
    document.querySelector('.hr-subject-student-form')?.scrollIntoView({ behavior: 'smooth' });
  };

  const archive = async (student) => {
    const reason = window.prompt(`Lý do lưu trữ ${student.fullName}:`, 'Không còn học lớp bộ môn này') || '';
    if (hasText(reason)) await onCommit(archiveStudent(workspace, student.id, reason), 'Đã lưu trữ học sinh khỏi lớp bộ môn.');
  };

  const importRows = (rows) => onCommit(upsertStudents(workspace, rows), `Đã nhập/cập nhật ${rows.length} học sinh.`);
  const exportRoster = () => downloadCsv(`danh-sach-${workspace.classProfile?.className || 'lop-bo-mon'}.csv`, [
    ['Mã HS', 'Họ và tên', 'Ngày sinh', 'Giới tính', 'Ghi chú'],
    ...(workspace.students || []).map((item) => [item.code, item.fullName, item.birthDate, item.gender, item.notes]),
  ]);

  return <div className="hr-tab-stack">
    {showImporter ? <StudentRosterImportPanel existingStudents={workspace.students} onImport={importRows} onClose={() => setShowImporter(false)} /> : null}
    <section className="hr-panel hr-subject-student-form"><div className="hr-panel-head"><div><small>Thông tin tối giản cho lớp bộ môn</small><h2>{editingId ? 'Chỉnh sửa học sinh' : 'Thêm học sinh'}</h2></div><div className="hr-head-actions"><button type="button" className="secondary" onClick={() => setShowImporter((value) => !value)}>Nhập từ file</button><button type="button" className="secondary" onClick={exportRoster}>Xuất danh sách</button><button type="button" className="primary" onClick={save}>{editingId ? 'Cập nhật' : 'Thêm học sinh'}</button></div></div>
      <div className="hr-form-grid four">{[
        ['code', 'Mã học sinh'], ['fullName', 'Họ và tên'], ['birthDate', 'Ngày sinh', 'date'], ['gender', 'Giới tính'],
      ].map(([key, label, type = 'text']) => <label key={key}><span>{label}</span><input type={type} value={draft[key] || ''} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} /></label>)}</div>
      <label className="hr-wide-field"><span>Ghi chú học tập</span><textarea value={draft.notes || ''} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} /></label>
      {editingId ? <button type="button" className="text-btn" onClick={() => { setDraft(EMPTY_STUDENT); setEditingId(''); }}>Hủy chỉnh sửa</button> : null}
    </section>
    <section className="hr-panel"><div className="hr-panel-head"><div><small>{workspace.students?.length || 0} học sinh</small><h2>Danh sách lớp bộ môn</h2></div><div className="hr-filter-row"><input placeholder="Tìm theo tên hoặc mã học sinh…" value={query} onChange={(event) => setQuery(event.target.value)} /><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="active">Đang học</option><option value="inactive">Đã lưu trữ</option></select></div></div>
      {students.length ? <div className="hr-table-wrap"><table className="hr-table"><thead><tr><th>Học sinh</th><th>Giới tính</th><th>Ghi chú học tập</th><th /></tr></thead><tbody>{students.map((student, index) => <tr key={student.id}><td><div className="hr-person-cell"><span>{String(index + 1).padStart(2, '0')}</span><p><b>{student.fullName}</b><small>{student.code || 'Chưa có mã'} · {student.birthDate ? formatViDate(student.birthDate) : 'Chưa có ngày sinh'}</small></p></div></td><td>{student.gender || '—'}</td><td><small>{student.notes || 'Không có ghi chú'}</small></td><td><div className="hr-row-actions"><button type="button" onClick={() => edit(student)}>Sửa</button>{student.active === false ? <button type="button" onClick={() => onCommit(restoreStudent(workspace, student.id), 'Đã khôi phục học sinh.')}>Khôi phục</button> : <button type="button" className="danger" onClick={() => archive(student)}>Lưu trữ</button>}</div></td></tr>)}</tbody></table></div> : <div className="hr-empty"><span>＋</span><h3>Chưa có học sinh</h3><p>Nhập danh sách lớp để bắt đầu sổ điểm bộ môn.</p><button type="button" className="primary" onClick={() => setShowImporter(true)}>Nhập từ file</button></div>}
    </section>
  </div>;
}
