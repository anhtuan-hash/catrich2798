import React from 'react';

const GOLD = '#f4ca4b';
const PINE = '#7dcea0';
const PAPER = '#f4f7fb';
const RED = '#e15b64';
const BLUE = '#9fc2e0';
const INK = '#102033';

function Plate({children}) {
  return (
    <svg className="adv-stage-art-svg" viewBox="0 0 320 250" aria-hidden="true">
      <rect width="320" height="250" rx="18" fill="#0c1c2e" />
      <rect x="10" y="10" width="300" height="230" rx="14" fill="none" stroke="rgba(244,202,75,.45)" strokeWidth="1.5" />
      {children}
    </svg>
  );
}

const ART = {
  'climate-detective': (
    <Plate>
      <circle cx="74" cy="68" r="22" fill={GOLD} />
      <path d="M74 34 v10 M74 92 v10 M40 68 h10 M98 68 h10" stroke={GOLD} strokeWidth="3" />
      <rect x="128" y="78" width="150" height="92" rx="6" fill="#16324c" />
      <polygon points="128,78 203,42 278,78" fill={PINE} />
      <rect x="186" y="112" width="34" height="58" fill={GOLD} />
      <rect x="148" y="100" width="22" height="18" fill={BLUE} />
      <rect x="226" y="100" width="22" height="18" fill={BLUE} />
      <text x="40" y="214" fill={PAPER} fontSize="18" fontWeight="700">DETECT</text>
    </Plate>
  ),
  'language-mini-lesson': (
    <Plate>
      <rect x="36" y="42" width="248" height="42" rx="8" fill="#16324c" />
      <text x="52" y="69" fill={GOLD} fontSize="16" fontWeight="700">According to NASA</text>
      <rect x="36" y="98" width="248" height="42" rx="8" fill="#16324c" />
      <text x="52" y="125" fill={PAPER} fontSize="16" fontWeight="700">therefore</text>
      <rect x="36" y="154" width="248" height="42" rx="8" fill={GOLD} />
      <text x="52" y="181" fill={INK} fontSize="16" fontWeight="700">we recommend</text>
    </Plate>
  ),
  'classroom-survey': (
    <Plate>
      <rect x="48" y="150" width="42" height="48" fill={BLUE} />
      <rect x="108" y="96" width="42" height="102" fill={GOLD} />
      <rect x="168" y="122" width="42" height="76" fill={PINE} />
      <rect x="228" y="168" width="42" height="30" fill={RED} />
      <path d="M36 198 h248" stroke={PAPER} strokeWidth="2" />
      <text x="40" y="228" fill={PAPER} fontSize="16" fontWeight="700">N GROUPS · ONE VOTE</text>
    </Plate>
  ),
  'problem-evidence-solution': (
    <Plate>
      {['P', 'E', 'S'].map((letter, i) => (
        <g key={letter} transform={`translate(${36 + i * 88} 48)`}>
          <rect width="76" height="130" rx="8" fill="#16324c" stroke={i === 1 ? GOLD : 'transparent'} strokeWidth="2" />
          <text x="24" y="78" fill={i === 1 ? GOLD : PAPER} fontSize="32" fontWeight="800">{letter}</text>
        </g>
      ))}
      <text x="36" y="214" fill={PAPER} fontSize="15" fontWeight="700">PROBLEM · EVIDENCE · SOLUTION</text>
    </Plate>
  ),
  storyboard: (
    <Plate>
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${42 + i * 90} ${58 + (i === 1 ? -12 : 0)}) rotate(${i === 1 ? -4 : 3} 36 60)`}>
          <rect width="72" height="96" rx="4" fill={i === 1 ? GOLD : PAPER} />
          <rect x="10" y="12" width="52" height="36" fill={i === 1 ? INK : '#d5deea'} />
          <rect x="10" y="58" width="40" height="6" fill={i === 1 ? INK : '#8aa0b8'} />
          <rect x="10" y="70" width="28" height="6" fill={i === 1 ? INK : '#8aa0b8'} />
        </g>
      ))}
      <text x="40" y="214" fill={PAPER} fontSize="16" fontWeight="700">THREE EXHIBITS</text>
    </Plate>
  ),
  recap: (
    <Plate>
      {['Clear', 'Sourced', 'Useful'].map((label, i) => (
        <g key={label} transform={`translate(40 ${46 + i * 52})`}>
          <rect width="240" height="40" rx="8" fill="#16324c" />
          <circle cx="24" cy="20" r="10" fill={PINE} />
          <path d="M19 20 l3 3 l7 -8" fill="none" stroke={INK} strokeWidth="2" />
          <text x="46" y="26" fill={PAPER} fontSize="16" fontWeight="700">{label}</text>
        </g>
      ))}
    </Plate>
  ),
  'artwork-studio': (
    <Plate>
      <rect x="40" y="70" width="70" height="90" fill="none" stroke={GOLD} strokeWidth="6" />
      <rect x="125" y="48" width="70" height="112" fill="none" stroke={PAPER} strokeWidth="6" />
      <rect x="210" y="78" width="70" height="82" fill="none" stroke={PINE} strokeWidth="6" />
      <rect x="138" y="64" width="44" height="52" fill={GOLD} />
      <text x="40" y="214" fill={PAPER} fontSize="16" fontWeight="700">ON THE WALL</text>
    </Plate>
  ),
  'peer-gallery-walk': (
    <Plate>
      <rect x="150" y="46" width="120" height="86" fill="none" stroke={GOLD} strokeWidth="5" />
      <rect x="166" y="60" width="88" height="48" fill={PINE} />
      <circle cx="78" cy="150" r="22" fill={BLUE} />
      <rect x="58" y="176" width="40" height="28" rx="6" fill={BLUE} />
      <circle cx="118" cy="158" r="18" fill={PAPER} />
      <path d="M96 118 h40 v28 h-14 l-8 10 v-10 h-18 z" fill={GOLD} />
      <text x="40" y="228" fill={PAPER} fontSize="16" fontWeight="700">PEER NOTES</text>
    </Plate>
  ),
  revise: (
    <Plate>
      <rect x="28" y="64" width="100" height="120" rx="6" fill="#16324c" />
      <rect x="44" y="82" width="68" height="8" fill="#5d7388" />
      <rect x="44" y="100" width="48" height="8" fill="#5d7388" />
      <path d="M146 118 h28" stroke={GOLD} strokeWidth="4" />
      <path d="M166 108 l12 10 l-12 10" fill="none" stroke={GOLD} strokeWidth="4" />
      <rect x="188" y="52" width="108" height="132" rx="6" fill={PAPER} />
      <rect x="204" y="72" width="76" height="10" fill={INK} />
      <rect x="204" y="92" width="60" height="10" fill={RED} />
      <rect x="204" y="112" width="70" height="10" fill={INK} />
      <text x="28" y="220" fill={PAPER} fontSize="16" fontWeight="700">BEFORE → AFTER</text>
    </Plate>
  ),
  present: (
    <Plate>
      <polygon points="40,170 160,78 280,170" fill="#16324c" />
      <rect x="138" y="108" width="44" height="62" fill={GOLD} />
      <circle cx="96" cy="156" r="12" fill={BLUE} />
      <circle cx="224" cy="156" r="12" fill={PINE} />
      <rect x="40" y="170" width="240" height="14" fill={GOLD} />
      <text x="40" y="220" fill={PAPER} fontSize="16" fontWeight="700">45–60 SEC PITCH</text>
    </Plate>
  ),
  'exit-ticket': (
    <Plate>
      <rect x="46" y="58" width="228" height="120" rx="10" fill={PAPER} />
      <circle cx="46" cy="98" r="10" fill="#0c1c2e" />
      <circle cx="46" cy="128" r="10" fill="#0c1c2e" />
      <text x="72" y="104" fill={INK} fontSize="18" fontWeight="800">EXIT TICKET</text>
      <text x="72" y="134" fill="#3d5166" fontSize="14" fontWeight="650">I will … because …</text>
      <rect x="72" y="148" width="84" height="8" fill={GOLD} />
    </Plate>
  ),
};

export default function StageArt({id}) {
  return <div className="adv-stage-art">{ART[id] || ART.recap}</div>;
}
