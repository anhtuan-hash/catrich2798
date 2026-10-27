// English 10 Global Success — ten original Family Feud classroom games.
// Scores are intentionally teacher-authored for gameplay, NOT survey votes.
import {G10_FEUD_RAW_UNIT_1} from './g10FeudUnit1.js';
import {G10_FEUD_RAW_UNIT_2} from './g10FeudUnit2.js';
import {G10_FEUD_RAW_UNIT_3} from './g10FeudUnit3.js';
import {G10_FEUD_RAW_UNIT_4} from './g10FeudUnit4.js';
import {G10_FEUD_RAW_UNIT_5} from './g10FeudUnit5.js';
import {G10_FEUD_RAW_UNIT_6} from './g10FeudUnit6.js';
import {G10_FEUD_RAW_UNIT_7} from './g10FeudUnit7.js';
import {G10_FEUD_RAW_UNIT_8} from './g10FeudUnit8.js';
import {G10_FEUD_RAW_UNIT_9} from './g10FeudUnit9.js';
import {G10_FEUD_RAW_UNIT_10} from './g10FeudUnit10.js';
const THEMES=[
  {
    "id": "g10-unit-1",
    "unit": 1,
    "grade": 10,
    "title": "Family Life",
    "titleVi": "Cuộc sống gia đình",
    "category": "English 10 · Unit 1 · Family Life"
  },
  {
    "id": "g10-unit-2",
    "unit": 2,
    "grade": 10,
    "title": "Humans and the Environment",
    "titleVi": "Con người và môi trường",
    "category": "English 10 · Unit 2 · Humans and the Environment"
  },
  {
    "id": "g10-unit-3",
    "unit": 3,
    "grade": 10,
    "title": "Music",
    "titleVi": "Âm nhạc",
    "category": "English 10 · Unit 3 · Music"
  },
  {
    "id": "g10-unit-4",
    "unit": 4,
    "grade": 10,
    "title": "For a Better Community",
    "titleVi": "Vì cộng đồng tốt đẹp hơn",
    "category": "English 10 · Unit 4 · For a Better Community"
  },
  {
    "id": "g10-unit-5",
    "unit": 5,
    "grade": 10,
    "title": "Inventions",
    "titleVi": "Các phát minh",
    "category": "English 10 · Unit 5 · Inventions"
  },
  {
    "id": "g10-unit-6",
    "unit": 6,
    "grade": 10,
    "title": "Gender Equality",
    "titleVi": "Bình đẳng giới",
    "category": "English 10 · Unit 6 · Gender Equality"
  },
  {
    "id": "g10-unit-7",
    "unit": 7,
    "grade": 10,
    "title": "Viet Nam and International Organisations",
    "titleVi": "Việt Nam và các tổ chức quốc tế",
    "category": "English 10 · Unit 7 · Viet Nam and International Organisations"
  },
  {
    "id": "g10-unit-8",
    "unit": 8,
    "grade": 10,
    "title": "New Ways to Learn",
    "titleVi": "Những cách học mới",
    "category": "English 10 · Unit 8 · New Ways to Learn"
  },
  {
    "id": "g10-unit-9",
    "unit": 9,
    "grade": 10,
    "title": "Protecting the Environment",
    "titleVi": "Bảo vệ môi trường",
    "category": "English 10 · Unit 9 · Protecting the Environment"
  },
  {
    "id": "g10-unit-10",
    "unit": 10,
    "grade": 10,
    "title": "Ecotourism",
    "titleVi": "Du lịch sinh thái",
    "category": "English 10 · Unit 10 · Ecotourism"
  }
];
const RAW=[G10_FEUD_RAW_UNIT_1,G10_FEUD_RAW_UNIT_2,G10_FEUD_RAW_UNIT_3,G10_FEUD_RAW_UNIT_4,G10_FEUD_RAW_UNIT_5,G10_FEUD_RAW_UNIT_6,G10_FEUD_RAW_UNIT_7,G10_FEUD_RAW_UNIT_8,G10_FEUD_RAW_UNIT_9,G10_FEUD_RAW_UNIT_10];
const WEIGHTS=[[32,24,17,12,9,6],[35,25,15,12,8,5],[30,23,19,14,9,5],[28,24,20,14,9,5]];
function makeGame(theme,rows){
 if(!Array.isArray(rows)||rows.length!==12)throw Error('Invalid Grade 10 Family Feud Unit '+theme.unit);
 const boards=rows.map(([prompt,answers],i)=>{
   if(typeof prompt!=='string'||!Array.isArray(answers)||answers.length!==6)
     throw Error('Invalid board in Grade 10 Unit '+theme.unit+' #'+(i+1));
   const weights=WEIGHTS[(theme.unit+i-1)%WEIGHTS.length];
   return Object.freeze({
     id:'bff-g10-u'+theme.unit+'-q'+String(i+1).padStart(2,'0'),
     category:theme.category,prompt,
     answers:Object.freeze(answers.map((text,j)=>Object.freeze({text,points:weights[j]}))),
   });
 });
 if(new Set(boards.map(b=>b.prompt.toLowerCase().trim())).size!==boards.length)
    throw Error('Repeated prompt in Grade 10 Unit '+theme.unit);
 return Object.freeze({...theme,boardCount:boards.length,boards:Object.freeze(boards)});
}
export const GRADE10_FAMILY_FEUD_GAMES=Object.freeze(THEMES.map((theme,i)=>makeGame(theme,RAW[i])));
export const GRADE10_FAMILY_FEUD_TOTAL_BOARDS=GRADE10_FAMILY_FEUD_GAMES.reduce((n,g)=>n+g.boardCount,0);
export const getGrade10FeudGame=id=>GRADE10_FAMILY_FEUD_GAMES.find(g=>g.id===id)||null;
export const GRADE10_FEUD_GAME_DESIGN=Object.freeze({mainRounds:5,fastMoneyBoards:5,reserveBoards:2,simulatedScores:true});
