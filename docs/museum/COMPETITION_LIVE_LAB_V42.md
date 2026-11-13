# BRIAN Museum Lab · Competition Live Lab V4.2

## Scope and curriculum alignment

Target: *Our Climate Action Museum: From a School Survey to a 3D English Exhibition*, English 11 Global Success Unit 5 (Global Warming), **2 × 45 minutes**.

This is an enhancement to the existing Teacher Live and Student Creator product. It does not revise the 90-minute sequence, weaken the evidence rules, or alter BRIAN's global header and navigation.

| Stage | Minutes | Live interaction / tool | Evidence |
|---|---:|---|---|
| 01 Climate Detective | 5 | animated choices, group vote, optional English narration, curated context video | warm-up vote; not counted as scientific study |
| 02 Language Mini-Lesson | 10 | three group MCQs, cause/effect micro-speech, sourced library, voiceover | existing group quiz answers |
| 03 Live Classroom Survey | 10 | one valid group choice, frozen N/counts/percent, teacher-assigned research topic | timestamped group-level survey, no student habits inferred |
| 04 Problem–Evidence–Solution | 12 | group design canvas + Evidence Detective challenge | group reason and authentic design notes |
| 05 Storyboard | 8 | three-item storyboard + sequencing challenge | group thinking record and storyboard |
| 06 Recap | 4 | replay voiceover + source-check challenge | source reliability reasoning |
| 07 Create 3D Museum | 18 | original image upload, three English labels, caption-check challenge | genuine image, metadata and gallery draft |
| 08 Peer Gallery Walk | 8 | private 2D/3D visits, learned/clarify/rating feedback | timestamped peer reviews |
| 09 Revise | 6 | before/after checkpoint + revision thinking challenge | preserved before/after versions and feedback reasons |
| 10 Present | 6 | group spotlight, 3D tour, evidence-based pitch challenge | sourced pitch reasoning |
| 11 Exit Ticket | 3 | written English action, closing narration | existing exit tickets and museum submission |

## Production architecture

1. **Motion design:** stage-keyed page transitions, staggered question/answer cards, subtle layered-art motion, status feedback; teacher can switch off. Respects `prefers-reduced-motion` and never moves the fixed timer/status bar across other text.
2. **Voiceover:** `SpeechSynthesisUtterance`, eleven original English scripts, 0.8×–1.1× speed, transcript, pause/resume/stop. On-device only, no mic recording or external TTS fees; speech voice availability varies across browser/OS.
3. **Research library:** NASA/United Nations and self-authored short English research notes, cited source links, source-check questions, searchable by activity; no fake classroom observations.
4. **Video Research Studio:** teacher assigns a search topic and task, optionally approves up to six video IDs per stage, group can view approved videos inside the lesson. Group search is restricted to the assigned topic with a short refinement; teacher free search available after class starts. Official YouTube Data API only, with strict safe-search and embeddable filter. Never scrape YouTube HTML as a fall-through. Videos load in `youtube-nocookie.com` IFrames after explicit clicks. Some YouTube videos may disallow embedding.
5. **Student thinking challenges:** six formative tasks requiring a multiple-choice decision **and** an English explanation, saved once per group/stage to a private RLS table. They are formative observations, not automatically graded achievements, and never replace original student captions, peer feedback or artwork.
6. **Evidence discipline:** existing survey freeze, 3D private publication, file sanitation, checkpoint history, teacher authorization and group Creator Pass remain authoritative.

## Teacher video setup

- Add **server-only** `YOUTUBE_API_KEY` to the project's Vercel production and preview environments (Google Cloud YouTube Data API v3 enabled). Do **not** add `VITE_YOUTUBE_API_KEY`; it would expose the key in the browser.
- Search uses the Google YouTube Data API v3, with project quota limits. The app returns a clear `youtube_api_key_not_configured` message while the key is missing.
- **Without an API key**, teachers can still paste an appropriate public YouTube URL, label it, and explicitly approve it for the current lesson stage. Students can watch embedded videos in the app, subject to YouTube embeddability and internet access.
- The embedded player is an external service. The app does not download, bypass ads, reproduce or redistribute third-party videos. Teachers should review videos/captions for age appropriateness and citation before projecting.

## Competition acceptance requirements

- Verify all eleven stages on a real MacBook projector at 16:9, 1366×768 and narrow mobile viewports. No overlapping controls or inaccessible hidden status; key interaction elements operable without motion.
- Verify educator task prompt updates propagate to genuine student Creator Pass sessions only at the authorized activity.
- Verify no group can submit to another group's record; same-stage resubmissions do not overwrite the first real answer.
- Verify YouTube official search with a configured key *and* the no-key fallback; do not claim search is functioning live without testing the configured key.
- Collect authentic student learning outputs and teaching evidence after teaching. Synthetic QA content must never be presented as class performance.
- Compare the teacher's revised plan with P2 learning objectives, especially 3 English captions (25–40 words), source + sample size/limitations, genuine student artwork, one peer comment, and documented revision.

## Evidence and contest judgement

This release offers product features and a verifiable testing path. It does **not** by itself demonstrate that pupils learned more, that the school contest accepted the entry, that the selected video complies with rights/embedding restrictions, or that the lesson was delivered to a real class. Classroom piloting and authorized anonymized evidence collection remain mandatory.
