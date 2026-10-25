import React,{useEffect,useMemo,useState} from 'react';
import {ArrowLeft,RotateCcw,Eye,EyeOff,CheckCircle2,Timer,Shuffle} from 'lucide-react';
import {gradeLabActivity,LAB_IMAGE_TYPES} from './boardActivityLab.js';
import './BoardActivityLab.css';

const alpha=['A','B','C','D'];
const uniq=arr=>[...new Set(arr.filter(Boolean))];
const normalized=x=>String(x||'').trim().replace(/\s+/g,' ').toLocaleLowerCase();
const shuffle=arr=>[...arr].sort((a,b)=>String(a).localeCompare(String(b)));
const makeScores=()=>Array.from({length:4},(_,i)=>({name:'Team '+(i+1),score:0}));
const randomTile=tiles=>Array.from({length:16},(_,i)=>i).find(i=>!tiles.includes(i));
function ImagePlane({activity,children,onTap,className=''}) {
 const tap=event=>{
  if(!onTap)return;
  const r=event.currentTarget.getBoundingClientRect();
  if(r.width>0&&r.height>0)onTap({x:Math.round(100*(event.clientX-r.left)/r.width),
   y:Math.round(100*(event.clientY-r.top)/r.height)});
 };
 return <div className={'bbd-lab-plane '+className} onClick={tap}
  role={onTap?'button':'group'} tabIndex={onTap?0:undefined}
  onKeyDown={onTap?e=>{if(e.key==='Enter'||e.key===' ')onTap({x:50,y:50});}:undefined}
  aria-label="Interactive image canvas">
  {activity.image?<img src={activity.image} alt={activity.prompt||'Learning diagram'} draggable={false}/>:
   <div className="bbd-lab-fallback">{activity.prompt||'Interactive learning canvas'}</div>}
  {children}
 </div>;
}
function Teams({scores,setScores,team,setTeam,vi}){
 return <div className="bbd-lab-teams" role="group" aria-label={vi?'Bảng điểm đội':'Team scoreboard'}>
  {scores.map((x,i)=><button key={i} type="button" className={i===team?'selected':''}
   onClick={()=>setTeam(i)} aria-pressed={i===team}>{x.name}<strong>{x.score}</strong></button>)}
 </div>;
}
export default function BoardActivityLabStage({activity,vi=true,onClose,onPublicState}){
 const [index,setIndex]=useState(0),[answers,setAnswers]=useState({}),[feedback,setFeedback]=useState('');
 const [selected,setSelected]=useState(''),[selectedWords,setSelectedWords]=useState([]);
 const [evidenceRange,setEvidenceRange]=useState([]),[answerChoice,setAnswerChoice]=useState('');
 const [team,setTeam]=useState(0),[scores,setScores]=useState(makeScores);
 const [shown,setShown]=useState(false),[opened,setOpened]=useState([]),[revealAll,setRevealAll]=useState(false);
 const [guess,setGuess]=useState(''),[chosenLabel,setChosenLabel]=useState(''),[placed,setPlaced]=useState({});
 const [source,setSource]=useState(''),[relation,setRelation]=useState(''),[target,setTarget]=useState('');
 const items=activity.items||[],item=items[index],n=items.length;
 const response=items.map((_,i)=>answers[i]);
 const score=gradeLabActivity(activity,response),finished=Object.keys(answers).length===n;
 const isAnswerable=activity.type!=='flashcard_duel';
 const options=useMemo(()=>{
  if(activity.type==='cloze_snap')return shuffle(uniq([...items.map(x=>x.answer),...(activity.distractors||[])]));
  if(activity.type==='error_detective')return shuffle(uniq(items.map(x=>x.answer)));
  return [];
 },[activity]);
 useEffect(()=>{
  onPublicState?.({index,opened:[...opened],scores:scores.map(x=>({name:x.name,score:x.score})),
   finished,revealAll:false});
 },[index,opened,scores,finished,onPublicState]);
 const reset=()=>{
  setIndex(0);setAnswers({});setFeedback('');setSelected('');setSelectedWords([]);
  setEvidenceRange([]);setAnswerChoice('');setScores(makeScores());setTeam(0);
  setShown(false);setOpened([]);setRevealAll(false);setGuess('');setChosenLabel('');
  setPlaced({});setSource('');setRelation('');setTarget('');
 };
 const next=delta=>{
  setIndex(i=>Math.max(0,Math.min(n-1,i+delta)));setFeedback('');setSelected('');
  setSelectedWords([]);setEvidenceRange([]);setAnswerChoice('');setShown(false);
  setGuess('');setSource('');setRelation('');setTarget('');
 };
 const award=points=>setScores(curr=>curr.map((t,i)=>i===team?{...t,score:Math.max(0,t.score+points)}:t));
 const store=(value,correct)=>{
  if(Object.prototype.hasOwnProperty.call(answers,index))return;
  setAnswers(a=>({...a,[index]:value}));
  setFeedback(correct?(vi?'Chính xác! +10 điểm':'Correct! +10 points'):(vi?'Chưa đúng. Xem giải thích cùng giáo viên.':'Not correct. Review with your teacher.'));
  if(correct)award(10);
 };
 const tapPoint=point=>{
  if(answers[index]!==undefined)return;
  const correct=Math.hypot(point.x-item.x,point.y-item.y)<=8;
  store(point,correct);
 };
 const checkChoice=value=>{
  if(answers[index]!==undefined)return;
  store(value,normalized(value)===normalized(item.answer));
 };
 const markEvidence=()=>{
  if(answers[index]!==undefined||!answerChoice||!evidenceRange.length)return;
  const tokens=activity.passage.split(/\s+/).filter(Boolean);
  const [a,b]=evidenceRange.length===1?[evidenceRange[0],evidenceRange[0]]:[...evidenceRange].sort((x,y)=>x-y);
  const text=tokens.slice(a,b+1).join(' ');
  const correct=normalized(answerChoice)===normalized(item.answer)&&
   normalized(text)===normalized(item.evidence);
  store({answer:answerChoice,evidence:text},correct);
 };
 const judgeOral=right=>{
  if(answers[index]!==undefined)return;
  store(right,right);
 };
 const checkStress=number=>{if(answers[index]!==undefined)return;store(number,Number(number)===item.answer);};
 const assignTarget=(targetItem)=>{
  if(!chosenLabel||answers[targetItem]!==undefined)return;
  const label=items.find(i=>i.id===chosenLabel);
  if(!label)return;
  const targetItemData=items.find(i=>i.id===targetItem);
  const point={x:targetItemData.x,y:targetItemData.y};
  // Item placement is a scored attempt; labels must be matched to the fixed image positions.
  if(placed[chosenLabel])return;
  const correct=label.id===targetItem;
  setPlaced(p=>({...p,[chosenLabel]:targetItem}));
  setChosenLabel('');
  if(correct)setFeedback(vi?'Nhãn đúng vị trí!':'Correct label!');
  else setFeedback(vi?'Nhãn chưa đúng vị trí.':'Incorrect label position.');
  setAnswers(a=>({...a,[items.findIndex(i=>i.id===chosenLabel)]:correct?point:{x:-999,y:-999}}));
  if(correct)award(10);
 };
 const checkError=answer=>{
  const tokens=item.label.split(/\s+/).filter(Boolean);
  const candidate=selectedWords.sort((a,b)=>a-b).map(i=>tokens[i]).join(' ');
  const right=normalized(candidate)===normalized(item.wrong)&&normalized(answer)===normalized(item.answer);
  store({wrong:candidate,answer},right);
 };
 const checkConcept=()=>{
  if(!source||!relation||!target)return;
  store({source,relation,target},source===item.label&&relation===item.relation&&target===item.answer);
 };
 const handleMystery=()=>{
  if(!guess.trim()||answers[index]!==undefined)return;
  const correct=normalized(guess)===normalized(item.answer);
  store(guess,correct);
  if(correct)setOpened(current=>{
   const free=randomTile(current);
   return free===undefined?current:[...current,free];
  });
 };
 const total=score.total;
 const list=items.map(x=>x.label);
 const otherNodes=uniq(items.flatMap(x=>[x.label,x.answer])).sort();
 const relations=uniq(items.map(x=>x.relation)).sort();
 const evidenceTokens=activity.type==='evidence_hunter'?activity.passage.split(/\s+/).filter(Boolean):[];
 const erroneousTokens=activity.type==='error_detective'?item.label.split(/\s+/).filter(Boolean):[];
 const onDrag=event=>{const token=event.dataTransfer.getData('text/plain');if(token)setChosenLabel(token);};
 return <section className="bbd-activity-stage bbd-lab-stage" aria-label="Brian Board interactive activity">
  <header className="bbd-activity-stage__head">
   <div><small>BRIAN BOARD · INTERACTIVE LAB</small><h2>{activity.title}</h2>
    <p>{activity.prompt|| (vi?'Chạm và trả lời ngay trên bảng.':'Touch and respond directly on the board.')}</p></div>
   <button type="button" onClick={onClose}><ArrowLeft size={18}/>{vi?'Về bảng':'Back to board'}</button>
  </header>
  <Teams scores={scores} setScores={setScores} team={team} setTeam={setTeam} vi={vi}/>
  <div className="bbd-lab-progress">
   <strong>{vi?'Thử thách':'Challenge'} {index+1}/{n}</strong>
   <span>{vi?'Đã thực hiện':'Attempted'} {Object.keys(answers).length}/{total}</span>
   <strong>{score.correct}/{total} ✓</strong>
  </div>
  {(activity.type==='hotspot'||activity.type==='drag_label')&&<>
   <h3>{activity.type==='hotspot'?(vi?'Chạm vị trí tương ứng':'Tap the matching location'):
    (vi?'Kéo hoặc chạm nhãn rồi chọn điểm đến':'Drag or select a label, then tap a destination')}</h3>
   {activity.type==='hotspot'&&<p className="bbd-lab-callout">{item.label}</p>}
   {activity.type==='drag_label'&&<div className="bbd-lab-tray">
    {items.map((x,i)=><button key={x.id} type="button" draggable={!placed[x.id]}
     onDragStart={e=>e.dataTransfer.setData('text/plain',x.id)}
     className={'bbd-lab-tile'+(chosenLabel===x.id?' selected':'')}
     disabled={!!placed[x.id]}
     onClick={()=>setChosenLabel(x.id)}>{x.label}{placed[x.id]?' ✓':''}</button>)}
   </div>}
   <ImagePlane activity={activity} onTap={activity.type==='hotspot'?tapPoint:undefined}>
    {activity.type==='drag_label'&&items.map((x,i)=><button key={x.id}
     type="button" style={{left:x.x+'%',top:x.y+'%'}} className="bbd-lab-target"
     onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();const token=e.dataTransfer.getData('text/plain');if(token){setChosenLabel(token);const chosen=items.find(j=>j.id===token);if(!placed[token]){
      const right=chosen.id===x.id;const response={x:right?x.x:-999,y:right?x.y:-999};
      setPlaced(p=>({...p,[token]:x.id}));setAnswers(a=>({...a,[items.findIndex(j=>j.id===token)]:response}));
      if(right)award(10);setFeedback(right?'✓':vi?'Sai vị trí':'Wrong position');}}}}
     onClick={()=>assignTarget(x.id)}>
     {items.some(q=>placed[q.id]===x.id)?'✓':String(i+1)}</button>)}
    {activity.type==='hotspot'&&answers[index]!==undefined&&<div className="bbd-lab-pin"
     style={{left:item.x+'%',top:item.y+'%'}} title={item.label}>✓</div>}
   </ImagePlane>
  </>}
  {activity.type==='cloze_snap'&&<>
   <h3>{vi?'Chọn từ vào chỗ trống':'Choose the word for the blank'}</h3>
   <p className="bbd-lab-sentence">{item.label}</p>
   <div className="bbd-lab-tray">{options.map(x=><button key={x} type="button" draggable
    onDragStart={e=>e.dataTransfer.setData('text/plain',x)}
    onClick={()=>checkChoice(x)} disabled={answers[index]!==undefined}>{x}</button>)}</div>
   <div className="bbd-lab-drop" onDragOver={e=>e.preventDefault()} onDrop={e=>{
    e.preventDefault();checkChoice(e.dataTransfer.getData('text/plain'));}}>
    {answers[index]!==undefined?String(answers[index]):vi?'Kéo từ vào đây hoặc chạm một từ':'Drop a word here or tap a choice'}
   </div>
  </>}
  {activity.type==='error_detective'&&<>
   <h3>{vi?'Chọn từ/cụm từ sai rồi chọn cách sửa':'Select incorrect word(s), then choose the correction'}</h3>
   <div className="bbd-lab-sentence bbd-lab-words">{erroneousTokens.map((word,i)=><button
    key={i} className={selectedWords.includes(i)?'selected':''}
    onClick={()=>setSelectedWords(w=>w.includes(i)?w.filter(v=>v!==i):[...w,i])}>{word}</button>)}</div>
   <div className="bbd-lab-tray">{options.map(x=><button key={x}
    disabled={answers[index]!==undefined||!selectedWords.length}
    onClick={()=>checkError(x)}>{x}</button>)}</div>
  </>}
  {activity.type==='evidence_hunter'&&<>
   <h3>{item.label}</h3>
   <p>{vi?'Chạm từ đầu và từ cuối của bằng chứng, sau đó chọn đáp án.':'Tap the first and last words of the evidence, then choose an answer.'}</p>
   <div className="bbd-lab-evidence">{evidenceTokens.map((word,i)=>{
    const sorted=[...evidenceRange].sort((a,b)=>a-b);
    const highlighted=sorted.length>0&&i>=sorted[0]&&i<=(sorted[1]??sorted[0]);
    return <button key={i} className={highlighted?'selected':''} onClick={()=>
     setEvidenceRange(old=>old.length>=2?[i]:[...old,i])}>{word}</button>;
   })}</div>
   <div className="bbd-lab-options">{shuffle(item.options).map(x=><button key={x}
    className={answerChoice===x?'selected':''} onClick={()=>setAnswerChoice(x)}>{x}</button>)}</div>
   <button className="bbd-lab-primary" disabled={!answerChoice||!evidenceRange.length||answers[index]!==undefined}
    onClick={markEvidence}>{vi?'Nộp đáp án + bằng chứng':'Submit answer + evidence'}</button>
  </>}
  {activity.type==='four_corners'&&<>
   <h3>{item.label}</h3>
   <div className="bbd-lab-four">{item.options.map((x,i)=><button key={i}
    disabled={answers[index]!==undefined} onClick={()=>checkChoice(alpha[i])}
    className={'bbd-lab-corner corner-'+i}><strong>{alpha[i]}</strong><span>{x}</span></button>)}</div>
  </>}
  {activity.type==='flashcard_duel'&&<>
   <div className="bbd-lab-flashcard" role="group">
    <small>{vi?'Thẻ từ':'Vocabulary card'}</small><strong>{item.label}</strong>
    {shown&&<p>{item.answer}</p>}
    <button onClick={()=>setShown(x=>!x)}>{shown?<EyeOff size={16}/>:<Eye size={16}/>}
     {shown?(vi?'Ẩn đáp án trên màn hình giáo viên':'Hide teacher answer'):(vi?'Lật xem đáp án (giáo viên)':'Reveal answer to teacher')}</button>
   </div>
   <div className="bbd-lab-judge">
    <button disabled={answers[index]!==undefined} onClick={()=>judgeOral(true)}>{vi?'Đội trả lời đúng +10':'Mark team correct +10'}</button>
    <button disabled={answers[index]!==undefined} onClick={()=>judgeOral(false)}>{vi?'Đội trả lời sai':'Mark team incorrect'}</button>
   </div>
  </>}
  {activity.type==='mystery_reveal'&&<>
   <h3>{item.label}</h3>
   <div className="bbd-lab-mystery">
    <ImagePlane activity={activity} className="bbd-lab-hidden-photo">
     {!revealAll&&Array.from({length:16},(_,i)=><div key={i} className={'bbd-lab-cover'+(opened.includes(i)?' open':'')}
      style={{left:(i%4)*25+'%',top:Math.floor(i/4)*25+'%'}}>{opened.includes(i)?'':i+1}</div>)}
    </ImagePlane>
   </div>
   <div className="bbd-lab-guess"><input type="text" value={guess} maxLength={180} onChange={e=>setGuess(e.target.value)}
    placeholder={vi?'Nhập câu trả lời':'Type your answer'} onKeyDown={e=>{if(e.key==='Enter')handleMystery();}}/>
    <button disabled={!guess.trim()||answers[index]!==undefined} onClick={handleMystery}>{vi?'Kiểm tra + mở ô':'Check & reveal tile'}</button>
    <button type="button" onClick={()=>setRevealAll(v=>!v)}>{revealAll?(vi?'Che ảnh':'Cover image'):(vi?'Mở toàn bộ ảnh':'Reveal entire image')}</button></div>
   <p>{vi?'Ô đã mở':'Revealed tiles'}: {opened.length}/16</p>
  </>}
  {activity.type==='stress_tap'&&<>
   <h3>{vi?'Chạm âm tiết mang trọng âm chính':'Tap the primary stressed syllable'}</h3>
   <div className="bbd-lab-stress">{item.syllables.map((x,i)=><button key={i}
    disabled={answers[index]!==undefined} onClick={()=>checkStress(i+1)}>
    {x}<span>{i+1}</span></button>)}</div>
  </>}
  {activity.type==='concept_connection'&&<>
   <h3>{vi?'Nối nguồn → quan hệ → đích':'Connect source → relationship → target'}</h3>
   <div className="bbd-lab-concepts">
    <div><strong>{vi?'Khái niệm nguồn':'Source'}</strong>{otherNodes.map(x=><button
     key={x} className={source===x?'selected':''} onClick={()=>setSource(x)}>{x}</button>)}</div>
    <div><strong>{vi?'Quan hệ':'Relation'}</strong>{relations.map(x=><button
     key={x} className={relation===x?'selected':''} onClick={()=>setRelation(x)}>{x}</button>)}</div>
    <div><strong>{vi?'Khái niệm đích':'Target'}</strong>{otherNodes.map(x=><button
     key={x} className={target===x?'selected':''} onClick={()=>setTarget(x)}>{x}</button>)}</div>
   </div>
   <p className="bbd-lab-connection">{source||'?'} → {relation||'?'} → {target||'?'}</p>
   <button className="bbd-lab-primary" disabled={!source||!target||!relation||answers[index]!==undefined}
    onClick={checkConcept}>{vi?'Kiểm tra liên kết':'Check connection'}</button>
  </>}
  <div className="bbd-activity-stage__status">
   <span role="status" aria-live="polite">{feedback}</span>
   {finished&&<strong>{vi?'Kết quả cuối':'Final score'}: {score.correct}/{score.total}</strong>}
  </div>
  <footer className="bbd-lab-footer">
   <button type="button" onClick={reset}><RotateCcw size={17}/>{vi?'Làm lại':'Restart'}</button>
   <button type="button" disabled={index===0} onClick={()=>next(-1)}>← {vi?'Trước':'Previous'}</button>
   <button type="button" disabled={index===n-1} onClick={()=>next(1)}>{vi?'Tiếp':'Next'} →</button>
  </footer>
 </section>;
}
