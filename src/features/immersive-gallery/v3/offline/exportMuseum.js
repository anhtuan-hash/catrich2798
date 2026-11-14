import {staffRequest} from '../museumApi.js';
import {liveStaff,artStaff} from '../museumLiveApi.js';
import {SNAPSHOT_FORMAT,sanitizeSnapshot,digest,buildOfflineHtml} from './snapshot.js';

// Read only existing, permission-checked staff endpoints. Never export the
// session token, Creator Pass, signed access URL or service-role credentials.
export async function captureMuseum({onProgress=()=>{},signal,staff=staffRequest,live=liveStaff,art=artStaff,fetcher=fetch}={}){
 const startedAt=new Date().toISOString(),warnings=[],media=[],cache=new Map();let totalBytes=0;
 const LIMIT=180*1024*1024;
 const check=()=>{if(signal?.aborted)throw new DOMException('Export cancelled.','AbortError');};
 const download=async url=>{
  if(!url||url.startsWith('data:'))return url;
  if(cache.has(url))return cache.get(url);
  const task=(async()=>{
   check();const r=await fetcher(url,{signal,credentials:'omit',referrerPolicy:'no-referrer'});
   if(!r.ok)throw new Error('An artwork could not be downloaded. Export again while online.');
   const blob=await r.blob();
   if(!/^image\/(png|jpeg|webp|avif|gif|svg\+xml)$/.test(blob.type))throw new Error('An artwork URL did not return an image. The export was stopped.');
   totalBytes+=blob.size;if(totalBytes>LIMIT)throw new Error('Artwork exceeds the 180 MB offline export limit. This archive is too large for the current browser export.');
   const bytes=new Uint8Array(await blob.arrayBuffer());
   const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
   const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob);});
   media.push({sha256:hash,bytes:blob.size,type:blob.type});return data;
  })();cache.set(url,task);return task;
 };
 const embed=async value=>{
  if(Array.isArray(value)){const out=[];for(const x of value)out.push(await embed(x));return out;}
  if(value&&typeof value==='object'){
   const out={};for(const [key,v] of Object.entries(value)){
    if((key==='image_url'||key==='url')&&typeof v==='string'&&/^https?:\/\//.test(v)&&
      (key==='image_url'||/storage\/v1\//.test(v)))out[key]=await download(v);
    else out[key]=await embed(v);
   }return out;
  }return value;
 };
 onProgress('Reading authorized lessons and submissions…');
 const staffData=await staff('dashboard'),showcase=await staff('showcase-state');check();
 if(staffData.assignments.length>=100||staffData.groups.length>=500||staffData.reviews.length>=500||
  (staffData.rubrics||[]).length>=500||(staffData.exitTickets||[]).length>=500||
  (showcase.publishedGalleries||[]).length>=100)
  throw new Error('The staff catalogue reached its API limit. A complete archive cannot be guaranteed; export was stopped.');
 const snapshot={format:SNAPSHOT_FORMAT,startedAt,completedAt:null,source:'Pétrus Ký School System',
  staff:staffData,showcase,galleries:[],artworks:{},groupDrafts:{},live:{},evidence:{},comparisons:{},warnings,media};
 for(const [i,gallery] of (showcase.publishedGalleries||staffData.publishedGalleries||[]).entries()){
  check();onProgress('Saving published exhibition '+(i+1)+'…');
  snapshot.galleries.push(await embed((await staff('showcase-exhibition',{id:gallery.id})).gallery));
 }
 for(const [index,a] of staffData.assignments.entries()){
  check();onProgress('Freezing lesson '+(index+1)+'/'+staffData.assignments.length+': '+a.title);
  const state=await live('state',null,{assignmentId:a.id});snapshot.live[a.id]=await embed(state);
  if(state.session?.id){
   snapshot.evidence[a.id]=await embed(await live('evidence',null,{assignmentId:a.id}));
  }else warnings.push({kind:'no-session',lesson:a.title,message:'No saved live session existed; the lesson plan remains available for offline presentation.'});
  const groups=staffData.groups.filter(g=>g.assignment_id===a.id);
  for(const [i,g] of groups.entries()){
   check();onProgress(a.title+' · group '+(i+1)+'/'+groups.length);
   // Download each signed group asset immediately, before its short TTL expires.
   snapshot.artworks[g.id]=await embed(await art(g.id));
   try{snapshot.groupDrafts[g.id]=await embed(await live('group-gallery',null,{assignmentId:a.id,groupId:g.id}));}
   catch(error){
    if(error.status!==404)throw error;
    warnings.push({kind:'no-draft',group:g.label,message:'No saved group draft existed at export.'});
   }
   if(state.session?.id)snapshot.comparisons[g.id]=await embed(await live('checkpoint-compare',null,{assignmentId:a.id,groupId:g.id}));
  }
 }
 // A referenced artwork must exist locally; never produce an apparently complete
 // archive with missing student images.
 const assertArtwork=(value,assets)=>{
  if(Array.isArray(value)){value.forEach(v=>assertArtwork(v,assets));return;}
  if(!value||typeof value!=='object')return;
  if(value.asset_id&&!value.image_url&&!assets.some(a=>a.id===value.asset_id&&a.image_url))
   throw new Error('A referenced artwork is missing. Restore the image before exporting the evidence.');
  Object.values(value).forEach(v=>assertArtwork(v,assets));
 };
 for(const g of staffData.groups){
  const assets=snapshot.artworks[g.id]||[];
  assertArtwork(snapshot.groupDrafts[g.id]?.draft,assets);
  staffData.reviews.filter(r=>r.group_id===g.id).forEach(r=>assertArtwork(r.snapshot,assets));
 }
 snapshot.galleries.forEach(g=>assertArtwork(g,[]));
 check();
 // Snapshot content retains recorded provenance; it is not rewritten as observed
 // classroom participation. Collection time is a window, not an atomic DB claim.
 snapshot.completedAt=new Date().toISOString();
 warnings.push({kind:'external-services',message:'YouTube playback/search, external websites and remote voices require Internet and are not embedded. Existing titles, sources and teaching scripts remain visible. Offline narration requires an installed local en-US voice.'});
 return sanitizeSnapshot(snapshot);
}
export async function exportMuseumOffline(options={}){
 options.onProgress?.('Loading the matching offline application…');
 const r=await fetch('/museum-offline-runtime.json',{cache:'no-cache',signal:options.signal});
 if(!r.ok)throw new Error('Offline application is not available in this release. Refresh the online app and retry.');
 const runtime=await r.json();
 if(runtime.format!==SNAPSHOT_FORMAT||!runtime.script||!runtime.css)throw new Error('Invalid offline application package.');
 const snapshot=await captureMuseum(options);
 const snapshotHash=await digest(JSON.stringify(snapshot));
 options.onProgress?.('Packaging the application and verifying the evidence…');
 const html=buildOfflineHtml(runtime,snapshot,snapshotHash);
 const board=await studentBoardHtml(runtime,snapshot);
 const {default:JSZip}=await import('jszip');const zip=new JSZip();
 const manifest={format:SNAPSHOT_FORMAT,startedAt:snapshot.startedAt,completedAt:snapshot.completedAt,
  applicationBuild:runtime.build,scope:'Authorized Museum Lab staff catalogue at export; unrelated Brian modules are excluded.',
  snapshotSha256:snapshotHash,htmlSha256:await digest(html),
  counts:{lessons:snapshot.staff.assignments.length,groups:snapshot.staff.groups.length,
   submissions:snapshot.staff.reviews.length,exhibitions:snapshot.galleries.length,embeddedImages:snapshot.media.length,
   studentWorkshops:board.groups.length},
  students:board.groups,warnings:snapshot.warnings,media:snapshot.media,readOnly:true};
 zip.file('PetrusKy_Museum_Offline.html',html);
 zip.file('hoc-sinh/index.html',board.html);
 zip.file('snapshot.json',JSON.stringify(snapshot));
 zip.file('manifest.json',JSON.stringify(manifest,null,2));
 zip.file('README_VI.txt',[
  'PÉTRUS KÝ SCHOOL SYSTEM — BẢN MINH CHỨNG OFFLINE CHỈ ĐỌC',
  '1. Giải nén ZIP. Mở PetrusKy_Museum_Offline.html bằng Chrome hoặc Edge trên máy tính.',
  '2. Có thể tắt Wi-Fi trước khi mở. Không cần cài đặt, máy chủ hay đăng nhập.',
  '3. Xem bài học, bài nộp, tác phẩm, khảo sát, triển lãm 2D/3D và trình chiếu 11 hoạt động.',
  '4. Mở hoc-sinh/index.html để quản 10 bài thực hành. Chọn một nhóm để mở đúng bài của nhóm đó. Chỉ xem.',
  '5. Nút chuyển hoạt động/hiện đáp án chỉ đổi cách xem. Không thêm, sửa, xóa, chấm điểm hay gửi dữ liệu.',
  '6. YouTube và trang ngoài không được tải kèm. Giọng đọc cần giọng en-US cài sẵn trên hệ điều hành.',
  '7. Đây là bản sao dữ liệu mà tài khoản xuất có quyền đọc. Người có tệp có thể xem nội dung này.',
  '8. Dữ liệu được thu thập từ '+snapshot.startedAt+' đến '+snapshot.completedAt+'. Dừng thao tác cập nhật trong lúc xuất để có bản nhất quán.',
  '9. manifest.json ghi SHA-256 và các mục không có dữ liệu. Giữ nguyên bản ZIP gốc khi nộp.',
  '10. SHA-256 phát hiện thay đổi so với bản kê; không phải chữ ký số hoặc xác nhận của cơ quan tổ chức.',
  '11. Kiểm tra nguồn gốc minh chứng, quyền sử dụng ảnh và giới hạn dung lượng hồ sơ trước khi nộp.',
 ].join('\n'));
 const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE',compressionOptions:{level:6}});
 options.signal?.throwIfAborted();
 return {blob,manifest,filename:'PetrusKy_Museum_Offline_'+snapshot.completedAt.slice(0,10)+'.zip',runtime,snapshot};
}
export function groupWorkshopRows(snapshot){
 return [...(snapshot?.staff?.groups||[])].sort((a,b)=>String(a.label||'').localeCompare(String(b.label||''),undefined,{numeric:true}))
  .map((group,index)=>{
   const assignment=snapshot.staff.assignments.find(item=>item.id===group.assignment_id);
   return {id:group.id,label:group.label||'Group '+String(index+1).padStart(2,'0'),classScope:assignment?.class_scope||'',
    state:group.state||'',exit:(snapshot.staff.exitTickets||[]).some(item=>item.group_id===group.id),
    draft:Boolean(snapshot.groupDrafts?.[group.id]),filename:'nhom-'+String(index+1).padStart(2,'0')+'.html'};
  });
}
async function studentBoardHtml(runtime,snapshot){
 const sliced=sanitizeSnapshot({...snapshot,galleries:[],media:[]});
 const hash=await digest(JSON.stringify(sliced));
 return {groups:groupWorkshopRows(snapshot),html:buildOfflineHtml(runtime,sliced,hash,{mode:'student-board',title:'10 student workshops'})};
}
export async function buildStudentWorkshopHtml(runtime,snapshot,groupId){
 const rows=groupWorkshopRows(snapshot);
 const row=rows.find(item=>item.id===groupId);
 const group=snapshot.staff.groups.find(item=>item.id===groupId);
 if(!runtime?.script||!row||!group)throw new Error('This group is not in the frozen archive.');
 const sliced=studentSnapshot(snapshot,group);
 const hash=await digest(JSON.stringify(sliced));
 const html=buildOfflineHtml(runtime,sliced,hash,{mode:'student',groupId,title:row.label+' · Student workshop'});
 return {filename:row.filename,blob:new Blob([html],{type:'text/html'})};
}
function studentSnapshot(full,group){
 const assignmentId=group.assignment_id;
 const evidence=full.evidence[assignmentId];
 const staff={...full.staff,
  assignments:full.staff.assignments.filter(item=>item.id===assignmentId),
  groups:[group],
  reviews:(full.staff.reviews||[]).filter(item=>item.group_id===group.id),
  exitTickets:(full.staff.exitTickets||[]).filter(item=>item.group_id===group.id),
  publishedGalleries:[]};
 const slim=evidence?{...evidence,
  responses:(evidence.responses||[]).filter(item=>item.group_id===group.id),
  feedback:(evidence.feedback||[]).filter(item=>item.from_group===group.id||item.to_group===group.id),
  microResponses:(evidence.microResponses||[]).filter(item=>item.group_id===group.id)}:null;
 return sanitizeSnapshot({...full,staff,galleries:[],media:[],
  artworks:{[group.id]:full.artworks[group.id]||[]},
  groupDrafts:{[group.id]:full.groupDrafts[group.id]||null},
  live:{[assignmentId]:full.live[assignmentId]||{session:null}},
  evidence:slim?{[assignmentId]:slim}:{},
  comparisons:{[group.id]:full.comparisons[group.id]||{before:null,after:null,groupLabel:group.label}}});
}
