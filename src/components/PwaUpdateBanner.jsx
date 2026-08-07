// Update prompts are intentionally suppressed in the Brian interface.
// PWA/service-worker registration and version delivery remain active; users can
// pick up a deployed version through their normal browser refresh/reopen flow.
export default function PwaUpdateBanner() {
  return null;
}
