import React from 'react';
import TextLabActivities from './TextLabActivities.jsx';

/**
 * Compatibility entry retained for existing lazy imports.
 * TextLab now renders as a single full-width workspace with no sidebar.
 */
export default function TextLabActivitiesWithoutSidebar(props) {
  return <TextLabActivities {...props} />;
}
