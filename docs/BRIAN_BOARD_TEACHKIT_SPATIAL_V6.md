# Brian Teaching Board V6 — TeachKit-inspired spatial teaching tools

Date: 2026-10-25. Implementation: `anhtuan-hash/catrich2798`, production branch `main`.

## Reference and methodology

The requested reference is **https://teachkit.dqnotes.com/tools/board**. Its first-party home page describes the Board as an *infinite whiteboard for online teaching* where users can **type anywhere, move through frames like slides, reveal, focus and point**. Static extraction of the client-rendered board route returned only “Untitled / 100%”, so we have **not** claimed to verify each hidden TeachKit menu, gesture or implementation detail. These are independently implemented feature equivalents, not copied code, branding or proprietary assets.

## Features implemented in ESL Brian

1. **Infinite spatial ink canvas**: existing vector strokes, drawing shapes, stickies, images and masks use world coordinates; the Pan tool can move far outside the initial 1600 × 900 origin. The board uses viewport `x,y,width,height`, bounded to ±100,000 world units and 0.2–5× spatial display scale for performance.
2. **Frames as slides**: choose **Frames → Draw frame** and drag a rectangle (minimum 240 × 135), or **Add next frame** to append another area on the right. The frame is a region in the same infinite board; it does not duplicate or move ink.
3. **Ordered frame navigator**: teacher clicks a frame in the sidebar or chooses previous/next near zoom controls, with **Alt+← / Alt+→** shortcuts. Hidden frames are skipped. Maximum 32 frames per page, 80 lesson pages. Existing page navigation remains independent.
4. **Smooth camera travel**: fly toward the chosen frame using a short cubic easing; turns off automatically for reduced-motion or motion = Off. Home returns to 0,0.
5. **Frame editing**: rename, skip/unskip and delete a frame without deleting any underlying drawing content. Frame outlines can be hidden while teaching. All frame information stays in the teacher's private IndexedDB lesson, and is included in private JSON backups.
6. **Type anywhere**: Double-click empty canvas with the **Select** tool or tap with the **Text** tool when the toolbar text field is empty. A focused inline text input appears near the pointer. Press Enter or leave the editor to save (Escape cancels). The result is a real vector text object at that world coordinate; existing typed-text tool input continues to work.
7. **Tap-to-reveal curtain**: click an answer-curtain object to reveal underlying visible content; Undo restores the curtain. This is **visual concealment**, not security for raw published text: teacher-only secrets should be in the existing teacher-only content/flashcard flows, not beneath a published mask.
8. **Actual spotlight cutout**: a dark SVG overlay masks the full teacher view except a bright circular window that follows the pointer. Unlike the previous semi-transparent circle, this reveals the real underlying canvas.
9. **Live laser / spotlight on local TV**: an independent bounded `pointer` BroadcastChannel message carries only position and display mode, with no answers or teacher notes. The read-only projector can show the red laser or illuminated focus region and follow the teacher's spatial viewport. Large lesson snapshots are throttled while navigating.
10. **Frame-to-PDF presentation**: published frames are rendered to separate ordered 16:9 student PDF slides, each cropped to its world viewport. Hidden pages/frames are excluded; answer keys and teacher-only objects still pass through the existing allowlist.

## Using V6
1. Open ESL Brian → Brian Teaching Board.
2. Open **Khung / Frames** on the right. Choose **Vẽ khung / Draw frame**, drag out the region; repeat elsewhere, or use **Thêm khung kế tiếp / Add next frame**.
3. Click **Đến khung / Go to frame** or use the arrow buttons beside zoom. Pan with the **Hand** tool to travel beyond the existing slide.
4. To write, select **Text** and tap when the toolbar text field is blank, or double-click with **Select**; press Enter to commit.
5. To reveal on the teacher-controlled board, insert an **Answer curtain**, then tap it during teaching. The teacher can Undo to recover the curtain.
6. For projector view, open **TV Display** on the same device/browser origin. The projector tracks camera/frames and the pointer when **Laser** or **Spotlight** is active. This is not cross-device remote streaming.
7. Export **PDF bài dạy cho học sinh** for the spatial frame sequence (or the original 16:9 page when no frames exist).

## Architectural guardrails
- Frames are `page.frames` (teacher-private metadata); they are not published as lesson answers. The local TV receives sanitized `viewport` and owner-published `page` objects only.
- Owner-scoped IndexedDB, manual Cloud backups, independent Brian Focus, persistent YouTube audio, Supabase RLS and the 10 interactive activities are unchanged.
- No AI integration, no extra third-party graphics/services, no new database tables, no authentication bypass.
- A 300 KB optional Supabase backup limit still applies; large media-heavy drafts should use local storage and 25 MB private JSON backup instead.
- The local TV is currently **same device** using BroadcastChannel, not a secure remote pairing service.
- Independent spatial work was based on TeachKit’s published overview and locally inspectable page; it is not a pixel-accurate replica and some functions may differ.
- Acceptance on signed-in iPad, touch Android, Apple Pencil, Safari and a real HDMI display remains recommended; passing production build gates does not prove all hardware-specific gestures.
