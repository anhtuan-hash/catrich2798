import React from 'react';
import {STEPS} from './museumData.js';
import {LIVE_STAGES} from './liveLesson.js';

const GROUP_ENDS = [3,6,7,9,LIVE_STAGES.length];
export const activityGroup = index => GROUP_ENDS.findIndex(end => index < end);
export const firstActivity = group => GROUP_ENDS[group-1]??0;

export default function MuseumStudentActivityGroups({group,activity,language,onGroup,onActivity}){
 const start=firstActivity(group);
 const end=GROUP_ENDS[group];
 return <div className="bml-student-activity-groups" data-testid="student-activity-groups">
  <nav className="bml-student-steps" aria-label={language==='en'?'Lesson groups':'Các mục của bài học'}>
   {STEPS.map((item,i)=>{
    const first=firstActivity(i)+1,last=GROUP_ENDS[i];
    return <button type="button" key={item.key} aria-pressed={i===group}
     onClick={()=>onGroup(i)} className={i===group?'is-active':''}>
     <span>{String(i+1).padStart(2,'0')}</span><small>{item[language]}</small>
     <small className="bml-student-activity-range">{first===last?first:first+'–'+last}</small>
    </button>;
   })}
  </nav>
  <nav className="bml-student-group-activities" aria-label={language==='en'?'Activities in '+STEPS[group].en:'Hoạt động trong mục '+STEPS[group].vi}>
   {LIVE_STAGES.slice(start,end).map((item,i)=>{
    const index=start+i;
    return <button type="button" key={item.id} aria-current={index===activity?'step':undefined}
     onClick={()=>onActivity(index)}><span>{index+1}</span>{item.title}</button>;
   })}
  </nav>
 </div>;
}
