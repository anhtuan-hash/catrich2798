/* Legacy Home viewport-fit measurement is retired.
   HomeApproved owns its own responsive layout and must not receive global
   viewport density, stage-height or scale markers. */

export default function GlobalHomeViewportFitBridge() {
  return null;
}
