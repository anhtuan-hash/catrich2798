# Brian Family Feud — Classroom Bubble v2: Teacher Manual Scoring

## Teacher-operated round flow
- Configure 2–6 teams and 3/5/8/10 rounds, with English 10–12 Global Success question banks or teacher-imported CSV.
- Teacher starts a round, reveals correct student guesses, adds strikes and optionally offers a steal chance.
- Answer values and the multiplier produce a **suggested POT only**. Revealing a tile, a full board, and successful/failed steals **never award team points**.
- When the teacher presses End Round, all six answers are revealed, or a steal resolves, the game enters `round_scoring`.
- Enter an independent non-negative integer score for **every** team; zero is allowed. Confirm All Team Scores applies the values atomically, records each team's round contribution, and unlocks Next Round.
- There is no double credit on repeated confirm. Teachers can Edit This Round's Scores; the old contribution is removed and replaced before updating team totals.
- The leader count (historically roundWins) counts the team(s) that earned the highest **positive** manually entered points each round. Ties share the lead; all-zero rounds award no lead.
- Undo/Redo and existing offline IndexedDB/localStorage auto-save cover edits, entries, and awarded scores. Legacy v1 sessions retain points already awarded in earlier rounds; future rounds follow manual scoring.
- End-of-game CSV includes totals, round leader count, per-round score columns, and any manually awarded Fast Money bonus.

## Fast Money
- Existing optional two-player five-question challenge, timers, animations, audio, and 200-point threshold stay in place.
- The tally from revealed Fast Money answers is **suggested only**.
- When Fast Money ends, `fast_scoring` prompts the teacher to enter and confirm the actual bonus; no automatic award occurs. Teachers can reopen to edit without double credit.

## Design and technical constraints
- Bilingual VI/EN scoring UI, large numeric input rows for TV and smartphone, clear Confirm action, accessible labels.
- No AI integration, remote service, new dependencies, Supabase migration, or additional cost.
- Existing Focus, Board, Bomb Arena and permission systems untouched.
- Reducer actions: `SET_ROUND_DRAFT`, `SAVE_ROUND_SCORES`, `EDIT_ROUND_SCORES`, `SET_FAST_DRAFT`, `CONFIRM_FAST_SCORE`, `EDIT_FAST_SCORE`.
- Regression tests cover 2–6 teams, no auto-score, per-team manual score confirmation, blank/invalid values, round corrections, no double scoring, undo/redo, Fast Money and full Unit banks.
