import React from 'react';
import { MODULES, RUBRICS, moduleFor, SELF_STATEMENTS } from './catalogue.js';
import { safeHttpUrl } from './assessmentMath.js';
import { rubricDescription, LEVEL_NAMES } from './rubricDescriptors.js';

const change = (set,field,value) => set(v=>({...v,[field]:value}));
const SAMPLE_QUIZ = 'She enjoys ___ books. | read | reading | to read | reads | B | Gerund\nHe decided ___ abroad. | study | studying | to study | studied | C | Infinitive';
const SAMPLE_READING = 'Which phrase matches the passage? | A | B | C | D | B | Scanning | P1';
const SAMPLE_MANUAL = 'Rewrite using although. | Although it was raining, we went out. | Concessive clauses';
const inputField = (name,label,value,setValue,placeholder='',rows=0) => <label key={name}>{label}
  {rows ? <textarea rows={rows} value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder}/> :
    <input value={value} onChange={e=>setValue(e.target.value)} placeholder={placeholder}/>}
</label>;

export function CreateAssessmentFields({draft,setDraft}){
  const m=moduleFor(draft.kind);
  const engine=m?.engine;
  return <>
    <div className="bas-form-grid">
      <label>Hình thức đánh giá
        <select value={draft.kind} onChange={e=>change(setDraft,'kind',e.target.value)}>
          {MODULES.map(item=><option key={item.id} value={item.id}>{item.name} — {item.subtitle}</option>)}
        </select>
      </label>
      {inputField('title','Tên bài đánh giá',draft.title,v=>change(setDraft,'title',v),'Ví dụ: Unit 4 – Pre-test')}
      {inputField('class','Lớp',draft.classLabel,v=>change(setDraft,'classLabel',v),'Ví dụ: 12.6')}
      {inputField('objective','Mục tiêu đánh giá',draft.objective,v=>change(setDraft,'objective',v),'Ví dụ: Gerund and infinitive')}
    </div>
    {engine==='rubric' && <div className="bas-hint"><b>Rubric chấm thủ công:</b> {RUBRICS[draft.kind]?.join(' · ')}. Mỗi tiêu chí 0–4 điểm, do giáo viên đánh giá và xác nhận.</div>}
    {engine==='scale' && inputField('statements','Các phát biểu I can... (mỗi dòng một phát biểu)',draft.statements,v=>change(setDraft,'statements',v),SELF_STATEMENTS.join('\n'),7)}
    {engine==='manual' && <>
      <div className="bas-hint"><b>Đánh giá bài tự luận ngắn:</b> sau khi tạo bài, giáo viên nhập câu trả lời thực tế và xác nhận Đạt/Chưa đạt cho từng câu. Không tự phán đoán ngữ nghĩa.</div>
      {inputField('prompts','Mỗi dòng: Yêu cầu | Đáp án tham khảo | Chủ điểm',draft.prompts,v=>change(setDraft,'prompts',v),SAMPLE_MANUAL,8)}
    </>}
    {engine==='reading' && <>
      <div className="bas-hint">Tách các đoạn đọc bằng một dòng trống. BRIAN đánh số tự động P1, P2,... và so khớp dẫn chứng học sinh chọn.</div>
      {inputField('passage','Đoạn văn đọc hiểu',draft.passage,v=>change(setDraft,'passage',v),'Paragraph one...\n\nParagraph two...',8)}
    </>}
    {draft.kind==='listening' && <label>Đường dẫn audio (http/https)
      <input type="url" value={draft.audioUrl} onChange={e=>change(setDraft,'audioUrl',e.target.value)} placeholder="https://example.org/listening.mp3"/>
      <small>Chỉ dùng audio hợp pháp, được phép chia sẻ. Không thu âm hoặc xử lý bằng AI.</small>
    </label>}
    {['quiz','reading'].includes(engine) && <>
      {inputField('questions',engine==='reading'
        ? 'Câu hỏi: Nội dung | A | B | C | D | Đáp án | Kỹ năng | Dẫn chứng P1'
        : 'Câu hỏi: Nội dung | A | B | C | D | Đáp án | Chủ điểm',
      draft.questions,v=>change(setDraft,'questions',v),engine==='reading'?SAMPLE_READING:SAMPLE_QUIZ,8)}
      <small className="bas-help">{draft.kind==='exit'?'ExitTicket: tối đa 3 câu. ':''}Ngân hàng câu hỏi được giáo viên soạn trước; đáp án tự chấm theo quy tắc cố định.</small>
    </>}
  </>;
}

export function AssessmentResultFields({selected,input,setInput}){
  const module=moduleFor(selected.kind);
  const engine=module?.engine;
  const config=selected.config||{};
  const set=(field,value)=>change(setInput,field,value);
  const setArray=(field,i,value)=>{
    setInput(old=>{const arr=[...(old[field]||[])];arr[i]=value;return {...old,[field]:arr};});
  };
  const setMark=(key,v)=>setInput(old=>({...old,marks:{...old.marks,[key]:Number(v)}}));
  return <>
    {engine==='rubric' && <>
      {(RUBRICS[selected.kind]||[]).map(c=><label key={c}>{c} — {input.marks?.[c]??'—'}/4
        <select value={input.marks?.[c]??''} onChange={e=>setMark(c,e.target.value)}>
          <option value="" disabled>Chọn điểm theo bài làm thực tế</option>
          {[0,1,2,3,4].map(v=><option key={v} value={v}>{v} / 4</option>)}
        </select>
        <small>{input.marks?.[c]===undefined ? 'Chưa chọn điểm theo rubric.' : rubricDescription(selected.kind,c,Number(input.marks[c]))}</small>
      </label>)}
    </>}
    {engine==='rubric' && <details className="bas-reference">
      <summary>Xem mô tả chi tiết thang điểm 0–4</summary>
      {(RUBRICS[selected.kind]||[]).map(c=><div key={c} className="bas-descriptor-group">
        <b>{c}</b>
        {LEVEL_NAMES.map((name,index)=><p key={index}><strong>{name}:</strong> {rubricDescription(selected.kind,c,index)}</p>)}
      </div>)}
    </details>}
    {engine==='scale' && <>
      <div className="bas-hint"><b>Lưu ý:</b> điểm CanDo Check chỉ biểu thị mức tự đánh giá, không phải điểm kiểm tra năng lực khách quan.</div>
      {(config.statements||[]).map((statement,i)=><label key={i}>{i+1}. {statement}
        <select value={input.selfRatings?.[i]??''} onChange={e=>setArray('selfRatings',i,Number(e.target.value))}>
          <option value="" disabled>Chọn mức học sinh đã tự đánh giá</option>
          {[1,2,3,4].map(v=><option key={v} value={v}>{v} — {['','Chưa tự tin','Đang phát triển','Khá tự tin','Thực hiện độc lập'][v]}</option>)}
        </select>
      </label>)}
    </>}
    {engine==='manual' && <div className="bas-manual-questions">
      {(config.questions||[]).map((q,i)=><div className="bas-manual-question" key={i}>
        <b>{i+1}. {q.prompt}</b>
        <small>Đáp án tham khảo: {q.sampleAnswer} · {q.topic}</small>
        <textarea rows={2} value={input.manualResponses?.[i]||''} placeholder="Câu học sinh đã viết (để trống nếu bỏ bài)" onChange={e=>setArray('manualResponses',i,e.target.value)}/>
        <label>Đánh giá của giáo viên
          <select value={input.manualAccepted?.[i]===true?'pass':input.manualAccepted?.[i]===false?'fail':''} onChange={e=>setArray('manualAccepted',i,e.target.value==='pass')}>
            <option value="" disabled>Chọn sau khi giáo viên kiểm tra</option>
            <option value="fail">Chưa đạt (0 điểm)</option><option value="pass">Đạt (1 điểm)</option>
          </select>
        </label>
      </div>)}
    </div>}
    {engine==='reading' && <>
      <details className="bas-reference"><summary>Xem đoạn đọc P1–P{config.paragraphs?.length||0}</summary>
        {(config.paragraphs||[]).map((p,i)=><p key={i}><b>P{i+1}.</b> {p}</p>)}
      </details>
      <label>Đáp án học sinh A–D, theo thứ tự câu hỏi
        <input autoComplete="off" value={input.answers} onChange={e=>set('answers',e.target.value.toUpperCase())} placeholder="Ví dụ: ABCD"/>
      </label>
      <label>Mã dẫn chứng học sinh chọn
        <input value={input.evidence} onChange={e=>set('evidence',e.target.value.toUpperCase())} placeholder="Ví dụ: P1,P3,P2"/>
        <small>Điểm = một điểm chọn đúng đáp án + một điểm xác định đúng đoạn chứng minh cho mỗi câu.</small>
      </label>
    </>}
    {engine==='quiz' && <>
      {selected.kind==='listening' && config.audioUrl ? <div className="bas-hint">Audio của giáo viên: <a href={config.audioUrl} target="_blank" rel="noopener noreferrer">Mở file nghe ↗</a></div> : null}
      <label>Đáp án của học sinh (A–D theo thứ tự)
        <input autoComplete="off" value={input.answers} onChange={e=>set('answers',e.target.value.toUpperCase())} placeholder="Ví dụ: BACDB"/>
        <small>{config.questions?.length||0} câu; tự chấm theo đáp án đã lưu khi tạo bài.</small>
      </label>
    </>}
    {selected.kind==='peer' && inputField('assessor','Người thực hiện đánh giá đồng đẳng',input.assessor,v=>set('assessor',v),'Mã hoặc tên người đánh giá')}
    {selected.kind==='writing' && inputField('writing','Nội dung bài viết của học sinh',input.studentText,v=>set('studentText',v),'Dán bài viết đã nộp',7)}
    {selected.kind==='project' && inputField('project','Tên/mô tả sản phẩm dự án',input.studentText,v=>set('studentText',v),'Ví dụ: Poster: Green Future Day',4)}
    {inputField('comment','Nhận xét hoặc phản hồi học sinh (nếu có)',input.comment,v=>set('comment',v),
      selected.kind==='exit'?'Học sinh còn thắc mắc nội dung nào?':'Nhận xét ngắn về bài làm, điểm cần cải thiện',3)}
  </>;
}
