# Brian English Studio V10.67 — Homeroom Teacher Phase 2

## Added modules

- Advanced learning analytics and student risk/trend map.
- Subject-teacher feedback portal with GVCN review inbox.
- Team assignment, merit/demerit events and live leaderboard.
- Announcements with parent/student read acknowledgement.
- Sanitized parent and student portals protected by class code, student code and individual PIN.
- Public subject-teacher portal protected by a separate class code.
- Admin-only school-wide homeroom statistics.

## Data protection design

The private homeroom workspace remains in `bes_homeroom_workspaces`. Public portals use a separate, explicitly published and filtered snapshot. Parent/student RPC access returns only one verified student's prepared view. Subject teachers receive only the basic roster required to submit feedback.

## Supabase migration

Run these files in order when upgrading from a version earlier than V10.66:

1. `supabase/homeroom_workspace_v10_66.sql`
2. `supabase/homeroom_phase2_v10_67.sql`

Regenerate access codes immediately if a code is exposed publicly.
