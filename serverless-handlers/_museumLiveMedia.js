import {extractYouTubeVideoId,videoTaskFor} from '../src/features/immersive-gallery/v3/museumLiveExtensions.js';
import {searchYoutubeCatalog} from './_youtube-search.js';

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
  const q=validQuery(rawQuery);
  if(q.length<4)return {available:false,results:[],reason:'invalid_query'};
  const cacheKey=q.toLowerCase(),found=mediaCache.get(cacheKey);
  if(found&&Date.now()-found.time<5*60_000)
    return {available:true,results:found.results,source:found.source,cached:true};
  try{
    const catalogue=await searchYoutubeCatalog(q,teacher?10:8,{embeddable:true,strict:true});
    const results=catalogue.results.map(v=>({
      id:extractYouTubeVideoId(v.videoId),
      title:mediaText(v.title,160)||'YouTube video',
      channel:mediaText(v.channelTitle,120)
    })).filter(v=>v.id);
    mediaCache.set(cacheKey,{time:Date.now(),results,source:catalogue.source});
    if(mediaCache.size>100)mediaCache.delete(mediaCache.keys().next().value);
    return {available:true,results,source:catalogue.source,cached:false};
  }catch(error){
    return {available:false,results:[],reason:error?.code||'youtube_search_unavailable'};
  }
}
export const safeRefinement=value=>{
 const raw=mediaText(value,32);
 return /^[\p{L}\p{N}\s\-']{0,32}$/u.test(raw)?raw:'';
};
