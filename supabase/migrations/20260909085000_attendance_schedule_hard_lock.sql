create or replace function public.bes_extra_class_is_scheduled_on_date(
  p_class_id uuid,
  p_attendance_date date
)
returns boolean
language sql
stable
security definer
set search_path = 'public'
as $$
  select coalesce((
    select exists (
      select 1
      from regexp_split_to_table(trim(c.weekdays), '\s*,\s*') as weekday_token(value)
      where lower(trim(weekday_token.value)) = case extract(isodow from p_attendance_date)::integer
        when 1 then '2'
        when 2 then '3'
        when 3 then '4'
        when 4 then '5'
        when 5 then '6'
        when 6 then '7'
        when 7 then 'cn'
      end
    )
    from public.bes_extra_classes c
    where c.id = p_class_id
      and c.active = true
      and nullif(trim(coalesce(c.weekdays, '')), '') is not null
    limit 1
  ), false);
$$;

create or replace function public.bes_enforce_extra_attendance_schedule()
returns trigger
language plpgsql
security definer
set search_path = 'public'
as $$
begin
  if new.class_id is null
     or new.attendance_date is null
     or not public.bes_extra_class_is_scheduled_on_date(new.class_id, new.attendance_date) then
    raise exception 'Lớp này không có lịch học vào ngày %.', coalesce(to_char(new.attendance_date, 'DD/MM/YYYY'), 'không hợp lệ')
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists bes_extra_attendance_sessions_schedule_guard
on public.bes_extra_attendance_sessions;

create trigger bes_extra_attendance_sessions_schedule_guard
before insert or update of class_id, attendance_date
on public.bes_extra_attendance_sessions
for each row
execute function public.bes_enforce_extra_attendance_schedule();

revoke all on function public.bes_extra_class_is_scheduled_on_date(uuid, date) from public;
revoke all on function public.bes_extra_class_is_scheduled_on_date(uuid, date) from anon;
revoke all on function public.bes_extra_class_is_scheduled_on_date(uuid, date) from authenticated;
revoke all on function public.bes_enforce_extra_attendance_schedule() from public;
revoke all on function public.bes_enforce_extra_attendance_schedule() from anon;
revoke all on function public.bes_enforce_extra_attendance_schedule() from authenticated;
