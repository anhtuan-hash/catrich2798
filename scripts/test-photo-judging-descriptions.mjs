import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { HALLOWEEN_JURY_DESCRIPTIONS_VI, getJudgeArtworkVietnamese } from '../src/utils/photoJudgingDescriptions.js';

const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const api = read('supabase/functions/photo-judging/index.ts');
const guest = read('src/components/PhotoJudgingPage.jsx');
const css = read('src/components/PhotoJudging.css');
const translations = read('src/utils/judgingTranslations.js');

const entries = Object.entries(HALLOWEEN_JURY_DESCRIPTIONS_VI);
assert.equal(entries.length, 18, 'Each of 18 Halloween artworks must have a translation');
for (const [id, description] of entries) {
  assert.match(id, /^[0-9a-f-]{36}$/);
  assert.ok(description.en.length > 60, 'English statement must be present: ' + id);
  assert.ok(description.vi.length > 60, 'Vietnamese translation must be present: ' + id);
  assert.ok(!/^\s*(?:Lớp|Class)?\s*\d{1,2}\.\d{1,2}\b/i.test(description.en), 'No identifying class in English');
  assert.ok(!/^\s*(?:Lớp|Class)?\s*\d{1,2}\.\d{1,2}\b/i.test(description.vi), 'No identifying class in Vietnamese');
  assert.equal(getJudgeArtworkVietnamese(id, description.en), description.vi);
  assert.equal(getJudgeArtworkVietnamese(id, description.en.replace(/ /g, '  ')), description.vi, 'Whitespace changes are benign');
  assert.equal(getJudgeArtworkVietnamese(id, description.en + ' changed'), '', 'Stale translation never shown after a source edit');
}
const [firstId, first] = entries[0];
assert.equal(getJudgeArtworkVietnamese(firstId, ''), '');
assert.equal(getJudgeArtworkVietnamese('00000000-0000-0000-0000-000000000000', first.en), '');

const loadSection = api.slice(api.indexOf('if (action === "judge:load")'), api.indexOf('if (session.status !== "open" || judge.submitted_at)'));
assert.ok(api.includes('function anonymousArtworkDescription('));
assert.ok(api.includes('raw.slice(separator + 1).trim().slice(0, 300)'), 'Remove class/team identity before returning description');
assert.ok(api.includes('return separator < 0 ? ""'), 'Fail closed when identity separator is missing');
assert.ok(loadSection.includes('.eq("album_id",session.album_id).in("id",slideIds)'), 'Only fetch artwork descriptions belonging to current judged album');
assert.ok(loadSection.includes('description:descriptions.get(s.id) || ""'), 'Guest response uses sanitized description');
assert.ok(!loadSection.includes('caption:') && !loadSection.includes('group_name:'), 'No raw artwork captions or class identities to guest');
assert.ok(guest.includes('getJudgeArtworkVietnamese(current?.id,current?.description)'), 'Current slide selects correct VI translation');
assert.ok(guest.includes('{current.description}'), 'English source is displayed');
assert.ok(guest.includes('{descriptionVi||'), 'Vietnamese translation is displayed');
assert.ok(guest.includes('lang="en"') && guest.includes('lang="vi"'), 'Language is indicated for accessibility');
assert.ok(guest.includes('bj-artwork-story-body'), 'Bilingual description card exists');
assert.ok(css.includes('grid-template-columns:repeat(2,minmax(0,1fr))'), 'Desktop side-by-side descriptions');
assert.ok(css.includes('@media(max-width:850px)'), 'Mobile descriptions responsive');
assert.ok(translations.includes('"MÔ TẢ & THÔNG ĐIỆP TÁC PHẨM"') && translations.includes('"BẢN DỊCH TIẾNG VIỆT"'), 'Static text covered by i18n audit');
console.log('Halloween 18 artwork description + blind judging bilingual contracts PASS');
