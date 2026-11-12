import React from 'react';
import {ArrowRight,BookOpen,CheckCheck,ChevronRight,ClipboardList,FileText,Leaf,Plus,School,ShieldCheck,Sparkles,Users,Waves,Landmark ,Presentation} from 'lucide-react';
import {LESSON_KITS,progressOfGroup} from './museumData.js';
import {fmtDate} from './museumApi.js';
const kitIcons={leaf:Leaf,waves:Waves,school:School};
export function MuseumHeroArt(){
 return <svg aria-hidden="true" className="bml-hero-art" viewBox="0 0 520 230" preserveAspectRatio="xMidYMax meet">
  <defs><linearGradient id="bml-sky" x1="0" x2="1" y1="0" y2="1"><stop stopColor="#d7e8ff"/><stop offset="1" stopColor="#fff" /></linearGradient>
   <linearGradient id="bml-wall" x1="0" x2=".3" y1="0" y2="1"><stop stopColor="#fff"/><stop offset="1" stopColor="#c9ddf4"/></linearGradient></defs>
  <path d="M0 164L65 100Q95 80 140 122L177 85Q205 51 245 114L292 82Q341 33 380 98L450 72Q486 59 520 115V230H0Z" fill="#c4defe" opacity=".78"/>
  <path d="M0 189Q72 144 151 186Q222 144 300 169Q407 143 520 180V230H0Z" fill="#91bcdb" opacity=".54"/>
  <path d="M0 211Q130 185 255 208Q340 188 520 201V230H0Z" fill="#85bbae" opacity=".6"/>
  {[35,83,455,497].map((x,i)=><g key={x}><rect x={x} y={157+(i%2)*10} width="7" height="62" fill="#617b63"/>
    <circle cx={x+3} cy={151+(i%2)*10} r={27+(i%2)*8} fill={i%2?'#3a9b81':'#5eb3a0'}/>
    <circle cx={x+14} cy={144+(i%2)*10} r="21" fill="#63b99e"/></g>)}
  <ellipse cx="282" cy="224" rx="178" ry="12" fill="#47749e" opacity=".22"/>
  <path d="M158 102L286 38L414 102V109H158Z" fill="#2774d9"/>
  <path d="M170 100L286 49L402 100Z" fill="#f4f9ff"/>
  <rect x="166" y="108" width="238" height="109" rx="4" fill="url(#bml-wall)" stroke="#6998c6" strokeWidth="2"/>
  <path d="M151 113H418V124H151Z" fill="#75a9dc"/>
  <rect x="235" y="136" width="100" height="81" rx="4" fill="#377ac4"/>
  <rect x="247" y="150" width="78" height="67" fill="#b8dffc"/>
  <path d="M286 150V217" stroke="#3983c2" strokeWidth="3"/>
  {[183,357].map(x=><g key={x}><rect x={x} y="141" width="39" height="59" rx="3" fill="#77afe0"/>
     <rect x={x+5} y="146" width="29" height="49" fill="#e1f1ff" />
     <path d={'M'+(x+19)+' 146V195'} stroke="#78acd1" strokeWidth="3"/></g>)}
  <rect x="236" y="116" width="99" height="28" fill="#e9f4ff" rx="2"/>
  <text x="285" y="127" textAnchor="middle" fontSize="9" fontWeight="800" fill="#145db8">BRIAN</text>
  <text x="285" y="138" textAnchor="middle" fontSize="8" fontWeight="700" fill="#145db8">MUSEUM LAB</text>
  <path d="M156 217H414V224H156Z" fill="#b0c7d2"/><path d="M135 225H436V231H135Z" fill="#dbe8ed"/>
 </svg>;
}
export function KitCover({kit,size='normal'}){
 const Icon=kitIcons[kit.icon]||Leaf;
 return <div className={'bml-kit-cover bml-kit-'+kit.accent+' bml-kit-cover-'+size}>
  <div className="bml-kit-orbit" aria-hidden="true"/><Icon size={size==='large'?60:34} strokeWidth={1.45}/>
  <span>{kit.topic}</span>
 </div>;
}
export function KitCard({kit,onClick,selected=false,language='vi'}){
 const tr=(vi,en)=>language==='en'?en:vi;
 return <button type="button" className={'bml-kit-card '+(selected?'is-selected':'')} onClick={()=>onClick(kit)}>
  <KitCover kit={kit}/><span className="bml-kit-details"><strong>{kit.title}</strong><small>{kit.subtitle}</small>
   <span>{tr('Chọn mẫu','Use template')} <ChevronRight size={16}/></span></span>
 </button>;
}
export default function MuseumDashboard({data,onNavigate,onCreate,onDemo,language='vi'}){
 const tr=(vi,en)=>language==='en'?en:vi;
 const assignments=(data?.assignments||[]).slice(0,5),groups=data?.groups||[];
 const submitted=groups.filter(x=>['submitted','ttcm_review','approved_locked','published'].includes(x.state)).length;
 return <div className="bml-screen bml-dashboard" data-testid="museum-dashboard">
  <div className="bml-welcome">
   <div className="bml-welcome-copy"><div className="bml-overline">{tr('BẢO TÀNG SỐ TRONG LỚP HỌC','CREATIVE LEARNING WORKSPACE')}</div>
    <h1>{tr('Chào mừng trở lại!','Welcome back!')}</h1>
    <p>{tr('Hôm nay, thầy/cô muốn sáng tạo điều gì?','What would you like to create with your class today?')}</p>
   </div><MuseumHeroArt/>
  </div>
  <section className="bml-surface bml-live-entry" style={{background:'linear-gradient(110deg,#e6f1ff,#f3f8ff)',borderColor:'#bfd4f7',display:'flex',alignItems:'center',justifyContent:'space-between',gap:18,flexWrap:'wrap'}}>
   <div><div className="bml-overline">{tr('DẠY TRỰC TIẾP KHÔNG CẦN POWERPOINT','LIVE TEACHING · NO POWERPOINT')}</div>
    <h2>{tr('Bắt đầu tiết học cùng BRIAN Museum Lab','Teach your next lesson inside Museum Lab')}</h2>
    <p>{tr('11 hoạt động · 2 tiết · khảo sát tức thời · sáng tạo triển lãm 3D','11 stages · two periods · live survey · real 3D student museums')}</p></div>
   <button type="button" className="bml-primary" onClick={()=>onNavigate('live')}><Presentation size={19}/>{tr('Bắt đầu giảng dạy','Start teaching')}<ArrowRight size={17}/></button>
  </section>
  <div className="bml-quick-actions">
   <button type="button" className="bml-quick-card" onClick={onCreate}>
    <span className="bml-quick-icon bml-blue"><BookOpen size={25}/></span><span><strong>{tr('Tạo bài học mới','Create a lesson')}</strong>
      <small>{tr('Chọn mẫu, giao nhiệm vụ, phát QR','Choose template, assign, share QR')}</small></span><Plus size={19}/></button>
   <button type="button" className="bml-quick-card" onClick={()=>onNavigate('submissions')}>
    <span className="bml-quick-icon bml-purple"><Users size={25}/></span><span><strong>{tr('Xem bài nộp','Review submissions')}</strong>
      <small>{tr('Theo dõi tiến độ và đánh giá','Track progress and evaluate')}</small></span><ArrowRight size={19}/></button>
   <button type="button" className="bml-quick-card" onClick={()=>onNavigate('gallery')}>
    <span className="bml-quick-icon bml-sky"><Landmark size={25}/></span><span><strong>{tr('Tham quan triển lãm','Explore museums')}</strong>
      <small>{tr('Xem, chia sẻ và công bố','Browse, share and publish')}</small></span><ArrowRight size={19}/></button>
  </div>
  <section className="bml-surface">
   <div className="bml-section-head"><div><h2>{tr('Bài học gần đây','Recent lessons')}</h2>
    <p>{tr('Tiến độ được đọc từ dữ liệu thật trên Brian','Progress is calculated from your real Brian assignments')}</p></div>
    <button type="button" className="bml-text-btn" onClick={()=>onNavigate('lessons')}>{tr('Xem tất cả','View all')} <ChevronRight size={17}/></button></div>
   {assignments.length?<div className="bml-responsive-table"><table className="bml-table">
    <thead><tr><th>{tr('Tên bài học','Lesson')}</th><th>{tr('Lớp','Class')}</th><th>{tr('Số nhóm','Groups')}</th><th>{tr('Tiến độ','Progress')}</th><th>{tr('Hạn nộp','Deadline')}</th></tr></thead>
    <tbody>{assignments.map(a=>{
     const linked=groups.filter(g=>g.assignment_id===a.id),count=linked.filter(g=>['submitted','ttcm_review','approved_locked','published'].includes(g.state)).length;
     return <tr key={a.id}><td><button className="bml-lesson-link" type="button" onClick={()=>onNavigate('lessons',a.id)}><span className="bml-table-icon"><Leaf size={19}/></span>
      <span><strong>{a.title}</strong><small>{tr('Bài học tiếng Anh theo dự án','Project-based English')}</small></span></button></td>
      <td><span className="bml-class-tag">{a.class_scope}</span></td><td>{linked.length}</td>
      <td><div className="bml-progress"><div style={{width:(linked.length?count/linked.length*100:0)+'%'}}/></div>
       <small>{tr('Đã nộp','Submitted')} {count}/{linked.length}</small></td>
      <td>{fmtDate(a.deadline_at)}</td>
     </tr>;})}</tbody>
   </table></div>:<div className="bml-empty bml-empty-slim"><BookOpen size={31}/><strong>{tr('Chưa có bài học nào','No lessons yet')}</strong>
     <p>{tr('Bắt đầu với một chủ đề mẫu. Chỉ ba bước để giao nhiệm vụ cho nhóm.','Choose a ready-made lesson kit and create your first group project in three steps.')}</p>
     <button className="bml-primary" type="button" onClick={onCreate}><Plus size={17}/>{tr('Tạo bài học đầu tiên','Create your first lesson')}</button>
   </div>}
  </section>
  <div className="bml-bottom-grid">
   <section className="bml-surface"><div className="bml-section-head"><h2>{tr('Mẫu bài học nổi bật','Featured lesson kits')}</h2>
      <button className="bml-text-btn" onClick={()=>onNavigate('templates')}>{tr('Thư viện mẫu','Templates')} <ChevronRight size={17}/></button></div>
      <div className="bml-mini-kits">{LESSON_KITS.slice(0,2).map(k=><KitCard key={k.id} kit={k} language={language} onClick={()=>onCreate(k.id)}/>)}</div>
   </section>
   <section className="bml-surface bml-demo-teaser"><div className="bml-overline">{tr('TRÌNH DIỄN HỘI THI','COMPETITION PREVIEW')}</div>
    <h2>{tr('Xem bảo tàng mẫu 3D','Visit the sample 3D museum')}</h2>
    <p>{tr('Nội dung mẫu tổng hợp, không chứa dữ liệu học sinh thật.','Synthetic sample content. No real student data.')}</p>
    <button type="button" className="bml-outline" onClick={onDemo}><Sparkles size={18}/>{tr('Tham quan bản mẫu','Open sample museum')}</button>
   </section>
  </div>
 </div>;
}
