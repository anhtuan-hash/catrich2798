import React,{lazy,Suspense} from 'react';
import {ArrowUpRight,ArrowLeft,ArrowRight,FileText} from 'lucide-react';
import {exhibitInsights} from './museumExhibitInsights.js';
import MuseumPhotoQuiz from './MuseumPhotoQuiz.jsx';
import {museumPhotoQuiz} from './museumPhotoQuizData.js';
import './museumEditorial2D.css';

const Exhibit360Viewer=lazy(()=>import('./Exhibit360Viewer.jsx'));
const number=value=>String(value).padStart(2,'0');
const clean=(value,max=180)=>String(value??'').slice(0,max);
const tr=(language,vi,en)=>language==='en'?en:vi;

export function MuseumEditorialRoom({gallery,rooms,roomIndex,onRoomChange,exhibits,onOpen,renderImage,language}){
 const room=rooms[roomIndex];
 const previous=rooms[roomIndex-1];
 const next=rooms[roomIndex+1];
 return <section className="bml-editorial-room" data-testid="museum-paper-2d-room">
  <header className="bml-editorial-room-heading">
   <h2>{room.title}</h2>
   <div>
    <span>{tr(language,'Phòng','Room')} {number(roomIndex+1)} / {number(rooms.length)}</span>
    <span>{exhibits.length} {tr(language,'tác phẩm',exhibits.length===1?'exhibit':'exhibits')}</span>
   </div>
  </header>
  {exhibits.length?<div className="bml-editorial-works" data-cols={exhibits.length} data-testid="museum-2d-exhibits">
   {exhibits.map((exhibit,index)=>{
    const title=clean(exhibit.title,120);
    const caption=exhibitInsights(gallery,exhibit,index).message;
    const action=museumPhotoQuiz(exhibit)?tr(language,'Xem ảnh và câu đố','View & quiz'):tr(language,'Xem tác phẩm','View artwork');
    return <article className="bml-editorial-work" key={exhibit.id||index}>
     <button type="button" aria-label={tr(language,'Khám phá hiện vật ','Explore exhibit ')+(index+1)+': '+title}
      onClick={()=>onOpen(exhibit.id)}>
      {renderImage(exhibit,index)}
      <span className="bml-editorial-work-number">{number(index+1)}</span>
      <strong>{title}</strong>
      <span className="bml-editorial-work-caption">{caption||tr(language,'Chưa có thuyết minh.','No description yet.')}</span>
      <span className="bml-editorial-work-action">{action} <ArrowUpRight size={16} aria-hidden="true"/></span>
     </button>
    </article>;
   })}
  </div>:<div className="bml-empty"><FileText size={28}/>{tr(language,'Chưa có hiện vật trong phòng này.','No exhibits in this room.')}</div>}
  {previous||next?<nav className="bml-editorial-room-pager" aria-label={tr(language,'Chuyển phòng','Change room')}>
   {previous?<button type="button" onClick={()=>onRoomChange(roomIndex-1)}><ArrowLeft size={18}/>{tr(language,'Phòng trước','Previous room')} · {previous.title}</button>:<span/>}
   {next?<button type="button" onClick={()=>onRoomChange(roomIndex+1)}>{tr(language,'Phòng tiếp','Next room')} · {next.title}<ArrowRight size={18}/></button>:null}
  </nav>:null}
 </section>;
}

function Citation({text}){
 return clean(text,1500).split(/(https?:\/\/[^\s·]+)/g).map((part,index)=>{
  if(!/^https?:\/\//.test(part))return part;
  let domain;
  try{domain=new URL(part).hostname.replace(/^www\./,'');}catch{return part;}
  const label=domain==='commons.wikimedia.org'?'Wikimedia Commons':domain==='creativecommons.org'?'Creative Commons':domain;
  return <a key={index} href={part} target="_blank" rel="noreferrer noopener">{label}</a>;
 });
}

export function MuseumEditorialExhibit({room,exhibit,index,count,insight,quiz,language,backRef,onBack,onStep,onZoom}){
 const title=clean(exhibit.title,160);
 return <section className="bml-editorial-exhibit" aria-label={title} data-testid="museum-artwork-inspector">
  <nav className="bml-editorial-exhibit-nav" aria-label={tr(language,'Điều hướng tác phẩm','Exhibit navigation')}>
   <button ref={backRef} type="button" aria-label={tr(language,'Tất cả tác phẩm','All exhibits')} onClick={onBack}>
    <ArrowLeft size={18} aria-hidden="true"/>{tr(language,'Tất cả tác phẩm','All exhibits')}
   </button>
   <strong>{room.title}</strong>
   <div>
    {index>0?<button type="button" aria-label={tr(language,'Tác phẩm trước','Previous exhibit')} onClick={()=>onStep(-1)}><ArrowLeft size={18}/></button>:null}
    <span>{number(index+1)} / {number(count)}</span>
    {index<count-1?<button type="button" aria-label={tr(language,'Tác phẩm tiếp','Next exhibit')} onClick={()=>onStep(1)}>
     {tr(language,'Tiếp','Next')}<ArrowRight size={18}/>
    </button>:null}
   </div>
  </nav>
  <div className="bml-editorial-spread">
   <div className="bml-editorial-media">
    <Suspense fallback={<div className="bml-empty" role="status">{tr(language,'Đang mở tác phẩm…','Loading exhibit…')}</div>}>
     <Exhibit360Viewer key={exhibit.id} exhibit={exhibit} language={language} editorial
      onZoom={exhibit.image_url?()=>onZoom(exhibit.id):undefined}/>
    </Suspense>
   </div>
   <div className="bml-editorial-copy">
    <h2>{title}</h2>
    <p className="bml-editorial-caption">{insight?.message||tr(language,'Chưa có thuyết minh.','No description yet.')}</p>
    {quiz?<MuseumPhotoQuiz key={exhibit.id} quiz={quiz} language={language}/>:null}
    {insight?.imageSource||insight?.source||insight?.imageRights?<div className="bml-editorial-credits" data-testid="museum-exhibit-evidence">
     {insight.imageSource?<p><Citation text={insight.imageSource}/></p>:null}
     {insight.imageRights?<p><Citation text={insight.imageRights}/></p>:null}
     {insight.source?<p>{tr(language,'Nguồn: ','Source: ')}<Citation text={insight.source}/></p>:null}
    </div>:null}
   </div>
  </div>
 </section>;
}
