// Ten independent Grade 12 Global Success Family Feud games.
// Each game has 12 entirely authored boards (6 suggestions/board). Students
// discuss freely; score rankings are teacher-authored, NOT real survey counts.
import {G12_FEUD_RAW_UNIT_1} from './g12FeudUnit1.js';
import {G12_FEUD_RAW_UNIT_2} from './g12FeudUnit2.js';
import {G12_FEUD_RAW_UNIT_3} from './g12FeudUnit3.js';
import {G12_FEUD_RAW_UNIT_4} from './g12FeudUnit4.js';
import {G12_FEUD_RAW_UNIT_5} from './g12FeudUnit5.js';
import {G12_FEUD_RAW_UNIT_6} from './g12FeudUnit6.js';
import {G12_FEUD_RAW_UNIT_7} from './g12FeudUnit7.js';
import {G12_FEUD_RAW_UNIT_8} from './g12FeudUnit8.js';
import {G12_FEUD_RAW_UNIT_9} from './g12FeudUnit9.js';
import {G12_FEUD_RAW_UNIT_10} from './g12FeudUnit10.js';
const THEMES=[
  {
    "unit": 1,
    "id": "g12-unit-1",
    "title": "Life Stories We Admire",
    "titleVi": "Những cuộc đời truyền cảm hứng",
    "category": "English 12 · Unit 1 · Life Stories We Admire"
  },
  {
    "unit": 2,
    "id": "g12-unit-2",
    "title": "A Multicultural World",
    "titleVi": "Thế giới đa văn hóa",
    "category": "English 12 · Unit 2 · A Multicultural World"
  },
  {
    "unit": 3,
    "id": "g12-unit-3",
    "title": "Green Living",
    "titleVi": "Lối sống xanh",
    "category": "English 12 · Unit 3 · Green Living"
  },
  {
    "unit": 4,
    "id": "g12-unit-4",
    "title": "Urbanisation",
    "titleVi": "Đô thị hóa",
    "category": "English 12 · Unit 4 · Urbanisation"
  },
  {
    "unit": 5,
    "id": "g12-unit-5",
    "title": "The World of Work",
    "titleVi": "Thế giới việc làm",
    "category": "English 12 · Unit 5 · The World of Work"
  },
  {
    "unit": 6,
    "id": "g12-unit-6",
    "title": "Artificial Intelligence",
    "titleVi": "Trí tuệ nhân tạo",
    "category": "English 12 · Unit 6 · Artificial Intelligence"
  },
  {
    "unit": 7,
    "id": "g12-unit-7",
    "title": "The World of Mass Media",
    "titleVi": "Truyền thông đại chúng",
    "category": "English 12 · Unit 7 · The World of Mass Media"
  },
  {
    "unit": 8,
    "id": "g12-unit-8",
    "title": "Wildlife Conservation",
    "titleVi": "Bảo tồn động vật hoang dã",
    "category": "English 12 · Unit 8 · Wildlife Conservation"
  },
  {
    "unit": 9,
    "id": "g12-unit-9",
    "title": "Career Paths",
    "titleVi": "Định hướng nghề nghiệp",
    "category": "English 12 · Unit 9 · Career Paths"
  },
  {
    "unit": 10,
    "id": "g12-unit-10",
    "title": "Lifelong Learning",
    "titleVi": "Học tập suốt đời",
    "category": "English 12 · Unit 10 · Lifelong Learning"
  }
];
const WEIGHT_SETS=[[32,24,17,12,9,6],[35,25,15,12,8,5],[30,23,19,14,9,5],[28,24,20,14,9,5]];
const RAW=[G12_FEUD_RAW_UNIT_1,G12_FEUD_RAW_UNIT_2,G12_FEUD_RAW_UNIT_3,G12_FEUD_RAW_UNIT_4,G12_FEUD_RAW_UNIT_5,G12_FEUD_RAW_UNIT_6,G12_FEUD_RAW_UNIT_7,G12_FEUD_RAW_UNIT_8,G12_FEUD_RAW_UNIT_9,G12_FEUD_RAW_UNIT_10];
function createGame(theme,rows){
  if(rows.length!==12)throw Error('Family Feud Unit '+theme.unit+' requires exactly 12 hand-authored boards');
  const boards=rows.map(([prompt,answers],index)=>{
    if(!prompt||!Array.isArray(answers)||answers.length!==6)
      throw Error('Family Feud invalid Unit '+theme.unit+' board '+(index+1));
    const values=WEIGHT_SETS[(index+theme.unit-1)%WEIGHT_SETS.length];
    return Object.freeze({
      id:'bff-g12-u'+theme.unit+'-q'+String(index+1).padStart(2,'0'),
      category:theme.category,
      prompt,
      answers:Object.freeze(answers.map((text,i)=>Object.freeze({text,points:values[i]}))),
    });
  });
  if(new Set(boards.map(b=>b.prompt.toLowerCase())).size!==boards.length)
    throw Error('Repeated question in Family Feud Unit '+theme.unit);
  return Object.freeze({...theme,boardCount:boards.length,grade:12,
    boards:Object.freeze(boards)});
}
export const GRADE12_FAMILY_FEUD_GAMES=Object.freeze(
  THEMES.map((theme,index)=>createGame(theme,RAW[index]))
);
export const GRADE12_FAMILY_FEUD_TOTAL_BOARDS=GRADE12_FAMILY_FEUD_GAMES.reduce(
  (sum,game)=>sum+game.boardCount,0
);
export const getGrade12FeudGame=id=>GRADE12_FAMILY_FEUD_GAMES.find(g=>g.id===id)||null;
export const GRADE12_FEUD_GAME_DESIGN=Object.freeze({
  roundsRecommended:5,fastMoneyBoards:5,optionalSpareBoards:2,
  scoresAreSimulated:true,
});
