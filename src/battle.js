import { CREATURES } from './data.js';
const species = new Map(CREATURES.map(c => [c.id,c]));
const beats = {金:'木',木:'土',土:'水',水:'火',火:'金'};
const sides = ['player','enemy'];
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
function validate(state) {
  requireThat(state && integer(state.turn,1) && Array.isArray(state.log) && state.log.every(l=>typeof l==='string'),'战斗状态无效');
  for (const side of sides) {
    const squad=state[side];
    requireThat(squad && Array.isArray(squad.team),'队伍状态无效');
    checkIds(squad.team.map(c=>c?.id));
    requireThat(integer(squad.active,0,2),'出场位置无效');
    for (const c of squad.team) {
      const base=species.get(c.id);
      requireThat(c.maxHp===base.hp && integer(c.hp,0,c.maxHp) && integer(c.burn,0,3) && integer(c.slow,0,3) && integer(c.shield,0,36),'异兽状态无效');
      requireThat(c.cooldowns && Object.keys(c.cooldowns).length===base.moves.length && base.moves.every(m=>Object.hasOwn(c.cooldowns,m.id) && integer(c.cooldowns[m.id],0,m.cooldown)),'技能冷却无效');
    }
    requireThat(!squad.team.some(c=>c.hp>0) || squad.team[squad.active].hp>0,'倒下异兽必须补位');
  }
  requireThat(state.winner===result(state),'胜负状态不一致');
}
export function createBattle(playerIds,enemyIds) {
  checkIds(playerIds);checkIds(enemyIds);
  const team=ids=>({active:0,team:ids.map(id=>{const c=species.get(id);return {id,hp:c.hp,maxHp:c.hp,cooldowns:Object.fromEntries(c.moves.map(m=>[m.id,0])),burn:0,slow:0,shield:0};})});
  return {turn:1,player:team(playerIds),enemy:team(enemyIds),winner:null,log:['山隘试炼开始。']};
}
function damage(actor,target,move) {
  const a=species.get(actor.id),d=species.get(target.id);
  return Math.max(1,Math.round((move.power+a.attack*.65-d.defense*.45)*effectiveness(a.element,d.element)));
}
export function chooseEnemyAction(state) {
  validate(state);requireThat(!state.winner,'战斗已经结束');
  const actor=state.enemy.team[state.enemy.active],target=state.player.team[state.player.active];
  const moves=species.get(actor.id).moves.filter(m=>actor.cooldowns[m.id]===0);
  // Commit from the visible pre-turn board. Never inspect or simulate a player's choice.
  const score=m=>m.power>0 ? damage(actor,target,m)+(m.effect?.type==='burn' && !target.burn ? 10 : 0)+(m.effect?.type==='slow' && !target.slow ? 4 : 0) : m.effect?.type==='heal' && actor.maxHp-actor.hp>=35 && actor.hp<actor.maxHp*.5 ? 39 : -1;
  const move=moves.reduce((a,b)=>score(b)>score(a)?b:a);
  return {type:'move',moveId:move.id};
}
function checkAction(state,action) {
  requireThat(action && typeof action==='object','请选择行动');
  const squad=state.player,actor=squad.team[squad.active];
  if (action.type==='switch') requireThat(integer(action.index,0,2) && action.index!==squad.active && squad.team[action.index].hp>0,'无法换到该异兽');
  else {
    requireThat(action.type==='move','未知行动');
    const move=species.get(actor.id).moves.find(m=>m.id===action.moveId);
    requireThat(move && actor.cooldowns[move.id]===0,'技能不存在或仍在冷却');
  }
}
function replace(state) {
  for (const side of sides) {
    const squad=state[side];
    if (squad.team[squad.active].hp===0) {
      const index=squad.team.findIndex(c=>c.hp>0);
      if (index>=0) {squad.active=index;state.log.push(`${side==='player'?'我方':'守关方'}${species.get(squad.team[index].id).name}接替出场。`);}
    }
  }
  state.winner=result(state);
}
export function stepBattle(state,action) {
  validate(state);requireThat(!state.winner,'战斗已经结束');checkAction(state,action);
  const enemyAction=chooseEnemyAction(state),next=structuredClone(state);
  next.log.push(`第 ${state.turn} 回合`);
  const commands=sides.map((side,i)=>{
    const actor=next[side].team[next[side].active];
    return {side,actor,action:i===0?action:enemyAction,speed:species.get(actor.id).speed*(actor.slow>0?.5:1)};
  }).sort((a,b)=>(b.action.type==='switch')-(a.action.type==='switch') || b.speed-a.speed || (a.side==='player'?-1:1));
  for (const command of commands) {
    if (next.winner) break;
    const {side,actor,action:chosen}=command,squad=next[side];
    if (actor.hp===0) {next.log.push(`${species.get(actor.id).name}已倒下，行动取消。`);continue;}
    if (chosen.type==='switch') {squad.active=chosen.index;next.log.push(`我方换上${species.get(squad.team[chosen.index].id).name}。`);continue;}
    const move=species.get(actor.id).moves.find(m=>m.id===chosen.moveId);
    const targetSide=side==='player'?'enemy':'player',target=next[targetSide].team[next[targetSide].active];
    const name=species.get(actor.id).name;
    actor.cooldowns[move.id]=move.cooldown>0?move.cooldown+1:0;
    if (move.power>0) {
      const raw=damage(actor,target,move),blocked=Math.min(target.shield,raw),loss=Math.min(target.hp,raw-blocked);
      target.shield-=blocked;target.hp-=loss;
      const mult=effectiveness(species.get(actor.id).element,species.get(target.id).element);
      next.log.push(`${name}使出${move.name}，${species.get(target.id).name}损失 ${loss} 生命${blocked?`（护盾吸收 ${blocked}）`:''}${mult===1.5?'，五行克制！':mult===.75?'，效果减弱。':'。'}`);
    }
    const effect=move.effect;
    if (effect?.type==='heal') {const amount=Math.min(effect.value,actor.maxHp-actor.hp);actor.hp+=amount;next.log.push(`${name}使出${move.name}，恢复 ${amount} 生命。`);}
    if (effect?.type==='shield') {actor.shield=Math.max(actor.shield,effect.value);next.log.push(`${name}使出${move.name}，获得 ${effect.value} 点护盾。`);}
    if (target.hp>0 && (effect?.type==='burn' || effect?.type==='slow')) {target[effect.type]=effect.value;next.log.push(`${species.get(target.id).name}陷入${effect.type==='burn'?'灼伤':'减速'}。`);}
    replace(next);
  }
  // All six tick together, including the bench; resolve simultaneous burn deaths together.
  for (const side of sides) for (const c of next[side].team) {
    for (const id of Object.keys(c.cooldowns)) c.cooldowns[id]=Math.max(0,c.cooldowns[id]-1);
    if (c.hp>0 && c.burn>0) {const loss=Math.min(c.hp,Math.max(1,Math.ceil(c.maxHp*.06)));c.hp-=loss;next.log.push(`${species.get(c.id).name}因灼伤损失 ${loss} 生命。`);}
    c.burn=Math.max(0,c.burn-1);c.slow=Math.max(0,c.slow-1);
  }
  replace(next);next.turn++;
  if (next.winner) next.log.push(next.winner==='player'?'试炼通过，山路重新畅通。':next.winner==='enemy'?'本次试炼未通过，可以调整队伍再来。':'双方同时倒下，平局。');
  return next;
}
