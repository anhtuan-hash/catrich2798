import React from 'react';
import ProfessionalHubNative from '../apps/professional-hub/ProfessionalHubNative.jsx';

export default function ProfessionalHub({ language = 'vi' }) {
  return <ProfessionalHubNative language={language} />;
}
