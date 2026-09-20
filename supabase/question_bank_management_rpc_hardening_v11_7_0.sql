-- Brian v11.7.0 · harden Management Suite RPC access
revoke execute on function public.qb_merge_items(uuid,uuid) from public, anon;
grant execute on function public.qb_merge_items(uuid,uuid) to authenticated;

revoke execute on function public.qb_normalize_taxonomy_term(uuid) from public, anon;
grant execute on function public.qb_normalize_taxonomy_term(uuid) to authenticated;

revoke execute on function public.qb_recompute_item_statistics(uuid[]) from public, anon;
grant execute on function public.qb_recompute_item_statistics(uuid[]) to authenticated;
