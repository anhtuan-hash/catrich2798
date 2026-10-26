// Brian Bomb Arena | Grade 12 grammar practice builder (offline).
// Every Unit has 20 authored grammar stems with five topical substitutions,
// yielding 100 fully formed multiple-choice items per Unit.
// We use contextual practice variations, NOT copies with a decorative prefix.
// Each item is independently addressed, graded and explained.
export function buildG12Unit({unit,title,grammar,seeds}){
  if(!Number.isInteger(unit)||unit<1||unit>10||seeds.length!==20)throw Error('Invalid Grade 12 unit configuration');
  const items=seeds.flatMap((seed,stemIndex)=>{
    const [pattern,choices,correctIndex,variants,reason]=seed;
    if(choices.length!==4||variants.length!==5||
      new Set(choices).size!==4||correctIndex<0||correctIndex>3||!reason)
      throw Error('Invalid G12 seed Unit '+unit+' #'+(stemIndex+1));
    const fullPattern=pattern.includes('@')?pattern:'@ '+pattern.charAt(0).toLowerCase()+pattern.slice(1);
    if(!fullPattern.includes('___')&&!choices.some(x=>/^(Simple|Compound|Complex)$/i.test(x)))
      throw Error('MCQ missing blank in Unit '+unit+' seed '+(stemIndex+1));
    return variants.map((replacement,v)=>{
      const offset=(stemIndex+v)%4,options=choices.map((_,i)=>choices[(i+4-offset)%4]);
      return Object.freeze({
        id:'G12-U'+unit+'-'+String(stemIndex*5+v+1).padStart(3,'0'),
        unit,grade:12,topic:grammar,
        prompt:(fullPattern.includes('___')?'': 'Identify the sentence type: ')+fullPattern.replace('@',replacement),
        options:Object.freeze(options),
        answer:choices[correctIndex],
        answerIndex:(correctIndex+offset)%4,
        explanation:reason,
      });
    });
  });
  if(items.length!==100||new Set(items.map(item=>item.prompt)).size!==100)
    throw Error('Duplicate or missing contextual questions in Unit '+unit);
  return Object.freeze({
    id:'g12-grammar-unit-'+unit+'-100',grade:12,
    titleVi:'Tiếng Anh 12 · Unit '+unit+' · '+title+' · 100 câu ngữ pháp',
    titleEn:'English 12 · Unit '+unit+' · '+title+' · 100 Grammar MCQs',
    topic:grammar,level:'B1–C1',items:Object.freeze(items),count:100,
  });
}
