import { isSupabaseConfigured, supabase } from '../../utils/supabase.js';
import { listMyGradebookTeachingAssignments } from '../../utils/gradebookTeachingAssignments.js';
import { CLOUD_SCHOOL_YEAR, buildCloudSnapshot, restoreCloudSnapshot } from './cloudSnapshot.js';

export const CLOUD_SYNC_ENABLED = import.meta.env?.VITE_BES_ENGLISH_EW_CLOUD_SYNC === 'true';
const TABLE = 'brian_english_ew_snapshots';
const ENGLISH_SUBJECT = /^(?:tiếng anh|english)$/i;

function assertEnabled() {
  if (!CLOUD_SYNC_ENABLED) throw new Error('Cloud storage is disabled pending school approval and RLS verification.');
  if (!isSupabaseConfigured || !supabase) throw new Error('Cloud database is not configured.');
}
async function currentAuthId() {
  const {data,error} = await supabase.auth.getUser();
  if (error || !data?.user?.id) throw new Error('Sign in to an approved teacher account.');
  return data.user.id;
}
export async function listAuthorizedEnglishClasses(user) {
  assertEnabled();
  await currentAuthId();
  const response = await listMyGradebookTeachingAssignments(user);
  if (!response.ok || response.source !== 'brian-team-sync') throw new Error('Verified teaching assignments are unavailable.');
  return [...new Set(response.assignments
    .filter(row => ENGLISH_SUBJECT.test(String(row.subject || '').trim()))
    .map(row => String(row.className || '').trim()).filter(Boolean))].sort();
}
async function verifiedScope(user, className) {
  assertEnabled();
  const teacherId = await currentAuthId();
  const classes = await listAuthorizedEnglishClasses(user);
  if (!classes.includes(className)) throw new Error('You are not verified as the English teacher for that class.');
  return teacherId;
}
export async function savePilotSnapshot({user, className, cohort, reviews, journal}) {
  const ownerId = await verifiedScope(user, className);
  const snapshot = buildCloudSnapshot(cohort,reviews,journal);
  const {data,error} = await supabase.from(TABLE).upsert({
    owner_id:ownerId,class_name:className,school_year:CLOUD_SCHOOL_YEAR,
    rule_version:'0.1',payload:snapshot,
  },{onConflict:'owner_id,class_name,school_year'}).select('updated_at').single();
  if (error) throw new Error('Could not save the coded study. ' + error.message);
  return data;
}
export async function loadPilotSnapshot({user, className}) {
  const ownerId = await verifiedScope(user,className);
  const {data,error} = await supabase.from(TABLE)
    .select('payload,updated_at')
    .eq('owner_id',ownerId).eq('class_name',className).eq('school_year',CLOUD_SCHOOL_YEAR).maybeSingle();
  if (error) throw new Error('Could not read cloud study. ' + error.message);
  if (!data) throw new Error('There is no saved study for this class.');
  return { ...restoreCloudSnapshot(data.payload), updatedAt:data.updated_at };
}
export async function deletePilotSnapshot({user,className}) {
  const ownerId = await verifiedScope(user,className);
  const {error} = await supabase.from(TABLE).delete()
    .eq('owner_id',ownerId).eq('class_name',className).eq('school_year',CLOUD_SCHOOL_YEAR);
  if (error) throw new Error('Could not delete cloud study. ' + error.message);
}
