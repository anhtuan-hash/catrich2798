# Brian Auto Poster Studio · Template-first Engine (No AI)
**Date:** 2026-10-26 · **Scope:** ESL Brian Event Center + schedule-detected drafts.

## Goal and user journey
When Admin/TTCM imports weekly work plans, ESL Brian recognizes TTCM/THPT English activities as before. **When an admin actually creates an event draft**, Brian now generates a 16:9 event poster using the best matching reusable visual template. Posters appear in the existing **Poster & người nhận** panel and remain unpublished until explicitly approved.

Admin can upload their own **text-free backgrounds** to a reusable template library, with group/category, text contrast and position. The system selects a template deterministically; admin can override or regenerate.

## Template groups (initial 7)
1. Halloween / Lễ hội (especially Halloween keyword)
2. Họp chuyên môn
3. Thao giảng
4. Chuyên đề
5. Tập huấn / hội thảo
6. Ngoại khóa
7. Thông báo chung

Each group has one no-AI built-in vector/canvas background with carefully curated color treatment. New custom artwork automatically outranks the matching built-in background for its category; Halloween keyword takes precedence over generic chuyên đề.

## Storage and source-of-truth
- **No database migration.** Keep using the private `bes-event-assets` bucket and `bes_events.poster_path`.
- Admin-uploaded backgrounds live under `templates/<group>/<sanitized-name>--<dark|light>--<left|right|center>--<id>.<png|jpg|webp>`.
- This filename carries configuration to avoid any new Supabase table. Only approved admins can list, upload or delete via the existing Storage policies.
- The renderer creates a separate immutable `<event-uuid>/poster-<time>.png` file for every event; deleting/updating a reusable template never removes existing event posters.
- Generated posters are private and have signed read URLs; do not expose public bucket access or credentials.
- Uploaded artwork has a strict max of 8MB, supported PNG/JPG/WebP; generated event poster follows existing 10MB upload guard.

## Canvas rendering (client-side)
- Resolution: **1600×900 / 16:9**.
- Poster includes school department/organizer, event category, event title, start date/time (Asia/Ho_Chi_Minh), location if available, and school year. No invented time/location/recipient.
- Automatic text wrapping (4 lines max), readable contrast gradient, separate text-safe area and tasteful category accent.
- Recommended custom backgrounds: 1600×900, leave ~55% blank area for text.
- Upload screen permits **category, text contrast, and placement** (left, right, center).
- Preview generation sets a *local* poster image. Admin must save the event to persist it; poster then appears in the live popup preview.

## Trigger and authorization
- `createDraftFromScheduleItem()`: after a record is created/reused, if and only if `status=draft` and there is **no saved poster**, auto-render and upload one. Existing manually approved artwork must not be overwritten.
- If template listing/storage fails, use the local built-in templates. If a chosen uploaded background cannot be downloaded/rendered, retry a built-in match for automatic selection only.
- Poster generation failure must not roll back the schedule import/draft; record status in schedule metadata and show admin a warning.
- Events created by TTCM as schedule suggestions continue waiting for Admin to stage drafts.
- **Never publishes** `bes_events`, never inserts event recipients, never calls `bes_publish_event`. Publishing remains a separate admin confirmation with audience review.
- Button **Tự chọn & tạo poster** inside Event Manager lets admin regenerate for manually authored events or replace a poster deliberately.

## UX
- Existing event editor: “Poster tự động từ mẫu” section, selected-template summary, gallery toggle, 7 preset swatches, custom artwork cards, Add/Delete template form, Create poster button, preview of pending local file.
- Existing file-upload control remains available for totally bespoke final posters.
- Responsive to desktop and mobile; template labels supplied to legacy English translation dictionary.

## Testing
- `node scripts/test-event-poster-templates.mjs` is part of the existing `npm run build` gate.
- Tests verify 7 group choices, Halloween special ranking, upload precedence, forced choice, fallback, path sanitization, draft-only trigger, and absence of automatic publication.

## Constraints and cost
Zero AI/API generation cost, no new Vercel background worker, no new Supabase database object. Normal Supabase storage bandwidth and capacity of the existing plan apply. Generating 16:9 PNGs happens in the logged-in admin browser; no unattended server poster creation while nobody is signed in.

## Operational notes
A background image is not a final poster. To prevent duplicate titles, the art should contain decorative elements only, leaving text areas clear; final event details are rendered by Brian.
