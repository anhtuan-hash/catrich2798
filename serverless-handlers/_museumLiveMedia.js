import {extractYouTubeVideoId,videoTaskFor} from '../src/features/immersive-gallery/v3/museumLiveExtensions.js';

const mediaCache=new Map(),recentSearches=new Map();
const validQuery=q=>String(q||'').replace(/[\u0000-\u001F\u007F<>]/g,'').replace(/\s+/g,' ').trim().slice(0,120);
export const mediaText=(s,max)=>String(s||'').replace(/[\u0000-\u001F\u007F<>]/g,'').replace(/\s+/g,' ').trim().slice(0,max);
export const mediaId=extractYouTubeVideoId;
export function mediaBoardUpdate(session,stageIndex,patch){
 const board=session.media_board&&typeof session.media_board==='object'&&!Array.isArray(session.media_board)?session.media_board:{};
 const stage=videoTaskFor(board,stageIndex);
 const next={...stage,...patch};
 return {...board,[String(stageIndex)]:next};
}
export function mediaTask(session){return videoTaskFor(session?.media_board,session?.stage_index);}
export function searchThrottle(key){
 // Best-effort per-instance quota protection; Google Cloud API quota is the hard cap.
 const now=Date.now(),stamp=recentSearches.get(key)||[];
 const latest=stamp.filter(t=>now-t<60_000);
 if(latest.length>=6)return false;
 latest.push(now);recentSearches.set(key,latest);
 if(recentSearches.size>1500)recentSearches.clear();
 return true;
}
export async function searchVideos(rawQuery,{teacher=false}={}){
 const q=validQuery(rawQuery),key=String(process.env.YOUTUBE_API_KEY||'').trim();
 if(q.length<4)return {available:false,results:[],reason:'invalid_query'};
 if(!key)return {available:false,results:[],reason:'youtube_api_key_not_configured'};
 const cacheKey=q.toLowerCase(),found=mediaCache.get(cacheKey);
 if(found&&Date.now()-found.time<5*60_000)return {available:true,results:found.results,cached:true};
 const params=new URLSearchParams({
  part:'snippet',q,type:'video',videoEmbeddable:'true',safeSearch:'strict',
  maxResults:'6',videoDuration:'short',relevanceLanguage:'en',key
 });
 const response=await fetch('https://www.googleapis.com/youtube/v3/search?'+params,{
  method:'GET',headers:{accept:'application/json'},signal:AbortSignal.timeout(7000)
 });
 if(!response.ok)return {available:false,results:[],reason:response.status===403?'youtube_quota_or_access':'youtube_search_unavailable'};
 const data=await response.json();
 const results=(Array.isArray(data.items)?data.items:[]).map(item=>{
  const id=extractYouTubeVideoId(item?.id?.videoId);
  if(!id)return null;
  return {id,title:mediaText(item.snippet?.title,160)||'Video',
   channel:mediaText(item.snippet?.channelTitle,120)};
 }).filter(Boolean);
 mediaCache.set(cacheKey,{time:Date.now(),results});
 if(mediaCache.size>100)mediaCache.delete(mediaCache.keys().next().value);
 return {available:true,results,cached:false};
}
export const safeRefinement=value=>{
 const raw=mediaText(value,32);
 return /^[\p{L}\p{N}\s\-']{0,32}$/u.test(raw)?raw:'';
};
