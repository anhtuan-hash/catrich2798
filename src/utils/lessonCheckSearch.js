// Stateless, locale-tolerant title matching shared by the real library and tests.
// Never searches protected lesson content or sends a search term to the network.
export function normalizeActivityTitle(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g,'')
    .replace(/[đĐ]/g,'d')
    .toLocaleLowerCase('vi')
    .replace(/[^\p{L}\p{N}]+/gu,' ')
    .trim()
    .replace(/\s+/g,' ');
}

export function matchesActivityTitle(title, query) {
  const needle=normalizeActivityTitle(query);
  if (!needle) return true;
  const haystack=normalizeActivityTitle(title);
  return haystack.includes(needle)
    || needle.split(' ').every(token=>haystack.includes(token));
}
