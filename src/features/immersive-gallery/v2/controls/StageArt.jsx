import React from 'react';

const RED = '#e10600';
const INK = '#111111';
const PAPER = '#fffdf8';

function Plate({word, children}) {
  return (
    <>
      <svg className="adv-stage-art-svg" viewBox="0 0 360 340" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        {children}
      </svg>
      <b className="adv-stage-art-word">{word}</b>
    </>
  );
}

const ART = {
  'climate-detective': (
    <Plate word="DETECT">
      <circle cx="74" cy="46" r="42" fill={RED} />
      <polygon points="96,62 336,148 304,214 104,116" fill={RED} />
      <polygon points="124,162 214,72 332,162" fill={INK} />
      <rect x="140" y="158" width="176" height="132" fill={INK} />
      <rect x="164" y="180" width="32" height="26" fill={PAPER} />
      <rect x="260" y="180" width="32" height="26" fill={PAPER} />
      <rect x="202" y="206" width="50" height="84" fill={PAPER} />
    </Plate>
  ),
  'language-mini-lesson': (
    <Plate word="CITE">
      <rect x="36" y="48" width="250" height="54" fill={INK} />
      <rect x="70" y="122" width="250" height="54" fill={RED} />
      <rect x="36" y="196" width="210" height="54" fill={INK} />
    </Plate>
  ),
  'classroom-survey': (
    <Plate word="VOTE">
      <rect x="48" y="180" width="52" height="120" fill={INK} />
      <rect x="124" y="90" width="52" height="210" fill={RED} />
      <rect x="200" y="140" width="52" height="160" fill={INK} />
      <rect x="276" y="210" width="52" height="90" fill={RED} />
    </Plate>
  ),
  'problem-evidence-solution': (
    <Plate word="DESIGN">
      {['P', 'E', 'S'].map((letter, i) => (
        <g key={letter}>
          <rect x={28 + i * 108} y="56" width="92" height="250" fill={i === 1 ? RED : INK} />
          <text x={52 + i * 108} y="200" fill={PAPER} fontSize="48" fontWeight="800" fontFamily="Inter, Arial, sans-serif">{letter}</text>
        </g>
      ))}
    </Plate>
  ),
  storyboard: (
    <Plate word="PLAN">
      {[0, 1, 2].map(i => (
        <g key={i} transform={`translate(${30 + i * 108} ${70 + (i === 1 ? -18 : 8)}) rotate(${i === 1 ? -6 : 4} 46 90)`}>
          <rect width="92" height="220" fill={i === 1 ? RED : INK} />
          <rect x="14" y="18" width="64" height="70" fill={PAPER} />
          <rect x="14" y="108" width="50" height="10" fill={PAPER} />
          <rect x="14" y="128" width="36" height="10" fill={PAPER} />
        </g>
      ))}
    </Plate>
  ),
  recap: (
    <Plate word="CHECK">
      {['Clear', 'Sourced', 'Useful'].map((label, i) => (
        <g key={label} transform={`translate(28 ${48 + i * 84})`}>
          <rect width="300" height="68" fill={i === 1 ? RED : INK} />
          <text x="22" y="44" fill={PAPER} fontSize="26" fontWeight="800" fontFamily="Inter, Arial, sans-serif">{label}</text>
        </g>
      ))}
    </Plate>
  ),
  'artwork-studio': (
    <Plate word="BUILD">
      <rect x="28" y="90" width="84" height="200" fill="none" stroke={INK} strokeWidth="14" />
      <rect x="136" y="48" width="84" height="242" fill="none" stroke={RED} strokeWidth="14" />
      <rect x="244" y="110" width="84" height="180" fill="none" stroke={INK} strokeWidth="14" />
    </Plate>
  ),
  'peer-gallery-walk': (
    <Plate word="PEER">
      <circle cx="110" cy="110" r="48" fill={INK} />
      <rect x="62" y="172" width="96" height="110" fill={INK} />
      <rect x="180" y="70" width="140" height="180" fill={RED} />
      <rect x="200" y="96" width="100" height="12" fill={PAPER} />
      <rect x="200" y="124" width="80" height="12" fill={PAPER} />
      <rect x="200" y="152" width="90" height="12" fill={PAPER} />
    </Plate>
  ),
  revise: (
    <Plate word="REVISE">
      <rect x="24" y="70" width="120" height="230" fill={INK} />
      <polygon points="168,170 214,170 198,148 214,148 168,118 168,140 154,140" fill={RED} />
      <rect x="220" y="48" width="116" height="250" fill={RED} />
      <rect x="240" y="78" width="76" height="12" fill={PAPER} />
      <rect x="240" y="106" width="60" height="12" fill={PAPER} />
      <rect x="240" y="134" width="70" height="12" fill={PAPER} />
    </Plate>
  ),
  present: (
    <Plate word="PITCH">
      <polygon points="40,300 180,70 320,300" fill={INK} />
      <rect x="150" y="168" width="60" height="132" fill={RED} />
      <rect x="40" y="300" width="280" height="18" fill={RED} />
    </Plate>
  ),
  'exit-ticket': (
    <Plate word="EXIT">
      <rect x="36" y="56" width="288" height="250" fill={INK} />
      <circle cx="36" cy="120" r="16" fill={PAPER} />
      <circle cx="36" cy="180" r="16" fill={PAPER} />
      <rect x="70" y="92" width="180" height="16" fill={RED} />
      <rect x="70" y="128" width="140" height="12" fill={PAPER} />
      <rect x="70" y="168" width="160" height="12" fill={PAPER} />
      <rect x="70" y="208" width="100" height="12" fill={PAPER} />
    </Plate>
  ),
};

export default function StageArt({id}) {
  return <div className="adv-stage-art">{ART[id] || ART.recap}</div>;
}
