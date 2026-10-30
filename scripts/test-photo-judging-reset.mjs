import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
const ui = source('src/components/PhotoJudgingAdmin.jsx');
const css = source('src/components/PhotoJudging.css');
const api = source('supabase/functions/photo-judging/index.ts');
const sql = source('supabase/migrations/20261030000053_photo_judging_reset_scores.sql');
const gallery = source('src/pages/PhotoSlideshow.jsx');

assert.ok(ui.includes("run('admin:reset-scores',{inviteId:j.id})"), 'Button must target one judge only');
assert.ok(ui.includes("session.status==='open'&&!j.revoked_at&&(j.progress>0||j.submitted_at)"), 'Only active, scored judges may be reset');
assert.ok(ui.includes("window.confirm('Xóa toàn bộ"), 'Destructive action needs explicit confirmation');
assert.ok(ui.includes('KHÔNG THỂ hoàn tác'), 'Warn that scoring deletion is irreversible');
assert.ok(ui.includes('Giám khảo sử dụng liên kết cũ'), 'Judge keeps their existing link');
assert.ok(ui.includes('setData(result)'), 'Dashboard must update after a successful reset');
assert.ok(css.includes('.bj-judge .bj-reset-scores'), 'Reset button styled distinctly');
assert.ok(gallery.includes('isAdminRole(currentUser?.role) && <PhotoJudgingAdmin'), 'Admin panel remains role gated');

const adminBlock = api.slice(api.indexOf('if (action.startsWith("admin:"))'), api.indexOf('if (action.startsWith("judge:"))'));
assert.ok(adminBlock.includes('await requireAdmin(req)'), 'Server validates admin role before reset');
assert.ok(adminBlock.includes('if (action === "admin:reset-scores")'), 'Server routes reset action');
assert.ok(adminBlock.includes('session.status !== "open"'), 'Reset refused for closed or draft sessions');
assert.ok(adminBlock.includes('db.rpc("bes_judging_reset_scores"'), 'Reset uses an atomic database function');
assert.ok(adminBlock.includes('p_session_id:session.id,p_invite_id:inviteId'), 'RPC scopes invite to current session');
assert.ok(!adminBlock.includes('.delete().eq("invite_id"'), 'No non-atomic browser/admin deletion flow');

assert.match(sql, /security invoker/i, 'No privileged security-definer bypass');
assert.match(sql, /for update/g, 'Guard against concurrent session closing');
assert.match(sql, /delete from public\.bes_judging_scores\s+where invite_id = v_invite/i, 'Delete only selected invite scores');
assert.match(sql, /set submitted_at = null\s+where id = v_invite/i, 'Open only selected judge ballot');
assert.match(sql, /revoke all on function public\.bes_judging_reset_scores\(uuid,uuid\) from public, anon, authenticated/i, 'Deny direct browser RPC');
assert.match(sql, /grant execute on function public\.bes_judging_reset_scores\(uuid,uuid\) to service_role/i, 'Service-only execution');
assert.ok(!/update\s+public\.bes_judging_sessions\s+set\s+status\s*=/.test(sql), 'Reset cannot reopen a closed competition');
console.log('Per-judge score reset contracts PASS');
