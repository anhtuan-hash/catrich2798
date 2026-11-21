# Official Halloween Home reconstruction

The sole design reference is the owner's `image(20261029-115534).png` (998 × 1576). This change replaces the existing V11 presentation in place. It does not create another proposed design or modify lesson, gallery, permission, or footer content.

The reference uses a single purple landscape, a compact navigation bar, uncropped published artwork, three inset blue/orange/teal lesson cards and translucent footer sections. The existing React components, API reads, sorting, lesson runner, statistics, management, portfolio dialog and Halloween master switch remain live. Mobile uses its existing dedicated React presentation.

## Measured reference anchors

At a 998 × 1576 viewport, the fixture rendering measures:

| Element | Reference | Rendering |
| --- | --- | --- |
| Navigation x / y / height | 55 / 7 / 42 px | 54.9 / 7 / 42 px |
| Gallery x / y / width | 42 / 392 / 914 px | 41.9 / 392.3 / 914.2 px |
| Lesson grid x / y | approximately 75 / 947 px | 73.9 / 947.6 px |
| Lesson card height | approximately 339 px | 340 px |
| Footer x / y | approximately 42 / 1330 px | 41.9 / 1327.6 px |

These measurements are layout checks, not a pixel-perfect score. Screenshot tests use an explicitly synthetic TTCM session, 65 lessons and five test gallery images. They do not establish that the production database or authenticated Preview flow was tested.

## Logo integrity

The transparent SVGs embed the original PNG bytes, remove only the near-white background using an SVG alpha filter, and preserve the white shield content of the Cambridge logo with a clip path. No generated redraw is used. Browser pixel tests verify transparent corners and zero changes (tolerance 2/255) among 13,429 Pétrus Ký and 13,128 Cambridge opaque dark/colored source pixels. Original logo files remain available.

## Verification

Run `npm run build`, the global footer and Halloween source contracts, and both browser suites below with the intercepted fixture backend:

- `scripts/test-halloween-home-v12-live-browser.mjs`: responsive desktop/tablet/phone presentations, master OFF restoration and overflow checks.
- `scripts/test-halloween-home-v13-density-browser.mjs`: 998/1024/1174/1440/768 widths, full lesson lists, five visible rows, sorting, last-row access, TTCM statistics, mobile expand/collapse, reference anchors and logo alpha/color checks.

The CI workflow stores sanitized screenshots and geometry/alpha reports under `artifacts/halloween-v13/`.

## Remaining differences / review gate

- Gallery images, title, captions and counters are live data and differ from the static reference according to the selected album and slide.
- The generated decorative environment and thin card frame reproduce the reference composition but are not its original layered artwork. Fine leaves, lanterns, stars and character details differ.
- Typography depends on the site's existing fonts. The original design font file was not supplied.
- Footer retains all actual text, including the existing optional brand tagline/year. Natural wrapping can make it taller than the reference; the synthetic full page currently measures 1635 px, versus the 1576 px reference.
- Mobile adapts the reference using existing touch controls, 44 px lesson targets and stacked sections rather than shrinking desktop text.
- Owner approval of the Vercel Preview is required before merge or production deployment. This branch must not be auto-merged or promoted.
