import React, { useState } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SectionHeader, B2StatCard, B2Surface } from '../components/B2UI.jsx';
import { B2DataTable, B2DataToolbar, B2FilterChips, B2RowActions, B2Status } from '../components/B2Data.jsx';
import './B2Management.css';

const REPORTS=[
  {id:1,name:'Báo cáo chủ nhiệm tuần 34',area:'Lớp 12.6',created:'18/08/2026 · 20:42',format:'PDF',status:'ready'},
  {id:2,name:'Danh sách chuyên cần tháng 8',area:'Lớp 12.6',created:'18/08/2026 · 18:10',format:'XLSX',status:'ready'},
  {id:3,name:'Tổng hợp tiến độ học tập',area:'3 lớp',created:'17/08/2026 · 21:15',format:'PDF',status:'ready'},
  {id:4,name:'Báo cáo tổ chuyên môn',area:'Tổ Tiếng Anh',created:'16/08/2026 · 14:30',format:'DOCX',status:'draft'},
];

export default function B2Reports(){
  const [filter,setFilter]=useState('all');
  const rows=REPORTS.filter((item)=>filter==='all'||item.status===filter);
  const columns=[
    {key:'name',label:'Báo cáo',width:'42%',render:(row)=><div className="b2-report-name"><strong>{row.name}</strong><small>{row.area}</small></div>},
    {key:'created',label:'Cập nhật',width:'23%'},
    {key:'format',label:'Định dạng',width:'12%',render:(row)=><B2Badge>{row.format}</B2Badge>},
    {key:'status',label:'Trạng thái',width:'15%',render:(row)=><B2Status tone={row.status==='ready'?'green':'amber'}>{row.status==='ready'?'Sẵn sàng':'Bản nháp'}</B2Status>},
    {key:'actions',label:'',width:'8%',align:'right',render:()=> <B2RowActions items={[{label:'Mở báo cáo',icon:'↗'},{label:'Tải xuống',icon:'⇩'},{label:'Tạo bản sao',icon:'＋'}]} />},
  ];
  return <>
    <B2PageHeader eyebrow="WORK · REPORTS" title="Báo cáo" description="Một trung tâm thống nhất cho báo cáo lớp, học sinh, chuyên cần và tổ chuyên môn — tập trung vào việc tạo, xem lại và xuất dữ liệu." actions={<B2Button variant="primary">+ Tạo báo cáo</B2Button>} aside={<B2Badge tone="violet">Report Center V2</B2Badge>} />
    <section className="b2-management-stats">
      <B2StatCard label="Đã tạo" value="24" meta="trong tháng 8" tone="blue" icon="▱" />
      <B2StatCard label="Sẵn sàng" value="19" meta="có thể tải" tone="green" icon="✓" />
      <B2StatCard label="Bản nháp" value="05" meta="đang hoàn thiện" tone="violet" icon="◇" />
      <B2StatCard label="Đã chia sẻ" value="11" meta="với đồng nghiệp" tone="cyan" icon="↗" />
    </section>
    <section className="b2-report-templates">
      <B2SectionHeader eyebrow="QUICK CREATE" title="Mẫu thường dùng" description="Các mẫu chỉ mô tả loại báo cáo; logic xuất file thật sẽ tiếp tục dùng backend hiện tại khi migrate." />
      <div className="b2-report-template-grid">
        <B2Surface><span className="b2-report-template-icon">◎</span><strong>Chủ nhiệm tuần</strong><p>Sĩ số, chuyên cần, nề nếp và việc cần xử lý.</p><B2Button variant="ghost">Tạo báo cáo →</B2Button></B2Surface>
        <B2Surface><span className="b2-report-template-icon">▥</span><strong>Danh sách học sinh</strong><p>Xuất danh sách lớp với các cột được chọn.</p><B2Button variant="ghost">Tạo báo cáo →</B2Button></B2Surface>
        <B2Surface><span className="b2-report-template-icon">▤</span><strong>Tiến độ lớp</strong><p>Tổng hợp tiến độ và trạng thái theo lớp.</p><B2Button variant="ghost">Tạo báo cáo →</B2Button></B2Surface>
      </div>
    </section>
    <section className="b2-report-history">
      <B2SectionHeader eyebrow="HISTORY" title="Báo cáo gần đây" />
      <B2DataToolbar left={<B2FilterChips value={filter} onChange={setFilter} items={[{id:'all',label:'Tất cả',count:4},{id:'ready',label:'Sẵn sàng',count:3},{id:'draft',label:'Bản nháp',count:1}]} />} right={<B2Button variant="ghost">Quản lý mẫu</B2Button>} />
      <B2DataTable columns={columns} rows={rows} />
    </section>
  </>;
}
