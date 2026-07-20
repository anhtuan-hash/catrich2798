import React, { useEffect, useMemo, useRef, useState } from 'react';
import SectionHeader from '../components/SectionHeader.jsx';
import PermissionRequestButton from '../components/PermissionRequestButton.jsx';
import { DEPARTMENT_MODULES, DEPARTMENT_TEMPLATES, POLICY_PINS } from '../data/department.js';
import { callAI, extractJson } from '../utils/gemini.js';
import { canPublishDepartment, hasDepartmentModuleAccess } from '../utils/permissions.js';
import { repairCurrentAdminDatabaseRole } from '../utils/auth.js';
import { loadMammoth, loadPdfjs } from '../utils/documentParsers.js';
import {
  DEPARTMENT_SNAPSHOT_EVENT,
  canUseCloudDepartmentStore,
  archiveDepartmentSubmission,
  cancelDepartmentSubmission,
  createDepartmentSubmission,
  createDepartmentSubmissionRequest,
  listDepartmentSubmissionRequests,
  listDepartmentSubmissions,
  loadDepartmentSnapshot,
  reviewDepartmentSubmission,
  saveDepartmentSnapshot,
  updateDepartmentSubmissionRequestStatus,
} from '../utils/departmentStore.js';

const STORE_PREFIX = 'bes-department-workspace-v1';
const SHARED_STORE_SUFFIX = 'shared';
const CORE_DEPARTMENT_TABS = ['dashboard', 'workSchedule', 'documents', 'submissions', 'aiCopilot'];
const TEACHER_VISIBLE_DEPARTMENT_TABS = ['dashboard', 'workSchedule'];
const EMPTY_DRAFT = { title: '', owner: '', date: today(), note: '', link: '' };
const EMPTY_WORK_SCHEDULE = { title: '', owner: '', date: today(), startTime: '', endTime: '', location: '', type: 'Lịch làm việc', note: '', status: 'Chưa làm' };
const EMPTY_FEATURE_DRAFT = { title: '', owner: 'TTCM', date: today(), note: '', link: '' };
const SUBMISSION_CATEGORIES = ['Tổng quan', 'Nâng cấp', 'Kế hoạch', 'Họp tổ', 'Lịch làm việc', 'NCBH', 'Dự giờ', 'Đánh giá', 'Nhiệm vụ', 'Hồ sơ', 'Nộp hồ sơ', 'Bồi dưỡng GV', 'Học sinh', 'AI TTCM', 'Báo cáo', 'Văn bản'];
const EMPTY_SUBMISSION = { requestId: '', title: '', category: 'Báo cáo', link: '', note: '', relatedTask: '', file: null };
const EMPTY_SUBMISSION_REQUEST = { title: '', category: 'Nhiệm vụ', description: '', dueDate: today(), targetMode: 'all', targetEmails: '', file: null };
const EMPTY_ADMIN_DOCUMENT = {
  type: 'Thông báo',
  agency: 'TRƯỜNG THPT ................................',
  department: 'TỔ TIẾNG ANH',
  number: '',
  recipient: 'Giáo viên tổ Tiếng Anh',
  title: '',
  legalBasis: '',
  signer: 'Nguyễn Anh Tuấn',
  position: 'Tổ trưởng chuyên môn',
  urgency: 'Thường',
};
const ADMIN_DOCUMENT_TYPES = ['Thông báo', 'Kế hoạch', 'Báo cáo', 'Biên bản', 'Tờ trình', 'Công văn', 'Quyết định', 'Phiếu đề xuất', 'Checklist hồ sơ'];
const MODULE_AI_DEFAULTS = {
  dashboard: { action: 'leaderBrief', intentVi: 'Phân tích tổng quan vận hành, chỉ ra ưu tiên, rủi ro, hồ sơ cần duyệt và việc cần nhắc trong tuần này.', intent: 'Analyze operations, priorities, risks, pending submissions and reminders for this week.' },
  featureLab: { action: 'leaderBrief', intentVi: 'Rà soát đề xuất nâng cấp, sắp xếp theo mức tác động, độ khó và lộ trình triển khai.', intent: 'Review feature proposals by impact, effort and implementation roadmap.' },
  plans: { action: 'monthlyPlan', intentVi: 'Đọc tài liệu/kế hoạch được tải lên và soạn kế hoạch chuyên môn rõ phân công, deadline, minh chứng.', intent: 'Read uploaded plans and draft a professional plan with owners, deadlines and evidence.' },
  meetings: { action: 'meetingMinutes', intentVi: 'Từ tài liệu/ghi chú họp, tạo agenda hoặc biên bản họp tổ theo văn phong hành chính.', intent: 'Create a meeting agenda or minutes from uploaded notes in administrative style.' },
  workSchedule: { action: 'followUpTasks', intentVi: 'Từ tài liệu hoặc lịch dự kiến, tách các mốc việc, người phụ trách, thời gian và nội dung chuẩn bị.', intent: 'Extract schedule milestones, owners, dates and preparation notes from the source.' },
  lessonStudy: { action: 'observationForm', intentVi: 'Phân tích tài liệu nghiên cứu bài học, tạo phiếu quan sát, câu hỏi thảo luận và hướng cải thiện bài dạy.', intent: 'Analyze lesson-study material and create observation forms, discussion questions and improvement directions.' },
  observations: { action: 'observationForm', intentVi: 'Từ phiếu dự giờ/ghi chú, tạo nhận xét góp ý chuyên môn theo hướng xây dựng và có minh chứng.', intent: 'Turn observation notes into constructive professional feedback with evidence.' },
  assessment: { action: 'assessmentReview', intentVi: 'Rà soát ma trận, đặc tả, đề, đáp án hoặc phân tích kết quả; nêu lỗi cần chỉnh và đề xuất cải thiện.', intent: 'Review test matrices, specifications, tests, keys or result analysis and suggest improvements.' },
  tasks: { action: 'followUpTasks', intentVi: 'Từ văn bản được tải lên, tách thành danh sách nhiệm vụ theo mẫu: việc | người phụ trách | hạn | minh chứng.', intent: 'Extract tasks from uploaded text using: task | owner | deadline | evidence.' },
  documents: { action: 'evidenceChecklist', intentVi: 'Phân loại tài liệu/hồ sơ được tải lên, tạo checklist minh chứng và gợi ý thư mục lưu trữ.', intent: 'Classify uploaded records, create an evidence checklist and suggest archive folders.' },
  submissions: { action: 'evidenceChecklist', intentVi: 'Rà soát hồ sơ giáo viên nộp, tạo phản hồi duyệt/trả lại và đề xuất thư mục lưu kho.', intent: 'Review teacher submissions, draft approval/revision feedback and suggest archive folders.' },
  teacherDev: { action: 'leaderBrief', intentVi: 'Phân tích minh chứng phát triển giáo viên, nhu cầu bồi dưỡng và kế hoạch hỗ trợ tổ viên.', intent: 'Analyze teacher-development evidence, training needs and support plans.' },
  studentActivities: { action: 'monthlyPlan', intentVi: 'Từ tài liệu hoạt động học sinh/HSG/CLB, tạo kế hoạch triển khai, phân công và minh chứng cần lưu.', intent: 'Create an implementation plan for student/gifted/club activities with owners and evidence.' },
  aiCopilot: { action: 'leaderBrief', intentVi: 'Tiếp tục xử lý nguồn văn bản hiện có và tạo nội dung hỗ trợ TTCM.', intent: 'Continue processing the current source and generate leader support content.' },
  reports: { action: 'leaderBrief', intentVi: 'Từ dữ liệu và tài liệu bổ sung, tạo báo cáo chuyên môn hành chính ngắn gọn, đúng cấu trúc.', intent: 'Create a concise administrative department report from data and sources.' },
  policies: { action: 'adminDocument', intentVi: 'Rà soát văn bản/mẫu biểu và soạn bản hành chính áp dụng cho tổ chuyên môn.', intent: 'Review policies/templates and draft an administrative document for the department.' },
};
const STATUS_OPTIONS = ['Đề xuất', 'Chưa làm', 'Đang làm', 'Đang thực hiện', 'Chờ duyệt', 'Hoàn thành'];
const DONE_STATUS = 'Hoàn thành';

const STRUCTURED_MODULES = {
  lessonStudy: {
    collection: 'lessonStudies',
    titleVi: 'Nghiên cứu bài học',
    title: 'Lesson Study',
    itemType: 'NCBH',
    ownerLabelVi: 'Người phụ trách / lớp minh họa',
    dateLabelVi: 'Ngày dạy minh họa',
    noteLabelVi: 'Vấn đề cần cải thiện / kết luận rút kinh nghiệm',
    emptyVi: 'Chưa có chu trình nghiên cứu bài học nào.',
    quick: ['Chọn vấn đề học sinh gặp khó', 'Thiết kế bài học minh họa', 'Dự giờ theo hoạt động học', 'Phân tích nguyên nhân', 'Điều chỉnh bài dạy'],
  },
  observations: {
    collection: 'observations',
    titleVi: 'Dự giờ & góp ý',
    title: 'Observation & Feedback',
    itemType: 'Dự giờ',
    ownerLabelVi: 'Giáo viên / lớp / tiết',
    dateLabelVi: 'Ngày dự giờ',
    noteLabelVi: 'Ưu điểm, góp ý, điểm cần cải thiện',
    emptyVi: 'Chưa có lịch dự giờ hoặc phiếu góp ý.',
    quick: ['Lập lịch dự giờ', 'Lưu phiếu góp ý', 'Gắn giáo án/minh chứng', 'Theo dõi cải thiện sau góp ý'],
  },
  assessment: {
    collection: 'assessments',
    titleVi: 'Kiểm tra đánh giá',
    title: 'Assessment Management',
    itemType: 'Đánh giá',
    ownerLabelVi: 'Khối / nhóm ra đề / người duyệt',
    dateLabelVi: 'Hạn hoàn thành',
    noteLabelVi: 'Ma trận, đặc tả, đề, đáp án, phân tích chất lượng',
    emptyVi: 'Chưa có đầu việc kiểm tra đánh giá.',
    quick: ['Ma trận đề', 'Đặc tả đề', 'Ngân hàng câu hỏi', 'Duyệt đề', 'Phân tích kết quả'],
  },
  teacherDev: {
    collection: 'teacherDevelopment',
    titleVi: 'Phát triển giáo viên',
    title: 'Teacher Development',
    itemType: 'Bồi dưỡng GV',
    ownerLabelVi: 'Giáo viên / nhóm phụ trách',
    dateLabelVi: 'Hạn / ngày sinh hoạt chuyên đề',
    noteLabelVi: 'Nhu cầu bồi dưỡng, sản phẩm, minh chứng',
    emptyVi: 'Chưa có kế hoạch bồi dưỡng giáo viên.',
    quick: ['Nhu cầu bồi dưỡng', 'Chuyên đề nội bộ', 'Minh chứng tập huấn', 'Kế hoạch phát triển GV'],
  },
  studentActivities: {
    collection: 'studentActivities',
    titleVi: 'HSG / CLB / Ngoại khóa',
    title: 'Student Activities',
    itemType: 'Hoạt động HS',
    ownerLabelVi: 'Người phụ trách / nhóm học sinh',
    dateLabelVi: 'Thời gian / deadline',
    noteLabelVi: 'Kế hoạch, sản phẩm, kết quả, minh chứng',
    emptyVi: 'Chưa có hoạt động học sinh nào.',
    quick: ['Bồi dưỡng HSG', 'CLB tiếng Anh', 'English Day', 'Cuộc thi / dự án', 'Theo dõi thành tích'],
  },
  policies: {
    collection: 'policies',
    titleVi: 'Văn bản & mẫu biểu',
    title: 'Policies & Templates',
    itemType: 'Văn bản',
    ownerLabelVi: 'Loại văn bản / nơi ban hành',
    dateLabelVi: 'Ngày cập nhật',
    noteLabelVi: 'Nội dung áp dụng cho tổ chuyên môn',
    emptyVi: 'Chưa có văn bản hoặc mẫu biểu tự thêm.',
    quick: POLICY_PINS,
  },
};

const DEPARTMENT_MODULE_GROUPS = [
  {
    id: 'command',
    icon: '⚡',
    titleVi: 'Điều hành nhanh',
    title: 'Command Center',
    descVi: 'Tổng quan, nhiệm vụ, hồ sơ chờ duyệt, báo cáo và trợ lý AI cho TTCM.',
    desc: 'Overview, tasks, pending submissions, reports and AI support for department leaders.',
    moduleKeys: ['dashboard', 'featureLab', 'aiCopilot', 'tasks', 'submissions', 'reports'],
  },
  {
    id: 'professional-cycle',
    icon: '🔁',
    titleVi: 'Chu trình chuyên môn',
    title: 'Professional Cycle',
    descVi: 'Kế hoạch → lịch làm việc → sinh hoạt tổ → nghiên cứu bài học → dự giờ/góp ý.',
    desc: 'Plans → work schedule → meetings → lesson study → observation and feedback.',
    moduleKeys: ['plans', 'meetings', 'workSchedule', 'lessonStudy', 'observations'],
  },
  {
    id: 'quality-growth',
    icon: '📈',
    titleVi: 'Chất lượng & phát triển',
    title: 'Quality & Growth',
    descVi: 'Kiểm tra đánh giá, bồi dưỡng giáo viên, HSG/CLB/ngoại khóa.',
    desc: 'Assessment, teacher development, gifted students, clubs and events.',
    moduleKeys: ['assessment', 'teacherDev', 'studentActivities'],
  },
  {
    id: 'records',
    icon: '🗄️',
    titleVi: 'Hồ sơ & văn bản',
    title: 'Records & Policies',
    descVi: 'Minh chứng, hồ sơ tổ, công văn, mẫu biểu và dữ liệu xuất bản.',
    desc: 'Evidence, department records, policies, templates and official data.',
    moduleKeys: ['documents', 'policies'],
  },
];

const DEPARTMENT_AI_ACTIONS = [
  {
    id: 'leaderBrief',
    titleVi: 'Tóm tắt điều hành cho TTCM',
    title: 'Leader executive brief',
    descVi: 'Tóm tắt việc cần ưu tiên, rủi ro, hồ sơ chờ duyệt và đề xuất hành động tuần này.',
    desc: 'Summarize priorities, risks, pending evidence and actions for this week.',
    target: 'report',
  },
  {
    id: 'monthlyPlan',
    titleVi: 'Tạo kế hoạch tháng/tuần',
    title: 'Create monthly/weekly plan',
    descVi: 'Soạn kế hoạch tổ theo văn phong hành chính, có phân công, deadline và minh chứng.',
    desc: 'Draft a department plan with assignments, deadlines and evidence.',
    target: 'plan',
  },
  {
    id: 'meetingMinutes',
    titleVi: 'Tạo agenda/biên bản họp tổ',
    title: 'Create meeting agenda/minutes',
    descVi: 'Tạo agenda hoặc biên bản dựa trên việc quá hạn, việc sắp đến và hồ sơ chờ duyệt.',
    desc: 'Create an agenda or minutes from overdue work, upcoming items and submissions.',
    target: 'meeting',
  },
  {
    id: 'followUpTasks',
    titleVi: 'Rút nhiệm vụ từ biên bản/báo cáo',
    title: 'Extract follow-up tasks',
    descVi: 'Chuyển nội dung họp/báo cáo thành danh sách nhiệm vụ có người phụ trách và deadline.',
    desc: 'Turn notes into tasks with owners and deadlines.',
    target: 'tasks',
  },
  {
    id: 'observationForm',
    titleVi: 'Tạo phiếu dự giờ/góp ý',
    title: 'Create observation form',
    descVi: 'Tạo phiếu quan sát theo hướng tập trung vào hoạt động học của học sinh.',
    desc: 'Create a student-learning-focused observation form.',
    target: 'document',
  },
  {
    id: 'assessmentReview',
    titleVi: 'Rà soát kiểm tra đánh giá',
    title: 'Assessment review',
    descVi: 'Kiểm tra ma trận, đặc tả, đề, đáp án và đề xuất cải thiện chất lượng đánh giá.',
    desc: 'Review assessment plans/specifications and suggest improvements.',
    target: 'assessment',
  },
  {
    id: 'evidenceChecklist',
    titleVi: 'Tạo checklist hồ sơ minh chứng',
    title: 'Create evidence checklist',
    descVi: 'Tạo checklist hồ sơ còn thiếu theo năm học/học kỳ để TTCM theo dõi.',
    desc: 'Create a missing-evidence checklist for the school year/semester.',
    target: 'document',
  },
  {
    id: 'adminDocument',
    titleVi: 'Soạn văn bản hành chính',
    title: 'Draft administrative document',
    descVi: 'Chuyển nội dung AI/tài liệu tải lên thành thông báo, kế hoạch, báo cáo, công văn, tờ trình hoặc biên bản chuẩn văn phong nhà trường.',
    desc: 'Turn AI output or uploaded documents into school-style notices, plans, reports, official letters, proposals or minutes.',
    target: 'document',
  },
];

const DEPARTMENT_FEATURE_SUGGESTIONS = [
  {
    id: 'global-music',
    icon: '🎵',
    titleVi: 'Nhạc nền toàn hệ thống',
    title: 'Global background music',
    categoryVi: 'Trải nghiệm hệ thống',
    category: 'System UX',
    priorityVi: 'Cao',
    priority: 'High',
    effortVi: 'Trung bình',
    effort: 'Medium',
    impactVi: 'Giữ không khí lớp học/giáo viên ổn định khi chuyển trang; không phát lại từ đầu.',
    impact: 'Keep a consistent atmosphere while navigating without restarting playback.',
    descVi: 'Tạo bộ phát nhạc nền đặt ngoài router, có play/pause, âm lượng, loop, tải file hoặc nhập URL; lưu theo tài khoản và ghi nhớ vị trí phát.',
    desc: 'Add a persistent music player outside routing with play/pause, volume, loop, upload/URL and account-based position memory.',
    stepsVi: ['Đặt player ở App shell, không nằm trong từng trang.', 'Lưu trạng thái theo tài khoản đăng nhập.', 'Chặn autoplay; chỉ phát sau khi người dùng bấm Play.', 'Giữ audio element không bị remount khi đổi hash route.'],
  },
  {
    id: 'submission-sla',
    icon: '⏱️',
    titleVi: 'SLA duyệt hồ sơ giáo viên nộp',
    title: 'Submission review SLA',
    categoryVi: 'Hồ sơ minh chứng',
    category: 'Evidence',
    priorityVi: 'Cao',
    priority: 'High',
    effortVi: 'Thấp',
    effort: 'Low',
    impactVi: 'TTCM biết hồ sơ nào sắp quá hạn duyệt, giáo viên thấy phản hồi rõ hơn.',
    impact: 'Leaders see review deadlines and teachers get clearer feedback.',
    descVi: 'Mỗi thông báo nộp hồ sơ có hạn nộp và hạn duyệt; dashboard cảnh báo hồ sơ quá hạn duyệt hoặc bị trả lại nhiều lần.',
    desc: 'Each submission request gets a due date and review deadline; dashboard highlights overdue reviews and repeated rejections.',
    stepsVi: ['Thêm hạn duyệt cho thông báo nộp.', 'Dashboard tách “quá hạn nộp” và “quá hạn duyệt”.', 'Lưu lịch sử phản hồi theo từng lần duyệt.'],
  },
  {
    id: 'meeting-to-tasks',
    icon: '🧩',
    titleVi: 'Tách nhiệm vụ từ biên bản họp',
    title: 'Meeting minutes to tasks',
    categoryVi: 'Sinh hoạt tổ',
    category: 'Meetings',
    priorityVi: 'Cao',
    priority: 'High',
    effortVi: 'Trung bình',
    effort: 'Medium',
    impactVi: 'Sau họp tổ, TTCM tạo nhanh nhiệm vụ có người phụ trách, deadline và minh chứng.',
    impact: 'After meetings, leaders can quickly create assigned tasks with due dates and evidence.',
    descVi: 'Cho phép dán/tải biên bản, AI hoặc rule-based parser rút nhiệm vụ rồi đưa vào phân công nhiệm vụ.',
    desc: 'Allow pasted/uploaded minutes to be parsed into tasks and added to task assignment.',
    stepsVi: ['Dùng nguồn văn bản AI TTCM hiện có.', 'Chuẩn hóa mẫu dòng nhiệm vụ.', 'Có màn hình xác nhận trước khi thêm hàng loạt.'],
  },
  {
    id: 'teacher-portfolio',
    icon: '👩‍🏫',
    titleVi: 'Hồ sơ năng lực từng giáo viên',
    title: 'Teacher professional portfolio',
    categoryVi: 'Phát triển giáo viên',
    category: 'Teacher development',
    priorityVi: 'Trung bình',
    priority: 'Medium',
    effortVi: 'Trung bình',
    effort: 'Medium',
    impactVi: 'TTCM theo dõi chuyên đề mạnh, minh chứng, dự giờ, tập huấn và đóng góp của từng tổ viên.',
    impact: 'Track each teacher’s strengths, evidence, observations, training and contributions.',
    descVi: 'Tạo trang hồ sơ theo giáo viên, tự gom nhiệm vụ, hồ sơ đã nộp, dự giờ, chuyên đề và ghi chú bồi dưỡng.',
    desc: 'Create a teacher profile page aggregating tasks, submissions, observations, workshops and development notes.',
    stepsVi: ['Chuẩn hóa danh sách giáo viên theo email.', 'Gom dữ liệu từ workload, submissions, observations.', 'Xuất hồ sơ cá nhân dạng HTML/PDF.'],
  },
  {
    id: 'quality-analytics',
    icon: '📈',
    titleVi: 'Dashboard chất lượng kiểm tra đánh giá',
    title: 'Assessment quality analytics',
    categoryVi: 'Kiểm tra đánh giá',
    category: 'Assessment',
    priorityVi: 'Trung bình',
    priority: 'Medium',
    effortVi: 'Cao',
    effort: 'High',
    impactVi: 'Kết nối ma trận, đề, kết quả lớp để TTCM thấy lớp/kĩ năng/câu hỏi cần hỗ trợ.',
    impact: 'Connect test matrices and results to reveal classes, skills and questions needing support.',
    descVi: 'Nhập file điểm hoặc bảng phân tích câu hỏi; hệ thống gợi ý chuyên đề bù đắp và nhiệm vụ cho nhóm ra đề.',
    desc: 'Import score/item analysis files and generate remediation topics and assessment-team tasks.',
    stepsVi: ['Thêm import Excel/CSV kết quả.', 'Tạo chỉ số theo lớp/kĩ năng/mức độ nhận thức.', 'Gợi ý kế hoạch bù đắp sau kiểm tra.'],
  },
  {
    id: 'auto-reminders',
    icon: '🔔',
    titleVi: 'Nhắc việc thông minh theo lịch',
    title: 'Smart reminders',
    categoryVi: 'Điều hành',
    category: 'Operations',
    priorityVi: 'Trung bình',
    priority: 'Medium',
    effortVi: 'Trung bình',
    effort: 'Medium',
    impactVi: 'Giảm việc TTCM phải nhắc thủ công; giáo viên thấy việc sắp đến trong 7 ngày.',
    impact: 'Reduce manual reminders and show teachers upcoming work for the next 7 days.',
    descVi: 'Tạo nhắc việc trong dashboard, xuất lịch .ics, và chuẩn bị nội dung tin nhắn nhắc nộp hồ sơ theo mẫu.',
    desc: 'Create dashboard reminders, .ics export and templated reminder messages for submissions.',
    stepsVi: ['Lấy dữ liệu từ lịch, nhiệm vụ, thông báo nộp hồ sơ.', 'Tạo mẫu tin nhắn Zalo/email để copy.', 'Gắn trạng thái đã nhắc/chưa nhắc.'],
  },
  {
    id: 'interactive-notification-center',
    icon: '🔔',
    titleVi: 'Trung tâm thông báo thao tác nhanh',
    title: 'Actionable notification center',
    categoryVi: 'Điều hành hệ thống',
    category: 'System operations',
    priorityVi: 'Cao',
    priority: 'High',
    effortVi: 'Thấp',
    effort: 'Low',
    impactVi: 'Mọi thông báo trên thanh trạng thái có thể mở đúng phân hệ, đánh dấu đã xem, xử lý nhanh hoặc kiểm tra lại trạng thái.',
    impact: 'Every status-bar notification can open the relevant module, be marked as read, acted on, or refreshed.',
    descVi: 'Chuẩn hóa thông báo thành thẻ có hành động chính/phụ: mở Cài đặt API, mở Dashboard tổ, mở nhạc nền, kiểm tra hệ thống, xem lịch.',
    desc: 'Normalize notifications into cards with primary/secondary actions such as settings, department dashboard, music, system check and schedule.',
    stepsVi: ['Tạo action schema cho thông báo.', 'Cho phép bấm cả thẻ hoặc nút riêng.', 'Lưu trạng thái đã xem theo phiên/tài khoản.'],
  },
  {
    id: 'wp8-motion-system',
    icon: '▦',
    titleVi: 'Hệ chuyển cảnh Windows Phone 8 chuẩn hơn',
    title: 'Refined Windows Phone 8 motion system',
    categoryVi: 'Trải nghiệm giao diện',
    category: 'Interface motion',
    priorityVi: 'Cao',
    priority: 'High',
    effortVi: 'Trung bình',
    effort: 'Medium',
    impactVi: 'Giao diện chuyển trang mượt, ít rối mắt hơn, indicator dạng chấm chạy ngang đúng tinh thần WP8.',
    impact: 'Navigation feels smoother and the dot-runner indicator better matches the WP8 visual language.',
    descVi: 'Thay hiệu ứng gương lỏng bằng bề mặt phẳng, chuyển cảnh nhẹ và thanh indicator chấm chạy ngang tối giản.',
    desc: 'Replace liquid glass with flat surfaces, subtle transitions and a minimal horizontal dot-runner indicator.',
    stepsVi: ['Giữ nền phẳng Metro toàn hệ thống.', 'Giảm chuyển động khi chuyển trang.', 'Dùng dot-runner strip thay cho thanh mô tả dài.'],
  },
  {
    id: 'admin-document-pack',
    icon: '📄',
    titleVi: 'Bộ mẫu văn bản hành chính theo trường',
    title: 'School administrative document templates',
    categoryVi: 'AI TTCM',
    category: 'AI Copilot',
    priorityVi: 'Cao',
    priority: 'High',
    effortVi: 'Trung bình',
    effort: 'Medium',
    impactVi: 'TTCM soạn nhanh thông báo, kế hoạch, báo cáo, biên bản, tờ trình theo đúng thể thức trường.',
    impact: 'Department leaders can draft notices, plans, reports, minutes and proposals in the school format faster.',
    descVi: 'Thêm thư viện mẫu có logo, quốc hiệu/tiêu ngữ, nơi nhận, người ký, căn cứ và phần lưu hồ sơ tổ.',
    desc: 'Add a template library with letterhead, recipients, signer, legal basis and department archive fields.',
    stepsVi: ['Tạo preset mẫu văn bản.', 'Cho phép lưu mẫu riêng của trường.', 'Xuất DOCX/PDF và lưu vào hồ sơ tổ.'],
  },
  {
    id: 'supabase-storage-archive',
    icon: '☁️',
    titleVi: 'Đồng bộ kho hồ sơ lên Supabase Storage',
    title: 'Supabase Storage archive sync',
    categoryVi: 'Hồ sơ minh chứng',
    category: 'Evidence archive',
    priorityVi: 'Cao',
    priority: 'High',
    effortVi: 'Cao',
    effort: 'High',
    impactVi: 'Hồ sơ tổ không chỉ nằm trong trình duyệt; TTCM có thể truy xuất lại khi đổi máy hoặc đổi tài khoản.',
    impact: 'Department records are no longer browser-only and can be recovered across devices/accounts.',
    descVi: 'Tạo bucket lưu file minh chứng, liên kết metadata với hồ sơ/nhiệm vụ/thông báo duyệt.',
    desc: 'Create a storage bucket for evidence files and connect metadata to records, tasks and submission reviews.',
    stepsVi: ['Tạo bucket và RLS theo vai trò.', 'Upload file thay vì chỉ lưu base64/local.', 'Thêm tìm kiếm và tải lại file từ kho.'],
  },
];

function today() {
  return new Date().toISOString().slice(0, 10);
}

const WORK_SCHEDULE_TYPES = ['Lịch làm việc', 'Họp tổ', 'Dự giờ', 'Chuyên đề', 'Hạn nộp hồ sơ', 'Kiểm tra đánh giá', 'Bồi dưỡng GV', 'Hoạt động học sinh'];

function isoDateFromValue(value, fallback = '') {
  const raw = String(value || '').trim();
  if (!raw) return fallback;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
  const dmy = raw.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/);
  if (dmy) {
    const [, day, month, year] = dmy;
    return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) return parsed.toISOString().slice(0, 10);
  return fallback;
}

function addIsoDays(dateValue, days) {
  const base = new Date(`${isoDateFromValue(dateValue, today())}T12:00:00`);
  base.setDate(base.getDate() + Number(days || 0));
  return base.toISOString().slice(0, 10);
}

function weekStartIso(dateValue = today()) {
  const base = new Date(`${isoDateFromValue(dateValue, today())}T12:00:00`);
  const day = base.getDay();
  const delta = day === 0 ? -6 : 1 - day;
  base.setDate(base.getDate() + delta);
  return base.toISOString().slice(0, 10);
}

function normalizeScheduleTime(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  const match = raw.match(/^(\d{1,2})(?::|h|H|\.)(\d{1,2})/);
  if (match) {
    const hour = Math.min(23, Math.max(0, Number(match[1])));
    const minute = Math.min(59, Math.max(0, Number(match[2])));
    return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  }
  const hourOnly = raw.match(/^(\d{1,2})\s*(?:h|H)$/);
  if (hourOnly) return `${String(Math.min(23, Number(hourOnly[1]))).padStart(2, '0')}:00`;
  return '';
}

function normalizeScheduleType(value) {
  const raw = String(value || '').trim().toLowerCase();
  const matched = WORK_SCHEDULE_TYPES.find((item) => item.toLowerCase() === raw);
  if (matched) return matched;
  if (/họp|meeting|sinh hoạt tổ/.test(raw)) return 'Họp tổ';
  if (/dự giờ|observation/.test(raw)) return 'Dự giờ';
  if (/chuyên đề|workshop|seminar/.test(raw)) return 'Chuyên đề';
  if (/hạn|nộp|deadline|submission/.test(raw)) return 'Hạn nộp hồ sơ';
  if (/kiểm tra|đánh giá|assessment|test/.test(raw)) return 'Kiểm tra đánh giá';
  if (/bồi dưỡng|tập huấn|training/.test(raw)) return 'Bồi dưỡng GV';
  if (/học sinh|clb|ngoại khóa|student/.test(raw)) return 'Hoạt động học sinh';
  return 'Lịch làm việc';
}

function normalizeImportedScheduleItem(item, index, fallbackWeekStart, fileName = '') {
  const source = item && typeof item === 'object' ? item : {};
  const fallbackDate = addIsoDays(fallbackWeekStart, Math.min(Math.max(index, 0), 6));
  const date = isoDateFromValue(source.date || source.day || source.deadline, fallbackDate);
  const title = String(source.title || source.task || source.event || source.content || '').replace(/\s+/g, ' ').trim();
  const owner = String(source.owner || source.assignee || source.participants || source.person || 'TTCM').replace(/\s+/g, ' ').trim();
  const location = String(source.location || source.room || source.place || source.link || '').replace(/\s+/g, ' ').trim();
  const noteParts = [source.note, source.preparation, source.evidence, source.description]
    .map((value) => String(value || '').trim())
    .filter(Boolean);
  if (fileName) noteParts.push(`Nguồn: ${fileName}`);
  return {
    id: cryptoId(),
    selected: true,
    title,
    owner: owner || 'TTCM',
    date,
    startTime: normalizeScheduleTime(source.startTime || source.start || source.time),
    endTime: normalizeScheduleTime(source.endTime || source.end),
    location,
    type: normalizeScheduleType(source.type || source.category),
    status: STATUS_OPTIONS.includes(source.status) ? source.status : 'Chưa làm',
    note: [...new Set(noteParts)].join(' · '),
    confidence: Number.isFinite(Number(source.confidence)) ? Math.max(0, Math.min(1, Number(source.confidence))) : null,
  };
}

function parseScheduleAIResponse(rawText, fallbackWeekStart, fileName = '') {
  const parsed = extractJson(rawText);
  const sourceItems = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.items) ? parsed.items : []);
  const detectedWeekStart = weekStartIso(parsed?.weekStart || parsed?.detectedWeekStart || fallbackWeekStart);
  const items = sourceItems
    .map((item, index) => normalizeImportedScheduleItem(item, index, detectedWeekStart, fileName))
    .filter((item) => item.title);
  return {
    items,
    weekStart: detectedWeekStart,
    summary: String(parsed?.summary || parsed?.documentSummary || '').trim(),
    warnings: toArray(parsed?.warnings).map((item) => String(item || '').trim()).filter(Boolean),
  };
}

function scheduleFingerprint(item) {
  return [item?.title, item?.date, item?.startTime, item?.owner]
    .map((value) => String(value || '').trim().toLowerCase().replace(/\s+/g, ' '))
    .join('|');
}

function cryptoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function toArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeWorkspaceData(data, language = 'vi') {
  const base = createInitialData(language);
  const merged = { ...base, ...(data || {}) };
  ['teachers', 'plans', 'meetings', 'tasks', 'documents', 'reports', 'lessonStudies', 'observations', 'assessments', 'teacherDevelopment', 'studentActivities', 'policies', 'workSchedules', 'featureRoadmap'].forEach((key) => {
    merged[key] = toArray(merged[key]);
  });
  ['plans', 'meetings', 'tasks', 'documents', 'lessonStudies', 'observations', 'assessments', 'teacherDevelopment', 'studentActivities'].forEach((key) => {
    merged[key] = removeLegacyDemoItems(merged[key]);
  });
  return merged;
}


const LEGACY_DEMO_TITLES = new Set([
  'Kế hoạch năm học tổ Tiếng Anh',
  'Kế hoạch kiểm tra đánh giá học kỳ I',
  'Sinh hoạt tổ chuyên môn định kỳ',
  'Hoàn thiện ma trận đề kiểm tra giữa kỳ',
  'Chuẩn bị chuyên đề dạy Cloze Test THPT',
  'Thông tư 32/2020/TT-BGDĐT - Điều lệ trường trung học',
  'Công văn 5512/BGDĐT-GDTrH - Kế hoạch giáo dục nhà trường',
  'NCBH: Tăng tương tác khi dạy Word Form',
  'Dự giờ góp ý tiết đọc hiểu THPT',
  'Duyệt ma trận và đặc tả đề giữa kỳ',
  'Chuyên đề nội bộ: dùng AI thiết kế hoạt động lớp học',
  'Kế hoạch bồi dưỡng HSG Tiếng Anh THPT',
]);

function removeLegacyDemoItems(items) {
  return toArray(items).filter((item) => !LEGACY_DEMO_TITLES.has(String(item?.title || '').trim()));
}

function createInitialData(language = 'vi') {
  const now = today();
  return {
    schoolYear: '2026-2027',
    semester: 'Học kỳ I',
    teachers: ['TTCM', 'Tổ phó', 'Giáo viên 10', 'Giáo viên 11', 'Giáo viên 12'],
    plans: [],
    meetings: [],
    tasks: [],
    documents: [],
    lessonStudies: [],
    observations: [],
    assessments: [],
    teacherDevelopment: [],
    studentActivities: [],
    policies: [],
    workSchedules: [],
    featureRoadmap: [],
    reports: [],
    cloudSavedAt: '',
    lastUpdated: new Date().toISOString(),
    language,
  };
}

function getSharedKeys(schoolYear = '2026-2027') {
  return [
    `${STORE_PREFIX}:${SHARED_STORE_SUFFIX}:${schoolYear || '2026-2027'}`,
    `${STORE_PREFIX}:${SHARED_STORE_SUFFIX}`,
  ];
}

function readSharedData(language) {
  for (const key of getSharedKeys()) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      return normalizeWorkspaceData(JSON.parse(raw), language);
    } catch {
      // ignore malformed shared cache
    }
  }
  return null;
}

function dispatchDepartmentSnapshotEvent() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent(DEPARTMENT_SNAPSHOT_EVENT));
  }
}

function saveSharedData(data, language = 'vi') {
  const next = normalizeWorkspaceData({ ...data, lastUpdated: new Date().toISOString() }, language);
  try {
    getSharedKeys(next.schoolYear).forEach((key) => localStorage.setItem(key, JSON.stringify(next)));
    dispatchDepartmentSnapshotEvent();
  } catch {
    // Keep the workspace usable even when localStorage is unavailable.
  }
  return next;
}

function readData(userId, language, preferShared = false) {
  const key = `${STORE_PREFIX}:${userId || 'guest'}`;
  const shared = preferShared ? readSharedData(language) : null;
  if (shared) return shared;
  try {
    const raw = localStorage.getItem(key);
    if (raw) return normalizeWorkspaceData(JSON.parse(raw), language);
  } catch {
    // ignore malformed user cache
  }
  return readSharedData(language) || createInitialData(language);
}

function saveData(userId, data, language = 'vi') {
  const key = `${STORE_PREFIX}:${userId || 'guest'}`;
  const next = normalizeWorkspaceData({ ...data, lastUpdated: new Date().toISOString() }, language);
  localStorage.setItem(key, JSON.stringify(next));
  dispatchDepartmentSnapshotEvent();
  return next;
}

function formatDate(value) {
  if (!value) return '—';
  try { return new Intl.DateTimeFormat('vi-VN').format(new Date(value)); } catch { return value; }
}

function formatDateTime(value) {
  if (!value) return '—';
  try { return new Intl.DateTimeFormat('vi-VN', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(value)); } catch { return value; }
}

function formatFileSize(bytes = 0) {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size <= 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${Math.round(size / 102.4) / 10} KB`;
  return `${Math.round(size / 1024 / 102.4) / 10} MB`;
}

function cleanArchiveSegment(value, fallback = 'Khác') {
  const text = String(value || fallback).trim().replace(/[\/]+/g, ' - ').replace(/\s+/g, ' ');
  return text || fallback;
}

function makeSubmissionArchiveFolder(item, schoolYear = '') {
  const year = cleanArchiveSegment(schoolYear || item?.school_year, 'Năm học');
  const category = cleanArchiveSegment(item?.category || item?.request_category, 'Minh chứng');
  const request = cleanArchiveSegment(item?.request_title || item?.related_task, 'Hồ sơ đã duyệt');
  return `${year}/${category}/${request}`;
}

function getArchiveFolders(submissions = []) {
  return Array.from(new Set(toArray(submissions)
    .filter((item) => item.archived_at)
    .map((item) => item.archive_folder || makeSubmissionArchiveFolder(item))
    .filter(Boolean)))
    .sort((a, b) => a.localeCompare(b, 'vi'));
}


function getItemDate(item) {
  return item?.due || item?.deadline || item?.date || item?.scheduleDate || item?.created_at || '';
}

function getDepartmentTimelineTone(item) {
  const key = String(item?.collection || item?.kind || item?.type || '').toLowerCase();
  const label = String(item?.sourceLabel || item?.type || '').toLowerCase();
  if (key.includes('workschedules') || label.includes('lịch')) return 'schedule';
  if (key.includes('meetings') || label.includes('họp')) return 'meeting';
  if (key.includes('plans') || label.includes('kế hoạch')) return 'plan';
  if (key.includes('tasks') || label.includes('nhiệm vụ')) return 'task';
  if (key.includes('lessonstudies') || label.includes('ncbh')) return 'study';
  if (key.includes('observations') || label.includes('dự giờ')) return 'observation';
  if (key.includes('assessments') || label.includes('đánh giá')) return 'assessment';
  if (key.includes('teacherdevelopment') || label.includes('bồi dưỡng')) return 'development';
  if (key.includes('studentactivities') || label.includes('học sinh')) return 'student';
  return 'default';
}

function getDepartmentTimelineClass(item) {
  return `dept-timeline-item-v74 tone-${getDepartmentTimelineTone(item)}`;
}

function getWorkScheduleClass(item) {
  return `department-item-card-v74 tone-${getDepartmentTimelineTone({ collection: 'workSchedules', type: item?.type, sourceLabel: item?.type })}`;
}

function isOpenStatus(status) {
  return status && status !== DONE_STATUS && status !== 'Đã duyệt';
}

function isOverdue(item) {
  const date = getItemDate(item);
  if (!date || !isOpenStatus(item.status)) return false;
  return new Date(date).setHours(0, 0, 0, 0) < new Date(today()).setHours(0, 0, 0, 0);
}

function countOpen(items) {
  return toArray(items).filter((item) => isOpenStatus(item.status)).length;
}

function countDone(items) {
  return toArray(items).filter((item) => item.status === DONE_STATUS || item.status === 'Đã duyệt').length;
}

function makeReport(data, submissions = []) {
  const normalized = normalizeWorkspaceData(data);
  const todo = countOpen(normalized.tasks);
  const done = countDone(normalized.tasks);
  const recentMeeting = normalized.meetings[0];
  const overdue = [...normalized.plans, ...normalized.tasks, ...normalized.assessments, ...normalized.workSchedules].filter(isOverdue).length;
  const lines = [
    '# BÁO CÁO HOẠT ĐỘNG TỔ TIẾNG ANH',
    '',
    `Năm học: ${normalized.schoolYear}`,
    `Học kỳ/Giai đoạn: ${normalized.semester}`,
    `Thời điểm tạo: ${new Intl.DateTimeFormat('vi-VN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date())}`,
    '',
    '## 1. Công tác kế hoạch',
    `- Tổng số kế hoạch đang theo dõi: ${normalized.plans.length}.`,
    `- Kế hoạch chờ duyệt: ${normalized.plans.filter((plan) => plan.status === 'Chờ duyệt').length}.`,
    `- Kế hoạch đang thực hiện: ${normalized.plans.filter((plan) => plan.status === 'Đang thực hiện').length}.`,
    `- Hạng mục quá hạn cần nhắc: ${overdue}.`,
    '',
    '## 2. Sinh hoạt tổ chuyên môn và nghiên cứu bài học',
    recentMeeting ? `- Buổi gần nhất: ${recentMeeting.title} (${formatDate(recentMeeting.date)}).` : '- Chưa ghi nhận buổi sinh hoạt tổ.',
    recentMeeting ? `- Kết luận chính: ${recentMeeting.conclusion}` : '',
    `- Chu trình nghiên cứu bài học đang lưu: ${normalized.lessonStudies.length}.`,
    `- Lượt dự giờ/góp ý đang lưu: ${normalized.observations.length}.`,
    '',
    '## 3. Kiểm tra đánh giá và hoạt động chuyên môn',
    `- Đầu việc kiểm tra đánh giá: ${normalized.assessments.length}.`,
    `- Hoạt động bồi dưỡng giáo viên: ${normalized.teacherDevelopment.length}.`,
    `- Hoạt động HSG/CLB/ngoại khóa: ${normalized.studentActivities.length}.`,
    `- Lịch làm việc TTCM/tổ chuyên môn: ${normalized.workSchedules.length}.`,
    '',
    '## 4. Phân công nhiệm vụ',
    `- Tổng nhiệm vụ: ${normalized.tasks.length}.`,
    `- Đã hoàn thành: ${done}.`,
    `- Cần tiếp tục theo dõi: ${todo}.`,
    ...normalized.tasks.slice(0, 6).map((task) => `- ${task.title}: ${task.owner}, hạn ${formatDate(task.due)}, trạng thái ${task.status}.`),
    '',
    '## 5. Hồ sơ minh chứng',
    `- Tổng hồ sơ/link minh chứng: ${normalized.documents.length}.`,
    `- Hồ sơ giáo viên nộp trên cloud: ${submissions.length}; chờ duyệt: ${submissions.filter((item) => item.status === 'pending').length}.`,
    ...normalized.documents.slice(0, 6).map((doc) => `- ${doc.category}: ${doc.title}${doc.link ? ` (${doc.link})` : ''}.`),
    '',
    '## 6. Đề xuất của TTCM',
    '- Tiếp tục sinh hoạt chuyên môn theo hướng nghiên cứu bài học, tập trung vào hoạt động học của học sinh.',
    '- Chuẩn hóa ma trận, đặc tả và ngân hàng câu hỏi kiểm tra đánh giá.',
    '- Theo dõi tiến độ nhiệm vụ bằng minh chứng cụ thể, tránh chỉ báo cáo bằng nhận xét chung.',
  ].filter(Boolean);
  return lines.join('\n');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function renderHtmlList(title, items, getMeta) {
  const rows = toArray(items).map((item) => `
    <article class="item">
      <h3>${escapeHtml(item.title)}</h3>
      <p class="meta">${escapeHtml(getMeta(item))}</p>
      ${item.note || item.conclusion || item.evidence ? `<p>${escapeHtml(item.note || item.conclusion || item.evidence)}</p>` : ''}
      ${item.link ? `<p><a href="${escapeHtml(item.link)}">${escapeHtml(item.link)}</a></p>` : ''}
    </article>`).join('') || '<p class="empty">Chưa có dữ liệu.</p>';
  return `<section><h2>${escapeHtml(title)}</h2>${rows}</section>`;
}

function makePortfolioHtml(data, submissions = []) {
  const d = normalizeWorkspaceData(data);
  return `<!doctype html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Hồ sơ tổ Tiếng Anh ${escapeHtml(d.schoolYear)}</title>
<style>
  body{font-family:Arial,sans-serif;margin:0;background:#eef6ff;color:#102033;line-height:1.55}
  header{padding:34px;background:#0078d4;color:white}
  header h1{margin:0;font-size:34px} header p{margin:8px 0 0;opacity:.92}
  main{max-width:1120px;margin:0 auto;padding:24px;display:grid;gap:18px}
  section{background:#fff;border:1px solid #dbe7ff;border-radius:0;padding:22px;box-shadow:none}
  h2{margin:0 0 14px;color:#0f62fe}.item{border-top:1px solid #edf2ff;padding:12px 0}.item:first-of-type{border-top:0}
  h3{margin:0 0 4px}.meta{color:#5b6b83;font-weight:700}.empty{color:#6b7280}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
  .stat{background:#eef5ff;border-radius:0;padding:16px}.stat strong{display:block;font-size:28px;color:#0f62fe}
  @media(max-width:760px){.grid{grid-template-columns:1fr}main{padding:14px}}
</style>
</head>
<body>
<header>
  <h1>Hồ sơ tổ chuyên môn Tiếng Anh</h1>
  <p>Năm học ${escapeHtml(d.schoolYear)} · ${escapeHtml(d.semester)} · Xuất từ Brian English Studio V1.0</p>
</header>
<main>
  <section><h2>Tổng quan</h2><div class="grid">
    <div class="stat"><strong>${d.plans.length}</strong>Kế hoạch</div>
    <div class="stat"><strong>${d.meetings.length}</strong>Biên bản họp</div>
    <div class="stat"><strong>${d.tasks.length}</strong>Nhiệm vụ</div>
    <div class="stat"><strong>${d.documents.length}</strong>Minh chứng</div>
    <div class="stat"><strong>${d.workSchedules.length}</strong>Lịch làm việc</div>
    <div class="stat"><strong>${d.featureRoadmap.length}</strong>Đề xuất nâng cấp</div>
  </div></section>
  ${renderHtmlList('Kế hoạch chuyên môn', d.plans, (item) => `${item.type || 'Kế hoạch'} · ${item.owner || ''} · ${formatDate(item.deadline)} · ${item.status || ''}`)}
  ${renderHtmlList('Sinh hoạt tổ chuyên môn', d.meetings, (item) => `${item.type || 'Sinh hoạt tổ'} · ${item.chair || ''} · ${formatDate(item.date)}`)}
  ${renderHtmlList('Phân công nhiệm vụ', d.tasks, (item) => `${item.owner || ''} · ${formatDate(item.due)} · ${item.status || ''}`)}
  ${renderHtmlList('Lịch làm việc', d.workSchedules, (item) => `${item.type || 'Lịch làm việc'} · ${item.owner || ''} · ${formatDate(item.date)}${item.startTime ? ` · ${item.startTime}${item.endTime ? `-${item.endTime}` : ''}` : ''} · ${item.status || ''}`)}
  ${renderHtmlList('Đề xuất nâng cấp', d.featureRoadmap, (item) => `${item.category || 'Nâng cấp'} · ${item.owner || ''} · ${formatDate(item.date)} · ${item.status || ''}`)}
  ${renderHtmlList('Nghiên cứu bài học', d.lessonStudies, (item) => `${item.owner || ''} · ${formatDate(item.date)} · ${item.status || ''}`)}
  ${renderHtmlList('Dự giờ & góp ý', d.observations, (item) => `${item.owner || ''} · ${formatDate(item.date)} · ${item.status || ''}`)}
  ${renderHtmlList('Kiểm tra đánh giá', d.assessments, (item) => `${item.owner || ''} · ${formatDate(item.date)} · ${item.status || ''}`)}
  ${renderHtmlList('Phát triển giáo viên', d.teacherDevelopment, (item) => `${item.owner || ''} · ${formatDate(item.date)} · ${item.status || ''}`)}
  ${renderHtmlList('HSG / CLB / Ngoại khóa', d.studentActivities, (item) => `${item.owner || ''} · ${formatDate(item.date)} · ${item.status || ''}`)}
  ${renderHtmlList('Hồ sơ tổ & minh chứng', d.documents, (item) => `${item.category || 'Hồ sơ'} · ${item.sourceSubmissionId ? 'GV nộp' : 'TTCM thêm'}`)}
  ${renderHtmlList('Văn bản & mẫu biểu', d.policies, (item) => `${item.owner || item.type || 'Văn bản'} · ${formatDate(item.date)}`)}
  ${renderHtmlList('Hồ sơ giáo viên nộp', submissions, (item) => `${item.category || 'Minh chứng'} · ${item.submitter_name || item.submitter_email || ''} · ${item.status || ''} · ${formatDateTime(item.created_at)}${item.file_name ? ` · Tệp: ${item.file_name}` : ''}`)}
</main>
</body>
</html>`;
}

function parseLocalDate(value) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  date.setHours(0, 0, 0, 0);
  return date;
}

function daysFromToday(value) {
  const date = parseLocalDate(value);
  if (!date) return null;
  const now = parseLocalDate(today());
  return Math.round((date.getTime() - now.getTime()) / 86400000);
}

function getUpcomingItems(data, rangeDays = 14) {
  const sources = [
    ['plans', 'Kế hoạch', 'deadline'],
    ['meetings', 'Họp tổ', 'date'],
    ['workSchedules', 'Lịch làm việc', 'date'],
    ['tasks', 'Nhiệm vụ', 'due'],
    ['lessonStudies', 'NCBH', 'date'],
    ['observations', 'Dự giờ', 'date'],
    ['assessments', 'Đánh giá', 'date'],
    ['teacherDevelopment', 'Bồi dưỡng GV', 'date'],
    ['studentActivities', 'Hoạt động HS', 'date'],
  ];
  return sources.flatMap(([collection, label, dateKey]) => toArray(data[collection]).map((item) => ({
    ...item,
    collection,
    sourceLabel: label,
    agendaDate: item[dateKey] || getItemDate(item),
  })))
    .map((item) => ({ ...item, days: daysFromToday(item.agendaDate) }))
    .filter((item) => item.days !== null && item.days >= 0 && item.days <= rangeDays)
    .sort((a, b) => a.days - b.days || String(a.title).localeCompare(String(b.title)));
}

function getWorkloadRows(data) {
  const buckets = new Map();
  const add = (owner, section, item) => {
    const key = String(owner || 'Chưa phân công').trim() || 'Chưa phân công';
    const current = buckets.get(key) || { owner: key, total: 0, open: 0, done: 0, overdue: 0, sections: {} };
    current.total += 1;
    if (isOpenStatus(item.status)) current.open += 1;
    if (item.status === DONE_STATUS || item.status === 'Đã duyệt') current.done += 1;
    if (isOverdue(item)) current.overdue += 1;
    current.sections[section] = (current.sections[section] || 0) + 1;
    buckets.set(key, current);
  };

  toArray(data.plans).forEach((item) => add(item.owner, 'Kế hoạch', item));
  toArray(data.tasks).forEach((item) => add(item.owner, 'Nhiệm vụ', item));
  toArray(data.workSchedules).forEach((item) => add(item.owner, 'Lịch làm việc', item));
  toArray(data.lessonStudies).forEach((item) => add(item.owner, 'NCBH', item));
  toArray(data.observations).forEach((item) => add(item.owner, 'Dự giờ', item));
  toArray(data.assessments).forEach((item) => add(item.owner, 'Đánh giá', item));
  toArray(data.teacherDevelopment).forEach((item) => add(item.owner, 'Bồi dưỡng', item));
  toArray(data.studentActivities).forEach((item) => add(item.owner, 'Học sinh', item));

  return [...buckets.values()].sort((a, b) => b.open - a.open || b.total - a.total || a.owner.localeCompare(b.owner));
}

function escapeIcs(value) {
  return String(value || '')
    .replaceAll('\\', '\\\\')
    .replaceAll(';', '\\;')
    .replaceAll(',', '\\,')
    .replace(/\r?\n/g, '\\n');
}

function toIcsDate(value) {
  const date = parseLocalDate(value) || parseLocalDate(today());
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

function normalizeTimeValue(value) {
  const match = String(value || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return '';
  const hour = Math.max(0, Math.min(23, Number(match[1]) || 0));
  const minute = Math.max(0, Math.min(59, Number(match[2]) || 0));
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function addMinutesToTime(value, minutes = 60) {
  const normalized = normalizeTimeValue(value) || '08:00';
  const [hour, minute] = normalized.split(':').map(Number);
  const date = new Date(2000, 0, 1, hour, minute + minutes, 0, 0);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function toIcsDateTime(dateValue, timeValue) {
  const date = toIcsDate(dateValue);
  const normalized = normalizeTimeValue(timeValue) || '08:00';
  return `${date}T${normalized.replace(':', '')}00`;
}

function makeDepartmentIcs(data) {
  const d = normalizeWorkspaceData(data);
  const items = getUpcomingItems(d, 365);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Brian English Studio//English Department Workspace//VI',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];
  items.forEach((item) => {
    const timed = Boolean(item.startTime);
    const start = timed ? toIcsDateTime(item.agendaDate, item.startTime) : toIcsDate(item.agendaDate);
    let end = '';
    if (timed) {
      end = toIcsDateTime(item.agendaDate, item.endTime || addMinutesToTime(item.startTime, 60));
    } else {
      const endDate = parseLocalDate(item.agendaDate) || parseLocalDate(today());
      endDate.setDate(endDate.getDate() + 1);
      end = endDate.toISOString().slice(0, 10).replaceAll('-', '');
    }
    lines.push(
      'BEGIN:VEVENT',
      `UID:${escapeIcs(item.collection)}-${escapeIcs(item.id)}@brian-english-studio`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z`,
      timed ? `DTSTART:${start}` : `DTSTART;VALUE=DATE:${start}`,
      timed ? `DTEND:${end}` : `DTEND;VALUE=DATE:${end}`,
      `SUMMARY:${escapeIcs(`[${item.sourceLabel}] ${item.title}`)}`,
      item.location ? `LOCATION:${escapeIcs(item.location)}` : '',
      `DESCRIPTION:${escapeIcs(`${item.owner || item.chair || ''} · ${item.status || ''} · ${item.note || item.conclusion || item.evidence || ''}`)}`,
      'END:VEVENT',
    );
  });
  lines.push('END:VCALENDAR');
  return lines.filter(Boolean).join('\r\n');
}

function makeMeetingAgenda(data, submissions = []) {
  const upcoming = getUpcomingItems(data, 14).slice(0, 6);
  const pendingSubmissions = toArray(submissions).filter((item) => item.status === 'pending').slice(0, 5);
  const overdueItems = [...toArray(data.plans), ...toArray(data.tasks), ...toArray(data.assessments), ...toArray(data.workSchedules)].filter(isOverdue).slice(0, 5);
  const agenda = [
    '1. Rà soát việc đã hoàn thành từ buổi sinh hoạt trước.',
    '2. Kiểm tra tiến độ kế hoạch chuyên môn và kiểm tra đánh giá.',
    overdueItems.length ? `3. Xử lý ${overdueItems.length} hạng mục quá hạn: ${overdueItems.map((item) => item.title).join('; ')}.` : '3. Không có hạng mục quá hạn lớn; tiếp tục theo dõi tiến độ.',
    pendingSubmissions.length ? `4. Duyệt hồ sơ/minh chứng giáo viên nộp: ${pendingSubmissions.map((item) => item.title).join('; ')}.` : '4. Không có hồ sơ giáo viên chờ duyệt.',
    upcoming.length ? `5. Chuẩn bị các việc 14 ngày tới: ${upcoming.map((item) => `${item.sourceLabel}: ${item.title}`).join('; ')}.` : '5. Chưa có việc sắp đến trong 14 ngày tới.',
    '6. Thống nhất phân công, deadline và minh chứng cần nộp sau cuộc họp.',
  ];
  return {
    id: cryptoId(),
    title: `Agenda sinh hoạt tổ - ${formatDate(today())}`,
    date: today(),
    type: 'Agenda tự động',
    chair: 'TTCM',
    secretary: 'Thư ký tổ',
    conclusion: agenda.join('\n'),
  };
}



function getDepartmentHealth(data, submissions = []) {
  const d = normalizeWorkspaceData(data);
  const overdue = [...d.plans, ...d.tasks, ...d.assessments, ...d.lessonStudies, ...d.observations, ...d.workSchedules].filter(isOverdue).length;
  const pending = toArray(submissions).filter((item) => item.status === 'pending').length;
  const openTasks = countOpen(d.tasks);
  const upcoming = getUpcomingItems(d, 14).length;
  const totalCore = d.plans.length + d.tasks.length + d.assessments.length + d.meetings.length + d.workSchedules.length;
  const completed = countDone(d.plans) + countDone(d.tasks) + countDone(d.assessments) + countDone(d.workSchedules);
  const progress = totalCore ? Math.round((completed / totalCore) * 100) : 0;
  const riskScore = Math.min(100, overdue * 18 + pending * 8 + Math.max(0, openTasks - 8) * 5);
  let levelVi = 'Ổn định';
  let level = 'Stable';
  if (riskScore >= 60) { levelVi = 'Cần xử lý ngay'; level = 'Action needed'; }
  else if (riskScore >= 28) { levelVi = 'Cần theo dõi'; level = 'Watch closely'; }
  return { overdue, pending, openTasks, upcoming, progress, riskScore, levelVi, level };
}

function buildDepartmentContext(data, submissions = []) {
  const d = normalizeWorkspaceData(data);
  const health = getDepartmentHealth(d, submissions);
  const upcoming = getUpcomingItems(d, 21).slice(0, 12).map((item) => ({
    type: item.sourceLabel,
    title: item.title,
    owner: item.owner || item.chair || '',
    date: item.agendaDate,
    status: item.status || '',
  }));
  const overdue = [...d.plans, ...d.tasks, ...d.assessments, ...d.lessonStudies, ...d.observations, ...d.workSchedules]
    .filter(isOverdue)
    .slice(0, 12)
    .map((item) => ({ title: item.title, owner: item.owner || item.chair || '', date: getItemDate(item), status: item.status || '' }));
  const pendingSubmissions = toArray(submissions)
    .filter((item) => item.status === 'pending')
    .slice(0, 12)
    .map((item) => ({ title: item.title, category: item.category, submitter: item.submitter_name || item.submitter_email, relatedTask: item.related_task, note: item.note }));
  return {
    schoolYear: d.schoolYear,
    semester: d.semester,
    health,
    counts: {
      plans: d.plans.length,
      meetings: d.meetings.length,
      tasks: d.tasks.length,
      documents: d.documents.length,
      lessonStudies: d.lessonStudies.length,
      observations: d.observations.length,
      assessments: d.assessments.length,
      teacherDevelopment: d.teacherDevelopment.length,
      studentActivities: d.studentActivities.length,
      workSchedules: d.workSchedules.length,
      reports: d.reports.length,
      featureRoadmap: d.featureRoadmap.length,
    },
    upcoming,
    overdue,
    pendingSubmissions,
    workload: getWorkloadRows(d).slice(0, 10),
    recentPlans: d.plans.slice(0, 8),
    recentMeetings: d.meetings.slice(0, 5),
    recentWorkSchedules: d.workSchedules.slice(0, 8),
    recentTasks: d.tasks.slice(0, 10),
    recentAssessments: d.assessments.slice(0, 6),
    recentDocuments: d.documents.slice(0, 8),
    featureRoadmap: d.featureRoadmap.slice(0, 8),
  };
}

function limitAiSourceText(value, maxLength = 18000) {
  const text = String(value || '').trim();
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n\n...[Đã rút gọn vì văn bản quá dài]` : text;
}


function stripAiHtml(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s{3,}/g, ' ')
    .trim();
}


function getModuleAiDefaults(moduleKey, module, language = 'vi') {
  const fallback = MODULE_AI_DEFAULTS[moduleKey] || MODULE_AI_DEFAULTS.dashboard;
  const moduleTitle = language === 'vi' ? (module?.titleVi || module?.shortVi || moduleKey) : (module?.title || module?.short || moduleKey);
  const instruction = language === 'vi'
    ? `Bạn đang hỗ trợ phân hệ "${moduleTitle}" trong Tổ chuyên môn. ${fallback.intentVi} Ưu tiên đầu ra có thể copy dùng ngay, có đề mục, có phân công/ngày hạn/minh chứng nếu phù hợp.`
    : `You are supporting the "${moduleTitle}" department module. ${fallback.intent} Prefer a directly usable structured output with headings, owners/deadlines/evidence when relevant.`;
  return { ...fallback, moduleTitle, instruction };
}

function compactPlainText(value, maxLength = 2600) {
  const text = String(value || '').replace(/\r/g, '').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
  if (!text) return '';
  return text.length > maxLength ? `${text.slice(0, maxLength)}\n...` : text;
}

function makeAdministrativeDocument(draft, source, data, currentUser, language = 'vi') {
  const d = { ...EMPTY_ADMIN_DOCUMENT, ...(draft || {}) };
  const type = d.type || 'Thông báo';
  const title = String(d.title || '').trim() || `${type.toUpperCase()} VỀ CÔNG TÁC CHUYÊN MÔN TỔ TIẾNG ANH`;
  const number = String(d.number || '').trim() || '.../TB-TA';
  const todayText = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date());
  const sourceText = compactPlainText(source, 4200) || 'Nội dung chi tiết sẽ được TTCM bổ sung sau khi rà soát dữ liệu.';
  const legalBasis = compactPlainText(d.legalBasis, 900);
  const schoolYear = data?.schoolYear || '2026-2027';
  const semester = data?.semester || 'Học kỳ I';
  const signer = d.signer || currentUser?.name || 'Nguyễn Anh Tuấn';
  const position = d.position || 'Tổ trưởng chuyên môn';
  const recipient = d.recipient || 'Giáo viên tổ Tiếng Anh';
  const header = [
    `${d.agency || EMPTY_ADMIN_DOCUMENT.agency}`,
    `${d.department || EMPTY_ADMIN_DOCUMENT.department}`,
    'CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM',
    'Độc lập - Tự do - Hạnh phúc',
  ].join('\n');
  return `${header}\n\nSố: ${number}\nNgày ${todayText}\n\n${type.toUpperCase()}\n${title}\n\nKính gửi: ${recipient}\n\n${legalBasis ? `Căn cứ:\n${legalBasis}\n\n` : ''}Tổ Tiếng Anh triển khai nội dung sau trong ${semester}, năm học ${schoolYear}:\n\nI. MỤC ĐÍCH, YÊU CẦU\n- Thống nhất nội dung chuyên môn, phân công rõ trách nhiệm và lưu đủ minh chứng theo quy định.\n- Bảo đảm giáo viên nắm được yêu cầu thực hiện, thời hạn hoàn thành và sản phẩm cần nộp.\n\nII. NỘI DUNG TRIỂN KHAI\n${sourceText}\n\nIII. TỔ CHỨC THỰC HIỆN\n1. TTCM theo dõi tiến độ, hỗ trợ chuyên môn và duyệt hồ sơ/minh chứng trên hệ thống.\n2. Giáo viên phụ trách thực hiện đúng thời hạn, cập nhật sản phẩm và phản hồi khó khăn nếu có.\n3. Hồ sơ hoàn thành được lưu vào Kho hồ sơ TTCM để phục vụ kiểm tra, đánh giá và tra cứu sau này.\n\nIV. NƠI NHẬN\n- Như trên;\n- Lưu: Hồ sơ tổ chuyên môn.\n\n${position.toUpperCase()}\n\n\n${signer}`;
}

function adminDocumentToHtml(text) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>Văn bản hành chính</title><style>body{font-family:'Times New Roman',serif;line-height:1.45;margin:48px;color:#111}pre{white-space:pre-wrap;font-family:inherit;font-size:14pt}</style></head><body><pre>${escapeHtml(text)}</pre></body></html>`;
}

async function readAiSourceFileText(file) {
  const name = String(file?.name || '').toLowerCase();
  const buffer = await file.arrayBuffer();
  if (name.endsWith('.docx')) {
    const mammoth = await loadMammoth();
    const result = await mammoth.extractRawText({ arrayBuffer: buffer });
    return result.value || '';
  }
  if (name.endsWith('.pdf')) {
    const pdfjs = await loadPdfjs();
    const pdf = await pdfjs.getDocument({ data: buffer, useSystemFonts: true, disableFontFace: false }).promise;
    const maxPages = Math.min(pdf.numPages, 40);
    const pages = [];
    for (let pageNumber = 1; pageNumber <= maxPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent({ normalizeWhitespace: true, disableCombineTextItems: false });
      const pageText = (content.items || []).map((item) => item.str || '').join(' ').replace(/\s+/g, ' ').trim();
      if (pageText) pages.push(`--- PDF Page ${pageNumber} ---\n${pageText}`);
    }
    const text = pages.join('\n\n');
    if (text.replace(/\s+/g, '').length < 60) throw new Error('PDF này có thể là bản scan/ảnh, chưa có text để trích xuất. Hãy OCR hoặc dán văn bản trực tiếp.');
    return pdf.numPages > maxPages ? `${text}\n\n[Đã đọc ${maxPages}/${pdf.numPages} trang đầu của PDF]` : text;
  }
  const decoded = new TextDecoder('utf-8').decode(buffer);
  if (name.endsWith('.html') || name.endsWith('.htm')) return stripAiHtml(decoded);
  return decoded;
}

function getDepartmentAIPrompt(actionId, data, submissions, extraInstruction, language = 'vi', sourceText = '', sourceName = '') {
  const action = DEPARTMENT_AI_ACTIONS.find((item) => item.id === actionId) || DEPARTMENT_AI_ACTIONS[0];
  const context = buildDepartmentContext(data, submissions);
  const aiSource = limitAiSourceText(sourceText);
  const common = `Bạn là AI Copilot cho TTCM tổ Tiếng Anh THPT tại Việt Nam. Viết bằng tiếng Việt, văn phong rõ ràng, hành chính nhưng không dài dòng. Luôn bám dữ liệu, không bịa số liệu. Nếu dữ liệu thiếu, ghi rõ \"chưa có dữ liệu\" và đề xuất việc cần nhập thêm.\n\nDữ liệu tổ chuyên môn:\n${JSON.stringify(context, null, 2)}\n\nYêu cầu thêm của TTCM:\n${extraInstruction || '(không có)'}\n\nVăn bản/tệp TTCM cung cấp thêm:\n${aiSource ? `Nguồn: ${sourceName || 'văn bản dán trực tiếp'}\n${aiSource}` : '(không có)'}`;
  const actionPrompts = {
    leaderBrief: 'Hãy tạo bản TÓM TẮT ĐIỀU HÀNH cho TTCM gồm: 1) tình hình chung, 2) việc cần xử lý ngay, 3) rủi ro, 4) hồ sơ cần duyệt, 5) đề xuất 5 hành động trong 7 ngày tới. Có bullet rõ ràng.',
    monthlyPlan: 'Hãy soạn KẾ HOẠCH THÁNG/TUẦN của tổ Tiếng Anh. Cấu trúc: mục tiêu, nhiệm vụ trọng tâm, phân công, deadline, minh chứng cần nộp, cách theo dõi. Có bảng dạng markdown.',
    meetingMinutes: 'Hãy tạo AGENDA/BIÊN BẢN SINH HOẠT TỔ. Cấu trúc: thời gian, thành phần, nội dung, việc tồn đọng, việc 14 ngày tới, hồ sơ cần duyệt, kết luận TTCM, phân công sau họp.',
    followUpTasks: 'Hãy rút ra DANH SÁCH NHIỆM VỤ TIẾP THEO. Mỗi dòng bắt đầu bằng dấu - theo mẫu: - Tên nhiệm vụ | Người phụ trách | YYYY-MM-DD | Mức ưu tiên | Minh chứng cần nộp. Ưu tiên việc quá hạn và việc chờ duyệt.',
    observationForm: 'Hãy tạo PHIẾU DỰ GIỜ & GÓP Ý tiết dạy Tiếng Anh theo hướng quan sát hoạt động học của học sinh. Có tiêu chí, thang mô tả, câu hỏi quan sát, phần góp ý sau giờ dạy và minh chứng cần lưu.',
    assessmentReview: 'Hãy tạo BẢN RÀ SOÁT KIỂM TRA ĐÁNH GIÁ môn Tiếng Anh. Bao gồm checklist ma trận/đặc tả/đề/đáp án, lỗi thường gặp, cách phân tích kết quả và nhiệm vụ cho nhóm ra đề.',
    evidenceChecklist: 'Hãy tạo CHECKLIST HỒ SƠ MINH CHỨNG tổ Tiếng Anh theo học kỳ/năm học. Chia theo nhóm: kế hoạch, sinh hoạt tổ, dự giờ, kiểm tra đánh giá, NCBH, bồi dưỡng GV, HSG/CLB, công văn. Có cột trạng thái và người phụ trách.',
    adminDocument: 'Hãy SOẠN VĂN BẢN HÀNH CHÍNH dùng được ngay trong trường THPT Việt Nam. Chọn cấu trúc phù hợp giữa thông báo, kế hoạch, báo cáo, công văn, tờ trình hoặc biên bản. Có quốc hiệu/tiêu ngữ nếu phù hợp, số/ký hiệu để dấu ..., căn cứ nếu có dữ liệu, mục đích/yêu cầu, nội dung triển khai, phân công thực hiện, nơi nhận và chữ ký TTCM. Không bịa số liệu; thiếu thông tin thì để dấu ... hoặc ghi cần bổ sung.',
  };
  return `${common}\n\nNhiệm vụ AI:\n${actionPrompts[action.id] || actionPrompts.leaderBrief}`;
}

function parseAiTasks(text) {
  const lines = String(text || '').split('\n').map((line) => line.trim()).filter(Boolean);
  return lines
    .filter((line) => /^[-*•]\s+/.test(line) || line.includes('|'))
    .slice(0, 12)
    .map((line) => line.replace(/^[-*•]\s+/, ''))
    .map((line) => {
      const parts = line.split('|').map((part) => part.trim()).filter(Boolean);
      const title = parts[0] || line.slice(0, 90);
      const owner = parts[1] || 'Giáo viên';
      const dueMatch = line.match(/\b20\d{2}-\d{2}-\d{2}\b/);
      return {
        id: cryptoId(),
        title: title.replace(/^\d+\.\s*/, ''),
        owner,
        due: dueMatch?.[0] || today(),
        status: 'Chưa làm',
        priority: parts[3] || 'Trung bình',
        evidence: parts[4] || '',
        note: line,
      };
    })
    .filter((task) => task.title.length > 2);
}

function downloadText(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}


function DepartmentHeroIllustration({ language }) {
  return (
    <div className="department-v40-hero-visual" aria-hidden="true">
      <div className="dept-v40-stage" />
      <div className="dept-v40-plant">
        <span className="leaf leaf-a" />
        <span className="leaf leaf-b" />
        <span className="leaf leaf-c" />
        <span className="pot" />
      </div>

      <div className="dept-v40-calendar-card">
        <div className="dept-v40-card-top">
          <strong>{language === 'vi' ? 'Tháng 7, 2026' : 'July 2026'}</strong>
          <span>›</span>
        </div>
        <div className="dept-v40-weekdays"><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span></div>
        <div className="dept-v40-date-grid">
          {['1','2','3','4','5','6','7','8','9','10','11','12','13','14','15','16','17','18','19','20','21','22','23','24','25','26','27','28','29','30','31'].map((day) => (
            <span key={day} className={day === '10' ? 'active' : day === '14' || day === '17' || day === '25' ? 'marked' : ''}>{day}</span>
          ))}
        </div>
      </div>

      <div className="dept-v40-clipboard-card">
        <div className="clip" />
        <strong>{language === 'vi' ? 'Công việc' : 'Tasks'}</strong>
        <div className="dept-v40-check-line done" />
        <div className="dept-v40-check-line done" />
        <div className="dept-v40-check-line done" />
        <em>3</em>
      </div>

      <div className="dept-v40-folder-card">
        <div className="papers">
          <span />
          <span />
          <span />
        </div>
        <strong>{language === 'vi' ? 'Hồ sơ minh chứng' : 'Evidence'}</strong>
      </div>

      <div className="dept-v40-report-card">
        <span className="report-title">{language === 'vi' ? 'Báo cáo tổng hợp' : 'Summary report'}</span>
        <div className="bars"><i /><i /><i /><i /></div>
        <div className="pie" />
      </div>

      <div className="dept-v40-task-card">
        <span>{language === 'vi' ? 'Giao việc' : 'Assignment'}</span>
        <strong>{language === 'vi' ? 'Chuẩn bị nghiên cứu bài học tuần 3' : 'Prepare lesson study week 3'}</strong>
        <small>17/07/2026</small>
        <em>{language === 'vi' ? 'Đang xử lý' : 'In progress'}</em>
      </div>

      <div className="dept-v40-ai-card">
        <div className="robot-face"><i /><i /><b /></div>
        <strong>AI Copilot</strong>
      </div>
    </div>
  );
}

export default function DepartmentWorkspace({ language, currentUser, hasApiKey }) {
  const [activeTab, setActiveTab] = useState('dashboard');
  useEffect(() => {
    try {
      const requestedTab = sessionStorage.getItem('bes-dashboard-department-tab') || '';
      if (!requestedTab) return;
      sessionStorage.removeItem('bes-dashboard-department-tab');
      setActiveTab(requestedTab);
    } catch {
      // Dashboard deep-link hints are optional.
    }
  }, []);
  const [data, setData] = useState(() => readData(currentUser?.id, language, !canPublishDepartment(currentUser)));
  const [toast, setToast] = useState('');
  const [report, setReport] = useState(() => makeReport(readData(currentUser?.id, language, !canPublishDepartment(currentUser))));
  const [reportType, setReportType] = useState('month');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAction, setAiAction] = useState('leaderBrief');
  const [aiInstruction, setAiInstruction] = useState('');
  const [aiSourceText, setAiSourceText] = useState('');
  const [aiSourceName, setAiSourceName] = useState('');
  const [aiOutput, setAiOutput] = useState('');
  const [adminDocDraft, setAdminDocDraft] = useState(EMPTY_ADMIN_DOCUMENT);
  const [adminDocOutput, setAdminDocOutput] = useState('');
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [submissionDraft, setSubmissionDraft] = useState(EMPTY_SUBMISSION);
  const [requestDraft, setRequestDraft] = useState(EMPTY_SUBMISSION_REQUEST);
  const [workScheduleDraft, setWorkScheduleDraft] = useState(EMPTY_WORK_SCHEDULE);
  const [scheduleImportWeekStart, setScheduleImportWeekStart] = useState(() => weekStartIso(today()));
  const [scheduleImportSource, setScheduleImportSource] = useState('');
  const [scheduleImportFileName, setScheduleImportFileName] = useState('');
  const [scheduleImportItems, setScheduleImportItems] = useState([]);
  const [scheduleImportSummary, setScheduleImportSummary] = useState('');
  const [scheduleImportWarnings, setScheduleImportWarnings] = useState([]);
  const [scheduleImportBusy, setScheduleImportBusy] = useState(false);
  const [featureDraft, setFeatureDraft] = useState(EMPTY_FEATURE_DRAFT);
  const [submissions, setSubmissions] = useState([]);
  const [submissionRequests, setSubmissionRequests] = useState([]);
  const [submissionBusy, setSubmissionBusy] = useState(false);
  const [syncBusy, setSyncBusy] = useState(false);
  const [cloudInfo, setCloudInfo] = useState({ checked: false, available: false, updatedAt: '', updatedBy: '', message: '' });
  const importRef = useRef(null);
  const aiSourceInputRef = useRef(null);
  const moduleAssistInputRef = useRef(null);
  const scheduleImportInputRef = useRef(null);

  const moduleByKey = useMemo(() => new Map(DEPARTMENT_MODULES.map((module) => [module.key, module])), []);
  const canPublish = canPublishDepartment(currentUser);
  const allowed = (key) => {
    if (!CORE_DEPARTMENT_TABS.includes(key)) return false;
    const module = moduleByKey.get(key);
    if (!canPublish) return TEACHER_VISIBLE_DEPARTMENT_TABS.includes(key);
    return !module || hasDepartmentModuleAccess(currentUser, module.id);
  };
  const visibleTabs = DEPARTMENT_MODULES.filter((module) => {
    if (!CORE_DEPARTMENT_TABS.includes(module.key)) return false;
    if (!canPublish) return TEACHER_VISIBLE_DEPARTMENT_TABS.includes(module.key);
    return true;
  });
  const openDepartmentTab = (key) => {
    if (allowed(key)) {
      setActiveTab(key);
      return;
    }
    if (!canPublish) {
      setActiveTab('dashboard');
    }
  };

  useEffect(() => {
    if (!CORE_DEPARTMENT_TABS.includes(activeTab)) setActiveTab('dashboard');
    if (!canPublish && !TEACHER_VISIBLE_DEPARTMENT_TABS.includes(activeTab)) setActiveTab('dashboard');
    if (canPublish && activeTab === 'teacherWorkspace') setActiveTab('dashboard');
  }, [canPublish, activeTab]);
  const groupedModules = useMemo(() => DEPARTMENT_MODULE_GROUPS.map((group) => ({
    ...group,
    modules: group.moduleKeys.map((key) => moduleByKey.get(key)).filter(Boolean),
  })), [moduleByKey]);

  const activeModule = moduleByKey.get(activeTab);
  const activeModuleAi = useMemo(() => getModuleAiDefaults(activeTab, activeModule, language), [activeTab, activeModule, language]);

  const stats = useMemo(() => {
    const overdue = [...data.plans, ...data.tasks, ...data.assessments].filter(isOverdue).length;
    return {
      plans: data.plans.length,
      meetings: data.meetings.length,
      workSchedules: data.workSchedules.length,
      featureRoadmap: data.featureRoadmap.length,
      tasks: data.tasks.length,
      openTasks: countOpen(data.tasks),
      documents: data.documents.length,
      reports: data.reports.length,
      pendingSubmissions: submissions.filter((item) => item.status === 'pending').length,
      archivedSubmissions: submissions.filter((item) => item.archived_at).length,
      openSubmissionRequests: submissionRequests.filter((item) => item.status === 'open').length,
      openNotices: submissionRequests.filter((item) => item.status === 'open').length,
      overdue,
      lessonStudies: data.lessonStudies.length,
      observations: data.observations.length,
      assessments: data.assessments.length,
      teacherDevelopment: data.teacherDevelopment.length,
      studentActivities: data.studentActivities.length,
    };
  }, [data, submissions, submissionRequests]);

  const upcomingItems = useMemo(() => getUpcomingItems(data, 14), [data]);
  const workloadRows = useMemo(() => getWorkloadRows(data), [data]);
  const departmentHealth = useMemo(() => getDepartmentHealth(data, submissions), [data, submissions]);
  const submissionNotice = useMemo(() => {
    const mine = submissions.filter((item) => item.submitter_id === currentUser?.id);
    const openRequests = submissionRequests.filter((item) => item.status === 'open');
    const mineRequestIds = new Set(mine.map((item) => item.request_id).filter(Boolean));
    return {
      pendingAll: submissions.filter((item) => item.status === 'pending').length,
      mineTotal: mine.length,
      minePending: mine.filter((item) => item.status === 'pending').length,
      mineRejected: mine.filter((item) => item.status === 'rejected').length,
      mineApproved: mine.filter((item) => item.status === 'approved').length,
      uploadedFiles: submissions.filter((item) => item.file_path).length,
      archivedAll: submissions.filter((item) => item.archived_at).length,
      archiveFolders: getArchiveFolders(submissions).length,
      openRequests: openRequests.length,
      myOpenRequests: openRequests.length,
      myUnsubmittedRequests: openRequests.filter((item) => !mineRequestIds.has(item.id)).length,
    };
  }, [submissions, submissionRequests, currentUser?.id]);

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(''), 2600);
  };

  const updateData = (producer, message, options = {}) => {
    const next = typeof producer === 'function' ? producer(data) : producer;
    const saved = saveData(currentUser?.id, next, language);
    if (canPublish) saveSharedData(saved, language);
    setData(saved);
    setReport(makeReport(saved, submissions));
    if (message) showToast(message);
    if (canPublish && options.autoPublish && canUseCloudDepartmentStore()) {
      saveDepartmentSnapshot(saved, currentUser)
        .then((result) => {
          if (result?.ok) {
            saveSharedData(saved, language);
            setCloudInfo({
              checked: true,
              available: true,
              updatedAt: result.snapshot?.updated_at || new Date().toISOString(),
              updatedBy: result.snapshot?.updated_by_email || currentUser?.email || '',
              message: language === 'vi' ? 'Đã tự động đồng bộ lịch tổ' : 'Department schedule auto-synced',
            });
          }
        })
        .catch(() => {
          // Manual cloud save remains available if auto-sync is blocked by Supabase/RLS.
        });
    }
    return saved;
  };

  const refreshSubmissions = async (schoolYear = data.schoolYear) => {
    if (!canUseCloudDepartmentStore() || !currentUser?.id) return;
    const result = await listDepartmentSubmissions(schoolYear);
    if (result.ok) setSubmissions(result.submissions || []);
  };

  const refreshSubmissionRequests = async (schoolYear = data.schoolYear) => {
    if (!canUseCloudDepartmentStore() || !currentUser?.id) return;
    const result = await listDepartmentSubmissionRequests(schoolYear);
    if (result.ok) setSubmissionRequests(result.requests || []);
  };

  useEffect(() => {
    if (!currentUser?.id) return;
    const next = readData(currentUser.id, language, !canPublish);
    setData(next);
    setReport(makeReport(next, submissions));
  }, [currentUser?.id, language, canPublish]);

  useEffect(() => {
    if (!currentUser?.id || canPublish) return undefined;
    let cancelled = false;
    let busy = false;

    async function syncTeacherSharedDashboard() {
      if (busy) return;
      busy = true;
      try {
        let shared = null;
        if (canUseCloudDepartmentStore()) {
          const result = await loadDepartmentSnapshot(data.schoolYear || '2026-2027');
          if (result?.ok && result.snapshot?.payload) {
            shared = normalizeWorkspaceData({
              ...createInitialData(language),
              ...result.snapshot.payload,
              lastUpdated: result.snapshot.updated_at || result.snapshot.payload.lastUpdated || new Date().toISOString(),
            }, language);
          }
        }
        if (!shared) shared = readSharedData(language);
        if (!shared || cancelled) return;

        const saved = saveData(currentUser.id, shared, language);
        try {
          getSharedKeys(saved.schoolYear).forEach((key) => localStorage.setItem(key, JSON.stringify(saved)));
        } catch {
          // Ignore local cache write failures.
        }
        setData(saved);
        setReport(makeReport(saved, submissions));
      } catch {
        // Teachers should still see the local dashboard if cloud is unavailable.
      } finally {
        busy = false;
      }
    }

    syncTeacherSharedDashboard();
    const timer = window.setInterval(syncTeacherSharedDashboard, 12000);
    const onStorage = (event) => {
      if (!event?.key || event.key.startsWith(STORE_PREFIX)) syncTeacherSharedDashboard();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      window.removeEventListener('storage', onStorage);
    };
  }, [currentUser?.id, language, canPublish, data.schoolYear, submissions]);

  useEffect(() => {
    let cancelled = false;
    async function checkCloudSnapshot() {
      if (!canUseCloudDepartmentStore() || !currentUser?.id) {
        setCloudInfo({ checked: true, available: false, updatedAt: '', updatedBy: '', message: language === 'vi' ? 'Chế độ local' : 'Local mode' });
        setSubmissions([]);
        return;
      }
      const [snapshotResult, submissionResult, requestResult] = await Promise.all([
        loadDepartmentSnapshot(data.schoolYear),
        listDepartmentSubmissions(data.schoolYear),
        listDepartmentSubmissionRequests(data.schoolYear),
      ]);
      if (cancelled) return;
      if (snapshotResult.ok && snapshotResult.snapshot) {
        setCloudInfo({ checked: true, available: true, updatedAt: snapshotResult.snapshot.updated_at || '', updatedBy: snapshotResult.snapshot.updated_by_email || '', message: language === 'vi' ? 'Có dữ liệu cloud' : 'Cloud data available' });
        if (!canPublish && snapshotResult.snapshot.payload) {
          const shared = saveData(currentUser.id, normalizeWorkspaceData({ ...createInitialData(language), ...snapshotResult.snapshot.payload, lastUpdated: snapshotResult.snapshot.updated_at || new Date().toISOString() }, language), language);
          saveSharedData(shared, language);
          setData(shared);
          setReport(makeReport(shared, submissions));
        }
      } else if (snapshotResult.ok && snapshotResult.empty) {
        setCloudInfo({ checked: true, available: false, updatedAt: '', updatedBy: '', message: language === 'vi' ? 'Chưa có dữ liệu cloud cho năm học này' : 'No cloud snapshot for this school year' });
      } else {
        setCloudInfo({ checked: true, available: false, updatedAt: '', updatedBy: '', message: snapshotResult.message || (language === 'vi' ? 'Không kiểm tra được cloud' : 'Could not check cloud') });
      }
      if (submissionResult.ok) setSubmissions(submissionResult.submissions || []);
      if (requestResult.ok) setSubmissionRequests(requestResult.requests || []);
    }
    checkCloudSnapshot();
    return () => { cancelled = true; };
  }, [currentUser?.id, data.schoolYear, language, canPublish]);

  useEffect(() => {
    setReport((old) => old || makeReport(data, submissions));
  }, [submissions]);

  const updateStatus = (collection, id, status) => updateData((old) => ({
    ...old,
    [collection]: toArray(old[collection]).map((item) => item.id === id ? { ...item, status } : item),
  }), language === 'vi' ? 'Đã cập nhật trạng thái.' : 'Status updated.');

  const removeItem = (collection, id) => updateData((old) => ({
    ...old,
    [collection]: toArray(old[collection]).filter((item) => item.id !== id),
  }), language === 'vi' ? 'Đã xóa mục.' : 'Item removed.');

  const addPlan = () => {
    if (!draft.title.trim()) return showToast(language === 'vi' ? 'Nhập tên kế hoạch trước.' : 'Enter a plan title first.');
    updateData((old) => ({
      ...old,
      plans: [{ id: cryptoId(), title: draft.title.trim(), type: 'Kế hoạch', owner: draft.owner || currentUser?.name || 'TTCM', deadline: draft.date, status: 'Chưa làm', note: draft.note }, ...old.plans],
    }), language === 'vi' ? 'Đã thêm kế hoạch.' : 'Plan added.');
    setDraft(EMPTY_DRAFT);
  };

  const addMeeting = () => {
    if (!draft.title.trim()) return showToast(language === 'vi' ? 'Nhập tên buổi họp trước.' : 'Enter a meeting title first.');
    updateData((old) => ({
      ...old,
      meetings: [{ id: cryptoId(), title: draft.title.trim(), date: draft.date, type: 'Sinh hoạt tổ', chair: draft.owner || currentUser?.name || 'TTCM', secretary: 'Thư ký', conclusion: draft.note || 'Chưa nhập kết luận.' }, ...old.meetings],
    }), language === 'vi' ? 'Đã thêm buổi sinh hoạt tổ.' : 'Meeting added.');
    setDraft(EMPTY_DRAFT);
  };

  const addWorkSchedule = () => {
    if (!workScheduleDraft.title.trim()) return showToast(language === 'vi' ? 'Nhập nội dung lịch làm việc trước.' : 'Enter a work schedule title first.');
    updateData((old) => ({
      ...old,
      workSchedules: [{
        id: cryptoId(),
        title: workScheduleDraft.title.trim(),
        owner: workScheduleDraft.owner || currentUser?.name || 'TTCM',
        date: workScheduleDraft.date || today(),
        startTime: workScheduleDraft.startTime || '',
        endTime: workScheduleDraft.endTime || '',
        location: workScheduleDraft.location || '',
        type: workScheduleDraft.type || 'Lịch làm việc',
        status: workScheduleDraft.status || 'Chưa làm',
        note: workScheduleDraft.note || '',
      }, ...toArray(old.workSchedules)],
    }), language === 'vi' ? 'Đã thêm lịch làm việc và đồng bộ lên thanh menu giáo viên.' : 'Work schedule added and synced to teacher menu.', { autoPublish: true });
    setWorkScheduleDraft(EMPTY_WORK_SCHEDULE);
  };

  const analyzeWorkScheduleSource = async (sourceText = scheduleImportSource, sourceName = scheduleImportFileName) => {
    const cleanSource = String(sourceText || '').trim();
    if (!cleanSource) return showToast(language === 'vi' ? 'Chưa có nội dung file để AI nhận diện.' : 'No file content is available for AI analysis.');
    if (!hasApiKey) {
      showToast(language === 'vi' ? 'Hãy cấu hình API key trong Cài đặt AI trước khi đọc lịch từ file.' : 'Configure an AI API key before importing a schedule from a file.');
      return;
    }

    const targetWeekStart = weekStartIso(scheduleImportWeekStart || today());
    const targetWeekEnd = addIsoDays(targetWeekStart, 6);
    setScheduleImportBusy(true);
    setScheduleImportItems([]);
    setScheduleImportSummary('');
    setScheduleImportWarnings([]);
    try {
      const prompt = `Bạn là trợ lý hành chính cho Tổ trưởng chuyên môn tiếng Anh tại trường THPT Việt Nam. Hãy đọc toàn bộ văn bản nguồn và nhận diện TẤT CẢ mốc lịch làm việc có thể hành động: cuộc họp, lịch dự giờ, chuyên đề, tập huấn, kiểm tra đánh giá, hạn nộp hồ sơ, hoạt động học sinh, nhiệm vụ có ngày/giờ hoặc mốc tuần. Không bịa thêm sự kiện. Không đưa các câu mô tả chung không có hành động vào lịch.

Tuần mục tiêu do người dùng chọn: ${targetWeekStart} đến ${targetWeekEnd}.
- Nếu tài liệu ghi rõ ngày, giữ đúng ngày đó kể cả nằm ngoài tuần mục tiêu.
- Nếu tài liệu chỉ ghi thứ/ngày trong tuần mà không có ngày tháng, ánh xạ vào tuần mục tiêu.
- Nếu chỉ có hạn nộp, dùng loại "Hạn nộp hồ sơ".
- Nếu không có giờ, để startTime và endTime là chuỗi rỗng.
- Chuẩn hóa ngày thành YYYY-MM-DD và giờ thành HH:MM (24 giờ).
- Owner phải là người phụ trách/thành phần được nêu; nếu không có thì dùng "TTCM".
- Type chỉ được dùng một trong: ${WORK_SCHEDULE_TYPES.join(', ')}.
- Status mặc định là "Chưa làm".

Trả về JSON thuần, không markdown, đúng schema:
{
  "weekStart": "YYYY-MM-DD",
  "summary": "Tóm tắt ngắn nội dung file",
  "warnings": ["Các điểm còn mơ hồ hoặc thiếu ngày/giờ"],
  "items": [
    {
      "title": "Nội dung công việc",
      "owner": "Người phụ trách / thành phần",
      "date": "YYYY-MM-DD",
      "startTime": "HH:MM",
      "endTime": "HH:MM",
      "location": "Địa điểm / phòng / link",
      "type": "Một loại hợp lệ",
      "status": "Chưa làm",
      "note": "Nội dung chuẩn bị, sản phẩm hoặc minh chứng",
      "confidence": 0.0
    }
  ]
}

Tên file: ${sourceName || 'không rõ'}
Nội dung file:
${limitAiSourceText(cleanSource, 30000)}`;

      const raw = await callAI({
        prompt,
        systemInstruction: 'Extract actionable Vietnamese school-department schedule entries. Return valid JSON only. Preserve factual dates and do not invent events.',
        temperature: 0.15,
        responseMimeType: 'application/json',
        loadingLabel: language === 'vi' ? 'AI đang đọc file và nhận diện lịch làm việc' : 'AI is extracting the work schedule',
      });
      const parsed = parseScheduleAIResponse(raw, targetWeekStart, sourceName);
      if (!parsed.items.length) throw new Error(language === 'vi' ? 'AI chưa tìm thấy mốc lịch làm việc rõ ràng trong file.' : 'AI did not find any actionable schedule entries in the file.');
      setScheduleImportItems(parsed.items);
      setScheduleImportWeekStart(parsed.weekStart || targetWeekStart);
      setScheduleImportSummary(parsed.summary);
      setScheduleImportWarnings(parsed.warnings);
      showToast(language === 'vi' ? `AI đã nhận diện ${parsed.items.length} mục lịch. Hãy rà soát trước khi thêm.` : `AI found ${parsed.items.length} schedule items. Review them before adding.`);
    } catch (error) {
      showToast(error?.message || (language === 'vi' ? 'Không thể nhận diện lịch từ file.' : 'Could not extract a schedule from the file.'));
    } finally {
      setScheduleImportBusy(false);
    }
  };

  const handleWorkScheduleImportFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 8 * 1024 * 1024) throw new Error(language === 'vi' ? 'Tệp quá lớn. Vui lòng dùng tệp dưới 8MB.' : 'File is too large. Use a file under 8MB.');
      const text = await readAiSourceFileText(file);
      if (!String(text || '').trim()) throw new Error(language === 'vi' ? 'Tệp không có văn bản có thể đọc.' : 'The file contains no readable text.');
      setScheduleImportSource(text);
      setScheduleImportFileName(file.name);
      await analyzeWorkScheduleSource(text, file.name);
    } catch (error) {
      showToast(error?.message || (language === 'vi' ? 'Không đọc được file. Hỗ trợ PDF, DOCX, TXT, MD, CSV và HTML.' : 'Could not read the file. PDF, DOCX, TXT, MD, CSV and HTML are supported.'));
    } finally {
      if (event.target) event.target.value = '';
    }
  };

  const updateScheduleImportItem = (id, patch) => {
    setScheduleImportItems((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  };

  const removeScheduleImportItem = (id) => {
    setScheduleImportItems((items) => items.filter((item) => item.id !== id));
  };

  const selectAllScheduleImportItems = (selected) => {
    setScheduleImportItems((items) => items.map((item) => ({ ...item, selected })));
  };

  const clearScheduleImport = () => {
    setScheduleImportSource('');
    setScheduleImportFileName('');
    setScheduleImportItems([]);
    setScheduleImportSummary('');
    setScheduleImportWarnings([]);
    showToast(language === 'vi' ? 'Đã xoá bản nhập lịch từ file.' : 'Schedule import cleared.');
  };

  const addImportedSchedules = () => {
    const selectedItems = scheduleImportItems.filter((item) => item.selected && item.title.trim());
    if (!selectedItems.length) return showToast(language === 'vi' ? 'Chọn ít nhất một mục lịch để thêm.' : 'Select at least one schedule item.');
    const existingFingerprints = new Set(toArray(data.workSchedules).map(scheduleFingerprint));
    const uniqueItems = [];
    let skipped = 0;
    selectedItems.forEach((item) => {
      const fingerprint = scheduleFingerprint(item);
      if (existingFingerprints.has(fingerprint)) {
        skipped += 1;
        return;
      }
      existingFingerprints.add(fingerprint);
      const { selected, confidence, ...cleanItem } = item;
      uniqueItems.push({
        ...cleanItem,
        id: cryptoId(),
        importedAt: new Date().toISOString(),
        importedBy: currentUser?.email || currentUser?.name || 'TTCM',
        sourceFile: scheduleImportFileName || '',
      });
    });
    if (!uniqueItems.length) return showToast(language === 'vi' ? 'Các mục đã chọn đều đã tồn tại trong lịch.' : 'All selected items already exist in the schedule.');
    updateData((old) => ({
      ...old,
      workSchedules: [...uniqueItems, ...toArray(old.workSchedules)],
    }), language === 'vi'
      ? `Đã thêm ${uniqueItems.length} mục vào lịch làm việc${skipped ? `, bỏ qua ${skipped} mục trùng` : ''}.`
      : `Added ${uniqueItems.length} schedule items${skipped ? ` and skipped ${skipped} duplicates` : ''}.`, { autoPublish: true });
    setScheduleImportItems([]);
    setScheduleImportSummary(language === 'vi' ? `Đã nhập ${uniqueItems.length} mục từ ${scheduleImportFileName || 'file'}.` : `Imported ${uniqueItems.length} items from ${scheduleImportFileName || 'the file'}.`);
  };

  const addTask = () => {
    if (!draft.title.trim()) return showToast(language === 'vi' ? 'Nhập nhiệm vụ trước.' : 'Enter a task first.');
    updateData((old) => ({
      ...old,
      tasks: [{ id: cryptoId(), title: draft.title.trim(), owner: draft.owner || 'Giáo viên', due: draft.date, status: 'Chưa làm', priority: 'Trung bình', evidence: draft.link || '', note: draft.note || '' }, ...old.tasks],
    }), language === 'vi' ? 'Đã thêm nhiệm vụ.' : 'Task added.');
    setDraft(EMPTY_DRAFT);
  };

  const addDocument = () => {
    if (!draft.title.trim()) return showToast(language === 'vi' ? 'Nhập tên hồ sơ trước.' : 'Enter a document title first.');
    updateData((old) => ({
      ...old,
      documents: [{ id: cryptoId(), title: draft.title.trim(), category: draft.owner || 'Minh chứng', link: draft.link || '', note: draft.note || '' }, ...old.documents],
    }), language === 'vi' ? 'Đã thêm hồ sơ minh chứng.' : 'Document added.');
    setDraft(EMPTY_DRAFT);
  };

  const addStructuredRecord = (moduleKey) => {
    const config = STRUCTURED_MODULES[moduleKey];
    if (!config) return;
    if (!draft.title.trim()) return showToast(language === 'vi' ? 'Nhập tiêu đề trước.' : 'Enter a title first.');
    updateData((old) => ({
      ...old,
      [config.collection]: [{
        id: cryptoId(),
        title: draft.title.trim(),
        owner: draft.owner || currentUser?.name || 'TTCM',
        date: draft.date,
        status: 'Chưa làm',
        type: config.itemType,
        link: draft.link || '',
        note: draft.note || '',
      }, ...toArray(old[config.collection])],
    }), language === 'vi' ? 'Đã thêm mục mới.' : 'Record added.');
    setDraft(EMPTY_DRAFT);
  };

  const useTemplate = (template) => {
    updateData((old) => ({
      ...old,
      plans: [{
        id: cryptoId(),
        title: language === 'vi' ? template.titleVi : template.title,
        type: template.type,
        owner: currentUser?.name || 'TTCM',
        deadline: today(),
        status: 'Chưa làm',
        note: template.contentVi,
      }, ...old.plans],
    }), language === 'vi' ? 'Đã đưa mẫu vào Kế hoạch chuyên môn.' : 'Template added to plans.');
    setActiveTab('plans');
  };

  const buildAIReport = async () => {
    if (!hasApiKey) return showToast(language === 'vi' ? 'Mở Cài đặt → Kiểm tra kết nối OpenRouter Gateway trước khi tạo báo cáo AI.' : 'Configure AI settings before generating an AI report.');
    setAiLoading(true);
    try {
      const reportTypeVi = {
        month: 'báo cáo tháng',
        semester: 'báo cáo học kỳ',
        meeting: 'biên bản/sơ kết sinh hoạt tổ',
        evidence: 'báo cáo hồ sơ minh chứng',
        assessment: 'báo cáo kiểm tra đánh giá',
      }[reportType] || 'báo cáo chuyên môn';
      const prompt = `Bạn là trợ lý cho TTCM tổ Tiếng Anh THPT. Hãy viết ${reportTypeVi} ngắn gọn, đúng văn phong hành chính, dựa trên dữ liệu sau. Cấu trúc rõ đề mục; có phần việc đã làm, tồn tại, nguyên nhân, giải pháp, phân công tiếp theo. Có nhắc số minh chứng giáo viên đã nộp/chờ duyệt nếu có.\n\nDữ liệu workspace:\n${JSON.stringify(data, null, 2)}\n\nDữ liệu giáo viên nộp:\n${JSON.stringify(submissions, null, 2)}`;
      const text = await callAI({ prompt, systemInstruction: 'Write professional Vietnamese school-department reports. Be specific and concise.', temperature: 0.45 });
      setReport(text);
      updateData((old) => ({ ...old, reports: [{ id: cryptoId(), title: `Báo cáo AI - ${reportTypeVi}`, createdAt: new Date().toISOString(), content: text }, ...old.reports] }), language === 'vi' ? 'Đã tạo báo cáo AI.' : 'AI report generated.');
    } catch (error) {
      showToast(error?.message || (language === 'vi' ? 'Không tạo được báo cáo AI.' : 'AI report failed.'));
    } finally {
      setAiLoading(false);
    }
  };



  const handleAiSourceFile = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (file.size > 2.5 * 1024 * 1024) {
        showToast(language === 'vi' ? 'Tệp hơi lớn. Nên dùng tệp văn bản dưới 2.5MB để AI xử lý ổn định.' : 'File is large. Use a text file under 2.5MB for stable AI processing.');
      }
      const text = await readAiSourceFileText(file);
      setAiSourceText(text);
      setAiSourceName(file.name);
      showToast(language === 'vi' ? `Đã nạp văn bản từ tệp: ${file.name}` : `Loaded text from file: ${file.name}`);
    } catch (error) {
      showToast(error?.message || (language === 'vi' ? 'Không đọc được tệp. Hãy thử .txt/.md/.csv/.docx/.pdf hoặc dán văn bản trực tiếp.' : 'Could not read file. Try .txt/.md/.csv/.docx/.pdf or paste text directly.'));
    } finally {
      if (event.target) event.target.value = '';
    }
  };

  const pasteAiSourceFromClipboard = async () => {
    try {
      const text = await navigator.clipboard?.readText?.();
      if (!String(text || '').trim()) return showToast(language === 'vi' ? 'Clipboard chưa có văn bản để dán.' : 'Clipboard has no text to paste.');
      setAiSourceText(text);
      setAiSourceName(language === 'vi' ? 'Văn bản dán từ clipboard' : 'Text pasted from clipboard');
      showToast(language === 'vi' ? 'Đã dán văn bản vào nguồn AI TTCM.' : 'Pasted text into AI source.');
    } catch (error) {
      showToast(language === 'vi' ? 'Trình duyệt không cho đọc clipboard. Bạn có thể dán trực tiếp vào ô văn bản.' : 'Browser blocked clipboard access. Paste directly into the text box instead.');
    }
  };

  const clearAiSourceText = () => {
    setAiSourceText('');
    setAiSourceName('');
    showToast(language === 'vi' ? 'Đã xoá văn bản nguồn của AI TTCM.' : 'AI source text cleared.');
  };

  const prepareModuleAI = (mode = 'assist') => {
    const defaults = getModuleAiDefaults(activeTab, moduleByKey.get(activeTab), language);
    setAiAction(mode === 'adminDocument' ? 'adminDocument' : defaults.action);
    setAiInstruction(mode === 'adminDocument'
      ? `${defaults.instruction}

Sau khi phân tích, hãy chuyển nội dung thành văn bản hành chính có thể ban hành trong tổ chuyên môn.`
      : defaults.instruction);
    setActiveTab('aiCopilot');
    showToast(language === 'vi' ? 'Đã chuyển tài liệu/yêu cầu sang AI TTCM.' : 'Sent source and instruction to AI Copilot.');
  };

  const handleModuleAssistFile = async (event) => {
    await handleAiSourceFile(event);
    const defaults = getModuleAiDefaults(activeTab, moduleByKey.get(activeTab), language);
    setAiAction(defaults.action);
    setAiInstruction(defaults.instruction);
  };

  const pasteModuleAssistFromClipboard = async () => {
    await pasteAiSourceFromClipboard();
    const defaults = getModuleAiDefaults(activeTab, moduleByKey.get(activeTab), language);
    setAiAction(defaults.action);
    setAiInstruction(defaults.instruction);
  };

  const runDepartmentAI = async () => {
    if (!hasApiKey) return showToast(language === 'vi' ? 'Mở Cài đặt → Kiểm tra kết nối OpenRouter Gateway trước khi dùng AI Copilot.' : 'Configure AI settings before using AI Copilot.');
    setAiLoading(true);
    try {
      const prompt = getDepartmentAIPrompt(aiAction, data, submissions, aiInstruction, language, aiSourceText, aiSourceName);
      const text = await callAI({
        prompt,
        systemInstruction: 'You are a professional Vietnamese high-school English department leader assistant. Return practical, structured output. Do not invent data.',
        temperature: 0.42,
      });
      setAiOutput(text);
      showToast(language === 'vi' ? 'AI đã tạo nội dung hỗ trợ TTCM.' : 'AI Copilot output generated.');
    } catch (error) {
      showToast(error?.message || (language === 'vi' ? 'Không tạo được nội dung AI.' : 'AI generation failed.'));
    } finally {
      setAiLoading(false);
    }
  };

  const applyAIOutput = (target = '') => {
    const text = String(aiOutput || '').trim();
    if (!text) return showToast(language === 'vi' ? 'Chưa có nội dung AI để đưa vào dữ liệu.' : 'No AI output to apply.');
    const action = DEPARTMENT_AI_ACTIONS.find((item) => item.id === aiAction) || DEPARTMENT_AI_ACTIONS[0];
    const title = `${language === 'vi' ? action.titleVi : action.title} - ${formatDate(today())}`;
    const destination = target || action.target;
    if (destination === 'plan') {
      updateData((old) => ({
        ...old,
        plans: [{ id: cryptoId(), title, type: 'AI đề xuất', owner: currentUser?.name || 'TTCM', deadline: today(), status: 'Chưa làm', note: text }, ...old.plans],
      }), language === 'vi' ? 'Đã đưa nội dung AI vào Kế hoạch.' : 'AI output added to plans.');
      setActiveTab('plans');
      return;
    }
    if (destination === 'meeting') {
      updateData((old) => ({
        ...old,
        meetings: [{ id: cryptoId(), title, date: today(), type: 'AI agenda/biên bản', chair: currentUser?.name || 'TTCM', secretary: 'Thư ký tổ', conclusion: text }, ...old.meetings],
      }), language === 'vi' ? 'Đã đưa nội dung AI vào Sinh hoạt tổ.' : 'AI output added to meetings.');
      setActiveTab('meetings');
      return;
    }
    if (destination === 'tasks') {
      const tasks = parseAiTasks(text);
      if (!tasks.length) return showToast(language === 'vi' ? 'AI output chưa có dòng nhiệm vụ đúng mẫu. Hãy yêu cầu AI tạo lại danh sách nhiệm vụ.' : 'No task lines detected. Ask AI to regenerate follow-up tasks.');
      updateData((old) => ({ ...old, tasks: [...tasks, ...old.tasks] }), language === 'vi' ? `Đã tạo ${tasks.length} nhiệm vụ từ AI.` : `${tasks.length} AI tasks created.`);
      setActiveTab('tasks');
      return;
    }
    if (destination === 'assessment') {
      updateData((old) => ({
        ...old,
        assessments: [{ id: cryptoId(), title, owner: currentUser?.name || 'TTCM', date: today(), status: 'Chờ duyệt', type: 'AI rà soát', link: '', note: text }, ...old.assessments],
      }), language === 'vi' ? 'Đã đưa nội dung AI vào Kiểm tra đánh giá.' : 'AI output added to assessment.');
      setActiveTab('assessment');
      return;
    }
    if (destination === 'document') {
      updateData((old) => ({
        ...old,
        documents: [{ id: cryptoId(), title, category: 'AI checklist / biểu mẫu', link: '', note: text }, ...old.documents],
      }), language === 'vi' ? 'Đã lưu nội dung AI vào Hồ sơ tổ.' : 'AI output saved to records.');
      setActiveTab('documents');
      return;
    }
    setReport(text);
    updateData((old) => ({ ...old, reports: [{ id: cryptoId(), title, createdAt: new Date().toISOString(), content: text }, ...old.reports] }), language === 'vi' ? 'Đã đưa nội dung AI vào Báo cáo.' : 'AI output added to reports.');
    setActiveTab('reports');
  };


  const composeAdministrativeDocument = () => {
    const source = String(aiOutput || aiSourceText || report || '').trim();
    if (!source) return showToast(language === 'vi' ? 'Cần có nội dung AI hoặc văn bản nguồn trước khi soạn văn bản hành chính.' : 'Generate AI output or provide source text before drafting an administrative document.');
    const output = makeAdministrativeDocument(adminDocDraft, source, data, currentUser, language);
    setAdminDocOutput(output);
    showToast(language === 'vi' ? 'Đã tạo bản nháp văn bản hành chính từ nội dung AI.' : 'Administrative document draft created.');
  };

  const polishAdministrativeDocument = async () => {
    const source = String(adminDocOutput || aiOutput || aiSourceText || '').trim();
    if (!source) return showToast(language === 'vi' ? 'Chưa có nội dung để chuẩn hóa bằng AI.' : 'No content to polish with AI.');
    if (!hasApiKey) return showToast(language === 'vi' ? 'Mở Cài đặt → Kiểm tra kết nối OpenRouter Gateway trước khi chuẩn hóa văn bản.' : 'Configure AI settings before polishing the document.');
    setAiLoading(true);
    try {
      const prompt = `Bạn là TTCM/ thư ký tổ chuyên môn tại trường THPT Việt Nam. Hãy chuẩn hóa văn bản hành chính sau cho trang trọng, đúng thể thức cơ bản, có đề mục rõ, không bịa số liệu. Loại văn bản: ${adminDocDraft.type}. Đơn vị: ${adminDocDraft.agency} - ${adminDocDraft.department}. Người ký: ${adminDocDraft.signer} (${adminDocDraft.position}).\n\nNội dung cần chuẩn hóa:\n${source}`;
      const text = await callAI({ prompt, systemInstruction: 'Polish Vietnamese school administrative documents. Keep facts unchanged and mark missing data with ellipses.', temperature: 0.35 });
      setAdminDocOutput(text);
      showToast(language === 'vi' ? 'AI đã chuẩn hóa văn bản hành chính.' : 'AI polished the administrative document.');
    } catch (error) {
      showToast(error?.message || (language === 'vi' ? 'Không chuẩn hóa được văn bản.' : 'Could not polish the document.'));
    } finally {
      setAiLoading(false);
    }
  };

  const saveAdministrativeDocument = () => {
    const text = String(adminDocOutput || '').trim();
    if (!text) return showToast(language === 'vi' ? 'Chưa có văn bản hành chính để lưu.' : 'No administrative document to save.');
    const title = adminDocDraft.title || `${adminDocDraft.type} - ${formatDate(today())}`;
    updateData((old) => ({
      ...old,
      documents: [{ id: cryptoId(), title, category: `Văn bản hành chính · ${adminDocDraft.type}`, link: '', note: text }, ...old.documents],
      reports: [{ id: cryptoId(), title, createdAt: new Date().toISOString(), content: text }, ...old.reports],
    }), language === 'vi' ? 'Đã lưu văn bản hành chính vào Hồ sơ tổ và Báo cáo.' : 'Administrative document saved to records and reports.');
    setActiveTab('documents');
  };

  const downloadAdministrativeDocument = (format = 'doc') => {
    const text = String(adminDocOutput || '').trim();
    if (!text) return showToast(language === 'vi' ? 'Chưa có văn bản hành chính để tải.' : 'No administrative document to download.');
    const baseName = `${adminDocDraft.type || 'van-ban-hanh-chinh'}-${today()}`.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (format === 'doc') {
      downloadText(`${baseName}.doc`, adminDocumentToHtml(text), 'application/msword;charset=utf-8');
      return;
    }
    downloadText(`${baseName}.txt`, text);
  };


  const addFeatureSuggestion = (suggestion) => {
    if (!suggestion) return;
    const title = language === 'vi' ? suggestion.titleVi : suggestion.title;
    const alreadyExists = toArray(data.featureRoadmap).some((item) => item.sourceId === suggestion.id || item.title === title);
    if (alreadyExists) return showToast(language === 'vi' ? 'Đề xuất này đã có trong lộ trình.' : 'This idea is already in the roadmap.');
    const noteLines = [
      language === 'vi' ? suggestion.descVi : suggestion.desc,
      '',
      `${language === 'vi' ? 'Tác động' : 'Impact'}: ${language === 'vi' ? suggestion.impactVi : suggestion.impact}`,
      `${language === 'vi' ? 'Mức ưu tiên' : 'Priority'}: ${language === 'vi' ? suggestion.priorityVi : suggestion.priority}`,
      `${language === 'vi' ? 'Độ khó triển khai' : 'Implementation effort'}: ${language === 'vi' ? suggestion.effortVi : suggestion.effort}`,
      '',
      language === 'vi' ? 'Các bước đề xuất:' : 'Suggested steps:',
      ...(suggestion.stepsVi || []).map((step) => `- ${step}`),
    ];
    updateData((old) => ({
      ...old,
      featureRoadmap: [{
        id: cryptoId(),
        sourceId: suggestion.id,
        title,
        owner: currentUser?.name || 'TTCM',
        date: today(),
        status: 'Đề xuất',
        category: language === 'vi' ? suggestion.categoryVi : suggestion.category,
        priority: language === 'vi' ? suggestion.priorityVi : suggestion.priority,
        effort: language === 'vi' ? suggestion.effortVi : suggestion.effort,
        impact: language === 'vi' ? suggestion.impactVi : suggestion.impact,
        note: noteLines.join('\n'),
      }, ...toArray(old.featureRoadmap)],
    }), language === 'vi' ? 'Đã thêm đề xuất vào lộ trình nâng cấp.' : 'Feature idea added to roadmap.');
  };

  const addCustomFeature = () => {
    if (!featureDraft.title.trim()) return showToast(language === 'vi' ? 'Nhập tên đề xuất nâng cấp trước.' : 'Enter a feature idea first.');
    updateData((old) => ({
      ...old,
      featureRoadmap: [{
        id: cryptoId(),
        title: featureDraft.title.trim(),
        owner: featureDraft.owner || currentUser?.name || 'TTCM',
        date: featureDraft.date || today(),
        status: 'Đề xuất',
        category: featureDraft.link || (language === 'vi' ? 'Tùy chỉnh' : 'Custom'),
        priority: language === 'vi' ? 'Trung bình' : 'Medium',
        effort: language === 'vi' ? 'Chưa ước lượng' : 'Not estimated',
        impact: '',
        note: featureDraft.note || '',
      }, ...toArray(old.featureRoadmap)],
    }), language === 'vi' ? 'Đã thêm đề xuất tùy chỉnh.' : 'Custom feature idea added.');
    setFeatureDraft(EMPTY_FEATURE_DRAFT);
  };

  const updateWorkspaceMeta = (patch) => updateData((old) => ({ ...old, ...patch }), language === 'vi' ? 'Đã cập nhật thông tin tổ.' : 'Workspace info updated.');

  const handleSaveCloud = async () => {
    if (!canPublish) return showToast(language === 'vi' ? 'Chỉ admin/TTCM được lưu dữ liệu chính thức lên cloud.' : 'Only admin/department leaders can publish shared cloud data.');
    if (!canUseCloudDepartmentStore()) return showToast(language === 'vi' ? 'Chưa cấu hình Supabase nên chỉ dùng được dữ liệu local.' : 'Supabase is not configured; local data only.');
    setSyncBusy(true);
    try {
      const result = await saveDepartmentSnapshot(data, currentUser);
      if (!result.ok) throw new Error(result.message || 'Cloud save failed');
      saveSharedData(data, language);
      setCloudInfo({ checked: true, available: true, updatedAt: result.snapshot?.updated_at || new Date().toISOString(), updatedBy: result.snapshot?.updated_by_email || currentUser?.email || '', message: language === 'vi' ? 'Đã lưu cloud' : 'Saved to cloud' });
      showToast(language === 'vi' ? 'Đã lưu dữ liệu tổ chuyên môn lên Supabase và đồng bộ cho giáo viên.' : 'Department workspace saved to Supabase and synced to teachers.');
    } catch (error) {
      showToast(error?.message || (language === 'vi' ? 'Không lưu được cloud.' : 'Cloud save failed.'));
    } finally {
      setSyncBusy(false);
    }
  };

  const handleLoadCloud = async () => {
    if (!canUseCloudDepartmentStore()) return showToast(language === 'vi' ? 'Chưa cấu hình Supabase.' : 'Supabase is not configured.');
    setSyncBusy(true);
    try {
      const result = await loadDepartmentSnapshot(data.schoolYear);
      if (!result.ok) throw new Error(result.message || 'Cloud load failed');
      if (!result.snapshot?.payload) return showToast(language === 'vi' ? 'Chưa có dữ liệu cloud cho năm học này.' : 'No cloud data for this school year.');
      const next = saveData(currentUser?.id, normalizeWorkspaceData({ ...createInitialData(language), ...result.snapshot.payload, lastUpdated: new Date().toISOString() }, language), language);
      saveSharedData(next, language);
      setData(next);
      setReport(makeReport(next, submissions));
      setCloudInfo({ checked: true, available: true, updatedAt: result.snapshot.updated_at || '', updatedBy: result.snapshot.updated_by_email || '', message: language === 'vi' ? 'Đã tải cloud' : 'Cloud loaded' });
      showToast(language === 'vi' ? 'Đã tải dữ liệu tổ chuyên môn từ Supabase.' : 'Loaded department workspace from Supabase.');
    } catch (error) {
      showToast(error?.message || (language === 'vi' ? 'Không tải được cloud.' : 'Cloud load failed.'));
    } finally {
      setSyncBusy(false);
    }
  };

  const handleExportJson = () => {
    downloadText(`to-chuyen-mon-${data.schoolYear}.json`, JSON.stringify({ ...data, submissions, submissionRequests }, null, 2), 'application/json;charset=utf-8');
  };

  const handleExportPortfolio = () => {
    downloadText(`ho-so-to-tieng-anh-${data.schoolYear}.html`, makePortfolioHtml(data, submissions), 'text/html;charset=utf-8');
  };

  const handleExportCalendar = () => {
    downloadText(`lich-to-tieng-anh-${data.schoolYear}.ics`, makeDepartmentIcs(data), 'text/calendar;charset=utf-8');
    showToast(language === 'vi' ? 'Đã xuất lịch .ics để nhập vào Google Calendar/Apple Calendar.' : 'Calendar .ics exported.');
  };

  const addAutoMeetingAgenda = () => {
    const agenda = makeMeetingAgenda(data, submissions);
    updateData((old) => ({
      ...old,
      meetings: [agenda, ...old.meetings],
    }), language === 'vi' ? 'Đã tạo agenda họp tổ tự động từ dữ liệu hiện có.' : 'Automatic meeting agenda created.');
    setActiveTab('meetings');
  };

  const handleImportJson = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const next = saveData(currentUser?.id, normalizeWorkspaceData(parsed, language), language);
      setData(next);
      setReport(makeReport(next, submissions));
      if (Array.isArray(parsed.submissions)) setSubmissions(parsed.submissions);
      if (Array.isArray(parsed.submissionRequests)) setSubmissionRequests(parsed.submissionRequests);
      showToast(language === 'vi' ? 'Đã nhập dữ liệu JSON.' : 'JSON imported.');
    } catch {
      showToast(language === 'vi' ? 'File JSON không hợp lệ.' : 'Invalid JSON file.');
    }
  };

  const submitEvidence = async () => {
    if (!submissionDraft.requestId) return showToast(language === 'vi' ? 'Chỉ được nộp khi có thông báo/yêu cầu đang mở từ TTCM. Hãy chọn một thông báo trước.' : 'You can only submit after an open leader request. Select a request first.');
    if (!submissionDraft.title.trim()) return showToast(language === 'vi' ? 'Nhập tên nội dung cần nộp trước.' : 'Enter submission title first.');
    if (!canUseCloudDepartmentStore()) {
      showToast(language === 'vi' ? 'Cần kết nối Supabase để kiểm tra thông báo TTCM trước khi giáo viên nộp.' : 'Supabase is required to verify leader requests before submission.');
      return;
    }
    setSubmissionBusy(true);
    try {
      const result = await createDepartmentSubmission({ ...submissionDraft, schoolYear: data.schoolYear, semester: data.semester }, currentUser);
      if (!result.ok) throw new Error(result.message || 'Submit failed');
      setSubmissionDraft({ ...EMPTY_SUBMISSION });
      await refreshSubmissions(data.schoolYear);
      await refreshSubmissionRequests(data.schoolYear);
      showToast(submissionDraft.file
        ? (language === 'vi' ? 'Đã tải tệp và gửi hồ sơ cho TTCM duyệt.' : 'File uploaded and submitted for review.')
        : (language === 'vi' ? 'Đã gửi minh chứng cho TTCM duyệt.' : 'Evidence submitted for review.'));
    } catch (error) {
      showToast(error?.message || (language === 'vi' ? 'Không gửi được minh chứng.' : 'Submission failed.'));
    } finally {
      setSubmissionBusy(false);
    }
  };


  const createSubmissionRequest = async () => {
    if (!canPublish) return showToast(language === 'vi' ? 'Chỉ TTCM/Admin được gửi thông báo yêu cầu nộp.' : 'Only leaders can create submission requests.');
    if (!requestDraft.title.trim()) return showToast(language === 'vi' ? 'Nhập tiêu đề thông báo trước.' : 'Enter request title first.');
    if (!canUseCloudDepartmentStore()) return showToast(language === 'vi' ? 'Cần Supabase để gửi thông báo cho giáo viên. Hãy cấu hình Supabase trước.' : 'Supabase is required for submission notices.');
    setSubmissionBusy(true);
    try {
      const payload = { ...requestDraft, schoolYear: data.schoolYear, semester: data.semester };

      // If the UI already sees this account as admin but public.profiles is stale,
      // Supabase RLS may still reject the insert. Repair first, then create.
      if (String(currentUser?.role || '').toLowerCase() === 'admin') {
        await repairCurrentAdminDatabaseRole().catch(() => null);
      }

      let result = await createDepartmentSubmissionRequest(payload, currentUser);
      const firstMessage = String(result?.message || '').toLowerCase();
      const looksLikeRls = firstMessage.includes('row-level')
        || firstMessage.includes('policy')
        || firstMessage.includes('permission')
        || firstMessage.includes('violates row-level')
        || firstMessage.includes('not allowed');

      if (!result.ok && String(currentUser?.role || '').toLowerCase() === 'admin' && looksLikeRls) {
        await repairCurrentAdminDatabaseRole().catch(() => null);
        result = await createDepartmentSubmissionRequest(payload, currentUser);
      }

      if (!result.ok) {
        const detail = result.message || 'Request failed';
        throw new Error(language === 'vi'
          ? `Không gửi được thông báo: ${detail}. Nếu đây là tài khoản TTCM, hãy bảo đảm đã chạy lại supabase/schema.sql bản mới và tài khoản có role admin/TTCM hoặc quyền department:publish.`
          : `Could not send request: ${detail}. If this is a department leader account, rerun the latest supabase/schema.sql and make sure the account has admin/leader role or department:publish permission.`);
      }

      setRequestDraft({ ...EMPTY_SUBMISSION_REQUEST });
      setSubmissionRequests((old) => [result.request, ...toArray(old).filter((item) => item.id !== result.request?.id)].filter(Boolean));
      await refreshSubmissionRequests(data.schoolYear);
      showToast(language === 'vi' ? 'Đã gửi thông báo/yêu cầu nộp cho giáo viên.' : 'Submission request sent.');
    } catch (error) {
      showToast(error?.message || (language === 'vi' ? 'Không tạo được thông báo.' : 'Could not create request.'));
    } finally {
      setSubmissionBusy(false);
    }
  };

  const toggleSubmissionRequest = async (request) => {
    if (!canPublish) return showToast(language === 'vi' ? 'Chỉ TTCM/Admin được đóng/mở thông báo.' : 'Only leaders can update requests.');
    const nextStatus = request.status === 'open' ? 'closed' : 'open';
    setSubmissionBusy(true);
    try {
      const result = await updateDepartmentSubmissionRequestStatus(request.id, nextStatus);
      if (!result.ok) throw new Error(result.message || 'Update failed');
      await refreshSubmissionRequests(data.schoolYear);
      showToast(nextStatus === 'open'
        ? (language === 'vi' ? 'Đã mở lại thông báo.' : 'Request reopened.')
        : (language === 'vi' ? 'Đã đóng thông báo. Giáo viên không thể nộp thêm theo thông báo này.' : 'Request closed. Teachers can no longer submit to it.'));
    } catch (error) {
      showToast(error?.message || (language === 'vi' ? 'Không cập nhật được thông báo.' : 'Could not update request.'));
    } finally {
      setSubmissionBusy(false);
    }
  };

  const reviewSubmission = async (item, status) => {
    if (!canPublish) return showToast(language === 'vi' ? 'Chỉ admin/TTCM được duyệt hồ sơ.' : 'Only department leaders can review submissions.');
    const defaultNote = status === 'approved' ? 'Đã duyệt và lưu vào kho hồ sơ TTCM.' : 'Cần chỉnh sửa / chưa phù hợp.';
    const reviewNote = window.prompt(language === 'vi' ? 'Nhập phản hồi cho giáo viên:' : 'Review note:', defaultNote) ?? defaultNote;
    setSubmissionBusy(true);
    try {
      const result = await reviewDepartmentSubmission(item.id, status, reviewNote, currentUser);
      if (!result.ok) throw new Error(result.message || 'Review failed');
      const reviewedItem = result.submission || item;
      let archiveFolder = item.archive_folder || makeSubmissionArchiveFolder(reviewedItem, data.schoolYear);
      if (status === 'approved') {
        const archiveResult = await archiveDepartmentSubmission(item.id, {
          archiveFolder,
          archiveNote: reviewNote,
        }, currentUser);
        if (archiveResult.ok && archiveResult.submission) archiveFolder = archiveResult.submission.archive_folder || archiveFolder;
        updateData((old) => ({
          ...old,
          documents: old.documents.some((doc) => doc.sourceSubmissionId === item.id) ? old.documents : [{
            id: cryptoId(),
            sourceSubmissionId: item.id,
            title: item.title,
            category: item.category || 'Minh chứng GV nộp',
            link: item.link || '',
            note: `${item.submitter_name || item.submitter_email || 'Giáo viên'}${item.file_name ? ` · Tệp tải lên: ${item.file_name}` : ''}${item.file_path ? ` · Storage: ${item.file_path}` : ''} · Thư mục lưu trữ: ${archiveFolder} · ${item.note || ''}`,
          }, ...old.documents],
        }), language === 'vi' ? 'Đã duyệt và lưu vào Kho hồ sơ TTCM. Nhớ bấm Lưu cloud để xuất bản dữ liệu chung.' : 'Approved and saved to the leader archive. Remember to save cloud.');
      }
      await refreshSubmissions(data.schoolYear);
      if (status !== 'approved') showToast(language === 'vi' ? 'Đã từ chối hồ sơ.' : 'Submission rejected.');
    } catch (error) {
      showToast(error?.message || (language === 'vi' ? 'Không duyệt/lưu kho được hồ sơ.' : 'Review/archive failed.'));
    } finally {
      setSubmissionBusy(false);
    }
  };

  const archiveSubmission = async (item, mode = 'archive') => {
    if (!canPublish) return showToast(language === 'vi' ? 'Chỉ admin/TTCM được lưu kho hồ sơ.' : 'Only department leaders can archive submissions.');
    if (!canUseCloudDepartmentStore()) return showToast(language === 'vi' ? 'Cần Supabase để lưu kho hồ sơ dùng chung.' : 'Supabase is required for the shared archive.');
    if (mode === 'unarchive') {
      if (!window.confirm(language === 'vi' ? 'Bỏ hồ sơ này khỏi Kho lưu trữ TTCM?' : 'Remove this item from the leader archive?')) return;
      setSubmissionBusy(true);
      try {
        const result = await archiveDepartmentSubmission(item.id, { archived: false }, currentUser);
        if (!result.ok) throw new Error(result.message || 'Archive update failed');
        await refreshSubmissions(data.schoolYear);
        showToast(language === 'vi' ? 'Đã bỏ lưu kho hồ sơ.' : 'Removed from archive.');
      } catch (error) {
        showToast(error?.message || (language === 'vi' ? 'Không cập nhật được kho lưu trữ.' : 'Archive update failed.'));
      } finally {
        setSubmissionBusy(false);
      }
      return;
    }

    const defaultFolder = item.archive_folder || makeSubmissionArchiveFolder(item, data.schoolYear);
    const archiveFolder = window.prompt(language === 'vi' ? 'Tên thư mục lưu trữ:' : 'Archive folder name:', defaultFolder);
    if (archiveFolder === null) return;
    const archiveNote = item.archive_note || (language === 'vi' ? 'Lưu để TTCM tra cứu lại hồ sơ/tệp minh chứng sau này.' : 'Saved for later leader retrieval.');
    setSubmissionBusy(true);
    try {
      const result = await archiveDepartmentSubmission(item.id, { archiveFolder, archiveNote }, currentUser);
      if (!result.ok) throw new Error(result.message || 'Archive failed');
      await refreshSubmissions(data.schoolYear);
      showToast(language === 'vi' ? 'Đã lưu/cập nhật thư mục trong Kho hồ sơ TTCM.' : 'Archive folder saved.');
    } catch (error) {
      showToast(error?.message || (language === 'vi' ? 'Không lưu được vào kho hồ sơ.' : 'Could not save to archive.'));
    } finally {
      setSubmissionBusy(false);
    }
  };

  const cancelSubmission = async (item) => {
    if (!window.confirm(language === 'vi' ? 'Hủy hồ sơ đang chờ duyệt này?' : 'Cancel this pending submission?')) return;
    setSubmissionBusy(true);
    try {
      const result = await cancelDepartmentSubmission(item.id);
      if (!result.ok) throw new Error(result.message || 'Cancel failed');
      await refreshSubmissions(data.schoolYear);
      showToast(language === 'vi' ? 'Đã hủy hồ sơ chờ duyệt.' : 'Submission cancelled.');
    } catch (error) {
      showToast(error?.message || (language === 'vi' ? 'Không hủy được hồ sơ.' : 'Cancel failed.'));
    } finally {
      setSubmissionBusy(false);
    }
  };

  return (
    <div className="page department-page department-page-v60 department-page-v63">
      <section className="department-v40-hero-shell" aria-label={language === 'vi' ? 'Hero tổ chuyên môn' : 'Department hero'}>
        <div className="department-v40-hero-card">
          <DepartmentHeroIllustration language={language} />
          <div className="department-v40-hero-copy">
            <span className="department-v40-tag">English Department Workspace</span>
            <h1>{language === 'vi' ? 'Tổ chuyên môn Tiếng Anh' : 'English Department Workspace'}</h1>
            <p>{language === 'vi'
              ? 'Quản lý kế hoạch, lịch công tác, giao việc, hồ sơ minh chứng, nghiên cứu bài học, kiểm tra nội bộ và báo cáo với AI hỗ trợ TTCM.'
              : 'Manage plans, work schedules, assignments, evidence, lesson study, internal review and reports with AI support for department leaders.'}</p>
            <div className="department-v40-hero-actions">
              <button className="primary dept-action-teal" onClick={() => canPublish ? setActiveTab('plans') : document.querySelector('.department-teacher-workspace-v64')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>＋ {canPublish ? (language === 'vi' ? 'Tạo kế hoạch' : 'Create plan') : (language === 'vi' ? 'Xem việc được giao' : 'View assignments')}</button>
              <button className="primary dept-action-blue" onClick={() => canPublish ? setActiveTab('submissions') : document.querySelector('.department-teacher-workspace-v64')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>◔ {language === 'vi' ? 'Giao việc / duyệt hồ sơ' : 'Assign / review'}</button>
              <button className="primary dept-action-coral" onClick={() => setActiveTab('aiCopilot')}>✦ {language === 'vi' ? 'AI hỗ trợ TTCM' : 'AI Copilot'}</button>
            </div>
          </div>
        </div>

        <div className="department-v40-summary-strip">
          <button type="button" className="department-v40-summary-item" onClick={() => setActiveTab('submissions')}>
            <span className="icon amber">🔔</span>
            <div><strong>{language === 'vi' ? 'Thông báo / duyệt' : 'Requests / review'}</strong><small>{stats.openNotices || 0} {language === 'vi' ? 'chờ duyệt' : 'pending'} · {stats.pendingSubmissions} {language === 'vi' ? 'cần xem' : 'to review'}</small></div>
            <em>›</em>
          </button>
          <button type="button" className="department-v40-summary-item" onClick={() => setActiveTab('tasks')}>
            <span className="icon mint">✅</span>
            <div><strong>{language === 'vi' ? 'Việc cần làm' : 'Tasks'}</strong><small>{stats.openTasks} {language === 'vi' ? 'đang mở' : 'open'} · {stats.overdue} {language === 'vi' ? 'quá hạn' : 'overdue'}</small></div>
            <em>›</em>
          </button>
          <button type="button" className="department-v40-summary-item" onClick={() => setActiveTab('workSchedule')}>
            <span className="icon blue">🗓️</span>
            <div><strong>{language === 'vi' ? 'Lịch tuần này' : 'This week'}</strong><small>{upcomingItems.length} {language === 'vi' ? 'sự kiện' : 'items'} · {data.meetings.length} {language === 'vi' ? 'cuộc họp' : 'meetings'}</small></div>
            <em>›</em>
          </button>
          <button type="button" className="department-v40-summary-item" onClick={() => setActiveTab('reports')}>
            <span className="icon purple">◔</span>
            <div><strong>{language === 'vi' ? 'Báo cáo' : 'Reports'}</strong><small>{stats.reports || 0} {language === 'vi' ? 'báo cáo mới' : 'new reports'}</small></div>
            <em>›</em>
          </button>
        </div>
      </section>

      <DepartmentOperationsDashboard data={data} stats={stats} health={departmentHealth} language={language} setActiveTab={openDepartmentTab} cloudInfo={cloudInfo} canPublish={canPublish} onSaveCloud={handleSaveCloud} onLoadCloud={handleLoadCloud} upcomingItems={upcomingItems} workloadRows={workloadRows} onExportCalendar={handleExportCalendar} />

      {!canPublish ? (
        <section className="department-teacher-workspace-v64 panel">
          <div className="department-section-heading-row">
            <div>
              <span className="dept-dash-eyebrow-v63">{language === 'vi' ? 'Không gian giáo viên' : 'Teacher workspace'}</span>
              <h2>{language === 'vi' ? 'Thông báo được giao & hồ sơ của tôi' : 'Assigned notices & my submissions'}</h2>
              <p className="muted-line">{language === 'vi' ? 'Giáo viên chỉ thấy yêu cầu TTCM gửi cho mình và chỉ xem được hồ sơ của chính mình. Các thẻ điều hành của tổ trưởng được ẩn để tránh nhầm quyền.' : 'Teachers only see notices addressed to them and their own submissions. Leader operation tabs are hidden.'}</p>
            </div>
            <div className="department-submission-scope">
              <span>{language === 'vi' ? 'Quyền giáo viên' : 'Teacher access'}</span>
              <strong>{submissionNotice.myUnsubmittedRequests} {language === 'vi' ? 'việc cần nộp' : 'to submit'}</strong>
              <small>{submissionNotice.minePending} {language === 'vi' ? 'đang chờ duyệt' : 'pending review'}</small>
            </div>
          </div>
          <SubmissionsPanel language={language} canPublish={canPublish} currentUser={currentUser} submissions={submissions} submissionRequests={submissionRequests} requestDraft={requestDraft} setRequestDraft={setRequestDraft} draft={submissionDraft} setDraft={setSubmissionDraft} createSubmissionRequest={createSubmissionRequest} toggleSubmissionRequest={toggleSubmissionRequest} submitEvidence={submitEvidence} reviewSubmission={reviewSubmission} archiveSubmission={archiveSubmission} cancelSubmission={cancelSubmission} busy={submissionBusy} />
        </section>
      ) : null}

      {visibleTabs.length ? (
      <section className="department-work-panel panel">
        <div className="department-tabs">
          {visibleTabs.map((module) => {
            const isAllowed = allowed(module.key);
            return (
              <button key={module.key} className={activeTab === module.key ? 'active' : ''} disabled={!isAllowed} onClick={() => setActiveTab(module.key)}>
                <span>{module.icon}</span>{language === 'vi' ? module.shortVi : module.short}
              </button>
            );
          })}
        </div>


        {canPublish ? (
        <ModuleAssistPanel
          language={language}
          module={activeModule}
          moduleAi={activeModuleAi}
          hasApiKey={hasApiKey}
          aiSourceName={aiSourceName}
          aiSourceText={aiSourceText}
          inputRef={moduleAssistInputRef}
          onFile={handleModuleAssistFile}
          onPaste={pasteModuleAssistFromClipboard}
          onClear={clearAiSourceText}
          onOpenAI={() => prepareModuleAI('assist')}
          onAdminDoc={() => prepareModuleAI('adminDocument')}
        />
        ) : null}

        {activeTab === 'dashboard' && allowed('dashboard') && <DashboardPanel data={data} stats={stats} health={departmentHealth} language={language} setActiveTab={openDepartmentTab} cloudInfo={cloudInfo} canPublish={canPublish} onSaveCloud={handleSaveCloud} onLoadCloud={handleLoadCloud} onUseTemplate={useTemplate} upcomingItems={upcomingItems} workloadRows={workloadRows} onExportCalendar={handleExportCalendar} onAddAgenda={addAutoMeetingAgenda} />}
        {activeTab === 'plans' && allowed('plans') && <PlansPanel data={data} language={language} draft={draft} setDraft={setDraft} addPlan={addPlan} updateStatus={updateStatus} removeItem={removeItem} />}
        {activeTab === 'meetings' && allowed('meetings') && <MeetingsPanel data={data} language={language} draft={draft} setDraft={setDraft} addMeeting={addMeeting} addAutoMeetingAgenda={addAutoMeetingAgenda} removeItem={removeItem} />}
        {activeTab === 'workSchedule' && allowed('workSchedule') && <WorkSchedulePanel
          data={data}
          language={language}
          draft={workScheduleDraft}
          setDraft={setWorkScheduleDraft}
          addSchedule={addWorkSchedule}
          updateStatus={updateStatus}
          removeItem={removeItem}
          onExportCalendar={handleExportCalendar}
          canManage={canPublish}
          hasApiKey={hasApiKey}
          importWeekStart={scheduleImportWeekStart}
          setImportWeekStart={setScheduleImportWeekStart}
          importFileName={scheduleImportFileName}
          importItems={scheduleImportItems}
          importSummary={scheduleImportSummary}
          importWarnings={scheduleImportWarnings}
          importBusy={scheduleImportBusy}
          importInputRef={scheduleImportInputRef}
          onImportFile={handleWorkScheduleImportFile}
          onAnalyzeAgain={() => analyzeWorkScheduleSource()}
          onUpdateImportItem={updateScheduleImportItem}
          onRemoveImportItem={removeScheduleImportItem}
          onSelectAllImportItems={selectAllScheduleImportItems}
          onClearImport={clearScheduleImport}
          onAddImportedSchedules={addImportedSchedules}
        />}
        {activeTab === 'featureLab' && allowed('featureLab') && <FeatureLabPanel language={language} data={data} draft={featureDraft} setDraft={setFeatureDraft} addFeatureSuggestion={addFeatureSuggestion} addCustomFeature={addCustomFeature} updateStatus={updateStatus} removeItem={removeItem} setActiveTab={setActiveTab} />}
        {activeTab === 'tasks' && allowed('tasks') && <TasksPanel data={data} language={language} draft={draft} setDraft={setDraft} addTask={addTask} updateStatus={updateStatus} removeItem={removeItem} />}
        {activeTab === 'documents' && allowed('documents') && <DocumentsPanel data={data} language={language} draft={draft} setDraft={setDraft} addDocument={addDocument} removeItem={removeItem} />}
        {activeTab === 'submissions' && allowed('submissions') && <SubmissionsPanel language={language} canPublish={canPublish} currentUser={currentUser} submissions={submissions} submissionRequests={submissionRequests} requestDraft={requestDraft} setRequestDraft={setRequestDraft} draft={submissionDraft} setDraft={setSubmissionDraft} createSubmissionRequest={createSubmissionRequest} toggleSubmissionRequest={toggleSubmissionRequest} submitEvidence={submitEvidence} reviewSubmission={reviewSubmission} archiveSubmission={archiveSubmission} cancelSubmission={cancelSubmission} busy={submissionBusy} />}
        {activeTab === 'aiCopilot' && allowed('aiCopilot') && <DepartmentAIPanel language={language} hasApiKey={hasApiKey} aiAction={aiAction} setAiAction={setAiAction} aiInstruction={aiInstruction} setAiInstruction={setAiInstruction} aiSourceText={aiSourceText} setAiSourceText={setAiSourceText} aiSourceName={aiSourceName} setAiSourceName={setAiSourceName} aiSourceInputRef={aiSourceInputRef} handleAiSourceFile={handleAiSourceFile} pasteAiSourceFromClipboard={pasteAiSourceFromClipboard} clearAiSourceText={clearAiSourceText} aiOutput={aiOutput} setAiOutput={setAiOutput} aiLoading={aiLoading} runDepartmentAI={runDepartmentAI} applyAIOutput={applyAIOutput} health={departmentHealth} adminDocDraft={adminDocDraft} setAdminDocDraft={setAdminDocDraft} adminDocOutput={adminDocOutput} setAdminDocOutput={setAdminDocOutput} composeAdministrativeDocument={composeAdministrativeDocument} polishAdministrativeDocument={polishAdministrativeDocument} saveAdministrativeDocument={saveAdministrativeDocument} downloadAdministrativeDocument={downloadAdministrativeDocument} />}
        {activeTab === 'reports' && allowed('reports') && <ReportsPanel language={language} report={report} setReport={setReport} reportType={reportType} setReportType={setReportType} buildAIReport={buildAIReport} aiLoading={aiLoading} onDownload={() => downloadText('bao-cao-to-tieng-anh.txt', report)} onCopy={() => navigator.clipboard?.writeText(report).then(() => showToast(language === 'vi' ? 'Đã copy báo cáo.' : 'Report copied.'))} onExportPortfolio={handleExportPortfolio} />}
        {Object.keys(STRUCTURED_MODULES).includes(activeTab) && allowed(activeTab) && <StructuredModulePanel module={moduleByKey.get(activeTab)} config={STRUCTURED_MODULES[activeTab]} data={data} language={language} draft={draft} setDraft={setDraft} addRecord={() => addStructuredRecord(activeTab)} updateStatus={updateStatus} removeItem={removeItem} setActiveTab={setActiveTab} />}
      </section>
      ) : null}

      {toast ? <div className="toast">{toast}</div> : null}
    </div>
  );
}

function DepartmentModuleCard({ module, language, currentUser, allowed, active, onOpen }) {
  const title = language === 'vi' ? module.titleVi : module.title;
  const desc = language === 'vi' ? module.descVi : module.desc;
  return (
    <article className={`department-module-card ${active ? 'active' : ''} ${allowed ? '' : 'locked-card'}`}>
      {!allowed ? <span className="locked-ribbon">{language === 'vi' ? 'Chưa cấp quyền' : 'Locked'}</span> : null}
      <div className="department-module-top">
        <span>{module.icon}</span>
        <div>
          <h3>{title}</h3>
          <p>{desc}</p>
        </div>
      </div>
      {allowed ? (
        <button className="primary full" onClick={onOpen}>{language === 'vi' ? 'Mở phân hệ' : 'Open module'}</button>
      ) : (
        <PermissionRequestButton currentUser={currentUser} permissionId={module.id} item={module} language={language} />
      )}
    </article>
  );
}


function DepartmentOperationsDashboard({ data, stats, health, language, setActiveTab, cloudInfo, canPublish, onSaveCloud, onLoadCloud, upcomingItems, workloadRows, onExportCalendar }) {
  const scheduleItems = upcomingItems.slice(0, 3);
  const priorityItems = [...data.tasks, ...data.plans, ...data.assessments]
    .filter((item) => isOverdue(item) || item.status === 'Chờ duyệt' || item.status === 'Đang làm' || item.status === 'Chưa làm')
    .slice(0, 3);
  const recentDocs = data.documents.slice(0, 3);
  const reportSuggestions = [
    language === 'vi' ? 'Tổng hợp tiến độ công việc tuần' : 'Summarize weekly progress',
    language === 'vi' ? 'Gợi ý nội dung báo cáo tháng' : 'Suggest monthly report content',
    language === 'vi' ? 'Phân tích minh chứng theo chủ đề' : 'Analyze evidence by topic',
  ];
  const calendarCells = [
    ['', '', '1', '2', '3', '4', '5'],
    ['6', '7', '8', '9', '10', '11', '12'],
    ['13', '14', '15', '16', '17', '18', '19'],
    ['20', '21', '22', '23', '24', '25', '26'],
    ['27', '28', '29', '30', '31', '', ''],
  ];

  return (
    <section className="department-v40-dashboard" aria-label={language === 'vi' ? 'Dashboard công tác chuyên môn' : 'Department work dashboard'}>
      <article className="department-v40-card department-v40-calendar-panel">
        <div className="department-v40-card-head">
          <div className="title-wrap">
            <span className="card-icon teal">🗓️</span>
            <div>
              <h3>{language === 'vi' ? 'Kế hoạch & lịch công tác' : 'Plans & schedule'}</h3>
            </div>
          </div>
        </div>
        <div className="department-v40-card-body two-col">
          <div className="department-v40-mini-calendar">
            <div className="calendar-head"><button type="button">‹</button><strong>{language === 'vi' ? 'Tháng 7, 2026' : 'July 2026'}</strong><button type="button">›</button></div>
            <div className="calendar-weekdays"><span>T2</span><span>T3</span><span>T4</span><span>T5</span><span>T6</span><span>T7</span><span>CN</span></div>
            <div className="calendar-grid">
              {calendarCells.flat().map((day, index) => (
                <span key={`${day}-${index}`} className={day === '10' ? 'is-active' : day === '14' || day === '17' || day === '24' ? 'is-marked' : ''}>{day}</span>
              ))}
            </div>
          </div>
          <div className="department-v40-list-block">
            <strong>{language === 'vi' ? 'Lịch sắp tới' : 'Upcoming schedule'}</strong>
            <ul>
              {scheduleItems.length ? scheduleItems.map((item) => (
                <li key={`${item.collection}-${item.id}`}>
                  <span className="bullet" />
                  <div>
                    <b>{formatDate(getItemDate(item))}</b>
                    <em>{item.title}</em>
                  </div>
                </li>
              )) : <li className="empty">{language === 'vi' ? 'Chưa có lịch sắp tới.' : 'No upcoming schedule.'}</li>}
            </ul>
          </div>
        </div>
        <div className="department-v40-card-actions">
          <button className="secondary" type="button" onClick={() => setActiveTab('workSchedule')}>{language === 'vi' ? 'Thêm lịch' : 'Add schedule'}</button>
          <button className="secondary" type="button" onClick={() => setActiveTab('plans')}>{language === 'vi' ? 'Tạo kế hoạch' : 'Create plan'}</button>
          <button className="secondary" type="button" onClick={onExportCalendar}>{language === 'vi' ? 'Xuất lịch' : 'Export calendar'}</button>
          <button className="secondary" type="button" onClick={() => setActiveTab('workSchedule')}>{language === 'vi' ? 'Xem tất cả' : 'View all'}</button>
        </div>
      </article>

      <article className="department-v40-card department-v40-tasks-panel">
        <div className="department-v40-card-head">
          <div className="title-wrap">
            <span className="card-icon blue">☑</span>
            <div>
              <h3>{language === 'vi' ? 'Công việc & phê duyệt' : 'Tasks & approval'}</h3>
            </div>
          </div>
        </div>
        <div className="department-v40-card-body two-col compact-gap">
          <div className="department-v40-stat-list">
            <div><span>{language === 'vi' ? 'Việc đang mở' : 'Open tasks'}</span><strong>{stats.openTasks}</strong></div>
            <div><span>{language === 'vi' ? 'Quá hạn' : 'Overdue'}</span><strong className="danger">{stats.overdue}</strong></div>
            <div><span>{language === 'vi' ? 'Chờ duyệt' : 'Pending review'}</span><strong className="amber">{stats.pendingSubmissions}</strong></div>
            <div><span>{language === 'vi' ? 'Đã hoàn thành' : 'Completed'}</span><strong className="success">{Math.max(0, data.tasks.length - stats.openTasks)}</strong></div>
          </div>
          <div className="department-v40-list-block">
            <strong>{language === 'vi' ? 'Việc cần làm' : 'To do now'}</strong>
            <ul>
              {priorityItems.length ? priorityItems.map((item) => (
                <li key={item.id}>
                  <span className="bullet blue" />
                  <div>
                    <em>{item.title}</em>
                    <b>{isOverdue(item) ? (language === 'vi' ? 'Quá hạn' : 'Overdue') : formatDate(getItemDate(item))}</b>
                  </div>
                </li>
              )) : <li className="empty">{language === 'vi' ? 'Chưa có việc ưu tiên.' : 'No priority tasks.'}</li>}
            </ul>
          </div>
        </div>
        <div className="department-v40-card-actions">
          <button className="secondary" type="button" onClick={() => setActiveTab('tasks')}>{language === 'vi' ? 'Giao việc' : 'Assign task'}</button>
          <button className="secondary" type="button" onClick={() => setActiveTab('submissions')}>{language === 'vi' ? 'Duyệt hồ sơ' : 'Review files'}</button>
          <button className="secondary" type="button" onClick={() => setActiveTab('meetings')}>{language === 'vi' ? 'Tạo biên bản' : 'Create minutes'}</button>
          <button className="secondary" type="button" onClick={() => setActiveTab('tasks')}>{language === 'vi' ? 'Xem tất cả' : 'View all'}</button>
        </div>
      </article>

      <article className="department-v40-card department-v40-evidence-panel">
        <div className="department-v40-card-head">
          <div className="title-wrap">
            <span className="card-icon green">🗂</span>
            <div>
              <h3>{language === 'vi' ? 'Hồ sơ & minh chứng' : 'Records & evidence'}</h3>
            </div>
          </div>
        </div>
        <div className="department-v40-card-body two-col compact-gap">
          <div className="department-v40-stat-list">
            <div><span>{language === 'vi' ? 'Tổng hồ sơ' : 'Total files'}</span><strong>{data.documents.length + stats.archivedSubmissions}</strong></div>
            <div><span>{language === 'vi' ? 'Chờ bổ sung' : 'Need update'}</span><strong className="amber">{stats.pendingSubmissions}</strong></div>
            <div><span>{language === 'vi' ? 'Đã duyệt' : 'Approved'}</span><strong className="success">{stats.archivedSubmissions}</strong></div>
            <div><span>{language === 'vi' ? 'Lưu trữ' : 'Archived'}</span><strong>{stats.archivedSubmissions}</strong></div>
          </div>
          <div className="department-v40-list-block">
            <strong>{language === 'vi' ? 'Hồ sơ gần đây' : 'Recent records'}</strong>
            <ul>
              {recentDocs.length ? recentDocs.map((item) => (
                <li key={item.id}>
                  <span className="bullet green" />
                  <div>
                    <em>{item.title}</em>
                    <b>{item.category || (language === 'vi' ? 'Minh chứng' : 'Evidence')}</b>
                  </div>
                </li>
              )) : <li className="empty">{language === 'vi' ? 'Chưa có hồ sơ gần đây.' : 'No recent records.'}</li>}
            </ul>
          </div>
        </div>
        <div className="department-v40-card-actions">
          <button className="secondary" type="button" onClick={() => setActiveTab('documents')}>{language === 'vi' ? 'Tải lên hồ sơ' : 'Upload record'}</button>
          <button className="secondary" type="button" onClick={onLoadCloud}>{language === 'vi' ? 'Kiểm tra cloud' : 'Check cloud'}</button>
          <button className="secondary" type="button" onClick={() => setActiveTab('submissions')}>{language === 'vi' ? 'Xuất hồ sơ HTML' : 'Export HTML'}</button>
          <button className="secondary" type="button" onClick={() => setActiveTab('documents')}>{language === 'vi' ? 'Xem tất cả' : 'View all'}</button>
        </div>
      </article>

      <article className="department-v40-card department-v40-reports-panel">
        <div className="department-v40-card-head">
          <div className="title-wrap">
            <span className="card-icon purple">✦</span>
            <div>
              <h3>{language === 'vi' ? 'Báo cáo & AI Copilot' : 'Reports & AI Copilot'}</h3>
            </div>
          </div>
        </div>
        <div className="department-v40-card-body two-col compact-gap">
          <div className="department-v40-stat-list">
            <div><span>{language === 'vi' ? 'Báo cáo tháng' : 'Monthly reports'}</span><strong>{stats.reports || 0}</strong></div>
            <div><span>{language === 'vi' ? 'Điểm rủi ro' : 'Risk score'}</span><strong className={health.riskScore >= 60 ? 'danger' : health.riskScore >= 28 ? 'amber' : 'success'}>{health.riskScore}</strong></div>
            <div><span>{language === 'vi' ? 'Lần dùng AI (tháng)' : 'AI uses (month)'}</span><strong>{Math.max(4, Math.round((stats.reports || 0) + (stats.openTasks || 0) / 2))}</strong></div>
            <div><span>{language === 'vi' ? 'Cloud' : 'Cloud'}</span><strong>{cloudInfo.available ? 'OK' : 'LOCAL'}</strong></div>
          </div>
          <div className="department-v40-list-block">
            <strong>{language === 'vi' ? 'AI Copilot gợi ý' : 'AI Copilot suggestions'}</strong>
            <ul>
              {reportSuggestions.map((item) => (
                <li key={item}>
                  <span className="bullet purple" />
                  <div><em>{item}</em></div>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="department-v40-card-actions">
          <button className="secondary" type="button" onClick={() => setActiveTab('reports')}>{language === 'vi' ? 'Tạo báo cáo' : 'Create report'}</button>
          <button className="secondary" type="button" onClick={onSaveCloud} disabled={!canPublish}>{language === 'vi' ? 'Xuất JSON' : 'Export JSON'}</button>
          <button className="secondary" type="button" onClick={onLoadCloud}>{language === 'vi' ? 'Nhập JSON' : 'Import JSON'}</button>
          <button className="secondary" type="button" onClick={() => setActiveTab('aiCopilot')}>{language === 'vi' ? 'Chat với AI' : 'Chat with AI'}</button>
        </div>
      </article>
    </section>
  );
}

function DashboardPanel() {
  // V10.54: The legacy department operation overview has been intentionally hidden.
  // Data and the remaining core modules are preserved; the Overview tab stays available
  // without rendering the removed progress, priority, calendar, workload, sync or template cards.
  return null;
}

function ProgressLine({ label, value }) {
  return <div className="department-progress-line"><div><strong>{label}</strong><span>{value}%</span></div><i style={{ width: `${value}%` }} /></div>;
}

function MiniAction({ title, value, onClick }) {
  return <button className="department-mini-action" onClick={onClick}><strong>{value}</strong><span>{title}</span></button>;
}


function ModuleAssistPanel({ language, module, moduleAi, hasApiKey, aiSourceName, aiSourceText, inputRef, onFile, onPaste, onClear, onOpenAI, onAdminDoc }) {
  const ready = String(aiSourceText || '').trim().length > 0;
  if (!module) return null;
  return (
    <section className="department-module-assist metro-panel liquid-glass">
      <input
        ref={inputRef}
        type="file"
        accept=".txt,.md,.csv,.json,.html,.htm,.xml,.srt,.vtt,.docx,.pdf,text/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={onFile}
        hidden
      />
      <div className="module-assist-main">
        <span className="module-assist-icon">📎🤖</span>
        <div>
          <strong>{language === 'vi' ? `Tài liệu & AI bổ trợ: ${module.titleVi || module.shortVi}` : `Documents & AI support: ${module.title || module.short}`}</strong>
          <p>{moduleAi?.instruction || (language === 'vi' ? 'Tải/dán tài liệu để AI hỗ trợ phân hệ này.' : 'Upload/paste a document for AI support in this module.')}</p>
          <small>{ready ? `${language === 'vi' ? 'Nguồn hiện có' : 'Current source'}: ${aiSourceName || (language === 'vi' ? 'văn bản dán trực tiếp' : 'direct text')} · ${String(aiSourceText).length.toLocaleString('vi-VN')} ký tự` : (language === 'vi' ? 'Chưa có tài liệu nguồn. Có thể tải file hoặc dán từ clipboard.' : 'No source yet. Upload a file or paste from clipboard.')}</small>
        </div>
      </div>
      <div className="module-assist-actions">
        <button className="secondary" type="button" onClick={() => inputRef?.current?.click?.()}>{language === 'vi' ? 'Upload tài liệu' : 'Upload document'}</button>
        <button className="secondary" type="button" onClick={onPaste}>{language === 'vi' ? 'Dán văn bản' : 'Paste text'}</button>
        <button className="primary" type="button" onClick={onOpenAI} disabled={!hasApiKey}>{language === 'vi' ? 'AI hỗ trợ' : 'AI support'}</button>
        <button className="secondary" type="button" onClick={onAdminDoc} disabled={!hasApiKey}>{language === 'vi' ? 'Soạn VB hành chính' : 'Draft admin doc'}</button>
        <button className="ghost" type="button" onClick={onClear} disabled={!ready}>{language === 'vi' ? 'Xóa nguồn' : 'Clear'}</button>
      </div>
      {!hasApiKey ? <div className="module-assist-warning">{language === 'vi' ? 'Chưa có API Key: vẫn tải/dán được tài liệu, nhưng cần vào Cài đặt API để AI xử lý.' : 'No API key: you can upload/paste documents, but AI processing requires API settings.'}</div> : null}
    </section>
  );
}

function DraftForm({ language, draft, setDraft, actionLabel, onSubmit, fields = ['title', 'owner', 'date', 'note'], labels = {} }) {
  const defaultLabels = {
    title: language === 'vi' ? 'Tiêu đề' : 'Title',
    owner: language === 'vi' ? 'Người phụ trách / loại hồ sơ' : 'Owner / category',
    date: language === 'vi' ? 'Ngày / hạn' : 'Date / due',
    note: language === 'vi' ? 'Ghi chú / kết luận' : 'Notes / conclusion',
    link: language === 'vi' ? 'Link minh chứng' : 'Evidence link',
  };
  const mergedLabels = { ...defaultLabels, ...labels };
  return (
    <div className="department-draft-form">
      {fields.includes('title') && <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={mergedLabels.title} />}
      {fields.includes('owner') && <input value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder={mergedLabels.owner} />}
      {fields.includes('date') && <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} aria-label={mergedLabels.date} />}
      {fields.includes('link') && <input value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} placeholder={mergedLabels.link} />}
      {fields.includes('note') && <textarea value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder={mergedLabels.note} />}
      <button className="primary" onClick={onSubmit}>{actionLabel}</button>
    </div>
  );
}

function PlansPanel({ data, language, draft, setDraft, addPlan, updateStatus, removeItem }) {
  return (
    <div className="department-list-panel">
      <h2>{language === 'vi' ? 'Kế hoạch chuyên môn' : 'Professional plans'}</h2>
      <DraftForm language={language} draft={draft} setDraft={setDraft} actionLabel={language === 'vi' ? 'Thêm kế hoạch' : 'Add plan'} onSubmit={addPlan} />
      <div className="department-item-list">
        {data.plans.map((plan) => <DepartmentItem key={plan.id} title={plan.title} meta={`${plan.type} · ${plan.owner} · ${formatDate(plan.deadline)}`} note={plan.note} status={plan.status} overdue={isOverdue(plan)} onStatus={(status) => updateStatus('plans', plan.id, status)} onRemove={() => removeItem('plans', plan.id)} language={language} />)}
      </div>
    </div>
  );
}

function MeetingsPanel({ data, language, draft, setDraft, addMeeting, addAutoMeetingAgenda, removeItem }) {
  return (
    <div className="department-list-panel">
      <h2>{language === 'vi' ? 'Sinh hoạt tổ chuyên môn' : 'Department meetings'}</h2>
      <div className="department-smart-action">
        <div>
          <strong>{language === 'vi' ? 'Tạo agenda thông minh' : 'Smart agenda builder'}</strong>
          <span>{language === 'vi' ? 'Tự lấy việc quá hạn, việc 14 ngày tới và hồ sơ chờ duyệt để tạo nội dung họp.' : 'Build an agenda from overdue work, upcoming deadlines and pending submissions.'}</span>
        </div>
        <button className="secondary" onClick={addAutoMeetingAgenda}>{language === 'vi' ? 'Tạo agenda tự động' : 'Auto-create agenda'}</button>
      </div>
      <DraftForm language={language} draft={draft} setDraft={setDraft} actionLabel={language === 'vi' ? 'Thêm biên bản' : 'Add minutes'} onSubmit={addMeeting} />
      <div className="department-item-list">
        {data.meetings.map((meeting) => <DepartmentItem key={meeting.id} title={meeting.title} meta={`${meeting.type} · ${meeting.chair} · ${formatDate(meeting.date)}`} note={meeting.conclusion} onRemove={() => removeItem('meetings', meeting.id)} language={language} />)}
      </div>
    </div>
  );
}


function WorkScheduleImportCard({
  language,
  hasApiKey,
  importWeekStart,
  setImportWeekStart,
  importFileName,
  importItems,
  importSummary,
  importWarnings,
  importBusy,
  importInputRef,
  onImportFile,
  onAnalyzeAgain,
  onUpdateImportItem,
  onRemoveImportItem,
  onSelectAllImportItems,
  onClearImport,
  onAddImportedSchedules,
}) {
  const selectedCount = importItems.filter((item) => item.selected).length;
  const weekEnd = addIsoDays(importWeekStart || weekStartIso(today()), 6);
  const allSelected = importItems.length > 0 && selectedCount === importItems.length;

  return (
    <section className="department-schedule-import-card">
      <div className="department-schedule-import-head">
        <div className="department-schedule-import-title">
          <span className="department-schedule-import-icon">✨</span>
          <div>
            <span className="eyebrow">{language === 'vi' ? 'AI đọc lịch từ file' : 'AI file-to-schedule'}</span>
            <h3>{language === 'vi' ? 'Nhận diện và thêm hàng loạt vào lịch làm việc tuần' : 'Extract and bulk-add the weekly work schedule'}</h3>
            <p>{language === 'vi'
              ? 'Tải PDF, DOCX, TXT, MD, CSV hoặc HTML. AI sẽ đọc ngày, giờ, người phụ trách, địa điểm, loại công việc và nội dung chuẩn bị.'
              : 'Upload PDF, DOCX, TXT, MD, CSV or HTML. AI extracts dates, times, owners, locations, work types and preparation notes.'}</p>
          </div>
        </div>
        <span className={`department-schedule-ai-status ${hasApiKey ? 'ready' : 'missing'}`}>
          {hasApiKey ? (language === 'vi' ? 'AI sẵn sàng' : 'AI ready') : (language === 'vi' ? 'Chưa có API key' : 'API key missing')}
        </span>
      </div>

      <div className="department-schedule-import-controls">
        <label className="department-schedule-week-field">
          <span>{language === 'vi' ? 'Tuần mục tiêu' : 'Target week'}</span>
          <input
            type="date"
            value={importWeekStart || weekStartIso(today())}
            onChange={(event) => setImportWeekStart(weekStartIso(event.target.value))}
          />
          <small>{formatDate(importWeekStart)} – {formatDate(weekEnd)}</small>
        </label>

        <input
          ref={importInputRef}
          type="file"
          accept=".pdf,.docx,.txt,.md,.csv,.html,.htm,text/plain,text/csv,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
          hidden
          onChange={onImportFile}
        />
        <button className="primary department-schedule-upload-btn" type="button" disabled={importBusy} onClick={() => importInputRef?.current?.click?.()}>
          {importBusy ? (language === 'vi' ? 'AI đang đọc file...' : 'AI is reading...') : (language === 'vi' ? 'Tải file & tự nhận diện' : 'Upload & auto-detect')}
        </button>
        {importFileName ? <span className="department-schedule-file-chip" title={importFileName}>📎 {importFileName}</span> : null}
        {importFileName ? <button className="secondary" type="button" disabled={importBusy} onClick={onAnalyzeAgain}>{language === 'vi' ? 'Phân tích lại' : 'Analyze again'}</button> : null}
        {importFileName || importItems.length ? <button className="ghost danger" type="button" disabled={importBusy} onClick={onClearImport}>{language === 'vi' ? 'Xóa bản nhập' : 'Clear import'}</button> : null}
      </div>

      {!hasApiKey ? (
        <div className="department-schedule-key-warning">
          <span>🔑</span>
          <div>
            <strong>{language === 'vi' ? 'Cần cấu hình AI Provider' : 'AI Provider setup required'}</strong>
            <p>{language === 'vi' ? 'AI sử dụng OpenRouter Gateway phía máy chủ. Mở Cài đặt → Kiểm tra kết nối nếu AI chưa sẵn sàng.' : 'Open Settings → AI Provider Hub, save an API key, then upload the file again.'}</p>
          </div>
          <button className="secondary" type="button" onClick={() => { window.location.hash = '#/settings'; }}>{language === 'vi' ? 'Mở Cài đặt' : 'Open Settings'}</button>
        </div>
      ) : null}

      {importBusy ? (
        <div className="department-schedule-import-progress" role="status" aria-live="polite">
          <span className="department-schedule-progress-orbit" aria-hidden="true" />
          <div>
            <strong>{language === 'vi' ? 'AI đang đọc và chuẩn hóa lịch làm việc' : 'AI is extracting and normalizing the schedule'}</strong>
            <p>{language === 'vi' ? 'Hệ thống đang đối chiếu ngày, thứ, giờ, người phụ trách và loại công việc trong tài liệu.' : 'The system is resolving dates, weekdays, times, owners and work categories.'}</p>
          </div>
        </div>
      ) : null}

      {importSummary || importWarnings.length ? (
        <div className="department-schedule-import-insight">
          {importSummary ? <p><strong>{language === 'vi' ? 'AI tóm tắt:' : 'AI summary:'}</strong> {importSummary}</p> : null}
          {importWarnings.length ? (
            <div>
              <strong>{language === 'vi' ? 'Cần kiểm tra:' : 'Review notes:'}</strong>
              <ul>{importWarnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}</ul>
            </div>
          ) : null}
        </div>
      ) : null}

      {importItems.length ? (
        <div className="department-schedule-preview">
          <div className="department-schedule-preview-toolbar">
            <div>
              <strong>{language === 'vi' ? `${importItems.length} mục được nhận diện` : `${importItems.length} extracted items`}</strong>
              <span>{language === 'vi' ? `${selectedCount} mục đang được chọn để thêm` : `${selectedCount} selected for import`}</span>
            </div>
            <div className="department-schedule-preview-actions">
              <button className="secondary" type="button" onClick={() => onSelectAllImportItems(!allSelected)}>
                {allSelected ? (language === 'vi' ? 'Bỏ chọn tất cả' : 'Deselect all') : (language === 'vi' ? 'Chọn tất cả' : 'Select all')}
              </button>
              <button className="primary" type="button" disabled={!selectedCount} onClick={onAddImportedSchedules}>
                {language === 'vi' ? `Thêm ${selectedCount} mục vào lịch tuần` : `Add ${selectedCount} items to weekly schedule`}
              </button>
            </div>
          </div>

          <div className="department-schedule-preview-list">
            {importItems.map((item, index) => (
              <article key={item.id} className={`department-schedule-preview-item tone-${String(index % 4)}`}>
                <div className="department-schedule-preview-select">
                  <input
                    type="checkbox"
                    checked={Boolean(item.selected)}
                    onChange={(event) => onUpdateImportItem(item.id, { selected: event.target.checked })}
                    aria-label={language === 'vi' ? `Chọn ${item.title}` : `Select ${item.title}`}
                  />
                  <span>{index + 1}</span>
                </div>
                <div className="department-schedule-preview-fields">
                  <input
                    className="department-schedule-preview-title"
                    value={item.title}
                    onChange={(event) => onUpdateImportItem(item.id, { title: event.target.value })}
                    placeholder={language === 'vi' ? 'Nội dung công việc' : 'Work item'}
                  />
                  <div className="department-schedule-preview-grid">
                    <label><span>{language === 'vi' ? 'Ngày' : 'Date'}</span><input type="date" value={item.date} onChange={(event) => onUpdateImportItem(item.id, { date: event.target.value })} /></label>
                    <label><span>{language === 'vi' ? 'Bắt đầu' : 'Start'}</span><input type="time" value={item.startTime} onChange={(event) => onUpdateImportItem(item.id, { startTime: event.target.value })} /></label>
                    <label><span>{language === 'vi' ? 'Kết thúc' : 'End'}</span><input type="time" value={item.endTime} onChange={(event) => onUpdateImportItem(item.id, { endTime: event.target.value })} /></label>
                    <label><span>{language === 'vi' ? 'Loại' : 'Type'}</span><select value={item.type} onChange={(event) => onUpdateImportItem(item.id, { type: event.target.value })}>{WORK_SCHEDULE_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}</select></label>
                    <label className="wide"><span>{language === 'vi' ? 'Người phụ trách / thành phần' : 'Owner / participants'}</span><input value={item.owner} onChange={(event) => onUpdateImportItem(item.id, { owner: event.target.value })} /></label>
                    <label className="wide"><span>{language === 'vi' ? 'Địa điểm / link' : 'Location / link'}</span><input value={item.location} onChange={(event) => onUpdateImportItem(item.id, { location: event.target.value })} /></label>
                    <label className="full"><span>{language === 'vi' ? 'Chuẩn bị / minh chứng / ghi chú' : 'Preparation / evidence / notes'}</span><textarea value={item.note} onChange={(event) => onUpdateImportItem(item.id, { note: event.target.value })} /></label>
                  </div>
                </div>
                <div className="department-schedule-preview-meta">
                  {item.confidence !== null ? <span className={item.confidence >= 0.75 ? 'high' : item.confidence >= 0.5 ? 'medium' : 'low'}>{Math.round(item.confidence * 100)}% AI</span> : null}
                  <button className="ghost danger" type="button" onClick={() => onRemoveImportItem(item.id)} aria-label={language === 'vi' ? 'Xóa mục' : 'Remove item'}>×</button>
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : null}
    </section>
  );
}

function WorkSchedulePanel({
  data,
  language,
  draft,
  setDraft,
  addSchedule,
  updateStatus,
  removeItem,
  onExportCalendar,
  canManage = true,
  hasApiKey,
  importWeekStart,
  setImportWeekStart,
  importFileName,
  importItems,
  importSummary,
  importWarnings,
  importBusy,
  importInputRef,
  onImportFile,
  onAnalyzeAgain,
  onUpdateImportItem,
  onRemoveImportItem,
  onSelectAllImportItems,
  onClearImport,
  onAddImportedSchedules,
}) {
  const schedules = toArray(data.workSchedules).sort((a, b) => String(a.date || '').localeCompare(String(b.date || '')) || String(a.startTime || '').localeCompare(String(b.startTime || '')));
  return (
    <div className="department-list-panel work-schedule-panel">
      <div className="department-section-heading-row">
        <div>
          <h2>{language === 'vi' ? 'Lịch làm việc tổ chuyên môn' : 'Department work schedule'}</h2>
          <p className="muted-line">{canManage ? (language === 'vi' ? 'TTCM thêm lịch họp, dự giờ, hạn nộp hồ sơ, chuyên đề, kiểm tra đánh giá hoặc việc cá nhân của tổ để dashboard tổng hợp đúng.' : 'Add meetings, observations, submission deadlines, workshops, assessment work or department tasks for accurate dashboard tracking.') : (language === 'vi' ? 'Giáo viên được xem lịch làm việc chung của tổ chuyên môn. Chỉ TTCM/Admin được thêm, sửa hoặc xoá lịch.' : 'Teachers can view the shared department schedule. Only leaders/admins can add, edit or remove schedules.')}</p>
        </div>
        <button className="secondary" onClick={onExportCalendar}>{language === 'vi' ? 'Xuất lịch .ics' : 'Export .ics'}</button>
      </div>
      {canManage ? (
        <WorkScheduleImportCard
          language={language}
          hasApiKey={hasApiKey}
          importWeekStart={importWeekStart}
          setImportWeekStart={setImportWeekStart}
          importFileName={importFileName}
          importItems={importItems}
          importSummary={importSummary}
          importWarnings={importWarnings}
          importBusy={importBusy}
          importInputRef={importInputRef}
          onImportFile={onImportFile}
          onAnalyzeAgain={onAnalyzeAgain}
          onUpdateImportItem={onUpdateImportItem}
          onRemoveImportItem={onRemoveImportItem}
          onSelectAllImportItems={onSelectAllImportItems}
          onClearImport={onClearImport}
          onAddImportedSchedules={onAddImportedSchedules}
        />
      ) : null}
      {canManage ? (
      <div className="department-draft-form work-schedule-form">
        <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={language === 'vi' ? 'Nội dung lịch, ví dụ: Họp tổ rà soát đề giữa kỳ' : 'Schedule title'} />
        <input value={draft.owner} onChange={(e) => setDraft({ ...draft, owner: e.target.value })} placeholder={language === 'vi' ? 'Người phụ trách / thành phần' : 'Owner / participants'} />
        <input type="date" value={draft.date} onChange={(e) => setDraft({ ...draft, date: e.target.value })} />
        <input type="time" value={draft.startTime} onChange={(e) => setDraft({ ...draft, startTime: e.target.value })} aria-label={language === 'vi' ? 'Giờ bắt đầu' : 'Start time'} />
        <input type="time" value={draft.endTime} onChange={(e) => setDraft({ ...draft, endTime: e.target.value })} aria-label={language === 'vi' ? 'Giờ kết thúc' : 'End time'} />
        <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
          {WORK_SCHEDULE_TYPES.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <input value={draft.location} onChange={(e) => setDraft({ ...draft, location: e.target.value })} placeholder={language === 'vi' ? 'Địa điểm / phòng / link họp' : 'Location / room / meeting link'} />
        <select value={draft.status} onChange={(e) => setDraft({ ...draft, status: e.target.value })}>
          {STATUS_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
        </select>
        <textarea value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder={language === 'vi' ? 'Ghi chú, chuẩn bị, minh chứng cần có...' : 'Notes, preparation, required evidence...'} />
        <button className="primary" onClick={addSchedule}>{language === 'vi' ? 'Thêm lịch làm việc' : 'Add schedule'}</button>
      </div>
      ) : null}
      <div className="department-item-list">
        {schedules.length === 0 ? <div className="empty-state-card">{language === 'vi' ? 'Chưa có lịch làm việc. Khi TTCM thêm lịch, dashboard và file .ics sẽ tự cập nhật.' : 'No work schedule yet. When leaders add entries, dashboard and .ics export will update.'}</div> : null}
        {schedules.map((item) => {
          const timeText = item.startTime ? `${item.startTime}${item.endTime ? `-${item.endTime}` : ''}` : (language === 'vi' ? 'Cả ngày' : 'All day');
          return <DepartmentItem key={item.id} className={getWorkScheduleClass(item)} title={item.title} meta={`${item.type || 'Lịch làm việc'} · ${item.owner || ''} · ${formatDate(item.date)} · ${timeText}${item.location ? ` · ${item.location}` : ''}`} note={item.note} status={item.status} overdue={isOverdue(item)} onStatus={canManage ? (status) => updateStatus('workSchedules', item.id, status) : null} onRemove={canManage ? () => removeItem('workSchedules', item.id) : null} language={language} canManage={canManage} />;
        })}
      </div>
    </div>
  );
}


function FeatureLabPanel({ language, data, draft, setDraft, addFeatureSuggestion, addCustomFeature, updateStatus, removeItem, setActiveTab }) {
  const roadmap = toArray(data.featureRoadmap);
  return (
    <div className="department-list-panel feature-lab-panel">
      <div className="department-section-heading-row">
        <div>
          <h2>{language === 'vi' ? 'Đề xuất cập nhật tính năng Tổ chuyên môn' : 'Department feature update proposals'}</h2>
          <p className="muted-line">{language === 'vi'
            ? 'Các đề xuất được sắp xếp theo mức tác động với quy trình TTCM: điều hành, hồ sơ, sinh hoạt tổ, kiểm tra đánh giá và trải nghiệm toàn hệ thống.'
            : 'Feature ideas are organized by impact on department-leader workflows: operations, evidence, meetings, assessment and global UX.'}</p>
        </div>
        <button className="secondary" onClick={() => setActiveTab('aiCopilot')}>{language === 'vi' ? 'Nhờ AI viết lộ trình' : 'Ask AI for roadmap'}</button>
      </div>

      <div className="feature-suggestion-grid">
        {DEPARTMENT_FEATURE_SUGGESTIONS.map((item) => {
          const exists = roadmap.some((roadmapItem) => roadmapItem.sourceId === item.id || roadmapItem.title === (language === 'vi' ? item.titleVi : item.title));
          return (
            <article key={item.id} className="feature-suggestion-card">
              <div className="feature-suggestion-icon">{item.icon}</div>
              <div className="feature-suggestion-body">
                <span className="feature-category">{language === 'vi' ? item.categoryVi : item.category}</span>
                <h3>{language === 'vi' ? item.titleVi : item.title}</h3>
                <p>{language === 'vi' ? item.descVi : item.desc}</p>
                <div className="feature-tags">
                  <span>{language === 'vi' ? `Ưu tiên: ${item.priorityVi}` : `Priority: ${item.priority}`}</span>
                  <span>{language === 'vi' ? `Độ khó: ${item.effortVi}` : `Effort: ${item.effort}`}</span>
                </div>
                <small>{language === 'vi' ? item.impactVi : item.impact}</small>
                <button className={exists ? 'secondary' : 'primary'} onClick={() => addFeatureSuggestion(item)} disabled={exists}>
                  {exists ? (language === 'vi' ? 'Đã có trong lộ trình' : 'Already added') : (language === 'vi' ? 'Thêm vào lộ trình' : 'Add to roadmap')}
                </button>
              </div>
            </article>
          );
        })}
      </div>

      <div className="department-smart-action feature-lab-custom">
        <div>
          <strong>{language === 'vi' ? 'Thêm đề xuất riêng của trường/tổ' : 'Add a custom school/department idea'}</strong>
          <span>{language === 'vi' ? 'Dùng để ghi nhận các nâng cấp bạn muốn phát triển tiếp trong app.' : 'Use this to record improvements you want to build next in the app.'}</span>
        </div>
      </div>
      <DraftForm
        language={language}
        draft={draft}
        setDraft={setDraft}
        actionLabel={language === 'vi' ? 'Thêm đề xuất' : 'Add idea'}
        onSubmit={addCustomFeature}
        fields={['title', 'owner', 'date', 'link', 'note']}
        labels={{
          title: language === 'vi' ? 'Tên đề xuất nâng cấp' : 'Feature idea title',
          owner: language === 'vi' ? 'Người phụ trách / nhóm đề xuất' : 'Owner / proposer',
          date: language === 'vi' ? 'Ngày dự kiến' : 'Target date',
          link: language === 'vi' ? 'Nhóm tính năng / module' : 'Feature category / module',
          note: language === 'vi' ? 'Mô tả, lý do cần nâng cấp, yêu cầu cụ thể...' : 'Description, reason and requirements...',
        }}
      />

      <div className="department-section-heading-row compact">
        <div>
          <h3>{language === 'vi' ? 'Lộ trình đã chọn' : 'Selected roadmap'}</h3>
          <p className="muted-line">{language === 'vi' ? 'Đổi trạng thái để theo dõi từ đề xuất → đang thực hiện → hoàn thành.' : 'Change status to track ideas from proposal to completion.'}</p>
        </div>
        <span className="submission-status-pill">{roadmap.length} {language === 'vi' ? 'đề xuất' : 'ideas'}</span>
      </div>
      <div className="department-item-list">
        {roadmap.length === 0 ? <div className="empty-state-card">{language === 'vi' ? 'Chưa có đề xuất nào trong lộ trình. Hãy chọn các thẻ phía trên hoặc thêm đề xuất riêng.' : 'No roadmap ideas yet. Choose cards above or add a custom idea.'}</div> : null}
        {roadmap.map((item) => (
          <DepartmentItem
            key={item.id}
            title={item.title}
            meta={`${item.category || (language === 'vi' ? 'Nâng cấp' : 'Feature')} · ${item.owner || 'TTCM'} · ${formatDate(item.date)} · ${item.priority || ''}${item.effort ? ` · ${item.effort}` : ''}`}
            note={item.note || item.impact}
            status={item.status}
            onStatus={(status) => updateStatus('featureRoadmap', item.id, status)}
            onRemove={() => removeItem('featureRoadmap', item.id)}
            language={language}
          />
        ))}
      </div>
    </div>
  );
}

function TasksPanel({ data, language, draft, setDraft, addTask, updateStatus, removeItem }) {
  return (
    <div className="department-list-panel">
      <h2>{language === 'vi' ? 'Phân công nhiệm vụ' : 'Task assignment'}</h2>
      <DraftForm language={language} draft={draft} setDraft={setDraft} actionLabel={language === 'vi' ? 'Thêm nhiệm vụ' : 'Add task'} onSubmit={addTask} fields={['title', 'owner', 'date', 'link', 'note']} />
      <div className="department-item-list">
        {data.tasks.map((task) => <DepartmentItem key={task.id} title={task.title} meta={`${task.owner} · ${formatDate(task.due)} · ${task.priority}`} note={task.evidence || task.note} status={task.status} overdue={isOverdue(task)} onStatus={(status) => updateStatus('tasks', task.id, status)} onRemove={() => removeItem('tasks', task.id)} language={language} />)}
      </div>
    </div>
  );
}

function DocumentsPanel({ data, language, draft, setDraft, addDocument, removeItem }) {
  return (
    <div className="department-list-panel">
      <h2>{language === 'vi' ? 'Hồ sơ tổ & minh chứng' : 'Department records and evidence'}</h2>
      <div className="policy-pin-box">
        <strong>{language === 'vi' ? 'Văn bản nên ghim' : 'Recommended pinned policies'}</strong>
        <div>{POLICY_PINS.map((item) => <span key={item}>{item}</span>)}</div>
      </div>
      <DraftForm language={language} draft={draft} setDraft={setDraft} actionLabel={language === 'vi' ? 'Thêm hồ sơ' : 'Add record'} onSubmit={addDocument} fields={['title', 'owner', 'link', 'note']} />
      <div className="department-item-list">
        {data.documents.map((doc) => <DepartmentItem key={doc.id} title={doc.title} meta={doc.category} note={doc.link || doc.note} onRemove={() => removeItem('documents', doc.id)} language={language} />)}
      </div>
    </div>
  );
}

function SubmissionsPanel({
  language,
  canPublish,
  currentUser,
  submissions,
  submissionRequests,
  requestDraft,
  setRequestDraft,
  draft,
  setDraft,
  createSubmissionRequest,
  toggleSubmissionRequest,
  submitEvidence,
  reviewSubmission,
  archiveSubmission,
  cancelSubmission,
  busy,
}) {
  const [filter, setFilter] = useState(canPublish ? 'pending' : 'all');
  const requestById = useMemo(() => new Map(toArray(submissionRequests).map((item) => [item.id, item])), [submissionRequests]);
  const openRequests = toArray(submissionRequests).filter((item) => item.status === 'open');
  const closedRequests = toArray(submissionRequests).filter((item) => item.status !== 'open');
  const mine = submissions.filter((item) => item.submitter_id === currentUser?.id);
  const mineRequestIds = new Set(mine.map((item) => item.request_id).filter(Boolean));
  const unsubmittedRequests = openRequests.filter((item) => !mineRequestIds.has(item.id));
  const pending = submissions.filter((item) => item.status === 'pending');
  const archived = submissions.filter((item) => item.archived_at);
  const archiveFolders = useMemo(() => getArchiveFolders(submissions), [submissions]);
  const [archiveFolder, setArchiveFolder] = useState('all');
  const visible = submissions.filter((item) => {
    if (!canPublish && item.submitter_id !== currentUser?.id) return false;
    if (filter === 'mine') return item.submitter_id === currentUser?.id;
    if (filter === 'pending') return item.status === 'pending';
    if (filter === 'approved') return item.status === 'approved';
    if (filter === 'rejected') return item.status === 'rejected';
    if (filter === 'cancelled') return item.status === 'cancelled';
    if (filter === 'requested') return Boolean(item.request_id);
    if (filter === 'archived') {
      if (!item.archived_at) return false;
      if (archiveFolder !== 'all' && (item.archive_folder || makeSubmissionArchiveFolder(item)) !== archiveFolder) return false;
      return true;
    }
    return true;
  });
  const sortedVisible = filter === 'archived'
    ? [...visible].sort((a, b) => new Date(b.archived_at || 0) - new Date(a.archived_at || 0))
    : visible;
  const fileName = draft.file?.name || '';
  const requestFileName = requestDraft.file?.name || '';
  const selectedRequest = requestById.get(draft.requestId);
  const canSubmit = !canPublish && openRequests.length > 0 && Boolean(draft.requestId) && Boolean(draft.title.trim());

  const pickRequest = (requestId) => {
    const request = requestById.get(requestId);
    setDraft({
      ...draft,
      requestId,
      category: request?.category || draft.category || 'Báo cáo',
      relatedTask: request?.title || draft.relatedTask || '',
      title: draft.title || request?.title || '',
    });
  };

  return (
    <div className="department-list-panel submissions-panel">
      <div className="department-section-heading-row">
        <div>
          <h2>{language === 'vi' ? 'Thông báo & nộp nội dung' : 'Notices & submissions'}</h2>
          <p className="muted-line">{canPublish
            ? (language === 'vi' ? 'TTCM gửi thông báo/yêu cầu nộp trước; giáo viên chỉ được nộp báo cáo, kế hoạch, văn bản hoặc nhiệm vụ theo thông báo đang mở.' : 'Leaders send a submission request first; teachers can only submit reports, plans, documents or tasks against an open request.')
            : (language === 'vi' ? 'Bạn chỉ nộp được khi TTCM có thông báo/yêu cầu đang mở. Bạn chỉ xem được nội dung mình gửi lên.' : 'You can submit only when there is an open leader request. You can only view your own submissions.')}</p>
        </div>
        <div className="department-submission-scope">
          <span>{canPublish ? (language === 'vi' ? 'Chế độ TTCM' : 'Leader mode') : (language === 'vi' ? 'Chế độ giáo viên' : 'Teacher mode')}</span>
          <strong>{canPublish ? `${pending.length} ${language === 'vi' ? 'chờ duyệt' : 'pending'}` : `${unsubmittedRequests.length} ${language === 'vi' ? 'thông báo cần nộp' : 'open requests'}`}</strong>
          {canPublish ? <small>{archived.length} {language === 'vi' ? 'hồ sơ đã lưu kho' : 'archived records'}</small> : null}
        </div>
      </div>

      <section className="department-request-workbench department-request-workbench-v52">
        <div className="department-v52-request-column">
          <div className="department-v52-open-requests-card">
            <div className="department-section-heading-row compact department-v52-subhead">
              <div>
                <h3>{language === 'vi' ? 'Thông báo đang mở' : 'Open submission requests'}</h3>
                <p className="muted-line">{language === 'vi' ? 'Mỗi hồ sơ giáo viên nộp phải gắn với một thông báo đang mở.' : 'Every teacher submission must be attached to an open request.'}</p>
              </div>
              <span className="submission-status-pill">{openRequests.length} {language === 'vi' ? 'đang mở' : 'open'}</span>
            </div>

            <div className="department-request-list department-v52-request-list">
              {openRequests.length === 0 ? <div className="empty-state-card">{language === 'vi' ? 'Chưa có thông báo đang mở. Giáo viên chưa thể nộp nội dung mới.' : 'No open requests. Teachers cannot submit new content yet.'}</div> : null}
              {openRequests.map((request) => <SubmissionRequestCard key={request.id} request={request} language={language} canPublish={canPublish} busy={busy} selected={draft.requestId === request.id} submitted={mineRequestIds.has(request.id)} onPick={() => pickRequest(request.id)} onToggle={() => toggleSubmissionRequest(request)} />)}
              {canPublish && closedRequests.length > 0 ? (
                <details className="department-closed-requests">
                  <summary>{language === 'vi' ? `Thông báo đã đóng (${closedRequests.length})` : `Closed requests (${closedRequests.length})`}</summary>
                  {closedRequests.slice(0, 12).map((request) => <SubmissionRequestCard key={request.id} request={request} language={language} canPublish={canPublish} busy={busy} selected={false} submitted={false} onPick={() => {}} onToggle={() => toggleSubmissionRequest(request)} />)}
                </details>
              ) : null}
            </div>
          </div>

          {canPublish ? (
            <div className="department-v52-form-card">
              <div className="department-v52-form-title">
                <div>
                  <h3>{language === 'vi' ? 'Nộp nội dung yêu cầu' : 'Create a submission request'}</h3>
                  <p>{language === 'vi' ? 'Thiết lập rõ tiêu đề, loại nhiệm vụ, hạn nộp và tệp hướng dẫn trước khi gửi cho giáo viên.' : 'Set a clear title, task type, due date and guidance file before sending it to teachers.'}</p>
                </div>
                <span>01</span>
              </div>

              <div className="department-submission-form request-form enhanced department-v52-request-form">
                <label className="department-v52-field department-v52-span-2">
                  <span>{language === 'vi' ? 'Tiêu đề thông báo' : 'Request title'}</span>
                  <input value={requestDraft.title} onChange={(e) => setRequestDraft({ ...requestDraft, title: e.target.value })} placeholder={language === 'vi' ? 'Ví dụ: Nộp kế hoạch tháng 9' : 'Example: Submit September plan'} />
                </label>

                <label className="department-v52-field">
                  <span>{language === 'vi' ? 'Loại nhiệm vụ' : 'Task type'}</span>
                  <select value={requestDraft.category} onChange={(e) => setRequestDraft({ ...requestDraft, category: e.target.value })}>
                    {SUBMISSION_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
                  </select>
                </label>

                <label className="department-v52-field">
                  <span>{language === 'vi' ? 'Hạn nộp' : 'Due date'}</span>
                  <input type="date" value={requestDraft.dueDate} onChange={(e) => setRequestDraft({ ...requestDraft, dueDate: e.target.value })} />
                </label>

                <label className="department-v52-field">
                  <span>{language === 'vi' ? 'Hình thức gửi' : 'Recipients'}</span>
                  <select value={requestDraft.targetMode} onChange={(e) => setRequestDraft({ ...requestDraft, targetMode: e.target.value })}>
                    <option value="all">{language === 'vi' ? 'Gửi toàn tổ' : 'All teachers'}</option>
                    <option value="selected">{language === 'vi' ? 'Gửi theo email chỉ định' : 'Selected emails'}</option>
                  </select>
                </label>

                <label className="department-v52-field">
                  <span>{language === 'vi' ? 'Tệp đính kèm (tùy chọn)' : 'Attachment (optional)'}</span>
                  <div className="department-v52-file-input">
                    <input key={requestFileName || 'empty-request-upload'} type="file" onChange={(e) => setRequestDraft({ ...requestDraft, file: e.target.files?.[0] || null })} />
                    <small>{requestFileName ? `${formatFileSize(requestDraft.file?.size)} · ${language === 'vi' ? 'Tối đa 50 MB' : 'Max 50 MB'}` : (language === 'vi' ? 'PDF, DOCX, XLSX, PPTX hoặc file minh chứng' : 'PDF, DOCX, XLSX, PPTX or evidence file')}</small>
                  </div>
                </label>

                {requestDraft.targetMode === 'selected' ? (
                  <label className="department-v52-field department-v52-span-2">
                    <span>{language === 'vi' ? 'Email giáo viên nhận thông báo' : 'Teacher emails'}</span>
                    <textarea value={requestDraft.targetEmails} onChange={(e) => setRequestDraft({ ...requestDraft, targetEmails: e.target.value })} placeholder={language === 'vi' ? 'Các email cách nhau bằng dấu phẩy hoặc xuống dòng' : 'Separate emails by comma or new line'} />
                  </label>
                ) : null}

                <label className="department-v52-field department-v52-span-2">
                  <span>{language === 'vi' ? 'Nội dung yêu cầu' : 'Request details'}</span>
                  <textarea value={requestDraft.description} onChange={(e) => setRequestDraft({ ...requestDraft, description: e.target.value })} placeholder={language === 'vi' ? 'Nêu rõ nội dung, tiêu chí, file cần nộp và ghi chú...' : 'Describe requirements, criteria, files to submit and notes...'} />
                  <small className="department-v52-counter">{requestDraft.description?.length || 0}/2000</small>
                </label>

                <button className="primary department-v52-submit-button" onClick={createSubmissionRequest} disabled={busy || !requestDraft.title.trim()}>{busy ? (language === 'vi' ? 'Đang gửi...' : 'Sending...') : (language === 'vi' ? 'Gửi thông báo cho giáo viên' : 'Send request to teachers')}</button>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="department-v52-guidance-column">
          <article className="department-v52-guidance-card tone-mint">
            <div className="department-v52-guidance-title">
              <span>💡</span>
              <h3>{language === 'vi' ? 'Hướng dẫn & gợi ý' : 'Guidance & tips'}</h3>
            </div>
            <ul>
              <li>{language === 'vi' ? 'Rà soát kỹ nội dung trước khi gửi cho giáo viên.' : 'Review the request carefully before sending.'}</li>
              <li>{language === 'vi' ? 'Nêu rõ tiêu chí, file cần nộp và thời hạn hoàn thành.' : 'State criteria, required files and the deadline clearly.'}</li>
              <li>{language === 'vi' ? 'Ưu tiên tài liệu có cấu trúc rõ ràng để dễ theo dõi.' : 'Prefer structured documents that are easy to track.'}</li>
              <li>{language === 'vi' ? 'Sử dụng AI hỗ trợ để soạn thảo nhanh hơn.' : 'Use AI assistance to draft requests faster.'}</li>
            </ul>
          </article>

          <article className="department-v52-guidance-card tone-lilac">
            <div className="department-v52-guidance-title">
              <span>↗</span>
              <h3>{language === 'vi' ? 'Quy trình nộp & duyệt' : 'Submission & review workflow'}</h3>
            </div>
            <ol className="department-v52-workflow-list">
              <li>
                <span>1</span>
                <div><strong>{language === 'vi' ? 'Giáo viên nộp theo thông báo đang mở' : 'Teacher submits to an open request'}</strong><small>{language === 'vi' ? 'Đính kèm file hoặc nhập nội dung.' : 'Attach a file or add notes.'}</small></div>
              </li>
              <li>
                <span>2</span>
                <div><strong>{language === 'vi' ? 'TTCM rà soát & phản hồi' : 'Leader reviews and responds'}</strong><small>{language === 'vi' ? 'Duyệt, yêu cầu chỉnh sửa hoặc trả lại.' : 'Approve, request revision or reject.'}</small></div>
              </li>
              <li>
                <span>3</span>
                <div><strong>{language === 'vi' ? 'Lưu trữ & tổng hợp' : 'Archive and summarize'}</strong><small>{language === 'vi' ? 'Tự động lưu kho theo thư mục đề xuất.' : 'Store approved items in the archive.'}</small></div>
              </li>
            </ol>
          </article>
        </aside>
      </section>

      {!canPublish ? (
        <div className={`department-submission-form enhanced ${openRequests.length === 0 ? 'locked-submission-form' : ''}`}>
          <select value={draft.requestId} onChange={(e) => pickRequest(e.target.value)} disabled={openRequests.length === 0}>
            <option value="">{language === 'vi' ? 'Chọn thông báo TTCM yêu cầu nộp' : 'Select a leader request'}</option>
            {openRequests.map((request) => <option key={request.id} value={request.id}>{request.category} · {request.title}</option>)}
          </select>
          {selectedRequest ? <div className="department-submission-privacy-note strong-notice">{language === 'vi' ? 'Bạn đang nộp theo thông báo:' : 'Submitting for request:'} <b>{selectedRequest.title}</b>{selectedRequest.due_date ? ` · ${language === 'vi' ? 'Hạn' : 'Due'}: ${formatDate(selectedRequest.due_date)}` : ''}</div> : null}
          <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={language === 'vi' ? 'Tên nội dung nộp' : 'Submission title'} disabled={openRequests.length === 0} />
          <select value={draft.category} onChange={(e) => setDraft({ ...draft, category: e.target.value })} disabled={openRequests.length === 0}>
            {SUBMISSION_CATEGORIES.map((category) => <option key={category} value={category}>{category}</option>)}
          </select>
          <input value={draft.relatedTask} onChange={(e) => setDraft({ ...draft, relatedTask: e.target.value })} placeholder={language === 'vi' ? 'Nhiệm vụ/thông báo liên quan' : 'Related task/request'} disabled={openRequests.length === 0} />
          <input value={draft.link} onChange={(e) => setDraft({ ...draft, link: e.target.value })} placeholder={language === 'vi' ? 'Link Google Drive / tài liệu / sản phẩm, nếu có' : 'Drive/document/product link, optional'} disabled={openRequests.length === 0} />
          <label className="department-file-drop">
            <input key={fileName || 'empty-upload'} type="file" disabled={openRequests.length === 0} onChange={(e) => setDraft({ ...draft, file: e.target.files?.[0] || null })} />
            <span>📎</span>
            <strong>{fileName || (language === 'vi' ? 'Chọn tệp tải lên' : 'Choose upload file')}</strong>
            <small>{fileName ? `${formatFileSize(draft.file?.size)} · ${language === 'vi' ? 'Tối đa 50 MB' : 'Max 50 MB'}` : (language === 'vi' ? 'PDF, Word, Excel, ảnh, slide hoặc file minh chứng khác' : 'PDF, Word, Excel, images, slides or other evidence files')}</small>
          </label>
          <textarea value={draft.note} onChange={(e) => setDraft({ ...draft, note: e.target.value })} placeholder={language === 'vi' ? 'Mô tả ngắn / nội dung cần TTCM duyệt' : 'Short note / what the leader should review'} disabled={openRequests.length === 0} />
          <button className="primary" onClick={submitEvidence} disabled={busy || !canSubmit}>{busy ? (language === 'vi' ? 'Đang tải/gửi...' : 'Uploading...') : (language === 'vi' ? 'Tải lên & gửi TTCM duyệt' : 'Upload & submit for review')}</button>
          {openRequests.length === 0 ? <div className="department-submission-privacy-note">{language === 'vi' ? 'TTCM chưa gửi thông báo/yêu cầu nộp, nên giáo viên chưa thể gửi báo cáo/kế hoạch/văn bản/nhiệm vụ mới.' : 'No leader request is open, so teachers cannot submit new reports/plans/documents/tasks.'}</div> : null}
        </div>
      ) : null}

      <div className="department-filter-row">
        {[
          ['all', canPublish ? (language === 'vi' ? 'Tất cả hồ sơ' : 'All submissions') : (language === 'vi' ? 'Hồ sơ của tôi' : 'My submissions')],
          ['requested', language === 'vi' ? 'Theo thông báo' : 'Requested'],
          ['pending', language === 'vi' ? 'Chờ duyệt' : 'Pending'],
          ['approved', language === 'vi' ? 'Đã duyệt' : 'Approved'],
          ['rejected', language === 'vi' ? 'Từ chối' : 'Rejected'],
          ['cancelled', language === 'vi' ? 'Đã hủy' : 'Cancelled'],
          ...(canPublish ? [['archived', language === 'vi' ? 'Kho lưu trữ TTCM' : 'Leader archive'], ['mine', language === 'vi' ? 'Của tôi' : 'Mine']] : []),
        ].map(([key, label]) => <button key={key} className={filter === key ? 'active' : ''} onClick={() => setFilter(key)}>{label}</button>)}
      </div>
      <div className="department-submission-privacy-note">
        {canPublish
          ? (language === 'vi' ? 'TTCM/Admin xem toàn bộ nội dung giáo viên gửi lên. Khi duyệt, hồ sơ được lưu vào Kho lưu trữ TTCM để mở lại file/link sau này.' : 'Leaders/admins can view all submissions. Approved items are saved to the leader archive for later retrieval.')
          : (language === 'vi' ? 'Mọi hồ sơ của bạn phải gắn với thông báo TTCM. Dữ liệu của giáo viên khác được ẩn bằng RLS của Supabase.' : 'Every submission must be linked to a leader request. Other teachers’ data is hidden by Supabase RLS.')}
      </div>
      {canPublish && filter === 'archived' ? <ArchiveFolderToolbar language={language} archiveFolders={archiveFolders} archiveFolder={archiveFolder} setArchiveFolder={setArchiveFolder} archivedCount={archived.length} /> : null}
      <div className="department-item-list">
        {sortedVisible.length === 0 ? <div className="empty-state-card">{filter === 'archived' ? (language === 'vi' ? 'Kho lưu trữ chưa có hồ sơ phù hợp thư mục này.' : 'No archived records in this folder.') : (language === 'vi' ? 'Không có hồ sơ phù hợp bộ lọc.' : 'No submissions match this filter.')}</div> : null}
        {sortedVisible.map((item) => <SubmissionItem key={item.id} item={item} request={requestById.get(item.request_id)} language={language} canPublish={canPublish} currentUser={currentUser} busy={busy} onReview={reviewSubmission} onArchive={archiveSubmission} onCancel={cancelSubmission} />)}
      </div>
    </div>
  );
}


function ArchiveFolderToolbar({ language, archiveFolders, archiveFolder, setArchiveFolder, archivedCount }) {
  return (
    <section className="department-archive-toolbar">
      <div>
        <span className="department-archive-icon">🗂️</span>
        <div>
          <h3>{language === 'vi' ? 'Thư mục lưu trữ hồ sơ TTCM' : 'Leader submission archive folders'}</h3>
          <p>{language === 'vi' ? `Đang lưu ${archivedCount} hồ sơ đã duyệt. Chọn thư mục để lấy lại tài liệu, file tải lên hoặc link minh chứng.` : `${archivedCount} approved records saved. Select a folder to retrieve files or evidence links.`}</p>
        </div>
      </div>
      <select value={archiveFolder} onChange={(e) => setArchiveFolder(e.target.value)}>
        <option value="all">{language === 'vi' ? 'Tất cả thư mục' : 'All folders'}</option>
        {archiveFolders.map((folder) => <option key={folder} value={folder}>{folder}</option>)}
      </select>
    </section>
  );
}

function SubmissionRequestCard({ request, language, canPublish, busy, selected, submitted, onPick, onToggle }) {
  const isOpen = request.status === 'open';
  return (
    <article className={`department-request-card ${isOpen ? 'open' : 'closed'} ${selected ? 'selected' : ''}`}>
      <div>
        <strong>{request.category || 'Báo cáo'} · {request.title}</strong>
        <span>{request.due_date ? `${language === 'vi' ? 'Hạn nộp' : 'Due'}: ${formatDate(request.due_date)} · ` : ''}{request.target_mode === 'selected' ? (language === 'vi' ? 'Gửi riêng' : 'Selected') : (language === 'vi' ? 'Toàn tổ' : 'All teachers')}</span>
        {request.description ? <p>{request.description}</p> : null}
        {request.file_name ? <p className="submission-file-line"><b>{language === 'vi' ? 'Tệp đính kèm:' : 'Attachment:'}</b> {request.file_signed_url ? <a href={request.file_signed_url} target="_blank" rel="noreferrer">{request.file_name}</a> : request.file_name}{request.file_size ? ` · ${formatFileSize(request.file_size)}` : ''}</p> : null}
        {Array.isArray(request.target_emails) && request.target_emails.length > 0 ? <small>{language === 'vi' ? 'Người nhận:' : 'Recipients:'} {request.target_emails.join(', ')}</small> : null}
      </div>
      <div className="department-item-actions">
        <span className="submission-status-pill">{isOpen ? (language === 'vi' ? 'Đang mở' : 'Open') : (language === 'vi' ? 'Đã đóng' : 'Closed')}</span>
        {!canPublish && isOpen ? <button className={selected ? 'primary metro-small-btn' : 'metro-small-btn'} disabled={submitted} onClick={onPick}>{submitted ? (language === 'vi' ? 'Đã nộp' : 'Submitted') : (language === 'vi' ? 'Chọn để nộp' : 'Select')}</button> : null}
        {canPublish ? <button className="metro-small-btn" disabled={busy} onClick={onToggle}>{isOpen ? (language === 'vi' ? 'Đóng' : 'Close') : (language === 'vi' ? 'Mở lại' : 'Reopen')}</button> : null}
      </div>
    </article>
  );
}

function SubmissionItem({ item, request, language, canPublish, currentUser, busy, onReview, onArchive, onCancel }) {
  const statusText = {
    pending: language === 'vi' ? 'Chờ duyệt' : 'Pending',
    approved: language === 'vi' ? 'Đã duyệt' : 'Approved',
    rejected: language === 'vi' ? 'Từ chối' : 'Rejected',
    cancelled: language === 'vi' ? 'Đã hủy' : 'Cancelled',
  }[item.status] || item.status;
  const mine = item.submitter_id === currentUser?.id;
  const fileLabel = item.file_name ? `${item.file_name}${item.file_size ? ` · ${formatFileSize(item.file_size)}` : ''}` : '';
  const archived = Boolean(item.archived_at);
  const archiveFolder = item.archive_folder || makeSubmissionArchiveFolder(item);
  return (
    <article className={`department-item-card submission-card submission-${item.status}`}>
      <div>
        <strong>{item.title}</strong>
        <span>{item.category || 'Minh chứng'} · {item.submitter_name || item.submitter_email || 'Giáo viên'} · {formatDateTime(item.created_at)}</span>
        {(item.request_title || request?.title) ? <p><b>{language === 'vi' ? 'Theo thông báo:' : 'Request:'}</b> {item.request_title || request?.title}</p> : null}
        {item.related_task ? <p><b>{language === 'vi' ? 'Nhiệm vụ:' : 'Task:'}</b> {item.related_task}</p> : null}
        {archived ? <p className="submission-archive-line"><b>{language === 'vi' ? 'Thư mục lưu trữ:' : 'Archive folder:'}</b> {archiveFolder} · {formatDateTime(item.archived_at)}{item.archived_by_email ? ` · ${item.archived_by_email}` : ''}</p> : null}
        <div className="submission-evidence-links">
          {item.link ? <a href={item.link} target="_blank" rel="noreferrer">🔗 {language === 'vi' ? 'Mở link minh chứng' : 'Open evidence link'}</a> : null}
          {item.file_signed_url ? <a href={item.file_signed_url} target="_blank" rel="noreferrer">📎 {language === 'vi' ? 'Mở tệp tải lên' : 'Open uploaded file'}</a> : null}
          {fileLabel ? <small>{fileLabel}</small> : null}
        </div>
        {item.note ? <p>{item.note}</p> : null}
        {item.review_note ? <p><b>{language === 'vi' ? 'Phản hồi:' : 'Review:'}</b> {item.review_note}</p> : null}
        {item.archive_note ? <p><b>{language === 'vi' ? 'Ghi chú lưu kho:' : 'Archive note:'}</b> {item.archive_note}</p> : null}
      </div>
      <div className="department-item-actions">
        <span className="submission-status-pill">{statusText}</span>
        {archived ? <span className="submission-status-pill archive-pill">{language === 'vi' ? 'Đã lưu kho' : 'Archived'}</span> : null}
        {canPublish && item.status === 'pending' ? (
          <>
            <button className="metro-small-btn" disabled={busy} onClick={() => onReview(item, 'approved')}>{language === 'vi' ? 'Duyệt & lưu kho' : 'Approve & archive'}</button>
            <button className="metro-small-btn danger" disabled={busy} onClick={() => onReview(item, 'rejected')}>{language === 'vi' ? 'Từ chối' : 'Reject'}</button>
          </>
        ) : null}
        {canPublish && item.status === 'approved' ? <button className="metro-small-btn" disabled={busy} onClick={() => onArchive(item, 'archive')}>{archived ? (language === 'vi' ? 'Đổi thư mục' : 'Change folder') : (language === 'vi' ? 'Lưu kho' : 'Archive')}</button> : null}
        {canPublish && archived ? <button className="metro-small-btn danger" disabled={busy} onClick={() => onArchive(item, 'unarchive')}>{language === 'vi' ? 'Bỏ lưu kho' : 'Unarchive'}</button> : null}
        {mine && item.status === 'pending' ? <button className="metro-small-btn danger" disabled={busy} onClick={() => onCancel(item)}>{language === 'vi' ? 'Hủy nộp' : 'Cancel'}</button> : null}
      </div>
    </article>
  );
}


function DepartmentNoticeBar({ language, canPublish, stats, health, cloudInfo, notice, upcomingCount = 0, nextSchedule, setActiveTab, onLoadCloud, onSaveCloud, syncBusy }) {
  const message = canPublish
    ? (language === 'vi'
      ? `TTCM có ${notice.openRequests} thông báo đang mở, ${notice.pendingAll} hồ sơ chờ duyệt, ${notice.archivedAll} hồ sơ đã lưu trong ${notice.archiveFolders} thư mục, ${stats.overdue} việc quá hạn, trạng thái: ${health.levelVi}.`
      : `Leader view: ${notice.openRequests} open requests, ${notice.pendingAll} pending submissions, ${notice.archivedAll} archived records in ${notice.archiveFolders} folders, ${stats.overdue} overdue items, status: ${health.level}.`)
    : (language === 'vi'
      ? `Bạn có ${notice.myUnsubmittedRequests} thông báo cần nộp; ${upcomingCount} lịch/công việc tổ sắp tới${nextSchedule?.title ? `: ${nextSchedule.title}` : ''}; đã gửi ${notice.mineTotal} hồ sơ: ${notice.minePending} chờ duyệt, ${notice.mineApproved} đã duyệt, ${notice.mineRejected} cần chỉnh sửa.`
      : `You have ${notice.myUnsubmittedRequests} open requests to submit; ${upcomingCount} upcoming department items${nextSchedule?.title ? `: ${nextSchedule.title}` : ''}; ${notice.mineTotal} submissions: ${notice.minePending} pending, ${notice.mineApproved} approved, ${notice.mineRejected} needs revision.`);
  return (
    <section className={`department-notice-bar ${canPublish ? 'leader' : 'teacher'}`}>
      <div className="department-notice-main">
        <span className="department-notice-icon">{canPublish ? '📣' : '🔔'}</span>
        <div>
          <strong>{canPublish ? (language === 'vi' ? 'Thanh thông báo điều hành tổ' : 'Department notification bar') : (language === 'vi' ? 'Thanh thông báo của giáo viên' : 'Teacher notification bar')}</strong>
          <p>{message}</p>
        </div>
      </div>
      <div className="department-notice-actions">
        <button className="secondary" onClick={() => setActiveTab('submissions')}>{canPublish ? (language === 'vi' ? 'Thông báo / duyệt' : 'Requests / review') : (language === 'vi' ? 'Thông báo cần nộp' : 'Open requests')}</button>
        <button className="secondary" onClick={() => setActiveTab('tasks')}>{language === 'vi' ? 'Việc cần làm' : 'Tasks'}</button>
        <button className="secondary" onClick={onLoadCloud} disabled={syncBusy}>{cloudInfo.available ? (language === 'vi' ? 'Tải cloud mới nhất' : 'Load cloud') : (language === 'vi' ? 'Kiểm tra cloud' : 'Check cloud')}</button>
        {canPublish ? <button className="primary" onClick={onSaveCloud} disabled={syncBusy}>{language === 'vi' ? 'Lưu chính thức' : 'Publish official'}</button> : null}
      </div>
    </section>
  );
}


function DepartmentAIPanel({ language, hasApiKey, aiAction, setAiAction, aiInstruction, setAiInstruction, aiSourceText, setAiSourceText, aiSourceName, setAiSourceName, aiSourceInputRef, handleAiSourceFile, pasteAiSourceFromClipboard, clearAiSourceText, aiOutput, setAiOutput, aiLoading, runDepartmentAI, applyAIOutput, health, adminDocDraft, setAdminDocDraft, adminDocOutput, setAdminDocOutput, composeAdministrativeDocument, polishAdministrativeDocument, saveAdministrativeDocument, downloadAdministrativeDocument }) {
  const selected = DEPARTMENT_AI_ACTIONS.find((item) => item.id === aiAction) || DEPARTMENT_AI_ACTIONS[0];
  const actionTargetLabel = {
    plan: language === 'vi' ? 'Đưa vào Kế hoạch' : 'Add to plans',
    meeting: language === 'vi' ? 'Đưa vào Họp tổ' : 'Add to meetings',
    tasks: language === 'vi' ? 'Tạo nhiệm vụ' : 'Create tasks',
    document: language === 'vi' ? 'Lưu hồ sơ/biểu mẫu' : 'Save record/template',
    assessment: language === 'vi' ? 'Đưa vào Đánh giá' : 'Add to assessment',
    report: language === 'vi' ? 'Đưa vào Báo cáo' : 'Add to reports',
  }[selected.target] || (language === 'vi' ? 'Áp dụng nội dung' : 'Apply output');

  return (
    <div className="department-list-panel department-ai-panel">
      <div className="department-ai-hero">
        <div>
          <span className="eyebrow">AI Copilot</span>
          <h2>{language === 'vi' ? 'AI hỗ trợ TTCM tổ Tiếng Anh' : 'AI for English department leaders'}</h2>
          <p>{language === 'vi'
            ? 'Dùng dữ liệu kế hoạch, họp tổ, nhiệm vụ, minh chứng, hồ sơ chờ duyệt và lịch 14 ngày tới để tạo nội dung hỗ trợ điều hành.'
            : 'Use department plans, meetings, tasks, evidence, pending submissions and upcoming deadlines to generate leadership support.'}</p>
        </div>
        <div className={`department-ai-health ${health.riskScore >= 60 ? 'danger' : health.riskScore >= 28 ? 'warn' : 'ok'}`}>
          <span>{language === 'vi' ? 'Tình trạng hiện tại' : 'Current status'}</span>
          <strong>{language === 'vi' ? health.levelVi : health.level}</strong>
          <small>{language === 'vi' ? `${health.overdue} quá hạn · ${health.pending} chờ duyệt · ${health.openTasks} việc mở` : `${health.overdue} overdue · ${health.pending} pending · ${health.openTasks} open tasks`}</small>
        </div>
      </div>

      {!hasApiKey ? (
        <div className="department-ai-warning">
          {language === 'vi' ? 'OpenRouter Gateway chưa sẵn sàng. Mở Cài đặt → Kiểm tra kết nối.' : 'No API key configured. Open AI Settings before using AI Copilot.'}
        </div>
      ) : null}

      <div className="department-ai-layout">
        <div className="department-ai-actions">
          {DEPARTMENT_AI_ACTIONS.map((action) => (
            <button key={action.id} className={aiAction === action.id ? 'active' : ''} onClick={() => setAiAction(action.id)}>
              <strong>{language === 'vi' ? action.titleVi : action.title}</strong>
              <span>{language === 'vi' ? action.descVi : action.desc}</span>
            </button>
          ))}
        </div>
        <div className="department-ai-workbench">
          <div className="department-ai-source-box metro-panel">
            <div className="department-ai-source-head">
              <div>
                <strong>{language === 'vi' ? 'Nguồn văn bản cho AI TTCM' : 'Source text for AI Copilot'}</strong>
                <p>{language === 'vi' ? 'Tải tệp .txt/.docx/.pdf hoặc dán nội dung biên bản/báo cáo để AI phân tích cùng dữ liệu tổ.' : 'Upload a .txt/.docx/.pdf file or paste meeting/report content for AI to analyze with department data.'}</p>
              </div>
              <span className={String(aiSourceText || '').trim() ? 'status-badge' : 'status-badge warning'}>
                {String(aiSourceText || '').trim() ? (language === 'vi' ? 'ĐÃ CÓ VĂN BẢN' : 'SOURCE READY') : (language === 'vi' ? 'CHƯA CÓ NGUỒN' : 'NO SOURCE')}
              </span>
            </div>
            <input
              ref={aiSourceInputRef}
              type="file"
              accept=".txt,.md,.csv,.json,.html,.htm,.xml,.srt,.vtt,.docx,.pdf,text/*,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleAiSourceFile}
              hidden
            />
            <div className="department-ai-source-actions">
              <button className="secondary" type="button" onClick={() => aiSourceInputRef?.current?.click?.()}>{language === 'vi' ? 'Tải tệp lên' : 'Upload file'}</button>
              <button className="secondary" type="button" onClick={pasteAiSourceFromClipboard}>{language === 'vi' ? 'Dán từ clipboard' : 'Paste from clipboard'}</button>
              <button className="ghost" type="button" onClick={clearAiSourceText} disabled={!aiSourceText}>{language === 'vi' ? 'Xoá nguồn' : 'Clear source'}</button>
            </div>
            {aiSourceName ? <small className="department-ai-source-name">{language === 'vi' ? 'Nguồn:' : 'Source:'} {aiSourceName}</small> : null}
            <textarea
              className="department-ai-source-text"
              value={aiSourceText}
              onChange={(event) => { setAiSourceText(event.target.value); if (!aiSourceName) setAiSourceName(language === 'vi' ? 'Văn bản dán trực tiếp' : 'Direct pasted text'); }}
              placeholder={language === 'vi' ? 'Dán văn bản biên bản, báo cáo, kế hoạch, nhận xét dự giờ, ma trận đề... vào đây.' : 'Paste meeting minutes, reports, plans, observation notes, test matrix, etc. here.'}
            />
          </div>
          <label>
            {language === 'vi' ? 'Yêu cầu thêm cho AI' : 'Extra instruction for AI'}
            <textarea
              value={aiInstruction}
              onChange={(event) => setAiInstruction(event.target.value)}
              placeholder={language === 'vi' ? 'Ví dụ: tập trung vào khối 12, chuẩn bị họp tổ tuần sau, văn phong ngắn gọn...' : 'Example: focus on grade 12, prepare next department meeting, keep it concise...'}
            />
          </label>
          <div className="department-ai-command-row">
            <button className="primary" onClick={runDepartmentAI} disabled={aiLoading || !hasApiKey}>{aiLoading ? (language === 'vi' ? 'AI đang xử lý...' : 'AI working...') : (language === 'vi' ? 'Tạo bằng AI' : 'Generate with AI')}</button>
            <button className="secondary" onClick={() => applyAIOutput(selected.target)} disabled={!aiOutput}>{actionTargetLabel}</button>
            <button className="secondary" onClick={() => applyAIOutput('report')} disabled={!aiOutput}>{language === 'vi' ? 'Lưu vào Báo cáo' : 'Save as report'}</button>
            <button className="secondary" onClick={() => navigator.clipboard?.writeText(aiOutput)} disabled={!aiOutput}>{language === 'vi' ? 'Copy' : 'Copy'}</button>
          </div>
          <textarea className="department-ai-output" value={aiOutput} onChange={(event) => setAiOutput(event.target.value)} placeholder={language === 'vi' ? 'Nội dung AI sẽ hiện ở đây. Có thể chỉnh sửa trước khi đưa vào kế hoạch/họp tổ/nhiệm vụ/hồ sơ.' : 'AI output will appear here. You can edit it before applying.'} />
          <AdminDocumentComposer
            language={language}
            draft={adminDocDraft}
            setDraft={setAdminDocDraft}
            output={adminDocOutput}
            setOutput={setAdminDocOutput}
            aiOutput={aiOutput}
            aiLoading={aiLoading}
            onCompose={composeAdministrativeDocument}
            onPolish={polishAdministrativeDocument}
            onSave={saveAdministrativeDocument}
            onDownload={downloadAdministrativeDocument}
          />
        </div>
      </div>

      <div className="department-ai-quick-apply">
        <button className="metro-small-btn" onClick={() => applyAIOutput('plan')} disabled={!aiOutput}>{language === 'vi' ? 'Lưu như kế hoạch' : 'Save as plan'}</button>
        <button className="metro-small-btn" onClick={() => applyAIOutput('meeting')} disabled={!aiOutput}>{language === 'vi' ? 'Lưu như biên bản' : 'Save as meeting'}</button>
        <button className="metro-small-btn" onClick={() => applyAIOutput('tasks')} disabled={!aiOutput}>{language === 'vi' ? 'Tách thành nhiệm vụ' : 'Extract tasks'}</button>
        <button className="metro-small-btn" onClick={() => applyAIOutput('document')} disabled={!aiOutput}>{language === 'vi' ? 'Lưu như hồ sơ' : 'Save as record'}</button>
        <button className="metro-small-btn" onClick={() => applyAIOutput('assessment')} disabled={!aiOutput}>{language === 'vi' ? 'Lưu vào đánh giá' : 'Save to assessment'}</button>
      </div>
    </div>
  );
}


function AdminDocumentComposer({ language, draft, setDraft, output, setOutput, aiOutput, aiLoading, onCompose, onPolish, onSave, onDownload }) {
  return (
    <section className="admin-document-composer metro-panel">
      <div className="department-section-heading-row compact">
        <div>
          <h3>{language === 'vi' ? 'Soạn văn bản hành chính từ nội dung AI' : 'Draft administrative document from AI content'}</h3>
          <p className="muted-line">{language === 'vi' ? 'Sau khi AI tạo nội dung, chọn loại văn bản để chuyển thành thông báo, kế hoạch, báo cáo, công văn, tờ trình, biên bản… có thể copy, tải DOC hoặc lưu vào hồ sơ tổ.' : 'After AI generates content, convert it into a notice, plan, report, official letter, proposal or minutes; copy, download DOC or save to records.'}</p>
        </div>
        <span className={aiOutput ? 'status-badge' : 'status-badge warning'}>{aiOutput ? (language === 'vi' ? 'CÓ NỘI DUNG AI' : 'AI CONTENT READY') : (language === 'vi' ? 'CHỜ NỘI DUNG AI' : 'WAITING FOR AI CONTENT')}</span>
      </div>
      <div className="admin-document-form">
        <select value={draft.type} onChange={(event) => setDraft({ ...draft, type: event.target.value })}>
          {ADMIN_DOCUMENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
        </select>
        <input value={draft.number} onChange={(event) => setDraft({ ...draft, number: event.target.value })} placeholder={language === 'vi' ? 'Số/ký hiệu, ví dụ: 05/TB-TA' : 'Document number'} />
        <input value={draft.agency} onChange={(event) => setDraft({ ...draft, agency: event.target.value })} placeholder={language === 'vi' ? 'Tên trường/đơn vị' : 'School/agency'} />
        <input value={draft.department} onChange={(event) => setDraft({ ...draft, department: event.target.value })} placeholder={language === 'vi' ? 'Đơn vị ban hành' : 'Issuing unit'} />
        <input value={draft.recipient} onChange={(event) => setDraft({ ...draft, recipient: event.target.value })} placeholder={language === 'vi' ? 'Kính gửi / nơi nhận' : 'Recipient'} />
        <input value={draft.title} onChange={(event) => setDraft({ ...draft, title: event.target.value })} placeholder={language === 'vi' ? 'Tiêu đề văn bản' : 'Document title'} />
        <input value={draft.signer} onChange={(event) => setDraft({ ...draft, signer: event.target.value })} placeholder={language === 'vi' ? 'Người ký' : 'Signer'} />
        <input value={draft.position} onChange={(event) => setDraft({ ...draft, position: event.target.value })} placeholder={language === 'vi' ? 'Chức vụ người ký' : 'Signer position'} />
        <textarea value={draft.legalBasis} onChange={(event) => setDraft({ ...draft, legalBasis: event.target.value })} placeholder={language === 'vi' ? 'Căn cứ pháp lý/căn cứ triển khai nếu có' : 'Legal/implementation basis, optional'} />
      </div>
      <div className="department-ai-command-row">
        <button className="primary" onClick={onCompose}>{language === 'vi' ? 'Soạn từ nội dung AI' : 'Draft from AI content'}</button>
        <button className="secondary" onClick={onPolish} disabled={aiLoading || !output}>{aiLoading ? (language === 'vi' ? 'Đang chuẩn hóa...' : 'Polishing...') : (language === 'vi' ? 'Chuẩn hóa bằng AI' : 'Polish with AI')}</button>
        <button className="secondary" onClick={() => navigator.clipboard?.writeText(output)} disabled={!output}>{language === 'vi' ? 'Copy văn bản' : 'Copy document'}</button>
        <button className="secondary" onClick={() => onDownload('doc')} disabled={!output}>{language === 'vi' ? 'Tải DOC' : 'Download DOC'}</button>
        <button className="secondary" onClick={() => onDownload('txt')} disabled={!output}>{language === 'vi' ? 'Tải TXT' : 'Download TXT'}</button>
        <button className="primary" onClick={onSave} disabled={!output}>{language === 'vi' ? 'Lưu vào hồ sơ tổ' : 'Save to records'}</button>
      </div>
      <textarea className="admin-document-output" value={output} onChange={(event) => setOutput(event.target.value)} placeholder={language === 'vi' ? 'Bản nháp văn bản hành chính sẽ hiện ở đây.' : 'Administrative document draft will appear here.'} />
    </section>
  );
}

function ReportsPanel({ language, report, setReport, reportType, setReportType, buildAIReport, aiLoading, onCopy, onDownload, onExportPortfolio }) {
  return (
    <div className="department-list-panel reports-panel">
      <h2>{language === 'vi' ? 'Báo cáo tự động' : 'Automatic reports'}</h2>
      <div className="report-actions">
        <select value={reportType} onChange={(e) => setReportType(e.target.value)} className="department-report-select">
          <option value="month">{language === 'vi' ? 'Báo cáo tháng' : 'Monthly report'}</option>
          <option value="semester">{language === 'vi' ? 'Báo cáo học kỳ' : 'Semester report'}</option>
          <option value="meeting">{language === 'vi' ? 'Sơ kết sinh hoạt tổ' : 'Meeting summary'}</option>
          <option value="evidence">{language === 'vi' ? 'Báo cáo minh chứng' : 'Evidence report'}</option>
          <option value="assessment">{language === 'vi' ? 'Báo cáo kiểm tra đánh giá' : 'Assessment report'}</option>
        </select>
        <button className="primary" onClick={buildAIReport} disabled={aiLoading}>{aiLoading ? (language === 'vi' ? 'Đang tạo...' : 'Generating...') : (language === 'vi' ? 'Tạo báo cáo AI' : 'Generate AI report')}</button>
        <button className="secondary" onClick={onCopy}>{language === 'vi' ? 'Copy báo cáo' : 'Copy report'}</button>
        <button className="secondary" onClick={onDownload}>{language === 'vi' ? 'Tải TXT' : 'Download TXT'}</button>
        <button className="secondary" onClick={onExportPortfolio}>{language === 'vi' ? 'Xuất hồ sơ HTML' : 'Export portfolio'}</button>
      </div>
      <textarea className="department-report-output" value={report} onChange={(e) => setReport(e.target.value)} />
    </div>
  );
}

function StructuredModulePanel({ module, config, data, language, draft, setDraft, addRecord, updateStatus, removeItem, setActiveTab }) {
  if (!module || !config) return null;
  const items = toArray(data[config.collection]);
  return (
    <div className="department-list-panel">
      <h2>{language === 'vi' ? config.titleVi : config.title}</h2>
      <p className="muted-line">{language === 'vi' ? module.descVi : module.desc}</p>
      <div className="template-mini-grid compact-template-grid">
        {config.quick.map((item) => <div className="template-mini-card" key={item}><strong>{item}</strong><span>{language === 'vi' ? 'Gợi ý triển khai' : 'Implementation idea'}</span></div>)}
      </div>
      <DraftForm
        language={language}
        draft={draft}
        setDraft={setDraft}
        actionLabel={language === 'vi' ? 'Thêm mục' : 'Add record'}
        onSubmit={addRecord}
        fields={['title', 'owner', 'date', 'link', 'note']}
        labels={{ owner: config.ownerLabelVi, date: config.dateLabelVi, note: config.noteLabelVi }}
      />
      <div className="department-item-list">
        {items.length === 0 ? <div className="empty-state-card">{language === 'vi' ? config.emptyVi : 'No records yet.'}</div> : null}
        {items.map((item) => <DepartmentItem key={item.id} title={item.title} meta={`${item.type || config.itemType} · ${item.owner || ''} · ${formatDate(item.date)}`} note={item.link || item.note} status={item.status} overdue={isOverdue(item)} onStatus={(status) => updateStatus(config.collection, item.id, status)} onRemove={() => removeItem(config.collection, item.id)} language={language} />)}
      </div>
      <div className="report-actions">
        <button className="secondary" onClick={() => setActiveTab('tasks')}>{language === 'vi' ? 'Tạo nhiệm vụ liên quan' : 'Create related task'}</button>
        <button className="secondary" onClick={() => setActiveTab('documents')}>{language === 'vi' ? 'Lưu minh chứng' : 'Save evidence'}</button>
      </div>
    </div>
  );
}

function DepartmentItem({ title, meta, note, status, overdue, onStatus, onRemove, language, canManage = true, className = '' }) {
  return (
    <article className={`department-item-card ${className} ${overdue ? 'is-overdue' : ''}`}>
      <div>
        <strong>{title}</strong>
        <span>{meta}</span>
        {overdue ? <em className="department-overdue-badge">{language === 'vi' ? 'Quá hạn' : 'Overdue'}</em> : null}
        {note ? <p>{note}</p> : null}
      </div>
      {canManage ? (
      <div className="department-item-actions">
        {status && onStatus ? <select value={status} onChange={(e) => onStatus(e.target.value)}>{STATUS_OPTIONS.map((option) => <option key={option}>{option}</option>)}</select> : null}
        {onRemove ? <button className="metro-small-btn danger" onClick={onRemove}>{language === 'vi' ? 'Xóa' : 'Remove'}</button> : null}
      </div>
      ) : status ? <span className="status-badge teacher-view-only-badge">{status}</span> : null}
    </article>
  );
}
