import React from 'react';

const SCENES = {
  questions: {
    accent: '#1683ff',
    accent2: '#57c7ff',
    soft: '#eaf6ff',
    shirt: '#1677d9',
    phrase: ['Better Questions', 'Brighter Learners'],
  },
  bundles: {
    accent: '#7758f6',
    accent2: '#24c6a4',
    soft: '#f2edff',
    shirt: '#5d67e8',
    phrase: ['Better Learning', 'Bigger Progress'],
  },
  manage: {
    accent: '#163f7b',
    accent2: '#ff9f2f',
    soft: '#eef4ff',
    shirt: '#1467bb',
    phrase: ['Manage Quality', 'Empower Learning'],
  },
  blueprints: {
    accent: '#6648f3',
    accent2: '#2c8cff',
    soft: '#f3efff',
    shirt: '#2f65cc',
    phrase: ['Design Better Tests', 'for Brighter Learners'],
  },
  coverage: {
    accent: '#1682ff',
    accent2: '#22ba72',
    soft: '#eaf8ff',
    shirt: '#1573cf',
    phrase: ['Map Coverage', 'Create Better Assessments'],
  },
  quality: {
    accent: '#18a76f',
    accent2: '#6ed8b1',
    soft: '#eafaf4',
    shirt: '#159c67',
    phrase: ['Quality Questions', 'Better Learners'],
  },
  builder: {
    accent: '#6948f6',
    accent2: '#ffb52e',
    soft: '#f3efff',
    shirt: '#3a6bdc',
    phrase: ['Build Better Tests', 'Brighter Learners'],
  },
  tests: {
    accent: '#135dc8',
    accent2: '#27a3ff',
    soft: '#edf5ff',
    shirt: '#1667c9',
    phrase: ['Better Assessments', 'Brighter Learners'],
  },
  import: {
    accent: '#128cff',
    accent2: '#1fbd83',
    soft: '#eaf7ff',
    shirt: '#1687d7',
    phrase: ['From AI Ideas', 'to Great Learning'],
  },
  chatgpt: {
    accent: '#16a36b',
    accent2: '#0a5060',
    soft: '#eaf9f2',
    shirt: '#0f766e',
    phrase: ['Build Smarter', 'Learning Together'],
  },
};

function TinySpark({ x, y, color = '#ffbf2f', size = 12 }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d={`M0 -${size} L3 -3 L${size} 0 L3 3 L0 ${size} L-3 3 L-${size} 0 L-3 -3Z`} fill={color} opacity="0.9" />
    </g>
  );
}

function FloatingChip({ x, y, width = 86, label, color, icon = '✓' }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={width} height="34" rx="10" fill="#fff" opacity="0.97" stroke={color} strokeOpacity="0.22" />
      <circle cx="17" cy="17" r="10" fill={color} opacity="0.15" />
      <text x="17" y="21" textAnchor="middle" fontSize="12" fontWeight="800" fill={color}>{icon}</text>
      <text x="34" y="21" fontSize="10" fontWeight="750" fill="#23405f">{label}</text>
    </g>
  );
}

function IllustratedStudent({ accent, shirt }) {
  return (
    <g transform="translate(278 52)">
      <ellipse cx="105" cy="174" rx="110" ry="23" fill="#1b5db8" opacity="0.1" />
      <path d="M67 99c18-18 58-17 77 2 18 20 21 67 11 91H52c-8-35-2-74 15-93Z" fill={shirt} />
      <path d="M75 103c10 13 49 14 61-2l11 77H62l13-75Z" fill={accent} opacity="0.3" />
      <path d="M85 93c3 16 35 20 42 1v16c-7 18-36 17-43 0l1-17Z" fill="#f2b491" />
      <ellipse cx="106" cy="65" rx="42" ry="45" fill="#f7c3a1" />
      <path d="M69 67c-2-30 19-53 49-51 21 1 35 15 37 29-6-5-12-8-20-9 1 8-1 13-7 18-12 9-34 4-47 16-4 4-8 8-12 11 0-5-1-9 0-14Z" fill="#17385d" />
      <path d="M72 55c5-20 19-34 37-37-1 5-1 9 1 13-15 5-27 13-38 24Z" fill="#204b7d" opacity="0.9" />
      <circle cx="92" cy="66" r="3" fill="#17385d" />
      <circle cx="121" cy="66" r="3" fill="#17385d" />
      <path d="M95 80c8 6 15 6 23 0" fill="none" stroke="#b9694f" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M75 55c-9 3-12 11-10 19 2 7 7 9 12 7" fill="#f7c3a1" />
      <path d="M145 58c9 2 12 10 10 18-2 7-8 10-13 7" fill="#f7c3a1" />
      <path d="M54 125c-14 13-22 36-23 60l19 2c5-23 10-39 24-49l-20-13Z" fill="#f2b491" />
      <path d="M154 129c14 13 22 34 23 56l-19 2c-4-21-10-37-23-48l19-10Z" fill="#f2b491" />
      <g transform="translate(65 137) rotate(-6 55 38)">
        <rect x="0" y="0" width="112" height="72" rx="11" fill="#1e3557" />
        <rect x="7" y="7" width="98" height="58" rx="8" fill="#e9f5ff" />
        <rect x="17" y="17" width="42" height="6" rx="3" fill={accent} opacity="0.9" />
        <rect x="17" y="30" width="72" height="4" rx="2" fill="#91a8c0" />
        <rect x="17" y="40" width="58" height="4" rx="2" fill="#b4c4d2" />
        <rect x="17" y="50" width="67" height="4" rx="2" fill="#b4c4d2" />
      </g>
    </g>
  );
}

function Books({ accent, x = 58, y = 150 }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width="126" height="20" rx="6" fill={accent} opacity=".95" />
      <rect y="-24" width="112" height="20" rx="6" fill="#5b73ef" />
      <rect y="-48" width="118" height="20" rx="6" fill="#21b47a" />
      <rect y="-72" width="102" height="20" rx="6" fill="#ffbd31" />
      <rect x="12" y="-67" width="45" height="5" rx="2.5" fill="#fff" opacity=".88" />
      <rect x="12" y="-43" width="56" height="5" rx="2.5" fill="#fff" opacity=".88" />
      <rect x="12" y="-19" width="48" height="5" rx="2.5" fill="#fff" opacity=".88" />
      <rect x="12" y="5" width="65" height="5" rx="2.5" fill="#fff" opacity=".88" />
    </g>
  );
}

function QuestionScene({ c }) {
  return (
    <>
      <Books accent={c.accent} x={92} y={196} />
      <FloatingChip x={178} y={54} width={92} label="Reading" color={c.accent} icon="Aa" />
      <FloatingChip x={180} y={98} width={90} label="Grammar" color="#22b573" icon="✓" />
      <TinySpark x={230} y={164} color="#ffc247" />
      <circle cx="238" cy="174" r="22" fill="#fff3bd" />
      <path d="M238 157c-9 0-16 7-16 16 0 6 3 10 8 13v8h16v-8c5-3 8-7 8-13 0-9-7-16-16-16Z" fill="#ffbf29" />
      <IllustratedStudent accent={c.accent} shirt={c.shirt} />
    </>
  );
}

function BundleScene({ c }) {
  return (
    <>
      <g transform="translate(85 65)">
        {[0,1,2].map((i) => (
          <g key={i} transform={`translate(${i*34} ${i*25})`}>
            <rect width="118" height="68" rx="13" fill="#fff" stroke={c.accent} strokeOpacity=".2" />
            <rect x="13" y="15" width="24" height="24" rx="7" fill={i===0?'#e9f3ff':i===1?'#ecfbf4':'#fff5da'} />
            <path d="M47 18h52M47 30h41M13 51h86" stroke="#b6c4d4" strokeWidth="5" strokeLinecap="round" opacity=".65" />
          </g>
        ))}
      </g>
      <FloatingChip x={206} y={50} label="Reading" color={c.accent} />
      <FloatingChip x={213} y={92} label="Vocabulary" color="#7b5cf5" />
      <IllustratedStudent accent={c.accent} shirt={c.shirt} />
    </>
  );
}

function ManageScene({ c }) {
  return (
    <>
      <g transform="translate(82 62)">
        <rect width="142" height="128" rx="18" fill="#fff" stroke={c.accent} strokeOpacity=".2" />
        <text x="18" y="27" fontSize="12" fontWeight="800" fill="#23405f">CONTROL</text>
        <rect x="18" y="39" width="88" height="10" rx="5" fill="#dbe8f6" />
        <rect x="18" y="60" width="38" height="38" rx="10" fill="#eaf3ff" />
        <rect x="65" y="60" width="38" height="38" rx="10" fill="#ecfaf3" />
        <rect x="112" y="60" width="18" height="38" rx="7" fill="#fff3dc" />
        <path d="M25 88l10-12 10 6 8-18" fill="none" stroke={c.accent2} strokeWidth="4" strokeLinecap="round" />
        <path d="M73 87l8-8 7 4 8-15" fill="none" stroke="#23b97d" strokeWidth="4" strokeLinecap="round" />
        <rect x="18" y="108" width="112" height="7" rx="3.5" fill="#c9d8e7" opacity=".65" />
      </g>
      <g transform="translate(223 74)">
        <circle cx="24" cy="24" r="24" fill="#fff1df" />
        <path d="M24 7v7M24 34v7M7 24h7M34 24h7M12 12l5 5M31 31l5 5M36 12l-5 5M17 31l-5 5" stroke={c.accent2} strokeWidth="4" strokeLinecap="round" />
        <circle cx="24" cy="24" r="8" fill={c.accent2} />
      </g>
      <IllustratedStudent accent={c.accent} shirt={c.shirt} />
    </>
  );
}

function BlueprintScene({ c }) {
  return (
    <>
      <g transform="translate(82 62)">
        <rect width="154" height="124" rx="18" fill="#fff" stroke={c.accent} strokeOpacity=".2" />
        <rect x="18" y="17" width="118" height="18" rx="7" fill={c.soft} />
        <text x="28" y="30" fontSize="11" fontWeight="800" fill={c.accent}>TEST BLUEPRINT</text>
        {[0,1,2,3].map(r => [0,1,2,3].map(col => (
          <rect key={r+'-'+col} x={20+col*28} y={48+r*16} width="24" height="12" rx="3" fill={(r+col)%3===0?c.accent:'#e8edf5'} opacity={(r+col)%3===0?.75:1} />
        )))}
      </g>
      <FloatingChip x={212} y={58} label="Plan" color={c.accent} />
      <FloatingChip x={216} y={100} label="Assess" color="#22b573" />
      <IllustratedStudent accent={c.accent} shirt={c.shirt} />
    </>
  );
}

function CoverageScene({ c }) {
  return (
    <>
      <g transform="translate(80 74)">
        {[0,1,2,3,4].map((i) => <rect key={i} x={i*29} y={90-(i*17)} width="20" height={38+i*17} rx="7" fill={i%2?c.accent2:c.accent} opacity={.65+.07*i} />)}
        <path d="M0 100 C34 78 50 86 80 54 S126 41 145 25" fill="none" stroke="#23b97d" strokeWidth="5" strokeLinecap="round" />
      </g>
      <g transform="translate(204 57)">
        <rect width="82" height="100" rx="16" fill="#fff" stroke={c.accent} strokeOpacity=".18" />
        {[0,1,2].map(i => (
          <g key={i} transform={`translate(14 ${17+i*25})`}>
            <rect width="13" height="13" rx="4" fill="#22b573" />
            <path d="M3 7l3 3 5-6" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="22" y="3" width="40" height="6" rx="3" fill="#c8d7e8" />
          </g>
        ))}
      </g>
      <IllustratedStudent accent={c.accent} shirt={c.shirt} />
    </>
  );
}

function QualityScene({ c }) {
  return (
    <>
      <g transform="translate(102 55)">
        <path d="M55 0 99 14v36c0 34-21 55-44 66C32 105 11 84 11 50V14L55 0Z" fill={c.accent} />
        <path d="M35 54l14 14 29-33" fill="none" stroke="#fff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M55 8v98" stroke="#fff" strokeOpacity=".11" strokeWidth="2" />
      </g>
      <Books accent={c.accent} x={154} y={205} />
      <IllustratedStudent accent={c.accent} shirt={c.shirt} />
    </>
  );
}

function BuilderScene({ c }) {
  return (
    <>
      <g transform="translate(78 80)">
        <rect width="74" height="42" rx="10" fill="#5b57ed" />
        <rect x="25" y="50" width="88" height="42" rx="10" fill="#8955ee" />
        <rect x="52" y="100" width="97" height="42" rx="10" fill="#ffb82d" />
        <text x="37" y="26" fill="#fff" fontSize="10" fontWeight="800">SELECT</text>
        <text x="45" y="76" fill="#fff" fontSize="10" fontWeight="800">CUSTOMIZE</text>
        <text x="75" y="126" fill="#fff" fontSize="10" fontWeight="800">CREATE</text>
      </g>
      <g transform="translate(210 68)">
        <path d="M28 0h24a8 8 0 0 1 8 8v17h17a8 8 0 0 1 8 8v24a8 8 0 0 1-8 8H60v17a8 8 0 0 1-8 8H28a8 8 0 0 1-8-8V65H3a8 8 0 0 1-8-8V33a8 8 0 0 1 8-8h17V8a8 8 0 0 1 8-8Z" fill={c.accent} opacity=".9" />
        <circle cx="40" cy="44" r="9" fill="#fff" opacity=".85" />
      </g>
      <IllustratedStudent accent={c.accent} shirt={c.shirt} />
    </>
  );
}

function TestsScene({ c }) {
  return (
    <>
      <Books accent={c.accent} x={88} y={202} />
      <g transform="translate(196 54)">
        <rect width="92" height="122" rx="14" fill="#fff" stroke={c.accent} strokeOpacity=".2" />
        <rect x="25" y="-8" width="42" height="19" rx="7" fill={c.accent} />
        <text x="46" y="5" textAnchor="middle" fill="#fff" fontSize="10" fontWeight="800">EXAM</text>
        {[0,1,2].map(i => (
          <g key={i} transform={`translate(14 ${26+i*25})`}>
            <rect width="13" height="13" rx="4" fill="#eaf2fb" />
            <path d="M3 7l3 3 5-6" fill="none" stroke={c.accent} strokeWidth="2.2" />
            <rect x="22" y="3" width="49" height="6" rx="3" fill="#bcccdc" />
          </g>
        ))}
      </g>
      <g transform="translate(275 42)">
        <circle cx="30" cy="30" r="25" fill="#eaf3ff" />
        <circle cx="30" cy="30" r="18" fill="#fff" stroke={c.accent} strokeWidth="3" />
        <path d="M30 18v13l9 6" fill="none" stroke={c.accent} strokeWidth="3" strokeLinecap="round" />
      </g>
      <IllustratedStudent accent={c.accent} shirt={c.shirt} />
    </>
  );
}

function ImportScene({ c }) {
  return (
    <>
      <g transform="translate(102 76)">
        <rect width="116" height="93" rx="18" fill="#fff" stroke={c.accent} strokeOpacity=".22" />
        <circle cx="58" cy="37" r="28" fill="#dff4ff" />
        <rect x="35" y="25" width="46" height="28" rx="12" fill="#2a5479" />
        <circle cx="48" cy="39" r="4" fill="#5df5e5" />
        <circle cx="68" cy="39" r="4" fill="#5df5e5" />
        <path d="M45 64h27" stroke={c.accent} strokeWidth="5" strokeLinecap="round" />
      </g>
      <g transform="translate(216 62)">
        <rect width="92" height="122" rx="16" fill="#fff" stroke={c.accent} strokeOpacity=".2" />
        <rect width="92" height="22" rx="16" fill={c.accent} />
        {[0,1,2].map(i => (
          <g key={i} transform={`translate(15 ${40+i*25})`}>
            <circle cx="6" cy="6" r="6" fill="#22b573" />
            <path d="M3 6l2 2 4-5" fill="none" stroke="#fff" strokeWidth="1.8" />
            <rect x="20" y="3" width="49" height="6" rx="3" fill="#c6d5e5" />
          </g>
        ))}
      </g>
      <path d="M205 112h18" stroke={c.accent2} strokeWidth="6" strokeLinecap="round" />
      <path d="m218 103 10 9-10 9" fill="none" stroke={c.accent2} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <IllustratedStudent accent={c.accent} shirt={c.shirt} />
    </>
  );
}

function ApiScene({ c }) {
  return (
    <>
      <g transform="translate(86 70)">
        <rect width="145" height="104" rx="17" fill="#103844" />
        <path d="m40 37-19 16 19 16M105 37l19 16-19 16M82 24 62 82" fill="none" stroke="#2ee196" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {['API','ChatGPT','Plugin'].map((label,i) => (
        <g key={label} transform={`translate(242 ${58+i*43})`}>
          <rect width="84" height="32" rx="10" fill="#fff" stroke={c.accent} strokeOpacity=".25" />
          <text x="42" y="21" textAnchor="middle" fontSize="11" fontWeight="800" fill="#135d48">{label}</text>
          <path d="M84 16h24" stroke="#24c67f" strokeWidth="3" />
        </g>
      ))}
      <IllustratedStudent accent={c.accent} shirt={c.shirt} />
    </>
  );
}

const SCENE_RENDERERS = {
  questions: QuestionScene,
  bundles: BundleScene,
  manage: ManageScene,
  blueprints: BlueprintScene,
  coverage: CoverageScene,
  quality: QualityScene,
  builder: BuilderScene,
  tests: TestsScene,
  import: ImportScene,
  chatgpt: ApiScene,
};

export default function AssessmentCoreHeroGraphic({ tab = 'questions' }) {
  const c = SCENES[tab] || SCENES.questions;
  const Scene = SCENE_RENDERERS[tab] || QuestionScene;
  return (
    <div className="qb-v6-hero-graphic" style={{ '--qb-accent': c.accent, '--qb-accent-2': c.accent2 }}>
      <svg viewBox="0 0 520 250" role="img" aria-label="">
        <defs>
          <linearGradient id="qbGlow" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={c.soft} stopOpacity="0.2" />
            <stop offset="100%" stopColor={c.accent} stopOpacity="0.16" />
          </linearGradient>
          <linearGradient id="qbFloor" x1="0" x2="1">
            <stop offset="0%" stopColor={c.accent} stopOpacity="0.03" />
            <stop offset="50%" stopColor={c.accent2} stopOpacity="0.12" />
            <stop offset="100%" stopColor={c.accent} stopOpacity="0.03" />
          </linearGradient>
        </defs>
        <path d="M0 180C87 123 143 207 229 153s160-109 291-56v153H0Z" fill="url(#qbGlow)" />
        <ellipse cx="290" cy="218" rx="218" ry="24" fill="url(#qbFloor)" />
        <circle cx="454" cy="48" r="50" fill={c.accent} opacity=".035" />
        <circle cx="465" cy="46" r="30" fill={c.accent2} opacity=".05" />
        <Scene c={c} />
        <TinySpark x={456} y={77} color={c.accent2} size={8} />
        <TinySpark x={430} y={130} color="#ffc249" size={6} />
      </svg>
      <div className="qb-v6-handwritten" aria-hidden="true">
        <span>{c.phrase[0]}</span>
        <span>{c.phrase[1]}</span>
      </div>
    </div>
  );
}
