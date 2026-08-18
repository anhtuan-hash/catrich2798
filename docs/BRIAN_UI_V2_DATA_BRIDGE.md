# Brian Metro Next — Read-First Data/Service Bridge

Branch: `ui-v2-shadow`

## Goal

Metro Next must reuse Brian's existing production data/services without creating a second backend, changing database schema, or writing fixture values that look real. The first integration stage is therefore **read-first**.

## Architecture

`BrianV2DataProvider` is mounted once above the Shadow UI router. It loads and normalises existing V1 sources into one V2 snapshot shared by Homeroom, Classes, Students, Dashboard, Reports, Resource Library and UI Lab diagnostics.

The provider lives at:

`src/ui/v2/data/BrianV2DataContext.jsx`

## Existing V1 sources reused

### Authentication

- `getCurrentUser()` / existing Supabase-or-offline auth session.
- V2 does not create a separate login state.

### Assigned classes

- `listAssignedSchoolClasses(user)`.
- Reuses `get_my_assigned_school_classes` when available.
- Falls back to existing Homeroom workspace metadata when assignment RPC data is unavailable.

### Homeroom workspace

- `listHomeroomWorkspaces(user)`.
- `loadLocalHomeroomWorkspace(user, id)` first.
- `loadHomeroomWorkspace(user, id)` when the payload is not local.
- Reuses students, attendance, attendance sessions, alerts, reminders, learning records, incidents and support plans already stored by V1.

### Dashboard

- `loadDashboardSnapshot(currentUser)`.
- V2 does not recreate Work Hub aggregation logic.
- Action Center, timeline, approvals, professional work and source health derive from the existing aggregator.

### Resource Library

- `loadResourceLibrary()` for immediate local/cache display.
- `syncResourcesFromCloud()` is allowed as a read-through sync: it reads approved/current resource rows and refreshes the existing local resource cache. It does not create a new V2 table or metadata format.

### Reports / output history

- Reads the current owner's existing `bet-v4-history::<owner>` storage key without calling a write/sync initializer.
- Only history entries that look like report/grade/attendance/conduct/export output are shown.
- No fake report rows are generated when History contains no matching entries.

## Truthful missing-data policy

If V1 has no field for a value that a Metro Next component could display, V2 shows a neutral missing state such as `—` or `Chưa có dữ liệu`.

Examples:

- Class progress is not invented for subject classes.
- Student conduct is not inferred from unrelated fields.
- Learning progress is shown only when a numeric student/learning-record value exists.
- Today's attendance is shown only when a current attendance row/session exists.
- Report totals are zero when report-like history is empty.

## Read-only boundary

The current Shadow data pages do not create/edit/delete classes, students, homeroom records, resources or reports. Actions that require mutation open the existing V1 workflow.

This keeps the first production-data integration reversible and prevents a design-preview bug from mutating live data.

## Event refresh

The provider listens to existing Brian events such as auth, homeroom, resource and dashboard source events. Changes made in V1 can therefore refresh the Shadow snapshot without adding another global persistence system.

## Diagnostics

UI Lab displays source labels for:

- auth
- classes
- students
- homeroom
- resources
- dashboard
- reports

Typical labels are `LIVE CLOUD`, `LOCAL DATA`, `ASSIGNED DATA`, `NO DATA` and source errors.

## Release rule

Read-first integration does not by itself authorize a V2 production release. Before V2 can replace V1:

1. real permission service must replace the role simulator;
2. required write commands must be deliberately bridged or kept in V1;
3. responsive/accessibility/performance QA must pass;
4. functional regression must confirm data parity;
5. feature flag and rollback gate must be tested;
6. the owner must explicitly approve the final private preview.
