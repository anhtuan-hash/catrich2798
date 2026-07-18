import React, { useId } from 'react';

function GradientDefs({ uid }) {
  return (
    <defs>
      <linearGradient id={`${uid}-white`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffffff"/>
        <stop offset="1" stopColor="#ece8df"/>
      </linearGradient>
      <linearGradient id={`${uid}-blue`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#69adff"/>
        <stop offset="1" stopColor="#2d70d4"/>
      </linearGradient>
      <linearGradient id={`${uid}-green`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#9bd54f"/>
        <stop offset="1" stopColor="#4f9b29"/>
      </linearGradient>
      <linearGradient id={`${uid}-yellow`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffd75a"/>
        <stop offset="1" stopColor="#f0a900"/>
      </linearGradient>
      <linearGradient id={`${uid}-coral`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ff8d89"/>
        <stop offset="1" stopColor="#e84248"/>
      </linearGradient>
      <linearGradient id={`${uid}-mint`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#6edbc8"/>
        <stop offset="1" stopColor="#159c87"/>
      </linearGradient>
      <linearGradient id={`${uid}-purple`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#c48cff"/>
        <stop offset="1" stopColor="#7540cf"/>
      </linearGradient>
      <linearGradient id={`${uid}-orange`} x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="#ffb653"/>
        <stop offset="1" stopColor="#ec7200"/>
      </linearGradient>
    </defs>
  );
}

function GrammarGraphic({ uid }) {
  return (
    <>
      <ellipse cx="105" cy="130" rx="72" ry="12" fill="rgba(53,84,117,.13)"/>
      <g transform="translate(83 16) rotate(5 35 35)">
        <rect width="70" height="70" rx="19" fill={`url(#${uid}-blue)`} stroke="#2d68bd" strokeWidth="3"/>
        <path d="M12 13h45" stroke="rgba(255,255,255,.48)" strokeWidth="5" strokeLinecap="round"/>
        <text x="35" y="50" textAnchor="middle" fontSize="39" fontWeight="900" fill="#fff">G</text>
      </g>
      <g transform="translate(30 70) rotate(-10 31 31)">
        <rect width="62" height="62" rx="17" fill={`url(#${uid}-yellow)`} stroke="#d49100" strokeWidth="3"/>
        <text x="31" y="44" textAnchor="middle" fontSize="34" fontWeight="900" fill="#fff">A</text>
      </g>
      <g transform="translate(112 76) rotate(10 31 31)">
        <rect width="62" height="62" rx="17" fill={`url(#${uid}-green)`} stroke="#438424" strokeWidth="3"/>
        <text x="31" y="44" textAnchor="middle" fontSize="34" fontWeight="900" fill="#fff">B</text>
      </g>
      <path d="m33 25 4 9 9 4-9 4-4 9-4-9-9-4 9-4Z" fill="#7db8ff"/>
      <g fill="#fff" opacity=".88">
        <circle cx="168" cy="30" r="13"/><circle cx="184" cy="32" r="10"/><rect x="163" y="30" width="27" height="12" rx="6"/>
      </g>
    </>
  );
}

function TextCareGraphic({ uid }) {
  return (
    <>
      <ellipse cx="104" cy="134" rx="73" ry="11" fill="rgba(110,46,51,.13)"/>
      <g transform="translate(48 10) rotate(-5 52 61)">
        <rect width="105" height="122" rx="17" fill={`url(#${uid}-white)`} stroke="#d8d1c8" strokeWidth="3"/>
        <rect x="17" y="22" width="52" height="8" rx="4" fill="#ef6969"/>
        <rect x="17" y="40" width="72" height="6" rx="3" fill="#d8d5d0"/>
        <rect x="17" y="55" width="64" height="6" rx="3" fill="#d8d5d0"/>
        <rect x="17" y="70" width="72" height="6" rx="3" fill="#d8d5d0"/>
        <path d="M18 93c11-10 19 10 31-2 9-9 18 2 27-4" fill="none" stroke="#ff696c" strokeWidth="4" strokeLinecap="round"/>
        <circle cx="21" cy="105" r="10" fill={`url(#${uid}-coral)`}/>
        <path d="m16 105 4 4 7-8" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/>
      </g>
      <g transform="translate(126 43) rotate(24 15 52)">
        <rect x="6" y="7" width="22" height="86" rx="10" fill={`url(#${uid}-coral)`} stroke="#c9343a" strokeWidth="3"/>
        <path d="m6 87 11 27 11-27" fill="#ffd4b1" stroke="#c9343a" strokeWidth="3" strokeLinejoin="round"/>
        <path d="m14 107 3 7 3-7" fill="#80363a"/>
        <rect x="8" y="12" width="18" height="9" rx="4" fill="rgba(255,255,255,.5)"/>
      </g>
      <path d="m30 23 4 9 9 4-9 4-4 9-4-9-9-4 9-4Z" fill="#ffaca9" opacity=".85"/>
    </>
  );
}

function LessonGraphic({ uid }) {
  return (
    <>
      <ellipse cx="111" cy="140" rx="82" ry="10" fill="rgba(104,79,14,.13)"/>
      <g transform="translate(36 98)">
        <rect x="0" y="22" width="124" height="25" rx="11" fill={`url(#${uid}-green)`} stroke="#438d39" strokeWidth="3"/>
        <rect x="8" y="2" width="128" height="25" rx="11" fill={`url(#${uid}-purple)`} stroke="#7347bd" strokeWidth="3"/>
      </g>
      <g transform="translate(50 18) rotate(4 53 49)">
        <rect width="107" height="98" rx="18" fill={`url(#${uid}-white)`} stroke="#d2cbc0" strokeWidth="3"/>
        <rect x="14" y="14" width="79" height="17" rx="7" fill="#353e48"/>
        <circle cx="24" cy="22.5" r="3.5" fill="#ff645d"/><circle cx="35" cy="22.5" r="3.5" fill="#ffbf38"/><circle cx="46" cy="22.5" r="3.5" fill="#45ca62"/>
        <rect x="16" y="43" width="27" height="25" rx="6" fill="#ffd04b"/>
        <rect x="49" y="43" width="27" height="25" rx="6" fill="#73c553"/>
        <rect x="81" y="43" width="15" height="25" rx="6" fill="#5b9cf2"/>
        <rect x="16" y="75" width="80" height="9" rx="4.5" fill="#ddd9d1"/>
      </g>
      <g transform="translate(154 28) rotate(8 13 52)">
        <rect x="2" y="0" width="23" height="105" rx="8" fill={`url(#${uid}-yellow)`} stroke="#d49200" strokeWidth="3"/>
        <path d="M8 17h10M8 34h7M8 51h10M8 68h7M8 85h10" stroke="#b97d00" strokeWidth="3" strokeLinecap="round"/>
      </g>
      <g transform="translate(136 69) rotate(34 10 42)">
        <rect x="2" width="17" height="72" rx="8" fill={`url(#${uid}-coral)`} stroke="#c43b42" strokeWidth="3"/>
        <path d="m2 67 8.5 21 8.5-21" fill="#ffd2a5" stroke="#c43b42" strokeWidth="3"/>
        <path d="m8 82 2.5 6 2.5-6" fill="#503c33"/>
      </g>
    </>
  );
}

function GameGraphic({ uid }) {
  return (
    <>
      <ellipse cx="101" cy="124" rx="64" ry="10" fill="rgba(21,92,80,.12)"/>
      <g transform="translate(26 36)">
        <path d="M27 10h91c22 0 35 16 39 37l7 36c4 20-12 33-30 22l-25-16H38l-25 16C-5 116-21 103-17 83l7-36C-6 26 7 10 27 10Z" fill={`url(#${uid}-white)`} stroke="#c8c3b9" strokeWidth="3"/>
        <path d="M21 51h31M36.5 36v31" stroke="#39424b" strokeWidth="9" strokeLinecap="round"/>
        <circle cx="111" cy="46" r="9" fill="#ff6261"/><circle cx="132" cy="65" r="9" fill="#63b750"/><circle cx="112" cy="83" r="9" fill="#ffd04b"/><circle cx="92" cy="64" r="9" fill="#4f92e8"/>
        <rect x="63" y="31" width="35" height="15" rx="7" fill="#dad6ce"/>
      </g>
      <path d="m165 22 4 9 9 4-9 4-4 9-4-9-9-4 9-4Z" fill="#ffd040"/>
      <circle cx="29" cy="31" r="6" fill="#72dbc7"/><circle cx="42" cy="20" r="4" fill="#fff"/>
    </>
  );
}

function WordGraphic({ uid }) {
  return (
    <>
      <ellipse cx="103" cy="132" rx="65" ry="9" fill="rgba(69,42,119,.12)"/>
      <g stroke="#8a5ed8" strokeWidth="5" strokeLinecap="round">
        <path d="M99 77 58 39M99 77l44-39M99 77 55 112M99 77l48 35"/>
      </g>
      <g fill={`url(#${uid}-purple)`} stroke="#6c36bf" strokeWidth="3">
        <circle cx="58" cy="39" r="21"/><circle cx="143" cy="38" r="21"/><circle cx="55" cy="112" r="21"/><circle cx="148" cy="112" r="21"/>
      </g>
      <g fill="#fff" fontSize="17" fontWeight="900" textAnchor="middle">
        <text x="58" y="45">A</text><text x="143" y="44">B</text><text x="55" y="118">C</text><text x="148" y="118">D</text>
      </g>
      <circle cx="101" cy="77" r="30" fill={`url(#${uid}-white)`} stroke="#9b72df" strokeWidth="4"/>
      <text x="101" y="88" textAnchor="middle" fontSize="31" fontWeight="900" fill="#7040c9">W</text>
      <circle cx="99" cy="16" r="8" fill="#ffad58"/>
    </>
  );
}

function ReadingGraphic({ uid }) {
  return (
    <>
      <ellipse cx="103" cy="133" rx="67" ry="9" fill="rgba(42,90,137,.12)"/>
      <path d="M19 48c33-14 58-7 82 12v66c-24-17-50-24-82-12Z" fill={`url(#${uid}-white)`} stroke="#4b8ed9" strokeWidth="3"/>
      <path d="M181 48c-33-14-58-7-80 12v66c23-17 48-24 80-12Z" fill={`url(#${uid}-white)`} stroke="#4b8ed9" strokeWidth="3"/>
      <path d="M101 61v65" stroke="#8db9ea" strokeWidth="4"/>
      <g stroke="#b7c8d8" strokeWidth="3" strokeLinecap="round">
        <path d="M34 68h49M34 80h55M34 92h45M117 68h47M113 80h53M116 92h42"/>
      </g>
      <g transform="translate(124 18)">
        <path d="M0 10C0 4 5 0 11 0h43c6 0 11 4 11 10v34c0 6-5 10-11 10H28L13 66V54h-2C5 54 0 50 0 44Z" fill={`url(#${uid}-blue)`} stroke="#2e69ba" strokeWidth="3"/>
        <path d="M15 17h35M15 28h27" stroke="#fff" strokeWidth="4" strokeLinecap="round" opacity=".9"/>
      </g>
      <path d="M151 48v38l-11-8-11 8V48" fill="#4a8ee4"/>
    </>
  );
}

function ListeningGraphic({ uid }) {
  return (
    <>
      <ellipse cx="102" cy="132" rx="64" ry="9" fill="rgba(122,69,13,.12)"/>
      <path d="M43 76c0-40 25-64 59-64s59 24 59 64" fill="none" stroke={`url(#${uid}-orange)`} strokeWidth="21" strokeLinecap="round"/>
      <path d="M48 76c0-36 21-56 54-56s54 20 54 56" fill="none" stroke="rgba(255,255,255,.45)" strokeWidth="5" strokeLinecap="round"/>
      <rect x="27" y="69" width="37" height="57" rx="17" fill={`url(#${uid}-orange)`} stroke="#cb6200" strokeWidth="3"/>
      <rect x="140" y="69" width="37" height="57" rx="17" fill={`url(#${uid}-orange)`} stroke="#cb6200" strokeWidth="3"/>
      <rect x="39" y="80" width="12" height="34" rx="6" fill="rgba(255,255,255,.35)"/>
      <rect x="153" y="80" width="12" height="34" rx="6" fill="rgba(255,255,255,.35)"/>
      <g stroke="#f29925" strokeWidth="5" strokeLinecap="round">
        <path d="M76 88v19M88 77v41M101 84v27M114 70v54M127 87v21"/>
      </g>
    </>
  );
}

function WorksheetGraphic({ uid }) {
  return (
    <>
      <ellipse cx="101" cy="133" rx="66" ry="9" fill="rgba(107,54,59,.12)"/>
      <g transform="translate(36 18) rotate(-7 54 54)">
        <rect x="10" y="13" width="104" height="112" rx="15" fill="#f4dadd" stroke="#e2b8bd" strokeWidth="3"/>
        <rect width="104" height="112" rx="15" fill={`url(#${uid}-white)`} stroke="#d7d0c7" strokeWidth="3"/>
        <g fill="#fff" stroke="#ee666b" strokeWidth="3">
          <rect x="18" y="24" width="15" height="15" rx="4"/><rect x="18" y="51" width="15" height="15" rx="4"/><rect x="18" y="78" width="15" height="15" rx="4"/>
        </g>
        <g stroke="#ee666b" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"><path d="m21 31 4 4 7-9"/><path d="m21 58 4 4 7-9"/></g>
        <g stroke="#c7c2bb" strokeWidth="5" strokeLinecap="round"><path d="M45 31h40M45 58h46M45 85h34"/></g>
      </g>
      <g transform="translate(121 54) rotate(31 10 40)">
        <rect x="2" width="17" height="70" rx="8" fill={`url(#${uid}-coral)`} stroke="#c43b42" strokeWidth="3"/>
        <path d="m2 65 8.5 21 8.5-21" fill="#ffd2a5" stroke="#c43b42" strokeWidth="3"/>
      </g>
      <rect x="123" y="105" width="48" height="34" rx="12" fill={`url(#${uid}-green)`} stroke="#438d39" strokeWidth="3"/>
      <path d="m136 122 8 8 15-19" fill="none" stroke="#fff" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    </>
  );
}

function ExamGraphic({ uid }) {
  return (
    <>
      <ellipse cx="101" cy="133" rx="66" ry="9" fill="rgba(34,91,78,.12)"/>
      <rect x="43" y="18" width="102" height="112" rx="17" fill={`url(#${uid}-white)`} stroke="#268f7e" strokeWidth="4"/>
      <rect x="73" y="4" width="44" height="25" rx="10" fill="#44515b"/>
      <circle cx="95" cy="12" r="5" fill="#d9d5cc"/>
      <g stroke="#29a18c" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
        <path d="m58 49 6 6 11-14M58 75l6 6 11-14M58 101l6 6 11-14"/>
      </g>
      <g stroke="#c5c3bd" strokeWidth="5" strokeLinecap="round"><path d="M83 50h44M83 76h38M83 102h45"/></g>
      <g transform="translate(121 87)">
        <circle cx="28" cy="28" r="27" fill={`url(#${uid}-yellow)`} stroke="#d39000" strokeWidth="3"/>
        <path d="m28 12 5 10 12 2-9 8 2 12-10-6-11 6 3-12-9-8 12-2Z" fill="#fff"/>
        <path d="m12 46-3 28 18-11M44 46l4 28-18-11" fill={`url(#${uid}-green)`} stroke="#2e7e54" strokeWidth="3" strokeLinejoin="round"/>
      </g>
    </>
  );
}

function ResourceGraphic({ uid }) {
  return (
    <>
      <ellipse cx="100" cy="134" rx="70" ry="9" fill="rgba(45,82,121,.12)"/>
      <g transform="translate(65 20)">
        <rect x="8" y="0" width="83" height="91" rx="13" fill={`url(#${uid}-white)`} stroke="#d0cbc2" strokeWidth="3"/>
        <rect x="0" y="13" width="83" height="91" rx="13" fill="#eaf1f8" stroke="#b7c9dd" strokeWidth="3"/>
        <g stroke="#9eb7d0" strokeWidth="4" strokeLinecap="round"><path d="M18 37h47M18 53h40M18 69h50"/></g>
      </g>
      <path d="M22 61h61l16 18h72v52H22Z" fill={`url(#${uid}-blue)`} stroke="#2d69b8" strokeWidth="4" strokeLinejoin="round"/>
      <path d="M22 82h149l-12 49H33Z" fill="#579bea" opacity=".92"/>
      <path d="M36 94h112" stroke="rgba(255,255,255,.43)" strokeWidth="5" strokeLinecap="round"/>
      <g fill="#fff" opacity=".96">
        <circle cx="156" cy="42" r="17"/><circle cx="176" cy="45" r="13"/><circle cx="140" cy="48" r="12"/><rect x="137" y="45" width="48" height="17" rx="8.5"/>
      </g>
    </>
  );
}

function AiGraphic({ uid }) {
  return (
    <>
      <ellipse cx="103" cy="134" rx="63" ry="9" fill="rgba(78,45,118,.12)"/>
      <path d="M45 55c0-25 20-43 48-43h28c28 0 49 18 49 43v31c0 25-21 43-49 43H98l-26 18 5-22c-19-6-32-20-32-39Z" fill={`url(#${uid}-purple)`} stroke="#6833b8" strokeWidth="4"/>
      <path d="M63 49c14-18 39-24 72-15" fill="none" stroke="rgba(255,255,255,.38)" strokeWidth="8" strokeLinecap="round"/>
      <g fill="#fff"><circle cx="83" cy="76" r="7"/><circle cx="107" cy="76" r="7"/><circle cx="131" cy="76" r="7"/></g>
      <path d="m37 21 5 11 11 5-11 5-5 11-5-11-11-5 11-5Z" fill="#ffd23e"/>
      <path d="m171 16 4 9 9 4-9 4-4 9-4-9-9-4 9-4Z" fill="#fff" opacity=".95"/>
      <path d="m169 102 4 9 9 4-9 4-4 9-4-9-9-4 9-4Z" fill="#ffd23e"/>
      <circle cx="27" cy="94" r="7" fill="#c69cff"/>
    </>
  );
}

const GRAPHICS = {
  grammar: GrammarGraphic,
  textcare: TextCareGraphic,
  lesson: LessonGraphic,
  game: GameGraphic,
  word: WordGraphic,
  reading: ReadingGraphic,
  listening: ListeningGraphic,
  worksheet: WorksheetGraphic,
  exam: ExamGraphic,
  resource: ResourceGraphic,
  ai: AiGraphic,
};

export default function HomeExactGraphic({ type }) {
  const generatedId = useId();
  const uid = `bhe-${String(generatedId).replace(/[^a-zA-Z0-9_-]/g, '')}`;
  const Graphic = GRAPHICS[type] || GrammarGraphic;

  return (
    <span className={`bhe-card-graphic bhe-card-graphic-${type}`} aria-hidden="true">
      <svg viewBox="0 0 200 150" role="presentation" focusable="false">
        <GradientDefs uid={uid}/>
        <Graphic uid={uid}/>
      </svg>
    </span>
  );
}
