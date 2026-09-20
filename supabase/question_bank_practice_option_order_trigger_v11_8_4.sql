-- Brian Question Bank v11.8.4
-- Future-proof practice creation: inherit the source test's balanced option order
-- whenever a practice set declares settings.sourceTestId.

create or replace function public.qb_practice_item_inherit_option_order()
returns trigger
language plpgsql
set search_path = public
as $function$
declare
  v_order jsonb;
begin
  select ti.option_order
  into v_order
  from public.assessment_practice_sets ps
  join public.assessment_test_items ti
    on ti.test_id::text = ps.settings->>'sourceTestId'
   and ti.item_id = new.item_id
   and ti.position = new.position
  where ps.id = new.practice_id
  limit 1;

  if jsonb_typeof(v_order)='array' and jsonb_array_length(v_order)=4 then
    new.option_order := v_order;
  elsif new.option_order is null then
    new.option_order := '[0,1,2,3]'::jsonb;
  end if;

  return new;
end;
$function$;

drop trigger if exists trg_qb_practice_item_inherit_option_order
  on public.assessment_practice_items;

create trigger trg_qb_practice_item_inherit_option_order
before insert or update of practice_id,item_id,position
on public.assessment_practice_items
for each row
execute function public.qb_practice_item_inherit_option_order();

comment on function public.qb_practice_item_inherit_option_order() is
'Copies assessment_test_items.option_order into a practice item when the practice set references a sourceTestId.';
