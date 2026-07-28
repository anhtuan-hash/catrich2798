# Weekly English Practice on Brian

## What this adds

- A new **Bài luyện tập tiếng Anh theo tuần** section below the Home hero.
- Public access: students do not sign in.
- One self-contained `.html` or `.htm` file per exercise, maximum 10 MB.
- Private Supabase Storage bucket with RLS-gated public download for published items.
- Full-screen sandbox runner without `allow-same-origin`.
- Device-local progress and a Continue button.
- Optional guest result collection.
- Admin/TTCM manager for upload, publish, hide, maintenance and delete.
- No additional Vercel Serverless Function.

## Required one-time database step

Run this migration in the Production Supabase project:

```text
supabase/migrations/20260728000000_weekly_practice_v1.sql
```

The migration is idempotent for the tables, indexes, trigger, policies and Storage bucket.

## HTML runtime contract

Brian injects a small bridge before the exercise scripts. Existing exercises that use `localStorage` are persisted by the parent Brian page even though the iframe has an opaque sandbox origin.

An exercise can report progress or completion explicitly:

```js
window.BrianWeeklyPractice?.saveProgress({
  answered: 18,
  total: 40,
  currentQuestion: 19,
});

window.BrianWeeklyPractice?.complete({
  score: 36,
  maxScore: 40,
  correctCount: 36,
  questionCount: 40,
  durationSeconds: 1320,
  answers: { 1: 'A', 2: 'C' },
});
```

Result data is sent to Supabase only when the exercise has **Thu kết quả** enabled. Without the completion call, Brian still preserves compatible `localStorage` values but cannot infer a reliable score from arbitrary HTML.

## Security model

The runner uses:

```html
sandbox="allow-scripts allow-forms allow-downloads"
```

It intentionally excludes `allow-same-origin`, popups and top-level navigation. The uploaded exercise cannot read Brian authentication tokens, Supabase sessions or the parent DOM.

## Egress behavior

- Metadata is a small Supabase table read.
- The HTML file downloads only after the student presses Start/Continue.
- Progress is stored locally and is not written after every answer.
- One lightweight event is attempted per open/completion per browser session.
- The 10 MB upload limit is enforced in both the browser and Storage bucket.
