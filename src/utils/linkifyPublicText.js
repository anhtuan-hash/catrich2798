/**
 * Turn plain-text public album descriptions into safe text/link segments.
 * User-authored content is never injected as HTML, and non-http(s) schemes
 * cannot become clickable. URLs work without Markdown or HTML formatting.
 */
const WEB_LINK = /(?:https?:\/\/|www\.)[^\s<>"']+/gi;
const END_PUNCTUATION = /[.,!?;:)}\]]/;

function trimLinkEnd(candidate) {
  let end = candidate.length;
  while (end > 0 && END_PUNCTUATION.test(candidate[end - 1])) {
    const last = candidate[end - 1];
    if (last === ')' && (candidate.slice(0, end).match(/\(/g) || []).length >=
      (candidate.slice(0, end).match(/\)/g) || []).length) break;
    if (last === ']' && (candidate.slice(0, end).match(/\[/g) || []).length >=
      (candidate.slice(0, end).match(/\]/g) || []).length) break;
    end -= 1;
  }
  return candidate.slice(0, end);
}

function verifiedHref(candidate) {
  try {
    const full = candidate.startsWith('www.') ? 'https://' + candidate : candidate;
    const url = new URL(full);
    if (!['https:', 'http:'].includes(url.protocol) || !url.hostname || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}

export function linkifyPublicText(value) {
  const text = typeof value === 'string' ? value : '';
  const segments = [];
  let cursor = 0;
  const matcher = new RegExp(WEB_LINK.source, WEB_LINK.flags);
  for (const match of text.matchAll(matcher)) {
    const start = match.index;
    const original = match[0];
    const label = trimLinkEnd(original);
    const href = verifiedHref(label);
    if (!href) continue;
    if (start > cursor) segments.push({ text: text.slice(cursor, start) });
    segments.push({ text: label, href });
    cursor = start + label.length;
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor) });
  return segments;
}
