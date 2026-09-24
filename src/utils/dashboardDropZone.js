const STORAGE_KEY = 'bes-dashboard-drop-zone-v1';

let memoryPacket = null;

function safeSession() {
  if (typeof window === 'undefined') return null;
  try { return window.sessionStorage; } catch { return null; }
}

function serializablePacket(packet) {
  if (!packet) return null;
  return {
    ...packet,
    files: [],
    fileMeta: Array.isArray(packet.files)
      ? packet.files.map((file) => ({
          name: file?.name || '',
          size: Number(file?.size || 0),
          type: file?.type || '',
        }))
      : (packet.fileMeta || []),
  };
}

export function setDashboardDropPacket(packet) {
  if (!packet || typeof window === 'undefined') return null;
  const next = {
    id: packet.id || `dashboard-drop-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: packet.createdAt || Date.now(),
    source: 'dashboard-drop-zone',
    ...packet,
  };
  memoryPacket = next;
  window.__BRIAN_DASHBOARD_DROP_PACKET__ = next;
  try {
    safeSession()?.setItem(STORAGE_KEY, JSON.stringify(serializablePacket(next)));
  } catch {
    // Session persistence is best effort; File objects intentionally stay in memory.
  }
  window.dispatchEvent(new CustomEvent('bes-dashboard-drop-zone-packet', { detail: next }));
  return next;
}

export function peekDashboardDropPacket() {
  if (typeof window === 'undefined') return memoryPacket;
  if (memoryPacket) return memoryPacket;
  if (window.__BRIAN_DASHBOARD_DROP_PACKET__) return window.__BRIAN_DASHBOARD_DROP_PACKET__;
  try {
    const raw = safeSession()?.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? parsed : null;
  } catch {
    return null;
  }
}

export function consumeDashboardDropPacket(target = '') {
  const packet = peekDashboardDropPacket();
  if (!packet) return null;
  if (target && packet.target && packet.target !== target) return null;
  memoryPacket = null;
  if (typeof window !== 'undefined') {
    delete window.__BRIAN_DASHBOARD_DROP_PACKET__;
    try { safeSession()?.removeItem(STORAGE_KEY); } catch { /* optional */ }
  }
  return packet;
}

export function clearDashboardDropPacket() {
  memoryPacket = null;
  if (typeof window !== 'undefined') {
    delete window.__BRIAN_DASHBOARD_DROP_PACKET__;
    try { safeSession()?.removeItem(STORAGE_KEY); } catch { /* optional */ }
  }
}

export function dashboardDropFileLabel(packet) {
  const files = Array.isArray(packet?.files) ? packet.files : [];
  const meta = Array.isArray(packet?.fileMeta) ? packet.fileMeta : [];
  const count = files.length || meta.length;
  if (!count) return '';
  const first = files[0]?.name || meta[0]?.name || '';
  return count > 1 ? `${first} +${count - 1}` : first;
}
