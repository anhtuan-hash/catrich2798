/**
 * Small, dependency-free helpers for teacher-controlled random calls and balanced teams.
 * Never mutate the incoming roster or assessment selection.
 */
export function shuffleLearners(items, random = Math.random) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const sample = Number(random());
    const j = Math.min(i, Math.max(0, Math.floor((Number.isFinite(sample) ? sample : 0) * (i + 1))));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function drawUncalledStudent(students, calledRefs, getRef, random = Math.random) {
  const drawn = new Set(calledRefs);
  const remaining = students.filter((item) => !drawn.has(getRef(item)));
  if (!remaining.length) return null;
  const sample = Number(random());
  const index = Math.min(remaining.length - 1,
    Math.max(0, Math.floor((Number.isFinite(sample) ? sample : 0) * remaining.length)));
  return remaining[index];
}

export function makeBalancedGroups(students, requestedGroups, getRef, random = Math.random) {
  const count = Math.max(2, Math.min(students.length, Math.floor(Number(requestedGroups) || 2)));
  if (students.length < 2) return {};
  const result = {};
  shuffleLearners(students, random).forEach((item, index) => {
    result[getRef(item)] = `Nhóm ${(index % count) + 1}`;
  });
  return result;
}
