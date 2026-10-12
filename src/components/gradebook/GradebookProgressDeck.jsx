import React, { useMemo } from 'react';
import { ArrowRight, CheckCheck, ClipboardList, Eye, GraduationCap, Layers3, ScanSearch, Sparkles } from 'lucide-react';
import { summarizeGradebookProgress } from '../../utils/gradebookProgressDeck.js';
import './GradebookProgressDeck.css';

export default function GradebookProgressDeck({
  students = [], semester, semesterLabel = 'Học kỳ', subjectName = 'Môn học',
  selectedView = 'regular-0', showMockExams = false, missingOnly = false,
  onOpenSection, onShowMissing, onShowAll, onOpenMock,
}) {
  const progress = useMemo(() => summarizeGradebookProgress(students, semester), [students, semester]);
  return <section className="gb3-deck" aria-label="Tiến độ nhập điểm học kỳ">
    <div className="gb3-deck-lead">
      <span className="gb3-deck-kicker"><Sparkles size={13} aria-hidden="true" /> ACADEMIC WORKSPACE · LIVE PROGRESS</span>
      <div className="gb3-deck-headline">
        <div><h2>Trạm điều hành sổ điểm</h2><p>{subjectName} <span>·</span> {semesterLabel} <span>·</span> {progress.students} học sinh</p></div>
        <div className="gb3-deck-ring" style={{ '--gb3-progress': `${progress.percent}%` }} role="img" aria-label={`Đã nhập ${progress.percent}% số ô điểm học kỳ`}>
          <span><strong>{progress.percent}%</strong><small>ĐÃ NHẬP</small></span>
        </div>
      </div>
      <div className="gb3-deck-figures">
        <span><b>{progress.filled}</b> ô đã nhập</span>
        <span><b>{progress.missing}</b> ô còn thiếu</span>
        <span><b>{progress.completedSections}/6</b> thành phần đủ điểm</span>
      </div>
      <div className="gb3-deck-actions">
        <button type="button" className="gb3-primary-action" onClick={() => progress.nextView && onShowMissing(progress.nextView)}
          disabled={!progress.nextView || !progress.students}><ScanSearch size={16} /> {progress.nextView ? 'Đi đến ô còn thiếu' : 'Đã nhập đủ'} <ArrowRight size={15}/></button>
        <button type="button" className="gb3-outline-action" onClick={onShowAll} aria-pressed={!missingOnly}><Eye size={16} /> Toàn bộ học sinh</button>
        {showMockExams ? <button type="button" className="gb3-outline-action" onClick={onOpenMock}><GraduationCap size={16} /> Sổ thi thử 12</button> : null}
      </div>
      <div className="gb3-deck-footnote"><ClipboardList size={13} /> Tiến độ đếm ô điểm đã nhập; không phải điểm trung bình hay xếp loại.</div>
    </div>
    <div className="gb3-deck-right">
      <div className="gb3-deck-right-title"><Layers3 size={17} /><div><strong>06 thành phần điểm</strong><span>Chạm để mở và nhập nhanh</span></div></div>
      <div className="gb3-deck-grid">
        {progress.sections.map((section) => <button type="button" key={section.id}
          className={`gb3-deck-tile is-${section.color}${selectedView === section.id ? ' is-selected' : ''}`}
          onClick={() => onOpenSection(section.id)} aria-pressed={selectedView === section.id}>
          <span className="gb3-tile-heading"><span>{section.short}</span>{section.missing === 0 && section.total > 0 ? <CheckCheck size={15} aria-label="Đã đủ điểm" /> : <ArrowRight size={15} aria-hidden="true" />}</span>
          <strong>{section.filled}<i>/{section.total}</i></strong>
          <span className="gb3-tile-progress" aria-hidden="true"><span style={{ width: `${section.percent}%` }} /></span>
          <small>{section.missing ? `${section.missing} ô còn thiếu` : section.total ? 'Đã hoàn thành' : 'Chưa có học sinh'}</small>
        </button>)}
      </div>
    </div>
  </section>;
}
