import React from 'react';
import { classMetrics, todayIso } from '../../utils/homeroomOfflineTools.js';

function StatCard({ icon, label, value, note, tone = 'blue' }) {
  return <article className={`hr-stat tone-${tone}`}><span>{icon}</span><div><small>{label}</small><strong>{value}</strong><em>{note}</em></div></article>;
}

export default function HomeroomOverviewCompactTab({ workspace, goTab }) {
  const metrics = classMetrics(workspace);
  const today = todayIso();
  const todayKeys = Object.keys(workspace.attendance || {}).filter((key) => key.split('::')[0] === today);
  const todayRows = todayKeys.flatMap((key) => Object.values(workspace.attendance?.[key] || {}));
  const presentToday = todayRows.length
    ? todayRows.filter((item) => item.status === 'present').length
    : '—';
  const learningCount = workspace.learningRecords?.length || 0;
  const conductCount = (workspace.conductRecords || []).filter((item) => item.status !== 'cancelled').length;

  const setupItems = [
    ['Thông tin lớp', workspace.classProfile?.className ? 100 : 0],
    ['Danh sách học sinh', Math.min(100, metrics.students.length * 4)],
    ['Điểm danh', Math.min(100, Object.keys(workspace.attendance || {}).length * 10)],
    ['Dữ liệu học tập', Math.min(100, learningCount * 4)],
    ['Dữ liệu rèn luyện', Math.min(100, conductCount * 5)],
  ];

  const quickActions = [
    { key: 'students', icon: '♙', title: 'Học sinh', note: 'Danh sách và thông tin lớp' },
    { key: 'attendance', icon: '✓', title: 'Điểm danh', note: 'Theo buổi hoặc tiết học' },
    { key: 'conduct', icon: '100', title: 'Rèn luyện', note: 'Điểm tuần và xét định kỳ' },
    { key: 'safety', icon: '⌾', title: 'An toàn dữ liệu', note: 'Sao lưu và bảo mật lớp' },
  ];

  return <div className="hr-tab-stack">
    <section className="hr-stat-grid">
      <StatCard icon="♙" label="Sĩ số hiện tại" value={metrics.students.length} note={`${workspace.classProfile?.grade ? `Khối ${workspace.classProfile.grade}` : '—'} · ${workspace.classProfile?.schoolYear || '—'}`} />
      <StatCard icon="✓" label="Có mặt hôm nay" value={presentToday} note={`${todayKeys.length} phiên đã lưu`} tone="green" />
      <StatCard icon="∑" label="Kết quả học tập" value={learningCount} note={Number.isFinite(metrics.classAverage) ? `Điểm TB lớp ${metrics.classAverage.toFixed(1)}` : 'Xem chi tiết trong app Sổ điểm'} tone="orange" />
      <StatCard icon="100" label="Ghi nhận rèn luyện" value={conductCount} note="Vi phạm và khen thưởng đang tính" tone="red" />
    </section>

    <section className="hr-overview-grid">
      <article className="hr-panel">
        <div className="hr-panel-head"><div><small>TRUY CẬP NHANH</small><h2>Công cụ quản lý lớp</h2></div></div>
        <div className="hr-quick-grid">
          {quickActions.map((item) => <button key={item.key} type="button" onClick={() => goTab(item.key)}><span>{item.icon}</span><b>{item.title}</b><small>{item.note}</small></button>)}
        </div>
      </article>

      <article className="hr-panel hr-progress-panel">
        <div className="hr-panel-head"><div><small>MỨC ĐỘ HOÀN THIỆN</small><h2>Dữ liệu lớp chủ nhiệm</h2></div></div>
        {setupItems.map(([label, value]) => <div key={label} className="hr-progress-row"><span><b>{label}</b><small>{value}%</small></span><div><i style={{ width: `${value}%` }} /></div></div>)}
      </article>
    </section>
  </div>;
}