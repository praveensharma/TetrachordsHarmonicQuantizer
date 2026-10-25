// Stateful protocol regressions, including the actual 2026-10-23 capture.
const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
function harness(shared={}){
 let time=1000;const tasks=new Set(),bus=[],outputs=[],writes=[];
 const live={root_note:0,scale_name:'Major',scale_mode:0,scale_intervals:[0,2,4,5,7,9,11]};
 function Task(fn,owner){this.fn=fn;this.owner=owner;this.schedule=ms=>{this.due=time+ms;tasks.add(this);};this.cancel=()=>tasks.delete(this);this.repeat=()=>this.schedule(this.interval);}
 const c=vm.createContext({console,Date:class extends Date{constructor(){super(time);}},Task,
 Global:function(n){return shared[n]||(shared[n]={});},arrayfromargs:a=>Array.from(a),
 outlet:(...a)=>outputs.push(a),messnamed:(...a)=>bus.push(a),inlet:0,
 LiveAPI:function(){this.get=n=>live[n];this.set=(n,v)=>{writes.push([n,v]);live[n]=v;
 if(n==='scale_name'){const d=c.TETRACHORDS_LIVE_SCALE_DEFINITIONS.find(x=>x.name===v);if(d)live.scale_intervals=Array.from(d.intervals);}};}});
 for(const f of ['Tetrachords_Harmony_Receiver/live_scale_matcher.js','Tetrachords_Harmony_Receiver/live_scale_bridge.js','Plinky_Harmony_Receiver/plinky_harmony_receiver.js'])
 vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),c);
 function advance(ms){const target=time+ms;for(let i=0;i<10000;i++){
   const due=[...tasks].filter(t=>t.due<=target).sort((a,b)=>a.due-b.due)[0];
   if(!due){time=target;return;}time=due.due;tasks.delete(due);due.fn.call(due.owner);
 }throw Error('timer loop');}
 function cc(k,v,ch=1){[0xb0+ch-1,k,v].forEach(b=>c.msg_int(b));}
 function param(p,ch=1){cc(99,33,ch);cc(98,p,ch);}
 function mask(p,m,ch=1,reverse=false){param(p,ch);for(const [k,v]of(reverse?[[6,m>>7],[38,m&127]]:[[38,m&127],[6,m>>7]]))cc(k,v,ch);}
 function start(n,ch=1){param(78,ch);cc(6,n,ch);}
 function packet(n=60,cm=0x91,sm=0xab5,ch=1){start(n,ch);mask(79,cm,ch);mask(80,sm,ch);}
 return {c,shared,bus,outputs,writes,live,advance,cc,param,mask,start,packet};
}
let h=harness(),r=h.c,s=h.shared.tetrachords_harmony_v1;
// Initial state must be complete; monitoring counts input without publishing.
h.start(60);h.mask(79,0x91);h.advance(12);assert.equal(r.latest,null);
h.mask(80,0xab5);h.advance(11);assert.equal(r.latest,null);h.advance(1);
assert.equal(r.latest.root,60);assert.equal(s.activeValidVersion,undefined);
r.active(1);assert.equal(s.activeValidVersion,1);assert.equal(s.activeChordNotes.join(','),'60,64,67');
assert.equal(s.activeValidPitchClasses.join(','),'0,2,4,5,7,9,11');
assert.equal(h.bus.length,2);
// Warm script reloads must not wait forever for unchanged masks to resend.
const warm=harness(h.shared);warm.c.init();warm.c.active(1);warm.start(65);warm.advance(12);
assert.equal(h.shared.tetrachords_harmony_v1.root,5);
// Resume the original publisher explicitly after the deliberate takeover.
r.active(1);
// Actual capture: root 65 and scale AD5, unchanged chord mask NOT retransmitted.
h.start(65);h.mask(80,0xad5);h.advance(11);assert.equal(s.root,0);h.advance(1);
assert.equal(s.root,5);assert.equal(s.plinkyChordMask,0x91);
assert.equal(s.activeChordNotes.join(','),'65,69,72');
assert.equal(s.activeValidPitchClasses.join(','),'0,2,4,5,7,9,11');
// Same scale pitches can still require new root/chord metadata.
h.start(60);h.mask(80,0xab5);h.advance(12);assert.equal(s.root,0);
h.start(62);h.mask(80,0x6b5);h.advance(12);assert.equal(s.root,2);assert.equal(s.plinkyScaleMask,0x6b5);
// Root-only, scale-only and chord-only updates all preserve the other fields.
h.start(67);h.advance(12);assert.equal(s.root,7);assert.equal(s.plinkyScaleMask,0x6b5);
h.mask(79,0x89,1,true);h.advance(12);assert.equal(s.activeChordPitchClasses.join(','),'2,7,10');
h.mask(80,0xab5);h.advance(12);assert.equal(s.plinkyChordMask,0x89);
// A root followed shortly by masks publishes once, with no intermediate scale.
let version=s.activeValidVersion;h.start(63);h.advance(5);h.mask(79,0x91);h.advance(5);h.mask(80,0xab5);
h.advance(11);assert.equal(s.activeValidVersion,version);h.advance(1);assert.equal(s.activeValidVersion,version+1);
// Duplicate fields update diagnostics, not harmonic version or Live state.
version=s.activeValidVersion;h.packet(63);h.advance(12);assert.equal(s.activeValidVersion,version);
// Incomplete 14-bit data blocks the whole candidate (including a new root).
h.start(66);h.param(80);h.cc(38,53);h.advance(201);assert.equal(s.root,3);assert(r.rejected>0);
h.start(64);h.mask(80,4096);h.advance(12);assert.equal(s.root,3);
h.start(64);h.mask(80,0);h.advance(12);assert.equal(s.root,3);
// After a rejection, use last committed masks, never an invalid pending root.
h.mask(79,0x89);h.advance(12);assert.equal(s.root,3);
// A second channel needs its OWN complete starting state.
version=s.activeValidVersion;h.start(65,2);h.mask(80,0xab5,2);h.advance(12);assert.equal(s.activeValidVersion,version);
h.mask(79,0x91,2);h.advance(12);assert.equal(s.root,5);
// Notes, releases, realtime, SysEx and unrelated parameters are ignored.
version=s.activeValidVersion;
[0x90,48,100,0xf8,0x80,48,0,0xf0,99,33,0xf7].forEach(b=>r.msg_int(b));
h.param(22);h.cc(6,99);h.advance(12);assert.equal(s.activeValidVersion,version);
// A fresh parser supports the developer's exact running-status byte sequence.
const fresh=harness();fresh.c.active(1);
[0xb0,99,33,98,78,6,60,99,33,98,79,38,17,6,1,99,33,98,80,38,53,6,21].forEach(b=>fresh.c.msg_int(b));
fresh.advance(12);assert.equal(fresh.shared.tetrachords_harmony_v1.root,0);
// Conflicts fail closed, including Live writes. Explicit re-enable recovers.
s.activeValidVersion++;r.tick();assert(r.blocked);version=s.activeValidVersion;
h.packet(62);h.advance(12);assert.equal(s.activeValidVersion,version);
r.active(0);h.packet(65);h.advance(12);assert.equal(s.activeValidVersion,version);
r.active(1);assert.equal(s.root,5);assert.equal(s.activeValidVersion,version+1);
// Actual quantizer consumes chord and scale state, and late joiners read Globals.
vm.runInContext(fs.readFileSync(path.join(root,'Harmonic_Quantizer/harmonic_quantizer.js'),'utf8'),r);
r.sync_from_global(true);r.registerMode='free';
for(const mode of ['nearest','harmonizer','chordnearest']){
 r.quantizerMode=mode;const legal=mode==='nearest'?s.activeValidPitchClasses:s.activeChordPitchClasses;
 for(let n=36;n<84;n++)assert(legal.includes(r.quantize_note(n,1,100)%12));
}
assert.equal(r.source_description(),'Plinky Chords');
// Live Sync is opt-in and reads back exact/approximate scales; Off makes no writes.
h=harness();r=h.c;s=h.shared.tetrachords_harmony_v1;r.init();r.active(1);h.packet();h.advance(60);
assert.equal(h.writes.length,0);const exactSet=s.activeValidPitchClasses.join(',');
r.livescalesync(1);h.advance(30);assert.equal(h.live.scale_mode,1);assert.equal(s.plinkyLiveScaleMatch.matchType,'exact');
assert(s.plinkyLiveScaleResult.verified);assert.equal(s.activeValidPitchClasses.join(','),exactSet);
// Live observer callbacks cannot publish harmony. Manual edits persist until next change.
version=s.activeValidVersion;h.live.root_note=8;h.advance(300);assert.equal(h.live.root_note,8);assert.equal(s.activeValidVersion,version);
h.start(62);h.advance(42);assert.equal(h.live.root_note,2);
h.mask(80,0xabd);h.advance(42);assert.equal(s.plinkyLiveScaleMatch.matchType,'approximate');
assert.equal(s.activeValidPitchClasses.length,8);
r.livescalesync(0);const writes=h.writes.length;h.start(65);h.advance(100);assert.equal(h.writes.length,writes);
// No Live API must never prevent ordinary harmony publication.
h=harness();r=h.c;vm.runInContext('LiveAPI=undefined',r);r.init();r.livescalesync(1);r.active(1);h.packet();h.advance(50);
assert.equal(h.shared.tetrachords_harmony_v1.root,0);
assert(r.liveText.indexOf('unavailable')>=0);
const p=JSON.parse(fs.readFileSync(path.join(root,'Plinky_Harmony_Receiver/Plinky Harmony Receiver.maxpat'))).patcher;
const boxes=Object.fromEntries(p.boxes.map(e=>[e.box.id,e.box]));
for(const name of ['publish','live_scale_sync'])assert(boxes[name].parameter_enable);
assert(!p.boxes.some(e=>e.box.text==='midiout'));
for(const {box:b}of p.boxes)if(b.presentation){let[x,y,w,z]=b.presentation_rect;assert(x>=0&&y>=0&&x+w<=p.devicewidth&&y+z<=169);}
for(const {patchline:l}of p.lines){assert(boxes[l.source[0]]&&boxes[l.destination[0]]);assert(l.source[1]<boxes[l.source[0]].numoutlets);}
console.log('Plinky: recorded partial updates, atomic patches, malformed data, channels, source conflicts, quantization, Live sync, failure isolation and UI passed.');
