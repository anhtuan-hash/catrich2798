import React, { useMemo, useState } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SearchBox, B2SectionHeader, B2Surface, B2Tabs } from '../components/B2UI.jsx';
import { B2DataToolbar, B2FilterChips, B2RowActions, B2Status } from '../components/B2Data.jsx';
import './B2Secondary.css';

const ITEMS=[
  {id:1,type:'Tài liệu',title:'English 12 · Unit 2 Worksheet',meta:'DOCX · 4 trang · 18/08',tag:'Lớp 12',tone:'blue'},
  {id:2,type:'Bài trình chiếu',title:'Modal Verbs · Teaching Deck',meta:'PPTX · 28 slides · 17/08',tag:'Grammar',tone:'violet'},
  {id:3,type:'Hoạt động',title:'Semantic Gradient · Environment',meta:'HTML · tương tác · 17/08',tag:'Vocabulary',tone:'green'},
  {id:4,type:'Đề kiểm tra',title:'THPT Practice · Verb Preposition',meta:'XLSX · 200 câu · 16/08',tag:'Assessment',tone:'cyan'},
  {id:5,type:'Tài liệu',title:'Relative Clauses · Practice Pack',meta:'PDF · 10 trang · 15/08',tag:'Grammar',tone:'blue'},
  {id:6,type:'Bài trình chiếu',title:'Department Meeting · August',meta:'PPTX · 16 slides · 14/08',tag:'Department',tone:'violet'},
];

export default function B2Resources(){
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState('all');
  const [tab,setTab]=useState('recent');
  const visible=useMemo(()=>ITEMS.filter((item)=>{
    const q=query.trim().toLowerCase();
    if(q&&!`${item.title} ${item.type} ${item.tag}`.toLowerCase().includes(q)) return false;
    if(filter==='docs') return item.type==='Tài liệu';
    if(filter==='slides') return item.type==='Bài trình chiếu';
    if(filter==='activities') return item.type==='Hoạt động';
    if(filter==='tests') return item.type==='Đề kiểm tra';
    return true;
  }),[query,filter]);
  return <>
    <B2PageHeader eyebrow="TEACH · RESOURCE LIBRARY" title="Kho học liệu" description="Không gian học liệu V2 ưu tiên tìm nhanh, phân loại rõ và truy cập gần đây; tránh biến thư viện thành một lưới card vô tận." actions={<><B2Button variant="primary">+ Tải học liệu</B2Button><B2Button>Tạo bộ sưu tập</B2Button></>} aside={<B2Badge tone="blue">248 học liệu</B2Badge>} />
    <B2DataToolbar left={<><B2SearchBox value={query} onChange={setQuery} placeholder="Tìm tài liệu, bài trình chiếu, hoạt động…"/><B2FilterChips value={filter} onChange={setFilter} items={[{id:'all',label:'Tất cả',count:248},{id:'docs',label:'Tài liệu',count:84},{id:'slides',label:'Slides',count:51},{id:'activities',label:'Hoạt động',count:63},{id:'tests',label:'Đề kiểm tra',count:50}]}/></>} right={<B2Tabs value={tab} onChange={setTab} items={[{id:'recent',label:'Gần đây'},{id:'saved',label:'Đã lưu'},{id:'shared',label:'Chia sẻ'}]}/>} />
    <section className="b2-resource-layout">
      <div>
        <B2SectionHeader eyebrow="LIBRARY" title={tab==='recent'?'Học liệu gần đây':tab==='saved'?'Học liệu đã lưu':'Được chia sẻ với tôi'} description={`${visible.length} mục đang hiển thị`} />
        <div className="b2-resource-list">
          {visible.map((item)=><article key={item.id} className="b2-resource-row">
            <span className={`b2-resource-icon tone-${item.tone}`}>▤</span>
            <span className="b2-resource-copy"><small>{item.type}</small><strong>{item.title}</strong><em>{item.meta}</em></span>
            <B2Badge tone={item.tone==='violet'?'violet':item.tone==='green'?'green':'blue'}>{item.tag}</B2Badge>
            <B2RowActions items={[{label:'Mở học liệu',icon:'↗'},{label:'Tải xuống',icon:'⇩'},{label:'Thêm vào bộ sưu tập',icon:'＋'}]} />
          </article>)}
        </div>
      </div>
      <aside className="b2-resource-side">
        <B2Surface><B2SectionHeader eyebrow="COLLECTIONS" title="Bộ sưu tập"/><div className="b2-simple-list"><button><strong>English 12</strong><span>42 mục</span></button><button><strong>Grammar Bank</strong><span>31 mục</span></button><button><strong>THPT 2026</strong><span>56 mục</span></button><button><strong>Department Shared</strong><span>28 mục</span></button></div></B2Surface>
        <B2Surface><B2SectionHeader eyebrow="SYNC" title="Đồng bộ"/><div className="b2-health-compact"><B2Status tone="green">Google Drive</B2Status><p>Đồng bộ bình thường · 3 phút trước</p></div></B2Surface>
      </aside>
    </section>
  </>;
}
