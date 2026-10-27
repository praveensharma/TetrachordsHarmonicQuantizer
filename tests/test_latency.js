const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
let now=1000,opens=0,displayCalls=0;const timers=new Set(),shared={};
function Task(fn,owner){this.fn=fn;this.owner=owner;this.schedule=ms=>{this.due=now+ms;timers.add(this);};this.cancel=()=>timers.delete(this);this.repeat=()=>{};}
function File(){opens++;this.isopen=true;this.eof=0;this.writeline=()=>{};this.close=()=>{};}
const midi=[],c=vm.createContext({Task,File,Math,Date:class extends Date{constructor(){super(now);}},
 Global:function(n){return shared[n]||(shared[n]={});},arrayfromargs:a=>Array.from(a),messnamed(){},
 outlet(i,b){if(i===0)midi.push(b);else displayCalls++;},
 patcher:{getnamed(){return null;}}});
vm.runInContext(fs.readFileSync(path.join(__dirname,'../tests/reference/harmonic_quantizer_legacy.js'),'utf8'),c);
c.init();c.mode('nearest');c.registermode('free');c.timing('immediate');c.apply_valid_notes([1,0,'midi',0,2,4,5,7,9,11]);
opens=0;displayCalls=0;c.handle_note_on(1,60,100);
assert.deepStrictEqual(midi,[144,60,100]);assert.equal(opens,0);assert.equal(displayCalls,0);
assert.equal(JSON.parse(c.latencyreport()).maxMs,0);
assert(c.traceQueue.length);c.poll_harmony_global();assert.equal(opens,1);assert(displayCalls>0);
c.handle_note_off(1,60,0);assert.deepStrictEqual(midi.slice(-3),[128,60,0]);
for(let i=0;i<1000;i++){c.runtime_trace('stress');c.visual_note(60,60,1,'stress');}
assert.equal(c.traceQueue.length,256);assert.equal(c.pendingVisualNotes.length,16);
function advance(ms){const end=now+ms;for(let i=0;i<10000;i++){
 const t=[...timers].filter(t=>t.due<=end).sort((a,b)=>a.due-b.due)[0];if(!t){now=end;return;}
 now=t.due;timers.delete(t);t.fn.call(t.owner);
}throw Error('Timer loop');}
c.inputbehavior('hold');c.stability(20);c.handle_note_on(1,62,100);advance(19);
assert.equal(JSON.parse(c.latencyreport()).samples,1);advance(1);
assert.equal(JSON.parse(c.latencyreport()).maxMs,20);
c.ensemble(1);c.separation(50);c.handle_note_on(1,64,100);advance(24);
assert.equal(JSON.parse(c.latencyreport()).maxMs,24);
// Deferred readouts must not alter output mappings or voice-leading state.
assert.equal(c.heldNotes[1].output,64);c.flush_diagnostics();assert.equal(c.heldNotes[1].output,64);
console.log('Latency: immediate Follow Gate, no inline file/UI calls, bounded diagnostics, and accurate 20/24ms hold/ensemble timing passed.');
