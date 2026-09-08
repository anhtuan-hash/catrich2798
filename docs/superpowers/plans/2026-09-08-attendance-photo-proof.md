# Attendance Photo Proof Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an optional photo-evidence workflow to Quick Attendance, store one private image per completed attendance session, show it in History, and clean it up when attendance sessions/classes are deleted.

**Architecture:** Extend `bes_extra_attendance_sessions` with a nullable `proof_path` that points into a new private Supabase Storage bucket. The quick-attendance UI captures/selects and compresses a single image locally, confirms attendance first, then uploads the image and attaches its path through a security-definer RPC. History creates a short-lived signed URL only for users with History permission. Existing delete flows remove stored objects before deleting their session/class data.

**Tech Stack:** React, Supabase JS client/Storage, PostgreSQL/Supabase RLS, existing Node contract tests, CSS.

**Spec:** User-approved design in the 2026-09-08 attendance conversation: optional camera/file capture, one image per session, private storage, History preview, cleanup on delete, Quick permission to upload and History permission to view.

## Global Constraints

- Photo evidence is optional; absence of a photo must never block attendance confirmation.
- Mobile capture uses `accept="image/*"` plus `capture="environment"`; desktop can choose an image file.
- Store only one image path per attendance session.
- Bucket is private and bounded to image MIME types and a 2 MiB storage limit.
- The client compresses images to JPEG, max edge 1600 px, targeting at most 1.5 MiB before upload.
- Quick attendance permission controls upload/attach; History permission controls read/signed URL creation.
- Existing attendance RPC authorization and attendance business rules remain unchanged.
- If attendance confirmation succeeds but optional photo upload fails, keep the confirmed session and report only the photo-evidence failure.
- Deletion cleanup must be best-effort and must not block deleting an attendance session if the storage object is already missing.

---

### Task 1: Add failing contract coverage

**Files:**
- Modify: `scripts/test-attendance-hub-absence-ui.mjs`
- Test: `scripts/test-attendance-hub-absence-ui.mjs`

**Interfaces:**
- Consumes: `GlobalAttendanceNavigationTab.jsx`, `attendanceProofImage.js`, new migration SQL, `AttendanceMaterial3.css`.
- Produces: contract assertions for capture semantics, private bucket/RLS, image compression limits, history signed URL rendering, and deletion cleanup.

- [ ] **Step 1: Write the failing test**

Add assertions that require:

```js
assert.match(attendance, /capture=["']environment["']/);
assert.match(attendance, /Minh chứng hình ảnh/);
assert.match(attendance, /createSignedUrl/);
assert.match(attendance, /ATTENDANCE_PROOF_BUCKET/);
assert.match(proofUtility, /ATTENDANCE_PROOF_MAX_EDGE\s*=\s*1600/);
assert.match(proofUtility, /ATTENDANCE_PROOF_MAX_BYTES\s*=\s*1_500_000/);
assert.match(proofMigration, /proof_path\s+text/);
assert.match(proofMigration, /attendance-session-proofs/);
assert.match(proofMigration, /can_take_extra_class_attendance\(\)/);
assert.match(proofMigration, /can_view_extra_attendance_proof\(\)/);
assert.match(css, /att-m3-proof-card/);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `node scripts/test-attendance-hub-absence-ui.mjs`

Expected: FAIL because photo-evidence source, utility, migration, and styles do not exist yet.

- [ ] **Step 3: Commit**

```bash
git add scripts/test-attendance-hub-absence-ui.mjs
git commit -m "test: require attendance photo proof"
```

### Task 2: Add private storage schema and secure attachment RPC

**Files:**
- Create: `supabase/migrations/20260908_attendance_photo_proof.sql`

**Interfaces:**
- Consumes: `public.can_take_extra_class_attendance()`, profile permissions, `bes_extra_attendance_sessions`.
- Produces: `proof_path text`, private `attendance-session-proofs` bucket, `public.can_view_extra_attendance_proof()`, and `public.bes_set_extra_attendance_proof(uuid,text)`.

- [ ] **Step 1: Implement minimal migration**

```sql
alter table public.bes_extra_attendance_sessions
  add column if not exists proof_path text;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('attendance-session-proofs','attendance-session-proofs',false,2097152,array['image/jpeg','image/png','image/webp'])
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
```

Add `can_view_extra_attendance_proof()` that allows only approved Admin/Administrator, legacy `route:attendance`, or explicit `attendance:history`. Add storage insert policy using `can_take_extra_class_attendance()` and select policy using `can_view_extra_attendance_proof()`. Add security-definer `bes_set_extra_attendance_proof(p_session_id uuid, p_proof_path text)` that validates the path prefix `<session-id>/`, validates the session exists and is completed, and updates only `proof_path`.

- [ ] **Step 2: Run contract test**

Run: `node scripts/test-attendance-hub-absence-ui.mjs`

Expected: still FAIL because UI/utility/styles are not implemented yet, but migration assertions pass.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260908_attendance_photo_proof.sql
git commit -m "feat: add private attendance proof storage"
```

### Task 3: Add browser image preparation utility

**Files:**
- Create: `src/utils/attendanceProofImage.js`

**Interfaces:**
- Produces: `ATTENDANCE_PROOF_BUCKET`, `ATTENDANCE_PROOF_MAX_BYTES`, `ATTENDANCE_PROOF_MAX_EDGE`, `prepareAttendanceProofImage(file)`, `buildAttendanceProofPath(sessionId)`.

- [ ] **Step 1: Implement minimal compression helper**

`prepareAttendanceProofImage(file)` validates `image/*`, decodes the image, scales the longest edge to at most 1600 px, encodes JPEG starting at quality 0.86, and reduces quality down to 0.55 until output is at most 1.5 MiB. Throw a Vietnamese validation error if the result still exceeds the client limit.

`buildAttendanceProofPath(sessionId)` returns `${sessionId}/${Date.now()}-attendance-proof.jpg` after validating the session id is non-empty.

- [ ] **Step 2: Run contract test**

Run: `node scripts/test-attendance-hub-absence-ui.mjs`

Expected: still FAIL only on UI/styles.

- [ ] **Step 3: Commit**

```bash
git add src/utils/attendanceProofImage.js
git commit -m "feat: prepare attendance proof images"
```

### Task 4: Wire optional capture/upload into Quick Attendance

**Files:**
- Modify: `src/components/GlobalAttendanceNavigationTab.jsx`

**Interfaces:**
- Consumes: proof utility exports and `bes_set_extra_attendance_proof` RPC.
- Produces: local image selection/preview, optional upload after successful attendance confirmation, and storage cleanup helpers reused by delete flows.

- [ ] **Step 1: Add state and hidden camera input**

Add `proofFile`, `proofPreviewUrl`, `proofInputRef`, `proofUrl`, and `proofLoading`. Render a proof card above the existing confirm footer with copy `Minh chứng hình ảnh` and `Không bắt buộc`, a hidden input `accept="image/*" capture="environment"`, a `Chụp ảnh / Chọn ảnh` button, preview thumbnail, `Đổi ảnh`, and `Xóa ảnh`.

- [ ] **Step 2: Add upload after confirmation**

After `bes_confirm_extra_class_attendance` succeeds, if `proofFile` exists:

```js
const prepared = await prepareAttendanceProofImage(proofFile);
const path = buildAttendanceProofPath(created.id);
await client.storage.from(ATTENDANCE_PROOF_BUCKET).upload(path, prepared, { contentType: 'image/jpeg', upsert: false });
await client.rpc('bes_set_extra_attendance_proof', { p_session_id: created.id, p_proof_path: path });
```

If either optional step fails, preserve the confirmed attendance session and show a warning that only the photo evidence failed.

- [ ] **Step 3: Add deletion cleanup**

Before deleting one/bulk session or a class, collect non-empty `proof_path` values and call `client.storage.from(ATTENDANCE_PROOF_BUCKET).remove(paths)`. Treat an already-missing object as non-fatal and continue the existing delete RPC.

- [ ] **Step 4: Run contract test**

Run: `node scripts/test-attendance-hub-absence-ui.mjs`

Expected: only History/styles assertions may remain failing.

- [ ] **Step 5: Commit**

```bash
git add src/components/GlobalAttendanceNavigationTab.jsx
git commit -m "feat: capture attendance photo evidence"
```

### Task 5: Show private proof in History and style the surfaces

**Files:**
- Modify: `src/components/GlobalAttendanceNavigationTab.jsx`
- Modify: `src/components/attendance/AttendanceMaterial3.css`

**Interfaces:**
- Consumes: selected session `proof_path`, private bucket.
- Produces: History signed URL viewer and responsive proof-card styling.

- [ ] **Step 1: Load signed URL only in History**

When a History session with `proof_path` becomes selected, call:

```js
client.storage.from(ATTENDANCE_PROOF_BUCKET).createSignedUrl(selectedSession.proof_path, 300)
```

Clear it when selection changes or no image exists.

- [ ] **Step 2: Render History evidence**

Render `Minh chứng hình ảnh` with the image thumbnail and an `Mở ảnh lớn` button/link opening the signed URL in a new tab. If there is no proof, omit the section.

- [ ] **Step 3: Style**

Add `.att-m3-proof-card`, `.att-m3-proof-preview`, `.attendance-history-proof`, responsive rules, and focus/disabled states using existing Material 3 tokens.

- [ ] **Step 4: Run focused and full checks**

Run:

```bash
node scripts/test-attendance-hub-absence-ui.mjs
npm run build
npm test
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/GlobalAttendanceNavigationTab.jsx src/components/attendance/AttendanceMaterial3.css
git commit -m "feat: show attendance proof in history"
```

### Task 6: Production verification and rollout

**Files:** none unless verification finds a defect.

- [ ] **Step 1: Review PR diff and CI**

Confirm only attendance proof files/lines changed and all required GitHub Actions checks are green.

- [ ] **Step 2: Apply Supabase migration**

Execute `supabase/migrations/20260908_attendance_photo_proof.sql` against the connected production project and verify the column, bucket, policies, and RPC exist.

- [ ] **Step 3: Merge to `main`**

Merge only the verified PR head SHA.

- [ ] **Step 4: Verify deployment**

Confirm Vercel production reaches READY/SUCCESS for the merge commit and verify the production UI exposes optional photo capture without changing normal attendance behavior.
