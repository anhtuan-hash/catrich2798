# V10.77 · Conduct unlock and emergency reset

- Fixed manually reopened weeks being auto-locked again immediately after the configured deadline.
- Lock/unlock flows no longer require a reason; password authentication remains enabled.
- Added an emergency weekly reset button that removes every conduct/reward record for the selected week, clears its frozen summary, returns the week to open state, and restores live scores to the weekly base score.
- Emergency reset requires the conduct-lock password and a final destructive-action confirmation.
- Audit trail records week reopen and emergency reset actions.
