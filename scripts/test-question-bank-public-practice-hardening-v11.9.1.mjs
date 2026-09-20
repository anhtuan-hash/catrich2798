import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync('supabase/qb_public_practice_hardening_v11_9_1.sql','utf8');

for (const token of [
  "extensions.digest(coalesce(p_token,''),'sha256')",
  "token_hash in (",
  "md5(coalesce(p_token,''))",
  "metadata->>'shareTokenId'=v_share.id::text",
  "assessment_practice_attempts_public_session_uniq_v1191",
  "'replayed',v_existing",
  "'invalid_response_payload'",
  "'response_payload_too_large'",
  "v_practice.status<>'published'",
]) {
  assert.ok(sql.includes(token), 'Missing Question Bank public-practice hardening contract: '+token);
}

assert.ok(sql.includes("revoke execute on function public.qb_create_practice_share"), 'Share creation must not be anonymous.');
assert.ok(sql.includes("grant execute on function public.qb_public_practice_get(text) to anon"), 'Public practice GET must remain anonymous.');
assert.ok(sql.includes("grant execute on function public.qb_public_practice_submit(text,uuid,text,jsonb) to anon"), 'Public practice SUBMIT must remain anonymous.');

console.log('PASS: Question Bank public practice v11.9.1 hardening contract is present.');
