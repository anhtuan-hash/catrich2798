import React, { useMemo, useRef, useState } from 'react';
import './ReadingStudioSampleLibrary.css';

const EXAM_PROFILES = [
  {
    id: 'thpt-2025',
    label: 'THPT 2025',
    labelVi: 'TN THPT 2025',
    icon: 'TN',
    desc: 'Notices, ordering, information gaps, vocabulary and reading comprehension.',
    descVi: 'Thông báo, sắp xếp, điền thông tin, từ vựng và đọc hiểu theo định hướng THPT.',
    defaults: ['notice-flyer', 'reorder-text', 'info-gap', 'main-idea', 'detail', 'inference', 'vocab-context', 'vocab-synonym', 'vocab-antonym', 'reference'],
  },
  {
    id: 'ielts',
    label: 'IELTS Reading',
    labelVi: 'IELTS Reading',
    icon: 'IE',
    desc: 'Matching, True/False/Not Given, completion and academic comprehension.',
    descVi: 'Matching, True/False/Not Given, completion và đọc hiểu học thuật.',
    defaults: ['tfng', 'matching-headings', 'matching-information', 'sentence-completion', 'summary-completion', 'detail', 'inference'],
  },
  {
    id: 'toefl',
    label: 'TOEFL iBT',
    labelVi: 'TOEFL iBT',
    icon: 'TO',
    desc: 'Factual, inference, vocabulary, reference, purpose and summary questions.',
    descVi: 'Câu hỏi factual, inference, vocabulary, reference, purpose và summary.',
    defaults: ['detail', 'negative-factual', 'inference', 'vocab-context', 'reference', 'purpose-tone', 'summary'],
  },
  {
    id: 'cambridge',
    label: 'Cambridge B2/C1',
    labelVi: 'Cambridge B2/C1',
    icon: 'CB',
    desc: 'Multiple choice, gapped text, matching and advanced comprehension.',
    descVi: 'Multiple choice, gapped text, matching và đọc hiểu nâng cao.',
    defaults: ['main-idea', 'detail', 'inference', 'gapped-text', 'multiple-matching', 'vocab-context'],
  },
  {
    id: 'toeic',
    label: 'TOEIC Reading',
    labelVi: 'TOEIC Reading',
    icon: 'TC',
    desc: 'Notices, emails, workplace texts, detail and purpose questions.',
    descVi: 'Thông báo, email, văn bản công việc, chi tiết và mục đích.',
    defaults: ['notice-flyer', 'detail', 'inference', 'vocab-context', 'purpose-tone'],
  },
  {
    id: 'school',
    label: 'School Test',
    labelVi: 'Đề kiểm tra lớp',
    icon: 'ST',
    desc: 'A flexible classroom set for grades 6–12 and gifted practice.',
    descVi: 'Bộ linh hoạt cho lớp 6–12, ôn tập và bồi dưỡng học sinh giỏi.',
    defaults: ['main-idea', 'detail', 'inference', 'vocab-context', 'vocab-synonym', 'vocab-antonym', 'reference', 'summary'],
  },
];

const QUESTION_TYPES = [
  { id: 'main-idea', label: 'Main idea / Best title', labelVi: 'Ý chính / tiêu đề' },
  { id: 'detail', label: 'Detail / Factual information', labelVi: 'Chi tiết / thông tin đúng' },
  { id: 'negative-factual', label: 'Negative factual / NOT true', labelVi: 'Thông tin KHÔNG đúng' },
  { id: 'inference', label: 'Inference', labelVi: 'Suy luận' },
  { id: 'vocab-context', label: 'Vocabulary in context', labelVi: 'Từ vựng trong ngữ cảnh' },
  { id: 'vocab-synonym', label: 'Word synonym', labelVi: 'Đồng nghĩa từ' },
  { id: 'vocab-antonym', label: 'Word antonym', labelVi: 'Trái nghĩa từ' },
  { id: 'sentence-equivalent', label: 'Sentence equivalence', labelVi: 'Đồng nghĩa câu' },
  { id: 'reference', label: 'Reference / pronoun reference', labelVi: 'Quy chiếu đại từ' },
  { id: 'purpose-tone', label: 'Purpose / tone / attitude', labelVi: 'Mục đích / giọng điệu' },
  { id: 'summary', label: 'Summary / prose summary', labelVi: 'Tóm tắt nội dung' },
  { id: 'tfng', label: 'True / False / Not Given', labelVi: 'True / False / Not Given' },
  { id: 'matching-headings', label: 'Matching headings', labelVi: 'Nối tiêu đề đoạn' },
  { id: 'matching-information', label: 'Matching information', labelVi: 'Nối thông tin' },
  { id: 'multiple-matching', label: 'Multiple matching', labelVi: 'Multiple matching' },
  { id: 'sentence-completion', label: 'Sentence completion', labelVi: 'Hoàn thành câu' },
  { id: 'summary-completion', label: 'Summary / table completion', labelVi: 'Điền tóm tắt / bảng' },
  { id: 'gapped-text', label: 'Gapped text', labelVi: 'Điền câu vào đoạn' },
  { id: 'notice-flyer', label: 'Notice / flyer / announcement', labelVi: 'Thông báo / tờ rơi' },
  { id: 'info-gap', label: 'Information gap completion', labelVi: 'Điền khuyết thông tin' },
  { id: 'reorder-text', label: 'Ordering dialogue / email / paragraph', labelVi: 'Sắp xếp hội thoại / thư / đoạn' },
];

const SAMPLE_LIBRARY = {
  'main-idea': {
    exam: 'THPT / IELTS / TOEFL / Cambridge',
    stem: 'Which of the following best summarizes the passage? / What is the best title for the passage?',
    sample: `Which of the following best serves as the title for the passage?\nA. Why Urban Land Should Remain Unused\nB. How Community Gardens Benefit City Neighbourhoods\nC. The High Cost of Imported Vegetables\nD. Why Young People Avoid Outdoor Activities\nAnswer: B\nEvidence: Community gardens provide fresh food, shared green space, and opportunities for neighbours to work together.\nExplanation: Option B covers the central idea of the whole passage.`,
    rules: 'The answer must reflect the whole passage. Distractors should be too narrow, too broad, or contradicted.',
  },
  detail: {
    exam: 'THPT / TOEFL / TOEIC / Cambridge',
    stem: 'According to paragraph X, which of the following is true about ...?',
    sample: `According to paragraph 2, why did the town library extend its opening hours?\nA. To host private business meetings\nB. To give students more time to study after school\nC. To reduce the number of library staff\nD. To replace printed books with computers\nAnswer: B\nEvidence: The new evening schedule allows students to use the study rooms after regular classes end.\nExplanation: The passage directly states that the longer hours support students after school.`,
    rules: 'The correct answer must be explicitly stated or clearly paraphrased in the passage.',
  },
  'negative-factual': {
    exam: 'THPT / TOEFL / TOEIC',
    stem: 'All of the following are mentioned EXCEPT ... / Which is NOT true?',
    sample: `All of the following are benefits of the school cycling programme EXCEPT _____.\nA. reducing traffic near the school gate\nB. helping students become more active\nC. providing secure bicycle parking\nD. shortening the official school day\nAnswer: D\nEvidence: The programme reduces congestion, encourages exercise, and includes new bicycle racks.\nExplanation: A, B, and C are mentioned; changing the school day is not.`,
    rules: 'Three options must be supported by the text; only one must be absent or false.',
  },
  inference: {
    exam: 'THPT / TOEFL / Cambridge / IELTS',
    stem: 'It can be inferred from the passage that ...',
    sample: `It can be inferred from the passage that the coastal restoration project will _____.\nA. produce immediate results without maintenance\nB. require long-term cooperation from local residents\nC. prevent every future storm from reaching the town\nD. replace all fishing activities in the area\nAnswer: B\nEvidence: Volunteers will continue planting native grasses and monitoring the shoreline over the next five years.\nExplanation: The five-year plan implies sustained community participation.`,
    rules: 'The answer should be a reasonable conclusion from evidence, not a direct copy or unsupported guess.',
  },
  'vocab-context': {
    exam: 'THPT / TOEFL / IELTS / Cambridge',
    stem: 'The word/phrase “...” in paragraph X is closest in meaning to ...',
    sample: `The word “resilient” in paragraph 3 is closest in meaning to _____.\nA. able to recover from difficulty\nB. unwilling to accept change\nC. dependent on outside support\nD. limited to a short period\nAnswer: A\nEvidence: Small businesses became more resilient by sharing equipment and customers.\nExplanation: In this context, “resilient” means able to adapt and recover.`,
    rules: 'Use the exact target word from the passage. Options should match its part of speech.',
  },
  'vocab-synonym': {
    exam: 'THPT / TOEFL / TOEIC',
    stem: 'The word “...” is closest in meaning to ...',
    sample: `The word “substantial” in paragraph 2 is closest in meaning to _____.\nA. temporary\nB. considerable\nC. unexpected\nD. unnecessary\nAnswer: B\nEvidence: The new bus route led to a substantial increase in daily passengers.\nExplanation: “Substantial” means large or considerable.`,
    rules: 'The correct option must be a true synonym in context; distractors should use the same word class.',
  },
  'vocab-antonym': {
    exam: 'THPT / TOEIC / School tests',
    stem: 'The word “...” is OPPOSITE in meaning to ...',
    sample: `The word “scarce” in paragraph 1 is OPPOSITE in meaning to _____.\nA. limited\nB. rare\nC. abundant\nD. costly\nAnswer: C\nEvidence: Clean water was scarce during the dry season.\nExplanation: “Scarce” means not enough, while “abundant” means plentiful.`,
    rules: 'Use OPPOSITE in uppercase. Only one option should express the opposite meaning.',
  },
  'sentence-equivalent': {
    exam: 'THPT / Cambridge / School tests',
    stem: 'Which sentence best paraphrases the sentence “...”?',
    sample: `Which sentence best paraphrases “The initiative enabled residents to borrow tools instead of buying them”?\nA. Residents could share tools through the programme rather than purchase new ones.\nB. Residents were required to sell all tools they owned.\nC. The programme prevented residents from repairing their homes.\nD. Only professional workers could use the tools.\nAnswer: A\nEvidence: The initiative enabled residents to borrow tools instead of buying them.\nExplanation: Option A preserves the original meaning without adding information.`,
    rules: 'The correct option must preserve meaning, tense, and logic.',
  },
  reference: {
    exam: 'THPT / TOEFL / TOEIC',
    stem: 'The word “it/they/this/these” in paragraph X refers to ...',
    sample: `The word “this” in paragraph 2 refers to _____.\nA. allowing employees to choose flexible starting times\nB. building a new office outside the city\nC. reducing the number of weekly meetings\nD. asking staff to work longer hours\nAnswer: A\nEvidence: Employees may begin work between 7:00 and 10:00 a.m. This has reduced rush-hour travel.\nExplanation: “This” refers to the flexible starting-time policy.`,
    rules: 'Use an actual reference word and identify its clear antecedent.',
  },
  'purpose-tone': {
    exam: 'THPT / TOEFL / TOEIC / Cambridge',
    stem: 'What is the author’s main purpose? / The writer’s attitude is best described as ...',
    sample: `What is the writer’s attitude toward green roofs in cities?\nA. completely dismissive\nB. cautiously optimistic\nC. strongly amused\nD. entirely uncertain\nAnswer: B\nEvidence: Green roofs can reduce heat and absorb rainwater, although installation costs remain a challenge.\nExplanation: The writer recognises both benefits and limitations.`,
    rules: 'Base the answer on wording and balance. Avoid extreme attitudes unless clearly supported.',
  },
  summary: {
    exam: 'TOEFL / IELTS / Cambridge',
    stem: 'Which option best completes the summary of the passage?',
    sample: `Which option best completes the summary of the passage?\nA. Solar panels are useful only in remote villages.\nB. Solar power can lower energy costs, but successful projects require planning and maintenance.\nC. All buildings should immediately stop using the electricity grid.\nD. Solar equipment has become more expensive every year.\nAnswer: B\nEvidence: Panels reduced electricity bills, while regular inspection and suitable roof design remained essential.\nExplanation: Option B combines the main benefit and the key condition.`,
    rules: 'The correct summary should combine two or more major ideas without exaggeration.',
  },
  tfng: {
    exam: 'IELTS',
    stem: 'Do the following statements agree with the information in the passage?',
    sample: `The company requires every remote employee to work exactly the same hours.\nA. True\nB. False\nC. Not Given\nAnswer: B\nEvidence: Remote staff may arrange their working hours as long as they attend the weekly team meeting.\nExplanation: The passage explicitly allows flexible schedules.`,
    rules: 'True agrees, False contradicts, and Not Given means the passage provides no answer.',
  },
  'matching-headings': {
    exam: 'IELTS / Cambridge',
    stem: 'Which heading best matches paragraph X?',
    sample: `Which heading best matches paragraph 3?\nA. The influence of screen light on sleep\nB. The history of bedroom furniture\nC. Reasons people prefer morning exercise\nD. The cost of household electricity\nAnswer: A\nEvidence: Light from phones can delay the release of melatonin and make it harder to fall asleep.\nExplanation: The whole paragraph explains how screen light affects sleep.`,
    rules: 'The heading must represent the whole paragraph, not one minor example.',
  },
  'matching-information': {
    exam: 'IELTS',
    stem: 'Which paragraph contains the following information?',
    sample: `Which paragraph mentions free entry for local school groups?\nA. Paragraph A\nB. Paragraph B\nC. Paragraph C\nD. Paragraph D\nAnswer: C\nEvidence: Schools within the district may book guided visits without paying an admission fee.\nExplanation: Paragraph C provides the information about free school visits.`,
    rules: 'Use paragraph labels as options and quote the exact supporting evidence.',
  },
  'multiple-matching': {
    exam: 'Cambridge B2/C1 / IELTS',
    stem: 'Which person/text/section mentions ...?',
    sample: `Which student says that studying with short breaks improves concentration?\nA. Lan\nB. Minh\nC. Hoa\nD. Nam\nAnswer: C\nEvidence: Hoa: “I work for twenty-five minutes, then take a five-minute break. It helps me stay focused.”\nExplanation: Hoa directly describes using short breaks to maintain concentration.`,
    rules: 'Options should be people, sections, or texts. Each question must match one source.',
  },
  'sentence-completion': {
    exam: 'IELTS / Cambridge / THPT',
    stem: 'Complete the sentence. According to the passage, ...',
    sample: `Complete the sentence. Wetlands help protect nearby towns by absorbing _____.\nA. floodwater\nB. traffic noise\nC. household waste\nD. factory smoke\nAnswer: A\nEvidence: During heavy rain, wetlands absorb large amounts of floodwater.\nExplanation: The exact noun required is “floodwater.”`,
    rules: 'The completed sentence must be grammatically correct and directly supported.',
  },
  'summary-completion': {
    exam: 'IELTS / THPT',
    stem: 'Complete the summary/table/notes with the best option.',
    sample: `Complete the summary. Reliable public transport can reduce traffic congestion and improve access to _____.\nA. employment\nB. private gardens\nC. international airports only\nD. luxury shopping centres\nAnswer: A\nEvidence: Frequent buses allow more residents to reach jobs without driving.\nExplanation: “Employment” accurately completes the summary.`,
    rules: 'The answer must fit both grammar and meaning.',
  },
  'gapped-text': {
    exam: 'Cambridge B2/C1',
    stem: 'Which sentence best fits the gap?',
    sample: `Which sentence best fits the gap after paragraph 2?\nA. As a result, volunteers can remove waste before it reaches the open sea.\nB. Most people prefer to avoid beaches during summer.\nC. The first plastic product was invented many years ago.\nD. Fishing boats are always larger than research vessels.\nAnswer: A\nEvidence before the gap: Floating barriers guide rubbish toward collection points near the riverbank.\nExplanation: Option A gives the logical result of the collection system.`,
    rules: 'The correct sentence must connect coherently with the text before and after the gap.',
  },
  'notice-flyer': {
    exam: 'TN THPT 2025 / TOEIC',
    stem: 'What is the notice mainly about? / Who is it intended for?',
    sample: `What is the purpose of the notice?\nA. To invite students to a public-speaking workshop\nB. To announce the cancellation of all clubs\nC. To advertise a new school uniform\nD. To recruit full-time office staff\nAnswer: A\nEvidence: Join our Public Speaking Workshop this Saturday and practise confident presentations.\nExplanation: The notice invites students to attend a workshop.`,
    rules: 'Use an authentic short notice and ask about purpose, audience, detail, or required action.',
  },
  'info-gap': {
    exam: 'TN THPT 2025 / IELTS / TOEIC',
    stem: 'Which option best fills the blank in the note/form/table?',
    sample: `Complete the registration note. Workshop starting time: _____.\nA. 8:00 a.m.\nB. 9:30 a.m.\nC. 1:00 p.m.\nD. 4:30 p.m.\nAnswer: B\nEvidence: Saturday, 9:30 a.m.–11:30 a.m., Room 204.\nExplanation: The programme begins at 9:30 a.m.`,
    rules: 'Ask for concrete information such as time, place, fee, person, action, or purpose.',
  },
  'reorder-text': {
    exam: 'TN THPT 2025 / Cambridge',
    stem: 'Choose the correct order to make a coherent dialogue/email/paragraph.',
    sample: `Choose the correct order to make a coherent email.\n(1) Could you please confirm whether places are still available?\n(2) Dear Ms Brown,\n(3) I am writing to ask about the weekend photography course.\n(4) Kind regards,\n(5) Mai Nguyen\nA. 2-3-1-4-5\nB. 3-2-1-5-4\nC. 2-1-3-4-5\nD. 1-3-2-5-4\nAnswer: A\nExplanation: The email follows greeting → purpose → request → closing → name.`,
    rules: 'Use clear discourse functions and plausible distractor orders; only one sequence should be coherent.',
  },
};

function getLabel(type, language) {
  return language === 'vi' ? type.labelVi : type.label;
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement('textarea');
  textarea.value = text;
  textarea.style.position = 'fixed';
  textarea.style.opacity = '0';
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand('copy');
  textarea.remove();
}

export default function ReadingStudioSampleLibrary({ tool, language = 'vi' }) {
  const [profileId, setProfileId] = useState(EXAM_PROFILES[0].id);
  const [selectedTypes, setSelectedTypes] = useState(EXAM_PROFILES[0].defaults);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const selectorRef = useRef(null);
  const samplesRef = useRef(null);

  const activeProfile = EXAM_PROFILES.find((profile) => profile.id === profileId) || EXAM_PROFILES[0];
  const toolTitle = language === 'vi' ? (tool?.titleVi || 'Reading Studio') : (tool?.title || 'Reading Studio');

  const visibleSamples = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return selectedTypes
      .map((id) => {
        const type = QUESTION_TYPES.find((item) => item.id === id);
        const data = SAMPLE_LIBRARY[id];
        return type && data ? { id, type, data } : null;
      })
      .filter(Boolean)
      .filter(({ type, data }) => {
        if (!normalizedQuery) return true;
        return [getLabel(type, language), type.label, type.labelVi, data.exam, data.stem, data.sample]
          .join(' ')
          .toLowerCase()
          .includes(normalizedQuery);
      });
  }, [selectedTypes, query, language]);

  const notify = (message) => {
    setToast(message);
    window.clearTimeout(notify.timer);
    notify.timer = window.setTimeout(() => setToast(''), 2200);
  };

  const chooseProfile = (id) => {
    const profile = EXAM_PROFILES.find((item) => item.id === id) || EXAM_PROFILES[0];
    setProfileId(profile.id);
    setSelectedTypes(profile.defaults);
    setQuery('');
    window.requestAnimationFrame(() => samplesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  const toggleType = (id) => {
    setSelectedTypes((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);
  };

  const copySample = async (id) => {
    const type = QUESTION_TYPES.find((item) => item.id === id);
    const data = SAMPLE_LIBRARY[id];
    if (!type || !data) return;
    const text = `${getLabel(type, language)}\n${data.sample}`;
    try {
      await copyText(text);
      notify(language === 'vi' ? `Đã copy: ${getLabel(type, language)}` : `Copied: ${getLabel(type, language)}`);
    } catch {
      notify(language === 'vi' ? 'Không thể sao chép.' : 'Copy failed.');
    }
  };

  const copyAll = async () => {
    if (!visibleSamples.length) return;
    const text = visibleSamples
      .map(({ type, data }, index) => `${index + 1}. ${getLabel(type, language)}\n${data.sample}`)
      .join('\n\n────────────────────────\n\n');
    try {
      await copyText(text);
      notify(language === 'vi' ? `Đã copy ${visibleSamples.length} mẫu câu hỏi.` : `Copied ${visibleSamples.length} question samples.`);
    } catch {
      notify(language === 'vi' ? 'Không thể sao chép.' : 'Copy failed.');
    }
  };

  return (
    <main className="reading-library-page">
      <section className="reading-library-hero">
        <div className="reading-library-hero-copy">
          <span className="reading-library-eyebrow">ENGLISH HUB · READING TEMPLATE LIBRARY</span>
          <h1>{language === 'vi' ? 'Thư viện mẫu câu hỏi đọc hiểu' : 'Reading question template library'}</h1>
          <p>
            {language === 'vi'
              ? 'Chọn mẫu kỳ thi và nhận ngay toàn bộ câu hỏi mẫu chuẩn để xem, chỉnh sửa hoặc sao chép. Không cần AI, không cần API key.'
              : 'Choose an exam profile and instantly view every standard question sample. No AI and no API key required.'}
          </p>
          <div className="reading-library-benefits">
            <span><b>✓</b>{language === 'vi' ? 'Không dùng AI' : 'No AI'}</span>
            <span><b>21</b>{language === 'vi' ? 'dạng câu hỏi' : 'question types'}</span>
            <span><b>⌘C</b>{language === 'vi' ? 'sao chép tức thì' : 'instant copy'}</span>
          </div>
          <div className="reading-library-hero-actions">
            <button type="button" className="primary" onClick={() => selectorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}>
              {language === 'vi' ? 'Chọn mẫu kỳ thi' : 'Choose an exam profile'}
            </button>
            <button type="button" className="secondary" onClick={() => { setSelectedTypes(QUESTION_TYPES.map((item) => item.id)); setQuery(''); window.requestAnimationFrame(() => samplesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }}>
              {language === 'vi' ? 'Xem đủ 21 dạng' : 'View all 21 types'}
            </button>
          </div>
        </div>
        <div className="reading-library-hero-art" aria-hidden="true">
          <div className="reading-library-book">
            <div className="page left"><i /><i /><i /><i /><span>PASSAGE</span></div>
            <div className="page right"><strong>MCQ</strong><i /><i className="active" /><i /><i /></div>
          </div>
          <div className="reading-library-copy-card"><span>✓</span><b>COPY</b></div>
          <div className="reading-library-template-card"><b>21</b><span>TEMPLATES</span></div>
        </div>
      </section>

      <section className="reading-library-section" ref={selectorRef}>
        <header className="reading-library-section-head">
          <div><span>1</span><div><h2>{language === 'vi' ? 'Chọn mẫu kỳ thi' : 'Choose an exam profile'}</h2><p>{language === 'vi' ? 'Mỗi mẫu tự chọn sẵn những dạng câu hỏi phù hợp.' : 'Each profile preselects the most relevant question types.'}</p></div></div>
          <strong>{language === 'vi' ? `${activeProfile.defaults.length} dạng mặc định` : `${activeProfile.defaults.length} default types`}</strong>
        </header>
        <div className="reading-library-profile-grid">
          {EXAM_PROFILES.map((profile) => (
            <button key={profile.id} type="button" className={profileId === profile.id ? 'active' : ''} onClick={() => chooseProfile(profile.id)}>
              <span className="profile-icon">{profile.icon}</span>
              <span className="profile-copy"><b>{language === 'vi' ? profile.labelVi : profile.label}</b><small>{language === 'vi' ? profile.descVi : profile.desc}</small></span>
              <span className="profile-count">{profile.defaults.length}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="reading-library-section reading-library-types">
        <header className="reading-library-section-head">
          <div><span>2</span><div><h2>{language === 'vi' ? 'Tinh chỉnh dạng câu hỏi' : 'Refine question types'}</h2><p>{language === 'vi' ? 'Bật hoặc tắt từng dạng trước khi sao chép.' : 'Turn individual question types on or off before copying.'}</p></div></div>
          <div className="reading-library-type-actions">
            <button type="button" onClick={() => setSelectedTypes(activeProfile.defaults)}>{language === 'vi' ? 'Mặc định' : 'Defaults'}</button>
            <button type="button" onClick={() => setSelectedTypes(QUESTION_TYPES.map((item) => item.id))}>{language === 'vi' ? 'Chọn tất cả' : 'Select all'}</button>
            <button type="button" onClick={() => setSelectedTypes([])}>{language === 'vi' ? 'Bỏ chọn' : 'Clear'}</button>
          </div>
        </header>
        <div className="reading-library-type-grid">
          {QUESTION_TYPES.map((type) => (
            <button key={type.id} type="button" className={selectedTypes.includes(type.id) ? 'active' : ''} onClick={() => toggleType(type.id)}>
              <span>{selectedTypes.includes(type.id) ? '✓' : '+'}</span>{getLabel(type, language)}
            </button>
          ))}
        </div>
      </section>

      <section className="reading-library-section reading-library-samples" ref={samplesRef}>
        <div className="reading-library-sample-toolbar">
          <div><span>3</span><div><h2>{language === 'vi' ? 'Toàn bộ câu hỏi mẫu' : 'All question samples'}</h2><p>{language === 'vi' ? `${visibleSamples.length} mẫu đang hiển thị · nội dung được mở đầy đủ để sao chép` : `${visibleSamples.length} samples shown in full`}</p></div></div>
          <label className="reading-library-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={language === 'vi' ? 'Tìm dạng hoặc nội dung mẫu...' : 'Search question types or sample text...'} /></label>
          <button type="button" className="reading-library-copy-all" onClick={copyAll} disabled={!visibleSamples.length}>⧉ {language === 'vi' ? 'Copy tất cả' : 'Copy all'}</button>
        </div>

        {visibleSamples.length ? (
          <div className="reading-library-sample-grid">
            {visibleSamples.map(({ id, type, data }, index) => (
              <article key={id} className="reading-library-sample-card">
                <header>
                  <div className="sample-number">{String(index + 1).padStart(2, '0')}</div>
                  <div><h3>{getLabel(type, language)}</h3><span>{data.exam}</span></div>
                  <button type="button" onClick={() => copySample(id)}>⧉ {language === 'vi' ? 'Copy mẫu' : 'Copy sample'}</button>
                </header>
                <div className="reading-library-stem"><b>{language === 'vi' ? 'Cấu trúc câu hỏi' : 'Standard stem'}</b><p>{data.stem}</p></div>
                <pre>{data.sample}</pre>
                <footer><b>{language === 'vi' ? 'Lưu ý thiết kế' : 'Design rule'}</b><p>{data.rules}</p></footer>
              </article>
            ))}
          </div>
        ) : (
          <div className="reading-library-empty"><span>□</span><h3>{language === 'vi' ? 'Chưa chọn dạng câu hỏi' : 'No question types selected'}</h3><p>{language === 'vi' ? 'Chọn ít nhất một dạng ở bước 2 để xem mẫu.' : 'Select at least one type in step 2.'}</p></div>
        )}
      </section>

      <div className="reading-library-footer-bar">
        <div><b>{toolTitle}</b><span>{language === 'vi' ? `${selectedTypes.length} dạng đã chọn` : `${selectedTypes.length} types selected`}</span></div>
        <button type="button" onClick={copyAll} disabled={!visibleSamples.length}>⧉ {language === 'vi' ? `Copy ${visibleSamples.length} mẫu` : `Copy ${visibleSamples.length} samples`}</button>
      </div>

      {toast ? <div className="reading-library-toast" role="status">{toast}</div> : null}
    </main>
  );
}
