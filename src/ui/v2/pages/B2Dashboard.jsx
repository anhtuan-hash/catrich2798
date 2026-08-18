import React, { useState } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SectionHeader, B2StatCard, B2Surface } from '../components/B2UI.jsx';
import { B2DataTable, B2DataToolbar, B2FilterChips, B2ProgressBar, B2Status } from '../components/B2Data.jsx';
import './B2Dashboard.css';

const TASKS = [
  { id: 1, task: 'Hoàn tất kế hoạch sinh hoạt tuần 34', area: 'Chủ nhiệm', due: 'Hôm nay · 21:00', owner: 'Bạn', status: 'urgent' },
  { id: 2, task: 'Duyệt website Teaching Tool Hub', area: 'Tổ chuyên môn', due: 'Ngày mai', owner: 'TTCM', status: 'review' },
  { id: 3, task: 'Cập nhật học liệu Tiếng Anh 12', area: 'Học liệu', due: '20/08', owner: 'Bạn', status: 'normal' },
  { id: 4, task: 'Kiểm tra tiến độ bài tập tuần', area: 'Giảng dạy', due: '21/08', owner: 'Bạn', status: 'normal' },
];

const TIMELINE = [
  { time: '07:30', title: 'Tiếng Anh 12.6', meta: 'Phòng 12.6', tone: 'blue' },
  { time: '09:15', title: 'Tiếng Anh 11.3', meta: 'Phòng 11.3', tone: 'violet' },
  { time: '13:15', title: 'Sinh hoạt / công việc tổ', meta: 'Phòng họp', tone: 'green' },
  { time: '15:30', title: 'Rà soát học liệu tuần', meta: 'Brian Resource Library', tone: 'cyan' },
];

const TEAM = [
  { id: 1, item: 'Kế hoạch chuyên môn tháng 8', owner: 'Tổ Tiếng Anh', progress: 92, status: 'Đúng tiến độ' },
  { id: 2, item: 'Kho học liệu dùng chung', owner: '6 giáo viên', progress: 76, status: 'Đang cập nhật' },
  { id: 3, item: 'Ngân hàng đề kiểm tra', owner: 'TTCM', progress: 64, status: 'Cần bổ sung' },
];

export default function B2Dashboard() {
  const [taskFilter, setTaskFilter] = useState('all');
  const visibleTasks = TASKS.filter((task) => taskFilter === 'all' || task.status === taskFilter);

  const columns = [
    { key: 'task', label: 'Việc cần làm', width: '42%', render: (row) => <div className="b2-dashboard-task"><strong>{row.task}</strong><small>{row.area}</small></div> },
    { key: 'due', label: 'Hạn', width: '20%', render: (row) => <span className={row.status === 'urgent' ? 'is-urgent' : ''}>{row.due}</span> },
    { key: 'owner', label: 'Phụ trách', width: '16%' },
    { key: 'status', label: 'Trạng thái', width: '22%', render: (row) => <B2Status tone={row.status === 'urgent' ? 'red' : row.status === 'review' ? 'violet' : 'blue'}>{row.status === 'urgent' ? 'Ưu tiên' : row.status === 'review' ? 'Chờ duyệt' : 'Đang làm'}</B2Status> },
  ];

  return (
    <>
      <B2PageHeader
        eyebrow="WORK · DASHBOARD"
        title="Bảng điều hành"
        description="Một màn hình để biết ngay hôm nay cần làm gì, lịch nào sắp tới và khu vực nào đang cần chú ý."
        actions={<><B2Button variant="primary">+ Tạo việc</B2Button><B2Button>Tuần này</B2Button></>}
        aside={<B2Badge tone="green">Đồng bộ bình thường</B2Badge>}
      />

      <section className="b2-dashboard-stats">
        <B2StatCard label="Cần xử lý" value="08" meta="3 việc hôm nay" tone="blue" icon="▤" />
        <B2StatCard label="Chờ duyệt" value="03" meta="từ tổ chuyên môn" tone="violet" icon="◇" />
        <B2StatCard label="Sắp tới" value="04" meta="lịch trong 24 giờ" tone="green" icon="◷" />
        <B2StatCard label="Hoàn tất" value="17" meta="trong 7 ngày" tone="cyan" icon="✓" />
      </section>

      <section className="b2-dashboard-grid">
        <div className="b2-dashboard-main">
          <B2SectionHeader eyebrow="ACTION CENTER" title="Việc cần làm" description="Tập trung các đầu việc thật sự cần hành động, không biến dashboard thành một bức tường số liệu." />
          <B2DataToolbar
            left={<B2FilterChips items={[{ id: 'all', label: 'Tất cả', count: TASKS.length }, { id: 'urgent', label: 'Ưu tiên', count: 1 }, { id: 'review', label: 'Chờ duyệt', count: 1 }]} value={taskFilter} onChange={setTaskFilter} />}
            right={<B2Button variant="ghost">Xem tất cả →</B2Button>}
          />
          <B2DataTable columns={columns} rows={visibleTasks} />
        </div>

        <aside className="b2-dashboard-side">
          <B2Surface>
            <B2SectionHeader eyebrow="TODAY" title="Lịch gần nhất" action={<B2Button variant="ghost">Lịch →</B2Button>} />
            <div className="b2-dashboard-timeline">
              {TIMELINE.map((item) => (
                <div key={`${item.time}-${item.title}`} className={`tone-${item.tone}`}>
                  <time>{item.time}</time>
                  <span className="b2-dashboard-timeline__line" />
                  <span><strong>{item.title}</strong><small>{item.meta}</small></span>
                </div>
              ))}
            </div>
          </B2Surface>
        </aside>
      </section>

      <section className="b2-dashboard-lower">
        <B2Surface>
          <B2SectionHeader eyebrow="DEPARTMENT" title="Tiến độ của tổ" description="Chỉ hiển thị những luồng có ý nghĩa quản lý." />
          <div className="b2-dashboard-team">
            {TEAM.map((item) => (
              <div key={item.id}>
                <span><strong>{item.item}</strong><small>{item.owner}</small></span>
                <B2ProgressBar value={item.progress} label={`${item.progress}%`} tone={item.progress >= 85 ? 'green' : item.progress < 70 ? 'violet' : 'blue'} />
                <B2Status tone={item.progress >= 85 ? 'green' : item.progress < 70 ? 'amber' : 'blue'}>{item.status}</B2Status>
              </div>
            ))}
          </div>
        </B2Surface>

        <B2Surface>
          <B2SectionHeader eyebrow="SYSTEM" title="Tình trạng Brian" />
          <div className="b2-dashboard-health">
            <div><span className="is-ok"/><strong>Supabase</strong><small>Kết nối ổn định</small></div>
            <div><span className="is-ok"/><strong>Autosave</strong><small>Đang hoạt động</small></div>
            <div><span className="is-ok"/><strong>Vercel</strong><small>Production ổn định</small></div>
            <div><span className="is-ok"/><strong>Shadow UI</strong><small>Không ảnh hưởng V1</small></div>
          </div>
        </B2Surface>
      </section>
    </>
  );
}
