import React, { useEffect, useMemo, useState } from 'react';
import AICopilotPanel from '../components/AICopilotPanel.jsx';
import { addHistoryEntry, buildPrintableHtml, downloadFile, loadBank, slugify } from '../utils/library.js';

const POWERUPS = [
  { id: 'double', label: 'Double Points', icon: '✨', vi: 'Nhân đôi điểm' },
  { id: 'triple', label: 'Triple Points', icon: '🚀', vi: 'Nhân ba điểm' },
  { id: 'half', label: 'Half Points', icon: '🌓', vi: 'Một nửa điểm' },
  { id: 'none', label: 'No Points', icon: '🫥', vi: 'Không điểm' },
  { id: 'bonus20', label: 'Bonus +20', icon: '🎁', vi: 'Cộng 20' },
  { id: 'minus10', label: 'Minus -10', icon: '⚠️', vi: 'Trừ 10' },
];

const SAMPLE_LINES = `Vocabulary | 100 | What does "resilient" mean? | able to recover quickly | extremely careful | harmful | transparent | A
Vocabulary | 200 | Which word means "very careful and precise"? | plausible | meticulous | profound | reluctant | B
Grammar | 100 | Choose the correct sentence. | I was watch TV. | I watched TV last night. | I am watched TV. | I watching TV. | B
Grammar | 200 | While I _____ dinner, the phone rang. | cooked | was cooking | have cooked | cook | B
Use of English | 100 | The project is highly _____. VALUE | valuable | valued | valuation | valuably | A
Use of English | 200 | The plan lacks _____. TRANSPARENT | transparent | transparently | transparency | transparentness | C
Speaking | 100 | Talk for 30 seconds about one challenge you overcame. | Good | Better | Best | Excellent | A
Speaking | 200 | Give two advantages of learning English with AI. | Good | Better | Best | Excellent | A`;

function parseCards(text) {
  const lines = String(text || '').split('\n').map((line) => line.trim()).filter(Boolean);
  const parsed = lines.map((line, index) => {
    const parts = line.split('|').map((part) => part.trim());
    if (parts.length >= 8) {
      return {
        id: `manual-${index}`,
        category: parts[0] || 'General',
        points: Number(parts[1]) || 100,
        question: parts[2] || '',
        options: parts.slice(3, 7),
        answer: String(parts[7] || '').toUpperCase().replace(/[^A-D]/g, '').slice(0, 1) || 'A',
        source: 'Manual',
      };
    }
    return null;
  }).filter((card) => card && card.question);
  return parsed;
}

function cardsFromBank() {
  return loadBank().slice(0, 36).map((item, index) => ({
    id: item.id || `bank-${index}`,
    category: item.topic || item.source || item.level || 'Question Bank',
    points: [100, 200, 300, 400, 500][index % 5],
    question: item.question,
    options: Array.isArray(item.options) ? item.options : [],
    answer: item.answer || 'A',
    source: item.source || 'Question Bank',
  }));
}

function assignPower(card, index, enabled) {
  if (!enabled) return { ...card, power: null };
  if (index % 3 !== 1) return { ...card, power: null };
  return { ...card, power: POWERUPS[index % POWERUPS.length] };
}

function applyPower(basePoints, power, correct) {
  const raw = correct ? basePoints : 0;
  if (!correct) return 0;
  if (!power) return raw;
  if (power.id === 'double') return raw * 2;
  if (power.id === 'triple') return raw * 3;
  if (power.id === 'half') return Math.round(raw / 2);
  if (power.id === 'none') return 0;
  if (power.id === 'bonus20') return raw + 20;
  if (power.id === 'minus10') return raw - 10;
  return raw;
}

function gameToStandaloneHtml(title, cards, teamNames) {
  const safeCards = JSON.stringify(cards).replace(/</g, '\\u003c');
  const safeTeams = JSON.stringify(teamNames).replace(/</g, '\\u003c');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>
body{font-family:Inter,Arial,sans-serif;background:#0f172a;color:#f8fafc;margin:0}.wrap{max-width:1180px;margin:auto;padding:26px}h1{font-size:38px}.score{display:flex;gap:12px;flex-wrap:wrap;margin:16px 0}.team{background:#1e293b;border:1px solid #334155;border-radius:0;padding:14px 20px}.team b{display:block;font-size:26px}.board{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}.card{border:0;border-radius:0;padding:22px;background:#0078d4;color:white;font-size:22px;font-weight:900;cursor:pointer}.card.done{opacity:.28}.modal{position:fixed;inset:0;background:rgba(2,6,23,.82);display:none;place-items:center;padding:20px}.box{max-width:760px;background:#fff;color:#0f172a;border-radius:0;padding:28px}.choices{display:grid;gap:10px}.choices div{padding:14px;border:1px solid #dbeafe;border-radius:0}.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}button{border:0;border-radius:0;padding:12px 18px;font-weight:800}.good{background:#22c55e}.bad{background:#ef4444;color:white}.close{background:#e2e8f0}.power{color:#b45309;background:#fef3c7;border-radius:0;padding:10px;margin:12px 0}</style></head><body><main class="wrap"><h1>${title}</h1><div id="score" class="score"></div><div id="board" class="board"></div></main><div class="modal" id="modal"><div class="box"><h2 id="q"></h2><p id="meta"></p><div id="power" class="power"></div><div id="choices" class="choices"></div><div class="actions"><select id="team"></select><button class="good" onclick="mark(true)">Correct</button><button class="bad" onclick="mark(false)">Wrong</button><button class="close" onclick="closeModal()">Close</button></div></div></div><script>
const cards=${safeCards}; const teams=${safeTeams}.map(name=>({name,score:0})); let active=null; const done=new Set();
function render(){document.getElementById('score').innerHTML=teams.map(t=>'<div class="team"><span>'+t.name+'</span><b>'+t.score+'</b></div>').join('');document.getElementById('team').innerHTML=teams.map((t,i)=>'<option value="'+i+'">'+t.name+'</option>').join('');document.getElementById('board').innerHTML=cards.map((c,i)=>'<button class="card '+(done.has(i)?'done':'')+'" onclick="openCard('+i+')">'+c.category+'<br>'+c.points+'</button>').join('')}
function openCard(i){if(done.has(i))return;active=i;const c=cards[i];document.getElementById('q').textContent=c.question;document.getElementById('meta').textContent=c.category+' · '+c.points+' points · Answer: '+(c.answer||'');document.getElementById('power').textContent=c.power?'Power-up: '+c.power.icon+' '+c.power.label:'';document.getElementById('choices').innerHTML=(c.options||[]).map((o,j)=>'<div><b>'+String.fromCharCode(65+j)+'.</b> '+o+'</div>').join('');document.getElementById('modal').style.display='grid'}
function points(c,ok){if(!ok)return 0;let p=c.points;if(c.power){if(c.power.id==='double')p*=2;if(c.power.id==='triple')p*=3;if(c.power.id==='half')p=Math.round(p/2);if(c.power.id==='none')p=0;if(c.power.id==='bonus20')p+=20;if(c.power.id==='minus10')p-=10}return p}
function mark(ok){if(active===null)return;const team=+document.getElementById('team').value;teams[team].score+=points(cards[active],ok);done.add(active);closeModal();render()}
function closeModal(){document.getElementById('modal').style.display='none';active=null}render();</script></body></html>`;
}

export default function ClassroomGame({ tool, language, apiKey, aiModel, hasApiKey }) {
  const [bank, setBank] = useState(() => loadBank());
  const [title, setTitle] = useState(language === 'vi' ? 'Brian English Power-up Quiz' : 'Brian English Power-up Quiz');
  const [manualText, setManualText] = useState(SAMPLE_LINES);
  const [source, setSource] = useState('manual');
  const [teamCount, setTeamCount] = useState(4);
  const [selectedTeam, setSelectedTeam] = useState(0);
  const [completed, setCompleted] = useState([]);
  const [scores, setScores] = useState([0, 0, 0, 0]);
  const [activeIndex, setActiveIndex] = useState(null);
  const [powerups, setPowerups] = useState(true);
  const [seconds, setSeconds] = useState(30);
  const [timeLeft, setTimeLeft] = useState(30);
  const [timerOn, setTimerOn] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    const refresh = () => setBank(loadBank());
    window.addEventListener('bet-library-updated', refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener('bet-library-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  const bankCards = useMemo(() => bank.slice(0, 36).map((item, index) => ({
    id: item.id || `bank-${index}`,
    category: item.topic || item.source || item.level || 'Question Bank',
    points: [100, 200, 300, 400, 500][index % 5],
    question: item.question,
    options: Array.isArray(item.options) ? item.options : [],
    answer: item.answer || 'A',
    source: item.source || 'Question Bank',
  })), [bank]);
  const cards = useMemo(() => {
    const base = source === 'bank' && bankCards.length ? bankCards : parseCards(manualText);
    return base.slice(0, 30).map((card, index) => assignPower(card, index, powerups));
  }, [source, bankCards, manualText, powerups]);

  const teams = useMemo(() => Array.from({ length: teamCount }, (_, i) => `Team ${i + 1}`), [teamCount]);
  const activeCard = activeIndex === null ? null : cards[activeIndex];

  useEffect(() => {
    setScores((current) => Array.from({ length: teamCount }, (_, i) => current[i] || 0));
    if (selectedTeam >= teamCount) setSelectedTeam(0);
  }, [teamCount, selectedTeam]);

  useEffect(() => {
    if (!timerOn || activeIndex === null) return undefined;
    if (timeLeft <= 0) return undefined;
    const timer = window.setInterval(() => setTimeLeft((value) => Math.max(0, value - 1)), 1000);
    return () => window.clearInterval(timer);
  }, [timerOn, activeIndex, timeLeft]);

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(''), 2200);
  };

  const openCard = (index) => {
    if (completed.includes(index)) return;
    setActiveIndex(index);
    setTimeLeft(seconds);
    setTimerOn(true);
  };

  const closeCard = () => {
    setActiveIndex(null);
    setTimerOn(false);
  };

  const mark = (correct) => {
    if (!activeCard) return;
    const gained = applyPower(activeCard.points, activeCard.power, correct);
    setScores((current) => current.map((score, index) => index === Number(selectedTeam) ? score + gained : score));
    setCompleted((current) => current.includes(activeIndex) ? current : [...current, activeIndex]);
    showToast(correct ? `${teams[selectedTeam]} +${gained}` : `${teams[selectedTeam]} +0`);
    closeCard();
  };

  const resetGame = () => {
    setCompleted([]);
    setScores(Array.from({ length: teamCount }, () => 0));
    closeCard();
  };

  const exportGame = () => {
    downloadFile(`${slugify(title)}-game.html`, gameToStandaloneHtml(title, cards, teams), 'text/html;charset=utf-8');
  };

  const saveGame = () => {
    const content = cards.map((c, i) => `${i + 1}. [${c.category} · ${c.points}] ${c.question}\nA. ${(c.options || [])[0] || ''}\nB. ${(c.options || [])[1] || ''}\nC. ${(c.options || [])[2] || ''}\nD. ${(c.options || [])[3] || ''}\nAnswer: ${c.answer || ''}${c.power ? `\nPower-up: ${c.power.label}` : ''}`).join('\n\n');
    addHistoryEntry({
      kind: 'classroom-game',
      toolSlug: tool.slug,
      toolTitle: tool.title,
      sourceApp: 'classroom-game-builder',
      sourceAppTitle: tool.title,
      title,
      content,
      templateId: 'classroom-team-game',
      tags: ['game', 'power-up', 'interactive'],
      itemCount: cards.length,
      activityData: {
        type: 'standalone-html',
        templateId: 'classroom-team-game',
        sourceApp: 'classroom-game-builder',
        standaloneHtml: gameToStandaloneHtml(title, cards, teams),
        cards,
        teams,
        settings: { teamCount, seconds, powerups },
      },
    });
    showToast(language === 'vi' ? 'Đã lưu game vào thư viện.' : 'Game saved to library.');
  };

  return (
    <div className="page tool-page classroom-game-page">
      <button className="back-btn" onClick={() => window.history.back()}>← {language === 'vi' ? 'Quay lại' : 'Back'}</button>
      <section className="tool-hero panel ai-hero">
        <div>
          <span className="eyebrow">V1.0 · Classroom Game Builder</span>
          <h1><span>{tool.icon}</span> {language === 'vi' ? tool.titleVi || tool.title : tool.title}</h1>
          <p>{language === 'vi' ? 'Tạo trò chơi theo đội từ ngân hàng câu hỏi hoặc dữ liệu nhập tay, có điểm, timer và power-up bất ngờ.' : 'Create team games from your question bank or manual input, with points, timer and hidden power-ups.'}</p>
        </div>
        <div className="tool-state"><span>🎮 Live class</span><span>{cards.length} cards</span><span>{teams.length} teams</span></div>
      </section>

      <section className="game-layout">
        <AICopilotPanel
          language={language}
          apiKey={apiKey}
          aiModel={aiModel}
          hasApiKey={hasApiKey}
          title={language === 'vi' ? 'AI tạo game tương tác' : 'AI Interactive Game Builder'}
          description={language === 'vi' ? 'Sinh nhanh bộ câu hỏi cho PowerBoard và hoạt động game lớp học.' : 'Generate ready-to-play cards for PowerBoard and live classroom games.'}
          task="Create classroom game cards for an English lesson."
          defaultInstruction="Create 30 B2-C1 classroom game questions about grammar, vocabulary and speaking. Mix categories and point values."
          defaultCount={30}
          outputFormat="One line per card exactly: Category | Points | Question | Option A | Option B | Option C | Option D | Correct letter. Use points 100, 200, 300, 400, 500."
          applyLabel={language === 'vi' ? 'Đưa vào game' : 'Apply to game'}
          onApply={(text) => { setManualText(text); setSource('manual'); setCompleted([]); setScores(Array.from({ length: teamCount }, () => 0)); showToast(language === 'vi' ? 'AI đã đưa nội dung vào game.' : 'AI content applied to game.'); }}
        />

        <article className="panel builder-panel game-settings">
          <h2>2. {language === 'vi' ? 'Thiết lập game' : 'Game setup'}</h2>
          <label>{language === 'vi' ? 'Tên game' : 'Game title'}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="two-fields">
            <div>
              <label>{language === 'vi' ? 'Nguồn câu hỏi' : 'Question source'}</label>
              <select value={source} onChange={(e) => setSource(e.target.value)}>
                <option value="manual">{language === 'vi' ? 'Nhập tay' : 'Manual input'}</option>
                <option value="bank" disabled={!bankCards.length}>{language === 'vi' ? `Ngân hàng câu hỏi (${bankCards.length})` : `Question bank (${bankCards.length})`}</option>
              </select>
            </div>
            <div>
              <label>{language === 'vi' ? 'Số đội' : 'Teams'}</label>
              <select value={teamCount} onChange={(e) => setTeamCount(Number(e.target.value))}>
                {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
              </select>
            </div>
          </div>
          <div className="two-fields">
            <div>
              <label>Timer</label>
              <select value={seconds} onChange={(e) => setSeconds(Number(e.target.value))}>
                {[15, 20, 30, 45, 60].map((n) => <option key={n} value={n}>{n}s</option>)}
              </select>
            </div>
            <label className="check-line power-check"><input type="checkbox" checked={powerups} onChange={(e) => setPowerups(e.target.checked)} /> {language === 'vi' ? 'Bật power-up bất ngờ' : 'Enable hidden power-ups'}</label>
          </div>
          {source === 'manual' && (
            <>
              <label>{language === 'vi' ? 'Mỗi dòng: Category | Points | Question | A | B | C | D | Answer' : 'One line: Category | Points | Question | A | B | C | D | Answer'}</label>
              <textarea rows={10} value={manualText} onChange={(e) => setManualText(e.target.value)} />
            </>
          )}
          <div className="preview-actions wrap-actions">
            <button className="primary" onClick={resetGame}>{language === 'vi' ? 'Reset game' : 'Reset game'}</button>
            <button onClick={exportGame} disabled={!cards.length}>HTML</button>
            <button onClick={saveGame} disabled={!cards.length}>{language === 'vi' ? 'Lưu thư viện' : 'Save'}</button>
          </div>
        </article>

        <article className="panel live-game-panel">
          <div className="game-headline">
            <div><span className="eyebrow">3. Live Game</span><h2>{title}</h2></div>
            <div className="team-picker"><label>{language === 'vi' ? 'Đội trả lời' : 'Answering team'}</label><select value={selectedTeam} onChange={(e) => setSelectedTeam(Number(e.target.value))}>{teams.map((team, i) => <option key={team} value={i}>{team}</option>)}</select></div>
          </div>
          <div className="score-row">
            {teams.map((team, i) => <div className={i === selectedTeam ? 'score-card active' : 'score-card'} key={team} onClick={() => setSelectedTeam(i)}><span>{team}</span><strong>{scores[i] || 0}</strong></div>)}
          </div>
          <div className="game-board">
            {cards.map((card, index) => (
              <button key={`${card.id}-${index}`} className={completed.includes(index) ? 'game-card done' : 'game-card'} onClick={() => openCard(index)}>
                <small>{card.category}</small>
                <strong>{card.points}</strong>
                {powerups && card.power && <span className="hidden-power">?</span>}
              </button>
            ))}
          </div>
          {!cards.length && <div className="empty-state"><p>{language === 'vi' ? 'Chưa có câu hỏi để tạo game.' : 'No cards yet.'}</p></div>}
        </article>
      </section>

      {activeCard && (
        <div className="game-modal">
          <article className="game-question-card panel">
            <div className="game-question-top"><span>{activeCard.category} · {activeCard.points} pts</span><strong className={timeLeft <= 5 ? 'danger-time' : ''}>⏱ {timeLeft}s</strong></div>
            {activeCard.power && <div className="power-reveal">{activeCard.power.icon} {language === 'vi' ? activeCard.power.vi : activeCard.power.label}</div>}
            <h2>{activeCard.question}</h2>
            <ol type="A" className="game-options">{(activeCard.options || []).map((option) => <li key={option}>{option}</li>)}</ol>
            <p className="answer-line"><b>{language === 'vi' ? 'Đáp án:' : 'Answer:'}</b> {activeCard.answer}</p>
            <div className="preview-actions wrap-actions modal-actions">
              <button className="primary" onClick={() => mark(true)}>{language === 'vi' ? 'Đúng' : 'Correct'}</button>
              <button className="danger-btn" onClick={() => mark(false)}>{language === 'vi' ? 'Sai' : 'Wrong'}</button>
              <button onClick={closeCard}>{language === 'vi' ? 'Đóng' : 'Close'}</button>
            </div>
          </article>
        </div>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
