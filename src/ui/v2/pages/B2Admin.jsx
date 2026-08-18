import React,{useMemo,useState} from 'react';
import { B2Badge,B2Button,B2PageHeader,B2SearchBox,B2SectionHeader,B2StatCard,B2Surface } from '../components/B2UI.jsx';
import { B2DataTable,B2DataToolbar,B2FilterChips,B2RowActions,B2Status } from '../components/B2Data.jsx';
import './B2Secondary.css';

const USERS=[
{id:1,name:'Nguyễn Anh Tuấn',role:'TTCM',email:'tuan@brian.edu.vn',status:'active',scope:'Toàn hệ thống'},
{id:2,name:'Mỹ Duyên',role:'Giáo viên',email:'myduyen@brian.edu.vn',status:'active',scope:'Giảng dạy'},
{id:3,name:'Mỹ Diệp',role:'Giáo viên',email:'mydiep@brian.edu.vn',status:'active',scope:'Giảng dạy'},
{id:4,name:'Minh Hoa',role:'Giáo viên',email:'minhhoa@brian.edu.vn',status:'pending',scope:'Chờ duyệt'},
];
export default function B2Admin(){
 const [query,setQuery]=useState(''); const [filter,setFilter]=useState('all');
 const rows=useMemo(()=>USERS.filter(u=>{const q=query.trim().toLowerCase(); if(q&&!`${u.name} ${u.email} ${u.role}`.toLowerCase().includes(q)) return false; if(filter==='active') return u.status==='active'; if(filter==='pending') return u.status==='pending'; return true;}),[query,filter]);
 const columns=[
 {key:'name',label:'Tài khoản',width:'30%',render:r=><div className="b2-admin-user"><strong>{r.name}</strong><small>{r.email}</small></div>},
 {key:'role',label:'Vai trò',width:'17%',render:r=><B2Badge tone={r.role==='TTCM'?'violet':'blue'}>{r.role}</B2Badge>},
 {key:'scope',label:'Phạm vi',width:'24%'},
 {key:'status',label:'Trạng thái',width:'17%',render:r=><B2Status tone={r.status==='active'?'green':'amber'}>{r.status==='active'?'Hoạt động':'Chờ duyệt'}</B2Status>},
 {key:'actions',label:'',width:'12%',align:'right',render:()=> <B2RowActions items={[{label:'Xem quyền',icon:'◎'},{label:'Chỉnh vai trò',icon:'✎'},{label:'Tạm khóa',icon:'×',danger:true}]}/>}];
 return <><B2PageHeader eyebrow="SYSTEM · ADMIN" title="Quản trị" description="Admin V2 ưu tiên quyền, tài khoản và sức khỏe hệ thống; các tác vụ nhạy cảm được tách khỏi giao diện dạy học thông thường." actions={<><B2Button variant="primary">+ Mời giáo viên</B2Button><B2Button>Nhật ký hệ thống</B2Button></>} aside={<B2Badge tone="violet">TTCM ACCESS</B2Badge>} />
 <section className="b2-admin-stats"><B2StatCard label="Tài khoản" value="06" meta="đã duyệt" tone="blue" icon="◎"/><B2StatCard label="Chờ duyệt" value="01" meta="yêu cầu mới" tone="violet" icon="◇"/><B2StatCard label="Ứng dụng" value="24" meta="đang bật" tone="green" icon="▦"/><B2StatCard label="Cảnh báo" value="00" meta="hệ thống ổn định" tone="cyan" icon="✓"/></section>
 <section className="b2-admin-layout"><div><B2SectionHeader eyebrow="ACCESS" title="Tài khoản & quyền"/><B2DataToolbar left={<><B2SearchBox value={query} onChange={setQuery} placeholder="Tìm tài khoản…"/><B2FilterChips value={filter} onChange={setFilter} items={[{id:'all',label:'Tất cả',count:4},{id:'active',label:'Hoạt động',count:3},{id:'pending',label:'Chờ duyệt',count:1}]}/></>} right={<B2Button variant="ghost">Ma trận quyền →</B2Button>}/><B2DataTable columns={columns} rows={rows}/></div>
 <aside><B2Surface><B2SectionHeader eyebrow="SYSTEM" title="Sức khỏe nền tảng"/><div className="b2-admin-health"><div><B2Status tone="green">Supabase</B2Status><small>Ổn định</small></div><div><B2Status tone="green">Vercel</B2Status><small>Production healthy</small></div><div><B2Status tone="green">Storage</B2Status><small>Trong giới hạn</small></div><div><B2Status tone="blue">Audit</B2Status><small>42 sự kiện / 24h</small></div></div></B2Surface><B2Surface><B2SectionHeader eyebrow="GOVERNANCE" title="Quản trị nhanh"/><div className="b2-simple-list"><button><strong>Quản lý ứng dụng</strong><span>24 đang bật</span></button><button><strong>Phân quyền</strong><span>6 tài khoản</span></button><button><strong>Backup & Restore</strong><span>Snapshot gần nhất</span></button><button><strong>Audit log</strong><span>42 sự kiện</span></button></div></B2Surface></aside></section></>;
}
