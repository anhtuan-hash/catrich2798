# Asset Audit — Swiss Editorial Premium V3

Canonical visual target: `design/reference/swiss-editorial-approved.png`

## 1. Verified Static Assets (`public/`)

| Asset Path | Role in V3 UI | Verification Status |
|---|---|---|
| `/logo-brian-english.png` | Topbar left brand mark & dark-navy footer closing strip mark | Verified present in `public/` |
| `/brian-english-brand-logo.png` | Footer Card 1 institutional partner mark (Brian English) | Verified present in `public/` |
| `/footer-pek-logo.png` | Footer Card 1 school logo (Pétrus Ký — The Pioneers) | Verified present in `public/` |
| `/footer-cambridge-logo.png` | Footer Card 1 Cambridge Assessment English mark | Verified present in `public/` |
| `/museum/branding/hcmc-department-education-original.jpg` | CompetitionBanner left circular seal (Sở GD&ĐT TP.HCM, 299x300) | Verified in `public/museum/branding/` |
| `/museum/branding/petrus-ky-original.png` | CompetitionBanner right circular crest (Trường Trung - Tiểu học Pétrus Ký, 1682x2048) | Verified in `public/museum/branding/` |
| `/museum/branding/petrus-ky-school.png` | Overview editorial hero diagonal-clipped school campus photo | Verified in `public/museum/branding/` |
| `/museum/artwork/green-campus-01-problem.avif` | Museum lesson / exhibition fallback artwork 01 | Verified in `public/museum/artwork/` |
| `/museum/artwork/green-campus-02-evidence.avif` | Overview `Learning Progress` diagonal-clipped 3D gallery preview | Verified in `public/museum/artwork/` |
| `/museum/artwork/green-campus-03-solution.avif` | Museum lesson / exhibition fallback artwork 03 | Verified in `public/museum/artwork/` |

## 2. Vector & Graphic Elements

- **UI Icons**: `lucide-react` (`BookOpen`, `ClipboardCheck`, `Landmark`, `CalendarDays`, `Search`, `Bell`, `Settings`, `HelpCircle`, `ArrowRight`, `ArrowLeft`, `Plus`, `Edit3`, `Users`, `Image`, `GraduationCap`, `Phone`, `Building2`, `ShieldCheck`, `Star`, `Heart`, `Monitor`, etc.).
- **Recent Lesson Illustration**: Lightweight inline semantic SVG globe / wind-turbines / lush eco-campus artwork representing *Our Climate Action Museum* — crisp at any DPI, zero external raster dependencies.
- **Architectural Constraints (`AGENTS.md`)**:
  - Zero fabricated portrait photographs in Footer Card 2.
  - Zero fake competition institutions or unverified logos.
  - Canonical reference `design/reference/swiss-editorial-approved.png` is stored locally for visual QA comparisons only and is never rendered as UI chrome.
