# V10.63 Account Library & Exact Replay

- Library, prompt sets, and question bank are now isolated per signed-in account.
- Supabase synchronizes `library_items` across devices, with local-first fallback.
- Saved entries use a common schema: `sourceApp`, `sourceAppTitle`, `templateId`, `activityData`, `ownerId`, `visibility`, and `schemaVersion`.
- TextLab activities can be saved to Library and compatible templates can be added to Question Bank.
- TextLab, Speaking Studio, Classroom Game Builder, Domino, Reading Studio, Test Paper Builder, Student Practice, and generic MCQ AI outputs preserve reusable activity data.
- Library “Live play” reopens saved interactive products using their original standalone activity where available.

Run `supabase/library_sync_v10_63.sql` once in Supabase SQL Editor before using cross-device sync.
