/** Full chapter browser acceptance. First completion always uses real UI actions.
 * Optional Playwright stays external: PLAYWRIGHT_MODULE_PATH=/path/to/playwright/index.mjs
 * CHROME_PATH, BASE_URL and SCREENSHOT_DIR may override local defaults.
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { previewMove } from '../src/battle.js';
import { combatConfig } from '../src/progression.js';
import { HABITS, NODES } from '../src/chapter.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const browser = await chromium.launch({ headless:true, ...(process.env.CHROME_PATH ? { executablePath:process.env.CHROME_PATH } : {}) });
const baseURL = process.env.BASE_URL || 'http://127.0.0.1:4173';
const output = process.env.SCREENSHOT_DIR || join(tmpdir(),'shanhai-chapter-qa');
await mkdir(output,{recursive:true});
const key='shanhai-save-v1', errors=[], outcomes=[];
const saved=p=>p.evaluate(k=>JSON.parse(localStorage.getItem(k)),key);
const settled=p=>p.locator('#app[data-playing="false"]').waitFor();
async function layout(p) {
 assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false,'No horizontal overflow');
 await p.locator('img').evaluateAll(ns=>Promise.all(ns.map(n=>n.decode().catch(()=>{}))));
 assert.deepEqual(await p.locator('img').evaluateAll(ns=>ns.filter(n=>!n.complete||!n.naturalWidth).map(n=>n.src)),[],'All visible art loads');
}
async function click(p,action,extra='') {
 const button=p.locator(`[data-action="${action}"]${extra}`).first();
 if(!await button.isVisible() && await p.locator('.save-tools').count()) await p.locator('.save-tools').evaluate(n=>n.open=true);
 await button.click(); await settled(p); await layout(p);
}
async function reload(p){await p.reload();await click(p,'continue');}
async function capture(p,name,width){await p.screenshot({path:join(output,`${name}-${width}.png`),fullPage:true});}
async function importText(p,text,accept=true){const chooser=p.waitForEvent('filechooser');await click(p,'import');if(accept)p.once('dialog',d=>d.accept());await(await chooser).setFiles({name:'journey.json',mimeType:'application/json',buffer:Buffer.from(text)});await p.waitForTimeout(100);}
async function fight(p) {
 let turns=0;
 while((await saved(p)).run.phase==='battle') {
  assert.ok(turns++<100,'Battle terminates');
  const b=(await saved(p)).run.battle,a=b.player.team[b.player.active];
  for(const side of ['player','enemy']) {const actor=b[side].team[b[side].active],panel=p.locator(`[data-side="${side}"]`);assert.equal(Number(await panel.locator('.hp-track').getAttribute('aria-valuenow')),actor.hp);assert.equal(Number(await panel.locator('.shield-track').getAttribute('aria-valuenow')),actor.shield);}
  for(const m of combatConfig(a.id,a.xp,a.evolved).moves.filter(m=>m.power&&!a.cooldowns[m.id])) {const expected=previewMove(b,m.id);assert.match(await p.locator(`[data-action="move"][data-id="${m.id}"] .move-prediction`).innerText(),new RegExp(`预估生命 −${expected.hpDamage}`));}
  const wanted={boar:'deer',ape:'fox',turtle:'turtle',fish:'turtle',fox:'turtle',deer:'fox'}[b.enemy.team[b.enemy.active].id];
  const index=b.player.team.findIndex(m=>m.id===wanted&&m.hp>0);
  if(index>=0&&index!==b.player.active)await click(p,'switch',`[data-index="${index}"]`);
  else {const move=combatConfig(a.id,a.xp,a.evolved).moves.filter(m=>m.power&&!a.cooldowns[m.id]).sort((a,b)=>b.power-a.power)[0];await click(p,'move',`[data-id="${move.id}"]`);}
 }
 const s=await saved(p);assert.equal(s.run.battle.winner,'player');assert.equal(s.run.rewardClaimed,true);
 await reload(p);assert.deepEqual((await saved(p)).progress,s.progress,'Reward refresh cannot duplicate XP');assert.deepEqual((await saved(p)).run.items,s.run.items);
 return turns;
}
async function persistence(p) {
 const original=await saved(p);const download=p.waitForEvent('download');await click(p,'export');const raw=await readFile(await(await download).path(),'utf8');assert.deepEqual(JSON.parse(raw),original,'Export matches persisted state');
 p.once('dialog',d=>d.dismiss());await click(p,'new');assert.deepEqual(await saved(p),original,'Cancelled new game preserves progress');
 p.once('dialog',d=>d.accept());await click(p,'new');assert.equal((await saved(p)).run.phase,'choose');
 const fresh=await saved(p);p.once('dialog',d=>d.accept());await click(p,'restore');assert.deepEqual(await saved(p),original,'Backup restores exact completed journey');assert.deepEqual(await p.evaluate(()=>JSON.parse(localStorage.getItem('shanhai-save-backup'))),fresh);
 p.once('dialog',d=>d.accept());await click(p,'new');await importText(p,raw);assert.deepEqual(await saved(p),original,'Import/export roundtrip');
 for(const bad of ['{broken',JSON.stringify({...original,version:999})]) {await importText(p,bad,false);assert.match(await p.locator('.save-warning').innerText(),/导入失败/);assert.deepEqual(await saved(p),original);}
}
async function protectedStorage() {
 for(const raw of ['{broken','{"version":999,"precious":"preserve"}']) {
  const p=await browser.newPage();await p.goto(baseURL);await p.evaluate(([key,raw])=>localStorage.setItem(key,raw),[key,raw]);await p.reload();assert.equal(await p.locator('[data-action="continue"]').count(),0);assert.equal(await p.evaluate(k=>localStorage.getItem(k),key),raw);
  const download=p.waitForEvent('download');await click(p,'export-raw');assert.equal(await readFile(await(await download).path(),'utf8'),raw);
  p.once('dialog',d=>d.accept());await click(p,'new');await click(p,'choose','[data-id="fox"]');assert.equal(await p.evaluate(()=>localStorage.getItem('shanhai-save-backup')),raw);await p.close();
 }
 const p=await browser.newPage();await p.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('disabled','SecurityError');}}));await p.goto(baseURL);assert.match(await p.locator('.save-warning').innerText(),/存储不可用/);p.once('dialog',d=>d.accept());await click(p,'new');await click(p,'choose','[data-id="fox"]');assert.equal(await p.locator('[data-action="choose"]').count(),0);await p.close();
}
async function legacyMigration() {
 const p=await browser.newPage();await p.goto(baseURL);
 const legacy=JSON.stringify({version:1,run:{phase:'party',team:['fox','deer','turtle'],location:2,encounter:null,bond:0,note:'旧旅程',battle:null,rewardClaimed:false,gains:[]},progress:{fox:90,deer:30,turtle:60},settings:{speed:2,reducedMotion:true,sfx:false,music:false}});
 await p.evaluate(([key,raw])=>localStorage.setItem(key,raw),[key,legacy]);await p.reload();await click(p,'continue');await click(p,'map');const migrated=await saved(p);assert.equal(migrated.version,2);assert.deepEqual(migrated.progress,{fox:90,deer:30,turtle:60});assert.deepEqual(migrated.run.team,['fox','deer','turtle']);assert.deepEqual(migrated.run.owned,['fox','deer','turtle']);assert.equal(await p.evaluate(()=>localStorage.getItem('shanhai-save-backup')),legacy,'Original v1 preserved verbatim');await reload(p);assert.equal(await p.evaluate(()=>localStorage.getItem('shanhai-save-backup')),legacy);assert.equal(await p.evaluate(()=>localStorage.getItem('shanhai-save-v1-original')),legacy);const download=p.waitForEvent('download');await click(p,'export-legacy');assert.equal(await readFile(await(await download).path(),'utf8'),legacy);await p.close();
}
async function journey(viewport,starter) {
 const context=await browser.newContext({viewport,reducedMotion:'reduce'}),p=await context.newPage();
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(`${m.text()} (${m.location().url})`);});
 await p.goto(baseURL);await click(p,'choose',`[data-id="${starter}"]`);if(starter==='fox')await capture(p,'map',viewport.width);
 for(const node of NODES.filter(n=>['village','forest','creek','overlook'].includes(n.id))) {
  await click(p,'visit',`[data-id="${node.id}"]`);
  for(const action of node.actions)await click(p,'interact',`[data-id="${action.id}"]`);
  for(const id of node.species) {
   if((await saved(p)).run.owned.includes(id))continue;
   await click(p,'encounter',`[data-id="${id}"]`);
   for(let step=0;step<2;step++) {
    const habit=HABITS[id].steps[step],wrong=habit.options.find(o=>o.id!==habit.answer);
    await click(p,'bond',`[data-id="${wrong.id}"]`);assert.equal((await saved(p)).run.bond,step,'Wrong answer retains bond progress');
    if(step===1){const before=await saved(p);await reload(p);assert.deepEqual(await saved(p),before,'Partial bond survives refresh');}
    await click(p,'bond',`[data-id="${habit.answer}"]`);
   }
   assert.ok((await saved(p)).run.owned.includes(id));
  }
  await click(p,'map');
 }
 assert.equal((await saved(p)).run.owned.length,6,'All six recruited through normal interaction');
 await click(p,'party');
 // Exercise replacement while full, then explicitly establish the three starter team.
 let s=await saved(p);const reserve=s.run.owned.find(id=>!s.run.team.includes(id));
 await click(p,'add-party',`[data-id="${reserve}"]`);await click(p,'replace',`[data-id="${s.run.team[0]}"]`);assert.ok((await saved(p)).run.team.includes(reserve));
 for(const id of (await saved(p)).run.team.filter(id=>!['fox','turtle','deer'].includes(id)))await click(p,'bench',`[data-id="${id}"]`);
 for(const id of ['fox','turtle','deer'])if(!(await saved(p)).run.team.includes(id))await click(p,'add-party',`[data-id="${id}"]`);
 if((await saved(p)).run.team[0]!==starter)await click(p,'lead',`[data-id="${starter}"]`);assert.equal((await saved(p)).run.team[0],starter);await click(p,'map');
 const turns={};
 for(const encounter of ['ridge','marsh','source']) {
  if(encounter==='marsh') {
   await click(p,'visit','[data-id="shrine"]');await click(p,'interact','[data-id="attune"]');
   assert.deepEqual((await saved(p)).run.evolved,[],'Level 3 never auto-evolves');
   for(const id of ['fox','turtle','deer']){await click(p,'evolve-preview',`[data-id="${id}"]`);if(id==='fox'&&starter==='fox')await capture(p,'evolution',viewport.width);assert.equal(await p.locator(`img[src*="${id}-evolved.png"]`).count(),1,'Evolution preview uses distinct painted form');assert.ok(!(await saved(p)).run.evolved.includes(id));await click(p,'evolve-confirm',`[data-id="${id}"]`);assert.ok((await saved(p)).run.evolved.includes(id));await click(p,'evolution-close');}
   await click(p,'map');
  }
  await click(p,'visit',`[data-id="${encounter}"]`);await click(p,'start-battle',`[data-id="${encounter}"]`);if((await saved(p)).settings.speed===1)await click(p,'speed');
  if(starter==='fox'&&encounter==='ridge') {
   await capture(p,'battle',viewport.width);const before=await saved(p);
   await p.locator('[data-action="move"]:enabled').first().click();assert.equal(await p.locator('#app').getAttribute('data-playing'),'true');assert.deepEqual(await saved(p),before,'No partial turn persisted');
   await p.locator('[data-action="move"]').first().evaluate(n=>n.click());await reload(p);assert.deepEqual(await saved(p),before,'Mid-turn refresh resumes complete prior snapshot');
  }
  turns[encounter]=await fight(p);await click(p,'map');
 }
 await click(p,'ending');assert.equal((await saved(p)).run.endingSeen,true);if(starter==='fox')await capture(p,'ending',viewport.width);
 await click(p,'map');const beforeReplay=await saved(p);await click(p,'visit','[data-id="source"]');await click(p,'start-battle','[data-id="source"]');await fight(p);const replay=await saved(p);assert.deepEqual(replay.progress,beforeReplay.progress);assert.deepEqual(replay.run.items,beforeReplay.run.items);assert.deepEqual(replay.run.milestones,beforeReplay.run.milestones);assert.equal(replay.run.owned.length,6);
 if(starter==='fox'&&viewport.width===1440)await persistence(p);
 await writeFile(join(output,`completed-${viewport.width}-${starter}.json`),JSON.stringify(await saved(p)));
 outcomes.push({width:viewport.width,starter,turns,owned:replay.run.owned.length,evolved:replay.run.evolved.length});console.log(JSON.stringify(outcomes.at(-1)));await context.close();
}
async function defeatRecovery() {
 const p=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
 p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(`${m.text()} (${m.location().url})`);});
 await p.goto(baseURL);await importText(p,await readFile(join(output,'completed-390-fox.json'),'utf8'));
 await click(p,'map');await click(p,'visit','[data-id="ridge"]');await click(p,'start-battle','[data-id="ridge"]');const before=await saved(p);let actions=0;
 while((await saved(p)).run.phase==='battle') {assert.ok(actions++<100);const switches=p.locator('[data-action="switch"]:enabled');if(await switches.count())await click(p,'switch',':enabled');else await click(p,'move',':enabled');}
 const loss=await saved(p);assert.notEqual(loss.run.battle.winner,'player');assert.deepEqual(loss.progress,before.progress);assert.deepEqual(loss.run.owned,before.run.owned);assert.deepEqual(loss.run.items,before.run.items);
 await capture(p,'defeat',390);await click(p,'map');await click(p,'party');assert.equal((await saved(p)).run.phase,'party');await click(p,'map');await click(p,'visit','[data-id="ridge"]');await click(p,'start-battle','[data-id="ridge"]');const retry=await saved(p);assert.ok(retry.run.battle.player.team.every(m=>m.hp===m.maxHp));await fight(p);await p.close();console.log(JSON.stringify({defeatRecovery:'passed',actions}));
}
try {
 if(process.env.QA_FOCUSED)await defeatRecovery();
 else for(const viewport of [{width:1440,height:1000},{width:390,height:844}].filter(v=>!process.env.QA_WIDTH||v.width===Number(process.env.QA_WIDTH)))for(const starter of (process.env.QA_STARTER?[process.env.QA_STARTER]:['fox','turtle','deer']))await journey(viewport,starter);
 if(!process.env.QA_FOCUSED&&!process.env.QA_WIDTH&&!process.env.QA_STARTER)await defeatRecovery();
 await legacyMigration();await protectedStorage();assert.deepEqual(errors,[],'No page or console errors');
 console.log(JSON.stringify({outcomes,errors,screenshots:output,persistence:process.env.QA_FOCUSED?'defeat/retry, v1 migration/original export and protected storage passed':'export/import, backup restore, atomic turns, reward deduplication, v1 migration and protected storage passed'},null,2));
} catch(error) {for(const [i,c] of browser.contexts().entries())for(const [j,p] of c.pages().entries()) {await p.screenshot({path:join(output,`failure-${i}-${j}.png`),fullPage:true}).catch(()=>{});await writeFile(join(output,`failure-${i}-${j}.html`),await p.content()).catch(()=>{});}throw error;} finally {await browser.close();}
