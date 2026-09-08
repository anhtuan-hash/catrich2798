# Settings Account Center implementation plan

## Goal
Bring the approved account/settings design into `#/settings` while preserving the existing Material 3 Settings page, password flow, notification controls, and advanced system/theme panels.

## Approach
- Keep `src/pages/Settings.jsx` as the page owner so existing search, hero, notifications, sync, privacy, system and advanced controls remain intact.
- Upgrade the account/profile area through `UsernameAccountCenter`, which is already mounted globally and already owns username-account lifecycle/password-gate behavior.
- Render the richer profile editor into the existing `.settings-google-profile-fallback` host using a React portal, avoiding a second Settings route or duplicate auth system.
- Persist profile fields through a dedicated authenticated Supabase Edge Function (`profile-settings`) that only reads/writes the current user's safe profile columns: `full_name`, `school`, `contact_email`, `job_title`, `phone`, `bio`, `avatar_url`.
- Upload/remove avatars directly through the existing public `profile-avatars` bucket under `<auth.uid()>/...`; existing storage policies restrict writes to the user's folder.
- Keep current password UI in `Settings.jsx` and the first-login password gate in `UsernameAccountCenter` unchanged.

## TDD / verification
1. Add `scripts/test-settings-account-center.mjs` and wire it into Frontend Build.
2. Observe the new contract test fail before implementation.
3. Implement profile API/util/portal UI/CSS.
4. Run the new contract test, all existing Frontend Build checks, and production build.
5. Review the PR diff for security/scope regressions before merge.
6. Merge only after CI passes, deploy the Edge Function, and verify Vercel production status on the merge commit.
