import test from 'node:test';
import assert from 'node:assert/strict';
import { startPlayback } from '../src/playback.js';

test('normal playback completes once and closes stale presentation writes', async () => {
 let active, count=0;
 const task=startPlayback({animate:async isActive=>{active=isActive;assert.equal(isActive(),true);},complete:()=>count++});
 await task.done;task.finish('skip');assert.equal(count,1);assert.equal(active(),false);
});
test('skip settles immediately while a delayed animation cannot settle twice', async () => {
 let release, active, count=0;
 const task=startPlayback({animate:isActive=>{active=isActive;return new Promise(r=>release=r);},complete:reason=>{count++;assert.equal(reason,'skip');}});
 await Promise.resolve();task.finish('skip');await task.done;assert.equal(active(),false);release();await Promise.resolve();assert.equal(count,1);
});
test('presentation failure unlocks and completes the already resolved round', async () => {
 let reason;
 const task=startPlayback({animate:async()=>{throw Error('render failure');},complete:r=>reason=r});
 await task.done;assert.equal(reason,'error');
});
test('timeout completes even when animation never resolves', async () => {
 let timeout, cleared=false, reason;
 const task=startPlayback({animate:()=>new Promise(()=>{}),complete:r=>reason=r,setTimer:callback=>{timeout=callback;return 1;},clearTimer:()=>{cleared=true;}});
 timeout();await task.done;assert.equal(reason,'timeout');assert.equal(cleared,true);task.finish('skip');assert.equal(reason,'timeout');
});
