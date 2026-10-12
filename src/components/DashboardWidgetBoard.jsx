import React from 'react';
import { normalizeDashboardLayout } from '../utils/dashboardLayoutPreferences.js';
/** Order follows actual DOM order, not just CSS order, to preserve keyboard navigation. */
export default function DashboardWidgetBoard({ layout: input, widgets = {} }) {
  const layout = normalizeDashboardLayout(input);
  return <div className="gd-v3-widget-board" aria-label="Dashboard widgets">
    {layout.boardOrder.map((id) => widgets[id] ? <div key={id} className={'gd-v3-widget gd-v3-widget--'+id+' gd-v3-widget--'+(layout.widgetSizes[id] || 'wide')} data-widget={id}>
      {widgets[id]}
    </div> : null)}
  </div>;
}
