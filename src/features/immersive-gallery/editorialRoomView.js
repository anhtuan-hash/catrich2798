const artWallZ = -7.82;
const farthestZ = 7.65;
const fitWidth = 10.8;
const radians = Math.PI / 180;

export function editorialRoomView(aspect, type = 'room') {
  const horizontal = Math.max(0.32, aspect || 1);
  const farthestDistance = farthestZ - artWallZ;
  const fov = Math.min(88, Math.max(53, 2 * Math.atan(fitWidth / (2 * farthestDistance * horizontal)) / radians));
  const fitDistance = fitWidth / (2 * Math.tan(fov * radians / 2) * horizontal);
  const overview = Math.max(7.2, Math.min(farthestDistance, fitDistance));
  const distance = type === 'artwork' ? Math.max(5.8, overview * .77) : overview;

  return {
    position: [0, type === 'bench' ? 1.24 : 1.81, artWallZ + distance],
    target: [.14, type === 'artwork' ? 2.36 : 2.10, artWallZ],
    fov,
  };
}
