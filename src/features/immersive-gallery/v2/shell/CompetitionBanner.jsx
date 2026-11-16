import React from 'react';
import ContestMasthead from '../../contest/ContestMasthead.jsx';

export default function CompetitionBanner({language}) {
  return (
    <header className="contest contest-art" data-testid="igv2-competition-banner">
      <ContestMasthead language={language} />
    </header>
  );
}
