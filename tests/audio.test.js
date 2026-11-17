import test from 'node:test';
import assert from 'node:assert/strict';
import {createAudio} from '../src/audio.js';

// Node has no native Web Audio: record only its resource/scheduling boundary.
function backend(t, options={}) {
  const contexts=[];
  class Context {
    constructor() { this.state='suspended'; this.currentTime=0; this.destination={}; this.voices=[]; this.resumes=0; contexts.push(this); }
    createGain() { return {gain:{value:0,setValueAtTime(){},linearRampToValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){}}; }
    createOscillator() {
      const voice={frequency:{value:0,setValueAtTime(){},exponentialRampToValueAtTime(){}},connect(){},disconnect(){this.disconnected=true;},start(){this.started=true;},stop(){this.stopped=true;}};
      this.voices.push(voice); return voice;
    }
    resume() { this.resumes++; if(options.reject) return Promise.reject(Error('blocked')); this.state='running'; return Promise.resolve(); }
    close() { this.state='closed'; return options.closeReject ? Promise.reject(Error('close')) : Promise.resolve(); }
  }
  const original=globalThis.AudioContext; globalThis.AudioContext=Context;
  t.after(()=>{globalThis.AudioContext=original;});
  return contexts;
}
// Supply a configurable slot for the browser-only constructor.
if (!('AudioContext' in globalThis)) globalThis.AudioContext=undefined;

test('default off and saved preferences never create or resume audio without unlock', async t=>{
  const contexts=backend(t); const audio=createAudio();
  audio.play({type:'move'}); assert.equal(await audio.unlock(),false);
  assert.equal(contexts.length,0);
  audio.setSettings({sfx:true}); audio.play({type:'move'});
  assert.equal(contexts.length,0);
  assert.equal(await audio.unlock(),true);
  audio.play({type:'move'}); assert.ok(contexts[0].voices.some(v=>v.started));
  audio.dispose();
});

test('music and sfx toggle independently and disposal stops all resources', async t=>{
  const contexts=backend(t,{closeReject:true}); const audio=createAudio();
  audio.setSettings({music:true}); await audio.unlock();
  const context=contexts[0]; const music=[...context.voices]; assert.ok(music.length>0);
  audio.play({type:'victory'}); assert.equal(context.voices.length,music.length);
  audio.setSettings({sfx:true}); audio.play({type:'bond'});
  assert.ok(context.voices.length>music.length);
  audio.setSettings({music:false}); assert.ok(music.every(v=>v.stopped));
  const count=context.voices.length; audio.play({type:'burn'}); assert.ok(context.voices.length>count);
  audio.setSettings({sfx:false}); const mutedCount=context.voices.length;
  audio.play({type:'move'}); assert.equal(context.voices.length,mutedCount);
  audio.dispose(); audio.dispose(); await audio.unlock(); audio.setSettings({music:true});
  assert.equal(context.state,'closed'); assert.ok(context.voices.every(v=>v.stopped));
  assert.equal(contexts.length,1);
});

test('rejected and subsequently suspended contexts never resume from play or settings', async t=>{
  const contexts=backend(t,{reject:true}); const audio=createAudio();
  audio.setSettings({music:true,sfx:true}); assert.equal(await audio.unlock(),false);
  const context=contexts[0]; audio.play({type:'move'}); audio.setSettings({music:true});
  assert.equal(context.resumes,1); assert.equal(context.voices.length,0);
  audio.dispose();
});

test('unavailable audio is a safe no-op', async t=>{
  const original=globalThis.AudioContext; globalThis.AudioContext=undefined;
  t.after(()=>{globalThis.AudioContext=original;});
  const audio=createAudio(); audio.setSettings({music:true,sfx:true});
  assert.equal(await audio.unlock(),false);
  assert.doesNotThrow(()=>{audio.play({type:'move'});audio.dispose();});
});

test('suspension after playback requires another gesture and unknown events stay silent', async t=>{
  const contexts=backend(t); const audio=createAudio(); audio.setSettings({sfx:true}); await audio.unlock();
  const context=contexts[0]; context.state='suspended';
  audio.play({type:'move'}); audio.setSettings({music:true});
  assert.equal(context.resumes,1); assert.equal(context.voices.length,0);
  await audio.unlock(); assert.equal(context.resumes,2);
  const count=context.voices.length;
  assert.doesNotThrow(()=>audio.play({type:'__proto__'}));
  assert.equal(context.voices.length,count); audio.dispose();
});

test('node allocation failures cannot escape into battle playback', async t=>{
  const contexts=backend(t); const audio=createAudio(); audio.setSettings({sfx:true}); await audio.unlock();
  contexts[0].createGain=()=>{throw Error('device lost');};
  assert.doesNotThrow(()=>audio.play({type:'victory'}));
  assert.ok(contexts[0].voices.every(v=>v.disconnected)); audio.dispose();
});
