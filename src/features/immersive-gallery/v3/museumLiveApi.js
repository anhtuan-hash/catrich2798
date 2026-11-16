import {getMuseumOffline} from './offlineAccess.js';
import {guestRequest,englishMuseumError,museumGuestInviteHeader} from './museumApi.js';
export const LIVE_ROUTE='/api/gallery-guest/live';
export const ART_ROUTE='/api/gallery-guest/artwork';
export async function liveStaff(action,body,params={}){
 if(getMuseumOffline())return getMuseumOffline().liveStaff(action,body,params);
 const {supabase}=await import('../../../utils/supabase.js');
 const {data:{session},error}=await supabase.auth.getSession();
 if(error||!session?.access_token)throw new Error('Sign in with your BRIAN teacher account.');
 const q=new URLSearchParams({operation:action,...params});
 const response=await fetch(LIVE_ROUTE+'?'+q.toString(),{
  method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',
  headers:{Authorization:'Bearer '+session.access_token,...(body?{'Content-Type':'application/json'}:{})},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const d=await response.json().catch(()=>({error:'The server returned an invalid response.'}));
 if(!response.ok||d.error)throw Object.assign(new Error(englishMuseumError(d.error,'Live lesson request failed.')),{status:response.status});
 return d;
}
const PUBLIC_LIVE_READS=new Set(['state','evidence','checkpoint-compare','group-gallery']);
export async function publicLiveStaff(action,body,params={}){
 if(body||!PUBLIC_LIVE_READS.has(action))
  throw new Error('Public visitors can browse this museum, but cannot add, edit, or delete.');
 if(getMuseumOffline())return getMuseumOffline().liveStaff(action,null,params);
 const q=new URLSearchParams({operation:action,...params});
 const response=await fetch(LIVE_ROUTE+'?'+q.toString(),{
  method:'GET',credentials:'same-origin',cache:'no-store',headers:{'X-Museum-Public':'1'}
 });
 const d=await response.json().catch(()=>({error:'The server returned an invalid response.'}));
 if(!response.ok||d.error)throw Object.assign(new Error(englishMuseumError(d.error,'Live lesson request failed.')),{status:response.status});
 return d;
}
export async function liveGuest(action,method='GET',body,csrf,params={}){
 if(getMuseumOffline())return getMuseumOffline().liveGuest(action,method,body,params);
 const q=new URLSearchParams({operation:action,...params});
 const res=await fetch(LIVE_ROUTE+'?'+q.toString(),{
  method,credentials:'same-origin',cache:'no-store',
  headers:{...(body?{'Content-Type':'application/json'}:{}),...(csrf?{'X-Gallery-CSRF':csrf}:{}),...museumGuestInviteHeader()},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const d=await res.json().catch(()=>({error:'Invalid live lesson response.'}));
 if(!res.ok||d.error)throw Object.assign(new Error(englishMuseumError(d.error,'Unable to submit the activity.')),{status:res.status});
 return d;
}
export async function artGuest(action,method='GET',body,csrf){
 if(getMuseumOffline())return getMuseumOffline().artGuest(action,method,body);
 const res=await fetch(ART_ROUTE+'?operation='+encodeURIComponent(action),{
  method,credentials:'same-origin',cache:'no-store',
  headers:{...(body?{'Content-Type':'application/json'}:{}),...(csrf?{'X-Gallery-CSRF':csrf}:{}),...museumGuestInviteHeader()},
  ...(body?{body:JSON.stringify(body)}:{})
 });
 const d=await res.json().catch(()=>({error:'Invalid artwork response.'}));
 if(!res.ok||d.error)throw Object.assign(new Error(englishMuseumError(d.error,'Unable to process this image.')),{status:res.status});
 return d;
}
export async function artStaff(groupId){
 if(getMuseumOffline())return getMuseumOffline().artStaff(groupId);
 const {supabase}=await import('../../../utils/supabase.js');
 const {data:{session}}=await supabase.auth.getSession();
 if(!session?.access_token)throw new Error('Teacher account required.');
 const q=new URLSearchParams({operation:'list',groupId});
 const res=await fetch(ART_ROUTE+'?'+q,{
  headers:{Authorization:'Bearer '+session.access_token},cache:'no-store'
 });
 const d=await res.json().catch(()=>({error:'Artwork request failed.'}));
 if(!res.ok||d.error)throw new Error(englishMuseumError(d.error,'Unable to open this image.'));
 return d.assets||[];
}
export function validateArtworkFile(file){
 if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))
  throw new Error('Only JPG, PNG or WebP images are supported.');
 if(file.size>5000000)throw new Error('The original image must be smaller than 5 MB.');
}

const MAX_UPLOAD_JPEG_BYTES=600000;
function encodeArtworkJpeg(canvas,quality){
 return new Promise((resolve,reject)=>{
  canvas.toBlob(blob=>{
   if(!blob||blob.type!=='image/jpeg'){reject(new Error('The browser cannot encode this image.'));return;}
   if(blob.size>MAX_UPLOAD_JPEG_BYTES){resolve(null);return;}
   const reader=new FileReader();
   reader.onload=()=>resolve(reader.result);
   reader.onerror=()=>reject(new Error('The browser cannot read the processed image.'));
   reader.readAsDataURL(blob);
  },'image/jpeg',quality);
 });
}

// Use a smaller JPEG for transit. The private gallery still stores validated PNGs.
export async function imageToArtworkUpload(file){
 validateArtworkFile(file);
 const bitmap=await createImageBitmap(file);
 try{
  if(bitmap.width<30||bitmap.height<30||bitmap.width*bitmap.height>18000000)
   throw new Error('Invalid image dimensions.');
  const max=1100,scale=Math.min(1,max/Math.max(bitmap.width,bitmap.height));
  const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));
  canvas.height=Math.max(1,Math.round(bitmap.height*scale));
  const ctx=canvas.getContext('2d',{alpha:false,willReadFrequently:false});
  if(!ctx)throw new Error('The browser cannot process this image.');
  ctx.fillStyle='#fff';ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);
  for(const quality of [0.92,0.85,0.75,0.6]){
   const jpeg=await encodeArtworkJpeg(canvas,quality);
   if(jpeg)return jpeg;
  }
  throw new Error('This image is too complex for safe upload. Try a different image.');
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
