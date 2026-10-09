import React, { lazy, Suspense, useEffect, useRef, useState } from 'react';
const SpeakScaleStudio = lazy(() => import('../features/assessmentStudio/SpeakScaleStudio.jsx'));
const DiagnosticScan = lazy(() => import('../features/assessmentStudio/DiagnosticScan.jsx'));
const ExitTicket = lazy(() => import('../features/assessmentStudio/ExitTicket.jsx'));
const TwoTierStudio = lazy(() => import('../features/assessmentStudio/TwoTierStudio.jsx'));

/**
 * Preview-only experience, hosted inside the existing Brian app shell.
 * Real scores are never loaded here; the standalone HTML uses fixed demo data.
 */
export default function AssessmentPreview() {
  const [activeTool,setActiveTool]=useState(()=>typeof window!=='undefined' && window.location.hash.includes('tool=speaking')?'speaking':typeof window!=='undefined'&&window.location.hash.includes('tool=diagnostic')?'diagnostic':typeof window!=='undefined'&&window.location.hash.includes('tool=exit')?'exit':window.location.hash.includes('tool=two-tier')?'two-tier':'catalog');
  const [speakingVisited,setSpeakingVisited]=useState(()=>typeof window!=='undefined' && window.location.hash.includes('tool=speaking'));
  const [diagnosticVisited,setDiagnosticVisited]=useState(()=>typeof window!=='undefined'&&window.location.hash.includes('tool=diagnostic'));
  const [exitVisited,setExitVisited]=useState(()=>typeof window!=='undefined'&&window.location.hash.includes('tool=exit'));
  const [twoTierVisited,setTwoTierVisited]=useState(()=>typeof window!=='undefined'&&window.location.hash.includes('tool=two-tier'));
  const frameRef=useRef(null);
  const openSpeaking=()=>{setSpeakingVisited(true);setActiveTool('speaking');};
  const openDiagnostic=()=>{setDiagnosticVisited(true);setActiveTool('diagnostic');};
  const openExit=()=>{setExitVisited(true);setActiveTool('exit');};
  const openTwoTier=()=>{setTwoTierVisited(true);setActiveTool('two-tier');};
  useEffect(()=>{
    const onMessage=(event)=>{
      if(event.source!==frameRef.current?.contentWindow)return;
      if(event.data?.type==='BRIAN_OPEN_SPEAKSCALE')openSpeaking();
      if(event.data?.type==='BRIAN_OPEN_DIAGNOSTIC')openDiagnostic();
      if(event.data?.type==='BRIAN_OPEN_EXIT')openExit();
      if(event.data?.type==='BRIAN_OPEN_TWO_TIER')openTwoTier();
    };
    window.addEventListener('message',onMessage);
    return ()=>window.removeEventListener('message',onMessage);
  },[]);
  return (
    <section
      aria-label="BRIAN Assessment Studio — Bản xem thử"
      style={{maxWidth:1600,margin:'0 auto',padding:'14px clamp(12px,2.5vw,36px) 24px',width:'100%'}}
    >
      <div style={{display:'flex',gap:12,alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',marginBottom:12}}>
        <div>
          <div style={{fontSize:12,fontWeight:800,letterSpacing:'0.1em',color:'#3965A8'}}>BRIAN · KIỂM TRA, ĐÁNH GIÁ</div>
          <h1 style={{fontSize:'clamp(21px,2vw,30px)',color:'var(--text-primary,#17375B)',margin:'3px 0 0',lineHeight:1.3}}>
            Assessment Studio <span style={{fontSize:13,fontWeight:650,color:'#526D8A'}}>· {activeTool==='speaking'?'SpeakScale v1.0':activeTool==='diagnostic'?'DiagnosticScan v1.0':activeTool==='exit'?'ExitTicket v1.0':activeTool==='two-tier'?'Two-Tier v1.0':'Danh mục 12 công cụ'} · Không AI</span>
          </h1>
        </div>
        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
          {activeTool!=='catalog' ? <button type="button" onClick={()=>setActiveTool('catalog')} style={{padding:'9px 14px',borderRadius:12,border:'1px solid #aac5ed',color:'#2654a6',background:'#eef5ff',fontSize:14,fontWeight:800,cursor:'pointer'}}>← 12 công cụ</button> : <><button type="button" onClick={openSpeaking} style={{padding:'9px 14px',borderRadius:12,border:'1px solid #aac5ed',color:'#2654a6',background:'#eef5ff',fontSize:14,fontWeight:800,cursor:'pointer'}}>🎙️ SpeakScale</button><button type="button" onClick={openDiagnostic} style={{padding:'9px 14px',borderRadius:12,border:'1px solid #aac5ed',color:'#2654a6',background:'#eef5ff',fontSize:14,fontWeight:800,cursor:'pointer'}}>📋 DiagnosticScan</button><button type="button" onClick={openExit} style={{padding:'9px 14px',borderRadius:12,border:'1px solid #aac5ed',color:'#2654a6',background:'#eef5ff',fontSize:14,fontWeight:800,cursor:'pointer'}}>🎟️ ExitTicket</button><button type="button" onClick={openTwoTier} style={{padding:'9px 14px',borderRadius:12,border:'1px solid #aac5ed',color:'#2654a6',background:'#eef5ff',fontSize:14,fontWeight:800,cursor:'pointer'}}>🧩 Two-Tier</button></>}
          <a href="#/apps" style={{padding:'9px 14px',textDecoration:'none',borderRadius:12,color:'#285287',background:'#EAF2FC',fontSize:14,fontWeight:750}}>← Kho ứng dụng</a>
          <a href="/assessment-studio-preview.html" target="_blank" rel="noopener noreferrer" style={{padding:'9px 14px',textDecoration:'none',borderRadius:12,color:'#FFF',border:'1px solid #BCD1EA',fontSize:14,fontWeight:700}}>
            Mở toàn màn hình ↗
          </a>
        </div>
      </div>
      <div style={{display:activeTool==='catalog'?'block':'none'}}><iframe
        ref={frameRef}
        title="BRIAN Assessment Studio — Thử 12 công cụ đánh giá"
        src="/assessment-studio-preview.html"
        sandbox="allow-scripts allow-modals"
        loading="eager"
        referrerPolicy="same-origin"
        style={{width:'100%',height:'min(1240px,calc(100vh - 175px))',minHeight:530,border:'1px solid #D8E3F2',borderRadius:19,background:'#F8FAFF',display:'block'}}
      /></div>
      {speakingVisited&&<div style={{display:activeTool==='speaking'?'block':'none'}}><Suspense fallback={<div style={{padding:45,color:'#365e95'}}>Đang mở SpeakScale…</div>}><SpeakScaleStudio onBack={()=>setActiveTool('catalog')}/></Suspense></div>}
      {diagnosticVisited&&<div style={{display:activeTool==='diagnostic'?'block':'none'}}><Suspense fallback={<div style={{padding:45,color:'#365e95'}}>Đang mở DiagnosticScan…</div>}><DiagnosticScan onBack={()=>setActiveTool('catalog')}/></Suspense></div>}
      {exitVisited&&<div style={{display:activeTool==='exit'?'block':'none'}}><Suspense fallback={<div style={{padding:45,color:'#365e95'}}>Đang mở ExitTicket…</div>}><ExitTicket onBack={()=>setActiveTool('catalog')}/></Suspense></div>}
      {twoTierVisited&&<div style={{display:activeTool==='two-tier'?'block':'none'}}><Suspense fallback={<div style={{padding:45,color:'#365e95'}}>Đang mở Two-Tier…</div>}><TwoTierStudio onBack={()=>setActiveTool('catalog')}/></Suspense></div>}
      <p style={{margin:'11px 0 0',color:'var(--text-muted,#64748B)',fontSize:12,lineHeight:1.55}}>
        {activeTool==='catalog' ? 'Các công cụ còn lại trong danh mục là bản minh họa. SpeakScale, DiagnosticScan, ExitTicket và Two-Tier có phiên bản giáo viên sử dụng trong bộ nhớ phiên trình duyệt.' : 'Công cụ đang mở xử lý dữ liệu ngay trong phiên trình duyệt, không tự lưu lên máy chủ. Hãy xuất JSON trước khi tải lại hoặc thoát trang.'}
      </p>
    </section>
  );
}
