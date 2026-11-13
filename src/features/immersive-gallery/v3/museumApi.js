import {DEMO_GALLERY} from './museumDemo.js';
const vietnameseDiacritics=/[àáạảãăằắặẳẵâầấậẩẫèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
export function englishMuseumError(value,fallback='The request could not be completed.'){
 const raw=String(value||'').trim();
 if(!raw)return fallback;
 if(!vietnameseDiacritics.test(raw))return raw;
 if(/mã.*(nhóm|bí mật|mời)|creator pass/i.test(raw))return 'The invitation or group passcode is invalid or has expired.';
 if(/hết hạn/i.test(raw))return 'This invitation or learning session has expired.';
 if(/quyền|truy cập/i.test(raw))return 'You do not have permission to complete this action.';
 if(/đăng nhập/i.test(raw))return 'Sign in with an authorized BRIAN account.';
 if(/đã nộp|bài nộp/i.test(raw))return 'This group submission cannot be changed in its current review state.';
 return fallback;
}
export const englishSystemGroupLabel=label=>String(label??'').replace(/^Nhóm(?=\s|$)/i,'Group');
export {DEMO_GALLERY};
export async function staffRequest(action,body){
 const {supabase}=await import('../../../utils/supabase.js');
 if(!supabase)throw new Error('BRIAN account connection is not configured.');
 const {data:{session},error}=await supabase.auth.getSession();
 if(error||!session?.access_token)throw new Error('Sign in with an authorized BRIAN account.');
 const response=await fetch('/api/gallery-staff?operation='+encodeURIComponent(action),{
  method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',
  headers:{
   Authorization:'Bearer '+session.access_token,
   ...(body?{'Content-Type':'application/json'}:{})
  },...(body?{body:JSON.stringify(body)}:{})
 });
 const value=await response.json().catch(()=>({error:'No valid response received from the server.'}));
 if(!response.ok||value.error)throw new Error(englishMuseumError(value.error,'Unable to complete this request.'));
 if(action==='dashboard'&&(!value.profile||!Array.isArray(value.assignments)||!Array.isArray(value.groups)))
  throw new Error('Invalid staff session response.');
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
 if(!response.ok||value.error)throw Object.assign(new Error(value.error||'Không thể thực hiện yêu cầu.'),{status:response.status});
 if(action==='me'&&(!value.assignment||!value.csrf||!value.groupLabel))
  throw new Error('Group session verification failed. Enter your Creator Pass again.');
 if(action==='draft'&&(!value.draft||!Number.isInteger(value.version)))
  throw new Error('Invalid group draft received from the server.');
 return value;
}
export const fmtDate=x=>x?new Date(x).toLocaleDateString('en-GB'):'—';
export const fmtTime=x=>x?new Date(x).toLocaleString('en-GB'):'—';
export const joinUrl=handle=>window.location.origin+window.location.pathname+'#/gallery-create?invite='+encodeURIComponent(handle);
export function saveTextFile(filename,mime,content){
 const blob=new Blob([content],{type:mime}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.download=filename;a.href=url;document.body.appendChild(a);a.click();a.remove();
 window.setTimeout(()=>URL.revokeObjectURL(url),1200);
}
