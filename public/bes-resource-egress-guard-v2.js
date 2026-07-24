(() => {
  'use strict';

  // Disabled intentionally: the previous implementation parsed, mapped, sorted
  // and stringified the full resource library from localStorage on the browser's
  // main thread for every broad resource_items read. That saved network traffic
  // but could freeze navigation when the library was large.
  //
  // Egress protection remains active in src/utils/supabase.js through explicit
  // column projections, short-lived read caching and in-flight request dedupe.
  window.__besResourceEgressGuardV2Installed = true;

  const stats = Object.freeze({
    disabled: true,
    disabledReason: 'main-thread-performance',
    broadReadsSeen: 0,
    networkReadsAllowed: 0,
    warmLocalReads: 0,
    mutationsSeen: 0,
    rowsReturnedLocally: 0,
  });

  window.__BES_RESOURCE_EGRESS_GUARD__ = Object.freeze({
    version: '2.1.0',
    enabled: false,
    refreshIntervalHours: 0,
    stats,
    forceNextRefresh() {},
  });
})();
