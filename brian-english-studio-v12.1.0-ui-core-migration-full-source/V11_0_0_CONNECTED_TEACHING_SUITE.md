# Brian English Studio V11.0.0 — Connected Teaching Suite

V11.0 changes the focus from adding isolated apps to connecting the teaching workflow.

## Lesson Pack

Route: `#/lesson-pack`

A Lesson Pack combines outputs from Lesson Architect, Worksheet Factory, Reading Studio, Speaking Studio, Assessment Core, Exam Studio, Content Factory and Learner Sprint.

Features:

- Multiple lesson packs per account.
- Class, unit, CEFR, objectives and lesson variant metadata.
- Drag-and-drop activity sequence.
- Time allocation and delivery mode per activity.
- Support, standard and advanced variants.
- Teacher notes and answer keys.
- Live teaching mode with countdown timer and next/previous activity navigation.
- HTML, JSON and print/PDF export.
- Local-first saving with optional Supabase synchronization.
- Cloud RLS based on owner and department leader roles.

## Connected app workflow

The global Send To panel now includes Lesson Pack. Core teaching apps also show a quick-add Lesson Pack action:

- Lesson Architect
- Worksheet Factory
- Reading Studio
- Speaking Studio
- Assessment Core
- Exam Studio
- Learner Sprint
- Content Factory

Content arriving in Lesson Pack is converted to an appropriate activity type automatically.

## Database

The migration creates:

- `lesson_packs`
- `lesson_pack_items`

Both tables use Row Level Security and Realtime registration. Existing V10.99 data is not deleted.

## Version registry

- Application: 11.0.0
- Runtime Core: 2.0.0
- Schema: 11.0.0
