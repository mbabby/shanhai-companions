import { CREATURES } from './data.js';
import { createBattle, stepBattle, effectiveness } from './battle.js';
import { creatureArt } from './art.js';

const app = document.querySelector('#app');
const byId = (id) => CREATURES.find((creature) => creature.id === id);
const elementClass = { 金: 'metal', 木: 'wood', 水: 'water', 火: 'fire', 土: 'earth' };
const habits = {
  fox: ['它循着暖意靠近，遇到急促的脚步就躲进尾巴里。', '在石边点一盏暖灯', '放轻脚步，等它靠近'],
  turtle: ['它总在平稳的浅水中歇息，会循着轻轻的水声探头。', '清理浅滩上的碎枝', '用指尖轻点水面'],
  deer: ['它寻觅鲜嫩草叶，喜欢林间悠长、平缓的声音。', '放下一束鲜嫩草叶', '轻轻哼一段悠长小调'],
  boar: ['它忙着翻松泥土，遇到坚硬石块时会停下挠头。', '移开挡路的石块', '帮它松开一小片泥土'],
  ape: ['它好奇地模仿动作，却会被突然伸来的手吓退。', '隔着树枝缓缓挥手', '放下果子，后退一步'],
  fish: ['它在水草间舒展小翼，只愿靠近清澈而安静的水面。', '捞起水面的枯叶', '静静等待它游近'],
};
let run = freshRun();
function freshRun() { return { phase: 'choose', team: [], location: 0, encounter: null, bond: 0, note: '', battle: null }; }
const badge = (element) => `<span class="element ${elementClass[element]}">${element}</span>`;
const art = (id, className = '') => creatureArt(id, { className });
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
  const steps = ['初见', '寻踪', '结阵', '试炼'];
  const active = { choose: 0, explore: 1, party: 2, battle: 3, end: 3 }[run.phase];
  app.innerHTML = `<header class="site-header"><a class="brand" href="./" aria-label="山海同行首页"><span class="brand-seal">山海</span><span>山海同行<small>SHANHAI COMPANIONS</small></span></a><div class="edition"><span class="live-dot"></span>青岚谷 · 首章试玩<span class="edition-divider">/</span><span>卷 〇一</span></div></header>
    <main class="layout"><aside class="journal"><div class="journal-top"><span class="eyebrow">THE FIELD JOURNAL</span><h1>山海有灵，<br>与你同行。</h1><p>成为一名录灵人。<br>听懂山野的回应，<br>与异兽一起走过青岚谷。</p></div>
    <ol class="route">${steps.map((step, i) => `<li class="${i === active ? 'current' : i < active ? 'complete' : ''}" ${i === active ? 'aria-current="step"' : ''}><span class="route-number">${i < active ? '✓' : `0${i + 1}`}</span><span>${step}<small>${['选择初始伙伴', '走访林地与溪流', '编排三兽队伍', '挑战山隘守关者'][i]}</small></span></li>`).join('')}</ol>
    <div class="journal-footer"><span class="journal-mark">青岚</span><p>山川不语，自有回响。<small>原创异兽 · 回合制冒险</small></p></div></aside>
    <section class="content" aria-label="冒险内容">${view()}</section></main>
    <footer class="site-footer"><span>青岚谷手记 <span class="footer-dot">·</span> 第一份同行记录</span><span>当前旅程刷新后重置 <span class="footer-dot">·</span> 无需登录</span></footer>`;
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
    <div class="field-note"><span class="note-icon">✧</span><div><strong>先认识，再结契</strong><p>留意异兽习性，在林地与溪流各认识一位新伙伴。组成三兽队伍后，便可挑战山隘。</p></div><span class="note-index">录灵札记 · 01</span></div>${cycle()}`;
  if (run.phase === 'explore') {
    const forest = run.location === 0;
    const pool = (forest ? ['boar', 'ape', 'deer'] : ['turtle', 'fish', 'fox']).filter((id) => !run.team.includes(id));
    const title = forest ? '林深处，有新的足迹。' : '循着水声，再遇同行者。';
    if (!run.encounter) return `${heading(`02 / ${forest ? 'THE QUIET GROVE' : 'THE CLEAR STREAM'}`, title, forest ? '落叶间有翻动的泥土，树梢传来细响。选一条踪迹，读懂它的习性。' : '清溪映着天光。选择一位水边的新朋友，为队伍补上最后一席。')}<div class="location-tag">${forest ? '地点一 · 松风林地' : '地点二 · 云影浅溪'}<span>已有伙伴 ${run.team.length} / 3</span></div>${run.note ? `<p class="success-note" role="status">${run.note}</p>` : ''}<div class="creature-grid">${pool.map((id) => creatureCard(id, 'encounter', '循迹寻找')).join('')}</div>${teamStrip()}${cycle()}`;
    const c = byId(run.encounter); const habit = habits[c.id];
    return `${heading('02 / LISTEN TO THE WILD', `认识${c.name}，从一点耐心开始。`, '仔细阅读观察手记，完成两次合适的互动。答错也没关系，它会再给你一次机会。')}
      <div class="encounter-panel"><div class="encounter-art">${art(c.id)}<div class="encounter-label">${badge(c.element)}<span>${c.name} · ${c.species}</span></div></div><div class="encounter-actions"><span class="eyebrow">观察手记</span><h3>${forest ? '松风林地' : '云影浅溪'}</h3><p class="habit">${habit[0]}</p><div class="bond-progress"><span class="${run.bond > 0 ? 'filled' : ''}"></span><span></span><small>信任 ${run.bond} / 2</small></div><div class="interaction-buttons">${(run.bond === 0 ? [{ text: habit[1], correct: true }, { text: '追上去，立刻伸手抱住它', correct: false }] : [{ text: '敲击石头，催它快点过来', correct: false }, { text: habit[2], correct: true }]).map((option) => `<button class="choice-button" data-action="bond" data-correct="${option.correct}">${option.text}<span aria-hidden="true">→</span></button>`).join('')}</div><p class="feedback" role="status">${run.note || '不必着急，山野的朋友值得等待。'}</p><button class="text-button" data-action="back-tracks">← 换一条踪迹</button></div></div>${teamStrip()}`;
  }
  if (run.phase === 'party') return `${heading('03 / BETTER TOGETHER', '三位伙伴，一路同行。', '两次相遇已记入手记。点击伙伴设为领队，然后前往山隘，接受守关者的试炼。')}
    <p class="success-note" role="status">${run.note}</p><div class="party-grid">${run.team.map((id, index) => { const c = byId(id); return `<button class="party-card ${index === 0 ? 'selected' : ''}" data-action="lead" data-id="${id}" aria-pressed="${index === 0}"><span class="leader-label">${index === 0 ? '◇ 当前领队' : '设为领队'}</span>${art(id)}<span class="party-name">${c.name}${badge(c.element)}</span><span class="stats">生命 ${c.hp} · 攻击 ${c.attack} · 速度 ${c.speed}</span></button>`; }).join('')}</div><div class="challenge-banner"><div><span class="eyebrow">青岚山隘 · 守关试炼</span><h3>以默契，回应山野的考验。</h3><p>守关阵容：团掘（土）→ 白耳（金）→ 砚砚（水）</p></div><button class="primary-button" data-action="start-battle">前往试炼 <span>→</span></button></div>${cycle()}<div class="field-note"><span class="note-icon">◎</span><p>主动换兽先于技能行动，但会消耗本回合；新伙伴将承受攻击。倒下时自动由下一位伙伴接替。</p></div>`;
  return battleView();
}
function teamStrip() { return `<div class="team-strip"><span class="eyebrow">同行伙伴</span>${run.team.map((id) => `<span>${byId(id).name}${badge(byId(id).element)}</span>`).join('')}<span class="empty-slot">${3 - run.team.length} 席待相遇</span></div>`; }
function combatant(side, enemy) {
  const member = side.team[side.active]; const c = byId(member.id); const pct = Math.max(0, member.hp / member.maxHp * 100);
  return `<div class="combatant ${enemy ? 'enemy' : 'player'}"><div class="combatant-info"><div class="combatant-title"><span><small>${enemy ? '山隘守关者' : '你的伙伴'}</small><strong>${c.name}</strong></span>${badge(c.element)}</div><div class="hp-track" role="progressbar" aria-label="${c.name}生命" aria-valuenow="${member.hp}" aria-valuemin="0" aria-valuemax="${member.maxHp}"><span style="width:${pct}%"></span></div><div class="hp-caption"><span>${c.species}</span><span>HP ${member.hp} / ${member.maxHp}</span></div><div class="status-row">${member.burn ? `<span>灼伤 ${member.burn}</span>` : ''}${member.slow ? `<span>减速 ${member.slow}</span>` : ''}${member.shield ? `<span>护盾 ${member.shield}</span>` : ''}</div></div><div class="battle-art">${art(c.id)}</div><div class="team-dots" aria-label="${enemy ? '对手' : '我方'}队伍">${side.team.map((m, i) => `<span class="${m.hp <= 0 ? 'fainted' : ''} ${i === side.active ? 'active' : ''}" title="${byId(m.id).name}：${m.hp} / ${m.maxHp}">${byId(m.id).name}</span>`).join('')}</div></div>`;
}
function battleView() {
  const b = run.battle; const active = b.player.team[b.player.active]; const c = byId(active.id); const target = byId(b.enemy.team[b.enemy.active].id); const multiplier = effectiveness(c.element, target.element);
  return `${heading('04 / THE MOUNTAIN TRIAL', b.winner ? (b.winner === 'player' ? '山野认可了你们的默契。' : b.winner === 'draw' ? '旗鼓相当，亦是一次成长。' : '歇一歇，再出发。') : '青岚山隘 · 同行试炼', b.winner ? (b.winner === 'player' ? '你获得了「青岚同行印」手记纪念。伙伴的信任，又深了一分。' : '本次试炼已结束。重试会恢复全队生命与技能，也可以调整领队后再来。') : '选择技能，或换上一位伙伴。每次行动后，双方各完成一回合。')}
    <div class="arena"><div class="arena-caption"><span>青岚谷 / 山隘</span><span>第 ${b.turn} 回合</span></div><div class="arena-combatants">${combatant(b.player, false)}<div class="versus" aria-hidden="true">交<br>锋</div>${combatant(b.enemy, true)}</div></div>
    ${b.winner ? `<div class="result-panel"><span class="result-seal">${b.winner === 'player' ? '同行' : '再会'}</span><div><strong>${b.winner === 'player' ? '青岚同行印 · 已记入本次旅程' : '每次交锋，都是新的发现'}</strong><p>${b.winner === 'player' ? '纪念奖励不改变战斗数值。下一次，可以尝试新的伙伴组合。' : '观察五行克制，利用护盾与换兽，试试另一种节奏。'}</p></div></div><div class="result-actions"><button class="primary-button" data-action="start-battle">再次挑战</button><button class="secondary-button" data-action="party">调整领队</button><button class="text-button" data-action="restart">开启新旅程 →</button></div>` : `<div class="battle-controls"><div class="moves-heading"><h3>${c.name}的行动</h3><span class="matchup">${c.element} 对 ${target.element} · ${multiplier === 1.5 ? '克制 ×1.5' : multiplier === 0.75 ? '被克制 ×0.75' : '普通 ×1'}</span></div><div class="move-grid">${c.moves.map((move, index) => { const cooldown = active.cooldowns[move.id] || 0; return `<button class="move-button" data-action="move" data-id="${move.id}" ${cooldown ? 'disabled' : ''}><span class="move-name"><small>0${index + 1}</small>${move.name}<span>${cooldown ? `冷却 ${cooldown}` : '可使用'}</span></span><span class="move-description">${move.description}</span><span class="move-meta">威力 ${move.power} · ${move.cooldown ? `冷却 ${move.cooldown} 回合` : '无冷却'}</span></button>`; }).join('')}</div><div class="switch-row"><span>换兽<small>消耗本回合</small></span>${b.player.team.map((m, index) => `<button class="switch-button" data-action="switch" data-index="${index}" ${index === b.player.active || m.hp <= 0 ? 'disabled' : ''}>${byId(m.id).name}${badge(byId(m.id).element)}<small>${m.hp <= 0 ? '已倒下' : index === b.player.active ? '出战中' : `${m.hp}/${m.maxHp}`}</small></button>`).join('')}</div><p class="feedback" role="status">${run.note}</p></div>`}
    <details class="battle-log" open><summary>交锋手记 <span>${b.log.length} 条记录</span></summary><ol aria-live="polite" aria-relevant="additions">${b.log.slice(-12).reverse().map((line) => `<li>${escapeHtml(line)}</li>`).join('')}</ol></details>${cycle()}`;
}
app.addEventListener('click', (event) => {
  const button = event.target.closest('button[data-action]'); if (!button || button.disabled) return;
  const { action, id } = button.dataset; let focus = true;
  if (action === 'choose') { run.team = [id]; run.phase = 'explore'; }
  else if (action === 'encounter') { run.encounter = id; run.bond = 0; run.note = ''; }
  else if (action === 'back-tracks') { run.encounter = null; run.note = ''; }
  else if (action === 'bond') {
    if (button.dataset.correct !== 'true') { run.note = '它有些迟疑，退后了半步。再看看观察手记，试试更温和的方式。'; focus = false; }
    else { run.bond += 1; run.note = '它放下了戒备，朝你靠近了一点。再试着回应它的习性。'; focus = false;
      if (run.bond === 2) { run.team.push(run.encounter); run.note = `${byId(run.encounter).name}与你结契，成为同行伙伴。`; run.encounter = null; run.location += 1; if (run.location === 2) run.phase = 'party'; focus = true; }
    }
  }
  else if (action === 'lead') { run.team = [id, ...run.team.filter((member) => member !== id)]; run.note = `${byId(id).name}已成为领队。`; focus = false; }
  else if (action === 'start-battle') { run.battle = createBattle(run.team, ['boar', 'ape', 'turtle']); run.phase = 'battle'; run.note = ''; }
  else if (action === 'move' || action === 'switch') {
    try { run.battle = stepBattle(run.battle, action === 'move' ? { type: 'move', moveId: id } : { type: 'switch', index: Number(button.dataset.index) }); run.note = ''; if (run.battle.winner) run.phase = 'end'; }
    catch (error) { run.note = error.message; }
    focus = Boolean(run.battle.winner);
  }
  else if (action === 'party') { run.phase = 'party'; run.note = ''; }
  else if (action === 'restart') run = freshRun();
  render(focus);
});
render();
