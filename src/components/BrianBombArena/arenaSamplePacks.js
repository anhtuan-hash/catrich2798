import {G11_GRAMMAR_MCQS} from './arenaG11Grammar100.js';
// Offline classroom sample packs; no network, AI, or paid service.
const rawPacks = [
  {
    id:'g11-global-success-grammar-100',
    titleVi:'Tiếng Anh 11 · Ngữ pháp 10 Unit · 100 câu trắc nghiệm',
    titleEn:'English 11 · Global Success · 100 Grammar MCQs',
    level:'B1–B2',topic:'Grammar · Units 1–10',
    items:G11_GRAMMAR_MCQS.map(q=>({prompt:q.prompt,answer:q.answer,options:q.options,answerIndex:q.answerIndex,explanation:q.explanation,unit:q.unit,topic:q.topic})),
  },
  {
    "id": "g11-global-warming",
    "titleVi": "Tiếng Anh 11 · Unit 5 Global Warming",
    "titleEn": "English 11 · Unit 5 Global Warming",
    "level": "A2–B2",
    "topic": "Environment & Sustainability",
    "items": [
      [
        "What is the main greenhouse gas produced when fossil fuels are burned?",
        "Carbon dioxide (CO2)"
      ],
      [
        "What is the long-term rise in Earth's average temperature called?",
        "Global warming"
      ],
      [
        "Which energy source uses sunlight to produce electricity?",
        "Solar energy"
      ],
      [
        "What do we call planting trees in areas that previously lacked forests?",
        "Afforestation"
      ],
      [
        "Which greenhouse gas is often released by cattle?",
        "Methane"
      ],
      [
        "What does deforestation mean?",
        "Clearing or removing forests"
      ],
      [
        "Name one renewable energy source.",
        "Solar, wind or hydropower"
      ],
      [
        "What is the opposite of renewable energy?",
        "Non-renewable energy"
      ],
      [
        "What converts wind energy into electricity?",
        "A wind turbine"
      ],
      [
        "What does a carbon footprint measure?",
        "Greenhouse gas emissions associated with an activity or person"
      ],
      [
        "What happens to sea levels as land-based ice melts?",
        "Sea levels rise"
      ],
      [
        "Name one health risk caused by extreme heat.",
        "Heat exhaustion or heatstroke"
      ],
      [
        "Which human activity releases CO2 from coal, oil and gas?",
        "Burning fossil fuels"
      ],
      [
        "Why is recycling important?",
        "It reduces waste and demand for raw materials"
      ],
      [
        "What is a goal of the Paris Agreement?",
        "To limit global warming"
      ],
      [
        "How can you travel to school with lower emissions?",
        "Walk, cycle or use public transport"
      ],
      [
        "What does energy-efficient mean?",
        "Using less energy for the same task"
      ],
      [
        "What is a drought?",
        "A prolonged period with little rainfall"
      ],
      [
        "What does biodiversity mean?",
        "The variety of living organisms"
      ],
      [
        "How is climate different from weather?",
        "Climate describes long-term patterns; weather describes short-term conditions"
      ],
      [
        "Give one action students can take to fight climate change.",
        "Save electricity or reduce waste"
      ],
      [
        "Which gas is represented by N2O?",
        "Nitrous oxide"
      ],
      [
        "What is a flood?",
        "Water covering land that is usually dry"
      ],
      [
        "What is the main energy source for photovoltaic panels?",
        "Sunlight"
      ],
      [
        "What is a carbon sink?",
        "Something that absorbs more carbon than it releases"
      ],
      [
        "What is ocean warming?",
        "An increase in the temperature of ocean water"
      ],
      [
        "What is compost made from?",
        "Decomposed organic material"
      ],
      [
        "What does sustainable development seek to balance?",
        "Environmental, social and economic needs"
      ],
      [
        "What is an ecosystem?",
        "Organisms interacting with each other and their environment"
      ],
      [
        "How can schools save electricity used for lighting?",
        "Switch off unused lights or use LED bulbs"
      ],
      [
        "What is the verb form of emission?",
        "Emit"
      ],
      [
        "What is the adjective form of environment?",
        "Environmental"
      ],
      [
        "What is the noun form of pollute?",
        "Pollution"
      ],
      [
        "What does conserve mean?",
        "Protect or use resources carefully"
      ],
      [
        "Why do growing trees help reduce atmospheric CO2?",
        "They absorb CO2 through photosynthesis"
      ],
      [
        "What is climate adaptation?",
        "Adjusting to the effects of climate change"
      ]
    ]
  },
  {
    "id": "g11-participle-clauses",
    "titleVi": "Tiếng Anh 11 · Mệnh đề phân từ",
    "titleEn": "English 11 · Participle Clauses",
    "level": "B1–B2",
    "topic": "Present & Past Participle Clauses",
    "items": [
      [
        "Complete: ___ tired, she went to bed early.",
        "Feeling"
      ],
      [
        "Complete: ___ by the rain, the match was postponed.",
        "Affected"
      ],
      [
        "Complete: ___ the instructions, he started working.",
        "Having read"
      ],
      [
        "Complete: ___ from the hill, the lake looks beautiful.",
        "Seen"
      ],
      [
        "Complete: ___ through the park, I met my teacher.",
        "Walking"
      ],
      [
        "Complete: ___ carefully, the report contained no errors.",
        "Written"
      ],
      [
        "Complete: ___ what to do, she called her mentor.",
        "Not knowing"
      ],
      [
        "Complete: ___ in 2010, the school serves hundreds of pupils.",
        "Founded"
      ],
      [
        "Complete: ___ late, he missed the opening speech.",
        "Arriving"
      ],
      [
        "Complete: ___ by loud music, the baby woke up.",
        "Disturbed"
      ],
      [
        "Reduce: Because he was ill, he stayed home.",
        "Being ill, he stayed home."
      ],
      [
        "Reduce: As she walked home, she called her friend.",
        "Walking home, she called her friend."
      ],
      [
        "Reduce: Because it was damaged, the door would not open.",
        "Damaged, the door would not open."
      ],
      [
        "Reduce: Because he had finished his work, he left.",
        "Having finished his work, he left."
      ],
      [
        "Reduce: As they were encouraged by their coach, they trained hard.",
        "Encouraged by their coach, they trained hard."
      ],
      [
        "Which form often shows active meaning: V-ing or V3?",
        "V-ing"
      ],
      [
        "Which form often shows passive meaning: V-ing or V3?",
        "V3 / past participle"
      ],
      [
        "What is the past participle of write?",
        "Written"
      ],
      [
        "What is the present participle of run?",
        "Running"
      ],
      [
        "What is the past participle of choose?",
        "Chosen"
      ],
      [
        "What is the present participle of lie (rest)?",
        "Lying"
      ],
      [
        "Complete: ___ the message, she smiled.",
        "Reading"
      ],
      [
        "Complete: ___ by the result, they celebrated.",
        "Delighted"
      ],
      [
        "Complete: ___ the problem, the team proposed a solution.",
        "Understanding"
      ],
      [
        "Complete: ___ in a hurry, he forgot his keys.",
        "Leaving"
      ],
      [
        "Complete: ___ in English, the document was easy to share.",
        "Written"
      ],
      [
        "Complete: ___ to the audience, the speaker used simple words.",
        "Speaking"
      ],
      [
        "Complete: ___ previously, this topic needs no introduction.",
        "Discussed"
      ],
      [
        "Complete: ___ the last bus, we took a taxi.",
        "Missing"
      ],
      [
        "Complete: ___ in several languages, the notice reached more people.",
        "Published"
      ],
      [
        "Complete: ___ the lights, they saved electricity.",
        "Switching off"
      ],
      [
        "Complete: ___ in bright colours, the posters attracted attention.",
        "Printed"
      ],
      [
        "Complete: ___ at the map, I found the shortest route.",
        "Looking"
      ],
      [
        "Complete: ___ of plastic, the reusable bottle is lightweight.",
        "Made"
      ],
      [
        "Complete: ___ the deadline, the group submitted early.",
        "Knowing"
      ],
      [
        "Complete: ___ the report, she checked the figures.",
        "Finishing"
      ]
    ]
  },
  {
    "id": "g12-comparisons",
    "titleVi": "Tiếng Anh 12 · Chuyên đề so sánh",
    "titleEn": "English 12 · Comparisons",
    "level": "B1–C1",
    "topic": "Comparisons",
    "items": [
      [
        "Complete: This road is ___ than the old one. (wide)",
        "wider"
      ],
      [
        "Complete: She is the ___ student in our class. (hard-working)",
        "most hard-working"
      ],
      [
        "Complete: The sooner we start, the ___ we finish.",
        "sooner"
      ],
      [
        "Complete: The more you practise, the ___ you become. (confident)",
        "more confident"
      ],
      [
        "Complete: This problem is not as ___ as it looks. (simple)",
        "simple"
      ],
      [
        "Complete: My bag is ___ than yours. (heavy)",
        "heavier"
      ],
      [
        "Complete: This is the ___ film I have ever seen. (interesting)",
        "most interesting"
      ],
      [
        "Complete: The weather is getting ___ and ___. (cold)",
        "colder and colder"
      ],
      [
        "Complete: He speaks English as ___ as his brother. (fluent)",
        "fluently"
      ],
      [
        "Complete: The ___ the city grows, the more traffic it has. (large)",
        "larger"
      ],
      [
        "Complete: This machine is twice as ___ as that one. (expensive)",
        "expensive"
      ],
      [
        "Complete: Today is much ___ than yesterday. (hot)",
        "hotter"
      ],
      [
        "Of the two options, this is the ___ one. (good)",
        "better"
      ],
      [
        "It was the ___ day of the trip. (bad)",
        "worst"
      ],
      [
        "The more he reads, the ___ his vocabulary becomes. (rich)",
        "richer"
      ],
      [
        "She drives ___ than she used to. (carefully)",
        "more carefully"
      ],
      [
        "The ___ he ran, the more tired he became. (fast)",
        "faster"
      ],
      [
        "This book is less ___ than that one. (useful)",
        "useful"
      ],
      [
        "Tom is not so tall ___ his father.",
        "as"
      ],
      [
        "We need a ___ approach. (practical)",
        "more practical"
      ],
      [
        "Her health is getting better and ___.",
        "better"
      ],
      [
        "This result is far ___ than expected. (good)",
        "better"
      ],
      [
        "The more crowded the street, the ___ the traffic. (slow)",
        "slower"
      ],
      [
        "Nobody in the team is ___ than Mai. (young)",
        "younger"
      ],
      [
        "The higher the temperature, the ___ the ice melts. (fast)",
        "faster"
      ],
      [
        "This plan is ___ efficient than the first.",
        "more"
      ],
      [
        "This task takes ___ time than the previous one. (little)",
        "less"
      ],
      [
        "The earlier you arrive, the ___ seats you can choose. (good)",
        "better"
      ],
      [
        "This sofa is as ___ as the other one. (comfortable)",
        "comfortable"
      ],
      [
        "What is the comparative form of far for distance?",
        "farther or further"
      ],
      [
        "This question is ___ difficult than I expected.",
        "more"
      ],
      [
        "The ___ you spend, the less you save. (much)",
        "more"
      ],
      [
        "This is one of the ___ museums in the city. (old)",
        "oldest"
      ],
      [
        "His writing is becoming more and more ___. (clear)",
        "clear"
      ],
      [
        "That restaurant is not nearly as ___ as this one. (busy)",
        "busy"
      ],
      [
        "The ___ the instructions, the fewer mistakes we make. (clear)",
        "clearer"
      ]
    ]
  }
];

const normalize=q=>({
  prompt:String((Array.isArray(q)?q[0]:q.prompt)||'').trim().slice(0,600),
  answer:String((Array.isArray(q)?q[1]:q.answer)||'').trim().slice(0,300),
  ...(Array.isArray(q)?{}:q.options?{
    options:q.options.slice(0,4).map(v=>String(v).slice(0,200)),
    answerIndex:q.answerIndex,explanation:String(q.explanation||'').slice(0,400),
    unit:q.unit,topic:q.topic,
  }:{})
});
function parseDelimited(text,delimiter=','){
  const rows=[];let row=[],cell='',quoted=false;
  for(let i=0;i<text.length;i++){
    const ch=text[i],next=text[i+1];
    if(ch==='"'){
      if(quoted&&next==='"'){cell+='"';i++;}else quoted=!quoted;
    }else if(!quoted&&ch===delimiter){row.push(cell);cell='';}
    else if(!quoted&&(ch==='\n'||ch==='\r')){
      if(ch==='\r'&&next==='\n')i++;
      row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
      row=[];cell='';
    }else cell+=ch;
  }
  row.push(cell);if(row.some(v=>v.trim()))rows.push(row);
  return rows;
}
export function parseArenaQuestions(input){
  const text=String(input||'').replace(/^\uFEFF/,'').trim();
  if(!text)return [];
  let rows;
  if(text.includes('||'))rows=text.split(/\r?\n/).filter(Boolean).map(line=>{
    const pos=line.indexOf('||');return pos<0?[line,'']:[line.slice(0,pos),line.slice(pos+2)];
  });
  else rows=parseDelimited(text,text.includes('\t')&&!text.includes(',')?'\t':',');
  if(rows.length&&/^(question|prompt|câu hỏi)$/i.test(String(rows[0][0]||'').trim()))rows=rows.slice(1);
  return rows.map(normalize).filter(x=>x.prompt).slice(0,300);
}
export const SAMPLE_PACKS=Object.freeze(rawPacks.map(({items,...meta})=>Object.freeze({
  ...meta,items:Object.freeze(items.map(q=>Object.freeze(normalize(q)))),
  count:items.length,
})));
export const getSamplePack=id=>SAMPLE_PACKS.find(pack=>pack.id===id)||SAMPLE_PACKS[0];
export const packToText=pack=>pack.items.map(q=>q.prompt+' || '+q.answer).join('\n');
export function toArenaCSV(questions){
  const quote=value=>'"'+String(value??'').replace(/"/g,'""')+'"';
  return '\uFEFF'+[['question','answer'],...questions.map(q=>[q.prompt,q.answer])]
    .map(row=>row.map(quote).join(',')).join('\r\n');
}
export const EMPTY_CSV_TEMPLATE='\uFEFF"question","answer"\r\n';
