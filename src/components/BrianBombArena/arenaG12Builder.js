import {AUTHORED_G12_1_2} from './arenaG12Authored1to2.js';
import {AUTHORED_G12_3_4} from './arenaG12Authored3to4.js';
import {AUTHORED_G12_5_6} from './arenaG12Authored5to6.js';
import {AUTHORED_G12_7_8} from './arenaG12Authored7to8.js';
import {AUTHORED_G12_9_10} from './arenaG12Authored9to10.js';
const COMPLETE_G12_QUESTIONS={
  ...AUTHORED_G12_1_2,...AUTHORED_G12_3_4,...AUTHORED_G12_5_6,
  ...AUTHORED_G12_7_8,...AUTHORED_G12_9_10,
};
// These are 1,000 individually written, complete sentence contexts, never name-only permutations.
// Brian Bomb Arena | Grade 12 grammar practice builder (offline).
// Each Unit uses 100 authored, content-diverse full sentences, 20 grammar targets x
// 5 genuinely different situations; no name-substitution generator.
// Each question is individually addressable, graded and explained.
export function buildG12Unit({unit,title,grammar,seeds}){
  if(!Number.isInteger(unit)||unit<1||unit>10||seeds.length!==20)throw Error('Invalid Grade 12 unit configuration');
  const items=seeds.flatMap((seed,stemIndex)=>{
    const [pattern,choices,correctIndex,variants,reason]=seed;
    if(choices.length!==4||variants.length!==5||
      new Set(choices).size!==4||correctIndex<0||correctIndex>3||!reason)
      throw Error('Invalid G12 seed Unit '+unit+' #'+(stemIndex+1));
    const authoredGroup=COMPLETE_G12_QUESTIONS[unit]?.[stemIndex];
    if(!Array.isArray(authoredGroup)||authoredGroup.length!==5)
      throw Error('Incomplete original prompts for Unit '+unit+', group '+(stemIndex+1));
    return authoredGroup.map((authoredPrompt,v)=>{
      const prompt=String(authoredPrompt).trim();
      if(prompt.includes('@')||prompt.length<35||
        !(prompt.includes('___')||prompt.startsWith('Identify the sentence type:')))
        throw Error('Invalid or incomplete authored Grade 12 question '+unit+'/'+stemIndex+'/'+v);
      const offset=(stemIndex+v)%4,options=choices.map((_,i)=>choices[(i+4-offset)%4]);
      return Object.freeze({
        id:'G12-U'+unit+'-'+String(stemIndex*5+v+1).padStart(3,'0'),
        unit,grade:12,topic:grammar,
        prompt,
        options:Object.freeze(options),
        answer:choices[correctIndex],
        answerIndex:(correctIndex+offset)%4,
        explanation:reason,
      });
    });
  });
  if(items.length!==100||new Set(items.map(item=>item.prompt.toLowerCase())).size!==100)
    throw Error('Duplicate or missing contextual questions in Unit '+unit);
  return Object.freeze({
    id:'g12-grammar-unit-'+unit+'-100',grade:12,
    titleVi:'Tiếng Anh 12 · Unit '+unit+' · '+title+' · 100 câu ngữ pháp',
    titleEn:'English 12 · Unit '+unit+' · '+title+' · 100 Grammar MCQs',
    topic:grammar,level:'B1–C1',items:Object.freeze(items),count:100,
  });
}
