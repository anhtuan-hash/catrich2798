# Brian English Studio V10.96.0

## Automation Center & Operational Intelligence

Route: `#/automation-center`

V10.96 adds a native React automation layer using the shared Runtime Core and Supabase singleton.

### Main capabilities

- Rule builder with manual, event and in-app schedule triggers.
- Actions: notification, Work Hub draft, Content Factory practice draft, route opening and operational snapshot.
- Human approval gates for sensitive actions.
- Execution history with success, failure and pending-approval states.
- Event Lab for safe simulation without modifying teaching data.
- Runtime and storage diagnostics.
- Local fallback when the automation tables are not yet available.
- Real event hooks from Resource Library approval, Work Hub submission and Learning Intelligence interventions.

### Important scheduling boundary

The browser scheduler runs while Brian English Studio or its installed PWA is open. It is not a 24/7 server scheduler. A future Edge Function or Supabase Cron worker can process the same rules without changing the rule schema.

### Database objects

- `automation_rules`
- `automation_runs`
- `automation_events`

Run in this order:

1. `supabase/brian_v10_96_preflight.sql`
2. `supabase/brian_v10_96_automation_center.sql`
3. `supabase/brian_v10_96_verify.sql`

### Security model

- Teachers manage personal rules and their own run history.
- Admin/TTCM can manage department rules and approve queued actions.
- Department rules are readable by authenticated members.
- API keys and access tokens are not stored in rule inputs, outputs or exported reports.
