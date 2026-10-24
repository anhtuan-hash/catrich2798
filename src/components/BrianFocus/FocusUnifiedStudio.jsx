import React,{useMemo,useState} from 'react';
import {ArrowLeft,Search,SlidersHorizontal,X,Palette,Timer,Presentation,Database,ChevronRight} from 'lucide-react';

/**
 * One Focus Studio navigation surface for every historical Focus feature.
 * The identifiers map to the existing modules without migrating user data.
 * No visible version labels; preserve the existing storage keys, permissions,
 * services, video session and animations.
 */
export const FOCUS_STUDIO_SECTIONS=[
 {id:'space',vi:'Không gian',en:'Atmosphere',icon:Palette,descriptionVi:'Đồng hồ, ánh sáng, chuyển động và bố cục',descriptionEn:'Clocks, lighting, motion and layouts'},
 {id:'work',vi:'Tập trung',en:'Focus & work',icon:Timer,descriptionVi:'Chu kỳ, ghi chú, phiên và đa đồng hồ',descriptionEn:'Sessions, notes, focus flow and timers'},
 {id:'class',vi:'Trình chiếu',en:'Presentation',icon:Presentation,descriptionVi:'YouTube, lớp học, TV và điều khiển',descriptionEn:'Media, classroom, TV and remote controls'},
 {id:'system',vi:'Cá nhân',en:'Personal & system',icon:Database,descriptionVi:'Thống kê, hiệu năng, khôi phục và dữ liệu',descriptionEn:'Insights, performance, recovery and data'},
];
export const FOCUS_STUDIO_TOOLS=[
 // source, tab, section, Vietnamese, English, Vietnamese detail, English detail
 ['atelier','atmos','space','Ánh sáng & bầu không khí','Atmosphere & lighting','Đổi sắc độ và ánh sáng theo thời điểm','Customize mood and ambient lighting'],
 ['atelier','clock','space','Bộ sưu tập đồng hồ','Clock collection','Chọn kiểu đồng hồ, màu và kiểu chữ','Clock styles, colors and typography'],
 ['atelier','dock','space','Thanh công cụ nổi','Floating dock','Ẩn hiện, sắp xếp các tiện ích','Arrange and minimize tools'],
 ['atelier','particles','space','Hiệu ứng hạt','Particles','Mưa, tuyết, đom đóm và sương','Rain, snow, fireflies and mist'],
 ['ambient','scene','space','Chuyển cảnh điện ảnh','Cinematic scenes','Timeline ánh sáng theo giai đoạn','Ambient lighting timeline'],
 ['ambient','layout','space','Bố cục tự do','Freeform layout','Kéo thả vị trí widget theo thiết bị','Drag and arrange widgets'],
 ['ambient','depth','space','Chiều sâu không gian','Depth effects','Tùy chỉnh parallax nhẹ','Lightweight decorative parallax'],
 ['silk','snapshots','space','Không gian đã lưu','Saved workspaces','Lưu và đổi cấu hình nhanh','Save and restore workspace presets'],

 ['atelier','flow','work','Chu kỳ tập trung','Focus cycles','Pomodoro và chu kỳ làm việc/nghỉ','Pomodoro and work/break cycles'],
 ['atelier','journal','work','Nhật ký cảm nhận','Reflection journal','Ghi lại kết quả tập trung','Record reflections'],
 ['ambient','automation','work','Quy tắc tự động','Automation recipes','Tự chuyển không gian theo sự kiện','Event-based automatic actions'],
 ['silk','orbit','work','Nhiều đồng hồ','Multiple timers','Tối đa sáu bộ đếm độc lập','Six independent countdowns'],
 ['silk','capture','work','Ghi nhanh','Quick capture','Ý tưởng và việc cần làm','Ideas and tasks'],
 ['silk','timeline','work','Lịch sử phiên','Session timeline','Xem sự kiện và xuất dữ liệu','Review and export session events'],
 ['silk','shield','work','Chống phân tâm','Distraction shield','Ẩn tiện ích phụ trong phiên Focus','Hide distracting extra controls'],

 ['atelier','media','class','Danh sách YouTube','YouTube playlist','Quản lý video cá nhân phát nền','Background video favorites'],
 ['atelier','classroom','class','Chế độ lớp học','Classroom mode','Đồng hồ và nội dung an toàn trên TV','Private-free classroom display'],
 ['ambient','classroom','class','Nội dung trình chiếu','Classroom stage','Mục tiêu, hoạt động, thời gian và QR','Learning objective, stage, timer and QR'],
 ['ambient','remote','class','Điều khiển bằng điện thoại','Phone remote','Điều khiển cùng tài khoản qua QR','Same-account remote control'],
 ['ambient','commands','class','Bảng lệnh nhanh','Command center','Các thao tác tìm bằng phím tắt','Searchable keyboard commands'],
 ['silk','presenter','class','Màn hình TV độc lập','Second screen','Màn hình chỉ đọc theo tài khoản','Authenticated read-only TV display'],
 ['silk','media','class','Giữ phát YouTube','Media continuity','Kiểm tra mạng và điều khiển trình phát','Check playback and network status'],

 ['atelier','sound','system','Âm thanh không gian','Spatial sound','Pha trộn các lớp âm thanh','Layer and pan ambient sounds'],
 ['atelier','insights','system','Thống kê tập trung','Focus insights','Tổng phút và chuỗi ngày tập trung','Total minutes and streaks'],
 ['ambient','sound','system','Điều khiển chuyển âm','Sound transitions','Chỉnh thời gian fade âm thanh','Control sound crossfade'],
 ['ambient','memory','system','Báo cáo hoạt động','Activity reports','Phiên đã hoàn thành và xuất CSV','Completed sessions and CSV export'],
 ['ambient','vault','system','Sao lưu và đồng bộ','Cloud backup','Lưu cấu hình riêng theo tài khoản','Private account-scoped backup'],
 ['silk','performance','system','Tối ưu hiệu năng','Performance','Mượt, tự động hoặc chất lượng cao','Smooth, adaptive or high-quality visuals'],
 ['silk','resume','system','Khôi phục phiên','Resume session','Tiếp tục phiên chưa hoàn tất','Recover interrupted focus'],
 ['silk','offline','system','Kết nối & ngoại tuyến','Connection & offline','Trạng thái mạng và dữ liệu cục bộ','Network state and local storage'],
].map(([source,tab,section,vi,en,detailVi,detailEn])=>({source,tab,section,vi,en,detailVi,detailEn}));

const normalize=value=>String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
export function findFocusStudioTools(query='',section='all'){
 const words=normalize(query).trim().split(/\s+/).filter(Boolean);
 return FOCUS_STUDIO_TOOLS.filter(tool=>(section==='all'||tool.section===section)
  && words.every(term=>normalize([tool.vi,tool.en,tool.detailVi,tool.detailEn].join(' ')).includes(term)));
}
export default function FocusUnifiedStudio({language='vi',onClose,renderTool}){
 const vi=language!=='en';
 const [section,setSection]=useState('all');
 const [query,setQuery]=useState('');
 const [selected,setSelected]=useState(null);
 const items=useMemo(()=>findFocusStudioTools(query,section),[query,section]);
 const selectedInfo=selected&&FOCUS_STUDIO_TOOLS.find(x=>x.source===selected.source&&x.tab===selected.tab);
 const selectTool=tool=>setSelected({source:tool.source,tab:tool.tab});
 return <section className="bfc-unified" role="region" aria-label={vi?'Trung tâm Brian Focus':'Brian Focus Studio'}>
  <header className="bfc-unified__head">
   <div className="bfc-unified__identity">
    {selected&&<button className="bfc-unified__back" type="button" onClick={()=>setSelected(null)} aria-label={vi?'Về danh mục':'Back to all tools'}><ArrowLeft size={18}/></button>}
    <div><small>BRIAN FOCUS · STUDIO</small><h2>{selectedInfo?(vi?selectedInfo.vi:selectedInfo.en):(vi?'Trung tâm điều khiển':'Your focus workspace')}</h2>
     <p>{selectedInfo?(vi?selectedInfo.detailVi:selectedInfo.detailEn):(vi?'Mọi công cụ trong một không gian gọn gàng':'All tools in one calm, organized space')}</p></div>
   </div>
   <button className="bfc-unified__close" type="button" onClick={onClose} aria-label={vi?'Đóng Focus Studio':'Close Focus Studio'}><X size={19}/></button>
  </header>
  {selectedInfo?<div className="bfc-unified__panel" key={selected.source+':'+selected.tab}>
     {renderTool({source:selected.source,tab:selected.tab,returnToHub:()=>setSelected(null)})}
    </div>:
   <>
    <div className="bfc-unified__search"><Search size={17} aria-hidden="true"/>
     <input type="search" value={query} onChange={e=>setQuery(e.target.value)}
      placeholder={vi?'Tìm tiện ích, ví dụ: đồng hồ, âm thanh…':'Find a tool: clock, audio, timers…'}
      aria-label={vi?'Tìm tiện ích Focus':'Search Focus tools'}/></div>
    <nav className="bfc-unified__categories" aria-label={vi?'Nhóm tiện ích':'Tool categories'}>
     <button className={section==='all'?'is-active':''} onClick={()=>setSection('all')}>{vi?'Tất cả':'All'}</button>
     {FOCUS_STUDIO_SECTIONS.map(x=><button key={x.id} className={section===x.id?'is-active':''}
       onClick={()=>setSection(x.id)}><x.icon size={15}/>{vi?x.vi:x.en}</button>)}
    </nav>
    <div className="bfc-unified__scroll">
     {FOCUS_STUDIO_SECTIONS.filter(x=>section==='all'||x.id===section).map(group=>{
       const entries=items.filter(x=>x.section===group.id);
       return entries.length?<section key={group.id} className="bfc-unified__group">
         <div className="bfc-unified__group-head"><group.icon size={18}/><div><h3>{vi?group.vi:group.en}</h3>
           <p>{vi?group.descriptionVi:group.descriptionEn}</p></div></div>
         <div className="bfc-unified__grid">{entries.map(x=><button key={x.source+':'+x.tab} type="button"
          onClick={()=>selectTool(x)} className="bfc-unified__item">
           <span><strong>{vi?x.vi:x.en}</strong><small>{vi?x.detailVi:x.detailEn}</small></span>
           <ChevronRight size={16} aria-hidden="true"/>
          </button>)}</div>
        </section>:null;
     })}
     {items.length===0&&<p className="bfc-unified__empty">{vi?'Không tìm thấy tiện ích phù hợp.':'No matching tools found.'}</p>}
    </div>
   </>
  }
  <footer className="bfc-unified__footer"><SlidersHorizontal size={13}/>
    {vi?'Thiết lập riêng theo tài khoản · Giữ nguyên dữ liệu và quyền truy cập':'Account-specific settings · Data and permissions preserved'}
  </footer>
 </section>;
}
