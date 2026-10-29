import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Award, CheckCircle2, ChevronLeft, ChevronRight, Expand, Save, ShieldCheck } from 'lucide-react';
import { photoJudgingRequest } from './PhotoJudgingAdmin.jsx';
import { weightedTotal, isComplete } from '../utils/judgingMath.js';
import './PhotoJudging.css';

export default function PhotoJudgingPage({token}) {
  const [data,setData]=useState(null),[drafts,setDrafts]=useState({});
  const [position,setPosition]=useState(0),[busy,setBusy]=useState(false);
  const [error,setError]=useState(''),[message,setMessage]=useState('');
  const [saved,setSaved]=useState({});
  const imageRef=useRef(null);
  const load=useCallback(async()=>{
    const result=await photoJudgingRequest({action:'judge:load',token});
    setData(result);
    const next={};
    for(const s of result.scores)next[s.slide_id]={criteria:s.criteria,comment:s.comment};
    setDrafts(next);
    setSaved(Object.fromEntries(result.scores.map(s=>[s.slide_id,true])));
    const first=result.slides.findIndex(s=>!result.scores.some(v=>v.slide_id===s.id));
    setPosition(first>=0?first:0);
  },[token]);
  useEffect(()=>{load().catch(e=>setError(e.message));},[load]);
  const current=data?.slides?.[position];
  const rubric=data?.rubric||[];
  const draft=drafts[current?.id]||{criteria:{},comment:''};
  const complete=rubric.length>0&&rubric.every(r=>typeof draft.criteria?.[r.id]==='number');
  const scoredCount=data?.slides?.filter(s=>saved[s.id]).length||0;
  const total=useMemo(()=>complete?weightedTotal(draft.criteria,rubric):null,[complete,draft.criteria,rubric]);
  const readonly=!!(data?.submitted || data?.status!=='open');
  const edit=(field,value)=>{
    if(!current||readonly)return;
    setSaved(prev=>({...prev,[current.id]:false}));
    setMessage('');
    setDrafts(prev=>({...prev,[current.id]:{criteria:field==='comment'?{...(prev[current.id]?.criteria||{})}:{...(prev[current.id]?.criteria||{}),[field]:value},comment:field==='comment'?value:(prev[current.id]?.comment||'')}}));
  };
  async function saveCurrent() {
    if(!current||!complete||readonly)return false;
    setBusy(true);setError('');
    try{
      await photoJudgingRequest({action:'judge:save',token,slideId:current.id,criteria:draft.criteria,comment:draft.comment});
      setSaved(prev=>({...prev,[current.id]:true}));
      setMessage('Điểm đã lưu thành công.');
      return true;
    }catch(e){setError(e.message);return false;}finally{setBusy(false);}
  }
  useEffect(()=>{
    if(!data||!current||!complete||readonly||saved[current.id]||busy)return;
    const timer=setTimeout(()=>{void saveCurrent();},1100);
    return()=>clearTimeout(timer);
  },[current?.id,JSON.stringify(draft),complete,readonly,saved[current?.id]]);
  async function navigate(to){
    if(busy||to<0||to>=data.slides.length)return;
    if(!readonly&&!saved[current.id]&&complete){const ok=await saveCurrent();if(!ok)return;}
    if(!readonly&&!saved[current.id]&&!complete&&Object.keys(draft.criteria||{}).length) {
      if(!window.confirm('Tác phẩm này chưa chấm đủ tiêu chí và sẽ không được lưu. Tiếp tục?'))return;
    }
    setPosition(to);setError('');setMessage('');
  }
  async function submit(){
    if(!data||readonly||busy)return;
    if(scoredCount!==data.slides.length){setError('Cần chấm và lưu đủ '+data.slides.length+' tác phẩm.');return;}
    if(!window.confirm('Nộp phiếu chấm cuối cùng? Sau khi nộp, bạn sẽ không thể sửa điểm.'))return;
    setBusy(true);setError('');
    try {
      await photoJudgingRequest({action:'judge:submit',token});
      setData(v=>({...v,submitted:true}));
      setMessage('Đã nộp phiếu chấm thành công.');
    }catch(e){setError(e.message);}finally{setBusy(false);}
  }
  return <div className="bj-guest">
    <header className="bj-guest-header"><div className="bj-guest-mark"><Award size={25}/></div><div><strong>BRIAN <em>JUDGING STUDIO</em></strong><small>THE SCHOOL ARTWORK COMPETITION</small></div></header>
    {!data?<div className="bj-guest-loading">{error?<div className="bj-error" role="alert">{error}</div>:'Đang xác thực liên kết giám khảo…'}</div>:
      <main className="bj-guest-main">
        <div className="bj-guest-title"><span className="bj-kicker">PRIVATE JUDGING · NO LOGIN REQUIRED</span><h1>{data.title}</h1><p>Giám khảo: <strong>{data.fullName}</strong></p></div>
        {data.submitted&&<div className="bj-success"><CheckCircle2 size={19}/> Phiếu chấm của bạn đã được nộp và khóa. Xin cảm ơn!</div>}
        {data.status==='draft'&&<div className="bj-error">Phiên chấm chưa mở. Vui lòng truy cập lại sau khi Admin cho phép.</div>}
        {data.status==='closed'&&!data.submitted&&<div className="bj-error">Phiên chấm đã kết thúc.</div>}
        {error&&<div className="bj-error" role="alert">{error}</div>}
        {message&&<div className="bj-success" role="status">{message}</div>}
        <div className="bj-guest-progress"><span>Tiến độ: {scoredCount}/{data.slides.length} tác phẩm đã lưu</span><div><i style={{width:(100*scoredCount/Math.max(1,data.slides.length))+'%'}}/></div></div>
        {current&&<div className="bj-guest-grid">
          <section className="bj-artwork"><div className="bj-artwork-top"><strong>TÁC PHẨM {String(position+1).padStart(2,'0')} / {data.slides.length}</strong><button onClick={()=>imageRef.current?.requestFullscreen?.().catch(()=>{})}><Expand size={17}/> Phóng to</button></div>
            <div ref={imageRef} className="bj-artwork-frame"><img src={current.imageUrl} alt={'Tác phẩm dự thi số '+(position+1)}/></div>
            <div className="bj-artwork-nav"><button disabled={busy||position===0} onClick={()=>navigate(position-1)}><ChevronLeft size={18}/> Trước</button><span>Không hiển thị tên lớp và nhóm</span><button disabled={busy||position===data.slides.length-1} onClick={()=>navigate(position+1)}>Tiếp <ChevronRight size={18}/></button></div>
            <div className="bj-thumbs">{data.slides.map((s,i)=><button key={s.id} disabled={busy} className={position===i?'active':''} onClick={()=>navigate(i)} title={'Tác phẩm '+(i+1)}>{i+1}{saved[s.id]&&<CheckCircle2 size={10}/>}</button>)}</div>
          </section>
          <section className="bj-score-form"><span className="bj-kicker">RUBRIC · INDEPENDENT EVALUATION</span><h2>Phiếu chấm điểm</h2><p>Mỗi tiêu chí từ 0 đến 10, bước 0,5. Điểm quy đổi tự động theo trọng số.</p>
            {rubric.map(r=><label className="bj-criterion" key={r.id}><span>{r.label} <small>{r.weight}%</small></span><select disabled={readonly||busy} value={draft.criteria?.[r.id]??''} onChange={e=>edit(r.id,Number(e.target.value))}><option value="" disabled>Chọn điểm</option>{Array.from({length:21},(_,i)=><option value={i/2} key={i}>{(i/2).toFixed(1)} / 10</option>)}</select></label>)}
            <label className="bj-note">Nhận xét (không bắt buộc)<textarea disabled={readonly||busy} maxLength={800} value={draft.comment||''} onChange={e=>edit('comment',e.target.value)} placeholder="Ghi chú đánh giá tác phẩm…"/></label>
            <div className="bj-total"><span>TỔNG ĐIỂM</span><strong>{total===null?'—':total.toFixed(2)} <small>/ 100</small></strong></div>
            <button className="bj-primary" disabled={readonly||busy||!complete} onClick={()=>saveCurrent()}><Save size={17}/>{busy?'Đang lưu…':saved[current.id]?'Đã lưu · Lưu lại':'Lưu điểm tác phẩm'}</button>
            <p className="bj-autosave"><ShieldCheck size={15}/> Điểm chỉ được xác nhận khi máy chủ báo lưu thành công.</p>
          </section>
        </div>}
        {data.slides.length>0&&<div className="bj-submit"><div><h3>Hoàn thành phiếu chấm</h3><p>Cần lưu đủ {data.slides.length} tác phẩm trước khi nộp. Điểm đã nộp không thể chỉnh sửa.</p></div><button disabled={readonly||busy||scoredCount!==data.slides.length} onClick={submit}><CheckCircle2 size={18}/> Nộp phiếu chấm</button></div>}
        {data.slides.length===0&&<p className="bj-muted">Chưa có tác phẩm. Vui lòng liên hệ ban tổ chức.</p>}
      </main>}
  </div>;
}
