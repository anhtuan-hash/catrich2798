# Brian Focus 8.0 — release validation and manual QA
2026-10-24 · Target: GitHub main -> Vercel Production esl-brian.vercel.app

## Automated gates checked
- `npm run build` includes `node scripts/test-brian-focus-v7.mjs` and `node scripts/test-brian-focus-v8.mjs`.
- V8 tests cover bounded per-account state, cue timing, viewport modes, layout clamp, CSV export, preserved persistent YouTube player, remote host and revocable backend, and presence of Studio workflows.
- Production build confirmed READY; output bound to esl-brian.vercel.app (details depend on latest deployed commit).
- Supabase project `xpkbgqdlfonsinriggmj`: both `brian_focus_v8_vault` and `brian_focus_v8_remote` have RLS enabled, owner-only SELECT/INSERT/UPDATE/DELETE policies. anon SELECT/INSERT grants are false.
- No migrations that delete or modify existing Focus notes, global scenes, classroom/homeroom, gradebook or students.

## Manual authenticated QA still required
1. Mac desktop >1440px: open Focus; run WAAPI entrance; Ambient OS toolbar -> ten tabs; Close runs exit and returns to correct route.
2. Android 360px and iPhone 390px: Studio should scroll vertically, no clipped Close, no horizontal page scroll. Change layout Mobile -> Apply; drag weather and dock. Disable custom layout to restore V7 positions.
3. YouTube: start background; close Focus; reopen; watch same persistent iframe continue; change depth/timeline/clock; Stop must stop only on explicit button.
4. Timer and Scene Director: start 2×1min cues; switch tabs and close Focus; returning continues correct absolute-deadline cue; no media remount.
5. Automation: choose a valid trigger and action; Test action changes selected mood; no JavaScript arbitrary execution or forced audio.
6. Remote: use two authenticated devices signed in to the **same** Supabase account; pair with QR; close Studio on desktop; send timer/volume/clock/scene commands on phone; ensure desktop responds. Revoke and confirm subsequent commands fail; after 10m expiry pairing fails.
7. Cloud Vault: backup on desktop; sign into same account on phone; restore after confirmation. Confirm another teacher cannot read the backup; import/export JSON restore only after confirmation.
8. Classroom: show to external TV; ensure journal, personal notes, names/weather/location, admin edit controls are hidden; QR points only to user-entered HTTPS URL.
9. Audio: press Start; fade in, change stereo pan/master and Stop; after YouTube unmute, local sound yields. Browser gesture restrictions may require a tap.
10. System Reduce Motion and low performance: depth/particles should not animate; clock and Focus Close remain usable.

## Product limits, deliberately not misrepresented
- Cloud Vault currently stores **one latest account-scoped snapshot** with incrementing version/conflict detection, not a browsable multi-version history. Export JSON is available for manual version archives.
- Remote is authenticated same-account pairing; not anonymous public classroom control. No new admin rights.
- Scene Director blends local atmosphere cues over the current background; it does not construct a new copyrighted video playlist.
- Depth Engine is a lightweight decorative parallax layer rather than full WebGL 3D.
- PDF/CSV: CSV and JSON for session history are included; PDF export has not been added.
- Actual authenticated desktop/Android/iOS browser interaction has not been directly observed in this release verification; READY/build tests are not a substitute.
