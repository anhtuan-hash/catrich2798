import React, { useMemo, useState } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SearchBox, B2StatCard } from '../components/B2UI.jsx';
import { B2DataState, B2DataTable, B2DataToolbar, B2FilterChips, B2Pagination, B2ProgressBar, B2RowActions, B2Status } from '../components/B2Data.jsx';
import { dataSourceLabel, dataSourceTone, useBrianV2Data } from '../data/BrianV2DataContext.jsx';
import './B2Management.css';

export default function B2Classes() {
  const { classes, loading, refreshing, sources, refresh } = useBrianV2Data();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState([]);
  const rows = useMemo(() => classes.filter((item) => {
    const q = query.trim().toLowerCase();
    if (q && !`${item.name} ${item.type} ${item.subject}`.toLowerCase().includes(q)) return false;
    if (filter === 'homeroom') return item.type === 'Chủ nhiệm';
    if (filter === 'subject') return item.type === 'Bộ môn';
    if (filter === 'managed') return item.type === 'Quản lý';
    if (filter === 'archived') return item.status === 'archived';
    return true;
  }), [classes, query, filter]);

  const counts = useMemo(() => ({
    all: classes.length,
    homeroom: classes.filter((item) => item.type === 'Chủ nhiệm').length,
    subject: classes.filter((item) => item.type === 'Bộ môn').length,
    managed: classes.filter((item) => item.type === 'Quản lý').length,
    archived: classes.filter((item) => item.status === 'archived').length,
    students: classes.filter((item) => item.status !== 'archived').reduce((sum, item) => sum + Number(item.students || 0), 0),
  }), [classes]);

  const columns = [
    { key: 'name', label: 'Lớp', width: '18%', render: (row) => <div className="b2-class-primary"><strong>{row.name}</strong><small>{row.students} học sinh</small></div> },
    { key: 'type', label: 'Loại lớp', width: '18%', render: (row) => <B2Status tone={row.type === 'Chủ nhiệm' ? 'green' : row.type === 'Quản lý' ? 'violet' : 'blue'}>{row.type}</B2Status> },
    { key: 'schoolYear', label: 'Năm học', width: '18%', render: (row) => row.schoolYear || '—' },
    { key: 'progress', label: 'Tiến độ', width: '27%', render: (row) => Number.isFinite(row.progress) ? <B2ProgressBar value={row.progress} label={`${row.progress}%`} tone={row.progress >= 82 ? 'green' : 'blue'} /> : <span className="b2-muted-cell">Chưa có dữ liệu</span> },
    { key: 'actions', label: '', width: '10%', align: 'right', render: (row) => <B2RowActions items={[{ label: 'Mở lớp V1', icon: '↗', onClick: () => { window.open(`/#/homeroom?class=${encodeURIComponent(row.name)}`, '_blank', 'noopener,noreferrer'); } }, { label: 'Xem dữ liệu nguồn', icon: '◇' }]} /> },
  ];

  const filters = [
    { id: 'all', label: 'Tất cả', count: counts.all },
    { id: 'homeroom', label: 'Chủ nhiệm', count: counts.homeroom },
    { id: 'subject', label: 'Bộ môn', count: counts.subject },
    ...(counts.managed ? [{ id: 'managed', label: 'Quản lý', count: counts.managed }] : []),
    ...(counts.archived ? [{ id: 'archived', label: 'Lưu trữ', count: counts.archived }] : []),
  ];

  return (
    <>
      <B2PageHeader
        eyebrow="MANAGE · CLASSES · LIVE DATA"
        title="Lớp học"
        description="Danh mục lớp được đọc từ lớp đã phân công và Homeroom Workspace hiện tại. Shadow UI không tạo hoặc sửa lớp trong lượt bridge này."
        actions={<><B2Button variant="ghost" onClick={() => refresh()} disabled={refreshing}>{refreshing ? 'Đang làm mới…' : '↻ Làm mới dữ liệu'}</B2Button><B2Button onClick={() => window.open('/#/homeroom', '_blank', 'noopener,noreferrer')}>Quản lý trong V1 ↗</B2Button></>}
        aside={<B2Badge tone={dataSourceTone(sources.classes)}>{dataSourceLabel(sources.classes)}</B2Badge>}
      />
      <section className="b2-management-stats">
        <B2StatCard label="Tổng lớp" value={String(counts.all).padStart(2, '0')} meta="theo phân công" tone="blue" icon="♙" />
        <B2StatCard label="Chủ nhiệm" value={String(counts.homeroom).padStart(2, '0')} meta="lớp chính" tone="green" icon="◎" />
        <B2StatCard label="Bộ môn" value={String(counts.subject).padStart(2, '0')} meta="lớp giảng dạy" tone="violet" icon="▦" />
        <B2StatCard label="Học sinh" value={String(counts.students)} meta="tổng roster hoạt động" tone="cyan" icon="▥" />
      </section>
      <B2DataToolbar
        selectedCount={selected.length}
        bulkActions={<B2Button variant="ghost" disabled>Chỉ đọc trong V2 Preview</B2Button>}
        left={<><B2SearchBox value={query} onChange={setQuery} placeholder="Tìm lớp…" /><B2FilterChips value={filter} onChange={setFilter} items={filters} /></>}
        right={<B2Badge>{rows.length} hiển thị</B2Badge>}
      />
      {loading ? <B2DataState type="loading" /> : (
        <B2DataTable
          columns={columns}
          rows={rows}
          selectable
          selected={selected}
          onSelectionChange={setSelected}
          empty={<B2DataState title="Chưa có lớp trong nguồn hiện tại" description="Nếu V1 đã có lớp nhưng đây vẫn trống, dùng nút Làm mới dữ liệu để chạy lại read bridge." />}
        />
      )}
      <B2Pagination page={1} pageCount={1} total={rows.length} />
    </>
  );
}
