import React, { useState } from 'react';
import { X, Check, ArrowUp, ArrowDown, Pause, Play, Trash2, Plus, RotateCcw } from 'lucide-react';
import { getFocusInsights } from './useFocus7Data.js';
import { parseFocusYoutubeId } from './focusYoutube.js';
const safeVideoId=value=>{try{return parseFocusYoutubeId(value);}catch{return '';}};
import { FOCUS_SOUNDS, FOCUS_SOUND_LABELS } from './useFocusSoundscape.js';

const tabs=[
 ['atmos','01','Atmosphere','Bầu không khí'],['clock','02','Clocks','Đồng hồ'],
 ['flow','03','Focus Flow','Chu kỳ'],['dock','04','Dock','Thanh công cụ'],
 ['particles','05','Particles','Hiệu ứng'],['sound','06','Spatial Sound','Âm thanh'],
 ['media','07','Media Studio','Video'],['journal','08','Journal','Nhật ký'],
 ['insights','09','Insights','Thống kê'],['classroom','10','Classroom','Trình chiếu'],
];
const moodLabels=[['auto','Auto','Tự động'],['off','Off','Tắt'],['dawn','Dawn','Bình minh'],['golden','Golden','Nắng chiều'],['rain','Rainy','Trời mưa'],['twilight','Twilight','Chạng vạng'],['midnight','Midnight','Đêm']];
const clockLabels=[['inherit','V6 default'],['sense','Classic HTC'],['glass','HTC Glass'],['minimal','Minimal'],['floating','Floating'],['kyoto','Kyoto'],['swiss','Swiss'],['aurora','Aurora'],['liquid','Liquid Glass']];
const particleLabels=[['off','Tắt','Off'],['dust','Bụi sáng','Light dust'],['fireflies','Đom đóm','Fireflies'],['rain','Mưa','Rain'],['snow','Tuyết','Snow'],['leaves','Lá rơi','Leaves'],['fog','Sương','Fog']];
const dockNames={timer:['Hẹn giờ','Timer'],notes:['Ghi chú','Notes'],soundscape:['Âm thanh','Sound'],brightness:['Hình nền','Backdrop']};
const uiRange=(label,value,min,max,onChange,unit='')=><label className="bfc7-range">
  <span>{label}<strong>{value}{unit}</strong></span><input type="range" min={min} max={max} value={value} onChange={e=>onChange(Number(e.target.value))}/>
</label>;
const choice=(id,label,active,onClick)=><button type="button" className={'bfc7-choice'+(active?' is-active':'')} key={id}
  aria-pressed={active} onClick={onClick}>{label}{active&&<Check size={13}/>}</button>;
export default function Focus7Studio({language='vi',data,update,appearance,onAppearance,
  flow,timer,mixer,youtubeSession,youtubeControls,onChooseVideo,
  classroom,onClassroom,onClose}){
 const vi=language!=='en';
 const [tab,setTab]=useState('atmos');
 const [videoDraft,setVideoDraft]=useState('');
 const [note,setNote]=useState('');
 const [mood,setMood]=useState('calm');
 const [recipeName,setRecipeName]=useState('');
 const insights=getFocusInsights(data.sessions);
 const saveJournal=()=>{
   const text=note.trim();
   if(!text)return;
   update({journal:[...data.journal,{id:String(Date.now()),at:Date.now(),text:text.slice(0,600),mood}]});
   setNote('');
 };
 const saveVideo=()=>{
   const id=safeVideoId(videoDraft.trim());
   if(!id)return;
   update({favorites:[...data.favorites,id].slice(-15)});
   setVideoDraft('');
 };
 const addRecipe=()=>{
   const name=recipeName.trim().slice(0,32);
   if(!name)return;
   const recipe={name,levels:{...mixer.levels},pans:{...mixer.pans},master:mixer.master};
   update({soundRecipes:[...data.soundRecipes,recipe].slice(-8)});
   setRecipeName('');
 };
 return <section className="bfc7-studio" role="region" aria-label="Brian Focus 7 Studio">
   <header className="bfc7-studio__header">
     <div><small>BRIAN FOCUS · LIVING ATELIER</small><strong>{vi?'Không gian sống 7.0':'Living Atelier 7.0'}</strong></div>
     <button type="button" onClick={onClose} aria-label={vi?'Đóng Studio':'Close Studio'}><X size={18}/></button>
   </header>
   <nav className="bfc7-studio__tabs" aria-label={vi?'Chọn nâng cấp':'Studio sections'}>
    {tabs.map(([id,n,en,vn])=><button type="button" key={id} className={tab===id?'is-selected':''}
      aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)}><span>{n}</span>{vi?vn:en}</button>)}
   </nav>
   <div className="bfc7-studio__body">
    {tab==='atmos'&&<div className="bfc7-stack">
      <h3>{vi?'Đạo diễn ánh sáng':'Cinematic Atmosphere Director'}</h3>
      <p>{vi?'Áp lớp ánh sáng riêng lên cảnh hiện có, không chỉnh nguồn video/ảnh của admin.':'Apply personal cinematic light without changing the shared scene.'}</p>
      <div className="bfc7-choices">{moodLabels.map(([id,en,vn])=>choice(id,vi?vn:en,data.mood===id,()=>update({mood:id})))}</div>
      {uiRange(vi?'Cường độ sắc độ':'Tint intensity',data.tint,0,40,v=>update({tint:v}),'%')}
      <small>{vi?'Tự động ưu tiên thông tin mưa thực tế (nếu có), sau đó theo giờ địa phương.':'Auto uses real reported rain when available, otherwise your device clock.'}</small>
    </div>}
    {tab==='clock'&&<div className="bfc7-stack">
      <h3>{vi?'Signature Clock Atelier':'Signature Clock Atelier'}</h3>
      <div className="bfc7-choices">{clockLabels.map(([id,name])=>choice(id,name,data.clock===id,()=>update({clock:id})))}</div>
      {uiRange(vi?'Độ đậm chữ':'Font weight',data.clockWeight,250,750,v=>update({clockWeight:v}))}
      {uiRange(vi?'Giãn chữ':'Letter spacing',data.clockSpacing,-8,12,v=>update({clockSpacing:v}),'px')}
      <label className="bfc7-inline">{vi?'Màu số':'Digit color'} <input type="color" value={data.clockTint}
        onChange={e=>update({clockTint:e.target.value})}/></label>
      <small>{vi?'Giữ lựa chọn 12/24 giờ, giây và tỉ lệ từ Focus Studio 6.0.':'Uses your 6.0 time format, seconds and size.'}</small>
    </div>}
    {tab==='flow'&&<div className="bfc7-stack">
      <h3>{vi?'Thiết kế chu kỳ tập trung':'Focus Flow Designer'}</h3>
      <div className="bfc7-choices">{[
        ['pomodoro',25,5,4,'25/5 × 4'],['deep',50,10,2,'50/10 × 2'],['custom',data.flow.work,data.flow.rest,data.flow.repeats,vi?'Tùy chỉnh':'Custom']
      ].map(([id,work,rest,repeats,label])=>choice(id,label,data.flow.preset===id,()=>update({flow:{preset:id,work,rest,repeats}})))}</div>
      <div className="bfc7-fields">{[['work',vi?'Làm việc':'Work'],['rest',vi?'Nghỉ':'Break'],['repeats',vi?'Số vòng':'Cycles']].map(([key,label])=>
        <label key={key}>{label}<input type="number" min="1" max={key==='repeats'?10:180} value={data.flow[key]}
          onChange={e=>update({flow:{...data.flow,[key]:Math.min(key==='repeats'?10:180,Math.max(1,Number(e.target.value)||1)),preset:'custom'}})}/></label>)}</div>
      <div className="bfc7-flow-state" role="status">{flow.flow.active
        ? (vi?'Đang chạy vòng ':'Running cycle ')+flow.flow.cycle+'/'+flow.flow.repeats+' · '+(flow.flow.phase==='work'?(vi?'Tập trung':'Work'):(vi?'Nghỉ':'Break'))
        : (vi?'Chưa có chu kỳ chạy':'No flow running')}</div>
      <div className="bfc7-actions"><button type="button" className="is-primary" onClick={()=>flow.start(data.flow)}><Play size={15}/>{vi?'Bắt đầu chu kỳ':'Start flow'}</button>
      <button type="button" onClick={flow.stop} disabled={!flow.flow.active}><Pause size={15}/>{vi?'Dừng chu kỳ':'Stop flow'}</button></div>
      <p>{vi?'Tự chuyển sang giai đoạn tiếp theo; bộ đếm vẫn chạy khi đóng Focus.':'Automatically switches phases and continues after Focus closes.'}</p>
    </div>}
    {tab==='dock'&&<div className="bfc7-stack">
      <h3>{vi?'Invisible Smart Dock':'Invisible Smart Dock'}</h3>
      <label className="bfc7-check"><input type="checkbox" checked={data.compactDock} onChange={e=>update({compactDock:e.target.checked})}/>{vi?'Thu nhỏ Dock; mở khi rê chuột hoặc dùng bàn phím':'Collapse Dock until hover or keyboard focus'}</label>
      <p>{vi?'Kéo thả biểu tượng trên Dock bằng chuột, hoặc sắp xếp bằng các nút bên dưới.':'Drag tools on the Dock, or use these keyboard-accessible order buttons.'}</p>
      {(appearance.dock||[]).map((id,i)=><div className="bfc7-dock-row" key={id}><strong>{dockNames[id]?.[vi?0:1]||id}</strong>
      <button type="button" disabled={i===0} onClick={()=>{const d=[...appearance.dock];[d[i-1],d[i]]=[d[i],d[i-1]];onAppearance({dock:d});}} aria-label={vi?'Đưa lên':'Move up'}><ArrowUp size={17}/></button>
      <button type="button" disabled={i===appearance.dock.length-1} onClick={()=>{const d=[...appearance.dock];[d[i],d[i+1]]=[d[i+1],d[i]];onAppearance({dock:d});}} aria-label={vi?'Đưa xuống':'Move down'}><ArrowDown size={17}/></button></div>)}
    </div>}
    {tab==='particles'&&<div className="bfc7-stack">
      <h3>{vi?'Living Particle Engine':'Living Particle Engine'}</h3>
      <div className="bfc7-choices">{particleLabels.map(([id,vn,en])=>choice(id,vi?vn:en,data.particle===id,()=>update({particle:id})))}</div>
      {uiRange(vi?'Mật độ':'Density',data.density,5,100,v=>update({density:v}),'%')}
      <p>{vi?'Lớp hạt nhẹ, tự dừng khi tab bị ẩn, tắt trên thiết bị yếu và khi bật Giảm chuyển động.':'Lightweight canvas animation pauses in hidden tabs and respects low-power/Reduce Motion.'}</p>
    </div>}
    {tab==='sound'&&<div className="bfc7-stack">
      <h3>{vi?'Spatial Soundscape 2.0':'Spatial Soundscape 2.0'}</h3>
      {FOCUS_SOUNDS.map(type=><div className="bfc7-mix-row" key={type}>
       <strong>{FOCUS_SOUND_LABELS[type][vi?0:1]}</strong>
       {uiRange(vi?'Âm lượng':'Level',mixer.levels[type],0,100,v=>mixer.setLevel(type,v),'%')}
       {uiRange(vi?'Không gian trái / phải':'Stereo L / R',mixer.pans[type]||0,-100,100,v=>mixer.setPan(type,v))}
      </div>)}
      {uiRange(vi?'Âm lượng tổng':'Master',mixer.master,0,100,mixer.setMaster,'%')}
      <div className="bfc7-actions"><button type="button" className="is-primary" onClick={()=>{void (mixer.playing?mixer.stop():mixer.start());}}>{mixer.playing?(vi?'Dừng âm thanh':'Stop mixer'):(vi?'Phát âm thanh':'Play mixer')}</button></div>
      <div className="bfc7-fields"><label>{vi?'Tên công thức âm thanh':'Recipe name'}<input maxLength={32} value={recipeName} onChange={e=>setRecipeName(e.target.value)}/></label>
        <button type="button" onClick={addRecipe} disabled={!recipeName.trim()}><Plus size={15}/>{vi?'Lưu':'Save'}</button></div>
      {data.soundRecipes.map((recipe,i)=><div className="bfc7-dock-row" key={i}><strong>{recipe.name}</strong>
        <button type="button" onClick={()=>mixer.loadRecipe(recipe)}>{vi?'Nạp':'Load'}</button>
        <button type="button" aria-label={vi?'Xóa':'Delete'} onClick={()=>update({soundRecipes:data.soundRecipes.filter((_,j)=>i!==j)})}><Trash2 size={15}/></button>
      </div>)}
      {mixer.error&&<p role="alert">{mixer.error}</p>}
    </div>}
    {tab==='media'&&<div className="bfc7-stack">
      <h3>{vi?'Cinema Media Studio':'Cinema Media Studio'}</h3>
      <p>{vi?'Video đang chạy vẫn được giữ khi đóng Focus. Chỉ nút Tắt video hoặc đổi video có chủ đích mới ảnh hưởng phát nền.':'Current video persists across Close/Open. Stop and explicit video selection control playback.'}</p>
      <div className="bfc7-fields"><label>Video YouTube URL / ID<input value={videoDraft} onChange={e=>setVideoDraft(e.target.value)} placeholder="https://www.youtube.com/watch?v=..." /></label>
        <button type="button" onClick={saveVideo} disabled={!safeVideoId(videoDraft.trim())}><Plus size={16}/>{vi?'Thêm':'Add'}</button></div>
      <div className="bfc7-actions"><button type="button" onClick={()=>update({videoOverride:''})}>{vi?'Trở về cảnh chung':'Shared scene'}</button>
        <button type="button" onClick={youtubeSession?.playing?youtubeControls?.pause:youtubeControls?.play}>{youtubeSession?.playing?(vi?'Tạm dừng':'Pause'):(vi?'Phát':'Play')}</button>
        <button type="button" onClick={youtubeControls?.stop}>{vi?'Tắt hẳn video':'Stop video'}</button></div>
      {data.favorites.map((id,i)=><div className="bfc7-dock-row" key={id}>
        <strong>{i+1}. {id}</strong>
        <button type="button" aria-pressed={data.videoOverride===id} onClick={()=>onChooseVideo(id)}>{vi?'Phát video này':'Play selected'}</button>
        <button type="button" aria-label={vi?'Xóa mục yêu thích':'Remove favorite'} onClick={()=>{if(data.videoOverride===id)onChooseVideo('');update({favorites:data.favorites.filter(x=>x!==id)});}}><Trash2 size={15}/></button>
      </div>)}
      {uiRange(vi?'Tự dừng sau':'Stop playback after',data.stopAfterMinutes,0,180,v=>update({stopAfterMinutes:v}),vi?' phút':' min')}
      <small>{vi?'Thời gian dừng chỉ bắt đầu tính từ lúc bạn nhấn Phát một video; 0 = không hẹn giờ.':'Stop countdown begins when you explicitly select/play a video; 0 disables it.'}</small>
    </div>}
    {tab==='journal'&&<div className="bfc7-stack">
      <h3>{vi?'Focus Journal & Rituals':'Focus Journal & Rituals'}</h3>
      <p>{vi?'Ghi cảm nhận sau phiên làm việc. Nhật ký riêng trên trình duyệt và không thay thế ghi chú Supabase.':'Reflect after a session; local private entries do not replace Supabase Notes.'}</p>
      <div className="bfc7-choices">{[['calm',vi?'Bình yên':'Calm'],['good',vi?'Tốt':'Good'],['tired',vi?'Mệt':'Tired']].map(([id,name])=>choice(id,name,mood===id,()=>setMood(id)))}</div>
      <textarea value={note} rows={3} maxLength={600} onChange={e=>setNote(e.target.value)}
        placeholder={vi?'Hôm nay mình đã tập trung vào…':'Today I focused on…'}/>
      <button type="button" className="is-primary" disabled={!note.trim()} onClick={saveJournal}>{vi?'Lưu nhật ký':'Save reflection'}</button>
      {data.journal.slice(-12).reverse().map(item=><div className="bfc7-journal-item" key={item.id}>
        <small>{new Date(item.at).toLocaleDateString(vi?'vi-VN':'en-US')} · {item.mood}</small>
        <p>{item.text}</p><button type="button" onClick={()=>update({journal:data.journal.filter(x=>x.id!==item.id)})}>{vi?'Xóa':'Delete'}</button>
      </div>)}
    </div>}
    {tab==='insights'&&<div className="bfc7-stack">
      <h3>{vi?'Focus Insights':'Focus Insights'}</h3>
      <div className="bfc7-statline">
        <span><strong>{insights.totalMinutes}</strong><small>{vi?'phút':'minutes'}</small></span>
        <span><strong>{insights.totalSessions}</strong><small>{vi?'phiên':'sessions'}</small></span>
        <span><strong>{insights.streak}</strong><small>{vi?'ngày liên tiếp':'day streak'}</small></span>
      </div>
      <div className="bfc7-bars" aria-label={vi?'Thời gian tập trung 7 ngày':'Last seven days focus minutes'}>
        {insights.days.map(d=><div key={d.day}><span style={{height:(d.minutes>0?Math.max(8,Math.min(100,d.minutes/180*100)):2)+'%'}}/><small>{d.day.slice(5)}</small><small>{d.minutes}m</small></div>)}
      </div>
      <p>{vi?'Biểu đồ chỉ dùng các phiên Focus 7.0 đã hoàn thành, không suy đoán dữ liệu lịch sử.':'Based only on completed 7.0 sessions, never invented historical durations.'}</p>
      {insights.totalSessions>0&&<button type="button" onClick={()=>{if(window.confirm(vi?'Xóa lịch sử thống kê Focus 7.0?':'Clear Focus 7.0 session history?'))update({sessions:[]});}}>
        <Trash2 size={15}/>{vi?'Xóa lịch sử thống kê':'Clear history'}</button>}
    </div>}
    {tab==='classroom'&&<div className="bfc7-stack">
      <h3>{vi?'Classroom & Presentation Mode':'Classroom & Presentation Mode'}</h3>
      <p>{vi?'Chỉ hiện đồng hồ và bộ đếm. Ẩn ghi chú, nhật ký, thông tin cá nhân, thời tiết và công cụ quản trị khi trình chiếu.':'Keep the clock/timer; hide personal notes, journal, location, media controls and editing tools during projection.'}</p>
      <button type="button" className="is-primary" onClick={()=>{onClassroom(!classroom);if(!classroom)onClose();}}>
        {classroom?(vi?'Thoát chế độ lớp học':'Exit classroom'):(vi?'Bật chế độ lớp học':'Enter classroom')}</button>
      <p>{vi?'Chế độ này chỉ tồn tại trong phiên Focus hiện tại; không thay đổi quyền tài khoản.':'Session-only display mode. No account permissions are altered.'}</p>
    </div>}
   </div>
   <footer className="bfc7-studio__footer">{vi?'Thiết lập riêng trong trình duyệt · Không thay đổi nền chung':'Browser-private settings · Shared scene unchanged'}</footer>
 </section>;
}
