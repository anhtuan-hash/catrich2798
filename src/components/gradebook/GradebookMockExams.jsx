import React, { useEffect, useMemo, useState } from 'react';
import { BookOpenCheck, CalendarDays, Download, Plus, ShieldCheck, Trash2, ClipboardPaste, LockKeyhole, UnlockKeyhole, TrendingUp, ArrowUpRight, ArrowDownRight, Minus, FileSpreadsheet } from 'lucide-react';
import {
  MAX_MOCK_EXAMS, buildMockExamCsv, buildMockExamComparisonCsv, compareMockExamAttempts,
  mockExamProgress, mockExamScoreNumber, previewMockExamPaste,
  buildMockExamImportTemplateCsv, selectVisibleMockExams,
} from '../../utils/gradebookMockExams.js';
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
    onKeyDown={(event) => {
      if (!['Enter', 'ArrowDown', 'ArrowUp'].includes(event.key)) return;
      const cell = event.currentTarget.closest('td');
      const row = cell?.parentElement;
      const index = row && cell ? Array.from(row.cells).indexOf(cell) : -1;
      if (index < 0) return;
      const goingUp = event.key === 'ArrowUp' || (event.key === 'Enter' && event.shiftKey);
      const nextRow = goingUp ? row.previousElementSibling : row.nextElementSibling;
      const destination = nextRow?.cells?.[index]?.querySelector('input.gb-mock-score:not(:disabled)');
      if (!destination) return;
      event.preventDefault();
      destination.focus();
      destination.select();
    }}
  />;
}

export default function GradebookMockExams({
  students = [], visibleStudents = [], exams = [], className = '', subjectName = '', workspaceId = '', subjectKey = '',
  disabled = false, onAdd, onRename, onDate, onRemove, onScoreChange, onBulkPaste, onSetLock, originalStudentPosition,
}) {
  const totalFilled = exams.reduce((sum, exam) => sum + mockExamProgress(students, exam).entered, 0);
  const totalCells = exams.length * students.length;
  const canExport = exams.length > 0 && students.length > 0;
  const [pasteOpen, setPasteOpen] = useState(false);
  const [focusedExamId, setFocusedExamId] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [selectedExamId, setSelectedExamId] = useState('');
  const [allowOverwrite, setAllowOverwrite] = useState(false);
  const [pasteNotice, setPasteNotice] = useState('');
  useEffect(() => {
    // Clipboard drafts must never cross class / subject boundaries.
    setPasteText('');
    setFocusedExamId('');
    setPasteOpen(false);
    setPasteNotice('');
    setSelectedExamId('');
    setAllowOverwrite(false);
  }, [workspaceId, subjectKey]);
  const targetExam = exams.find((exam) => exam.id === selectedExamId && !exam.locked)
    || exams.find((exam) => !exam.locked) || null;
  const preview = useMemo(() => previewMockExamPaste({
    text: pasteText, students, scores: targetExam?.scores || {}, allowOverwrite,
  }), [pasteText, students, targetExam?.scores, allowOverwrite]);
  const comparison = useMemo(() => compareMockExamAttempts(students, exams), [students, exams]);
  const activeFocusId = exams.some((exam) => exam.id === focusedExamId) ? focusedExamId : '';
  const displayedExams = useMemo(() => selectVisibleMockExams(exams, activeFocusId), [exams, activeFocusId]);
  const canApplyPaste = Boolean(targetExam && !disabled && preview.entries.length && !preview.issues.length);
  const applyPaste = () => {
    if (!canApplyPaste) return;
    onBulkPaste(targetExam.id, preview.entries);
    setPasteNotice(`Đã nhập ${preview.entries.length} điểm vào ${targetExam.label || 'lần thi thử'}. Nhấn Lưu bảng điểm để đồng bộ.`);
    setPasteText('');
    setAllowOverwrite(false);
    setPasteOpen(false);
  };

  const downloadText = (content, suffix = '') => {
    if (!content || typeof document === 'undefined') return;
    const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeName = String(className || 'lop-12').replace(/[^a-zA-Z0-9._-]/g, '-');
    a.href = url;
    a.download = `BRIAN-Thi-thu-${safeName}${suffix}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };
  const downloadCsv = () => {
    if (!canExport) return;
    downloadText(buildMockExamCsv({ students, exams, className, subjectName }));
  };
  const downloadTemplate = () => downloadText(buildMockExamImportTemplateCsv(students), '-mau-nhap-diem');
  const downloadComparison = () => {
    if (!comparison.ready) return;
    downloadText(buildMockExamComparisonCsv({ students, exams, className, subjectName }), '-doi-chieu');
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
      <div><b>Các lần thi thử</b><small>Nhập điểm trực tiếp hoặc dán bảng Excel theo mã học sinh. Có thể khóa từng lần thi.</small></div>
      <div className="gb-mock-buttons">
        <button type="button" className="gb-mock-export" disabled={!canExport} onClick={downloadCsv}><Download size={16} /> Xuất bảng điểm</button>
        <button type="button" className="gb-mock-export" disabled={!students.length} onClick={downloadTemplate}><FileSpreadsheet size={16} /> Mẫu nhập điểm</button>
        <button type="button" className="gb-mock-export" disabled={!comparison.ready} onClick={downloadComparison}><FileSpreadsheet size={16} /> Xuất đối chiếu</button>
        <button type="button" className="gb-mock-export gb-mock-paste-trigger" disabled={disabled || !exams.some((exam) => !exam.locked)} aria-expanded={pasteOpen}
          onClick={() => { setPasteNotice(''); setPasteOpen((open) => !open); }}><ClipboardPaste size={16} /> Dán điểm Excel</button>
        <button type="button" className="gb-mock-add" disabled={disabled || exams.length >= MAX_MOCK_EXAMS} onClick={onAdd}><Plus size={17} /> Thêm lần thi thử</button>
      </div>
    </div>
    {pasteNotice ? <div className="gb-mock-paste-success" role="status">{pasteNotice}</div> : null}
    {pasteOpen && targetExam ? <section className="gb-mock-paste-panel" aria-label="Nhập điểm từ Excel">
      <div className="gb-mock-paste-title">
        <div><span>EXCEL · BULK ENTRY</span><h3>Nhập điểm hàng loạt an toàn</h3><p>Dán hai cột <b>Mã học sinh</b> và <b>Điểm</b> từ Excel hoặc Google Sheets. Cũng hỗ trợ bốn cột STT, Mã HS, Họ tên, Điểm. Dữ liệu được khớp theo mã học sinh, không phụ thuộc thứ tự hàng.</p></div>
        <button type="button" className="gb-mock-paste-close" onClick={() => setPasteOpen(false)}>Đóng</button>
      </div>
      <div className="gb-mock-paste-layout">
        <label className="gb-mock-paste-target"><span>Nhập vào lần thi thử</span>
          <select value={targetExam.id} disabled={disabled} onChange={(event) => setSelectedExamId(event.target.value)}>
            {exams.filter((exam) => !exam.locked).map((exam, index) => <option key={exam.id} value={exam.id}>{exam.label || `Thi thử lần ${index + 1}`}</option>)}
          </select>
        </label>
        <label className="gb-mock-paste-body"><span>Dữ liệu sao chép</span>
          <textarea rows={7} value={pasteText} disabled={disabled}
            onChange={(event) => setPasteText(event.target.value)} placeholder={'Mã học sinh\tĐiểm\nHS001\t7.5\nHS002\t0\nHS003\t9.25'} />
        </label>
        <label className="gb-mock-paste-overwrite">
          <input type="checkbox" checked={allowOverwrite} disabled={disabled} onChange={(event) => setAllowOverwrite(event.target.checked)} />
          <span>Cho phép ghi đè những điểm đã nhập (chỉ trong lần thi thử đang chọn)</span>
        </label>
      </div>
      {pasteText.trim() ? <div className="gb-mock-paste-preview">
        <strong>Xem trước trước khi nhập</strong>
        <div className="gb-mock-preview-counters">
          <span className="is-good">{preview.entries.length} điểm hợp lệ sẽ nhập</span>
          <span>{preview.skipped.length} không thay đổi / ô trống</span>
          <span className={preview.conflicts.length ? 'is-warn' : ''}>{preview.conflicts.length} điểm đang được bảo vệ</span>
          <span className={preview.issues.length ? 'is-error' : ''}>{preview.issues.length} lỗi cần sửa</span>
        </div>
        {preview.issues.length ? <div className="gb-mock-preview-issues" role="alert">
          <b>Không thể áp dụng khi còn dữ liệu không hợp lệ:</b>
          <ul>{preview.issues.slice(0,8).map((item,index) => <li key={index}>Dòng {item.row}: {item.reason}</li>)}</ul>
          {preview.issues.length > 8 ? <small>...và {preview.issues.length - 8} lỗi khác</small> : null}
        </div> : null}
        {preview.conflicts.length ? <p className="gb-mock-preview-warning">Các điểm đã có sẽ được giữ nguyên. Đánh dấu “Cho phép ghi đè” nếu muốn thay đổi chúng.</p> : null}
        {preview.entries.length ? <div className="gb-mock-preview-samples">
          {preview.entries.slice(0,5).map((entry) => <span key={entry.studentId}>{entry.studentName}: {entry.overwrite ? `${entry.previous} → ${entry.value}` : entry.value}</span>)}
        </div> : null}
        <button type="button" className="gb-mock-paste-apply" disabled={!canApplyPaste} onClick={applyPaste}>Áp dụng {preview.entries.length} điểm vào {targetExam.label || 'lần thi thử'}</button>
      </div> : <p className="gb-mock-paste-note">Bản xem trước sẽ hiển thị số điểm hợp lệ, mã không tìm thấy, điểm trùng và các ô có nguy cơ bị ghi đè. Không thay đổi dữ liệu trước khi nhấn Áp dụng.</p>}
    </section> : null}
    {comparison.ready ? <section className="gb-mock-trends" aria-label="So sánh hai lần thi thử gần nhất">
      <div className="gb-mock-trends-heading"><TrendingUp size={20} aria-hidden="true" /><div><h3>Biến động kết quả giữa hai lần thi</h3>
        <p>{comparison.before.label || 'Lần trước'} → {comparison.after.label || 'Lần mới nhất'} · Đối chiếu điểm từng học sinh, không tính trung bình.</p></div></div>
      <div className="gb-mock-trend-grid">
        <div className="is-improved"><ArrowUpRight size={19} /><strong>{comparison.improved}</strong><span>Tăng điểm</span></div>
        <div className="is-same"><Minus size={19} /><strong>{comparison.unchanged}</strong><span>Giữ nguyên</span></div>
        <div className="is-declined"><ArrowDownRight size={19} /><strong>{comparison.declined}</strong><span>Giảm điểm</span></div>
        <div className="is-unpaired"><ShieldCheck size={19} /><strong>{comparison.incomparable}</strong><span>Thiếu một trong hai điểm</span></div>
      </div>
    </section> : null}
    {!exams.length ? <div className="gb-mock-empty">
      <BookOpenCheck size={35} aria-hidden="true" /><strong>Chưa có lần thi thử nào</strong>
      <p>Nhấn “Thêm lần thi thử” để bắt đầu. Điểm của mỗi lần thi sẽ được lưu thành một cột độc lập.</p>
      <button type="button" disabled={disabled} onClick={onAdd}><Plus size={17} /> Tạo lần thi thử đầu tiên</button>
    </div> : <>
      <div className="gb-mock-view-controls">
        <div className="gb-mock-view-title"><strong>Không gian nhập điểm</strong><span>Chọn một lần thi để bảng gọn hơn, hoặc xem toàn bộ lịch sử.</span></div>
        <label><span>Hiển thị cột</span><select value={activeFocusId} aria-label="Chọn lần thi thử hiển thị" onChange={(event) => setFocusedExamId(event.target.value)}>
          <option value="">Toàn bộ {exams.length} lần thi thử</option>
          {exams.map((exam, index) => <option value={exam.id} key={exam.id}>{exam.label || `Thi thử lần ${index + 1}`}{exam.locked ? ' · Đã khóa' : ''}</option>)}
        </select></label>
      </div>
      <div className="gb-mock-progress" aria-label="Số học sinh đã nhập theo từng lần thi">
        {exams.map((exam, index) => {
          const progress = mockExamProgress(students, exam);
          return <div className="gb-mock-progress-item" key={exam.id}>
            <button type="button" className={`gb-mock-focus-attempt${activeFocusId === exam.id ? ' is-current' : ''}`} onClick={() => setFocusedExamId((current) => current === exam.id ? '' : exam.id)}
              title={`Chọn ${exam.label || `thi thử ${index + 1}`} để nhập điểm`} aria-pressed={activeFocusId === exam.id}>
              <span className="gb-mock-round-index">{index + 1}</span><span><b>{exam.label || `Thi thử lần ${index + 1}`}</b><small>{progress.entered}/{progress.total} học sinh {exam.locked ? ' · Đã khóa' : ''}</small></span>
            </button>
            <i style={{ '--gb-mock-progress': `${progress.total ? progress.entered * 100 / progress.total : 0}%` }} />
          </div>;
        })}
      </div>
      <div className="gb-mock-table-wrap" role="region" aria-label="Bảng điểm thi thử" tabIndex={0}>
        <table className="hr-grade-table gb-mock-table">
          <thead><tr><th className="gb-mock-stt">STT</th><th className="gb-mock-student">Học sinh</th>
            {displayedExams.map((exam) => { const index = exams.findIndex((item) => item.id === exam.id); return <th key={exam.id} className="gb-mock-exam-head">
              <span className="gb-mock-sequence">LẦN {index + 1}</span>
              <input className="gb-mock-exam-name" disabled={disabled || exam.locked} aria-label={`Tên lần thi thử ${index + 1}`}
                value={exam.label} maxLength={100} onChange={(event) => onRename(exam.id, event.target.value)} />
              <label className="gb-mock-date"><CalendarDays size={14} aria-hidden="true" /><input type="date" value={exam.date || ''} disabled={disabled || exam.locked} aria-label={`Ngày thi thử lần ${index + 1}`} onChange={(event) => onDate(exam.id, event.target.value)} /></label>
              <div className="gb-mock-column-actions">
                <button type="button" className={exam.locked ? 'gb-mock-lock is-locked' : 'gb-mock-lock'} disabled={disabled}
                  aria-label={exam.locked ? `Mở khóa ${exam.label}` : `Khóa ${exam.label}`} aria-pressed={Boolean(exam.locked)}
                  onClick={() => {
                    if (window.confirm(exam.locked
                      ? `Mở khóa ${exam.label || 'lần thi thử'} để cho phép chỉnh sửa?`
                      : `Khóa ${exam.label || 'lần thi thử'} để tránh chỉnh sửa nhầm?`)) onSetLock(exam.id, !exam.locked);
                  }}>{exam.locked ? <LockKeyhole size={14} /> : <UnlockKeyhole size={14} />}{exam.locked ? 'Đã khóa' : 'Khóa'}</button>
              <button type="button" className="gb-mock-delete" disabled={disabled || exam.locked} title="Xóa lần thi thử và toàn bộ điểm của lần này"
                aria-label={`Xóa lần thi thử ${index + 1}`} onClick={() => {
                  if (window.confirm(`Xóa ${exam.label || `thi thử lần ${index + 1}`} và toàn bộ điểm đã nhập trong lần này?`)) onRemove(exam.id);
                }}><Trash2 size={15} /> Xóa</button>
              </div>
            </th>; })}
            {comparison.ready && !activeFocusId ? <th className="gb-mock-delta-head">Δ Điểm<br />2 lần gần nhất</th> : null}
          </tr></thead>
          <tbody>{visibleStudents.map((student) => <tr key={student.id}>
            <td className="gb-mock-stt">{originalStudentPosition?.get(student.id) || students.indexOf(student) + 1}</td>
            <td className="gb-mock-student"><b>{student.fullName || student.name || 'Học sinh'}</b><small>{student.code || 'Chưa có mã học sinh'}</small></td>
            {displayedExams.map((exam) => {
              const value = exam.scores?.[student.id] ?? '';
              const filled = mockExamScoreNumber(value) !== null;
              return <td key={exam.id} className={filled ? 'gb-mock-filled' : 'gb-mock-missing'}>
                <MockScoreInput value={value} disabled={disabled || exam.locked} label={`${student.fullName} · ${exam.label}`}
                  onChange={(score) => onScoreChange(exam.id, student.id, score)} />
              </td>;
            })}
            {comparison.ready && !activeFocusId ? <td className="gb-mock-delta-cell">
              {comparison.differences[student.id] === undefined ? <span className="is-none">—</span>
                : comparison.differences[student.id] > 0 ? <span className="is-up">+{comparison.differences[student.id]}</span>
                : comparison.differences[student.id] < 0 ? <span className="is-down">{comparison.differences[student.id]}</span>
                : <span className="is-even">0</span>}
            </td> : null}
          </tr>)}</tbody>
        </table>
      </div>
      {!visibleStudents.length ? <p className="gb-mock-no-students">Chưa có học sinh phù hợp với bộ lọc đang chọn.</p> : null}
      <p className="gb-mock-hint">Ô trống = chưa nhập · 0 = điểm 0 hợp lệ · Δ = chênh lệch hai lần gần nhất · Khóa lần thi để tránh sửa nhầm · Nhấn “Lưu bảng điểm” để đồng bộ dữ liệu.</p>
    </>}
  </section>;
}
