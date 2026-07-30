-- Brian English Studio — personnel directory Work Hub compatibility hotfix
-- Fixes: new row for relation "work_hub_items" violates check constraint
--        "work_hub_items_type_check"
--
-- Personnel profiles are first-class Work Hub records identified by:
--   item_type    = 'personnel_profile'
--   source_module = 'personnel-directory-v2'
--
-- Earlier Work Hub schemas used a closed item_type allow-list and therefore
-- rejected the new personnel record type. Keep validation future-proof while
-- continuing to reject empty or excessively long values.

do $$
begin
  if to_regclass('public.work_hub_items') is null then
    raise notice 'public.work_hub_items does not exist; personnel type fix skipped.';
    return;
  end if;

  alter table public.work_hub_items
    drop constraint if exists work_hub_items_type_check;

  alter table public.work_hub_items
    add constraint work_hub_items_type_check
    check (
      item_type is null
      or char_length(btrim(item_type)) between 1 and 80
    ) not valid;

  -- Normalize any personnel rows that may have been stored under an older
  -- fallback Work Hub type while preserving all metadata and workflow state.
  update public.work_hub_items
  set item_type = 'personnel_profile',
      updated_at = now()
  where source_module = 'personnel-directory-v2'
    and item_type is distinct from 'personnel_profile';

  alter table public.work_hub_items
    validate constraint work_hub_items_type_check;
end
$$;

comment on constraint work_hub_items_type_check on public.work_hub_items is
  'Non-empty Work Hub type up to 80 characters. Personnel directory uses personnel_profile.';
