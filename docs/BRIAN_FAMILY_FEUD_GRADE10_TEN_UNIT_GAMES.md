# Brian Family Feud — Ten English 10 Global Success Unit Games

## Textbook mapping
Verified against English 10 Global Success Teacher's Book contents (Education Publishing House, 2022). Each Unit corresponds to exactly one independent Family Feud game:
1. Family Life
2. Humans and the Environment
3. Music
4. For a Better Community
5. Inventions
6. Gender Equality
7. Viet Nam and International Organisations
8. New Ways to Learn
9. Protecting the Environment
10. Ecotourism

## Original question content
- Ten banks, each exactly twelve *teacher-written* open-ended survey-style boards at roughly A2+–B2. No automatic swapped-name duplicates.
- Exactly 120 boards / 720 original suggested English answers. Each board has six nonidentical options.
- Suggested answer weights sum to 100 but are **simulated educational points**, not actual polling/survey results.
- Main game: five boards; Fast Money: next five previously unrevealed boards (two representatives, 45 seconds each); two further spare boards. Also supports three-round quick play.
- Built-in checks: all boards unique within the grade; six choices per board; no duplicate choices within a board; integer points sum exactly 100; validation through existing engine.

## Application change
- Make the Family Feud setup switch three-way: English 10 / English 11 / English 12, ten themed Unit game cards per selected grade.
- Keep the currently established default Grade 12 for existing workflows, rather than overriding a user's saved session.
- Choosing a new grade changes only new-game *setup state*; saved games are not reset without the teacher explicitly choosing New Game and confirming.
- Persist optional `edition.grade=10` only in newly started grade-10 games. Grade 11/12 saved sessions, the generic bank, custom CSV, scoring, audio, motion and accessibility continue unchanged.
- Updated responsive three-column grade switch, including mobile.

## Acceptance
- All 10 official title/topic mappings verified, 120 unique prompts, 720 suggestions, points 100 per board.
- Ten full Grade 10 simulated game lifecycles including strikes, steal, five rounds, two-person Fast Money with first-person answer nonduplication, CSV export/reimport.
- Retain both Grade 11 and Grade 12 original banks and all existing tests.
- Vercel preview build required to pass before merge, production status checked after merge. Separate physical iOS/TV testing is not guaranteed by a successful build.

No AI, new database tables, third-party paid services or unrelated bubble changes.
