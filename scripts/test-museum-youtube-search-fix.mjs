import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {searchVideos} from '../serverless-handlers/_museumLiveMedia.js';

const sampleId='jNQXAC9IVRw';
const resultItem={
 id:{videoId:sampleId},
 snippet:{title:'NASA explains the greenhouse effect',channelTitle:'NASA',publishedAt:'2025-01-01T00:00:00Z'}
};
const fakeHtml=`<script>var ytInitialData = {"contents":{"videoRenderer":{"videoId":"${sampleId}","title":{"runs":[{"text":"NASA greenhouse effect"}]},"ownerText":{"runs":[{"text":"NASA"}]}}}};</script>`;

test('Video Research Studio official API, fallback, and failure states',async()=>{
 const previousFetch=globalThis.fetch;
 const previousKey=process.env.YOUTUBE_API_KEY;
 try{
  process.env.YOUTUBE_API_KEY='FAKE_TEST_KEY';
  let apiRequests=0;
  globalThis.fetch=async url=>{
   const u=new URL(String(url));
   assert.equal(u.hostname,'www.googleapis.com');
   assert.equal(u.searchParams.get('videoEmbeddable'),'true');
   assert.equal(u.searchParams.get('safeSearch'),'strict');
   assert.equal(u.searchParams.get('type'),'video');
   assert.equal(u.searchParams.has('videoDuration'),false);
   apiRequests++;
   return {ok:true,status:200,json:async()=>({items:[resultItem]})};
  };
  const official=await searchVideos('NASA climate greenhouse effect',{teacher:true});
  assert.equal(official.available,true);
  assert.equal(official.source,'youtube-data-api');
  assert.equal(official.results[0].id,sampleId);
  assert.equal(official.results[0].channel,'NASA');
  assert.equal(apiRequests,1);
  const cached=await searchVideos('NASA climate greenhouse effect',{teacher:true});
  assert.equal(cached.cached,true);
  assert.equal(apiRequests,1);

  let fallbackRequests=0;
  globalThis.fetch=async url=>{
   const u=new URL(String(url));
   fallbackRequests++;
   if(u.hostname==='www.googleapis.com')return {
    ok:false,status:403,json:async()=>({error:{message:'quota exceeded',errors:[{reason:'quotaExceeded'}]}})
   };
   assert.equal(u.hostname,'www.youtube.com');
   return {ok:true,status:200,text:async()=>fakeHtml};
  };
  const fallback=await searchVideos('climate research evidence',{teacher:true});
  assert.equal(fallback.available,true);
  assert.equal(fallback.source,'youtube-html-fallback');
  assert.equal(fallback.results[0].id,sampleId);
  assert.equal(fallbackRequests,2);

  globalThis.fetch=async url=>{
   if(String(url).includes('googleapis.com'))return {
    ok:false,status:403,json:async()=>({error:{message:'quota exceeded',errors:[{reason:'quotaExceeded'}]}})
   };
   throw new Error('Fallback blocked');
  };
  const quota=await searchVideos('greenhouse gas quota scenario',{teacher:true});
  assert.equal(quota.available,false);
  assert.equal(quota.reason,'youtube_quota_exceeded');
  assert.deepEqual(quota.results,[]);

  delete process.env.YOUTUBE_API_KEY;
  globalThis.fetch=async()=>{throw new Error('unavailable');};
  const noKey=await searchVideos('energy emissions no key',{teacher:true});
  assert.equal(noKey.available,false);
  assert.equal(noKey.reason,'youtube_api_key_not_configured');
 }finally{
  globalThis.fetch=previousFetch;
  if(previousKey===undefined)delete process.env.YOUTUBE_API_KEY;
  else process.env.YOUTUBE_API_KEY=previousKey;
 }
});

test('teacher YouTube button stays interactive while saving a task; guest search remains scoped',()=>{
 const ui=fs.readFileSync('src/features/immersive-gallery/v3/MuseumVideoLab.jsx','utf8');
 const server=fs.readFileSync('serverless-handlers/museum-live.js','utf8');
 assert.match(ui,/disabled=\{searching\|\|query\.trim\(\)\.length<4\}/);
 assert.match(ui,/setSearching\(true\)/);
 assert.match(ui,/setSaving\(true\)/);
 assert.match(ui,/youtube_quota_exceeded/);
 assert.match(ui,/youtube_api_forbidden/);
 assert.match(server,/scopedStaff\(ctx,id\)/);
 assert.match(server,/searchThrottle\('teacher-'\+ctx\.user\.id\)/);
 assert.match(server,/if\(!task\.query\)throw fail\(423/);
});
