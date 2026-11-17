import React, {useState} from 'react';
import {ArrowRight, BookOpenCheck, Box, ClipboardCheck, Footprints, Landmark, MapPin, MessageSquareText, PencilLine} from 'lucide-react';
import {ASEAN_EXHIBIT_NAMES, ASEAN_FRAMES} from '../../v3/aseanLesson.js';
import AseanDiscussionPhoto from '../../v3/AseanDiscussionPhoto.jsx';

const commons='https://commons.wikimedia.org/wiki/File:';
const photos=[
 {image:'/museum/asean/presenter/hoi-an-river.webp',file:'Waterfront_of_Hoi_An_on_the_Thu_Bon_River.jpg',author:'Dennis G. Jarvis',
  license:'CC BY-SA 2.0',licensePath:'licenses/by-sa/2.0/',alt:'Riverside buildings along the Thu Bồn River in Hội An'},
 {image:'/museum/asean/presenter/hoi-an-shopfronts.webp',file:'Hoi_An_-_HoiAn1435.jpg',author:'lumoplank',
  license:'CC0 1.0',licensePath:'publicdomain/zero/1.0/',alt:'Traditional shopfronts in Hội An'},
 {image:'/museum/asean/presenter/hoi-an-alley.webp',file:'Alley_in_Hoi_An.jpg',author:'Christophe95',
  license:'CC BY-SA 4.0',licensePath:'licenses/by-sa/4.0/',alt:'A narrow lane between buildings in Hội An'},
];
const icons=[MapPin,Footprints,MessageSquareText];
const assess=[['Câu trả lời','Answer'],['Khung bằng chứng','Evidence frame'],['Góp ý','Suggestion']];
const questions=['Ở đâu?','Có thể làm gì?','Cần lưu ý gì?'];
const revisionExample={
 before:'An old trading town.',
 after:'Beside the Thu Bồn River in central Viet Nam.',
};

function FramePhoto({index}) {
 const [failed,setFailed]=useState(false);
 const {image,alt}=photos[index];
 const Icon=icons[index];
 return <div className="asean-presenter-photo">
  {failed?<Icon aria-hidden="true"/>:<img src={image}
   alt={alt} decoding="async" loading="lazy" onError={()=>setFailed(true)}/>}
 </div>;
}

function PhotoCredits({en, indices}) {
 return <figcaption className="asean-presenter-credits">
  <span>{en?'Hội An photographs · cropped for display':'Ảnh Hội An · cắt khung khi hiển thị'}</span>
  {indices.map(index=>{
   const photo=photos[index];
   return <span key={photo.file}>
    <a href={commons+photo.file} target="_blank" rel="noreferrer">{photo.author}</a>
    {' · '}<a href={'https://creativecommons.org/'+photo.licensePath} target="_blank" rel="noreferrer">{photo.license}</a>
   </span>;
  })}
 </figcaption>;
}

export default function AseanPresenterVisual({activity,language}) {
 const en=language==='en';
 const names=ASEAN_EXHIBIT_NAMES[language==='vi'?'vi':'en'];
 if(activity==='discover')return <div className="asean-presenter-visual asean-presenter-visual--discover">
  <AseanDiscussionPhoto language={language} imageSource="/museum/asean/presenter/hue-meridian-gate.webp" fallback={<div className="asean-presenter-photo asean-presenter-hue-fallback"><Landmark aria-hidden="true"/></div>}/>
  <ul className="asean-presenter-prompts">
   {ASEAN_FRAMES.map(({key,question},index)=>{
    const Icon=icons[index];
    return <li key={key}><Icon aria-hidden="true"/>{en?question:questions[index]}</li>;
   })}
  </ul>
 </div>;
 if(activity==='revise')return <figure className="asean-presenter-visual asean-presenter-visual--revise">
  <div className="asean-presenter-comparison">
   <FramePhoto index={0}/>
   <div className="asean-presenter-compare-captions">
    <div><MessageSquareText aria-hidden="true"/><strong>{names.first}</strong><p lang="en">{revisionExample.before}</p></div>
    <ArrowRight className="asean-presenter-arrow" aria-hidden="true"/>
    <div><PencilLine aria-hidden="true"/><strong>{names.revised}</strong><p lang="en">{revisionExample.after}</p></div>
   </div>
  </div>
  <PhotoCredits en={en} indices={[0]}/>
 </figure>;
 if(activity==='share')return <figure className="asean-presenter-visual asean-presenter-visual--share">
  <div className="asean-presenter-share">
   <div className="asean-presenter-writing">
    <BookOpenCheck aria-hidden="true"/>
    <strong>{en?'Two English sentences':'Hai câu tiếng Anh'}</strong>
    <p lang="en">Visitors can …</p><p lang="en">Visitors should …</p>
   </div>
   <div className="asean-presenter-exhibit">
    <div className="asean-presenter-strip">{photos.map(({file},index)=><FramePhoto key={file} index={index}/>)}</div>
    <div><Box aria-hidden="true"/><strong>{en?'Final 3D exhibit':'Triển lãm 3D cuối'}</strong></div>
   </div>
  </div>
  <PhotoCredits en={en} indices={[0,1,2]}/>
 </figure>;
 const room=activity==='build', visitor=activity==='visit';
 return <figure className={`asean-presenter-visual asean-presenter-visual--${activity}`}>
  <ol className={`asean-presenter-frames${room?' is-room':''}`}>
   {ASEAN_FRAMES.map(({key,label,question},index)=>{
    const Icon=room?Landmark:icons[index];
    return <li key={key}>
     <FramePhoto index={index}/>
     <div className="asean-presenter-frame-caption">
      <Icon aria-hidden="true"/><strong lang="en">{label}</strong>
      {!room&&!visitor&&<span>{en?question:questions[index]}</span>}
     </div>
    </li>;
   })}
  </ol>
  {visitor&&<div className="asean-presenter-evidence"><ClipboardCheck aria-hidden="true"/>
   <span>{assess.map(item=>item[en?1:0]).join(' · ')}</span>
   <strong>{en?'Max 3 points':'Tối đa 3 điểm'}</strong>
  </div>}
  <PhotoCredits en={en} indices={[0,1,2]}/>
 </figure>;
}
