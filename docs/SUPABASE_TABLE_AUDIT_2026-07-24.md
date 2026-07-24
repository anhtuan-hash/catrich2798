# Supabase table audit — Brian English Studio

Date: 24 July 2026

## Scope

The audit compared every `CREATE TABLE` statement committed under `supabase/` with current production references under `src/`, `api/`, `public/`, and `supabase/functions/`. It also checked indirect RPC dependencies where a table is used inside a PostgreSQL function rather than through a frontend `.from()` call.

Repository analysis found 82 declared application tables. A missing runtime reference is only a candidate signal: the live database must still be checked for rows, scans, foreign keys, views, functions, external workers, and integrations before deletion.

## High-confidence retirement candidates

These tables have no current production-runtime reference and belong to removed or replaced modules:

| Group | Tables | Reason |
|---|---|---|
| Removed AI workspace | `ai_workspace_projects`, `ai_workspace_messages` | AI Workspace route/runtime removed |
| Removed AI gateway | `ai_runtime_settings`, `ai_usage_daily` | OpenRouter and visible AI runtime removed |
| Removed content tools | `content_factory_projects`, `lesson_packs`, `lesson_pack_items`, `teacher_os_projects` | Modules no longer exist in current Brian navigation/runtime |
| Legacy department workflow | `department_workspace_snapshots`, `department_submission_requests`, `department_submissions` | Replaced by Work Hub, assignment delivery, and current department modules |
| Unused Content Ecosystem history | `content_ecosystem_runs` | Current app reads assets and kits only |
| Superseded resource-library tables | `resource_categories`, `resource_comments`, `resource_favorites` | Categories now come from app configuration; favorites are in `resource_user_state`; comments are not used |
| Dormant Knowledge Hub helpers | `resource_saved_searches`, `resource_index_jobs` | No current search-saving UI or indexing worker |

## Review before retirement

The following Phase 3 Homeroom normalized tables are not referenced by the current app, which continues to store the working dataset in `bes_homeroom_workspaces.payload`:

- `bes_homeroom_students`
- `bes_homeroom_attendance`
- `bes_homeroom_learning_records`
- `bes_homeroom_incidents`
- `bes_homeroom_parent_contacts`
- `bes_homeroom_announcements`
- `bes_homeroom_documents`
- `bes_homeroom_audit_logs`
- `bes_homeroom_backups`

These should not be removed until the live audit confirms that no migration, external report, or manually imported data uses them.

## Tables that look unused from frontend code but must be kept

- `api_rate_limits`: used indirectly by `bes_v1099_consume_ai_quota`, which the server security layer calls for API rate limiting.
- `bes_homeroom_portal_attempts`: used inside `get_homeroom_portal` for PIN failures, lockouts, and rate limiting.
- `bes_schema_registry`: used by migration and verification scripts.

## Important storage note

Dropping `department_submissions` does not delete files in the private `department-evidence` Storage bucket. Storage objects require a separate inventory and cleanup decision.

## Egress impact

A table does not create Egress merely by existing. Removing unused tables mainly reduces schema clutter, accidental broad queries, Realtime publication overhead, and maintenance risk. It will not materially reduce Egress unless something is still reading those tables.

## Safe process

1. Run `supabase/brian_unused_tables_audit_20260724.sql` in the Supabase SQL Editor.
2. Export or copy both result sets.
3. For a drop candidate, require all of the following:
   - expected table is present;
   - row count is zero, or its data has been exported and approved for deletion;
   - no unexplained recent scans or writes;
   - no inbound foreign keys;
   - no dependent views;
   - no unexpected function dependency;
   - no external integration or worker depends on it.
4. Create a timestamped backup before deletion.
5. Drop child tables before parent tables and avoid `CASCADE` unless every removed dependency is reviewed.
6. Keep the cleanup migration reversible where possible and verify login, Homeroom, Work Hub, Resource Library, Assessment, Automation, and Admin flows afterward.
