import test from 'node:test';
import assert from 'node:assert/strict';
import * as battle from '../src/battle.js';
const fresh=()=>battle.createBattle(['turtle','fox','deer'],['ape','boar','fish']);
const act=moveId=>({type:'move',moveId});
test('priority guard saves a slower creature from a lethal hit',()=>{
 const s=fresh();s.player.team[0].hp=30;
 assert.equal(battle.stepBattle(s,act('turtle-basic')).player.team[0].hp,0);
 const out=battle.resolveTurn(s,act('turtle-guard'));
 assert.equal(out.events[0].actorId,'turtle');assert.equal(out.events[0].moveId,'turtle-guard');
 assert.equal(out.state.player.team[0].hp,25);
 assert.equal(out.state.player.team[0].cooldowns['turtle-guard'],3);
});
test('battle derives level stats and skill mastery from persisted xp',()=>{
 const s=battle.createBattle(['fox','turtle','deer'],['ape','boar','fish'],{playerProgress:{fox:90,turtle:30}});
 assert.equal(s.player.team[0].level,3);assert.equal(s.player.team[0].xp,90);assert.equal(s.player.team[0].maxHp,128);
 assert.equal(s.player.team[1].maxHp,153);assert.equal(s.enemy.team[0].level,1);
 assert.ok(battle.previewMove(s,'fox-skill').damage>battle.previewMove(battle.createBattle(['fox','turtle','deer'],['ape','boar','fish']),'fox-skill').damage);
 assert.equal(battle.validateBattle(s),true);
 for(const mutate of [x=>x.player.team[0].level=1,x=>x.player.team[0].xp=91,x=>x.player.team[0].maxHp++,x=>x.enemy.switchCooldown=3]) {const bad=structuredClone(s);mutate(bad);assert.throws(()=>battle.validateBattle(bad));}
});
test('AI can escape a losing matchup but cannot switch in successive rounds',()=>{
 const s=battle.createBattle(['deer','fox','fish'],['boar','ape','turtle']);s.enemy.team[0].hp=65;
 // Deer signature is unavailable: a healthy metal substitute resists the visible wood attack.
 s.player.team[0].cooldowns['deer-skill']=2;
 assert.deepEqual(battle.chooseEnemyAction(s),{type:'switch',index:1});
 const n=battle.stepBattle(s,act('deer-basic'));assert.equal(n.enemy.active,1);assert.equal(n.enemy.switchCooldown,2);
 n.player.active=1;n.enemy.team[1].hp=50;
 assert.equal(battle.chooseEnemyAction(n).type,'move');
});
test('log stays bounded so a long battle remains saveable',()=>{
 const s=fresh();s.log=Array(200).fill('历史');const n=battle.stepBattle(s,act('turtle-basic'));
 assert.ok(n.log.length<=200);assert.equal(battle.validateBattle(n),true);
});
test('AI guards only when it can prevent visible lethal damage and does not read player intent',()=>{
 const s=battle.createBattle(['ape','fox','deer'],['turtle','boar','fish']);s.enemy.team[0].hp=30;
 const before=structuredClone(s);
 assert.deepEqual(battle.chooseEnemyAction(s),act('turtle-guard'));assert.deepEqual(s,before);
 const n=battle.stepBattle(s,act('ape-basic'));
 assert.ok(n.enemy.team[0].hp>0);assert.equal(n.enemy.team[0].cooldowns['turtle-guard'],3);
 assert.notDeepEqual(battle.chooseEnemyAction(n),act('turtle-guard'));
 const healthy=battle.createBattle(['ape','fox','deer'],['turtle','boar','fish']);
 assert.equal(battle.chooseEnemyAction(healthy).moveId,'turtle-skill');
});
test('guard costs the finishing opportunity while normal attack can win immediately',()=>{
 const s=battle.createBattle(['turtle','fox','deer'],['boar','ape','fish']);s.enemy.team.forEach(c=>c.hp=0);s.enemy.team[0].hp=1;
 assert.equal(battle.stepBattle(s,act('turtle-basic')).winner,'player');
 assert.equal(battle.stepBattle(s,act('turtle-guard')).winner,null);
});
test('healing cannot be spammed and never grows maximum health',()=>{
 const s=battle.createBattle(['deer','fox','turtle'],['boar','ape','fish']);s.player.team[0].hp=60;
 const out=battle.resolveTurn(s,act('deer-guard'));
 const heal=out.events.find(e=>e.moveId==='deer-guard');assert.equal(heal.amount,35);
 assert.equal(out.state.player.team[0].maxHp,122);assert.equal(out.state.player.team[0].cooldowns['deer-guard'],3);
 assert.throws(()=>battle.stepBattle(out.state,act('deer-guard')));
});
test('switch priority still precedes an enemy priority guard',()=>{
 const s=battle.createBattle(['ape','fox','deer'],['turtle','boar','fish']);s.enemy.team[0].hp=30;
 const out=battle.resolveTurn(s,{type:'switch',index:1});
 assert.equal(out.events[0].type,'switch');assert.equal(out.events[1].moveId,'turtle-guard');
});
test('invalid xp and forged derived stats cannot enter a battle',()=>{
 for(const playerProgress of [{fox:-1},{fox:91},{fox:1.5},{fox:'30'},{unknown:30},[]]) assert.throws(()=>battle.createBattle(['fox','turtle','deer'],['boar','ape','fish'],{playerProgress}));
 const s=fresh();s.player.team[0].xp=30;assert.throws(()=>battle.validateBattle(s));
});
