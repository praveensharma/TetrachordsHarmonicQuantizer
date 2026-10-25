const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
function studio(){
 let now=0;const shared={},timers=new Set();
 function Global(name){return shared[name]||(shared[name]={});}
 function Task(fn,owner){this.fn=fn;this.owner=owner;this.schedule=ms=>{this.due=now+ms;timers.add(this);};this.cancel=()=>timers.delete(this);this.repeat=()=>{};}
 function context(file,controls={}){
  const out=[],c=vm.createContext({Global,Task,Date:class extends Date{constructor(){super(now);}},Math,
   outlet(i,...v){out.push([i,...v]);},messnamed(){},arrayfromargs:a=>Array.from(a),
   patcher:{getnamed:n=>n in controls?{getvalueof:()=>controls[n]}:null}});
  vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);c.init();return {c,out};
 }
 function quant(part=1,extra={}){
  const d=context('Harmonic_Quantizer/harmonic_quantizer.js',Object.assign({ensemble_group:1,ensemble_part:part,ensemble_separation:0},extra));
  d.c.mode('stateful-nearest');d.c.registermode('free');d.c.timing('immediate');d.c.apply_valid_notes([1,0,'midi',0,2,4,5,7,9,11]);
  d.c.ensemble_refresh();
  d.messages=()=>{const b=d.out.filter(x=>x[0]===0).map(x=>x[1]);assert.equal(b.length%3,0);return Array.from({length:b.length/3},(_,i)=>b.slice(i*3,i*3+3));};
  return d;
 }
 function motion(values={}){return context('Harmonic_Motion/harmonic_motion.js',values);}
 function advance(ms){const end=now+ms;for(let i=0;i<10000;i++){const t=[...timers].filter(t=>t.due<=end).sort((a,b)=>a.due-b.due)[0];if(!t){now=end;return;}now=t.due;timers.delete(t);t.fn.call(t.owner);}throw Error('Timer loop');}
 return {quant,motion,advance,shared};
}
// A later release from either source must not end a replacement prematurely.
for(const releaseOrder of [[61,62],[62,61]]){
 const s=studio(),d=s.quant(1,{same_pitch:1});d.c.mode('scale-nearest');
 d.c.handle_note_on(1,61,90);d.c.handle_note_on(1,62,100);
 assert.deepStrictEqual(d.messages(),[[144,62,90],[128,62,0],[144,62,100]]);
 releaseOrder.forEach(n=>d.c.handle_note_off(1,n,0));
 assert.deepStrictEqual(d.messages().slice(3),[[128,62,0]]);
 assert.equal(Object.keys(d.c.outputNoteRefCounts).length,0);
 assert.equal(Object.keys(d.c.activeNoteMappings).length,0);
}
// Repeated input pitches use FIFO tombstones, and channels remain independent.
{
 const s=studio(),d=s.quant(1,{same_pitch:1});d.c.mode('nearest');
 d.c.handle_note_on(2,60,90);d.c.handle_note_on(1,60,91);d.c.handle_note_on(1,60,92);
 const count=d.messages().length;d.c.handle_note_off(1,60,0);assert.equal(d.messages().length,count);
 d.c.handle_note_off(1,60,0);assert.deepStrictEqual(d.messages().at(-1),[128,60,0]);
 d.c.handle_note_off(2,60,0);assert.deepStrictEqual(d.messages().at(-1),[129,60,0]);
}
// Switching modes with live mappings preserves ownership; panic cleans tombstones.
{
 const s=studio(),d=s.quant();d.c.mode('nearest');d.c.handle_note_on(1,61,90);
 d.c.samepitch('retrigger');d.c.handle_note_on(1,62,90);d.c.samepitch('legato');
 d.c.handle_note_off(1,61,0);assert.equal(d.messages().length,3);
 d.c.panic();assert.equal(Object.keys(d.c.activeNoteMappings).length,0);
}
// Ensemble buffering keeps a 1ms replacement gate and consumes late older offs.
{
 const s=studio(),d=s.quant(1,{same_pitch:1,ensemble_separation:50});d.c.mode('nearest');
 d.c.handle_note_on(1,61,90);s.advance(5);d.c.handle_note_on(1,62,100);s.advance(1);
 d.c.handle_note_off(1,62,0);s.advance(5);d.c.handle_note_off(1,61,0);s.advance(5);
 assert.deepStrictEqual(d.messages(),[[144,62,90],[128,62,0],[144,62,100],[128,62,0]]);
}
// Five persisted controls, continuous weighted macro, no destructive overwrite.
{
 const s=studio(),m=s.motion({motion_bias_3:20.5,spread_motion:75});
 const ds=[1,2,3,4].map(p=>s.quant(p));
 assert.deepStrictEqual(ds.map(d=>d.c.read_motion().effective),[-75,-30,50.5,75]);
 m.c.spreadmotion(-100);assert.deepStrictEqual(ds.map(d=>d.c.read_motion().effective),[100,40,-19.5,-100]);
 m.c.spreadmotion(0);assert.equal(ds[2].c.read_motion().effective,20.5);
 const other=s.quant(1,{ensemble_group:2});assert.equal(other.c.read_motion().effective,0);
 const duplicate=s.motion();assert.match(ds[0].c.read_motion().status,/conflict/);
 duplicate.c.notifydeleted();assert.equal(ds[2].c.read_motion().effective,20.5);
 s.advance(2001);assert.equal(ds[2].c.read_motion().effective,0);
 m.c.publish();assert.equal(ds[2].c.read_motion().effective,20.5);
 m.c.notifydeleted();assert.equal(ds[2].c.read_motion().effective,0);
}
// Opposite tendencies break a symmetric choice; neutral is the old tie behavior.
function choice(bias){
 const s=studio(),m=s.motion({motion_bias_1:bias}),d=s.quant();
 d.c.continuityAmount=60;d.c.voiceState[1]={input:61,output:61,version:1};
 d.c.handle_note_on(1,61,100);return d.messages()[0][1];
}
assert.equal(choice(-100),60);assert.equal(choice(0),62);assert.equal(choice(100),62);
// Stationary remains neutral; strong opposing gesture can overcome full bias.
{
 const s=studio();s.motion({motion_bias_1:100});const d=s.quant();
 d.c.handle_note_on(1,72,90);d.c.handle_note_off(1,72,0);
 d.c.handle_note_on(1,72,90);assert.equal(d.messages().at(-1)[1],72);
 d.c.handle_note_off(1,72,0);d.c.handle_note_on(1,36,90);assert.ok(d.messages().at(-1)[1]<72);
 assert.equal(d.c.direction_cost(d.c.voiceState[1].output,1),0);
 d.c.apply_valid_notes([2,0,'sysex',0,2,4,5,7,9,11]);
 assert.equal(d.c.read_motion().effective,100);
}
// Strict bounds with motion at first note / zero continuity; impossible range is silent.
{
 const s=studio();s.motion({motion_bias_1:100});const d=s.quant();d.c.registermode('limited');d.c.registerLow=60;d.c.registerHigh=72;d.c.continuityAmount=0;
 for(const n of [0,127,72,0,127]){d.c.handle_note_on(1,n,90);const out=d.messages().at(-1)[1];assert.ok(out>=60&&out<=72);d.c.handle_note_off(1,n,0);}
 d.c.registerLow=61;d.c.registerHigh=61;const count=d.messages().length;
 d.c.handle_note_on(1,60,90);d.c.handle_note_off(1,60,0);assert.equal(d.messages().length,count);
}
// Neutral controller and no controller generate identical MIDI for a changing field.
{
 const a=studio(),b=studio();b.motion();const x=a.quant(),y=b.quant();
 for(let i=0;i<150;i++){
  for(const d of [x,y]){if(i%7===0)d.c.apply_valid_notes([i+2,0,'midi',0,3,5,7,8,10]);const n=36+i*7%48;d.c.handle_note_on(1,n,90);d.c.handle_note_off(1,n,0);}
 }
 assert.deepStrictEqual(x.messages(),y.messages());
}
// Macro plus separation remains deterministic across arrival order and preserves the field.
function coordinated(order){
 const s=studio();s.motion({spread_motion:100});
 const ds=[1,2,3,4].map(p=>s.quant(p,{ensemble_separation:60}));
 ds.forEach(d=>{d.c.voiceState[1]={input:61,output:61,version:1};});
 order.forEach(i=>ds[i].c.handle_note_on(1,61,90));s.advance(5);
 const result=ds.map(d=>d.messages()[0][1]);
 ds.forEach(d=>{assert.ok(d.c.legalPitchClasses.includes(d.messages()[0][1]%12));assert.ok(Number.isFinite(d.c.lastVoiceDecision[1].motion.costs.direction));d.c.handle_note_off(1,61,0);});
 s.advance(5);ds.forEach(d=>assert.equal(Object.keys(d.c.outputNoteRefCounts).length,0));return result;
}
assert.deepStrictEqual(coordinated([0,1,2,3]),coordinated([3,2,1,0]));
// Parameter metadata and tab lists must resolve to actual controls in the package.
{
 for(const file of ['Harmonic_Quantizer/Harmonic Quantizer.maxpat','Harmonic_Motion/Harmonic Motion.maxpat']){
  const p=JSON.parse(fs.readFileSync(path.join(root,file))).patcher,bs=p.boxes.map(e=>e.box);
  const ids=new Set(bs.map(b=>b.id));assert.equal(ids.size,bs.length);
  bs.filter(b=>b.presentation).forEach(b=>{const [x,y,w,h]=b.presentation_rect;assert.ok(x>=0&&y>=0&&x+w<=p.devicewidth&&y+h<=169,b.id);});
  const params=bs.filter(b=>b.parameter_enable);
  for(const b of params.filter(b=>b.varname==='same_pitch'||/^motion_bias_|^spread_motion$/.test(b.varname||''))){
   assert.equal(b.saved_attribute_attributes.valueof.parameter_initial_enable,1);assert.ok(p.parameters[b.id]);
  }
  const compact=bs.find(b=>b.id==='monitor-compact');
  if(compact){const cfg=JSON.parse(compact.jsarguments[1]);Object.values(cfg).flat().forEach(n=>assert.ok(bs.some(b=>b.varname===n),n));assert.ok(cfg.input.includes('same_pitch'));}
 }
}
console.log('Motion/retrigger: ownership, channels, mode changes, buffering, macro, conflicts, expiry, neutral regression, bounds, automation metadata and tabs passed.');
