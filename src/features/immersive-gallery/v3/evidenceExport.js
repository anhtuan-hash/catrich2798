import {surveyChartPng} from './surveyChart.js';
import {changedExhibits} from './learningEvidence.js';
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
 zip.file('P2/Minh_chung/Peer_feedback.csv',csv([['From group','To group','Checkpoint','Learned','Clarify','Clarity 1–4','Time'],...(bundle.feedback||[]).map(r=>[r.from_group,r.to_group,r.checkpoint_id,r.learned,r.clarify,r.rating,r.created_at])]));
 const revisions=(bundle.groups||[]).map(g=>{const before=bundle.checkpoints.find(c=>c.group_id===g.id&&c.kind==='before'),after=bundle.checkpoints.find(c=>c.group_id===g.id&&c.kind==='after');return [g.label,before?.version,after?.version,before&&after?changedExhibits(before.doc,after.doc).join('; '):'Missing checkpoint',after?.doc?.learning?.improvement||''];});
 zip.file('P2/Minh_chung/Before_after.csv',csv([['Group','Before version','After version','Changed exhibits','Revision reason'],...revisions]));
 if(bundle.survey){
  zip.file('P2/Minh_chung/Survey.csv',csv([['Choice','Count','N (groups)','Percent','Source','Frozen at'],...bundle.survey.options.map(o=>[o.label,o.count,bundle.survey.n,o.percent,bundle.survey.source,bundle.survey.created_at])]));
  zip.file('P2/Minh_chung/Survey.png',surveyChartPng(bundle.survey).split(',')[1],{base64:true});
 }
 let bytes=0;
 for(const asset of media){const response=await fetch(asset.url,{credentials:'omit',referrerPolicy:'no-referrer'});if(!response.ok)throw new Error('Không tải đủ ảnh minh chứng. Hãy xuất lại.');const data=await response.arrayBuffer();bytes+=data.byteLength;if(bytes>LIMIT-1024*1024)throw new Error('Hồ sơ vượt 50 MB.');zip.file('P2/Minh_chung/Artworks/'+asset.id+'.png',data);}
 zip.file('P2/README.txt','Dữ liệu thực tế đã lưu của lớp được chọn. Không bao gồm dữ liệu giới thiệu, không tự chứng nhận hiệu quả dạy học. Giáo viên kiểm tra quyền chia sẻ trước khi nộp. Ghép thư mục này vào P2 của hồ sơ. Giới hạn 50 MB áp dụng cả hồ sơ P2 sau khi ghép.');
 const output=await zip.generateAsync({type:'blob',compression:'DEFLATE'});
 if(output.size>LIMIT)throw new Error('Gói minh chứng vượt 50 MB.');return output;
}
