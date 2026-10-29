import React, { useEffect, useMemo, useState } from 'react';
import { Activity, Award, Clock3, ShieldCheck, UsersRound } from 'lucide-react';
import { photoJudgingRequest } from './PhotoJudgingAdmin.jsx';
import './PhotoJuryLive.css';

const POLL_MS = 12000;
const average = value => typeof value === 'number' && Number.isFinite(value)
  ? value.toFixed(1) : '—';

export default function PhotoJuryLive({albumId,slideId,photoNumber,language='vi'}) {
  const en = language === 'en';
  const [snapshot,setSnapshot] = useState(null);
  const [error,setError] = useState(false);
  useEffect(()=>{
    if(!albumId){setSnapshot(null);return;}
    let active=true;
    let busy=false;
    async function sync(){
      if(busy || document.hidden) return;
      busy=true;
      try{
        const result=await photoJudgingRequest({action:'public:live',albumId});
        if(active){setSnapshot(result);setError(false);}
      }catch{
        if(active)setError(true);
      }finally{busy=false;}
    }
    setSnapshot(null);setError(false);
    void sync();
    const timer=window.setInterval(()=>{void sync();},POLL_MS);
    const onFocus=()=>{if(!document.hidden)void sync();};
    document.addEventListener('visibilitychange',onFocus);
    return ()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',onFocus);};
  },[albumId]);

  const artwork=useMemo(()=>snapshot?.artworks?.find(a=>a.slideId===slideId),
    [snapshot,slideId]);
  if(!snapshot || !snapshot.enabled) return null;
  const currentVotes=artwork?.submittedCount??0;
  const ready=typeof artwork?.average==='number' && currentVotes>=3;
  const all=snapshot.judgeCount||0;
  const ratio=all?Math.min(100,Math.round(snapshot.submittedCount*100/all)):0;
  const phrase=en?{
    headline:'LIVE · JURY SCORING',refresh:'Updates every 12s',working:'Judges evaluating',
    submitted:'Submitted scorecards',progress:'Completed',artwork:'THIS ARTWORK',
    criteria:'CRITERION AVERAGES',average:'AVERAGE SCORE',waiting:'Awaiting official scorecards',
    before:'Public averages appear after at least 3 submitted scorecards.',
    pending:'Provisional score · submitted ballots only',outof:'out of',
    final:'Final results',offline:'Connection interrupted · showing last available data'
  }:{
    headline:'LIVE · ĐIỂM GIÁM KHẢO',refresh:'Cập nhật mỗi 12 giây',working:'Đang chấm',
    submitted:'Phiếu đã nộp',progress:'Hoàn tất',artwork:'TÁC PHẨM ĐANG XEM',
    criteria:'ĐIỂM TRUNG BÌNH THEO TIÊU CHÍ',average:'ĐIỂM TRUNG BÌNH',
    waiting:'Đang tổng hợp điểm chính thức',
    before:'Điểm công khai khi có ít nhất 3 phiếu đã nộp.',
    pending:'Điểm tạm tính · chỉ từ phiếu đã nộp',outof:'trên',
    final:'Kết quả đã khóa',offline:'Mất kết nối · hiển thị dữ liệu gần nhất'
  };
  const ordered = snapshot.rubric||[];
  return <aside className="bss-jury-live" aria-label={en?'Live jury scoring':'Điểm giám khảo trực tiếp'}>
    <header className="bss-jury-head">
      <div className="bss-jury-headline"><span className="bss-jury-pulse"/><span>{phrase.headline}</span></div>
      <span className="bss-jury-refresh">{phrase.refresh}</span>
    </header>
    <div className="bss-jury-overview">
      <div className="bss-jury-metric">
        <UsersRound size={21} aria-hidden="true"/>
        <strong>{snapshot.workingCount}<small> / {all}</small></strong>
        <span>{phrase.working}</span>
      </div>
      <div className="bss-jury-metric">
        <div className="bss-jury-ring" style={{'--jury-progress':ratio+'%'}}>
          <span>{ratio}%</span>
        </div>
        <strong>{snapshot.submittedCount} / {all}</strong>
        <span>{phrase.submitted}</span>
      </div>
      <div className="bss-jury-metric">
        <Clock3 size={21} aria-hidden="true"/>
        <strong>{String(photoNumber).padStart(2,'0')}</strong>
        <span>{phrase.artwork}</span>
      </div>
    </div>
    <div className="bss-jury-section-title"><span>{phrase.criteria}</span><Award size={15} aria-hidden="true"/></div>
    <div className="bss-jury-criteria">
      {ordered.map((c,i)=>{
        const metric=ready?artwork.criteria.find(x=>x.id===c.id):null;
        return <div className="bss-jury-criterion" key={c.id}>
          <div className="bss-jury-criterion-icon" aria-hidden="true">{['✦','◎','◈','▣'][i%4]}</div>
          <div className="bss-jury-criterion-body">
            <strong>{c.label}</strong>
            <small>{c.weight}%</small>
          </div>
          <div className="bss-jury-bars" role="img"
            aria-label={c.label+': '+(metric?average(metric.average)+'/10':'—')}>
            {Array.from({length:10},(_,j)=><span key={j} className={metric && (j+1)<=Math.round(metric.average)?'is-lit':''}/>)}
          </div>
          <span className="bss-jury-criterion-value">{metric?average(metric.average):'—'}</span>
        </div>;
      })}
    </div>
    <div className="bss-jury-score">
      <span>{phrase.average} {ready?'':'· '+currentVotes+'/'+Math.max(3,snapshot.minimumSubmissions)}</span>
      {ready?<div className="bss-jury-score-value">{average(artwork.average)}<small> / 100</small></div>:
        <div className="bss-jury-awaiting"><Activity size={18} aria-hidden="true"/> {phrase.waiting}</div>}
      <p>{ready ? (snapshot.state==='closed'?phrase.final:phrase.pending) : phrase.before}</p>
    </div>
    <div className="bss-jury-footer">
      <ShieldCheck size={14} aria-hidden="true"/>
      <span>{en?'Anonymous aggregates only · no judge identities':'Chỉ số liệu tổng hợp · không công bố tên giám khảo'}</span>
    </div>
    {error&&<div className="bss-jury-error" role="status">{phrase.offline}</div>}
  </aside>;
}
