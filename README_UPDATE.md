# Brian English Studio V11.0.0 — Update Notes

## Main feature

V11.0 introduces Lesson Pack, a connected teaching workspace that combines lesson plans, worksheets, reading, speaking, assessment, interactive content and homework in one live sequence.

## Install dependencies

```bash
npm install --no-audit --no-fund --registry=https://registry.npmjs.org/
```

## Verify

```bash
npm run verify:v11.0
```

## Supabase

Run in order:

1. `supabase/brian_v11_0_preflight.sql`
2. `supabase/brian_v11_0_connected_teaching_suite.sql`
3. `supabase/brian_v11_0_verify.sql`

## Route

`#/lesson-pack`
