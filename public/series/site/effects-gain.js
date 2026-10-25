// HTML volume stops at 100%. Effect gains use Web Audio with peak control,
// so an editor's 200% / 300% settings actually amplify the chosen instrument.
export class EffectsGain {
 constructor(){this.context=null;this.nodes=new Map()}
 activate(){
  if(!this.context){const Context=window.AudioContext||window.webkitAudioContext;if(!Context)return;
   this.context=new Context();const c=this.context,compressor=c.createDynamicsCompressor();compressor.threshold.value=-5;compressor.knee.value=5;compressor.ratio.value=12;compressor.attack.value=.003;compressor.release.value=.15;
   const limiter=c.createWaveShaper(),curve=new Float32Array(8193);for(let i=0;i<curve.length;i++){const x=i/(curve.length-1)*2-1,y=x*4;curve[i]=y/Math.pow(1+Math.pow(y,4),.25)}limiter.curve=curve;limiter.oversample='4x';
   // Scale into the wide soft-clip curve; unity input remains unity until peaks.
   const headroom=c.createGain();headroom.gain.value=.25;compressor.connect(headroom);headroom.connect(limiter);limiter.connect(c.destination);this.input=compressor;
  }
  if(this.context.state==='suspended')this.context.resume().catch(()=>{});
 }
 set(track,value){
  const c=this.context;if(!c){track.volume=Math.max(0,Math.min(1,value));return;}
  let entry=this.nodes.get(track);if(!entry){const gain=c.createGain(),source=c.createMediaElementSource(track);source.connect(gain);gain.connect(this.input);entry={gain,source};this.nodes.set(track,entry)}
  track.volume=1;entry.gain.gain.setTargetAtTime(Math.max(0,value),c.currentTime,.012);
 }
}
