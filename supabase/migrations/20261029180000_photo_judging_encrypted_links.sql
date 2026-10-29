-- Photo Story judging link recovery: encrypted copies for new or reissued tokens.
-- Existing SHA-256 token hashes remain untouched; no legacy token can be recovered.
alter table public.bes_judging_invites
  add column if not exists token_ciphertext text,
  add column if not exists token_iv text;

alter table public.bes_judging_invites
  drop constraint if exists bes_judging_invites_cipher_pair_ck;
alter table public.bes_judging_invites
  add constraint bes_judging_invites_cipher_pair_ck
  check (
    (token_ciphertext is null and token_iv is null)
    or
    (token_ciphertext is not null and token_iv is not null and
     length(token_ciphertext) between 40 and 256 and length(token_iv) between 16 and 28)
  );
-- Restrict Data API access as before; ciphertext is never returned in dashboard payloads.
revoke all on public.bes_judging_invites from anon, authenticated;
grant all on public.bes_judging_invites to service_role;
comment on column public.bes_judging_invites.token_ciphertext is
  'AES-GCM encrypted judge link token, server only. Older invitations have NULL and must be explicitly reissued.';
comment on column public.bes_judging_invites.token_iv is
  'AES-GCM 96-bit nonce, randomly generated per issue/reissue, server only.';
