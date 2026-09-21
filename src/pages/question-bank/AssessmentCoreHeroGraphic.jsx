import React from 'react';

const SCENES = {
  questions: { accent:'#1683ff', accent2:'#54c4ff', soft:'#eaf6ff', phrase:'Question intelligence', eyebrow:'Content graph' },
  bundles: { accent:'#7454f5', accent2:'#22c4a4', soft:'#f2efff', phrase:'Context-first learning', eyebrow:'Structured bundles' },
  manage: { accent:'#153f7b', accent2:'#ff9f2f', soft:'#eef4ff', phrase:'Operational clarity', eyebrow:'Control center' },
  blueprints: { accent:'#6848f5', accent2:'#2b8cff', soft:'#f3efff', phrase:'Assessment architecture', eyebrow:'Blueprint studio' },
  coverage: { accent:'#1583ff', accent2:'#22ba72', soft:'#eaf8ff', phrase:'Coverage intelligence', eyebrow:'Gap planner' },
  quality: { accent:'#18a76f', accent2:'#68d6b0', soft:'#eafaf4', phrase:'Quality by design', eyebrow:'Golden bank' },
  builder: { accent:'#6948f6', accent2:'#ffb52e', soft:'#f3efff', phrase:'Compose with confidence', eyebrow:'Test builder' },
  tests: { accent:'#135dc8', accent2:'#27a3ff', soft:'#edf5ff', phrase:'Assessment library', eyebrow:'Exam operations' },
  import: { accent:'#128cff', accent2:'#1fbd83', soft:'#eaf7ff', phrase:'From raw text to structure', eyebrow:'Zero-cost import' },
  chatgpt: { accent:'#16a36b', accent2:'#0a5060', soft:'#eaf9f2', phrase:'Connected assessment stack', eyebrow:'Developer connector' },
};

function Spark({ x, y, color, size=8, opacity=.8 }) {
  return (
    <g transform={`translate(${x} ${y})`} opacity={opacity}>
      <path d={`M0 -${size} L2.5 -2.5 L${size} 0 L2.5 2.5 L0 ${size} L-2.5 2.5 L-${size} 0 L-2.5 -2.5Z`} fill={color} />
    </g>
  );
}

function GlassPanel({ x, y, w, h, accent, children, radius=16, opacity=.97 }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx={radius} fill="#fff" opacity={opacity} stroke={accent} strokeOpacity=".18" />
      <rect x="1" y="1" width={w-2} height={Math.max(18,h*.22)} rx={radius-1} fill={accent} opacity=".035" />
      {children}
    </g>
  );
}

function MiniMetric({ x, y, color, label, value, w=90 }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height="48" rx="13" fill="#fff" stroke={color} strokeOpacity=".16" />
      <circle cx="16" cy="16" r="7" fill={color} opacity=".14" />
      <circle cx="16" cy="16" r="3" fill={color} />
      <text x="29" y="17" fontSize="7.5" fontWeight="800" fill="#6c7e96">{label}</text>
      <text x="12" y="37" fontSize="15" fontWeight="850" fill="#15315d">{value}</text>
    </g>
  );
}

function DocumentCard({ x, y, w=118, h=82, accent, title='QUESTION', lines=3, badge }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height={h} rx="14" fill="#fff" stroke={accent} strokeOpacity=".2" />
      <rect x="12" y="12" width="26" height="7" rx="3.5" fill={accent} opacity=".82" />
      <text x="44" y="18" fontSize="7.5" fontWeight="850" fill="#2c4569">{title}</text>
      {Array.from({length:lines}).map((_,i)=>(
        <rect key={i} x="12" y={32+i*13} width={w-(i===lines-1?42:25)} height="5" rx="2.5" fill="#c7d5e6" opacity={.9-i*.12} />
      ))}
      {badge ? <g transform={`translate(${w-34} ${h-27})`}><rect width="22" height="16" rx="6" fill={accent} opacity=".11" /><text x="11" y="11" textAnchor="middle" fontSize="7" fontWeight="850" fill={accent}>{badge}</text></g> : null}
    </g>
  );
}

function Donut({ x, y, color, percent=72, r=24 }) {
  const circumference=2*Math.PI*r;
  const dash=circumference*(percent/100);
  return (
    <g transform={`translate(${x} ${y})`}>
      <circle cx="0" cy="0" r={r} fill="none" stroke="#e7edf5" strokeWidth="8" />
      <circle cx="0" cy="0" r={r} fill="none" stroke={color} strokeWidth="8" strokeLinecap="round"
        strokeDasharray={`${dash} ${circumference-dash}`} transform="rotate(-90)" />
      <text x="0" y="4" textAnchor="middle" fontSize="11" fontWeight="850" fill="#17315d">{percent}%</text>
    </g>
  );
}

function BarChart({ x, y, accent, accent2, values=[36,58,78,92], width=120, height=84 }) {
  const barW=16;
  const gap=(width-values.length*barW)/(values.length-1);
  return (
    <g transform={`translate(${x} ${y})`}>
      <line x1="0" y1={height} x2={width} y2={height} stroke="#dfe7f1" strokeWidth="2" />
      {values.map((v,i)=>{
        const h=Math.max(12,(v/100)*height);
        const bx=i*(barW+gap);
        return <rect key={i} x={bx} y={height-h} width={barW} height={h} rx="6" fill={i===values.length-1?accent:accent2} opacity={.6+i*.1} />;
      })}
    </g>
  );
}

function Connector({ x1,y1,x2,y2,color, dashed=false }) {
  const mid=(x1+x2)/2;
  return <path d={`M${x1} ${y1} C${mid} ${y1},${mid} ${y2},${x2} ${y2}`} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeDasharray={dashed?'5 6':undefined} opacity=".5" />;
}

function Node({ x,y,label,color,w=76 }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect width={w} height="34" rx="11" fill="#fff" stroke={color} strokeOpacity=".22" />
      <circle cx="15" cy="17" r="7" fill={color} opacity=".15" />
      <circle cx="15" cy="17" r="3" fill={color} />
      <text x="29" y="21" fontSize="8.4" fontWeight="800" fill="#264464">{label}</text>
    </g>
  );
}

function QuestionsScene({ c }) {
  return (
    <>
      <DocumentCard x={76} y={54} w={132} h={96} accent={c.accent} title="QUESTION" badge="B1" />
      <DocumentCard x={110} y={80} w={132} h={96} accent={c.accent2} title="READING" badge="A" />
      <GlassPanel x={254} y={58} w={174} h={118} accent={c.accent}>
        <text x="16" y="25" fontSize="9" fontWeight="850" fill="#3a5578">QUESTION BANK</text>
        <rect x="16" y="38" width="116" height="7" rx="3.5" fill="#d9e5f2" />
        <rect x="16" y="53" width="94" height="7" rx="3.5" fill="#d9e5f2" />
        <rect x="16" y="71" width="74" height="20" rx="7" fill={c.accent} opacity=".1" />
        <text x="53" y="85" textAnchor="middle" fontSize="8" fontWeight="850" fill={c.accent}>1887 ITEMS</text>
        <Donut x={140} y={75} color={c.accent} percent={86} r={20} />
      </GlassPanel>
      <Node x={236} y={184} label="Grammar" color="#22b573" />
      <Node x={325} y={184} label="Reading" color={c.accent} />
      <Connector x1={208} y1={126} x2={260} y2={184} color={c.accent} dashed />
      <Connector x1={242} y1={128} x2={350} y2={184} color={c.accent2} dashed />
    </>
  );
}

function BundlesScene({ c }) {
  return (
    <>
      {[0,1,2].map(i=>(
        <g key={i} transform={`translate(${80+i*48} ${52+i*34})`}>
          <rect width="145" height="82" rx="15" fill="#fff" stroke={c.accent} strokeOpacity=".18" />
          <rect x="14" y="15" width="30" height="30" rx="10" fill={i===0?c.soft:i===1?'#eafaf4':'#fff5df'} />
          <rect x="54" y="18" width="70" height="7" rx="3.5" fill="#b9c8da" />
          <rect x="54" y="34" width="55" height="5" rx="2.5" fill="#d2dce8" />
          <rect x="14" y="58" width="42" height="12" rx="6" fill={c.accent} opacity=".09" />
          <rect x="63" y="58" width="52" height="12" rx="6" fill={c.accent2} opacity=".1" />
        </g>
      ))}
      <MiniMetric x={300} y={62} color={c.accent} label="BUNDLES" value="304" w={92} />
      <MiniMetric x={318} y={119} color={c.accent2} label="APPROVED" value="201" w={100} />
      <Spark x={430} y={78} color={c.accent2} size={8} />
    </>
  );
}

function ManageScene({ c }) {
  return (
    <>
      <GlassPanel x={72} y={48} w={190} h={142} accent={c.accent}>
        <text x="16" y="26" fontSize="9" fontWeight="850" fill="#355274">CONTROL CENTER</text>
        <MiniMetric x={15} y={42} color={c.accent} label="TOTAL" value="1887" w={74} />
        <MiniMetric x={98} y={42} color="#18a76f" label="READY" value="71%" w={74} />
        <BarChart x={20} y={103} accent={c.accent2} accent2={c.accent} values={[36,50,68,84]} width={140} height={28} />
      </GlassPanel>
      <GlassPanel x={285} y={68} w={148} h={104} accent={c.accent2}>
        <text x="16" y="24" fontSize="8.5" fontWeight="850" fill="#385475">QUEUE</text>
        {[['Duplicates','337'],['Unused','1469'],['Metadata','95']].map((row,i)=>(
          <g key={row[0]} transform={`translate(16 ${38+i*20})`}>
            <circle cx="5" cy="5" r="4" fill={i===0?'#ff7f69':i===1?'#7654ed':'#2b96ed'} opacity=".85" />
            <text x="16" y="8" fontSize="7.5" fontWeight="700" fill="#5c6f88">{row[0]}</text>
            <text x="110" y="8" textAnchor="end" fontSize="8" fontWeight="850" fill="#16315d">{row[1]}</text>
          </g>
        ))}
      </GlassPanel>
      <Connector x1={262} y1={112} x2={285} y2={112} color={c.accent2} />
    </>
  );
}

function BlueprintsScene({ c }) {
  return (
    <>
      <GlassPanel x={70} y={46} w={224} h={150} accent={c.accent}>
        <text x="16" y="25" fontSize="9" fontWeight="850" fill="#3f4f73">ASSESSMENT BLUEPRINT</text>
        {Array.from({length:4}).map((_,r)=>Array.from({length:5}).map((__,col)=>(
          <rect key={r+'-'+col} x={18+col*36} y={45+r*24} width="28" height="15" rx="4"
            fill={(r+col)%3===0?c.accent:'#edf0f7'} opacity={(r+col)%3===0?.82:1} />
        )))}
      </GlassPanel>
      <MiniMetric x={320} y={58} color={c.accent} label="TOTAL" value="40" />
      <Node x={326} y={118} label="Plan" color={c.accent} w={82} />
      <Node x={326} y={160} label="Assess" color="#22b573" w={82} />
      <Connector x1={294} y1={96} x2={326} y2={135} color={c.accent} />
    </>
  );
}

function CoverageScene({ c }) {
  return (
    <>
      <GlassPanel x={70} y={48} w={214} h={144} accent={c.accent}>
        <text x="16" y="24" fontSize="9" fontWeight="850" fill="#385474">COVERAGE MAP</text>
        <BarChart x={18} y={45} accent={c.accent} accent2={c.accent2} values={[42,58,72,88,100]} width={154} height={68} />
        <path d="M18 105 C46 88 72 94 98 68 S143 47 173 31" fill="none" stroke={c.accent2} strokeWidth="4" strokeLinecap="round" />
      </GlassPanel>
      <GlassPanel x={308} y={58} w={120} h={124} accent={c.accent2}>
        <text x="14" y="22" fontSize="8.5" fontWeight="850" fill="#34536f">TARGET</text>
        {[0,1,2].map(i=>(
          <g key={i} transform={`translate(14 ${37+i*25})`}>
            <rect width="14" height="14" rx="4" fill={c.accent2} />
            <path d="M3 7l3 3 5-6" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
            <rect x="24" y="4" width={54-i*8} height="6" rx="3" fill="#c9d8e7" />
          </g>
        ))}
      </GlassPanel>
    </>
  );
}

function QualityScene({ c }) {
  return (
    <>
      <g transform="translate(82 50)">
        <path d="M68 0 120 17v44c0 39-25 64-52 77C41 125 16 100 16 61V17L68 0Z" fill={c.accent} />
        <path d="M43 64l17 17 36-42" fill="none" stroke="#fff" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      <GlassPanel x={235} y={55} w={190} h={132} accent={c.accent}>
        <text x="16" y="25" fontSize="9" fontWeight="850" fill="#35506d">GOLDEN BANK</text>
        <MiniMetric x={15} y={40} color="#18a76f" label="READY" value="1332" w={76} />
        <MiniMetric x={99} y={40} color="#f1a51e" label="REVIEW" value="100" w={76} />
        <rect x="16" y="101" width="150" height="10" rx="5" fill="#e8eef4" />
        <rect x="16" y="101" width="112" height="10" rx="5" fill={c.accent} />
        <text x="16" y="124" fontSize="7.5" fontWeight="750" fill="#6b7d91">STRUCTURAL HEALTH 75%</text>
      </GlassPanel>
    </>
  );
}

function BuilderScene({ c }) {
  return (
    <>
      <Node x={74} y={54} label="Select" color={c.accent} w={84} />
      <Node x={74} y={101} label="Customize" color="#8c5cf2" w={104} />
      <Node x={74} y={148} label="Create" color={c.accent2} w={86} />
      <Connector x1={158} y1={71} x2={212} y2={118} color={c.accent} />
      <Connector x1={178} y1={118} x2={212} y2={118} color="#8c5cf2" />
      <Connector x1={160} y1={165} x2={212} y2={118} color={c.accent2} />
      <GlassPanel x={212} y={58} w={204} h={132} accent={c.accent}>
        <text x="16" y="24" fontSize="9" fontWeight="850" fill="#3a4f76">LIVE BLUEPRINT</text>
        {[0,1,2,3,4].map((i)=>(
          <g key={i} transform={`translate(${16+i*36} 48)`}>
            <rect width="28" height="64" rx="8" fill={i%2?c.soft:'#eef5ff'} stroke={c.accent} strokeOpacity=".12" />
            <text x="14" y="18" textAnchor="middle" fontSize="7" fontWeight="850" fill={c.accent}>P{i+1}</text>
            <rect x="7" y="29" width="14" height="4" rx="2" fill="#bdcbe0" />
            <rect x="7" y="39" width="11" height="4" rx="2" fill="#d0dae8" />
            <rect x="7" y="49" width="15" height="4" rx="2" fill="#d0dae8" />
          </g>
        ))}
      </GlassPanel>
    </>
  );
}

function TestsScene({ c }) {
  return (
    <>
      {[0,1,2].map((i)=>(
        <g key={i} transform={`translate(${76+i*48} ${67+i*25})`}>
          <rect width="124" height="92" rx="14" fill="#fff" stroke={c.accent} strokeOpacity=".18" />
          <rect x="14" y="14" width="34" height="16" rx="6" fill={c.accent} opacity=".12" />
          <text x="31" y="25" textAnchor="middle" fontSize="7.2" fontWeight="850" fill={c.accent}>EXAM</text>
          {[0,1,2].map(r=><rect key={r} x="14" y={42+r*12} width={73-r*9} height="5" rx="2.5" fill="#cbd8e7" />)}
        </g>
      ))}
      <GlassPanel x={300} y={56} w={128} h={120} accent={c.accent2}>
        <text x="14" y="22" fontSize="8.5" fontWeight="850" fill="#39516f">LIBRARY</text>
        <Donut x={40} y={68} color={c.accent} percent={94} r={21} />
        <text x="75" y="60" fontSize="8" fontWeight="750" fill="#718197">Published</text>
        <text x="75" y="79" fontSize="18" fontWeight="850" fill="#17315d">16</text>
      </GlassPanel>
    </>
  );
}

function ImportScene({ c }) {
  return (
    <>
      <GlassPanel x={70} y={62} w={120} h={108} accent={c.accent}>
        <text x="14" y="23" fontSize="8.5" fontWeight="850" fill="#38516e">RAW INPUT</text>
        {[0,1,2,3].map(i=><rect key={i} x="14" y={38+i*13} width={78-i*7} height="5" rx="2.5" fill="#c7d5e6" />)}
      </GlassPanel>
      <Node x={212} y={92} label="Parse" color={c.accent} w={82} />
      <Connector x1={190} y1={116} x2={212} y2={109} color={c.accent} />
      <Connector x1={294} y1={109} x2={320} y2={109} color={c.accent2} />
      <GlassPanel x={320} y={52} w={118} h={132} accent={c.accent2}>
        <text x="14" y="23" fontSize="8.5" fontWeight="850" fill="#36536d">STRUCTURE</text>
        {[0,1,2].map(i=>(
          <g key={i} transform={`translate(14 ${42+i*25})`}>
            <circle cx="7" cy="7" r="7" fill={c.accent2} />
            <path d="M3 7l3 3 5-6" fill="none" stroke="#fff" strokeWidth="2" />
            <rect x="22" y="4" width={58-i*8} height="6" rx="3" fill="#c8d6e5" />
          </g>
        ))}
      </GlassPanel>
      <Spark x={303} y={75} color={c.accent2} size={7} />
    </>
  );
}

function ApiScene({ c }) {
  return (
    <>
      <GlassPanel x={66} y={56} w={152} h={126} accent={c.accent2}>
        <rect x="14" y="14" width="124" height="88" rx="12" fill="#0d3340" />
        <path d="m50 44-18 15 18 15M102 44l18 15-18 15M82 34 66 82" fill="none" stroke="#36dda0" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
        <text x="14" y="117" fontSize="7.5" fontWeight="780" fill="#5d7488">OPENAPI CONNECTOR</text>
      </GlassPanel>
      <Node x={276} y={52} label="Brian" color={c.accent} w={86} />
      <Node x={334} y={105} label="ChatGPT" color="#16a36b" w={98} />
      <Node x={276} y={158} label="Plugin" color="#0a5060" w={86} />
      <Connector x1={218} y1={119} x2={276} y2={69} color={c.accent} />
      <Connector x1={218} y1={119} x2={334} y2={122} color="#16a36b" />
      <Connector x1={218} y1={119} x2={276} y2={175} color="#0a5060" />
    </>
  );
}

const SCENE_RENDERERS={
  questions:QuestionsScene,
  bundles:BundlesScene,
  manage:ManageScene,
  blueprints:BlueprintsScene,
  coverage:CoverageScene,
  quality:QualityScene,
  builder:BuilderScene,
  tests:TestsScene,
  import:ImportScene,
  chatgpt:ApiScene,
};

export default function AssessmentCoreHeroGraphic({ tab='questions' }) {
  const c=SCENES[tab] || SCENES.questions;
  const Scene=SCENE_RENDERERS[tab] || QuestionsScene;
  const gradientId=`qbHeroGlow-${tab}`;
  const floorId=`qbHeroFloor-${tab}`;

  return (
    <div className="qb-v7-hero-graphic" style={{'--qb-accent':c.accent,'--qb-accent-2':c.accent2}}>
      <svg viewBox="0 0 520 250" role="img" aria-label="">
        <defs>
          <linearGradient id={gradientId} x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={c.soft} stopOpacity=".16" />
            <stop offset="100%" stopColor={c.accent} stopOpacity=".11" />
          </linearGradient>
          <linearGradient id={floorId} x1="0" x2="1">
            <stop offset="0%" stopColor={c.accent} stopOpacity=".02" />
            <stop offset="50%" stopColor={c.accent2} stopOpacity=".10" />
            <stop offset="100%" stopColor={c.accent} stopOpacity=".02" />
          </linearGradient>
        </defs>
        <path d="M18 196C118 132 164 205 250 155s146-91 248-57v135H18Z" fill={`url(#${gradientId})`} />
        <ellipse cx="278" cy="216" rx="218" ry="21" fill={`url(#${floorId})`} />
        <circle cx="448" cy="46" r="52" fill={c.accent} opacity=".03" />
        <circle cx="462" cy="48" r="31" fill={c.accent2} opacity=".045" />
        <Scene c={c} />
        <Spark x={457} y={77} color={c.accent2} size={7} opacity=".72" />
        <Spark x={431} y={134} color={c.accent} size={5} opacity=".58" />
      </svg>
      <div className="qb-v7-hero-label" aria-hidden="true">
        <small>{c.eyebrow}</small>
        <strong>{c.phrase}</strong>
      </div>
    </div>
  );
}
