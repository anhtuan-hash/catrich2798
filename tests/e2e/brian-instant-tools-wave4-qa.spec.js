import {test,expect} from '@playwright/test';
const url='/tests/fixtures/brian-instant-tools-qa.html';
test.beforeEach(async({page})=>{
  await page.route('https://**/*',route=>route.abort('blockedbyclient'));
  await page.goto(url);
  await page.getByRole('button',{name:'Mở bộ công cụ tức thì'}).click();
  await expect(page.locator('.bit-app-card')).toHaveCount(20);
});
async function tool(page,index){await page.locator('.bit-app-card').nth(index).click();}
test('Final library shows all 20 bilingual tools and retains mobile width',async({page})=>{
  const cards=page.locator('.bit-app-card');
  await expect(cards.nth(15)).toContainText('Chia nhóm nhanh');
  await expect(cards.nth(16)).toContainText('Đồng hồ tiếng ồn');
  await expect(cards.nth(17)).toContainText('Bấm chuông giành quyền');
  await expect(cards.nth(18)).toContainText('Đo phản xạ');
  await expect(cards.nth(19)).toContainText('Chuông lớp học');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBeLessThanOrEqual(3);
  await page.getByRole('button',{name:'Thu nhỏ về bong bóng'}).click();
  await page.getByTestId('lang').click();
  await page.getByRole('button',{name:'Open instant classroom tools'}).click();
  await expect(page.locator('.bit-app-card').nth(15)).toContainText('Group Maker');
  await expect(page.locator('.bit-app-card').nth(19)).toContainText('Class Bell');
});
test('Group Maker handles custom names, balanced 3 teams and local session restoration',async({page})=>{
  await tool(page,15);
  await page.locator('#bit-w4-names').fill('Alice\nBob\nCara\nDan\nElla\nFinn\nGrace');
  await page.locator('#bit-w4-count').fill('3');
  await page.getByRole('button',{name:'Chia nhóm ngẫu nhiên'}).click();
  await expect(page.locator('.bit-w4-group-card')).toHaveCount(3);
  const sizes=await page.locator('.bit-w4-group-card li').evaluateAll(els=>{
    const cards=[...document.querySelectorAll('.bit-w4-group-card')];
    return cards.map(c=>c.querySelectorAll('li').length);
  });
  expect(sizes.reduce((a,b)=>a+b,0)).toBe(7);
  expect(Math.max(...sizes)-Math.min(...sizes)).toBeLessThanOrEqual(1);
  await page.reload();await page.getByRole('button',{name:'Mở bộ công cụ tức thì'}).click();await tool(page,15);
  await expect(page.locator('.bit-w4-group-card')).toHaveCount(3);
});
test('Noise Meter does not request a microphone before tapping and handles denial',async({page})=>{
  await tool(page,16);
  await expect(page.locator('.bit-w4-meter-value')).toHaveText('0');
  await expect(page.locator('.bit-w4-panel')).toContainText('không phải số đo dB');
  await page.evaluate(()=>{
    let count=0;
    Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{
       getUserMedia:async()=>{count++;throw Object.assign(new Error('denied'),{name:'NotAllowedError'});}
    }});
    window.__micCalls=()=>count;
  });
  expect(await page.evaluate(()=>window.__micCalls())).toBe(0);
  await page.getByRole('button',{name:'Bắt đầu đo'}).click();
  await expect(page.getByRole('status')).toContainText('Không thể truy cập microphone');
  expect(await page.evaluate(()=>window.__micCalls())).toBe(1);
});
test('Noise Meter stops tracks when Toolbox is minimized',async({page,browserName})=>{
  await tool(page,16);
  await page.evaluate(()=>{
    window.__stopped=0;
    const original=window.AudioContext||window.webkitAudioContext;
    const ctx=new original(),dest=ctx.createMediaStreamDestination(),osc=ctx.createOscillator();
    osc.frequency.value=90;osc.connect(dest);osc.start();
    window.__audioFixture={ctx,osc};
    Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{
      getUserMedia:async()=>{
        const stream=dest.stream;
        for(const track of stream.getTracks()){
          const stop=track.stop.bind(track);
          track.stop=()=>{window.__stopped++;stop();};
        }
        return stream;
      }
    }});
  });
  await page.getByRole('button',{name:'Bắt đầu đo'}).click();
  await expect(page.locator('.bit-w4-panel')).toContainText('Đang thu mức âm thanh', {timeout:10000});
  await page.getByRole('button',{name:'Thu nhỏ về bong bóng'}).click();
  await expect.poll(async()=>page.evaluate(()=>window.__stopped)).toBeGreaterThan(0);
});
test('Buzzer locks on first team, cannot be stolen, awards score and persists only history',async({page})=>{
  await tool(page,17);
  await expect(page.locator('.bit-w4-buzz-team')).toHaveCount(4);
  await page.getByRole('button',{name:'Bắt đầu lượt mới'}).click();
  await page.locator('.bit-w4-buzz-team').nth(1).getByRole('button',{name:'BẤM CHUÔNG'}).click();
  await expect(page.locator('.bit-w4-buzz-status')).toContainText('Team 2');
  await expect(page.locator('.bit-w4-big-buzz:disabled')).toHaveCount(4);
  await page.getByRole('button',{name:'Cộng điểm'}).click();
  await expect(page.locator('.bit-w4-buzz-team').nth(1)).toContainText('1');
  await page.reload();await page.getByRole('button',{name:'Mở bộ công cụ tức thì'}).click();await tool(page,17);
  await expect(page.locator('.bit-w4-buzz-team').nth(1)).toContainText('1');
  await expect(page.locator('.bit-w4-big-buzz:disabled')).toHaveCount(4);
});
test('Reaction Timer rejects early taps and records a valid tap after green',async({page})=>{
  await tool(page,18);
  await page.getByRole('button',{name:'Bắt đầu thử'}).click();
  await page.locator('.bit-w4-reaction-stage').click();
  await expect(page.locator('.bit-w4-reaction-stage')).toContainText('Bấm quá sớm');
  await page.getByRole('button',{name:'Thử lại'}).click();
  await expect(page.locator('.bit-w4-reaction-stage.is-ready')).toBeVisible({timeout:6500});
  await page.locator('.bit-w4-reaction-stage').click();
  await expect(page.locator('.bit-w4-reaction-stage')).toContainText('ms');
  await page.reload();await page.getByRole('button',{name:'Mở bộ công cụ tức thì'}).click();await tool(page,18);
  await expect(page.locator('.bit-w4-react-stats')).not.toContainText('Tốt nhất: —');
});
test('Class Bell has four click-to-play cues, global mute and persisted controls',async({page})=>{
  await tool(page,19);
  await expect(page.locator('.bit-w4-bell-card')).toHaveCount(4);
  await page.locator('#bit-w4-volume').fill('45');
  await page.locator('#bit-w4-duration').fill('3');
  await page.locator('.bit-w4-bell-card').first().click();
  await expect(page.locator('.bit-w4-panel')).toContainText('Đã phát chuông');
  await page.getByRole('button',{name:'Bật/tắt âm thanh'}).click();
  await expect(page.getByRole('status')).toContainText('Âm thanh toàn cục đang tắt');
  await page.reload();await page.getByRole('button',{name:'Mở bộ công cụ tức thì'}).click();await tool(page,19);
  await expect(page.locator('#bit-w4-volume')).toHaveValue('45');
  await expect(page.locator('#bit-w4-duration')).toHaveValue('3');
});
