import React, { useMemo } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SectionHeader, B2StatCard, B2Surface } from '../components/B2UI.jsx';
import { B2DataState, B2Status } from '../components/B2Data.jsx';
import { dataSourceLabel, dataSourceTone, useBrianV2Data } from '../data/BrianV2DataContext.jsx';
import './B2SystemWorkspaces.css';

const openV1 = (target = 'work-hub') => window.open(`/#/${target}`, '_blank', 'noopener,noreferrer');
const safeArray = (value) => Array.isArray(value) ? value : [];

export default function B2WorkHub() {
  const { dashboard, sources, loading, refreshing, refresh } = useBrianV2Data();
  const attention = safeArray(dashboard?.attention);
  const professional = safeArray(dashboard?.professional);
  const timeline = safeArray(dashboard?.timeline);
  const approvals = safeArray(dashboard?.approvals);
  const stats = dashboard?.stats || {};
  const openItems = useMemo(() => professional.filter((item) => !item.done), [professional]);

  return <>
    <B2PageHeader
      eyebrow="WORK · UNIFIED WORK HUB"
      title="Trung tâm công việc"
      description="Metro Next đọc cùng nguồn Work Hub/Dashboard Aggregator của Brian V1. Việc tạo, sửa, duyệt và giao nhiệm vụ vẫn được chuyển sang workflow V1 trong giai đoạn read-first."
      actions={<><B2Button variant="primary" onClick={() => openV1('work-hub')}>Mở Work Hub V1 ↗</B2Button><B2Button onClick={() => refresh()}>{refreshing ? 'Đang làm mới…' : 'Làm mới'}</B2Button></>}
      aside={<B2Badge tone={dataSourceTone(sources.dashboard)}>{dataSourceLabel(sources.dashboard)}</B2Badge>}
    />

    <section className="b2-system-stats">
      <B2StatCard label="Đến hạn hôm nay" value={String(stats.today || 0).padStart(2, '0')} meta="nguồn thật" tone="blue" icon="◷" />
      <B2StatCard label="Quá hạn" value={String(stats.overdue || 0).padStart(2, '0')} meta="cần xử lý" tone="violet" icon="!" />
      <B2StatCard label="Chờ duyệt" value={String(stats.pendingApproval || 0).padStart(2, '0')} meta="theo quyền hiện tại" tone="green" icon="◇" />
      <B2StatCard label="Sắp tới" value={String(stats.upcoming || 0).padStart(2, '0')} meta="14 ngày" tone="cyan" icon="▤" />
    </section>

    <section className="b2-system-grid">
      <div className="b2-system-stack">
        <div>
          <B2SectionHeader eyebrow="ACTION CENTER" title="Cần chú ý" description={`${attention.length} mục từ Work Hub, lịch và quy trình đang hoạt động.`} />
          {loading ? <B2DataState type="loading" /> : attention.length ? <div className="b2-system-list">
            {attention.slice(0, 12).map((item) => <article key={item.id} className="b2-system-row">
              <div className="b2-system-row__copy"><strong>{item.title}</strong><small>{item.description || item.sourceLabel || 'Brian Work Hub'}</small><em>{item.owner || item.sourceLabel || ''}</em></div>
              <div className="b2-system-row__meta"><B2Status tone={item.tone === 'danger' ? 'red' : item.tone === 'warning' ? 'amber' : item.status === 'submitted' ? 'violet' : 'blue'}>{item.status || 'Đang mở'}</B2Status></div>
            </article>)}
          </div> : <div className="b2-system-empty"><div><strong>Không có việc cần chú ý</strong><p>Dashboard Aggregator hiện không trả về mục mở nào cho tài khoản này.</p></div></div>}
        </div>

        <div>
          <B2SectionHeader eyebrow="UPCOMING" title="Lịch sắp tới" description={`${timeline.length} mục trong cửa sổ thời gian hiện tại.`} />
          {timeline.length ? <div className="b2-system-list">{timeline.slice(0, 8).map((item) => <article key={item.id} className="b2-system-row"><div className="b2-system-row__copy"><strong>{item.title}</strong><small>{item.description || item.sourceLabel}</small><em>{item.date ? new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(item.date)) : 'Chưa đặt thời gian'}</em></div><B2Badge tone="blue">{item.sourceLabel || 'Lịch'}</B2Badge></article>)}</div> : <div className="b2-system-empty"><div><strong>Chưa có lịch sắp tới</strong><p>Không tạo lịch giả trong Shadow UI.</p></div></div>}
        </div>
      </div>

      <aside className="b2-system-stack">
        <B2Surface><B2SectionHeader eyebrow="WORKFLOW" title="Tình trạng"/><div className="b2-system-mini-grid"><div className="b2-system-mini"><span>Đang mở</span><strong>{openItems.length}</strong><small>professional items</small></div><div className="b2-system-mini"><span>Đã hoàn tất</span><strong>{dashboard?.workflowHealth?.completed || 0}</strong><small>workflow items</small></div><div className="b2-system-mini"><span>Phê duyệt</span><strong>{approvals.length}</strong><small>role-aware</small></div><div className="b2-system-mini"><span>Thông báo</span><strong>{stats.notifications || 0}</strong><small>Work Hub</small></div></div></B2Surface>
        <B2Surface><B2SectionHeader eyebrow="COMMANDS" title="Thao tác ghi dữ liệu" description="Trong giai đoạn read-first, các lệnh này mở engine V1."/><div className="b2-system-action-list"><button onClick={() => openV1('work-hub')}><span>＋</span><strong>Tạo / giao công việc</strong><em>↗</em></button><button onClick={() => openV1('work-hub')}><span>◇</span><strong>Duyệt sản phẩm</strong><em>↗</em></button><button onClick={() => openV1('work-hub')}><span>◷</span><strong>Quản lý lịch chung</strong><em>↗</em></button></div></B2Surface>
      </aside>
    </section>
  </>;
}
