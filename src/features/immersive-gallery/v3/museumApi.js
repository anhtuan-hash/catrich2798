import {getMuseumOffline} from './offlineAccess.js';
import {DEMO_GALLERY} from './museumDemo.js';
import {PUBLIC_WORKSHOP_OPERATION} from './aseanPublicWorkshop.js';
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
 if(getMuseumOffline())return getMuseumOffline().staff(action,body);
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
 if(!response.ok||value.error){
  // Class creation does not validate an existing student invitation.
  const message=action==='create-assignment'
   ?value.error||'Unable to create the lesson. Please try again.'
   :englishMuseumError(value.error,'Unable to complete this request.');
  throw Object.assign(new Error(message),{code:value.code});
 }
 if(action==='dashboard'&&(!value.profile||!Array.isArray(value.assignments)||!Array.isArray(value.groups)))
  throw new Error('Invalid staff session response.');
 return value;
}
const PUBLIC_STAFF_GET=new Set(['dashboard','showcase-state']);
const PUBLIC_STAFF_POST=new Set(['showcase-exhibition']);
const publicDenied='Public visitors can browse this museum, but cannot add, edit, or delete.';
export async function publicStaffRequest(action,body){
 if(getMuseumOffline())return getMuseumOffline().staff(action,body);
 if(body?!PUBLIC_STAFF_POST.has(action):!PUBLIC_STAFF_GET.has(action))throw new Error(publicDenied);
 const response=await fetch('/api/gallery-staff?operation='+encodeURIComponent(action),{
  method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',
  headers:{'X-Museum-Public':'1',...(body?{'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const value=await response.json().catch(()=>({error:'No valid response received from the server.'}));
 if(!response.ok||value.error)throw new Error(englishMuseumError(value.error,publicDenied));
 if(action==='dashboard'&&(!value.profile||!Array.isArray(value.assignments)||!Array.isArray(value.groups)))
  throw new Error('Invalid public museum response.');
 return {...value,publicReadOnly:true};
}
export async function getMuseumInviteInfo(handle){
 const response=await fetch('/api/gallery-guest?operation=invite-info&handle='+encodeURIComponent(handle),{
  method:'GET',credentials:'same-origin',cache:'no-store'
 });
 if(!response.ok)throw new Error('Invitation not available.');
 const value=await response.json().catch(()=>null);
 if(!value||typeof value.quickAccessEnabled!=='boolean'||!value.groupLabel)
  throw new Error('Invitation not available.');
 return value;
}
export async function readPublicWorkshop(groupId, {section,signal}={}){
 const params=new URLSearchParams({operation:PUBLIC_WORKSHOP_OPERATION,groupId});
 if(section)params.set('section',section);
 const response=await fetch('/api/gallery-staff?'+params,{
  credentials:'omit',cache:'no-store',signal,
 });
 if(!response.ok)throw new Error('Published workshop unavailable.');
 return response.json();
}
export function museumInviteHandle(){
 if(typeof window==='undefined')return '';
 const [route,query]=window.location.hash.split('?');
 if(route!=='#/gallery-create')return '';
 const raw=new URLSearchParams(query||'').get('invite')||'';
 return raw.match(/^[A-Za-z0-9_-]{16,80}/)?.[0]||'';
}
export function museumGuestInviteHeader(){
 const handle=museumInviteHandle();
 const [route,query]=typeof window==='undefined'?[]:window.location.hash.split('?');
 const lesson=route==='#/gallery-create'?new URLSearchParams(query||'').get('lesson'):null;
 return {...(handle?{'X-Museum-Invite':handle}:{}),...(lesson?{'X-Museum-Lesson':lesson}:{})};
}
export async function guestRequest(action,method='GET',body,csrf=''){
 if(getMuseumOffline())return getMuseumOffline().guest(action,method,body);
 const response=await fetch('/api/gallery-guest?operation='+encodeURIComponent(action),{
  method,credentials:'same-origin',cache:'no-store',
  headers:{
   ...(body?{'Content-Type':'application/json'}:{}),
   ...(csrf?{'X-Gallery-CSRF':csrf}:{}),
   ...museumGuestInviteHeader()
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
