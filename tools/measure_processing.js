// Repeatable CPU/intentional-delay experiment. This is NOT a Live/audio benchmark.
// Optional source argument allows the exact same harness to compare old/new code.
const fs=require('fs'),vm=require('vm'),path=require('path'),assert=require('assert');
const {performance}=require('perf_hooks');
const source=fs.readFileSync(process.argv[2]||path.join(__dirname,'../Harmonic_Quantizer/harmonic_quantizer.js'),'utf8');
function run(hold,separation,iterations=1000){
 let now=0,opens=0,ui=0,lastOutput=0,totalOutputs=0,callbacks=0;const timers=new Set(),globals={};
 function Task(fn,owner){this.fn=fn;this.owner=owner;this.schedule=ms=>{this.due=now+ms;timers.add(this);};this.cancel=()=>timers.delete(this);this.repeat=()=>{};}
 // Max File facade counts synchronous opens but deliberately does not simulate
 // filesystem speed. CPU measurements therefore exclude actual Max/disk costs.
 function File(){opens++;this.isopen=true;this.eof=0;this.writeline=()=>{};this.close=()=>{};}
 const c=vm.createContext({Math,File,Task,Date:class extends Date{constructor(){super(now);}},
  Global:function(n){return globals[n]||(globals[n]={});},arrayfromargs:a=>Array.from(a),messnamed(){},
  outlet(i,b){if(i===0 && (b&240)===144){lastOutput=now;totalOutputs++;}else if(i!==0){ui++;}},
  patcher:{getnamed(){return null;}}});
 vm.runInContext(source,c);c.init();c.mode('nearest');c.registermode('free');c.timing('immediate');
 c.apply_valid_notes([1,0,'midi',0,2,4,5,7,9,11]);c.ensemble(1);c.separation(separation);
 if(hold){c.inputbehavior('hold');c.stability(hold);}
 function advance(ms){const end=now+ms;for(let i=0;i<10000;i++){
  const t=[...timers].filter(t=>t.due<=end).sort((a,b)=>a.due-b.due)[0];if(!t){now=end;return;}
  now=t.due;timers.delete(t);callbacks++;t.fn.call(t.owner);
 }throw Error('Timer did not settle');}
 const samples=[],delays=[];opens=0;ui=0;
 for(let i=0;i<iterations;i++){
  const n=48+i%24,start=now,wall=performance.now();c.handle_note_on(1,n,100);advance(hold+4);
  samples.push(performance.now()-wall);delays.push(lastOutput-start);c.handle_note_off(1,n,0);advance(4);
 }
 assert.equal(totalOutputs,iterations);
 samples.sort((a,b)=>a-b);delays.sort((a,b)=>a-b);
 return {mode:hold?'Hold Last Pitch':'Follow Gate',settleMs:hold,separationPercent:separation,notes:iterations,
  scheduledDelayMs:{median:delays[Math.floor(iterations*.5)],max:delays.at(-1)},
  nodeHarnessCpuMs:{median:+samples[Math.floor(iterations*.5)].toFixed(4),p95:+samples[Math.floor(iterations*.95)].toFixed(4)},
  synchronousFileOpens:opens,statusOutlets:ui,schedulerCallbacks:callbacks};
}
console.log(JSON.stringify({warning:'Node VM with simulated scheduler and counted/stubbed File/UI. Not Ableton, Max, audio-buffer or hardware latency.',source:process.argv[2]||'current',results:[run(0,0),run(0,50),run(20,0),run(20,50)]},null,2));
