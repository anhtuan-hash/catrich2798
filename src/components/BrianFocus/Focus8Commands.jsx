import React,{useEffect,useMemo,useRef,useState} from 'react';
const COMMANDS=[
 ['timer-toggle','Hẹn giờ · Bắt đầu / Tạm dừng','Timer · Start / Pause'],
 ['timer-reset','Đặt lại bộ đếm','Reset countdown'],
 ['clock-next','Chuyển kiểu đồng hồ','Next clock style'],
 ['mood-next','Chuyển bầu không khí','Next atmosphere'],
 ['scene-next','Chuyển cảnh timeline','Next timeline cue'],
 ['classroom-toggle','Bật/tắt trình chiếu','Toggle classroom'],
 ['studio-open','Mở Focus Studio','Open Focus Studio'],
 ['focus-close','Đóng Focus','Close Focus'],
];
export default function Focus8Commands({language='vi',onCommand,onClose}){
 const vi=language!=='en';const [query,setQuery]=useState(''),[index,setIndex]=useState(0),input=useRef(null);
 const matches=useMemo(()=>COMMANDS.filter(x=>(x[vi?1:2]+' '+x[0]).toLowerCase().includes(query.toLowerCase())),[query,vi]);
 useEffect(()=>input.current?.focus(),[]);
 const choose=item=>{if(!item)return;onCommand?.({type:item[0]});onClose();};
 return <section className="bfc8-command-palette" role="dialog" aria-label="Focus Command Center">
  <input ref={input} placeholder={vi?'Tìm chức năng hoặc thao tác…':'Search commands…'} value={query}
   onChange={e=>{setQuery(e.target.value);setIndex(0);}}
   onKeyDown={e=>{
    if(e.key==='ArrowDown'){e.preventDefault();setIndex(n=>Math.min(matches.length-1,n+1));}
    if(e.key==='ArrowUp'){e.preventDefault();setIndex(n=>Math.max(0,n-1));}
    if(e.key==='Enter'){e.preventDefault();choose(matches[index]);}
    if(e.key==='Escape'){e.stopPropagation();onClose();}
   }}/>
  <div role="listbox">{matches.map((item,i)=><button type="button" role="option" aria-selected={i===index}
    key={item[0]} onMouseEnter={()=>setIndex(i)} onClick={()=>choose(item)}>{item[vi?1:2]}<kbd>↵</kbd></button>)}</div>
  <footer>⌘K / Ctrl+K · ↑↓ · Enter · Esc</footer>
 </section>;
}
