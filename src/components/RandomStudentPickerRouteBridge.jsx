import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { RandomStudentPicker } from './RandomStudentPickerBridge.jsx';

function readRoute() {
  return window.location.hash.replace(/^#\//, '').split('?')[0];
}

export default function RandomStudentPickerRouteBridge({ currentUser }) {
  const [route, setRoute] = useState(readRoute);

  useEffect(() => {
    const update = () => setRoute(readRoute());
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  if (!currentUser || route !== 'tool/random-student-picker') return null;

  return createPortal(
    <RandomStudentPicker
      currentUser={currentUser}
      onClose={() => { window.location.hash = '#/games'; }}
    />,
    document.body,
  );
}
