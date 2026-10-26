# Brian Family Feud — English 11 Global Success, Ten Unit Games

## Source alignment
Unit titles verified against the English 11 Global Success printed student-book contents:
1. A Long and Healthy Life
2. The Generation Gap
3. Cities of the Future
4. ASEAN and Viet Nam
5. Global Warming
6. Preserving Our Heritage
7. Education Options for School-Leavers
8. Becoming Independent
9. Social Issues
10. The Ecosystem

## Complete original teaching pack
Ten distinct game IDs `g11-unit-1` to `g11-unit-10`. Exactly **12 original open-ended survey-style questions per Unit**, 120 total, each containing six nonduplicate suggested English answers = **720**. All prompts target pair/group speaking with themes consistent with each Unit (B1–B2). The six rank values per board add up to **100 teacher-authored simulated gameplay points**. They are not a genuine population survey and must never be presented as such.

## Teaching flow and integrity
Each Unit has five classroom rounds; boards 6–10 serve the two-person Fast Money final (five *unseen in normal rounds* prompts, both students answer each, without repeating the first speaker's answer). Boards 11–12 are reserves for teacher reuse. Also supports three-round quick sessions. Keeps team scoring, x2/x3, strikes, steal, reveal animation, big classroom question, A+/A−, sounds and offline autosave unchanged. The game engine is not AI-driven.

## Interface
Add **English 11** and **English 12** grade selector to Brian Family Feud setup, then show ten corresponding Unit cards. Grade 12 stays the default for already-established workflows, and is not mixed with Grade 11. Switching grade resets *unsaved setup selection only* to that grade's Unit 1; it does **not** replace a currently running saved game or overwrite data until the teacher explicitly starts a new game. The optional general bank/CSV import is preserved. Selection, game stage and result screen display `edition.grade` when set, with fallback Grade 12 for legacy Grade 12 sessions without the field.

## Scope safeguards
No paid AI/API, remote service, Supabase schema or shared bubble change. Existing current session schema remains 1; newly created Unit games add an optional `edition.grade` = 11/12. Older sessions and General packs remain valid. UI CSS is namespaced to Family Feud only.

## Acceptance
- Verify official Unit 1–10 titles and topic relevance.
- Validate 120 globally unique question prompts, six different answers each, exactly 100 points total.
- Import/export each Grade 11 Unit bank through CSV without loss.
- Simulate five rounds, strike, steal and two-person Fast Money for each Unit.
- Keep Grade 12's 120 boards and General bank unchanged.
- Run full existing project regression and Vercel Preview green before merging.
- Physically inspect projector typography and mobile Safari/audio separately; static automated tests do not establish device UX.
