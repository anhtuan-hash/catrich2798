import { isSupabaseConfigured, supabase } from './supabase.js';
import { getPendingAssignedStudentRosterCount } from './assignedStudentRosterSync.js';
import { listSyncQueue } from './syncQueue.js';
import { compareSyncDoctorSnapshots, SYNC_DOCTOR_RULESET } from './syncDoctorRules.mjs';

const LIMIT = 160;
const str = v => String(v ?? '').trim();
const labelMap = {canonical:'Danh sách chuẩn',homeroom:'GVCN',gradebook:'Sổ điểm',assessment:'Kiểm tra',assignment:'Phân công'};
function classify(error) {
  const code = str(error?.code);
  if (code === '42501' || /permission|not authorized|not allowed|forbidden|row level security/i.test(str(error?.message))) return 'unauthorized';
  if (code === 'PGRST202' || code === '42P01' || /schema cache|does not exist|could not find/i.test(str(error?.message))) return 'unavailable';
  return 'error';
}
async function tableSource(table, columns, schoolYear, className) {
  let query = supabase.from(table).select(columns, {count:'exact'}).eq('school_year',schoolYear)
    .order('updated_at',{ascending:false}).range(0,LIMIT - 1);
  if (className) query = query.eq('class_name',className);
  const {data,error,count} = await query;
  if (error) return {status:classify(error),rows:[],message:str(error.message),count:null};
  const partial = count != null && (count > LIMIT || count === 0);
  return {status:partial?'limited':'ok',rows:data||[],count:count ?? (data||[]).length,
    message:count === 0?'Không có bản ghi nhìn thấy; không thể khẳng định nguồn rỗng hoặc đã đồng bộ.':partial?'Đã giới hạn số bản ghi của lượt quét; hãy chọn một lớp.':''};
}
async function rpcSource(name) {
  const {data,error} = await supabase.rpc(name);
  if(error)return {status:classify(error),rows:[],message:str(error.message),count:null};
  const array = Array.isArray(data)?data:[];
  return {status:array.length===0||array.length>LIMIT?'limited':'ok',rows:array.slice(0,LIMIT),count:array.length,
    message:array.length>LIMIT?'Nguồn vượt giới hạn kiểm tra.':array.length===0?'Không có bản ghi được phép xem.':''};
}
function source(result,key) {
  return {id:key,label:labelMap[key],status:result.status,count:result.count,
    message:result.message||'',checkedAt:new Date().toISOString()};
}
function localState(user) {
  try {
    const current = listSyncQueue(user).filter(x=>x.status!=='completed').length;
    const roster = getPendingAssignedStudentRosterCount(user);
    return {pending:current+roster, deviceOnly:true};
  } catch {return {pending:null,deviceOnly:true,error:'Không đọc được hàng đợi thiết bị.'};}
}
export async function runSyncDoctorScan({user,schoolYear,className='',signal,onProgress=()=>{}}) {
  if (!user?.id) throw new Error('Cần đăng nhập.');
  if (!isSupabaseConfigured || !supabase) throw new Error('Supabase chưa được cấu hình.');
  if (!/^20\d{2}-20\d{2}$/.test(str(schoolYear)))throw new Error('Năm học không hợp lệ.');
  const startedAt = new Date().toISOString();
  const jobs = [
    ['canonical',()=>tableSource('bes_class_rosters','roster_key,class_name,school_year,students,updated_at',schoolYear,className)],
    ['homeroom',()=>tableSource('bes_homeroom_workspaces','workspace_id,class_name,school_year,payload,updated_at',schoolYear,className)],
    ['gradebook',()=>tableSource('bes_gradebook_workspaces','workspace_id,class_name,school_year,payload,updated_at',schoolYear,className)],
    ['assessment',()=>rpcSource('lesson_check_list_assigned_class_rosters')],
    ['assignment',()=>rpcSource('bes_my_brian_assignments')],
  ];
  // Sequential bounded reads prevent a UI-triggered query burst on production.
  const results={};
  for(const [key,run] of jobs){
    if(signal?.aborted)throw new Error('Đã hủy lượt quét.');
    try {results[key]=await run();}
    catch(error){results[key]={status:'error',rows:[],count:null,message:str(error?.message)};}
    onProgress({source:key,done:Object.keys(results).length,total:jobs.length});
  }
  if(signal?.aborted)throw new Error('Đã hủy lượt quét.');
  const snapshot = {schoolYear,className,canonical:results.canonical.rows,
    homeroom:results.homeroom.rows,gradebooks:results.gradebook.rows,
    assessmentClasses:results.assessment.rows.map(r=>({
      className:r.class_name,schoolYear:str(r.class_payload?.schoolYear),
      students:Array.isArray(r.class_payload?.students)?r.class_payload.students:[],
    })),
    sources:Object.fromEntries(Object.entries(results).map(([key,r])=>[key,source(r,key)])),
    localQueue:localState(user)};
  const comparison=compareSyncDoctorSnapshots(snapshot);
  return {
    ruleset:SYNC_DOCTOR_RULESET,startedAt,finishedAt:new Date().toISOString(),
    schoolYear,className,issues:comparison.issues,
    completeness:comparison.completeness,classesChecked:comparison.classesChecked,
    sources:Object.values(snapshot.sources),localQueue:snapshot.localQueue,
    // Counts are scoped to rows visible under current Supabase RLS.
    scopeNotice:'Kết quả chỉ bao gồm bản ghi mà tài khoản có quyền xem. Không xác nhận toàn trường nếu quyền/nguồn bị giới hạn.',
  };
}
export function serializeSyncDoctorReport(report) {
  if(!report)return '';
  // No PII or raw evidence identifiers in an exported report.
  return JSON.stringify({ruleset:report.ruleset,schoolYear:report.schoolYear,
    className:report.className,startedAt:report.startedAt,finishedAt:report.finishedAt,
    completeness:report.completeness,classesChecked:report.classesChecked,
    sources:report.sources.map(({id,label,status,count,message})=>({id,label,status,count,message})),
    issues:report.issues.map(({code,severity,year,className,description,detail})=>
      ({code,severity,year,className,description,detail}))},null,2);
}
