# Grade 12 Global Success — Ten Brian Family Feud Unit Games

## Learning objective
Offer **one independent Family Feud classroom game for each Unit** of English 12 Global Success, rather than one pool of unrelated English 12 questions. Units 1–10 use the book's confirmed unit labels.

## Content structure
- Ten separately selectable game IDs: `g12-unit-1` through `g12-unit-10`.
- **12 teacher-authored, distinct survey-style question boards per Unit**. Each board has six semantically different and grammatically correct answer suggestions.
- 120 question boards and 720 answer suggestions across all ten games.
- Each board's *gameplay score* totals exactly 100, but is **not real survey data**. Never label these weights as votes/results of a genuine survey.
- Recommended game structure per Unit: **5 main rounds** (ordinary 3 rounds also supported) and **Fast Money with two representatives answering five additional unseen boards each** (same five boards across the two representatives). Two spare boards remain for replay.
- Normal rounds retain 3 strikes, one-attempt steal, x2 and x3 last rounds, revealing six ranked answers and a separate scoreboard. The game engine has no AI.
- Unit themes: 1 Life Stories We Admire; 2 A Multicultural World; 3 Green Living; 4 Urbanisation; 5 The World of Work; 6 Artificial Intelligence; 7 The World of Mass Media; 8 Wildlife Conservation; 9 Career Paths; 10 Lifelong Learning.
- Prompts are written in **English for B1–B2 interaction**, encourage short open-ended responses, not A–D multiple choice.
- Content uniqueness rules: no repeat full question prompt across any of 120 boards; no repeated suggested answer *within* a board; every game has category title/unit metadata and its own immutable bank.

## Experience and technical architecture
- Under Brian Family Feud's setup, add a prominent 10-game selection gallery (with independent game IDs, icons, title, unit number, question-board count).
- Selected Unit is default **Unit 1** for new setups. Click any other Unit to change the whole question bank, not just its label.
- Existing general English 10/11/12 bank remains available as `General Bank`. Existing custom CSV imports remain available; custom import takes priority and clearing it returns to Unit 1.
- Unit mode offers 3 or 5 main rounds to reserve at least five unseen boards for Fast Money. Original general/custom mode continues to offer 3, 5, 8 or 10 rounds.
- New sessions include `edition={id,unit,title}`; display it on main game round banner, Fast Money and results. Existing saved sessions have `edition=null` and continue unmodified.
- CSV export downloads the selected Unit bank and preserves Vietnamese and English text encoding; teacher can edit/reimport these original banks. Session state persists through the preexisting dedicated Family Feud IndexedDB storage, no server/database changes.
- Responsive gallery: desktop TV 3 or 2 columns as space allows, phone 2 columns with readable labels; do not touch Bomb Arena/Focus/Board/Instant Tools. Respect existing global Bubble Motion setting.

## Validation and release
- Assert all ten specific Unit IDs, titles, 12 boards each, six answer suggestions each, sum100 each.
- Assert 120 distinct prompt strings globally and no duplicated choices within any board.
- Validate each bank via `validateFeudBank`; 5-round family feud mode leaves five or more unused boards for Fast Money.
- Simulate each Unit game's 5 base rounds and Fast Money two-player cycle; score awards once, Undo/Redo works.
- Ensure generic Grade 10 and 11 banks still work, custom imports still win when selected, no old saved state upgrade break.
- Run existing suite + new content test inside `npm run build`, verify Vercel Preview success and merge only after green.
- Physical browser iOS/TV look-and-feel, audio/animation timing require on-device smoke tests.

## Scope
No collection of actual survey responses; no AI; no new paid dependencies; no Supabase migrations; no changes to other bubble apps.
