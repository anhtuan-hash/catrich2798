import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ImagePlus, WandSparkles, Trash2, RefreshCcw, Image as ImageIcon, UploadCloud } from 'lucide-react';
import { POSTER_GROUPS, BUILTIN_POSTER_TEMPLATES, choosePosterTemplate } from '../utils/posterTemplateRules.mjs';
import {
  listPosterTemplates, uploadPosterTemplate, removePosterTemplate,
  createEventPosterFile, templateSignedUrl,
} from '../services/eventPosterTemplates.js';
import './EventPosterTemplatePanel.css';

/** Uploadable reusable ARTWORK + no-AI PNG compositor. Admin-only parent renders this panel. */
export default function EventPosterTemplatePanel({eventData,onGenerated,disabled=false}) {
  const [templates,setTemplates]=useState(BUILTIN_POSTER_TEMPLATES);
  const [urls,setUrls]=useState({});
  const [manualId,setManualId]=useState('');
  const [newGroup,setNewGroup]=useState('seminar');
  const [newTone,setNewTone]=useState('dark');
  const [newSide,setNewSide]=useState('left');
  const [newName,setNewName]=useState('');
  const [newFile,setNewFile]=useState(null);
  const [working,setWorking]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [libraryOpen,setLibraryOpen]=useState(false);

  const refresh=useCallback(async()=>{
    const all=await listPosterTemplates(true);
    setTemplates(all);
    return all;
  },[]);
  useEffect(()=>{
    let alive=true;
    listPosterTemplates().then(t=>{if(alive)setTemplates(t)})
      .catch(e=>{if(alive)setError('Không thể tải mẫu tùy chỉnh: '+e.message)});
    return ()=>{alive=false};
  },[]);
  const chosen=useMemo(()=>choosePosterTemplate(eventData,templates,manualId),[eventData,templates,manualId]);
  useEffect(()=>{
    if(!libraryOpen)return;
    let alive=true;
    const uploaded=templates.filter(t=>t.source==='uploaded'&&!urls[t.id]);
    Promise.all(uploaded.map(async (t)=>{
      try{return [t.id,await templateSignedUrl(t)]}catch{return [t.id,'']}
    })).then(entries=>{if(alive&&entries.length)setUrls(old=>({...old,...Object.fromEntries(entries)}))});
    return ()=>{alive=false};
  },[templates,libraryOpen]);
  async function runGeneration(){
    if(working||disabled)return;
    setWorking(true);setError('');setNotice('');
    try{
      const result=await createEventPosterFile(eventData,manualId);
      onGenerated(result.file,result.template);
      setNotice('Poster đã được dựng. Nhấn Lưu sự kiện & poster để lưu vào hệ thống.');
    }catch(e){setError('Không tạo được poster: '+e.message)}
    finally{setWorking(false)}
  }
  async function addTemplate(){
    if(!newFile||working||disabled)return;
    setWorking(true);setError('');setNotice('');
    try{
      const item=await uploadPosterTemplate(newFile,{
        name:newName||newFile.name,group:newGroup,tone:newTone,side:newSide,
      });
      await refresh();
      setLibraryOpen(true);
      setManualId(item.id);
      setNewFile(null);
      setNewName('');
      setNotice('Đã lưu ảnh nền vào thư viện và chọn mẫu mới. Nhấn Tạo poster để thử.');
    }catch(e){setError('Lỗi lưu mẫu: '+e.message)}
    finally{setWorking(false)}
  }
  async function removeTemplate(t){
    if(!window.confirm('Xóa mẫu nền "'+t.name+'"? Poster sự kiện đã tạo sẽ được giữ nguyên.'))return;
    setWorking(true);setError('');
    try{
      await removePosterTemplate(t);await refresh();
      if(manualId===t.id)setManualId('');
      setNotice('Đã xóa mẫu nền. Poster sự kiện hiện có không bị ảnh hưởng.');
    }catch(e){setError(e.message)}finally{setWorking(false)}
  }
  return <section className="bea-template-panel" aria-label="Thư viện mẫu poster sự kiện">
    <div className="bea-template-panel-head">
      <div><span className="bea-template-eyebrow">BRIAN POSTER STUDIO · NO AI</span>
        <strong>Poster tự động từ mẫu</strong>
        <small>Hệ thống tự chọn theo loại sự kiện và tiêu đề, không sử dụng AI.</small>
      </div>
      <button type="button" className="bea-template-toggle" onClick={()=>setLibraryOpen(v=>!v)}>
        <ImageIcon size={15}/>{libraryOpen?'Thu gọn thư viện':'Thư viện mẫu ('+templates.length+')'}
      </button>
    </div>
    <div className="bea-template-current">
      <div className={'bea-template-cover is-'+(chosen?.group||'general')}>
        {chosen?.source==='uploaded'&&urls[chosen.id]?<img src={urls[chosen.id]} alt="" loading="lazy"/>:<span aria-hidden="true">{({halloween:'☾',meeting:'◉',teaching:'✎',seminar:'✦',training:'◈',extracurricular:'★',general:'▧'})[chosen?.group]||'✦'}</span>}
      </div>
      <div className="bea-template-current-info">
        <strong>{chosen?.name||'Chưa có mẫu'}</strong>
        <small>{chosen?.source==='uploaded'?'Mẫu admin đã tải lên':'Mẫu dựng sẵn'} · {POSTER_GROUPS.find(g=>g.id===chosen?.group)?.label||'Chung'}</small>
        <button type="button" disabled={working||disabled||!eventData?.title?.trim()} onClick={runGeneration}>
          <WandSparkles size={15}/>{working?'Đang tạo poster…':'Tự chọn & tạo poster'}
        </button>
      </div>
    </div>
    {error?<p className="bea-template-alert is-error" role="alert">{error}</p>:null}
    {notice?<p className="bea-template-alert is-ok" role="status">{notice}</p>:null}
    {libraryOpen?<div className="bea-template-library">
      <p><b>Chọn một mẫu cụ thể</b> hoặc để Brian tự nhận diện khi tạo sự kiện.</p>
      <div className="bea-template-grid">
        <button type="button" aria-pressed={!manualId} className={'bea-template-tile is-auto'+(!manualId?' is-selected':'')} onClick={()=>setManualId('')}>
          <span className="bea-template-tile-icon"><WandSparkles size={24}/></span>
          <strong>Tự chọn</strong><small>Theo chủ đề sự kiện</small>
        </button>
        {templates.map(t=><article key={t.id} className={'bea-template-tile'+(manualId===t.id?' is-selected':'')}>
          <button type="button" className="bea-template-tile-pick" onClick={()=>setManualId(t.id)} aria-pressed={manualId===t.id}>
            <span className={'bea-template-tile-icon is-'+t.group}>
              {t.source==='uploaded'&&urls[t.id]?<img src={urls[t.id]} alt={'Nền '+t.name} loading="lazy"/>:<ImageIcon size={22}/>}
            </span><strong>{t.name}</strong><small>{POSTER_GROUPS.find(g=>g.id===t.group)?.label}</small>
          </button>
          {t.source==='uploaded'?<button type="button" disabled={working} className="bea-template-remove" onClick={()=>removeTemplate(t)} aria-label={'Xóa mẫu '+t.name}><Trash2 size={14}/></button>:null}
        </article>)}
      </div>
      <div className="bea-template-add">
        <div><UploadCloud size={19}/><strong>Thêm ảnh nền do bạn thiết kế</strong></div>
        <p>Khuyến nghị 1600×900 (16:9), chừa khoảng 55% vùng trống để hệ thống đặt chữ. PNG/JPG/WebP, tối đa 8MB.</p>
        <label className="bea-template-file">Chọn file ảnh nền<input type="file" accept="image/png,image/jpeg,image/webp" onChange={e=>setNewFile(e.target.files?.[0]||null)}/></label>
        <div className="bea-template-add-grid">
          <label>Tên mẫu<input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Ví dụ: Halloween tím huyền bí"/></label>
          <label>Loại sự kiện<select value={newGroup} onChange={e=>setNewGroup(e.target.value)}>{POSTER_GROUPS.map(g=><option key={g.id} value={g.id}>{g.label}</option>)}</select></label>
          <label>Màu chữ<select value={newTone} onChange={e=>setNewTone(e.target.value)}><option value="dark">Chữ sáng / nền tối</option><option value="light">Chữ tối / nền sáng</option></select></label>
          <label>Vị trí chữ<select value={newSide} onChange={e=>setNewSide(e.target.value)}><option value="left">Bên trái</option><option value="right">Bên phải</option><option value="center">Ở giữa</option></select></label>
        </div>
        <button className="bea-template-upload" type="button" disabled={!newFile||working||disabled} onClick={addTemplate}><ImagePlus size={16}/>{working?'Đang lưu…':'Lưu vào thư viện mẫu'}</button>
      </div>
    </div>:null}
  </section>;
}
