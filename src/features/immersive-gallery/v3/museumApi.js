import {supabase} from '../../../utils/supabase.js';
import {buildLocalGalleryDemo} from '../gallerySampleSeed.js';
export const DEMO_GALLERY=buildLocalGalleryDemo();
export async function staffRequest(action,body){
 const {data:{session},error}=await supabase.auth.getSession();
 if(error||!session?.access_token)throw new Error('Bạn cần đăng nhập bằng tài khoản Brian được duyệt.');
 const response=await fetch('/api/gallery-staff?operation='+encodeURIComponent(action),{
  method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',
  headers:{
   Authorization:'Bearer '+session.access_token,
   ...(body?{'Content-Type':'application/json'}:{})
  },...(body?{body:JSON.stringify(body)}:{})
 });
 const value=await response.json().catch(()=>({error:'Không nhận được phản hồi từ máy chủ.'}));
 if(!response.ok)throw new Error(value.error||'Không thể thực hiện yêu cầu.');
 return value;
}
export async function guestRequest(action,method='GET',body,csrf=''){
 const response=await fetch('/api/gallery-guest?operation='+encodeURIComponent(action),{
  method,credentials:'same-origin',cache:'no-store',
  headers:{
   ...(body?{'Content-Type':'application/json'}:{}),
   ...(csrf?{'X-Gallery-CSRF':csrf}:{})
  },
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const value=await response.json().catch(()=>({error:'Không nhận được phản hồi từ máy chủ.'}));
 if(!response.ok)throw Object.assign(new Error(value.error||'Không thể thực hiện yêu cầu.'),{status:response.status});
 return value;
}
export const fmtDate=x=>x?new Date(x).toLocaleDateString('vi-VN'):'—';
export const fmtTime=x=>x?new Date(x).toLocaleString('vi-VN'):'—';
export const joinUrl=handle=>window.location.origin+window.location.pathname+'#/gallery-create?invite='+encodeURIComponent(handle);
export function saveTextFile(filename,mime,content){
 const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.download=filename;a.href=url;document.body.appendChild(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1200);
}
