import React,{useEffect,useMemo,useState} from 'react';
import {silkRemaining,silkSnapshot,silkEvent} from './useFocus9.js';
const TABS=[
 ['performance','Hiệu năng','Performance'],['resume','Khôi phục','Recovery'],
 ['snapshots','Không gian','Snapshots'],['orbit','Đa đồng hồ','Multi-Timer'],
 ['presenter','Hai màn hình','Presenter'],['shield','Chống phân tâm','Shield'],
 ['media','YouTube','Media Guardian'],['capture','Ghi nhanh','Quick Capture'],
 ['timeline','Nhật ký','Timeline'],['offline','Ngoại tuyến','Offline']
];
const pad=x=>String(x).padStart(2,'0');
const fmt=ms=>{let sec=Math.max(0,Math.ceil(ms/1000));return pad(Math.floor(sec/60))+':'+pad(sec%60);};
function saveDownload(name,content,mime='application/json'){
 const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=name;a.click();
 window.setTimeout(()=>URL.revokeObjectURL(url),2000);
}
export default function Focus9Studio({
 language='vi',silk,update,event,quality,fps,onClose,
 appearance,onAppearance,focus7,update7,focus8,update8,
 youtubeSession,youtubeControls,mediaActive,online,
 presenter,onPresenterStart,onPresenterStop,onPresenterLink,
 stage,timer,refreshWeather,initialTab='performance',
}){
 const vi=language!=='en';
 const [tab,setTab]=useState(initialTab);
 const [name,setName]=useState('');
 const [undo,setUndo]=useState(null);
 const [timerLabel,setTimerLabel]=useState('');
 const [timerMinutes,setTimerMinutes]=useState(5);
 const [capture,setCapture]=useState('');
 const [kind,setKind]=useState('idea');
 const [status,setStatus]=useState('');
 const [now,setNow]=useState(Date.now());
 const [filter,setFilter]=useState('all');
 useEffect(()=>{
  if(tab!=='orbit')return undefined;
  const t=setInterval(()=>setNow(Date.now()),1000);
  return()=>clearInterval(t);
 },[tab]);
 const saveSnapshot=()=>{
  const label=name.trim();if(!label||silk.snapshots.length>=12)return;
  const f7={clock:focus7.clock,mood:focus7.mood,tint:focus7.tint,particle:focus7.particle,density:focus7.density,compactDock:focus7.compactDock};
  const f8={layoutEnabled:focus8.layoutEnabled,layout:focus8.layout,depth:focus8.depth,soundFade:focus8.soundFade};
  const snap=silkSnapshot(label,appearance,f7,f8);
  update(current=>({...current,snapshots:[...current.snapshots,snap]}));
  event('snapshot',vi?'Đã lưu không gian':'Saved snapshot');setName('');
 };
 const applySnapshot=x=>{
  const previous={appearance:{...appearance},focus7:{clock:focus7.clock,mood:focus7.mood,tint:focus7.tint,
    particle:focus7.particle,density:focus7.density,compactDock:focus7.compactDock},
    focus8:{layoutEnabled:focus8.layoutEnabled,layout:focus8.layout,depth:focus8.depth,soundFade:focus8.soundFade}};
  setUndo(previous);
  onAppearance?.(x.appearance);update7?.(x.focus7);update8?.(x.focus8);
  update(current=>({...current,lastSnapshot:x.id}));event('snapshot',vi?'Áp dụng: '+x.name:'Applied: '+x.name);
 };
 const changeTimer=(id,mode)=>{
  update(current=>({...current,orbit:current.orbit.map(x=>{
   if(x.id!==id)return x;
   if(mode==='pause')return {...x,running:false,remaining:silkRemaining(x),deadline:0};
   if(mode==='reset')return {...x,running:false,remaining:x.seconds*1000,deadline:0};
   const ms=silkRemaining(x);
   return {...x,running:true,remaining:ms,deadline:Date.now()+ms};
  })}));
  event('timer','Orbit '+mode);
 };
 const allTimers=mode=>{
  update(current=>({...current,orbit:current.orbit.map(x=>{
   if(mode==='pause')return {...x,running:false,remaining:silkRemaining(x),deadline:0};
   const ms=mode==='reset'?x.seconds*1000:silkRemaining(x);
   return {...x,running:mode!=='reset',remaining:ms,deadline:mode==='reset'?0:Date.now()+ms};
  })}));
  event('timer','Orbit '+mode+' all');
 };
 const addTimer=()=>{
  if(silk.orbit.length>=6)return;
  const seconds=Math.min(14400,Math.max(10,Math.round(timerMinutes*60)));
  const id=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():String(Date.now());
  update(current=>({...current,orbit:[...current.orbit,{
   id,label:timerLabel.trim().slice(0,52)||'Timer '+(current.orbit.length+1),
   seconds,running:false,remaining:seconds*1000,deadline:0,selected:!current.orbit.length
  }]}));setTimerLabel('');event('timer',vi?'Đã thêm đồng hồ':'Timer added');
 };
 const addCapture=()=>{
  const text=capture.trim();if(!text)return;
  const id=typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():String(Date.now());
  update(current=>({...current,captures:[...current.captures,{id,at:Date.now(),text:text.slice(0,400),category:kind,done:false}].slice(-100)}));
  event('capture',vi?'Đã ghi nhanh':'Quick note captured');setCapture('');
 };
 const timeline=silk.timeline.filter(x=>filter==='all'||x.type===filter).slice().reverse();
 const csv=['time,type,description',...timeline.map(x=>[new Date(x.at).toISOString(),x.type,x.label].map(v=>'"'+String(v).replaceAll('"','""')+'"').join(','))].join('\r\n');
 return <section className="bfc9-studio" role="region" aria-label={vi?'Tập trung và hiệu năng':'Focus productivity and performance'}>
  <header><div><small>BRIAN FOCUS · STUDIO</small><h2>{vi?'Tập trung và hiệu năng':'Focus & performance'}</h2></div>
   <button type="button" onClick={onClose} aria-label={vi?'Đóng':'Close'}>×</button></header>
  <nav className="bfc9-tabs" aria-label="Silk Flow Modules">{TABS.map(([id,vn,en],i)=><button type="button" key={id}
   className={tab===id?'active':''} aria-current={tab===id?'page':undefined} onClick={()=>setTab(id)}>
   <small>{pad(i+1)}</small>{vi?vn:en}</button>)}</nav>
  <div className="bfc9-content">
  {tab==='performance'&&<div className="bfc9-stack"><h3>Smart Performance Autopilot</h3>
   <p>{vi?'Tự điều chỉnh hiệu ứng trang trí, không thay đổi chất lượng phát YouTube, bộ đếm hoặc hiệu ứng Close.':'Adapts decoration only; never changes YouTube, timer, or close animation.'}</p>
   <div className="bfc9-choices">{[['auto','Auto'],['beautiful','Beautiful'],['smooth','Ultra Smooth']].map(([v,label])=>
    <button key={v} className={silk.performanceMode===v?'active':''} onClick={()=>update({performanceMode:v})}>{label}</button>)}</div>
   <div className="bfc9-metrics"><span><strong>{fps===null?'—':fps}</strong>{vi?'FPS đo thực tế':'Observed FPS'}</span>
    <span><strong>{quality}</strong>{vi?'Chất lượng hiệu ứng':'Visual quality'}</span></div>
   <p>{vi?'Số FPS là mẫu đo trong cửa sổ 5 giây, không phải cam kết hiệu năng.':'Measured rAF cadence over five seconds, not a performance guarantee.'}</p>
  </div>}
  {tab==='resume'&&<div className="bfc9-stack"><h3>Instant Resume & Recovery</h3>
   <p>{vi?'Trạng thái phiên và đồng hồ được lưu theo tài khoản. Sau khi tải lại, việc mở lại Focus cần thao tác của bạn.':'Session metadata and timers are locally stored; opening Focus after reload requires your action.'}</p>
   {silk.recovery?<div className="bfc9-item"><strong>{new Date(silk.recovery.at).toLocaleString()}</strong>
    <span>{silk.recovery.intention||'Focus'} · {silk.recovery.cue||'Scene'}</span></div>:<p>{vi?'Chưa có dữ liệu phục hồi':'No recovery data'}</p>}
   <button onClick={()=>update({recovery:null})} disabled={!silk.recovery}>{vi?'Xóa dữ liệu phục hồi':'Discard recovery'}</button>
  </div>}
  {tab==='snapshots'&&<div className="bfc9-stack"><h3>One-Touch Workspace Snapshots</h3>
   <p>{vi?'Lưu tùy chỉnh không gian, không lưu nguồn YouTube hoặc thay đổi quyền quản trị.':'Save workspace settings without altering YouTube playback or admin data.'}</p>
   <div className="bfc9-actions"><input maxLength={50} value={name} onChange={e=>setName(e.target.value)} placeholder={vi?'Tên không gian':'Snapshot name'}/>
    <button disabled={!name.trim()||silk.snapshots.length>=12} onClick={saveSnapshot}>{vi?'Lưu':'Save'}</button>
    {undo&&<button onClick={()=>{onAppearance(undo.appearance);update7(undo.focus7);update8(undo.focus8);setUndo(null);}}>{vi?'Hoàn tác':'Undo'}</button>}</div>
   {silk.snapshots.map(x=><div key={x.id} className="bfc9-item"><strong>{x.name}</strong><small>{new Date(x.at).toLocaleString()}</small>
    <div className="bfc9-actions"><button onClick={()=>applySnapshot(x)}>{vi?'Áp dụng':'Apply'}</button>
     <button onClick={()=>update(cur=>({...cur,snapshots:cur.snapshots.filter(s=>s.id!==x.id)}))}>{vi?'Xóa':'Delete'}</button></div></div>)}
  </div>}
  {tab==='orbit'&&<div className="bfc9-stack"><h3>Multi-Timer Orbit</h3>
   <div className="bfc9-actions"><input value={timerLabel} maxLength={52} onChange={e=>setTimerLabel(e.target.value)} placeholder={vi?'Tên đồng hồ':'Timer title'}/>
    <input type="number" aria-label={vi?'Phút':'Minutes'} min={1} max={240} value={timerMinutes} onChange={e=>setTimerMinutes(Number(e.target.value)||1)}/>
    <button disabled={silk.orbit.length>=6} onClick={addTimer}>{vi?'Thêm':'Add'}</button></div>
   <div className="bfc9-actions"><button onClick={()=>allTimers('start')}>{vi?'Chạy tất cả':'Start all'}</button>
    <button onClick={()=>allTimers('pause')}>{vi?'Dừng tất cả':'Pause all'}</button>
    <button onClick={()=>allTimers('reset')}>{vi?'Đặt lại':'Reset all'}</button></div>
   <div className="bfc9-orbit">{silk.orbit.map(x=><div key={x.id} className="bfc9-item"><strong>{x.label}</strong>
    <span className="bfc9-clock" role="timer">{fmt(silkRemaining(x,now))}</span>
    <div className="bfc9-actions"><button onClick={()=>changeTimer(x.id,x.running?'pause':'start')}>{x.running?(vi?'Dừng':'Pause'):(vi?'Chạy':'Start')}</button>
     <button onClick={()=>changeTimer(x.id,'reset')}>{vi?'Đặt lại':'Reset'}</button>
     <button onClick={()=>update(cur=>({...cur,orbit:cur.orbit.map(t=>({...t,selected:t.id===x.id}))}))}>{x.selected?'✓ TV':'TV'}</button>
     <button onClick={()=>update(cur=>({...cur,orbit:cur.orbit.filter(t=>t.id!==x.id)}))} aria-label="Remove">×</button></div>
   </div>)}</div>
   <small>{vi?'Các đồng hồ này độc lập với Pomodoro và dùng mốc thời gian thực.':'These timers are independent of Pomodoro and use absolute deadlines.'}</small>
  </div>}
  {tab==='presenter'&&<div className="bfc9-stack"><h3>Dual-Screen Presenter Bridge</h3>
   <p>{vi?'MacBook và TV/điện thoại cần đăng nhập cùng tài khoản. Màn hình chiếu chỉ thấy mục tiêu, hoạt động, thời gian và QR học liệu.':'Both displays must be signed into the same account; only sanitized lesson, timer and resource QR are shared.'}</p>
   {presenter?.id?<><p>{vi?'Đã bật phiên trình chiếu đến':'Presenter active until'} {new Date(presenter.expires_at).toLocaleTimeString()}</p>
    <div className="bfc9-actions"><button onClick={onPresenterLink}>{vi?'Sao chép liên kết TV':'Copy viewer link'}</button><button onClick={onPresenterStop}>{vi?'Kết thúc':'End sharing'}</button></div></>
    :<button onClick={onPresenterStart} disabled={!online}>{vi?'Bắt đầu trình chiếu riêng':'Start private display'}</button>}
   {!online&&<p role="status">{vi?'Cần có mạng để đồng bộ TV. Đồng hồ cục bộ vẫn chạy.':'Network required to synchronize TV; local timers keep running.'}</p>}
  </div>}
  {tab==='shield'&&<div className="bfc9-stack"><h3>Distraction Shield</h3>
   <p>{vi?'Ẩn tiện ích và điều khiển phụ; nút Đóng và công cụ chính vẫn truy cập được. Không xóa thông báo.':'Conceals extras while keeping Close accessible; no notifications are deleted.'}</p>
   <button className={silk.shield?'active':''} onClick={()=>update({shield:!silk.shield})}>{silk.shield?(vi?'Tắt chống phân tâm':'Disable shield'):(vi?'Bật chống phân tâm':'Enable shield')}</button>
  </div>}
  {tab==='media'&&<div className="bfc9-stack"><h3>Media Continuity Guardian</h3>
   <div className="bfc9-metrics"><span><strong>{online?'Online':'Offline'}</strong>{vi?'Kết nối mạng':'Network'}</span>
    <span><strong>{youtubeSession?.mounted?(youtubeSession.playing?'Playing':'Paused'):'Not loaded'}</strong>YouTube</span></div>
   <p>{!online?(vi?'Khi mất mạng, không tải lại video.':'Offline: player will not be reloaded.'):!mediaActive?(vi?'Cảnh hiện tại không phải YouTube.':'Current scene is not YouTube.'):(vi?'Các điều khiển dưới đây sử dụng trình phát YouTube hiện có.':'These controls reuse the existing persistent YouTube iframe.')}</p>
   <div className="bfc9-actions"><button disabled={!mediaActive||!online} onClick={()=>youtubeControls?.play()}>{vi?'Phát / thử lại':'Play / retry'}</button>
    <button disabled={!youtubeSession?.mounted} onClick={()=>youtubeControls?.pause()}>{vi?'Tạm dừng':'Pause'}</button>
    <button disabled={!youtubeSession?.mounted} onClick={()=>{if(window.confirm(vi?'Dừng hẳn video?':'Stop video completely?'))youtubeControls?.stop();}}>{vi?'Tắt video':'Stop video'}</button></div>
   <small>{vi?'Trình duyệt có thể chặn tự phát. Không thể đọc chính xác trạng thái buffer bên trong iframe YouTube.':'Browser autoplay rules apply; exact buffering state inside the cross-origin iframe is not exposed.'}</small>
  </div>}
  {tab==='capture'&&<div className="bfc9-stack"><h3>Focus Quick Capture</h3>
   <div className="bfc9-actions"><select value={kind} onChange={e=>setKind(e.target.value)}><option value="idea">{vi?'Ý tưởng':'Idea'}</option><option value="task">{vi?'Nhiệm vụ':'Task'}</option></select>
    <input value={capture} maxLength={400} placeholder={vi?'Ghi nhanh…':'Capture an idea…'} onChange={e=>setCapture(e.target.value)}
     onKeyDown={e=>{if(e.key==='Enter')addCapture();}}/>
    <button disabled={!capture.trim()} onClick={addCapture}>{vi?'Lưu':'Save'}</button></div>
   {silk.captures.slice().reverse().map(x=><div key={x.id} className="bfc9-item">
    <label><input type="checkbox" checked={x.done} onChange={e=>update(cur=>({...cur,captures:cur.captures.map(t=>t.id===x.id?{...t,done:e.target.checked}:t)}))}/>
     <span style={{textDecoration:x.done?'line-through':'none'}}>{x.text}</span></label>
    <small>{x.category} · {new Date(x.at).toLocaleString()}</small>
    <button onClick={()=>update(cur=>({...cur,captures:cur.captures.filter(t=>t.id!==x.id)}))}>{vi?'Xóa':'Delete'}</button>
   </div>)}
  </div>}
  {tab==='timeline'&&<div className="bfc9-stack"><h3>Session Timeline & Rewind</h3>
   <p>{vi?'Xem lại sự kiện, không tua lại hoặc thay đổi phiên hiện tại.':'Review events without rewinding or modifying active playback.'}</p>
   <div className="bfc9-actions"><select value={filter} onChange={e=>setFilter(e.target.value)}>
    {['all','open','close','timer','stage','snapshot','capture','network'].map(x=><option key={x}>{x}</option>)}</select>
    <button onClick={()=>saveDownload('brian-focus-timeline.csv','\uFEFF'+csv,'text/csv;charset=utf-8')}>CSV</button>
    <button onClick={()=>saveDownload('brian-focus-timeline.json',JSON.stringify(timeline,null,2))}>JSON</button></div>
   {timeline.slice(0,100).map(x=><div key={x.id} className="bfc9-item"><small>{new Date(x.at).toLocaleString()}</small><strong>{x.type} · {x.label}</strong></div>)}
  </div>}
  {tab==='offline'&&<div className="bfc9-stack"><h3>Offline-Ready & Reconnect Shield</h3>
   <div className="bfc9-metrics"><span><strong>{online?(vi?'Đã kết nối':'Connected'):(vi?'Ngoại tuyến':'Offline')}</strong>{vi?'Trạng thái mạng':'Network status'}</span>
    <span><strong>{silk.orbit.length}</strong>{vi?'Đồng hồ cục bộ':'Local timers'}</span></div>
   <p>{vi?'Ghi nhanh, snapshot và đồng hồ lưu trên thiết bị. YouTube, dữ liệu Cloud và thời tiết cần mạng. Các ảnh chưa được cache không dùng offline.':'Local notes, snapshots and timers work without network. YouTube, cloud and weather require connectivity; uncached media are unavailable offline.'}</p>
   <button disabled={!online} onClick={()=>{refreshWeather?.();setStatus(vi?'Đã yêu cầu cập nhật thời tiết':'Weather refresh requested');}}>{vi?'Làm mới thời tiết sau kết nối':'Refresh weather after reconnect'}</button>
   {status&&<p role="status">{status}</p>}
  </div>}
  </div>
  <footer>{vi?'Lưu theo tài khoản trên trình duyệt · Không tích hợp AI':'Account-scoped browser data · No AI'}</footer>
 </section>;
}
