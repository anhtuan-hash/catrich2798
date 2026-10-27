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
    { id: 'team', title: 'Đội tuyển & mục tiêu', fields: [
      ['teamName','Tên đội tuyển','text'], ['examLevel','Kỳ thi/cấp thi','text'],
      ['initialStudents','Sĩ số đầu kỳ','number'], ['currentStudents','Sĩ số hiện tại','number'],
      ['objectives','Mục tiêu bồi dưỡng','textarea'], ['overview','Tình hình đội tuyển','textarea'],
    ] },
    { id: 'curriculum', title: 'Tiến độ chương trình', fields: [
      ['plannedPeriods','Số tiết theo kế hoạch','number'], ['completedPeriods','Số tiết đã thực hiện','number'],
      ['topics','Chuyên đề đã dạy','textarea'], ['methods','Phương pháp bồi dưỡng','textarea'],
      ['adjustments','Điều chỉnh chương trình (nếu có)','textarea',false],
    ] },
    { id: 'attendance', title: 'Chuyên cần & thái độ', fields: [
      ['attendanceSummary','Nhận xét chuyên cần','textarea'],
      ['studyHabits','Chuẩn bị bài, thái độ, bài tập','textarea'],
      ['atRiskStudents','Học sinh cần hỗ trợ thêm (nếu có)','textarea',false],
      ['attendanceActions','Biện pháp cải thiện chuyên cần','textarea'],
    ] },
    { id: 'outcomes', title: 'Kết quả bồi dưỡng', fields: [
      ['assessmentCount','Số lần kiểm tra/thi thử','number'],
      ['scoreSummary','Kết quả khảo sát/thi thử','textarea'],
      ['improvement','Phân tích sự tiến bộ','textarea'],
      ['readiness','Mức độ sẵn sàng dự thi','textarea'],
      ['achievements','Thành tích đã đạt (nếu có)','textarea',false],
    ] },
    { id: 'reflection', title: 'Khó khăn & kế hoạch', fields: [
      ['difficulties','Khó khăn','textarea'], ['solutions','Biện pháp khắc phục','textarea'],
      ['nextPlan','Kế hoạch kỳ tới','textarea'], ['recommendations','Kiến nghị (nếu có)','textarea',false],
    ] },
  ],
  remedial: [
    { id: 'students', title: 'Đối tượng & đầu vào', fields: [
      ['className','Khối/lớp phụ đạo','text'], ['studentCount','Số học sinh được phân công','number'],
      ['baseline','Căn cứ và kết quả khảo sát đầu vào','textarea'],
      ['knowledgeGaps','Lỗ hổng kiến thức, kỹ năng','textarea'],
      ['objectives','Mục tiêu phụ đạo','textarea'],
    ] },
    { id: 'curriculum', title: 'Nội dung & tiến độ', fields: [
      ['plannedPeriods','Số tiết theo kế hoạch','number'], ['completedPeriods','Số tiết đã thực hiện','number'],
      ['topics','Nội dung củng cố (Vocabulary/Grammar/Reading...)','textarea'],
      ['methods','Hình thức hỗ trợ và bài tập bổ trợ','textarea'],
      ['adjustments','Điều chỉnh kế hoạch (nếu có)','textarea',false],
    ] },
    { id: 'attendance', title: 'Chuyên cần & phối hợp', fields: [
      ['attendanceSummary','Tình hình chuyên cần và hoàn thành nhiệm vụ','textarea'],
      ['frequentAbsences','Học sinh vắng thường xuyên (nếu có)','textarea',false],
      ['participation','Thái độ và mức độ hợp tác','textarea'],
      ['coordination','Phối hợp với GVCN/phụ huynh (nếu có)','textarea',false],
    ] },
    { id: 'outcomes', title: 'Tiến bộ & kết quả', fields: [
      ['afterAssessment','Kết quả đánh giá lại','textarea'],
      ['improvedCount','Số học sinh có tiến bộ','number'],
      ['goalMetCount','Số học sinh đạt mục tiêu','number'],
      ['improvement','Phân tích tiến bộ so với đầu vào','textarea'],
      ['remainingGaps','Nhóm học sinh chưa đạt và nội dung cần tiếp tục hỗ trợ','textarea'],
    ] },
    { id: 'reflection', title: 'Phương hướng & kiến nghị', fields: [
      ['assessment','Đánh giá mức độ hoàn thành mục tiêu','textarea'],
      ['difficulties','Khó khăn và nguyên nhân','textarea'],
      ['nextPlan','Học sinh tiếp tục phụ đạo, chuyên đề tiếp theo','textarea'],
      ['recommendations','Kiến nghị (nếu có)','textarea',false],
    ] },
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
  fail(error); return (Array.isArray(data) ? data[0] : data) || {};
}
export async function listLearningReports() {
  const {data,error} = await db().from('bes_learning_report_tasks')
    .select('*').order('created_at',{ascending:false}).limit(400);
  fail(error); return data || [];
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
  if (submit && !reportProgress(task.report_kind,payload).ready) throw new Error('Cần hoàn thành đủ 05 phần trước khi nộp.');
  const {data,error} = await db().from('bes_learning_report_tasks').update({
    payload, status: submit ? 'submitted' : 'draft',
    notified_read_at:task.notified_read_at || new Date().toISOString(),
  }).eq('id',task.id).select('*').single();
  fail(error);return data;
}
export async function reviewLearningReport(taskId, status, comment) {
  if (!['approved','revision'].includes(status)) throw new Error('Trạng thái duyệt không hợp lệ.');
  if (status==='revision' && !String(comment || '').trim()) throw new Error('Phải nêu lý do yêu cầu bổ sung.');
  const {data,error} = await db().from('bes_learning_report_tasks')
    .update({status,reviewer_comment:String(comment||'').trim()})
    .eq('id',taskId).select('*').single();
  fail(error);return data;
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
    .select('id,report_kind,period,due_at,created_at,notified_read_at,status')
    .eq('teacher_id',userId).eq('notify_enabled',true)
    .is('notified_read_at',null).order('created_at',{ascending:false}).limit(25);
  if (error) return [];
  return data || [];
}
