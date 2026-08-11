// Brand cleanup is handled statically in the final navigation CSS layer.
// Do not mutate React-owned navigation DOM at runtime: replacing/removing
// children here can desynchronise React and leave lazy routes stuck in fallback.
export default function GlobalEnglishHubBrand() {
  return null;
}
