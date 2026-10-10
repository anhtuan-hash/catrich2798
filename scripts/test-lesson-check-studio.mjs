import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => fs.readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const apps = read('src/data/apps.js');
const toolPage = read('src/pages/ToolPage.jsx');
const studio = read('src/pages/LessonCheckStudio.jsx');
const styles = read('src/pages/LessonCheckStudio.css');
const directory = read('src/pages/appsDirectoryData.js');
const design = read('src/data/designProfiles.js');
const vercel = read('vercel.json');

assert.match(apps, /slug: 'lesson-check-studio'/);
assert.match(apps, /titleVi: 'Kiểm tra bài'/);
assert.match(apps, /Iframe · HTML · URL · Chế độ dạy/);
assert.match(directory, /'lesson-check-studio'/);
assert.match(directory, /Dán iframe\/HTML và lưu thành từng hoạt động dạy học/);
assert.match(directory, /\['thpt-practice-hub', 'student-practice', 'lesson-check-studio'\]/);
assert.match(design, /'lesson-check-studio': \{[\s\S]*?styleVi: 'Kho hoạt động nhúng dùng trên lớp'/);

assert.match(toolPage, /const LessonCheckStudio = lazy\(\(\) => import\('\.\/LessonCheckStudio\.jsx'\)\)/);
assert.match(toolPage, /tool\?\.slug === 'lesson-check-studio'/);

assert.match(studio, /function parseEmbed\(raw\)/);
assert.match(studio, /new DOMParser\(\)\.parseFromString\(input, 'text\/html'\)/);
assert.match(studio, /doc\.querySelector\('iframe\[src\]'\)/);
assert.match(studio, /kind: 'html'/);
assert.match(studio, /srcDoc: embed\.source/);
assert.match(studio, /src: embed\.source/);
assert.match(studio, /allow-scripts allow-same-origin allow-forms/);
assert.match(studio, /allow-scripts allow-forms allow-popups/);
const srcDocSandbox = studio.match(/srcDoc: embed\.source,[\s\S]*?sandbox: '([^']+)'/)?.[1] || '';
assert.ok(srcDocSandbox, 'Raw HTML srcDoc sandbox must be declared.');
assert.doesNotMatch(srcDocSandbox, /allow-same-origin/, 'Raw HTML srcDoc must not receive allow-same-origin.');
assert.match(studio, /requestFullscreen/);
assert.match(studio, /Sao lưu/);
assert.match(studio, /Nhập thư viện/);
assert.match(studio, /X-Frame-Options/);
assert.match(studio, /CSP/);
assert.match(studio, /localStorage\.setItem/);
assert.match(studio, /skipNextStorageWriteRef/);
assert.match(studio, /activities\.map\(\(\{ embed, \.\.\.item \}\) => item\)/);
assert.match(studio, /Nhấn Trình chiếu để tải hoạt động/);
assert.doesNotMatch(studio, /<ActivityFrame embed=\{item\.embed\} className="lcs-card-frame"/, 'Library cards must not eagerly run every embedded iframe.');

assert.match(styles, /\.lcs-builder\{[\s\S]*?grid-template-columns:/);
assert.match(styles, /\.lcs-card-grid\{[\s\S]*?repeat\(3/);
assert.match(styles, /\.lcs-teach-overlay\{[\s\S]*?position:fixed/);
assert.match(styles, /@media\(max-width:720px\)/);

assert.match(vercel, /frame-src 'self' https:/, 'CSP must permit HTTPS iframe sources.');

console.log('Lesson Check Studio embed/activity contract PASS');
