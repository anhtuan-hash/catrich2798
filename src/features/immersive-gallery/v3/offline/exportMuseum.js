import {staffRequest,readPublicWorkshop} from '../museumApi.js';
import {MOBILE_WORKSHOP_VERSION,mobileEligible,captureMobileWorkshop,mobileLauncherEntries} from './mobileWorkshops.js';
import {liveStaff,artStaff} from '../museumLiveApi.js';
import {isAsean} from '../aseanLesson.js';
import {aseanStudentRecords} from './aseanRecords.js';
import {SNAPSHOT_FORMAT,sanitizeSnapshot,digest,buildOfflineHtml,COMPACT_PAYLOAD_VERSION,CONTEST_MAX_BYTES,assertContestBudget} from './snapshot.js';
import {groupWorkshopRows} from './workshopRows.js';
import {prepareOfflineArtwork} from './prepareArtwork.js';

const imageHash=async bytes=>
 [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');

// Read only existing, permission-checked staff endpoints. Never export the
// session token, Creator Pass, signed access URL or service-role credentials.
export async function captureMuseum({onProgress=()=>{},signal,assignmentIds,staff=staffRequest,live=liveStaff,art=artStaff,fetcher=fetch,publicRead=readPublicWorkshop,includeMobile=Boolean(import.meta.env.MUSEUM_LAB_STANDALONE)}={}){
 const startedAt=new Date().toISOString(),warnings=[],media=[],cache=new Map(),imageContent=new Map(),activeImages=new Set();let totalBytes=0;
 const LIMIT=180*1024*1024;
 const check=()=>{if(signal?.aborted)throw new DOMException('Export cancelled.','AbortError');};
 const fetchImage=async url=>{
   check();const r=await fetcher(url,{signal,credentials:'omit',referrerPolicy:'no-referrer'});
   if(!r.ok)throw new Error('An artwork could not be downloaded. Export again while online.');
   const blob=await r.blob();
   if(!/^image\/(png|jpeg|webp|avif|gif|svg\+xml)$/.test(blob.type))throw new Error('An artwork URL did not return an image. The export was stopped.');
   const bytes=new Uint8Array(await blob.arrayBuffer());
   const sourceHash=await imageHash(bytes);
   const contentKey=blob.type+':'+sourceHash;
   if(!imageContent.has(contentKey))imageContent.set(contentKey,(async()=>{
    check();
    const offline=await prepareOfflineArtwork(blob,bytes,check);
    check();
    totalBytes+=offline.size;
    if(totalBytes>LIMIT)throw Object.assign(new Error('The optimized artwork still exceeds the 180 MB offline export limit.'),{code:'OFFLINE_ARTWORK_LIMIT'});
    const hash=offline===blob?sourceHash:await imageHash(await offline.arrayBuffer());
    const data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(offline);});
    return {data,record:{sha256:hash,bytes:offline.size,type:offline.type,...(offline!==blob?{originalBytes:blob.size}:{})}};
   })());
   return imageContent.get(contentKey);
 };
 const download=async url=>{
  if(!url||url.startsWith('data:'))return url;
  if(!cache.has(url)){
   cache.set(url,(async()=>{
    while(activeImages.size>=4)await Promise.race(activeImages);
    const pending=fetchImage(url);
    const settled=pending.then(()=>{},()=>{});
    activeImages.add(settled);
    try{return await pending;}
    finally{activeImages.delete(settled);}
   })());
  }
  return (await cache.get(url)).data;
 };
 const embed=async value=>{
  if(Array.isArray(value))return Promise.all(value.map(embed));
  if(value&&typeof value==='object'){
   const out={};for(const [key,v] of Object.entries(value)){
    if((key==='image_url'||key==='url')&&typeof v==='string'&&/^https?:\/\//.test(v)&&
      (key==='image_url'||/storage\/v1\//.test(v)))out[key]=await download(v);
    else out[key]=await embed(v);
   }return out;
  }return value;
 };
 onProgress({stage:'records',percent:8});
 check();
 const dashboard=await staff('dashboard');
 if(dashboard.publicReadOnly||dashboard.offlineReadOnly)throw new Error('Sign in with an authorized teacher account to export the classroom archive.');
 const catalogue=await staff('showcase-state');check();
 let staffData=dashboard,showcase=catalogue;
 if(staffData.assignments.length>=100||staffData.groups.length>=500||staffData.reviews.length>=500||
  (staffData.rubrics||[]).length>=500||(staffData.exitTickets||[]).length>=500||
  (staffData.aseanResponses||[]).length>=2500||(staffData.aseanWritingScores||[]).length>=2500||
  (showcase.publishedGalleries||[]).length>=100)
  throw new Error('The staff catalogue reached its API limit. A complete archive cannot be guaranteed; export was stopped.');
 if(assignmentIds){
  const requested=new Set(assignmentIds);
  const assignments=dashboard.assignments.filter(assignment=>requested.has(assignment.id));
  if(!assignments.length||assignments.length!==requested.size)throw new Error('One or more selected lessons are unavailable.');
  const groups=dashboard.groups.filter(group=>requested.has(group.assignment_id));
  const groupIds=new Set(groups.map(group=>group.id));
  const reviews=dashboard.reviews.filter(review=>groupIds.has(review.group_id));
  const reviewIds=new Set(reviews.map(review=>review.id));
  const belongsToLesson=gallery=>requested.has(gallery.assignment_id);
  const publishedGalleries=(catalogue.publishedGalleries||dashboard.publishedGalleries||[]).filter(belongsToLesson);
  staffData={...dashboard,assignments,groups,reviews,publishedGalleries,
   rubrics:(dashboard.rubrics||[]).filter(rubric=>reviewIds.has(rubric.review_id)),
   exitTickets:(dashboard.exitTickets||[]).filter(row=>groupIds.has(row.group_id)),
   aseanResponses:(dashboard.aseanResponses||[]).filter(row=>groupIds.has(row.group_id)),
   aseanWritingScores:(dashboard.aseanWritingScores||[]).filter(row=>groupIds.has(row.group_id))};
  showcase={...catalogue,publishedGalleries,hiddenCollections:[],
   archivedGalleries:(catalogue.archivedGalleries||[]).filter(belongsToLesson)};
 }
 const snapshot={format:SNAPSHOT_FORMAT,startedAt,completedAt:null,source:'Pétrus Ký School System',
  staff:staffData,showcase,galleries:[],artworks:{},groupDrafts:{},live:{},evidence:{},comparisons:{},publicWorkshops:{},warnings,media};
 const galleries=showcase.publishedGalleries||staffData.publishedGalleries||[];
 const groupTotal=staffData.groups.length;
 const units=galleries.length+staffData.assignments.length+groupTotal;
 let finished=0,groupsDone=0;
 const reportCapture=(stage,completed,total)=>onProgress({
  stage,completed,total,percent:15+Math.floor(67*finished/Math.max(1,units)),
 });
 for(const [i,gallery] of galleries.entries()){
  check();reportCapture('exhibitions',i,galleries.length);
  snapshot.galleries.push(await embed((await staff('showcase-exhibition',{id:gallery.id})).gallery));
  finished++;
  reportCapture('exhibitions',i+1,galleries.length);
 }
 for(const [index,a] of staffData.assignments.entries()){
  check();reportCapture('lessons',index,staffData.assignments.length);
  const state=await live('state',null,{assignmentId:a.id});snapshot.live[a.id]=await embed(state);
  if(state.session?.id){
   snapshot.evidence[a.id]=await embed(await live('evidence',null,{assignmentId:a.id}));
  }else warnings.push({kind:'no-session',lesson:a.title,message:'No saved live session existed; the lesson plan remains available for offline presentation.'});
  finished++;
  reportCapture('lessons',index+1,staffData.assignments.length);
  const groups=staffData.groups.filter(g=>g.assignment_id===a.id);
  for(let i=0;i<groups.length;i+=3){
   reportCapture('groups',groupsDone,groupTotal);
   const batch=await Promise.allSettled(groups.slice(i,i+3).map(async g=>{
    check();
    const assets=await embed(await art(g.id));
    let draft,comparison,warning;
    check();
    try{draft=await embed(await live('group-gallery',null,{assignmentId:a.id,groupId:g.id}));}
    catch(error){
     if(error.status!==404)throw error;
     warning={kind:'no-draft',group:g.label,message:'No saved group draft existed at export.'};
    }
    check();
    if(state.session?.id)comparison=await embed(await live('checkpoint-compare',null,{assignmentId:a.id,groupId:g.id}));
    const mobile=includeMobile&&mobileEligible(a,g)?await captureMobileWorkshop(g,a,publicRead,embed):null;
    check();
    finished++;groupsDone++;
    reportCapture('groups',groupsDone,groupTotal);
    return {g,assets,draft,comparison,warning,mobile};
   }));
   for(const item of batch){
    if(item.status==='rejected')throw item.reason;
    const {g,assets,draft,comparison,warning,mobile}=item.value;
    if(mobile)snapshot.publicWorkshops[g.id]=mobile;
    snapshot.artworks[g.id]=assets;
    if(draft!==undefined)snapshot.groupDrafts[g.id]=draft;
    if(comparison!==undefined)snapshot.comparisons[g.id]=comparison;
    if(warning)warnings.push(warning);
   }
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
 for(const image of imageContent.values())media.push((await image).record);
 // Snapshot content retains recorded provenance; it is not rewritten as observed
 // classroom participation. Collection time is a window, not an atomic DB claim.
 snapshot.completedAt=new Date().toISOString();
 warnings.push({kind:'external-services',message:'YouTube playback/search, external websites and remote voices require Internet and are not embedded. Existing titles, sources and teaching scripts remain visible. Offline narration requires an installed local en-US voice.'});
 return sanitizeSnapshot(snapshot);
}
export async function exportMuseumOffline(options={}){
 const report=(stage,percent)=>options.onProgress?.({stage,percent});
 report('runtime',0);
 const r=await fetch('/museum-offline-runtime.json',{cache:'no-cache',signal:options.signal});
 if(!r.ok)throw new Error('Offline application is not available in this release. Refresh the online app and retry.');
 const runtime=await r.json();
 if(runtime.format!==SNAPSHOT_FORMAT||!runtime.script||!runtime.css)throw new Error('Invalid offline application package.');
 const includeMobile=Boolean(import.meta.env.MUSEUM_LAB_STANDALONE);
 if(includeMobile&&runtime.mobileWorkshopVersion!==MOBILE_WORKSHOP_VERSION)throw new Error('Refresh Museum Lab to load the mobile offline export runtime.');
 const snapshot=await captureMuseum({...options,includeMobile});
 report('packaging',84);
 const snapshotHash=await digest(JSON.stringify(snapshot));
 if(runtime.compactPayloadVersion!==COMPACT_PAYLOAD_VERSION)throw new Error('Refresh the online app to use the new compact contest export.');
 const html=buildOfflineHtml(runtime,snapshot,snapshotHash,{compact:true});
 const groups=groupWorkshopRows(snapshot);
 const mobileFiles=includeMobile?mobileLauncherEntries(groups,snapshot.publicWorkshops):{};
 const mobileCount=Object.keys(snapshot.publicWorkshops).length;
 const board={groups,html:'<!doctype html><html lang="en"><meta charset="utf-8"><title>Student workshops</title><h1>Student workshops</h1><p><a href="../PetrusKy_Museum_Offline.html#student-workshops">Open all '+groups.length+' student workshops</a></p></html>'};
 const {default:JSZip}=await import('jszip');const zip=new JSZip();
 const manifest={format:SNAPSHOT_FORMAT,startedAt:snapshot.startedAt,completedAt:snapshot.completedAt,
  applicationBuild:runtime.build,scope:'Authorized Museum Lab staff catalogue at export; unrelated Brian modules are excluded.',
  snapshotSha256:snapshotHash,htmlSha256:await digest(html),
  counts:{lessons:snapshot.staff.assignments.length,groups:snapshot.staff.groups.length,
   submissions:snapshot.staff.reviews.length,exhibitions:snapshot.galleries.length,embeddedImages:snapshot.media.length,
   studentWorkshops:board.groups.length,mobileWorkshops:mobileCount},
  students:board.groups.map(g=>({...g,...(snapshot.publicWorkshops[g.id]?{mobileFile:'mobile/'+g.filename}:{})})),warnings:snapshot.warnings,media:snapshot.media,readOnly:true,packaging:'single-html-deduplicated-images',maxTotalBytes:CONTEST_MAX_BYTES,snapshotLocation:'PetrusKy_Museum_Offline.html (embedded, logical SHA-256 after expansion)'};
 zip.file('PetrusKy_Museum_Offline.html',html);
 zip.file('hoc-sinh/index.html',board.html);
 for(const [name,content] of Object.entries(mobileFiles))zip.file(name,content);
 const readme=[
  'PÉTRUS KÝ SCHOOL SYSTEM — BẢN MINH CHỨNG OFFLINE CHỈ ĐỌC',
  '1. Giải nén ZIP. Mở PetrusKy_Museum_Offline.html bằng Chrome hoặc Edge trên máy tính.',
  '2. Có thể tắt Wi-Fi trước khi mở. Không cần cài đặt, máy chủ hay đăng nhập.',
  '3. Xem bài học, bài nộp, tác phẩm, phản hồi đã lưu, triển lãm 2D/3D và trình chiếu theo bài học.',
  '4. Mở hoc-sinh/index.html để xem '+board.groups.length+' bài thực hành. Chọn một nhóm để mở đúng bài của nhóm đó. Chỉ xem.',
  '4a. Bản mobile: mở mobile/index.html (nếu có), chọn nhóm và VI/EN. Dùng cùng ứng dụng và ảnh ngoại tuyến; giữ nguyên thư mục sau giải nén.',
  '5. Nút chuyển hoạt động/hiện đáp án chỉ đổi cách xem. Không thêm, sửa, xóa, chấm điểm hay gửi dữ liệu.',
  '6. YouTube và trang ngoài không được tải kèm. Giọng đọc cần giọng en-US cài sẵn trên hệ điều hành.',
  '7. Đây là bản sao dữ liệu mà tài khoản xuất có quyền đọc. Người có tệp có thể xem nội dung này.',
  '8. Dữ liệu được thu thập từ '+snapshot.startedAt+' đến '+snapshot.completedAt+'. Dừng thao tác cập nhật trong lúc xuất để có bản nhất quán.',
  '9. manifest.json ghi SHA-256 của dữ liệu nhúng và các mục không có dữ liệu. Giữ nguyên bản ZIP khi nộp.',
  '10. SHA-256 phát hiện thay đổi so với bản kê; không phải chữ ký số hoặc xác nhận của cơ quan tổ chức.',
  '11. Kiểm tra nguồn gốc minh chứng, quyền sử dụng ảnh và giới hạn dung lượng hồ sơ trước khi nộp.',
  '12. Ảnh trùng được lưu một lần; một số ảnh là bản tối ưu để xem ngoại tuyến. Dữ liệu gốc hoặc bản phục hồi được lưu trên Museum Lab.',
 ].join('\n');
 const manifestText=JSON.stringify(manifest,null,2);
 const encoder=new TextEncoder();
 const totalBytes=[html,board.html,manifestText,readme,...Object.values(mobileFiles)].reduce((sum,item)=>sum+encoder.encode(item).byteLength,0);
 assertContestBudget(totalBytes);
 zip.file('manifest.json',manifestText);
 zip.file('README_VI.txt',readme);
 report('compression',90);
 let lastPercent=90;
 const blob=await zip.generateAsync(
  {type:'blob',compression:'DEFLATE',compressionOptions:{level:9}},
  ({percent})=>{
   if(options.signal?.aborted)return;
   const wholePercent=90+Math.floor(percent*9/100);
   if(wholePercent!==lastPercent){
    lastPercent=wholePercent;
    report('compression',wholePercent);
   }
  },
 );
 options.signal?.throwIfAborted();
 assertContestBudget(blob.size);
 report('ready',100);
 const entries=Object.values(zip.files).filter(entry=>!entry.dir).map(entry=>entry.name);
 return {blob,manifest:{...manifest,totalUncompressedBytes:totalBytes},filename:'PetrusKy_Museum_Offline_'+snapshot.completedAt.slice(0,10)+'.zip',runtime,snapshot,entries};
}
export async function buildStudentWorkshopHtml(runtime,snapshot,groupId){
 const rows=groupWorkshopRows(snapshot);
 const row=rows.find(item=>item.id===groupId);
 const group=snapshot.staff.groups.find(item=>item.id===groupId);
 if(!runtime?.script||!row||!group)throw new Error('This group is not in the frozen archive.');
 const sliced=studentSnapshot(snapshot,group);
 const hash=await digest(JSON.stringify(sliced));
 const html=buildOfflineHtml(runtime,sliced,hash,{mode:sliced.publicWorkshops?.[groupId]?'mobile':'student',groupId,title:row.label+' · Student workshop',compact:true});
 return {filename:row.filename,blob:new Blob([html],{type:'text/html'})};
}
function studentSnapshot(full,group){
 const assignmentId=group.assignment_id;
 const assignment=full.staff.assignments.find(item=>item.id===assignmentId);
 const asean=isAsean(assignment);
 const evidence=full.evidence[assignmentId];
 const staff={...full.staff,
  assignments:full.staff.assignments.filter(item=>item.id===assignmentId),
  groups:[group],
  reviews:(full.staff.reviews||[]).filter(item=>item.group_id===group.id),
  exitTickets:(full.staff.exitTickets||[]).filter(item=>item.group_id===group.id),
  aseanResponses:(full.staff.aseanResponses||[]).filter(item=>item.group_id===group.id),
  aseanWritingScores:(full.staff.aseanWritingScores||[]).filter(item=>item.group_id===group.id),
  rubrics:(full.staff.rubrics||[]).filter(item=>(full.staff.reviews||[]).some(review=>review.id===item.review_id&&review.group_id===group.id)),
  publishedGalleries:[]};
 const slim=evidence?{...evidence,groups:[group],
  checkpoints:(evidence.checkpoints||[]).filter(item=>item.group_id===group.id),
  responses:(evidence.responses||[]).filter(item=>item.group_id===group.id),
  feedback:(evidence.feedback||[]).filter(item=>item.from_group===group.id||item.to_group===group.id),
  microResponses:(evidence.microResponses||[]).filter(item=>item.group_id===group.id)}:null;
 return sanitizeSnapshot({...full,staff,galleries:[],media:[],publicWorkshops:full.publicWorkshops?.[group.id]?{[group.id]:full.publicWorkshops[group.id]}:{},showcase:{publishedGalleries:[]},
  warnings:(full.warnings||[]).filter(item=>(!item.group||item.group===group.label)&&(!item.lesson||item.lesson===assignment?.title)),
  artworks:{[group.id]:full.artworks[group.id]||[]},
  groupDrafts:{[group.id]:full.groupDrafts[group.id]||null},
  live:{[assignmentId]:{session:full.live[assignmentId]?.session||null}},
  evidence:!asean&&slim?{[assignmentId]:slim}:{},
  ...(asean?{aseanWorkshops:{[group.id]:aseanStudentRecords(full,group)}}:{}),
  comparisons:{[group.id]:full.comparisons[group.id]||{before:null,after:null,groupLabel:group.label}}});
}
