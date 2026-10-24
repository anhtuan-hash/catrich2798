import React, { useEffect, useState } from 'react';
import { CheckCircle2, ListTodo, Plus, Trash2 } from 'lucide-react';
const store=userId=>'bfc-tasks-v6:'+String(userId||'guest');
const read=userId=>{try{const obj=JSON.parse(localStorage.getItem(store(userId))||'[]');
  return Array.isArray(obj)?obj.filter(x=>typeof x.text==='string').slice(0,20):[];}catch{return[];}};
export default function Focus6Tasks({userId,language='vi'}) {
  const vi=language!=='en';
  const [tasks,setTasks]=useState(()=>read(userId));
  const [draft,setDraft]=useState('');
  useEffect(()=>setTasks(read(userId)),[userId]);
  useEffect(()=>{try{localStorage.setItem(store(userId),JSON.stringify(tasks));}catch{}},[tasks,userId]);
  const add=()=>{const title=draft.trim().slice(0,120);if(!title||tasks.length>=20)return;
    setTasks(prev=>[...prev,{id:String(Date.now())+'-'+Math.random().toString(16).slice(2),text:title,done:false}]);setDraft('');};
  return <section className="bfc6-tasks">
    <h4><ListTodo size={17}/>{vi?'Việc cần làm trong phiên':'Focus session tasks'}</h4>
    <form onSubmit={event=>{event.preventDefault();add();}}>
      <input type="text" maxLength={120} value={draft} onChange={e=>setDraft(e.target.value)}
        placeholder={vi?'Một nhiệm vụ cần hoàn thành…':'One task to finish…'}
        aria-label={vi?'Nội dung nhiệm vụ':'Task title'}/>
      <button type="submit" disabled={!draft.trim()||tasks.length>=20}><Plus size={16}/>{vi?'Thêm':'Add'}</button>
    </form>
    <ul>{tasks.map(t=><li key={t.id}>
      <label><input type="checkbox" checked={t.done} onChange={e=>setTasks(prev=>prev.map(x=>x.id===t.id?{...x,done:e.target.checked}:x))}/>
        <span className={t.done?'is-done':''}>{t.text}</span></label>
      <button type="button" onClick={()=>setTasks(prev=>prev.filter(x=>x.id!==t.id))}
        aria-label={vi?'Xóa nhiệm vụ':'Delete task'}><Trash2 size={15}/></button>
    </li>)}</ul>
    {tasks.length>0&&<p><CheckCircle2 size={14}/> {tasks.filter(t=>t.done).length}/{tasks.length} {vi?'đã hoàn thành':'completed'}</p>}
    <small>{vi?'Danh sách việc lưu riêng trên trình duyệt; ghi chú dài giữ trong mục Ghi chú riêng tư.':'Tasks are local to this browser; long private notes remain in Notes.'}</small>
  </section>;
}
