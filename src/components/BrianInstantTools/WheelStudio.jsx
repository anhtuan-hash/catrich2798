
import React,{useEffect,useMemo,useRef,useState} from 'react';
import {Check,ChevronDown,Download,Eye,EyeOff,FileUp,History,Plus,RotateCcw,Settings2,Shuffle,Sparkles,Trophy,Trash2,Target} from 'lucide-react';
import {WHEEL_THEMES,wheelSegments,pickWheelSegment,wheelTargetForSegment,makeWheelHistory,wheelCsv,parseWheelCsv,shuffleWheelRows} from './wheelStudioCore.mjs';
import './WheelStudio.css';
import PowerUpWheel from './PowerUpWheel.jsx';
import {Dices,Zap} from 'lucide-react';
const TXT={
 vi:{items:'Danh sách',results:'Kết quả',settings:'Tùy chỉnh',title:'Vòng quay may mắn',spin:'QUAY NGAY',spinning:'Đang quay…',stop:'DỪNG SỚM',apply:'Áp dụng tên',
 modes:['Thông thường','Loại dần','Tích lũy'],add:'Thêm mục',shuffle:'Trộn',reset:'Khôi phục tất cả',recent:'Lịch sử lượt quay',
 empty:'Chưa có kết quả',duration:'Thời gian',confetti:'Pháo giấy',labels:'Hiện tên',mystery:'Ẩn danh sách bí mật',active:'Đang tham gia',
 theme:'Bảng màu',weight:'Trọng số',tip:'Bấm nút QUAY NGAY hoặc tâm bánh xe',paste:'Dán danh sách tên (mỗi dòng một tên)',
 csvIn:'Nhập CSV',csvOut:'Xuất CSV',sort:'Sắp xếp',clear:'Xóa lịch sử',stats:'Số lượt quay',search:'Tìm tên',
 presets:['4 đội','6 nhóm','Hoạt động'],wrong:'Cần ít nhất 2 tên; tối đa 60 mục.',winner:'KẾT QUẢ',wins:'Lượt trúng',
 notes:'Lưu trên thiết bị · Không AI · Không phát sinh phí',mode:'Chế độ',repeat:'Quay tiếp',removed:'Đã loại khỏi lượt sau'},
 en:{items:'Entries',results:'Results',settings:'Customize',title:'Lucky Wheel',spin:'SPIN NOW',spinning:'Spinning…',stop:'STOP EARLY',apply:'Apply names',
 modes:['Normal','Elimination','Accumulation'],add:'Add entry',shuffle:'Shuffle',reset:'Restore all',recent:'Recent results',
 empty:'No results yet',duration:'Duration',confetti:'Confetti',labels:'Show labels',mystery:'Mystery wheel',active:'Active',
 theme:'Color theme',weight:'Weight',tip:'Press SPIN NOW or the center of the wheel',paste:'Paste names (one per line)',
 csvIn:'Import CSV',csvOut:'Export CSV',sort:'Sort',clear:'Clear history',stats:'Total spins',search:'Find a name',
 presets:['4 teams','6 groups','Activities'],wrong:'Enter 2 to 60 entries.',winner:'WINNER',wins:'Wins',
 notes:'Saved on device · No AI · No fees',mode:'Mode',repeat:'Spin again',removed:'Removed for next spin'}
};
const PRESETS=[['Team 1','Team 2','Team 3','Team 4'],['Group A','Group B','Group C','Group D','Group E','Group F'],['Vocabulary','Grammar','Reading','Speaking','Listening','Writing']];
const download=(name,text)=>{
 const url=URL.createObjectURL(new Blob(['\uFEFF'+text],{type:'text/csv;charset=utf-8'}));
 const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000);
};
const freshRows=names=>names.slice(0,60).map((label,i)=>({id:'w'+Date.now().toString(36)+i,label:label.slice(0,45),weight:1,enabled:true,color:''}));
const randomInt=(a,b)=>{
 const n=b-a+1,buf=new Uint32Array(1),limit=0x100000000-0x100000000%n;
 if(!globalThis.crypto?.getRandomValues)return a+Math.floor(Math.random()*n);
 do{globalThis.crypto.getRandomValues(buf);}while(buf[0]>=limit);
 return a+buf[0]%n;
};
export default function WheelStudio({value,onChange,t,sound,onSound,onCelebrate}){
 const vi=t.spin==='QUAY NGAY',T=TXT[vi?'vi':'en'];
 const [tab,setTab]=useState('items'),[paste,setPaste]=useState((value.rows||[]).map(r=>r.label).join('\n'));
 const [wheelView,setWheelView]=useState('standard');
 const [search,setSearch]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false),[saveName,setSaveName]=useState('');
 const [selected,setSelected]=useState(null),[burst,setBurst]=useState(0);
 const wheelRef=useRef(null),frameRef=useRef(null),intervalRef=useRef(null),runRef=useRef(null),csvRef=useRef(null),mounted=useRef(true);
 const rows=value.rows||[],segments=useMemo(()=>wheelSegments(rows,value.theme),[rows,value.theme]);
 const [frozenSegments,setFrozenSegments]=useState(null);
 const shownSegments=(busy||selected)&&frozenSegments?frozenSegments:segments;
 const counts=value.counts||{},history=value.history||[];
 const active=segments.length,mode=value.mode||'normal',seconds=Number(value.duration)||5;
 const palette=WHEEL_THEMES[value.theme]||WHEEL_THEMES.aurora;
 const change=fn=>onChange(old=>{const next=fn(old);return {...next,names:next.rows.map(r=>r.label)};});
 const setRows=fn=>change(w=>({...w,rows:fn(w.rows),winner:null}));
 useEffect(()=>{
  mounted.current=true;
  return ()=>{
  mounted.current=false;
  if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);
  clearInterval(intervalRef.current);runRef.current=null;
  };
 },[]);
 useEffect(()=>{
  if(!runRef.current&&wheelRef.current)wheelRef.current.style.transform='rotate('+Number(value.rotation||0)+'deg)';
 },[value.rotation]);
 const finish=(result,angle)=>{
  if(!runRef.current||!mounted.current)return;
  runRef.current=null;
  if(frameRef.current!==null)cancelAnimationFrame(frameRef.current);
  frameRef.current=null;clearInterval(intervalRef.current);intervalRef.current=null;
  const final=((angle%360)+360)%360;
  if(wheelRef.current)wheelRef.current.style.transform='rotate('+final+'deg)';
  setBusy(false);setSelected(result);
  change(w=>({...w,rotation:final,winner:result.label,spins:Math.min(100000,(w.spins||0)+1),
   history:makeWheelHistory(w.history,result,w.mode),
   counts:{...w.counts,[result.id]:(w.counts?.[result.id]||0)+1},
   rows:w.mode==='elimination'?w.rows.map(r=>r.id===result.id?{...r,enabled:false}:r):w.rows}));
  onSound?.('win',sound);
  if(value.confetti!==false&&!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches){
   setBurst(n=>n+1);const rect=wheelRef.current?.getBoundingClientRect();
   onCelebrate?.(rect?{x:(rect.left+rect.width/2)/innerWidth,y:(rect.top+rect.height/2)/innerHeight}:{x:.5,y:.5});
  }
 };
 const spin=()=>{
  if(runRef.current||active<2)return;
  setSelected(null);setFrozenSegments(segments);setBurst(0);setError('');
  const result=pickWheelSegment(segments,randomInt);
  const from=((Number(value.rotation||0)%360)+360)%360,to=wheelTargetForSegment(from,result,6);
  const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  runRef.current={from,to,start:performance.now(),duration:seconds*1000,last:from,result};
  if(reduced){finish(result,to);return;}
  setBusy(true);change(w=>({...w,winner:null}));onSound?.('roll',sound);
  const paint=now=>{
   const r=runRef.current;if(!r||!mounted.current)return;
   const p=Math.max(0,Math.min(1,(now-r.start)/r.duration));
   const angle=r.from+(r.to-r.from)*(1-Math.pow(1-p,3));
   r.last=angle;if(wheelRef.current)wheelRef.current.style.transform='rotate('+angle+'deg)';
   if(p>=1)finish(r.result,r.to);
  };
  const frame=now=>{paint(now);if(runRef.current)frameRef.current=requestAnimationFrame(frame);};
  intervalRef.current=setInterval(()=>paint(performance.now()),70);
  frameRef.current=requestAnimationFrame(frame);
 };
 const stop=()=>{const r=runRef.current;if(!r)return;r.from=r.last;r.start=performance.now();r.duration=750;};
 useEffect(()=>{
  const cb=e=>{if(wheelView==='standard'&&(e.ctrlKey||e.metaKey)&&e.key==='Enter'&&!/INPUT|TEXTAREA/.test(e.target?.tagName||'')){e.preventDefault();spin();}};
  addEventListener('keydown',cb);return ()=>removeEventListener('keydown',cb);
 });
 const apply=()=>{
  const names=paste.split(/\r?\n/).map(v=>v.trim()).filter(Boolean).slice(0,60);
  if(names.length<2){setError(T.wrong);return;}
  setError('');setRows(()=>freshRows(names));setSelected(null);
  change(w=>({...w,history:[],counts:{},spins:0,rotation:0}));
 };
 const preset=ns=>{setRows(()=>freshRows(ns));setPaste(ns.join('\n'));setSelected(null);change(w=>({...w,rotation:0,history:[],counts:{},spins:0}));};
 const add=()=>{if(rows.length>=60)return;setRows(rs=>[...rs,{id:'w'+Date.now().toString(36)+rs.length,label:(vi?'Mục ':'Entry ')+(rs.length+1),weight:1,enabled:true,color:''}]);};
 const readCsv=async file=>{
  if(!file||file.size>40000){setError('CSV ≤ 40 KB');return;}
  try{const parsed=parseWheelCsv(await file.text());if(parsed.length<2)throw Error(T.wrong);
   setRows(()=>parsed);setPaste(parsed.map(r=>r.label).join('\n'));setError('');
  }catch{setError(T.wrong);}
 };
 const gradient=shownSegments.length?'conic-gradient('+shownSegments.map(r=>r.color+' '+r.start.toFixed(3)+'deg '+r.end.toFixed(3)+'deg').join(',')+')':'#a9cad1';
 const modes=['normal','elimination','accumulation'];
 const tabs=[['items',T.items],['results',T.results],['settings',T.settings]];
 return <>
  <div className="bit-ws-mode-switch" role="group" aria-label={vi?'Chọn chế độ vòng quay':'Choose wheel mode'}>
   <button type="button" aria-pressed={wheelView==='standard'} onClick={()=>setWheelView('standard')}>
    <Target size={18}/>{vi?'Vòng quay tên / đội':'Names / Teams'}</button>
   <button type="button" aria-pressed={wheelView==='powerups'} onClick={()=>setWheelView('powerups')}>
    <Zap size={18}/>{vi?'QUAY POWER-UP · 50 THẺ':'POWER-UP WHEEL · 50 CARDS'}</button>
  </div>
  {wheelView==='powerups'?
   <PowerUpWheel value={value} onChange={onChange} t={t} sound={sound}
    onSound={onSound} onCelebrate={onCelebrate}/>:
  <section className="bit-wheel-studio" data-testid="brian-wheel-studio">
  <div className="bit-ws-top"><div><span className="bit-ws-kicker"><Sparkles size={14}/> BRIAN WHEEL STUDIO</span>
   <h3>{T.title}</h3><p>Random Picker · Classroom Edition</p></div>
   <div className="bit-ws-metrics"><span><strong>{active}</strong>{T.active}</span><span><strong>{value.spins||0}</strong>{T.stats}</span></div></div>
  <div className="bit-ws-layout">
   <aside className="bit-ws-sidebar">
    <div className="bit-ws-tabs" role="tablist" aria-label={T.items}>
     {tabs.map(([id,label])=><button type="button" role="tab" aria-selected={tab===id} key={id} className={tab===id?'active':''} onClick={()=>setTab(id)}>
      {id==='items'?<Target size={16}/>:id==='results'?<History size={16}/>:<Settings2 size={16}/>} {label}</button>)}</div>
    {tab==='items'&&<div className="bit-ws-panel" role="tabpanel">
     <div className="bit-ws-section-title"><strong>{T.items}</strong><small>{rows.length}/60</small></div>
     <input type="search" aria-label={T.search} placeholder={T.search} className="bit-ws-search" value={search} onChange={e=>setSearch(e.target.value)}/>
     <div className="bit-ws-list">{rows.filter(r=>r.label.toLowerCase().includes(search.toLowerCase())).map((r,i)=>
      <div key={r.id} className={'bit-ws-item'+(!r.enabled?' hidden-entry':'')}>
       <button type="button" disabled={busy} title={r.enabled?'Ẩn':'Hiện'} aria-label={(r.enabled?'Hide ':'Show ')+r.label}
        onClick={()=>setRows(rs=>rs.map(v=>v.id===r.id?{...v,enabled:!v.enabled}:v))}>{r.enabled?<Eye size={15}/>:<EyeOff size={15}/>}</button>
       <input className="bit-ws-name" value={r.label} maxLength={45} aria-label={'Entry '+(i+1)} disabled={busy}
        onChange={e=>setRows(rs=>rs.map(v=>v.id===r.id?{...v,label:e.target.value}:v))}/>
       <input className="bit-ws-weight" type="number" min="1" max="20" value={r.weight} title={T.weight} aria-label={T.weight+' '+r.label} disabled={busy}
        onChange={e=>setRows(rs=>rs.map(v=>v.id===r.id?{...v,weight:Math.min(20,Math.max(1,Number(e.target.value)||1))}:v))}/>
       <input className="bit-ws-color" type="color" aria-label={'Color '+r.label} disabled={busy}
        value={r.color||palette[rows.indexOf(r)%palette.length]}
        onChange={e=>setRows(rs=>rs.map(v=>v.id===r.id?{...v,color:e.target.value}:v))}/>
       <button type="button" aria-label={'Delete '+r.label} disabled={busy||rows.length<=2} onClick={()=>setRows(rs=>rs.filter(v=>v.id!==r.id))}><Trash2 size={14}/></button>
      </div>)}</div>
     <div className="bit-ws-actions"><button type="button" disabled={busy||rows.length>=60} onClick={add}><Plus size={16}/>{T.add}</button>
      <button type="button" disabled={busy} onClick={()=>setRows(rs=>shuffleWheelRows(rs))}><Shuffle size={16}/>{T.shuffle}</button>
      <button type="button" disabled={busy} onClick={()=>setRows(rs=>[...rs].sort((a,b)=>a.label.localeCompare(b.label)))}>{T.sort}</button></div>
     <details className="bit-ws-details"><summary>{T.paste}<ChevronDown size={16}/></summary>
      <textarea id="bit-wheel-list" rows="5" maxLength={3300} value={paste} disabled={busy} onChange={e=>setPaste(e.target.value)}/>
      <button type="button" disabled={busy} onClick={apply}><Check size={16}/>{T.apply}</button></details>
     <div className="bit-ws-actions"><button onClick={()=>csvRef.current?.click()} type="button"><FileUp size={16}/>{T.csvIn}</button>
      <input ref={csvRef} type="file" hidden accept=".csv,text/csv" onChange={e=>{void readCsv(e.target.files?.[0]);e.target.value='';}}/>
      <button type="button" onClick={()=>download('brian-wheel.csv',wheelCsv(rows))}><Download size={16}/>{T.csvOut}</button></div>
     <div className="bit-ws-presets">{PRESETS.map((p,i)=><button type="button" key={i} disabled={busy} onClick={()=>preset(p)}>{T.presets[i]}</button>)}</div>
    </div>}
    {tab==='results'&&<div className="bit-ws-panel" role="tabpanel">
     <div className="bit-ws-result-metrics"><span><strong>{value.spins||0}</strong>{T.stats}</span><span><strong>{history.length}</strong>{T.wins}</span></div>
     <h4>{T.recent}</h4><div className="bit-ws-history">{history.length?history.map((r,i)=>
      <div key={i}><span>{history.length-i}.</span><strong>{r.label}</strong><small>{r.time?new Date(r.time).toLocaleTimeString(vi?'vi-VN':'en-US'):' '}</small></div>):<p>{T.empty}</p>}</div>
     {mode==='accumulation'&&<div className="bit-ws-leaders">{[...rows].sort((a,b)=>(counts[b.id]||0)-(counts[a.id]||0)).map((r,i)=><div key={r.id}><span>{i+1}. {r.label}</span><strong>{counts[r.id]||0}</strong></div>)}</div>}
     <div className="bit-ws-actions"><button type="button" disabled={!history.length} onClick={()=>download('brian-wheel-results.csv','name,mode,time\r\n'+history.map(r=>'"'+r.label.replace(/"/g,'""')+'",'+r.mode+','+new Date(r.time).toISOString()).join('\r\n'))}><Download size={15}/> CSV</button>
      <button type="button" disabled={!history.length||busy} onClick={()=>{if(confirm(T.clear+'?'))change(w=>({...w,history:[],counts:{},spins:0}));}}><Trash2 size={15}/>{T.clear}</button></div>
    </div>}
    {tab==='settings'&&<div className="bit-ws-panel bit-ws-settings" role="tabpanel">
     <h4>{T.mode}</h4><div className="bit-ws-mode">{modes.map((id,i)=><button type="button" key={id} className={mode===id?'active':''} disabled={busy} onClick={()=>change(w=>({...w,mode:id}))}>{T.modes[i]}</button>)}</div>
     <label className="bit-ws-duration"><span>{T.duration}: <strong>{seconds}s</strong></span>
      <input type="range" min="2" max="20" step="1" disabled={busy} value={seconds} onChange={e=>change(w=>({...w,duration:Number(e.target.value)}))}/></label>
     <h4>{T.theme}</h4><div className="bit-ws-themes">{Object.entries(WHEEL_THEMES).map(([id,colors])=>
      <button key={id} type="button" title={id} aria-label={id} aria-pressed={value.theme===id} disabled={busy}
       onClick={()=>change(w=>({...w,theme:id}))}
       style={{background:'conic-gradient('+colors.map((c,i)=>c+' '+i/colors.length*360+'deg '+(i+1)/colors.length*360+'deg').join(',')+')'}}/>)}</div>
     <div className="bit-ws-saved">
      <h4>{vi?'Bộ vòng quay đã lưu':'Saved wheel lists'} <small>{(value.savedLists||[]).length}/8</small></h4>
      <div className="bit-ws-save-form">
       <input maxLength={40} value={saveName} onChange={e=>setSaveName(e.target.value)}
        placeholder={vi?'Tên bộ vòng quay (VD: Lớp 11A)':'Preset name (e.g. Class 11A)'}
        aria-label={vi?'Tên bộ vòng quay':'Wheel preset name'}/>
       <button type="button" disabled={!saveName.trim()||busy} onClick={()=>{
        const label=saveName.trim().slice(0,40);
        change(w=>{
         const previous=(w.savedLists||[]).filter(p=>p.label!==label);
         const snapshot={id:'set-'+Date.now().toString(36),label,rows:w.rows.map(r=>({...r})),
          mode:w.mode,theme:w.theme,duration:w.duration};
         return {...w,savedLists:[...previous,snapshot].slice(-8)};
        });
        setSaveName('');
       }}>{vi?'Lưu bộ':'Save'}</button>
      </div>
      <div className="bit-ws-saved-list">{(value.savedLists||[]).map(p=>
       <div key={p.id}><strong>{p.label}</strong><span>{p.rows.length} {T.items.toLowerCase()}</span>
        <button type="button" disabled={busy} onClick={()=>{
         setSelected(null);setFrozenSegments(null);
         setPaste(p.rows.map(r=>r.label).join('\n'));
         change(w=>({...w,rows:p.rows.map(r=>({...r})),theme:p.theme,mode:p.mode,
          duration:p.duration,rotation:0,history:[],spins:0,counts:{},winner:null}));
         if(wheelRef.current)wheelRef.current.style.transform='rotate(0deg)';
         setTab('items');
        }}>{vi?'Mở':'Load'}</button>
        <button type="button" disabled={busy} aria-label={'Delete saved '+p.label}
         onClick={()=>change(w=>({...w,savedLists:(w.savedLists||[]).filter(x=>x.id!==p.id)}))}>
         <Trash2 size={14}/></button>
       </div>)}</div>
     </div>
     {[[T.confetti,'confetti'],[T.labels,'showLabels'],[T.mystery,'mystery']].map(([label,key])=>
      <label className="bit-ws-toggle" key={key}><span>{label}</span><input type="checkbox" disabled={busy} checked={Boolean(value[key])}
       onChange={e=>change(w=>({...w,[key]:e.target.checked}))}/></label>)}
    </div>}
    {error&&<p className="bit-ws-error" role="alert">{error}</p>}
   </aside>
   <div className="bit-preview bit-wheel-zone bit-ws-stage">
    <div className="bit-ws-stage-top"><span>● LIVE WHEEL</span><small>{active} {T.active}</small></div>
    <div className="bit-ws-wheel-housing">
     <div className="bit-pointer" aria-hidden="true">▼</div>
     <div className={'bit-wheel bit-ws-disc'+(busy?' is-spinning':'')} ref={wheelRef} data-testid="animated-lucky-wheel" style={{background:gradient}}>
      {value.showLabels!==false&&shownSegments.length<=36&&shownSegments.map(r=><span key={r.id} className="bit-ws-label"
       style={{transform:'translate(-50%,-50%) rotate('+r.center+'deg) translateY(calc(-1 * var(--ws-radius))) rotate(-'+r.center+'deg)'}}>{value.mystery?'?':r.label}</span>)}
      <button type="button" disabled={busy||active<2} className="bit-ws-hub" aria-label={vi?'Quay bằng nút trung tâm':'Spin from center'} onClick={spin}><Sparkles size={27}/></button>
     </div>
     {burst>0&&<div key={burst} className="bit-wheel-fireworks" aria-hidden="true">{Array.from({length:28},(_,i)=>
      <span key={i} style={{'--spark-angle':i*360/28+'deg','--spark-distance':140+i%5*23+'px',
       '--spark-delay':i%6*30+'ms','--spark-color':palette[i%palette.length]}}/>)}</div>}
    </div>
    <div className="bit-ws-spin-actions">{busy?<button className="bit-ws-spin" type="button" onClick={stop}><Target size={22}/>{T.stop}</button>:
     <button className="bit-ws-spin" type="button" onClick={spin} disabled={active<2}><Sparkles size={22}/>{T.spin}</button>}
     <button className="bit-ws-reset" type="button" title={T.reset} aria-label={T.reset} disabled={busy||rows.every(r=>r.enabled)}
      onClick={()=>{setRows(rs=>rs.map(r=>({...r,enabled:true})));setSelected(null);setFrozenSegments(null);}}><RotateCcw size={18}/></button></div>
    {busy?<p role="status" className="bit-ws-spinning">{T.spinning}</p>:selected?
     <div className="bit-winner bit-ws-winner" aria-live="polite"><Trophy size={20}/><small>{T.winner}</small><strong>{selected.label}</strong>
      {mode==='elimination'&&<em>{T.removed}</em>}</div>:
     <p className="bit-ws-hint">{active<2?T.wrong:T.tip}</p>}
    <div className="bit-ws-stage-bottom"><span>{T.modes[modes.indexOf(mode)]}</span><span>{seconds}s · {rows.length} {T.items.toLowerCase()}</span></div>
   </div>
  </div><p className="bit-ws-footer">{T.notes}</p>
 </section>}
 </>;
}
