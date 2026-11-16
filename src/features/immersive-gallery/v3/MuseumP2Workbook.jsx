import React,{useCallback,useEffect,useRef,useState} from 'react';
import {P2_FORMS,P2_STAFF_FORMS,P2_STUDENT_FORMS,P2_PEER_FORMS,P2_ROLES,summarizeP2} from './museumP2Forms.js';
import {VISITOR_TASKS} from './lessonPlanAlignment.js';
import {saveTextFile} from './museumApi.js';
import MuseumScene from './MuseumScene.jsx';
import './museumP2Workbook.css';

const tr=(language,vi,en)=>language==='vi'?vi:en;
const labels={same:'Same reader',different:'Different reader',unknown:'Reader not confirmed'};
const rubricForms=['I2-A','I2-B'];
const studentCodes=(rows,group)=>[...new Set(rows.filter(r=>r.group_id===group&&['I1-A','I1-B'].includes(r.form)).map(r=>r.slot))].sort();
const valuesSum=values=>[0,1,2].reduce((n,i)=>n+Number(values['score'+i]),0);

function Fields({form,values,onChange,disabled}){
 return <div className="p2-fields">
  {form.fields.map(field=>{
   const props={value:values[field.key]??'',disabled,onChange:event=>onChange(field.key,event.target.value)};
   return <label key={field.key}><span>{field.label}</span>
    {field.options?<select {...props} aria-label={field.label} required={Boolean(field.required)}><option value="">—</option>
     {field.options.map(option=><option key={option} value={option}>{field.key==='item'?VISITOR_TASKS[Number(option)]:labels[option]||option}</option>)}
    </select>:field.max?<input {...props} aria-label={field.label} type="number" min="0" max={field.max} step="1"/>:
     <textarea {...props} aria-label={field.label} rows={2} maxLength={600} required={field.required}/>}
   </label>;
  })}
 </div>;
}

function Record({row,heading}){
 if(!row)return null;
 const form=P2_FORMS[row.form];
 return <article className="p2-record">
  <h4>{heading||row.form+' · '+form.title}{row.slot?' · '+row.slot:''}</h4>
  <dl>{form.fields.filter(field=>row.values[field.key]).map(field=>{
   const value=row.values[field.key];
   return <React.Fragment key={field.key}><dt>{field.label}</dt><dd>{field.key==='item'?VISITOR_TASKS[Number(value)]:labels[value]||value}</dd></React.Fragment>;
  })}</dl>
 </article>;
}
function ClassSummary({rows,groups,language}){
 const s=summarizeP2(rows);
 const total=rows.find(r=>r.form==='I3')?.values.enrolment;
 return <div className="p2-summary">
  <p>{tr(language,'Phiếu A / B / cặp khớp','Forms A / B / matched pairs')} <strong>{s.a} / {s.b} / {s.paired}{total?' of '+total:''}</strong></p>
  {total?<p>{tr(language,'Thiếu A / thiếu B','Missing A / missing B')} <strong>{Math.max(0,Number(total)-s.a)} / {Math.max(0,Number(total)-s.b)}</strong></p>:null}
  <p>{tr(language,'Cặp đã chấm · tăng / bằng / giảm','Scored pairs · higher / same / lower')} <strong>{s.scored} · {s.progress.join(' / ')}</strong></p>
  <p>{tr(language,'Nhóm thử lại · 0→1 / giữ nguyên / 1→0','Matched retests · 0→1 / unchanged / 1→0')} <strong>{s.matchedRetests}/{groups.length} · {s.retests.join(' / ')}</strong></p>
  <p>{tr(language,'Nhóm có bản sửa và lý do đã lưu','Groups with a saved revision and reason')} <strong>{s.revisions}/{groups.length}</strong></p>
 </div>;
}
function PeerContext({formId,peer,language,onPreview}){
 if(!peer)return <p>{tr(language,'Chưa có lượt thử với nhóm bạn trong chặng này.','The partner test has not opened, or fewer than two groups are available.')}</p>;
 const item=peer.outgoingRevision?.values.item;
 return <>
  <p>{tr(language,'Nhóm mình đến xem','Your partner exhibit')} <b>{peer.target}</b> · {tr(language,'Nhóm đến xem bài mình','Your visitors')} <b>{peer.visitor}</b></p>
  {['C2','C3-answer'].includes(formId)&&peer.available?<button type="button" className="p2-button" onClick={onPreview}>{formId==='C2'?'Open partner V1':'Open partner V2'}</button>:null}
  {formId==='C3-answer'&&item!==undefined?<p><strong>{VISITOR_TASKS[Number(item)]}</strong><br/>The other two questions are N/T for V2.</p>:null}
  {formId==='C2-score'?<><Record row={peer.c2}/><Record row={peer.b3} heading="B3 · Expected answers"/></>:null}
  {formId==='C3-share'?<Record row={peer.c2}/>:null}
  {formId==='C3-score'?<><Record row={peer.revision}/><Record row={peer.answer}/></>:null}
  {peer.score?<p>C2 · V1 {valuesSum(peer.score.values)}/3. {peer.retest&&peer.revision?<>C3 · {peer.score.values['score'+peer.revision.values.item]}/1 → {peer.retest.values.score}/1.</>:null}</p>:null}
 </>;
}

// Mounted inside the active student or teacher route using its existing session transport.
export default function MuseumP2Workbook({language,role,transport,readOnly,groupPublished=false,stageIndex=0,stageOpen=false,draftVersion,draftReady,groups=[],assignmentId,initialForm}){
 const staff=role==='teacher';
 const choices=staff?P2_STAFF_FORMS:P2_STUDENT_FORMS;
 const [formId,setForm]=useState(choices.includes(initialForm)?initialForm:staff?'E1':'I1-A');
 const [group,setGroup]=useState(groups[0]?.id||'');
 const [slot,setSlot]=useState('');
 const [rows,setRows]=useState(null);
 const [seen,setSeen]=useState(null);
 const [peer,setPeer]=useState(null);
 const [gallery,setGallery]=useState(null);
 const [values,setValues]=useState({});
 const [serverLocked,setServerLocked]=useState(false);
 const [loadedVersion,setVersion]=useState(0);
 const [saving,setSaving]=useState(false);
 const [notice,setNotice]=useState('');
 const [error,setError]=useState('');
 const request=useRef(0);
 const form=P2_FORMS[formId];
 const isPeer=P2_PEER_FORMS.includes(formId);
 const currentGroup=groups.some(x=>x.id===group)?group:groups[0]?.id;
 const selectedSlot=form.individual?slot.trim().toUpperCase():'';
 const row=(rows||[]).find(r=>r.form===formId&&r.slot===selectedSlot&&(!staff||!form.group||r.group_id===currentGroup));
 const reload=useCallback(async()=>{
  const seq=++request.current;
  try{
   const data=await transport('p2-forms',null,assignmentId?{assignmentId}:{});
   if(seq!==request.current)return;
   setRows(data.rows||[]);
   setServerLocked(Boolean(data.readOnly));
   setError('');
  }catch(e){if(seq===request.current)setError(e.message);}
 },[transport,assignmentId]);
 useEffect(()=>{reload();return()=>{++request.current;};},[reload]);
 const peerRequest=useRef(0);
 const previewBusy=useRef(false);
 const getPeer=useCallback(async(gallery=false)=>{
  const seq=++peerRequest.current;
  try{
   const data=await transport('p2-peer',null,gallery?{gallery:'1'}:{});
   if(seq!==peerRequest.current)return null;
   setPeer(data.peer);
   return data.peer;
  }catch(e){if(seq===peerRequest.current)setError(e.message);return null;}
 },[transport]);
 useEffect(()=>{
  if(staff||!isPeer)return;
  getPeer();
  const timer=setInterval(()=>{if(!previewBusy.current)getPeer();},5000);
  return()=>{clearInterval(timer);++peerRequest.current;};
 },[getPeer,staff,isPeer,stageIndex]);
 useEffect(()=>{
  setValues(row?.values||{});
  setVersion(row?.version||0);
  setSeen(null);
 },[row,formId,currentGroup,selectedSlot]);
 const gate=staff||stageIndex>=form.stage&&(!(form.individual||isPeer)||stageIndex===form.stage&&stageOpen);
 const fixed=Boolean(row&&!staff&&(isPeer||form.individual));
 const peerReady={
  C2:seen!==null,
  'C2-score':Boolean(peer?.c2),
  'C3-share':Boolean(peer?.score&&draftReady),
  'C3-answer':seen!==null,
  'C3-score':Boolean(peer?.answer),
 }[formId]??true;
 const formLocked=Boolean(readOnly||serverLocked||(groupPublished&&formId!=='D2'));
 const disabled=!rows||formLocked||!gate||fixed||saving||Boolean(staff&&form.group&&!currentGroup);
 const preview=async()=>{
  if(previewBusy.current)return;
  previewBusy.current=true;
  const next=await getPeer(true);
  previewBusy.current=false;
  if(!next?.exhibit)return;
  const exhibit=next.exhibit;
  const images=new Map((exhibit.artworks||[]).map(asset=>[asset.id,asset.image_url]));
  setGallery({...exhibit.draft,rooms:(exhibit.draft.rooms||[]).map((room,i)=>({...room,id:'p2-room-'+i,
   exhibits:(room.exhibits||[]).map((item,j)=>({...item,id:'p2-exhibit-'+i+'-'+j,status:'published',image_url:images.get(item.asset_id)||''}))}))});
  setSeen(exhibit.version);
 };
 const save=async e=>{
  e.preventDefault();
  if(disabled||!peerReady)return;
  setSaving(true);setNotice('');setError('');
  try{
   const data=await transport('p2-save',{...assignmentId&&{assignmentId},groupId:currentGroup,form:formId,
    slot:selectedSlot,values,expectedVersion:loadedVersion,seenVersion:formId==='C3-share'?draftVersion:seen});
   const saved=data.row;
   // Apply the saved row at this key and keep records from the other worksheets.
   setRows(current=>[...current.filter(r=>r.form!==saved.form||r.slot!==saved.slot||r.group_id!==saved.group_id),saved]);
   setNotice(tr(language,'Đã lưu vào hồ sơ lớp.','Saved to the classroom record.'));
   if(isPeer)getPeer();
  }catch(e){setError(e.message);}finally{setSaving(false);}
 };
 const formChange=value=>{setForm(value);setError('');setNotice('');setSeen(null);setGallery(null);};
 const sharedRows=staff?(rows||[]).filter(r=>r.group_id===currentGroup&&P2_STUDENT_FORMS.includes(r.form)):[];
 const writing=sharedRows.find(r=>r.form===(formId==='I2-A'?'I1-A':'I1-B')&&r.slot===selectedSlot);
 return <div className="p2-workbook" data-testid={staff?'p2-teacher-workbook':'p2-student-workbook'}>
  <div className="p2-controls">
   <label>{tr(language,'Phiếu','Worksheet')} <select aria-label={tr(language,'Phiếu','Worksheet')} value={formId} onChange={e=>formChange(e.target.value)} disabled={saving}>
    {choices.map(id=><option key={id} value={id}>{id} · {P2_FORMS[id].title}</option>)}
   </select></label>
   {staff&&groups.length?<label>{tr(language,'Nhóm','Group')} <select aria-label={tr(language,'Nhóm','Group')} value={currentGroup||''} onChange={e=>setGroup(e.target.value)} disabled={saving}>
    {groups.map(item=><option key={item.id} value={item.id}>{item.label}</option>)}
   </select></label>:null}
   <button type="button" className="p2-button" onClick={reload} disabled={saving}>{tr(language,'Tải lại bản ghi','Reload records')}</button>
   {staff&&rows?<button type="button" className="p2-button" onClick={()=>saveTextFile('Museum-P2-worksheets.json','application/json',JSON.stringify({groups,records:rows,summary:summarizeP2(rows)},null,2))}>{tr(language,'Xuất minh chứng P2','Export P2 evidence')}</button>:null}
  </div>
  {formId==='B3'?<p>{P2_ROLES}</p>:null}
  {formId==='D2'?<p>{tr(language,'Theo dõi một hành động trong một tuần học. Nộp nhật ký vào tiết tiếng Anh tiếp theo, trước khi giáo viên khóa hồ sơ.','Track one action for a school week. Save the log by the next English lesson, before the teacher locks the record.')}</p>:null}
  {formId==='I3'&&rows?<ClassSummary rows={rows} groups={groups} language={language}/>:null}
  {isPeer?<PeerContext formId={formId} peer={peer} language={language} onPreview={preview}/>:null}
  {formId==='C3-share'&&!draftReady?<p>{tr(language,'Lưu V2 trong Sản phẩm nhóm trước khi chia sẻ.','Save V2 in Group Project before sharing.')}</p>:null}
  {form.individual?<label className="p2-code">{tr(language,'Mã học sinh','Student code')}
   <input autoComplete="off" maxLength={20} list={staff?'p2-student-codes':undefined} value={slot} disabled={saving} onChange={e=>setSlot(e.target.value.toUpperCase())}/>
   {staff?<datalist id="p2-student-codes">{studentCodes(rows||[],currentGroup).map(code=><option key={code} value={code}/>)}</datalist>:null}
  </label>:null}
  {staff&&rubricForms.includes(formId)?<Record heading="Individual writing to mark" row={writing}/>:null}
  {form.prompt?<p lang="en">{form.prompt}</p>:null}
  <form onSubmit={save}>
   <Fields form={form} values={values} onChange={(key,value)=>setValues(prev=>({...prev,[key]:value}))} disabled={disabled}/>
   {formId==='B2'?<p>A · {[0,1,2].reduce((n,i)=>n+Number(values['a'+i]||0),0)}/6 · B · {[0,1,2].reduce((n,i)=>n+Number(values['b'+i]||0),0)}/6</p>:null}
   {formLocked?<p>{tr(language,'Phiếu chỉ xem.','Worksheet is read-only.')}</p>:fixed?<p>{tr(language,'Phiếu đã nộp.','Worksheet submitted.')}</p>:!gate?<p>{tr(language,'Phiếu mở theo chặng của giáo viên.','This worksheet opens at the corresponding teaching stage.')}</p>:
    <button type="submit" className="p2-button p2-save" disabled={disabled||!peerReady||Boolean(form.individual&&!selectedSlot)||(staff&&rubricForms.includes(formId)&&!writing)}>{saving?tr(language,'Đang lưu…','Saving…'):tr(language,'Lưu phiếu vào BRIAN','Save worksheet to BRIAN')}</button>}
  </form>
  {error?<p role="alert" className="p2-error">{error}</p>:null}
  {notice?<p role="status">{notice}</p>:null}
  {staff&&sharedRows.length?<details><summary>{tr(language,'Phiếu học sinh đã lưu','Saved student worksheets')} · {sharedRows.length}</summary>
   {sharedRows.map(r=><Record key={r.form+r.slot} row={r}/>)}</details>:null}
  {gallery?<div className="p2-gallery-layer" role="dialog" aria-modal="true" aria-label={tr(language,'Sản phẩm nhóm bạn','Partner exhibit')}>
   <div><button type="button" className="p2-button" autoFocus onClick={()=>setGallery(null)}>{tr(language,'Quay lại phiếu','Return to worksheet')}</button>
    <MuseumScene gallery={gallery} language={language} embedded/></div>
  </div>:null}
 </div>;
}
