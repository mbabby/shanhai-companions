import test from 'node:test';
import assert from 'node:assert/strict';
import * as saves from '../src/save.js';

const legacy = () => ({run:{phase:'explore',team:['fox','boar'],location:1,encounter:null,bond:0,note:'旧旅程',battle:null},progress:{fox:30,boar:10},settings:{speed:2,reducedMotion:true,sfx:true,music:false}});
const storage = () => { const values=new Map(); return {getItem:key=>values.get(key)??null,setItem:(key,value)=>values.set(key,value)}; };

test('v1 migration preserves companions, XP and settings in an accessible chapter map',()=>{
  assert.equal(typeof saves.migrateSave,'function');
  const old=legacy(), migrated=saves.migrateSave(saves.decodeSave(JSON.stringify({version:1,...old})));
  assert.equal(migrated.run.chapter,1);
  assert.equal(migrated.run.phase,'map');
  assert.deepEqual(migrated.run.team,old.run.team);
  assert.deepEqual(migrated.run.owned,old.run.team);
  assert.deepEqual(migrated.progress,old.progress);
  assert.deepEqual(migrated.settings,old.settings);
  assert.equal(migrated.run.battle,null);
  assert.deepEqual(migrated.run.milestones,[]);
  const text=saves.encodeSave(migrated);
  assert.equal(JSON.parse(text).version,2);
  assert.deepEqual(saves.decodeSave(text),migrated);
});

test('first chapter autosave preserves raw legacy backup through later autosaves',()=>{
  assert.equal(typeof saves.migrateSave,'function');
  const s=storage(), raw=JSON.stringify({version:1,...legacy()},null,2);
  s.setItem(saves.SAVE_KEY,raw);
  const migrated=saves.migrateSave(saves.decodeSave(raw));
  assert.equal(saves.writeSave(s,migrated).ok,true);
  assert.equal(s.getItem(saves.BACKUP_KEY),raw);
  assert.equal(saves.writeSave(s,migrated).ok,true);
  assert.equal(s.getItem(saves.BACKUP_KEY),raw);
});

test('malformed chapter, future version and oversized data are rejected without overwriting originals',()=>{
  const good=saves.migrateSave(legacy());
  for(const mutate of [p=>p.run.team.push('ape'),p=>p.run.owned.push('unknown'),p=>p.run.evolved.push('fox'),p=>p.progress.fish=20,p=>p.run.rewardClaimed=true,p=>p.run.gains=[{}],p=>p.settings.speed=3,p=>p.run.chapter=2]){
    const bad=structuredClone(good);mutate(bad);
    assert.throws(()=>saves.decodeSave(JSON.stringify({version:2,...bad})));
  }
  assert.throws(()=>saves.decodeSave(' '.repeat(1000001)));
  const s=storage();
  for(const original of ['broken',JSON.stringify({version:100,run:good.run})]){
    s.setItem(saves.SAVE_KEY,original);
    assert.equal(saves.writeSave(s,good).ok,false);
    assert.equal(s.getItem(saves.SAVE_KEY),original);
  }
});

test('migration accepts all legacy phases and never manufactures chapter rewards',async()=>{
  const {createBattle}=await import('../src/battle.js');
  const choose={run:{phase:'choose',team:[],location:0,encounter:null,bond:0,note:'',battle:null},progress:{}};
  assert.equal(saves.migrateSave(choose).run.phase,'choose');
  for(const phase of ['party','battle','end']){
    const old=legacy();old.run={...old.run,phase,team:['fox','boar','fish'],location:2};
    old.progress={fox:30};
    if(phase!=='party') old.run.battle=createBattle(old.run.team,['boar','ape','turtle'],{playerProgress:old.progress});
    if(phase==='end'){
      old.run.battle.enemy.team.forEach(m=>{m.hp=0;});old.run.battle.winner='player';
    }
    const migrated=saves.migrateSave(old);
    assert.equal(migrated.run.phase,'map');
    assert.equal(migrated.run.battle,null);
    assert.deepEqual(migrated.run.milestones,[]);
    assert.equal(migrated.progress.fox,phase==='end'?60:30);
    assert.deepEqual(saves.migrateSave(migrated),migrated);
  }
});

test('backup failure aborts first migration and restore retains the migrated snapshot',()=>{
  const s=storage(), raw=JSON.stringify({version:1,...legacy()});s.setItem(saves.SAVE_KEY,raw);
  const migrated=saves.migrateSave(saves.decodeSave(raw)), setter=s.setItem;
  s.setItem=(key,value)=>{if(key===saves.BACKUP_KEY)throw Error('quota');setter(key,value);};
  assert.equal(saves.writeSave(s,migrated).ok,false);
  assert.equal(s.getItem(saves.SAVE_KEY),raw);
  s.setItem=setter;
  assert.equal(saves.writeSave(s,migrated).ok,true);
  const newer=s.getItem(saves.SAVE_KEY), restored=saves.restoreBackup(s);
  assert.equal(restored.error,null);
  assert.equal(s.getItem(saves.SAVE_KEY),raw);
  assert.equal(s.getItem(saves.BACKUP_KEY),newer);
  assert.equal(saves.migrateSave(restored.data).run.chapter,1);
});

test('migration backs up the current v1 bytes even when an older valid backup exists',()=>{
  const s=storage(), raw=JSON.stringify({version:1,...legacy()},null,2);
  s.setItem(saves.BACKUP_KEY,JSON.stringify({version:1,...legacy()}));
  s.setItem(saves.SAVE_KEY,raw);
  assert.equal(saves.writeSave(s,saves.migrateSave(legacy())).ok,true);
  assert.equal(s.getItem(saves.BACKUP_KEY),raw);
});

test('migration preserves both a protected damaged backup and original legacy bytes',()=>{
  const s=storage(), raw=JSON.stringify({version:1,...legacy()});
  s.setItem(saves.SAVE_KEY,raw);s.setItem(saves.BACKUP_KEY,'protected damaged original');
  assert.equal(saves.writeSave(s,saves.migrateSave(legacy())).ok,true);
  assert.equal(s.getItem(saves.BACKUP_KEY),'protected damaged original');
  assert.equal(s.getItem(saves.LEGACY_BACKUP_KEY),raw);
});

test('chapter battles and first/replay rewards roundtrip with strict XP and encounter identity',async()=>{
  const c=await import('../src/chapter.js');
  let run=c.chooseStarter(c.freshChapter(),'fox'), progress={};
  for(const id of ['boar','ape']){
    run=c.visitNode(run,'forest');({run}=c.interactNode(run,'roots'));
    run=c.startBond(run,id);for(const step of c.HABITS[id].steps)run=c.answerBond(run,step.answer);
  }
  const roundtrip=()=>assert.deepEqual(saves.decodeSave(saves.encodeSave({run,progress})).run,run);
  run=c.visitNode(run,'ridge');run=c.beginEncounter(run,progress,'ridge');roundtrip();
  for(const mutate of [p=>p.progress.fox=30,p=>p.run.battle.encounterId='marsh',p=>p.run.battle.enemy.team[0].xp=30,p=>p.run.battle.player.team[0].evolved=true,p=>p.run.rewardClaimed=true]){
    const bad=structuredClone({run,progress});mutate(bad);assert.throws(()=>saves.encodeSave(bad));
  }
  const win=()=>{const battle=structuredClone(run.battle);battle.enemy.team.forEach(m=>{m.hp=0;});battle.winner='player';run=c.recordBattle(run,battle);};
  win();roundtrip();({run,progress}=c.settleEncounter(run,progress));roundtrip();
  assert.equal(progress.fox,30);
  const invalid=structuredClone({run,progress});invalid.run.gains[0].xpGained=90;assert.throws(()=>saves.encodeSave(invalid));
  run=c.beginEncounter(run,progress,'ridge');win();({run,progress}=c.settleEncounter(run,progress));roundtrip();
  assert.equal(progress.fox,30);assert.deepEqual(run.gains,[]);
  const duplicate=structuredClone({run,progress});duplicate.progress.fox=60;assert.throws(()=>saves.encodeSave(duplicate));
});

test('original legacy export is raw, retained and write failure blocks destructive migration',()=>{
  const s=storage(),raw=JSON.stringify({version:1,...legacy()},null,3),setter=s.setItem;
  assert.deepEqual(saves.readLegacyOriginal(s),{raw:null,error:null});
  s.setItem(saves.SAVE_KEY,raw);
  s.setItem=(key,value)=>{if(key===saves.LEGACY_BACKUP_KEY)throw Error('quota');setter(key,value);};
  assert.equal(saves.writeSave(s,saves.migrateSave(legacy())).ok,false);
  assert.equal(s.getItem(saves.SAVE_KEY),raw);
  s.setItem=setter;assert.equal(saves.writeSave(s,saves.migrateSave(legacy())).ok,true);
  assert.deepEqual(saves.readLegacyOriginal(s),{raw,error:null});
  assert.equal(saves.replaceSave(s,saves.migrateSave(legacy())).ok,true);
  assert.equal(saves.readLegacyOriginal(s).raw,raw);
  assert.ok(saves.readLegacyOriginal(null).error);
});
