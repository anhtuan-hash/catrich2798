import React, { useMemo, useState } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SearchBox, B2SectionHeader, B2StatCard, B2Surface } from '../components/B2UI.jsx';
import { B2DataState, B2DataTable, B2DataToolbar, B2FilterChips, B2PersonCell, B2ProgressBar, B2Status } from '../components/B2Data.jsx';
import { dataSourceLabel, dataSourceTone, useBrianV2Data } from '../data/BrianV2DataContext.jsx';
import './B2Homeroom.css';

export default function B2Homeroom() {
  const { homeroom, loading, refreshing, sources, refresh } = useBrianV2Data();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const students = homeroom?.students || [];
  const stats = homeroom?.stats || { students: 0, present: 0, absence: 0, attendanceRecorded: false, attention: 0, openWork: 0, reminders: 0, alerts: 0 };
  const workspace = homeroom?.workspace;

  const filters = useMemo(() => [
    { id: 'all', label: 'Tất cả', count: students.length },
    { id: 'attention', label: 'Cần chú ý', count: students.filter((student) => student.status === 'attention').length },
    { id: 'absence', label: 'Vắng', count: students.filter((student) => student.attendance.startsWith('Vắng')).length },
    { id: 'progress', label: 'Có tiến độ', count: students.filter((student) => Number.isFinite(student.progress)).length },
  ], [students]);

  const rows = useMemo(() => students.filter((student) => {
    const matchQuery = student.name.toLowerCase().includes(query.trim().toLowerCase());
    if (!matchQuery) return false;
    if (filter === 'attention') return student.status === 'attention';
    if (filter === 'absence') return student.attendance.startsWith('Vắng');
    if (filter === 'progress') return Number.isFinite(student.progress);
    return true;
  }), [students, query, filter]);

  const columns = [
    { key: 'student', label: 'Học sinh', width: '29%', render: (row) => <B2PersonCell initials={row.initials} name={row.name} meta={`Lớp ${row.className}`} /> },
    { key: 'attendance', label: 'Chuyên cần', width: '14%', render: (row) => <B2Status tone={row.attendance === 'Đủ' ? 'green' : row.attendance.startsWith('Vắng') ? 'amber' : 'neutral'}>{row.attendance}</B2Status> },
    { key: 'conduct', label: 'Nề nếp', width: '16%', render: (row) => <B2Status tone={row.conduct === 'Tốt' ? 'blue' : row.conduct === 'Theo dõi' ? 'red' : row.conduct === '—' ? 'neutral' : 'amber'}>{row.conduct}</B2Status> },
    { key: 'progress', label: 'Tiến độ', width: '24%', render: (row) => Number.isFinite(row.progress) ? <B2ProgressBar value={row.progress} label={`${Math.round(row.progress)}%`} tone={row.progress >= 85 ? 'green' : row.progress < 72 ? 'violet' : 'blue'} /> : <span className="b2-muted-cell">Chưa có dữ liệu</span> },
    { key: 'note', label: 'Trạng thái', width: '17%', render: (row) => <strong className="b2-homeroom-note">{row.note}</strong> },
  ];

  const reminderItems = [...(workspace?.reminders || []).filter((item) => !item?.done && item?.status !== 'done'), ...(workspace?.alerts || []).filter((item) => !item?.resolved && item?.status !== 'resolved')].slice(0, 5);
  const progressValues = students.map((item) => item.progress).filter(Number.isFinite);
  const averageProgress = progressValues.length ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length) : null;
  const attendanceRate = stats.attendanceRecorded && stats.students ? Math.round(((stats.students - stats.absence) / stats.students) * 100) : null;

  if (!loading && !homeroom) {
    return (
      <B2DataState
        title="Chưa xác định được lớp chủ nhiệm"
        description="V2 read bridge không tìm thấy workspace hoặc assignment loại homeroom. Dữ liệu V1 không bị thay đổi."
        action={<B2Button variant="primary" onClick={() => refresh()}>↻ Làm mới dữ liệu</B2Button>}
      />
    );
  }

  return (
    <>
      <B2PageHeader
        eyebrow="MANAGE · HOMEROOM · LIVE DATA"
        title={`Chủ nhiệm ${homeroom?.className || ''}`.trim()}
        description="Workspace V2 đọc trực tiếp roster, chuyên cần, alert và learning records hiện có của lớp chủ nhiệm; không ghi ngược vào V1 trong giai đoạn Shadow UI."
        actions={<><B2Button variant="ghost" onClick={() => refresh()} disabled={refreshing}>{refreshing ? 'Đang làm mới…' : '↻ Làm mới'}</B2Button><B2Button onClick={() => window.open('/#/homeroom', '_blank', 'noopener,noreferrer')}>Mở Chủ nhiệm V1 ↗</B2Button></>}
        aside={<div className="b2-homeroom-code"><strong>{homeroom?.className || '—'}</strong><span>{stats.students} học sinh</span><B2Badge tone={dataSourceTone(sources.homeroom)}>{dataSourceLabel(sources.homeroom)}</B2Badge></div>}
      />

      <section className="b2-homeroom-stats">
        <B2StatCard label="Sĩ số" value={String(stats.students)} meta="roster hoạt động" tone="blue" icon="◎" />
        <B2StatCard label="Có mặt" value={stats.attendanceRecorded ? String(stats.present) : '—'} meta={stats.attendanceRecorded ? 'hôm nay' : 'chưa điểm danh'} tone="green" icon="✓" />
        <B2StatCard label="Cần chú ý" value={String(stats.attention).padStart(2, '0')} meta="alert/support" tone="violet" icon="!" />
        <B2StatCard label="Việc đang mở" value={String(stats.openWork).padStart(2, '0')} meta="reminder + alert" tone="cyan" icon="▤" />
      </section>

      <section className="b2-homeroom-layout">
        <div className="b2-homeroom-main">
          <B2SectionHeader eyebrow="STUDENTS" title="Danh sách lớp" description="Dữ liệu thiếu được để trống có chủ đích; V2 không tạo conduct/progress giả để lấp giao diện." />
          <B2DataToolbar
            left={<><B2SearchBox value={query} onChange={setQuery} placeholder="Tìm học sinh…" /><B2FilterChips items={filters} value={filter} onChange={setFilter} /></>}
            right={<B2Badge tone="blue">{rows.length} hiển thị</B2Badge>}
          />
          {loading ? <B2DataState type="loading" /> : <B2DataTable columns={columns} rows={rows} empty={<B2DataState title="Không có học sinh phù hợp" description="Thử thay đổi bộ lọc hiện tại." />} />}
        </div>

        <aside className="b2-homeroom-side">
          <B2Surface>
            <B2SectionHeader eyebrow="OPEN ITEMS" title="Việc cần xử lý" />
            <div className="b2-homeroom-actions">
              {reminderItems.length ? reminderItems.map((item, index) => (
                <button type="button" key={item.id || `${item.title}-${index}`} onClick={() => window.open('/#/homeroom', '_blank', 'noopener,noreferrer')}>
                  <span>{String(index + 1).padStart(2, '0')}</span>
                  <strong>{item.title || item.name || item.message || 'Việc cần xử lý'}</strong>
                  <small>{item.dueAt || item.date || item.status || 'Trong workspace V1'}</small>
                </button>
              )) : <p className="b2-empty-copy">Không có reminder/alert đang mở trong workspace hiện tại.</p>}
            </div>
          </B2Surface>
          <B2Surface>
            <B2SectionHeader eyebrow="CLASS SIGNALS" title="Nhịp lớp" />
            <div className="b2-homeroom-rhythm">
              <div><span>Chuyên cần hôm nay</span><strong>{attendanceRate === null ? '—' : `${attendanceRate}%`}</strong></div>
              {attendanceRate === null ? <p className="b2-empty-copy">Chưa có phiên điểm danh hôm nay.</p> : <B2ProgressBar value={attendanceRate} tone="green" />}
              <div><span>Tiến độ học tập</span><strong>{averageProgress === null ? '—' : `${averageProgress}%`}</strong></div>
              {averageProgress === null ? <p className="b2-empty-copy">Learning records chưa có trường progress/score dùng được.</p> : <B2ProgressBar value={averageProgress} tone="blue" />}
              <div><span>Alert đang mở</span><strong>{stats.alerts}</strong></div>
              <B2ProgressBar value={stats.students ? Math.max(0, 100 - (stats.attention / stats.students) * 100) : 0} tone="violet" />
            </div>
          </B2Surface>
        </aside>
      </section>
    </>
  );
}
