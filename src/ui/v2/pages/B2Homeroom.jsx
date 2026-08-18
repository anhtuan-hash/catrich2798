import React, { useMemo, useState } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SearchBox, B2SectionHeader, B2StatCard, B2Surface } from '../components/B2UI.jsx';
import { B2DataTable, B2DataToolbar, B2FilterChips, B2PersonCell, B2ProgressBar, B2Status } from '../components/B2Data.jsx';
import './B2Homeroom.css';

const STUDENTS = [
  { id: 1, name: 'Bùi Tiến Anh', initials: 'TA', attendance: 'Đủ', conduct: 'Tốt', progress: 86, note: 'Ổn định' },
  { id: 2, name: 'Trần Tuấn Anh', initials: 'TA', attendance: 'Đủ', conduct: 'Tốt', progress: 82, note: 'Ổn định' },
  { id: 3, name: 'Huỳnh Anna', initials: 'HA', attendance: 'Đủ', conduct: 'Tốt', progress: 91, note: 'Nổi bật' },
  { id: 4, name: 'Đinh Bảo Châu', initials: 'BC', attendance: 'Đủ', conduct: 'Khá', progress: 74, note: 'Theo dõi' },
  { id: 5, name: 'Nguyễn Lê Gia Kiệt', initials: 'GK', attendance: 'Vắng 1', conduct: 'Tốt', progress: 79, note: 'Ổn định' },
  { id: 6, name: 'Nguyễn Hồng Hải Phụng', initials: 'HP', attendance: 'Đủ', conduct: 'Theo dõi', progress: 68, note: 'Cần chú ý' },
  { id: 7, name: 'Phạm Hoàng Thiên', initials: 'HT', attendance: 'Đủ', conduct: 'Tốt', progress: 88, note: 'Ổn định' },
  { id: 8, name: 'Trương Mỹ Uyên', initials: 'MU', attendance: 'Đủ', conduct: 'Tốt', progress: 93, note: 'Nổi bật' },
];

const FILTERS = [
  { id: 'all', label: 'Tất cả', count: 28 },
  { id: 'attention', label: 'Cần chú ý', count: 3 },
  { id: 'absence', label: 'Vắng', count: 1 },
  { id: 'highlight', label: 'Nổi bật', count: 4 },
];

export default function B2Homeroom() {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const rows = useMemo(() => STUDENTS.filter((student) => {
    const matchQuery = student.name.toLowerCase().includes(query.trim().toLowerCase());
    if (!matchQuery) return false;
    if (filter === 'attention') return student.note === 'Cần chú ý' || student.note === 'Theo dõi';
    if (filter === 'absence') return student.attendance !== 'Đủ';
    if (filter === 'highlight') return student.note === 'Nổi bật';
    return true;
  }), [query, filter]);

  const columns = [
    { key: 'student', label: 'Học sinh', width: '29%', render: (row) => <B2PersonCell initials={row.initials} name={row.name} meta="Lớp 12.6" /> },
    { key: 'attendance', label: 'Chuyên cần', width: '14%', render: (row) => <B2Status tone={row.attendance === 'Đủ' ? 'green' : 'amber'}>{row.attendance}</B2Status> },
    { key: 'conduct', label: 'Nề nếp', width: '16%', render: (row) => <B2Status tone={row.conduct === 'Tốt' ? 'blue' : row.conduct === 'Theo dõi' ? 'red' : 'amber'}>{row.conduct}</B2Status> },
    { key: 'progress', label: 'Tiến độ', width: '24%', render: (row) => <B2ProgressBar value={row.progress} label={`${row.progress}%`} tone={row.progress >= 85 ? 'green' : row.progress < 72 ? 'violet' : 'blue'} /> },
    { key: 'note', label: 'Trạng thái', width: '17%', render: (row) => <strong className="b2-homeroom-note">{row.note}</strong> },
  ];

  return (
    <>
      <B2PageHeader
        eyebrow="MANAGE · HOMEROOM"
        title="Chủ nhiệm 12.6"
        description="Một workspace cô đọng cho sĩ số, chuyên cần, nề nếp, tiến độ và các việc cần xử lý của lớp chủ nhiệm."
        actions={<><B2Button variant="primary">Điểm danh</B2Button><B2Button>Ghi nhận nhanh</B2Button><B2Button variant="ghost">Xuất báo cáo</B2Button></>}
        aside={<div className="b2-homeroom-code"><strong>12.6</strong><span>28 học sinh</span></div>}
      />

      <section className="b2-homeroom-stats">
        <B2StatCard label="Sĩ số" value="28" meta="đang quản lý" tone="blue" icon="◎" />
        <B2StatCard label="Có mặt" value="27" meta="hôm nay" tone="green" icon="✓" />
        <B2StatCard label="Cần chú ý" value="03" meta="học sinh" tone="violet" icon="!" />
        <B2StatCard label="Việc tuần này" value="05" meta="chưa hoàn tất" tone="cyan" icon="▤" />
      </section>

      <section className="b2-homeroom-layout">
        <div className="b2-homeroom-main">
          <B2SectionHeader eyebrow="STUDENTS" title="Danh sách lớp" description="Thiết kế bảng chuẩn V2: gọn trên desktop và tự chuyển thành list card trên điện thoại." />
          <B2DataToolbar
            left={<><B2SearchBox value={query} onChange={setQuery} placeholder="Tìm học sinh…" /><B2FilterChips items={FILTERS} value={filter} onChange={setFilter} /></>}
            right={<B2Badge tone="blue">{rows.length} hiển thị</B2Badge>}
          />
          <B2DataTable columns={columns} rows={rows} />
        </div>

        <aside className="b2-homeroom-side">
          <B2Surface>
            <B2SectionHeader eyebrow="TODAY" title="Việc cần xử lý" />
            <div className="b2-homeroom-actions">
              <button type="button"><span>01</span><strong>Xác nhận chuyên cần</strong><small>Trước 10:00</small></button>
              <button type="button"><span>02</span><strong>Liên hệ phụ huynh</strong><small>2 trường hợp</small></button>
              <button type="button"><span>03</span><strong>Hoàn tất sinh hoạt tuần</strong><small>Tuần 34</small></button>
            </div>
          </B2Surface>
          <B2Surface>
            <B2SectionHeader eyebrow="WEEK 34" title="Nhịp lớp" />
            <div className="b2-homeroom-rhythm">
              <div><span>Chuyên cần</span><strong>96%</strong></div>
              <B2ProgressBar value={96} tone="green" />
              <div><span>Nề nếp</span><strong>89%</strong></div>
              <B2ProgressBar value={89} />
              <div><span>Hoàn thành công việc</span><strong>82%</strong></div>
              <B2ProgressBar value={82} tone="violet" />
            </div>
          </B2Surface>
        </aside>
      </section>
    </>
  );
}
