import { useEffect } from 'react';

const REMOVED_STORAGE_PREFIXES = [
  'bes-global-draft-v1084:',
  'bes-version-history-v1085:',
];

function removeLegacyAutosaveData() {
  if (typeof window === 'undefined') return;
  try {
    const storage = window.localStorage;
    const keysToRemove = [];
    for (let index = 0; index < storage.length; index += 1) {
      const storageKey = storage.key(index);
      if (storageKey && REMOVED_STORAGE_PREFIXES.some((prefix) => storageKey.startsWith(prefix))) {
        keysToRemove.push(storageKey);
      }
    }
    keysToRemove.forEach((storageKey) => storage.removeItem(storageKey));
  } catch {
    // Local storage may be unavailable; the removed feature must never block the app.
  }
}

/**
 * Compatibility shell retained for one release so existing installations can
 * delete obsolete local draft/version data. The former autosave timer,
 * snapshots, recovery banner and version-history dialog are fully disabled.
 */
export default function GlobalAutosave() {
  useEffect(() => {
    removeLegacyAutosaveData();
  }, []);

  return null;
}
