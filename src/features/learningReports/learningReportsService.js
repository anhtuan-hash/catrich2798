import { isSupabaseConfigured, supabase } from '../../utils/supabase.js';

export const LEARNING_REPORT_KINDS = Object.freeze({
  gifted: 'Bồi dưỡng học sinh giỏi',
  remedial: 'Phụ đạo học sinh',
});
export const LEARNING_REPORT_STATUSES = Object.freeze({
  draft: 'Bản nháp', submitted: 'Đã nộp', revision: 'Cần bổ sung', approved: 'Đã xác nhận',
});
export const LEARNING_REPORT_SECTIONS = Object.freeze({
  gifted: [
    { id:'team',title:'Mục tiêu & tình hình đội tuyển',fields:[
      ['examLevel','Kỳ thi/cấp thi hướng tới','text',false],
      ['objectives','Mục tiêu bồi dưỡng','textarea'],
      ['overview','Tình hình chất lượng đội tuyển','textarea'],
    ]},
    { id:'curriculum',title:'Chương trình & phương pháp',fields:[
      ['topics','Chuyên đề, kỹ năng đã thực hiện (nếu điểm danh chưa ghi)','textarea'],
      ['methods','Phương pháp bồi dưỡng, luyện đề, hướng dẫn tự học','textarea'],
      ['adjustments','Điều chỉnh kế hoạch (nếu có)','textarea',false],
    ]},
    { id:'attendance',title:'Nhận xét quá trình học tập',fields:[
      ['studyHabits','Thái độ học tập, chuẩn bị bài, ý thức tự học','textarea'],
      ['atRiskStudents','Học sinh cần hỗ trợ riêng (nếu có)','textarea',false],
      ['attendanceActions','Biện pháp hỗ trợ chuyên cần (nếu có)','textarea',false],
    ]},
    { id:'outcomes',title:'Đánh giá kết quả bồi dưỡng',fields:[
      ['assessmentCount','Số lần kiểm tra/thi thử (nếu có)','number',false],
      ['scoreSummary','Kết quả kiểm tra, thi thử (nếu có)','textarea',false],
      ['improvement','Tiến bộ về kiến thức, kỹ năng','textarea'],
      ['readiness','Đánh giá năng lực, khả năng dự thi','textarea'],
      ['achievements','Thành tích đã đạt (nếu có)','textarea',false],
    ]},
    { id:'reflection',title:'Kế hoạch & kiến nghị',fields:[
      ['difficulties','Khó khăn (nếu có)','textarea',false],
      ['solutions','Biện pháp khắc phục','textarea',false],
      ['nextPlan','Mục tiêu, chuyên đề và hoạt động kỳ tới','textarea'],
      ['recommendations','Kiến nghị với TTCM/nhà trường (nếu có)','textarea',false],
    ]},
  ],
  remedial: [
    { id:'students',title:'Đối tượng & nguyên nhân',fields:[
      ['baseline','Kết quả khảo sát đầu vào','textarea'],
      ['knowledgeGaps','Lỗ hổng kiến thức, kỹ năng chủ yếu','textarea'],
      ['objectives','Mục tiêu phụ đạo','textarea'],
    ]},
    { id:'curriculum',title:'Nội dung & cách thức phụ đạo',fields:[
      ['topics','Nội dung củng cố (nếu chưa có trong ghi chú điểm danh)','textarea'],
      ['methods','Hình thức hỗ trợ, bài tập bổ trợ','textarea'],
      ['adjustments','Điều chỉnh chương trình (nếu có)','textarea',false],
    ]},
    { id:'attendance',title:'Nhận xét quá trình tham gia',fields:[
      ['participation','Tinh thần học tập, hợp tác, hoàn thành bài tập','textarea'],
      ['coordination','Phối hợp GVCN/phụ huynh (nếu có)','textarea',false],
    ]},
    { id:'outcomes',title:'Kết quả & sự tiến bộ',fields:[
      ['afterAssessment','Đánh giá sau phụ đạo','textarea'],
      ['improvedCount','Số học sinh tiến bộ (nếu đã đánh giá)','number',false],
      ['goalMetCount','Số học sinh đạt mục tiêu (nếu đã đánh giá)','number',false],
      ['improvement','Phân tích tiến bộ so với đầu vào','textarea'],
      ['remainingGaps','Những kiến thức/kỹ năng còn hạn chế','textarea'],
    ]},
    { id:'reflection',title:'Phương hướng & đề xuất',fields:[
      ['assessment','Đánh giá hiệu quả biện pháp phụ đạo','textarea'],
      ['difficulties','Khó khăn cần tháo gỡ (nếu có)','textarea',false],
      ['nextPlan','Nội dung và nhóm học sinh cần hỗ trợ tiếp','textarea'],
      ['recommendations','Kiến nghị (nếu có)','textarea',false],
    ]},
  ],
});

const fail = (error) => { if (error) throw new Error(error.message || String(error)); };
const db = () => {
  if (!isSupabaseConfigured || !supabase) throw new Error('Chưa kết nối Supabase để lưu báo cáo.');
  return supabase;
};
const safeDate = (value) => {
  const dt = new Date(value);
  return Number.isFinite(dt.getTime()) ? dt : null;
};
const normalizeId = (value) => String(value || '').trim();

export function reportFields(kind) {
  return LEARNING_REPORT_SECTIONS[kind] || LEARNING_REPORT_SECTIONS.gifted;
}
export function emptyLearningPayload(kind) {
  return Object.fromEntries(reportFields(kind).flatMap(s => s.fields.map(([key]) => [key, ''])));
}
export function reportProgress(kind, payload = {}) {
  const sections = reportFields(kind);
  const complete = sections.map(s => s.fields
    .filter(f => f[3] !== false)
    .every(([key,typeLabel,type]) => {
      const value = payload?.[key];
      return type === 'number'
        ? value !== '' && value !== null && value !== undefined && Number.isFinite(Number(value)) && Number(value)>=0
        : String(value ?? '').trim().length>0;
    }));
  return { sections: complete, count: complete.filter(Boolean).length, total: sections.length,
    percent: Math.round(100*complete.filter(Boolean).length/sections.length),
    ready: complete.every(Boolean) };
}
export function aggregateLearningSessions(rows = []) {
  return (rows || []).reduce((a,r) => ({
    sessions: a.sessions + 1,
    periods: a.periods + Number(r.periods || 0),
    present: a.present + Number(r.present_count || 0),
    expected: a.expected + Number(r.expected_count || 0),
  }), { sessions:0, periods:0, present:0, expected:0 });
}
export function participationPercent(stats) {
  return stats.expected > 0 ? Math.round(stats.present*1000/stats.expected)/10 : null;
}
export async function loadLearningAttendance(taskId) {
  if (!taskId) throw new Error('Thiếu mã báo cáo.');
  const {data,error}=await db().rpc('bes_learning_report_attendance',{p_task_id:taskId});
  fail(error);return data||{classes:[],sessions:[],totals:{}};
}
export async function listLearningClassOptions(taskId) {
  const {data,error}=await db().rpc('bes_learning_report_class_options',{p_task_id:taskId});
  fail(error);return Array.isArray(data)?data:[];
}
export async function bindLearningClasses(taskId, bindings) {
  if (!taskId) throw new Error('Chưa chọn báo cáo.');
  if (!Array.isArray(bindings)) throw new Error('Liên kết lớp và giáo viên không hợp lệ.');
  const normalized=bindings.map(row=>({
    classId:String(row?.classId||'').trim(),
    instructorName:String(row?.instructorName||'').trim(),
  }));
  if (normalized.some(row=>!row.classId||!row.instructorName))
    throw new Error('Phải chọn chính xác giáo viên giảng dạy cho mỗi lớp.');
  if (new Set(normalized.map(row=>row.classId)).size!==normalized.length)
    throw new Error('Mỗi lớp chỉ có thể liên kết một tên giáo viên cho báo cáo này.');
  const {data,error}=await db().rpc('bes_learning_report_bind_instructors',{
    p_task_id:taskId,p_links:normalized,
  });
  fail(error);return Number(data||0);
}
// Attendance-driven bulk dispatch. These RPCs check TTCM ownership and actual
// instructors on the server. The browser never assigns attendance sessions.
export async function previewSmartLearningAssignments({
  departmentId,month,kinds=['gifted','remedial'],teacherIds=null,
}) {
  if (!departmentId||!/^\d{4}-(0[1-9]|1[0-2])$/.test(String(month||'')))
    throw new Error('Tổ và tháng báo cáo chưa hợp lệ.');
  const {data,error}=await db().rpc('bes_preview_auto_learning_assignments',{
    p_department_id:departmentId,p_period:month+'-01',
    p_kinds:kinds,p_teacher_ids:teacherIds,
  });
  fail(error);return data||{groups:[],exceptions:[],totalNew:0,totalExisting:0};
}
export async function dispatchSmartLearningAssignments({
  departmentId,month,kinds=['gifted','remedial'],teacherIds=null,dueAt,
  fingerprint,notification=true,event=true,
}) {
  const date=safeDate(dueAt);
  if(!date||date.getTime()<=Date.now())throw new Error('Vui lòng chọn hạn nộp trong tương lai.');
  if(!fingerprint)throw new Error('Phải xem trước dữ liệu Điểm danh trước khi giao báo cáo.');
  const {data,error}=await db().rpc('bes_dispatch_auto_learning_reports',{
    p_department_id:departmentId,p_period:month+'-01',
    p_due_at:date.toISOString(),p_kinds:kinds,p_teacher_ids:teacherIds,
    p_expected_fingerprint:fingerprint,p_send_notification:notification,
    p_create_event:event,
  });
  fail(error);notifyLearningDeadlineChange();return data||{};
}
export async function verifySmartLearningInstructor({departmentId,sourceName,teacherId}) {
  if(!teacherId||!String(sourceName||'').trim())throw new Error('Chọn giáo viên cần xác minh.');
  const {data,error}=await db().rpc('bes_verify_attendance_teacher_identity',{
    p_department_id:departmentId,p_source_name:sourceName,p_teacher_id:teacherId,
  });
  fail(error);return data;
}

export async function issueLearningReports({ departmentId, kind, month, dueAt, teacherIds, notification = true, event = true }) {
  const due = safeDate(dueAt);
  const ids = [...new Set((teacherIds || []).map(normalizeId).filter(Boolean))];
  if (!['gifted','remedial'].includes(kind)) throw new Error('Loại báo cáo không hợp lệ.');
  if (!/^\d{4}-\d{2}$/.test(String(month || ''))) throw new Error('Chọn tháng báo cáo hợp lệ.');
  if (!due || due.getTime()<=Date.now()) throw new Error('Hạn nộp phải trong tương lai.');
  if (!ids.length) throw new Error('Hãy chọn giáo viên trong tổ.');
  const {data,error}=await db().rpc('bes_issue_learning_reports',{
    p_department_id:departmentId,p_kind:kind,p_period:month+'-01',p_due_at:due.toISOString(),
    p_teacher_ids:ids,p_send_notification:notification,p_create_event:event,
  });
  fail(error); notifyLearningDeadlineChange(); return (Array.isArray(data) ? data[0] : data) || {};
}
export async function listLearningDeadlineOverrides() {
  const {data,error}=await db().from('bes_learning_report_deadlines')
    .select('head_id,department_id,report_kind,period,due_at,cleared')
    .order('period',{ascending:false}).limit(400);
  fail(error);return data||[];
}
export function applyLearningDeadlineOverrides(tasks,deadlines) {
  const byKey=new Map((deadlines||[]).map(d=>[
    [d.head_id,d.department_id,d.report_kind,String(d.period||'').slice(0,7)].join(':'),
    d,
  ]));
  return (tasks||[]).map(t=>{
    const override=byKey.get([t.head_id,t.department_id,t.report_kind,String(t.period||'').slice(0,7)].join(':'));
    return {...t,effective_due_at:override
      ? override.cleared?null:override.due_at
      :t.due_at,
      deadline_cleared:Boolean(override?.cleared)};
  });
}
// Minimal metadata for the permanent navigation timer; never download report payloads.
export async function listNavigationLearningDeadlineTasks(userId,isLeader=false) {
  const id=String(userId||'').trim();
  if(!id)return [];
  const start=new Date();
  start.setDate(1);
  start.setMonth(start.getMonth()-3);
  const end=new Date();
  end.setDate(1);
  end.setMonth(end.getMonth()+12);
  const monthDate=value=>value.getFullYear()+'-'+String(value.getMonth()+1).padStart(2,'0')+'-01';
  const minMonth=monthDate(start),maxMonth=monthDate(end);
  let query=db().from('bes_learning_report_tasks')
    .select('id,head_id,teacher_id,department_id,report_kind,period,due_at,status')
    .in('status',['draft','revision','submitted'])
    .gte('period',minMonth).lte('period',maxMonth)
    .order('due_at',{ascending:true}).limit(400);
  if(isLeader) query=query.or('teacher_id.eq.'+id+',head_id.eq.'+id);
  else query=query.eq('teacher_id',id);
  const [tasks,deadlines]=await Promise.all([
    query,
    db().from('bes_learning_report_deadlines')
      .select('head_id,department_id,report_kind,period,due_at,cleared')
      .gte('period',minMonth).lte('period',maxMonth).limit(400),
  ]);
  fail(tasks.error);fail(deadlines.error);
  return applyLearningDeadlineOverrides(tasks.data||[],deadlines.data||[]);
}
export function notifyLearningDeadlineChange() {
  if(typeof window==='undefined')return;
  window.dispatchEvent(new Event('bes-learning-report-deadline-change'));
}

// Remove an unstarted assignment; report content and approved records are
// explicitly protected by a server-side TTCM authorization check.
export async function revokeLearningReportAssignment(taskId) {
  const id=String(taskId||'').trim();
  if(!id)throw new Error('Chưa chọn yêu cầu báo cáo cần thu hồi.');
  const {data,error}=await db().rpc('bes_revoke_learning_report_assignment',{
    p_task_id:id,
  });
  fail(error);
  if(!data?.removed)throw new Error('Không thể thu hồi nhiệm vụ báo cáo.');
  notifyLearningDeadlineChange();
  return data;
}

export async function listLearningReports() {
  const [reports,overrides]=await Promise.all([
    db().from('bes_learning_report_tasks').select('*')
      .order('created_at',{ascending:false}).limit(400),
    db().from('bes_learning_report_deadlines').select('head_id,department_id,report_kind,period,due_at,cleared')
      .order('period',{ascending:false}).limit(400),
  ]);
  fail(reports.error);fail(overrides.error);
  return applyLearningDeadlineOverrides(reports.data||[],overrides.data||[]);
}
export async function loadLearningTeamDashboard(departmentId,kind,year) {
  if(!departmentId || !['gifted','remedial'].includes(kind) || !Number.isInteger(Number(year)))
    throw new Error('Tổ, loại báo cáo hoặc năm học không hợp lệ.');
  const y=Number(year);
  if(y<2020||y>2100) throw new Error('Năm học không hợp lệ.');
  const {data,error}=await db().rpc('bes_learning_report_team_dashboard',{
    p_department_id:departmentId,p_kind:kind,
    p_from:`${y}-08-01`,p_to:`${y+1}-08-01`,
  });
  fail(error);return data||{reports:[],sessions:[],deadlines:[]};
}
export async function setLearningTeamDeadline(departmentId,kind,period,dueAt,clear=false) {
  if(!/^(20\d{2})-(0[1-9]|1[0-2])$/.test(String(period||'')))
    throw new Error('Kỳ báo cáo không hợp lệ.');
  if(!clear && (!dueAt || !Number.isFinite(new Date(dueAt).getTime())
    || new Date(dueAt).getTime()<=Date.now()))
    throw new Error('Vui lòng chọn hạn nộp trong tương lai.');
  const {data,error}=await db().rpc('bes_set_learning_report_deadline',{
    p_department_id:departmentId,p_kind:kind,p_period:period+'-01',
    p_due_at:clear?null:new Date(dueAt).toISOString(),p_clear:clear,
  });
  fail(error);notifyLearningDeadlineChange();return data;
}
export async function listLearningSessions(taskId) {
  if (!taskId) return [];
  const {data,error} = await db().from('bes_learning_report_sessions').select('*')
    .eq('task_id',taskId).order('session_date',{ascending:false}).limit(150);
  fail(error); return data || [];
}
export async function saveLearningReport(task, payload, submit = false) {
  if (!task?.id) throw new Error('Không tìm thấy nhiệm vụ báo cáo.');
  if (!['draft','revision'].includes(task.status)) throw new Error('Báo cáo đã khóa chỉnh sửa.');
  if (submit) {
    if (!reportProgress(task.report_kind,payload).ready)
      throw new Error('Cần hoàn thành đủ 05 phần chuyên môn trước khi nộp.');
    const attendance=await loadLearningAttendance(task.id);
    if (!attendance.classes?.length) throw new Error('TTCM cần liên kết lớp điểm danh trước khi nộp báo cáo.');
  }
  const {data,error} = await db().from('bes_learning_report_tasks').update({
    payload, status: submit ? 'submitted' : 'draft',
    notified_read_at:task.notified_read_at || new Date().toISOString(),
  }).eq('id',task.id).select('*').single();
  fail(error);notifyLearningDeadlineChange();return data;
}
export async function reviewLearningReport(taskId, status, comment) {
  if (!['approved','revision'].includes(status)) throw new Error('Trạng thái duyệt không hợp lệ.');
  if (status==='revision' && !String(comment || '').trim()) throw new Error('Phải nêu lý do yêu cầu bổ sung.');
  const {data,error} = await db().from('bes_learning_report_tasks')
    .update({status,reviewer_comment:String(comment||'').trim()})
    .eq('id',taskId).select('*').single();
  fail(error);notifyLearningDeadlineChange();return data;
}
export async function markLearningReportRead(task) {
  if (!task?.id || task.notified_read_at) return;
  const {error} = await db().from('bes_learning_report_tasks')
    .update({notified_read_at:new Date().toISOString()}).eq('id',task.id);
  fail(error);
}
export async function saveLearningSession(task, payload, sessionId = '') {
  if (!task?.id || !['draft','revision'].includes(task.status)) throw new Error('Nhật ký đang bị khóa.');
  const expected=Number(payload.expected_count),present=Number(payload.present_count);
  if (!payload.session_date || !String(payload.topic||'').trim() || !Number.isInteger(expected)
    || !Number.isInteger(present) || present<0 || expected<0 || present>expected)
    throw new Error('Kiểm tra ngày, nội dung và sĩ số (có mặt không vượt sĩ số).');
  const row={task_id:task.id,teacher_id:task.teacher_id,session_date:payload.session_date,
    class_label:String(payload.class_label||'').trim(),topic:String(payload.topic||'').trim(),
    periods:Number(payload.periods)||1,expected_count:expected,present_count:present,
    observation:String(payload.observation||'').trim()};
  const query=sessionId
    ? db().from('bes_learning_report_sessions').update(row).eq('id',sessionId)
    : db().from('bes_learning_report_sessions').insert(row);
  const {data,error}=await query.select('*').single();fail(error);return data;
}
export async function deleteLearningSession(sessionId) {
  const {error}=await db().from('bes_learning_report_sessions').delete().eq('id',sessionId);
  fail(error);
}
export async function listUnreadLearningReportNotifications(userId) {
  if (!userId || !isSupabaseConfigured) return [];
  const {data,error}=await db().from('bes_learning_report_tasks')
    .select('id,head_id,department_id,report_kind,period,due_at,created_at,notified_read_at,status')
    .eq('teacher_id',userId).eq('notify_enabled',true)
    .is('notified_read_at',null).order('created_at',{ascending:false}).limit(25);
  if (error) return [];
  try {
    const deadlines=await listLearningDeadlineOverrides();
    const rows=applyLearningDeadlineOverrides(data||[],deadlines);
    return rows.map(row=>({...row,due_at:row.effective_due_at}));
  } catch {return data||[];}
}
