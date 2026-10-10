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
const directory = read('src/pages/appsDirectoryData.js');
const design = read('src/data/designProfiles.js');
const vercel = read('vercel.json');

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
assert.match(studio, /Đang chờ TTCM duyệt/);
assert.match(studio, /TTCM · PHÂN QUYỀN TỪNG HOẠT ĐỘNG/);
assert.match(studio, /reviewLessonCheckAccessRequest/);
assert.match(studio, /setLessonCheckTeacherAccess/);
assert.match(studio, /canPublishDepartment\(currentUser\)/);
assert.match(studio, /requestFullscreen/);

// Cards never eagerly run all iframes; content only loads in editor/teaching mode.
assert.doesNotMatch(studio, /filteredActivities\.map[\s\S]{0,1500}<ActivityFrame/, 'Catalog cards must not eagerly execute iframe content.');
assert.match(studio, /getLessonCheckActivityContent\(item\.id\)/);

assert.match(styles, /\.lcs-quick-grid\{[\s\S]*?grid-template-columns:/);
assert.match(styles, /\.lcs-card\.is-locked/);
assert.match(styles, /\.lcs-access-dialog/);
assert.match(styles, /\.lcs-teach-overlay\{[\s\S]*?position:fixed/);
assert.match(styles, /@media\(max-width:720px\)/);

assert.match(vercel, /frame-src 'self' https:/, 'CSP must permit HTTPS iframe sources.');

console.log('Lesson Check Studio Global Success + Supabase access contract PASS');
