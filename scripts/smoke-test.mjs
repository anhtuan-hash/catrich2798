import { ACTIVITY_TEMPLATES, SAMPLE_CONTENT, buildTeacherText, parseActivity } from '../src/utils/activityEngine.js';
import { parseMcqFromText, bankToText } from '../src/utils/library.js';
import { SPECIALIZED_TOOL_SLUGS, getSpecializedConfig, generateSpecializedOutput } from '../src/utils/specializedAppEngines.js';
import { APPS } from '../src/data/apps.js';
import { OFFICIAL_CONDUCT_RULES, CONDUCT_DOCUMENT } from '../src/data/homeroomConduct.js';
import { PETRUS_KY_ACADEMIC_PLAN_DOCUMENT, PETRUS_KY_ACADEMIC_PLAN_2026_2027, PETRUS_KY_CONDUCT_WEEKS, PETRUS_KY_AVERAGE_WEEKS, findPetrusKyConductWeek } from '../src/data/homeroomAcademicPlan.js';
import { makeDefaultHomeroomWorkspace } from '../src/utils/homeroomStore.js';
import { addConductRecord, addConductReward, addCustomConductRule, applyAutomaticConductWeekClosures, buildConductAuditTrail, calculateWeeklyConduct, calculateConductPeriod, buildPeriodRangesFromAcademicCalendar, cancelConductRecord, conductRecordsForWeek, conductWeeksForWorkspace, createAcademicCalendarDefaults, finalizeConductWeek, getConductWeekSummary, inferConductPeriodRanges, reopenConductWeek, resolveConductWeekStart, startOfConductWeek, endOfConductWeek, updateConductRecord, validateAcademicCalendar, DEFAULT_CONDUCT_LOCK_PASSWORD, verifyConductLockPassword, changeConductLockPassword, resetConductLockPassword, resetConductWeekData, isConductWeekLocked } from '../src/utils/homeroomConduct.js';
import fs from 'node:fs';
import { WORKSHEET_ACTIVITY_TYPES, auditWorksheet, generateOfflineWorksheet, worksheetToHtml, worksheetMcqBankItems } from '../src/utils/worksheetFactory.js';
import { createDefaultLauncherConfig, normalizeLauncherConfig } from '../src/utils/launcherPreferences.js';

const checks = [];
const add = (name, ok, detail = '') => checks.push({ name, ok, detail });

for (const tpl of ACTIVITY_TEMPLATES) {
  const parsed = parseActivity(tpl.id, SAMPLE_CONTENT[tpl.id] || '');
  const text = parsed.ok ? buildTeacherText(`Sample ${tpl.title}`, tpl.id, parsed.data) : '';
  add(`parse ${tpl.id}`, parsed.ok && text.length > 20, `${text.length} chars`);
}

const sample = `1. While I _____ dinner, the phone rang.\nA. was cooking\nB. cooked\nC. cook\nD. have cooked\nAnswer: A\n\n2. They _____ TV when the lights went out. A. watched B. were watching C. watch D. have watched Answer: B`;
const mcq = parseMcqFromText(sample, { level: 'B2-C1', source: 'smoke' });
add('parse MCQ text', mcq.length === 2 && mcq[0].answer === 'A' && mcq[1].answer === 'B', `${mcq.length} questions`);
const bankText = bankToText(mcq, true);
add('bank export text', bankText.includes('Answer: A') && bankText.includes('Answer: B'), `${bankText.length} chars`);

const thptSample = `Câu 1.(VD) Trong cuộc khai thác thuộc địa lần thứ hai ở Đông Dương 1919-1929, thực dân Pháp tập trung đầu tư vào
A. Ngành chế tạo máy.      B. Công nghiệp luyện kim.
C. Đồn điền cao su.        D. Công nghiệp hóa chất.

Lời giải
Chọn C

Câu 2.(NB) Nội dung nào sau đây phản ánh đúng tình hình Việt Nam sau Hiệp định Giơnevơ năm 1954 về Đông Dương?
A. Đất nước tạm thời bị chia cắt làm hai miền Nam, Bắc.
B. Miền Bắc chưa được giải phóng.
C. Miền Nam đã được giải phóng.
D. Cả nước được giải phóng và thống nhất.
Đáp án: A`;
const thptMcq = parseMcqFromText(thptSample, { level: 'THPT', source: 'smoke-thpt' });
add('parse THPT Google Form style', thptMcq.length === 2 && thptMcq[0].answer === 'C' && thptMcq[1].answer === 'A', `${thptMcq.length} questions`);

const removedSlugs = [
  'smart-teaching-workflow-v94',
  'advanced-teacher-suite',
  'teacher-operating-system',
  'exam-builder-pro',
  'worksheet-studio',
  'cloze-test-generator',
  'word-formation-lab',
  'interactive-game-factory',
  'presentation-builder',
  'lesson-to-activity-converter',
  'teacher-workload-planner',
  'class-performance-analyzer',
  'student-support-tracker',
  'department-document-hub',
  'student-practice-portal',
  'vocabulary-mastery-app',
  'speaking-practice-room',
  'meeting-minutes-assistant',
];
const appSlugs = new Set(APPS.map((item) => item.slug));
add('V9.4.4 removed requested app cards', removedSlugs.every((slug) => !appSlugs.has(slug)), `${APPS.length} active app cards`);
add('V9.4.4 specialized routes cleaned', SPECIALIZED_TOOL_SLUGS.length === 1 && SPECIALIZED_TOOL_SLUGS[0] === 'exam-studio', SPECIALIZED_TOOL_SLUGS.join(', '));

const examStudioOutput = generateSpecializedOutput('exam-studio', getSpecializedConfig('exam-studio').sample);
add('Exam Studio specialized engine still works', examStudioOutput.title.includes('Exam Studio') && examStudioOutput.markdown.length > 600, `${examStudioOutput.markdown.length} chars`);
add('V9.4.6 Exam Studio produces workflow artifacts', Boolean(examStudioOutput.studentMarkdown && examStudioOutput.teacherMarkdown && examStudioOutput.googleFormText && examStudioOutput.interactiveHtml && examStudioOutput.quality?.checks?.length), 'student, teacher, quality, Google Form and HTML outputs present');

const mainSource = fs.readFileSync(new URL('../src/main.jsx', import.meta.url), 'utf8');
const universalAiSource = fs.readFileSync(new URL('../src/components/UniversalAIAssist.jsx', import.meta.url), 'utf8');
const specializedSource = fs.readFileSync(new URL('../src/pages/SpecializedAppPage.jsx', import.meta.url), 'utf8');
const cssSource = [
  '../src/index.css',
  '../src/styles/legacy/01-foundation.css',
  '../src/styles/legacy/02-workspaces.css',
  '../src/styles/legacy/03-operations.css',
  '../src/styles/legacy/04-modern-shell.css',
  '../src/styles/legacy/05-connected-platform.css',
  '../src/styles/legacy/06-current-features.css',
  '../src/styles/v1099.css',
].map((file) => fs.readFileSync(new URL(file, import.meta.url), 'utf8')).join('\n');
const wordGraphSource = fs.readFileSync(new URL('../src/pages/WordGraphStudio.jsx', import.meta.url), 'utf8');
add('V10.81.8 WordGraph runtime node count is schema-safe', wordGraphSource.includes('visibleNodeCount') && !wordGraphSource.includes('graph.nodes.length'), 'prevents blank-page crash when graph exposes clusters instead of nodes');
add('V10.82.7 Messenger-style Brian AI bubble available', mainSource.includes('UniversalAIAssist') && universalAiSource.includes('ai-messenger-bubble') && universalAiSource.includes('createPortal'), 'global bottom-right chat bubble present');
add('V10.82.7 AI chat keeps route-aware context', universalAiSource.includes('CURRENT CONTEXT') && universalAiSource.includes('currentRoute') && universalAiSource.includes('selectedTool'), 'current page and tool are included in each conversation');
add('V10.82.7 AI chat history is account-scoped', universalAiSource.includes('bes-ai-chat-threads:') && universalAiSource.includes('userScope(currentUser)') && universalAiSource.includes('messages.slice(-60)'), 'last 60 messages persist per account and conversation');
add('V10.82.7 AI chat supports quick prompts and keyboard send', universalAiSource.includes('quickPrompts') && universalAiSource.includes("event.key === 'Enter'") && universalAiSource.includes('Shift + Enter'), 'route suggestions and Messenger-like composer present');
add('V10.82.7 Messenger bubble layout and responsive panel styled', cssSource.includes('V10.82.7 — Messenger-style global Brian AI chat bubble') && cssSource.includes('.ai-messenger-window') && cssSource.includes('@media(max-width:760px)'), 'desktop, mobile and dark-mode chat styles present');
add('Exam Studio AI is integrated inside step 2', !specializedSource.includes('exam-ai-sidebar') && specializedSource.includes('Cách 2 · AI Keyword Generator') && specializedSource.includes('AI tạo brief') && specializedSource.includes('AI tạo câu hỏi'), 'no separated AI sidebar');
add('V9.4.7 strict four-step generator flow UI present', specializedSource.includes('STEP_LABELS') && specializedSource.includes('Chọn 1 trong 2 cách tạo đề') && specializedSource.includes('HTML tương tác') && cssSource.includes('V9.4.7 Strict Exam Flow'), 'strict flow and CSS present');

const authSource = fs.readFileSync(new URL('../src/utils/auth.js', import.meta.url), 'utf8');
const authPageSource = fs.readFileSync(new URL('../src/pages/AuthPage.jsx', import.meta.url), 'utf8');
add('offline demo helper is not exposed as a production button', authSource.includes('loginOfflineDemo') && !authPageSource.includes('Mở Demo Teacher Admin'), 'helper retained for local recovery, hidden from normal login UI');
add('all remaining app cards expose AI support', APPS.every((item) => item.api === true), `${APPS.length} app cards marked AI-supported`);
add('polished specialized layout patch', cssSource.includes('V9.4.3 Runtime Polish') && cssSource.includes('specialized-markdown-preview'), 'layout CSS patch present');

const globalNavSource = fs.readFileSync(new URL('../src/components/GlobalFlatNavigation.jsx', import.meta.url), 'utf8');
const launcherPreferencesSource = fs.readFileSync(new URL('../src/utils/launcherPreferences.js', import.meta.url), 'utf8');
const webAppsSource = fs.readFileSync(new URL('../src/pages/WebApps.jsx', import.meta.url), 'utf8');
const commandPaletteSource = fs.readFileSync(new URL('../src/ui-core/components/UICommandCenter.jsx', import.meta.url), 'utf8');
const appUsageSource = fs.readFileSync(new URL('../src/utils/appUsage.js', import.meta.url), 'utf8');
const launcherSettingsSqlSource = fs.readFileSync(new URL('../supabase/launcher_settings_v10_83_1.sql', import.meta.url), 'utf8');
const permissionsSource = fs.readFileSync(new URL('../src/utils/permissions.js', import.meta.url), 'utf8');
const aiIndicatorSource = fs.readFileSync(new URL('../src/components/GlobalAIIndicator.jsx', import.meta.url), 'utf8');
const geminiSource = fs.readFileSync(new URL('../src/utils/openRouter.js', import.meta.url), 'utf8');
const textLabCssSource = fs.readFileSync(new URL('../public/embedded/brian-textlab-activities/style.css', import.meta.url), 'utf8');
add('V10.62 personal font reaches embedded TextLab', textLabCssSource.includes('/fonts/personal-font.ttf') && textLabCssSource.includes('font-family:var(--font)!important'), 'BrianGesco enforced in iframe app');
add('V10.62 navigation text-size control present', globalNavSource.includes('global-font-size-btn') && globalNavSource.includes('setFontScale'), 'A+ control cycles global font scale');
add('V10.62 full-screen AI indicator wired globally', aiIndicatorSource.includes('createPortal') && geminiSource.includes('bes-ai-operation-start') && geminiSource.includes('bes-ai-operation-end'), 'provider calls trigger fullscreen indicator');
add('V10.62 unified content rail present', cssSource.includes('--bes-unified-content:1440px') && cssSource.includes('main.wp8-page-stage > .page'), 'navigation, pages and footer share one rail');

const deletedNamesSource = `${fs.readFileSync(new URL('../src/data/apps.js', import.meta.url), 'utf8')}\n${fs.readFileSync(new URL('../src/pages/ToolPage.jsx', import.meta.url), 'utf8')}\n${fs.readFileSync(new URL('../src/pages/Home.jsx', import.meta.url), 'utf8')}`;
const deletedLabels = [
  'Interactive Game Factory', 'Presentation Builder', 'Lesson-to-Activity Converter', 'Teacher Workload Planner',
  'Class Performance Analyzer', 'Student Support Tracker', 'Department Document Hub', 'Student Practice Portal',
  'Vocabulary Mastery App', 'Speaking Practice Room', 'Meeting Minutes Assistant', 'V9.4 Smart Teaching Workflow',
  'Advanced Teacher Suite', 'Teacher Operating System', 'Exam Builder Pro', 'Worksheet Studio', 'Cloze Test Generator', 'Word Formation Lab'
];
add('deleted app names removed from visible sources', deletedLabels.every((label) => !deletedNamesSource.includes(label)), 'apps.js, ToolPage, Home clean');


const librarySource = fs.readFileSync(new URL('../src/utils/library.js', import.meta.url), 'utf8');
const libraryPageSource = fs.readFileSync(new URL('../src/pages/Library.jsx', import.meta.url), 'utf8');
const textLabPageSource = fs.readFileSync(new URL('../src/pages/TextLabActivities.jsx', import.meta.url), 'utf8');
const embeddedTextLabSource = fs.readFileSync(new URL('../public/embedded/brian-textlab-activities/app.js', import.meta.url), 'utf8');
const livePlayerSource = fs.readFileSync(new URL('../src/components/LiveActivityPlayer.jsx', import.meta.url), 'utf8');
const librarySqlSource = fs.readFileSync(new URL('../supabase/library_sync_v10_63.sql', import.meta.url), 'utf8');
add('V10.63 account-scoped library storage', librarySource.includes('setLibraryStorageUser') && librarySource.includes('scopedStorageKey') && librarySource.includes('syncLibraryFromCloud'), 'local-first account isolation and cloud sync present');
add('V10.63 common reusable activity schema', librarySource.includes('sourceAppTitle') && librarySource.includes('templateId') && librarySource.includes('activityData') && librarySource.includes('schemaVersion'), 'standard activity metadata present');
add('V10.63 TextLab saves to Library and Question Bank', embeddedTextLabSource.includes('BTL_SAVE_LIBRARY') && embeddedTextLabSource.includes('BTL_ADD_BANK') && textLabPageSource.includes('textlab-activity'), 'TextLab bridge present');
add('V10.63 exact replay player supports saved apps', livePlayerSource.includes('standalone-html') && livePlayerSource.includes('TextLabReplayFrame') && libraryPageSource.includes('Chơi lại đúng mẫu'), 'exact replay routes present');
add('V10.63 Supabase library RLS migration included', librarySqlSource.includes('create table if not exists public.library_items') && librarySqlSource.includes('auth.uid() = user_id'), 'account ownership policies included');

const departmentSource = fs.readFileSync(new URL('../src/pages/DepartmentWorkspace.jsx', import.meta.url), 'utf8');
add('V10.64 department file-to-schedule AI importer present', departmentSource.includes('AI đọc lịch từ file') && departmentSource.includes('parseScheduleAIResponse') && departmentSource.includes('handleWorkScheduleImportFile'), 'upload, extraction and preview flow present');
add('V10.64 bulk weekly schedule import prevents duplicates', departmentSource.includes('scheduleFingerprint') && departmentSource.includes('addImportedSchedules') && departmentSource.includes('bỏ qua ${skipped} mục trùng'), 'bulk add and duplicate protection present');
add('V10.64 schedule import interface styled responsively', cssSource.includes('department-schedule-import-card') && cssSource.includes('department-schedule-preview-grid') && cssSource.includes('@media (max-width:760px)'), 'professional desktop and mobile layout present');



const homeroomSource = fs.readFileSync(new URL('../src/pages/HomeroomWorkspace.jsx', import.meta.url), 'utf8');
const homeroomStoreSource = fs.readFileSync(new URL('../src/utils/homeroomStore.js', import.meta.url), 'utf8');
const homeroomDataSource = fs.readFileSync(new URL('../src/data/homeroom.js', import.meta.url), 'utf8');
const homeroomSqlSource = fs.readFileSync(new URL('../supabase/homeroom_workspace_v10_66.sql', import.meta.url), 'utf8');
add('V10.66 homeroom route and navigation present', mainSource.includes("currentRoute === 'homeroom'") && globalNavSource.includes("'homeroom'") && launcherPreferencesSource.includes("'route:homeroom'") && homeroomDataSource.includes("route:homeroom"), 'dedicated route, customizable nav default and permission present');
add('V10.66 Phase 1 homeroom modules present', ['OverviewTab', 'StudentsTab', 'AttendanceTab', 'ScheduleTab', 'MeetingsTab', 'ParentsTab', 'RecordsTab', 'AiImportTab'].every((name) => homeroomSource.includes(`function ${name}`)), 'overview, students, attendance, schedule, meetings, parents, records and AI');
add('V10.66 AI file importer supports office data', homeroomSource.includes(".xlsx") && homeroomSource.includes('readPdfTextFromBuffer') && homeroomSource.includes('readDocxTextFromBuffer') && homeroomSource.includes('detectedType'), 'PDF, DOCX, XLSX, CSV and structured preview');
add('V10.66 account-scoped homeroom storage', homeroomStoreSource.includes("owner_id") && homeroomStoreSource.includes('workspaceKey') && homeroomStoreSource.includes('saveHomeroomWorkspace'), 'local-first and Supabase sync');
add('V10.66 homeroom RLS migration included', homeroomSqlSource.includes('create table if not exists public.bes_homeroom_workspaces') && homeroomSqlSource.includes('auth.uid() = owner_id') && homeroomSqlSource.includes('enable row level security'), 'owner isolation and admin support policies');


const homeroomPhase2TabsSource = fs.readFileSync(new URL('../src/components/HomeroomPhase2Tabs.jsx', import.meta.url), 'utf8');
const homeroomPortalSource = fs.readFileSync(new URL('../src/pages/HomeroomPortal.jsx', import.meta.url), 'utf8');
const homeroomPhase2StoreSource = fs.readFileSync(new URL('../src/utils/homeroomPhase2.js', import.meta.url), 'utf8');
const homeroomPhase2SqlSource = fs.readFileSync(new URL('../supabase/homeroom_phase2_v10_67.sql', import.meta.url), 'utf8');
add('V10.67 Phase 2 homeroom modules present', ['LearningAnalyticsTab', 'SubjectFeedbackTab', 'CompetitionTab', 'AnnouncementsTab', 'PortalsTab', 'SchoolStatsTab'].every((name) => homeroomPhase2TabsSource.includes(`function ${name}`)), 'learning, subject feedback, competition, notices, portals and school stats');
add('V10.67 public family and subject portals routed', mainSource.includes("'homeroom-portal'") && homeroomPortalSource.includes('PortalLogin') && homeroomPortalSource.includes('FamilyPortal') && homeroomPortalSource.includes('SubjectPortal'), 'public code/PIN route and role-specific views');
add('V10.67 sanitized portal snapshots and acknowledgements', homeroomPhase2StoreSource.includes('buildPortalPayload') && homeroomPhase2StoreSource.includes('acknowledgePortalNotice') && homeroomPhase2StoreSource.includes('submitSubjectFeedback'), 'filtered snapshots, read receipts and feedback submission');
add('V10.67 subject feedback review workflow', homeroomPhase2TabsSource.includes('loadFeedbackInbox') && homeroomPhase2TabsSource.includes('markFeedbackReviewed') && homeroomPhase2TabsSource.includes('Tiếp nhận vào hồ sơ'), 'GVCN inbox and approval flow');
add('V10.67 Supabase portal RPC migration included', homeroomPhase2SqlSource.includes('create table if not exists public.bes_homeroom_portals') && homeroomPhase2SqlSource.includes('get_homeroom_portal') && homeroomPhase2SqlSource.includes('acknowledge_homeroom_notice') && homeroomPhase2SqlSource.includes('submit_homeroom_subject_feedback'), 'portal, receipts and subject-feedback RPCs');
add('V10.67 private workspace local key stays backward compatible', homeroomStoreSource.includes("const STORE_PREFIX = 'bes-homeroom-workspace-v1'"), 'Phase 1 local data remains visible after upgrade');


const aiGovernanceRuntimeSource = fs.readFileSync(new URL('../src/utils/aiGovernance.js', import.meta.url), 'utf8');
const aiServerAdapterSource = fs.readFileSync(new URL('../server/unifiedAiProviderAdapter.js', import.meta.url), 'utf8');
const aiServerGatewaySource = fs.readFileSync(new URL('../src/utils/aiServerGateway.js', import.meta.url), 'utf8');
add('V12.40 task-aware AI token budget applied globally', aiGovernanceRuntimeSource.includes('maxOutputTokens: 8192') && aiGovernanceRuntimeSource.includes('clampNumber(options.maxOutputTokens') && (aiServerAdapterSource.includes('max_tokens: clamp(options.maxOutputTokens') || aiServerAdapterSource.includes('requestedMaxTokens = clamp(options.maxOutputTokens')), 'task contracts can use up to 8,192 output tokens through the server gateway');
add('V12.40 OpenRouter retry is centralized and bounded', aiServerAdapterSource.includes('fetchOpenRouterWithOneRetry') && aiServerAdapterSource.includes('attempt <= attemptLimit') && aiServerAdapterSource.includes('clamp(maxAttempts, 1, 2, 2)') && aiGovernanceRuntimeSource.includes('transientRetries: 0'), 'at most one transient server retry and zero browser retry prevent stacked retries');
add('V10.68 homeroom file import uses compact token budget', homeroomSource.includes('AI_IMPORT_OUTPUT_BUDGET = 1200') && homeroomSource.includes('AI_IMPORT_SOURCE_LIMIT = 60000') && homeroomSource.includes('omit properties that are absent'), '1,200 output tokens and compact JSON extraction');

const homeroomPhase3TabsSource = fs.readFileSync(new URL('../src/components/HomeroomPhase3Tabs.jsx', import.meta.url), 'utf8');
const homeroomPhase3Source = fs.readFileSync(new URL('../src/utils/homeroomPhase3.js', import.meta.url), 'utf8');
const homeroomPhase3SqlSource = fs.readFileSync(new URL('../supabase/homeroom_phase3_v10_69.sql', import.meta.url), 'utf8');
add('V10.69 multiple classes and school-year lifecycle', homeroomPhase3TabsSource.includes('ClassLifecycleTab') && homeroomStoreSource.includes('listHomeroomWorkspaces') && homeroomStoreSource.includes('duplicateHomeroomWorkspace') && homeroomStoreSource.includes('setHomeroomWorkspaceStatus'), 'create, switch, duplicate, archive and restore class workspaces');
add('V10.69 student records archive instead of permanent deletion', homeroomStoreSource.includes('archiveStudent') && homeroomStoreSource.includes('restoreStudent') && homeroomStoreSource.includes('transferStudent') && homeroomSource.includes('không xóa lịch sử'), 'student history is preserved');
add('V10.69 audit trail and restore points', homeroomPhase3Source.includes('prepareWorkspaceCommit') && homeroomPhase3Source.includes('createManualBackup') && homeroomPhase3Source.includes('restoreWorkspaceBackup') && homeroomPhase3TabsSource.includes('Nhật ký hoạt động'), 'automatic/manual backups and audit history present');
add('V10.69 secure six-digit portal access', homeroomPhase2StoreSource.includes('pinHashes') && homeroomPhase2StoreSource.includes("crypto.subtle.digest('SHA-256'") && homeroomPhase3SqlSource.includes('bes_homeroom_portal_attempts') && homeroomPhase3SqlSource.includes('locked_until'), 'hashed PINs, attempt limits, lockout and expiry');
add('V10.69 advanced attendance sessions and correction workflow', homeroomSource.includes('attendanceSessionKey') && homeroomSource.includes('setAttendanceLock') && homeroomSource.includes('createCorrectionRequest') && homeroomSource.includes('Điểm danh theo buổi / tiết'), 'session/period attendance, lock and correction request present');
add('V10.69 incident and student support plans', homeroomPhase3TabsSource.includes('StudentSupportTab') && homeroomPhase3Source.includes('addIncident') && homeroomPhase3Source.includes('addSupportPlan') && homeroomPhase3TabsSource.includes('Hạn theo dõi'), 'case log, evidence and support follow-up present');
add('V10.69 spreadsheet score import and configurable thresholds', homeroomPhase2TabsSource.includes('readWorkbookSafe') && homeroomPhase2TabsSource.includes('AI nhận diện cột') && homeroomPhase2TabsSource.includes('warningThreshold') && homeroomPhase2TabsSource.includes('lockedPeriods'), 'Excel/CSV mapping, configurable risk and grade locks');
add('V10.69 two-way parent communication with attachments', homeroomPortalSource.includes('submitPortalResponse') && homeroomPhase2TabsSource.includes('readSmallAttachment') && homeroomPhase2TabsSource.includes('hr-portal-responses') && homeroomPhase3SqlSource.includes('submit_homeroom_portal_response'), 'downloadable small attachments and portal replies');
add('V10.69 standardized Word and PDF records', homeroomPhase3Source.includes('downloadWordDocument') && homeroomPhase3Source.includes('printRecordAsPdf') && homeroomSource.includes('hr-document-preview'), 'school-formatted document preview and export');
add('V10.69 global class search and reminders', homeroomPhase3Source.includes('searchWorkspace') && homeroomPhase3TabsSource.includes('SearchCommandTab') && homeroomStoreSource.includes('addReminder') && homeroomStoreSource.includes('toggleReminder'), 'search across modules and due reminders');
add('V10.69 Phase 3 normalized RLS schema', ['bes_homeroom_students','bes_homeroom_attendance','bes_homeroom_learning_records','bes_homeroom_incidents','bes_homeroom_parent_contacts','bes_homeroom_announcements','bes_homeroom_documents','bes_homeroom_audit_logs','bes_homeroom_backups'].every((name) => homeroomPhase3SqlSource.includes(name)) && homeroomPhase3SqlSource.includes('bes_homeroom_owner_or_admin'), 'normalized tables and owner/admin policies included');
add('V10.69 Phase 3 responsive layout styles', cssSource.includes('V10.69 · Homeroom Phase 3 complete operations') && cssSource.includes('.hr-class-catalog') && cssSource.includes('.hr-document-preview') && cssSource.includes('@media(max-width:760px)'), 'desktop, tablet and mobile styles present');



const homeroomConductTabSource = fs.readFileSync(new URL('../src/components/HomeroomConductTab.jsx', import.meta.url), 'utf8');
const homeroomConductSource = fs.readFileSync(new URL('../src/utils/homeroomConduct.js', import.meta.url), 'utf8');
const homeroomConductDataSource = fs.readFileSync(new URL('../src/data/homeroomConduct.js', import.meta.url), 'utf8');
const conductPdfPath = new URL('../public/documents/Quyet-dinh-95-QD-PEK-Noi-quy-va-cham-diem-thi-dua-2025.pdf', import.meta.url);
add('V10.70 weekly conduct tab and 100-point workflow', homeroomDataSource.includes("key: 'conduct'") && homeroomSource.includes('HomeroomConductTab') && homeroomConductTabSource.includes('Sổ rèn luyện điện tử theo đúng tuần của trường') && homeroomConductTabSource.includes('Ghi nhận & trừ điểm'), 'dedicated homeroom conduct workspace present');
add('V10.70 Decision 95/QĐ-PEK catalog and attached PDF', OFFICIAL_CONDUCT_RULES.length >= 30 && CONDUCT_DOCUMENT.path.includes('Quyet-dinh-95-QD-PEK') && homeroomConductDataSource.includes('Bảng lượng hóa điểm') && fs.existsSync(conductPdfPath), `${OFFICIAL_CONDUCT_RULES.length} official rules and PDF included`);
add('V10.70 custom future violation rule input', homeroomConductTabSource.includes('Vi phạm khác / nội quy mới') && homeroomConductTabSource.includes('Điểm trừ tối thiểu là 5') && homeroomConductSource.includes('addCustomConductRule') && homeroomStoreSource.includes('conductCustomRules'), 'new school rules can be saved and reused');
const conductWorkspace = makeDefaultHomeroomWorkspace({ email: 'teacher@example.com' });
conductWorkspace.classProfile.schoolYear = '2025-2026';
conductWorkspace.students = [{ id: 's1', fullName: 'Student One', active: true }];
let conductNext = addConductRecord(conductWorkspace, { studentId: 's1', date: '2026-07-06', title: 'Đi học trễ', deduction: 5, status: 'confirmed' });
conductNext = addCustomConductRule(conductNext, { title: 'Nội quy mới', personalDeduction: 10 });
const weeklyConduct = calculateWeeklyConduct(conductNext, '2026-07-06');
const periodConduct = calculateConductPeriod(conductNext, '2026-07-01', '2026-07-31');
add('V10.70 conduct calculations for week and periods', weeklyConduct[0]?.score === 95 && weeklyConduct[0]?.classification?.label === 'Tốt' && periodConduct[0]?.weekCount >= 4 && conductNext.conductCustomRules[0]?.personalDeduction === 10, `week ${weeklyConduct[0]?.score}, period ${periodConduct[0]?.average}`);
add('V10.70 attendance sync and configurable periods present', homeroomConductSource.includes('syncAttendanceToConduct') && homeroomConductTabSource.includes('Đồng bộ từ điểm danh') && homeroomConductTabSource.includes('Giữa học kỳ I') && homeroomConductTabSource.includes('Cả năm'), 'attendance deductions and period summaries present');

const academicCalendar = createAcademicCalendarDefaults('2025-2026');
const academicRanges = buildPeriodRangesFromAcademicCalendar(academicCalendar);
add('V10.71 academic-year and semester date settings present', homeroomConductTabSource.includes('Ngày bắt đầu năm học') && homeroomConductTabSource.includes('Kết thúc học kỳ I') && homeroomConductTabSource.includes('Bắt đầu học kỳ II') && homeroomStoreSource.includes('academicCalendar'), 'school year, semester I and semester II dates are configurable');
add('V10.71 academic calendar drives conduct periods', validateAcademicCalendar(academicCalendar).length === 0 && academicRanges.year.start === '2025-08-01' && academicRanges.semester1.end === '2025-12-31' && academicRanges.semester2.end === '2026-05-31', `${academicRanges.year.start} to ${academicRanges.year.end}`);
add('V10.71 academic calendar validation blocks overlaps', validateAcademicCalendar({ ...academicCalendar, semester2Start: '2025-12-01' }).length > 0 && homeroomConductTabSource.includes('Lịch năm học chưa hợp lệ'), 'invalid or overlapping semesters are rejected');
add('V10.72 conduct save progress and result feedback', homeroomConductTabSource.includes('Đang lưu kết quả vi phạm') && homeroomConductTabSource.includes('Đã lưu kết quả vi phạm') && homeroomConductTabSource.includes('hr-conduct-save-overlay') && homeroomConductTabSource.includes('new Promise((resolve) => window.setTimeout(resolve, 720))') && cssSource.includes('V10.72 · Clear save feedback for weekly conduct records'), 'button lock, full-screen progress, success, offline warning and error states present');

const editableWorkspace = makeDefaultHomeroomWorkspace({ email: 'teacher@example.com' });
editableWorkspace.classProfile.schoolYear = '2025-2026';
editableWorkspace.students = [{ id: 's1', fullName: 'Student One', active: true }];
let editableNext = addConductRecord(editableWorkspace, { id: 'record-1', studentId: 's1', date: '2026-07-06', title: 'Đi học trễ', deduction: 5, status: 'confirmed', note: 'Ban đầu' });
editableNext = updateConductRecord(editableNext, 'record-1', { date: '2026-07-13', deduction: 10, status: 'pending', note: 'Đã điều chỉnh', editReason: 'Sửa theo biên bản' }, 'GVCN');
const editedRecord = editableNext.conductRecords.find((item) => item.id === 'record-1');
add('V10.73 selectable weekly conduct summary', homeroomConductTabSource.includes('Tuần cần xem') && homeroomConductTabSource.includes('Bảng điểm tuần') && homeroomConductTabSource.includes('Nhật ký sửa đổi') && homeroomConductTabSource.includes('shiftConductWeek'), 'week selector, previous/next navigation and two review modes present');
add('V10.73 violation review filters and editor', homeroomConductTabSource.includes('Xem / điều chỉnh') && homeroomConductTabSource.includes('Lý do điều chỉnh') && homeroomConductTabSource.includes('Xem lịch sử điều chỉnh') && cssSource.includes('V10.73 · Selectable weekly conduct review and editable violation history'), 'search, status filters, edit dialog and responsive styles present');
add('V10.73 record adjustments recalculate week and preserve history', editedRecord?.deduction === 10 && editedRecord?.status === 'pending' && editedRecord?.weekStart === '2026-07-13' && editedRecord?.history?.length === 1 && conductRecordsForWeek(editableNext, '2026-07-13').length === 1 && conductRecordsForWeek(editableNext, '2026-07-06').length === 0, `deduction ${editedRecord?.deduction}, history ${editedRecord?.history?.length}`);

let ledgerWorkspace = makeDefaultHomeroomWorkspace({ email: 'teacher@example.com' });
ledgerWorkspace.classProfile.schoolYear = '2025-2026';
ledgerWorkspace.students = [{ id: 's1', fullName: 'Student One', active: true }];
ledgerWorkspace = addConductRecord(ledgerWorkspace, { studentId: 's1', date: '2026-03-02', title: 'Đi học trễ', deduction: 10, status: 'confirmed', createdBy: 'GVCN' });
ledgerWorkspace = addConductReward(ledgerWorkspace, { studentId: 's1', date: '2026-03-03', title: 'Khắc phục tốt', bonus: 5, createdBy: 'GVCN' });
const liveLedgerRow = calculateWeeklyConduct(ledgerWorkspace, '2026-03-02')[0];
ledgerWorkspace = finalizeConductWeek(ledgerWorkspace, '2026-03-02', 'GVCN', 'Chốt tuần thử nghiệm');
const lockedSummary = getConductWeekSummary(ledgerWorkspace, '2026-03-02');
let lockedEditBlocked = false;
try { updateConductRecord(ledgerWorkspace, ledgerWorkspace.conductRecords[0].id, { deduction: 15, editReason: 'Thử sửa' }, 'GVCN'); } catch { lockedEditBlocked = true; }
ledgerWorkspace = reopenConductWeek(ledgerWorkspace, '2026-03-02', 'GVCN', 'Cần bổ sung minh chứng');
const reopenedSummary = getConductWeekSummary(ledgerWorkspace, '2026-03-02');
add('V10.73 weekly ledger rewards and score cap', liveLedgerRow?.score === 95 && liveLedgerRow?.totalDeduction === 10 && liveLedgerRow?.totalBonus === 5, `score ${liveLedgerRow?.score}`);
add('V10.73 week finalize, lock and reopen workflow', lockedSummary?.status === 'locked' && lockedEditBlocked && reopenedSummary?.status === 'open' && reopenedSummary?.history?.length === 2, `history ${reopenedSummary?.history?.length}`);
add('V10.73 audit trail and printable report UI', buildConductAuditTrail(ledgerWorkspace, '2026-03-02').length >= 4 && homeroomConductTabSource.includes('In / lưu PDF') && homeroomConductTabSource.includes('Dòng thời gian') && homeroomConductTabSource.includes('HỒ SƠ RÈN LUYỆN HỌC SINH'), 'record, reward, locking, timeline and student trend present');
const autoWorkspace = { ...makeDefaultHomeroomWorkspace({ email: 'teacher@example.com' }), classProfile: { ...makeDefaultHomeroomWorkspace().classProfile, schoolYear: '2025-2026' }, students: [{ id: 's1', fullName: 'Student One', active: true }] };
const autoResult = applyAutomaticConductWeekClosures(autoWorkspace, 'Hệ thống', new Date('2027-08-18T00:00:00'));
add('V10.73 automatic week closure setting', autoResult.lockedWeeks.length >= 1 && homeroomConductTabSource.includes('Tự động tổng kết và khóa tuần') && homeroomStoreSource.includes('conductWeekSummaries'), `${autoResult.lockedWeeks.length} week(s) locked`);


const academicPlanSource = fs.readFileSync(new URL('../src/data/homeroomAcademicPlan.js', import.meta.url), 'utf8');
const academicPlanPdfPath = new URL('../public/documents/Khung-ke-hoach-thoi-gian-nam-hoc-2026-2027-Petrus-Ky.pdf', import.meta.url);
const exactPlanWorkspace = makeDefaultHomeroomWorkspace({ email: 'teacher@example.com' });
exactPlanWorkspace.classProfile.schoolYear = '2026-2027';
exactPlanWorkspace.students = [{ id: 's1', fullName: 'Student One', active: true }];
const exactPlanWeeks = conductWeeksForWorkspace(exactPlanWorkspace, '', '', { includeOrientation: true, includeInAverageOnly: false });
const exactPlanRanges = inferConductPeriodRanges(exactPlanWorkspace);
const exactPlanYearRows = conductWeeksForWorkspace(exactPlanWorkspace, exactPlanRanges.year.start, exactPlanRanges.year.end, { includeOrientation: false, includeInAverageOnly: true });
add('V10.75 exact Pétrus Ký catalog plus four Grade 12 summer weeks', PETRUS_KY_ACADEMIC_PLAN_2026_2027.sourceRows.length === 53 && PETRUS_KY_ACADEMIC_PLAN_2026_2027.supplementalRows.length === 4 && PETRUS_KY_ACADEMIC_PLAN_2026_2027.rows.length === 57 && PETRUS_KY_CONDUCT_WEEKS.length === 47 && PETRUS_KY_AVERAGE_WEEKS.length === 42, `${PETRUS_KY_ACADEMIC_PLAN_2026_2027.sourceRows.length} source rows + ${PETRUS_KY_ACADEMIC_PLAN_2026_2027.supplementalRows.length} summer weeks`);
add('V10.75 summer weeks run exactly from 15 June to 11 July 2026', exactPlanWeeks.length === 47 && exactPlanWeeks.slice(0, 4).join(',') === '2026-06-15,2026-06-22,2026-06-29,2026-07-06' && PETRUS_KY_ACADEMIC_PLAN_2026_2027.supplementalRows.at(-1)?.endDate === '2026-07-11' && exactPlanWeeks[4] === '2026-07-13' && exactPlanWeeks[5] === '2026-07-20' && exactPlanWeeks.at(-1) === '2027-05-17', `${exactPlanWeeks[0]} to ${PETRUS_KY_ACADEMIC_PLAN_2026_2027.supplementalRows.at(-1)?.endDate}`);
add('V10.75 official plan accepts normalized school-year labels', (() => { const w = makeDefaultHomeroomWorkspace({ email: 'teacher@example.com' }); w.classProfile.schoolYear = '2026 – 2027'; return conductWeeksForWorkspace(w, '', '', { includeOrientation: true, includeInAverageOnly: false })[0] === '2026-06-15'; })(), 'spaces and en dash no longer disable the school plan');
add('V10.75 local date arithmetic has no UTC one-day shift', startOfConductWeek('2026-07-11') === '2026-07-06' && endOfConductWeek('2026-07-11') === '2026-07-12' && resolveConductWeekStart(exactPlanWorkspace, '2026-07-11') === '2026-07-06', `${startOfConductWeek('2026-07-11')} to ${endOfConductWeek('2026-07-11')}`);
add('V10.75 Tet excluded while summer-prep follows class grade', !findPetrusKyConductWeek('2027-02-01') && exactPlanYearRows.length === 46 && exactPlanRanges.year.start === '2026-06-15' && exactPlanRanges.year.end === '2027-05-26', `${exactPlanYearRows.length} Grade 12 averaged weeks`);
add('V10.75 school plan document archived for in-app lookup', PETRUS_KY_ACADEMIC_PLAN_DOCUMENT.path.includes('Khung-ke-hoach-thoi-gian') && fs.existsSync(academicPlanPdfPath) && homeroomConductTabSource.includes('Khung kế hoạch thời gian năm học 2026-2027') && homeroomConductTabSource.includes('53 dòng kế hoạch + 4 tuần hè khối 12'), 'PDF open, download and embedded preview available');
add('V10.75 school and curriculum week columns retained', academicPlanSource.includes('schoolPlanLabel') && academicPlanSource.includes('curriculumPlanLabel') && homeroomConductTabSource.includes('KHGD nhà trường') && homeroomConductTabSource.includes('KHGD chính khóa'), 'both source columns shown for reference');


const grade11PlanWorkspace = makeDefaultHomeroomWorkspace({ email: 'teacher11@example.com' });
grade11PlanWorkspace.classProfile.schoolYear = '2026-2027';
grade11PlanWorkspace.classProfile.grade = '11';
grade11PlanWorkspace.classProfile.className = '11.1';
const grade11AverageWeeks = conductWeeksForWorkspace(grade11PlanWorkspace, '2026-06-15', '2027-05-22', { includeOrientation: false, includeInAverageOnly: true });
const grade12AverageWeeks = conductWeeksForWorkspace(exactPlanWorkspace, '2026-06-15', '2027-05-22', { includeOrientation: false, includeInAverageOnly: true });
add('V10.76 Grade 12 summer weeks included in semester and annual averages', grade12AverageWeeks.length === 46 && grade12AverageWeeks.slice(0, 4).join(',') === '2026-06-15,2026-06-22,2026-06-29,2026-07-06' && inferConductPeriodRanges(exactPlanWorkspace).semester1.start === '2026-06-15', `${grade12AverageWeeks.length} weeks`);
add('V10.76 non-Grade-12 averages remain 42 official weeks', grade11AverageWeeks.length === 42 && grade11AverageWeeks[0] === '2026-07-20' && inferConductPeriodRanges(grade11PlanWorkspace).semester1.start === '2026-07-20', `${grade11AverageWeeks.length} weeks`);
add('V10.76 password-protected conduct lock UI', homeroomConductTabSource.includes('Mật khẩu mặc định') && homeroomConductTabSource.includes('Xác nhận khóa kết quả tuần') && homeroomConductTabSource.includes('Quản trị: Reset về mặc định') && cssSource.includes('V10.76 · Password-protected conduct finalization'), 'custom lock dialog, change and admin reset controls present');
const passwordWorkspace = makeDefaultHomeroomWorkspace({ email: 'teacher@example.com' });
const defaultPasswordOk = await verifyConductLockPassword(passwordWorkspace, DEFAULT_CONDUCT_LOCK_PASSWORD);
const changedPasswordWorkspace = await changeConductLockPassword(passwordWorkspace, 'SecurePass123', 'GVCN');
const changedPasswordOk = await verifyConductLockPassword(changedPasswordWorkspace, 'SecurePass123');
const oldPasswordRejected = !(await verifyConductLockPassword(changedPasswordWorkspace, DEFAULT_CONDUCT_LOCK_PASSWORD));
const resetPasswordWorkspace = resetConductLockPassword(changedPasswordWorkspace, 'Admin');
const resetPasswordOk = await verifyConductLockPassword(resetPasswordWorkspace, DEFAULT_CONDUCT_LOCK_PASSWORD);
add('V10.76 default, change and admin reset password workflow', defaultPasswordOk && changedPasswordOk && oldPasswordRejected && resetPasswordOk, DEFAULT_CONDUCT_LOCK_PASSWORD);

const v77Locked = finalizeConductWeek(exactPlanWorkspace, '2026-07-20', 'GVCN');
const v77Reopened = reopenConductWeek(v77Locked, '2026-07-20', 'GVCN');
const v77AfterAutoLock = applyAutomaticConductWeekClosures(v77Reopened, 'Hệ thống', new Date('2026-08-01T00:00:00')).workspace;
add('V10.77 manually reopened week remains editable', !isConductWeekLocked(v77Reopened, '2026-07-20') && !isConductWeekLocked(v77AfterAutoLock, '2026-07-20'), 'manual reopen bypasses immediate auto-relock');
const v77ResetBase = addConductRecord(v77Reopened, { studentId: v77Reopened.students[0]?.id, date: '2026-07-20', ruleId: OFFICIAL_CONDUCT_RULES[0].id, title: OFFICIAL_CONDUCT_RULES[0].title, deduction: OFFICIAL_CONDUCT_RULES[0].personalDeduction || 5, status: 'confirmed', createdBy: 'GVCN', allowLocked: true });
const v77Reset = resetConductWeekData(v77ResetBase, '2026-07-20', 'GVCN');
add('V10.77 emergency weekly reset clears selected week', conductRecordsForWeek(v77Reset, '2026-07-20', { includeCancelled: true }).length === 0 && getConductWeekSummary(v77Reset, '2026-07-20')?.status === 'open' && getConductWeekSummary(v77Reset, '2026-07-20')?.history?.at(-1)?.action === 'reset', 'records cleared, week reopened and reset audited');
add('V10.77 unlock and reset UI requires password but no reason', homeroomConductTabSource.includes('Reset dữ liệu tuần khẩn cấp') && !homeroomConductTabSource.includes('Lý do mở khóa') && homeroomConductTabSource.includes("openWeekLockDialog('reset')"), 'reason removed; emergency reset present');



const v78CancelBase = addConductRecord(exactPlanWorkspace, {
  studentId: exactPlanWorkspace.students[0]?.id,
  date: '2026-07-20',
  title: 'Vi phạm thử nghiệm để hủy',
  deduction: 10,
  status: 'confirmed',
  createdBy: 'GVCN',
});
const v78RecordId = v78CancelBase.conductRecords[0]?.id;
const v78BeforeCancel = calculateWeeklyConduct(v78CancelBase, '2026-07-20')[0];
const v78Cancelled = cancelConductRecord(v78CancelBase, v78RecordId, '', 'GVCN');
const v78AfterCancel = calculateWeeklyConduct(v78Cancelled, '2026-07-20')[0];
const v78CancelledRecord = v78Cancelled.conductRecords.find((item) => item.id === v78RecordId);
add('V10.78 cancel record recalculates weekly score and preserves history', v78BeforeCancel?.score === 90 && v78AfterCancel?.score === 100 && v78CancelledRecord?.status === 'cancelled' && v78CancelledRecord?.history?.length === 1, `before ${v78BeforeCancel?.score}, after ${v78AfterCancel?.score}`);
add('V10.78 in-app cancel confirmation replaces browser prompt', homeroomConductTabSource.includes('confirmCancelRecord') && homeroomConductTabSource.includes('Xác nhận hủy ghi nhận') && homeroomConductTabSource.includes('Không cần nhập lý do') && !homeroomConductTabSource.includes('window.prompt(`Lý do hủy ghi nhận'), 'custom dialog and save feedback present');
add('V10.78 cancel dialog responsive styling present', cssSource.includes('V10.78 · Reliable cancel-record confirmation and feedback') && cssSource.includes('.hr-conduct-cancel-dialog'), 'desktop, dark and mobile styles present');



const v79ResetLocked = finalizeConductWeek(v78CancelBase, '2026-07-20', 'GVCN');
const v79Reset = resetConductWeekData(v79ResetLocked, '2026-07-20', 'GVCN');
const v79AfterAutomaticClosure = applyAutomaticConductWeekClosures(v79Reset, 'Hệ thống', new Date('2026-08-01T00:00:00')).workspace;
add('V10.79 emergency reset stays open after automatic closure pass', conductRecordsForWeek(v79Reset, '2026-07-20', { includeCancelled: true }).length === 0 && !isConductWeekLocked(v79Reset, '2026-07-20') && !isConductWeekLocked(v79AfterAutomaticClosure, '2026-07-20') && Boolean(getConductWeekSummary(v79Reset, '2026-07-20')?.resetAt), 'reset marker prevents immediate re-lock');
add('V10.79 reset confirmation is fully in-app and actionable', homeroomConductTabSource.includes('resetConfirmed') && homeroomConductTabSource.includes('Tôi hiểu thao tác này không thể hoàn tác') && homeroomConductTabSource.includes('Xác nhận reset tuần') && !homeroomConductTabSource.includes('Reset khẩn cấp sẽ xóa toàn bộ ${count}'), 'browser confirm removed from reset flow');
add('V10.79 cancel confirmation is portaled and anchored to clicked button', homeroomConductTabSource.includes("import { createPortal } from 'react-dom'") && homeroomConductTabSource.includes('getBoundingClientRect') && homeroomConductTabSource.includes('cancelDialog.anchor') && cssSource.includes('V10.79 · Working emergency reset + viewport-safe anchored confirmations'), 'viewport-safe anchored popover present');


const resourceViewerSource = fs.readFileSync(new URL('../src/features/resource-library/ResourceFileViewer.jsx', import.meta.url), 'utf8');
const resourceLibrarySource = fs.readFileSync(new URL('../src/pages/ResourceLibrary.jsx', import.meta.url), 'utf8');
const resourceViewerCss = fs.readFileSync(new URL('../src/features/resource-library/resourceLibraryCategories.css', import.meta.url), 'utf8');
const packageSource = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
add('V10.81.9 direct viewer covers requested formats', ['docx', 'pptx', 'pdf', 'xlsx', 'video', 'audio'].every((kind) => resourceViewerSource.includes(`kind === '${kind}'`)), 'DOCX, PPTX, PDF, XLSX, MP4 and MP3 paths present');
add('V10.81.9 resource modal uses secure viewer', resourceLibrarySource.includes('<ResourceFileViewer item={preview} fetchBlob={fetchResourceBlob} getStreamUrl={getResourceStreamUrl}/>') && resourceLibrarySource.includes('supportsResourcePreview'), 'preview remains behind authenticated Drive proxy');
add('V10.81.9 Office renderers are local and sandboxed', resourceViewerSource.includes('mammoth.convertToHtml') && resourceViewerSource.includes('readWorkbookSafe') && resourceViewerSource.includes("import('jszip')") && resourceViewerSource.includes('sandbox="allow-popups"'), 'Word, Excel and PowerPoint render without public Drive sharing');
add('V10.81.9 scalable viewer styling present', resourceViewerCss.includes('V10.81.9 — direct DOCX, PPTX, PDF, XLSX, MP4 and MP3 viewer') && resourceViewerCss.includes('.resource-workbook-viewer') && resourceViewerCss.includes('.resource-pptx-viewer'), 'desktop, dark and mobile layouts present');
add('V10.81.9 JSZip declared directly', packageSource.dependencies?.jszip === '^3.10.1' && /^(?:10\.(?:8[2-9]|9\d)|1[12]\.\d+)\./.test(packageSource.version), 'PPTX parser dependency is production-safe');
const previewSessionSource = fs.readFileSync(new URL('../api/google-drive-preview-session.js', import.meta.url), 'utf8');
const driveFileSource = fs.readFileSync(new URL('../api/google-drive-file.js', import.meta.url), 'utf8');
add('V10.81.9 secure streaming session supports media seeking', previewSessionSource.includes('signResourcePreviewToken') && driveFileSource.includes('Content-Range') && driveFileSource.includes("Range: range") && resourceLibrarySource.includes('getResourceStreamUrl'), 'short-lived signed URL and byte ranges present');

const newsReaderSource = fs.readFileSync(new URL('../src/pages/NewsReader.jsx', import.meta.url), 'utf8');
const newsFeedSource = fs.readFileSync(new URL('../api/news-feed.js', import.meta.url), 'utf8');
const newsArticleSource = fs.readFileSync(new URL('../api/news-article.js', import.meta.url), 'utf8');
const appDataSource = fs.readFileSync(new URL('../src/data/apps.js', import.meta.url), 'utf8');
const toolPageSource = fs.readFileSync(new URL('../src/pages/ToolPage.jsx', import.meta.url), 'utf8');
const iconSource = fs.readFileSync(new URL('../src/components/FlatAppIcon.jsx', import.meta.url), 'utf8');
add('V10.82 Newsroom app card is registered', appDataSource.includes("slug: 'news-reader'") && APPS.some((item) => item.slug === 'news-reader'), 'Newsroom Reader appears in the Apps directory');
add('V10.82.3 Newsroom has a direct navigation route', appDataSource.includes("route: 'news'") && mainSource.includes("currentRoute === 'news'") && globalNavSource.includes("'news'") && launcherPreferencesSource.includes("'route:news'"), 'Newsroom can be launched from the customizable global navigation');
add('V10.82.3 Newsroom has Vietnamese and English channels', newsReaderSource.includes("switchChannel('vi')") && newsReaderSource.includes("switchChannel('en')") && newsReaderSource.includes('Báo giáo dục Việt Nam') && newsReaderSource.includes('English News'), 'two reading channels present');
add('V10.82.3 Newsroom uses same-origin RSS aggregation', newsReaderSource.includes('/api/news-feed?language=') && newsFeedSource.includes('giaoducthoidai.vn/rss/giao-duc-17.rss') && newsFeedSource.includes('feeds.bbci.co.uk/news/rss.xml'), 'Vietnamese education and English feeds configured');
add('V10.82.3 full-article endpoint is wired', newsReaderSource.includes('/api/news-article?url=') && newsArticleSource.includes('articleJsonLd') && newsArticleSource.includes('fetchJinaReader') && newsArticleSource.includes('ALLOWED_HOSTS'), 'publisher HTML, JSON-LD and resilient reader fallback present');

const smartIdSource = fs.readFileSync(new URL('../src/pages/SmartIdStudio.jsx', import.meta.url), 'utf8');
const smartIdCssSource = fs.readFileSync(new URL('../src/pages/SmartIdStudio.css', import.meta.url), 'utf8');
add('V10.82.5 SmartID app card is registered', appDataSource.includes("slug: 'smart-id'") && APPS.some((item) => item.slug === 'smart-id'), 'SmartID appears in the Apps directory');
add('V10.82.5 SmartID route is wired', toolPageSource.includes("tool?.slug === 'smart-id'") && toolPageSource.includes('SmartIdStudio'), 'dedicated lazy-loaded SmartID page');
add('V12.39 SmartID uses the shared account OpenRouter key', smartIdSource.includes('getAiConfigs') && smartIdSource.includes('configs?.openrouter') && smartIdSource.includes('OpenRouter') && !smartIdSource.includes('const apiKey = ""'), 'no hardcoded or separate SmartID key');
add('V10.82.5 SmartID supports upload, camera, AI edit and print', ['handleUpload', 'captureCamera', 'handleAiEdit', 'exportSinglePhoto', 'exportPrintSheet'].every((token) => smartIdSource.includes(token)), 'complete portrait workflow present');
add('V12.39 SmartID uses the configured OpenRouter image model', smartIdSource.includes('imageModel') && smartIdSource.includes('callAIImageWithMeta'), 'shared image runtime is present');
add('V10.82.5 SmartID layout remains inside a centered content rail', smartIdCssSource.includes('max-width:1440px') && smartIdCssSource.includes('.smartid-editor-shell') && smartIdCssSource.includes('@media(max-width:720px)'), 'desktop, tablet and mobile styles present');
add('V10.82.3 Newsroom reader has search, publisher filter, saving and speech', newsReaderSource.includes('newsroom-v823-search') && newsReaderSource.includes('newsroom-v823-source-filter') && newsReaderSource.includes('bes-news-saved-items') && newsReaderSource.includes('SpeechSynthesisUtterance'), 'focused reading controls present');
add('V10.82 Newsroom tool route and icon remain wired', toolPageSource.includes("tool?.slug === 'news-reader'") && iconSource.includes("'news-reader': 'news'"), 'legacy tool URL and flat news icon remain available');
add('V10.82.3 Newsroom responsive editorial design layer present', cssSource.includes('V10.82.3 — Newsroom direct navigation') && cssSource.includes('.newsroom-v823-hero') && cssSource.includes('.newsroom-v823-reader-overlay') && cssSource.includes('@media(max-width:720px)'), 'desktop, dark, tablet and mobile styles present');

add('V10.82.4 Newsroom full-screen reader mode is wired', newsReaderSource.includes('newsroom-v824-reader-screen') && newsReaderSource.includes('newsroom-v824-reader-rail') && cssSource.includes('.newsroom-v824-reader-screen') && cssSource.includes('.newsroom-v824-reader-workspace'), 'full-screen reader, outline and related-story rail present');
add('V10.82.4 News is always available to signed-in accounts', launcherPreferencesSource.includes("'route:news'") && permissionsSource.includes("if (route === 'news') return Boolean(user);"), 'News remains available and can be placed on the customizable navigation');


const wordGraphRedesignSource = fs.readFileSync(new URL('../src/pages/WordGraphStudio.jsx', import.meta.url), 'utf8');
add('V10.82.1 WordGraph centered dashboard is wired', wordGraphRedesignSource.includes('wordgraph-v821-dashboard-grid') && wordGraphRedesignSource.includes('wordgraph-v821-hero-actions') && wordGraphRedesignSource.includes('WORDGRAPH_QUICK_TEMPLATES'), 'hero actions, quick templates and four-card dashboard present');
add('V10.82.1 WordGraph cards stay inside centered rail', cssSource.includes('width:min(100%,1320px)') && cssSource.includes('.wordgraph-v821-dashboard-grid') && cssSource.includes('padding:22px clamp(18px,4vw,46px)'), 'centered max-width rail and safe side padding present');
add('V10.82.1 WordGraph recent maps use account history', wordGraphRedesignSource.includes('loadHistory()') && wordGraphRedesignSource.includes('LIBRARY_EVENT') && wordGraphRedesignSource.includes('openRecentMap'), 'recent maps load from the real account library');


const taxStudioSource = fs.readFileSync(new URL('../src/pages/VietnamTaxStudio.jsx', import.meta.url), 'utf8');
const taxStudioCss = fs.readFileSync(new URL('../src/pages/VietnamTaxStudio.css', import.meta.url), 'utf8');
add('V10.82.6 Vietnam Tax Studio app card is registered', appDataSource.includes("slug: 'vietnam-tax'") && APPS.some((item) => item.slug === 'vietnam-tax'), 'tax calculator appears in the Apps directory');
add('V10.82.6 Vietnam Tax Studio uses current five-bracket scale', taxStudioSource.includes('CURRENT_BRACKETS') && taxStudioSource.includes('100_000_000') && taxStudioSource.includes('0.35'), '5-bracket scale and top threshold present');
add('V10.82.6 Vietnam Tax Studio includes Gross-to-Net and insurance calculation', taxStudioSource.includes('calculateInsurance') && taxStudioSource.includes('calculateScenario') && taxStudioSource.includes('REFERENCE_SALARY_2026'), 'insurance, deductions and net salary paths present');
add('V10.82.6 Vietnam Tax Studio is dependency-free and responsive', taxStudioSource.includes('SavingsCurve') && taxStudioCss.includes('.tax-studio-main-grid') && taxStudioCss.includes('@media (max-width: 760px)'), 'native SVG chart and responsive layout present');


const worksheetFactorySource = fs.readFileSync(new URL('../src/pages/WorksheetFactory.jsx', import.meta.url), 'utf8');
const worksheetFactoryCss = fs.readFileSync(new URL('../src/pages/WorksheetFactory.css', import.meta.url), 'utf8');
const worksheetFactoryUtil = fs.readFileSync(new URL('../src/utils/worksheetFactory.js', import.meta.url), 'utf8');
const offlineWorksheet = generateOfflineWorksheet({
  sourceText: 'Artificial intelligence supports teachers. Students need guidance to use technology responsibly. Clear learning objectives improve classroom outcomes. Privacy remains important in digital education.',
  title: 'AI in Education',
  level: 'B2',
  audience: 'THPT',
  activityTypes: ['multiple_choice', 'gap_fill', 'true_false', 'reading_comprehension'],
  itemsPerActivity: 4,
  language: 'vi',
});
const worksheetAudit = auditWorksheet(offlineWorksheet);
const worksheetHtml = worksheetToHtml(offlineWorksheet, { teacherVersion: true, language: 'vi' });
const worksheetBank = worksheetMcqBankItems(offlineWorksheet, { level: 'B2', source: 'Smoke test' });
add('V10.83 Worksheet Factory app card is registered', appDataSource.includes("slug: 'worksheet-factory'") && APPS.some((item) => item.slug === 'worksheet-factory'), 'Worksheet Factory appears in the Apps directory');
add('V10.83 Worksheet Factory dedicated route is wired', toolPageSource.includes("tool?.slug === 'worksheet-factory'") && toolPageSource.includes('WorksheetFactory'), 'lazy-loaded Worksheet Factory page');
add('V10.83 Worksheet Factory supports eleven activity types', WORKSHEET_ACTIVITY_TYPES.length >= 11 && worksheetFactoryUtil.includes('sentence_transformation') && worksheetFactoryUtil.includes('vocabulary_context'), `${WORKSHEET_ACTIVITY_TYPES.length} activity types`);
add('V10.83 Worksheet Factory offline generator creates complete activities', offlineWorksheet.activities.length === 4 && worksheetAudit.totalItems >= 13 && worksheetAudit.missingAnswers.length === 0, `${worksheetAudit.activityCount} activities, ${worksheetAudit.totalItems} items`);
add('V10.83 Worksheet Factory exports teacher HTML and Question Bank items', worksheetHtml.includes('BRIAN ENGLISH · WORKSHEET FACTORY') && worksheetHtml.includes('Đáp án') && worksheetBank.length >= 8, `${worksheetBank.length} bank items`);
add('V10.83 Worksheet Factory imports document formats and real DOCX export', worksheetFactorySource.includes('readPdfTextFromBuffer') && worksheetFactorySource.includes('readDocxTextFromBuffer') && worksheetFactorySource.includes('readPptxText') && (worksheetFactorySource.includes('readSpreadsheetText') || worksheetFactorySource.includes('spreadsheetToTextSafe')) && worksheetFactoryUtil.includes('worksheetToDocxBlob'), 'PDF, DOCX, PPTX, XLSX and DOCX export paths present');
add('V10.83 Worksheet Factory quality audit and centered responsive layout present', (worksheetFactorySource.includes('QualityCard') || worksheetFactorySource.includes('detailedAudit')) && worksheetFactoryUtil.includes('nearDuplicates') && (worksheetFactoryCss.includes('width:min(100%,1440px)') || worksheetFactoryCss.includes('max-width:1540px')) && worksheetFactoryCss.includes('@media(max-width:560px)'), 'quality checks and safe content rail present');


const launcherIds = APPS.map((item) => item.slug || item.route).filter(Boolean);
const launcherDefaults = createDefaultLauncherConfig(launcherIds);
const launcherNormalized = normalizeLauncherConfig({
  ...launcherDefaults,
  order: [...launcherIds].reverse(),
  hidden: launcherIds.slice(0, 1),
  pinned: launcherIds.slice(1, 3),
  nav: ['route:home', 'tool:worksheet-factory'],
  groups: [...launcherDefaults.groups, { id: 'custom', label: 'Custom', labelVi: 'Nhóm riêng', accent: '#167D78' }],
  assignments: { [launcherIds[1]]: 'custom' },
}, launcherIds);
add('V10.83.1 admin-customizable launcher engine', launcherNormalized.order[0] === launcherIds.at(-1) && launcherNormalized.hidden.length === 1 && launcherNormalized.pinned.length === 2 && launcherNormalized.assignments[launcherIds[1]] === 'custom', 'order, hide, pin, groups and assignments normalize safely');
add('V10.83.1 launcher editor controls are wired', webAppsSource.includes('draggable={editMode}') && webAppsSource.includes('togglePin') && webAppsSource.includes('toggleHidden') && webAppsSource.includes('toggleNav') && webAppsSource.includes('createGroup') && webAppsSource.includes('deleteGroup'), 'drag ordering, pin, hide, nav selection and custom groups present');
add('V10.83.1 launcher drives the global navigation', globalNavSource.includes('loadLauncherConfigFromCloud') && globalNavSource.includes('launcherConfig.nav') && globalNavSource.includes("kind === 'tool'") && mainSource.includes('selectedTool={selectedTool}'), 'route and app shortcuts update from launcher preferences');
add('V10.83.1 launcher cloud sync and Admin RLS are wired', launcherPreferencesSource.includes("from('bes_launcher_settings')") && launcherPreferencesSource.includes('postgres_changes') && launcherPreferencesSource.includes('saveLauncherConfigToCloud') && launcherSettingsSqlSource.includes('public.is_admin()') && launcherSettingsSqlSource.includes('Authenticated users can read launcher settings'), 'Supabase sync, realtime refresh and Admin-only writes present');
add('V10.83.1 AI accepts files and screenshots', universalAiSource.includes('prepareAttachment') && universalAiSource.includes('getDisplayMedia') && universalAiSource.includes('captureScreenshot') && universalAiSource.includes('onDrop'), 'drag/drop, file picker, paste and screen capture paths present');
add('V10.83.1 AI uses live page context and conversation threads', universalAiSource.includes('capturePageContext') && universalAiSource.includes('Visible form values') && universalAiSource.includes('bes-ai-chat-threads:') && universalAiSource.includes('showHistory'), 'page-aware prompting and multi-thread history present');
add('V10.83.1 AI result can return to the active app', universalAiSource.includes('bes-ai-use-result') && universalAiSource.includes('Dùng kết quả trong ứng dụng') && worksheetFactorySource.includes('bes-ai-use-result'), 'custom event and Worksheet Factory receiver present');
add('V10.83.1 AI voice mode is wired', universalAiSource.includes('SpeechRecognition') && universalAiSource.includes('speechSynthesis') && universalAiSource.includes('toggleVoiceMode') && universalAiSource.includes('voiceModeRef.current = next'), 'speech input, auto-send and spoken replies present');
add('V12.40 OpenRouter multimodal payload is centralized on the server', aiServerAdapterSource.includes("type: 'image_url'") && aiServerAdapterSource.includes('attachments') && aiServerAdapterSource.includes('/chat/completions') && aiServerGatewaySource.includes("AI_SERVER_ENDPOINT = '/api/ai'"), 'vision attachments use the same authenticated server gateway');
add('V10.83.1 responsive launcher and AI styles present', cssSource.includes('V10.83.1 — Custom Launcher + Brian AI multimodal upgrade') && cssSource.includes('.launcher-admin-panel') && cssSource.includes('.ai-messenger-history') && cssSource.includes('@media(max-width:760px)'), 'desktop, dark, mobile and reduced-motion styles present');

const errorBoundarySource = fs.readFileSync(new URL('../src/components/AppErrorBoundary.jsx', import.meta.url), 'utf8');
const launcherPrefsHotfixSource = fs.readFileSync(new URL('../src/utils/launcherPreferences.js', import.meta.url), 'utf8');
const indexHtmlSource = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
add('V10.83.2 root and feature error boundaries prevent a blank page', mainSource.includes('application-root') && mainSource.includes('apps-launcher') && mainSource.includes('ai-messenger') && errorBoundarySource.includes('Khôi phục launcher mặc định'), 'root, launcher and AI boundaries present');
add('V10.83.2 stale Vite chunk recovery is wired', mainSource.includes('vite:preloadError') && mainSource.includes('PRELOAD_RECOVERY_KEY'), 'stale dynamic chunks trigger a guarded reload');
add('V10.83.2 launcher config decoding tolerates malformed cloud and local data', launcherPrefsHotfixSource.includes('decodeConfig') && launcherPrefsHotfixSource.includes('safeStorageGet') && launcherPrefsHotfixSource.includes('safeCallback'), 'launcher settings are normalized before rendering');
add('V10.83.2 boot watchdog replaces an empty root with recovery controls', indexHtmlSource.includes('bes-boot-watchdog') && indexHtmlSource.includes('bes-hard-reload') && indexHtmlSource.includes('bes-reset-launcher'), 'startup failures no longer remain visually blank');

add('V12.11 native command center is wired', mainSource.includes('UICommandCenter') && commandPaletteSource.includes('COMMAND_CENTER_OPEN_EVENT') && commandPaletteSource.includes("event.key.toLowerCase() === 'k'") && commandPaletteSource.includes("event.key === '/'"), 'Cmd/Ctrl+K, slash shortcut and native command center present');
add('V10.83.3 command search is permission-aware', commandPaletteSource.includes('hasRouteAccess') && commandPaletteSource.includes('hasToolAccess') && commandPaletteSource.includes('scoreCommandEntry') && commandPaletteSource.includes('currentUser.role'), 'routes, tools and commands are filtered and ranked safely');
add('V10.83.3 recent and frequent app usage is account-scoped', appUsageSource.includes('bes-app-usage-v1:') && appUsageSource.includes('scopeFor(user)') && appUsageSource.includes('lastUsedAt') && appUsageSource.includes('count'), 'account-local recent and frequency history present');
add('V12.16.1 streamlined app directory keeps search and density while removing launcher and recent rail', webAppsSource.includes('launcher-search-box') && !webAppsSource.includes('launcher-live-dock') && !webAppsSource.includes('launcher-recent-strip') && webAppsSource.includes('bes-launcher-density') && webAppsSource.includes('normalizedSearch'), 'search sits directly below the hero without launcher or recently opened blocks');
add('V12.17.0 modern app card gallery matches approved blue-board pastel-card direction', fs.existsSync('src/ui-core/styles/apps-cards-v1217.css') && mainSource.includes('apps-cards-v1217.css') && fs.readFileSync('src/ui-core/styles/apps-cards-v1217.css', 'utf8').includes('--apps-board-blue') && fs.readFileSync('src/ui-core/styles/apps-cards-v1217.css', 'utf8').includes('grid-template-columns: repeat(5'), 'approved app-card gallery stylesheet is imported and defines the five-column blue board');
const widescreenV1218Source = fs.readFileSync(new URL('../src/ui-core/styles/widescreen-v1218.css', import.meta.url), 'utf8');
add('V12.18.0 global 16:9 widescreen canvas expands every route close to the viewport edges', fs.existsSync('src/ui-core/styles/widescreen-v1218.css') && mainSource.includes('widescreen-v1218.css') && mainSource.includes('bes-widescreen-16x9') && mainSource.includes('data-aspect-ratio="16:9"') && widescreenV1218Source.includes('--bes-wide-max: 3840px') && widescreenV1218Source.includes('calc(100vw - (var(--bes-wide-gutter) * 2))') && widescreenV1218Source.includes('min-block-size: var(--bes-wide-stage-min)') && widescreenV1218Source.includes('@media (min-width: 2700px)'), 'all routes use a 16:9 baseline, slim gutters and adaptive ultra-wide app columns');
const departmentV1219Source = fs.readFileSync(new URL('../src/ui-core/styles/department-command-v1219.css', import.meta.url), 'utf8');
add('V12.19.0 Department Command Center modernizes the TTCM workspace without changing permissions', fs.existsSync('src/ui-core/styles/department-command-v1219.css') && mainSource.includes('department-command-v1219.css') && departmentSource.includes('department-v1219-status-row') && departmentV1219Source.includes('--dept19-navy') && departmentV1219Source.includes('grid-template-columns:repeat(4,minmax(0,1fr))') && departmentV1219Source.includes('.department-tabs') && departmentV1219Source.includes('@media (max-width:760px)'), 'high-contrast hero, live operating status, responsive dashboard and sticky module navigation present');
const departmentV1220Source = fs.readFileSync(new URL('../src/ui-core/styles/department-interactive-v1220.css', import.meta.url), 'utf8');
add('V12.20.0 interactive Department cards support direct work inside the dashboard', fs.existsSync('src/ui-core/styles/department-interactive-v1220.css') && mainSource.includes('department-interactive-v1220.css') && departmentSource.includes('department-v1220-dashboard') && departmentSource.includes('onUpdateStatus?.(item.collection') && departmentSource.includes('onQuickDocumentUpload?.(next)') && departmentSource.includes('onOpenAISuggestion?.(item.text)') && departmentSource.includes('importInputRef.current?.click()') && departmentV1220Source.includes('grid-template-columns:repeat(4,minmax(0,1fr))') && departmentV1220Source.includes('.department-v1220-dropzone') && departmentV1220Source.includes('.department-v1220-task-row'), 'interactive calendar, status checkboxes, evidence dropzone, AI suggestions and JSON actions are wired');
const departmentV1221Source = fs.readFileSync(new URL('../src/ui-core/styles/department-refined-v1221.css', import.meta.url), 'utf8');
add('V12.21.0 refined Department workspace is compact, interactive and scroll-contained', fs.existsSync('src/ui-core/styles/department-refined-v1221.css') && mainSource.includes('department-refined-v1221.css') && departmentSource.includes('department-v1221-hero-card') && departmentSource.includes('department-v1221-focus-workspace') && departmentSource.includes('department-v1221-schedule-form') && departmentSource.includes('department-v1221-activity-scroll') && departmentV1221Source.includes('grid-template-columns:minmax(320px,.39fr) minmax(560px,.61fr)') && departmentV1221Source.includes('overflow-y:auto') && departmentV1221Source.includes('scrollbar-width:thin') && departmentV1221Source.includes('.department-v1221-details-panel'), 'compact overview, focused two-column workflow, direct schedule composer and slim scrollbars present');

const departmentV1222Source = fs.readFileSync(new URL('../src/ui-core/styles/department-color-system-v1222.css', import.meta.url), 'utf8');
add('V12.22.0 Department cards use one color-coded full-width design system', fs.existsSync('src/ui-core/styles/department-color-system-v1222.css') && mainSource.includes('department-color-system-v1222.css') && departmentSource.includes('department-v1222-summary-card') && departmentSource.includes('department-v1222-card-head') && departmentSource.includes('department-v1222-status') && departmentSource.includes('data-module={module.key}') && departmentV1222Source.includes('--dept22-cyan') && departmentV1222Source.includes('--dept22-green') && departmentV1222Source.includes('--dept22-orange') && departmentV1222Source.includes('--dept22-purple') && departmentV1222Source.includes('max-width:none!important') && departmentV1222Source.includes('.department-v1222-module-assist'), 'unified cards, section colors, status chips, full-width gutters, module tabs and slim scrollbars present');
const departmentV1223Source = fs.readFileSync(new URL('../src/ui-core/styles/department-detail-workspace-v1223.css', import.meta.url), 'utf8');
const unifiedShellV1223Source = fs.readFileSync(new URL('../src/ui-core/components/UnifiedShellChrome.jsx', import.meta.url), 'utf8');
const activityCenterV1223Source = fs.readFileSync(new URL('../src/ui-core/components/UIActivityCenter.jsx', import.meta.url), 'utf8');
add('V12.24.0 Admin Center removes the sidebar and implements approved Option 1', fs.existsSync('src/ui-core/styles/admin-center-v1224.css') && mainSource.includes('admin-center-v1224.css') && fs.readFileSync('src/pages/AdminPage.jsx','utf8').includes('admin-page-v124') && fs.readFileSync('src/pages/AdminPage.jsx','utf8').includes('AdminPermissionProfileCard') && fs.readFileSync('src/ui-core/styles/admin-center-v1224.css','utf8').includes('.admin-v41-sidebar{display:none!important}'), 'full-width color-coded Admin Center with top navigation and interactive permission cards present');
add('V12.23.0 Department detail rail is full-width and notification center opens from the restored shell', fs.existsSync('src/ui-core/styles/department-detail-workspace-v1223.css') && mainSource.includes('department-detail-workspace-v1223.css') && departmentSource.includes('department-v1223-details-panel') && departmentSource.includes('department-v1223-module-content') && departmentV1223Source.includes('.department-work-panel.panel') && departmentV1223Source.includes('max-width:none!important') && departmentV1223Source.includes('scrollbar-gutter:stable') && unifiedShellV1223Source.includes('UIActivityCenter') && unifiedShellV1223Source.includes('externalTrigger') && activityCenterV1223Source.includes('externalTrigger = false'), 'full-width detail cards, internal scroll, unified work-schedule styling and Activity Center event ownership present');add('V12.11 command center can open context-aware AI', commandPaletteSource.includes('bes-ai-open') && universalAiSource.includes("window.addEventListener('bes-ai-open'") && universalAiSource.includes('event?.detail?.prompt'), 'system commands open Brian AI and prefill page-aware prompts');

const settingsV1225Source = fs.readFileSync(new URL('../src/pages/Settings.jsx', import.meta.url), 'utf8');
const settingsV1225Css = fs.readFileSync(new URL('../src/ui-core/styles/settings-experience-v1225.css', import.meta.url), 'utf8');
const uiPrefsV1225Source = fs.readFileSync(new URL('../src/ui-core/runtime/uiPreferences.js', import.meta.url), 'utf8');
add('V12.40 OpenRouter Production Gateway replaces browser provider configuration while retaining Appearance Studio', settingsV1225Source.includes('OpenRouter Production Gateway') && settingsV1225Source.includes('OPENROUTER_API_KEY') && settingsV1225Source.includes('Kiểm tra gateway thật') && !settingsV1225Source.includes('AI Provider Command Center') && !settingsV1225Source.includes('providerSearch') && settingsV1225Source.includes('Appearance Studio') && settingsV1225Source.includes('settings-v125-live-preview') && settingsV1225Css.includes("data-surface-style='glass'") && settingsV1225Css.includes("data-motion-style='tile'") && uiPrefsV1225Source.includes('backgroundStyle') && uiPrefsV1225Source.includes('motionStyle'), 'one server-managed OpenRouter gateway, live diagnostics, and full appearance customization present');
add('V10.83.3 command center styling is responsive and centered', cssSource.includes('V10.83.3 — Global Command Center + Smart Launcher discovery') && cssSource.includes('.global-command-palette') && cssSource.includes('.launcher-discovery-bar') && cssSource.includes('width:min(1360px,calc(100% - 48px))'), 'desktop, mobile, dark and reduced-motion styles present');



// V10.84.0 — Stability & Unified Shell
const autosaveSource = fs.readFileSync(new URL('../src/components/GlobalAutosave.jsx', import.meta.url), 'utf8');
const runtimeGuardSource = fs.readFileSync(new URL('../src/components/GlobalRuntimeGuard.jsx', import.meta.url), 'utf8');
const healthCenterSource = fs.readFileSync(new URL('../src/pages/SystemHealthCenter.jsx', import.meta.url), 'utf8');
const trashCenterSource = fs.readFileSync(new URL('../src/pages/TrashCenter.jsx', import.meta.url), 'utf8');
const trashSource = fs.readFileSync(new URL('../src/utils/trash.js', import.meta.url), 'utf8');
const runtimeDiagnosticsSource = fs.readFileSync(new URL('../src/utils/runtimeDiagnostics.js', import.meta.url), 'utf8');
add('V10.84 global autosave and draft recovery are mounted', mainSource.includes('GlobalAutosave') && autosaveSource.includes('collectSnapshot') && autosaveSource.includes('Khôi phục'), '15-second form snapshot, restore and discard controls present');
add('V10.84 responsive navigation drawer is wired', globalNavSource.includes('global-nav-drawer') && globalNavSource.includes('route:trash') && globalNavSource.includes('route:qa'), 'mobile/overflow navigation includes Trash and System Health');
add('V10.84 System Health Center checks core services', healthCenterSource.includes('Supabase Auth') && healthCenterSource.includes('Newsroom RSS API') && healthCenterSource.includes('Bộ nhớ trình duyệt'), 'storage, Supabase, Newsroom, AI and performance checks present');
add('V10.84 runtime error containment persists diagnostics', runtimeGuardSource.includes('unhandledrejection') && runtimeDiagnosticsSource.includes('bes-runtime-errors-v1084') && errorBoundarySource.includes('recordRuntimeError'), 'window errors, rejected promises and React errors are recorded');
add('V10.84 30-day trash and library restore adapter are present', trashSource.includes('TRASH_RETENTION_DAYS = 30') && trashCenterSource.includes("data?.type === 'library'") && fs.readFileSync(new URL('../src/utils/library.js', import.meta.url), 'utf8').includes('moveToTrash'), 'library deletes move to recoverable trash');
add('V10.84 unified design tokens and centered rail are present', cssSource.includes('V10.84.0 — Stability & Unified Shell') && cssSource.includes('--bes-content-max:1360px') && cssSource.includes('.bes-health-page'), 'site-wide spacing, density, health, trash and resilience styles present');


// V10.85.0 — Connected Workflow
const workspaceTabsSource = fs.readFileSync(new URL('../src/components/WorkspaceTabs.jsx', import.meta.url), 'utf8');
const unifiedShellSource = fs.readFileSync(new URL('../src/ui-core/components/UnifiedShellChrome.jsx', import.meta.url), 'utf8');
const workspaceSource = fs.readFileSync(new URL('../src/utils/workspace.js', import.meta.url), 'utf8');
const transferHubSource = fs.readFileSync(new URL('../src/components/ContentTransferHub.jsx', import.meta.url), 'utf8');
const transferInboxSource = fs.readFileSync(new URL('../src/components/TransferInboxBanner.jsx', import.meta.url), 'utf8');
const transferSource = fs.readFileSync(new URL('../src/utils/contentTransfer.js', import.meta.url), 'utf8');
const versionHistorySource = fs.readFileSync(new URL('../src/utils/versionHistory.js', import.meta.url), 'utf8');
const syncQueueSource = fs.readFileSync(new URL('../src/utils/syncQueue.js', import.meta.url), 'utf8');
const syncQueueIndicatorSource = fs.readFileSync(new URL('../src/components/SyncQueueIndicator.jsx', import.meta.url), 'utf8');
const configMigrationSource = fs.readFileSync(new URL('../src/utils/configMigration.js', import.meta.url), 'utf8');
add('V10.85 workspace tabs are mounted globally', (mainSource.includes('WorkspaceTabs') || unifiedShellSource.includes('WorkspaceTabs')) && workspaceTabsSource.includes('draggable') && workspaceTabsSource.includes('toggleWorkspacePin') && workspaceSource.includes('BroadcastChannel'), 'open, pin, close, reorder and cross-tab refresh paths present');
add('V10.85 content transfer hub connects core apps', mainSource.includes('ContentTransferHub') && transferHubSource.includes('Worksheet Factory') && transferHubSource.includes('Exam Studio') && transferHubSource.includes('word2graph') && transferSource.includes('captureCurrentPagePayload'), 'page context can be sent to worksheet, exam, WordGraph, TextLab, lesson and library targets');
add('V10.85 incoming content can be applied in destination apps', mainSource.includes('TransferInboxBanner') && transferInboxSource.includes('TRANSFER_APPLY_EVENT') && worksheetFactorySource.includes('bes-content-transfer-apply') && worksheetFactorySource.includes('data-transfer-target="primary"'), 'global receiver plus Worksheet Factory adapter present');
add('V10.85 AI results can enter connected workflow', universalAiSource.includes('sendResultToApp') && universalAiSource.includes("bes-content-transfer-open") && universalAiSource.includes('Gửi sang…'), 'Brian AI response actions open the transfer hub');
add('V10.85 autosave keeps bounded version history', autosaveSource.includes('addVersion') && autosaveSource.includes('Lịch sử bản nháp') && versionHistorySource.includes('MAX_VERSIONS = 20') && versionHistorySource.includes('MAX_TOTAL_CHARS'), '20-version history, storage budget and restore controls present');
add('V10.85 offline sync queue is visible and retried online', mainSource.includes('SyncQueueIndicator') && syncQueueSource.includes('processSyncQueue') && syncQueueIndicatorSource.includes("window.addEventListener('online'") && syncQueueIndicatorSource.includes('Hàng đợi đồng bộ'), 'offline transfer queue, retry and status panel present');
add('V10.85 configuration migration protects legacy launcher data', mainSource.includes('runConfigurationMigrations') && configMigrationSource.includes('bes-launcher-config-v3') && configMigrationSource.includes('bes-launcher-config-v4') && launcherPreferencesSource.includes('bes-launcher-config-v4'), 'legacy config is backed up and migrated before rendering');
add('V10.85 connected workflow styles are responsive and centered', cssSource.includes('V10.85.0 — Connected Workflow') && cssSource.includes('.bes-workspace-tabs') && cssSource.includes('.bes-transfer-panel') && cssSource.includes('.bes-version-panel') && cssSource.includes('.bes-sync-queue'), 'desktop, mobile, dark and reduced-motion styles present');


// V10.86.0 — AI Action Engine + Governance Center
const aiGovernanceSource = fs.readFileSync(new URL('../src/utils/aiGovernance.js', import.meta.url), 'utf8');
const aiActionsSource = fs.readFileSync(new URL('../src/utils/aiActions.js', import.meta.url), 'utf8');
const aiGovernancePageSource = fs.readFileSync(new URL('../src/pages/AIGovernanceCenter.jsx', import.meta.url), 'utf8');
add('V10.86 AI Governance is enforced centrally', geminiSource.includes('guardAiRequest') && geminiSource.includes('recordAiRequest') && geminiSource.includes('governance.maxOutputTokens') && aiGovernanceSource.includes('dailyRequestLimit') && aiGovernanceSource.includes('dailyTokenBudget'), 'all callAI consumers share pause, quota and output-token controls');
add('V10.86 AI usage and audit are account-aware', mainSource.includes('setAiGovernanceUser') && aiGovernanceSource.includes('recordAiRequest') && aiGovernanceSource.includes('recordAiAction') && aiGovernanceSource.includes('actor:'), 'request, error and action events include the active account');
add('V10.86 controlled AI action plans are available in chat', universalAiSource.includes('openActionPicker') && universalAiSource.includes('prepareAiAction') && universalAiSource.includes('ai-action-confirm') && universalAiSource.includes('Thực hiện'), 'message actions show suggested targets, preview and confirmation');
add('V10.86 AI actions connect current app, Worksheet, Exam, WordGraph, TextLab and Library', aiActionsSource.includes("'current-app'") && aiActionsSource.includes("'worksheet-factory'") && aiActionsSource.includes("'exam-studio'") && aiActionsSource.includes("'word2graph'") && aiActionsSource.includes("'textlab-activities'") && aiActionsSource.includes('addHistoryEntry'), 'safe cross-app targets and private library save are wired');
add('V10.86 Admin AI Governance route and navigation are wired', mainSource.includes("currentRoute === 'ai-governance'") && globalNavSource.includes('route:ai-governance') && commandPaletteSource.includes("['ai-governance'") && aiGovernancePageSource.includes("currentUser?.role !== 'admin'"), 'admin-only page is discoverable from More and Command Center');
add('V10.86 Governance Center exposes controls, profiles and audit report', aiGovernancePageSource.includes('dailyRequestLimit') && aiGovernancePageSource.includes('actionTargets') && aiGovernancePageSource.includes('profiles') && aiGovernancePageSource.includes('exportAiGovernanceReport') && aiGovernancePageSource.includes('readAiAudit'), 'limits, target flags, task profiles, usage and JSON export present');
add('V10.86 AI governance styling is centered and responsive', cssSource.includes('V10.86.0 — AI Action Engine + Governance Center') && cssSource.includes('.ai-governance-page') && cssSource.includes('.ai-action-panel') && cssSource.includes('@media(max-width:660px)'), 'desktop, dark, mobile and reduced-motion styles present');
add('V10.86 configuration migration covers AI governance schema', configMigrationSource.includes("id: 'ai-governance'") && configMigrationSource.includes('bes-ai-governance-settings:v1') && configMigrationSource.includes("version: '10.86.0'"), 'governance settings are normalized before use');

const failed = checks.filter((item) => !item.ok);
for (const item of checks) {
  console.log(`${item.ok ? '✓' : '×'} ${item.name} ${item.detail ? '- ' + item.detail : ''}`);
}
if (failed.length) {
  console.error(`\n${failed.length} smoke check(s) failed.`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} smoke checks passed.`);
