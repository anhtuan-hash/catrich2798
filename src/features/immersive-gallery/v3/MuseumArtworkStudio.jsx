import React,{useEffect,useMemo,useState} from 'react';
import {CheckCircle2,Image as ImageIcon,ImagePlus,Info,Lock,RefreshCcw,Trash2,UploadCloud} from 'lucide-react';
import {artGuest,imageToCanvasPng} from './museumLiveApi.js';
import './museumLive.css';
const LABELS=[['issue','The Problem'],['evidence','The Evidence'],['solution','Our Solution']];
export default function MuseumArtworkStudio({studio,update,csrf,disabled=false,uploadEnabled=false,language='vi',onAssets}){
 const [assets,setAssets]=useState([]),[busySlot,setBusySlot]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState('');
 const t=(vi,en)=>language==='en'?en:vi;
 const refresh=async()=>{try{const result=await artGuest('list');setAssets(result.assets||[]);
   onAssets?.(result.assets||[]);}catch(e){setError(e.message);}};
 useEffect(()=>{let active=true;artGuest('list').then(r=>{if(active){setAssets(r.assets||[]);onAssets?.(r.assets||[]);}}).catch(e=>{if(active)setError(e.message);});
  return()=>{active=false;};},[]);
 const lookup=useMemo(()=>new Map(assets.map(a=>[a.id,a])),[assets]);
 const upload=async(key,file)=>{
  if(!file)return;
  setBusySlot(key);setError('');setNotice('');
  try{
   if(!uploadEnabled)throw new Error(t('Tải ảnh chưa được giáo viên/nhà trường bật sau nghiệm thu.','Image uploading is awaiting school authorization.'));
   const png=await imageToCanvasPng(file);
   const out=await artGuest('upload','POST',{png,filename:file.name,replaceId:studio.artworks?.[key]||null},csrf);
   update(d=>({...d,artworks:{...(d.artworks||{}),[key]:out.asset.id}}));
   await refresh();
   setNotice(t('Đã tải tranh lên kho riêng tư và sẵn sàng treo trong phòng 3D.','Artwork is privately stored and ready for the 3D wall.'));
  }catch(e){setError(e.message);}finally{setBusySlot(null);}
 };
 const remove=async(key)=>{
  const id=studio.artworks?.[key];if(!id||!window.confirm(t('Xóa tranh này khỏi nhóm?','Delete this group artwork?')))return;
  setBusySlot(key);setError('');
  try{await artGuest('remove','POST',{assetId:id},csrf);
    update(d=>({...d,artworks:{...(d.artworks||{}),[key]:null}}));
    await refresh();
  }catch(e){setError(e.message);}finally{setBusySlot(null);}
 };
 return <section className="bml-surface bml-artwork-studio" data-testid="museum-artwork-studio">
  <div className="bml-section-head"><div><div className="bml-overline">ARTWORK STUDIO · 3D MUSEUM</div>
   <h2>{t('Tải tranh, poster và hình ảnh thật','Upload real student artwork')}</h2>
   <p>{t('Ảnh JPG/PNG/WebP sẽ được xử lý thành PNG an toàn rồi tự treo trong bảo tàng 3D.','JPG, PNG and WebP images are sanitized to PNG and automatically framed on the museum walls.')}</p></div>
   <button type="button" className="bml-icon-btn" onClick={refresh} title={t('Cập nhật ảnh','Refresh art')}><RefreshCcw size={20}/></button></div>
  {!uploadEnabled?<div className="bml-banner bml-warning-banner"><Lock size={20}/>
   {t('Chức năng tải ảnh đang được giữ khóa tới khi hoàn tất kiểm thử và Admin bật quyền tải ảnh.','Image upload remains locked until media QA and Admin approval.')}</div>:null}
  <div className="bml-student-artwork-grid">{LABELS.map(([key,label])=>{
   const id=studio.artworks?.[key],asset=lookup.get(id),loading=busySlot===key;
   return <div className="bml-artwork-slot" key={key}>
    <strong>{label}</strong>
    {asset?.image_url?<img src={asset.image_url} alt={label+' — '+asset.original_name} referrerPolicy="no-referrer" loading="lazy"/>:
      <div className="bml-artwork-missing"><ImageIcon size={29}/>{t('Chưa tải tranh','No image yet')}</div>}
    <span className="bml-artwork-caption">{asset?.original_name||t('Tranh do nhóm tự tạo hoặc được phép sử dụng','Your own art or licensed material')}</span>
    <label aria-disabled={disabled||!uploadEnabled||loading}><UploadCloud size={17}/> {loading?t('Đang xử lý…','Processing…'):asset?t('Thay tranh','Replace art'):t('Tải tranh lên','Upload art')}
      <input type="file" accept="image/jpeg,image/png,image/webp" disabled={disabled||!uploadEnabled||loading}
       onChange={e=>{const file=e.currentTarget.files?.[0];e.currentTarget.value='';if(file)upload(key,file);}}/>
    </label>
    {id&&asset?<button type="button" className="bml-outline" disabled={disabled||loading} onClick={()=>remove(key)}>
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
