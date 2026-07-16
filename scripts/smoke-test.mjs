import assert from 'node:assert/strict';
import fs from 'node:fs';
import { ACTIVITY_TEMPLATES, SAMPLE_CONTENT, buildTeacherText, parseActivity } from '../src/utils/activityEngine.js';
import { bankToText, parseMcqFromText } from '../src/utils/library.js';
import { APPS, GAME_APPS, SPECIAL_TOOLS } from '../src/data/apps.js';
import { createDefaultLauncherConfig, normalizeLauncherConfig } from '../src/utils/launcherPreferences.js';

const retiredSlugs = [
  'worksheet-factory', 'exam-studio', 'reading-studio', 'smart-id',
  'speaking-studio', 'student-practice', 'writing-studio', 'pronunciation-coach',
];

for (const template of ACTIVITY_TEMPLATES) {
  const parsed = parseActivity(template.id, SAMPLE_CONTENT[template.id] || '');
  assert.equal(parsed.ok, true, `Activity parser failed for ${template.id}`);
  assert.ok(buildTeacherText(`Sample ${template.title}`, template.id, parsed.data).length > 20);
}

const sample = `1. While I _____ dinner, the phone rang.\nA. was cooking\nB. cooked\nC. cook\nD. have cooked\nAnswer: A\n\n2. They _____ TV when the lights went out. A. watched B. were watching C. watch D. have watched Answer: B`;
const questions = parseMcqFromText(sample, { level: 'B2-C1', source: 'smoke' });
assert.equal(questions.length, 2);
assert.equal(questions[0].answer, 'A');
assert.equal(questions[1].answer, 'B');
assert.match(bankToText(questions, true), /Answer: A/);

const activeItems = [...APPS, ...GAME_APPS, ...SPECIAL_TOOLS];
const activeSlugs = new Set(activeItems.map((item) => item.slug));
for (const slug of retiredSlugs) assert.equal(activeSlugs.has(slug), false, `${slug} remains active`);
assert.ok(activeItems.length > 5, 'The app catalog should retain the non-retired applications');
assert.ok(activeItems.every((item) => item.api === true), 'All active app cards must retain their API capability flag');

const ids = activeItems.map((item) => item.slug);
const defaults = createDefaultLauncherConfig(ids);
const normalized = normalizeLauncherConfig({ ...defaults, pinned: [...retiredSlugs, ...ids] }, ids);
for (const slug of retiredSlugs) assert.equal(normalized.pinned.includes(slug), false, `${slug} survived launcher normalization`);

const visibleSources = [
  'src/main.jsx',
  'src/data/apps.js',
  'src/pages/Home.jsx',
  'src/pages/WebApps.jsx',
  'src/pages/ToolPage.jsx',
  'src/ui-core/components/UICommandCenter.jsx',
].map((filePath) => fs.readFileSync(filePath, 'utf8').toLowerCase()).join('\n');
for (const slug of retiredSlugs) assert.equal(visibleSources.includes(slug), false, `${slug} remains in a visible source`);
assert.equal(visibleSources.includes("#/practice"), false, 'The retired practice route remains visible');

console.log(`Smoke tests passed: ${ACTIVITY_TEMPLATES.length} activity templates, ${activeItems.length} active applications, 8 retired applications removed.`);
