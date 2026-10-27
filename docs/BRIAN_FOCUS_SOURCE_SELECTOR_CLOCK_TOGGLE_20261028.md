# BRIAN FOCUS — Source Selector & Clock Toggle
Version: 2026-10-28

## User journeys
1. Opening Focus presents a centered, keyboard-accessible chooser with Web Scenes and YouTube tiles. Available options show saved counts; missing playlists are disabled. If no sources exist, regular Focus is available.
2. Web Scenes retains the interactive website playlist, fullscreen Next and 1/2/4 layouts. A clock toggle in the Web Scenes bar hides or restores the clock, date, weather and external timer overlays, preserving iframe state.
3. YouTube selects the validated saved playlist/backup. Existing persistent YouTube iframe and controls are reused. Opening the chooser does not autoplay; closing Focus or returning to Web Scenes never explicitly stops the player.
4. Session selection and clock preference are local only. Shared Supabase settings remain unchanged.
5. Admin/TTCM keeps the existing Scene Studio publishing rights and global playlist backups.

## UI and accessibility
- Two clear cards, touch-friendly and bilingual, loading/error/retry states, accessible live option counts.
- Keyboard focus on the first available source, Tab trapped within dialog, Escape/Close closes Focus.
- Web clock button uses EyeOff/Eye, aria-pressed and accessible tooltip, independent of interaction state.
- Styles isolated to Focus; mobile chooser uses a single-column card layout.

## Non-goals
- No data migration, subscription, AI, automatic embedded-site switching or synchronization of website interactions.
- No YouTube playback until explicitly chosen or resumed from a previously playing background session.

## Verification
- Dedicated node regression test for selection, nonmutation, preserved YouTube backup and clock toggle.
- Existing Web Scenes and YouTube regressions remain part of the production build.
- Verify Vercel Preview before merge and Production after merge.
