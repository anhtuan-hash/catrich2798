// English 12 Global Success: 10 separately selectable banks, 100 MCQs each.
import {G12_PACKS_1_2} from './arenaG12Units1to2.js';
import {G12_PACKS_3_4} from './arenaG12Units3to4.js';
import {G12_PACKS_5_6} from './arenaG12Units5to6.js';
import {G12_PACKS_7_8} from './arenaG12Units7to8.js';
import {G12_PACKS_9_10} from './arenaG12Units9to10.js';
export const G12_UNIT_PACKS=Object.freeze([
  ...G12_PACKS_1_2,...G12_PACKS_3_4,...G12_PACKS_5_6,...G12_PACKS_7_8,...G12_PACKS_9_10,
]);
export const G12_TOTAL_ITEMS=G12_UNIT_PACKS.reduce((sum,p)=>sum+p.count,0);
if(G12_UNIT_PACKS.length!==10||G12_TOTAL_ITEMS!==1000)throw Error('English 12 unit banks must have exactly 1,000 questions');
