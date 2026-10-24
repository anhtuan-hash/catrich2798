import React,{useEffect,useMemo,useState} from 'react';
import QRCode from 'qrcode';
import Focus8LayoutComposer from './Focus8LayoutComposer.jsx';
import Focus8RemoteHost from './Focus8Remote.jsx';
import {saveFocus8Vault,loadFocus8Vault} from './focus8Cloud.js';
import {normalizeFocus8,focus8Csv} from './useFocus8Data.js';

const TABS=[
 ['scene','01','Scene Director'],['layout','02','Layout Composer'],['depth','03','Depth Engine'],
 ['automation','04','Automation'],['remote','05','Remote'],['classroom','06','Classroom'],
 ['sound','07','Sonic Engine'],['memory','08','Insights Pro'],['vault','09','Cloud Vault'],['commands','10','Command Center']
];
const moods=['off','dawn','golden','rain','twilight','midnight'];
const triggers=['open','break','complete'],actions=['mood','clock','particles','journal'];
const fallbackLabel=(id)=>({open:'Mở Focus',break:'Bắt đầu nghỉ',complete:'Kết thúc chu kỳ',mood:'Bầu không khí',clock:'Đồng hồ',particles:'Hạt sáng',journal:'Mở nhật ký'})[id]||id;
function download(name,text,type='application/json'){
 const blob=new Blob([text],{type});const url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=name;a.click();
 setTimeout(()=>URL.revokeObjectURL(url),2000);
}
export default function Focus8Studio({userId,language='vi',data,update,focus7,appearance,onAutomation,sessionEvents,scene,
 timer,flow,classroom,onClassroom,onCommand,onClose,onStageNext,mixer,initialTab='scene'}){
 const vi=language!=='en';
 const [tab,setTab]=useState(initialTab),[status,setStatus]=useState('');
 const [stageQr,setStageQr]=useState('');
 const [vaultBusy,setVaultBusy]=useState(false);
 const [cloudDate,setCloudDate]=useState('');
 const [recipe,setRecipe]=useState({trigger:'open',action:'mood',value:'golden'});
 const [stagePart,setStagePart]=useState('');
 const [cueMood,setCueMood]=useState('golden'),[cueMinutes,setCueMinutes]=useState(5);
 const sessions=Array.isArray(sessionEvents)?sessionEvents:[];
 const today=new Date();
 const rangeMs=30*24*60*60*1000;
 const monthly=sessions.filter(e=>Number.isFinite(e.at)&&e.at>=Date.now()-rangeMs);
 const summary=monthly.reduce((out,e)=>({minutes:out.minutes+(Number(e.minutes)||0),count:out.count+1}),{minutes:0,count:0});
 const updateStage=patch=>update({stage:{...data.stage,...patch}});
 const moodChange=id=>onAutomation?.({action:'mood',value:id});
 const saveVault=async()=>{
   setVaultBusy(true);setStatus('');
   try{const result=await saveFocus8Vault(userId,data);setCloudDate(result.updated_at);setStatus(vi?'Đã sao lưu lên tài khoản':'Cloud backup saved');}
   catch(e){setStatus(e.message);}
   finally{setVaultBusy(false);}
 };
 const restoreVault=async()=>{
  setVaultBusy(true);setStatus('');
  try{
   const found=await loadFocus8Vault(userId);
   if(!found){setStatus(vi?'Chưa có bản sao lưu':'No cloud backup found');return;}
   if(!window.confirm(vi?'Khôi phục sẽ thay thiết lập 8.0 hiện tại trên thiết bị này. Tiếp tục?':'Restore will replace local 8.0 settings. Continue?'))return;
   update(normalizeFocus8(found.settings));setCloudDate(found.updatedAt);setStatus(vi?'Đã khôi phục từ Cloud':'Restored from cloud');
  }catch(e){setStatus(e.message);}
  finally{setVaultBusy(false);}
 };
 const importVault=async file=>{
  if(!file||file.size>300000){setStatus(vi?'File vượt giới hạn 300 KB':'File exceeds 300 KB');return;}
  try{
    const value=JSON.parse(await file.text());
    if(value.schema!=='brian-focus-v8')throw Error('Invalid Focus backup format');
    if(!window.confirm(vi?'Nhập cấu hình Focus 8.0 từ file này?':'Import this Focus 8.0 backup?'))return;
    update(normalizeFocus8(value.settings));setStatus(vi?'Đã nhập cấu hình':'Imported settings');
  }catch(e){setStatus(e.message);}
 };
 useEffect(()=>{
  let live=true;
  if(data.stage.url.startsWith('https://')){
   QRCode.toDataURL(data.stage.url,{width:140,margin:1}).then(src=>{if(live)setStageQr(src);}).catch(()=>setStageQr(''));
  }else setStageQr('');
  return()=>{live=false;};
 },[data.stage.url]);
 return <section className="bfc8-studio" role="region" aria-label="Ambient OS 8.0 Studio">
  <header className="bfc8-studio__head"><div><small>BRIAN FOCUS · AMBIENT OS</small><h2>{vi?'Không gian tập trung 8.0':'Ambient OS 8.0'}</h2></div>
   <button type="button" onClick={onClose} aria-label={vi?'Đóng Studio':'Close Studio'}>×</button></header>
  <nav className="bfc8-tabs" aria-label="Ambient OS modules">
   {TABS.map(([id,n,title])=><button type="button" key={id} className={tab===id?'active':''}
    onClick={()=>setTab(id)} aria-current={tab===id?'page':undefined}><small>{n}</small>{title}</button>)}
  </nav>
  <div className="bfc8-studio__body">
  {tab==='scene'&&<div className="bfc8-stack"><h3>Cinematic Scene Director</h3>
    <p>{vi?'Timeline chỉ đổi màu và ánh sáng cảnh, không đổi video YouTube đang chạy.':'Timeline changes visual atmosphere only, never the currently playing YouTube video.'}</p>
    <div className="bfc8-rows">{data.cues.map((cue,i)=><div key={i}><strong>{i+1}. {cue.id} · {cue.minutes}m</strong>
      <button onClick={()=>update({cues:data.cues.filter((_,j)=>j!==i),cueRunning:false})} aria-label="Remove cue">×</button>
      {i>0&&<button onClick={()=>{const items=[...data.cues];[items[i-1],items[i]]=[items[i],items[i-1]];update({cues:items});}}>↑</button>}
    </div>)}</div>
    <div className="bfc8-actions">
     <select aria-label="Atmosphere" value={cueMood} onChange={e=>setCueMood(e.target.value)}>{moods.map(x=><option key={x}>{x}</option>)}</select>
     <input type="number" min="1" max="180" value={cueMinutes} aria-label="Minutes" onChange={e=>setCueMinutes(e.target.value)}/>
     <button disabled={data.cues.length>=8} onClick={()=>update({cues:[...data.cues,{id:cueMood,minutes:Math.max(1,Math.min(180,Number(cueMinutes)||5))}]})}>{vi?'Thêm cảnh':'Add cue'}</button>
    </div>
    <div className="bfc8-actions"><button className="primary" onClick={()=>update({cueRunning:true,cueIndex:0,cueDeadline:Date.now()+data.cues[0].minutes*60000})} disabled={!data.cues.length}>{vi?'Chạy timeline':'Start timeline'}</button>
      <button onClick={()=>update({cueRunning:false})}>{vi?'Dừng':'Stop'}</button>
      <button onClick={()=>onCommand?.({type:'scene-next'})} disabled={!data.cues.length}>{vi?'Cảnh kế':'Next scene'}</button></div>
    <p role="status">{data.cueRunning?((vi?'Đang chạy cảnh ':'Playing cue ')+(data.cueIndex+1)+'/'+data.cues.length): (vi?'Chưa chạy':'Stopped')}</p>
   </div>}
  {tab==='layout'&&<Focus8LayoutComposer data={data} update={update} language={language}/>}
  {tab==='depth'&&<div className="bfc8-stack"><h3>Dynamic Depth Engine</h3><p>{vi?'Hiệu ứng chiều sâu trên các lớp trang trí, không làm méo nội dung video.':'Depth applies to decorative overlays only; YouTube stays untouched.'}</p>
   <div className="bfc8-actions">{['off','subtle','standard'].map(x=><button key={x} className={data.depth===x?'active':''} onClick={()=>update({depth:x})}>{x}</button>)}</div>
  </div>}
  {tab==='automation'&&<div className="bfc8-stack"><h3>Focus Automation Recipes</h3><p>{vi?'Quy tắc xác định, không sử dụng AI hoặc thực thi mã tùy ý.':'Deterministic rules only; no AI or arbitrary code execution.'}</p>
   <div className="bfc8-actions">
    <select aria-label="Trigger" value={recipe.trigger} onChange={e=>setRecipe({...recipe,trigger:e.target.value})}>{triggers.map(x=><option key={x} value={x}>{fallbackLabel(x)}</option>)}</select>
    <select aria-label="Action" value={recipe.action} onChange={e=>setRecipe({...recipe,action:e.target.value})}>{actions.map(x=><option key={x}>{x}</option>)}</select>
    <input aria-label="Action value" value={recipe.value} onChange={e=>setRecipe({...recipe,value:e.target.value})} maxLength={60}/>
    <button disabled={data.recipes.length>=10} onClick={()=>update({recipes:[...data.recipes,{...recipe,id:crypto.randomUUID(),enabled:true}]})}>{vi?'Thêm':'Add'}</button>
   </div>
   <div className="bfc8-rows">{data.recipes.map((r,i)=><div key={r.id||i}>
     <label><input type="checkbox" checked={r.enabled} onChange={e=>update({recipes:data.recipes.map((x,j)=>j===i?{...x,enabled:e.target.checked}:x)})}/>{fallbackLabel(r.trigger)} → {fallbackLabel(r.action)}: {r.value}</label>
     <button type="button" onClick={()=>onAutomation?.(r)}>{vi?'Thử':'Test'}</button>
     <button type="button" onClick={()=>update({recipes:data.recipes.filter((_,j)=>j!==i)})} aria-label="Delete">×</button>
   </div>)}</div>
  </div>}
  {tab==='remote'&&<Focus8RemoteHost userId={userId} language={language} onCommand={onCommand}/>}
  {tab==='classroom'&&<div className="bfc8-stack"><h3>Classroom Stage Director</h3>
   <label>{vi?'Mục tiêu bài học':'Lesson objective'}<input maxLength={150} value={data.stage.title} onChange={e=>updateStage({title:e.target.value})}/></label>
   <label>{vi?'Link học liệu (HTTPS)':'Learning URL (HTTPS)'}<input value={data.stage.url} onChange={e=>updateStage({url:e.target.value})}/></label>
   <label>{vi?'Phút mỗi hoạt động':'Minutes per stage'}<input type="number" min="1" max="180" value={data.stage.minutes} onChange={e=>updateStage({minutes:Number(e.target.value)||10})}/></label>
   <label>{vi?'Các hoạt động, mỗi dòng một mục':'Stages, one per line'}<textarea rows="4" value={data.stage.parts.join('\n')}
    onChange={e=>updateStage({parts:e.target.value.split('\n').slice(0,8)})}/></label>
   <p>{vi?'Hoạt động hiện tại: ':'Current stage: '}{data.stage.parts[data.stage.partIndex]||'—'}</p>
   <div className="bfc8-actions"><button onClick={()=>onStageNext?.()}>{vi?'Hoạt động kế':'Next stage'}</button>
    <button onClick={()=>updateStage({running:true,deadline:Date.now()+data.stage.minutes*60000})}>{vi?'Bắt đầu đếm':'Start countdown'}</button>
    <button onClick={()=>updateStage({running:false})}>{vi?'Dừng đếm':'Stop'}</button></div>
   {stageQr&&<img width="140" height="140" src={stageQr} alt="QR for lesson resource"/>}
   <button className="primary" onClick={()=>{onClassroom(!classroom);if(!classroom)onClose();}}>{classroom?(vi?'Thoát trình chiếu':'Exit presentation'):(vi?'Trình chiếu lên TV':'Start presentation')}</button>
   </div>}
  {tab==='sound'&&<div className="bfc8-stack"><h3>Sonic Atmosphere Engine</h3>
   <p>{vi?'Dùng bộ trộn âm thanh 7.0, không tạo AudioContext thứ hai.':'Uses the existing 7.0 mixer; no second audio context.'}</p>
   <label>{vi?'Thời gian chuyển âm (giây)':'Crossfade seconds'} <strong>{data.soundFade}s</strong>
     <input type="range" min="0" max="10" value={data.soundFade} onChange={e=>update({soundFade:Number(e.target.value)})}/></label>
   <div className="bfc8-actions"><button onClick={()=>void mixer?.start()} disabled={mixer?.playing}>{vi?'Phát':'Play'}</button><button onClick={()=>void mixer?.stop()} disabled={!mixer?.playing}>{vi?'Dừng':'Stop'}</button></div>
   <p>{vi?'Chỉ phát sau tương tác; âm thanh YouTube có quyền ưu tiên.':'User gesture required; unmuted YouTube takes priority.'}</p>
  </div>}
  {tab==='memory'&&<div className="bfc8-stack"><h3>Focus Memory & Insights Pro</h3>
   <div className="bfc8-metrics"><span><strong>{summary.count}</strong>{vi?'phiên trong 30 ngày':'sessions / 30 days'}</span>
     <span><strong>{summary.minutes}</strong>{vi?'phút trong 30 ngày':'minutes / 30 days'}</span></div>
   <div className="bfc8-rows">{monthly.slice(-12).reverse().map((x,i)=><div key={i}>{new Date(x.at).toLocaleDateString(vi?'vi-VN':'en-US')} <strong>{x.minutes}m</strong></div>)}</div>
   <div className="bfc8-actions"><button onClick={()=>download('brian-focus-sessions.csv', '\uFEFF'+focus8Csv(sessions),'text/csv;charset=utf-8')}>Export CSV</button>
    <button onClick={()=>download('brian-focus-sessions.json',JSON.stringify(sessions,null,2))}>Export JSON</button></div>
   <p>{vi?'Chỉ xuất dữ liệu phiên thực tế đã ghi nhận từ Focus 7.0 trở đi.':'Exports only actual completed Focus sessions, not fabricated history.'}</p>
  </div>}
  {tab==='vault'&&<div className="bfc8-stack"><h3>Personal Atmosphere Cloud Vault</h3>
   <p>{vi?'Sao lưu và khôi phục thiết lập 8.0 theo tài khoản Supabase. Không ghi đè cảnh nền chung.':'Backup and restore 8.0 settings under authenticated Supabase RLS. Shared scene stays unchanged.'}</p>
   <div className="bfc8-actions"><button disabled={vaultBusy} className="primary" onClick={saveVault}>{vi?'Sao lưu Cloud':'Backup to cloud'}</button>
    <button disabled={vaultBusy} onClick={restoreVault}>{vi?'Khôi phục Cloud':'Restore cloud backup'}</button></div>
   <div className="bfc8-actions"><button onClick={()=>download('brian-focus-v8.json',JSON.stringify({schema:'brian-focus-v8',settings:data},null,2))}>{vi?'Xuất cấu hình JSON':'Export JSON'}</button>
    <label className="bfc8-file">{vi?'Nhập cấu hình':'Import JSON'}<input type="file" accept="application/json,.json" onChange={e=>{void importVault(e.target.files?.[0]);e.target.value='';}}/></label></div>
   {cloudDate&&<small>{vi?'Sao lưu gần nhất: ':'Last backup: '}{new Date(cloudDate).toLocaleString()}</small>}
  </div>}
  {tab==='commands'&&<div className="bfc8-stack"><h3>Universal Focus Command Center</h3>
   <p>{vi?'Nhấn ⌘K trên Mac hoặc Ctrl+K trên Windows để mở bảng lệnh.':'Press ⌘K on Mac or Ctrl+K on Windows for a searchable command palette.'}</p>
   <button className="primary" onClick={()=>onCommand?.({type:'command-open'})}>{vi?'Mở bảng lệnh':'Open commands'}</button>
   <p>{vi?'Các lệnh chỉ thực thi thao tác đã cho phép, không chạy script và không truy cập quyền admin.':'Commands are allowlisted; no scripts, AI or admin privilege changes.'}</p>
  </div>}
  </div>
  {status&&<p className="bfc8-studio__status" role="status">{status}</p>}
  <footer>{vi?'Các tính năng cá nhân tách biệt với ảnh nền dùng chung và quyền quản trị.':'Personal settings stay separate from the published scene and admin permissions.'}</footer>
 </section>;
}
