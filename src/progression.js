import { CREATURES } from './data.js';
const ids = new Set(CREATURES.map(c => c.id));
const check = (condition, message) => { if (!condition) throw new Error(message); };
export function levelForXp(xp) {
  check(Number.isSafeInteger(xp) && xp >= 0, '经验必须是非负整数');
  return xp >= 90 ? 3 : xp >= 30 ? 2 : 1;
}
export function combatConfig(id, xp = 0) {
  check(ids.has(id), '未知异兽');
  const c = structuredClone(CREATURES.find(c => c.id === id));
  c.level = levelForXp(xp);
  c.hp += (c.level - 1) * 8;
  c.attack += (c.level - 1) * 2;
  c.defense += c.level - 1;
  if (c.level === 3 && ['fox', 'turtle', 'deer'].includes(id)) {
    const move = c.moves.find(m => m.id === `${id}-skill`);
    move.power += 4; move.name += '·精通'; move.description += ' 精通强化：威力增加 4。';
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
