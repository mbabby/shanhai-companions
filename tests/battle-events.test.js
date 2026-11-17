import test from 'node:test';
import assert from 'node:assert/strict';
import * as battle from '../src/battle.js';
const fresh = () => battle.createBattle(['fox','turtle','deer'],['boar','ape','fish']);
const basic = {type:'move',moveId:'fox-basic'};

test('event API is available for presentation without changing legacy state', () => {
  assert.equal(typeof battle.resolveTurn,'function');
  assert.equal(typeof battle.previewMove,'function');
});
test('move snapshots preserve hit then faint then replacement and cancel defeated actions', () => {
  const s=fresh();s.enemy.team[0].hp=1;
  const {state,events}=battle.resolveTurn(s,basic);
  assert.deepEqual(events.map(e=>e.type),['move','faint','replace','roundEnd']);
  assert.equal(events[0].state.enemy.active,0);
  assert.equal(events[0].state.enemy.team[0].hp,0);
  assert.equal(events[0].hpDamage,1);
  assert.equal(events[0].actorId,'fox');assert.equal(events[0].targetId,'boar');
  assert.equal(events[1].targetId,'boar');
  assert.equal(events[2].targetId,'ape');assert.equal(events[2].state.enemy.active,1);
  assert.equal(state.player.team[0].hp,112);
  assert.deepEqual(events.at(-1).state,state);
});
test('all event snapshots and result are independent and never carry events recursively', () => {
  const s=fresh(),before=structuredClone(s);
  const {state,events}=battle.resolveTurn(s,basic);
  assert.deepEqual(s,before);assert.deepEqual(state,battle.stepBattle(s,basic));
  for(const e of events) assert.equal(Object.hasOwn(e.state,'events'),false);
  assert.equal(Object.hasOwn(state,'events'),false);
  const later=structuredClone(events.slice(1)),final=structuredClone(state);
  events[0].state.player.team[0].hp=0;events[0].state.log.push('mutated');
  assert.deepEqual(events.slice(1),later);assert.deepEqual(state,final);assert.deepEqual(s,before);
});
test('switch event precedes enemy hit and identifies the replacement recipient', () => {
  const {events}=battle.resolveTurn(fresh(),{type:'switch',index:1});
  assert.equal(events[0].type,'switch');assert.equal(events[0].actorId,'fox');assert.equal(events[0].targetId,'turtle');
  assert.equal(events[0].state.player.team[1].hp,145);
  assert.equal(events[1].type,'move');assert.equal(events[1].targetId,'turtle');
});
test('preview uses exact shield and capped health loss and agrees with actual attack', () => {
  const s=fresh();s.enemy.team[0].shield=28;s.enemy.team[0].hp=4;
  const preview=battle.previewMove(s,'fox-basic');
  assert.deepEqual(preview,{damage:35,hpDamage:4,shieldDamage:28,multiplier:1});
  const hit=battle.resolveTurn(s,basic).events[0];
  assert.equal(hit.hpDamage,preview.hpDamage);assert.equal(hit.shieldDamage,28);assert.equal(hit.multiplier,1);
  assert.equal(hit.state.enemy.team[0].shield,0);
});
test('non-damaging previews are zero and moves report actual shield and capped healing amounts', () => {
  const s=fresh();s.player.team[0].shield=30;
  assert.deepEqual(battle.previewMove(s,'fox-guard'),{damage:0,hpDamage:0,shieldDamage:0,multiplier:1});
  const guard=battle.resolveTurn(s,{type:'move',moveId:'fox-guard'}).events[0];
  assert.equal(guard.amount,0);assert.equal(guard.hpDamage,0);assert.equal(guard.shieldDamage,0);
  const heal=battle.createBattle(['deer','fox','turtle'],['boar','ape','fish']);heal.player.team[0].hp=120;
  const event=battle.resolveTurn(heal,{type:'move',moveId:'deer-guard'}).events[0];
  assert.equal(event.amount,2);assert.equal(event.state.player.team[0].hp,122);
});
test('bench burn bypasses shields, identifies its victim and precedes faint', () => {
  const s=fresh();s.player.team[1].hp=1;s.player.team[1].burn=2;s.player.team[1].shield=36;
  const {events,state}=battle.resolveTurn(s,basic);
  const at=events.findIndex(e=>e.type==='burn'),burn=events[at];
  assert.equal(burn.side,'player');assert.equal(burn.targetId,'turtle');assert.equal(burn.hpDamage,1);assert.equal(burn.shieldDamage,0);
  assert.equal(burn.state.player.team[1].hp,0);assert.equal(burn.state.player.team[1].shield,36);
  assert.equal(events[at+1].type,'faint');assert.equal(events[at+1].targetId,'turtle');
  assert.equal(state.player.active,0);
});
test('both final burn deaths occur before final draw without an early replacement', () => {
  const s=battle.createBattle(['fox','turtle','deer'],['ape','boar','fish']);for(const side of ['player','enemy']) {s[side].team.forEach(c=>c.hp=0);Object.assign(s[side].team[0],{hp:1,burn:1,shield:36});}
  const {events,state}=battle.resolveTurn(s,{type:'move',moveId:'fox-guard'});
  assert.equal(events.filter(e=>e.type==='burn').length,2);
  assert.equal(events.filter(e=>e.type==='faint').length,2);
  assert.equal(state.winner,'draw');assert.equal(events.at(-1).state.winner,'draw');
});
test('move snapshot shows newly applied burn before tick and roundEnd expires counters', () => {
  const s=fresh();s.enemy.active=1;s.enemy.team[1].slow=1;
  const before=structuredClone(s),preview=battle.previewMove(s,'fox-skill');
  assert.deepEqual(preview,{damage:70,hpDamage:70,shieldDamage:0,multiplier:1.5});
  const {events,state}=battle.resolveTurn(s,{type:'move',moveId:'fox-skill'});
  const move=events[0];assert.equal(move.multiplier,1.5);assert.equal(move.hpDamage,70);
  assert.equal(move.state.enemy.team[1].burn,3);assert.equal(move.state.enemy.team[1].hp,38);
  const burn=events.find(e=>e.type==='burn');assert.equal(burn.hpDamage,7);assert.equal(burn.state.enemy.team[1].hp,31);
  assert.equal(state.enemy.team[1].burn,2);assert.equal(state.player.team[0].cooldowns['fox-skill'],2);
  assert.deepEqual(s,before);
});
test('preview rejects unrelated moves without mutating state but permits cooldown inspection', () => {
  const s=fresh();s.player.team[0].cooldowns['fox-skill']=2;
  const before=structuredClone(s);
  assert.throws(()=>battle.previewMove(s,'turtle-basic'));
  assert.equal(battle.previewMove(s,'fox-skill').damage,43);
  assert.throws(()=>battle.resolveTurn(s,{type:'move',moveId:'fox-skill'}));
  assert.deepEqual(s,before);
});
