-- READ-ONLY, safe to inspect existing schema. This file does not apply migrations.
select table_name, column_name, data_type
from information_schema.columns
where table_schema='public' and table_name in ('profiles','gallery_settings','gallery_exhibitions','gallery_rooms','gallery_exhibits','gallery_assets')
order by table_name, ordinal_position;

select c.conname, pg_get_constraintdef(c.oid) as constraint_definition
from pg_constraint c join pg_class t on t.oid=c.conrelid
join pg_namespace n on n.oid=t.relnamespace
where n.nspname='public' and t.relname='profiles' and c.contype='c';

select schemaname,tablename,policyname,cmd,roles,qual,with_check
from pg_policies where schemaname='public' and tablename like 'gallery_%'
order by tablename,policyname;

select id,name,public,file_size_limit from storage.buckets where id='brian-gallery-private';
