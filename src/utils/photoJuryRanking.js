/**
 * Public Live Jury rankings. Each artwork belongs to one class/group.
 * Class average = arithmetic mean of the scored GROUP averages, so a judge
 * revisiting the same artwork cannot overweight one class.
 * All values are provisional until the judging session is closed.
 */
export function parseJuryEntry(caption, index) {
  const title=String(caption||'').split('|')[0].trim();
  const match=title.match(/^\s*(\d{1,2}\.\d{1,2})\s+(?:Group|Nhóm)\s*([1-9]\d*)\b/i);
  if(!match) return {className:null,groupNumber:null,label:title||'Artwork #'+String(index+1).padStart(2,'0')};
  return {className:match[1],groupNumber:Number(match[2]),label:match[1]+' Group '+match[2]};
}
const round=value=>Math.round(value*100)/100;
const validAverage=value=>typeof value==='number'&&Number.isFinite(value)&&value>=0&&value<=100;
export function buildJuryRankings(slides=[],artworks=[]) {
  const scoreById=new Map((Array.isArray(artworks)?artworks:[]).map(a=>[a.slideId,a]));
  const groupRows=(Array.isArray(slides)?slides:[]).map((slide,index)=>{
    const info=parseJuryEntry(slide.caption,index);
    const score=scoreById.get(slide.id);
    return {
      slideId:slide.id,
      artworkNumber:index+1,
      label:info.label,
      className:info.className,
      groupNumber:info.groupNumber,
      imageUrl:slide.imageUrl||'',
      score:validAverage(score?.average)?round(score.average):null,
      scoredCount:Math.max(0,Math.floor(Number(score?.scoredCount)||0))
    };
  });
  const sortedGroups=[...groupRows].sort((a,b)=>{
    if(a.score===null)return b.score===null?a.artworkNumber-b.artworkNumber:1;
    if(b.score===null)return -1;
    return b.score-a.score||a.artworkNumber-b.artworkNumber;
  });
  const classes=new Map();
  for(const item of groupRows){
    if(!item.className)continue; // never invent class identifiers
    if(!classes.has(item.className))classes.set(item.className,{name:item.className,totalGroups:0,scoredGroups:0,scoreTotal:0,groupRows:[]});
    const row=classes.get(item.className);
    row.totalGroups++;
    row.groupRows.push(item);
    if(item.score!==null){row.scoredGroups++;row.scoreTotal+=item.score;}
  }
  const classRows=[...classes.values()].map(row=>({
    name:row.name,totalGroups:row.totalGroups,scoredGroups:row.scoredGroups,
    score:row.scoredGroups?round(row.scoreTotal/row.scoredGroups):null,
    groupRows:row.groupRows
  })).sort((a,b)=>{
    if(a.score===null)return b.score===null?a.name.localeCompare(b.name,undefined,{numeric:true}):1;
    if(b.score===null)return -1;
    return b.score-a.score||a.name.localeCompare(b.name,undefined,{numeric:true});
  });
  return {groups:sortedGroups,classes:classRows};
}
