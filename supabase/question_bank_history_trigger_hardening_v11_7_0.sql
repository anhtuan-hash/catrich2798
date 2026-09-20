-- Brian v11.7.0 · harden version-history trigger functions
revoke execute on function public.qb_capture_item_version() from public, anon, authenticated;
revoke execute on function public.qb_capture_bundle_version() from public, anon, authenticated;
