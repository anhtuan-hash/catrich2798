import React from 'react';
import ContestMasthead from '../contest/ContestMasthead.jsx';
import './museumCompetitionRibbon.css';

export default function MuseumCompetitionRibbon({variant = 'student', language}) {
  const dashboard = variant === 'dashboard';
  return (
    <div className={`bml-competition-ribbon bml-contest-art${dashboard ? ' bml-competition-ribbon--dashboard' : ''}`} data-testid="museum-competition-ribbon">
      <ContestMasthead language={language} />
    </div>
  );
}
