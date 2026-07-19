import React from 'react';

const iconPaths = {
  worksheet: (
    <>
      <path d="M23 13h44l12 12v62H23V13Z" />
      <path d="M67 14v13h12" />
      <path d="M34 35h33M34 48h11M51 48h16M34 61h11M51 61h16M34 74h33" />
      <path d="M28 47h2M28 60h2" />
    </>
  ),
  activity: (
    <>
      <path d="M18 20h64v60H18V20Z" />
      <path d="M28 33h22M28 45h34M28 57h18" />
      <path d="M62 55l8 8 14-18" />
    </>
  ),
  lesson: (
    <>
      <path d="M18 17h27c5 0 8 3 8 8v58c0-5-4-8-9-8H18V17Z" />
      <path d="M82 17H55c-5 0-8 3-8 8v58c0-5 4-8 9-8h26V17Z" />
      <path d="M29 33h13M29 45h11M61 33h13M61 45h11" />
    </>
  ),
  exam: (
    <>
      <path d="M30 14h40v72H30V14Z" />
      <path d="M40 30h22M40 43h22M40 56h16" />
      <path d="M63 65l7 7 15-18" />
    </>
  ),
  game: (
    <>
      <path d="M25 42h50c8 0 14 6 16 16l3 16c2 9-5 15-13 10L66 74H34L19 84c-8 5-15-1-13-10l3-16c2-10 8-16 16-16Z" />
      <path d="M31 58h16M39 50v16M70 56h1M80 64h1" />
    </>
  ),
  wordgraph: (
    <>
      <circle cx="25" cy="70" r="10" />
      <circle cx="50" cy="28" r="11" />
      <circle cx="75" cy="70" r="10" />
      <path d="M31 61l14-24M55 38l14 23M36 70h28" />
    </>
  ),
  identity: (
    <>
      <path d="M22 18h16M18 22v16M78 18H62M82 22v16M22 82h16M18 78V62M78 82H62M82 78V62" />
      <circle cx="50" cy="42" r="13" />
      <path d="M28 76c3-16 12-24 22-24s19 8 22 24" />
    </>
  ),

  tax: (
    <>
      <path d="M25 15h50v70H25V15Z" />
      <path d="M35 29h30M35 42h30M35 55h12M56 55h9M35 68h12M56 68h9" />
      <path d="M17 31h8M17 50h8M17 69h8" />
    </>
  ),
  news: (
    <>
      <path d="M17 18h66v64H17V18Z" />
      <path d="M27 31h26v20H27V31ZM61 31h12M61 42h12M27 61h46M27 71h34" />
    </>
  ),
  reading: (
    <>
      <path d="M17 19h30c5 0 8 3 8 8v55c0-5-4-8-9-8H17V19Z" />
      <path d="M83 19H53c-5 0-8 3-8 8v55c0-5 4-8 9-8h29V19Z" />
      <path d="M28 34h13M28 45h13M60 34h13M60 45h13" />
    </>
  ),
  speaking: (
    <>
      <path d="M21 24h46c8 0 14 6 14 14v15c0 8-6 14-14 14H49L31 82V67H21V24Z" />
      <path d="M34 43h25M34 54h18" />
    </>
  ),
  textcare: (
    <>
      <path d="M27 13h34l16 16v58H27V13Z" />
      <path d="M60 14v18h17" />
      <path d="M38 43h28M38 55h28M38 67h20" />
    </>
  ),
  homeroom: (
    <>
      <path d="M20 20h60v42H20V20Z" />
      <path d="M31 33h38M31 45h22" />
      <circle cx="35" cy="76" r="8" />
      <circle cx="65" cy="76" r="8" />
      <path d="M43 76h14" />
    </>
  ),
  department: (
    <>
      <path d="M20 31h60v51H20V31Z" />
      <path d="M32 18h36v13H32V18Z" />
      <path d="M32 45h12v12H32V45ZM56 45h12v12H56V45ZM32 65h12v12H32V65ZM56 65h12v12H56V65Z" />
    </>
  ),
  practice: (
    <>
      <path d="M55 13 24 54h23l-9 33 38-48H53l2-26Z" />
      <path d="M21 79h16M63 22h15" />
    </>
  ),
  library: (
    <>
      <path d="M18 24h25l7 9h32v43H18V24Z" />
      <path d="M18 38h64M29 51h43M29 63h30" />
    </>
  ),
  settings: (
    <>
      <circle cx="50" cy="50" r="11" />
      <path d="M50 16v10M50 74v10M26 26l7 7M67 67l7 7M16 50h10M74 50h10M26 74l7-7M67 33l7-7" />
    </>
  ),
  admin: (
    <>
      <path d="M18 30h64v52H18V30Z" />
      <path d="M32 18h36v12H32V18ZM30 45h18M30 58h28M66 46h8M66 60h8" />
    </>
  ),
  home: (
    <>
      <path d="M18 49 50 20l32 29" />
      <path d="M27 47v35h46V47" />
      <path d="M42 82V61h16v21" />
    </>
  ),
  apps: (
    <>
      <path d="M19 19h24v24H19V19ZM57 19h24v24H57V19ZM19 57h24v24H19V57ZM57 57h24v24H57V57Z" />
    </>
  ),
  ai: (
    <>
      <path d="M24 50c0-15 11-26 26-26s26 11 26 26-11 26-26 26-26-11-26-26Z" />
      <path d="M35 62 45 38h10l10 24M40 53h20" />
    </>
  ),
  contact: (
    <>
      <path d="M18 25h64v50H18V25Z" />
      <path d="m19 28 31 25 31-25" />
    </>
  ),
};

export const flatIconForSlug = {
  'textlab-activities': 'activity',
  'lesson-plan-ai': 'lesson',
  'exam-studio': 'exam',
  textcare: 'textcare',
  'news-reader': 'news',
  'vietnam-tax': 'tax',
  'reading-studio': 'reading',
  word2graph: 'wordgraph',
  'student-practice': 'practice',
  'department-workspace': 'department',
  'homeroom-hub': 'homeroom',
  'game-hub': 'game',
  'library-hub': 'library',
  'practice-hub': 'practice',
  'games-hub': 'game',
  'admin-hub': 'admin',
};

export default function FlatAppIcon({ type, slug, className = '' }) {
  const key = flatIconForSlug[slug] || type || 'apps';
  return (
    <span className={`flat-line-icon ${className}`.trim()} aria-hidden="true">
      <svg viewBox="0 0 100 100" focusable="false">
        <g fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="square" strokeLinejoin="miter">
          {iconPaths[key] || iconPaths.apps}
        </g>
      </svg>
    </span>
  );
}
