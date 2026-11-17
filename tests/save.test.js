import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle } from '../src/battle.js';
import { awardExperience } from '../src/progression.js';
import { encodeSave, decodeSave, readSave, writeSave, replaceSave, restoreBackup } from '../src/save.js';
const KEY='shanhai-save-v1', BACKUP='shanhai-save-backup';
const fresh=()=>({run:{phase:'choose',team:[],location:0,encounter:null,bond:0,note:'',battle:null},progress:{}});
const fight=()=>({run:{phase:'battle',team:['fox','boar','fish'],location:2,encounter:null,bond:0,note:'',battle:createBattle(['fox','boar','fish'],['boar','ape','turtle'])},progress:{}});
function storage(){const data=new Map();return {getItem:k=>data.get(k)??null,setItem:(k,v)=>data.set(k,v)};}
const raw=p=>JSON.stringify({version:1,...p});
test('normalizes supported v1 defaults and round trips stages without aliasing',()=>{
  const p=fresh(),r=decodeSave(raw(p));assert.deepEqual(r.settings,{speed:1,reducedMotion:false,sfx:false,music:false});assert.equal(r.run.rewardClaimed,false);assert.deepEqual(r.run.gains,[]);
  r.run.team.push('fox');assert.deepEqual(p.run.team,[]);
  for(const payload of [fresh(),fight(),{...fresh(),run:{...fresh().run,phase:'explore',team:['fox'],encounter:'ape',bond:1}}]) assert.deepEqual(decodeSave(encodeSave(payload)),decodeSave(raw(payload)));
});
test('rejects impossible exploration, party, progress and malformed input',()=>{
  const cases=[p=>p.run.phase='unknown',p=>p.run.team=['boar'],p=>p.run.bond=1,p=>p.run.location=2,p=>p.run.encounter='ape',p=>p.progress={fox:91},p=>p.progress={evil:0},p=>p.settings={speed:3},p=>p.run.note='x'.repeat(2001),p=>p.run.rewardClaimed=true,p=>p.run.gains=[{}]];
  for(const change of cases){const p=fresh();change(p);assert.throws(()=>decodeSave(raw(p)));}
  assert.throws(()=>decodeSave('{'));assert.throws(()=>decodeSave('x'.repeat(1000001)));assert.throws(()=>decodeSave(JSON.stringify({version:2,...fresh()})));
  const p=fight();p.run.phase='party';assert.throws(()=>decodeSave(raw(p)));
});
test('battle imports require exact teams, enemy difficulty, progress and outcome consistency',()=>{
  const changes=[p=>p.run.team.reverse(),p=>p.progress.fox=30,p=>p.run.phase='end',p=>p.run.battle.player.team[0].hp=999,p=>p.run.battle.log=Array(201).fill('x'),p=>p.run.battle.enemy.team[0].xp=30];
  for(const change of changes){const p=fight();change(p);assert.throws(()=>decodeSave(raw(p)));}
});
test('claimed rewards match battle experience; malformed unclaimed rewards cannot farm xp',()=>{
  const p=fight();for(const m of p.run.battle.enemy.team)m.hp=0;p.run.battle.winner='player';p.run.phase='end';
  assert.equal(decodeSave(raw(p)).run.rewardClaimed,false);
  p.run.gains=[{}];assert.throws(()=>decodeSave(raw(p)));p.run.gains=[];
  const awarded=awardExperience({},p.run.team,'player');p.progress=awarded.progress;p.run.gains=awarded.gains;p.run.rewardClaimed=true;
  assert.equal(decodeSave(raw(p)).progress.fox,30);
  p.run.gains[0].xpGained=90;assert.throws(()=>decodeSave(raw(p)));
});
test('writes retain a recoverable previous snapshot and restore preserves replaced raw',()=>{
  const s=storage();assert.equal(readSave(s).data,null);assert.equal(writeSave(s,fresh()).ok,true);
  const first=s.getItem(KEY);assert.equal(writeSave(s,fight()).ok,true);assert.equal(s.getItem(BACKUP),first);
  s.setItem(KEY,'broken');const restored=restoreBackup(s);assert.equal(restored.data.run.phase,'choose');assert.equal(s.getItem(BACKUP),'broken');
});
test('ordinary write refuses corrupt and future data; explicit replacement preserves original verbatim',()=>{
  for(const original of ['broken',JSON.stringify({version:999,important:'keep'})]){
    const s=storage();s.setItem(KEY,original);assert.ok(readSave(s).error);assert.equal(writeSave(s,fresh()).ok,false);assert.equal(s.getItem(KEY),original);
    assert.equal(replaceSave(s,fresh()).ok,true);assert.equal(s.getItem(BACKUP),original);
  }
});
test('storage unavailability, read/write errors and failed backups are visible without destroying main data',()=>{
  assert.ok(readSave(null).error);assert.equal(writeSave(null,fresh()).ok,false);
  const denied={getItem(){throw Error('denied');},setItem(){throw Error('denied');}};assert.ok(readSave(denied).error);assert.equal(writeSave(denied,fresh()).ok,false);assert.ok(restoreBackup(denied).error);
  const s=storage();s.setItem(KEY,encodeSave(fresh()));const before=s.getItem(KEY);s.setItem=()=>{throw Error('full');};assert.equal(writeSave(s,fight()).ok,false);assert.equal(s.getItem(KEY),before);
  const empty=storage();assert.ok(restoreBackup(empty).error);empty.setItem(BACKUP,'bad');assert.ok(restoreBackup(empty).error);assert.equal(empty.getItem(KEY),null);
});
test('autosave retains corrupt or future originals after a confirmed replacement',()=>{
  const s=storage();s.setItem(KEY,'original damaged bytes');assert.equal(replaceSave(s,fresh()).ok,true);assert.equal(writeSave(s,fight()).ok,true);assert.equal(s.getItem(BACKUP),'original damaged bytes');
});
test('failed recovery preserves both original data and recoverable backup',()=>{
  const s=storage();const good=encodeSave(fresh());s.setItem(KEY,'corrupt');s.setItem(BACKUP,good);
  const setter=s.setItem;s.setItem=(k,v)=>{if(k===KEY)throw Error('write denied');setter(k,v);};
  assert.ok(restoreBackup(s).error);assert.equal(s.getItem(KEY),'corrupt');assert.equal(s.getItem(BACKUP),good);
});
test('a backup-write failure during restore leaves current raw untouched',()=>{
  const s=storage();const good=encodeSave(fresh());s.setItem(KEY,'corrupt');s.setItem(BACKUP,good);
  const setter=s.setItem;s.setItem=(k,v)=>{if(k===BACKUP)throw Error('backup denied');setter(k,v);};
  assert.ok(restoreBackup(s).error);assert.equal(s.getItem(KEY),'corrupt');assert.equal(s.getItem(BACKUP),good);
});
