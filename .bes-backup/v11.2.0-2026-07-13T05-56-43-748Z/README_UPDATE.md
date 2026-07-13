# Update to V11.1.0 — Classroom Delivery

This update requires Brian English Studio V11.0.x.

## Main features

- Live classroom sessions created from Lesson Packs.
- Public student join page with room code and QR link.
- Lobby, participant roster and team assignment.
- Teacher timer, activity navigation and team scores.
- Check-in, short-answer, multiple-choice and poll responses.
- Result review and CSV export.
- Standalone offline classroom HTML package.

## Install

```bash
node /path/to/install-v11.1.0.mjs /path/to/Brian-English-Studio-MAIN
npm install --no-audit --no-fund --registry=https://registry.npmjs.org/
npm run verify:v11.1
```

## Supabase

Run in order:

1. `supabase/brian_v11_1_preflight.sql`
2. `supabase/brian_v11_1_classroom_delivery.sql`
3. `supabase/brian_v11_1_verify.sql`

Then sign out and sign in again.

## Routes

- Teacher: `#/classroom-delivery`
- Student: `#/classroom-join`

## Rollback

Use `rollback-v11.1.0.mjs`. Source is restored to V11.0; classroom database tables are retained to prevent data loss.
