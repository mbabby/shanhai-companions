import test from 'node:test';
import assert from 'node:assert/strict';
import * as c from '../src/chapter.js';
import {createBattle} from '../src/battle.js';
const recruit = (run,id) => { run=c.visitNode(run,['turtle','fish'].includes(id)?'creek':'forest'); ({run}=c.interactNode(run,['turtle','fish'].includes(id)?'clear':'roots')); run=c.startBond(run,id); for(const step of c.HABITS[id].steps) run=c.answerBond(run,step.answer); return run; };
const won = run => { const battle=structuredClone(run.battle); battle.enemy.team.forEach(a=>a.hp=0); battle.winner='player'; return c.recordBattle(run,battle); };
for(const starter of ['fox','turtle','deer']) test(`${starter} can recruit all six and complete chapter without random growth`,()=>{
 let run=c.chooseStarter(c.freshChapter(),starter), progress={};
 for(const id of ['fox','turtle','deer','boar','ape','fish']) if(id!==starter) run=recruit(run,id);
 assert.equal(run.owned.length,6); assert.equal(run.team.length,3);
 run=c.visitNode(run,'creek'); ({run,progress}=c.interactNode(run,'clear',progress));
 run=c.visitNode(run,'ridge'); run=c.beginEncounter(run,progress,'ridge'); ({run,progress}=c.settleEncounter(won(run),progress));
 run=c.visitNode(run,'shrine'); ({run,progress}=c.interactNode(run,'attune',progress));
 for(const id of c.STARTERS) { assert.equal(progress[id],90); run=c.evolveCompanion(run,progress,id); }
 for(const id of ['marsh','source']) {run=c.visitNode(run,id); run=c.beginEncounter(run,progress,id); ({run,progress}=c.settleEncounter(won(run),progress));}
 assert.equal(c.validateChapter(run,progress),true); assert.equal(c.showEnding(run).phase,'ending');
 const before=structuredClone({run,progress}); assert.deepEqual(c.settleEncounter(run,progress),before);
 run=c.visitNode(c.returnToMap(c.showEnding(run)),'source'); run=c.beginEncounter(run,progress,'source'); ({run,progress}=c.settleEncounter(won(run),progress));
 assert.deepEqual(progress,before.progress); assert.equal(run.items.length,new Set(run.items).size);
});
test('mistakes recover, actions are immutable, duplicates never recruit twice',()=>{
 const initial=c.chooseStarter(c.freshChapter(),'fox'), copy=structuredClone(initial);
 let run=c.visitNode(initial,'forest'); assert.equal(c.bondStatus(run,'deer').unlocked,false); assert.throws(()=>c.startBond(run,'deer'),/幼木/); ({run}=c.interactNode(run,'roots')); run=c.startBond(run,'deer');
 const wrong=c.HABITS.deer.steps[0].options.find(o=>o.id!==c.HABITS.deer.steps[0].answer).id;
 run=c.answerBond(run,wrong); assert.equal(run.bond,0); assert.ok(run.note);
 run=recruit(run,'deer'); assert.equal(run.owned.filter(x=>x==='deer').length,1);
 assert.deepEqual(c.startBond(run,'deer').owned,run.owned); assert.deepEqual(initial,copy);
 assert.throws(()=>c.setTeam(run,['fox','fox']),/队伍/); assert.throws(()=>c.setTeam(run,['fish']),/队伍/);
 assert.throws(()=>c.evolveCompanion(run,{},'fox'),/祠|经验/);
});
test('gates, defeat recovery, battle identity and explicit settlement',()=>{
 let run=c.chooseStarter(c.freshChapter(),'turtle'); assert.equal(c.nodeStatus(run,'source').unlocked,false);
 assert.throws(()=>c.visitNode(run,'source')); run=recruit(recruit(run,'ape'),'deer');
 run=c.visitNode(run,'ridge'); run=c.beginEncounter(run,{},'ridge');
 assert.throws(()=>c.returnToMap(run),/战斗/); assert.throws(()=>c.setTeam(run,['ape']),/战斗/);
 assert.throws(()=>c.recordBattle(run,createBattle(['fox','ape','deer'],['ape','boar','fox'])),/战斗|队伍/);
 const battle=structuredClone(run.battle); battle.player.team.forEach(a=>a.hp=0); battle.winner='enemy';
 run=c.recordBattle(run,battle); const settled=c.settleEncounter(run,{}); assert.deepEqual(settled.progress,{}); assert.deepEqual(settled.run.milestones,[]);
 assert.equal(c.returnToMap(settled.run).phase,'map');
});
test('invalid chapter states rejected and late starters can attune',()=>{
 let run=c.chooseStarter(c.freshChapter(),'fox'); assert.throws(()=>c.validateChapter({...run,team:['fish']}));
 assert.throws(()=>c.validateChapter({...run,evolved:['fox']},{}));
 run=recruit(recruit(run,'ape'),'boar'); run=c.visitNode(run,'ridge'); run=c.beginEncounter(run,{},'ridge');
 let progress; ({run,progress}=c.settleEncounter(won(run),{})); run=c.visitNode(run,'shrine'); ({run,progress}=c.interactNode(run,'attune',progress));
 run=recruit(run,'turtle'); run=c.visitNode(run,'shrine'); ({run,progress}=c.interactNode(run,'attune',progress)); assert.equal(progress.turtle,90);
 assert.equal(run.items.filter(i=>i==='spring-tone').length,1);
});
test('milestones and evolution cannot be forged independently of story prerequisites',()=>{
 const run=c.chooseStarter(c.freshChapter(),'fox');
 assert.throws(()=>c.validateChapter({...run,milestones:['source'],items:['spring-heart'],completed:['source']}),/试炼|泉/);
 assert.throws(()=>c.validateChapter({...run,items:['ridge-seal']}),/奖励/);
 assert.throws(()=>c.validateChapter({...run,evolved:['fox']},{fox:90}),/祠|进化/);
 assert.throws(()=>c.validateChapter({...run,node:'source',phase:'node'}),/地点/);
 assert.throws(()=>c.validateChapter({...run,interactions:['creek:clear']}),/互动/);
});
test('all eight environments provide unique readable story and repeatable one-time interactions',()=>{
 let run=c.chooseStarter(c.freshChapter(),'fox');
 assert.equal(c.NODES.length,8); assert.equal(new Set(c.NODES.map(n=>n.id)).size,8);
 for(const id of ['village','forest','creek','overlook']) {run=c.visitNode(run,id); const a=c.NODES.find(n=>n.id===id).actions[0]; ({run}=c.interactNode(run,a.id)); const once=structuredClone(run); ({run}=c.interactNode(run,a.id)); assert.deepEqual(run,once);}
 assert.ok(run.items.includes('leaf-bookmark')); assert.ok(run.clues.includes('water-trace'));
 assert.equal(c.validateChapter(run),true);
});
test('team edits after results clear settled battle and refuse unclaimed rewards',()=>{
 let run=c.chooseStarter(c.freshChapter(),'fox');run=recruit(recruit(run,'ape'),'deer');run=c.visitNode(run,'ridge');run=won(c.beginEncounter(run,{},'ridge'));
 const team=[...run.team].reverse();
 assert.throws(()=>c.setTeam(run,team),/结算/);
 let progress;({run,progress}=c.settleEncounter(run,{}));
 const changed=c.setTeam(run,team);assert.deepEqual(changed.team,team);assert.equal(changed.phase,'map');assert.equal(changed.battle,null);assert.equal(changed.battleId,null);assert.equal(c.validateChapter(changed,progress),true);
});
