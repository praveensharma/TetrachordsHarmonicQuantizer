const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
function host(globals={},controls={},failLive=false){
 let now=1000;const timers=new Set(),bus=[],emitted=[];
 function Task(fn,owner){this.fn=fn;this.owner=owner;this.schedule=ms=>{this.due=now+ms;timers.add(this);};this.cancel=()=>timers.delete(this);}
 const c=vm.createContext({console,Task,Date:class extends Date{constructor(){super(now);}},
 Global:function(n){return globals[n]||(globals[n]={});},arrayfromargs:a=>Array.from(a),
 outlet:(...a)=>emitted.push(a),messnamed:(...a)=>bus.push(a),
 LiveAPI:function(){if(failLive)throw Error('Live unavailable');this.get=()=>null;this.set=()=>{};},
 patcher:{getnamed:n=>n in controls?{getvalueof:()=>controls[n]}:null}});
 for(const f of ['live_scale_matcher.js','live_scale_bridge.js','tetrachords_harmony_receiver.js'])
 vm.runInContext(fs.readFileSync(path.join(root,'Tetrachords_Harmony_Receiver',f),'utf8'),c);
 function advance(ms){let end=now+ms;for(let i=0;i<1000;i++){
  let next=[...timers].filter(t=>t.due<=end).sort((a,b)=>a.due-b.due)[0];if(!next){now=end;return;}
  now=next.due;timers.delete(next);next.fn.call(next.owner);
 }throw Error('timer loop');}
 c.init();return {c,globals,bus,emitted,advance};
}
function sysex(c,n=60,intervals=[0,2,4,5,7,9,11,12]){c.list(...[240,119,1,64,1,...intervals,n,0,0,247]);}
function chord(c,notes){notes.forEach(n=>[144,n,100].forEach(b=>c.msg_int(b)));}
// Complete SysEx: a root-only change MUST update an otherwise identical scale.
const h=host(),r=h.c,s=h.globals.tetrachords_harmony_v1;
sysex(r);const v=s.activeValidVersion;sysex(r,62);assert(s.activeValidVersion>v);
assert.equal(s.activeValidPitchClasses.join(','),'1,2,4,6,7,9,11');assert.equal(s.root,2);
// Identical frames do not unnecessarily advance harmonic versions.
const same=s.activeValidVersion;sysex(r,62);assert.equal(s.activeValidVersion,same);
// Chord Note Offs do not erase latched short chords.
chord(r,[62,66,69]);h.advance(8);[62,66,69].forEach(n=>[128,n,0].forEach(b=>r.msg_int(b)));
h.advance(8);assert.equal(s.activeChordNotes.join(','),'62,66,69');
// MIDI fields are authoritative: never reconstruct/transplant their pitches
// from a new SysEx root; wait for and atomically replace the actual new burst.
const m=host({}, {valid_note_source:1,valid_note_channel:17}),c=m.c,t=m.globals.tetrachords_harmony_v1;
sysex(c);c.fieldpacket(JSON.stringify({v:1,id:'one',notes:[48,50,52,53,55,57,59,60]}));
const raw=t.activeValidMidiNotes.join(',');sysex(c,65);
assert.equal(t.root,5);assert.equal(t.activeValidMidiNotes.join(','),raw);
assert.equal(t.activeValidPitchClasses.join(','),'0,2,4,5,7,9,11');
c.fieldpacket(JSON.stringify({v:1,id:'two',notes:[49,53,56]}));
assert.equal(t.activeValidMidiNotes.join(','),'49,53,56');
// Invalid mailbox and SysEx data cannot poison a valid set.
const valid=t.activeValidVersion;
c.fieldpacket(JSON.stringify({v:1,id:'bad',notes:[-1,200]}));
c.handle_sysex([240,119,1,64,1,0,2,4,5,7,9,11,12,200,0,0,247]);
assert.equal(t.activeValidVersion,valid);assert.equal(t.activeValidMidiNotes.join(','),'49,53,56');
// An oversized malformed burst must not publish just its trailing notes.
c.validnotechannel(4);for(let i=0;i<132;i++)[147,i%128,100].forEach(b=>c.msg_int(b));m.advance(25);
assert.equal(t.activeValidMidiNotes.join(','),'49,53,56');
c.validnotechannel(17);
// Truncated/oversized SysEx is bounded and a subsequent frame recovers.
c.msg_int(240);for(let i=0;i<400;i++)c.msg_int(1);assert(c.sysexBuffer.length<=256);c.msg_int(247);
sysex(c,67);assert.equal(t.root,7);
// Reloading receivers must not reuse versions already seen by subscribers.
const prior={valid:t.activeValidVersion,harmony:t.version,chord:t.chordVersion||0};
const reloaded=host(m.globals,{valid_note_source:1,valid_note_channel:17});
assert(t.activeValidVersion>prior.valid);sysex(reloaded.c,62);assert(t.version>prior.harmony);
chord(reloaded.c,[62,65,69]);reloaded.advance(8);assert(t.chordVersion>prior.chord);
// Metadata root changes while gate-following chord notes remain held.
const gate=host({}, {chord_hold:1,chord_channel:1});sysex(gate.c);chord(gate.c,[60,64,67]);gate.advance(8);
const gc=gate.globals.tetrachords_harmony_v1,old=gc.chordVersion;sysex(gate.c,62);gate.advance(8);
assert.equal(gc.chordRoot,2);assert(gc.chordVersion>old);assert.equal(gc.activeChordNotes.join(','),'60,64,67');
// A failing Live API affects only Live Scale Sync, never decoding/publication.
const offline=host({}, {},true);assert.equal(offline.c.ready,true);sysex(offline.c,63);
assert.equal(offline.globals.tetrachords_harmony_v1.root,3);
offline.advance(1100);assert(offline.globals.tetrachords_harmony_v1.tetrachordsDiagnostics);
// If Live becomes ready later, a subsequent update can recover the bridge.
vm.runInContext("LiveAPI=function(callback,path){this.get=function(n){return {root_note:0,scale_name:'Major',scale_mode:1,scale_intervals:[0,2,4,5,7,9,11]}[n];};this.set=function(){};}",offline.c);
offline.advance(1100);sysex(offline.c,65);offline.advance(30);assert(offline.c.liveScaleBridge);
offline.c.notifydeleted();
// Logging rolls over rather than silently stopping after 1000 lines.
let writes=0;offline.c.File=function(){this.isopen=true;this.writeline=()=>writes++;this.close=()=>{};this.eof=0;};
offline.c.traceLineCount=1000;offline.c.runtime_trace('CURRENT');assert.equal(offline.c.traceLineCount,1);assert.equal(writes,2);
console.log('Tetrachords: root changes, exact MIDI fields, replacement, invalid frames, reload versions, held-chord metadata, diagnostics and Live failure isolation passed.');
