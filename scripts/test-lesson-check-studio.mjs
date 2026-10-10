import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const apps = read('src/data/apps.js');
const toolPage = read('src/pages/ToolPage.jsx');
const studio = read('src/pages/LessonCheckStudio.jsx');
const styles = read('src/pages/LessonCheckStudio.css');
const service = read('src/utils/lessonCheckActivities.js');
const catalog = read('src/data/globalSuccessCatalog.js');
const migration = read('supabase/migrations/20261010081500_lesson_check_activity_access.sql');
const focusMigration = read('supabase/migrations/20261010093500_lesson_check_focus_tags.sql');
const assessmentMigration = read('supabase/migrations/20261010103000_fun_for_assessment_sessions.sql');
const assignedRosterMigration = read('supabase/migrations/20261010104500_fun_for_assessment_assigned_rosters.sql');
const assessmentService = read('src/utils/lessonCheckAssessment.js');
const assessmentWorkspace = read('src/components/lessonCheck/AssessmentWorkspace.jsx');
const assessmentStyles = read('src/components/lessonCheck/AssessmentWorkspace.css');
const directory = read('src/pages/appsDirectoryData.js');
const design = read('src/data/designProfiles.js');
const vercel = read('vercel.json');
const permissions = read('src/utils/permissions.js');

assert.match(apps, /slug: 'lesson-check-studio'/);
assert.match(apps, /titleVi: 'Kiểm tra bài'/);
assert.match(directory, /'lesson-check-studio'/);
assert.match(design, /'lesson-check-studio': \{[\s\S]*?styleVi: 'Kho hoạt động nhúng dùng trên lớp'/);
assert.match(toolPage, /const LessonCheckStudio = lazy\(\(\) => import\('\.\/LessonCheckStudio\.jsx'\)\)/);
assert.match(toolPage, /tool\?\.slug === 'lesson-check-studio'/);

// Embed support stays sandboxed. Raw srcDoc never receives same-origin.
assert.match(studio, /function parseEmbed\(raw\)/);
assert.match(studio, /doc\.querySelector\('iframe\[src\]'\)/);
assert.match(studio, /srcDoc: embed\?\.source/);
assert.match(studio, /src: embed\.source/);
assert.match(studio, /allow-scripts allow-same-origin allow-forms/);
const srcDocSandbox = studio.match(/srcDoc: embed\?\.source \|\| '',[\s\S]*?sandbox: '([^']+)'/)?.[1] || '';
assert.ok(srcDocSandbox, 'Raw HTML srcDoc sandbox must be declared.');
assert.doesNotMatch(srcDocSandbox, /allow-same-origin/, 'Raw HTML srcDoc must not receive allow-same-origin.');

// Global Success quick selectors: 10/11/12 + 10 units + lesson dropdown.
for (const grade of ['10', '11', '12']) {
  assert.match(catalog, new RegExp(`\\b${grade}: \\[`), `Global Success grade ${grade} must exist.`);
}
assert.match(catalog, /'Global warming'/);
assert.match(catalog, /'Life stories we admire'/);
assert.match(catalog, /'Lifelong learning'/);
assert.match(catalog, /Communication and Culture \/ CLIL/);
assert.match(studio, /Chọn nhanh theo SGK Global Success/);
assert.match(studio, /unitOptionsForGrade\(draft\.grade\)/);
assert.match(studio, /GLOBAL_SUCCESS_LESSONS\.map/);

// Supabase is authoritative; localStorage persistence is retired.
assert.match(service, /supabase\.rpc\('lesson_check_list_activities'/);
assert.match(service, /supabase\.rpc\('lesson_check_get_activity_content'/);
assert.match(service, /supabase\.rpc\('lesson_check_save_activity'/);
assert.match(service, /supabase\.rpc\('lesson_check_request_access'/);
assert.match(service, /supabase\.rpc\('lesson_check_list_teacher_access'/);
assert.match(service, /supabase\.rpc\('lesson_check_set_teacher_access'/);
assert.match(permissions, /slug === 'lesson-check-studio'\) return user\.approved !== false/, 'Lesson Check app shell must stay visible to approved teachers; activities carry the actual lock.');
assert.doesNotMatch(studio, /localStorage\./);
assert.doesNotMatch(service, /localStorage\./);

// Teachers can discover metadata but content is a separate protected table.
assert.match(migration, /create table if not exists public\.lesson_check_activities/);
assert.match(migration, /create table if not exists public\.lesson_check_activity_content/);
assert.match(migration, /create table if not exists public\.lesson_check_activity_grants/);
assert.match(migration, /create table if not exists public\.lesson_check_activity_requests/);
assert.match(migration, /create policy "Approved users can read lesson check activity metadata"/);
assert.match(migration, /create policy "Granted users can read lesson check content"/);
assert.match(migration, /public\.lesson_check_has_activity_access\(activity_id\)/);
assert.match(migration, /create unique index if not exists lesson_check_pending_request_unique/);
assert.match(migration, /lesson_check_review_access_request/);
assert.match(migration, /lesson_check_list_teacher_access/);
assert.match(migration, /lesson_check_set_teacher_access/);
assert.match(migration, /security definer/g);

// UX: locked cards remain visible, request access, TTCM grants per activity.
assert.match(studio, /activity\.requestStatus === 'pending'/);
assert.match(studio, /Xin quyền/);
assert.match(studio, /Đang chờ duyệt/);
assert.match(studio, /TTCM · PHÂN QUYỀN TỪNG HOẠT ĐỘNG/);
assert.match(studio, /reviewLessonCheckAccessRequest/);
assert.match(studio, /setLessonCheckTeacherAccess/);
assert.match(studio, /canPublishDepartment\(currentUser\)/);
assert.match(studio, /requestFullscreen/);

// Card previews load only near the viewport and only for users who already have access.
assert.match(studio, /function ActivityCardPreview\(/);
assert.match(studio, /new IntersectionObserver/);
assert.match(studio, /rootMargin: '220px 0px'/);
assert.match(studio, /const loadingRef = useRef\(false\)/);
assert.match(studio, /const \[activated, setActivated\] = useState\(Boolean\(cachedEmbed\)\)/);
assert.match(studio, /if \(entry\.isIntersecting\) \{\s*setActivated\(true\);\s*observer\.disconnect\(\);/);
assert.match(studio, /if \(!canLoad \|\| !activated \|\| embed \|\| loadingRef\.current\)/);
assert.match(studio, /loadingRef\.current = true/);
assert.match(studio, /\.finally\(\(\) => \{\s*loadingRef\.current = false;/);
assert.match(studio, /const showLivePreview = canLoad && activated && embed/);
assert.doesNotMatch(studio, /setNearViewport\(/, 'Preview must not unmount when scrolled out of view.');
assert.doesNotMatch(studio, /showLivePreview = canLoad && nearViewport/, 'Scrolling away must not tear down a loaded iframe.');
assert.match(studio, /getLessonCheckActivityContent\(activity\.id\)/);
assert.match(studio, /cardPreviewCache\.set\(activity\.id, parsed\)/);
assert.match(studio, /<ActivityCardPreview[\s\S]*?canLoad=\{!locked\}/);
assert.match(studio, /lcs-card-preview-frame/);
assert.match(studio, /role="button"/);
assert.match(studio, /Xem trước bị khóa/);
assert.match(studio, /Đang chờ duyệt/);
assert.match(studio, /Không tải được hình xem trước/);
assert.match(studio, /getLessonCheckActivityContent\(item\.id\)/);

// Padlet Arcade-inspired gallery: 12/page, focus tabs, compact filters and visual category indicators.
assert.match(studio, /const \[unitFilter, setUnitFilter\] = useState\('all'\)/);
assert.match(studio, /const \[lessonFilter, setLessonFilter\] = useState\('all'\)/);
assert.match(studio, /const \[focusFilter, setFocusFilter\] = useState\('all'\)/);
assert.match(studio, /const \[accessFilter, setAccessFilter\] = useState\('all'\)/);
assert.match(studio, /const \[sortMode, setSortMode\] = useState\('newest'\)/);
assert.match(studio, /const pageSize = 12/);
assert.match(studio, /const paginationPages = useMemo/);
assert.match(studio, /pagedActivities\.map\(\(item\) =>/);
assert.match(studio, /FOCUS_OPTIONS/);
assert.match(studio, /Vocabulary/);
assert.match(studio, /Grammar/);
assert.match(studio, /Chuyên đề \/ kỹ năng/);
assert.match(studio, /Hãy chọn chuyên đề/);
assert.match(studio, /lcs-arcade-head/);
assert.match(studio, /BRIAN ACTIVITY ARCADE/);
assert.match(studio, /Fun for Assessment/);
assert.match(studio, /Đổi mới kiểm tra đánh giá/);
assert.match(studio, /lcs-hero-statline/);
assert.match(studio, /lcs-hero-deck/);
assert.match(studio, /lcs-arcade-tabs/);
assert.match(studio, /Xin quyền truy cập/);
assert.match(studio, /const \[showAccessQueue, setShowAccessQueue\] = useState\(false\)/);
assert.match(studio, /requests\.filter\(\(item\) => item\.status === 'pending'\)\.map/);
assert.match(studio, /reviewRequest\(request, 'approved'\)/);
assert.match(studio, /reviewRequest\(request, 'rejected'\)/);
assert.match(studio, /lcs-access-queue/);
assert.match(studio, /lcs-arcade-search/);
assert.match(studio, /lcs-arcade-filterbar/);
assert.match(studio, /lcs-arcade-grid/);
assert.match(studio, /lcs-focus-indicator/);
assert.match(studio, /lcs-focus-chip/);
assert.match(studio, /TẠO/);
assert.match(studio, /setShowBuilder\(true\)/);
assert.doesNotMatch(studio, /<aside className="lcs-library-sidebar">/, 'Padlet-style gallery should not squeeze cards beside a permanent sidebar.');

assert.match(service, /focusArea: String\(row\.focus_area \|\| 'unclassified'\)/);
assert.match(service, /\.update\(\{ focus_area: focusArea \}\)/);
assert.match(focusMigration, /add column if not exists focus_area text not null default 'unclassified'/);
assert.match(focusMigration, /vocabulary','grammar','reading','listening','speaking','mixed','unclassified/);
assert.match(focusMigration, /a\.activity_type, a\.focus_area, a\.notes/);

assert.match(styles, /V8 · Padlet Arcade-inspired gallery \+ learning-focus indicators/);
assert.match(styles, /V9 · Premium Activity Arcade hero/);
assert.match(styles, /V10 · Fun for Assessment \+ access-request review/);
assert.match(styles, /\.lcs-access-queue\{/);
assert.match(styles, /\.lcs-arcade-tabs button\.is-access-request/);
assert.match(styles, /\.lcs-arcade-head\{[\s\S]*?min-height:150px/);
assert.match(styles, /\.lcs-arcade-title-row h1\{[\s\S]*?font-size:43px/);
assert.match(styles, /\.lcs-hero-statline\{/);
assert.match(styles, /\.lcs-hero-deck\{/);
assert.match(styles, /\.lcs-arcade-create\{[\s\S]*?background:#171714/);
assert.match(styles, /\.lcs-arcade-library\{/);
assert.match(styles, /\.lcs-arcade-tabs\{/);
assert.match(styles, /\.lcs-arcade-grid\{[\s\S]*?repeat\(4,minmax\(0,1fr\)\)/);
assert.match(styles, /\.lcs-arcade-card \.lcs-card-media\{[\s\S]*?aspect-ratio:1\.48\/1/);
assert.match(styles, /\.lcs-focus-indicator\.is-vocabulary/);
assert.match(styles, /\.lcs-focus-indicator\.is-grammar/);
assert.match(styles, /\.lcs-focus-chip\.is-vocabulary/);
assert.match(styles, /\.lcs-focus-chip\.is-grammar/);
assert.match(styles, /@media\(max-width:1280px\)/);
assert.match(styles, /@media\(max-width:900px\)/);
assert.match(styles, /@media\(max-width:620px\)/);
assert.match(styles, /\.lcs-access-dialog/);
assert.match(styles, /\.lcs-teach-overlay\{[\s\S]*?position:fixed/);

// Fun for Assessment end-to-end workflow.
assert.match(studio, /import AssessmentWorkspace from '\.\.\/components\/lessonCheck\/AssessmentWorkspace\.jsx'/);
assert.match(studio, /Bắt đầu đánh giá/);
assert.match(studio, /setAssessmentWorkspaceView\('reports'\)/);
assert.match(studio, /<AssessmentWorkspace[\s\S]*?onLaunchActivity=\{openTeachingMode\}/);

assert.match(assessmentService, /lesson_check_list_assigned_class_rosters/);
assert.match(assessmentService, /lesson_check_save_assessment_session/);
assert.match(assessmentService, /lesson_check_list_assessment_sessions/);
assert.match(assessmentService, /lesson_check_list_assessment_results/);
assert.doesNotMatch(assessmentService, /localStorage\./);

assert.match(assessmentWorkspace, /Gọi tên ngẫu nhiên/);
assert.match(assessmentWorkspace, /Chia nhóm ngẫu nhiên/);
assert.match(assessmentWorkspace, /const randomPick = \(\) =>/);
assert.match(assessmentWorkspace, /const randomGroups = \(\) =>/);
assert.match(assessmentWorkspace, /Lớp được phân công/);
assert.match(assessmentWorkspace, /Mục đích đánh giá/);
assert.match(assessmentWorkspace, /Kết quả gốc/);
assert.match(assessmentWorkspace, /Điểm \/10/);
assert.match(assessmentWorkspace, /Điều chỉnh sau đánh giá/);
assert.match(assessmentWorkspace, /Báo cáo kiểm tra đánh giá/);
assert.match(assessmentWorkspace, /Excel\/CSV/);
assert.match(assessmentWorkspace, /In \/ PDF/);
assert.match(assessmentWorkspace, /Độ phủ/);
assert.match(assessmentWorkspace, /Hồ sơ đánh giá học sinh/);
assert.match(assessmentWorkspace, /saveAssessmentSession\(sessionPayload\(\{ status: 'completed' \}\)\)/);

assert.match(assessmentMigration, /create table if not exists public\.lesson_check_assessment_sessions/);
assert.match(assessmentMigration, /create table if not exists public\.lesson_check_assessment_results/);
assert.match(assessmentMigration, /teaching_adjustment text not null default ''/);
assert.match(assessmentMigration, /participation_mode in \('individual','group'\)/);
assert.match(assessmentMigration, /scoring_mode in \('manual','points','correct_answers','rubric','completion','ranking','other'\)/);
assert.match(assessmentMigration, /lesson_check_save_assessment_session/);
assert.match(assessmentMigration, /lesson_check_list_assessment_sessions/);
assert.match(assessmentMigration, /lesson_check_list_assessment_results/);
assert.match(assignedRosterMigration, /lesson_check_list_assigned_class_rosters/);
assert.match(assignedRosterMigration, /get_my_assigned_school_classes\(\)/);
assert.match(assignedRosterMigration, /bes_class_rosters/);
assert.match(assignedRosterMigration, /jsonb_set\([\s\S]*?'\{students\}'/);
assert.match(assessmentMigration, /teacher_id = auth\.uid\(\) or public\.lesson_check_is_leader\(\)/);

assert.match(assessmentStyles, /\.f4a-overlay\{/);
assert.match(assessmentStyles, /\.f4a-student-grid\{/);
assert.match(assessmentStyles, /\.f4a-activity-grid\{/);
assert.match(assessmentStyles, /\.f4a-score-table\{/);
assert.match(assessmentStyles, /\.f4a-report-stats\{/);

assert.match(vercel, /frame-src 'self' https:/, 'CSP must permit HTTPS iframe sources.');

console.log('Lesson Check Studio Global Success + Supabase access contract PASS');
