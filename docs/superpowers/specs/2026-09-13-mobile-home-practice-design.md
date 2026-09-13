# Mobile Home + Weekly Practice Design

## Scope

Phase 2 builds the first route body that is genuinely mobile-first on top of the approved Mobile App Shell Foundation. It covers `#/home` and the Weekly English Practice experience rendered on Home. Desktop and landscape-tablet route bodies remain visually and behaviorally unchanged.

## Approved presentation contract

- Phone: mobile presentation.
- Portrait iPad/tablet: mobile presentation.
- Landscape iPad/tablet: desktop presentation.
- Laptop/desktop: desktop presentation even when the browser window is narrow.
- Presentation is selected by the shared `usePresentationMode` / `presentationMode` classifier from Phase 1; do not add UA redirects, `/mobile` routes, or a second breakpoint system.
- Existing hash routes, permissions, weekly-practice data, management actions and legacy runner remain the source of truth.

## Mobile Home experience

The mobile route body sits below `MobileAppShell` and uses a compact app-like hierarchy:

1. A hero card with the existing Brian English value proposition, practice count and two primary actions. The first action preserves the current start/login permission behavior; the second opens Apps.
2. A Featured Tools section using a two-column touch grid. Tool visibility and route permissions are inherited from the existing `tools` model in `HomeApproved`.
3. A Weekly English Practice section with published-count summary, grade chips for 10/11/12 and a vertically stacked list of practice cards for the selected grade.
4. TTCM/admin management actions remain available when `canManagePractice` is true, but are compact and touch friendly.

The mobile view must not duplicate fetching, permissions or business rules. `HomeApproved` remains the data/controller layer and delegates only presentation to a focused mobile component.

## Weekly Practice behavior

- Grade 10 is the initial grade unless another grade is selected during the current mounted session.
- Grade chips are buttons with `aria-pressed` and minimum 44px target height.
- Every published/current or historical item appears in the selected-grade list; cards are sorted newest first using `opens_at`, then `published_at`, then `created_at`.
- Open/current items invoke the existing `openLegacyPractice` bridge. Future/unavailable items keep the existing schedule behavior through that same bridge.
- Loading, error and empty states are explicit and do not collapse the page.
- The mobile list must not introduce horizontal page scrolling.

## Desktop preservation

The existing editorial desktop markup (`bha-editorial-dateline`, `HomeHeroExperience2026`, Featured Tools desktop grid, folio grade cards and TTCM controls) stays intact and is rendered for desktop presentation. Phase 2 may add imports and a mobile rendering branch, but must not redesign or rewrite the desktop markup/CSS.

## Accessibility and touch

- Interactive targets are at least 44px high/wide where applicable.
- Grade selector exposes pressed state.
- Practice cards use semantic headings and real buttons.
- Text remains readable at browser zoom and system font scaling.
- Fixed Mobile App Shell safe-area/bottom-nav spacing remains authoritative; route content must leave enough bottom space and must not cover the bottom navigation.

## Testing contract

Playwright must verify:

- Pixel/phone renders the mobile Home body and hides the desktop Home dateline.
- Portrait iPad renders the mobile Home body.
- Landscape iPad and desktop render the existing desktop Home body and do not render the mobile Home body.
- Mobile Featured Tools contains interactive cards.
- Grade selector changes the visible grade panel and keeps 44px touch targets.
- Mobile Home and Weekly Practice do not create horizontal document overflow.

Unit tests should cover any new pure sorting/label helpers if they are extracted. Build and the Phase 1 Mobile App Shell suite must remain green.