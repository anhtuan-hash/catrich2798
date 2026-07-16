import React, { useMemo, useState } from 'react';
import LiveActivityPlayer from '../components/LiveActivityPlayer.jsx';
import { AI_TOOL_PRESETS, generateGenericToolOutput } from '../utils/openRouter.js';
import { addHistoryEntry, addQuestionsFromTextToBank, exportAsHtml, exportAsWord, parseMcqFromText, savePromptEntry, slugify as librarySlugify } from '../utils/library.js';
import { buildGoogleFormsAppsScript, buildGoogleFormsCsv, buildGoogleFormsGuideHtml, normalizeQuestionsForGoogleForms } from '../utils/googleForms.js';

function useToast() {
  const [message, setMessage] = useState('');
  const show = (text) => {
    setMessage(text);
    window.clearTimeout(show.timer);
    show.timer = window.setTimeout(() => setMessage(''), 2400);
  };
  return [message, show];
}

function downloadFile(filename, content, type = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function slugify(text) {
  return String(text || 'ai-output')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'ai-output';
}


const EXAM_STUDIO_MODES = [
  {
    id: 'full-test',
    icon: '📝',
    title: 'Complete Test',
    titleVi: 'Đề kiểm tra hoàn chỉnh',
    desc: 'Build a full test with sections, answer key and matrix.',
    descVi: 'Tạo đề hoàn chỉnh, có phần, đáp án và ma trận.',
    outputHintVi: 'Đề hoàn chỉnh / ma trận / đáp án / Google Form',
    outputHint: 'Complete test / matrix / answer key / Google Form',
    specificVi: 'Chia đề thành các phần rõ ràng. Có phần câu hỏi, đáp án, giải thích ngắn, ma trận đề và mục GOOGLE FORM QUESTIONS ở cuối.',
    specific: 'Split the test into clear sections. Include questions, answer key, short explanations, a test matrix, and GOOGLE FORM QUESTIONS at the end.',
  },
  {
    id: 'quick-quiz',
    icon: '❓',
    title: 'Quick Quiz',
    titleVi: 'Quiz nhanh',
    desc: 'Generate fast MCQs for practice or checking understanding.',
    descVi: 'Tạo nhanh MCQ để luyện tập hoặc kiểm tra hiểu bài.',
    outputHintVi: 'Quiz nhanh A-D / đáp án / giải thích',
    outputHint: 'Quick A-D quiz / answer key / explanations',
    specificVi: 'Tập trung vào câu hỏi ngắn, rõ, kiểm tra nhanh sau bài học. Mỗi câu có 4 phương án A-D, đáp án và giải thích ngắn.',
    specific: 'Focus on short, clear questions for quick post-lesson checking. Each item has A-D options, answer and short explanation.',
  },
  {
    id: 'word-form',
    icon: '🔤',
    title: 'Word Form',
    titleVi: 'Word Form',
    desc: 'Create B2-C1 word formation questions from word families.',
    descVi: 'Tạo câu hỏi word form B2-C1 từ word family.',
    outputHintVi: 'Word form B2-C1 / word family / đáp án',
    outputHint: 'B2-C1 word form / word family / key',
    specificVi: 'Mỗi câu kiểm tra đúng dạng từ trong ngữ cảnh. Ưu tiên word family, distractors hợp lí và không lặp content word.',
    specific: 'Each item tests the correct word form in context. Prioritize word families, plausible distractors and no repeated content words.',
  },
  {
    id: 'cloze-test',
    icon: '🧠',
    title: 'Cloze Test',
    titleVi: 'Cloze Test',
    desc: 'Generate cloze passages with options and answer keys.',
    descVi: 'Tạo đoạn cloze có phương án A-D và đáp án.',
    outputHintVi: 'Cloze passage / A-D / đáp án / giải thích',
    outputHint: 'Cloze passage / A-D / key / explanations',
    specificVi: 'Tạo một đoạn văn mạch lạc trước, sau đó đánh số các chỗ trống. Mỗi chỗ trống có A-D, đáp án và giải thích ngắn.',
    specific: 'Create a coherent passage first, then number each blank. Each blank has A-D options, answer and short explanation.',
  },
  {
    id: 'thpt-items',
    icon: '🎯',
    title: 'THPT Items',
    titleVi: 'Câu hỏi THPT',
    desc: 'Create THPT-style items by topic, level and distractor logic.',
    descVi: 'Tạo câu hỏi theo phong cách THPT, có mức độ và nhiễu hợp lí.',
    outputHintVi: 'Câu hỏi THPT / NB-TH-VD-VDC / đáp án',
    outputHint: 'THPT items / NB-TH-VD-VDC / answer key',
    specificVi: 'Gắn nhãn mức độ NB/TH/VD/VDC cho từng câu. Phương án nhiễu phải phản ánh lỗi thường gặp của học sinh THPT.',
    specific: 'Tag each item with NB/TH/VD/VDC. Distractors should reflect common mistakes made by Vietnamese high-school students.',
  },
  {
    id: 'google-form',
    icon: '🧾',
    title: 'Google Form Format',
    titleVi: 'Format Google Form',
    desc: 'Standardize questions so the Google Form panel can detect them.',
    descVi: 'Chuẩn hoá câu hỏi để bảng Google Form nhận diện được.',
    outputHintVi: 'Chuẩn hoá Google Form / MCQ A-D',
    outputHint: 'Google Form standardization / A-D MCQ',
    specificVi: 'Nếu có nội dung nguồn, hãy chuyển toàn bộ sang format MCQ A-D nghiêm ngặt. Không dùng bảng. Mỗi câu có Answer và Explanation.',
    specific: 'If source content is provided, convert everything into strict A-D MCQ format. Do not use tables. Every item has Answer and Explanation.',
  },
];

const EXAM_MODE_DEFAULT_OPTIONS = {
  'full-test': {
    target: 'Lớp 12 / THPT',
    level: 'THPT',
    topic: 'Tổng ôn ngữ pháp, từ vựng và đọc hiểu',
    scale: '45 phút, khoảng 40 câu',
    focus: 'Ngữ pháp · từ vựng · word form · cloze · đọc hiểu',
    difficulty: 'NB 25% · TH 35% · VD 30% · VDC 10%',
    output: 'Có đáp án, giải thích ngắn, ma trận đề và GOOGLE FORM QUESTIONS',
    constraints: 'Không trùng câu hỏi, phương án nhiễu hợp lí, bám sát phong cách đề THPT.',
  },
  'quick-quiz': {
    target: 'Học sinh THPT',
    level: 'B2-C1',
    topic: 'Past Simple vs Past Continuous',
    scale: 'Một quiz nhanh 10 câu',
    focus: 'Kiểm tra hiểu bài ngay sau khi học',
    difficulty: 'Từ dễ đến vận dụng',
    output: 'MCQ A-D, đáp án và giải thích ngắn cho từng câu',
    constraints: 'Câu hỏi ngắn, rõ, dùng được ngay trên lớp hoặc Google Form.',
  },
  'word-form': {
    target: 'Học sinh khá giỏi THPT',
    level: 'B2-C1',
    topic: 'Education, technology, resilience, sustainability',
    scale: 'Một bộ word form 20 câu',
    focus: 'Word family · part of speech · collocation trong ngữ cảnh',
    difficulty: 'B2-C1, tăng dần độ khó',
    output: 'MCQ A-D, đáp án, giải thích và từ gốc/word family',
    constraints: 'Không lặp content word, distractors cùng họ từ hoặc dễ nhầm.',
  },
  'cloze-test': {
    target: 'Học sinh lớp 12 / luyện thi THPT',
    level: 'B2-C1',
    topic: 'A trip to England',
    scale: 'Một đoạn 250–300 từ, 10 chỗ trống',
    focus: 'Liên kết văn bản · từ vựng · ngữ pháp · collocation',
    difficulty: 'B2, có vài câu vận dụng cao',
    output: 'Passage, câu 1–10 với A-D, đáp án và giải thích ngắn',
    constraints: 'Đoạn văn tự nhiên, các blank kiểm tra kiến thức khác nhau, không tạo câu quá mơ hồ.',
  },
  'thpt-items': {
    target: 'Lớp 12 / ôn thi THPT',
    level: 'THPT',
    topic: 'Mixed grammar and vocabulary',
    scale: 'Một bộ 20 câu',
    focus: 'Bám cấu trúc đề THPT, lỗi sai phổ biến của học sinh Việt Nam',
    difficulty: 'Gắn nhãn NB/TH/VD/VDC cho từng câu',
    output: 'MCQ A-D, đáp án, giải thích, chủ điểm và mức độ',
    constraints: 'Dùng phương án nhiễu hợp lí; tránh câu mẹo vô nghĩa hoặc quá học thuật.',
  },
  'google-form': {
    target: 'Giáo viên cần nhập Google Form',
    level: 'THPT',
    topic: 'Chuẩn hoá câu hỏi đã có hoặc tạo mới nếu chưa có nguồn',
    scale: 'Theo nội dung nguồn hoặc yêu cầu trong prompt',
    focus: 'Định dạng máy nhận diện được',
    difficulty: 'Giữ nguyên mức độ nếu nội dung nguồn đã có',
    output: 'Chỉ dùng format MCQ A-D, Answer, Explanation; có mục GOOGLE FORM QUESTIONS',
    constraints: 'Không dùng bảng, không trộn đáp án ở cuối, mỗi câu phải đủ 4 phương án.',
  },
};

const EXAM_SELECTS = {
  target: ['Lớp 10', 'Lớp 11', 'Lớp 12 / THPT', 'Học sinh khá giỏi THPT', 'Học sinh ôn thi THPT', 'Lớp luyện thi 1:1'],
  scale: ['Một quiz nhanh 10 câu', 'Một bộ 20 câu', '45 phút, khoảng 40 câu', '90 phút, đề nâng cao', 'Một đoạn 250–300 từ, 10 chỗ trống', 'Theo nội dung nguồn hoặc yêu cầu trong prompt'],
  focus: ['Ngữ pháp · từ vựng · đọc hiểu', 'Word family · part of speech · collocation', 'Liên kết văn bản · từ vựng · ngữ pháp', 'Bám cấu trúc đề THPT', 'Kiểm tra hiểu bài ngay sau khi học', 'Tổng ôn ngữ pháp, từ vựng và đọc hiểu'],
  difficulty: ['Từ dễ đến vận dụng', 'B2-C1, tăng dần độ khó', 'NB 25% · TH 35% · VD 30% · VDC 10%', 'Gắn nhãn NB/TH/VD/VDC cho từng câu', 'B2, có vài câu vận dụng cao', 'Giữ nguyên mức độ nếu nội dung nguồn đã có'],
  output: ['MCQ A-D, đáp án và giải thích ngắn cho từng câu', 'Có đáp án, giải thích ngắn, ma trận đề và GOOGLE FORM QUESTIONS', 'Passage, câu 1–10 với A-D, đáp án và giải thích ngắn', 'MCQ A-D, đáp án, giải thích, chủ điểm và mức độ', 'Chỉ dùng format MCQ A-D, Answer, Explanation; có mục GOOGLE FORM QUESTIONS'],
};

function getExamMode(modeId) {
  return EXAM_STUDIO_MODES.find((mode) => mode.id === modeId) || EXAM_STUDIO_MODES[0];
}

function getDefaultExamOptions(modeId) {
  return { ...(EXAM_MODE_DEFAULT_OPTIONS[modeId] || EXAM_MODE_DEFAULT_OPTIONS['full-test']) };
}

function buildExamInstruction(modeId, options = {}, language = 'vi') {
  const mode = getExamMode(modeId);
  const data = { ...getDefaultExamOptions(modeId), ...options };
  if (language !== 'vi') {
    return `Create content for Exam Studio.

Template: ${mode.title}
Goal: ${mode.desc}
Learners: ${data.target}
Level: ${data.level}
Topic / content focus: ${data.topic}
Scale / duration: ${data.scale}
Main focus: ${data.focus}
Difficulty: ${data.difficulty}
Output requirements: ${data.output}
Additional constraints: ${data.constraints}

Template-specific rules:
${mode.specific}

Return a polished, classroom-ready result. If there are MCQs, use strict A-D format with Answer and Explanation for every item. Include GOOGLE FORM QUESTIONS when suitable.`;
  }
  return `Tạo nội dung cho Exam Studio.

Template: ${mode.titleVi}
Mục tiêu: ${mode.descVi}
Đối tượng: ${data.target}
Level: ${data.level}
Chủ điểm / nội dung chính: ${data.topic}
Quy mô / thời lượng: ${data.scale}
Trọng tâm kiểm tra: ${data.focus}
Mức độ: ${data.difficulty}
Yêu cầu đầu ra: ${data.output}
Ràng buộc thêm: ${data.constraints}

Quy tắc riêng của template:
${mode.specificVi}

Trả về sản phẩm hoàn chỉnh, dùng được ngay cho giáo viên. Nếu có câu hỏi trắc nghiệm, bắt buộc dùng format A-D, có Answer và Explanation cho từng câu. Khi phù hợp, thêm mục GOOGLE FORM QUESTIONS để hệ thống nhận diện.`;
}

function questionsToStrictGoogleFormText(title, questions) {
  const lines = [`# ${title || 'Google Form Questions'}`, '', '## GOOGLE FORM QUESTIONS'];
  questions.forEach((q, index) => {
    const options = q.options || [];
    lines.push('', `${index + 1}. ${q.question}`);
    ['A', 'B', 'C', 'D'].forEach((letter, i) => lines.push(`${letter}. ${options[i] || ''}`));
    lines.push(`Answer: ${q.answer || (typeof q.answerIndex === 'number' && q.answerIndex >= 0 ? String.fromCharCode(65 + q.answerIndex) : '')}`);
    if (q.explanation) lines.push(`Explanation: ${q.explanation}`);
  });
  return lines.join('\n');
}

export default function AITool({ tool, language, apiKey, aiModel, hasApiKey }) {
  const preset = useMemo(() => AI_TOOL_PRESETS[tool.slug] || AI_TOOL_PRESETS.text2quiz, [tool.slug]);
  const isExamStudio = tool.slug === 'exam-studio';
  const [examMode, setExamMode] = useState('full-test');
  const [examOptions, setExamOptions] = useState(() => getDefaultExamOptions('full-test'));
  const [instruction, setInstruction] = useState(() => (
    isExamStudio
      ? buildExamInstruction('full-test', getDefaultExamOptions('full-test'), language)
      : preset.defaultInstruction || ''
  ));
  const [sourceText, setSourceText] = useState('');
  const [level, setLevel] = useState(() => (isExamStudio ? getDefaultExamOptions('full-test').level : 'B2-C1'));
  const [itemCount, setItemCount] = useState(isExamStudio ? 0 : 10);
  const [output, setOutput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [toast, showToast] = useToast();
  const [showFormsPanel, setShowFormsPanel] = useState(false);
  const [formTitle, setFormTitle] = useState(() => `${tool.titleVi || tool.title || 'Brian English'} Google Form`);

  const activeExamMode = getExamMode(examMode);
  const activeOutputHint = isExamStudio
    ? (language === 'vi' ? activeExamMode.outputHintVi : activeExamMode.outputHint)
    : preset.outputHint;
  const effectiveInstruction = isExamStudio
    ? `[Exam Studio mode: ${activeExamMode.titleVi}]\nMode goal: ${language === 'vi' ? activeExamMode.descVi : activeExamMode.desc}\n\n${instruction}`
    : instruction;

  const toolTitle = language === 'vi' ? tool.titleVi || tool.title : tool.title;
  const toolDesc = language === 'vi' ? tool.descVi || tool.desc : tool.desc;
  const mcqSourceText = output.trim() ? output : (sourceText.trim() ? sourceText : instruction);
  const mcqSourceLabel = output.trim()
    ? (language === 'vi' ? 'kết quả AI' : 'AI output')
    : (sourceText.trim() ? (language === 'vi' ? 'nội dung nguồn' : 'source text') : (language === 'vi' ? 'prompt' : 'prompt'));
  const detectedQuestions = useMemo(() => parseMcqFromText(mcqSourceText, { source: toolTitle, level, topic: instruction.slice(0, 70) }), [mcqSourceText, toolTitle, level, instruction]);
  const googleFormQuestions = useMemo(() => normalizeQuestionsForGoogleForms(detectedQuestions), [detectedQuestions]);
  const googleFormScript = useMemo(() => buildGoogleFormsAppsScript(formTitle || toolTitle, googleFormQuestions, { description: `Created from ${toolTitle} in Brian English Studio V1.8.` }), [formTitle, toolTitle, googleFormQuestions]);
  const requestedCount = isExamStudio ? 0 : Number(itemCount) || 0;
  const googleFormStatus = googleFormQuestions.length
    ? `${googleFormQuestions.length}${requestedCount ? `/${requestedCount}` : ''} MCQ · ${mcqSourceLabel}`
    : (language === 'vi' ? 'Chưa nhận diện MCQ' : 'No MCQs detected');

  const applyExamMode = (modeId) => {
    const nextOptions = getDefaultExamOptions(modeId);
    setExamMode(modeId);
    setExamOptions(nextOptions);
    setLevel(nextOptions.level || 'THPT');
    setItemCount(0);
    setInstruction(buildExamInstruction(modeId, nextOptions, language));
    setOutput('');
    setShowFormsPanel(false);
    setError('');
  };

  const updateExamOption = (field, value) => {
    const nextOptions = { ...examOptions, [field]: value };
    setExamOptions(nextOptions);
    if (field === 'level') setLevel(value);
    setInstruction(buildExamInstruction(examMode, nextOptions, language));
  };

  const resetExamPrompt = () => {
    const nextOptions = getDefaultExamOptions(examMode);
    setExamOptions(nextOptions);
    setLevel(nextOptions.level || 'THPT');
    setInstruction(buildExamInstruction(examMode, nextOptions, language));
    showToast(language === 'vi' ? 'Đã khôi phục prompt mẫu của template.' : 'Template prompt restored.');
  };

  const generate = async () => {
    setError('');
    if (!hasApiKey) {
      setError(language === 'vi' ? 'Chưa có AI provider. Vào Settings để cấu hình provider/API key trước.' : 'Missing AI provider. Configure a provider/API key in Settings first.');
      return;
    }
    if (!instruction.trim() && !sourceText.trim()) {
      setError(language === 'vi' ? 'Nhập yêu cầu hoặc nội dung nguồn trước.' : 'Enter an instruction or source text first.');
      return;
    }
    setLoading(true);
    try {
      const result = await generateGenericToolOutput({
        apiKey,
        model: aiModel,
        slug: tool.slug,
        instruction: effectiveInstruction,
        sourceText,
        level,
        itemCount,
        language,
      });
      setOutput(result);
      saveOutputToHistory(result);
      showToast(language === 'vi' ? 'Đã tạo nội dung bằng AI và lưu vào thư viện.' : 'AI content generated and saved to library.');
    } catch (err) {
      setError(err.message || String(err));
    } finally {
      setLoading(false);
    }
  };

  const copyOutput = async () => {
    try {
      await navigator.clipboard.writeText(output);
      showToast(language === 'vi' ? 'Đã copy kết quả.' : 'Output copied.');
    } catch {
      showToast(language === 'vi' ? 'Không copy được trên trình duyệt này.' : 'Copy failed in this browser.');
    }
  };

  const saveCurrentPrompt = () => {
    savePromptEntry({
      title: instruction.slice(0, 70) || toolTitle,
      category: toolTitle,
      body: instruction,
    });
    showToast(language === 'vi' ? 'Đã lưu prompt vào thư viện.' : 'Prompt saved to library.');
  };

  const saveOutputToHistory = (text = output) => {
    if (!text) return;
    addHistoryEntry({
      kind: 'ai-output',
      toolSlug: tool.slug,
      toolTitle,
      title: instruction.slice(0, 90) || toolTitle,
      content: text,
      level,
      itemCount,
      tags: [tool.slug, level],
      model: aiModel,
      sourceApp: tool.slug,
      sourceAppTitle: toolTitle,
      templateId: parseMcqFromText(text, { source: toolTitle, level }).length ? 'quiz' : '',
      activityData: (() => {
        const questions = parseMcqFromText(text, { source: toolTitle, level, topic: instruction.slice(0, 70) });
        return questions.length ? { type: 'quiz', templateId: 'quiz', sourceApp: tool.slug, questions } : null;
      })(),
    });
  };

  const addOutputToBank = () => {
    const added = addQuestionsFromTextToBank(output, { source: toolTitle, level, topic: instruction.slice(0, 70) });
    showToast(language === 'vi' ? `Đã thêm ${added.length} câu vào ngân hàng.` : `Added ${added.length} questions to bank.`);
  };

  const copyGoogleFormScript = async () => {
    if (!googleFormQuestions.length) return;
    try {
      await navigator.clipboard.writeText(googleFormScript);
      showToast(language === 'vi' ? 'Đã copy Google Apps Script.' : 'Google Apps Script copied.');
    } catch {
      showToast(language === 'vi' ? 'Không copy được script. Hãy mở “Xem script” và copy thủ công.' : 'Could not copy script. Open “View script” and copy manually.');
    }
  };

  const copyGoogleFormScriptAndOpen = async () => {
    if (!googleFormQuestions.length) return;
    window.open('https://script.new', '_blank', 'noopener,noreferrer');
    try {
      await navigator.clipboard.writeText(googleFormScript);
      showToast(language === 'vi' ? 'Đã copy script. Dán vào Apps Script vừa mở rồi chạy hàm createBrianEnglishGoogleForm.' : 'Script copied. Paste it into Apps Script and run createBrianEnglishGoogleForm.');
    } catch {
      showToast(language === 'vi' ? 'Đã mở Apps Script. Nếu chưa tự copy, mở “Xem script” để copy thủ công.' : 'Apps Script opened. If copy failed, open “View script” and copy manually.');
    }
  };

  const downloadGoogleFormScript = () => {
    downloadFile(`${librarySlugify(formTitle || toolTitle)}-google-form.gs`, googleFormScript, 'text/plain;charset=utf-8');
  };

  const downloadGoogleFormGuide = () => {
    const html = buildGoogleFormsGuideHtml(formTitle || toolTitle, googleFormQuestions, googleFormScript);
    downloadFile(`${librarySlugify(formTitle || toolTitle)}-google-form-guide.html`, html, 'text/html;charset=utf-8');
  };

  const downloadGoogleFormCsv = () => {
    downloadFile(`${librarySlugify(formTitle || toolTitle)}-google-form.csv`, buildGoogleFormsCsv(googleFormQuestions), 'text/csv;charset=utf-8');
  };

  const standardizeGoogleFormText = () => {
    if (!googleFormQuestions.length) {
      showToast(language === 'vi' ? 'Chưa nhận diện được câu hỏi A-D để chuẩn hoá.' : 'No A-D questions detected to standardize.');
      return;
    }
    const strict = questionsToStrictGoogleFormText(formTitle || toolTitle, googleFormQuestions);
    setOutput(strict);
    setShowFormsPanel(true);
    showToast(language === 'vi' ? 'Đã chuẩn hoá thành format Google Form.' : 'Standardized to Google Form format.');
  };

  const renderGoogleFormPanel = () => {
    if (!showFormsPanel || !googleFormQuestions.length) return null;
    return (
      <div className="google-form-panel google-form-panel-v18">
        <div className="preview-head">
          <div>
            <span className="eyebrow">3. Google Form Creator</span>
            <h2>{language === 'vi' ? 'Tạo Google Form thật từ câu hỏi đã nhận diện' : 'Create a real Google Form from detected questions'}</h2>
            <p>{language === 'vi' ? 'Hệ thống đã nhận diện câu hỏi từ ' + mcqSourceLabel + '. Bấm nút nhanh để copy script và mở Apps Script.' : 'Questions were detected from ' + mcqSourceLabel + '. Use the quick button to copy the script and open Apps Script.'}</p>
          </div>
          <span className="status-badge">{googleFormStatus}</span>
        </div>

        <label>{language === 'vi' ? 'Tên Google Form' : 'Google Form title'}</label>
        <input value={formTitle} onChange={(e) => setFormTitle(e.target.value)} />

        <div className="forms-step-grid forms-step-grid-v18">
          <div className="hint-box">
            <strong>{language === 'vi' ? 'Cách tạo form:' : 'How to create:'}</strong>
            <ol>
              <li>{language === 'vi' ? 'Bấm “Copy script + mở Apps Script”.' : 'Click “Copy script + open Apps Script”.'}</li>
              <li>{language === 'vi' ? 'Dán script vào trang Apps Script vừa mở.' : 'Paste the script into the opened Apps Script page.'}</li>
              <li>{language === 'vi' ? 'Chạy hàm createBrianEnglishGoogleForm.' : 'Run createBrianEnglishGoogleForm.'}</li>
              <li>{language === 'vi' ? 'Cho phép quyền và xem Logs để lấy link chỉnh sửa / link làm bài.' : 'Authorize and check Logs for the edit/live URLs.'}</li>
            </ol>
          </div>
          <div className="forms-mini-list">
            {googleFormQuestions.slice(0, 6).map((q, index) => (
              <div key={`${q.question}-${index}`}>
                <strong>{index + 1}. {q.question}</strong>
                <small>{language === 'vi' ? 'Phương án' : 'Options'}: {(q.options || []).join(' | ')}</small>
                <small>{language === 'vi' ? 'Đáp án' : 'Answer'}: {q.answer || (q.answerIndex >= 0 ? String.fromCharCode(65 + q.answerIndex) : '—')}</small>
              </div>
            ))}
            {googleFormQuestions.length > 6 && <small>+{googleFormQuestions.length - 6} {language === 'vi' ? 'câu khác' : 'more questions'}</small>}
          </div>
        </div>

        <div className="preview-actions wrap-actions google-form-action-row">
          <button className="primary" onClick={copyGoogleFormScriptAndOpen}>{language === 'vi' ? 'Copy script + mở Apps Script' : 'Copy script + open Apps Script'}</button>
          <button onClick={copyGoogleFormScript}>{language === 'vi' ? 'Copy Apps Script' : 'Copy Apps Script'}</button>
          <button onClick={() => window.open('https://script.new', '_blank', 'noopener,noreferrer')}>{language === 'vi' ? 'Chỉ mở Apps Script' : 'Open Apps Script only'}</button>
          <button onClick={downloadGoogleFormScript}>{language === 'vi' ? 'Tải .gs' : 'Download .gs'}</button>
          <button onClick={downloadGoogleFormGuide}>{language === 'vi' ? 'Tải hướng dẫn HTML' : 'Guide HTML'}</button>
          <button onClick={downloadGoogleFormCsv}>CSV backup</button>
        </div>

        <details className="script-details">
          <summary>{language === 'vi' ? 'Xem / copy script thủ công nếu trình duyệt chặn copy' : 'View / manually copy script if the browser blocks copy'}</summary>
          <textarea className="script-copy-box" readOnly value={googleFormScript} onFocus={(e) => e.target.select()} rows={16} />
        </details>
      </div>
    );
  };

  return (
    <div className="page tool-page ai-tool-page">
      <button className="back-btn" onClick={() => window.history.back()}>← {language === 'vi' ? 'Quay lại' : 'Back'}</button>

      <section className="tool-hero panel ai-hero">
        <div>
          <span className="eyebrow">V1.0 · AI Generator + Teacher Vault</span>
          <h1><span>{tool.icon}</span> {toolTitle}</h1>
          <p>{toolDesc}</p>
        </div>
        <div className="tool-state">
          <span>✨ AI</span>
          <span>{hasApiKey ? '🔐 API OK' : '🔑 Need API Key'}</span>
          <span>{aiModel || 'openrouter/free'}</span>
        </div>
      </section>

      <section className="ai-builder-grid">
        <article className="panel builder-panel">
          <div className="builder-section-title">
            <div>
              <span className="eyebrow">1. {language === 'vi' ? 'Yêu cầu tạo nội dung' : 'Generation request'}</span>
              <h2>{isExamStudio ? (language === 'vi' ? 'Chọn template → hệ thống tự viết prompt' : 'Choose a template → auto prompt') : (language === 'vi' ? 'Yêu cầu tạo nội dung' : 'Generation request')}</h2>
            </div>
            {isExamStudio && <span className="status-badge">{language === 'vi' ? 'Không dùng ô số câu riêng' : 'No separate count box'}</span>}
          </div>

          {isExamStudio && (
            <div className="exam-mode-panel exam-mode-panel-v2">
              <div className="exam-mode-head">
                <div>
                  <label>{language === 'vi' ? 'Chế độ trong Exam Studio' : 'Exam Studio mode'}</label>
                  <p>{language === 'vi' ? 'Nhấn một template, prompt mẫu tương ứng sẽ hiện ngay ở mục “Bạn muốn tạo gì?”.' : 'Click a template and its prompt appears immediately in “What do you want to create?”.'}</p>
                </div>
                <button type="button" className="secondary mini" onClick={resetExamPrompt}>{language === 'vi' ? 'Khôi phục prompt mẫu' : 'Reset prompt'}</button>
              </div>
              <div className="exam-template-strip">
                {EXAM_STUDIO_MODES.map((mode) => (
                  <button
                    key={mode.id}
                    type="button"
                    className={examMode === mode.id ? 'exam-template-chip active' : 'exam-template-chip'}
                    onClick={() => applyExamMode(mode.id)}
                  >
                    <span>{mode.icon}</span>
                    <strong>{language === 'vi' ? mode.titleVi : mode.title}</strong>
                  </button>
                ))}
              </div>

              <div className="exam-options-card">
                <div className="exam-options-title">
                  <div>
                    <strong>{language === 'vi' ? 'Tuỳ chọn yêu cầu nội dung' : 'Content request options'}</strong>
                    <small>{language === 'vi' ? 'Các lựa chọn này tự cập nhật prompt bên dưới.' : 'These options update the prompt below.'}</small>
                  </div>
                  <span>{language === 'vi' ? activeExamMode.titleVi : activeExamMode.title}</span>
                </div>
                <div className="exam-options-grid">
                  <div>
                    <label>{language === 'vi' ? 'Đối tượng' : 'Learners'}</label>
                    <select value={examOptions.target} onChange={(e) => updateExamOption('target', e.target.value)}>
                      {EXAM_SELECTS.target.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>Level</label>
                    <select value={level} onChange={(e) => updateExamOption('level', e.target.value)}>
                      <option>A2-B1</option>
                      <option>B1-B2</option>
                      <option>B2-C1</option>
                      <option>C1</option>
                      <option>THPT</option>
                    </select>
                  </div>
                  <div className="wide-field">
                    <label>{language === 'vi' ? 'Chủ điểm / nội dung chính' : 'Topic / content focus'}</label>
                    <input value={examOptions.topic} onChange={(e) => updateExamOption('topic', e.target.value)} placeholder={language === 'vi' ? 'Ví dụ: mệnh đề quan hệ, word form, a trip to England...' : 'Example: relative clauses, word form, a trip to England...'} />
                  </div>
                  <div>
                    <label>{language === 'vi' ? 'Quy mô / thời lượng' : 'Scale / duration'}</label>
                    <select value={examOptions.scale} onChange={(e) => updateExamOption('scale', e.target.value)}>
                      {EXAM_SELECTS.scale.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>{language === 'vi' ? 'Trọng tâm' : 'Main focus'}</label>
                    <select value={examOptions.focus} onChange={(e) => updateExamOption('focus', e.target.value)}>
                      {EXAM_SELECTS.focus.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>{language === 'vi' ? 'Mức độ' : 'Difficulty'}</label>
                    <select value={examOptions.difficulty} onChange={(e) => updateExamOption('difficulty', e.target.value)}>
                      {EXAM_SELECTS.difficulty.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </div>
                  <div>
                    <label>{language === 'vi' ? 'Đầu ra' : 'Output'}</label>
                    <select value={examOptions.output} onChange={(e) => updateExamOption('output', e.target.value)}>
                      {EXAM_SELECTS.output.map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </div>
                  <div className="wide-field">
                    <label>{language === 'vi' ? 'Yêu cầu bổ sung' : 'Additional constraints'}</label>
                    <textarea
                      className="compact-textarea"
                      value={examOptions.constraints}
                      onChange={(e) => updateExamOption('constraints', e.target.value)}
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="hint-box slim">
                <strong>{language === 'vi' ? 'Đã gộp:' : 'Merged:'}</strong>{' '}
                {language === 'vi'
                  ? 'QuizForge AI, WordForm Forge và GapCraft Builder nằm trong Exam Studio dưới dạng template con. Số câu/quy mô được ghi trực tiếp trong prompt, không còn ô số lượng riêng.'
                  : 'QuizForge AI, WordForm Forge and GapCraft Builder now live inside Exam Studio. Quantity/scale is written directly in the prompt.'}
              </div>
            </div>
          )}

          <div className="prompt-card">
            <div className="prompt-card-head">
              <label>{language === 'vi' ? 'Bạn muốn tạo gì?' : 'What do you want to create?'}</label>
              {isExamStudio && <span>{language === 'vi' ? 'Prompt tự sinh theo template' : 'Auto-generated template prompt'}</span>}
            </div>
            <textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              rows={isExamStudio ? 11 : 5}
              placeholder={preset.defaultInstruction}
            />
          </div>

          {!isExamStudio && (
            <div className="two-fields">
              <div>
                <label>Level</label>
                <select value={level} onChange={(e) => setLevel(e.target.value)}>
                  <option>A2-B1</option>
                  <option>B1-B2</option>
                  <option>B2-C1</option>
                  <option>C1</option>
                  <option>THPT</option>
                </select>
              </div>
              <div>
                <label>{language === 'vi' ? 'Số lượng' : 'Quantity'}</label>
                <input type="number" min="1" max="100" value={itemCount} onChange={(e) => setItemCount(Number(e.target.value) || 1)} />
              </div>
            </div>
          )}

          <label>{language === 'vi' ? 'Nội dung nguồn / từ vựng / bài viết học sinh' : 'Source text / vocabulary / student writing'}</label>
          <textarea
            value={sourceText}
            onChange={(e) => setSourceText(e.target.value)}
            rows={9}
            placeholder={language === 'vi' ? 'Dán đoạn văn, danh sách từ, yêu cầu chi tiết hoặc bài viết học sinh ở đây...' : 'Paste reading text, vocabulary list, detailed requirements or student writing here...'}
          />

          <div className="hint-box">
            <strong>{language === 'vi' ? 'Mẹo:' : 'Tip:'}</strong>{' '}
            {isExamStudio
              ? (language === 'vi'
                ? 'Chọn template và tuỳ chọn phía trên, prompt sẽ tự cập nhật. Có thể sửa trực tiếp prompt nếu muốn yêu cầu riêng.'
                : 'Choose a template and options above; the prompt updates automatically. You can still edit it manually.')
              : (language === 'vi'
                ? 'Ghi rõ level, số câu, dạng đề, chủ điểm và có cần đáp án/giải thích hay không.'
                : 'Mention level, number of questions, test type, topic, and whether you need answer keys/explanations.')}
          </div>

          <button className="primary full" onClick={generate} disabled={loading}>
            {loading ? (language === 'vi' ? 'Đang tạo...' : 'Generating...') : (language === 'vi' ? '✨ Tạo bằng AI' : '✨ Generate with AI')}
          </button>
          {!hasApiKey && <button className="secondary full" onClick={() => (window.location.hash = '#/settings')}>{language === 'vi' ? 'Nhập API key' : 'Add API key'}</button>}
          {error && <p className="error-box">⚠️ {error}</p>}
        </article>

        <article className="panel preview-panel ai-output-panel">
          <div className="preview-head">
            <div>
              <span className="eyebrow">2. {language === 'vi' ? 'Kết quả AI' : 'AI Output'}</span>
              <h2>{activeOutputHint}</h2>
            </div>
            <div className="preview-actions wrap-actions">
              <button onClick={copyOutput} disabled={!output}>{language === 'vi' ? 'Copy' : 'Copy'}</button>
              <button onClick={() => downloadFile(`${slugify(toolTitle)}.txt`, output)} disabled={!output}>TXT</button>
              <button onClick={() => downloadFile(`${librarySlugify(toolTitle)}.md`, output)} disabled={!output}>MD</button>
              <button onClick={() => exportAsHtml(toolTitle, output)} disabled={!output}>HTML</button>
              <button onClick={() => exportAsWord(toolTitle, output)} disabled={!output}>Word .doc</button>
              <button onClick={addOutputToBank} disabled={!output}>{language === 'vi' ? 'Ngân hàng' : 'Bank'}</button>
              <button className="google-form-btn" onClick={() => setShowFormsPanel((value) => !value)} disabled={!googleFormQuestions.length}>{language === 'vi' ? 'Google Form' : 'Google Form'}</button>
              <button onClick={saveCurrentPrompt} disabled={!instruction.trim()}>{language === 'vi' ? 'Lưu prompt' : 'Save prompt'}</button>
              <button onClick={() => window.print()} disabled={!output}>{language === 'vi' ? 'In' : 'Print'}</button>
            </div>
          </div>

          {(output || googleFormQuestions.length > 0) && (
            <div className={`google-form-readiness ${googleFormQuestions.length ? 'ready' : 'warning'}`}>
              <div>
                <strong>{language === 'vi' ? 'Google Form readiness' : 'Google Form readiness'}</strong>
                <span>{googleFormStatus}</span>
                {googleFormQuestions.length > 0 && requestedCount > 0 && googleFormQuestions.length < requestedCount && (
                  <small>{language === 'vi' ? 'Số câu nhận diện thấp hơn số lượng yêu cầu. Nên chuẩn hoá hoặc tạo lại bằng prompt Google Form.' : 'Detected fewer questions than requested. Standardize or regenerate with Google Form format.'}</small>
                )}
                {!googleFormQuestions.length && output && (
                  <small>{language === 'vi' ? 'Chưa nhận diện được MCQ. Bấm template “Format Google Form” hoặc sửa kết quả về dạng: 1. Câu hỏi / A. / B. / C. / D. / Answer.' : 'No MCQs detected. Use the Google Form template or edit the output into strict 1. Question / A. / B. / C. / D. / Answer format.'}</small>
                )}
              </div>
              <div className="preview-actions wrap-actions">
                <button onClick={standardizeGoogleFormText} disabled={!googleFormQuestions.length}>{language === 'vi' ? 'Chuẩn hoá MCQ' : 'Standardize MCQ'}</button>
                <button className="google-form-btn" onClick={() => setShowFormsPanel(true)} disabled={!googleFormQuestions.length}>{language === 'vi' ? 'Tạo Google Form' : 'Create Google Form'}</button>
              </div>
            </div>
          )}

          {output ? (
            <pre className="ai-output">{output}</pre>
          ) : googleFormQuestions.length > 0 ? (
            <div className="empty-state google-form-source-state">
              <p>{language === 'vi' ? `Đã nhận diện ${googleFormQuestions.length} câu hỏi từ ${mcqSourceLabel}. Bấm “Tạo Google Form” để xuất Apps Script.` : `Detected ${googleFormQuestions.length} questions from ${mcqSourceLabel}. Click “Create Google Form” to export Apps Script.`}</p>
            </div>
          ) : (
            <div className="empty-state">
              <p>{language === 'vi' ? 'Kết quả sẽ hiện ở đây sau khi tạo.' : 'Your generated result will appear here.'}</p>
            </div>
          )}

          {renderGoogleFormPanel()}

          {detectedQuestions.length > 0 && (output || sourceText.trim()) && (
            <div className="live-inline-panel">
              <div className="preview-head">
                <div>
                  <span className="eyebrow">4. Live Interaction</span>
                  <h2>{language === 'vi' ? 'Chơi trực tiếp từ câu hỏi đã nhận diện' : 'Play directly from detected questions'}</h2>
                </div>
                <span className="status-badge">{detectedQuestions.length} MCQ</span>
              </div>
              <LiveActivityPlayer payload={{ questions: detectedQuestions }} language={language} title={toolTitle} />
            </div>
          )}
        </article>
      </section>

      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
