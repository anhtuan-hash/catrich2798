import React from 'react';
import { ArrowRight, BookOpenCheck, ChartNoAxesColumnIncreasing, CheckCheck, ClipboardList, Radar, Sparkles, UserRoundCheck } from 'lucide-react';

// Presentation only: all counts come from semesterProgressSections / raw score cells.
export default function GradebookSemesterMission({ sections, summary, queue, onSelectSection, onSelectStudent, finalized }) {
  return <section className="gb-mission" aria-label="Trung tâm tiến độ học kỳ">
    <div className="gb-mission-heading">
      <div className="gb-mission-heading-copy">
        <span className="gb-mission-eyebrow"><Radar size={15} aria-hidden="true"/> BRIAN / GRADEBOOK INSIGHTS</span>
        <h2>Trung tâm tiến độ học kỳ</h2>
        <p>Theo dõi chính xác các ô điểm đã nhập và xử lý phần còn thiếu, không thay đổi dữ liệu.</p>
      </div>
      <div className="gb-mission-overall">
        <div className="gb-mission-ring" style={{ '--gb-mission-pct': `${summary.percent}%` }} aria-label={`${summary.percent}% ô điểm đã nhập`}>
          <span>{summary.percent}<small>%</small></span>
        </div>
        <div>
          <strong>{summary.entered}/{summary.total}</strong>
          <small>ô điểm đã nhập</small>
          <em>{summary.missing} ô còn trống</em>
        </div>
      </div>
    </div>

    <div className="gb-mission-layout">
      <div className="gb-mission-sections">
        <div className="gb-mission-subhead"><span><BookOpenCheck size={18} aria-hidden="true"/> Sáu thành phần đánh giá</span><small>{summary.completedSections}/{summary.sectionCount} hoàn tất</small></div>
        <div className="gb-mission-grid">
          {sections.map((section, index) => (
            <button key={section.id} type="button" className={`gb-mission-card gb-mission-card--${index % 6}`}
              style={{ '--gb-mission-progress': `${section.percent}%` }}
              onClick={() => onSelectSection(section.id)}
              aria-label={`${section.label}: ${section.entered} trên ${section.total} ô đã nhập. Mở thành phần này`}>
              <span className="gb-mission-card-top"><span className="gb-mission-icon">{section.percent === 100 && section.total ? <CheckCheck size={19}/> : <ChartNoAxesColumnIncreasing size={19}/>}</span>
                <ArrowRight size={17} aria-hidden="true" /></span>
              <strong>{section.label}</strong>
              <span className="gb-mission-card-value">{section.percent}<small>%</small></span>
              <span className="gb-mission-bar"><span/></span>
              <span className="gb-mission-card-caption">{section.entered}/{section.total} ô · {section.missing ? `${section.missing} còn trống` : 'Hoàn tất'}</span>
            </button>
          ))}
        </div>
      </div>
      <aside className="gb-mission-queue" aria-label="Học sinh cần hoàn thiện điểm">
        <div className="gb-mission-queue-title"><span className="gb-mission-queue-icon"><ClipboardList size={20}/></span><div><strong>Ưu tiên hoàn thiện</strong><small>Các em thiếu nhiều ô điểm nhất</small></div></div>
        {queue.length ? <div className="gb-mission-queue-list">
          {queue.map((entry, index) => <button type="button" key={entry.studentId} className="gb-mission-queue-row" onClick={() => onSelectStudent(entry)}
            aria-label={`Mở điểm của ${entry.name} ở ${entry.nextView}; còn ${entry.missing} ô trống`}>
            <span className="gb-mission-avatar" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
            <span className="gb-mission-student"><strong>{entry.name}</strong><small>{entry.code || 'Học sinh'}</small></span>
            <span className="gb-mission-missing">{entry.missing} ô</span>
            <ArrowRight size={16} aria-hidden="true"/>
          </button>)}
        </div> : <div className="gb-mission-empty"><UserRoundCheck size={32}/><strong>{summary.total ? 'Đã hoàn thiện!' : 'Chưa có dữ liệu học sinh'}</strong><p>{summary.total ? 'Không có học sinh nào thiếu ô điểm trong các thành phần hiện có.' : 'Hãy chọn lớp có học sinh để bắt đầu theo dõi tiến độ.'}</p></div>}
        <div className="gb-mission-queue-foot"><Sparkles size={15} aria-hidden="true"/> {finalized ? 'Học kỳ đã khóa · chỉ xem tiến độ' : 'Chọn tên để xem đúng ô điểm cần bổ sung'}</div>
      </aside>
    </div>
  </section>;
}
