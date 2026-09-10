# Attendance history visual redesign

## Goal
Match the approved attendance-history mockup while preserving all existing attendance behavior and data.

## Scope
- Redesign only the History view inside `GlobalAttendanceNavigationTab`.
- Keep filtering, selection, bulk delete, report navigation, session delete, audit loading, proof-image opening, absence/tardy details, and permissions unchanged.
- Add an isolated `AttendanceHistoryV2.css`; no global/mobile overrides.
- Add visual hierarchy: session cards, hero, information cards, attendance summary cards, audit timeline styling, proof card, and responsive fallback.
- Keep tardy students counted as present.

## Verification
1. Contract test must fail before the V2 hooks/styles exist.
2. Implement markup hooks and scoped CSS.
3. Run contract, frontend build, attendance tardy regression, Critical E2E including WebKit/iPhone, and existing attendance tests.
4. Review PR diff before merge.
