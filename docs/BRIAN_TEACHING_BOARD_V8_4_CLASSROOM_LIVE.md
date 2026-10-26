# Brian Teaching Board V8.4 — Classroom Live Foundation
Release date: 2026-10-26. GitHub: `anhtuan-hash/catrich2798` main. Production URLs:
https://esl-brian.vercel.app and https://esl-pek.vercel.app.

## Feature progress — conservative estimate: 83%
Baseline V8.3 was approximately 78% equivalence of 20 original proposals. V8.4 partially introduces:
- #16 teacher-operated polling with visible/hidden results, six choices and 500-vote maximum per choice;
- #17 teacher-entered and approved Word Cloud, deduplicated frequency layout;
- #18 teacher-entered and moderated sticky wall (up to 60 cards);
- #19 owner-authenticated private second-device TV, verified via Supabase Auth + `realtime.messages` RLS, 20-minute / 600-message cap.

These count as **partial**, not completed full student-device activities. The app does **not** yet allow unauthenticated schoolchildren to connect, submit votes, words or notes remotely. QR/short-code guest student workflow remains unimplemented. Score by original scope: 13 full + 3 partial previously worth 2.65 + newly partial modes and TV worth about 1.0 total = 16.65/20 = **83%**. This is feature coverage, not physical-device validation.

## Teacher workflow
1. Sign into the existing Brian website as an approved teacher.
2. Open Brian Teaching Board → **Live** inspector.
3. Select **Bình chọn**, **Đám mây từ**, or **Bảng ghi chú**.
4. Prepare the question; for Poll configure 2–6 options. Click **Lưu câu hỏi**, then **Bắt đầu**.
5. On teacher-operated Poll, record class votes with `+1` or `−1` and show/hide totals. Poll results update student preview and same-device TV.
6. On Word Cloud or Sticky Wall, type a contribution on the **teacher's device**, queue it for moderation, then choose **Approve** or **Reject**. Only approved text appears publicly; the queue never does.
7. To use a second TV/device: sign in **with the same approved teacher account** on that device, then open `https://esl-brian.vercel.app/?bbd_remote_tv=1`. On the teacher's computer open the Board Live panel, select **Bật TV từ xa / Enable remote TV**, and, if convenient, use **Sao chép liên kết TV** to copy the second-device URL.
8. To stop sending, click **Dừng TV từ xa** or close Brian Board. The remote channel stops automatically after 20 minutes or 600 snapshots.
9. To return to regular Board teaching, close the class activity or start a new one. Local same-device TV, the preexisting Foundation mode, remains available independently.

## Privacy and safety
- A distinct private Realtime channel is named `bbd-owner:<auth.uid()>`. Database migration `brian_board_owner_only_private_tv_broadcast` installed two `realtime.messages` RLS policies, exclusively for `authenticated` users on their *own exact topic* with extension `broadcast`. No `anon` policies, wildcard topics, service-role browser keys, or public submit endpoints were introduced.
- At app startup for TV, `supabase.auth.getUser()` must return exactly the current signed-in teacher ID. Same teacher must sign in on both computers. The viewer is strictly read-only and receives **only** `boardStudentPayload`, not private teacher lesson JSON, student roster, assessment answers or moderation queue.
- The browser voluntarily opts into Realtime only by pressing a button. Teacher and TV sessions require an existing active Supabase Auth session.
- Outbound snapshots are bounded to 60,000 serialized bytes, at most 600 messages and at most one send per two seconds. One Realtime channel per active teacher Board session; no persistent student data table and no database writes through this feature.
- Classroom Live contributions are sanitized, bounded and stored only in the current teacher's React memory; they are not automatically archived to Supabase.
- User-visible channel errors warn about oversized PDF/background image payloads. In those cases use the existing **same-device TV** display.
- The Realtime transport uses the existing account's quota. No new subscription, API provider, AI feature, database table or paid add-on was ordered. Existing plan usage limits and possible platform metering still apply; a hard cap reduces risk but **cannot mathematically guarantee that an externally configured paid account never incurs usage charges**.
- The existing project security advisor lists unrelated preexisting warnings for several public SECURITY DEFINER RPC functions. This feature does not change those functions or grant anonymous access.

## Engineering evidence
- New files: `boardClassroomLive.js`, `BoardClassroomLive.jsx`, `BoardClassroomLive.css`, `boardRemoteTVCore.js`, `boardRemoteTV.js`, `BoardRemoteTV.jsx`, `BoardRemoteTV.css`.
- Existing pipeline includes `scripts/test-brian-board-live-v84.mjs` checking moderated submissions, hidden results, expired sessions, student-answer filtering, topic ownership and envelope caps, in addition to legacy Board/Focus/Sync Doctor tests.
- Existing student-safe `boardStudentPayload` now takes an *optional* fifth argument for a moderation-filtered classroom state, preserving the previous four-argument calls. Same-device viewer and Student Preview render this public-only state.
- The second-device TV is the first cross-device transport and **has not been verified end-to-end with two physically signed-in devices**. Supabase RLS exists and was read back; final Vercel build verifies compilation, not live socket delivery or auth cookies on hardware.
- Future requirements to reach ~100%: a secure student participant enrollment/expiry flow, moderation, per-student anonymous submission authorization, rate limiting in trusted backend, automated load testing, and QR-code guest pairing. These remain explicitly **disabled**.

## Rollback
Disable cross-device remote TV from the teacher header (no schema changes required). If RLS policies ever need rollback, drop only `bbd_owner_tv_broadcast_receive_v1` and `bbd_owner_tv_broadcast_send_v1` from `realtime.messages`, leaving all other Realtime policies intact.
