import React, { useMemo } from 'react';
import {
  UsersRound, UserCheck, Award, FolderCheck, CalendarCheck2, FolderOpen,
  ShieldCheck, ArrowUpRight, CheckCircle2, ClipboardList, Clock3, BarChart3,
  FileClock, Layers3,
} from 'lucide-react';
import { todayIso } from '../../utils/homeroomOfflineTools.js';
import { buildHomeroomDashboard } from '../../utils/homeroom4Dashboard.js';
import HomeroomOperationsCenter from './HomeroomOperationsCenter.jsx';
import './HomeroomCommandCenter.css';

const SHORT_DATE = (iso) => {
  const bits = String(iso || '').split('-');
  return bits.length === 3 ? `${bits[2]}/${bits[1]}` : '';
};
function MetricTile({ icon: Icon, label, value, description, tone }) {
  return <article className="hr4-metric" data-tone={tone}>
    <span className="hr4-metric__icon"><Icon size={23} strokeWidth={2.2} aria-hidden="true" /></span>
    <span className="hr4-metric__copy">
      <small>{label}</small>
      <strong>{value}</strong>
      <em>{description}</em>
    </span>
  </article>;
}
const SHORTCUTS = [
  { key: 'students', icon: UsersRound, label: 'Học sinh', detail: 'Danh sách và thông tin', tone: 'blue' },
  { key: 'studentRecords', icon: FolderOpen, label: 'Hồ sơ số', detail: 'Đối chiếu 3 nguồn', tone: 'violet' },
  { key: 'attendance', icon: CalendarCheck2, label: 'Điểm danh', detail: 'Theo buổi hoặc tiết', tone: 'teal' },
  { key: 'conduct', icon: Award, label: 'Rèn luyện', detail: 'Ghi nhận và tổng kết', tone: 'coral' },
  { key: 'classes', icon: Layers3, label: 'Lớp & năm học', detail: 'Thông tin lớp', tone: 'blue' },
  { key: 'safety', icon: ShieldCheck, label: 'An toàn', detail: 'Sao lưu và bảo vệ', tone: 'violet' },
];
export default function HomeroomOverviewCompactTab({ workspace, goTab, onCommit, syncState, subjectMode = false }) {
  const date = todayIso();
  const data = useMemo(() => buildHomeroomDashboard(workspace, date), [workspace, date]);
  const className = workspace?.classProfile?.className || 'Lớp chưa đặt tên';

  return <div className="hr4-command-center" aria-label="Trung tâm điều hành lớp chủ nhiệm">
    <section className="hr4-command-heading">
      <div className="hr4-command-heading__copy">
        <span className="hr4-command-eyebrow"><ClipboardList size={15} aria-hidden="true" /> HOMEROOM COMMAND CENTER</span>
        <h2>Công việc của lớp <span>{className}</span></h2>
        <p>Tổng hợp trực tiếp từ dữ liệu đã lưu, không dùng số liệu ước lượng.</p>
      </div>
      <time dateTime={date} className="hr4-command-date"><Clock3 size={17} aria-hidden="true"/> {SHORT_DATE(date)}</time>
    </section>

    <section className="hr4-metric-grid" aria-label="Thông tin lớp">
      <MetricTile tone="blue" icon={UsersRound} label="Học sinh đang học" value={data.studentCount} description="Theo danh sách lớp hiện tại" />
      <MetricTile tone="teal" icon={UserCheck} label="Lượt có mặt hôm nay" value={data.todayPresent ?? '—'} description={data.hasTodayData ? `${data.todaySessionCount} phiên có dữ liệu` : 'Chưa có bản ghi điểm danh'} />
      <MetricTile tone="coral" icon={Award} label="Rèn luyện chờ xác nhận" value={data.pendingConductCount} description={`${data.confirmedConductCount} ghi nhận đã xác nhận`} />
      <MetricTile tone="violet" icon={FolderCheck} label="Hồ sơ giấy đầy đủ" value={data.studentCount ? `${data.completePaperCount}/${data.studentCount}` : '—'} description="Theo chứng từ bắt buộc" />
    </section>

    <div className="hr4-work-grid">
      <section className="hr4-work-panel" aria-labelledby="hr4-task-heading">
        <div className="hr4-panel-header">
          <div><span className="hr4-section-kicker">ƯU TIÊN XỬ LÝ</span><h3 id="hr4-task-heading">Việc cần kiểm tra</h3></div>
          <span className="hr4-count">{data.tasks.length} mục</span>
        </div>
        {data.tasks.length ? <div className="hr4-task-list">
          {data.tasks.map((item) => <button
            key={item.id}
            type="button"
            className="hr4-task"
            data-tone={item.tone}
            onClick={() => goTab(item.tab)}
          >
            <span className="hr4-task-dot" aria-hidden="true" />
            <span className="hr4-task-copy"><strong>{item.label}</strong><small>{item.detail}</small></span>
            <ArrowUpRight size={17} aria-hidden="true" />
          </button>)}
        </div> : <div className="hr4-clear-state">
          <CheckCircle2 size={26} aria-hidden="true"/>
          <strong>Không có yêu cầu chờ xử lý trong các nhóm đang theo dõi.</strong>
          <small>Điểm danh, rèn luyện và hồ sơ vẫn có thể cập nhật bình thường.</small>
        </div>}
      </section>
      <section className="hr4-work-panel hr4-attendance-trend" aria-labelledby="hr4-chart-heading">
        <div className="hr4-panel-header">
          <div><span className="hr4-section-kicker">CHUYÊN CẦN</span><h3 id="hr4-chart-heading">Phiên điểm danh 7 ngày</h3></div>
          <BarChart3 size={21} aria-hidden="true"/>
        </div>
        {data.maxSessions > 0 ? <div className="hr4-trend-chart" role="img" aria-label={data.days.map((day) => `${SHORT_DATE(day.date)}: ${day.count} phiên đã lưu`).join('; ')}>
          {data.days.map((day) => <div className="hr4-trend-day" key={day.date}>
            <div className="hr4-trend-bar-track">
              {day.count > 0 ? <span style={{ height: `${(day.count / data.maxSessions) * 100}%` }} title={`${day.count} phiên`} /> : null}
            </div>
            <strong>{day.count || '·'}</strong>
            <small>{SHORT_DATE(day.date)}</small>
          </div>)}
        </div> : <div className="hr4-trend-empty">
          <FileClock size={32} aria-hidden="true"/>
          <span>Chưa có phiên điểm danh nào được lưu trong 7 ngày qua.</span>
        </div>}
        <div className="hr4-trend-foot">
          <span>{data.todayAbsent === null ? 'Chưa có dữ liệu vắng hôm nay' : `${data.todayAbsent} lượt vắng hôm nay`}</span>
          <button type="button" onClick={() => goTab('attendance')}>Mở điểm danh <ArrowUpRight size={15}/></button>
        </div>
      </section>
    </div>

    <section className="hr4-shortcuts" aria-labelledby="hr4-shortcuts-heading">
      <div className="hr4-panel-header">
        <div><span className="hr4-section-kicker">LỐI TẮT</span><h3 id="hr4-shortcuts-heading">Không gian làm việc</h3></div>
      </div>
      <div className="hr4-shortcut-grid">
        {SHORTCUTS.map(({ key, icon: Icon, label, detail, tone }) => <button
          type="button" key={key} data-tone={tone} onClick={() => goTab(key)} className="hr4-shortcut"
        >
          <span className="hr4-shortcut-icon"><Icon size={22} strokeWidth={2.1} aria-hidden="true"/></span>
          <strong>{label}</strong><small>{detail}</small>
          <ArrowUpRight className="hr4-shortcut-arrow" size={17} aria-hidden="true"/>
        </button>)}
      </div>
    </section>
    {!subjectMode ? <HomeroomOperationsCenter workspace={workspace} onCommit={onCommit} goTab={goTab} syncState={syncState} /> : null}
  </div>;
}
