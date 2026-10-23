import { isSupabaseConfigured, supabase } from './supabase.js';
import { DEFAULT_DASHBOARD_HERO, normalizeDashboardHero } from './dashboardHeroCms.js';

// This configuration deliberately lives in independent Gradebook-only tables.
// The shared normalization contract keeps editor controls in sync with Dashboard.
export const GRADEBOOK_HERO_CHANGED_EVENT='bes-gradebook-hero-updated';
export const DEFAULT_GRADEBOOK_HERO=Object.freeze({
  ...DEFAULT_DASHBOARD_HERO,
  backgroundUrl:'',
  backgroundType:'none',
  positionX:70,
  positionY:50,
  opacity:100,
  shade:8,
  headingColor:'#183969',
});
export const normalizeGradebookHero=(value)=>
  normalizeDashboardHero({...DEFAULT_GRADEBOOK_HERO,...(value||{})});

export async function readGradebookHero({includeDraft=false}={}){
  const fallback=normalizeGradebookHero();
  if(!isSupabaseConfigured || !supabase)
    return {published:fallback,draft:fallback,databaseReady:false};
  const {data,error}=await supabase.from('gradebook_hero_public')
    .select('published_config,updated_at').eq('id','gradebook').maybeSingle();
  if(error) throw error;
  const published=normalizeGradebookHero(data?.published_config);
  if(!includeDraft) return {published,databaseReady:true};
  const {data:draftRow,error:draftError}=await supabase.from('gradebook_hero_drafts')
    .select('draft_config,updated_at').eq('id','gradebook').maybeSingle();
  if(draftError) throw draftError;
  return {published,draft:draftRow?normalizeGradebookHero(draftRow.draft_config):published,databaseReady:true};
}
function validConfig(config,currentUser){
  if(!isSupabaseConfigured || !supabase || !currentUser?.id)
    throw new Error('Bạn cần đăng nhập để lưu Hero Sổ điểm.');
  const normalized=normalizeGradebookHero(config);
  if(normalized.backgroundUrl.startsWith('blob:'))
    throw new Error('Tệp đang chỉ xem trước cục bộ. Vui lòng tải lên Storage trước khi lưu.');
  return normalized;
}
export async function saveGradebookHeroDraft(config,currentUser){
  const normalized=validConfig(config,currentUser);
  const {error}=await supabase.from('gradebook_hero_drafts').upsert({
    id:'gradebook',draft_config:normalized,updated_by:currentUser.id,
    updated_at:new Date().toISOString(),
  },{onConflict:'id'});
  if(error)throw error;
  return normalized;
}
export async function publishGradebookHero(config,currentUser){
  const normalized=validConfig(config,currentUser);
  const {error}=await supabase.from('gradebook_hero_public').upsert({
    id:'gradebook',published_config:normalized,updated_by:currentUser.id,
    updated_at:new Date().toISOString(),
  },{onConflict:'id'});
  if(error)throw error;
  if(typeof window!=='undefined')window.dispatchEvent(
    new CustomEvent(GRADEBOOK_HERO_CHANGED_EVENT,{detail:{published:normalized}})
  );
  return normalized;
}
