import React, { useMemo, useState } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SearchBox, B2StatCard } from '../components/B2UI.jsx';
import { B2DataState, B2DataTable, B2DataToolbar, B2FilterChips, B2Pagination, B2PersonCell, B2RowActions, B2Status } from '../components/B2Data.jsx';
import './B2Management.css';

const ALL = [
  ['Bùi Tiến Anh','12.6','TA','Tốt','Đủ','active'],['Trần Tuấn Anh','12.6','TA','Tốt','Đủ','active'],['Huỳnh Anna','12.6','HA','Tốt','Đủ','active'],['Đinh Bảo Châu','12.6','BC','Khá','Đủ','attention'],['Pei Quang Dũng','12.6','QD','Tốt','Đủ','active'],['Trần Hoàng Đăng','12.6','HD','Tốt','Đủ','active'],['Trịnh Minh Đăng','12.6','MD','Tốt','Đủ','active'],['Lữ Thừa Hàn','12.6','TH','Khá','Đủ','active'],['Nhỉn Việt Hân','12.6','VH','Tốt','Đủ','active'],['Phạm Hồ Minh Huy','12.6','MH','Tốt','Đủ','active'],['Nguyễn Lê Gia Kiệt','12.6','GK','Tốt','Vắng 1','absence'],['Nguyễn Hồng Hải Phụng','12.6','HP','Theo dõi','Đủ','attention'],['Phạm Hoàng Thiên','12.6','HT','Tốt','Đủ','active'],['Trương Mỹ Uyên','12.6','MU','Tốt','Đủ','active'],
].map((item,index)=>({id:index+1,name:item[0],className:item[1],initials:item[2],conduct:item[3],attendance:item[4],status:item[5]}));

export default function B2Students() {
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState('all');
  const [page,setPage]=useState(1);
  const [selected,setSelected]=useState([]);
  const perPage=7;
  const filtered=useMemo(()=>ALL.filter((student)=>{
    const q=query.trim().toLowerCase();
    if(q&&!`${student.name} ${student.className}`.toLowerCase().includes(q)) return false;
    if(filter==='attention') return student.status==='attention';
    if(filter==='absence') return student.status==='absence';
    return true;
  }),[query,filter]);
  const pageCount=Math.max(1,Math.ceil(filtered.length/perPage));
  const safePage=Math.min(page,pageCount);
  const rows=filtered.slice((safePage-1)*perPage,safePage*perPage);

  const columns=[
    {key:'student',label:'Học sinh',width:'34%',render:(row)=><B2PersonCell initials={row.initials} name={row.name} meta={`Lớp ${row.className}`} />},
    {key:'className',label:'Lớp',width:'12%'},
    {key:'attendance',label:'Chuyên cần',width:'17%',render:(row)=><B2Status tone={row.attendance==='Đủ'?'green':'amber'}>{row.attendance}</B2Status>},
    {key:'conduct',label:'Nề nếp',width:'18%',render:(row)=><B2Status tone={row.conduct==='Tốt'?'blue':row.conduct==='Theo dõi'?'red':'amber'}>{row.conduct}</B2Status>},
    {key:'actions',label:'',width:'9%',align:'right',render:()=> <B2RowActions items={[{label:'Xem hồ sơ',icon:'↗'},{label:'Ghi nhận nhanh',icon:'+'},{label:'Xuất báo cáo',icon:'⇩'}]} />},
  ];

  return <>
    <B2PageHeader eyebrow="MANAGE · STUDENTS" title="Học sinh" description="Danh sách học sinh dùng chung cho tìm kiếm, lọc, chọn nhiều, thao tác nhanh và phân trang — cùng một pattern cho toàn Brian V2." actions={<><B2Button variant="primary">+ Thêm học sinh</B2Button><B2Button>Nhập Excel</B2Button></>} aside={<B2Badge tone="green">{ALL.length} hồ sơ mẫu</B2Badge>} />
    <section className="b2-management-stats">
      <B2StatCard label="Học sinh" value="193" meta="toàn bộ lớp" tone="blue" icon="▥" />
      <B2StatCard label="Có mặt" value="189" meta="hôm nay" tone="green" icon="✓" />
      <B2StatCard label="Cần chú ý" value="03" meta="đang theo dõi" tone="violet" icon="!" />
      <B2StatCard label="Vắng" value="04" meta="hôm nay" tone="cyan" icon="○" />
    </section>
    <B2DataToolbar selectedCount={selected.length} bulkActions={<><B2Button variant="ghost">Xuất hồ sơ</B2Button><B2Button variant="ghost">Gắn nhãn</B2Button></>} left={<><B2SearchBox value={query} onChange={(value)=>{setQuery(value);setPage(1);}} placeholder="Tìm học sinh…" /><B2FilterChips value={filter} onChange={(value)=>{setFilter(value);setPage(1);}} items={[{id:'all',label:'Tất cả',count:ALL.length},{id:'attention',label:'Cần chú ý',count:2},{id:'absence',label:'Vắng',count:1}]} /></>} right={<B2Badge>{filtered.length} kết quả</B2Badge>} />
    <B2DataTable columns={columns} rows={rows} selectable selected={selected} onSelectionChange={setSelected} empty={<B2DataState title="Không tìm thấy học sinh" description="Thử thay đổi từ khóa hoặc bộ lọc hiện tại." />} />
    <B2Pagination page={safePage} pageCount={pageCount} total={filtered.length} onChange={setPage} />
  </>;
}
