-- Freeze ONLY the Halloween Showcase judging at 15:15 ICT on 30/10/2026.
create or replace function public.bes_halloween_judge_cutoff_2026()
returns trigger language plpgsql set search_path='' as $fn$
declare jid uuid;
begin
 if clock_timestamp() < timestamptz '2026-10-30 08:15:00+00' then
  if tg_op='DELETE' then return old; end if;
  return new;
 end if;
 jid:=case when tg_op='DELETE' then old.invite_id else new.invite_id end;
 if exists (
  select 1 from public.bes_judging_invites i
  join public.bes_judging_sessions s on s.id=i.session_id
  where i.id=jid
    and s.album_id='e1fc3295-2c5d-4e05-8538-b9a7aeef5a67'
 ) then raise exception 'Phiên chấm Halloween đã đóng lúc 15:15, ngày 30/10/2026'; end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $fn$;
revoke all on function public.bes_halloween_judge_cutoff_2026() from public,anon,authenticated;
create or replace trigger bes_halloween_judge_cutoff_2026
before insert or update or delete on public.bes_judging_scores
for each row execute function public.bes_halloween_judge_cutoff_2026();

create or replace function public.bes_halloween_ballot_cutoff_2026()
returns trigger language plpgsql set search_path='' as $fn$
begin
 if clock_timestamp() >= timestamptz '2026-10-30 08:15:00+00'
  and (tg_op='DELETE' or new.submitted_at is distinct from old.submitted_at or new.revoked_at is distinct from old.revoked_at)
  and exists (select 1 from public.bes_judging_sessions s
     where s.id=old.session_id
     and s.album_id='e1fc3295-2c5d-4e05-8538-b9a7aeef5a67')
  then raise exception 'Phiếu giám khảo Halloween đã khóa lúc 15:15'; end if;
 if tg_op='DELETE' then return old; end if;
 return new;
end $fn$;
revoke all on function public.bes_halloween_ballot_cutoff_2026() from public,anon,authenticated;
create or replace trigger bes_halloween_ballot_cutoff_2026
before update or delete on public.bes_judging_invites
for each row execute function public.bes_halloween_ballot_cutoff_2026();
