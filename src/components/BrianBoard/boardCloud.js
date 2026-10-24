import {supabase,isSupabaseConfigured} from '../../utils/supabase.js';
import {normalizeLesson} from './boardModel.js';
const TABLE='brian_board_cloud_lessons';
async function assertOwner(ownerId){
 if(!isSupabaseConfigured||!supabase||!ownerId)throw Error('Connect your teacher account to use Board Cloud.');
 const {data,error}=await supabase.auth.getUser();
 if(error||data?.user?.id!==ownerId)throw Error('Cloud sign-in is required for this account.');
 return ownerId;
}
export async function listBoardCloud(ownerId){
 await assertOwner(ownerId);
 const {data,error}=await supabase.from(TABLE).select('lesson_id,title,revision,updated_at')
 .eq('owner_id',ownerId).order('updated_at',{ascending:false}).limit(80);
 if(error)throw error;return data||[];
}
export async function saveBoardCloud(ownerId,raw){
 await assertOwner(ownerId);
 const lesson=normalizeLesson(raw,ownerId);
 // Cloud snapshots are intentionally small; rich local image data remain in IndexedDB.
 const serialized=JSON.stringify(lesson);
 if(serialized.length>300000)throw Error('Lesson exceeds 300 KB cloud limit; it remains safely stored on this device. Remove large images to back it up.');
 const db=supabase.from(TABLE);
 const {data:existing,error:readError}=await db.select('revision').eq('owner_id',ownerId)
  .eq('lesson_id',lesson.id).maybeSingle();
 if(readError)throw readError;
 const title=lesson.title.trim()||'Untitled lesson';
 if(existing){
  const {data,error}=await db.update({payload:lesson,title,revision:existing.revision+1,updated_at:new Date().toISOString()})
   .eq('owner_id',ownerId).eq('lesson_id',lesson.id).eq('revision',existing.revision)
   .select('revision').maybeSingle();
  if(error)throw error;
  if(!data)throw Error('Cloud version changed on another device. Import its latest copy before overwriting.');
  return data;
 }
 const {data,error}=await db.insert({owner_id:ownerId,lesson_id:lesson.id,title,payload:lesson,revision:1})
  .select('revision').single();
 if(error)throw error;return data;
}
export async function readBoardCloud(ownerId,lessonId){
 await assertOwner(ownerId);
 if(typeof lessonId!=='string'||lessonId.length>85)throw Error('Invalid lesson ID');
 const {data,error}=await supabase.from(TABLE).select('payload,revision').eq('owner_id',ownerId)
  .eq('lesson_id',lessonId).maybeSingle();
 if(error)throw error;
 if(!data)return null;
 return {lesson:normalizeLesson(data.payload,ownerId),revision:data.revision};
}
