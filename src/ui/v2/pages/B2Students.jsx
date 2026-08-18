import React, { useMemo, useState } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SearchBox, B2StatCard } from '../components/B2UI.jsx';
import { B2DataState, B2DataTable, B2DataToolbar, B2FilterChips, B2Pagination, B2PersonCell, B2RowActions, B2Status } from '../components/B2Data.jsx';
import { dataSourceLabel, dataSourceTone, useBrianV2Data } from '../data/BrianV2DataContext.jsx';
import './B2Management.css';

export default function B2Students() {
  const { students, loading, refreshing, sources, refresh } = useBrianV2Data();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState([]);
  const perPage = 10;

  const counts = useMemo(() => ({
    all: students.length,
    attention: students.filter((student) => student.status === 'attention').length,
    absence: students.filter((student) => student.attendance.startsWith('Vắng')).length,
    present: students.filter((student) => student.attendance === 'Đủ').length,
  }), [students]);

  const filtered = useMemo(() => students.filter((student) => {
    const q = query.trim().toLowerCase();
    if (q && !`${student.name} ${student.className}`.toLowerCase().includes(q)) return false;
    if (filter === 'attention') return student.status === 'attention';
    if (filter === 'absence') return student.attendance.startsWith('Vắng');
    if (filter === 'present') return student.attendance === 'Đủ';
    return true;
  }), [students, query, filter]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / perPage));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * perPage, safePage * perPage);

  const columns = [
    { key: 'student', label: 'Học sinh', width: '34%', render: (row) => <B2PersonCell initials={row.initials} name={row.name} meta={`Lớp ${row.className}`} /> },
    { key: 'className', label: 'Lớp', width: '12%' },
    { key: 'attendance', label: 'Chuyên cần', width: '17%', render: (row) => <B2Status tone={row.attendance === 'Đủ' ? 'green' : row.attendance.startsWith('Vắng') ? 'amber' : 'neutral'}>{row.attendance}</B2Status> },
    { key: 'conduct', label: 'Nề nếp', width: '18%', render: (row) => <B2Status tone={row.conduct === 'Tốt' ? 'blue' : row.conduct === 'Theo dõi' ? 'red' : row.conduct === '—' ? 'neutral' : 'amber'}>{row.conduct}</B2Status> },
    { key: 'actions', label: '', width: '9%', align: 'right', render: (row) => <B2RowActions items={[{ label: 'Mở lớp trong V1', icon: '↗', onClick: () => window.open(`/#/homeroom?class=${encodeURIComponent(row.className)}`, '_blank', 'noopener,noreferrer') }, { label: 'Hồ sơ nguồn', icon: '◇' }]} /> },
  ];

  return <>
    <B2PageHeader
      eyebrow="MANAGE · STUDENTS · LIVE DATA"
      title="Học sinh"
      description="Roster được tổng hợp từ các lớp đã phân công. Chuyên cần và trạng thái cần chú ý chỉ được gắn khi V1 có dữ liệu tương ứng; V2 không tự suy đoán giá trị còn thiếu."
      actions={<><B2Button variant="ghost" onClick={() => refresh()} disabled={refreshing}>{refreshing ? 'Đang làm mới…' : '↻ Làm mới dữ liệu'}</B2Button><B2Button onClick={() => window.open('/#/homeroom', '_blank', 'noopener,noreferrer')}>Mở quản lý V1 ↗</B2Button></>}
      aside={<B2Badge tone={dataSourceTone(sources.students)}>{dataSourceLabel(sources.students)}</B2Badge>}
    />
    <section className="b2-management-stats">
      <B2StatCard label="Học sinh" value={String(counts.all)} meta="roster được phân công" tone="blue" icon="▥" />
      <B2StatCard label="Có mặt" value={String(counts.present)} meta="ghi nhận hôm nay" tone="green" icon="✓" />
      <B2StatCard label="Cần chú ý" value={String(counts.attention).padStart(2, '0')} meta="alert/support hiện có" tone="violet" icon="!" />
      <B2StatCard label="Vắng" value={String(counts.absence).padStart(2, '0')} meta="ghi nhận hôm nay" tone="cyan" icon="○" />
    </section>
    <B2DataToolbar
      selectedCount={selected.length}
      bulkActions={<B2Button variant="ghost" disabled>Chỉ đọc trong V2 Preview</B2Button>}
      left={<><B2SearchBox value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder="Tìm học sinh…" /><B2FilterChips value={filter} onChange={(value) => { setFilter(value); setPage(1); }} items={[{ id: 'all', label: 'Tất cả', count: counts.all }, { id: 'attention', label: 'Cần chú ý', count: counts.attention }, { id: 'absence', label: 'Vắng', count: counts.absence }, ...(counts.present ? [{ id: 'present', label: 'Có mặt', count: counts.present }] : [])]} /></>}
      right={<B2Badge>{filtered.length} kết quả</B2Badge>}
    />
    {loading ? <B2DataState type="loading" /> : <B2DataTable columns={columns} rows={rows} selectable selected={selected} onSelectionChange={setSelected} empty={<B2DataState title="Không tìm thấy học sinh" description={students.length ? 'Thử thay đổi từ khóa hoặc bộ lọc hiện tại.' : 'Nguồn lớp hiện tại chưa trả về roster học sinh.'} />} />}
    <B2Pagination page={safePage} pageCount={pageCount} total={filtered.length} onChange={setPage} />
  </>;
}
