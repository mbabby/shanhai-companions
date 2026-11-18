// Presentation never owns combat resolution. All exit paths commit the same result once.
export function startPlayback({ animate, complete, timeoutMs = 4000, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let active = true, resolveDone, rejectDone;
  const done = new Promise((resolve, reject) => { resolveDone = resolve; rejectDone = reject; });
  let timer;
  const finish = (reason = 'skip') => {
    if (!active) return;
    active = false;
    clearTimer(timer);
    try { complete(reason); resolveDone(reason); }
    catch (error) { rejectDone(error); }
  };
  timer = setTimer(() => finish('timeout'), timeoutMs);
  Promise.resolve().then(() => active && animate(() => active))
    .then(() => finish('complete'), () => finish('error'));
  return { done, finish };
}
