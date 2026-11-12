# Gallery Admin / Teacher Guide

**Current condition:** Feature branch only. Gallery is OFF by default and requires reviewed SQL migration. Do not try to enable on production before staging RLS tests.

1. Navigate to **Quản trị / Admin**; the Immersive Gallery panel displays feature status. Only approved backend `admin` can change the flag.
2. After review and *authorized* migration, enable Gallery. Its tile appears in **Ứng dụng / Apps**.
3. Open **Exhibition Studio**. Choose **Create sample exhibition** (admin only) for 8 original demo exhibits, or create a draft manually. The demo has no real student data and remains PRIVATE.
4. Fill title, slug, summary, and visibility. Default is PRIVATE. Teachers can author drafts; an admin must publish.
5. Create rooms from Classic / Culture / Lab presets. Select a room to add text, poster, audio, PDF, safe YouTube URL or a procedural curated 3D shape.
6. For image/audio/PDF, upload the file (private bucket; signed media URLs). Files are not made public automatically.
7. Pick an exhibit and change its X/Y/Z position, rotation and scale numerically. Save and reopen to verify persistence.
8. Open **Duyệt bài / Review**, approve trusted original works, reject unsuitable submissions with a note. Draft works also require approval before publishing.
9. As admin, confirm visibility and select **Review & publish**. Visitors with existing Brian login privileges can explore the exhibition; the 2D list is accessible without WebGL.
10. Use **Unpublish** or the site-wide OFF toggle to hide published content; the latter preserves drafts.

**Do not upload identifiable student photos, names, voices or unlicensed media without school authorization and appropriate consent.** The current `profiles` constraint blocks true student-role accounts; student submission flows require a separately approved identity model.
