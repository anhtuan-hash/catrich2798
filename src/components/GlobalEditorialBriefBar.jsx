import React from 'react';
import BrianNewswireBar from './BrianNewswireBar.jsx';

const HIDDEN_ROUTES = new Set([
  'login',
  'register',
  'setup',
  'homeroom-portal',
  'classroom-join',
  'qb-practice',
]);

export default function GlobalEditorialBriefBar({ route, language = 'vi', currentUser }) {
  if (!currentUser || HIDDEN_ROUTES.has(route)) return null;
  return <BrianNewswireBar language={language} />;
}
