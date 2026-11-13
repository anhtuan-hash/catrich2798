import {surveyChartPng} from './surveyChart.js';
import {changedExhibits} from './learningEvidence.js';
import {portfolioProvenance,portfolioStageRows,portfolioExitRows,portfolioThinkingRows,portfolioPeerFocusRows,portfolioReflectionRows} from './museumPortfolioV54.js';
const cell=v=>'"'+String(v??'').replace(/^[=+@\-]/,"'$&").replaceAll('"','""')+'"';
export const csv=rows=>'\uFEFF'+rows.map(r=>r.map(cell).join(',')).join('\r\n');
export async function buildEvidenceZip(bundle,rubrics=[]){
 const {default:JSZip}=await import('jszip'),zip=new JSZip();
 const {media=[],...records}=bundle;
 // Download URLs are temporary access capabilities: never embed them in exported records.
 const assetMetadata=media.map(({url,...a})=>a);
 const LIMIT=50*1024*1024;
 if(media.reduce((n,a)=>n+a.bytes,0)>LIMIT-1024*1024)throw new Error('Ảnh minh chứng vượt 49 MB. Hãy xuất từng lớp nhỏ hơn.');
 zip.file('P2/Minh_chung/records.json',JSON.stringify({...records,media:assetMetadata,rubrics},null,2));
 const origin=portfolioProvenance(bundle);
 // Teacher-only audit: prepared presentation content cannot be treated as independent observation.
 zip.file('P2/Minh_chung/Record_provenance.csv',csv([
  ['Classification','Source','Teacher review note','Requires independent verification'],
  [origin.classification,origin.source,origin.note,origin.requiresVerification?'YES':'NO']
 ]));
 zip.file('P2/Minh_chung/11_activity_evidence_matrix.csv',csv([
  ['Activity','Period','Activity title','Planned duration','Mode','Group responses','Thinking challenges','Related checkpoints or reviews','Interpretation'],
  ...portfolioStageRows(bundle)
 ]));
 zip.file('P2/Minh_chung/Exit_tickets.csv',csv([['Group','English exit ticket','Saved at'],...portfolioExitRows(bundle)]));
 zip.file('P2/Minh_chung/Thinking_challenges.csv',csv([['Group','Activity','Activity title','Choice','English explanation','Saved at'],...portfolioThinkingRows(bundle)]));
 zip.file('P2/Minh_chung/Peer_feedback_by_exhibit.csv',csv([['From group','Exhibition owner','Exhibit focus','Learned','Suggestion','Clarity 1–4','Recorded at'],...portfolioPeerFocusRows(bundle)]));
 zip.file('P2/Minh_chung/Group_reflections.csv',csv([['Group','After version','Named source','Group roles','English reflection','Reported improvement','Saved at'],...portfolioReflectionRows(bundle)]));
 zip.file('P2/Minh_chung/Peer_feedback.csv',csv([['From group','To group','Checkpoint','Learned','Clarify','Clarity 1–4','Time'],...(bundle.feedback||[]).map(r=>[r.from_group,r.to_group,r.checkpoint_id,r.learned,r.clarify,r.rating,r.created_at])]));
 const revisions=(bundle.groups||[]).map(g=>{const before=bundle.checkpoints.find(c=>c.group_id===g.id&&c.kind==='before'),after=bundle.checkpoints.find(c=>c.group_id===g.id&&c.kind==='after');return [g.label,before?.version,after?.version,before&&after?changedExhibits(before.doc,after.doc).join('; '):'Missing checkpoint',after?.doc?.learning?.improvement||''];});
 zip.file('P2/Minh_chung/Before_after.csv',csv([['Group','Before version','After version','Changed exhibits','Revision reason'],...revisions]));
 if(bundle.survey){
  zip.file('P2/Minh_chung/Survey.csv',csv([['Choice','Count','N (groups)','Percent','Source','Frozen at'],...bundle.survey.options.map(o=>[o.label,o.count,bundle.survey.n,o.percent,bundle.survey.source,bundle.survey.created_at])]));
  zip.file('P2/Minh_chung/Survey.png',surveyChartPng(bundle.survey).split(',')[1],{base64:true});
 }
 let bytes=0;
 for(const asset of media){const response=await fetch(asset.url,{credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw new Error('Không tải đủ ảnh minh chứng. Hãy xuất lại.');const data=await response.arrayBuffer();bytes+=data.byteLength;if(bytes>LIMIT-1024*1024)throw new Error('Hồ sơ vượt 50 MB.');zip.file('P2/Minh_chung/Artworks/'+asset.id+'.png',data);}
 zip.file('P2/README.txt',[
  'BRIAN MUSEUM LAB — PRIVATE TEACHER EVIDENCE EXPORT',
  'Classification: '+origin.classification,
  'Source: '+origin.source,
  'The ZIP reports saved application records and does not certify actual student participation or improved environmental outcomes.',
  'The 11-activity matrix shows planned lesson stages and recorded group-device entries, not grades.',
  'Survey N represents groups, not individuals. Verify original data collection before any official claim.',
  'Review Record_provenance.csv before treating prepared presentation content as independently observed evidence.',
  'Verify permissions, timestamps and sources for actual images and feedback before submitting.',
  'Never share private Creator Pass secrets, student personal data or expiring signed media links.',
  'Combine this folder with the final Part 2 dossier and verify its total file size and eligibility.'
 ].join('\n'));
 const output=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
 if(output.size>LIMIT)throw new Error('Gói minh chứng vượt 50 MB.');return output;
}
