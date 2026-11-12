# BRIAN Museum Lab V3.3 — Pétrus Ký Discovery Hall

## Intent

Create an **original virtual museum inspired by the school**, not a survey, CAD model,
photogrammetry or exact 3D replica of an actual Pétrus Ký campus. The student artwork
remains the primary focus; the school identity is architectural context, not evidence
of student work.

### Verified public design references

- School-run 2023 institutional overview:
  https://cm.pek.edu.vn/fr/news/dien-dan-giao-duc/truong-trung-tieu-hoc-petrus-ky-san-sang-moi-nguon-luc-cho-nam-hoc-moi-1259.html
  - Published institutional values: **Thân thiện — Trách nhiệm — Hợp tác — Phát triển**.
  - Reported expanding facilities and advanced secondary-school learning spaces.
- School homepage: https://pek.edu.vn/
- Reported school exterior, teal/turquoise yellow and white facade:
  https://thanhnien.vn/binh-duong-truong-petrus-ky-dung-khao-sat-thong-tin-phu-huynh-lam-vien-chuc-nha-nuoc-185250320150119231.htm
- Outdoor campus courtyard and buildings photo:
  https://mekongsport.com/du-an/truong-hoc-co-quan-cty/binh-duong-truong-petrus-ky-trang-bi-dung-cu-the-thao-ngoai-troi-phuc-vu-cac-em-hoc-sinh-trong-nam-hoc-moi/
- School crest imagery with tree and "PéK" lettering was publicly visible,
  including https://kiddihub.com/chi-tiet/truong-tieu-hoc-thcs-petrus-ky-hiep-thanh .
  The V3.3 emblem is an **original geometric design**, not the school's authorized
  exact logo file.

## 3D design decisions

1. A modern discovery hall with teal / pine / warm gold / white campus colors.
2. Original "PÉTRUS KÝ — DISCOVERY MUSEUM" interior signage, and a stylized
   pine/tree medallion; no external image assets are fetched.
3. Side window bays and school corridor references as architectural abstraction.
4. Four values engraved on side panels, with English translations.
5. Hand-built book and tree sculptures, terrazzo-style promenade and museum
   lighting. Performance-lite mode omits these decorative sculptures.
6. A real foreground **display wall** behind the student's 3 existing exhibits:
   prevents the floating-poster impression, while retaining all original student
   image asset IDs and normalized positions.
7. Larger, aspect-preserving framed artwork with dynamically drawn exhibit labels.
8. Camera moved closer to the student gallery; two optional guided camera jumps
   ("Đến gần tranh" / "Toàn cảnh"). Default WASD and mobile buttons still work.

The lobby and other gallery templates all receive the PEK identity inside the
Museum Lab. The old Gallery R1 Canvas remains available without the school overlay.
This **does not claim** the architectural layout exactly matches the building at
any particular school address; the actual THPT campus may have a different facade.

## Reproducibility & safety

- Source: src/features/immersive-gallery/PekMuseumArchitecture.jsx
- Optional integration: GalleryCanvasR3F.jsx with "schoolEdition=false" by default
- Museum Lab visitor: v3/MuseumScene.jsx passes "schoolEdition"
- Controls: src/features/immersive-gallery/pekMuseum.css
- Tests: scripts/test-pek-museum-v33.mjs and tests/museum-lab/museum-ui.spec.js
- Visual test screenshots: artifacts/museum-lab/pek-hall-*.png (synthetic data only).
- WebGL runs entirely in the existing browser. Textures are procedurally generated
  with CanvasTexture, disposed on unmount. No new remote GLBs, no user-executable
  3D file uploads, no new data collection, migrations or permission grants.
- Existing Creator Pass, school approval and TTCM rules are unchanged.
- All student images retain existing controls and alt/description accessible via
  2D fallback. The school crest and 3D side value boards are decorative.

## Acceptance

- Browser: no blank screen on desktop/mobile; visible real student artworks on
  a 3D wall; close and wide camera controls function.
- Building: Vite site compiles, site i18n audit green.
- Security: Creator Pass, RLS and gallery isolation gates green.
- Responsiveness: preserve 2D when WebGL unavailable, mobile navigation and
  reduced-motion CSS.
- Production: release only after latest Preview is READY and existing security
  checks pass. After merge verify deployment SHA and the main site alias.

This is an educational design asset, not a claim that the school officially
endorsed this particular virtual hall.
