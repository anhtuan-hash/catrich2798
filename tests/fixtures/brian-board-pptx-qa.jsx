import React,{useEffect,useState} from 'react';
import {createRoot} from 'react-dom/client';
import {importBoardPptx,importedPptxPageIndices} from '../../src/components/BrianBoard/boardPptx.js';
import {newLesson,normalizeLesson,sanitizeStudentPage} from '../../src/components/BrianBoard/boardModel.js';
import BoardPptxStudio from '../../src/components/BrianBoard/BoardPptxStudio.jsx';
function Fixture(){
 const [lesson,setLesson]=useState(null),[message,setMessage]=useState('Ready');
 const current=lesson?.pages.find(p=>p.id===lesson.activePageId);
 useEffect(()=>{
  if(!lesson)return;
  window.__boardPptxResult={pages:importedPptxPageIndices(lesson).length,
    indices:importedPptxPageIndices(lesson),objects:current.objects.map(o=>({
      kind:o.kind,text:o.text,fill:o.fill,src:o.src?.slice(0,30),pptxEditable:o.pptxEditable
    })),student:sanitizeStudentPage(current)};
 },[lesson]);
 const importFile=async(file)=>{
  if(!file)return;
  setMessage('Importing');
  try{
   const {pages,report}=await importBoardPptx(file,1);
   const base=newLesson('pptx-uatrunner');
   setLesson(normalizeLesson({...base,pages:[...base.pages,...pages],activePageId:pages[0].id},base.ownerId));
   setMessage('Imported '+pages.length+' slides, skipped '+report.skipped);
  }catch(e){setMessage('Error: '+e.message);}
 };
 const onEdit=(id,patch)=>setLesson(d=>({...d,pages:d.pages.map(p=>p.id===d.activePageId?{
  ...p,objects:p.objects.map(o=>o.id===id?{...o,...patch}:o)
 }:p)}));
 const onDelete=id=>setLesson(d=>({...d,pages:d.pages.map(p=>p.id===d.activePageId?{
  ...p,objects:p.objects.filter(o=>o.id!==id)
 }:p)}));
 const onNavigate=delta=>setLesson(d=>{
  const indices=importedPptxPageIndices(d),active=d.pages.findIndex(p=>p.id===d.activePageId),index=indices.indexOf(active);
  const target=indices[Math.max(0,Math.min(indices.length-1,index+delta))];
  return {...d,activePageId:d.pages[target].id};
 });
 return <main>
  <h1>Brian Board PPTX — offline UAT</h1>
  <input type="file" id="pptx-file" accept=".pptx" onChange={e=>{void importFile(e.target.files[0]);e.target.value='';}}/>
  <p id="status" role="status">{message}</p>
  <div id="summary">{current?.objects.filter(o=>o.kind==='text').map(o=>o.text).join(' | ')}</div>
  {lesson&&<BoardPptxStudio lesson={lesson} page={current} vi onEdit={onEdit}
   onDelete={onDelete} onNavigate={onNavigate} onPresent={()=>setMessage('Present requested')}/>}
 </main>;
}
createRoot(document.getElementById('root')).render(<Fixture/>);
