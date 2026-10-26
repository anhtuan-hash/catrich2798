import {test,expect} from '@playwright/test';

const selectors={
  chat:'.bes-kira-chat-launcher',
  approvals:'.bes-approval-fab',
  focus:'.bfc-bubble',
  board:'.bbd-board-fab',
};

async function snapshot(page,role,drawer=false){
  await page.goto('/tests/fixtures/role-floating-dock.html?role='+role+(drawer?'&drawer=1':''));
  return page.evaluate((names)=>{
    const loc={};
    for(const [name,selector] of Object.entries(names)){
      const el=document.querySelector(selector);
      if(!el){loc[name]=null;continue;}
      const s=getComputedStyle(el),r=el.getBoundingClientRect();
      loc[name]={
        left:r.left,right:r.right,bottom:r.bottom,top:r.top,
        w:r.width,h:r.height,cx:r.left+r.width/2,cy:r.top+r.height/2,
        computedBottom:s.bottom,
      };
    }
    return {loc,role:document.body.dataset.fixtureRole,width:innerWidth,height:innerHeight};
  },selectors);
}
function checkSpacing(positions,order,diameter,gap){
  for(const name of order){
    expect(positions[name],name+' should render').not.toBeNull();
    expect(Math.abs(positions[name].w-diameter),name+' width').toBeLessThanOrEqual(2);
    expect(Math.abs(positions[name].h-diameter),name+' height').toBeLessThanOrEqual(2);
    expect(Math.abs(positions[name].cx-positions[order[0]].cx),name+' horizontal axis').toBeLessThanOrEqual(2);
  }
  for(let i=0;i<order.length-1;i++){
    const top=positions[order[i]],lower=positions[order[i+1]];
    expect(Math.abs((lower.top-top.bottom)-gap),order[i]+' → '+order[i+1]+' gap').toBeLessThanOrEqual(2);
  }
}

test('teacher has a gap-free three-item right-side dock',async({page})=>{
  const snap=await snapshot(page,'teacher');
  const small=snap.width<=640,diameter=small?58:62,gap=small?12:14;
  expect(snap.loc.approvals).toBeNull();
  checkSpacing(snap.loc,['board','focus','chat'],diameter,gap);
  expect(snap.loc.chat.right).toBeLessThanOrEqual(snap.width);
  expect(snap.loc.board.top).toBeGreaterThanOrEqual(0);
});

test('admin retains four equally spaced buttons including approvals',async({page})=>{
  const snap=await snapshot(page,'admin');
  const small=snap.width<=640,diameter=small?58:62,gap=small?12:14;
  checkSpacing(snap.loc,['board','focus','approvals','chat'],diameter,gap);
});

test('opening approval drawer does not move Board or Focus',async({page})=>{
  const before=await snapshot(page,'admin');
  const after=await snapshot(page,'admin',true);
  expect(after.loc.approvals).toBeNull();
  for(const key of ['board','focus','chat']){
    expect(Math.abs(before.loc[key].cy-after.loc[key].cy),key+' must not jump').toBeLessThanOrEqual(1);
  }
});

test('teacher dock is exactly one slot shorter than admin without creating a fake approval button',async({page})=>{
  const teacher=await snapshot(page,'teacher');
  const admin=await snapshot(page,'admin');
  const step=(teacher.width<=640?58+12:62+14);
  expect(Math.abs(teacher.loc.board.cy-admin.loc.board.cy-step)).toBeLessThanOrEqual(2);
  expect(Math.abs(teacher.loc.focus.cy-admin.loc.focus.cy-step)).toBeLessThanOrEqual(2);
  expect(Math.abs(teacher.loc.chat.cy-admin.loc.chat.cy)).toBeLessThanOrEqual(1);
  expect(teacher.loc.approvals).toBeNull();
});
