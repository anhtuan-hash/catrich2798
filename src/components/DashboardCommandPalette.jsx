import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, CalendarDays, ClipboardList, CornerDownLeft, FolderOpen, GraduationCap, Home, Search, X } from 'lucide-react';
import { openDashboardTarget } from '../utils/dashboardAggregator.js';

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('vi').trim();
const MAX_RESULTS = 10;
export function dashboardPaletteItems(snapshot, language = 'vi') {
  const vi = language === 'vi';
  const staticItems = [
    { id:'dashboard-calendar', label: vi?'Lịch làm việc':'Work calendar', subtitle:vi?'Đi đến lịch trong Dashboard':'Jump to dashboard calendar', Icon:CalendarDays, action:'calendar' },
    { id:'dashboard-work', label:vi?'Công việc cần chú ý':'Priority work', subtitle:vi?'Tìm và lọc các công việc':'Search and filter tasks', Icon:ClipboardList, action:'tasks' },
    { id:'work-hub', label:vi?'Trung tâm công việc':'Work Hub', subtitle:vi?'Mở ứng dụng Work Hub':'Open Work Hub', Icon:ClipboardList, route:'#/work-hub' },
    { id:'gradebook', label:vi?'Sổ điểm':'Gradebook', subtitle:vi?'Mở danh sách ứng dụng để vào Sổ điểm':'Open app launcher to access Gradebook', Icon:GraduationCap, route:'#/apps' },
    { id:'resources', label:vi?'Kho học liệu':'Resource library', subtitle:vi?'Mở kho học liệu':'Open resource library', Icon:FolderOpen, route:'#/resource-library' },
    { id:'home', label:vi?'Trang chủ':'Home', subtitle:vi?'Trở về trang chủ':'Return to homepage', Icon:Home, route:'#/home' },
  ];
  if (snapshot?.homeroom) staticItems.splice(4, 0, { id:'homeroom', label:vi?'Lớp chủ nhiệm':'Homeroom', subtitle:vi?'Mở ứng dụng Chủ nhiệm':'Open homeroom', Icon:GraduationCap, route:'#/homeroom' });
  const seen = new Set();
  const tasks = [...(snapshot?.attention || []), ...(snapshot?.timeline || [])].filter(item => {
    if (!item?.title || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  }).map(item => ({id:'task:'+item.id, label:item.title, subtitle:item.sourceLabel || (vi?'Công việc / sự kiện':'Task / event'), Icon:ClipboardList, item }));
  return [...staticItems, ...tasks];
}
export function findDashboardPaletteItems(items, query, limit = MAX_RESULTS) {
  const term = normalize(query);
  if (!term) return items.filter(item => !item.item).slice(0,limit);
  return items.map((item,index)=> {
    const title = normalize(item.label), extra=normalize(item.subtitle);
    const titleStart = title.startsWith(term), titleIncludes=title.includes(term);
    const score = titleStart?0:titleIncludes?1:extra.includes(term)?2:100;
    return {item,score,index};
  }).filter(x=>x.score<100).sort((a,b)=>a.score-b.score||a.index-b.index).slice(0,limit).map(x=>x.item);
}
export default function DashboardCommandPalette({ snapshot, language = 'vi', open, onClose, onCalendar, onTasks }) {
  const [query,setQuery] = useState('');
  const [active,setActive] = useState(0);
  const inputRef = useRef(null);
  const all = useMemo(()=>dashboardPaletteItems(snapshot,language),[snapshot,language]);
  const results=useMemo(()=>findDashboardPaletteItems(all,query),[all,query]);
  useEffect(()=>{if(open){setQuery('');setActive(0);window.requestAnimationFrame(()=>inputRef.current?.focus());}},[open]);
  useEffect(()=>{setActive(0);},[query]);
  const activate = item=>{
    if(!item)return;
    onClose();
    if(item.item){openDashboardTarget(item.item);return;}
    if(item.action==='calendar'){onCalendar?.();return;}
    if(item.action==='tasks'){onTasks?.();return;}
    if(item.route)window.location.hash=item.route;
  };
  if(!open)return null;
  const vi=language==='vi';
  return <div className="gd-v31-palette-overlay" role="presentation" onMouseDown={event=>{if(event.target===event.currentTarget)onClose();}}>
    <section className="gd-v31-palette" role="dialog" aria-modal="true" aria-label={vi?'Tìm nhanh BRIAN':'BRIAN command search'}
      onKeyDown={event=>{
        if(event.key==='Escape'){event.preventDefault();onClose();}
        if(event.key==='ArrowDown'){event.preventDefault();setActive(v=>results.length?(v+1)%results.length:0);}
        if(event.key==='ArrowUp'){event.preventDefault();setActive(v=>results.length?(v+results.length-1)%results.length:0);}
        if(event.key==='Enter' && !event.isComposing){event.preventDefault();activate(results[active] || results[0]);}
        if(event.key==='Tab'){
          const close=event.currentTarget.querySelector('.gd-v31-palette-close');
          if(event.shiftKey && document.activeElement===inputRef.current){event.preventDefault();close?.focus();}
          else if(!event.shiftKey && document.activeElement===close){event.preventDefault();inputRef.current?.focus();}
        }
      }}>
      <div className="gd-v31-palette-search"><Search size={20}/><input ref={inputRef} type="search" role="combobox" aria-expanded="true" aria-controls="gd-v31-search-results" aria-activedescendant={results[active]?'gd-v31-palette-'+active:undefined}
        value={query} onChange={event=>setQuery(event.target.value)} placeholder={vi?'Tìm công việc, lịch, học liệu, ứng dụng…':'Find tasks, calendar, apps…'} aria-label={vi?'Tìm kiếm nhanh':'Quick search'}/>
        <button type="button" className="gd-v31-palette-close" aria-label={vi?'Đóng tìm kiếm':'Close search'} onClick={onClose}><X size={18}/></button></div>
      <div className="gd-v31-palette-results" id="gd-v31-search-results" role="listbox" aria-label={vi?'Kết quả tìm kiếm':'Search results'}>
        {results.length?results.map((item,i)=>{
          const Icon=item.Icon;return <button type="button" id={'gd-v31-palette-'+i} role="option" aria-selected={active===i} className={'gd-v31-palette-result'+(active===i?' is-active':'')} key={item.id} onMouseEnter={()=>setActive(i)} onClick={()=>activate(item)}>
            <span className="gd-v31-palette-result-icon"><Icon size={18}/></span><span><strong>{item.label}</strong><small>{item.subtitle}</small></span><ArrowRight size={17}/>
          </button>;
        }):<p className="gd-v31-palette-empty">{vi?'Không tìm thấy kết quả phù hợp trong dữ liệu đã tải.':'No matches in the loaded data.'}</p>}
      </div>
      <footer className="gd-v31-palette-footer"><span><CornerDownLeft size={14}/> Enter {vi?'để mở':'to open'}</span><span>↑↓ {vi?'để chọn':'to select'}</span><span>Esc {vi?'để đóng':'to close'}</span></footer>
    </section>
  </div>;
}
