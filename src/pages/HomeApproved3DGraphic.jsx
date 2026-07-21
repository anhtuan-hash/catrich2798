import React, { useId } from 'react';

function Defs({ uid }) {
  return (
    <defs>
      <linearGradient id={`${uid}-white`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff"/><stop offset="1" stopColor="#eee8e3"/>
      </linearGradient>
      <linearGradient id={`${uid}-orange`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffd45d"/><stop offset=".5" stopColor="#ff9b2f"/><stop offset="1" stopColor="#e85e0a"/>
      </linearGradient>
      <linearGradient id={`${uid}-purple`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#c990ff"/><stop offset=".55" stopColor="#8e50e4"/><stop offset="1" stopColor="#5b2bb7"/>
      </linearGradient>
      <linearGradient id={`${uid}-blue`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#79d4ff"/><stop offset=".52" stopColor="#3497ec"/><stop offset="1" stopColor="#1762bd"/>
      </linearGradient>
      <linearGradient id={`${uid}-cyan`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#7ef0e5"/><stop offset=".55" stopColor="#35c0c4"/><stop offset="1" stopColor="#0f879e"/>
      </linearGradient>
      <linearGradient id={`${uid}-green`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#c7ef76"/><stop offset=".55" stopColor="#79bf4c"/><stop offset="1" stopColor="#3f812e"/>
      </linearGradient>
      <linearGradient id={`${uid}-red`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ff9b8f"/><stop offset=".55" stopColor="#f35f60"/><stop offset="1" stopColor="#c73445"/>
      </linearGradient>
      <linearGradient id={`${uid}-navy`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#4b557b"/><stop offset="1" stopColor="#202941"/>
      </linearGradient>
      <filter id={`${uid}-shadow`} x="-30%" y="-30%" width="160%" height="180%">
        <feDropShadow dx="0" dy="8" stdDeviation="5" floodColor="#332336" floodOpacity=".28"/>
      </filter>
    </defs>
  );
}

function Sparkles({ color = '#ffd74f' }) {
  return <><path d="m187 22 5 11 11 5-11 5-5 11-5-11-11-5 11-5Z" fill={color}/><circle cx="176" cy="74" r="6" fill="#fff" opacity=".8"/></>;
}

function Pronunciation({ uid }) {
  return (
    <g filter={`url(#${uid}-shadow)`}>
      <ellipse cx="112" cy="151" rx="68" ry="10" fill="rgba(69,48,37,.16)"/>
      <g stroke={`url(#${uid}-orange)`} strokeWidth="8" strokeLinecap="round">
        <path d="M35 67v34M52 51v66M69 61v47M155 62v46M172 51v66M189 68v33"/>
      </g>
      <rect x="82" y="18" width="61" height="91" rx="30" fill={`url(#${uid}-navy)`} stroke="#141b2e" strokeWidth="4"/>
      <rect x="94" y="30" width="14" height="57" rx="7" fill="rgba(255,255,255,.18)"/>
      <path d="M68 75c0 31 18 52 45 52s45-21 45-52" fill="none" stroke={`url(#${uid}-orange)`} strokeWidth="11" strokeLinecap="round"/>
      <path d="M113 127v18M83 148h60" stroke="#a96512" strokeWidth="9" strokeLinecap="round"/>
      <circle cx="134" cy="45" r="5" fill="#7f8ab5"/>
      <Sparkles/>
    </g>
  );
}

function Speaking({ uid }) {
  return (
    <g filter={`url(#${uid}-shadow)`}>
      <ellipse cx="111" cy="148" rx="78" ry="11" fill="rgba(24,79,91,.16)"/>
      <path d="M22 45c0-13 10-23 23-23h86c13 0 23 10 23 23v50c0 13-10 23-23 23H83l-26 20 5-20H45c-13 0-23-10-23-23Z" fill={`url(#${uid}-blue)`} stroke="#1768b8" strokeWidth="4"/>
      <path d="M82 74c0-13 10-23 23-23h76c13 0 23 10 23 23v43c0 13-10 23-23 23h-21l4 18-25-18h-34c-13 0-23-10-23-23Z" fill={`url(#${uid}-cyan)`} stroke="#0c8993" strokeWidth="4"/>
      <g fill="#fff"><circle cx="57" cy="67" r="7"/><circle cx="82" cy="67" r="7"/><circle cx="107" cy="67" r="7"/></g>
      <g stroke="#fff" strokeWidth="7" strokeLinecap="round" opacity=".92"><path d="M111 88h62M111 106h47"/></g>
      <Sparkles color="#6ef2dd"/>
    </g>
  );
}

function Textcare({ uid }) {
  return (
    <g filter={`url(#${uid}-shadow)`}>
      <ellipse cx="110" cy="151" rx="67" ry="10" fill="rgba(72,39,105,.16)"/>
      <rect x="46" y="18" width="119" height="125" rx="23" fill={`url(#${uid}-purple)`} stroke="#6d35bf" strokeWidth="4"/>
      <path d="M61 35h75" stroke="rgba(255,255,255,.42)" strokeWidth="8" strokeLinecap="round"/>
      <g fill="#fff" opacity=".96"><rect x="65" y="59" width="19" height="19" rx="5"/><rect x="65" y="91" width="19" height="19" rx="5"/></g>
      <path d="m68 68 5 5 10-12M68 100l5 5 10-12" fill="none" stroke="#56db8a" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
      <g stroke="#efe1ff" strokeWidth="7" strokeLinecap="round"><path d="M97 68h47M97 100h38"/></g>
      <circle cx="158" cy="128" r="22" fill={`url(#${uid}-green)`} stroke="#397d2a" strokeWidth="4"/>
      <path d="m147 128 8 8 15-19" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round"/>
      <Sparkles color="#ffe36c"/>
    </g>
  );
}

function Lesson({ uid }) {
  return (
    <g filter={`url(#${uid}-shadow)`}>
      <ellipse cx="111" cy="153" rx="89" ry="10" fill="rgba(108,53,18,.17)"/>
      <g transform="translate(19 35)">
        <path d="M13 19c29-14 58-10 84 9v94c-27-15-55-18-84-7Z" fill={`url(#${uid}-white)`} stroke="#d99432" strokeWidth="4"/>
        <path d="M189 19c-29-14-58-10-92 9v94c31-15 60-18 92-7Z" fill={`url(#${uid}-white)`} stroke="#d99432" strokeWidth="4"/>
        <path d="M97 29v93" stroke="#efb153" strokeWidth="5"/>
        <rect x="31" y="49" width="22" height="45" rx="6" fill={`url(#${uid}-blue)`}/>
        <rect x="59" y="65" width="22" height="29" rx="6" fill={`url(#${uid}-purple)`}/>
        <path d="M117 51h47M117 67h38M117 83h53" stroke="#d1cbc5" strokeWidth="6" strokeLinecap="round"/>
        <path d="M26 103h55M116 103h55" stroke="#ded7d0" strokeWidth="5" strokeLinecap="round"/>
      </g>
      <g transform="translate(151 15) rotate(32 11 59)">
        <rect x="2" width="20" height="100" rx="9" fill={`url(#${uid}-red)`} stroke="#be3340" strokeWidth="4"/>
        <path d="m2 94 10 28 10-28" fill="#ffd9b3" stroke="#be3340" strokeWidth="4"/>
        <path d="m9 115 3 7 3-7" fill="#4c3541"/>
      </g>
      <Sparkles color="#ffbd2f"/>
    </g>
  );
}

function Reading({ uid }) {
  return (
    <g filter={`url(#${uid}-shadow)`}>
      <ellipse cx="108" cy="151" rx="76" ry="10" fill="rgba(49,95,43,.16)"/>
      <path d="M17 55c31-14 58-9 88 14v70c-29-18-58-20-88-10Z" fill={`url(#${uid}-white)`} stroke="#4d9b36" strokeWidth="4"/>
      <path d="M193 55c-31-14-58-9-88 14v70c29-18 58-20 88-10Z" fill={`url(#${uid}-white)`} stroke="#4d9b36" strokeWidth="4"/>
      <path d="M105 70v69" stroke="#8bc968" strokeWidth="5"/>
      <g stroke="#c8c4bd" strokeWidth="5" strokeLinecap="round"><path d="M34 82h48M34 99h55M126 82h48M119 99h55"/></g>
      <circle cx="151" cy="71" r="32" fill="rgba(255,255,255,.68)" stroke={`url(#${uid}-blue)`} strokeWidth="10"/>
      <path d="m173 94 29 28" stroke="#1767ba" strokeWidth="12" strokeLinecap="round"/>
      <path d="M139 61c9-9 23-10 33-4" fill="none" stroke="#fff" strokeWidth="6" strokeLinecap="round" opacity=".7"/>
    </g>
  );
}

function Game({ uid }) {
  return (
    <g filter={`url(#${uid}-shadow)`}>
      <ellipse cx="110" cy="145" rx="75" ry="10" fill="rgba(78,39,112,.16)"/>
      <path d="M45 39h126c18 0 29 13 32 31l7 37c4 20-13 32-30 21l-27-17H64l-27 17c-17 11-34-1-30-21l7-37c3-18 14-31 31-31Z" fill={`url(#${uid}-purple)`} stroke="#5c2daf" strokeWidth="5"/>
      <path d="M52 79h39M71.5 60v39" stroke="#fff" strokeWidth="12" strokeLinecap="round"/>
      <circle cx="154" cy="70" r="11" fill="#ffcf3e"/><circle cx="180" cy="92" r="11" fill="#49d48e"/><circle cx="154" cy="113" r="11" fill="#ff6e72"/><circle cx="130" cy="92" r="11" fill="#4fb3ff"/>
      <rect x="95" y="54" width="36" height="14" rx="7" fill="rgba(255,255,255,.45)"/>
      <Sparkles color="#ffd952"/>
    </g>
  );
}

function Word({ uid }) {
  return (
    <g filter={`url(#${uid}-shadow)`}>
      <ellipse cx="110" cy="151" rx="74" ry="10" fill="rgba(83,58,22,.16)"/>
      <g stroke="#d28b18" strokeWidth="7" strokeLinecap="round"><path d="M109 84 54 44M109 84l58-40M109 84l-51 45M109 84l57 46"/></g>
      <g stroke="#9d6110" strokeWidth="4">
        <circle cx="54" cy="44" r="25" fill={`url(#${uid}-orange)`}/><circle cx="167" cy="44" r="25" fill={`url(#${uid}-blue)`}/><circle cx="58" cy="129" r="25" fill={`url(#${uid}-green)`}/><circle cx="166" cy="130" r="25" fill={`url(#${uid}-purple)`}/>
      </g>
      <circle cx="109" cy="84" r="34" fill={`url(#${uid}-white)`} stroke="#d18c20" strokeWidth="6"/>
      <g fill="#fff" fontSize="22" fontWeight="900" textAnchor="middle"><text x="54" y="52">A</text><text x="167" y="52">B</text><text x="58" y="137">C</text><text x="166" y="138">D</text></g>
      <text x="109" y="94" textAnchor="middle" fontSize="32" fontWeight="900" fill="#8e5d1a">W</text>
      <Sparkles color="#ffcf39"/>
    </g>
  );
}

function Exam({ uid }) {
  return (
    <g filter={`url(#${uid}-shadow)`}>
      <ellipse cx="110" cy="151" rx="74" ry="10" fill="rgba(28,77,119,.16)"/>
      <rect x="42" y="20" width="125" height="126" rx="23" fill={`url(#${uid}-white)`} stroke="#2976bb" strokeWidth="5"/>
      <rect x="78" y="7" width="55" height="27" rx="11" fill={`url(#${uid}-navy)`}/>
      <circle cx="105" cy="15" r="5" fill="#cdd8e5"/>
      <g stroke="#2e9a74" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"><path d="m59 60 7 7 13-17M59 91l7 7 13-17M59 122l7 7 13-17"/></g>
      <g stroke="#b9c3ce" strokeWidth="7" strokeLinecap="round"><path d="M92 59h51M92 90h43M92 121h50"/></g>
      <circle cx="160" cy="126" r="27" fill={`url(#${uid}-orange)`} stroke="#c47209" strokeWidth="4"/>
      <path d="m160 110 5 10 12 2-9 8 2 12-10-6-11 6 3-12-9-8 12-2Z" fill="#fff"/>
      <path d="m147 146-4 23 17-10M173 146l4 23-17-10" fill={`url(#${uid}-red)`} stroke="#ad3040" strokeWidth="3"/>
    </g>
  );
}

const GRAPHICS = { pronunciation: Pronunciation, speaking: Speaking, textcare: Textcare, lesson: Lesson, reading: Reading, game: Game, word: Word, exam: Exam };

export default function HomeApproved3DGraphic({ type }) {
  const rawId = useId();
  const uid = `bhe3dg-${String(rawId).replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const Graphic = GRAPHICS[type] || Lesson;
  return (
    <span className={`bhe-card-graphic bhe-card-graphic-${type}`} aria-hidden="true">
      <svg viewBox="0 0 220 175" role="presentation" focusable="false">
        <Defs uid={uid}/><Graphic uid={uid}/>
      </svg>
    </span>
  );
}
