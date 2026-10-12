import React from 'react';
import { BookOpenCheck, CalendarDays, Download, Plus, ShieldCheck, Trash2 } from 'lucide-react';
import { MAX_MOCK_EXAMS, buildMockExamCsv, mockExamProgress, mockExamScoreNumber } from '../../utils/gradebookMockExams.js';
import './GradebookMockExams.css';

function MockScoreInput({ value, disabled, label, onChange }) {
  return <input
    type="text" inputMode="decimal" className="gb-mock-score"
    aria-label={label} placeholder="—" disabled={disabled}
    value={value ?? ''}
    onChange={(event) => {
      const raw = event.target.value.replace(',', '.').trim();
      if (raw === '' || (/^\d{0,2}(?:\.\d{0,2})?$/.test(raw) &&
        (raw === '.' || raw.endsWith('.') || (Number.isFinite(Number(raw)) && Number(raw) <= 10)))) {
        onChange(raw);
      }
    }}
    onBlur={(event) => {
      const score = mockExamScoreNumber(event.target.value);
      onChange(score == null ? '' : String(score));
    }}
    onWheel={(event) => event.currentTarget.blur()}
  />;
}

export default function GradebookMockExams({
  students = [], visibleStudents = [], exams = [], className = '', subjectName = '',
  disabled = false, onAdd, onRename, onDate, onRemove, onScoreChange, originalStudentPosition,
}) {
  const totalFilled = exams.reduce((sum, exam) => sum + mockExamProgress(students, exam).entered, 0);
  const totalCells = exams.length * students.length;
  const canExport = exams.length > 0 && students.length > 0;

  const downloadCsv = () => {
    if (!canExport || typeof document === 'undefined') return;
    const csv = buildMockExamCsv({ students, exams, className, subjectName });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = String(className || 'lop-12').replace(/[^a-zA-Z0-9._-]/g, '-');
    a.href = url;
    a.download = `BRIAN-Thi-thu-${safeName}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return <section className="gb-mock-book hr-panel" aria-label="Sổ điểm thi thử lớp 12">
    <header className="gb-mock-hero">
      <div className="gb-mock-hero-heading">
        <span className="gb-mock-icon"><BookOpenCheck size={25} aria-hidden="true" /></span>
        <div><span className="gb-mock-eyebrow">GRADE 12 · MOCK EXAM LEDGER</span>
          <h2>Sổ điểm thi thử THPT</h2>
          <p>Quản lý kết quả từng kỳ thi thử của lớp {className || '12'} · {subjectName || 'Môn học'}.</p>
        </div>
      </div>
      <div className="gb-mock-metrics" aria-label="Tiến độ nhập điểm thi thử">
        <div><small>Lần thi thử</small><strong>{exams.length}</strong></div>
        <div><small>Học sinh</small><strong>{students.length}</strong></div>
        <div><small>Đã nhập</small><strong>{totalFilled}/{totalCells}</strong></div>
      </div>
    </header>
    <div className="gb-mock-policy"><ShieldCheck size={19} aria-hidden="true" />
      <span><b>Dữ liệu tách biệt hoàn toàn.</b> Chỉ ghi điểm gốc thang 10 theo từng lần thi thử; không có điểm cộng, không tính điểm trung bình và không đưa vào sổ điểm học kỳ.</span>
    </div>
    <div className="gb-mock-actions">
      <div><b>Các lần thi thử</b><small>Đặt tên, chọn ngày thi và nhập điểm trực tiếp vào bảng.</small></div>
      <div className="gb-mock-buttons">
        <button type="button" className="gb-mock-export" disabled={!canExport} onClick={downloadCsv}><Download size={16} /> Xuất Excel (CSV)</button>
        <button type="button" className="gb-mock-add" disabled={disabled || exams.length >= MAX_MOCK_EXAMS} onClick={onAdd}><Plus size={17} /> Thêm lần thi thử</button>
      </div>
    </div>
    {!exams.length ? <div className="gb-mock-empty">
      <BookOpenCheck size={35} aria-hidden="true" /><strong>Chưa có lần thi thử nào</strong>
      <p>Nhấn “Thêm lần thi thử” để bắt đầu. Điểm của mỗi lần thi sẽ được lưu thành một cột độc lập.</p>
      <button type="button" disabled={disabled} onClick={onAdd}><Plus size={17} /> Tạo lần thi thử đầu tiên</button>
    </div> : <>
      <div className="gb-mock-progress" aria-label="Số học sinh đã nhập theo từng lần thi">
        {exams.map((exam, index) => {
          const progress = mockExamProgress(students, exam);
          return <div className="gb-mock-progress-item" key={exam.id}>
            <span className="gb-mock-round-index">{index + 1}</span><span><b>{exam.label || `Thi thử lần ${index + 1}`}</b><small>{progress.entered}/{progress.total} học sinh</small></span>
            <i style={{ '--gb-mock-progress': `${progress.total ? progress.entered * 100 / progress.total : 0}%` }} />
          </div>;
        })}
      </div>
      <div className="gb-mock-table-wrap" role="region" aria-label="Bảng điểm thi thử" tabIndex={0}>
        <table className="hr-grade-table gb-mock-table">
          <thead><tr><th className="gb-mock-stt">STT</th><th className="gb-mock-student">Học sinh</th>
            {exams.map((exam, index) => <th key={exam.id} className="gb-mock-exam-head">
              <span className="gb-mock-sequence">LẦN {index + 1}</span>
              <input className="gb-mock-exam-name" disabled={disabled} aria-label={`Tên lần thi thử ${index + 1}`}
                value={exam.label} maxLength={100} onChange={(event) => onRename(exam.id, event.target.value)} />
              <label className="gb-mock-date"><CalendarDays size={14} aria-hidden="true" /><input type="date" value={exam.date || ''} disabled={disabled} aria-label={`Ngày thi thử lần ${index + 1}`} onChange={(event) => onDate(exam.id, event.target.value)} /></label>
              <button type="button" className="gb-mock-delete" disabled={disabled} title="Xóa lần thi thử và toàn bộ điểm của lần này"
                aria-label={`Xóa lần thi thử ${index + 1}`} onClick={() => {
                  if (window.confirm(`Xóa ${exam.label || `thi thử lần ${index + 1}`} và toàn bộ điểm đã nhập trong lần này?`)) onRemove(exam.id);
                }}><Trash2 size={15} /> Xóa</button>
            </th>)}
          </tr></thead>
          <tbody>{visibleStudents.map((student) => <tr key={student.id}>
            <td className="gb-mock-stt">{originalStudentPosition?.get(student.id) || students.indexOf(student) + 1}</td>
            <td className="gb-mock-student"><b>{student.fullName || student.name || 'Học sinh'}</b><small>{student.code || 'Chưa có mã học sinh'}</small></td>
            {exams.map((exam) => {
              const value = exam.scores?.[student.id] ?? '';
              const filled = mockExamScoreNumber(value) !== null;
              return <td key={exam.id} className={filled ? 'gb-mock-filled' : 'gb-mock-missing'}>
                <MockScoreInput value={value} disabled={disabled} label={`${student.fullName} · ${exam.label}`}
                  onChange={(score) => onScoreChange(exam.id, student.id, score)} />
              </td>;
            })}
          </tr>)}</tbody>
        </table>
      </div>
      {!visibleStudents.length ? <p className="gb-mock-no-students">Chưa có học sinh phù hợp với bộ lọc đang chọn.</p> : null}
      <p className="gb-mock-hint">Ô trống = chưa nhập · 0 = điểm 0 hợp lệ · Nhấn “Lưu bảng điểm” để đồng bộ dữ liệu lên hệ thống.</p>
    </>}
  </section>;
}
