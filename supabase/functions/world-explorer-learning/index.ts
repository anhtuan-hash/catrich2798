import { createClient } from 'npm:@supabase/supabase-js@2.57.2';
import { buildLearningPack, sha256 } from './engine.mjs';

const projectUrl=Deno.env.get('SUPABASE_URL')||'';
const serviceKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
const db=createClient(projectUrl,serviceKey,{auth:{persistSession:false,autoRefreshToken:false}});

function result(data,status=200){return Response.json(data,{status,headers:{'Cache-Control':'no-store'}});}
async function claim(job){
 const now=new Date().toISOString();
 const expired=job.status==='processing';
 let call=db.from('world_explorer_learning_jobs')
   .update({status:'processing',attempts:job.attempts+1,
     locked_until:new Date(Date.now()+3*60_000).toISOString(),updated_at:now,last_error:null})
   .eq('id',job.id);
 call=expired?call.eq('status','processing').lt('locked_until',now):call.eq('status','pending');
 const {data,error}=await call.select('id').maybeSingle();
 if(error)throw error;
 return Boolean(data);
}
async function handleJob(job){
 if(!await claim(job))return {skipped:true,reason:'already_claimed'};
 try{
  const {data:article,error:articleError}=await db.from('world_explorer_publications')
   .select('id,body_en,title_en,is_visible').eq('id',job.publication_id).single();
  if(articleError||!article?.is_visible||String(article.body_en||'').length<350)throw new Error('Missing qualified published English text');
  const hash=await sha256(article.body_en);
  const pack=buildLearningPack(article);
  if(!pack.validation_summary.evidence_verified)throw new Error('Evidence validation failed');
  const version=Math.max(1,job.requested_version||1);
  // Existing packs are never modified: preserve attempts referencing earlier versions.
  const {data:exists,error:existingError}=await db.from('world_explorer_learning_packs')
   .select('id,status').eq('publication_id',article.id).eq('content_hash',hash)
   .eq('version',version).maybeSingle();
  if(existingError)throw existingError;
  let packId=exists?.id;
  if(!packId){
   const {data:newPack,error:packError}=await db.from('world_explorer_learning_packs').insert({
    publication_id:article.id,content_hash:hash,version,status:'processing',
    vocabulary:pack.vocabulary,grammar:pack.grammar,question_count:pack.question_count,
    quality_score:pack.quality_score,validation_summary:pack.validation_summary
   }).select('id').single();
   if(packError)throw packError;
   packId=newPack.id;
  }
  if(!exists){
   if(pack.questions.length){
    const records=pack.questions.map(q=>({...q,learning_pack_id:packId}));
    const {error:questionsError}=await db.from('world_explorer_learning_questions').insert(records);
    if(questionsError)throw questionsError;
   }
  }else if(exists.status==='processing'){
   // Retry of an interrupted insert; idempotent UUIDs might differ, so inspect count.
   const {count,error:countError}=await db.from('world_explorer_learning_questions')
     .select('id',{head:true,count:'exact'}).eq('learning_pack_id',packId);
   if(countError)throw countError;
   if((count||0)===0&&pack.questions.length){
     const {error:insertError}=await db.from('world_explorer_learning_questions')
       .insert(pack.questions.map(q=>({...q,learning_pack_id:packId})));
     if(insertError)throw insertError;
   }
  }
  const {count:actual,error:actualError}=await db.from('world_explorer_learning_questions')
   .select('id',{count:'exact',head:true}).eq('learning_pack_id',packId);
  if(actualError)throw actualError;
  if(actual!==pack.question_count)throw new Error('Question count mismatch');
  const {error:finishError}=await db.from('world_explorer_learning_packs').update({
   status:pack.status,vocabulary:pack.vocabulary,grammar:pack.grammar,question_count:actual,
   quality_score:pack.quality_score,validation_summary:pack.validation_summary,
   published_at:pack.status==='ready'?new Date().toISOString():null,
   updated_at:new Date().toISOString()
  }).eq('id',packId);
  if(finishError)throw finishError;
  const {error:jobError}=await db.from('world_explorer_learning_jobs').update({
   status:pack.status,completed_at:new Date().toISOString(),
   updated_at:new Date().toISOString(),locked_until:null,last_error:null
  }).eq('id',job.id);
  if(jobError)throw jobError;
  return {id:article.id,title:article.title_en,version,questions:actual,status:pack.status};
 }catch(error){
  const message=String(error?.message||error).slice(0,240);
  const retry=job.attempts+1<3;
  await db.from('world_explorer_learning_jobs').update({
   status:retry?'pending':'failed',last_error:message,
   locked_until:null,updated_at:new Date().toISOString()
  }).eq('id',job.id);
  return {id:job.publication_id,status:'failed',will_retry:retry,error:message};
 }
}

Deno.serve(async(request)=>{
 if(request.method!=='POST')return result({error:'POST_REQUIRED'},405);
 if(!projectUrl||!serviceKey)return result({error:'SERVER_CONFIGURATION'},503);
 const supplied=request.headers.get('x-world-explorer-cron-token')||'';
 if(!supplied)return result({error:'UNAUTHORIZED'},401);
 const {data:authorized,error:authError}=await db.rpc('world_explorer_verify_cron_token',{p_token:supplied});
 if(authError||authorized!==true)return result({error:'UNAUTHORIZED'},401);
 const {data:settings,error:settingsError}=await db.from('world_explorer_settings')
  .select('enabled,auto_generate_learning').eq('id',1).single();
 if(settingsError)return result({error:'CONFIGURATION_UNAVAILABLE'},503);
 if(!settings?.enabled||!settings.auto_generate_learning)return result({status:'disabled'});
 const now=new Date().toISOString();
 const {data:pending,error:queueError}=await db.from('world_explorer_learning_jobs')
  .select('id,publication_id,status,attempts,requested_version,locked_until')
  .eq('status','pending').lt('attempts',3).order('created_at',{ascending:false}).limit(4);
 if(queueError)return result({error:'QUEUE_UNAVAILABLE'},503);
 const {data:stale}=await db.from('world_explorer_learning_jobs')
  .select('id,publication_id,status,attempts,requested_version,locked_until')
  .eq('status','processing').lt('locked_until',now).lt('attempts',3).limit(2);
 const jobs=[...(stale||[]),...(pending||[])].slice(0,4);
 const outcomes=[];
 for(const job of jobs)outcomes.push(await handleJob(job));
 return result({processed:outcomes.length,outcomes});
});
