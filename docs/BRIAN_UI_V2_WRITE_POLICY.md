# Brian Metro Next — First Release Write Policy

> Goal: release the Metro Next UI without creating a second production mutation layer.

## Rule

For the first V2 release, native Metro Next pages may read, aggregate, filter and present the current Brian data model. Production mutations remain owned by the existing V1 service/workflow unless a mutation has separately passed permission, persistence, audit and rollback parity review.

## Policy by area

| Area | V2 read | First-release write owner |
|---|---|---|
| Homeroom | Native V2 | Delegate to V1 |
| Classes & Students | Native V2 | Delegate to V1 |
| Resource Library | Native V2 | Delegate to V1 |
| Work Hub | Native V2 | Delegate to V1 |
| Assessment | Native V2 | Delegate to V1 |
| Collaboration | Native V2 | Delegate to V1 |
| Admin & Cloud | Native diagnostics | Delegate sensitive actions to V1 |
| Tool Runtime | Tool Shell / V1 engine | Existing V1 tool engine |
| Shadow QA preferences | Native V2 | Browser-local only |

Examples of delegated actions include attendance/conduct edits, roster changes, metadata mutations, uploads, approvals, account/role changes, backup/restore and destructive operations.

## Why this is the default

The existing V1 workflows already own permission checks, Supabase/RLS behavior, persistence, local fallbacks, import/export formats and audit expectations. Duplicating writes in V2 before parity is proven would create a high-risk split-brain architecture.

Therefore the first Metro Next release optimizes for **UI replacement without data-model replacement**.

## Promotion to native V2 write

A mutation can become native V2 only after it has a specific contract covering:

1. authorization parity;
2. optimistic/error state behavior;
3. persistence and reload parity;
4. audit/event parity;
5. offline/cache behavior where applicable;
6. rollback/fallback behavior;
7. regression against the corresponding V1 workflow.

Until those conditions are met, V2 should open or delegate to the established V1 workflow.
