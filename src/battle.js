import { CREATURES } from './data.js';
import { combatConfig } from './progression.js';
const config = actor => combatConfig(actor.id,actor.xp,actor.evolved ?? false);
const species = new Map(CREATURES.map(c => [c.id,c]));
const beats = {金:'木',木:'土',土:'水',水:'火',火:'金'};
const sides = ['player','enemy'];
const encounterIds = ['ridge','marsh','source'];
export function encounterTelegraph(state) {
  if (state.encounterId === 'ridge') return state.turn % 2 === 1 ? '岩脊护势：本回合守关方受到的直接伤害减少 8（至少 1）。偶数回合护势消散。' : '岩脊护势消散：本回合直接伤害正常；下回合守关方减伤 8。';
  if (state.encounterId === 'marsh') return state.turn % 2 === 0 ? '泥沼涨水：本回合我方速度减半，与减速叠加；换位与优先技能仍保留优先级。' : '泥沼退水：本回合地形不降低速度；偶数回合我方速度减半。';
  if (state.encounterId === 'source') return state.turn % 3 === 0 ? '泉眼奔涌：本回合守关方每次直接攻击伤害增加 8。' : `泉眼蓄流：距离奔涌还有 ${3-state.turn%3} 回合，届时守关方直接攻击伤害增加 8。`;
  return '';
}
function terrainDamage(state,side) {
  if (state?.encounterId === 'ridge' && state.turn % 2 === 1 && side === 'player') return -8;
  if (state?.encounterId === 'source' && state.turn % 3 === 0 && side === 'enemy') return 8;
  return 0;
}
const integer = (n,min,max=Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(n) && n>=min && n<=max;
const requireThat = (condition,message) => {if (!condition) throw new Error(message);};
export function effectiveness(attackElement,defenseElement) {
  requireThat(Object.hasOwn(beats,attackElement) && Object.hasOwn(beats,defenseElement),'未知五行属性');
  return beats[attackElement]===defenseElement ? 1.5 : beats[defenseElement]===attackElement ? 0.75 : 1;
}
function checkIds(ids) {
  requireThat(Array.isArray(ids) && ids.length===3 && new Set(ids).size===3 && Array.from(ids).every(id=>species.has(id)),'队伍须为三只不同的已知异兽');
}
function result(state) {
  const p=state.player.team.some(c=>c.hp>0),e=state.enemy.team.some(c=>c.hp>0);
  return p && e ? null : p ? 'player' : e ? 'enemy' : 'draw';
}
export function validateBattle(state) {
  requireThat(state && integer(state.turn,1) && Array.isArray(state.log) && state.log.length<=200 && state.log.every(l=>typeof l==='string' && l.length<=500),'战斗状态无效');
  requireThat(state.encounterId === undefined || encounterIds.includes(state.encounterId),'关卡无效');
  for (const side of sides) {
    const squad=state[side];
    requireThat(squad && Array.isArray(squad.team),'队伍状态无效');
    checkIds(squad.team.map(c=>c?.id));
    requireThat(integer(squad.active,0,2) && integer(squad.switchCooldown,0,2),'出场位置无效');
    for (const c of squad.team) {
      requireThat(integer(c.xp,0,90),'经验无效');
      requireThat(c.evolved === undefined || typeof c.evolved === 'boolean','进化标记无效');
      const base=config(c);
      requireThat(c.level===base.level && c.maxHp===base.hp && integer(c.hp,0,c.maxHp) && integer(c.burn,0,3) && integer(c.slow,0,3) && integer(c.shield,0,36),'异兽状态无效');
      requireThat(c.cooldowns && Object.keys(c.cooldowns).length===base.moves.length && base.moves.every(m=>Object.hasOwn(c.cooldowns,m.id) && integer(c.cooldowns[m.id],0,m.cooldown)),'技能冷却无效');
    }
    requireThat(!squad.team.some(c=>c.hp>0) || squad.team[squad.active].hp>0,'倒下异兽必须补位');
  }
  requireThat(state.winner===result(state),'胜负状态不一致');
  return true;
}
export function createBattle(playerIds,enemyIds,options={}) {
  checkIds(playerIds);checkIds(enemyIds);
  requireThat(options && typeof options==='object','战斗选项无效');
  requireThat(options.encounterId === undefined || encounterIds.includes(options.encounterId),'关卡无效');
  const team=(ids,progress={},evolved=[])=>{
    requireThat(progress && typeof progress==='object' && !Array.isArray(progress) && Object.entries(progress).every(([id,xp])=>species.has(id) && integer(xp,0,90)),'成长记录无效');
    requireThat(Array.isArray(evolved) && new Set(evolved).size===evolved.length && evolved.every(id=>species.has(id)),'进化队伍无效');
    for (const id of evolved) combatConfig(id,progress[id]??0,true);
    return {active:0,switchCooldown:0,team:ids.map(id=>{const xp=progress[id]??0,isEvolved=evolved.includes(id),c=combatConfig(id,xp,isEvolved);return {id,xp,evolved:isEvolved,level:c.level,hp:c.hp,maxHp:c.hp,cooldowns:Object.fromEntries(c.moves.map(m=>[m.id,0])),burn:0,slow:0,shield:0};})};
  };
  return {turn:1,player:team(playerIds,options.playerProgress,options.playerEvolved),enemy:team(enemyIds,options.enemyProgress,options.enemyEvolved),...(options.encounterId ? {encounterId:options.encounterId} : {}),winner:null,log:['山隘试炼开始。']};
}
function damage(actor,target,move,state,side) {
  const a=config(actor),d=config(target);
  return Math.max(1,Math.round((move.power+a.attack*.65-d.defense*.45)*effectiveness(a.element,d.element))+terrainDamage(state,side));
}
function impact(actor,target,move,state,side) {
  const multiplier=move.power>0?effectiveness(config(actor).element,config(target).element):1;
  const raw=move.power>0?damage(actor,target,move,state,side):0;
  const shieldDamage=Math.min(target.shield,raw);
  return {damage:raw,hpDamage:Math.min(target.hp,raw-shieldDamage),shieldDamage,multiplier};
}
export function previewMove(state,moveId) {
  validateBattle(state);
  const actor=state.player.team[state.player.active],target=state.enemy.team[state.enemy.active];
  const move=config(actor).moves.find(m=>m.id===moveId);
  requireThat(move,'技能不存在');
  return impact(actor,target,move,state,'player');
}
// Select state fields explicitly: presentation events never become part of game state.
function snapshot(state) {
  const {turn,player,enemy,winner,log}=state;
  return structuredClone({turn,player,enemy,winner,log,...(state.encounterId ? {encounterId:state.encounterId} : {})});
}
export function chooseEnemyAction(state) {
  validateBattle(state);requireThat(!state.winner,'战斗已经结束');
  const actor=state.enemy.team[state.enemy.active],target=state.player.team[state.player.active];
  const moves=config(actor).moves.filter(m=>actor.cooldowns[m.id]===0);
  // Commit only from the public board; never inspect the selected player action.
  const threats=config(target).moves.filter(m=>m.power>0 && target.cooldowns[m.id]===0);
  const incoming=Math.max(...threats.map(m=>damage(target,actor,m,state,'player')));
  const squad=state.enemy;
  // Preserve a wounded disadvantaged ally only if the replacement can absorb a hit.
  // A two-round lock prevents switching back and forth instead of fighting.
  if (!squad.switchCooldown && actor.hp<actor.maxHp*.5 && actor.hp>incoming && effectiveness(config(target).element,config(actor).element)>1) {
    const index=squad.team.findIndex((c,i)=>i!==squad.active && c.hp>0 && effectiveness(config(target).element,config(c).element)<1 && c.hp>Math.max(...threats.map(m=>damage(target,c,m,state,'player'))));
    if(index>=0) return {type:'switch',index};
  }
  const score=m=>{
    if(m.power>0) return impact(actor,target,m,state,'enemy').hpDamage+(m.effect?.type==='burn' && !target.burn ? 10 : 0)+(m.effect?.type==='slow' && !target.slow ? 4 : 0);
    if(m.effect?.type==='heal') return actor.maxHp-actor.hp>=35 && actor.hp<actor.maxHp*.5 ? 39 : -1;
    if(m.effect?.type==='shield' && incoming>=actor.hp+actor.shield && incoming<actor.hp+Math.max(actor.shield,m.effect.value)) return 100;
    return -1;
  };
  const move=moves.reduce((a,b)=>score(b)>score(a)?b:a);
  return {type:'move',moveId:move.id};
}
function checkAction(state,action) {
  requireThat(action && typeof action==='object','请选择行动');
  const squad=state.player,actor=squad.team[squad.active];
  if (action.type==='switch') requireThat(integer(action.index,0,2) && action.index!==squad.active && squad.team[action.index].hp>0,'无法换到该异兽');
  else {
    requireThat(action.type==='move','未知行动');
    const move=config(actor).moves.find(m=>m.id===action.moveId);
    requireThat(move && actor.cooldowns[move.id]===0,'技能不存在或仍在冷却');
  }
}
function replace(state,emit) {
  for (const side of sides) {
    const squad=state[side];
    if (squad.team[squad.active].hp===0) {
      const index=squad.team.findIndex(c=>c.hp>0);
      if (index>=0) {const actorId=squad.team[squad.active].id;squad.active=index;state.log.push(`${side==='player'?'我方':'守关方'}${species.get(squad.team[index].id).name}接替出场。`);emit({type:'replace',side,actorId,targetId:squad.team[index].id});}
    }
  }
  state.winner=result(state);
}
export function resolveTurn(state,action) {
  validateBattle(state);requireThat(!state.winner,'战斗已经结束');checkAction(state,action);
  const enemyAction=chooseEnemyAction(state),next=snapshot(state),events=[];
  const emit=event=>events.push({...event,state:snapshot(next)});
  next.log.push(`第 ${state.turn} 回合`);
  if (next.encounterId) next.log.push(encounterTelegraph(next));
  const commands=sides.map((side,i)=>{
    const actor=next[side].team[next[side].active];
    const chosen=i===0?action:enemyAction;
    const priority=chosen.type==='switch'?2:(config(actor).moves.find(m=>m.id===chosen.moveId).priority??0);
    return {side,actor,action:chosen,priority,speed:config(actor).speed*(actor.slow>0?.5:1)*(next.encounterId==='marsh' && next.turn%2===0 && side==='player'?.5:1)};
  }).sort((a,b)=>b.priority-a.priority || b.speed-a.speed || (a.side==='player'?-1:1));
  for (const command of commands) {
    if (next.winner) break;
    const {side,actor,action:chosen}=command,squad=next[side];
    if (actor.hp===0) {next.log.push(`${config(actor).name}已倒下，行动取消。`);continue;}
    if (chosen.type==='switch') {squad.active=chosen.index;squad.switchCooldown=3;next.log.push(`${side==='player'?'我方':'守关方'}换上${species.get(squad.team[chosen.index].id).name}。`);emit({type:'switch',side,actorId:actor.id,targetId:squad.team[chosen.index].id});continue;}
    const move=config(actor).moves.find(m=>m.id===chosen.moveId);
    const targetSide=side==='player'?'enemy':'player',target=next[targetSide].team[next[targetSide].active];
    const name=config(actor).name;
    const hit=impact(actor,target,move,next,side);
    const event={type:'move',side,targetSide,actorId:actor.id,targetId:target.id,moveId:move.id,hpDamage:hit.hpDamage,shieldDamage:hit.shieldDamage,multiplier:hit.multiplier};
    actor.cooldowns[move.id]=move.cooldown>0?move.cooldown+1:0;
    if (move.power>0) {
      const {shieldDamage:blocked,hpDamage:loss}=hit;
      target.shield-=blocked;target.hp-=loss;
      const mult=hit.multiplier;
      next.log.push(`${name}使出${move.name}，${config(target).name}损失 ${loss} 生命${blocked?`（护盾吸收 ${blocked}）`:''}${mult===1.5?'，五行克制！':mult===.75?'，效果减弱。':'。'}`);
    }
    const effect=move.effect;
    if (effect?.type==='heal') {const amount=Math.min(effect.value,actor.maxHp-actor.hp);actor.hp+=amount;event.amount=amount;next.log.push(`${name}使出${move.name}，恢复 ${amount} 生命。`);}
    if (effect?.type==='shield') {event.amount=Math.max(0,effect.value-actor.shield);actor.shield=Math.max(actor.shield,effect.value);next.log.push(`${name}使出${move.name}，获得 ${effect.value} 点护盾。`);}
    if (target.hp>0 && (effect?.type==='burn' || effect?.type==='slow')) {target[effect.type]=effect.value;next.log.push(`${config(target).name}陷入${effect.type==='burn'?'灼伤':'减速'}。`);}
    emit(event);
    if(target.hp===0 && hit.hpDamage>0) emit({type:'faint',side:targetSide,targetSide,targetId:target.id});
    replace(next,emit);
  }
  for (const side of sides) next[side].switchCooldown=Math.max(0,next[side].switchCooldown-1);
  // All six tick together, including the bench; resolve simultaneous burn deaths together.
  for (const side of sides) for (const c of next[side].team) {
    for (const id of Object.keys(c.cooldowns)) c.cooldowns[id]=Math.max(0,c.cooldowns[id]-1);
    if (c.hp>0 && c.burn>0) {const loss=Math.min(c.hp,Math.max(1,Math.ceil(c.maxHp*.06)));c.hp-=loss;next.log.push(`${species.get(c.id).name}因灼伤损失 ${loss} 生命。`);emit({type:'burn',side,targetSide:side,targetId:c.id,hpDamage:loss,shieldDamage:0});if(c.hp===0) emit({type:'faint',side,targetSide:side,targetId:c.id});}
    c.burn=Math.max(0,c.burn-1);c.slow=Math.max(0,c.slow-1);
  }
  replace(next,emit);next.turn++;
  if (next.winner) next.log.push(next.winner==='player'?'试炼通过，山路重新畅通。':next.winner==='enemy'?'本次试炼未通过，可以调整队伍再来。':'双方同时倒下，平局。');
  next.log=next.log.slice(-200);
  emit({type:'roundEnd',side:null});
  return {state:next,events};
}
export function stepBattle(state,action) {
  return resolveTurn(state,action).state;
}
