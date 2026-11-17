import { CREATURES } from './data.js';
import { validateBattle } from './battle.js';
import { validateProgress, awardExperience } from './progression.js';
export const SAVE_KEY = 'shanhai-save-v1';
export const BACKUP_KEY = 'shanhai-save-backup';
const MAX_SIZE = 1000000;
const starters = ['fox', 'turtle', 'deer'];
const pools = [['boar', 'ape', 'deer'], ['turtle', 'fish', 'fox']];
const ids = new Set(CREATURES.map(c => c.id));
const check = (condition, message) => { if (!condition) throw new Error(message); };
const object = value => value !== null && typeof value === 'object' && !Array.isArray(value);
function validFullTeam(team) {
  return team.some(start => starters.includes(start) && team.some(forest => forest !== start && pools[0].includes(forest) && team.some(stream => stream !== start && stream !== forest && pools[1].includes(stream))));
}
function normalize(payload) {
  check(object(payload) && object(payload.run), '存档旅程无效');
  const r = payload.run, progress = payload.progress;
  validateProgress(progress);
  const settings = payload.settings ?? { speed: 1, reducedMotion: false, sfx: false, music: false };
  check(object(settings) && [1, 2].includes(settings.speed) && ['reducedMotion', 'sfx', 'music'].every(key => typeof settings[key] === 'boolean'), '存档设置无效');
  check(['choose', 'explore', 'party', 'battle', 'end'].includes(r.phase), '存档阶段无效');
  check(Array.isArray(r.team) && r.team.length <= 3 && new Set(r.team).size === r.team.length && r.team.every(id => ids.has(id)), '存档队伍无效');
  check(Number.isInteger(r.location) && r.location >= 0 && r.location <= 2, '存档地点无效');
  check(r.encounter === null || ids.has(r.encounter), '结契目标无效');
  check(Number.isInteger(r.bond) && r.bond >= 0 && r.bond <= 1 && (r.encounter !== null || r.bond === 0), '结契进度无效');
  check(typeof r.note === 'string' && r.note.length <= 2000, '旅程备注过长或无效');
  const rewardClaimed = r.rewardClaimed ?? false, gains = r.gains ?? [];
  check(typeof rewardClaimed === 'boolean' && Array.isArray(gains) && gains.length <= 3, '奖励记录无效');
  const battling = ['battle', 'end'].includes(r.phase);
  if (r.phase === 'choose') check(r.team.length === 0 && r.location === 0 && r.encounter === null && Object.keys(progress).length === 0, '初始旅程状态不一致');
  else if (r.phase === 'explore') {
    check(r.location < 2 && r.team.length === r.location + 1 && starters.includes(r.team[0]) && (r.location === 0 || pools[0].includes(r.team[1])), '探索队伍与地点不一致');
    check(r.encounter === null || pools[r.location].includes(r.encounter) && !r.team.includes(r.encounter), '当前地点无法结契该异兽');
  } else check(r.location === 2 && r.team.length === 3 && validFullTeam(r.team) && r.encounter === null, '完整队伍或旅程阶段不一致');
  if (!battling) check(r.battle === null && !rewardClaimed && gains.length === 0, '非战斗阶段不能带有战斗或奖励');
  else {
    validateBattle(r.battle);
    const b = r.battle;
    check(b.log.length <= 200 && b.log.every(line => line.length <= 500), '战斗日志过长');
    check(b.player.team.every((m, i) => m.id === r.team[i]) && b.enemy.team.every((m, i) => m.id === ['boar', 'ape', 'turtle'][i] && m.xp === 0), '战斗队伍不一致');
    check(r.phase === 'end' ? b.winner !== null : b.winner === null, '战斗结果与旅程阶段不一致');
    const before = { ...progress };
    for (const m of b.player.team) before[m.id] = m.xp;
    if (rewardClaimed) {
      check(r.phase === 'end', '未结束战斗不能领取奖励');
      const expected = awardExperience(before, r.team, b.winner);
      check(r.team.every(id => (progress[id] ?? 0) === expected.progress[id]), '经验与已领奖励不一致');
      check(gains.length === 3 && gains.every((g, i) => object(g) && Object.entries(expected.gains[i]).every(([key, value]) => g[key] === value)), '奖励明细不一致');
    } else check(gains.length === 0 && b.player.team.every(m => m.xp === (progress[m.id] ?? 0)), '未领奖励或战斗经验不一致');
  }
  return structuredClone({ run: { phase: r.phase, team: r.team, location: r.location, encounter: r.encounter, bond: r.bond, note: r.note, battle: r.battle, rewardClaimed, gains }, progress, settings: { speed: settings.speed, reducedMotion: settings.reducedMotion, sfx: settings.sfx, music: settings.music } });
}
export function decodeSave(text) {
  check(typeof text === 'string' && text.length <= MAX_SIZE, '存档文件过大或无效');
  let payload;
  try { payload = JSON.parse(text); } catch { throw new Error('存档 JSON 已损坏'); }
  check(object(payload) && payload.version === 1, '存档版本不受支持，原始数据已保留');
  return normalize(payload);
}
export function encodeSave(payload) {
  const text = JSON.stringify({ version: 1, ...normalize(payload) });
  check(text.length <= MAX_SIZE, '存档文件过大');
  return text;
}
const message = error => `存档操作失败：${error instanceof Error ? error.message : '浏览器存储不可用'}`;
function available(storage) { check(storage && typeof storage.getItem === 'function' && typeof storage.setItem === 'function', '浏览器存储不可用'); }
export function readSave(storage) {
  try { available(storage); const raw = storage.getItem(SAVE_KEY); return { data: raw === null ? null : decodeSave(raw), error: null }; }
  catch (error) { return { data: null, error: message(error) }; }
}
function persist(storage, payload, explicit) {
  try {
    available(storage);
    const text = encodeSave(payload), previous = storage.getItem(SAVE_KEY);
    if (previous !== null && !explicit) decodeSave(previous);
    // Backup must succeed first. Never destroy the only copy on quota/access failure.
    let preserveBackup = false;
    if (!explicit) {
      const backup = storage.getItem(BACKUP_KEY);
      if (backup !== null) { try { decodeSave(backup); } catch { preserveBackup = true; } }
    }
    if (previous !== null && !preserveBackup) storage.setItem(BACKUP_KEY, previous);
    storage.setItem(SAVE_KEY, text);
    return { ok: true, error: null };
  } catch (error) { return { ok: false, error: message(error) }; }
}
export function writeSave(storage, payload) { return persist(storage, payload, false); }
// Only the UI's explicit new journey/import confirmation should use replacement.
export function replaceSave(storage, payload) { return persist(storage, payload, true); }
export function restoreBackup(storage) {
  try {
    available(storage);
    const backup = storage.getItem(BACKUP_KEY);
    check(backup !== null, '没有可恢复的备份');
    const data = decodeSave(backup), previous = storage.getItem(SAVE_KEY);
    // Preserve the original before restoring. Roll back the backup on a failed main write.
    if (previous !== null) storage.setItem(BACKUP_KEY, previous);
    try { storage.setItem(SAVE_KEY, backup); } catch (error) {
      if (previous !== null) storage.setItem(BACKUP_KEY, backup);
      throw error;
    }
    return { data, error: null };
  } catch (error) { return { data: null, error: message(error) }; }
}
