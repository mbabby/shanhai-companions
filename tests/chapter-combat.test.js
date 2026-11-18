import test from 'node:test';
import assert from 'node:assert/strict';
import * as growth from '../src/progression.js';
import * as battle from '../src/battle.js';
const team=['fox','turtle','deer'], foes=['ape','boar','fish'];
test('explicit evolution requires a mature starter and preserves move IDs',()=>{
 for(const id of team){const base=growth.combatConfig(id,90), evolved=growth.combatConfig(id,90,true);assert.ok(evolved.hp>base.hp);assert.deepEqual(evolved.moves.map(m=>m.id),base.moves.map(m=>m.id));assert.ok(growth.EVOLUTIONS[id].description);assert.throws(()=>growth.combatConfig(id,30,true));}
 assert.throws(()=>growth.combatConfig('ape',90,true));assert.throws(()=>growth.combatConfig('fox',90,'yes'));
});
test('evolution battle options and legacy missing flags validate',()=>{
 const s=battle.createBattle(team,foes,{playerProgress:{fox:90},playerEvolved:['fox'],enemyProgress:{ape:30}});assert.equal(s.player.team[0].evolved,true);assert.equal(s.enemy.team[0].level,2);assert.ok(battle.validateBattle(s));
 const old=battle.createBattle(team,foes);for(const side of ['player','enemy'])for(const c of old[side].team)delete c.evolved;assert.ok(battle.validateBattle(old));
 for(const options of [{playerEvolved:['fox']},{playerEvolved:['unknown']},{playerEvolved:['fox','fox']},{enemyProgress:{ape:91}},{encounterId:'bogus'}])assert.throws(()=>battle.createBattle(team,foes,options));
 const bad=structuredClone(s);bad.player.team[0].evolved='yes';assert.throws(()=>battle.validateBattle(bad));
});
test('ridge shield terrain is in preview, result, telegraph and all snapshots',()=>{
 const s=battle.createBattle(team,['boar','ape','fish'],{encounterId:'ridge'}), plain=battle.createBattle(team,['boar','ape','fish']);
 assert.equal(battle.previewMove(s,'fox-basic').damage,battle.previewMove(plain,'fox-basic').damage-8);assert.match(battle.encounterTelegraph(s),/8/);
 const r=battle.resolveTurn(s,{type:'move',moveId:'fox-basic'});assert.equal(r.events.find(e=>e.type==='move'&&e.side==='player').hpDamage,battle.previewMove(s,'fox-basic').hpDamage);assert.ok(r.events.every(e=>e.state.encounterId==='ridge'));assert.equal(r.state.encounterId,'ridge');
 const bad=structuredClone(s);bad.encounterId='unknown';assert.throws(()=>battle.validateBattle(bad));
});
test('marsh visibly slows the player on even rounds',()=>{
 const s=battle.createBattle(team,['fish','boar','ape'],{encounterId:'marsh'});s.turn=2;assert.match(battle.encounterTelegraph(s),/减半/);
 const r=battle.resolveTurn(s,{type:'move',moveId:'fox-basic'});assert.equal(r.events.find(e=>e.type==='move').side,'enemy');
});
test('source third round attack bonus matches its telegraph',()=>{
 const s=battle.createBattle(team,['fish','boar','ape'],{encounterId:'source'});s.turn=3;const plain=structuredClone(s);delete plain.encounterId;
 const first=x=>battle.resolveTurn(x,{type:'move',moveId:'fox-basic'}).events.find(e=>e.type==='move'&&e.side==='enemy');assert.equal(first(s).hpDamage,first(plain).hpDamage+8);assert.match(battle.encounterTelegraph(s),/8/);
});
test('evolved turtle shields while attacking and evolved deer heals while attacking',()=>{
 for(const [id,effect,value] of [['turtle','shield',24],['deer','heal',18]]){
 const ids=[id,...team.filter(x=>x!==id)],s=battle.createBattle(ids,foes,{playerProgress:{[id]:90},playerEvolved:[id]});s.player.team[0].hp-=30;
 const r=battle.resolveTurn(s,{type:'move',moveId:`${id}-skill`}),event=r.events.find(e=>e.type==='move'&&e.side==='player');assert.ok(event.hpDamage>0);assert.equal(event.amount,value);assert.equal(growth.combatConfig(id,90,true).moves[1].effect.type,effect);
 }
});
test('global evolution collection may include reserves',()=>{
 const s=battle.createBattle(['turtle','deer','boar'],foes,{playerProgress:{fox:90},playerEvolved:['fox']});assert.ok(s.player.team.every(c=>!c.evolved));
 assert.throws(()=>battle.createBattle(team,foes,{playerProgress:{ape:90},playerEvolved:['ape']}));
});
test('three starter orders can win each encounter without grind',t=>{
 for(const encounterId of ['ridge','marsh','source'])for(const lead of team){
  const ids=[lead,...team.filter(id=>id!==lead)],mature=encounterId!=='ridge';
  let s=battle.createBattle(ids,{ridge:['ape','boar','fox'],marsh:['fish','turtle','deer'],source:['boar','ape','fish']}[encounterId],{encounterId,playerProgress:mature?{fox:90,turtle:90,deer:90}:{},playerEvolved:mature?team:[]});
  while(!s.winner&&s.turn<40){
   const a=s.player.team[s.player.active],move=growth.combatConfig(a.id,a.xp,a.evolved).moves.filter(m=>m.power>0&&!a.cooldowns[m.id]).sort((a,b)=>b.power-a.power)[0];
   let action={type:'move',moveId:move.id};
   if(encounterId==='ridge'){const wanted={ape:'fox',boar:'deer',fox:'turtle'}[s.enemy.team[s.enemy.active].id],index=s.player.team.findIndex(c=>c.id===wanted&&c.hp>0);if(index>=0&&index!==s.player.active)action={type:'switch',index};}
   s=battle.stepBattle(s,action);assert.ok(battle.validateBattle(s));
  }
  assert.equal(s.winner,'player',`${encounterId} / ${lead}`);t.diagnostic(`${encounterId} ${lead}: ${s.turn-1} turns`);
 }
});
test('evolved fox skill is a stronger burning attack without automatic evolution',()=>{
 const base=growth.combatConfig('fox',90),e=growth.combatConfig('fox',90,true);assert.equal(e.moves[1].power,base.moves[1].power+8);assert.deepEqual(e.moves[1].effect,{type:'burn',value:3});assert.notEqual(base.name,e.name);
});
