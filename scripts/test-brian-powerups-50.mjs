import assert from 'node:assert/strict';
import {initialState,sanitizeState,STORE_VERSION} from '../src/components/BrianInstantTools/instantToolsCore.mjs';
import {
 POWERUP_CARDS,POWERUP_MAX,getPowerup,powerupEligible,sanitizePowerups,
 drawPowerup,decidePowerup
} from '../src/components/BrianInstantTools/powerupCatalog.mjs';

assert.equal(POWERUP_MAX,50);
assert.equal(POWERUP_CARDS.length,50);
assert.equal(new Set(POWERUP_CARDS.map(x=>x.id)).size,50);
assert.equal(POWERUP_CARDS.filter(x=>x.type==='reward').length,25);
assert.equal(POWERUP_CARDS.filter(x=>x.type==='challenge').length,25);
assert.ok(POWERUP_CARDS.every(c=>c.id&&c.vi&&c.en&&c.descriptionVi&&c.descriptionEn));
assert.ok(POWERUP_CARDS.every(c=>!/<script|https?:\/\//i.test(c.descriptionVi+c.descriptionEn)));
const initial=initialState().wheel.powerups;
assert.equal(initial.enabledIds.length,50);
assert.equal(initial.noRepeat,true);
assert.equal(powerupEligible(initial,'all').length,50);
assert.equal(powerupEligible(initial,'reward').length,25);
assert.equal(powerupEligible(initial,'challenge').length,25);
assert.equal(powerupEligible({...initial,enabledIds:['bonus1','minus1']},'all').length,2);
const reward=drawPowerup(powerupEligible(initial,'reward'),()=>0);
const challenge=drawPowerup(powerupEligible(initial,'challenge'),()=>24);
assert.equal(reward.type,'reward');
assert.equal(challenge.type,'challenge');
assert.equal(drawPowerup([],()=>0),null);

const pending={...initial,pending:{cardId:reward.id,team:'Team A'}};
assert.equal(pending.history.length,0,'drawing alone cannot apply points');
const applied=decidePowerup(pending,'applied',1720000000000);
assert.equal(applied.pending,null);
assert.equal(applied.history.length,1);
assert.equal(applied.history[0].status,'applied');
assert.equal(applied.history[0].team,'Team A');
assert.equal(applied.usedIds[0],reward.id);
assert.equal(powerupEligible(applied,'all').length,49);
const skip=decidePowerup({...applied,pending:{cardId:challenge.id,team:'Team B'}},'skipped');
assert.equal(skip.history[0].status,'skipped');
assert.equal(powerupEligible(skip,'all').length,48);
const revisitable={...skip,noRepeat:false};
assert.equal(powerupEligible(revisitable,'all').length,50);
const safe=sanitizePowerups({enabledIds:['fake','bonus1','bonus1'],usedIds:['bad','bonus1'],
 pending:{cardId:'malicious',team:'X'.repeat(300)},history:[{cardId:'evil'},{cardId:'bonus1',status:'applied',team:'Z'.repeat(70),time:4}]});
assert.deepEqual(safe.enabledIds,['bonus1']);assert.deepEqual(safe.usedIds,['bonus1']);
assert.equal(safe.pending,null);
assert.equal(safe.history.length,1);assert.equal(safe.history[0].team.length,36);
const lesson=sanitizeState({version:STORE_VERSION,state:{wheel:{
 names:['Team 1','Team 2','Team 3','Team 4'],powerups:skip
},scoreboard:{teams:[{name:'Team 1',score:8},{name:'Team 2',score:2}]}}});
assert.equal(lesson.wheel.powerups.history.length,2,'approval history must persist');
assert.equal(lesson.wheel.rows.length,4,'normal wheel must remain unchanged');
assert.equal(lesson.scoreboard.teams[0].score,8,'powerups must never auto-change scoreboard');
assert.ok(getPowerup('minus1').descriptionVi.includes('không ảnh hưởng điểm học tập'));
console.log('PASS 50 Power-Ups — 25 rewards/25 challenges, filtering, privacy, teacher approval, no-repeat, persistence, manual scoring.');
