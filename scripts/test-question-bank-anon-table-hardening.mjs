import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync('supabase/question_bank_anon_table_hardening_v11_9_5.sql','utf8');
const practice = fs.readFileSync('supabase/question_bank_public_practice_v11_8_0.sql','utf8');

assert.match(sql,/relname like 'assessment_%'/);
assert.match(sql,/revoke all privileges on table/i);
assert.match(sql,/from anon/i);

assert.match(sql,/qb_public_practice_get\(text\)/);
assert.match(sql,/qb_public_practice_submit\(text,uuid,text,jsonb\)/);
assert.match(sql,/grant execute on function public\.qb_public_practice_get\(text\) to anon,authenticated/i);
assert.match(sql,/grant execute on function public\.qb_public_practice_submit\(text,uuid,text,jsonb\) to anon,authenticated/i);

assert.match(practice,/where token_hash=md5\(coalesce\(p_token,''\)\) and active=true/i);
assert.match(practice,/expires_at is not null and .*expires_at<now\(\)/i);
assert.match(practice,/attempt_limit/i);

console.log('PASS: Question Bank exposes anonymous student practice only through token-gated RPCs, not direct assessment table grants.');
