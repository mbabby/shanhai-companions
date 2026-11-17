/** Generated, optional audio. Call unlock only from an explicit user gesture. */
export function createAudio() {
  let context=null, disposed=false;
  const settings={sfx:false,music:false};
  const voices=new Set();
  const ambience=new Set();
  const safely=fn=>{try { return fn(); } catch { return undefined; }};
  const stop=voice=>{
    safely(()=>voice.oscillator.stop());
    safely(()=>voice.oscillator.disconnect());
    safely(()=>voice.gain.disconnect());
    voices.delete(voice); ambience.delete(voice);
  };
  function tone(frequency, duration, volume, delay=0, background=false, endFrequency=frequency) {
    // Bounded polyphony keeps rapid clicks quiet and prevents resource accumulation.
    if(voices.size>=20) return;
    let oscillator, gain;
    try {
      oscillator=context.createOscillator(); gain=context.createGain();
      const voice={oscillator,gain}; voices.add(voice);
      if(background) ambience.add(voice);
      oscillator.onended=()=>stop(voice);
      oscillator.type='sine';
      const start=context.currentTime+delay;
      oscillator.frequency.setValueAtTime(frequency,start);
      gain.gain.setValueAtTime(0,start);
      gain.gain.linearRampToValueAtTime(volume,start+(background ? 1.5 : .015));
      if(!background) {
        oscillator.frequency.exponentialRampToValueAtTime(endFrequency,start+duration);
        gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
      }
      oscillator.connect(gain); gain.connect(context.destination);
      oscillator.start(start);
      if(!background) oscillator.stop(start+duration+.03);
    } catch {
      const voice=[...voices].find(v=>v.oscillator===oscillator);
      if(voice) stop(voice);
      else {safely(()=>oscillator?.disconnect());safely(()=>gain?.disconnect());}
    }
  }
  function syncMusic() {
    if(!settings.music) {for(const voice of [...ambience]) stop(voice); return;}
    if(disposed || context?.state!=='running' || ambience.size) return;
    // Quiet open fifth with a soft upper tonic: no samples, network or timers.
    for(const frequency of [130.81,196,261.63]) tone(frequency,0,.012,0,true);
  }
  async function unlock() {
    if(disposed || (!settings.sfx && !settings.music)) return false;
    try {
      const AudioContext=globalThis.AudioContext || globalThis.webkitAudioContext;
      if(!AudioContext) return false;
      if(!context) context=new AudioContext();
      if(context.state!=='running') await context.resume();
      if(disposed || context.state!=='running') return false;
      syncMusic(); return true;
    } catch { return false; }
  }
  function setSettings(next={}) {
    if(disposed) return;
    if(typeof next.sfx==='boolean') settings.sfx=next.sfx;
    if(typeof next.music==='boolean') settings.music=next.music;
    if(!settings.sfx) for(const voice of [...voices]) if(!ambience.has(voice)) stop(voice);
    syncMusic();
  }
  function play(event) {
    if(disposed || !settings.sfx || context?.state!=='running') return;
    const motifs={move:[330,220],burn:[180,100],faint:[160,70],switch:[262,392],replace:[294,440],bond:[392,494,587],victory:[392,494,587,784],defeat:[294,247,196]};
    const notes=motifs[event?.type]; if(!Array.isArray(notes)) return;
    notes.forEach((note,index)=>tone(note,.24,.035,index*.10,false,note*.92));
  }
  function dispose() {
    if(disposed) return; disposed=true;
    for(const voice of [...voices]) stop(voice);
    safely(()=>context?.close()?.catch(()=>{}));
  }
  return {unlock,setSettings,play,dispose};
}
