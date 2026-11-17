import test from 'node:test';
import assert from 'node:assert/strict';
import {CREATURES} from '../src/data.js';
import {createBattle,stepBattle,validateBattle} from '../src/battle.js';
// Human-readable policy: greatest displayed power; optional visible elemental matchup switches.
function play(ids,matchups=false) {
 let state=createBattle(ids,['boar','ape','turtle']);
 while(!state.winner && state.turn<80) {
  const actor=state.player.team[state.player.active];
  const move=CREATURES.find(c=>c.id===actor.id).moves.filter(m=>m.power>0&&!actor.cooldowns[m.id]).sort((a,b)=>b.power-a.power)[0];
  let action={type:'move',moveId:move.id};
  if(matchups) {
   const wanted={boar:'deer',ape:'fox',turtle:'turtle'}[state.enemy.team[state.enemy.active].id];
   const index=state.player.team.findIndex(c=>c.id===wanted&&c.hp>0);
   if(index>=0&&index!==state.player.active)action={type:'switch',index};
  }
  state=stepBattle(state,action);assert.equal(validateBattle(state),true);
 }
 return {winner:state.winner,rounds:state.turn-1,hp:state.player.team.map(c=>c.hp)};
}
test('Lv1 obtainable starter routes and the water matchup tradeoff remain reproducible',t=>{
 const cases=[
  {ids:['fox','ape','turtle'],matchups:false,winner:'player'},
  {ids:['deer','ape','fish'],matchups:false,winner:'player'},
  {ids:['turtle','deer','fox'],matchups:false,winner:'enemy'},
  {ids:['turtle','deer','fox'],matchups:true,winner:'player'},
 ];
 for(const c of cases){const actual=play(c.ids,c.matchups);assert.equal(actual.winner,c.winner);assert.ok(actual.rounds<30);t.diagnostic(JSON.stringify({...c,...actual}));}
});
