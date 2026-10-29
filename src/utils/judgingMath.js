// Pure judging math, also independently verified by Node test contracts.
export const DEFAULT_RUBRIC = Object.freeze([
  {id:'creativity',label:'Tính sáng tạo',weight:30},
  {id:'theme',label:'Bám sát chủ đề',weight:25},
  {id:'art',label:'Bố cục và thẩm mỹ',weight:25},
  {id:'message',label:'Thông điệp tác phẩm',weight:20},
]);
export function weightedTotal(criteria, rubric) {
  return Math.round(rubric.reduce((sum, item) => sum + Number(criteria[item.id]) * Number(item.weight) / 10, 0) * 100) / 100;
}
export function isComplete(criteria, rubric) {
  return rubric.length > 0 && rubric.every(item =>
    typeof criteria?.[item.id] === 'number' &&
    criteria[item.id] >= 0 && criteria[item.id] <= 10 &&
    Number.isInteger(criteria[item.id] * 2)
  );
}
