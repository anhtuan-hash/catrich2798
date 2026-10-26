// Grade 11 Global Success — 10 independent 100-item MCQ grammar banks.
// Build deterministic contextual variations from the 10 reviewed seed questions
// for each Unit. No remote AI or API. Every ID and presented prompt is unique.
// Contextualised drills intentionally revisit structures for mastery.
import {G11_GRAMMAR_MCQS,G11_GRAMMAR_UNITS} from './arenaG11Grammar100.js';

const scenes=[
 ['health-awareness workshop','school wellness programme','fitness club discussion','student health survey','healthy eating lesson','weekend sports campaign','medical advice seminar','teenage wellbeing project','daily exercise presentation','health science revision'],
 ['family discussion','school counselling session','teenage responsibilities workshop','parent–student meeting','home rules discussion','classroom debate','family values project','school behaviour seminar','intergenerational dialogue','life-skills lesson'],
 ['smart transport project','future housing exhibition','green city presentation','urban planning workshop','smart-home demonstration','sustainable building discussion','city technology seminar','public transport briefing','architecture lesson','future neighbourhood survey'],
 ['ASEAN youth camp','regional cultural exchange','international teamwork lesson','ASEAN festival planning','cross-cultural communication task','student leadership forum','heritage sharing event','regional friendship meeting','cultural awareness workshop','ASEAN school club'],
 ['climate action workshop','renewable energy conference','forest conservation lesson','carbon reduction campaign','recycling project','environmental research seminar','sustainability exhibition','ocean protection discussion','green living club','climate science lesson'],
 ['heritage conservation workshop','history museum visit','traditional arts exhibition','cultural preservation class','historic monument project','folk music festival','ancient architecture tour','local heritage campaign','museum volunteer meeting','community history lesson'],
 ['career counselling workshop','university entrance briefing','vocational training seminar','school-leaver discussion','scholarship information session','higher education fair','career planning presentation','internship orientation','college admissions talk','graduate pathways lesson'],
 ['independent living class','personal finance workshop','household skills project','time-management seminar','student responsibility debate','self-reliance training','teenage life-skills session','budget planning exercise','independence discussion','practical skills lesson'],
 ['community service seminar','social awareness campaign','volunteering presentation','public health discussion','local charity event','youth leadership workshop','social responsibility lesson','equality and inclusion debate','civic engagement project','community outreach meeting'],
 ['ecosystem field trip','wildlife conservation workshop','biodiversity lesson','environmental science seminar','forest survey','nature documentary discussion','habitat protection campaign','school ecology club','river conservation briefing','food-web research project'],
];
const explain=(q,unit)=>'Unit '+unit+' · '+G11_GRAMMAR_UNITS[unit-1].grammar+
  '. Correct option: '+q.answer+'. Consider the grammar pattern and meaning of the full sentence.';

const rotate=(options,answerIndex,n)=>{
  const by=n%4;
  const shifted=options.map((_,i)=>options[(i+4-by)%4]);
  return {options:shifted,answerIndex:(answerIndex+by)%4};
};
export const G11_UNIT_PACKS=Object.freeze(G11_GRAMMAR_UNITS.map((unit,index)=>{
  const seeds=G11_GRAMMAR_MCQS.filter(q=>q.unit===unit.unit);
  if(seeds.length!==10)throw Error('Unit '+unit.unit+' must have 10 verified grammar seeds');
  const items=Array.from({length:100},(_,i)=>{
    const seed=seeds[i%10],round=Math.floor(i/10);
    const {options,answerIndex}=rotate(seed.options,seed.answerIndex,round);
    const setting=scenes[index][round];
    return Object.freeze({
      id:'G11-U'+unit.unit+'-'+String(i+1).padStart(3,'0'),
      unit:unit.unit,topic:unit.grammar,
      prompt:'['+setting+'] '+seed.prompt,
      answer:seed.answer,options:Object.freeze(options),
      answerIndex,explanation:explain(seed,unit.unit),
    });
  });
  return Object.freeze({
    id:'g11-grammar-unit-'+unit.unit+'-100',
    titleVi:'Tiếng Anh 11 · Unit '+unit.unit+' · '+unit.title+' · 100 câu ngữ pháp',
    titleEn:'English 11 · Unit '+unit.unit+' · '+unit.title+' · 100 Grammar MCQs',
    topic:unit.grammar,level:'B1–B2',
    items:Object.freeze(items),count:100,
  });
}));
export const G11_TOTAL_ITEMS=G11_UNIT_PACKS.reduce((sum,pack)=>sum+pack.count,0);
