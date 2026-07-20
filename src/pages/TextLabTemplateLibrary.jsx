import React, { useEffect, useMemo, useRef, useState } from 'react';
import { TEXTLAB_TEMPLATES, buildInteractiveHtml, downloadHtml, sampleFor } from '../utils/textlabInteractive.js';
import '../styles/textlab-template-interactive.css';

const CATEGORIES = ['Tất cả','Kiểm tra','Từ vựng','Câu & đoạn','Đọc hiểu','Nói & viết','Trò chơi'];
const categoryOf = t => {
  if(['quiz','truefalse'].includes(t.kind)) return 'Kiểm tra';
  if(['pairs','memory','scramble','wordsearch','hangman','bingo','cards'].includes(t.kind)) return 'Từ vựng';
  if(['sort','order','sentence','cloze'].includes(t.kind)) return 'Câu & đoạn';
  if(['open'].includes(t.kind)) return 'Nói & viết';
  if(['wheel','boxes'].includes(t.kind)) return 'Trò chơi';
  return 'Đọc hiểu';
};

export default function TextLabTemplateLibrary(){
  const [selectedId,setSelectedId]=useState(TEXTLAB_TEMPLATES[2].id);
  const selected=TEXTLAB_TEMPLATES.find(t=>t.id===selectedId)||TEXTLAB_TEMPLATES[0];
  const [content,setContent]=useState(()=>sampleFor(selected.kind));
  const [query,setQuery]=useState('');
  const [category,setCategory]=useState('Tất cả');
  const [tab,setTab]=useState('content');
  const [key,setKey]=useState(0);
  const iframeRef=useRef(null);
  useEffect(()=>{setContent(sampleFor(selected.kind));setTab('content');setKey(k=>k+1)},[selectedId]);
  const html=useMemo(()=>buildInteractiveHtml(selected,content),[selected,content,key]);
  const visible=TEXTLAB_TEMPLATES.filter(t=>(category==='Tất cả'||categoryOf(t)===category)&&`${t.title} ${t.titleVi}`.toLowerCase().includes(query.toLowerCase()));
  const openWindow=()=>{const w=window.open('','_blank','noopener,noreferrer');if(w){w.document.open();w.document.write(html);w.document.close()}};
  const fullscreen=()=>iframeRef.current?.requestFullscreen?.();
  const copy=async value=>{try{await navigator.clipboard.writeText(value)}catch{const ta=document.createElement('textarea');ta.value=value;document.body.appendChild(ta);ta.select();document.execCommand('copy');ta.remove()}};
  return <div className="tlx-page">
    <header className="tlx-hero"><div><small>BRIAN TEXTLAB · NO AI</small><h1>Interactive HTML Studio</h1><p>Chọn mẫu, nhập nội dung và chơi trực tiếp. HTML tải về chạy hoàn toàn ngoại tuyến.</p></div><div className="tlx-badge">36 hoạt động</div></header>
    <section className="tlx-layout">
      <aside className="tlx-library"><div className="tlx-library-head"><h2>36 template</h2><input placeholder="Tìm template…" value={query} onChange={e=>setQuery(e.target.value)}/><div className="tlx-filters">{CATEGORIES.map(c=><button key={c} className={category===c?'active':''} onClick={()=>setCategory(c)}>{c}</button>)}</div></div><div className="tlx-grid">{visible.map(t=><button key={t.id} className={`tlx-card ${t.id===selected.id?'selected':''}`} onClick={()=>setSelectedId(t.id)}><span>{String(t.index).padStart(2,'0')}</span><div><small>{categoryOf(t)}</small><b>{t.title}</b><em>{t.titleVi}</em></div><strong>→</strong></button>)}</div></aside>
      <main className="tlx-editor"><section className="tlx-info"><div><small>{categoryOf(selected)}</small><h2>{selected.title}</h2><p>{selected.titleVi} · Định dạng: <code>{selected.format}</code></p></div><span>Hoạt động #{selected.index}</span></section>
        <section className="tlx-input"><nav><button className={tab==='content'?'active':''} onClick={()=>setTab('content')}>Nội dung của bạn</button><button className={tab==='blank'?'active':''} onClick={()=>setTab('blank')}>Mẫu trống</button><button className={tab==='sample'?'active':''} onClick={()=>setTab('sample')}>Ví dụ hoàn chỉnh</button><button className={tab==='guide'?'active':''} onClick={()=>setTab('guide')}>Cách nhập</button></nav>
          {tab==='guide'?<div className="tlx-guide"><h3>Cách nhập</h3><p>Mỗi dòng là một mục. Dùng dấu <b>|</b> để ngăn cách các phần theo cấu trúc:</p><pre>{selected.format}</pre><p>Preview cập nhật khi nội dung thay đổi hoặc khi bấm <b>Chạy lại</b>.</p></div>:<textarea value={tab==='blank'?`TITLE: Tên hoạt động\n\n${selected.format}`:tab==='sample'?sampleFor(selected.kind):content} readOnly={tab!=='content'} onChange={e=>setContent(e.target.value)}/>}<div className="tlx-input-actions"><button onClick={()=>copy(tab==='blank'?`TITLE: Tên hoạt động\n\n${selected.format}`:tab==='sample'?sampleFor(selected.kind):content)}>Sao chép</button>{tab==='content'&&<button className="primary" onClick={()=>setKey(k=>k+1)}>Tạo hoạt động</button>}</div></section>
        <section className="tlx-preview"><header><div><small>LIVE PREVIEW</small><h2>Hoạt động tương tác trực tiếp</h2></div><div><button onClick={()=>setKey(k=>k+1)}>↻ Chạy lại</button><button onClick={openWindow}>↗ Mở riêng</button><button onClick={fullscreen}>⛶ Toàn màn hình</button><button className="download" onClick={()=>downloadHtml(`${selected.id}.html`,html)}>↓ Tải HTML</button></div></header><iframe key={key} ref={iframeRef} title="TextLab interactive preview" sandbox="allow-scripts allow-forms allow-modals allow-popups allow-downloads" srcDoc={html}/></section>
      </main>
    </section>
  </div>;
}
