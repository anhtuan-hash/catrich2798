import React, { useEffect, useMemo, useState } from 'react';
import { BarChart3, ShieldCheck, Trophy, UsersRound } from 'lucide-react';
import { photoJudgingRequest } from './PhotoJudgingAdmin.jsx';
import { buildJuryRankings } from '../utils/photoJuryRanking.js';
import './PhotoJuryLive.css';

const POLL_MS=5000;
const displayScore=value=>typeof value==='number'&&Number.isFinite(value)?value.toFixed(1):'—';

export default function PhotoJuryLive({albumId,slideId,photoNumber,slides=[],language='vi'}) {
  const en=language==='en';
  const [snapshot,setSnapshot]=useState(null);
  const [mode,setMode]=useState('classes');
  const [error,setError]=useState(false);
  useEffect(()=>{
    if(!albumId){setSnapshot(null);return;}
    let active=true,busy=false;
    async function sync(){
      if(busy || document.hidden)return;
      busy=true;
      try{
        const result=await photoJudgingRequest({action:'public:live',albumId});
        if(active){setSnapshot(result);setError(false);}
      }catch{if(active)setError(true);}
      finally{busy=false;}
    }
    setSnapshot(null);setError(false);void sync();
    const timer=window.setInterval(()=>{void sync();},POLL_MS);
    const onVisible=()=>{if(!document.hidden)void sync();};
    document.addEventListener('visibilitychange',onVisible);
    return()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisible);};
  },[albumId]);

  const rankings=useMemo(()=>buildJuryRankings(slides,snapshot?.artworks||[]),[slides,snapshot?.artworks]);
  if(!snapshot || !snapshot.enabled)return null;
  const current=rankings.groups.find(item=>item.slideId===slideId);
  const count=snapshot.judgeCount||0;
  const isClosed=snapshot.state==='closed';
  const rows=mode==='classes'?rankings.classes:rankings.groups;
  const scored=rows.filter(r=>r.score!==null).length;
  const phrase=en?{
    headline:'LIVE · JURY LEADERBOARD',refresh:'Refreshes every 5s',
    classes:'By class',groups:'By group',
    leader:'Jury ranking',scores:'Average / 100',
    scored:'scored',groupsText:'groups',judges:'judges',
    artwork:'CURRENT ARTWORK',noScore:'Awaiting first saved score',
    provisional:'Provisional · saved scores count immediately',
    final:'Final result · judging closed',notOfficial:'Class averages include only groups with saved scores',
    privacy:'Anonymous judging · individual jury scores hidden',
    offline:'Connection interrupted · last known ranking',
    empty:'There are no scored entries yet.'
  }:{
    headline:'LIVE · XẾP HẠNG GIÁM KHẢO',refresh:'Cập nhật mỗi 5 giây',
    classes:'Theo lớp',groups:'Theo nhóm',
    leader:'Bảng xếp hạng',scores:'Điểm TB / 100',
    scored:'đã chấm',groupsText:'nhóm',judges:'giám khảo',
    artwork:'TÁC PHẨM ĐANG XEM',noScore:'Đang chờ điểm đầu tiên',
    provisional:'Điểm tạm tính · tính ngay khi giám khảo lưu',
    final:'Kết quả đã chốt · phiên chấm kết thúc',notOfficial:'Điểm lớp tính trung bình các nhóm đã có điểm',
    privacy:'Chấm ẩn danh · không hiển thị điểm riêng giám khảo',
    offline:'Mất kết nối · đang hiển thị kết quả gần nhất',
    empty:'Chưa có lượt chấm nào được lưu.'
  };

  return <aside className="bss-jury-live bss-jury-rankings" aria-label={phrase.headline}>
    <header className="bss-jury-head">
      <div className="bss-jury-headline"><span className="bss-jury-pulse"/>{phrase.headline}</div>
      <span className="bss-jury-refresh">{phrase.refresh}</span>
    </header>

    <div className="bss-jury-rank-current" aria-live="polite">
      <div className="bss-jury-rank-current-text">
        <span>{phrase.artwork} #{String(photoNumber).padStart(2,'0')}</span>
        <strong>{current?.label || (en?'Artwork':'Tác phẩm')+' #'+photoNumber}</strong>
        <small>{current?.scoredCount||0}/{count} {phrase.judges} {phrase.scored}</small>
      </div>
      <div className="bss-jury-rank-current-score">
        <strong>{displayScore(current?.score)}</strong><small>/ 100</small>
      </div>
    </div>

    <div className="bss-jury-rank-toolbar">
      <div className="bss-jury-rank-title"><Trophy size={17} aria-hidden="true"/><strong>{phrase.leader}</strong></div>
      <div className="bss-jury-rank-tabs" role="group" aria-label={phrase.leader}>
        <button type="button" className={mode==='classes'?'active':''} aria-pressed={mode==='classes'} onClick={()=>setMode('classes')}>{phrase.classes}</button>
        <button type="button" className={mode==='groups'?'active':''} aria-pressed={mode==='groups'} onClick={()=>setMode('groups')}>{phrase.groups}</button>
      </div>
    </div>
    <div className="bss-jury-rank-counter">
      <span>{scored}/{rows.length} {mode==='classes'?(en?'classes':'lớp'):(en?'groups':'nhóm')} {phrase.scored}</span>
      <span>{phrase.scores}</span>
    </div>
    <div className={'bss-jury-rank-list'+(mode==='groups'?' is-groups':'')} aria-live="off">
      {rows.map((entry,i)=>{
        const highlighted=mode==='classes'?entry.name===current?.className:entry.slideId===slideId;
        const progress=entry.score===null?0:Math.max(0,Math.min(100,entry.score));
        return <div key={mode==='classes'?entry.name:entry.slideId}
          className={'bss-jury-rank-row'+(highlighted?' is-current':'')+(entry.score===null?' is-unscored':'')}
          aria-current={highlighted?'true':undefined}>
          <span className={'bss-jury-rank-position'+(i<3&&entry.score!==null?' is-top':'')}>{entry.score===null?'—':String(i+1).padStart(2,'0')}</span>
          {mode==='groups'&&entry.imageUrl?<img className="bss-jury-rank-thumb" src={entry.imageUrl} alt="" loading="lazy"/>:null}
          <div className="bss-jury-rank-row-main">
            <div className="bss-jury-rank-row-label">
              <strong>{mode==='classes'?(en?'Class ':'Lớp ')+entry.name:entry.label+' #'+String(entry.artworkNumber).padStart(2,'0')}</strong>
              <small>{mode==='classes'?entry.scoredGroups+'/'+entry.totalGroups+' '+phrase.groupsText:
                entry.scoredCount+'/'+count+' '+phrase.judges}</small>
            </div>
            <div className="bss-jury-rank-track"><span style={{width:progress+'%'}}/></div>
          </div>
          <div className="bss-jury-rank-row-score">{displayScore(entry.score)}</div>
        </div>;
      })}
      {!rows.length&&<div className="bss-jury-rank-empty"><BarChart3 size={18}/>{phrase.empty}</div>}
    </div>
    <p className="bss-jury-rank-disclaimer">{isClosed?phrase.final:phrase.provisional}
      {mode==='classes'?'. '+phrase.notOfficial:''}
    </p>
    <div className="bss-jury-footer"><ShieldCheck size={14} aria-hidden="true"/>{phrase.privacy}</div>
    {error&&<div className="bss-jury-error" role="status">{phrase.offline}</div>}
  </aside>;
}
