import {sanitizeStudentPage} from './boardModel.js';
export function boardStudentPayload(lesson){
 const page=lesson?.pages?.find(p=>p.id===lesson.activePageId);
 const safe=sanitizeStudentPage(page);
 return {type:'state',schema:1,title:String(lesson?.title||'Teaching Board').slice(0,180),
  theme:['ivory','midnight','classroom'].includes(lesson?.theme)?lesson.theme:'ivory',
  page:safe,at:Date.now()};
}
export function newBoardPresentationId(){
 if(typeof crypto==='undefined'||!crypto.getRandomValues)throw Error('Secure random unavailable');
 const bytes=crypto.getRandomValues(new Uint8Array(18));
 return [...bytes].map(x=>x.toString(16).padStart(2,'0')).join('');
}
