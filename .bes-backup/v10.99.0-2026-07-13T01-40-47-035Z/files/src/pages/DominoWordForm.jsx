import React, { useMemo, useState } from 'react';
import SectionHeader from '../components/SectionHeader.jsx';
import AICopilotPanel from '../components/AICopilotPanel.jsx';
import { addHistoryEntry, downloadFile, slugify } from '../utils/library.js';

const SAMPLE = `resilience | resilient
meticulous | meticulously
plausibility | plausible
undermine | undermining
invaluable | valuable
unprecedented | precedent
transparency | transparent
sustainability | sustainable
accountability | accountable
comprehensive | comprehension`;

function shuffle(items) {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function parseTiles(text) {
  return String(text || '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line, index) => {
      const [left, right] = line.split('|').map((part) => part?.trim()).filter(Boolean);
      if (!left || !right) return null;
      return { id: `tile-${index + 1}`, left, right, owner: 'Student' };
    })
    .filter(Boolean);
}

function dominoHtml(title, tiles) {
  const safeTiles = JSON.stringify(tiles).replace(/</g, '\\u003c');
  return `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title><style>body{font-family:Inter,Arial,sans-serif;background:#0f172a;color:#f8fafc;margin:0}.wrap{max-width:1100px;margin:auto;padding:26px}.board{display:flex;gap:12px;flex-wrap:wrap}.tile{border:1px solid #334155;background:#1e293b;border-radius:0;padding:14px;min-width:170px}.tile b{display:block;color:#93c5fd}.hand{display:flex;gap:8px;flex-wrap:wrap;margin:16px 0}button{border:0;border-radius:0;padding:12px 14px;font-weight:800}.ok{background:#16a34a;color:white}.bad{background:#dc2626;color:white}</style></head><body><main class="wrap"><h1>${title}</h1><p>Click tiles to build a domino chain. A tile is correct when its left side matches the previous right side.</p><div id="hand" class="hand"></div><h2>Board</h2><div id="board" class="board"></div><p id="msg"></p></main><script>const tiles=${safeTiles};let hand=[...tiles].sort(()=>Math.random()-.5);let board=[];function render(){document.getElementById('hand').innerHTML=hand.map((t,i)=>'<button onclick="play('+i+')">'+t.left+' | '+t.right+'</button>').join('');document.getElementById('board').innerHTML=board.map(t=>'<div class="tile"><b>'+t.left+'</b><span>'+t.right+'</span></div>').join('')}function play(i){const t=hand[i];const ok=!board.length||board[board.length-1].right.toLowerCase()===t.left.toLowerCase();if(!ok){document.getElementById('msg').textContent='Not a valid connection. Need: '+board[board.length-1].right;return}board.push(t);hand.splice(i,1);document.getElementById('msg').textContent=hand.length?'Good move!':'Finished!';render()}render()</script></body></html>`;
}

export default function DominoWordForm({ tool, language, apiKey, aiModel, hasApiKey }) {
  const [title, setTitle] = useState('Word Form Domino');
  const [raw, setRaw] = useState(SAMPLE);
  const [hand, setHand] = useState(() => shuffle(parseTiles(SAMPLE)));
  const [board, setBoard] = useState([]);
  const [selected, setSelected] = useState('');
  const [toast, setToast] = useState('');
  const [showHints, setShowHints] = useState(false);
  const tiles = useMemo(() => parseTiles(raw), [raw]);
  const openNode = board.length ? board[board.length - 1].right : '';
  const finished = hand.length === 0 && board.length > 0;

  const showToast = (message) => {
    setToast(message);
    window.clearTimeout(showToast.timer);
    showToast.timer = window.setTimeout(() => setToast(''), 2200);
  };

  const newGame = () => {
    const parsed = parseTiles(raw);
    setHand(shuffle(parsed));
    setBoard([]);
    setSelected('');
    showToast(language === 'vi' ? 'Đã tạo ván mới.' : 'New game created.');
  };

  const placeTile = (tileId = selected) => {
    if (!tileId) return;
    const tile = hand.find((item) => item.id === tileId);
    if (!tile) return;
    const valid = !board.length || tile.left.toLowerCase() === openNode.toLowerCase();
    if (!valid) {
      showToast(language === 'vi' ? `Chưa nối đúng. Cần bắt đầu bằng: ${openNode}` : `Wrong connection. Need: ${openNode}`);
      return;
    }
    setBoard((current) => [...current, tile]);
    setHand((current) => current.filter((item) => item.id !== tile.id));
    setSelected('');
  };

  const undo = () => {
    if (!board.length) return;
    const last = board[board.length - 1];
    setBoard((current) => current.slice(0, -1));
    setHand((current) => [...current, last]);
  };

  const exportGame = () => downloadFile(`${slugify(title)}-domino.html`, dominoHtml(title, tiles), 'text/html;charset=utf-8');
  const saveGame = () => {
    const content = tiles.map((tile, index) => `${index + 1}. ${tile.left} → ${tile.right}`).join('\n');
    addHistoryEntry({
      kind: 'domino-game',
      toolSlug: 'domino-wordform',
      toolTitle: tool.title,
      sourceApp: 'domino-wordform',
      sourceAppTitle: tool.title,
      title,
      content,
      templateId: 'domino-wordform',
      tags: ['domino', 'word-form', 'interactive'],
      itemCount: tiles.length,
      activityData: {
        type: 'standalone-html',
        templateId: 'domino-wordform',
        sourceApp: 'domino-wordform',
        standaloneHtml: dominoHtml(title, tiles),
        tiles,
      },
    });
    showToast(language === 'vi' ? 'Đã lưu vào thư viện.' : 'Saved to library.');
  };

  return (
    <div className="page tool-page domino-page">
      <button className="back-btn" onClick={() => window.history.back()}>← {language === 'vi' ? 'Quay lại' : 'Back'}</button>
      <SectionHeader
        eyebrow="V1.0 · FormLink Domino"
        title={language === 'vi' ? 'Domino nối word form hoạt động thật' : 'Working Word Form Domino'}
        text={language === 'vi' ? 'Nhập cặp từ theo dạng A | B. Học sinh nối tile sao cho vế phải của tile trước khớp với vế trái của tile sau.' : 'Enter pairs as A | B. Students build a chain where the previous right side matches the next left side.'}
      />
      <section className="domino-layout">
        <AICopilotPanel
          language={language}
          apiKey={apiKey}
          aiModel={aiModel}
          hasApiKey={hasApiKey}
          title={language === 'vi' ? 'AI tạo Domino Word Form' : 'AI Domino Tile Builder'}
          description={language === 'vi' ? 'Sinh chuỗi tile word family / word form có thể chơi ngay.' : 'Generate word-family / word-form domino tiles that can be played immediately.'}
          task="Create a domino chain for English word forms."
          defaultInstruction="Create 20 domino tiles about academic word families. The right side of one tile should connect naturally to the left side of another tile."
          defaultCount={20}
          outputFormat="One line per tile exactly: left side | right side. Example: decide | decision. Do not add numbering or explanations."
          applyLabel={language === 'vi' ? 'Đưa vào Domino' : 'Apply to Domino'}
          onApply={(text) => { const parsed = parseTiles(text); setRaw(text); setHand(shuffle(parsed)); setBoard([]); setSelected(''); showToast(language === 'vi' ? 'AI đã tạo tile Domino.' : 'AI Domino tiles applied.'); }}
        />

        <article className="panel builder-panel">
          <h2>2. {language === 'vi' ? 'Dữ liệu game' : 'Game data'}</h2>
          <label>{language === 'vi' ? 'Tên game' : 'Game title'}</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
          <label>{language === 'vi' ? 'Mỗi dòng: vế trái | vế phải' : 'One line: left side | right side'}</label>
          <textarea rows={12} value={raw} onChange={(e) => setRaw(e.target.value)} />
          <label className="check-line"><input type="checkbox" checked={showHints} onChange={(e) => setShowHints(e.target.checked)} /> {language === 'vi' ? 'Hiện gợi ý open node cho giáo viên' : 'Show teacher open-node hint'}</label>
          <div className="preview-actions wrap-actions">
            <button className="primary" onClick={newGame}>{language === 'vi' ? 'Tạo ván mới' : 'New game'}</button>
            <button onClick={undo} disabled={!board.length}>{language === 'vi' ? 'Lùi 1 bước' : 'Undo'}</button>
            <button onClick={saveGame} disabled={!tiles.length}>{language === 'vi' ? 'Lưu thư viện' : 'Save'}</button>
            <button onClick={exportGame} disabled={!tiles.length}>HTML</button>
          </div>
          <div className="hint-box"><strong>{tiles.length}</strong> {language === 'vi' ? 'tile hợp lệ.' : 'valid tiles.'}</div>
        </article>

        <article className="panel domino-player">
          <div className="preview-head">
            <div><span className="eyebrow">3. Board</span><h2>{title}</h2></div>
            <strong>{board.length}/{tiles.length}</strong>
          </div>
          {showHints && <div className="hint-box">{language === 'vi' ? 'Open node cần nối:' : 'Open node to match:'} <strong>{openNode || (language === 'vi' ? 'bất kỳ tile nào' : 'any tile')}</strong></div>}
          <div className="domino-board">
            {board.length ? board.map((tile, index) => (
              <div className="domino-tile placed" key={tile.id}>
                <small>{index === 0 ? 'Starter' : tile.owner}</small>
                <strong>{tile.left}</strong>
                <span>{tile.right}</span>
              </div>
            )) : <div className="empty-state"><p>{language === 'vi' ? 'Chọn tile đầu tiên để bắt đầu.' : 'Choose the first tile to start.'}</p></div>}
          </div>
          <h3>{language === 'vi' ? 'Hand' : 'Hand'}</h3>
          <div className="domino-hand">
            {hand.map((tile) => {
              const valid = !board.length || tile.left.toLowerCase() === openNode.toLowerCase();
              return (
                <button key={tile.id} className={`domino-tile ${selected === tile.id ? 'selected' : ''} ${showHints && valid ? 'hint-ok' : ''}`} onClick={() => setSelected(tile.id)} onDoubleClick={() => placeTile(tile.id)}>
                  <strong>{tile.left}</strong>
                  <span>{tile.right}</span>
                </button>
              );
            })}
          </div>
          <div className="preview-actions wrap-actions">
            <button className="primary" onClick={() => placeTile()} disabled={!selected}>{language === 'vi' ? 'Đặt tile' : 'Place tile'}</button>
            <button onClick={() => setSelected('')}>{language === 'vi' ? 'Bỏ chọn' : 'Clear selection'}</button>
          </div>
          {finished && <div className="success-box">🎉 {language === 'vi' ? 'Hoàn thành chuỗi domino!' : 'Domino chain completed!'}</div>}
        </article>
      </section>
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
