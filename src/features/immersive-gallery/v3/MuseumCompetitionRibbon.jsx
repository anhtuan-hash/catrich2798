import React from 'react';
import ContestMasthead from '../contest/ContestMasthead.jsx';
import './museumCompetitionRibbon.css';

const awardLabel = 'BÀI DỰ THI';
const lessonTitle = 'OUR CLIMATE ACTION MUSEUM';

export default function MuseumCompetitionRibbon({variant = 'student'}) {
  const dashboard = variant === 'dashboard';
  return (
    <section className={`bml-competition-ribbon bml-contest-art${dashboard ? ' bml-competition-ribbon--dashboard' : ''}`} data-testid="museum-competition-ribbon"
      lang="vi" aria-label={awardLabel + ' – ' + lessonTitle}>
      <ContestMasthead />
    </section>
  );
}
