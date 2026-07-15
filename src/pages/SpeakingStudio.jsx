import React, { useEffect, useMemo, useRef, useState } from 'react';
import { callAI, extractJson } from '../utils/gemini.js';
import { addHistoryEntry, downloadFile, exportAsWord, slugify } from '../utils/library.js';
import { createMediaRecorder, createSpeechRecognition, describeMediaError, extensionForMimeType, getMicrophoneSupport, requestMicrophoneStream, speechRecognitionMessage, stopStream } from '../utils/mediaCapture.js';

const SAMPLE_CARDS = [
  {
    id: 'card-1',
    title: 'Technology and learning',
    prompt: 'Describe one technology tool that has changed the way you learn English.',
    followUps: ['How often do you use it?', 'What are its advantages and disadvantages?', 'Would you recommend it to your classmates? Why?'],
    languageFunctions: ['describing experience', 'giving reasons', 'evaluating advantages'],
    vocabulary: ['interactive', 'personalized', 'convenient', 'distracting'],
    successCriteria: ['Answer the main question clearly.', 'Give at least two details or examples.', 'Use linking words such as because, however, and as a result.'],
  },
  {
    id: 'card-2',
    title: 'Future careers',
    prompt: 'Talk about a career you may want to pursue in the future.',
    followUps: ['What skills will you need?', 'How can school prepare you for this career?', 'What challenges might you face?'],
    languageFunctions: ['expressing future plans', 'explaining requirements', 'predicting challenges'],
    vocabulary: ['qualification', 'responsibility', 'opportunity', 'challenge'],
    successCriteria: ['State your career choice.', 'Explain why it suits you.', 'Mention skills and challenges.'],
  },
];

const RUBRIC = [
  { id: 'task', label: 'Task Response', vi: 'Đáp ứng yêu cầu', max: 20 },
  { id: 'fluency', label: 'Fluency & Coherence', vi: 'Độ trôi chảy', max: 20 },
  { id: 'vocab', label: 'Lexical Resource', vi: 'Từ vựng', max: 20 },
  { id: 'grammar', label: 'Grammar Range & Accuracy', vi: 'Ngữ pháp', max: 20 },
  { id: 'pronunciation', label: 'Pronunciation / Clarity', vi: 'Phát âm / độ rõ', max: 20 },
];

function safeJoin(list) {
  return Array.isArray(list) ? list.filter(Boolean).join(', ') : String(list || '');
}

function normalizeCards(cards) {
  if (!Array.isArray(cards) || !cards.length) return SAMPLE_CARDS;
  return cards.map((card, index) => ({
    id: card.id || `card-${index + 1}`,
    title: card.title || `Speaking Card ${index + 1}`,
    prompt: card.prompt || card.question || card.task || '',
    followUps: Array.isArray(card.followUps) ? card.followUps : Array.isArray(card.follow_up_questions) ? card.follow_up_questions : [],
    languageFunctions: Array.isArray(card.languageFunctions) ? card.languageFunctions : Array.isArray(card.functions) ? card.functions : [],
    vocabulary: Array.isArray(card.vocabulary) ? card.vocabulary : [],
    successCriteria: Array.isArray(card.successCriteria) ? card.successCriteria : Array.isArray(card.criteria) ? card.criteria : [],
  })).filter((card) => card.prompt.trim());
}

function parseCardsFromText(text) {
  const raw = String(text || '').trim();
  if (!raw) return SAMPLE_CARDS;
  try {
    const json = extractJson(raw);
    if (Array.isArray(json)) return normalizeCards(json);
    if (json.cards) return normalizeCards(json.cards);
  } catch {
    // fallback below
  }
  const blocks = raw.split(/\n-{3,}\n|\n(?=###?\s*Speaking Card|\n?\d+[.)]\s+)/i).map((x) => x.trim()).filter(Boolean);
  const cards = blocks.map((block, index) => {
    const lines = block.split('\n').map((line) => line.trim()).filter(Boolean);
    const promptLine = lines.find((line) => /prompt|task|question/i.test(line)) || lines[0] || '';
    const prompt = promptLine.replace(/^#+\s*/, '').replace(/^\d+[.)]\s*/, '').replace(/\*\*/g, '').replace(/^(prompt|task|question)\s*:?\s*/i, '').trim();
    const followUps = lines.filter((line) => /^[-*]\s+|^\d+[.)]\s+/.test(line)).map((line) => line.replace(/^[-*]\s+|^\d+[.)]\s+/, '').trim()).filter((line) => line !== prompt);
    return {
      id: `card-${index + 1}`,
      title: `Card ${index + 1}`,
      prompt,
      followUps: followUps.slice(0, 4),
      languageFunctions: [],
      vocabulary: [],
      successCriteria: [],
    };
  });
  return normalizeCards(cards);
}

function buildCardsMarkdown(cards, title = 'Speaking Activity Set') {
  return `# ${title}\n\n${cards.map((card, index) => `## Card ${index + 1}. ${card.title}\n\n**Prompt:** ${card.prompt}\n\n**Follow-up questions:**\n${(card.followUps || []).map((q) => `- ${q}`).join('\n') || '- (none)'}\n\n**Useful language:** ${safeJoin(card.languageFunctions) || '(teacher can add)'}\n\n**Vocabulary:** ${safeJoin(card.vocabulary) || '(teacher can add)'}\n\n**Success criteria:**\n${(card.successCriteria || []).map((c) => `- ${c}`).join('\n') || '- Answer clearly with reasons and examples.'}`).join('\n\n---\n\n')}`;
}

function buildOfflineSpeakingHtml(cards, title) {
  const data = JSON.stringify({ title, cards }).replace(/</g, '\\u003c');
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${title || 'Speaking Practice'}</title>
<style>@font-face{font-family:BrianGesco;src:url('/fonts/personal-font.ttf?v=6.8') format('truetype');font-weight:100 900;font-style:normal;font-display:swap;}
body{margin:0;font-family:BrianGesco,Inter,system-ui,sans-serif;background:#eef6ff;color:#102344}.wrap{max-width:1100px;margin:0 auto;padding:24px}.top{display:flex;justify-content:space-between;gap:12px;align-items:center}.card{background:#fff;border-radius:0;padding:28px;box-shadow:none;border:1px solid #dbe8ff}.prompt{font-size:clamp(1.8rem,4vw,3.4rem);font-weight:900;line-height:1.12}.chips{display:flex;gap:10px;flex-wrap:wrap;margin:18px 0}.chip{background:#eeeaff;color:#5b3df5;border-radius:0;padding:10px 14px;font-weight:800}.actions{display:flex;gap:10px;flex-wrap:wrap;margin:16px 0}button{border:0;border-radius:0;padding:12px 18px;font-weight:900;cursor:pointer;background:#5b3df5;color:white}.secondary{background:#fff;color:#102344;border:1px solid #dbe8ff}.panel{margin-top:18px;background:#f7f9ff;border:1px solid #dbe8ff;border-radius:0;padding:18px}.rec{background:#ffedf2;color:#e11d48}.timer{font-size:3rem;font-weight:900;color:#5b3df5}.meter{height:10px;background:#dbe8ff;border-radius:0;overflow:hidden}.meter i{display:block;height:100%;width:0;background:#5b3df5;border-radius:0}.follow li{margin:8px 0;font-size:1.1rem}.note{color:#60708d}</style>
</head>
<body>
<div class="wrap">
  <div class="top"><h1 id="title"></h1><div><button class="secondary" id="prev">← Prev</button> <button class="secondary" id="next">Next →</button></div></div>
  <div class="card">
    <div class="chips"><span class="chip" id="index"></span><span class="chip" id="cardTitle"></span></div>
    <div class="prompt" id="prompt"></div>
    <ul class="follow" id="follow"></ul>
    <div class="panel"><strong>Useful language:</strong> <span id="funcs"></span><br><strong>Vocabulary:</strong> <span id="vocab"></span></div>
    <div class="actions"><button id="start">Start recording</button><button id="stop" class="rec">Stop</button><button id="download" class="secondary">Download audio</button></div>
    <div class="timer" id="timer">00:00</div><div class="meter"><i id="bar"></i></div>
    <div class="panel"><strong>Transcript / notes</strong><textarea id="transcript" style="width:100%;min-height:110px;margin-top:10px;border-radius:0;border:1px solid #dbe8ff;padding:12px"></textarea><p class="note">Offline file can record audio. AI scoring needs the main Studio with API configured.</p></div>
  </div>
</div>
<script>
const DATA=${data};let idx=0,mediaRecorder,chunks=[],audioUrl='',seconds=0,timer;
const $=id=>document.getElementById(id);$('title').textContent=DATA.title||'Speaking Practice';
function render(){const c=DATA.cards[idx];$('index').textContent=(idx+1)+' / '+DATA.cards.length;$('cardTitle').textContent=c.title||'Card';$('prompt').textContent=c.prompt;$('follow').innerHTML=(c.followUps||[]).map(x=>'<li>'+x+'</li>').join('');$('funcs').textContent=(c.languageFunctions||[]).join(', ')||'—';$('vocab').textContent=(c.vocabulary||[]).join(', ')||'—';}
function tick(){seconds++;$('timer').textContent=String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0');$('bar').style.width=Math.min(100,seconds/120*100)+'%'}
$('prev').onclick=()=>{idx=(idx-1+DATA.cards.length)%DATA.cards.length;render()};$('next').onclick=()=>{idx=(idx+1)%DATA.cards.length;render()};
$('start').onclick=async()=>{chunks=[];seconds=0;clearInterval(timer);timer=setInterval(tick,1000);const stream=await navigator.mediaDevices.getUserMedia({audio:true});mediaRecorder=new MediaRecorder(stream);mediaRecorder.ondataavailable=e=>chunks.push(e.data);mediaRecorder.onstop=()=>{clearInterval(timer);audioUrl=URL.createObjectURL(new Blob(chunks,{type:'audio/webm'}));stream.getTracks().forEach(t=>t.stop())};mediaRecorder.start()};
$('stop').onclick=()=>mediaRecorder&&mediaRecorder.state!=='inactive'&&mediaRecorder.stop();$('download').onclick=()=>{if(!audioUrl)return alert('Record first');const a=document.createElement('a');a.href=audioUrl;a.download='speaking-recording.webm';a.click()};render();
</script>
</body></html>`;
}

function ScoreBar({ value = 0, max = 100 }) {
  const pct = Math.max(0, Math.min(100, (Number(value) / Number(max || 100)) * 100));
  return <div className="speaking-score-bar"><i style={{ width: `${pct}%` }} /></div>;
}

function CardList({ cards, activeIndex, setActiveIndex }) {
  return (
    <div className="speaking-card-list">
      {cards.map((card, index) => (
        <button key={card.id} className={activeIndex === index ? 'active' : ''} onClick={() => setActiveIndex(index)}>
          <strong>{index + 1}</strong>
          <span>{card.title || `Card ${index + 1}`}</span>
        </button>
      ))}
    </div>
  );
}

export default function SpeakingStudio({ language, apiKey, aiModel, hasApiKey }) {
  const [instruction, setInstruction] = useState('Create 20 speaking cards for B2 students about school, technology and future careers, with follow-up questions');
  const [sourceText, setSourceText] = useState('');
  const [level, setLevel] = useState('B2-C1');
  const [quantity, setQuantity] = useState(10);
  const [cards, setCards] = useState(SAMPLE_CARDS);
  const [title, setTitle] = useState('Speaking Practice');
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [live, setLive] = useState(false);
  const [full, setFull] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [score, setScore] = useState(null);
  const [rawFeedback, setRawFeedback] = useState('');
  const [scoring, setScoring] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordUrl, setRecordUrl] = useState('');
  const [recordMimeType, setRecordMimeType] = useState('audio/webm');
  const [speechNotice, setSpeechNotice] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  const speechRef = useRef(null);
  const timerRef = useRef(null);
  const liveRef = useRef(null);
  const builderRef = useRef(null);
  const outputRef = useRef(null);
  const [activeWorkflow, setActiveWorkflow] = useState('create');

  const activeCard = cards[activeIndex] || cards[0] || SAMPLE_CARDS[0];
  const progress = Math.min(100, (seconds / 120) * 100);

  const scrollToRef = (ref) => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  const workflowCards = [
    {
      id: 'create', icon: '01', tone: 'aqua',
      badge: language === 'vi' ? 'Khởi tạo' : 'Create',
      title: language === 'vi' ? 'Tạo hoạt động nói' : 'Create speaking activity',
      desc: language === 'vi' ? 'Nhập yêu cầu, chủ đề và số lượng thẻ.' : 'Set the instruction, topic, and number of speaking cards.',
      cta: language === 'vi' ? 'Soạn thẻ' : 'Build cards',
      action: () => { setActiveWorkflow('create'); scrollToRef(builderRef); },
    },
    {
      id: 'practice', icon: '02', tone: 'mint',
      badge: language === 'vi' ? 'Luyện tập' : 'Practice',
      title: language === 'vi' ? 'Chơi trực tiếp' : 'Live practice',
      desc: language === 'vi' ? 'Mở chế độ live để luyện nói theo từng card.' : 'Open the live mode and move through cards interactively.',
      cta: language === 'vi' ? 'Mở live' : 'Open live',
      action: () => { setLive(true); setActiveWorkflow('practice'); setTimeout(() => scrollToRef(liveRef), 0); },
    },
    {
      id: 'score', icon: '03', tone: 'sky',
      badge: language === 'vi' ? 'Kết quả' : 'Output',
      title: language === 'vi' ? 'Xuất & chấm điểm' : 'Export & score',
      desc: language === 'vi' ? 'Xem card, xuất file và chấm speaking bằng AI.' : 'Review cards, export files, and score speaking with AI.',
      cta: language === 'vi' ? 'Xem output' : 'View output',
      action: () => { setActiveWorkflow('score'); scrollToRef(outputRef); },
    },
  ];

  useEffect(() => {
    setSpeechSupported(Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
    return () => {
      clearInterval(timerRef.current);
      try { speechRef.current?.stop?.(); } catch {}
      try { streamRef.current?.getTracks?.().forEach((track) => track.stop()); } catch {}
    };
  }, []);

  const flash = (message) => {
    setToast(message);
    window.clearTimeout(flash.timer);
    flash.timer = window.setTimeout(() => setToast(''), 2400);
  };

  const generateCards = async () => {
    setLoading(true);
    setRawFeedback('');
    try {
      const prompt = `Create a speaking practice set for English learners.\n\nLevel: ${level}\nNumber of cards: ${quantity}\nTeacher request: ${instruction}\nSource text / vocabulary / notes:\n${sourceText || '(none)'}\n\nReturn strict JSON only with this schema:\n{\n  "title": "short title",\n  "cards": [\n    {\n      "id": "card-1",\n      "title": "short card title",\n      "prompt": "main speaking prompt",\n      "followUps": ["follow-up 1", "follow-up 2", "follow-up 3"],\n      "languageFunctions": ["function 1", "function 2"],\n      "vocabulary": ["useful word 1", "useful phrase 2"],\n      "successCriteria": ["criterion 1", "criterion 2", "criterion 3"]\n    }\n  ]\n}\n\nRules:\n- Prompts must be answerable in 1-2 minutes.\n- Each card must include at least 3 follow-up questions.\n- Avoid duplicate prompts.\n- Keep the main prompt clear and classroom-ready.\n- Do not include markdown fences.`;
      const text = await callAI({ apiKey, model: aiModel, prompt, temperature: 0.65, responseMimeType: 'application/json', validation: { kind: 'json', requiredFields: ['title', 'cards'], collectionKey: 'cards', expectedCount: Number(quantity), detectDuplicates: true } });
      const json = extractJson(text);
      const nextCards = normalizeCards(json.cards || []);
      setTitle(json.title || 'Speaking Practice');
      setCards(nextCards);
      setActiveIndex(0);
      setLive(true);
      saveSpeakingSet(nextCards, json.title || 'Speaking Practice');
      flash(language === 'vi' ? 'Đã tạo speaking activity.' : 'Speaking activity created.');
    } catch (err) {
      flash(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const useFromOutput = () => {
    const parsed = parseCardsFromText(rawFeedback);
    setCards(parsed);
    setActiveIndex(0);
    setLive(true);
  };

  const resetAttempt = () => {
    setTranscript('');
    setInterimTranscript('');
    setScore(null);
    setRawFeedback('');
    if (recordUrl) URL.revokeObjectURL(recordUrl);
    setRecordUrl('');
    setSpeechNotice('');
    setSeconds(0);
  };

  const startSpeechRecognition = () => {
    const recognition = createSpeechRecognition({
      language: 'en-US',
      continuous: true,
      interimResults: true,
      onStart: () => setSpeechNotice(language === 'vi' ? 'Đang tạo transcript tự động…' : 'Creating an automatic transcript…'),
      onResult: (event) => {
        let finalText = ''; let interim = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const piece = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) finalText += `${piece} `; else interim += piece;
        }
        if (finalText) setTranscript((prev) => `${prev} ${finalText}`.replace(/\s+/g, ' ').trim());
        setInterimTranscript(interim);
      },
      onEnd: () => setInterimTranscript(''),
      onError: ({ code }) => {
        if (code === 'aborted') return;
        setInterimTranscript('');
        setSpeechNotice(speechRecognitionMessage(code, language));
      },
    });
    if (!recognition) {
      setSpeechNotice(language === 'vi' ? 'Trình duyệt không hỗ trợ transcript tự động. Ghi âm vẫn hoạt động; hãy nhập transcript thủ công.' : 'Automatic transcription is unavailable. Recording still works; type a transcript manually.');
      return;
    }
    try { recognition.start(); speechRef.current = recognition; }
    catch { setSpeechNotice(language === 'vi' ? 'Không thể khởi động transcript tự động. Ghi âm vẫn hoạt động.' : 'Automatic transcription could not start. Recording still works.'); }
  };

  const startRecording = async () => {
    resetAttempt();
    const support = getMicrophoneSupport();
    if (!support.mediaRecorder) return flash(language === 'vi' ? 'Trình duyệt chưa hỗ trợ MediaRecorder.' : 'MediaRecorder is unavailable in this browser.');
    try {
      const stream = await requestMicrophoneStream();
      streamRef.current = stream;
      chunksRef.current = [];
      const recorder = createMediaRecorder(stream, {
        onData: (event) => { if (event.data?.size) chunksRef.current.push(event.data); },
        onError: (event) => flash(describeMediaError(event?.error || event, language)),
        onStop: () => {
          const mimeType = recorder.mimeType || support.mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          setRecordMimeType(blob.type || mimeType);
          setRecordUrl((current) => { if (current) URL.revokeObjectURL(current); return url; });
          stopStream(stream); streamRef.current = null;
        },
      });
      recorderRef.current = recorder;
      recorder.start(250);
      setRecording(true);
      setSeconds(0);
      setSpeechNotice(language === 'vi' ? 'Micro đã sẵn sàng. Bản ghi đang được lưu cục bộ.' : 'Microphone ready. Audio is being recorded locally.');
      clearInterval(timerRef.current);
      timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
      startSpeechRecognition();
    } catch (err) {
      stopStream(streamRef.current); streamRef.current = null;
      flash(describeMediaError(err, language));
    }
  };

  const stopRecording = () => {
    try { speechRef.current?.stop?.(); } catch {}
    const recorder = recorderRef.current;
    try { if (recorder?.state === 'recording') recorder.requestData?.(); } catch {}
    try { if (recorder?.state && recorder.state !== 'inactive') recorder.stop(); else stopStream(streamRef.current); } catch { stopStream(streamRef.current); }
    clearInterval(timerRef.current);
    setRecording(false);
  };

  const downloadAudio = () => {
    if (!recordUrl) return flash(language === 'vi' ? 'Chưa có bản ghi âm.' : 'No recording yet.');
    const a = document.createElement('a');
    a.href = recordUrl;
    a.download = `${slugify(activeCard.title || 'speaking-recording')}.${extensionForMimeType(recordMimeType)}`;
    a.click();
  };

  const gradeSpeaking = async () => {
    const finalTranscript = `${transcript} ${interimTranscript}`.trim();
    if (!finalTranscript) {
      flash(language === 'vi' ? 'Cần transcript. Hãy ghi âm bằng Chrome hoặc nhập transcript thủ công.' : 'Transcript required. Record in Chrome or type it manually.');
      return;
    }
    setScoring(true);
    setScore(null);
    try {
      const prompt = `You are an English speaking examiner for Vietnamese high-school students. Grade the student's speaking response.\n\nLevel target: ${level}\nSpeaking prompt: ${activeCard.prompt}\nFollow-up questions: ${(activeCard.followUps || []).join(' | ')}\nSuccess criteria: ${(activeCard.successCriteria || []).join(' | ')}\nRecording duration: ${seconds} seconds\nStudent transcript:\n${finalTranscript}\n\nReturn strict JSON only with this schema:\n{\n  "overall": 0,\n  "cefr": "B2",\n  "bands": {\n    "task": 0,\n    "fluency": 0,\n    "vocab": 0,\n    "grammar": 0,\n    "pronunciation": 0\n  },\n  "strengths": ["..."],\n  "improvements": ["..."],\n  "grammarCorrections": [{"original":"...", "better":"...", "reason":"..."}],\n  "vocabularyUpgrade": [{"basic":"...", "better":"..."}],\n  "sampleAnswer": "a stronger sample answer at the same level",\n  "teacherNote": "short note for teacher"\n}\n\nScoring rules:\n- overall is 0-100.\n- each band is 0-20.\n- Pronunciation is based on transcript clarity and recording duration only; mention that true phonetic scoring requires audio transcription support.\n- Be specific and constructive.\n- Do not invent content not supported by the transcript.`;
      const text = await callAI({ apiKey, model: aiModel, prompt, temperature: 0.35, responseMimeType: 'application/json', validation: { kind: 'json', requiredFields: ['overall', 'cefr', 'bands', 'strengths', 'improvements'] } });
      const json = extractJson(text);
      setScore(json);
      addHistoryEntry({ type: 'speaking-feedback', title: `Speaking feedback - ${activeCard.title}`, content: JSON.stringify(json, null, 2) });
      flash(language === 'vi' ? 'Đã chấm speaking.' : 'Speaking graded.');
    } catch (err) {
      setRawFeedback(err.message || String(err));
      flash(err.message || String(err));
    } finally {
      setScoring(false);
    }
  };

  const openFullscreen = async () => {
    const el = liveRef.current;
    if (!el) return;
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await el.requestFullscreen();
    } catch {
      setFull(!full);
    }
  };

  const openSeparate = () => {
    const html = buildOfflineSpeakingHtml(cards, title);
    const url = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const saveSpeakingSet = (nextCards = cards, nextTitle = title) => addHistoryEntry({
    kind: 'speaking-studio',
    type: 'speaking-studio',
    toolSlug: 'speaking-studio',
    toolTitle: 'Speaking Studio',
    sourceApp: 'speaking-studio',
    sourceAppTitle: 'Speaking Studio',
    title: nextTitle || 'Speaking Practice',
    content: buildCardsMarkdown(nextCards, nextTitle || 'Speaking Practice'),
    templateId: 'speaking-cards',
    itemCount: nextCards.length,
    tags: ['speaking', 'cards', 'interactive'],
    activityData: {
      type: 'standalone-html',
      templateId: 'speaking-cards',
      sourceApp: 'speaking-studio',
      standaloneHtml: buildOfflineSpeakingHtml(nextCards, nextTitle || 'Speaking Practice'),
      cards: nextCards,
    },
  });

  const exportHtml = () => downloadFile(`${slugify(title || 'speaking-practice')}.html`, buildOfflineSpeakingHtml(cards, title), 'text/html;charset=utf-8');
  const exportTxt = () => downloadFile(`${slugify(title || 'speaking-practice')}.txt`, buildCardsMarkdown(cards, title));
  const exportDoc = () => exportAsWord(title || 'Speaking Practice', buildCardsMarkdown(cards, title));

  return (
    <div className="page speaking-page speaking-v29-page">
      <button className="back-btn speaking-v29-back" onClick={() => window.history.back()}>← {language === 'vi' ? 'Quay lại' : 'Back'}</button>
      <section className="speaking-v33-hero" aria-labelledby="speaking-studio-title">
        <div className="speaking-v33-visual" aria-hidden="true">
          <div className="speaking-v33-orbit orbit-one" />
          <div className="speaking-v33-orbit orbit-two" />

          <div className="speaking-v33-ui-card speaking-v33-prompt-card">
            <div className="speaking-v33-card-label"><span>▣</span> Prompt</div>
            <p>Talk about a time<br />you overcame a<br />challenge.</p>
            <i className="line long" /><i className="line medium" />
          </div>

          <div className="speaking-v33-ui-card speaking-v33-wave-card">
            <div className="speaking-v33-waveform">
              {[18, 28, 42, 58, 36, 50, 70, 44, 30, 62, 84, 56, 38, 68, 48, 30, 22].map((height, index) => (
                <i key={index} style={{ '--bar-height': `${height}%`, '--bar-delay': `${index * 35}ms` }} />
              ))}
            </div>
            <strong>00:45 <b /></strong>
          </div>

          <div className="speaking-v33-mic-stage">
            <div className="speaking-v33-mic">
              <span className="speaking-v33-mic-grille" />
              <span className="speaking-v33-mic-button button-main" />
              <span className="speaking-v33-mic-button button-live" />
            </div>
            <div className="speaking-v33-mic-yoke" />
            <div className="speaking-v33-mic-pole" />
            <div className="speaking-v33-mic-base" />
          </div>

          <div className="speaking-v33-ui-card speaking-v33-score-card">
            <div className="speaking-v33-card-label"><span>●</span> Score</div>
            <div className="speaking-v33-score-content">
              <strong>86</strong>
              <p><b>Great job!</b><br />Clear ideas and<br />good structure.</p>
            </div>
            <div className="speaking-v33-stars">★ ★ ★ ★ <span>★</span></div>
          </div>

          <div className="speaking-v33-ui-card speaking-v33-follow-card">
            <div className="speaking-v33-card-label"><span>▣</span> Follow-up</div>
            <p>Can you describe how<br />you felt at that time?</p>
            <button type="button" tabIndex={-1}>→</button>
          </div>

          <div className="speaking-v33-sparkle">✦</div>
          <div className="speaking-v33-landscape wave-back" />
          <div className="speaking-v33-landscape wave-front" />
        </div>

        <div className="speaking-v33-copy">
          <span className="speaking-v33-version">V1.0 · Speaking Live · Voice AI</span>
          <div className="speaking-v33-heading-row">
            <span className="speaking-v33-title-icon" aria-hidden="true">🎙️</span>
            <h1 id="speaking-studio-title">Speaking<br />Studio</h1>
          </div>
          <p>{language === 'vi' ? 'Tạo hoạt động nói, chơi trực tiếp, ghi âm giọng nói, xem transcript và chấm điểm bằng AI.' : 'Create speaking activities, practise live, record voices, review transcripts, and grade with AI.'}</p>
          <div className="speaking-v33-actions" aria-label={language === 'vi' ? 'Lối tắt Speaking Studio' : 'Speaking Studio shortcuts'}>
            <button type="button" onClick={() => { setActiveWorkflow('create'); scrollToRef(builderRef); }}><span>▣</span>{language === 'vi' ? 'Thẻ nói tương tác' : 'Speaking cards'}</button>
            <button type="button" onClick={() => { setLive(true); setActiveWorkflow('practice'); setTimeout(() => scrollToRef(liveRef), 0); }}><span>♩</span>{language === 'vi' ? 'Ghi âm + transcript' : 'Record + transcript'}</button>
            <button type="button" onClick={() => { setLive(true); setActiveWorkflow('score'); setTimeout(() => scrollToRef(liveRef), 0); }}><span>☆</span>{language === 'vi' ? 'AI chấm điểm' : 'AI scoring'}</button>
          </div>
        </div>
      </section>

      <section className="speaking-v33-status-grid" aria-label={language === 'vi' ? 'Trạng thái hệ thống' : 'System status'}>
        <article className="speaking-v33-status-card">
          <div><strong>{language === 'vi' ? 'AI sẵn sàng' : 'AI ready'}</strong><small>{hasApiKey ? 'API connected' : 'No API key'}</small></div>
          <span className={hasApiKey ? 'is-ready' : 'is-warning'}>{hasApiKey ? '✓' : '!'}</span>
        </article>
        <article className="speaking-v33-status-card">
          <div><strong>{speechSupported ? (language === 'vi' ? 'Speech OK' : 'Speech ready') : (language === 'vi' ? 'Nhập transcript' : 'Manual transcript')}</strong><small>{language === 'vi' ? 'Chế độ lời nói' : 'Speech mode'}</small></div>
          <span className={speechSupported ? 'is-ready' : 'is-warning'}>{speechSupported ? '✓' : '!'}</span>
        </article>
        <article className="speaking-v33-status-card">
          <div><strong>{cards.length}</strong><small>{language === 'vi' ? 'Thẻ hiện có' : 'Cards ready'}</small></div>
          <span className="is-ready">✓</span>
        </article>
      </section>

      <section className="speaking-v29-flow-grid speaking-v33-flow-grid">
        {workflowCards.map((card) => (
          <article key={card.id} className={`panel speaking-v29-flow-card speaking-v33-flow-card ${card.tone} ${activeWorkflow === card.id ? 'active' : ''}`}>
            <div className="speaking-v29-flow-icon">{card.icon}</div>
            <div className="speaking-v29-flow-copy">
              <span>{card.badge}</span>
              <strong>{card.title}</strong>
              <p>{card.desc}</p>
            </div>
            <button type="button" className="speaking-v29-flow-cta" onClick={card.action}>{card.cta} →</button>
          </article>
        ))}
      </section>

      <section className="speaking-builder-grid speaking-v29-builder-grid">
        <article ref={builderRef} className="panel builder-panel speaking-v29-builder-panel">
          <h2>1. {language === 'vi' ? 'Tạo hoạt động nói' : 'Create speaking activity'}</h2>
          <label>{language === 'vi' ? 'Yêu cầu' : 'Instruction'}</label>
          <textarea rows={7} value={instruction} onChange={(e) => setInstruction(e.target.value)} />
          <div className="two-fields">
            <div>
              <label>Level</label>
              <select value={level} onChange={(e) => setLevel(e.target.value)}>
                <option>A2-B1</option><option>B1-B2</option><option>B2-C1</option><option>C1</option>
              </select>
            </div>
            <div>
              <label>{language === 'vi' ? 'Số thẻ' : 'Cards'}</label>
              <input type="number" min="1" max="40" value={quantity} onChange={(e) => setQuantity(Number(e.target.value) || 10)} />
            </div>
          </div>
          <label>{language === 'vi' ? 'Nguồn / từ vựng / chủ đề' : 'Source / vocabulary / topic'}</label>
          <textarea rows={7} value={sourceText} onChange={(e) => setSourceText(e.target.value)} placeholder={language === 'vi' ? 'Dán bài đọc, danh sách từ, hoặc yêu cầu chi tiết...' : 'Paste source text, vocabulary, or requirements...'} />
          <div className="preview-actions wrap-actions">
            <button className="primary" onClick={generateCards} disabled={loading}>{loading ? (language === 'vi' ? 'Đang tạo...' : 'Generating...') : '✨ Tạo bằng AI'}</button>
            <button className="secondary" onClick={() => { setCards(SAMPLE_CARDS); setTitle('Sample Speaking Practice'); setLive(true); }}>{language === 'vi' ? 'Dùng mẫu' : 'Use sample'}</button>
          </div>
        </article>

        <article ref={outputRef} className="panel builder-panel speaking-output-panel speaking-v29-output-panel">
          <div className="preview-head">
            <div>
              <span className="eyebrow">2. {language === 'vi' ? 'Hoạt động' : 'Activity'}</span>
              <h2>{title}</h2>
            </div>
            <div className="preview-actions wrap-actions">
              <button onClick={exportTxt}>TXT</button>
              <button onClick={exportDoc}>Word .doc</button>
              <button onClick={exportHtml}>HTML</button>
              <button onClick={() => saveSpeakingSet(cards, title)}>{language === 'vi' ? 'Lưu' : 'Save'}</button>
            </div>
          </div>
          <CardList cards={cards} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
          <div className="speaking-card-preview">
            <span className="speaking-card-number">Card {activeIndex + 1}</span>
            <h3>{activeCard.title}</h3>
            <p>{activeCard.prompt}</p>
            <ul>{(activeCard.followUps || []).map((q, i) => <li key={i}>{q}</li>)}</ul>
          </div>
          <button className="primary full" onClick={() => setLive(true)}>{language === 'vi' ? 'Chơi trực tiếp' : 'Live interaction'}</button>
          {rawFeedback && <textarea rows={5} value={rawFeedback} onChange={(e) => setRawFeedback(e.target.value)} />}
          {rawFeedback && <button className="secondary" onClick={useFromOutput}>{language === 'vi' ? 'Dùng output này' : 'Use this output'}</button>}
        </article>
      </section>

      {live && (
        <section ref={liveRef} className={`panel speaking-live speaking-v29-live ${full ? 'detached-fullscreen' : ''}`}>
          <div className="speaking-live-top">
            <div>
              <span className="eyebrow">3. Live Interaction</span>
              <h2>{language === 'vi' ? 'Luyện nói trực tiếp' : 'Live speaking practice'}</h2>
            </div>
            <div className="preview-actions wrap-actions">
              <button onClick={() => setActiveIndex((i) => Math.max(0, i - 1))}>← {language === 'vi' ? 'Trước' : 'Prev'}</button>
              <button onClick={() => setActiveIndex((i) => Math.min(cards.length - 1, i + 1))}>{language === 'vi' ? 'Tiếp' : 'Next'} →</button>
              <button onClick={openFullscreen}>{language === 'vi' ? 'Toàn màn hình' : 'Fullscreen'}</button>
              <button onClick={openSeparate}>{language === 'vi' ? 'Mở riêng' : 'Open'}</button>
              <button className="primary" onClick={exportHtml}>HTML</button>
            </div>
          </div>

          <div className="speaking-live-grid">
            <aside className="speaking-live-left">
              <CardList cards={cards} activeIndex={activeIndex} setActiveIndex={setActiveIndex} />
              <div className="speaking-rubric-mini">
                <strong>{language === 'vi' ? 'Rubric chấm' : 'Rubric'}</strong>
                {RUBRIC.map((item) => <span key={item.id}>{language === 'vi' ? item.vi : item.label} · {item.max}</span>)}
              </div>
            </aside>

            <main className="speaking-live-main">
              <div className="speaking-prompt-card">
                <div className="speaking-live-badge">{activeIndex + 1} / {cards.length}</div>
                <h3>{activeCard.title}</h3>
                <p className="speaking-main-prompt">{activeCard.prompt}</p>
                <div className="speaking-chips">
                  {(activeCard.languageFunctions || []).map((x, i) => <span key={`f-${i}`}>{x}</span>)}
                  {(activeCard.vocabulary || []).map((x, i) => <span key={`v-${i}`}>{x}</span>)}
                </div>
                <div className="speaking-followups">
                  <strong>{language === 'vi' ? 'Câu hỏi phụ' : 'Follow-up questions'}</strong>
                  <ul>{(activeCard.followUps || []).map((q, i) => <li key={i}>{q}</li>)}</ul>
                </div>
                <div className="speaking-criteria">
                  {(activeCard.successCriteria || []).map((c, i) => <span key={i}>✓ {c}</span>)}
                </div>
              </div>
            </main>

            <aside className="speaking-live-right">
              <div className="recording-panel">
                <div className={`recording-orb ${recording ? 'recording' : ''}`}>🎙️</div>
                <div className="speaking-timer">{String(Math.floor(seconds / 60)).padStart(2, '0')}:{String(seconds % 60).padStart(2, '0')}</div>
                <ScoreBar value={progress} max={100} />
                <div className="preview-actions wrap-actions center-actions">
                  {!recording ? <button className="primary" onClick={startRecording}>{language === 'vi' ? 'Bắt đầu ghi âm' : 'Start recording'}</button> : <button className="danger" onClick={stopRecording}>{language === 'vi' ? 'Dừng' : 'Stop'}</button>}
                  <button onClick={downloadAudio}>{language === 'vi' ? 'Tải audio' : 'Audio'}</button>
                </div>
                {recordUrl && <audio controls src={recordUrl} className="speaking-audio" />}
                <small className={speechNotice ? 'speaking-recording-notice' : ''}>{speechNotice || (speechSupported ? (language === 'vi' ? 'Ghi âm hoạt động độc lập với transcript. Bạn có thể sửa transcript trước khi chấm.' : 'Recording works independently from transcription. You can edit the transcript before grading.') : (language === 'vi' ? 'Ghi âm vẫn hoạt động; trình duyệt này cần nhập transcript thủ công.' : 'Recording still works; type the transcript manually in this browser.'))}</small>
              </div>

              <div className="transcript-panel">
                <label>{language === 'vi' ? 'Transcript để AI chấm' : 'Transcript for AI scoring'}</label>
                <textarea rows={8} value={`${transcript}${interimTranscript ? ` ${interimTranscript}` : ''}`} onChange={(e) => { setTranscript(e.target.value); setInterimTranscript(''); }} placeholder={language === 'vi' ? 'Transcript sẽ hiện ở đây hoặc nhập thủ công...' : 'Transcript appears here or can be typed manually...'} />
                <button className="primary full" onClick={gradeSpeaking} disabled={scoring}>{scoring ? (language === 'vi' ? 'Đang chấm...' : 'Scoring...') : (language === 'vi' ? 'AI chấm điểm' : 'AI score')}</button>
              </div>
            </aside>
          </div>

          {score && (
            <div className="speaking-feedback-grid">
              <div className="speaking-score-card">
                <span>{language === 'vi' ? 'Điểm tổng' : 'Overall'}</span>
                <strong>{score.overall ?? 0}</strong>
                <small>CEFR: {score.cefr || '—'}</small>
              </div>
              <div className="speaking-band-panel">
                {RUBRIC.map((item) => {
                  const value = score.bands?.[item.id] ?? 0;
                  return (
                    <div key={item.id} className="speaking-band-row">
                      <span>{language === 'vi' ? item.vi : item.label}</span>
                      <b>{value}/{item.max}</b>
                      <ScoreBar value={value} max={item.max} />
                    </div>
                  );
                })}
              </div>
              <div className="speaking-feedback-card">
                <h3>{language === 'vi' ? 'Nhận xét' : 'Feedback'}</h3>
                <div className="feedback-columns">
                  <div><strong>{language === 'vi' ? 'Điểm mạnh' : 'Strengths'}</strong><ul>{(score.strengths || []).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                  <div><strong>{language === 'vi' ? 'Cần cải thiện' : 'Improvements'}</strong><ul>{(score.improvements || []).map((x, i) => <li key={i}>{x}</li>)}</ul></div>
                </div>
                {score.grammarCorrections?.length ? <div><strong>{language === 'vi' ? 'Sửa lỗi' : 'Corrections'}</strong>{score.grammarCorrections.map((x, i) => <p key={i}><s>{x.original}</s> → <b>{x.better}</b> <em>{x.reason}</em></p>)}</div> : null}
                {score.vocabularyUpgrade?.length ? <div><strong>{language === 'vi' ? 'Nâng cấp từ vựng' : 'Vocabulary upgrade'}</strong>{score.vocabularyUpgrade.map((x, i) => <p key={i}><b>{x.basic}</b> → {x.better}</p>)}</div> : null}
                {score.sampleAnswer && <div><strong>{language === 'vi' ? 'Câu trả lời mẫu' : 'Sample answer'}</strong><p>{score.sampleAnswer}</p></div>}
                {score.teacherNote && <div className="hint-box"><strong>Teacher note:</strong> {score.teacherNote}</div>}
              </div>
            </div>
          )}
        </section>
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
