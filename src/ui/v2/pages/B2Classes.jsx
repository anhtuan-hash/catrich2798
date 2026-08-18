import React, { useMemo, useState } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SearchBox, B2StatCard } from '../components/B2UI.jsx';
import { B2DataTable, B2DataToolbar, B2FilterChips, B2Pagination, B2ProgressBar, B2RowActions, B2Status } from '../components/B2Data.jsx';
import './B2Management.css';

const CLASSES = [
  { id: '12.6', name: '12.6', type: 'Chủ nhiệm', students: 28, subject: 'Tiếng Anh', progress: 88, status: 'active' },
  { id: '12.3', name: '12.3', type: 'Bộ môn', students: 31, subject: 'Tiếng Anh', progress: 81, status: 'active' },
  { id: '11.3', name: '11.3', type: 'Bộ môn', students: 34, subject: 'Tiếng Anh', progress: 76, status: 'active' },
  { id: '11.4', name: '11.4', type: 'Bộ môn', students: 32, subject: 'Tiếng Anh', progress: 72, status: 'archived' },
  { id: '10.2', name: '10.2', type: 'Bộ môn', students: 35, subject: 'Tiếng Anh', progress: 69, status: 'active' },
  { id: '10.5', name: '10.5', type: 'Bộ môn', students: 33, subject: 'Tiếng Anh', progress: 84, status: 'active' },
];

export default function B2Classes() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState([]);
  const rows = useMemo(() => CLASSES.filter((item) => {
    const q = query.trim().toLowerCase();
    if (q && !`${item.name} ${item.type} ${item.subject}`.toLowerCase().includes(q)) return false;
    if (filter === 'homeroom') return item.type === 'Chủ nhiệm';
    if (filter === 'subject') return item.type === 'Bộ môn';
    if (filter === 'archived') return item.status === 'archived';
    return true;
  }), [query, filter]);

  const columns = [
    { key: 'name', label: 'Lớp', width: '17%', render: (row) => <div className="b2-class-primary"><strong>{row.name}</strong><small>{row.students} học sinh</small></div> },
    { key: 'type', label: 'Loại lớp', width: '18%', render: (row) => <B2Status tone={row.type === 'Chủ nhiệm' ? 'green' : 'blue'}>{row.type}</B2Status> },
    { key: 'subject', label: 'Môn học', width: '18%' },
    { key: 'progress', label: 'Tiến độ', width: '28%', render: (row) => <B2ProgressBar value={row.progress} label={`${row.progress}%`} tone={row.progress >= 82 ? 'green' : 'blue'} /> },
    { key: 'actions', label: '', width: '10%', align: 'right', render: () => <B2RowActions items={[{ label: 'Mở lớp', icon: '↗' }, { label: 'Xuất danh sách', icon: '⇩' }, { label: 'Lưu trữ', icon: '□' }]} /> },
  ];

  return (
    <>
      <B2PageHeader
        eyebrow="MANAGE · CLASSES"
        title="Lớp học"
        description="Quản lý lớp chủ nhiệm và lớp bộ môn bằng cùng một cấu trúc dữ liệu, nhưng vẫn phân biệt rõ vai trò của từng lớp."
        actions={<><B2Button variant="primary">+ Thêm lớp</B2Button><B2Button>Nhập danh sách</B2Button></>}
        aside={<B2Badge tone="blue">{CLASSES.length} lớp</B2Badge>}
      />
      <section className="b2-management-stats">
        <B2StatCard label="Tổng lớp" value="06" meta="đang lưu" tone="blue" icon="♙" />
        <B2StatCard label="Chủ nhiệm" value="01" meta="lớp chính" tone="green" icon="◎" />
        <B2StatCard label="Bộ môn" value="05" meta="lớp giảng dạy" tone="violet" icon="▦" />
        <B2StatCard label="Học sinh" value="193" meta="trên toàn bộ lớp" tone="cyan" icon="▥" />
      </section>
      <B2DataToolbar
        selectedCount={selected.length}
        bulkActions={<><B2Button variant="ghost">Xuất danh sách</B2Button><B2Button variant="ghost">Gắn nhãn</B2Button></>}
        left={<><B2SearchBox value={query} onChange={setQuery} placeholder="Tìm lớp…" /><B2FilterChips value={filter} onChange={setFilter} items={[{ id: 'all', label: 'Tất cả', count: 6 }, { id: 'homeroom', label: 'Chủ nhiệm', count: 1 }, { id: 'subject', label: 'Bộ môn', count: 5 }, { id: 'archived', label: 'Lưu trữ', count: 1 }]} /></>}
        right={<B2Badge>{rows.length} hiển thị</B2Badge>}
      />
      <B2DataTable columns={columns} rows={rows} selectable selected={selected} onSelectionChange={setSelected} />
      <B2Pagination page={1} pageCount={1} total={rows.length} />
    </>
  );
}
