import React,{useEffect,useMemo,useState} from 'react';
import {
  StickyNote,FileText,Calculator,Link2,CheckSquare,Plus,Trash2,Pin,PinOff,
  Copy,Check,Search,ExternalLink,RotateCcw,Delete,Equal,ArrowDownAZ,
  CaseUpper,CaseLower,AlignLeft,CheckCircle2,Square,Filter,ChevronRight
} from 'lucide-react';
import {
  NOTE_COLORS,normalizeQuickUrl,textStats,transformText,calculate
} from './instantToolsWave3Core.mjs';
import './BrianInstantToolsWave3.css';
export const WAVE3_LIBRARY=[
 {id:'notes',Icon:StickyNote,vi:'Ghi chú nhanh',en:'Quick Notes',descVi:'Ghim ghi chú trên mọi trang',descEn:'Pin notes across the website'},
 {id:'textTools',Icon:FileText,vi:'Công cụ văn bản',en:'Text Tools',descVi:'Đếm từ, sửa chữ, sao chép',descEn:'Count, format and copy text'},
 {id:'calculator',Icon:Calculator,vi:'Máy tính',en:'Calculator',descVi:'Tính nhanh, phần trăm, lịch sử',descEn:'Safe math and history'},
 {id:'quickLinks',Icon:Link2,vi:'Liên kết nhanh',en:'Quick Links',descVi:'Mở trang thường dùng',descEn:'Your favourite websites'},
 {id:'checklist',Icon:CheckSquare,vi:'Danh sách việc làm',en:'Checklist',descVi:'Việc cần làm, tiến độ',descEn:'Tasks and progress'}
];
const L={
 vi:{
  new:'Tạo mới',save:'Tự động lưu trên thiết bị',delete:'Xóa',deleteConfirm:'Xóa mục này?',title:'Tiêu đề',content:'Nội dung',noteDefault:'Ghi chú mới',noteEmpty:'Chọn một ghi chú hoặc tạo ghi chú mới.',notesLimit:'Tối đa 35 ghi chú.',pin:'Ghim ra màn hình',unpin:'Bỏ ghim',notesHeader:'Sổ ghi chú nhanh',
  words:'Từ',chars:'Ký tự',nonspace:'Không khoảng trắng',sentences:'Câu',paragraphs:'Đoạn',input:'Văn bản',copy:'Sao chép',copied:'Đã sao chép',copyFail:'Trình duyệt không cho phép sao chép',upper:'CHỮ HOA',lower:'chữ thường',titleCase:'Viết Hoa Đầu Từ',clean:'Dọn khoảng trắng',clear:'Xóa nội dung',clearConfirm:'Xóa văn bản hiện tại?',
  expression:'Phép tính',result:'Kết quả',invalid:'Biểu thức không hợp lệ',division:'Không thể chia cho 0',history:'Lịch sử tính',noHistory:'Chưa có phép tính.',equal:'Tính',calculatorHint:'Chỉ hỗ trợ phép tính cơ bản: + − × ÷, ngoặc và %.',
  linkName:'Tên liên kết',linkUrl:'Đường dẫn https:// hoặc http://',open:'Mở liên kết',add:'Thêm',saveLink:'Lưu liên kết',edit:'Sửa',cancel:'Hủy',urlInvalid:'Liên kết không hợp lệ. Chỉ chấp nhận HTTP/HTTPS, không chứa tài khoản hoặc mật khẩu.',nameRequired:'Vui lòng nhập tên.',linkLimit:'Tối đa 30 liên kết.',linksEmpty:'Chưa có liên kết. Hãy thêm đường dẫn đầu tiên.',search:'Tìm liên kết...',
  task:'Việc cần làm',todoEmpty:'Chưa có việc cần làm.',taskLimit:'Tối đa 60 công việc.',all:'Tất cả',openTasks:'Chưa xong',doneTasks:'Đã xong',clearCompleted:'Xóa việc hoàn thành',clearDoneAsk:'Xóa tất cả việc đã hoàn thành?',finished:'Hoàn thành',remaining:'Còn lại',
  pinHelp:'Ghi chú được ghim sẽ hiện khi thu nhỏ Toolbox. Chỉ lưu trên trình duyệt này.',
 },
 en:{
  new:'New',save:'Saved on this device',delete:'Delete',deleteConfirm:'Delete this item?',title:'Title',content:'Content',noteDefault:'New note',noteEmpty:'Select a note or create one.',notesLimit:'Up to 35 notes.',pin:'Pin to screen',unpin:'Unpin',notesHeader:'Quick notebook',
  words:'Words',chars:'Characters',nonspace:'No spaces',sentences:'Sentences',paragraphs:'Paragraphs',input:'Text input',copy:'Copy',copied:'Copied',copyFail:'Clipboard access denied',upper:'UPPERCASE',lower:'lowercase',titleCase:'Title Case',clean:'Clean spaces',clear:'Clear',clearConfirm:'Clear all text?',
  expression:'Expression',result:'Result',invalid:'Invalid expression',division:'Cannot divide by zero',history:'History',noHistory:'No calculations yet.',equal:'Calculate',calculatorHint:'Supports basic arithmetic: + − × ÷, parentheses and %.',
  linkName:'Link name',linkUrl:'https:// or http:// address',open:'Open link',add:'Add',saveLink:'Save link',edit:'Edit',cancel:'Cancel',urlInvalid:'Invalid URL. Only HTTP/HTTPS links without embedded credentials are allowed.',nameRequired:'Enter a name.',linkLimit:'Maximum 30 links.',linksEmpty:'No links yet. Add your first favourite site.',search:'Find links...',
  task:'Task',todoEmpty:'No tasks yet.',taskLimit:'Maximum 60 tasks.',all:'All',openTasks:'Open',doneTasks:'Completed',clearCompleted:'Clear completed',clearDoneAsk:'Remove all completed tasks?',finished:'Completed',remaining:'Remaining',pinHelp:'Pinned notes remain visible when Toolbox is minimized. Stored in this browser only.'
 }
};
const uid=()=>{
 try{return globalThis.crypto?.randomUUID?.()||String(Date.now())+'-'+Math.random().toString(36).slice(2);}
 catch{return String(Date.now())+'-'+Math.random().toString(36).slice(2);}
};
function Notes({value,onChange,language,pinnedId,onPin}){
 const t=L[language]||L.vi,items=value.items;
 const [selected,setSelected]=useState(items[0]?.id||null);
 const active=items.find(x=>x.id===selected)||null;
 const update=(fn)=>onChange(v=>({...v,items:fn(v.items)}));
 const add=()=>{
  if(items.length>=35)return;
  const id=uid();
  update(list=>[{id,title:t.noteDefault,body:'',color:'sun',updatedAt:Date.now()},...list]);
  setSelected(id);
 };
 const edit=(changes)=>update(list=>list.map(x=>x.id===selected?{...x,...changes,updatedAt:Date.now()}:x));
 const remove=()=>{
  if(!active||!window.confirm(t.deleteConfirm))return;
  update(list=>list.filter(x=>x.id!==selected));
  if(pinnedId===selected)onPin(null);
  setSelected(items.find(x=>x.id!==selected)?.id||null);
 };
 return <div className="bit-w3-notes">
  <aside className="bit-w3-notes-list">
   <div className="bit-w3-head"><strong>{t.notesHeader}</strong><button className="bit-primary" type="button" disabled={items.length>=35} onClick={add}><Plus size={17}/>{t.new}</button></div>
   <div className="bit-w3-note-items">{items.map(x=><button type="button" className={'bit-w3-note-item tone-'+x.color+(selected===x.id?' selected':'')} key={x.id} onClick={()=>setSelected(x.id)}>
    <strong>{x.title||t.noteDefault}</strong><span>{x.body.slice(0,100)||'…'}</span>
    {pinnedId===x.id&&<Pin size={15}/>}
   </button>)}</div>
   <small className="bit-w3-hint">{items.length}/35 · {t.save}</small>
  </aside>
  <section className="bit-w3-note-editor">
   {active?<><div className="bit-w3-note-toolbar">
     <div className="bit-w3-colors">{NOTE_COLORS.map(color=><button type="button" className={'tone-'+color+(active.color===color?' active':'')}
       key={color} aria-label={color} aria-pressed={active.color===color} onClick={()=>edit({color})}/>)}</div>
     <button type="button" className="bit-secondary" onClick={()=>onPin(pinnedId===selected?null:selected)}>{pinnedId===selected?<PinOff size={17}/>:<Pin size={17}/>}
      {pinnedId===selected?t.unpin:t.pin}</button>
     <button type="button" className="bit-w3-danger" onClick={remove}><Trash2 size={17}/>{t.delete}</button>
    </div>
    <label htmlFor="bit-w3-note-title">{t.title}</label>
    <input id="bit-w3-note-title" maxLength={80} value={active.title} onChange={e=>edit({title:e.target.value.slice(0,80)})}/>
    <label htmlFor="bit-w3-note-body">{t.content}</label>
    <textarea id="bit-w3-note-body" rows={12} maxLength={4000} value={active.body} onChange={e=>edit({body:e.target.value.slice(0,4000)})}/>
    <small className="bit-w3-hint">{active.body.length}/4000 · {t.pinHelp}</small>
   </>:<div className="bit-w3-empty"><StickyNote size={36}/><p>{t.noteEmpty}</p><button className="bit-primary" type="button" onClick={add}><Plus size={17}/>{t.new}</button></div>}
  </section>
 </div>;
}
function TextTools({value,onChange,language}){
 const t=L[language]||L.vi;
 const stats=useMemo(()=>textStats(value.text),[value.text]);
 const [message,setMessage]=useState('');
 const update=text=>onChange(v=>({...v,text}));
 const copy=async()=>{
   try{await navigator.clipboard.writeText(value.text);setMessage(t.copied);}
   catch{setMessage(t.copyFail);}
 };
 return <div className="bit-w3-text">
  <div className="bit-w3-stats">{[
    [t.words,stats.words],[t.chars,stats.chars],[t.nonspace,stats.charsNoSpaces],[t.sentences,stats.sentences],[t.paragraphs,stats.paragraphs]
  ].map(([name,n])=><div className="bit-w3-stat" key={name}><strong>{n.toLocaleString()}</strong><span>{name}</span></div>)}</div>
  <div className="bit-w3-toolbar">{[['upper',t.upper,CaseUpper],['lower',t.lower,CaseLower],['title',t.titleCase,ArrowDownAZ],['trim',t.clean,AlignLeft]].map(([id,name,Icon])=><button key={id} className="bit-secondary" type="button"
    onClick={()=>update(transformText(value.text,id))}><Icon size={16}/>{name}</button>)}
    <button type="button" className="bit-secondary" onClick={copy}><Copy size={17}/>{t.copy}</button>
    <button type="button" className="bit-w3-danger" onClick={()=>{if(window.confirm(t.clearConfirm))update('');}}><Trash2 size={17}/>{t.clear}</button></div>
  <label htmlFor="bit-w3-textarea">{t.input}</label>
  <textarea id="bit-w3-textarea" rows={14} maxLength={20000} value={value.text} placeholder="Paste your text here…"
    onChange={e=>update(e.target.value.slice(0,20000))}/>
  <div className="bit-w3-hint">{message||t.save} · {value.text.length}/20000</div>
 </div>;
}
const KEYS=[
 ['C','(',')','⌫'],
 ['7','8','9','÷'],
 ['4','5','6','×'],
 ['1','2','3','−'],
 ['0','.','%','+'],
 ['±','=']
];
function CalculatorTool({value,onChange,language}){
 const t=L[language]||L.vi;
 const [error,setError]=useState('');
 const expr=value.expression;
 const change=e=>onChange(v=>({...v,expression:e.slice(0,120)}));
 const equal=()=>{
  try{
    const n=calculate(expr);
    const res=String(n);
    onChange(v=>({...v,expression:res,history:[{expression:expr,result:res},...v.history].slice(0,10)}));
    setError('');
  }catch(e){setError(e.message==='DIV_ZERO'?t.division:t.invalid);}
 };
 const press=k=>{
  setError('');
  if(k==='C'){change('');return;}
  if(k==='⌫'){change(expr.slice(0,-1));return;}
  if(k==='='){equal();return;}
  if(k==='±'){change(expr.startsWith('-')?expr.slice(1):'-'+(expr||'0'));return;}
  const sym=k==='×'?'*':k==='÷'?'/':k==='−'?'-':k;
  change(expr+sym);
 };
 return <div className="bit-w3-calc-layout">
  <section className="bit-w3-calculator">
    <label htmlFor="bit-w3-expression">{t.expression}</label>
    <input id="bit-w3-expression" inputMode="decimal" maxLength={120} value={expr} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();equal();}}}
     onChange={e=>change(e.target.value)} placeholder="(125 + 75) × 20%"/>
    {error&&<p role="alert" className="bit-error">{error}</p>}
    <div className="bit-w3-calc-grid">
      {KEYS.flat().map((key,i)=><button type="button" className={key==='='?'is-equal':/[+−×÷]/.test(key)?'is-operator':''} key={i}
      onClick={()=>press(key)} aria-label={key==='⌫'?'Backspace':key}>{key}</button>)}
    </div>
    <p className="bit-w3-hint">{t.calculatorHint}</p>
  </section>
  <aside className="bit-w3-calc-history">
    <div className="bit-w3-head"><strong>{t.history}</strong><button type="button" className="bit-w3-icon" aria-label={t.clear} onClick={()=>{if(window.confirm(t.clearConfirm))onChange(v=>({...v,history:[]}));}}><Trash2 size={18}/></button></div>
    {value.history.length?value.history.map((h,i)=><button type="button" className="bit-w3-history-row" key={i} onClick={()=>change(h.result)}><span>{h.expression}</span><strong>= {h.result}</strong></button>):<p className="bit-w3-hint">{t.noHistory}</p>}
  </aside>
 </div>;
}
function QuickLinks({value,onChange,language}){
 const t=L[language]||L.vi;
 const [name,setName]=useState(''),[url,setUrl]=useState(''),[editing,setEditing]=useState(null),[query,setQuery]=useState(''),[error,setError]=useState('');
 const items=value.items;
 const update=fn=>onChange(v=>({...v,items:fn(v.items)}));
 const save=()=>{
   const good=normalizeQuickUrl(url);
   if(!name.trim()){setError(t.nameRequired);return;}
   if(!good){setError(t.urlInvalid);return;}
   if(!editing&&items.length>=30){setError(t.linkLimit);return;}
   const link={id:editing||uid(),title:name.trim().slice(0,70),url:good,color:'sky'};
   update(xs=>editing?xs.map(x=>x.id===editing?{...link,color:x.color}:x):[link,...xs]);
   setName('');setUrl('');setEditing(null);setError('');
 };
 const cancel=()=>{setName('');setUrl('');setEditing(null);setError('');};
 return <div className="bit-w3-links">
  <div className="bit-w3-panel">
    <div className="bit-w3-head"><strong>{editing?t.edit:t.add}</strong><span>{items.length}/30</span></div>
    <label htmlFor="bit-w3-link-name">{t.linkName}</label>
    <input id="bit-w3-link-name" maxLength={70} value={name} onChange={e=>setName(e.target.value)}/>
    <label htmlFor="bit-w3-link-url">{t.linkUrl}</label>
    <input id="bit-w3-link-url" type="url" maxLength={500} value={url} placeholder="https://example.com" onChange={e=>setUrl(e.target.value)}/>
    {error&&<p role="alert" className="bit-error">{error}</p>}
    <div className="bit-w3-actions"><button type="button" className="bit-primary" onClick={save}><Plus size={17}/>{editing?t.saveLink:t.add}</button>
      {editing&&<button type="button" className="bit-secondary" onClick={cancel}>{t.cancel}</button>}</div>
  </div>
  <div className="bit-w3-panel">
    <div className="bit-w3-search"><Search size={19}/><input aria-label={t.search} placeholder={t.search} value={query} onChange={e=>setQuery(e.target.value)}/></div>
    {items.length===0?<p className="bit-w3-hint">{t.linksEmpty}</p>:
     <div className="bit-w3-link-list">{items.filter(x=>(x.title+' '+x.url).toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(x=><div className="bit-w3-link-row" key={x.id}>
      <Link2 size={18}/><div className="bit-w3-link-details"><strong>{x.title}</strong><small>{x.url}</small></div>
      <a aria-label={t.open+': '+x.title} href={x.url} target="_blank" rel="noopener noreferrer" className="bit-w3-icon"><ExternalLink size={19}/></a>
      <button type="button" className="bit-w3-icon" aria-label={t.edit+': '+x.title} onClick={()=>{setEditing(x.id);setName(x.title);setUrl(x.url);}}><ChevronRight size={20}/></button>
      <button type="button" className="bit-w3-icon" aria-label={t.delete+': '+x.title} onClick={()=>{if(window.confirm(t.deleteConfirm)){update(xs=>xs.filter(a=>a.id!==x.id));if(editing===x.id)cancel();}}}><Trash2 size={18}/></button>
     </div>)}</div>}
  </div>
 </div>;
}
function Checklist({value,onChange,language}){
 const t=L[language]||L.vi;
 const [draft,setDraft]=useState(''),[filter,setFilter]=useState('all');
 const items=value.items,done=items.filter(x=>x.done).length;
 const update=fn=>onChange(v=>({...v,items:fn(v.items)}));
 const add=()=>{
  if(!draft.trim()||items.length>=60)return;
  update(list=>[...list,{id:uid(),text:draft.trim().slice(0,160),done:false}]);setDraft('');
 };
 const shown=items.filter(x=>filter==='all'||(filter==='done'?x.done:!x.done));
 return <div className="bit-w3-checklist">
  <div className="bit-w3-head"><strong>{t.task}</strong><span>{done}/{items.length} {t.finished.toLocaleLowerCase()}</span></div>
  <div className="bit-w3-progress"><div style={{width:items.length?done/items.length*100+'%':'0%'}}/></div>
  <form className="bit-w3-task-add" onSubmit={e=>{e.preventDefault();add();}}>
    <input aria-label={t.task} maxLength={160} value={draft} placeholder={t.task+'…'} onChange={e=>setDraft(e.target.value)}/>
    <button type="submit" className="bit-primary" disabled={!draft.trim()||items.length>=60}><Plus size={18}/>{t.add}</button>
  </form>
  <div className="bit-w3-actions"><div className="bit-w3-filters">{[['all',t.all],['open',t.openTasks],['done',t.doneTasks]].map(([id,label])=><button type="button" key={id}
    className={filter===id?'active':''} aria-pressed={filter===id} onClick={()=>setFilter(id)}>{label}</button>)}</div>
    <button type="button" className="bit-w3-danger" disabled={!done} onClick={()=>{if(window.confirm(t.clearDoneAsk))update(xs=>xs.filter(x=>!x.done));}}><Trash2 size={17}/>{t.clearCompleted}</button>
  </div>
  <div className="bit-w3-tasks">{shown.length?shown.map(x=><div className={'bit-w3-task'+(x.done?' is-done':'')} key={x.id}>
    <button className="bit-w3-task-toggle" type="button" aria-label={(x.done?t.openTasks:t.finished)+': '+x.text} aria-pressed={x.done} onClick={()=>update(xs=>xs.map(a=>a.id===x.id?{...a,done:!a.done}:a))}>
      {x.done?<CheckCircle2 size={26}/>:<Square size={26}/>}</button>
    <input aria-label={t.task} maxLength={160} value={x.text} onChange={e=>update(xs=>xs.map(a=>a.id===x.id?{...a,text:e.target.value.slice(0,160)}:a))}/>
    <button type="button" className="bit-w3-icon" aria-label={t.delete+': '+x.text} onClick={()=>{if(window.confirm(t.deleteConfirm))update(xs=>xs.filter(a=>a.id!==x.id));}}><Trash2 size={18}/></button>
  </div>):<p className="bit-w3-hint">{t.todoEmpty}</p>}</div>
  <p className="bit-w3-hint">{items.length}/60 · {t.save}</p>
 </div>;
}
export function Wave3Tool({tool,value,onChange,language,pinnedId,onPin}){
 if(tool==='notes')return <Notes value={value} onChange={onChange} language={language} pinnedId={pinnedId} onPin={onPin}/>;
 if(tool==='textTools')return <TextTools value={value} onChange={onChange} language={language}/>;
 if(tool==='calculator')return <CalculatorTool value={value} onChange={onChange} language={language}/>;
 if(tool==='quickLinks')return <QuickLinks value={value} onChange={onChange} language={language}/>;
 if(tool==='checklist')return <Checklist value={value} onChange={onChange} language={language}/>;
 return null;
}
