// Ten original English 11 Global Success Family Feud games.
// 12 standalone B1–B2 discussion boards × 6 teacher-authored answers each.
// All scores are game design weights, NOT the results of a real survey.
import {G11_FEUD_RAW_UNIT_1} from './g11FeudUnit1.js';
import {G11_FEUD_RAW_UNIT_2} from './g11FeudUnit2.js';
import {G11_FEUD_RAW_UNIT_3} from './g11FeudUnit3.js';
import {G11_FEUD_RAW_UNIT_4} from './g11FeudUnit4.js';
import {G11_FEUD_RAW_UNIT_5} from './g11FeudUnit5.js';
import {G11_FEUD_RAW_UNIT_6} from './g11FeudUnit6.js';
import {G11_FEUD_RAW_UNIT_7} from './g11FeudUnit7.js';
import {G11_FEUD_RAW_UNIT_8} from './g11FeudUnit8.js';
import {G11_FEUD_RAW_UNIT_9} from './g11FeudUnit9.js';
import {G11_FEUD_RAW_UNIT_10} from './g11FeudUnit10.js';
const THEMES=[
  {
    "id": "g11-unit-1",
    "unit": 1,
    "grade": 11,
    "title": "A Long and Healthy Life",
    "titleVi": "Sống lâu và khỏe mạnh",
    "category": "English 11 · Unit 1 · A Long and Healthy Life"
  },
  {
    "id": "g11-unit-2",
    "unit": 2,
    "grade": 11,
    "title": "The Generation Gap",
    "titleVi": "Khoảng cách thế hệ",
    "category": "English 11 · Unit 2 · The Generation Gap"
  },
  {
    "id": "g11-unit-3",
    "unit": 3,
    "grade": 11,
    "title": "Cities of the Future",
    "titleVi": "Thành phố tương lai",
    "category": "English 11 · Unit 3 · Cities of the Future"
  },
  {
    "id": "g11-unit-4",
    "unit": 4,
    "grade": 11,
    "title": "ASEAN and Viet Nam",
    "titleVi": "ASEAN và Việt Nam",
    "category": "English 11 · Unit 4 · ASEAN and Viet Nam"
  },
  {
    "id": "g11-unit-5",
    "unit": 5,
    "grade": 11,
    "title": "Global Warming",
    "titleVi": "Sự nóng lên toàn cầu",
    "category": "English 11 · Unit 5 · Global Warming"
  },
  {
    "id": "g11-unit-6",
    "unit": 6,
    "grade": 11,
    "title": "Preserving Our Heritage",
    "titleVi": "Bảo tồn di sản",
    "category": "English 11 · Unit 6 · Preserving Our Heritage"
  },
  {
    "id": "g11-unit-7",
    "unit": 7,
    "grade": 11,
    "title": "Education Options for School-Leavers",
    "titleVi": "Lựa chọn học tập sau trung học",
    "category": "English 11 · Unit 7 · Education Options for School-Leavers"
  },
  {
    "id": "g11-unit-8",
    "unit": 8,
    "grade": 11,
    "title": "Becoming Independent",
    "titleVi": "Trở nên độc lập",
    "category": "English 11 · Unit 8 · Becoming Independent"
  },
  {
    "id": "g11-unit-9",
    "unit": 9,
    "grade": 11,
    "title": "Social Issues",
    "titleVi": "Các vấn đề xã hội",
    "category": "English 11 · Unit 9 · Social Issues"
  },
  {
    "id": "g11-unit-10",
    "unit": 10,
    "grade": 11,
    "title": "The Ecosystem",
    "titleVi": "Hệ sinh thái",
    "category": "English 11 · Unit 10 · The Ecosystem"
  }
];
const WEIGHTS=[[32,24,17,12,9,6],[35,25,15,12,8,5],[30,23,19,14,9,5],[28,24,20,14,9,5]];
const RAW=[G11_FEUD_RAW_UNIT_1,G11_FEUD_RAW_UNIT_2,G11_FEUD_RAW_UNIT_3,G11_FEUD_RAW_UNIT_4,G11_FEUD_RAW_UNIT_5,G11_FEUD_RAW_UNIT_6,G11_FEUD_RAW_UNIT_7,G11_FEUD_RAW_UNIT_8,G11_FEUD_RAW_UNIT_9,G11_FEUD_RAW_UNIT_10];
function createGame(theme,rows){
  if(!Array.isArray(rows)||rows.length!==12)
    throw Error('English 11 Family Feud Unit '+theme.unit+' requires 12 distinct boards');
  const boards=rows.map(([prompt,answers],index)=>{
    if(typeof prompt!=='string'||!Array.isArray(answers)||answers.length!==6)
      throw Error('Invalid Family Feud Unit '+theme.unit+' board '+index);
    const values=WEIGHTS[(theme.unit+index-1)%WEIGHTS.length];
    return Object.freeze({
      id:'bff-g11-u'+theme.unit+'-q'+String(index+1).padStart(2,'0'),
      category:theme.category,prompt,
      answers:Object.freeze(answers.map((text,i)=>Object.freeze({text,points:values[i]}))),
    });
  });
  if(new Set(boards.map(b=>b.prompt.trim().toLowerCase())).size!==boards.length)
    throw Error('Duplicate question in English 11 Unit '+theme.unit);
  return Object.freeze({...theme,boardCount:boards.length,boards:Object.freeze(boards)});
}
export const GRADE11_FAMILY_FEUD_GAMES=Object.freeze(THEMES.map((theme,i)=>createGame(theme,RAW[i])));
export const GRADE11_FAMILY_FEUD_TOTAL_BOARDS=GRADE11_FAMILY_FEUD_GAMES.reduce((sum,g)=>sum+g.boardCount,0);
export const getGrade11FeudGame=id=>GRADE11_FAMILY_FEUD_GAMES.find(g=>g.id===id)||null;
export const GRADE11_FEUD_DESIGN=Object.freeze({recommendedRounds:5,fastMoneyBoards:5,spareBoards:2,simulatedScores:true});
