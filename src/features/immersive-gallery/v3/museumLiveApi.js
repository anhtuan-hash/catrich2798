import {guestRequest} from './museumApi.js';
export const LIVE_ROUTE='/api/gallery-guest/live';
export const ART_ROUTE='/api/gallery-guest/artwork';
export async function liveStaff(action,body,params={}){
 const {supabase}=await import('../../../utils/supabase.js');
 const {data:{session},error}=await supabase.auth.getSession();
 if(error||!session?.access_token)throw new Error('Bạn cần đăng nhập tài khoản giáo viên Brian.');
 const q=new URLSearchParams({operation:action,...params});
 const response=await fetch(LIVE_ROUTE+'?'+q.toString(),{
  method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',
  headers:{Authorization:'Bearer '+session.access_token,...(body?{'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const d=await response.json().catch(()=>({error:'Máy chủ không trả về JSON hợp lệ.'}));
 if(!response.ok||d.error)throw Object.assign(new Error(d.error||'Lỗi bài dạy trực tiếp'),{status:response.status});
 return d;
}
export async function liveGuest(action,method='GET',body,csrf){
 const q=new URLSearchParams({operation:action});
 const res=await fetch(LIVE_ROUTE+'?'+q.toString(),{
  method,credentials:'same-origin',cache:'no-store',
  headers:{...(body?{'Content-Type':'application/json'}:{}),...(csrf?{'X-Gallery-CSRF':csrf}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const d=await res.json().catch(()=>({error:'Phản hồi bài học không hợp lệ.'}));
 if(!res.ok||d.error)throw Object.assign(new Error(d.error||'Không thể gửi hoạt động.'),{status:res.status});
 return d;
}
export async function artGuest(action,method='GET',body,csrf){
 const res=await fetch(ART_ROUTE+'?operation='+encodeURIComponent(action),{
  method,credentials:'same-origin',cache:'no-store',
  headers:{...(body?{'Content-Type':'application/json'}:{}),...(csrf?{'X-Gallery-CSRF':csrf}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const d=await res.json().catch(()=>({error:'Phản hồi ảnh không hợp lệ.'}));
 if(!res.ok||d.error)throw Object.assign(new Error(d.error||'Không thể xử lý ảnh.'),{status:res.status});
 return d;
}
export async function artStaff(groupId){
 const {supabase}=await import('../../../utils/supabase.js');
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)throw new Error('Cần tài khoản giáo viên.');
 const q=new URLSearchParams({operation:'list',groupId});
 const res=await fetch(ART_ROUTE+'?'+q,{
  headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'
 });
 const d=await res.json().catch(()=>({error:'Lỗi ảnh.'}));
 if(!res.ok||d.error)throw new Error(d.error||'Không thể mở ảnh.');
 return d.assets||[];
}
// Renders uploaded local JPG/PNG/WebP pixels to 8-bit canonical RGBA PNG.
// The server independently decodes every PNG, re-encodes it, and strips metadata.
export async function imageToCanvasPng(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))
  throw new Error('Chỉ hỗ trợ JPG, PNG hoặc WebP.');
 if(file.size>5000000)throw new Error('Ảnh gốc phải nhỏ hơn 5 MB.');
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width<30||bitmap.height<30||bitmap.width*bitmap.height>18000000)
   throw new Error('Kích thước ảnh không hợp lệ.');
  const max=1100,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));
  canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:false});
  if(!ctx)throw new Error('Trình duyệt không thể xử lý ảnh.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  const png=canvas.toDataURL('image/png');
  if(png.length>3800000)throw new Error('Ảnh sau xử lý vẫn quá lớn. Hãy chọn ảnh khác.');
  return png;
 }finally{bitmap.close?.();}
}
export const localMuseumFromDraft=(studio,assets)=>{
 const byId=new Map((assets||[]).map(x=>[x.id,x.image_url]));
 return {
  title:studio.title||'Our English Museum',summary:studio.summary,
  rooms:[{id:'draft-room',title:studio.title||'Our English Museum',template_key:studio.theme||'classic',
   exhibits:(studio.rooms?.[0]?.exhibits||[]).map((e,i)=>({
    ...e,id:'draft-item-'+i,status:'published',image_url:byId.get(e.asset_id)||''
   }))}]
 };
};
