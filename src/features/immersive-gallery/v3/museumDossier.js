import {LIVE_STAGES} from './liveLesson.js';
import {LESSON_RESOURCES,OFFLINE_GUIDE,CONCLUSION} from './lessonResources.js';
import {RUBRIC} from './museumData.js';
const html=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
const docShell=(title,body)=>'<!doctype html><html lang="en"><head><meta charset="utf-8"><title>'+html(title)+'</title><style>body{font-family:Arial,sans-serif;margin:35px;font-size:12pt;line-height:1.6;color:#111}h1{font-size:20pt;color:#174ea6}h2{font-size:14pt;margin-top:20px}table{border-collapse:collapse;width:100%}td,th{border:1px solid #bbb;padding:7px;text-align:left}em{color:#555}</style></head><body>'+body+'</body></html>';
export function p1Document(fields,assignment){
 const lines=[
 ['Teacher name',fields.teacher],
 ['Birth year',fields.birthYear],
 ['Gender',fields.gender],
 ['Registered subject','English'],
 ['School level','High school'],
 ['Teaching experience',fields.experience],
 ['Institution',fields.school],
 ['Contact phone',fields.phone],
 ['Lesson topic',assignment?.title||fields.topic],
 ['Teaching context',fields.context],
 ['Prerequisite knowledge and skills',fields.foundation],
 ['Developed knowledge and skills',fields.outcomes],
 ['Competencies and values',fields.competencies],
 ['Duration', '2 periods (45 minutes each, planned)'],
 ['Learning environment',fields.space],
 ['Learning objectives',fields.objectives]
 ];
 return docShell('Part 1: Overview', '<h1>PART 1 — OVERVIEW</h1><p><em>Teacher review and verification are required before submission.</em></p><table>'+
  lines.map(([k,v])=>'<tr><th width="37%">'+html(k)+'</th><td>'+html(v||'[To be completed]')+'</td></tr>').join('')+
  '</table><p><b>Note:</b> This draft uses teacher-provided information and is not an institutional endorsement.</p>');
}
export function p2Document(fields,assignment){
 const topic=assignment?.title||fields.topic||'Climate Action Museum';
 const rows=LIVE_STAGES.map(s=>['Period '+s.period+' · '+s.minutes+' min',s.title,s.teaching,s.question+' '+s.sentence,s.expected]);
 const rubric=RUBRIC.map(c=>'<tr><td>'+html(c.en)+'</td><td>'+c.max+'</td><td>'+html(c.help)+'</td></tr>').join('');
 return docShell('Part 2: Teaching plan','<h1>PART 2 — TEACHING PLAN</h1><p><em>DRAFT · Verify alignment with the national curriculum, current textbooks and authentic classroom practice before submission.</em></p>'+
 '<h2>Lesson topic</h2><p>'+html(topic)+' · English · High school · 2 periods</p>'+
 '<h2>Driving problem</h2><p>'+html(fields.drivingQuestion||'How can we make our school greener and explain the solution persuasively in English?')+'</p>'+
 '<h2>Prerequisites and expected outcomes</h2><p>'+html(fields.foundation||'[Teacher to provide verified prerequisites]')+'</p>'+
 '<h2>Objectives</h2><p>'+html(fields.objectives||'[Teacher to provide language and competency objectives]')+'</p>'+
 '<h2>Teaching sequence (draft)</h2><table><tr><th>Timing</th><th>Activity</th><th>Teacher facilitation</th><th>Student tasks</th><th>Products and assessment</th></tr>'+rows.map(r=>'<tr>'+r.map(c=>'<td>'+html(c)+'</td>').join('')+'</tr>').join('')+'</table>'+
 '<h2>Sourced language materials and tasks</h2>'+LESSON_RESOURCES.map(c=>'<h3>'+html(c.title)+'</h3><p>'+html(c.text)+'</p><p>'+html(c.task)+'</p><p>'+html(c.source)+' '+html(c.url||'')+'</p>').join('')+
 '<h2>Conclusion and application</h2><p>'+html(CONCLUSION)+'</p><h2>Offline contingency</h2><p>'+html(OFFLINE_GUIDE)+'</p>'+
 '<h2>Internal assessment rubric (not the official competition rubric)</h2><table><tr><th>Criterion</th><th>Points</th><th>Description</th></tr>'+rubric+'</table>'+
 '<h2>Evidence to attach</h2><ul><li>Credible and licensed data sources; digital worksheets</li><li>Design drafts; classroom photos or videos with permission</li><li>Student exhibition, authentic peer feedback and revision history</li><li>Actual rubric sheets and learner self-assessments</li></ul>'+
 '<p><b>Warning:</b> Use only authentic evidence. Never fabricate classroom data, effectiveness claims or student feedback.</p>');
}
