import { CREATURES } from './data.js';
const ids = new Set(CREATURES.map(c => c.id));
const check = (condition, message) => { if (!condition) throw new Error(message); };
export function levelForXp(xp) {
  check(Number.isSafeInteger(xp) && xp >= 0, '经验必须是非负整数');
  return xp >= 90 ? 3 : xp >= 30 ? 2 : 1;
}
export const EVOLUTIONS = Object.freeze({
  fox: Object.freeze({species:'九尾狐',name:'照夜灵狐',description:'生命增加 12、攻击增加 3；流焰化为照夜焰，额外增加 8 威力并保留三次灼伤。'}),
  turtle: Object.freeze({species:'旋龟',name:'镇澜玄龟',description:'生命增加 12、攻击增加 3；回潮化为镇澜潮，攻击同时获得 24 点护盾。'}),
  deer: Object.freeze({species:'鹿蜀',name:'青岚鹿蜀',description:'生命增加 12、攻击增加 3；青枝化为青岚生息，攻击同时恢复 18 生命。'})
});
export function combatConfig(id, xp = 0, evolved = false) {
  check(ids.has(id), '未知异兽');
  check(typeof evolved === 'boolean', '进化标记无效');
  check(!evolved || (Object.hasOwn(EVOLUTIONS,id) && xp >= 90), '仅满 90 经验的初始伙伴可进化');
  const c = structuredClone(CREATURES.find(c => c.id === id));
  c.level = levelForXp(xp);
  c.hp += (c.level - 1) * 8;
  c.attack += (c.level - 1) * 2;
  c.defense += c.level - 1;
  if (c.level === 3 && ['fox', 'turtle', 'deer'].includes(id)) {
    const move = c.moves.find(m => m.id === `${id}-skill`);
    move.power += 4; move.name += '·精通'; move.description += ' 精通强化：威力增加 4。';
  }
  if (evolved) {
    c.hp += 12; c.attack += 3; c.name = EVOLUTIONS[id].name;
    const move = c.moves.find(m => m.id === `${id}-skill`);
    if (id === 'fox') {move.name = '照夜焰'; move.power += 8;}
    if (id === 'turtle') {move.name = '镇澜潮'; move.effect = {type:'shield',value:24};}
    if (id === 'deer') {move.name = '青岚生息'; move.effect = {type:'heal',value:18};}
    move.description = {fox:'火属性攻击，灼伤三次，每次损失最大生命的 6%。',turtle:'水属性攻击，同时获得 24 点护盾。',deer:'木属性攻击，同时恢复 18 点生命，不超过上限。'}[id];
  }
  return c;
}
export function validateProgress(progress) {
  check(progress && typeof progress === 'object' && !Array.isArray(progress), '成长记录无效');
  for (const [id, xp] of Object.entries(progress)) check(ids.has(id) && Number.isSafeInteger(xp) && xp >= 0 && xp <= 90, '成长记录的异兽或经验无效');
  return true;
}
export function awardExperience(progress, teamIds, winner) {
  validateProgress(progress);
  check(Array.isArray(teamIds) && teamIds.length > 0 && teamIds.length <= 3 && new Set(teamIds).size === teamIds.length && teamIds.every(id => ids.has(id)), '奖励队伍无效');
  check(['player', 'enemy', 'draw'].includes(winner), '胜负结果无效');
  const next = { ...progress };
  const gains = teamIds.map(id => {
    const before = progress[id] ?? 0, after = Math.min(90, before + (winner === 'player' ? 30 : 10));
    next[id] = after;
    const fromLevel = levelForXp(before), toLevel = levelForXp(after);
    return { id, xpGained: after - before, fromLevel, toLevel, mastered: ['fox', 'turtle', 'deer'].includes(id) && fromLevel < 3 && toLevel === 3 };
  });
  return { progress: next, gains };
}
