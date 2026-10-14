import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = path => fs.readFileSync(new URL('../'+path, import.meta.url), 'utf8');
const page = read('src/pages/LessonCheckStudio.jsx');
const workbench = read('src/components/lessonCheck/Assessment4Workbench.jsx');
const service = read('src/utils/lessonCheckWorkbench.js');
const skin = read('src/pages/LessonCheckApprovedMockupOne.css');
const sql = read('supabase/migrations/20261014050000_lesson_check_atomic_favorites.sql');

test('Every game has a single accessible heart in its action row', () => {
 assert.match(page, /<div className="lcs-arcade-card-actions">\s*<button type="button"\s*className=\{favoriteSet\.has\(item\.id\)/);
 assert.match(page, /aria-label=\{favoriteSet\.has\(item\.id\)/);
 assert.match(page, /aria-pressed=\{favoriteSet\.has\(item\.id\)\}/);
 assert.match(page, /onClick=\{\(\) => toggleFavorite\(item\.id\)\}/);
 assert.match(page, /<Heart size=\{18\} fill=\{favoriteSet\.has\(item\.id\) \? 'currentColor' : 'none'\}/);
 assert.match(page, /disabled=\{!favoritesReady \|\| favoriteSavingIds\.includes\(item\.id\)\}/);
 assert.match(skin, /button\.lcs-favorite-heart\.is-saved/);
});

test('Favorite tab filters current-account activities while preserving access checks', () => {
 assert.match(page, /statusFilter === 'favorites' && !favoriteSet\.has\(item\.id\)/);
 assert.match(page, /statusFilter === 'favorites' \? 'is-active is-favorites' : 'is-favorites'/);
 assert.match(page, /setFocusFilter\('all'\); setStatusFilter\('favorites'\); setShowAccessQueue\(false\)/);
 assert.match(page, /Bạn chưa lưu trò chơi yêu thích nào/);
 assert.match(page, /Bạn chưa có hoạt động nào được cấp quyền/);
 assert.match(page, /if \(statusFilter === 'ready' && !open\) return false/);
 assert.match(page, /onClick=\{\(\) => openTeachingMode\(item\)\}/);
});

test('Favorite persistence uses an atomic per-account RPC, not a second local list', () => {
 assert.match(service,/export async function setAssessmentFavorite\(/);
 assert.match(service,/supabase\.rpc\('lesson_check_set_favorite'/);
 assert.doesNotMatch(service,/user_id: userId, favorites: normalized\.favorites/);
 assert.match(workbench,/favoriteIds=\[\], onToggleFavorite/);
 assert.match(workbench,/const star=id=>onToggleFavorite\?\.\(id\)/);
 assert.match(workbench,/favorite=\{favoriteIds\.includes\(item\.id\)\}/);
 assert.match(page,/favoriteIds=\{favoriteIds\} onToggleFavorite=\{toggleFavorite\}/);
 assert.match(page,/loadAssessmentWorkspace\(favoriteUserId\)/);
 assert.match(page,/favoriteInFlightRef\.current\.has\(activityId\)/);
 assert.doesNotMatch(page,/localStorage\.setItem\(/);
});

test('RPC verifies teacher identity and activity and updates favorites only', () => {
 assert.match(sql,/auth\.uid\(\)/);
 assert.match(sql,/public\.lesson_check_is_approved_user\(\)/);
 assert.match(sql,/from public\.lesson_check_activities where id=p_activity/);
 assert.match(sql,/on conflict\(user_id\) do update/);
 assert.match(sql,/array_append\(/);
 assert.match(sql,/array_remove\(/);
 assert.match(sql,/revoke all on function public\.lesson_check_set_favorite\(uuid,boolean\) from public,anon/);
 assert.match(sql,/grant execute on function public\.lesson_check_set_favorite\(uuid,boolean\) to authenticated/);
 assert.doesNotMatch(sql,/delete from public\.lesson_check_activities/i);
});
