import { CREATURES } from './data.js';
import { resolveTurn, previewMove, effectiveness, encounterTelegraph } from './battle.js';
import { creatureArt } from './art.js';
import { combatConfig } from './progression.js';
import { encodeSave, decodeSave, readSave, writeSave, restoreBackup, replaceSave, migrateSave, readLegacyOriginal } from './save.js';
import { createAudio } from './audio.js';
import { freshChapter, chooseStarter, visitNode, returnToMap, openParty, setTeam, startBond, answerBond, interactNode, evolveCompanion, beginEncounter, recordBattle, settleEncounter, showEnding, chapterObjective, ENCOUNTERS } from './chapter.js';
import { chapterView } from './chapter-view.js';
import { startPlayback } from './playback.js';

const app = document.querySelector('#app');
const byId = (id) => CREATURES.find((creature) => creature.id === id);
const elementClass = { 金: 'metal', 木: 'wood', 水: 'water', 火: 'fire', 土: 'earth' };
let run = freshChapter();
let ui = {};
let playing = false;
let playback = null;
let playbackStep = 0, playbackTotal = 0;
let submittedAction = '';
let turnSummary = [];
let playbackSpeed = 1;
let reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
let currentEvent = null;
let progress = {};
let sfx = false;
let music = false;
let storage;
try { storage = window.localStorage; } catch { /* readSave reports unavailable storage. */ }
const saved = readSave(storage);
let savedData = saved.data;
let saveError = saved.error || '';
let landing = Boolean(savedData || saveError);
const audio = createAudio();
function settings() { return { speed: playbackSpeed, reducedMotion, sfx, music }; }
function payload() { return { run, progress, settings: settings() }; }
function applySaved(data) {
  data = migrateSave(data);
  run = data.run; progress = data.progress; ui = {};
  ({ speed: playbackSpeed, reducedMotion, sfx, music } = data.settings);
  audio.setSettings({ sfx, music });
}
function persist(replace = false) {
  if (playing || landing) return;
  const result = (replace ? replaceSave : writeSave)(storage, payload());
  saveError = result.ok ? '' : result.error;
}
function claimReward() {
  if (run.phase !== 'end' || run.rewardClaimed) return false;
  ({ run, progress } = settleEncounter(run, progress));
  return true;
}
function download(text, filename) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
  const link = document.createElement('a'); link.href = url; link.download = filename;
  link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function storagePanel() {
  return `<details class="save-tools"><summary>旅程存档与声音设置</summary><div class="save-buttons"><button data-action="export" ${playing ? 'disabled' : ''}>导出存档</button>${readLegacyOriginal(storage).raw ? `<button data-action="export-legacy" ${playing ? 'disabled' : ''}>导出迁移前存档</button>` : ''}<button data-action="import" ${playing ? 'disabled' : ''}>导入存档</button><button data-action="restore" ${playing ? 'disabled' : ''}>恢复备份</button><button data-action="new" ${playing ? 'disabled' : ''}>新旅程</button><button data-action="sfx" aria-pressed="${sfx}">音效 ${sfx ? '开' : '关'}</button><button data-action="music" aria-pressed="${music}">氛围 ${music ? '开' : '关'}</button></div><p>仅保存在此浏览器；清理网站数据前请导出。音效与氛围默认关闭。</p></details>${saveError ? `<div class="save-warning" role="alert">${escapeHtml(saveError)}。当前游戏可继续，请导出进度备份。<button data-action="export-raw" ${playing ? 'disabled' : ''}>导出原始存档</button></div>` : ''}`;
}
function startView() {
  return `${heading('CONTINUE THE JOURNEY', '山海手记，等你续写。', savedData ? '找到本机旅程记录。继续同行，或确认后开启新的旅程。' : '原有存档暂时无法读取。可导出原文、恢复备份，或导入一份有效存档。')}<div class="result-actions">${savedData ? '<button class="primary-button" data-action="continue">继续旅程</button>' : ''}<button class="secondary-button" data-action="new">开启新旅程</button></div>`;
}

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const badge = (element) => `<span class="element ${elementClass[element]}">${element}</span>`;
const art = (id, evolved = run.evolved.includes(id)) => creatureArt(id, { evolved });
const escapeHtml = (text) => String(text).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function creatureCard(id, action, label) {
  const c = byId(id);
  return `<button class="creature-card" data-action="${action}" data-id="${id}" aria-label="${label}${c.name}，${c.element}属性">
    <span class="card-top"><span>${c.species}</span>${badge(c.element)}</span>
    <span class="card-art">${art(id)}</span><span class="card-name">${c.name}<span>结伴候选</span></span>
    <span class="card-description">${c.description}</span><span class="card-bottom">${label}<span aria-hidden="true">↗</span></span>
  </button>`;
}
function render(focus = false) {
  const previouslyFocused = document.activeElement?.dataset;
  const focusKey = previouslyFocused?.action ? { ...previouslyFocused } : null;
  const steps = ['初见', '寻水', '共鸣', '归泉'];
  const active = run.phase === 'choose' ? 0 : run.milestones.includes('source') ? 3 : run.completed.includes('shrine') ? 2 : 1;
  const inBattle = run.phase === 'battle' || run.phase === 'end';
  app.classList.toggle('battle-mode', inBattle);
  app.dataset.playing = String(playing);
  app.innerHTML = `<header class="site-header"><a class="brand" href="./" aria-label="山海同行首页"><span class="brand-seal">山海</span><span>山海同行<small>SHANHAI COMPANIONS</small></span></a><div class="edition"><span class="live-dot"></span>青岚谷 · 首章试玩<span class="edition-divider">/</span><span>卷 〇一</span></div></header>
    <main class="layout"><aside class="journal"><div class="journal-top"><span class="eyebrow">THE FIELD JOURNAL</span><h1>山海有灵，<br>与你同行。</h1><p>成为一名录灵人。<br>听懂山野的回应，<br>与异兽一起走过青岚谷。</p></div>
    <ol class="route">${steps.map((step, i) => `<li class="${i === active ? 'current' : i < active ? 'complete' : ''}" ${i === active ? 'aria-current="step"' : ''}><span class="route-number">${i < active ? '✓' : `0${i + 1}`}</span><span>${step}<small>${['选择初始伙伴', '探索八处山野', '祠前成长进化', '三场交锋，清泉归来'][i]}</small></span></li>`).join('')}</ol>
    ${run.phase !== 'choose' ? `<p class="chapter-side-objective">${escapeHtml(chapterObjective(run))}</p>` : ''}<div class="journal-footer"><span class="journal-mark">青岚</span><p>山川不语，自有回响。<small>原创异兽 · 回合制冒险</small></p></div></aside>
    <section class="content" aria-label="冒险内容">${landing ? startView() : view()}${storagePanel()}</section></main>
    <footer class="site-footer"><span>青岚谷手记 <span class="footer-dot">·</span> 第一份同行记录</span><span>完整回合后自动保存 <span class="footer-dot">·</span> 无需登录</span></footer>`;
  if (focus) document.querySelector('.section-heading')?.focus();
  else if (focusKey) {
    const buttons = [...app.querySelectorAll('button[data-action]:not(:disabled)')];
    const match = buttons.find((button) => button.dataset.action === focusKey.action && button.dataset.id === focusKey.id && button.dataset.index === focusKey.index && button.dataset.correct === focusKey.correct);
    (match || buttons.find((button) => button.dataset.action === focusKey.action))?.focus({ preventScroll: true });
  }
}
function heading(kicker, title, subtitle) { return `<div class="section-intro"><span class="eyebrow">${kicker}</span><h2 class="section-heading" tabindex="-1">${title}</h2><p>${subtitle}</p></div>`; }
function cycle() { return `<div class="element-guide"><span class="guide-title">五行相克</span><span class="cycle">金 <b>→</b> 木 <b>→</b> 土 <b>→</b> 水 <b>→</b> 火 <b>→</b> 金</span><span class="guide-caption">箭头表示克制 · 伤害 ×1.5，反向 ×0.75</span></div>`; }
function view() {
  if (run.phase === 'choose') return `${heading('01 / A FIRST ENCOUNTER', '每一段山海，都始于相遇。', '谷口晨雾渐散，三只小小异兽正在等你。选一位伙伴，写下旅程的第一页。')}
    <div class="creature-grid">${['fox', 'turtle', 'deer'].map((id) => creatureCard(id, 'choose', '与它同行')).join('')}</div>
    <div class="field-note"><span class="note-icon">✧</span><div><strong>先认识，再结契</strong><p>留意异兽习性，在林地与溪流观察环境、回应习性。三兽成队后挑战山隘，再去祠前成长，寻找泉源。</p></div><span class="note-index">录灵札记 · 01</span></div>${cycle()}`;
  if (run.phase === 'battle' || run.phase === 'end') return battleView();
  return chapterView(run, progress, ui);
}
function shieldMax(c) { return Math.max(0, ...c.moves.filter((m) => m.effect?.type === 'shield').map((m) => m.effect.value)); }
function roster(side, enemy) {
  return `<div class="team-roster" aria-label="${enemy ? '守关' : '同行'}队伍">${side.team.map((m, i) => `<div class="roster-member ${m.hp <= 0 ? 'fainted' : ''} ${i === side.active ? 'active' : ''}">${art(m.id, m.evolved || false)}<span>${byId(m.id).name}<small>${m.hp} / ${m.maxHp}</small></span><span class="roster-track"><i style="width:${m.hp / m.maxHp * 100}%"></i></span></div>`).join('')}</div>`;
}
function combatant(side, enemy) {
  const member = side.team[side.active]; const c = combatConfig(member.id, member.xp || 0, member.evolved || false); const pct = Math.max(0, member.hp / member.maxHp * 100);
  const maxShield = shieldMax(c);
  return `<div class="combatant ${enemy ? 'enemy' : 'player'} ${playing && currentEvent?.side === (enemy ? 'enemy' : 'player') ? 'acting' : ''}" data-side="${enemy ? 'enemy' : 'player'}" data-creature="${c.id}"><div class="combatant-info"><div class="combatant-title"><span><small>${enemy ? '山野守关者' : '你的伙伴'} · ${c.species}</small><strong>${c.name} <em class="level-tag">Lv.${c.level}</em></strong></span>${badge(c.element)}</div><div class="hp-caption"><span>生命</span><span>HP ${member.hp} / ${member.maxHp}</span></div><div class="hp-track" role="progressbar" aria-label="${c.name}生命" aria-valuenow="${member.hp}" aria-valuemin="0" aria-valuemax="${member.maxHp}"><span style="width:${pct}%"></span></div><div class="shield-caption"><span>护盾</span><span>${member.shield}${maxShield ? ` / ${maxShield}` : ''}</span></div><div class="shield-track" role="progressbar" aria-label="${c.name}护盾" aria-valuenow="${member.shield}" aria-valuemin="0" aria-valuemax="${maxShield || 1}"><span style="width:${maxShield ? member.shield / maxShield * 100 : 0}%"></span></div><div class="combat-stats">攻击 ${c.attack} · 防御 ${c.defense} · 速度 ${c.speed * (member.slow ? .5 : 1) * (!enemy && run.battle.encounterId === 'marsh' && run.battle.turn % 2 === 0 ? .5 : 1)}</div><div class="status-row">${member.burn ? `<span class="status-burn">灼伤 · 余 ${member.burn} 次</span>` : ''}${member.slow ? `<span>减速 · 余 ${member.slow} 回合</span>` : ''}</div></div><div class="battle-art">${art(c.id, member.evolved || false)}<div class="element-effect" aria-hidden="true"></div><span class="damage-number" aria-hidden="true"></span></div>${roster(side, enemy)}</div>`;
}
function eventConfig(event) {
  const member = run.battle?.[event.side]?.team.find((m) => m.id === event.actorId);
  return combatConfig(event.actorId, member?.xp || 0, member?.evolved || false);
}
function eventText(event) {
  if (!event) return '山风已定，静候你的行动。';
  const name = event.actorId ? byId(event.actorId)?.name : '';
  const target = event.targetId ? byId(event.targetId)?.name : '';
  if (event.type === 'move') { const move = eventConfig(event).moves.find((m) => m.id === event.moveId); return `${name} · ${move.name}${event.hpDamage ? `　生命 −${event.hpDamage}` : ''}${event.shieldDamage ? `　护盾 −${event.shieldDamage}` : ''}${event.amount ? `　${move.effect?.type === 'heal' ? '自身恢复' : '自身护盾增加'} ${event.amount}` : ''}`; }
  if (event.type === 'burn') return `${target}受到灼伤 · 生命 −${event.hpDamage ?? event.amount ?? 0}`;
  if (event.type === 'faint') return `${target || name}暂时退场，辛苦了。`;
  if (event.type === 'switch' || event.type === 'replace') return `${target}接替出场。`;
  return '这一回合结束。';
}
function battleView() {
  const b = run.battle; const active = b.player.team[b.player.active]; const c = combatConfig(active.id, active.xp || 0, active.evolved || false); const target = byId(b.enemy.team[b.enemy.active].id); const multiplier = effectiveness(c.element, target.element);
  const finished = b.winner && !playing;
  const encounter = ENCOUNTERS[run.battleId];
  return `${heading('青岚谷 · 卷一 / 同行试炼', finished ? (b.winner === 'player' ? '山野认可了你们的默契。' : b.winner === 'draw' ? '旗鼓相当，亦是一次成长。' : '歇一歇，再出发。') : encounter.name, finished ? '本次试炼已结束。返回舆图继续探索；也可重温试炼。首次胜利的奖励仅领取一次。' : '循五行，借山势。与你的伙伴一起，回应守关者的考验。')}
    <div class="battle-toolbar"><span>${encounter.name} <span class="toolbar-divider">/</span> 第 ${b.turn} 回合</span><div><button data-action="speed" aria-label="切换演出速度，当前${playbackSpeed}倍">演出 ×${playbackSpeed}</button><button data-action="motion" aria-pressed="${reducedMotion}">减少动态 ${reducedMotion ? '开' : '关'}</button></div></div>
    ${!finished ? `<div class="encounter-telegraph" role="status">${escapeHtml(encounterTelegraph(b))}</div>` : ''}<div class="arena" data-playing="${playing}" data-reduced-motion="${reducedMotion}"><div class="arena-caption"><span>${encounter.name}</span><span>三兽同行</span></div><div class="arena-combatants">${combatant(b.player, false)}<div class="versus" aria-hidden="true">交<br>锋</div>${combatant(b.enemy, true)}</div><div class="battle-announcement" role="status" aria-live="polite">${escapeHtml(playing ? eventText(currentEvent) : finished ? '本次交锋已结束，可在下方重试或返回舆图。' : '轮到你了，选择下方技能或换兽。')}</div></div>
    ${finished ? `<div class="result-panel"><span class="result-seal">${b.winner === 'player' ? '同行' : '再会'}</span><div><strong>${b.winner === 'player' ? '交锋完成 · 已记入本次旅程' : '每次交锋，都是新的发现'}</strong><p>${b.winner === 'player' ? (run.gains.length ? '首次奖励已记入手记；新等级在下次挑战生效。' : '重温试炼完成；首次奖励已经领取，本次不会重复发放。') : '观察五行克制，利用护盾与换兽，试试另一种节奏。'}</p><ul class="growth-results">${run.gains.map((gain) => `<li>${byId(gain.id).name} +${gain.xpGained} 经验 · Lv.${gain.fromLevel}${gain.toLevel > gain.fromLevel ? ` → Lv.${gain.toLevel}` : ''}${gain.mastered ? ' · 特色技能精通！' : ''}${progress[gain.id] === 90 ? ' · 已满级' : ''}</li>`).join('')}</ul></div></div><div class="result-actions"><button class="primary-button" data-action="start-battle" data-id="${run.battleId}">再次挑战</button><button class="secondary-button" data-action="map">返回谷中舆图</button>${run.milestones.includes('source') ? '<button class="primary-button" data-action="ending">听见归来的水声</button>' : ''}</div>` : `<div class="battle-controls">${playing ? `<div class="playback-status" role="status"><span><strong>已收到：${escapeHtml(submittedAction)}</strong><small>正在演出 ${playbackStep}/${playbackTotal} · 无需重复点击</small></span><button data-action="skip-playback">立即结算 →</button></div>` : `<p class="turn-ready" role="status">轮到你了 · 选择技能或换兽</p>`}<div class="moves-heading"><h3>${c.name}的行动 <small>${playing ? '回合演出中…' : '选择一个技能'}</small></h3><span class="matchup">${c.element} 对 ${target.element} · ${multiplier === 1.5 ? '克制 ×1.5' : multiplier === 0.75 ? '被克制 ×0.75' : '普通 ×1'}</span></div><div class="move-grid">${c.moves.map((move, index) => {
      const cooldown = active.cooldowns[move.id] || 0;
      const preview = !playing && !b.winner ? previewMove(b, move.id) : null;
      const effect = move.effect;
      const prediction = move.power ? (preview ? `预估生命 −${preview.hpDamage}${preview.shieldDamage ? ` · 护盾 −${preview.shieldDamage}` : ''}` : '等待回合结算') : effect?.type === 'heal' ? `恢复生命 +${Math.min(effect.value, active.maxHp - active.hp)}` : `护盾 ${effect?.value ?? 0}`;
      return `<button class="move-button move-${elementClass[c.element]}" data-action="move" data-id="${move.id}" ${cooldown || playing ? 'disabled' : ''}><span class="move-name"><small>0${index + 1}</small>${move.name}<span>${playing ? '演出中' : cooldown ? `冷却 ${cooldown}` : '可使用'}</span></span><span class="move-prediction">${prediction}</span><span class="move-description">${move.description}</span><span class="move-meta">${!playing && cooldown ? `尚需 ${cooldown} 回合 · ` : ''}${move.power ? `威力 ${move.power} · ` : ''}${move.cooldown ? `冷却 ${move.cooldown} 回合` : '无冷却'}</span></button>`;
    }).join('')}</div><p class="preview-note">预估基于当前生命与护盾；先手、换兽或状态变化可能改变实际结果。</p><div class="switch-row"><span>换兽<small>消耗本回合</small></span>${b.player.team.map((m, index) => `<button class="switch-button" data-action="switch" data-index="${index}" ${playing || index === b.player.active || m.hp <= 0 ? 'disabled' : ''}>${art(m.id, m.evolved || false)}<span>${byId(m.id).name}<small>${m.hp <= 0 ? '已倒下' : index === b.player.active ? `出战中 · ${m.hp}/${m.maxHp}` : `${m.hp}/${m.maxHp}`}</small></span>${badge(byId(m.id).element)}</button>`).join('')}</div><p class="feedback" role="status">${escapeHtml(run.note)}</p></div>`}
    ${!playing && turnSummary.length ? `<div class="turn-recap"><strong>上一回合发生了什么</strong><ul>${turnSummary.map(line=>`<li>${escapeHtml(line)}</li>`).join('')}</ul></div>` : ''}<details class="battle-log"><summary>交锋手记 <span>${b.log.length} 条记录</span></summary><ol>${b.log.slice(-12).reverse().map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ol></details>${cycle()}`;
}
function animateEvent(event, phase) {
  const source = app.querySelector(`[data-side="${event.side}"]`);
  const target = app.querySelector(`[data-side="${event.targetSide || event.side}"]`);
  app.querySelectorAll('.combatant.acting').forEach((node) => node.classList.remove('acting'));
  source?.classList.add('acting');
  if (reducedMotion) return;
  if (phase === 'windup' && event.type === 'move') {
    source?.classList.add('casting');
    const move = eventConfig(event).moves.find((candidate) => candidate.id === event.moveId);
    const arena = app.querySelector('.arena');
    const from = source?.querySelector('.battle-art')?.getBoundingClientRect();
    const to = target?.querySelector('.battle-art')?.getBoundingClientRect();
    if (move.power > 0 && arena && from && to) {
      const bounds = arena.getBoundingClientRect();
      const startX = from.left + from.width * (event.side === 'player' ? 0.68 : 0.32);
      const endX = to.left + to.width * (event.side === 'player' ? 0.4 : 0.6);
      const startY = from.top + from.height * 0.5;
      const endY = to.top + to.height * 0.55;
      const projectile = document.createElement('span');
      projectile.className = `element-projectile projectile-${elementClass[byId(event.actorId).element]}`;
      projectile.setAttribute('aria-hidden', 'true');
      projectile.style.cssText = `left:${startX - bounds.left}px;top:${startY - bounds.top}px;--travel-x:${endX - startX}px;--travel-y:${endY - startY}px;--travel-angle:${Math.atan2(endY - startY, endX - startX)}rad;animation-duration:${240 / playbackSpeed}ms`;
      arena.append(projectile);
    }
  }
  if (phase !== 'impact') return;
  if (event.type === 'move' || event.type === 'burn') {
    const damaging = event.hpDamage > 0 || event.shieldDamage > 0;
    const receiver = damaging ? target : source;
    // Bench burns update the roster without animating an unrelated active creature.
    if (receiver && (!event.targetId || event.type === 'move' || receiver.dataset.creature === event.targetId)) {
      receiver.classList.add(damaging ? 'hit' : 'restoring');
      const move = event.type === 'move' ? eventConfig(event).moves.find((candidate) => candidate.id === event.moveId) : null;
      receiver.dataset.effect = event.type === 'burn' ? 'fire' : !damaging && move?.effect ? move.effect.type : elementClass[byId(event.actorId).element];
      const number = receiver.querySelector('.damage-number');
      number.innerHTML = `${event.hpDamage ? `<span class="number-hp">−${event.hpDamage}</span>` : ''}${event.shieldDamage ? `<span class="number-shield"> 盾−${event.shieldDamage}</span>` : ''}${event.amount && !damaging ? `<span class="number-${move?.effect?.type === 'heal' ? 'heal' : 'shield'}"> +${event.amount}</span>` : ''}`;
    }
  }
  // Evolved attacks can both damage the target and restore the acting companion.
  if (event.type === 'move' && event.amount > 0 && (event.hpDamage > 0 || event.shieldDamage > 0) && source) {
    const effect = eventConfig(event).moves.find(move => move.id === event.moveId)?.effect?.type;
    source.classList.add('restoring'); source.dataset.effect = effect;
    source.querySelector('.damage-number').innerHTML = `<span class="number-${effect === 'heal' ? 'heal' : 'shield'}">+${event.amount}</span>`;
  }
  if (event.type === 'faint' && source?.dataset.creature === (event.targetId || event.actorId)) source.classList.add('fainting');
  if (event.type === 'replace' || event.type === 'switch') source?.classList.add('arriving');
}
async function playTurn(action) {
  if (playing) return;
  playing = true;
  let result, completedRun, completedProgress = progress;
  try {
    result = resolveTurn(run.battle, action);
    completedRun = recordBattle(run, result.state);
    if (completedRun.phase === 'end') ({ run: completedRun, progress: completedProgress } = settleEncounter(completedRun, progress));
  } catch (error) { playing = false; run.note = error.message; render(); return; }
  const actor = run.battle.player.team[run.battle.player.active];
  submittedAction = action.type === 'switch' ? `换上${byId(run.team[action.index]).name}` : combatConfig(actor.id, actor.xp, actor.evolved || false).moves.find(move => move.id === action.moveId).name;
  const events = result.events.filter(event => event.type !== 'roundEnd');
  playbackStep = 0; playbackTotal = events.length; turnSummary = []; run.note = '';
  const task = startPlayback({
    complete(reason) {
      // Invalidate the animation before installing the complete, already-resolved turn.
      playing = false; currentEvent = null; playback = null;
      const marker = result.state.log.lastIndexOf(`第 ${run.battle.turn} 回合`);
      turnSummary = result.state.log.slice(marker < 0 ? -4 : marker + 1).filter(line => !line.startsWith('地形：'));
      run = completedRun; progress = completedProgress;
      if (reason === 'error' || reason === 'timeout') run.note = '演出已自动结束，本回合已结算，可以继续操作。';
      persist(); render(Boolean(run.battle.winner));
      try { if (run.battle.winner) audio.play({ type: run.battle.winner === 'player' ? 'victory' : 'defeat' }); } catch { /* Sound must not lock combat. */ }
    },
    async animate(isActive) {
      for (const [index, event] of events.entries()) {
        if (!isActive()) return;
        playbackStep = index + 1; currentEvent = event;
        render();
        audio.play(event);
        animateEvent(event, 'windup');
        if (event.type === 'move') await delay((reducedMotion ? 30 : 240) / playbackSpeed);
        if (!isActive()) return;
        const oldBars = [...app.querySelectorAll('.hp-track > span, .shield-track > span')].map(bar => bar.style.width);
        run.battle = event.state;
        render();
        const bars = [...app.querySelectorAll('.hp-track > span, .shield-track > span')];
        const newWidths = bars.map(bar => bar.style.width);
        bars.forEach((bar, i) => { bar.style.width = oldBars[i] || newWidths[i]; });
        app.querySelector('.arena')?.getBoundingClientRect();
        bars.forEach((bar, i) => { bar.style.width = newWidths[i]; });
        animateEvent(event, 'impact');
        await delay((reducedMotion ? 40 : event.type === 'move' ? 320 : 180) / playbackSpeed);
      }
    },
  });
  playback = task;
  render();
  if (document.hidden) task.finish('hidden');
  try { await task.done; }
  finally { if (playback === task) playback = null; }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) playback?.finish('hidden'); });
app.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-action]'); if (!button || button.disabled) return;
  audio.unlock();
  const { action, id } = button.dataset; let focus = true;
  if (action === 'skip-playback') { playback?.finish('skip'); return; }
  if (['speed', 'motion', 'sfx', 'music'].includes(action)) {
    if (action === 'speed') playbackSpeed = playbackSpeed === 1 ? 2 : 1;
    if (action === 'motion') reducedMotion = !reducedMotion;
    if (action === 'sfx') sfx = !sfx;
    if (action === 'music') music = !music;
    audio.setSettings({ sfx, music }); audio.unlock(); persist(); render(); return;
  }
  if (playing) return;
  if (action === 'export') {
    try { download(encodeSave(landing && savedData ? savedData : payload()), 'shanhai-journey.json'); }
    catch (error) { saveError = error.message; render(); } return;
  }
  if (action === 'export-legacy') {
    const original = readLegacyOriginal(storage);
    if (original.raw) download(original.raw, 'shanhai-before-migration-v1.json');
    else { saveError = original.error || '没有迁移前存档'; render(); }
    return;
  }
  if (action === 'export-raw') {
    try { const raw = storage?.getItem('shanhai-save-v1'); if (raw == null) throw new Error('没有可导出的原始存档'); download(raw, 'shanhai-original.json'); }
    catch (error) { saveError = error.message; render(); } return;
  }
  if (action === 'import') {
    const input = document.createElement('input'); input.type = 'file'; input.accept = '.json,application/json';
    input.addEventListener('change', async () => {
      if (playing || !input.files[0]) return;
      try {
        const data = decodeSave(await input.files[0].text());
        if (playing || !window.confirm('导入将覆盖当前旅程与成长记录，原本机存档会保留为备份。确认导入？')) return;
        applySaved(data); audio.unlock(); landing = false; claimReward(); persist(true); render(true);
      } catch (error) { saveError = `导入失败：${error.message}`; render(); }
    }); input.click(); return;
  }
  if (action === 'restore') {
    if (!window.confirm('恢复备份会替换当前旅程。确认恢复？')) return;
    const result = restoreBackup(storage); saveError = result.error || '';
    if (result.data) { applySaved(result.data); audio.unlock(); landing = false; if (claimReward()) persist(); }
    render(true); return;
  }
  if (action === 'continue') {
    applySaved(savedData); audio.unlock(); landing = false; if (claimReward()) persist(); render(true); return;
  }
  if (action === 'new' || action === 'restart') {
    if (!window.confirm('开启新旅程会清空本次队伍与所有成长经验，原本机存档会保留为备份。确认开始？')) return;
    currentEvent = null; turnSummary = []; run = freshChapter(); progress = {}; ui = {}; landing = false; savedData = null;
    persist(true); render(true); return;
  }
  if (landing) return;
  try {
    if (action === 'choose') run = chooseStarter(run, id);
    else if (action === 'map') { run = returnToMap(run); ui = {}; }
    else if (action === 'visit') { run = visitNode(run, id); ui = {}; }
    else if (action === 'party' || action === 'bestiary') { run = openParty(run); ui = action === 'bestiary' ? { tab: 'bestiary' } : {}; }
    else if (action === 'encounter') run = startBond(run, id);
    else if (action === 'bond') { run = answerBond(run, id); focus = false; if (!run.encounter) audio.play({ type: 'bond' }); }
    else if (action === 'interact') ({ run, progress } = interactNode(run, id, progress));
    else if (action === 'lead') { run = setTeam(run, [id, ...run.team.filter(member => member !== id)]); focus = false; }
    else if (action === 'bench') run = setTeam(run, run.team.filter(member => member !== id));
    else if (action === 'add-party') { if (run.team.length < 3) run = setTeam(run, [...run.team, id]); else ui.replaceId = id; }
    else if (action === 'replace') { run = setTeam(run, run.team.map(member => member === id ? ui.replaceId : member)); ui.replaceId = null; }
    else if (action === 'cancel-replace') ui.replaceId = null;
    else if (action === 'evolve-preview') ui.evolutionPreview = id;
    else if (action === 'evolve-confirm') { run = evolveCompanion(run, progress, id); ui = { evolutionReveal: id }; audio.play({ type: 'bond' }); }
    else if (action === 'evolution-close') ui = {};
    else if (action === 'ending') { run = showEnding(run); ui = {}; }
    else if (action === 'start-battle') { currentEvent = null; turnSummary = []; run = beginEncounter(run, progress, id); ui = {}; }
    else if (action === 'move' || action === 'switch') {
      void playTurn(action === 'move' ? { type: 'move', moveId: id } : { type: 'switch', index: Number(button.dataset.index) }); return;
    }
  } catch (error) { run = { ...run, note: error.message }; focus = false; }
  persist(); render(focus);
});
render();
