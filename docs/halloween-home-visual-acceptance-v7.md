# Halloween Home — visual acceptance against approved 1024×1536 reference

Source reference: owner-provided screenshot `image(20261028-165222).png` (not checked into repository).

## Why V5 failed

The production screenshots show an unillustrated/low-detail vector castle; unused white surrounding canvas; a pale, partly original navigation bar; an old 390px slideshow pseudo-element that created excessive empty space; no live artwork thumbnail filmstrip; bright old Footer cards lacking integrated Halloween surroundings. A green build and CSS OFF regression were incorrectly treated as approval of the artwork.

## V7 technical changes

- The **Home** master switch drives the navbar and footer even if their legacy sub-switch cache is stale.
- V6 removes the 390px gallery pseudo-element layout gap.
- V7 matches main proportions better, removes the unwanted editorial dateline and white page gutters, and creates a real gallery thumbnail rail from published images with click-to-select.
- Styles are scoped to the Home's master ON flag; OFF restores the original presentation.
- GitHub Actions check build, 1440px/768px/390px screenshot fixture, missing lesson controls, and OFF restoration.

## Explicitly NOT accepted yet

The original mockup features intricate, layered high-resolution Halloween illustration across the entire screen: trees, candles, castle, witch ghost, cat, layered pumpkins, atmospheric mist, and decorative frames. The existing repo does not yet contain equivalent cut-out art assets. V7 CSS uses existing SVG scenery and cannot achieve faithful reproduction by itself.

Do NOT mark this page visually complete or merge only because automated tests pass. Final acceptance requires:
1. Import optimized, copyright-cleared artwork derived from or newly created to match the approved screenshot into `public/assets/home/`, with responsive layers rather than flattening the entire page.
2. Place real navigation, text, slideshow, weekly lessons, and Footer on top of that art, not a screenshot of controls.
3. Run a real-browser screenshot comparison of deployed Preview against the owner reference at 1024px, 1440px, and 390px with visible Halloween ON and OFF.
4. Obtain the owner's visual approval; keep production original otherwise.
5. Ensure Home Admin OFF restores original design with no CMS media/data mutation.

Status: source/code regression passed; visual art parity **not demonstrated**.
