import React, { useMemo, useState } from 'react';
import { B2Badge, B2Button, B2PageHeader, B2SearchBox, B2SectionHeader } from '../components/B2UI.jsx';
import { B2FilterChips } from '../components/B2Data.jsx';
import './B2Secondary.css';

const GAMES=[
  {id:1,slug:'knowledge-train',title:'Knowledge Train',meta:'Sắp xếp · điểm số · máy chiếu',tag:'Tương tác',tone:'violet',icon:'KT'},
  {id:2,slug:'crossword-trial',title:'Crossword Trial',meta:'Ô chữ · gợi ý · điểm số',tag:'Từ vựng',tone:'blue',icon:'OC'},
  {id:3,slug:'flying-words',title:'Flying Words',meta:'Sắp xếp câu · timer',tag:'Grammar',tone:'cyan',icon:'FW'},
  {id:4,slug:'top-five-arena',title:'Top 5 Classroom',meta:'Đội chơi · bảng điểm',tag:'Warm-up',tone:'green',icon:'T5'},
  {id:5,title:'Semantic Gradient',meta:'Kéo thả · thảo luận',tag:'Vocabulary',tone:'blue',icon:'SG'},
  {id:6,title:'Game Hub',meta:'Launcher nền tảng ngoài',tag:'Launcher',tone:'violet',icon:'GH'},
];

export default function B2Games({ navigate }){
  const [query,setQuery]=useState('');
  const [filter,setFilter]=useState('all');
  const visible=useMemo(()=>GAMES.filter((game)=>{
    const q=query.trim().toLowerCase();
    if(q&&!`${game.title} ${game.meta} ${game.tag}`.toLowerCase().includes(q)) return false;
    if(filter==='classroom') return game.tag!=='Launcher';
    if(filter==='vocab') return ['Từ vựng','Vocabulary'].includes(game.tag);
    if(filter==='launcher') return game.tag==='Launcher';
    return true;
  }),[query,filter]);
  return <>
    <B2PageHeader eyebrow="TEACH · GAMES" title="Trò chơi" description="Game Center V2 gom các hoạt động lớp học vào một gallery phẳng, dễ quét trên TV và iPad, không dùng hiệu ứng nặng làm chậm thao tác." actions={<B2Button variant="primary">+ Tạo hoạt động</B2Button>} aside={<B2Badge tone="green">4 game đã bridge</B2Badge>} />
    <div className="b2-game-toolbar"><B2SearchBox value={query} onChange={setQuery} placeholder="Tìm trò chơi…"/><B2FilterChips value={filter} onChange={setFilter} items={[{id:'all',label:'Tất cả',count:6},{id:'classroom',label:'Trong lớp',count:5},{id:'vocab',label:'Từ vựng',count:2},{id:'launcher',label:'Launcher',count:1}]}/></div>
    <B2SectionHeader eyebrow="ACTIVITIES" title="Mở nhanh" description={`${visible.length} hoạt động phù hợp · game đã bridge mở trực tiếp trong Tool Shell V2`} />
    <section className="b2-game-grid">
      {visible.map((game)=><button type="button" key={game.id} className={`b2-game-card tone-${game.tone}`} onClick={()=>game.slug&&navigate?.(`tool/${game.slug}`)} aria-disabled={!game.slug}>
        <span className="b2-game-card__icon">{game.icon}</span>
        <span className="b2-game-card__copy"><small>{game.tag}{game.slug?' · METRO BRIDGE':' · PREVIEW'}</small><strong>{game.title}</strong><em>{game.meta}</em></span>
        <span className="b2-game-card__arrow">{game.slug?'↗':'…'}</span>
      </button>)}
    </section>
    <section className="b2-game-feature"><div><span>PROJECTOR READY</span><h2>Classroom Stage</h2><p>Mở giao diện trình chiếu toàn màn hình với timer, scoreboard và công cụ lớp học trong cùng một workspace.</p><B2Button variant="primary" onClick={()=>navigate?.('tool/classroom-screen')}>Mở Classroom Stage</B2Button></div><strong>65″</strong></section>
  </>;
}
