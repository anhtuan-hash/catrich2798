import React, { useEffect, useMemo, useRef, useState } from 'react';
import { extractJson } from '../utils/openRouter.js';
import { runAITask } from '../utils/aiTaskRuntime.js';
import { readDocxTextFromBuffer, readPdfTextFromBuffer } from '../utils/documentParsers.js';
import { addHistoryEntry, exportAsHtml, exportAsWord } from '../utils/library.js';
import { createTransfer, listTransfers, updateTransfer, TRANSFER_APPLY_EVENT } from '../utils/contentTransfer.js';
import { getActiveAiConfig, getProviderInfo } from '../utils/aiProviders.js';
import { createMediaRecorder, createSpeechRecognition, describeMediaError, extensionForMimeType, getMicrophoneSupport, requestMicrophoneStream, speechRecognitionMessage, stopStream } from '../utils/mediaCapture.js';
import './PronunciationCoach.css';

const PRACTICE_MODES = [
  { id: 'sound', icon: 'ɪ', title: 'Sound Focus', desc: 'Luyện âm vị, minimal pairs, âm cuối và cụm phụ âm.' },
  { id: 'word', icon: 'W', title: 'Word Pronunciation', desc: 'Luyện âm tiết, trọng âm từ, schwa và dạng yếu.' },
  { id: 'rhythm', icon: '≋', title: 'Sentence Rhythm', desc: 'Luyện trọng âm câu, nhịp điệu và vowel reduction.' },
  { id: 'connected', icon: '↝', title: 'Connected Speech', desc: 'Luyện nối âm, đồng hóa, lược âm và contractions.' },
  { id: 'intonation', icon: '⌁', title: 'Intonation Practice', desc: 'Luyện đường ngữ điệu, thái độ và thought groups.' },
  { id: 'diagnostic', icon: '◎', title: 'Diagnostic Practice', desc: 'Ghi âm, nhận diện lỗi và tạo lộ trình phụ đạo.' },
];

const FOCUS_GROUPS = [
  { label: 'Vowels', items: ['/iː/ vs /ɪ/', '/æ/ vs /e/', '/ʌ/ vs /ɑː/', '/ɒ/ vs /ɔː/', '/uː/ vs /ʊ/', 'Diphthongs', 'Schwa /ə/'] },
  { label: 'Consonants', items: ['/θ/ vs /t/', '/ð/ vs /d/', '/s/ vs /ʃ/', '/z/ vs /ʒ/', '/tʃ/ vs /ʒ/', '/r/ vs /l/', '/v/ vs /w/', 'Final consonants', 'Consonant clusters'] },
  { label: 'Stress & rhythm', items: ['Word stress', 'Sentence stress', 'Contrastive stress', 'Rhythm', 'Weak forms', 'Thought groups', 'Pausing'] },
  { label: 'Connected speech', items: ['Consonant–vowel linking', 'Vowel–vowel linking', 'Assimilation', 'Elision', 'Flapping', 'Contractions', 'Intrusive sounds'] },
  { label: 'Intonation', items: ['Falling intonation', 'Rising intonation', 'Fall–rise', 'Attitude and meaning', 'Question intonation'] },
];

const ACTIVITY_TYPES = [
  'Listen and choose', 'Same or different', 'Minimal-pair discrimination', 'Repeat after model', 'Record and compare',
  'Shadowing', 'Mark the stress', 'Mark thought groups', 'Identify weak forms', 'Linking annotation',
  'Intonation matching', 'Tongue twister', 'Dialogue rehearsal', 'Reading aloud', 'Pronunciation error hunt', 'Communicative production',
];

const AI_TASKS = [
  { id: 'generate', icon: '✦', title: 'Tạo bài luyện', desc: 'Tạo word list, câu, dialogue và shadowing passage.' },
  { id: 'annotate', icon: 'ɪ', title: 'Chú thích phát âm', desc: 'Thêm IPA, stress, linking, weak forms và thought groups.' },
  { id: 'analyse', icon: '◎', title: 'Phân tích bản ghi', desc: 'Đánh giá intelligibility, từ chưa rõ và lỗi lặp lại.' },
  { id: 'final-sounds', icon: '✓', title: 'Kiểm tra âm cuối', desc: 'Tập trung final consonants và consonant clusters.' },
  { id: 'stress', icon: '↟', title: 'Kiểm tra trọng âm', desc: 'Rà soát word stress, sentence stress và prominence.' },
  { id: 'rhythm', icon: '≋', title: 'Kiểm tra nhịp', desc: 'Phân tích weak forms, schwa, pausing và rhythm.' },
  { id: 'remediation', icon: '▦', title: 'Tạo bài sửa lỗi', desc: 'Tạo lộ trình 5–10 phút dựa trên lỗi đã phát hiện.' },
  { id: 'custom', icon: '⌘', title: 'Yêu cầu riêng', desc: 'Giao nhiệm vụ chuyên môn cụ thể cho AI Speech Coach.' },
];

const WORKFLOW = [
  ['01', 'Mục đích', 'pc-card-mode'], ['02', 'Trọng tâm', 'pc-card-focus'], ['03', 'Đối tượng', 'pc-card-learner'],
  ['04', 'Blueprint', 'pc-card-blueprint'], ['05', 'Luyện tập', 'pc-card-model'], ['06', 'Phân tích', 'pc-card-review'], ['07', 'Giao bài', 'pc-card-publish'],
];

const DESTINATIONS = [
  { id: 'lesson-plan-ai', route: '#/tool/lesson-plan-ai', icon: 'LA', label: 'Lesson Architect', desc: 'Gửi pronunciation stage, assessment và homework.' },
  { id: 'speaking-studio', route: '#/tool/speaking-studio', icon: 'SS', label: 'Speaking Studio', desc: 'Gửi dialogue, sentence frames và feedback phát âm.' },
  { id: 'reading-studio', route: '#/tool/reading-studio', icon: 'RS', label: 'Reading Studio', desc: 'Gửi shadowing và read-aloud passage.' },
  { id: 'grammar-builder', route: '#/tool/grammar-builder', icon: 'GB', label: 'Grammar Builder', desc: 'Gửi câu mục tiêu, stress và weak-form activity.' },
  { id: 'word2graph', route: '#/tool/word2graph', icon: 'WG', label: 'WordGraph Studio', desc: 'Gửi IPA, stress và audio metadata cho từ vựng.' },
  { id: 'writing-studio', route: '#/tool/writing-studio', icon: 'WS', label: 'Writing Studio', desc: 'Gửi read-aloud hoặc presentation rehearsal.' },
  { id: 'worksheet-factory', route: '#/tool/worksheet-factory', icon: 'WF', label: 'Worksheet Factory', desc: 'Dàn trang IPA, stress và minimal-pair worksheet.' },
  { id: 'textlab-activities', route: '#/tool/textlab-activities', icon: 'AC', label: 'Activity Studio', desc: 'Tạo sound sorting, pronunciation race hoặc bingo.' },
  { id: 'exam-studio', route: '#/tool/exam-studio', icon: 'EX', label: 'Exam Studio', desc: 'Gửi pronunciation MCQ và stress test.' },
  { id: 'english-lesson-integration', route: '#/tool/english-lesson-integration', icon: 'EL', label: 'AI Lesson Integration', desc: 'Chèn hoạt động phát âm vào giáo án.' },
];

function uid(prefix = 'pc') { return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`; }
function safeToken(value) { return String(value || 'guest').toLowerCase().replace(/[^a-z0-9@._-]+/g, '-') || 'guest'; }
function projectKey(user) { return `bes-pronunciation-coach-v1153-project:${safeToken(user?.id || user?.email || 'guest')}`; }
function vaultKey(user) { return `bes-pronunciation-coach-v1153-vault:${safeToken(user?.id || user?.email || 'guest')}`; }
function readJson(key, fallback) { try { return JSON.parse(window.localStorage.getItem(key) || 'null') ?? fallback; } catch { return fallback; } }
function lines(value) { return String(value || '').split(/\r?\n/).map((item) => item.trim()).filter(Boolean); }
function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
function formatDuration(seconds) { const min = Math.floor(seconds / 60); const sec = seconds % 60; return `${String(min).padStart(2, '0')}:${String(sec).padStart(2, '0')}`; }
function normalizeSpeechText(value) { return String(value || '').toLowerCase().replace(/[^a-z0-9'\s]/g, ' ').replace(/\s+/g, ' ').trim(); }
function levenshtein(a, b) {
  const aa = normalizeSpeechText(a).split(' '); const bb = normalizeSpeechText(b).split(' ');
  const rows = Array.from({ length: aa.length + 1 }, () => Array(bb.length + 1).fill(0));
  for (let i = 0; i <= aa.length; i += 1) rows[i][0] = i;
  for (let j = 0; j <= bb.length; j += 1) rows[0][j] = j;
  for (let i = 1; i <= aa.length; i += 1) for (let j = 1; j <= bb.length; j += 1) rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (aa[i - 1] === bb[j - 1] ? 0 : 1));
  return rows[aa.length][bb.length];
}
function similarity(a, b) {
  const aa = normalizeSpeechText(a).split(' ').filter(Boolean); const bb = normalizeSpeechText(b).split(' ').filter(Boolean);
  const max = Math.max(aa.length, bb.length, 1); return Math.round(clamp((1 - levenshtein(a, b) / max) * 100, 0, 100));
}

function defaultProject() {
  return {
    id: uid('pronunciation'), title: 'Connected Speech — Daily Routines', mode: 'connected', focus: 'Consonant–vowel linking', customFocus: '',
    grade: '11', level: 'B1-B2', accent: 'en-US', book: 'Global Success', unit: 'Unit 2', topic: 'Daily routines', duration: 45,
    grouping: 'Individual + Pair', delivery: 'Blended', learnerNotes: 'Học sinh thường bỏ âm cuối và đọc tách từng từ; ưu tiên tốc độ chậm trước khi shadowing tự nhiên.',
    sourceName: '', sourceText: '', sourceKind: 'sentences', targetText: 'I get up at six and usually eat an apple before I leave for school.',
    wordList: ['get up', 'at six', 'eat an apple', 'leave for school'],
    blueprint: { itemCount: 16, modelRate: 0.85, listenLimit: 3, recordingAttempts: 4, showIpa: true, showStress: true, showLinking: true, showThoughtGroups: true, transcript: true, lockReplay: false, activities: ['Listen and choose', 'Repeat after model', 'Record and compare', 'Shadowing'] },
    annotations: { ipa: '', stressed: 'I GET UP at SIX | and usually EAT an APPLE | before I LEAVE for SCHOOL.', linking: 'I ge(t)‿up‿at six‿and usually ea(t)‿an‿apple before I leave for school.', thoughtGroups: ['I get up at six', 'and usually eat an apple', 'before I leave for school'], notes: ['Keep final /t/ audible before the vowel.', 'Reduce “and” to /ən/ in natural speech.'], intonation: 'Gentle falling tone at the end.' },
    activities: [
      { id: uid('act'), type: 'Minimal-pair discrimination', title: 'Hear the link', instruction: 'Choose the phrase you hear.', items: ['get up / get cup', 'eat an apple / eat a napple'] },
      { id: uid('act'), type: 'Shadowing', title: 'Thought-group shadowing', instruction: 'Listen, pause, repeat, then shadow without pausing.', items: ['I get up at six', 'and usually eat an apple', 'before I leave for school'] },
    ],
    aiFeedback: { summary: '', strengths: [], priorities: [], unclearWords: [], remediation: [], scores: {} },
    customAiRequest: '', assignments: [], versions: [], recordings: [], stage: 'draft', updatedAt: Date.now(), createdAt: Date.now(),
  };
}

function SectionHeader({ number, eyebrow, title, desc, action }) {
  return <header className="pc-card-head"><div className="pc-number">{number}</div><div><span>{eyebrow}</span><h2>{title}</h2><p>{desc}</p></div>{action ? <div className="pc-card-action">{action}</div> : null}</header>;
}
function Field({ label, children, className = '' }) { return <label className={`pc-field ${className}`}><span>{label}</span>{children}</label>; }
function Metric({ icon, label, value, tone = '' }) { return <div className={`pc-metric ${tone}`}><i>{icon}</i><div><span>{label}</span><strong>{value}</strong></div></div>; }
function normalizeArray(value) { if (Array.isArray(value)) return value.map((item) => typeof item === 'string' ? item : item?.text || item?.title || item?.detail || JSON.stringify(item)).filter(Boolean); return lines(value); }

function buildPackText(project, includeTeacher = true) {
  const activities = (project.activities || []).map((item, index) => `${index + 1}. ${item.type} — ${item.title}\n${item.instruction}\n${(item.items || []).map((entry) => `- ${entry}`).join('\n')}`).join('\n\n');
  const teacher = includeTeacher ? `\n\nTEACHER NOTES\nIPA: ${project.annotations.ipa || '(not added)'}\nStress: ${project.annotations.stressed}\nLinking: ${project.annotations.linking}\nThought groups: ${(project.annotations.thoughtGroups || []).join(' | ')}\nNotes: ${(project.annotations.notes || []).join('; ')}\nAI feedback: ${project.aiFeedback.summary || '(not analysed)'}` : '';
  return `${project.title}\n\nPRACTICE PROFILE\nMode: ${project.mode}\nFocus: ${project.focus}${project.customFocus ? ` — ${project.customFocus}` : ''}\nLevel: ${project.level}\nAccent: ${project.accent === 'en-GB' ? 'British English' : 'American English'}\nDuration: ${project.duration} minutes\nTopic: ${project.topic}\n\nTARGET TEXT\n${project.targetText}\n\nWORD LIST\n${project.wordList.map((item) => `- ${item}`).join('\n')}\n\nPRACTICE ACTIVITIES\n${activities}${teacher}`;
}

function buildAiPrompt(taskId, project, speechTranscript = '') {
  const payload = {
    mode: project.mode, focus: project.focus, customFocus: project.customFocus, grade: project.grade, level: project.level,
    accent: project.accent, topic: project.topic, learnerNotes: project.learnerNotes, targetText: project.targetText,
    wordList: project.wordList, sourceText: String(project.sourceText || '').slice(0, 16000), blueprint: project.blueprint,
    annotations: project.annotations, activities: project.activities, speechTranscript, localSimilarity: speechTranscript ? similarity(project.targetText, speechTranscript) : null,
  };
  const tasks = {
    generate: 'Create a classroom-ready pronunciation practice pack. Return activities array, wordList array, targetText string and optional teacherNotes array.',
    annotate: 'Annotate the target text. Return annotations with ipa, stressed, linking, thoughtGroups array, notes array and intonation.',
    analyse: 'Analyse intelligibility using the target text and speech transcript. Do not claim phoneme-level precision. Return feedback with summary, strengths, priorities, unclearWords, remediation, and scores for intelligibility, finalSounds, wordStress, rhythm and fluency (0-100).',
    'final-sounds': 'Focus on final consonants and clusters. Return feedback and remediation activities suitable for the learner.',
    stress: 'Focus on word stress, sentence stress and prominence. Return annotations plus feedback and practice drills.',
    rhythm: 'Focus on weak forms, schwa, pausing, thought groups and rhythm. Return annotations plus feedback and practice drills.',
    remediation: 'Create a 7-day, 5-10 minute daily remediation plan from the learner profile and any available transcript. Return remediation array with day, focus, drill, target and successCheck.',
    custom: `Complete this request: ${project.customAiRequest || 'Improve this pronunciation pack while keeping it practical.'}. Return customResult with summary, suggestions and any revised targetText/activities/annotations.`,
  };
  return `You are Brian Speech Coach, an expert pronunciation teacher for Vietnamese upper-secondary learners. Default to ${project.accent === 'en-GB' ? 'British' : 'American'} English. Be honest about evidence: a browser speech-to-text transcript measures intelligibility, not exact phoneme accuracy. Never invent acoustic measurements. Return strict JSON only.\n\nPROJECT:\n${JSON.stringify(payload, null, 2)}\n\nTASK:\n${tasks[taskId]}`;
}

export default function PronunciationCoach({ language = 'vi', apiKey = '', aiModel = '', hasApiKey = false, currentUser }) {
  const [project, setProject] = useState(() => typeof window === 'undefined' ? defaultProject() : readJson(projectKey(currentUser), defaultProject()));
  const [vault, setVault] = useState(() => typeof window === 'undefined' ? [] : readJson(vaultKey(currentUser), []));
  const [activeStep, setActiveStep] = useState('01');
  const [activeFocusGroup, setActiveFocusGroup] = useState('Vowels');
  const [activeModelTab, setActiveModelTab] = useState('model');
  const [aiLoading, setAiLoading] = useState('');
  const [aiError, setAiError] = useState('');
  const [aiResult, setAiResult] = useState(null);
  const [showAi, setShowAi] = useState(false);
  const [showVault, setShowVault] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const [pendingTransfer, setPendingTransfer] = useState(() => typeof window === 'undefined' ? null : listTransfers(currentUser, 'pronunciation-coach').find((item) => item.status === 'pending') || null);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordingUrl, setRecordingUrl] = useState('');
  const [speechTranscript, setSpeechTranscript] = useState('');
  const [speechError, setSpeechError] = useState('');
  const [speechNotice, setSpeechNotice] = useState('');
  const [recordingMimeType, setRecordingMimeType] = useState('audio/webm');
  const [modelPlaying, setModelPlaying] = useState(false);
  const [selectedRecordingId, setSelectedRecordingId] = useState('');
  const [assignmentTarget, setAssignmentTarget] = useState('Cả lớp');
  const [assignmentDue, setAssignmentDue] = useState('');
  const recordingSecondsRef = useRef(0);
  const speechTranscriptRef = useRef('');
  const fileRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const chunksRef = useRef([]);
  const recognitionRef = useRef(null);
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);
  const audioContextRef = useRef(null);
  const providerConfig = useMemo(() => getActiveAiConfig(), [hasApiKey, apiKey, aiModel, aiLoading]);
  const providerInfo = useMemo(() => getProviderInfo(providerConfig?.provider), [providerConfig?.provider]);
  const latestRecording = useMemo(() => project.recordings.find((item) => item.id === selectedRecordingId) || project.recordings[0] || null, [project.recordings, selectedRecordingId]);
  const localScore = useMemo(() => {
    if (speechTranscript.trim()) return similarity(project.targetText, speechTranscript);
    const aiValue = Number(project.aiFeedback?.scores?.intelligibility);
    return Number.isFinite(aiValue) && aiValue > 0 ? aiValue : null;
  }, [speechTranscript, project.targetText, project.aiFeedback]);

  useEffect(() => {
    const saved = readJson(projectKey(currentUser), null); if (saved?.id) setProject(saved);
    setVault(readJson(vaultKey(currentUser), []));
    setPendingTransfer(listTransfers(currentUser, 'pronunciation-coach').find((item) => item.status === 'pending') || null);
  }, [currentUser?.id, currentUser?.email]);

  useEffect(() => {
    const id = window.setTimeout(() => { try { window.localStorage.setItem(projectKey(currentUser), JSON.stringify({ ...project, updatedAt: Date.now(), recordings: project.recordings.map(({ audioUrl, ...entry }) => entry) })); } catch { /* optional */ } }, 350);
    return () => window.clearTimeout(id);
  }, [project, currentUser?.id, currentUser?.email]);

  useEffect(() => {
    const onApply = (event) => { const item = event.detail; if (!item || item.target !== 'pronunciation-coach') return; setProject((current) => ({ ...current, sourceText: item.content || '', sourceName: item.title || 'Transfer Inbox', sourceKind: item.type || 'transfer', updatedAt: Date.now() })); setPendingTransfer(item); };
    window.addEventListener(TRANSFER_APPLY_EVENT, onApply); return () => window.removeEventListener(TRANSFER_APPLY_EVENT, onApply);
  }, []);

  useEffect(() => {
    recordingSecondsRef.current = recordingSeconds;
  }, [recordingSeconds]);

  useEffect(() => {
    speechTranscriptRef.current = speechTranscript;
  }, [speechTranscript]);

  useEffect(() => {
    if (!isRecording) return undefined;
    const timer = window.setInterval(() => setRecordingSeconds((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [isRecording]);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    recognitionRef.current?.stop?.();
    mediaStreamRef.current?.getTracks?.().forEach((track) => track.stop());
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    audioContextRef.current?.close?.();
    if (recordingUrl) URL.revokeObjectURL(recordingUrl);
  }, []);

  const patch = (next) => setProject((current) => ({ ...current, ...(typeof next === 'function' ? next(current) : next), updatedAt: Date.now() }));
  const patchBlueprint = (next) => patch((current) => ({ blueprint: { ...current.blueprint, ...next } }));
  const scrollToCard = (step, id) => { setActiveStep(step); document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  const handleFile = async (file) => {
    if (!file) return; setAiError('');
    try { const ext = file.name.split('.').pop()?.toLowerCase(); const buffer = await file.arrayBuffer(); let text = ''; if (ext === 'docx') text = await readDocxTextFromBuffer(buffer); else if (ext === 'pdf') text = await readPdfTextFromBuffer(buffer); else text = await file.text(); patch({ sourceText: text.slice(0, 120000), sourceName: file.name }); }
    catch (error) { setAiError(error.message || 'Không thể đọc file.'); }
  };

  const applyTransfer = () => {
    if (!pendingTransfer) return; patch({ sourceText: pendingTransfer.content || '', sourceName: pendingTransfer.title || 'Transfer Inbox', sourceKind: pendingTransfer.type || 'transfer' }); updateTransfer(currentUser, pendingTransfer.id, { status: 'applied', appliedAt: Date.now() }); setPendingTransfer(null);
  };

  const playModel = (text = project.targetText, rate = project.blueprint.modelRate) => {
    if (!window.speechSynthesis) { setSpeechError('Trình duyệt không hỗ trợ Speech Synthesis.'); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text); utterance.lang = project.accent; utterance.rate = Number(rate || 0.85); utterance.pitch = 1;
    const voices = window.speechSynthesis.getVoices(); const voice = voices.find((item) => item.lang?.toLowerCase().startsWith(project.accent.toLowerCase())) || voices.find((item) => item.lang?.startsWith(project.accent.split('-')[0])); if (voice) utterance.voice = voice;
    utterance.onstart = () => setModelPlaying(true); utterance.onend = () => setModelPlaying(false); utterance.onerror = () => { setModelPlaying(false); setSpeechError('Không thể phát mẫu trên trình duyệt này.'); };
    window.speechSynthesis.speak(utterance);
  };

  const drawWaveform = () => {
    const analyser = analyserRef.current; const canvas = canvasRef.current; if (!analyser || !canvas) return;
    const ctx = canvas.getContext('2d'); const buffer = new Uint8Array(analyser.frequencyBinCount);
    const render = () => {
      analyser.getByteTimeDomainData(buffer); ctx.clearRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#eef4ff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.lineWidth = 3; ctx.strokeStyle = '#6c5ce7'; ctx.beginPath();
      const step = canvas.width / buffer.length; buffer.forEach((value, index) => { const y = (value / 128) * canvas.height / 2; const x = index * step; if (index === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y); }); ctx.stroke(); animationRef.current = requestAnimationFrame(render);
    }; render();
  };

  const startRecognition = () => {
    const recognition = createSpeechRecognition({
      language: project.accent,
      continuous: true,
      interimResults: true,
      onStart: () => setSpeechNotice('Đang tạo transcript tự động…'),
      onResult: (event) => {
        let finalText = ''; let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i += 1) {
          const piece = event.results[i][0]?.transcript || '';
          if (event.results[i].isFinal) finalText += `${piece} `; else interimText += `${piece} `;
        }
        const nextText = finalText.trim();
        if (nextText) setSpeechTranscript((current) => `${current} ${nextText}`.replace(/\s+/g, ' ').trim());
        else if (interimText.trim()) setSpeechNotice(`Đang nghe: ${interimText.trim().slice(0, 90)}`);
      },
      onEnd: () => setSpeechNotice((current) => current === 'Đang tạo transcript tự động…' ? '' : current),
      onError: ({ code }) => {
        if (code === 'aborted') return;
        setSpeechNotice(speechRecognitionMessage(code, 'vi'));
      },
    });
    if (!recognition) {
      setSpeechNotice('Trình duyệt không hỗ trợ transcript tự động. Ghi âm vẫn hoạt động; có thể nhập transcript thủ công.');
      return;
    }
    try { recognitionRef.current = recognition; recognition.start(); }
    catch { setSpeechNotice('Không thể khởi động transcript tự động. Ghi âm vẫn hoạt động bình thường.'); }
  };

  const startRecording = async () => {
    setSpeechError(''); setSpeechNotice(''); setSpeechTranscript(''); setRecordingSeconds(0); chunksRef.current = [];
    const support = getMicrophoneSupport();
    if (!support.mediaRecorder) { setSpeechError('Trình duyệt chưa hỗ trợ MediaRecorder. Hãy dùng Chrome, Edge hoặc Safari mới nhất.'); return; }
    try {
      const stream = await requestMicrophoneStream(); mediaStreamRef.current = stream;
      const recorder = createMediaRecorder(stream, {
        onData: (event) => { if (event.data?.size) chunksRef.current.push(event.data); },
        onError: (event) => setSpeechError(describeMediaError(event?.error || event, 'vi')),
        onStop: () => {
          const mimeType = recorder.mimeType || support.mimeType || 'audio/webm';
          const blob = new Blob(chunksRef.current, { type: mimeType });
          const url = URL.createObjectURL(blob);
          if (recordingUrl) URL.revokeObjectURL(recordingUrl);
          setRecordingMimeType(blob.type || mimeType); setRecordingUrl(url);
          const transcript = speechTranscriptRef.current;
          const duration = Math.max(1, recordingSecondsRef.current);
          const entry = { id: uid('recording'), createdAt: Date.now(), duration, transcript, score: transcript ? similarity(project.targetText, transcript) : 0, mimeType: blob.type || mimeType, audioUrl: url };
          patch((current) => ({ recordings: [entry, ...(current.recordings || [])].slice(0, 20), stage: 'submitted' })); setSelectedRecordingId(entry.id);
          setSpeechNotice(transcript ? 'Đã lưu bản ghi và transcript.' : 'Đã lưu bản ghi thành công. Transcript tự động chưa có; có thể nhập thủ công để chạy AI phân tích.');
          stopStream(stream); mediaStreamRef.current = null;
        },
      });
      mediaRecorderRef.current = recorder;
      const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
      if (AudioContextCtor) {
        const context = new AudioContextCtor(); audioContextRef.current = context;
        const source = context.createMediaStreamSource(stream); const analyser = context.createAnalyser(); analyser.fftSize = 2048; source.connect(analyser); analyserRef.current = analyser; drawWaveform();
      }
      recorder.start(250); setIsRecording(true); setSpeechNotice('Micro đã sẵn sàng. Bản ghi được lưu cục bộ trong trình duyệt.'); startRecognition();
    } catch (error) { setSpeechError(describeMediaError(error, 'vi')); stopStream(mediaStreamRef.current); mediaStreamRef.current = null; }
  };

  const stopRecording = () => {
    if (!isRecording) return;
    setIsRecording(false);
    try { recognitionRef.current?.stop?.(); } catch { /* optional transcript */ }
    const recorder = mediaRecorderRef.current;
    try { if (recorder?.state === 'recording') recorder.requestData?.(); } catch { /* optional */ }
    try { if (recorder?.state && recorder.state !== 'inactive') recorder.stop(); else stopStream(mediaStreamRef.current); } catch { stopStream(mediaStreamRef.current); }
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    try { audioContextRef.current?.close?.(); } catch { /* optional */ }
  };

  const runAiTask = async (taskId) => {
    const keyAvailable = String(apiKey || providerConfig?.apiKey || '').trim();
    if (!keyAvailable) { setAiError('Chưa cấu hình API key trong Cài đặt AI của Brian.'); setShowAi(true); return; }
    if (taskId === 'custom' && !project.customAiRequest.trim()) { setAiError('Hãy nhập yêu cầu riêng trước khi chạy AI.'); setShowAi(true); return; }
    if (taskId === 'analyse' && !speechTranscript.trim() && !latestRecording?.transcript) { setAiError('Hãy ghi âm hoặc nhập transcript trước khi phân tích.'); setShowAi(true); return; }
    setAiLoading(taskId); setAiError(''); setAiResult(null); setShowAi(true);
    try {
      const raw = await runAITask('pronunciation.coach', { apiKey, model: aiModel, prompt: buildAiPrompt(taskId, project, speechTranscript || latestRecording?.transcript || ''), systemInstruction: 'You are an evidence-aware pronunciation coach. Return strict JSON. Distinguish intelligibility checks from phoneme-level assessment.', temperature: taskId === 'analyse' ? 0.25 : 0.55, responseMimeType: 'application/json', maxOutputTokens: 5200, governanceProfile: 'teacher-content-creation', loadingLabel: `Speech Coach · ${AI_TASKS.find((task) => task.id === taskId)?.title || taskId}` });
      let parsed; try { parsed = extractJson(raw); } catch { parsed = { raw }; } setAiResult({ taskId, raw, parsed, createdAt: Date.now() });
    } catch (error) { setAiError(error.message || 'AI không phản hồi.'); }
    finally { setAiLoading(''); }
  };

  const applyAiResult = () => {
    if (!aiResult) return; const { taskId, parsed } = aiResult;
    if (taskId === 'generate') patch({ activities: Array.isArray(parsed.activities) ? parsed.activities.map((item) => ({ id: item.id || uid('act'), type: item.type || 'Practice', title: item.title || item.type || 'Activity', instruction: item.instruction || '', items: normalizeArray(item.items) })) : project.activities, wordList: normalizeArray(parsed.wordList || project.wordList), targetText: parsed.targetText || project.targetText });
    if (['annotate', 'stress', 'rhythm'].includes(taskId)) patch({ annotations: { ...project.annotations, ...(parsed.annotations || parsed) } });
    if (['analyse', 'final-sounds'].includes(taskId)) patch({ aiFeedback: parsed.feedback || parsed, stage: 'ai-analysed' });
    if (taskId === 'remediation') patch({ aiFeedback: { ...project.aiFeedback, remediation: normalizeArray(parsed.remediation || parsed.plan || parsed) } });
    if (taskId === 'custom') { const value = parsed.customResult || parsed; patch({ targetText: value.revisedTargetText || value.targetText || project.targetText, activities: Array.isArray(value.activities) ? value.activities.map((item) => ({ ...item, id: item.id || uid('act') })) : project.activities, annotations: value.annotations ? { ...project.annotations, ...value.annotations } : project.annotations }); }
    setShowAi(false); setAiResult(null);
  };

  const saveVersion = () => { const version = { id: uid('version'), label: `Version · ${new Date().toLocaleString('vi-VN')}`, project: { ...project, recordings: project.recordings.map(({ audioUrl, ...entry }) => entry) }, createdAt: Date.now() }; patch((current) => ({ versions: [version, ...(current.versions || [])].slice(0, 25) })); setShowVersions(true); };
  const restoreVersion = (version) => { setProject({ ...version.project, id: project.id, versions: project.versions, updatedAt: Date.now() }); setShowVersions(false); };
  const saveToVault = () => { const entry = { ...project, id: uid('vault'), savedAt: Date.now(), recordings: project.recordings.map(({ audioUrl, ...recording }) => recording) }; const next = [entry, ...vault].slice(0, 50); setVault(next); try { window.localStorage.setItem(vaultKey(currentUser), JSON.stringify(next)); } catch { /* optional */ } addHistoryEntry({ sourceApp: 'pronunciation-coach', sourceAppTitle: 'Pronunciation Coach', title: project.title, content: buildPackText(project, true), tags: [project.focus, project.level, project.accent] }); };
  const loadVault = (entry) => { setProject({ ...entry, id: uid('pronunciation'), recordings: entry.recordings || [], updatedAt: Date.now() }); setShowVault(false); };

  const sendTo = (destination) => {
    const payload = { schema: 'bes-pronunciation-pack/1.0', title: project.title, mode: project.mode, focus: project.focus, level: project.level, accent: project.accent, targetText: project.targetText, wordList: project.wordList, blueprint: project.blueprint, annotations: project.annotations, activities: project.activities, feedback: project.aiFeedback, assignment: { target: assignmentTarget, due: assignmentDue } };
    createTransfer(currentUser, { type: 'pronunciation-pack', title: project.title, sourceApp: 'pronunciation-coach', sourceTitle: 'Pronunciation Coach', target: destination.id, content: JSON.stringify(payload, null, 2), metadata: { schema: payload.schema, focus: project.focus, level: project.level, accent: project.accent } }); window.location.hash = destination.route;
  };

  const createAssignment = () => {
    const assignment = { id: uid('assignment'), target: assignmentTarget, due: assignmentDue, createdAt: Date.now(), title: project.title, attempts: project.blueprint.recordingAttempts, listenLimit: project.blueprint.listenLimit };
    patch((current) => ({ assignments: [assignment, ...(current.assignments || [])], stage: 'assigned' })); addHistoryEntry({ sourceApp: 'pronunciation-coach', sourceAppTitle: 'Pronunciation Coach', title: `Giao bài: ${project.title}`, content: JSON.stringify(assignment, null, 2), tags: ['assignment', project.focus, assignmentTarget] });
  };

  const focusItems = FOCUS_GROUPS.find((group) => group.label === activeFocusGroup)?.items || [];

  return (
    <div className="pc-app bui-workbench" data-ui="workbench" data-workbench="pronunciation-coach">
      <header className="pc-product-bar bui-workbench-header">
        <button type="button" className="pc-back" onClick={() => window.history.back()}>← Quay lại</button>
        <div className="pc-brand"><i>PC</i><div><span>PRONUNCIATION COACH · V2.0</span><input value={project.title} onChange={(event) => patch({ title: event.target.value })} /></div></div>
        <div className="pc-product-actions"><span className="pc-autosave">● Tự động lưu</span><b>{project.activities.length} activities</b><b>{localScore || 0}/100</b><button type="button" onClick={() => scrollToCard('04', 'pc-card-blueprint')}>Blueprint</button><button type="button" onClick={() => scrollToCard('06', 'pc-card-review')}>Review</button><button type="button" onClick={() => setShowVersions(true)}>Versions</button><button type="button" className="primary" onClick={() => scrollToCard('07', 'pc-card-publish')}>Assign & Publish</button></div>
      </header>

      <section className="pc-summary bui-workbench-metrics">
        <Metric icon="◎" label="Trọng tâm" value={project.focus} tone="violet" /><Metric icon="US" label="Accent" value={project.accent === 'en-GB' ? 'British English' : 'American English'} tone="blue" /><Metric icon="▦" label="Practice items" value={`${project.blueprint.itemCount} mục`} tone="teal" /><Metric icon="◷" label="Thời lượng" value={`${project.duration} phút`} tone="amber" /><Metric icon="↻" label="Cập nhật" value={new Date(project.updatedAt || Date.now()).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })} tone="pink" />
      </section>

      <nav className="pc-workflow bui-workbench-workflow">{WORKFLOW.map(([step, label, id]) => <button type="button" key={step} className={activeStep === step ? 'active' : ''} onClick={() => scrollToCard(step, id)}><i>{step}</i><span>{label}</span></button>)}</nav>

      {pendingTransfer ? <aside className="pc-transfer"><div><strong>Nội dung từ {pendingTransfer.sourceTitle || pendingTransfer.sourceApp}</strong><span>{pendingTransfer.title}</span></div><button type="button" onClick={applyTransfer}>Dùng nội dung</button><button type="button" onClick={() => { updateTransfer(currentUser, pendingTransfer.id, { status: 'dismissed' }); setPendingTransfer(null); }}>Bỏ qua</button></aside> : null}

      <section className="pc-setup-grid bui-workbench-canvas">
        <article id="pc-card-mode" className="pc-card pc-card-mode">
          <SectionHeader number="01" eyebrow="PRACTICE MODE" title="Chọn mục đích luyện tập" desc="Mỗi chế độ thay đổi blueprint và workspace phía sau." />
          <div className="pc-mode-grid">{PRACTICE_MODES.map((item) => <button type="button" key={item.id} className={project.mode === item.id ? 'active' : ''} onClick={() => patch({ mode: item.id })}><i>{item.icon}</i><span><strong>{item.title}</strong><small>{item.desc}</small></span><b>{project.mode === item.id ? '✓' : '○'}</b></button>)}</div>
        </article>

        <article id="pc-card-focus" className="pc-card pc-card-focus">
          <SectionHeader number="02" eyebrow="PRONUNCIATION FOCUS" title="Xác định trọng tâm" desc="Chọn âm, prosody hoặc connected speech cần luyện." />
          <div className="pc-focus-tabs">{FOCUS_GROUPS.map((group) => <button type="button" key={group.label} className={activeFocusGroup === group.label ? 'active' : ''} onClick={() => setActiveFocusGroup(group.label)}>{group.label}</button>)}</div>
          <div className="pc-focus-options">{focusItems.map((item) => <button type="button" key={item} className={project.focus === item ? 'active' : ''} onClick={() => patch({ focus: item })}><span>{item}</span><b>{project.focus === item ? '✓' : '+'}</b></button>)}</div>
          <Field label="Yêu cầu cụ thể khác"><textarea rows={4} value={project.customFocus} onChange={(event) => patch({ customFocus: event.target.value })} placeholder="Ví dụ: Luyện âm cuối trong câu kể, tốc độ chậm, giọng Mỹ và dùng từ Unit 3…" /></Field>
        </article>

        <article id="pc-card-learner" className="pc-card pc-card-learner">
          <SectionHeader number="03" eyebrow="LEARNER & CONTEXT" title="Thiết lập người học" desc="Điều chỉnh accent, trình độ, thời lượng và hình thức luyện." />
          <div className="pc-field-grid"><Field label="Khối"><select value={project.grade} onChange={(event) => patch({ grade: event.target.value })}><option>10</option><option>11</option><option>12</option></select></Field><Field label="CEFR"><select value={project.level} onChange={(event) => patch({ level: event.target.value })}><option>A2</option><option>B1</option><option>B1-B2</option><option>B2</option><option>B2-C1</option></select></Field><Field label="Accent"><select value={project.accent} onChange={(event) => patch({ accent: event.target.value })}><option value="en-US">American English</option><option value="en-GB">British English</option></select></Field><Field label="Thời lượng"><input type="number" min="5" max="180" value={project.duration} onChange={(event) => patch({ duration: Number(event.target.value) || 5 })} /></Field><Field label="Unit"><input value={project.unit} onChange={(event) => patch({ unit: event.target.value })} /></Field><Field label="Chủ đề"><input value={project.topic} onChange={(event) => patch({ topic: event.target.value })} /></Field><Field label="Tổ chức"><select value={project.grouping} onChange={(event) => patch({ grouping: event.target.value })}><option>Individual</option><option>Pair work</option><option>Whole class</option><option>Individual + Pair</option></select></Field><Field label="Hình thức"><select value={project.delivery} onChange={(event) => patch({ delivery: event.target.value })}><option>In class</option><option>Online</option><option>Blended</option></select></Field></div>
          <Field label="Đặc điểm lớp học"><textarea rows={5} value={project.learnerNotes} onChange={(event) => patch({ learnerNotes: event.target.value })} /></Field>
        </article>

        <article id="pc-card-source" className="pc-card pc-card-source">
          <SectionHeader number="04" eyebrow="SOURCE & INPUT" title="Nội dung đầu vào" desc="Nhập word list, câu, dialogue, đoạn đọc hoặc nhận từ ứng dụng khác." />
          <div className="pc-source-actions"><select value={project.sourceKind} onChange={(event) => patch({ sourceKind: event.target.value })}><option value="words">Word list</option><option value="sentences">Sentences</option><option value="dialogue">Dialogue</option><option value="reading">Reading passage</option><option value="diagnostic">Diagnostic transcript</option><option value="transfer">Transfer Inbox</option></select><button type="button" onClick={() => fileRef.current?.click()}>↑ Upload DOCX / PDF / TXT</button><input ref={fileRef} hidden type="file" accept=".docx,.pdf,.txt,.md" onChange={(event) => handleFile(event.target.files?.[0])} /><button type="button" onClick={() => patch({ sourceText: '', sourceName: '' })}>Xóa nguồn</button></div>
          <Field label={project.sourceName ? `${project.sourceName} · ${project.sourceText.length.toLocaleString()} ký tự` : 'Manual input / Transfer Inbox'}><textarea rows={12} value={project.sourceText} onChange={(event) => patch({ sourceText: event.target.value })} placeholder="Dán từ, câu, dialogue hoặc reading passage…" /></Field>
          <Field label="Target text chính"><textarea rows={4} value={project.targetText} onChange={(event) => patch({ targetText: event.target.value })} /></Field>
        </article>

        <article id="pc-card-blueprint" className="pc-card pc-card-blueprint">
          <SectionHeader number="05" eyebrow="PRACTICE BLUEPRINT" title="Thiết kế cấu trúc bài luyện" desc="Kiểm soát dạng hoạt động, tốc độ mẫu, lượt nghe và ghi âm." action={<button type="button" onClick={() => runAiTask('generate')}>✦ AI tạo blueprint</button>} />
          <div className="pc-blueprint-metrics"><Field label="Số mục"><input type="number" min="4" max="100" value={project.blueprint.itemCount} onChange={(event) => patchBlueprint({ itemCount: Number(event.target.value) || 4 })} /></Field><Field label="Tốc độ mẫu"><input type="number" min="0.5" max="1.3" step="0.05" value={project.blueprint.modelRate} onChange={(event) => patchBlueprint({ modelRate: Number(event.target.value) || 0.85 })} /></Field><Field label="Lượt nghe"><input type="number" min="1" max="10" value={project.blueprint.listenLimit} onChange={(event) => patchBlueprint({ listenLimit: Number(event.target.value) || 1 })} /></Field><Field label="Lần ghi âm"><input type="number" min="1" max="20" value={project.blueprint.recordingAttempts} onChange={(event) => patchBlueprint({ recordingAttempts: Number(event.target.value) || 1 })} /></Field></div>
          <div className="pc-activity-chips">{ACTIVITY_TYPES.map((item) => { const active = project.blueprint.activities.includes(item); return <button type="button" key={item} className={active ? 'active' : ''} onClick={() => patchBlueprint({ activities: active ? project.blueprint.activities.filter((entry) => entry !== item) : [...project.blueprint.activities, item] })}>{active ? '✓ ' : '+ '}{item}</button>; })}</div>
          <div className="pc-toggle-grid">{[['showIpa', 'Hiện IPA'], ['showStress', 'Hiện stress'], ['showLinking', 'Hiện linking'], ['showThoughtGroups', 'Thought groups'], ['transcript', 'Transcript'], ['lockReplay', 'Khóa nghe lại']].map(([key, label]) => <label key={key}><input type="checkbox" checked={Boolean(project.blueprint[key])} onChange={(event) => patchBlueprint({ [key]: event.target.checked })} /><span>{label}</span></label>)}</div>
        </article>

        <article id="pc-card-ai" className="pc-card pc-card-ai">
          <SectionHeader number="07" eyebrow="AI SPEECH COACH" title="AI theo tác vụ chuyên môn" desc="AI tạo, chú thích và phân tích; không giả vờ chấm phoneme nếu chỉ có transcript." action={<div className="pc-ai-state"><span className={hasApiKey || providerConfig?.apiKey ? 'ready' : ''}>● {hasApiKey || providerConfig?.apiKey ? 'AI thật đang bật' : 'Chưa cấu hình AI'}</span><small>{providerInfo?.label || 'AI Provider'} · {providerConfig?.model || aiModel || 'No model'}</small></div>} />
          <div className="pc-ai-grid">{AI_TASKS.map((task) => <button type="button" key={task.id} disabled={Boolean(aiLoading)} onClick={() => runAiTask(task.id)}><i>{task.icon}</i><span><strong>{task.title}</strong><small>{task.desc}</small></span><b>{aiLoading === task.id ? '…' : '○'}</b></button>)}</div>
          <Field label="Yêu cầu riêng"><textarea rows={3} value={project.customAiRequest} onChange={(event) => patch({ customAiRequest: event.target.value })} placeholder="Ví dụ: Tạo 8 câu luyện /θ/ và /t/ theo chủ đề môi trường, có thought groups…" /></Field>
        </article>
      </section>

      <article id="pc-card-model" className="pc-card pc-card-model full-width">
        <SectionHeader number="06" eyebrow="MODEL & VISUALISATION STUDIO" title="Nghe mẫu và nhìn cấu trúc phát âm" desc="Nghe theo tốc độ, thought group và chú thích IPA, stress, linking, intonation." action={<div className="pc-model-actions"><button type="button" onClick={() => playModel()}>{modelPlaying ? 'Đang phát…' : '▶ Nghe mẫu'}</button><button type="button" onClick={() => window.speechSynthesis?.cancel()}>■ Dừng</button><button type="button" onClick={() => runAiTask('annotate')}>✦ AI chú thích</button></div>} />
        <div className="pc-model-tabs">{[['model', 'Model Player'], ['visual', 'Visualisation'], ['activities', 'Practice Activities']].map(([id, label]) => <button type="button" key={id} className={activeModelTab === id ? 'active' : ''} onClick={() => setActiveModelTab(id)}>{label}</button>)}</div>
        {activeModelTab === 'model' ? <div className="pc-model-layout"><section className="pc-player"><div className="pc-target-text">{project.targetText}</div><div className="pc-player-controls"><button type="button" onClick={() => playModel(project.targetText, 0.65)}>0.65×</button><button type="button" onClick={() => playModel(project.targetText, project.blueprint.modelRate)} className="primary">{project.blueprint.modelRate}×</button><button type="button" onClick={() => playModel(project.targetText, 1.05)}>1.05×</button></div><div className="pc-thought-groups">{(project.annotations.thoughtGroups || []).map((item, index) => <button type="button" key={`${item}-${index}`} onClick={() => playModel(item)}><span>{index + 1}</span>{item}</button>)}</div></section><section className="pc-word-list"><h3>Target words & phrases</h3><textarea rows={12} value={(project.wordList || []).join('\n')} onChange={(event) => patch({ wordList: lines(event.target.value) })} /><button type="button" onClick={() => playModel(project.wordList.join('. '))}>▶ Nghe toàn bộ</button></section></div> : null}
        {activeModelTab === 'visual' ? <div className="pc-visual-grid"><div><span>IPA</span><textarea rows={4} value={project.annotations.ipa} onChange={(event) => patch({ annotations: { ...project.annotations, ipa: event.target.value } })} placeholder="AI hoặc giáo viên thêm IPA…" /></div><div><span>Stress & prominence</span><textarea rows={4} value={project.annotations.stressed} onChange={(event) => patch({ annotations: { ...project.annotations, stressed: event.target.value } })} /></div><div><span>Linking / reduction</span><textarea rows={4} value={project.annotations.linking} onChange={(event) => patch({ annotations: { ...project.annotations, linking: event.target.value } })} /></div><div><span>Intonation</span><textarea rows={4} value={project.annotations.intonation} onChange={(event) => patch({ annotations: { ...project.annotations, intonation: event.target.value } })} /></div><div className="wide"><span>Teacher notes</span><textarea rows={5} value={(project.annotations.notes || []).join('\n')} onChange={(event) => patch({ annotations: { ...project.annotations, notes: lines(event.target.value) } })} /></div></div> : null}
        {activeModelTab === 'activities' ? <div className="pc-activity-list">{project.activities.map((activity, index) => <article key={activity.id}><header><i>{String(index + 1).padStart(2, '0')}</i><div><span>{activity.type}</span><input value={activity.title} onChange={(event) => patch((current) => ({ activities: current.activities.map((item) => item.id === activity.id ? { ...item, title: event.target.value } : item) }))} /></div><button type="button" onClick={() => patch((current) => ({ activities: current.activities.filter((item) => item.id !== activity.id) }))}>×</button></header><textarea rows={3} value={activity.instruction} onChange={(event) => patch((current) => ({ activities: current.activities.map((item) => item.id === activity.id ? { ...item, instruction: event.target.value } : item) }))} /><textarea rows={5} value={(activity.items || []).join('\n')} onChange={(event) => patch((current) => ({ activities: current.activities.map((item) => item.id === activity.id ? { ...item, items: lines(event.target.value) } : item) }))} /></article>)}</div> : null}
      </article>

      <article id="pc-card-review" className="pc-card pc-card-review full-width">
        <SectionHeader number="08" eyebrow="RECORDER & PERFORMANCE REVIEW" title="Ghi âm, so sánh và sửa lỗi" desc="Bản ghi + transcript đánh giá intelligibility. Chấm phoneme chuyên sâu cần dịch vụ chuyên dụng." action={<div className="pc-review-actions"><button type="button" onClick={saveVersion}>Lưu phiên bản</button><button type="button" onClick={() => runAiTask('analyse')}>✦ AI phân tích</button></div>} />
        <div className="pc-recorder-layout">
          <section className="pc-recorder-pane">
            <div className={`pc-record-orb ${isRecording ? 'recording' : ''}`}><span>{isRecording ? '●' : '🎙'}</span><strong>{formatDuration(recordingSeconds)}</strong></div>
            <canvas ref={canvasRef} width="720" height="150" />
            <div className="pc-recorder-controls"><button type="button" className="primary" onClick={isRecording ? stopRecording : startRecording}>{isRecording ? '■ Dừng ghi âm' : '● Bắt đầu ghi âm'}</button><button type="button" onClick={() => playModel()}>▶ Nghe mẫu</button>{recordingUrl ? <a href={recordingUrl} download={`${project.title}.${extensionForMimeType(recordingMimeType)}`}>↓ Tải bản ghi</a> : null}</div>
            {recordingUrl ? <audio controls src={recordingUrl} /> : null}
            {speechError ? <p className="pc-error">⚠ {speechError}</p> : null}
            {speechNotice ? <p className="pc-recording-notice">ℹ {speechNotice}</p> : null}
            <Field label="Transcript nhận diện (Intelligibility check)"><textarea rows={6} value={speechTranscript} onChange={(event) => setSpeechTranscript(event.target.value)} placeholder="Speech-to-text transcript sẽ hiện tại đây nếu trình duyệt hỗ trợ…" /></Field>
          </section>
          <aside className="pc-performance-pane">
            <div className={`pc-score-ring ${localScore == null ? 'is-pending' : ''}`} style={{ '--score': `${localScore || 0}%` }}><strong>{localScore == null ? '—' : localScore}</strong><span>{localScore == null ? 'Awaiting transcript' : 'Intelligibility'}</span></div>
            <div className="pc-level-note"><b>Mức đánh giá hiện tại</b><strong>Level 2 · Speech-to-text comparison</strong><p>Điểm phản ánh mức người nghe/máy nhận ra nội dung, không phải độ chính xác từng âm vị.</p></div>
            <div className="pc-feedback-grid">{[['Final sounds', project.aiFeedback?.scores?.finalSounds || '—'], ['Word stress', project.aiFeedback?.scores?.wordStress || '—'], ['Rhythm', project.aiFeedback?.scores?.rhythm || '—'], ['Fluency', project.aiFeedback?.scores?.fluency || '—']].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
            <section className="pc-feedback-copy"><h3>AI / Teacher feedback</h3><p>{project.aiFeedback.summary || 'Chưa có phân tích AI. Ghi âm và chạy “AI phân tích”.'}</p><strong>Ưu tiên sửa</strong><ul>{normalizeArray(project.aiFeedback.priorities).map((item, index) => <li key={index}>{item}</li>)}</ul><strong>Bài sửa lỗi</strong><ul>{normalizeArray(project.aiFeedback.remediation).map((item, index) => <li key={index}>{typeof item === 'string' ? item : JSON.stringify(item)}</li>)}</ul></section>
            <div className="pc-recording-history"><h3>Lịch sử bản ghi</h3>{project.recordings.length ? project.recordings.map((item, index) => <button type="button" key={item.id} className={latestRecording?.id === item.id ? 'active' : ''} onClick={() => { setSelectedRecordingId(item.id); if (item.transcript) setSpeechTranscript(item.transcript); if (item.audioUrl) setRecordingUrl(item.audioUrl); }}><i>{index + 1}</i><span><strong>{new Date(item.createdAt).toLocaleString('vi-VN')}</strong><small>{formatDuration(item.duration || 0)} · {item.score || 0}%</small></span></button>) : <p>Chưa có bản ghi.</p>}</div>
          </aside>
        </div>
      </article>

      <article id="pc-card-publish" className="pc-card pc-card-publish full-width">
        <SectionHeader number="09" eyebrow="ASSIGN, PORTFOLIO & CONNECTED WORKFLOW" title="Giao bài, lưu trữ và kết nối" desc="Tạo bản học sinh/giáo viên, lưu Teacher Vault và gửi sang ứng dụng khác." action={<button type="button" className="primary" onClick={saveToVault}>Lưu Teacher Vault</button>} />
        <div className="pc-publish-layout">
          <section><h3>Giao bài luyện</h3><div className="pc-assignment-fields"><Field label="Đối tượng"><input value={assignmentTarget} onChange={(event) => setAssignmentTarget(event.target.value)} placeholder="Cả lớp / Nhóm / Học sinh…" /></Field><Field label="Hạn nộp"><input type="date" value={assignmentDue} onChange={(event) => setAssignmentDue(event.target.value)} /></Field></div><button type="button" className="primary" onClick={createAssignment}>＋ Tạo gói giao bài</button><p>{project.assignments.length} lần giao bài đã lưu trong dự án.</p></section>
          <section><h3>Xuất và lưu trữ</h3><div className="pc-export-grid"><button type="button" onClick={() => exportAsWord(`${project.title} — Student`, buildPackText(project, false))}><i>W</i><span><strong>Bản học sinh</strong><small>DOC · task và activities</small></span></button><button type="button" onClick={() => exportAsWord(`${project.title} — Teacher`, buildPackText(project, true))}><i>W+</i><span><strong>Bản giáo viên</strong><small>DOC · IPA và feedback</small></span></button><button type="button" onClick={() => exportAsHtml(project.title, buildPackText(project, true))}><i>H</i><span><strong>HTML / PDF</strong><small>Xem, in hoặc lưu PDF</small></span></button><button type="button" onClick={() => setShowVault(true)}><i>V</i><span><strong>Pronunciation Vault</strong><small>{vault.length} dự án đã lưu</small></span></button></div></section>
        </div>
        <h3 className="pc-connect-title">Connected Workflow</h3><div className="pc-destination-grid">{DESTINATIONS.map((item) => <button type="button" key={item.id} onClick={() => sendTo(item)}><i>{item.icon}</i><span><strong>{item.label}</strong><small>{item.desc}</small></span><b>↗</b></button>)}</div>
      </article>

      {showAi ? <div className="pc-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget && !aiLoading) setShowAi(false); }}><section className="pc-modal"><header><div><span>AI SPEECH COACH</span><h2>{AI_TASKS.find((task) => task.id === (aiResult?.taskId || aiLoading))?.title || 'AI Speech Coach'}</h2><p>{providerInfo?.label || 'AI Provider'} · {providerConfig?.model || aiModel || 'No model'}</p></div><button type="button" disabled={Boolean(aiLoading)} onClick={() => setShowAi(false)}>×</button></header>{aiLoading ? <div className="pc-ai-loading"><i>AI</i><strong>Đang xử lý tác vụ chuyên môn…</strong><p>AI đang đọc target text, blueprint và learner profile.</p></div> : null}{aiError ? <div className="pc-ai-error">⚠ {aiError}</div> : null}{aiResult ? <div className="pc-ai-result"><pre>{JSON.stringify(aiResult.parsed, null, 2)}</pre><footer><button type="button" onClick={() => setShowAi(false)}>Đóng</button><button type="button" className="primary" onClick={applyAiResult}>Áp dụng kết quả</button></footer></div> : null}</section></div> : null}

      {showVersions ? <div className="pc-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowVersions(false); }}><section className="pc-modal pc-list-modal"><header><div><span>VERSION HISTORY</span><h2>Phiên bản dự án</h2></div><button type="button" onClick={() => setShowVersions(false)}>×</button></header><button type="button" className="primary" onClick={saveVersion}>＋ Lưu phiên bản hiện tại</button><div className="pc-list">{project.versions.length ? project.versions.map((version) => <article key={version.id}><div><strong>{version.label}</strong><span>{new Date(version.createdAt).toLocaleString('vi-VN')}</span></div><button type="button" onClick={() => restoreVersion(version)}>Khôi phục</button></article>) : <p>Chưa có phiên bản.</p>}</div></section></div> : null}

      {showVault ? <div className="pc-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowVault(false); }}><section className="pc-modal pc-list-modal"><header><div><span>TEACHER VAULT</span><h2>Pronunciation Portfolio</h2><p>{vault.length} dự án đã lưu.</p></div><button type="button" onClick={() => setShowVault(false)}>×</button></header><div className="pc-list">{vault.length ? vault.map((entry) => <article key={entry.id}><div><strong>{entry.title}</strong><span>{entry.focus} · {entry.level} · {entry.accent}</span></div><button type="button" onClick={() => loadVault(entry)}>Mở</button><button type="button" className="danger" onClick={() => { const next = vault.filter((item) => item.id !== entry.id); setVault(next); window.localStorage.setItem(vaultKey(currentUser), JSON.stringify(next)); }}>Xóa</button></article>) : <p>Vault đang trống.</p>}</div></section></div> : null}
    </div>
  );
}
