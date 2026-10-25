// Brian Sync Doctor: only metadata/approvals are writable.
// Database RPCs enforce approved reviewer role, different requester/reviewer,
// source revisions and immutable event audit. No student/score mutation endpoint.
import {supabase,isSupabaseConfigured} from './supabase.js';

const text = v => String(v ?? '').trim();
function requireBackend(){
  if(!isSupabaseConfigured || !supabase) throw new Error('Sync Doctor Cloud chưa được cấu hình.');
}
function checkFailure(error){
  if(!error) return;
  const code=text(error.code);
  if(code==='40001') throw new Error('Nguồn đã thay đổi. Hãy quét lại trước khi gửi yêu cầu.');
  if(code==='42501') throw new Error('Tài khoản không có quyền hoặc yêu cầu người duyệt độc lập.');
  if(code==='PGRST202'||code==='42P01') throw new Error('Dịch vụ yêu cầu duyệt chưa khả dụng. Cần kiểm tra phiên bản Supabase.');
  throw new Error(text(error.message)||'Không thực hiện được yêu cầu.');
}
export async function getSyncDoctorReviewInbox(){
  requireBackend();
  const [requests,events]=await Promise.all([
    supabase.from('bes_sync_review_requests').select(
      'id,requester_id,case_hash,issue_code,source,school_year,class_name,workspace_id,source_revision,canonical_revision,submitted_at,status,note,reviewer_id,reviewer_note,reviewed_at,updated_at')
      .order('submitted_at',{ascending:false}).limit(80),
    supabase.from('bes_sync_review_events')
      .select('id,request_id,actor_id,action,occurred_at,note')
      .order('id',{ascending:false}).limit(120),
  ]);
  checkFailure(requests.error);checkFailure(events.error);
  return {requests:requests.data||[],events:events.data||[],checkedAt:new Date().toISOString()};
}
async function hashIssueId(issueId){
  if(!globalThis.crypto?.subtle)throw new Error('Cần kết nối HTTPS để bảo vệ định danh hồ sơ.');
  const payload=new TextEncoder().encode(text(issueId));
  if(payload.length===0)throw new Error('Không có định danh cảnh báo.');
  const digest=await crypto.subtle.digest('SHA-256',payload);
  return Array.from(new Uint8Array(digest),byte=>byte.toString(16).padStart(2,'0')).join('');
}
export async function submitSyncDoctorReview(plan,issue,report,note=''){
  requireBackend();
  if(!plan || !issue || plan.id!==issue.id || plan.eligibility!=='reviewable' ||
    plan.executionEnabled!==false || !report || report.finishedAt!==plan.scanAt)
    throw new Error('Kế hoạch không hợp lệ hoặc chưa được xác minh.');
  const checked=Date.parse(plan.scanAt);
  if(!Number.isFinite(checked)|| Date.now()-checked>10*60*1000 || checked>Date.now()+60000)
    throw new Error('Lần quét đã quá 10 phút. Vui lòng quét lại trước khi gửi yêu cầu.');
  if(plan.code==='STUDENT_NOT_LINKED' && (!plan.sourceRevision||!plan.canonicalRevision||!issue.evidence?.workspaceId))
    throw new Error('Thiếu phiên bản nguồn hoặc workspace. Hãy quét lại để bổ sung bằng chứng.');
  if(text(note).length>600)throw new Error('Ghi chú tối đa 600 ký tự.');
  const p_case_hash=await hashIssueId(issue.id);
  const {data,error}=await supabase.rpc('bes_sync_submit_review',{
    p_case_hash,p_issue_code:plan.code,p_source:plan.source,
    p_school_year:plan.year,p_class_name:plan.className,
    p_workspace_id:text(issue.evidence?.workspaceId),
    p_source_revision:plan.sourceRevision||null,
    p_canonical_revision:plan.canonicalRevision||null,
    p_note:text(note),
  });
  checkFailure(error);
  return data;
}
export async function decideSyncDoctorReview(requestId,decision,note=''){
  requireBackend();
  if(!['approved_for_review','rejected'].includes(decision))throw new Error('Quyết định không hợp lệ.');
  if(!text(requestId))throw new Error('Chưa chọn yêu cầu.');
  if(text(note).length>600)throw new Error('Ghi chú tối đa 600 ký tự.');
  if(decision==='rejected'&&!text(note))throw new Error('Vui lòng ghi rõ lý do từ chối.');
  const {data,error}=await supabase.rpc('bes_sync_decide_review',{
    p_request_id:requestId,p_decision:decision,p_note:text(note),
  });
  checkFailure(error);
  return data;
}
export async function cancelSyncDoctorReview(requestId){
  requireBackend();
  if(!text(requestId))throw new Error('Chưa chọn yêu cầu.');
  const {data,error}=await supabase.rpc('bes_sync_cancel_review',{p_request_id:requestId});
  checkFailure(error);
  return data;
}


export async function previewSyncDoctorReview(requestId){
  requireBackend();
  if(!text(requestId))throw new Error('Chưa chọn yêu cầu đã duyệt.');
  const {data,error}=await supabase.rpc('bes_sync_preview_review',{p_request_id:requestId});
  checkFailure(error);
  if(!data || data.readOnly!==true || data.canExecute!==false){
    throw new Error('Không nhận được kết quả kiểm tra an toàn. Không thể tiếp tục.');
  }
  // This endpoint is deliberately read-only: no snapshots, no repairs, no restore.
  return {...data,checkedAt:new Date().toISOString()};
}


export async function createSyncDoctorPrivateBackup(requestId){
  requireBackend();
  if(!text(requestId))throw new Error('Chưa chọn yêu cầu đã được duyệt.');
  const {data,error}=await supabase.rpc('bes_sync_create_private_backup',{p_request_id:requestId});
  checkFailure(error);
  if(data?.state!=='backup_ready'||data?.repairEnabled!==false||data?.rollbackEnabled!==false
    ||data?.studentDataExposed!==false)throw new Error('Phản hồi sao lưu không đạt điều kiện an toàn.');
  return data;
}
export async function rehearseSyncDoctorRollback(requestId){
  requireBackend();
  if(!text(requestId))throw new Error('Chưa chọn yêu cầu sao lưu.');
  const {data,error}=await supabase.rpc('bes_sync_rehearse_private_restore',{p_request_id:requestId});
  checkFailure(error);
  if(!data || data?.repairEnabled!==false || data?.restorable===true)
    throw new Error('Phản hồi diễn tập không đạt điều kiện an toàn.');
  if(data.state==='rehearsal_passed' && (data.rollbackEnabled!==false||data.liveRestoreTested!==false))
    throw new Error('Không thể công nhận phép thử hoàn tác trên dữ liệu thật.');
  return data;
}


// Advisory daily monitor; no student identities or scores are returned.
export async function listSyncDoctorMonitorRuns(){
  requireBackend();
  const {data,error}=await supabase.from('bes_sync_monitor_runs')
    .select('id,checked_at,school_year,canonical_classes,gradebook_workspaces,homeroom_workspaces,possible_missing_links,affected_workspaces,counter_mismatch_workspaces,status,note')
    .order('checked_at',{ascending:false}).limit(30);
  checkFailure(error);
  return Array.isArray(data)?data:[];
}
