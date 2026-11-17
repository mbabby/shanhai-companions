import test from 'node:test';
import assert from 'node:assert/strict';
import { CREATURES } from '../src/data.js';
import { levelForXp, combatConfig, awardExperience } from '../src/progression.js';
test('levels honor threshold edges and reject invalid experience',()=>{
  for(const [xp,level] of [[0,1],[29,1],[30,2],[89,2],[90,3],[120,3]]) assert.equal(levelForXp(xp),level);
  for(const xp of [-1,NaN,Infinity,1.2,'30']) assert.throws(()=>levelForXp(xp));
});
test('growth and mastery apply once and never mutate base or sibling configs',()=>{
  const original=structuredClone(CREATURES);
  for(const base of CREATURES){
    const c=combatConfig(base.id,90);
    assert.equal(c.hp,base.hp+16);assert.equal(c.attack,base.attack+4);assert.equal(c.defense,base.defense+2);assert.equal(c.speed,base.speed);assert.equal(c.level,3);
    assert.equal(c.moves[1].power,base.moves[1].power+(['fox','turtle','deer'].includes(base.id)?4:0));
    c.moves[0].name='changed';if(c.moves[1].effect)c.moves[1].effect.value=99;
  }
  assert.deepEqual(CREATURES,original);assert.throws(()=>combatConfig('unknown'));
});
test('victory, defeat, draw and cap produce immutable accurate reward records',()=>{
  const progress={fox:80,boar:29,deer:90};
  const result=awardExperience(progress,['fox','boar','deer'],'player');
  assert.deepEqual(result.progress,{fox:90,boar:59,deer:90});
  assert.deepEqual(result.gains,[{id:'fox',xpGained:10,fromLevel:2,toLevel:3,mastered:true},{id:'boar',xpGained:30,fromLevel:1,toLevel:2,mastered:false},{id:'deer',xpGained:0,fromLevel:3,toLevel:3,mastered:false}]);
  assert.deepEqual(progress,{fox:80,boar:29,deer:90});
  for(const winner of ['enemy','draw']) assert.equal(awardExperience({},['fox'],winner).progress.fox,10);
  for(const [p,t,w] of [[{bad:0},['fox'],'player'],[{fox:91},['fox'],'player'],[{},['fox','fox'],'player'],[{},['bad'],'player'],[{},['fox'],null]]) assert.throws(()=>awardExperience(p,t,w));
});
