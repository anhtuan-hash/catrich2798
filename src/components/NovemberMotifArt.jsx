import React from 'react';

// Bespoke, vector-only artwork for Ngày Nhà giáo Việt Nam (20/11).
// All illustrations share a warm ivory / soft coral / sage / gold palette.
export const NOVEMBER_MOTIFS = Object.freeze([
  'rose', 'lotus', 'sunflower', 'carnation', 'bouquet', 'petals',
  'open-book', 'book-stack', 'notebook', 'pencil', 'fountain-pen', 'chalkboard',
  'chalk', 'ruler', 'graduation-cap', 'school-bell', 'paper-plane', 'envelope',
  'thank-you-letter', 'ribbon', 'golden-star', 'heart', 'leaf', 'november-20',
]);
export const NOVEMBER_MOTIF_LABELS = Object.freeze({
  rose: 'Hoa hồng', lotus: 'Hoa sen', sunflower: 'Hoa hướng dương',
  carnation: 'Hoa cẩm chướng', bouquet: 'Bó hoa tri ân', petals: 'Cánh hoa',
  'open-book': 'Sách mở', 'book-stack': 'Chồng sách', notebook: 'Vở học sinh',
  pencil: 'Bút chì', 'fountain-pen': 'Bút máy', chalkboard: 'Bảng xanh',
  chalk: 'Viên phấn', ruler: 'Thước kẻ', 'graduation-cap': 'Mũ tốt nghiệp',
  'school-bell': 'Chuông trường', 'paper-plane': 'Máy bay giấy',
  envelope: 'Phong thư', 'thank-you-letter': 'Thiệp cảm ơn',
  ribbon: 'Dải ruy băng', 'golden-star': 'Ngôi sao', heart: 'Trái tim',
  leaf: 'Lá non', 'november-20': 'Ngày 20/11',
});
const C = {
  coral: '#e88e93', blush: '#f9c7c2', cream: '#fff7e8', gold: '#e9b56b',
  sage: '#7fa999', green: '#548779', plum: '#8b688d', ink: '#647689',
  sand: '#d4af91', lilac: '#c3a9cc',
};
function Flower({ petals = 7, fill = C.coral, center = C.gold, stem = true }) {
  return <g>
    {stem && <path d="M50 52q-7 23-3 41M49 75q-20-14-25-3 8 16 22 10M49 68q14-17 24-12-2 14-23 18" stroke={C.green} strokeWidth="4" strokeLinecap="round" fill={C.sage}/>}
    {Array.from({ length: petals }, (_, i) => <ellipse key={i} cx="50" cy="29" rx="11" ry="20" transform={`rotate(${i * 360 / petals} 50 48)`} fill={fill} stroke="#fff7f1" strokeWidth="1.1"/>)}
    <circle cx="50" cy="48" r="11" fill={center}/><circle cx="47" cy="45" r="3" fill={C.cream} opacity=".85"/>
  </g>;
}
const ART = {
  rose: <g><path d="M52 49Q38 18 54 16q22-1 20 19-1 19-21 25-18-5-25-18 0-15 13-19" fill={C.coral} stroke="#cd727c" strokeWidth="2.5"/>
    <path d="M36 38q8-18 24-5-2 12-11 14M52 59q-9 19-6 34M45 76q-17-14-25-6 8 16 24 13M48 73q15-17 25-10-4 15-25 15" fill={C.sage} stroke={C.green} strokeWidth="3.5" strokeLinecap="round"/></g>,
  lotus: <g><path d="M50 85V55M50 79q-18-16-30-7 9 13 30 11M50 72q18-13 29-9-5 16-29 15" fill={C.sage} stroke={C.green} strokeWidth="3"/>
    <path d="M50 16q-19 24 0 43 19-19 0-43ZM43 58Q19 15 13 46q8 18 30 12ZM57 58q24-43 30-12-8 18-30 12Z" fill={C.coral} stroke="#cc929d" strokeWidth="2"/>
    <path d="M18 59q21 25 32 1 11 24 32-1" fill="none" stroke={C.blush} strokeWidth="9"/></g>,
  sunflower: <Flower petals={10} fill={C.gold} center="#a87451"/>,
  carnation: <g><path d="M50 55v38M49 77q-18-16-25-7 7 15 25 13" fill={C.sage} stroke={C.green} strokeWidth="4"/>
    <path d="M24 35q-10-18 9-20l9 8Q52 6 61 22q19-13 23 8 10 21-10 31-27 15-46-5-15-8-4-21Z" fill={C.blush} stroke={C.coral} strokeWidth="3"/>
    <path d="M33 30q8 14 8 27M50 24q-1 16 1 33M67 27q-9 16-10 30" stroke={C.coral} strokeWidth="3" fill="none"/></g>,
  bouquet: <g><path d="m22 52 29 40 27-40-29 12Z" fill="#f6e2cf" stroke={C.sand} strokeWidth="3"/><path d="M34 66 62 81M63 65 39 81" stroke={C.green} strokeWidth="3"/>
    <g transform="translate(-19 -17) scale(.7)"><Flower petals={7} fill={C.coral} stem={false}/></g>
    <g transform="translate(20 -19) scale(.7)"><Flower petals={8} fill={C.gold} stem={false}/></g>
    <g transform="translate(7 8) scale(.7)"><Flower petals={6} fill={C.lilac} stem={false}/></g>
    <path d="m42 82 17 1-8 11Z" fill={C.coral}/></g>,
  petals: <g>{[[24,21,-24],[64,19,30],[45,45,70],[73,69,-15],[26,77,20]].map(([x,y,r],i)=><path key={i} d="M0 0C13-21 31-10 0 18Q-11 8 0 0Z" transform={`translate(${x} ${y}) rotate(${r})`} fill={[C.blush,C.coral,C.gold,C.lilac,C.blush][i]} />)}</g>,
  'open-book': <g><path d="M50 26q-22-13-40-5v54q19-6 40 8 21-14 40-8V21q-18-8-40 5Z" fill={C.cream} stroke={C.ink} strokeWidth="3"/>
    <path d="M50 26v57M19 37q13-3 24 4M19 47q14-2 24 6M59 42q12-7 23-5M59 55q14-6 23-4" fill="none" stroke={C.sage} strokeWidth="3" strokeLinecap="round"/></g>,
  'book-stack': <g><rect x="15" y="57" width="73" height="23" rx="5" fill={C.coral}/><path d="M26 64h46v9H26Z" fill={C.cream}/>
    <rect x="21" y="35" width="64" height="20" rx="5" fill={C.sage}/><path d="M31 42h45v7H31Z" fill={C.cream}/>
    <rect x="14" y="16" width="72" height="17" rx="5" fill={C.lilac}/><path d="M24 22h53v5H24Z" fill={C.cream}/></g>,
  notebook: <g><rect x="22" y="13" width="61" height="75" rx="7" fill={C.cream} stroke={C.sage} strokeWidth="3"/>
    <path d="M34 24v51M44 34h29M44 48h29M44 62h22" stroke={C.blush} strokeWidth="3" strokeLinecap="round"/>
    {[29,43,57,71].map(y=><circle key={y} cx="23" cy={y} r="5" fill={C.gold} stroke={C.cream} strokeWidth="2"/>)}</g>,
  pencil: <g transform="rotate(35 50 50)"><path d="M40 15h20v59L50 91 40 74Z" fill={C.gold} stroke={C.sand} strokeWidth="2"/>
    <path d="M40 19h20v13H40Z" fill={C.coral}/><path d="m40 74 10 17 10-17" fill={C.cream}/><path d="m47 85 3 6 3-6" fill={C.ink}/><path d="M47 35v39" stroke={C.cream} strokeWidth="3"/></g>,
  'fountain-pen': <g transform="rotate(34 50 50)"><rect x="40" y="12" width="20" height="56" rx="7" fill={C.plum}/><path d="M43 64h14l5 16-12 13-12-13Z" fill={C.gold} stroke={C.sand} strokeWidth="2"/>
    <circle cx="50" cy="77" r="4" fill={C.cream}/><path d="M47 14v45" stroke={C.lilac} strokeWidth="3"/></g>,
  chalkboard: <g><rect x="10" y="15" width="80" height="64" rx="6" fill={C.sand}/><rect x="17" y="22" width="66" height="48" rx="2" fill="#6f9e8e"/>
    <path d="M24 38q14-13 25 0 7 8 24-2M25 51h29M63 51h12" stroke={C.cream} strokeWidth="4" strokeLinecap="round" fill="none"/>
    <path d="M13 83h74M31 83v11M69 83v11" stroke={C.sand} strokeWidth="5" strokeLinecap="round"/></g>,
  chalk: <g><rect x="17" y="45" width="58" height="17" rx="7" transform="rotate(-24 46 54)" fill={C.cream} stroke={C.sand} strokeWidth="2"/>
    <path d="m27 79 57-23" stroke={C.sage} strokeWidth="4" strokeLinecap="round"/><circle cx="81" cy="75" r="4" fill={C.blush}/><circle cx="12" cy="30" r="3" fill={C.blush}/></g>,
  ruler: <g transform="rotate(-32 50 50)"><rect x="13" y="39" width="74" height="22" rx="4" fill={C.gold} stroke={C.sand} strokeWidth="2"/>
    {[23,33,43,53,63,73].map((x,i)=><path key={x} d={`M${x} 40v${i%2?8:13}`} stroke={C.ink} strokeWidth="2" />)}</g>,
  'graduation-cap': <g><path d="m8 37 42-23 42 23-42 23Z" fill={C.plum}/><path d="M25 48v22q26 17 50 0V48" fill={C.lilac} stroke={C.plum} strokeWidth="3"/>
    <path d="M91 39v33" stroke={C.gold} strokeWidth="4"/><circle cx="91" cy="78" r="6" fill={C.gold}/></g>,
  'school-bell': <g><path d="M31 69V40q1-17 19-19 19 2 19 19v29l11 9H20Z" fill={C.gold} stroke={C.sand} strokeWidth="3"/>
    <path d="M46 20v-8h8v8" stroke={C.plum} strokeWidth="4"/><circle cx="50" cy="81" r="8" fill={C.coral}/>
    <path d="M39 47q-3-12 7-16" stroke={C.cream} strokeWidth="5" strokeLinecap="round"/></g>,
  'paper-plane': <g><path d="M10 43 91 15 65 87 47 60 30 73l4-28Z" fill={C.cream} stroke={C.sage} strokeWidth="3" strokeLinejoin="round"/>
    <path d="M34 45 91 15 47 60M30 73l17-13" fill="none" stroke={C.sage} strokeWidth="2"/><path d="m11 78 12 1M15 87l11-4" stroke={C.coral} strokeWidth="3" strokeLinecap="round"/></g>,
  envelope: <g><rect x="12" y="26" width="76" height="55" rx="6" fill={C.cream} stroke={C.sand} strokeWidth="3"/>
    <path d="m12 31 38 30 38-30M12 78l27-26M88 78 61 52" fill="none" stroke={C.sand} strokeWidth="3"/>
    <path d="M50 43q-13-16-20-3-3 11 20 24 23-13 20-24-7-13-20 3Z" fill={C.coral} transform="translate(0 -22) scale(.8 0.8) translate(12 12)" /></g>,
  'thank-you-letter': <g><path d="M26 12h49l9 12v64H26Z" fill={C.cream} stroke={C.sand} strokeWidth="3"/><path d="M75 12v12h9" fill={C.blush}/>
    <path d="M37 47q13-16 26-1-2 15-26 1Z" fill={C.coral}/><path d="M37 65h33M37 74h24" stroke={C.sage} strokeWidth="3" strokeLinecap="round"/><path d="M14 28h22" stroke={C.gold} strokeWidth="5" strokeLinecap="round"/></g>,
  ribbon: <g><path d="M31 31 16 85l23-9 11 14 13-14 22 9-17-54" fill={C.blush} stroke={C.coral} strokeWidth="2"/>
    <circle cx="50" cy="36" r="24" fill={C.gold} stroke="#d7a15a" strokeWidth="3"/><circle cx="50" cy="36" r="17" fill={C.cream}/>
    <path d="m50 22 4 9 10 1-7 8 2 10-9-5-9 5 2-10-7-8 10-1Z" fill={C.coral}/></g>,
  'golden-star': <g><path d="m50 10 11 26 29 3-21 19 6 30-25-15-25 15 6-30L10 39l29-3Z" fill={C.gold} stroke={C.sand} strokeWidth="2"/>
    <path d="M44 28 35 48" stroke={C.cream} strokeWidth="5" strokeLinecap="round"/></g>,
  heart: <g><path d="M50 86C5 58 8 32 24 24q19-9 26 11 7-20 26-11 16 8 14 29Q88 69 50 86Z" fill={C.coral} stroke="#d37d85" strokeWidth="3"/>
    <path d="M24 46q0-12 12-15" stroke={C.cream} strokeWidth="5" fill="none" strokeLinecap="round"/></g>,
  leaf: <g><path d="M12 66Q20 20 82 12 87 82 35 87q-22-1-23-21Z" fill={C.sage} stroke={C.green} strokeWidth="3"/>
    <path d="M19 84q25-37 56-59M38 57l-2-22M49 45l19 4M31 69l21 5" fill="none" stroke={C.cream} strokeWidth="3" strokeLinecap="round"/></g>,
  'november-20': <g><rect x="16" y="18" width="68" height="70" rx="9" fill={C.cream} stroke={C.sand} strokeWidth="3"/>
    <path d="M16 29q0-11 10-11h48q10 0 10 11v12H16Z" fill={C.coral}/>
    <path d="M36 10v15M64 10v15" stroke={C.plum} strokeWidth="6" strokeLinecap="round"/>
    <text x="50" y="67" fontFamily="Arial, sans-serif" fontWeight="800" fontSize="31" textAnchor="middle" fill={C.plum}>20</text>
    <text x="50" y="82" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="12" textAnchor="middle" fill={C.green}>11</text></g>,
};

export default function NovemberMotifArt({ kind }) {
  return <svg viewBox="0 0 100 100" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
    {ART[kind] || ART.heart}
  </svg>;
}
