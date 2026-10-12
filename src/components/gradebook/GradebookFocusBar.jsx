import React, { useMemo } from 'react';
import { ArrowDown, BarChart3, CheckCheck, ChevronRight, ClipboardPenLine, GraduationCap, ListFilter, ShieldCheck, Sparkles } from 'lucide-react';
import { summarizeGradebookProgress } from '../../utils/gradebookProgressDeck.js';

export default function GradebookFocusBar({
  students = [], semester = {}, subjectName = '', semesterLabel = '',
  view = 'regular-0', showMockExams = false, dirty = false, savePending = false,
  missingOnly = false, onToggleMissing, onNextMissing, onOpenInsights, onScrollToTable,
}) {
  const progress = useMemo(() => summarizeGradebookProgress(students, semester), [students, semester]);
  const isMock = view === 'mock';
  return <section className="gb5-focusbar" aria-label="Trung tâm nhập điểm nhanh">
    <div className="gb5-focusbar-main">
      <div className="gb5-focusbar-icon"><ClipboardPenLine size={25} aria-hidden="true" /></div>
      <div className="gb5-focusbar-copy">
        <span className="gb5-eyebrow"><Sparkles size={12} aria-hidden="true" /> FOCUS WORKSPACE · GRADEBOOK V5</span>
        <h2>{isMock ? 'Sổ thi thử lớp 12' : 'Không gian nhập điểm'}</h2>
        <p>{subjectName || 'Môn học'} <span aria-hidden="true">·</span> {isMock ? 'Các lần thi thử độc lập' : semesterLabel} <span aria-hidden="true">·</span> {students.length} học sinh</p>
      </div>
      <span className={`gb5-sync-status ${dirty ? 'is-pending' : 'is-synced'}`} role="status" aria-live="polite">
        <ShieldCheck size={14} aria-hidden="true" />
        {savePending ? 'Đang lưu…' : dirty ? 'Có thay đổi chưa lưu' : 'Đã lưu'}
      </span>
    </div>
    <div className="gb5-focusbar-bottom">
      {!isMock ? <div className="gb5-score-progress" aria-label={`Đã nhập ${progress.filled} trên ${progress.total} ô điểm học kỳ`}>
        <span className="gb5-progress-number">{progress.percent}<small>%</small></span>
        <div className="gb5-progress-copy">
          <b>Tiến độ nhập điểm</b>
          <small>{progress.filled}/{progress.total} ô đã nhập <span aria-hidden="true">·</span> {progress.missing} ô còn thiếu</small>
          <div className="gb5-track" aria-hidden="true"><span style={{ width:`${progress.percent}%` }} /></div>
        </div>
      </div> : <div className="gb5-score-progress gb5-mock-notice"><GraduationCap size={21} /><span><b>Dữ liệu thi thử độc lập</b><small>Không có điểm cộng và không tính điểm trung bình</small></span></div>}
      <div className="gb5-focusbar-actions">
        {!isMock ? <button type="button" className={`gb5-quiet-button${missingOnly ? ' is-active' : ''}`} aria-pressed={missingOnly} onClick={onToggleMissing}>
          <ListFilter size={15} /> {missingOnly ? 'Hiện tất cả' : 'Chỉ ô còn thiếu'}
        </button> : null}
        {!isMock && progress.nextView ? <button type="button" className="gb5-quiet-button" onClick={() => onNextMissing(progress.nextView)}>
          <ChevronRight size={15} /> Thành phần còn thiếu
        </button> : null}
        <button type="button" className="gb5-quiet-button" onClick={onOpenInsights}>
          <BarChart3 size={15} /> Phân tích & công cụ
        </button>
        <button type="button" className="gb5-main-button" onClick={onScrollToTable}>
          <ArrowDown size={15} /> Đến bảng điểm
        </button>
      </div>
    </div>
  </section>;
}
