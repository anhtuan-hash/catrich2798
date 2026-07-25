import React from 'react';
import { RandomStudentPicker } from '../components/RandomStudentPickerBridge.jsx';

export default function RandomStudentPickerPage({ currentUser }) {
  return (
    <RandomStudentPicker
      currentUser={currentUser}
      onClose={() => { window.location.hash = '#/apps'; }}
    />
  );
}
