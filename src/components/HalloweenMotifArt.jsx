import React from 'react';

// Inline illustrated SVGs: no external requests, no image payloads, no emoji/font dependency.
// Every symbol shares the same 100x100 canvas and restrained amber/plum palette.
export const HALLOWEEN_SYMBOLS = Object.freeze([
  'pumpkin', 'witch-hat', 'black-cat', 'bat', 'ghost', 'haunted-house',
  'spider', 'spider-web', 'cauldron', 'candy-corn', 'skull', 'skeleton',
  'potion', 'broom', 'owl', 'tombstone', 'candle', 'crow',
  'coffin', 'vampire', 'mummy', 'lantern', 'eyeball', 'bone',
  'autumn-leaf', 'candy', 'moon', 'star',
]);

const ART = {
  pumpkin: <g>
    <path d="M50 30q-3-14 10-19" fill="none" stroke="#507c59" strokeWidth="6" strokeLinecap="round"/>
    <path d="M48 30C32 18 19 26 15 44 9 68 23 88 49 88c26 0 40-20 35-44-5-19-19-26-36-14Z" fill="#f59142" stroke="#c76d35" strokeWidth="2"/>
    <path d="M43 30Q25 49 39 87M56 30q18 19 5 57" fill="none" stroke="#d46c30" strokeWidth="4"/>
    <path d="m25 54 14-10 7 15Zm29 5 7-15 14 10ZM30 69q20 17 40 0l-7 13-12-5-13 5Z" fill="#492942"/>
  </g>,
  'witch-hat': <g>
    <path d="M52 11 31 66q-9 7-24 11c25 16 64 17 87 0-16-4-26-9-32-13L52 11Z" fill="#543568" stroke="#39233f" strokeWidth="2"/>
    <path d="m42 44 23 1 9 23-41 1Z" fill="#c58c68"/>
    <path d="M33 68q20 8 41-1" fill="none" stroke="#f7b650" strokeWidth="7"/>
    <path d="m57 20 3 11 12 3-12 3-3 12-4-12-12-3 12-3Z" fill="#eeb66e" opacity=".8"/>
  </g>,
  'black-cat': <g>
    <path d="M27 59c-6-18-2-36 4-45l16 13 16-13c8 17 11 30 5 46" fill="#42304f" stroke="#42304f" strokeWidth="4"/>
    <path d="M26 65c3-18 19-26 32-21 15 5 17 20 14 37H24Z" fill="#42304f"/>
    <path d="M69 75q29 1 21-29" fill="none" stroke="#42304f" strokeWidth="9" strokeLinecap="round"/>
    <ellipse cx="39" cy="49" rx="4" ry="6" fill="#f4c76d"/><ellipse cx="58" cy="49" rx="4" ry="6" fill="#f4c76d"/>
    <path d="m47 59 3 3 3-3M16 59l19 4M83 59l-21 4" fill="none" stroke="#e2b5bc" strokeWidth="2" strokeLinecap="round"/>
  </g>,
  bat: <g>
    <path d="m50 46-7-12-6 9C24 34 16 40 4 31c4 15 1 23 9 31 5-5 12-4 18 1 4 14 18 12 19 2 1 10 15 12 19-2 6-5 13-6 18-1 8-8 5-16 9-31-12 9-20 3-33 12l-6-9Z" fill="#594072"/>
    <circle cx="44" cy="53" r="2.5" fill="#ffc88a"/><circle cx="56" cy="53" r="2.5" fill="#ffc88a"/>
  </g>,
  ghost: <g>
    <path d="M22 84V43c0-17 12-28 28-28s28 11 28 28v41l-13-9-15 10-14-10Z" fill="#fff4e4" stroke="#c7a9c9" strokeWidth="2.5"/>
    <ellipse cx="40" cy="48" rx="4" ry="6" fill="#594069"/><ellipse cx="60" cy="48" rx="4" ry="6" fill="#594069"/>
    <path d="M45 67q5 7 11 0" stroke="#e0a0a8" strokeWidth="3" fill="none" strokeLinecap="round"/>
    <circle cx="32" cy="62" r="5" fill="#fac7c4" opacity=".65"/><circle cx="68" cy="62" r="5" fill="#fac7c4" opacity=".65"/>
  </g>,
  'haunted-house': <g>
    <circle cx="74" cy="22" r="15" fill="#fac778"/>
    <path d="m13 86 1-42 21-21 15 15V18l15-9 15 9v24l13 8v36Z" fill="#60446e" stroke="#493450" strokeWidth="2"/>
    <path d="m13 45 22-22 19 21M48 19l17-10 16 10" fill="none" stroke="#342b4a" strokeWidth="5" strokeLinejoin="round"/>
    <rect x="25" y="51" width="11" height="16" rx="5" fill="#ffd38c"/><rect x="64" y="46" width="11" height="16" rx="5" fill="#ffd38c"/>
    <path d="M43 86V67a9 9 0 0 1 18 0v19" fill="#2e273c"/><path d="M2 86h96" stroke="#8e6994" strokeWidth="4"/>
  </g>,
  spider: <g>
    <path d="M41 41 21 27 9 39M41 52 17 48 6 59M42 62 22 75l-9 13M59 41l20-14 12 12M59 52l24-4 11 11M58 62l20 13 9 13" stroke="#72517c" fill="none" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="50" cy="45" r="14" fill="#44304f"/><ellipse cx="50" cy="65" rx="19" ry="22" fill="#59406e"/>
    <circle cx="44" cy="44" r="2.5" fill="#ffd28a"/><circle cx="56" cy="44" r="2.5" fill="#ffd28a"/>
    <path d="m46 74 4 5 4-5" fill="none" stroke="#e7a1a2" strokeWidth="2"/>
  </g>,
  'spider-web': <g>
    <path d="M8 11q44 8 84 0M8 11q10 44 0 80M92 11Q82 55 92 91M8 91q41-8 84 0" stroke="#b3a0be" strokeWidth="2.5" fill="none"/>
    <path d="M8 11 92 91M92 11 8 91M50 5v90M5 51h90" stroke="#b3a0be" strokeWidth="2.5"/>
    <path d="M31 31q20-12 38 0 12 20 0 39-20 13-38 0-14-18 0-39ZM18 18q34-17 64 0 18 32 0 64-33 15-64 0-17-31 0-64Z" fill="none" stroke="#b3a0be" strokeWidth="2.5"/>
    <circle cx="50" cy="51" r="5" fill="#d39978"/>
  </g>,
  cauldron: <g>
    <path d="M25 36c-4-11 1-14 10-12M44 32q-5-12 4-18M67 33q2-11 11-10" fill="none" stroke="#93bdab" strokeWidth="4" strokeLinecap="round"/>
    <ellipse cx="50" cy="41" rx="35" ry="9" fill="#ab8bc1"/>
    <path d="M16 45q0 35 22 41h24q23-6 22-41" fill="#503b60"/>
    <ellipse cx="50" cy="45" rx="34" ry="10" fill="#8ebea1"/>
    <circle cx="36" cy="38" r="5" fill="#d9e3a8"/><circle cx="59" cy="29" r="7" fill="#a9dcac"/>
    <path d="m35 84-6 10M65 84l6 10" stroke="#503b60" strokeWidth="6" strokeLinecap="round"/>
  </g>,
  'candy-corn': <g>
    <path d="M49 11Q39 15 17 77q-4 12 12 13h42q15 0 12-13Q61 16 49 11Z" fill="#fff1d6" stroke="#dcad80" strokeWidth="2"/>
    <path d="M31 45q17 6 36 0l12 30q-28 8-60 0Z" fill="#f4a24c"/>
    <path d="M42 22q7-12 14 0l10 24q-17 8-34 0Z" fill="#fff4d5"/>
    <path d="M19 76q28 9 60 0l5 11q-35 14-70 0Z" fill="#f0cc84"/>
  </g>,
  skull: <g>
    <path d="M50 13c-22 0-34 15-34 35 0 14 8 23 18 27v12h32V75c10-4 18-13 18-27 0-20-12-35-34-35Z" fill="#fff1db" stroke="#c9b4a4" strokeWidth="2.5"/>
    <ellipse cx="35" cy="49" rx="11" ry="13" fill="#604969"/><ellipse cx="65" cy="49" rx="11" ry="13" fill="#604969"/>
    <path d="m50 57-6 8h12Z" fill="#604969"/>
    <path d="M40 76v11M50 75v12M60 76v11" stroke="#b894a6" strokeWidth="3"/>
    <circle cx="23" cy="29" r="4" fill="#f6d4b8"/>
  </g>,
  skeleton: <g>
    <circle cx="50" cy="22" r="15" fill="#fbecd8" stroke="#cbb6a4" strokeWidth="2"/>
    <ellipse cx="45" cy="21" rx="4" ry="5" fill="#614765"/><ellipse cx="55" cy="21" rx="4" ry="5" fill="#614765"/>
    <path d="M43 42h14M50 38v43M34 50q16 15 32 0M35 59q15 13 30 0M34 70q16 12 32 0M50 81 33 95M50 81l17 14M38 46 21 70M62 46l17 24" fill="none" stroke="#f8ead6" strokeWidth="7" strokeLinecap="round"/>
    <path d="M43 43h14M50 40v41" fill="none" stroke="#c6adab" strokeWidth="2"/>
  </g>,
  potion: <g>
    <path d="M40 11h20M43 13v27L20 76q-6 11 8 12h44q14-1 8-12L57 40V13" fill="#c89fc8" stroke="#725283" strokeWidth="3" strokeLinejoin="round"/>
    <path d="M30 68q20 10 40 0l10 13q2 8-9 8H28q-11 0-7-9Z" fill="#80beac"/>
    <circle cx="42" cy="59" r="5" fill="#e9f1bd"/><circle cx="61" cy="50" r="4" fill="#f8c68b"/>
    <path d="M37 11h27" stroke="#f4d9a3" strokeWidth="8" strokeLinecap="round"/>
  </g>,
  broom: <g>
    <path d="M24 85 74 16" fill="none" stroke="#916b52" strokeWidth="9" strokeLinecap="round"/>
    <path d="M17 70 7 89q25 12 43 3L54 71q-17 6-37-1Z" fill="#dfb16d" stroke="#bd8253" strokeWidth="2"/>
    <path d="m17 75-4 18M30 77l-1 19M41 74l4 19" stroke="#a66d48" strokeWidth="2"/>
    <path d="m19 70 33 4" stroke="#8b567c" strokeWidth="5" strokeLinecap="round"/>
    <path d="m75 13 5-7" stroke="#d7aa88" strokeWidth="3"/>
  </g>,
  owl: <g>
    <path d="m18 31 2-18 17 10q13-8 26 0l17-10 2 18c10 28-2 52-32 56-31-4-43-28-32-56Z" fill="#80617d" stroke="#60465f" strokeWidth="2"/>
    <circle cx="35" cy="46" r="16" fill="#efc5a3"/><circle cx="65" cy="46" r="16" fill="#efc5a3"/>
    <circle cx="35" cy="46" r="7" fill="#4c3853"/><circle cx="65" cy="46" r="7" fill="#4c3853"/>
    <path d="m45 58 5 10 5-10Z" fill="#efab59"/>
    <path d="m28 82-2 10M72 82l2 10" stroke="#e8ac6f" strokeWidth="4" strokeLinecap="round"/>
  </g>,
  tombstone: <g>
    <path d="M24 88V42q0-26 26-26t26 26v46Z" fill="#8c85a2" stroke="#625870" strokeWidth="3"/>
    <path d="M50 30v33M38 42h24" fill="none" stroke="#ede1c8" strokeWidth="7" strokeLinecap="round"/>
    <path d="M7 91q39-9 86 0" fill="none" stroke="#708978" strokeWidth="7" strokeLinecap="round"/>
    <path d="M32 76h36" stroke="#b6acc2" strokeWidth="2"/>
  </g>,
  candle: <g>
    <path d="M32 38h36v51H32Z" fill="#f8dfbf" stroke="#dbb8a4" strokeWidth="2"/>
    <path d="M50 8q-18 21 0 28 17-9 0-28Z" fill="#f2a35c"/>
    <path d="M50 19q-7 10 0 14 6-5 0-14Z" fill="#fff3b6"/>
    <path d="M30 39q20 8 40 0M31 61q6-8 12 0t11-1t14 0" stroke="#efb589" strokeWidth="4" fill="none"/>
    <ellipse cx="50" cy="91" rx="28" ry="5" fill="#8f6e86"/>
  </g>,
  crow: <g>
    <path d="M15 55q4-23 28-27 20-3 32 14l17 3-15 10q-2 24-29 29-22 2-33-29Z" fill="#454054"/>
    <path d="M38 48q18-6 27 7-12 16-28 12Z" fill="#61546c"/>
    <circle cx="68" cy="40" r="3" fill="#f1cb84"/>
    <path d="m40 83-2 11M54 81l4 13" stroke="#b28776" strokeWidth="3" strokeLinecap="round"/>
    <path d="M12 56 2 47l13 3" fill="#5c5266"/>
  </g>,
  coffin: <g>
    <path d="m50 7 19 14 18 26-9 40H22l-9-40 18-26Z" fill="#83536c" stroke="#553b53" strokeWidth="3"/>
    <path d="m50 17 14 12 13 21-7 28H30l-7-28 13-21Z" fill="#a46e7b" stroke="#d2a19a" strokeWidth="2"/>
    <path d="M50 34v32M41 46h18" stroke="#f0c28b" strokeWidth="5" strokeLinecap="round"/>
  </g>,
  vampire: <g>
    <path d="M16 92q5-28 34-31 29 3 34 31Z" fill="#633f6e"/>
    <path d="M25 35Q14 7 35 18q14-20 30 0 21-10 10 17l-11 31H36Z" fill="#40304c"/>
    <ellipse cx="50" cy="43" rx="24" ry="27" fill="#f5d5c8"/>
    <path d="M27 29q19-7 23 0 7-10 24 0" fill="none" stroke="#40304c" strokeWidth="9"/>
    <circle cx="41" cy="43" r="3" fill="#654960"/><circle cx="59" cy="43" r="3" fill="#654960"/>
    <path d="M38 55q12 10 24 0l-5 12-7-7-7 7Z" fill="#fff8eb" stroke="#b97f86" strokeWidth="1.4"/>
    <path d="m27 92 13-23 10 12 10-12 13 23" fill="none" stroke="#aa6b84" strokeWidth="4"/>
  </g>,
  mummy: <g>
    <rect x="23" y="10" width="54" height="80" rx="26" fill="#e5d2be" stroke="#bca895" strokeWidth="2"/>
    <path d="M25 30 74 16M24 43l52-13M23 58 77 44M25 73l52-15M33 87l42-16M35 12l40 39" stroke="#fdf0dc" strokeWidth="10"/>
    <path d="M24 39q24 6 52-1" fill="none" stroke="#806f7e" strokeWidth="3"/>
    <ellipse cx="41" cy="43" rx="4" ry="5" fill="#51465d"/><ellipse cx="59" cy="43" rx="4" ry="5" fill="#51465d"/>
  </g>,
  lantern: <g>
    <path d="M36 28c0-22 28-22 28 0" fill="none" stroke="#946b67" strokeWidth="5" strokeLinecap="round"/>
    <path d="M25 29h50l-7 57H32Z" fill="#c18862" stroke="#8c625d" strokeWidth="3"/>
    <path d="m34 37 6 39h20l6-39Z" fill="#f6c174"/>
    <path d="m50 47-6 14 7 10 8-10Z" fill="#f9e9aa"/>
    <path d="M20 87h60" stroke="#8d6471" strokeWidth="6" strokeLinecap="round"/>
  </g>,
  eyeball: <g>
    <path d="M7 50q43-52 86 0Q50 102 7 50Z" fill="#fff1db" stroke="#ac8a9c" strokeWidth="3"/>
    <circle cx="50" cy="50" r="22" fill="#86aeaa"/>
    <circle cx="50" cy="50" r="12" fill="#4b4462"/><circle cx="45" cy="43" r="5" fill="#fff9ef"/>
    <path d="m18 39-9-9M23 31l-3-13M78 32l7-13M82 39l9-9" stroke="#ad7892" strokeWidth="3" strokeLinecap="round"/>
  </g>,
  bone: <g>
    <g transform="rotate(-31 50 50)">
      <path d="M28 23q-16-14-23 1-4 12 9 16v22Q1 66 5 79q8 15 23 0h44q15 15 23 0 4-13-9-17V40q13-4 9-16-7-15-23-1Z" fill="#fbefda" stroke="#c4acac" strokeWidth="2.5"/>
      <rect x="25" y="33" width="50" height="33" rx="14" fill="#fbefda"/>
    </g>
  </g>,
  'autumn-leaf': <g>
    <path d="M50 7q12 19 27 10 0 17 15 20-16 12-5 27-23-3-27 27-10-17-20 0-7-23-27-18 9-19-8-28 17-12 17-28 18 8 28-10Z" fill="#e5a15b" stroke="#ca7b48" strokeWidth="2"/>
    <path d="M50 16v68M27 40l23 22M74 40 50 62" fill="none" stroke="#b76b4a" strokeWidth="3" strokeLinecap="round"/>
  </g>,
  candy: <g>
    <path d="m28 37-18-4 6 16-3 17 18-7M72 37l18-4-6 16 3 17-18-7" fill="#f5bb74" stroke="#d98c4a" strokeWidth="2"/>
    <rect x="28" y="34" width="44" height="32" rx="10" fill="#b08acd" stroke="#7953a2" strokeWidth="2"/>
    <path d="m41 35 14 30M57 35l13 22" stroke="#fce5c4" strokeWidth="8" opacity=".92"/>
  </g>,
  moon: <g>
    <path d="M65 12a38 38 0 1 0 23 65A39 39 0 0 1 65 12Z" fill="#fac778"/>
    <circle cx="29" cy="22" r="3" fill="#b89cbe"/>
    <path d="m80 22 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z" fill="#e9b4d3"/>
  </g>,
  star: <g>
    <path d="m50 9 10 30 30 11-30 11-10 30-11-30L9 50l30-11Z" fill="#f4aa66"/>
    <circle cx="50" cy="50" r="8" fill="#ffebc4"/>
  </g>,
};

export default function HalloweenMotifArt({ kind }) {
  return <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
    {ART[kind] || ART.star}
  </svg>;
}
