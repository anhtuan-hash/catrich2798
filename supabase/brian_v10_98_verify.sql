-- Brian English Studio V10.98 verification
select component,version,installed_at
from public.bes_schema_registry
where component in('application','runtime_core','collaboration_hub','data_governance')
order by component;
select table_name,
  (select count(*) from information_schema.columns c where c.table_schema='public' and c.table_name=t.table_name) as columns,
  (select count(*) from pg_policies p where p.schemaname='public' and p.tablename=t.table_name) as rls_policies
from(values('collaboration_spaces'),('collaboration_members'),('collaboration_threads'),('collaboration_comments'),('content_versions'),('permission_overrides'),('audit_events'),('backup_snapshots'),('backup_items'),('deleted_items'))t(table_name)
order by table_name;
select proname from pg_proc join pg_namespace n on n.oid=pronamespace
where n.nspname='public' and proname in('bes_v1098_is_leader','bes_v1098_is_space_member','bes_v1098_can_manage_space','bes_v1098_soft_delete_resource','bes_v1098_purge_expired_deleted_items')
order by proname;
