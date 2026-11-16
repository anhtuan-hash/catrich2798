import {ASEAN_FRAMES,isAsean} from './aseanLesson.js';
import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {CheckCircle2,Image as ImageIcon,Info,Lock,RefreshCcw,Trash2,UploadCloud} from 'lucide-react';
import {artGuest,liveGuest,imageToArtworkUpload,validateArtworkFile} from './museumLiveApi.js';
import {surveyChartPng} from './surveyChart.js';
import {surveyCitation,normalizeArtMeta} from './learningEvidence.js';
import {POSTER_PROMPTS} from './posterPrompts.js';
import './museumLive.css';
const LABELS=[['issue','The Problem'],['evidence','The Evidence'],['solution','Our Solution']];
const UPLOADED_ARTWORK_CREDIT={
 source:'AI-assisted poster created from the group’s English exhibit text under the teacher’s guidance.',
 rights:'Classroom and school project exhibition use, subject to the image tool’s terms and the school’s permissions.'
};
const applyAssetChange=(assets,oldId,newAsset)=>[
 ...(assets||[]).filter(a=>a.id!==oldId&&a.id!==newAsset?.id),
 ...(newAsset?[newAsset]:[])
];
export default function MuseumArtworkStudio({studio,update,saveArtwork=update,csrf,disabled=false,uploadEnabled=false,language='vi',onAssets,onBusy,lessonTemplate,frameEditor}){
 const asean=isAsean(lessonTemplate);
 const labels=asean?ASEAN_FRAMES.map(f=>[f.key,f.label]):LABELS;
 const [assets,setAssets]=useState(null),[busySlot,setBusySlot]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const [pending,setPending]=useState(null);
 const refreshId=useRef(0);
 const changesDuringRefresh=useRef(null);
 const busyRef=useRef(false);
 const previewUrl=pending?.url;
 const t=(vi,en)=>language==='en'?en:vi;
 useEffect(()=>{if(assets)onAssets?.(assets);},[assets,onAssets]);
 useEffect(()=>()=>{if(previewUrl)URL.revokeObjectURL(previewUrl);},[previewUrl]);
 const refresh=useCallback(async()=>{
  if(busyRef.current)return;
  const id=++refreshId.current;
  const changes=[];
  changesDuringRefresh.current=changes;
  try{
   const result=await artGuest('list');
   if(id===refreshId.current)setAssets(changes.reduce(
    (all,[oldId,newAsset])=>applyAssetChange(all,oldId,newAsset),result.assets||[]));
  }catch(e){if(id===refreshId.current)setError(e.message);}
  finally{if(id===refreshId.current)changesDuringRefresh.current=null;}
 },[]);
 useEffect(()=>{
  refresh();
  return()=>{refreshId.current++;};
 },[refresh]);
 const lookup=useMemo(()=>new Map((assets||[]).map(a=>[a.id,a])),[assets]);
 const updateAssets=(oldId,newAsset)=>{
  changesDuringRefresh.current?.push([oldId,newAsset]);
  setAssets(previous=>applyAssetChange(previous,oldId,newAsset));
 };
 const upload=async(key,file)=>{
  if(!file||busyRef.current||disabled)return;
  busyRef.current=true;onBusy?.(true);
  setBusySlot(key);setError('');setNotice('');
  try{
   if(!uploadEnabled)throw new Error(t('Tải ảnh chưa được giáo viên/nhà trường bật sau nghiệm thu.','Image uploading is awaiting school authorization.'));
   validateArtworkFile(file);
   const replaceId=studio.artworks?.[key]||null;
   setPending({key,url:URL.createObjectURL(file),name:file.name,uploading:false});
   const jpeg=await imageToArtworkUpload(file);
   setPending(current=>({...current,uploading:true}));
   const out=await artGuest('upload','POST',{jpeg,filename:file.name,replaceId},csrf);
   saveArtwork(d=>({
    ...d,
    artworks:{...d.artworks,[key]:out.asset.id},
    artMeta:{...normalizeArtMeta(d.artMeta),[key]:{...d.artMeta?.[key],...(asean?{source:'',rights:'',alt:''}:UPLOADED_ARTWORK_CREDIT)}}
   }));
   updateAssets(replaceId,out.asset);
   setNotice(t('Đã tải tranh lên kho riêng tư và sẵn sàng treo trong phòng 3D.','Artwork is privately stored and ready for the 3D wall.'));
  }catch(e){setError(e.message);}finally{busyRef.current=false;setPending(null);setBusySlot(null);onBusy?.(false);}
 };
 const pinSurvey=async()=>{
  if(busyRef.current||disabled||!uploadEnabled)return;
  busyRef.current=true;onBusy?.(true);
  setBusySlot('evidence');setError('');setNotice('');
  try{const {snapshot}=await liveGuest('results');
   if(studio.artworks?.evidence){
    saveArtwork(d=>({...d,survey:snapshot}));
    setNotice(t('Đã gắn số liệu khảo sát vào The Evidence bên cạnh poster.','The frozen survey is attached to The Evidence beside your poster.'));
    return;
   }
   const png=surveyChartPng(snapshot);
   const replaceId=studio.artworks?.evidence||null;
   const out=await artGuest('upload','POST',{png,filename:'Class group priority survey.png',replaceId},csrf);
   saveArtwork(d=>({...d,survey:snapshot,artworks:{...d.artworks,evidence:out.asset.id},artMeta:{...normalizeArtMeta(d.artMeta),evidence:{...normalizeArtMeta(d.artMeta).evidence,alt:'Bar chart showing '+snapshot.n+' group priority votes. '+snapshot.options.map(o=>o.label+': '+o.count).join('; '),source:surveyCitation(snapshot),rights:'Original class survey chart; group totals only.'}}}));
   updateAssets(replaceId,out.asset);
   setNotice(t('Đã gắn biểu đồ thật. Nhóm tự viết phần diễn giải bằng tiếng Anh.','Frozen chart attached. Write your own English interpretation.'));
  }catch(e){setError(e.message);}finally{busyRef.current=false;setBusySlot(null);onBusy?.(false);}
 };
 const remove=async(key)=>{
  const id=studio.artworks?.[key];if(!id||busyRef.current||disabled||!window.confirm(t('Xóa tranh này khỏi nhóm?','Delete this group artwork?')))return;
  busyRef.current=true;onBusy?.(true);
  setBusySlot(key);setError('');setNotice('');
  try{await artGuest('remove','POST',{assetId:id},csrf);
    saveArtwork(d=>({...d,artworks:{...(d.artworks||{}),[key]:null}}));
    updateAssets(id);
  }catch(e){setError(e.message);}finally{busyRef.current=false;setBusySlot(null);onBusy?.(false);}
 };
 return <section className="bml-surface bml-artwork-studio" data-testid="museum-artwork-studio">
  <div className="bml-section-head"><div>{!asean&&<div className="bml-overline">ARTWORK STUDIO · 3D MUSEUM</div>}
   <h2>{asean?'Travel photographs':t('Chuẩn bị và tải poster','Prepare and upload your posters')}</h2>
   <p>{t('Ảnh JPG/PNG/WebP sẽ được xử lý thành PNG an toàn rồi tự treo trong bảo tàng 3D.','JPG, PNG and WebP images are sanitized to PNG and automatically framed on the museum walls.')}</p></div>
   <button type="button" className="bml-icon-btn" disabled={!!busySlot} onClick={refresh} title={t('Cập nhật ảnh','Refresh art')}><RefreshCcw size={20}/></button></div>
  {!uploadEnabled?<div className="bml-banner bml-warning-banner"><Lock size={20}/>
   {t('Chức năng tải ảnh đang được giữ khóa tới khi hoàn tất kiểm thử và Admin bật quyền tải ảnh.','Image upload remains locked until media QA and Admin approval.')}</div>:null}
  {!asean?<button type="button" className="bml-primary" disabled={disabled||!uploadEnabled||!!busySlot} onClick={pinSurvey}>{t('Gắn biểu đồ khảo sát đã chốt vào Evidence','Attach frozen survey chart to Evidence')}</button>:null}
  <div className="bml-student-artwork-grid">{labels.map(([key,label])=>{
   const id=studio.artworks?.[key],asset=lookup.get(id),loading=busySlot===key;
   const preview=pending?.key===key?pending:null;
   const imageUrl=preview?.url||asset?.image_url,filename=preview?.name||asset?.original_name;
   const uploadStatus=preview?.uploading?t('Đang tải lên…','Uploading…'):t('Đang xử lý…','Processing…');
   return <div className="bml-artwork-slot" key={key}>
    <strong>{label}</strong>
    {!asean?<details className="bml-student-exhibit">
     <summary>{t('Viết prompt và kiểm duyệt poster','Write and check your poster prompt')}</summary>
     <p lang="en">{POSTER_PROMPTS[key]}</p>
     <p>{t('Dùng nội dung của nhóm, bỏ thông tin nhận diện. Đối chiếu ảnh với bản gốc. Sau khi tải, chỉnh mục nguồn ảnh cho đúng người tạo và công cụ. Chỉ điền phần nhóm thực sự thực hiện.','Use your group’s text and omit personal information. Compare the image with the original. After uploading, edit the image source to credit the actual creator and tool. Record only the work your group did.')}</p>
     {[
      ['posterPrompt',900,t('Prompt tiếng Anh đã dùng','English prompt used')],
      ['posterCheck',400,t('Nhóm đã kiểm tra hoặc chỉnh gì?','What did your group check or change?')]
     ].map(([field,max,fieldLabel])=><label className="bml-full-field" key={field}>{fieldLabel}
      <textarea lang="en" rows={3} maxLength={max} disabled={disabled} value={studio.artMeta?.[key]?.[field]||''}
       onChange={e=>{const value=e.target.value;update(d=>({...d,artMeta:{...d.artMeta,[key]:{...d.artMeta?.[key],[field]:value}}}));}}/>
     </label>)}
    </details>:null}
    {imageUrl?<img src={imageUrl} alt={label+' — '+filename} referrerPolicy="no-referrer" loading={preview?'eager':'lazy'}/>:
      <div className="bml-artwork-missing"><ImageIcon size={29}/>{t('Chưa tải tranh','No image yet')}</div>}
    <span className="bml-artwork-caption">{filename||t('Tranh do nhóm tự tạo hoặc được phép sử dụng','Your own art or licensed material')}</span>
    <label aria-disabled={disabled||!uploadEnabled||!!busySlot}><UploadCloud size={17}/> {loading?uploadStatus:asean?(asset?'Replace photo':'Upload photo'):asset?t('Thay tranh','Replace art'):t('Tải tranh lên','Upload art')}
      <input type="file" accept="image/jpeg,image/png,image/webp" aria-label={asean?'Upload photo for '+label:undefined} disabled={disabled||!uploadEnabled||!!busySlot}
       onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file)upload(key,file);}}/>
    </label>
    {preview?<span className="bml-artwork-caption" role="status">{t('Xem trước trên thiết bị. Ảnh đang được lưu vào kho riêng tư.','Local preview. Saving to private storage.')}</span>:null}
    {frameEditor?.(key)}
    {id?<div className="bml-art-meta">{[['alt',t('Mô tả ảnh / Alt text','Alt text')],['source',t('Nguồn ảnh / Source','Image source')],['rights',t('Quyền sử dụng / Permission','Usage permission')]].map(([f,label])=><label key={f}>{label}{f==='source'?' · Required for submission':''}<input maxLength={f==='alt'?500:f==='source'?600:300} disabled={disabled} value={studio.artMeta?.[key]?.[f]||''} placeholder={f==='source'?'Actual creator, class group, teacher or source URL':undefined} onChange={e=>{const value=e.target.value;update(d=>({...d,artMeta:{...normalizeArtMeta(d.artMeta),[key]:{...normalizeArtMeta(d.artMeta)[key],[f]:value}}}));}}/></label>)}{!String(studio.artMeta?.[key]?.source||'').trim()?
    <p className="bml-artwork-source-required" role="status">Image source is missing. Name the actual creator of this image. For work made by the group, say so; for teacher-provided or third-party art, credit its real origin. Do not invent a source.</p>:null}</div>:null}
    {id&&asset?<button type="button" className="bml-outline" disabled={disabled||!!busySlot} onClick={()=>remove(key)}>
      <Trash2 size={16}/>{t('Xóa ảnh','Remove image')}</button>:null}
   </div>;})}</div>
  <div className="bml-banner bml-info-banner"><Info size={17}/>{t(
    'Ảnh tối đa 5 MB trước xử lý; mỗi nhóm tối đa 6 ảnh. Không tải chân dung/giấy tờ học sinh; ghi rõ nguồn trong phần thuyết minh tiếng Anh.',
    'Up to 5 MB original per image, 6 images per group. Avoid student identities and credit the image source in your English captions.'
  )}</div>
  {error?<div className="bml-banner bml-danger-banner" role="alert">{error}</div>:null}
  {notice?<div className="bml-banner bml-success-banner" role="status"><CheckCircle2 size={17}/>{notice}</div>:null}
 </section>;
}
