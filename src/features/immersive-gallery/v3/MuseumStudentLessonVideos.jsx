import React from 'react';
import {MuseumVideoFrame} from './MuseumVideoLab.jsx';

export default function MuseumStudentLessonVideos({clip,assigned=[],language='vi'}){
 const videos=clip?[clip,...assigned.filter(video=>video.id!==clip.id)]:assigned;
 if(!videos.length)return null;
 return <div className="bml-student-inline-videos" data-testid="student-lesson-videos">
  {videos.map(video=><figure key={video.id} className="bml-student-inline-video">
   <MuseumVideoFrame id={video.id} title={video.title} language={language}/>
   {video.officialSource?<figcaption>
    <a href={video.officialSource} target="_blank" rel="noreferrer">{language==='en'?'NASA original':'Nguồn NASA'}</a>
    {video.transcript?<>{' · '}<a href={video.transcript} target="_blank" rel="noreferrer">{language==='en'?'Transcript':'Lời thoại'}</a></>:null}
   </figcaption>:null}
  </figure>)}
 </div>;
}
