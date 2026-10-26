# Brian Bomb Arena — Chaos Five Mechanics v1

Status: implementation specification / scoped to Bomb Arena, no other ESL Brian modules mutated.

## User story and compatibility
Teacher chooses **Hỗn loạn / Total Chaos** and enables one or more **Gỡ bom (Defuse), Combo, Khiên, Bom hẹn giờ (Timer), Trùm bom (Boss)**. All features default ON in new Chaos games. Existing saved arena state with no `chaosKit` keeps its original scoring rules, question banks and UI. Requires a valid bank of multiple-choice questions with four distinct answer options. Starting without an MCQ bank is blocked with a clear message; no half-started game.

## State model
`state.chaosKit={version:1,enabled:true,features:{defuse,combo,shield,timer,boss},difficulty:'extreme',timerSeconds:15,questionDueAt:null,remainingMs:null,bossTrigger:5,bossMaxHP:3,bossHP:3,bossActive:false,bossDefeated:false,bonus:100}` for new Chaos sessions only. `teams[i].combo` is number of consecutive correct responses; `teams[i].shields` holds 0..2 protections. Each reducer action creates one undoable history snapshot and resets redo; timer ticks are UI-only and do not create state/history updates.

## Rules (Extreme difficulty)
- **One tap MCQ:** teacher/student taps A/B/C/D, the reducer compares with `questions[questionIndex % questions.length].answerIndex`. No separate confirmation, no editable answer key on the client.
- **Defuse:** each answer button is shown as a coloured A–D wire. Correct instantly defuses the current tile, reveals the numerical award and plays score/fireworks. Incorrect cuts a wrong wire; the same tile becomes 💣, plays a blast and turn advances. No separate wire mini-question required, so bank progress remains exactly one question per tile.
- **Combo:** base award 20. Correct-streak 1–2 -> x1 (+20), 3–5 -> x2 (+40), 6+ -> x3 (+60). A wrong answer or timeout resets that team's streak; other teams keep theirs. Combo multiplier affects only base correct award, not boss bonus. A team does not gain the base award more than once.
- **Shield:** on each third consecutive correct answer the team gains one shield (max 2). A wrong answer/timeout consumes one shield before calculating penalty. The bomb visual/audio **still appears**, but its -20 secured-score penalty is absorbed; an unbanked POT (if present from an imported session) is still lost. No negative scores.
- **Timer:** new question starts with 15 seconds. `questionDueAt` recorded in saved state on tile selection, a visual 1/10-second countdown updates without reducer history. When the deadline passes, `TIMEOUT` is one atomic incorrect action (-20 unless shield absorbs), opens the bomb and advances turn. ANSWER_CHOICE with a timestamp beyond the deadline is also resolved as timeout, preventing a race. PAUSE stores remaining milliseconds and START resumes that time. When the portal closes or the document becomes hidden it pauses an in-flight Chaos question; students don't lose points while teacher switches windows. A resumed game shows a fresh timer for the preserved remaining time. No more than one timer per question.
- **Final Boss:** when <=5 playable tiles remain after any resolution, the boss becomes active with 3 HP. Correct answers during this stage remove exactly 1 HP; wrong answers do not heal/damage the boss. The hit that reaches 0 HP grants **+100** to the currently answering team once, with victory VFX. If the board ends without defeat, the boss is recorded as undefeated and cannot award phantom points. Undo/Redo preserves boss HP, bonus and team scores atomically.
- **Question/tile integrity:** for a question-gated Chaos game, outcomes override hidden tile events: correct -> `points20/40/60`, wrong/timeout -> `bomb`; existing non-Chaos random boards stay unchanged. No second opportunity to answer/reveal the same tile. One questionIndex increments per resolved question.
- **Difficulty profile:** Extreme settings are intentionally fixed for reproducibility in this first implementation; feature checkboxes allow teachers to disable mechanics individually. Other base modes never silently enable Chaos.

## Interface
Setup: a five-toggle group under mode, bilingual VI/EN, descriptive 15s/x3/3HP labels, and warning if no A–D bank. Game HUD shows five mechanic indicators, shield count and combo (only when relevant), boss HP strip (when active). Question modal is kept classroom-scale and central, has four wire-colour A–D buttons (Defuse), clock, current team and combo; no confirm button. Correct/wrong FX use existing iOS-safe synthesized/recorded audio; boss/defused copy is attached to the same overlay. CSS animation respects `prefers-reduced-motion` and `data-motion-bubble`; text status stays visible with animation disabled. Avoid changing hit boxes while a tap is processed.

## Storage / migration
Use existing `saveArena/loadArena` and per-owner IndexedDB/local storage, no server schema or Supabase migration. Old session with missing chaosKit uses old reducer branches unchanged. New sessions retain the original fields and add optional fields. `UNDO/REDO` restore team score, shields, combo, boss state and opened tile together. Resumed pending questions retain remaining timer; after closing/minimizing use PAUSE and require explicit Resume.

## Verification gates
1. 5 opt-in settings only for Chaos, 2–8 teams, 4×4/5×5/6×6 sizes.
2. Correct +20, combo threshold +40/+60, reset on incorrect.
3. Shield earned every 3 correct; shield absorbs one -20 penalty and is consumed.
4. Wrong and timeout both atomically reveal 💣 and advance turn; 0 floor.
5. Deadline races and double taps do not award twice.
6. Pause/resume and app close preserve remaining timer; no history tick spam.
7. Boss at <=5, three successful hits, unique +100, no phantom bonus on final tile.
8. Undo/Redo restores entire outcome including shield/boss changes.
9. Old snapshots, other modes, MCQ banks, Focus, Board and Instant Tools unaffected.
10. `npm run build` (existing full test suite) and Vercel Preview must succeed prior to merge. Runtime audio/motion quality still needs physical iOS/TV verification.

## Security / performance
No remote API, AI calls or paid services. No new npm dependency. Cap numeric inputs; actions with missing/invalid question/expired state are rejected. One timer callback per live selected question only. Autosaves occur on reducer transitions, not each countdown frame. Motion uses CSS transforms and existing ArenaEffects; accessibility labels and system reduced-motion are supported.
