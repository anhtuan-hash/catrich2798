# BRIAN BOARD V9 — Final integrated Classroom Live release
**Date:** 2026-10-26
**Repository:** `anhtuan-hash/catrich2798` main
**Production:** https://esl-brian.vercel.app / https://esl-pek.vercel.app

## What is now implemented
### 1. Student devices: actual QR invitation and responses
- A separately styled **public** mobile route `/#/board-live?code=<12-lowercase-hex>`, accessible without Brian account and isolated from the teacher dashboard.
- Teacher chooses Live Poll / Word Cloud / Sticky Wall, edits question/options, chooses **Tạo mã QR**, and shares QR or text code.
- Server creates an unguessable 12-hex-digit random room code and an independent **48-hex-digit guest token** for each participant; the token is stored only as a SHA-256 hash in PostgreSQL, with the raw token held in the student's sessionStorage. We do not ask for student names, phone numbers, rosters, grades or passwords.
- Poll: 2–6 options, **one server-enforced vote per guest**; Word Cloud and Sticky Wall: up to three server-enforced messages, minimum 15 seconds between messages, 35 characters/cloud item or 80 characters/note. Session: maximum 60 guests, 180 entries overall, 45 minutes.
- Poll votes count immediately. Cloud and Wall entries are **pending until teacher approval**. Guest responses contain only the approved public dataset; no answer keys, private teacher notes, student identifiers, hashes or moderation queue.
- Student page offers an automatic background result refresh while visible once every 20 seconds, plus manual refresh, with Android-friendly large tap targets and vertical scrolling.

### 2. Teacher Live Studio
- View **live room count, code, QR**, current vote totals and a moderation queue. Approve or reject each message, hide/reveal poll totals, pause/resume/end the room, copy a share link and export a properly escaped UTF-8 CSV.
- Restore the most recent non-expired owned room after refreshing the teacher browser; a new activity can be created after closing the previous room.
- A finished session can be **permanently deleted by its owner** with one extra confirmation. Cascading deletion removes the guest tokens and responses without affecting other app tables.
- On normal Brian Board close, the teacher client requests server-side closure of its room. An unexpected tab crash cannot guarantee immediate closure, but the server deadline remains enforceable.

### 3. TV and student-preview parity
- Server-approved state updates the original Board presentation payload and the existing same-device BroadcastChannel TV. Only public sanitized page objects and approved Classroom Live content are broadcast.
- The separate second-device TV remains private to the **same signed-in teacher account** through Supabase Realtime RLS scoped to `bbd-owner:<auth.uid()>`; no public or student Realtime write channel was created.
- Remote TV still has its 20-minute, 600-message and 60KB-payload caps. For very image-heavy lessons use same-device TV.

### 4. Security / SQL
- New RLS-enabled tables: `bbd_live_rooms`, `bbd_live_guests`, `bbd_live_entries`. The client roles cannot INSERT or UPDATE those tables directly; guest access uses tightly limited RPCs.
- RPCs: `bbd_live_create` (approved, signed-in teacher), `bbd_live_join`, `bbd_live_submit`, `bbd_live_guest_state` (bound to valid per-guest token), `bbd_live_teacher_state`, `bbd_live_teacher_control`, `bbd_live_teacher_delete` (all owner only).
- Every privileged RPC is `SECURITY DEFINER SET search_path=''`, schema-qualified, validates ownership or room credentials, controls EXPLICIT EXECUTE grants, and applies server-side session expiration, message caps and moderation. **Anonymous users cannot read raw tables or call any teacher RPC.**
- Previous Brian Cloud, Focus, YouTube, Sync Doctor, school registries and academic data schemas are untouched.
- A live database UAT used a transaction with **ROLLBACK** to exercise authenticated teacher create, token join, moderation/approval and room closure; a second rollback test exercised poll voting, double-vote prevention, hidden result privacy and owner deletion. Counts after rollback: zero rooms, guests or entries.

## Classroom steps
1. Sign into ESL Brian as an approved teacher → open **Brian Teaching Board → Live**.
2. Select Poll, Word Cloud or Sticky Wall → configure the question → save the activity.
3. Press **Tạo mã QR cho học sinh**. Display the QR on your TV or send the invitation URL.
4. Students scan or open the join page, enter the room, and submit from their own phone or iPad. No sign-in is required; classroom access exists only for this time-limited session.
5. On Poll, watch the counts and choose whether results appear publicly. On Word Cloud/Sticky Wall, **Approve** responses before they appear on TV.
6. Export CSV if needed, then click **Kết thúc**. To erase all stored session responses, click **Xóa dữ liệu phiên**. Click **Hoạt động mới** to start the next activity.

## Validation evidence / limitations
- Vercel `npm run build` includes `scripts/test-brian-board-live-final.mjs` and all previously required Brian Board, Focus and Sync Doctor contract/unit gates.
- SQL transaction tests passed without leaving test rows; RLS for all new tables was enabled and owner-only RPC execute privileges inspected.
- **Not validated end-to-end using signed-in teacher + 60 physical student smartphones + classroom TV.** Production READY establishes a successful build, not full human device acceptance.
- The broader original 20-item Board roadmap still includes narrower PDF/image/diagram features: native PDF text editing and arbitrary page object import are not implemented (PDF remains raster-paper plus vector annotations); image filters and diagram layout work but are not Photoshop/Visio replacements. Thus this is the **final integrated Classroom Live software release**, not a technically supportable claim that every original ambition is implemented at 100%.
- No AI provider, paid API, new subscription or additional SaaS purchase was added. All events still count toward **existing Supabase/Vercel free-tier or plan usage**. Hard per-room limits reduce costs but cannot guarantee the platform will never bill an account configured to pay for overages.
