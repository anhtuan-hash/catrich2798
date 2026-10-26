# Brian Family Feud — Classroom Bubble v1

## Purpose
Build a teacher-led, offline-first Family Feud-inspired team activity for English classes, integrated as an independent floating bubble alongside Focus, Board, Bomb Arena and Instant Tools. Names, logos and sounds remain original **Brian Family Feud** assets: no game-show trademark logo or copyrighted sound replication.

## Scope
- 2–6 teams; bilingual VI/EN interface; 16:9 TV presentation and iPhone/iPad.
- 30 ready-made original English-language teaching prompts, each with six *teacher-authored* suggested answers. Answer points sum to 100 **for gameplay**, not a factual claim of 100 survey participants.
- Rounds: teacher chooses controlling team and presses Start; hidden ranked answers appear; students say their guess aloud; teacher taps a matching row to reveal answer and add to round POT or taps Strike for an incorrect guess. Each team can receive up to 3 strikes. Third strike opens a **one-attempt Steal** for the next team. Successful steal reveals an unanswered answer and gives the stealing team the round POT. Failed steal gives POT to original controlling team. Reveal All exposes answers without changing scores.
- Multipliers: standard x1, Double x2, Triple x3 on last rounds, overridable per round via setup (only before starting). Scores awarded atomically only at round settlement, preventing duplicate counting.
- Rapid **Fast Money**: choose one team after any settled round, two team representatives each answer five prompts in sequence; the second cannot repeat the first person's answer to the same prompt; teacher chooses answers or passes (0); both representatives have independent 45s countdowns; points accumulate for classroom pacing (can pause); target 200 points displayed as a threshold. This is an optional bonus, not required for winning.
- Host controls: answer key visible only inside a host panel toggle (can hide before projection); unrevealed board slots show ordinal numbers but no answers or points. Clicking the host answer key reveals to class.
- Sound: locally synthesized tones using Web Audio on supported browsers; sound-off option, iOS first-tap unlock, fail gracefully if unavailable. FX: flip, glowing tiles, red X strikes, confetti; respects system reduced motion and global Motion Hub Bubble setting; shared opening/closing phase animation.
- Storage: dedicated IndexedDB db + localStorage fallback keyed by user ID; no cross-over to Bomb Arena session or Supabase; auto-save on reducer state transitions, not timer animation frames. Import/export teacher answer bank in CSV (question,answer,points,category), validate data. Export scoreboard CSV. Teacher-controlled New Game confirmation.
- Keyboard: keys 1–8 reveal ranks when host mode active, X strike, Escape closes the bubble; focus trapped by modal manually where practical. No shortcuts while typing.
- Round states: setup, ready, playing, steal, round_done, finished, fast_money, fast_done. Every reducer action is pure and undoable (except a fast timer tick).
- Security: validate lengths, options, unique normalized answer labels, 6 answers per sample question, bounded score 0–999999, no uncontrolled HTML insertion or remote execution.
- No new npm dependency, AI integration, server APIs, schema migration, or costs.
- Regression tests: 30×6 sum100, no duplicates, settlement once, 3 strikes/steal success/failure, multiplier, fast money, undo/redo, legacy app mounting and styles unaffected, production build succeeds.

## Explicit score settlement
- Revealed answer points contribute to a **pending round POT** = sum(answer.value * roundMultiplier), not directly to team.
- If all 6 answers revealed, controlling team wins POT automatically.
- On third incorrect attempt, switch to steal phase (one guess only). Correct answer adds its points to POT, thief wins entire POT; incorrect guess closes steal and controller wins POT.
- On manual End Round (if fewer than 3 strikes), controlling team wins the current POT.
- Scores are clamped and settlement idempotent.
- Fast Money uses a combined two-person tally and **adds the earned bonus to chosen team's cumulative score only once** when Finish Fast Money is called.

## Non-goals v1
No simultaneous student-device accounts, no live votes, no purported real survey statistics, no automatic NLP answer validation. The teacher is authoritative; same-screen TV projection should conceal the host answer key until requested.
