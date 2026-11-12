import {surveySummary,SURVEY_QUESTION} from './learningEvidence.js';
export function surveyChartPng(snapshot){
 const s=surveySummary(snapshot);if(!s)throw new Error('Chưa có khảo sát đã chốt.');
 const canvas=document.createElement('canvas');canvas.width=1100;canvas.height=720;
 const c=canvas.getContext('2d');if(!c)throw new Error('Không thể tạo biểu đồ.');
 c.fillStyle='#ffffff';c.fillRect(0,0,1100,720);c.fillStyle='#16324f';c.font='bold 32px Arial';c.fillText('OUR CLASS PRIORITIES',50,65);
 c.font='22px Arial';c.fillText(SURVEY_QUESTION,50,110);c.fillText(`N = ${s.n} group votes · ${s.source==='paper'?'Teacher-entered paper tally':'Online group votes'}`,50,150);
 s.options.forEach((o,i)=>{const y=210+i*100;c.fillStyle='#16324f';c.font='21px Arial';c.fillText(o.label,50,y);
 c.fillStyle='#eaf0f6';c.fillRect(50,y+15,760,30);c.fillStyle='#167b71';c.fillRect(50,y+15,760*o.percent/100,30);
 c.fillStyle='#16324f';c.fillText(`${o.count}/${s.n} (${o.percent}%)`,830,y+39);});
 c.font='19px Arial';c.fillText('Group priorities, not individual habits or measured emission reductions.',50,645);
 c.fillText('In-class survey · '+String(s.created_at||''),50,680);return canvas.toDataURL('image/png');
}
