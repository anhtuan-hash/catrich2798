import {createClient} from '@supabase/supabase-js';
import {supabase} from '../../utils/supabase.js';

const environment=import.meta.env||{};
const url=String(environment.VITE_GALLERY_SUPABASE_URL||'').trim();
const key=String(environment.VITE_GALLERY_SUPABASE_PUBLISHABLE_KEY||'').trim();
let cached;
let pending;

async function getGalleryAccessToken(){
 const {data,error}=await supabase.auth.getSession();
 if(error)throw error;
 const siteToken=data?.session?.access_token;
 if(!siteToken){
  cached=undefined;
  return null;
 }
 if(cached?.siteToken===siteToken&&cached.expiresAt>Date.now()/1000+10)
  return cached.accessToken;
 if(pending?.siteToken===siteToken)return pending.promise;

 const request={siteToken};
 request.promise=(async()=>{
  const response=await fetch('/api/gallery-staff?operation=database-session',{
   method:'POST',headers:{Authorization:'Bearer '+siteToken},cache:'no-store'
  });
  if(!response.ok)throw new Error('Không thể mở phiên Gallery.');
  const {accessToken,expiresAt}=await response.json();
  if(typeof accessToken!=='string'||!Number.isFinite(expiresAt))
   throw new Error('Phiên Gallery không hợp lệ.');
  if(pending===request)cached={siteToken,accessToken,expiresAt};
  return accessToken;
 })().finally(()=>{
  if(pending===request)pending=undefined;
 });
 pending=request;
 return request.promise;
}

export const gallerySupabase=url||key
 ?url&&key&&supabase?createClient(url,key,{accessToken:getGalleryAccessToken}):null
 :supabase;
