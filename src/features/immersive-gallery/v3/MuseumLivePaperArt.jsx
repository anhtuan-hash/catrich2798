import React from 'react';

// Reusable original vector paper-cut scenery, not an external image or a screenshot.
// Decorative only: no text, no focusable controls and no student data.
export default function MuseumLivePaperArt({variant='climate'}){
 const tint=variant==='studio'?'#e9b773':variant==='gallery'?'#8edbd1':'#bedac5';
 return <svg className="bml-paper-illustration" viewBox="0 0 460 260" aria-hidden="true" focusable="false" preserveAspectRatio="xMidYMid meet">
  <defs>
   <filter id="bml-paper-shadow" x="-25%" y="-25%" width="150%" height="160%">
    <feDropShadow dx="1.5" dy="5" stdDeviation="3.5" floodColor="#071c38" floodOpacity=".32"/>
   </filter>
   <pattern id="bml-paper-grain" width="13" height="13" patternUnits="userSpaceOnUse">
    <circle cx="2" cy="3" r=".65" fill="#fff" opacity=".45"/>
    <circle cx="8" cy="10" r=".55" fill="#153a3b" opacity=".16"/>
   </pattern>
  </defs>
  <g filter="url(#bml-paper-shadow)" stroke="#fff8e4" strokeWidth="5" strokeLinejoin="round">
   <path d="M22 227L57 207 78 215 103 192 140 193 160 163 204 172 236 151 261 158 299 132 345 155 382 163 411 183 454 211V252H20Z" fill="#84b97b"/>
   <path d="M15 242L59 220 90 223 133 198 167 211 207 186 249 197 284 175 318 197 356 185 401 212 455 226V260H12Z" fill="#aed394"/>
   <path d="M2 248L45 236 83 245 126 225 169 239 208 229 251 245 303 232 343 243 392 236 459 250V261H2Z" fill="#d4e6b9"/>
  </g>
  <g filter="url(#bml-paper-shadow)">
   <circle cx="293" cy="107" r="92" fill="#eff5da" stroke="#fff9ee" strokeWidth="8"/>
   <circle cx="293" cy="107" r="84" fill="#87b9b8"/>
   <path d="M231 59l34-19 25 14 17-3 18 21-19 14-3 25-22-2-15 19-18-9-3-23-18-13z" fill="#83b66a" stroke="#648c52" strokeWidth="2"/>
   <path d="M313 138l33-11 26 14-6 31-19 13-15-21-26-7z" fill="#88ba75" stroke="#688e58" strokeWidth="2"/>
   <path d="M259 163l-25-18-10-20 16-12 20 9 16 25z" fill="#a6cb83" stroke="#688e58" strokeWidth="2"/>
   <path d="M211 96q82-51 161-5M213 126q83 51 162 3" stroke="#dcebd1" strokeWidth="2.5" fill="none" opacity=".75"/>
   <ellipse cx="293" cy="107" rx="38" ry="83" stroke="#dcebd1" strokeWidth="2" fill="none" opacity=".65"/>
   <circle cx="293" cy="107" r="84" fill="url(#bml-paper-grain)" opacity=".5"/>
  </g>
  <g filter="url(#bml-paper-shadow)" stroke="#fff8eb" strokeWidth="4">
   <path d="M77 69q-12-17 9-27 13-22 34-6 23-4 28 15 19 2 11 18z" fill="#fffdf4"/>
   <path d="M353 67q-7-12 10-20 8-19 26-10 20-4 25 13 16 2 13 17z" fill="#fffdf4"/>
  </g>
  <g filter="url(#bml-paper-shadow)" stroke="#f5f4e4" strokeWidth="4" strokeLinejoin="round">
   <path d="M316 214v-47h55v47" fill="#f5c27b"/>
   <path d="M305 169l41-37 42 37" fill="#da8657"/>
   <path d="M330 186h14v27h-14zM350 186h12v13h-12z" fill="#d0edf0"/>
   <path d="M203 224v-67h5v67" fill="#f5f4e4"/>
   <path d="M206 162l-41-15 41-6 40 21-40 8z" fill="#f5f4e4"/>
   <path d="M207 161l14-43 5 44-20 40z" fill="#f5f4e4"/>
   <path d="M207 160l-35 35 42-22z" fill="#f5f4e4"/>
  </g>
  <g filter="url(#bml-paper-shadow)">
   <path d="M134 236l-1-69" stroke="#efe9c6" strokeWidth="7"/>
   <circle cx="133" cy="167" r="32" fill={tint} stroke="#faf9e8" strokeWidth="5"/>
   <circle cx="105" cy="189" r="26" fill="#6aa170" stroke="#faf9e8" strokeWidth="4"/>
   <circle cx="160" cy="197" r="27" fill="#4e9263" stroke="#faf9e8" strokeWidth="4"/>
   <path d="M421 238l-5-45" stroke="#f6ecd7" strokeWidth="6"/>
   <ellipse cx="404" cy="201" rx="24" ry="14" transform="rotate(-35 404 201)" fill="#5eaf79" stroke="#f6ecd7" strokeWidth="3"/>
   <ellipse cx="435" cy="189" rx="24" ry="13" transform="rotate(30 435 189)" fill="#80bf84" stroke="#f6ecd7" strokeWidth="3"/>
  </g>
 </svg>;
}
