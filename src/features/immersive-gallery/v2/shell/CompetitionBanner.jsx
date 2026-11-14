import React from 'react';
import ContestMasthead from '../../contest/ContestMasthead.jsx';

const lessonTitle = 'OUR CLIMATE ACTION MUSEUM';
const awardLabel = 'BÀI DỰ THI';

export default function CompetitionBanner() {
  return (
    <header className="contest contest-art" data-testid="igv2-competition-banner" lang="vi"
      aria-label={awardLabel + ' – ' + lessonTitle}>
      <ContestMasthead />
    </header>
  );
}
