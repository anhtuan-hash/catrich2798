import React,{useId,useState} from 'react';
import {ASEAN_VISIT_FORMATS,aseanDestination,aseanGroupIndex,aseanPeerGroup} from '../../v3/aseanLesson.js';
import {englishSystemGroupLabel} from '../../v3/museumApi.js';
import './aseanSubmissionBoard.css';

const tr=(language,vi,en)=>language==='en'?en:vi;

export default function AseanSubmissionBoard({
 language,stage,stageIndex,groups,responses,writingScores,canGrade,onSaveGrade,compact=false,
}){
 const titleId=useId();
 const [selectedId,setSelectedId]=useState(null);
 const ordered=groups.slice().sort((a,b)=>a.label.localeCompare(b.label,language,{numeric:true}));
 const responseByGroup=new Map(responses.map(record=>[record.group_id,record]));
 const submitted=ordered.filter(group=>responseByGroup.has(group.id));
 const active=ordered.find(group=>group.id===selectedId)||submitted[0]||ordered[0];
 if(!active)return null;
 const activity=stageIndex===5?tr(language,'Phiếu vận dụng','Transfer card'):
  stageIndex===0?tr(language,'Phiếu viết đầu giờ','Baseline card'):tr(language,stage?.vi,stage?.title);
 const transferStage=stageIndex===5;
 const writingStage=stageIndex===0||transferStage;
 const groupLabel=label=>language==='en'?englishSystemGroupLabel(label):label;
 const activityNumber=String(stageIndex+1).padStart(2,'0');

 return <section className={"swiss-editorial-live-submissions"+(compact?" is-compact":"")} aria-labelledby={titleId} data-testid="asean-live-submissions">
  <header className="asean-submissions-heading">
   <div>
    <p className="asean-submissions-overline">{tr(language,'Hoạt động','Activity')} {activityNumber} · {activity}</p>
    <h3 id={titleId}>{transferStage?tr(language,'Phiếu vận dụng theo nhóm','Group transfer cards'):tr(language,'Bài đã nộp của từng nhóm','Group submissions for this activity')}</h3>
   </div>
   <div className="asean-submissions-tally">
    <strong>{submitted.length}/{ordered.length}</strong>
    <span>{transferStage?tr(language,'Nhóm có phiếu đã ghi nhận','Groups with a recorded card'):tr(language,'Nhóm đã nộp','Groups submitted')}</span>
   </div>
  </header>

  <div className="asean-submissions-grid">
   <div className="asean-submissions-index">
    <h4>{compact?tr(language,'Trạng thái nhóm','Group status'):tr(language,'Chọn nhóm','Select group')}</h4>
    <div className="asean-submissions-numbers" role="group" aria-label={tr(language,'Chọn nhóm','Select group')}>
     {ordered.map((group,index)=>{
      const number=aseanGroupIndex(group.label)+1;
      const label=groupLabel(group.label);
      return <button key={group.id} type="button" aria-label={label} aria-pressed={group.id===active.id}
       aria-controls={titleId+'-group-'+index} onClick={()=>setSelectedId(group.id)}>
       {number>0?String(number).padStart(2,'0'):label}
      </button>;
     })}
    </div>
   </div>

   <div className="asean-submissions-reader">
    {ordered.map((group,index)=>{
     const record=responseByGroup.get(group.id);
     const target=aseanPeerGroup(groups,group.id,stageIndex);
     const marks=writingScores.find(score=>score.group_id===group.id)?.details;
     const hasScore=[0,1].includes(marks?.experience)&&[0,1].includes(marks?.advice);
     const groupTitleId=titleId+'-label-'+index;
     return <section key={group.id} id={titleId+'-group-'+index} aria-labelledby={groupTitleId} hidden={group.id!==active.id}>
      <header className="asean-submissions-reader-heading">
       <div>
        {compact&&<span className="asean-compact-selected">{tr(language,'Nhóm được chọn','Selected group')}</span>}
        <h4 id={groupTitleId}>{groupLabel(group.label)}</h4>
        {target&&<p>{groupLabel(target.label)} · {aseanDestination(target.label)?.name}</p>}
       </div>
       {writingStage&&record&&<div className="asean-submissions-score" data-scored={hasScore}>
        <strong>{hasScore?marks.experience+marks.advice+'/2':'—'}</strong>
        <span>{hasScore?tr(language,'Điểm viết','Writing score'):tr(language,'Chưa có điểm','Awaiting score')}</span>
       </div>}
      </header>
      {record?<AseanGroupResponse value={record.value} language={language}/>:
       <p className="asean-submissions-empty">{tr(language,'Chưa có bài nộp cho hoạt động này.','No submission for this activity yet.')}</p>}
      {writingStage&&record&&canGrade&&<AseanWritingGrade language={language} value={hasScore?marks:null}
       save={newMarks=>onSaveGrade(group.id,newMarks)}/>}
     </section>;
    })}
   </div>
  </div>
 </section>;
}

function AseanGroupResponse({value,language}){
 if(!value||typeof value!=='object')return null;
 let fields;
 if(value.answers){
  const format=ASEAN_VISIT_FORMATS.find(option=>option.id===value.format);
  fields=[
  [tr(language,'Hình thức thử nghiệm','Viewing format'),format?tr(language,format.vi,format.en):tr(language,'Chưa ghi nhận','Not recorded')],

  ['First frame opened',value.first],
  ['Answers',<ol>{value.answers.map((answer,index)=><li key={index}>{answer.text} · Frame {answer.frame??'—'} · {answer.score}/1</li>)}</ol>],
  ['Visitor test',value.answers.reduce((sum,answer)=>sum+answer.score,0)+'/3'],
  ['Peer feedback',value.comment],
  ];
 }else if(value.question)fields=[
  ['Question',value.question],['Answer',value.answer],['Frame',value.frame??'—'],['Score',value.score+'/1'],
 ];
 else if(value.codes)fields=[
  ['Image codes',value.codes.join(', ')],['Compared frame',value.comparisonFrame],['Alternative',value.alternative],
  ['Fact',value.fact],['Source',value.source],['Reason',value.reason],
 ];
 else fields=[['Experience',value.experience],['Visitor Advice',value.advice]];
 return <dl className="asean-submissions-response" lang="en">
  {fields.map(([label,answer])=><div key={label}><dt>{label}</dt><dd>{answer}</dd></div>)}
 </dl>;
}

function AseanWritingGrade({language,value,save}){
 const [changes,setChanges]=useState(null),[saving,setSaving]=useState(false),[error,setError]=useState('');
 const marks=changes??value??{experience:0,advice:0};
 return <form className="asean-submissions-grading" onSubmit={async event=>{
  event.preventDefault();
  setSaving(true);
  setError('');
  try{await save(marks);setChanges(null);}catch(e){setError(e.message);}finally{setSaving(false);}
 }}>
  <fieldset disabled={saving}>
   <legend>{tr(language,'Chấm phiếu viết','Teacher marking')}</legend>
   {['experience','advice'].map(key=><label key={key}>
    <input type="checkbox" checked={marks[key]===1} onChange={event=>setChanges({...marks,[key]:Number(event.target.checked)})}/>
    {key==='experience'?tr(language,'Trải nghiệm rõ ràng, phù hợp','Clear, relevant experience'):
     tr(language,'Lời khuyên rõ ràng, phù hợp','Clear, appropriate advice')}
   </label>)}
   <button className="adv-toolbtn" type="submit">{tr(language,'Lưu điểm','Save score')}</button>
  </fieldset>
  {error&&<p role="alert">{error}</p>}
 </form>;
}
