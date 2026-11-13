# Museum Lab V5.4 — Release acceptance, data policy and rollback
Date: 2026-11-13 · Status: release candidate
Parent specification: BRIAN_MUSEUM_V52_V54_ENGINEERING_SPEC.md
## Changes
- Speaking Studio is available **only while Teacher Live is on Activity 10 (Present and Discuss), and the task is open**. It displays three English cue cards derived from the current group's own learning fields.
- A microphone is requested **only after the learner clicks Start local recording**. Recording stops at 60 seconds or on user action, supports playback and deletion, and never auto-uploads to a server. Speech synthesis requests en-US but the actual voice depends on the browser. There is no transcription or pronunciation grade.
- Motion sequences are different for all 11 stages, visible only on Teacher Live's teaching canvas when Motion ON. They do not trigger video or audio and respect the OS reduced-motion setting.
- Teacher tab recovery stores only assignment ID, stage hint, motion preference and non-sensitive panel flags in sessionStorage. The server remains authoritative for the current lesson stage. Browser Fullscreen itself cannot be restored without a new user gesture. Group passes and audio files are never stored there.
- Evidence ZIP gains an 11-activity matrix, group-device exit tickets, thinking challenges, exhibit-targeted peer feedback, and reflection/roles table. `Record_provenance.csv` and README classify prepared content for the teacher and explicitly require independent verification before competition submission. Existing ZIP records retain their original values.
## Acceptance matrix
1. Node security/logic tests: passing. Stage plan stays 11× and 2×45 minutes; unknown data are not turned into invented grades.
2. Playwright Chromium desktop/mobile: Speaking Studio enters only via user click, a stub microphone is not invoked on mount, recording can be stopped and deleted, and overlays remain accessible.
3. Existing Museum Lab V3.1 and Museum Lab V3 acceptance workflows: passing.
4. Vercel Preview build: READY for exact PR commit.
5. Production: PR merged after gated QA and deployment READY with expected GitHub SHA and domain aliases.
## Boundaries
- No external paid TTS/ASR provider and no claim of certified American English pronunciation.
- No local audio file persistence across refresh; previous audio is intentionally discarded when a component closes.
- No artificial student data added and no modifications to the ten existing group drafts.
- No automatic claim that scripted presentation records establish classroom effectiveness or environmental savings.
- Remaining system-wide Settings/EventPopup CI errors require separate triage.
## Rollback
Vercel can redeploy the preceding READY production commit. The code is additive, with no schema migration or destructive data operation.
