import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createBattle, resolveTurn, previewMove } from '../src/battle.js';
import { CREATURES } from '../src/data.js';
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE_PATH ? pathToFileURL(process.env.PLAYWRIGHT_MODULE_PATH).href : 'playwright');
const browser = await chromium.launch({headless:true, ...(process.env.CHROME_PATH ? {executablePath:process.env.CHROME_PATH} : {})});
const output = process.env.SCREENSHOT_DIR || join(tmpdir(), 'shanhai-browser-presentation');
await mkdir(output,{recursive:true});
const errors=[]; const results=[];
const click = (p,a,s='') => p.locator(`[data-action="${a}"]${s}`).first().click();
async function start(p) {
  await p.goto(process.env.BASE_URL || 'http://127.0.0.1:4173');
  await click(p,'choose','[data-id="fox"]');
  for(const id of ['deer','turtle']) { await click(p,'encounter',`[data-id="${id}"]`); await click(p,'bond','[data-correct="true"]'); await click(p,'bond','[data-correct="true"]'); }
  await click(p,'start-battle');
}
async function check(p,b) {
  for(const side of ['player','enemy']) {
    const m=b[side].team[b[side].active];const root=p.locator(`[data-side="${side}"]`);
    assert.equal(await root.getAttribute('data-creature'),m.id);
    for(const [kind,value] of [['hp',m.hp],['shield',m.shield]]) {
      assert.equal(Number(await root.locator(`.${kind}-track`).getAttribute('aria-valuenow')),value,`${side} ${kind} state`);
      assert.match(await root.locator(`.${kind}-caption`).innerText(),new RegExp(`\\b${value}\\b`));
      const width=await root.locator(`.${kind}-track > span`).evaluate(n=>Number.parseFloat(n.style.width));
      const max=Number(await root.locator(`.${kind}-track`).getAttribute('aria-valuemax'));
      assert.ok(Math.abs(width-value/max*100)<.01,`${kind} width represents actual value`);
    }
    if(m.burn) assert.match(await root.locator('.status-row').innerText(),new RegExp(`灼伤 · 余 ${m.burn} 次`));
    if(m.slow) assert.match(await root.locator('.status-row').innerText(),new RegExp(`减速 · 余 ${m.slow} 回合`));
    const roster=await root.locator('.roster-member small').allTextContents();
    assert.deepEqual(roster,b[side].team.map(x=>`${x.hp} / ${x.maxHp}`));
  }
  if(!b.winner) for(const m of CREATURES.find(c=>c.id===b.player.team[b.player.active].id).moves.filter(m=>m.power)) {
    const expected=previewMove(b,m.id);
    const text=await p.locator(`[data-id="${m.id}"] .move-prediction`).innerText();
    assert.equal(text,`预估生命 −${expected.hpDamage}${expected.shieldDamage ? ` · 护盾 −${expected.shieldDamage}` : ''}`);
  }
  assert.equal(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.equal(await p.locator('img').evaluateAll(ns=>ns.every(n=>n.complete&&n.naturalWidth>0)),true,'Every displayed image loaded');
}
try {
  const p=await browser.newPage({viewport:{width:1440,height:1000}});
  p.on('pageerror',e=>errors.push(e.message));p.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await start(p);
  const alpha=await p.evaluate(async()=>{
    const result={};
    for(const id of ['fox','turtle','deer','boar','ape','fish']) {
      const image=new Image();image.src=`/assets/${id}.png`;await image.decode();
      const c=document.createElement('canvas');c.width=image.width;c.height=image.height;const ctx=c.getContext('2d');ctx.drawImage(image,0,0);
      const data=ctx.getImageData(0,0,c.width,c.height).data;let zero=0,partial=0,opaque=0,maxAlpha=0,nearOpaque=0;
      for(let i=3;i<data.length;i+=4){maxAlpha=Math.max(maxAlpha,data[i]);if(data[i]>=250)nearOpaque++;if(data[i]===0)zero++;else if(data[i]===255)opaque++;else partial++;}
      result[id]={width:c.width,height:c.height,corners:[data[3],data[c.width*4-1],data[(c.height-1)*c.width*4+3],data[data.length-1]],maxAlpha,nearOpaque:nearOpaque/(data.length/4),zero:zero/(data.length/4),partial:partial/(data.length/4),opaque:opaque/(data.length/4)};
    }return result;
  });
  console.log('SPRITE_ALPHA',JSON.stringify(alpha));
  // Generated PNG encoder uses alpha254 for opaque pixels; alpha<=2 is visually clear.
  // Require substantial clear background and near-opaque subject, not exact255.
  for(const a of Object.values(alpha)){assert.ok(a.corners.every(x=>x<=2));assert.ok(a.zero>.1,'Background must contain substantial fully transparent area');assert.ok(a.maxAlpha>=250 && a.nearOpaque>.1,'Subject must remain visually opaque');}
  let state=createBattle(['fox','deer','turtle'],['boar','ape','turtle']);await check(p,state);
  assert.ok(await p.locator('.move-grid').evaluate(n=>n.getBoundingClientRect().bottom<=innerHeight),'Desktop skill cards fit initial 1000px viewport');
  await p.screenshot({path:`${output}/presentation-desktop.png`,fullPage:true});
  const action={type:'move',moveId:'fox-skill'};const resolved=resolveTurn(state,action);
  await p.locator('[data-id="fox-skill"]').evaluate(n=>{n.click();n.click(); document.querySelector('[data-action="move"]').dispatchEvent(new MouseEvent('click',{bubbles:true}));});
  assert.equal(await p.locator('#app').getAttribute('data-playing'),'true');
  assert.equal(await p.locator('[data-action="move"]:enabled, [data-action="switch"]:enabled').count(),0,'Actions locked during playback');
  await p.locator('.casting').waitFor();
  const projectile1=await p.locator('.element-projectile').evaluate(n=>getComputedStyle(n).transform);
  const frame1=await p.locator('.casting .battle-art').evaluate(n=>getComputedStyle(n).transform);
  await p.waitForTimeout(80);
  const frame2=await p.locator('.casting .battle-art').evaluate(n=>getComputedStyle(n).transform);
  const projectile2=await p.locator('.element-projectile').evaluate(n=>getComputedStyle(n).transform);
  assert.notEqual(projectile1,projectile2,'Element projectile must travel between actual frames');
  assert.notEqual(frame1,frame2,'Cast must show different actual animation frames');
  await p.locator('.hit').waitFor();
  assert.equal(Number(await p.locator('.enemy .hp-track').getAttribute('aria-valuenow')),resolved.events.find(e=>e.type==='move').state.enemy.team[resolved.events.find(e=>e.type==='move').state.enemy.active].hp,'Impact applies first event snapshot, not final state');
  assert.equal(Number(await p.locator('.player .hp-track').getAttribute('aria-valuenow')),resolved.events.find(e=>e.type==='move').state.player.team[resolved.events.find(e=>e.type==='move').state.player.active].hp,'Impact shows actual event snapshot');
  await p.screenshot({path:`${output}/presentation-impact.png`,fullPage:true});
  await p.locator('#app[data-playing="false"]').waitFor();state=resolved.state;await check(p,state);
  assert.match(await p.locator('.battle-toolbar').innerText(),/第 2 回合/,'Repeated clicks must produce one turn');
  await click(p,'speed');assert.match(await p.locator('[data-action="speed"]').innerText(),/×2/);
  await click(p,'motion');
  for(const action of [{type:'move',moveId:'fox-guard'},{type:'switch',index:2},{type:'move',moveId:'turtle-guard'},{type:'move',moveId:'turtle-basic'},{type:'switch',index:1},{type:'move',moveId:'deer-guard'}]) {
    const next=resolveTurn(state,action);
    if(action.type==='move')await click(p,'move',`[data-id="${action.moveId}"]`);else await click(p,'switch',`[data-index="${action.index}"]`);
    if(action.moveId==='fox-guard') {
      await p.locator('.player .shield-track[aria-valuenow="28"]').waitFor();
      assert.match(await p.locator('.player .shield-caption').innerText(), /28 \/ 28/);
      assert.equal(await p.locator('.player .shield-track > span').evaluate(n=>n.style.width),'100%');
    }
    await p.locator('#app[data-playing="false"]').waitFor();state=next.state;await check(p,state);
  }
  results.push({desktop:true,animationFrames:[frame1,frame2],turn:state.turn});
  await p.close();
  const mobile=await browser.newPage({viewport:{width:390,height:844},reducedMotion:'reduce'});
  mobile.on('pageerror',e=>errors.push(e.message));mobile.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
  await start(mobile);assert.ok(await mobile.locator('.move-button').nth(2).evaluate(n=>n.getBoundingClientRect().bottom<=innerHeight),'Mobile battle and all three skills share initial viewport');assert.equal(await mobile.locator('[data-action="motion"]').getAttribute('aria-pressed'),'true');
  await click(mobile,'move','[data-id="fox-skill"]');
  assert.deepEqual(await mobile.locator('.arena *').evaluateAll(ns=>[...new Set(ns.map(n=>getComputedStyle(n).animationName))]),['none']);
  await mobile.locator('#app[data-playing="false"]').waitFor();await check(mobile,resolveTurn(createBattle(['fox','deer','turtle'],['boar','ape','turtle']),{type:'move',moveId:'fox-skill'}).state);
  await mobile.screenshot({path:`${output}/presentation-mobile.png`,fullPage:true});
  let mobileState=resolveTurn(createBattle(['fox','deer','turtle'],['boar','ape','turtle']),{type:'move',moveId:'fox-skill'}).state;
  let sawSlow=false;let turns=0;
  while(!mobileState.winner) {
    assert.ok(turns++<50);const m=mobileState.player.team[mobileState.player.active];
    const moveId=m.id+(!m.cooldowns[m.id+'-skill']?'-skill':'-basic');
    await click(mobile,'move',`[data-id="${moveId}"]`);await mobile.locator('#app[data-playing="false"]').waitFor();
    mobileState=resolveTurn(mobileState,{type:'move',moveId}).state;await check(mobile,mobileState);
    sawSlow ||= mobileState.player.team[mobileState.player.active].slow>0;
  }
  assert.ok(sawSlow,'Slow status remaining turns verified during actual combat');
  results.push({mobile:true,reducedMotion:true,slowStatus:true});assert.deepEqual(errors,[]);console.log(JSON.stringify({results,errors,output},null,2));
} finally { await browser.close(); }
