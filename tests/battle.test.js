import test from 'node:test';
import assert from 'node:assert/strict';
import { CREATURES } from '../src/data.js';
import { createBattle, stepBattle, chooseEnemyAction, effectiveness } from '../src/battle.js';
const fresh = () => createBattle(['fox','turtle','deer'], ['ape','boar','fish']);
const basic = id => ({type:'move',moveId:`${id}-basic`});

test('five elements apply directed strengths, reverse resistance, neutral ties', () => {
  for (const [a,b] of [['金','木'],['木','土'],['土','水'],['水','火'],['火','金']]) {
    assert.equal(effectiveness(a,b),1.5); assert.equal(effectiveness(b,a),0.75); assert.equal(effectiveness(a,a),1);
  }
  assert.equal(effectiveness('木','水'),1); assert.throws(()=>effectiveness('wind','木'));
});
test('each team must contain exactly three distinct known creatures', () => {
  for (const ids of [[],['fox'],['fox','fox','deer'],['fox','deer','unknown'],null]) assert.throws(()=>createBattle(ids,['ape','boar','fish']));
  const s=fresh(); assert.equal(s.player.team.length,3); assert.equal(s.winner,null);
  assert.equal(new Set(CREATURES.map(c=>c.element)).size,5);
});
test('switch precedes enemy hit and leaves original actor untouched', () => {
  const s=fresh(), before=structuredClone(s); const next=stepBattle(s,{type:'switch',index:1});
  assert.deepEqual(s,before); assert.equal(next.player.active,1); assert.equal(next.player.team[0].hp,s.player.team[0].hp); assert.ok(next.player.team[1].hp<s.player.team[1].hp);
});
test('knocked out actor cannot act through automatic replacement', () => {
  const s=fresh(); s.player.team[0].hp=1;
  const n=stepBattle(s,basic('fox'));
  assert.equal(n.player.active,1); assert.equal(n.player.team[0].hp,0); assert.equal(n.enemy.team[0].hp,s.enemy.team[0].hp);
});
test('cooldown blocks consecutive casts then returns, with burn ticking', () => {
  let s=createBattle(['fox','turtle','deer'],['boar','ape','fish']);
  s=stepBattle(s,{type:'move',moveId:'fox-skill'});
  assert.equal(s.player.team[0].cooldowns['fox-skill'],2);
  assert.ok(s.enemy.team[0].burn>0);
  assert.throws(()=>stepBattle(s,{type:'move',moveId:'fox-skill'}));
  s=stepBattle(s,basic('fox')); s=stepBattle(s,basic('fox'));
  assert.equal(s.player.team[0].cooldowns['fox-skill'],0);
});
test('invalid actions and malformed states throw without mutation', () => {
  const s=fresh();
  for (const action of [null,{},basic('fish'),{type:'switch',index:0},{type:'switch',index:5}]) {const before=structuredClone(s); assert.throws(()=>stepBattle(s,action)); assert.deepEqual(s,before);}
  for (const mutate of [s=>s.player.team[0].hp=NaN,s=>s.player.team[0].maxHp=1,s=>s.player.active=9,s=>s.player.team[0].burn=-1,s=>s.player.team[0].cooldowns={},s=>s.turn=-1,s=>s.winner='banana',s=>s.log=[1],s=>s.player.team[0].hp=0]) {const bad=fresh();mutate(bad);assert.throws(()=>stepBattle(bad,basic('fox')));assert.throws(()=>chooseEnemyAction(bad));}
});
test('last knockout resolves winner and finished battle rejects turns', () => {
  const s=createBattle(['fox','turtle','deer'],['boar','ape','fish']);
  s.enemy.team.forEach(c=>c.hp=0);s.enemy.team[0].hp=1;
  const n=stepBattle(s,basic('fox')); assert.equal(n.winner,'player');assert.throws(()=>stepBattle(n,basic('fox')));
});
test('AI is deterministic and has no player-action input', () => {
  const s=fresh();const before=structuredClone(s);assert.deepEqual(chooseEnemyAction(s),chooseEnemyAction(s));assert.deepEqual(s,before);
});
test('shield absorbs damage and healing caps at maximum', () => {
  let s=createBattle(['turtle','fox','deer'],['boar','ape','fish']);
  const unguarded=stepBattle(s,basic('turtle'));
  const guarded=stepBattle(s,{type:'move',moveId:'turtle-guard'});
  assert.ok(guarded.player.team[0].hp>unguarded.player.team[0].hp);
  s=createBattle(['deer','fox','turtle'],['boar','ape','fish']); s.player.team[0].hp-=10;
  const n=stepBattle(s,{type:'move',moveId:'deer-guard'});
  assert.ok(n.player.team[0].hp<=n.player.team[0].maxHp);assert.ok(n.log.some(l=>l.includes('恢复')));
});
test('slow persists into next turn and expires on bench; bench burn still deals damage', () => {
  let s=createBattle(['fish','fox','turtle'],['boar','ape','deer']);
  s=stepBattle(s,{type:'move',moveId:'fish-skill'});assert.equal(s.enemy.team[0].slow,2);
  s.player.team[1].burn=2; const hp=s.player.team[1].hp;
  s=stepBattle(s,basic('fish'));assert.equal(s.enemy.team[0].slow,1);assert.ok(s.player.team[1].hp<hp);
  s=stepBattle(s,basic(s.player.team[s.player.active].id));assert.equal(s.enemy.team[0].slow,0);
});
test('sparse teams cannot create an unplayable battle', () => {
  const ids=['fox','turtle'];ids.length=3;assert.throws(()=>createBattle(ids,['boar','ape','fish']));
});
test('slowing the faster actor changes who can land a finishing blow', () => {
  const s=fresh();s.player.team[0].hp=1;s.enemy.team[0].hp=1;s.enemy.team[0].slow=1;
  const n=stepBattle(s,basic('fox'));assert.equal(n.player.team[0].hp,1);assert.equal(n.enemy.team[0].hp,0);
});
test('simultaneous final burn knockouts draw and bypass shields', () => {
  const s=fresh();s.player.team.forEach(c=>c.hp=0);s.enemy.team.forEach(c=>c.hp=0);
  s.player.team[0].hp=1;s.player.team[0].burn=1;s.player.team[0].shield=36;
  s.enemy.team[0].hp=1;s.enemy.team[0].burn=1;s.enemy.team[0].shield=36;
  const n=stepBattle(s,{type:'move',moveId:'fox-guard'});assert.equal(n.winner,'draw');
});
// This player heuristic uses only displayed move power/cooldowns, with no engine damage helper or AI reuse.
function play(ids, switchForEarth=false) {
  let s=createBattle(ids,['boar','ape','turtle']);
  while(!s.winner && s.turn<80) {
    const actor=s.player.team[s.player.active];
    const moves=CREATURES.find(c=>c.id===actor.id).moves.filter(m=>m.power>0 && actor.cooldowns[m.id]===0);
    const move=moves.sort((a,b)=>b.power-a.power)[0];
    let action={type:'move',moveId:move.id};
    if(switchForEarth) {
      const wanted={boar:'deer',ape:'fox',turtle:'turtle'}[s.enemy.team[s.enemy.active].id];
      const index=s.player.team.findIndex(c=>c.id===wanted && c.hp>0);
      if(index>=0 && index!==s.player.active) action={type:'switch',index};
    }
    s=stepBattle(s,action);
  }
  return s;
}
test('distinct fox and deer compositions can beat the real guardian without hidden information', () => {
  for(const ids of [['fox','ape','turtle'],['deer','ape','fish']]) {
    const s=play(ids);assert.equal(s.winner,'player');assert.ok(s.turn<30);
  }
});
test('water starter can switch to wood against the earth guardian and win', () => {
  assert.equal(play(['turtle','deer','fox'],true).winner,'player');
});
