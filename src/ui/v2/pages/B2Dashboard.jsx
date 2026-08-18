import React, { useMemo, useState } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SectionHeader, B2StatCard, B2Surface } from '../components/B2UI.jsx';
import { B2DataState, B2DataTable, B2DataToolbar, B2FilterChips, B2Status } from '../components/B2Data.jsx';
import { dashboardDueLabel, getDashboardDueState } from '../../../utils/dashboardAggregator.js';
import { dataSourceLabel, dataSourceTone, useBrianV2Data } from '../data/BrianV2DataContext.jsx';
import './B2Dashboard.css';

function timeLabel(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function dateMeta(value) {
  if (!value) return 'Chưa đặt thời gian';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date);
}

function dueTone(item) {
  const state = getDashboardDueState(item?.date, item?.done);
  if (state === 'overdue' || state === 'today') return 'red';
  if (state === 'soon') return 'amber';
  if (item?.status === 'submitted' || item?.status === 'pending') return 'violet';
  return item?.done ? 'green' : 'blue';
}

export default function B2Dashboard() {
  const { dashboard, loading, refreshing, sources, errors, refresh } = useBrianV2Data();
  const [taskFilter, setTaskFilter] = useState('all');
  const tasks = dashboard?.attention || [];
  const timeline = dashboard?.timeline || [];
  const professional = dashboard?.professional || [];
  const stats = dashboard?.stats || { today: 0, overdue: 0, dueSoon: 0, pendingApproval: 0, upcoming: 0, notifications: 0 };

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    if (taskFilter === 'all') return true;
    if (taskFilter === 'urgent') return ['overdue', 'today'].includes(getDashboardDueState(task.date, task.done));
    if (taskFilter === 'review') return task.status === 'submitted' || task.status === 'pending';
    return true;
  }), [tasks, taskFilter]);

  const urgentCount = tasks.filter((task) => ['overdue', 'today'].includes(getDashboardDueState(task.date, task.done))).length;
  const reviewCount = tasks.filter((task) => task.status === 'submitted' || task.status === 'pending').length;

  const columns = [
    { key: 'task', label: 'Việc cần làm', width: '43%', render: (row) => <div className="b2-dashboard-task"><strong>{row.title}</strong><small>{row.sourceLabel || row.source || 'Brian'}</small></div> },
    { key: 'due', label: 'Hạn', width: '23%', render: (row) => <span className={['overdue', 'today'].includes(getDashboardDueState(row.date, row.done)) ? 'is-urgent' : ''}>{dashboardDueLabel(row.date, row.done, 'vi')}</span> },
    { key: 'owner', label: 'Phụ trách', width: '16%', render: (row) => row.owner || '—' },
    { key: 'status', label: 'Trạng thái', width: '18%', render: (row) => <B2Status tone={dueTone(row)}>{row.done ? 'Hoàn tất' : row.status || getDashboardDueState(row.date, row.done)}</B2Status> },
  ];

  return (
    <>
      <B2PageHeader
        eyebrow="WORK · DASHBOARD · LIVE AGGREGATOR"
        title="Bảng điều hành"
        description="Dashboard Metro Next dùng trực tiếp Dashboard Aggregator của Brian: Work Hub, lịch, Resource Library và lớp chủ nhiệm được tổng hợp bằng cùng nguồn dữ liệu với V1."
        actions={<><B2Button variant="ghost" onClick={() => refresh()} disabled={refreshing}>{refreshing ? 'Đang làm mới…' : '↻ Làm mới'}</B2Button><B2Button onClick={() => window.open('/#/dashboard', '_blank', 'noopener,noreferrer')}>Mở Dashboard V1 ↗</B2Button></>}
        aside={<B2Badge tone={dataSourceTone(sources.dashboard)}>{dataSourceLabel(sources.dashboard)}</B2Badge>}
      />

      <section className="b2-dashboard-stats">
        <B2StatCard label="Đến hạn hôm nay" value={String(stats.today)} meta="từ Action Center" tone="blue" icon="▤" />
        <B2StatCard label="Quá hạn" value={String(stats.overdue)} meta="cần xử lý" tone="violet" icon="!" />
        <B2StatCard label="Chờ duyệt" value={String(stats.pendingApproval)} meta={dashboard?.leader ? 'quyền leader' : 'theo quyền hiện tại'} tone="green" icon="◇" />
        <B2StatCard label="Sắp tới" value={String(stats.upcoming)} meta="trong 14 ngày" tone="cyan" icon="◷" />
      </section>

      <section className="b2-dashboard-grid">
        <div className="b2-dashboard-main">
          <B2SectionHeader eyebrow="ACTION CENTER" title="Việc cần làm" description="Không tạo task giả: bảng này là `snapshot.attention` của dashboard aggregator hiện tại." />
          <B2DataToolbar
            left={<B2FilterChips items={[{ id: 'all', label: 'Tất cả', count: tasks.length }, { id: 'urgent', label: 'Ưu tiên', count: urgentCount }, { id: 'review', label: 'Chờ duyệt', count: reviewCount }]} value={taskFilter} onChange={setTaskFilter} />}
            right={<B2Button variant="ghost" onClick={() => window.open('/#/work-hub', '_blank', 'noopener,noreferrer')}>Work Hub →</B2Button>}
          />
          {loading ? <B2DataState type="loading" /> : <B2DataTable columns={columns} rows={visibleTasks} empty={<B2DataState title="Không có việc cần hành động" description="Aggregator hiện không trả về item phù hợp với bộ lọc này." />} />}
        </div>

        <aside className="b2-dashboard-side">
          <B2Surface>
            <B2SectionHeader eyebrow="UPCOMING" title="Lịch gần nhất" action={<B2Button variant="ghost" onClick={() => window.open('/#/work-hub', '_blank', 'noopener,noreferrer')}>Lịch →</B2Button>} />
            <div className="b2-dashboard-timeline">
              {timeline.length ? timeline.slice(0, 6).map((item) => (
                <div key={item.id || `${item.date}-${item.title}`} className={`tone-${item.tone || 'blue'}`}>
                  <time>{timeLabel(item.date)}</time>
                  <span className="b2-dashboard-timeline__line" />
                  <span><strong>{item.title}</strong><small>{dateMeta(item.date)} · {item.sourceLabel || item.source}</small></span>
                </div>
              )) : <p className="b2-empty-copy">Không có lịch sắp tới trong snapshot hiện tại.</p>}
            </div>
          </B2Surface>
        </aside>
      </section>

      <section className="b2-dashboard-lower">
        <B2Surface>
          <B2SectionHeader eyebrow="WORK STREAM" title="Công việc gần đây" description="Thay cho các progress % mẫu: chỉ hiển thị item thật và trạng thái thật từ Work Hub." />
          <div className="b2-dashboard-team">
            {professional.length ? professional.slice(0, 6).map((item) => (
              <div key={item.id}>
                <span><strong>{item.title}</strong><small>{item.owner || item.sourceLabel || 'Brian'}</small></span>
                <span className="b2-dashboard-work-date">{dashboardDueLabel(item.date, item.done, 'vi')}</span>
                <B2Status tone={dueTone(item)}>{item.done ? 'Hoàn tất' : item.status || 'Đang mở'}</B2Status>
              </div>
            )) : <p className="b2-empty-copy">Chưa có Work Hub item trong snapshot.</p>}
          </div>
        </B2Surface>

        <B2Surface>
          <B2SectionHeader eyebrow="DATA SOURCES" title="Tình trạng nguồn" />
          <div className="b2-dashboard-health">
            <div><span className={sources.classes === 'empty' ? '' : 'is-ok'} /><strong>Lớp học</strong><small>{dataSourceLabel(sources.classes)}</small></div>
            <div><span className={sources.resources === 'empty' ? '' : 'is-ok'} /><strong>Kho học liệu</strong><small>{dataSourceLabel(sources.resources)}</small></div>
            <div><span className={sources.homeroom === 'empty' ? '' : 'is-ok'} /><strong>Chủ nhiệm</strong><small>{dataSourceLabel(sources.homeroom)}</small></div>
            <div><span className={errors.length ? '' : 'is-ok'} /><strong>Bridge errors</strong><small>{errors.length ? `${errors.length} nguồn cần kiểm tra` : 'Không có lỗi nguồn'}</small></div>
          </div>
        </B2Surface>
      </section>
    </>
  );
}
