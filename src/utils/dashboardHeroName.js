/**
 * Split a long teacher name at a natural word boundary for the Dashboard Hero.
 * This is presentation-only: do not mutate the signed-in user's profile name.
 * Short names stay on one line. Four-word names become two balanced lines.
 */
export function dashboardHeroNameLines(value) {
  const name = String(value || '').replace(/\s+/g, ' ').trim();
  const words = name ? name.split(' ') : [];
  if (words.length < 2 || (name.length <= 18 && words.length <= 3)) return [name];

  // Never strand one word in the top or bottom line when at least four are present.
  const minimum = words.length >= 4 ? 2 : 1;
  const maximum = words.length >= 4 ? words.length - 2 : words.length - 1;
  let split = minimum;
  let leastDifference = Infinity;
  for (let index = minimum; index <= maximum; index += 1) {
    const first = words.slice(0, index).join(' ');
    const second = words.slice(index).join(' ');
    const difference = Math.abs(first.length - second.length);
    if (difference <= leastDifference) {
      leastDifference = difference;
      split = index;
    }
  }
  return [words.slice(0, split).join(' '), words.slice(split).join(' ')];
}
