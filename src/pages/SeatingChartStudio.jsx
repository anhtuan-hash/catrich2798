import React from 'react';

/**
 * Compatibility boundary for the retired standalone Seating Chart Studio.
 *
 * The standalone page is intentionally no longer exposed in Brian. Keeping a
 * tiny module at the historical import path prevents stale/lazy build graphs
 * from failing while retirement cleanup propagates through the application.
 * Do not add UI here; active seating-chart experiences should be routed through
 * the current tool shell/registry instead.
 */
export default function SeatingChartStudio() {
  return null;
}
