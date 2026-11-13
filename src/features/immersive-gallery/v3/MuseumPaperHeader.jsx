import React from 'react';
import MuseumCompetitionRibbon from './MuseumCompetitionRibbon.jsx';
import './museumDashboardBanner.css';
import {Award,BookOpen,CalendarDays,CircleHelp,ClipboardCheck,House,Landmark,Presentation,RefreshCw,Search,Settings2} from 'lucide-react';

const PRIMARY = [
 ['lessons',BookOpen,'Bài học','Lessons'],
 ['submissions',ClipboardCheck,'Bài nộp','Submissions'],
 ['gallery',Landmark,'Triển lãm','Exhibitions'],
 ['templates',CalendarDays,'Kế hoạch bài dạy','Teaching plan'],
];
const TOOLS = [
 ['home',House,'Tổng quan','Overview'],
 ['live',Presentation,'Dạy trực tiếp','Teach live'],
 ['evidence',Award,'Hồ sơ dự thi','Competition dossier'],
 ['settings',Settings2,'Cài đặt','Settings'],
];

/** Navigation is local to Museum Lab; the site's main navigation remains untouched. */
export default function MuseumPaperHeader({language='vi',tab='home',onNavigate,pending=0,query='',onQueryChange,onRefresh,onHelp}){
 const tr=(vi,en)=>language==='en'?en:vi;
 const active=['home','wizard'].includes(tab)?'lessons':tab==='demo'?'gallery':tab;
 return <header className="bml-paper-header">
  {/* Keep the official competition masthead present across every Museum Lab tab.
      The former welcome hero and redundant compact brand are intentionally removed. */}
  <MuseumCompetitionRibbon variant="dashboard"/>
  <nav className="bml-paper-nav" aria-label={tr('Điều hướng Museum Lab','Museum Lab navigation')}>
   {PRIMARY.map(([id,Icon,vi,en])=><button type="button" key={id} onClick={()=>onNavigate(id)}
    className={active===id?'is-active':''} aria-current={active===id?'page':undefined}>
    <Icon aria-hidden="true"/><span>{tr(vi,en)}</span>{id==='submissions'&&pending>0?<span className="bml-paper-count">{pending}</span>:null}
   </button>)}
  </nav>
  <div className="bml-paper-toolbar">
   <nav className="bml-paper-tools" aria-label={tr('Công cụ hỗ trợ Museum Lab','Museum Lab supporting tools')}>
    {TOOLS.map(([id,Icon,vi,en])=><button type="button" key={id} onClick={()=>onNavigate(id)}
     className={tab===id?'is-active':''} aria-current={tab===id?'page':undefined}><Icon size={16} aria-hidden="true"/>{tr(vi,en)}</button>)}
   </nav>
   <form className="bml-paper-search" role="search" onSubmit={e=>{e.preventDefault();onNavigate('lessons');}}>
    <Search size={17} aria-hidden="true"/><input aria-label={tr('Tìm bài học','Search lessons')} value={query}
     onChange={e=>onQueryChange(e.target.value)} placeholder={tr('Tìm bài học…','Search lessons…')}/>
    <button type="submit" aria-label={tr('Tìm kiếm','Search')}><span aria-hidden="true">↵</span></button>
   </form>
   <div className="bml-paper-utilities">
    <button type="button" onClick={onRefresh} aria-label={tr('Làm mới dữ liệu','Refresh data')} title={tr('Làm mới dữ liệu','Refresh data')}><RefreshCw size={18}/></button>
    <button type="button" onClick={onHelp} aria-label={tr('Trợ giúp','Help')} title={tr('Trợ giúp','Help')}><CircleHelp size={19}/></button>
   </div>
  </div>
 </header>;
}
