// Production JS adapter tests. Legacy musical tests use tests/reference only.
const assert=require('assert'),fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'), commands=[], readouts=[], calls=[], shared={};
let now=1000, observerCallback;
const saved={quantizer_mode:[4],chord_map:1,harmony_change:0,root_gravity:2,continuity:75,
    register_mode:1,register_low:30,register_high:90,input_behavior:1,input_stability:12,
    same_pitch:1,ensemble_group:2,ensemble_part:3,ensemble_separation:50};
const c=vm.createContext({
    Global:function(n){return shared[n]||(shared[n]={});},
    Task:function(){this.repeat=this.cancel=function(){};},
    LiveAPI:function(cb){observerCallback=cb;},
    Date:class extends Date{constructor(){super(now);}},
    arrayfromargs:a=>Array.from(a),inlet:0,
    outlet(i,...a){(i===0?commands:readouts).push(a);},
    patcher:{getnamed(n){return n in saved?{getvalueof:()=>saved[n]}:{message:(...v)=>calls.push([n,...v])};}}
});
c.include=file=>vm.runInContext(fs.readFileSync(path.join(root,'native/max',file),'utf8'),c);
vm.runInContext(fs.readFileSync(path.join(root,'Harmonic_Quantizer/harmonic_quantizer.js'),'utf8'),c);
c.loadbang();
for(const pair of [['mode',7],['chordmap',1],['timing',0],['gravity',2],['continuity',75],
 ['registermode',1],['low',30],['high',90],['inputbehavior',1],['stability',12],['samepitch',1],
 ['ensemble',2],['part',3],['separation',50]])assert(commands.some(x=>JSON.stringify(x)===JSON.stringify(pair)),JSON.stringify(pair));
assert.equal(c.inlets,2);assert.equal(c.outlets,3);
for(const [label,id] of [['scale-nearest',0],['chord-nearest',1],['chord-map',2],['scale-map',3],
 ['scale-up',4],['scale-down',5],['scale-contour',6],['stateful-nearest',7]]){
 c.mode(label);assert.deepStrictEqual(commands.pop(),['mode',id]);
}
Object.assign(shared.tetrachords_harmony_v1,{activeValidVersion:1,root:0,validNoteSource:'midi',
 activeValidPitchClasses:[0,4,7],activeValidMidiNotes:[60,64,67,72],chordVersion:1,chordRoot:0,activeChordNotes:[48,52,55]});
c.poll();assert(commands.some(x=>x[0][0]==='field'&&x[0][5]===4));
commands.length=0;c.harmony(9,1,1,3,5);assert.equal(commands.length,0);
shared.tetrachords_motion_v1.snapshot=JSON.stringify({one:{group:2,seen:now,biases:[0,0,20,0],spread:50}});
c.updateMotion();assert.deepStrictEqual(commands.pop(),['motion',40]);
now+=2100;c.updateMotion();assert.deepStrictEqual(commands.pop(),['motion',0]);
commands.length=0;observerCallback(['is_playing',1]);observerCallback(['is_playing',0]);
assert.deepStrictEqual(commands,[['panic']]);
c.nativestate(145,1,1,0);c.nativeevent(61,60,1,-1,1,0,0,0);
assert(calls.some(x=>x[1]==='event'));assert(readouts.some(x=>String(x).includes('MIDI Note Field')));
c.nativeensemble(2,60,0,62,0,64,1,-1,0);assert(readouts.some(x=>String(x).includes('CONFLICT')));
commands.length=0;c.msg_int(144);assert.equal(commands.length,0,'JS must never forward MIDI bytes');
// Old embedded Set graph gets only this device's MIDI path rewired once.
const input={maxclass:'midiin'},output={maxclass:'midiout'},device={maxclass:'live.thisdevice'},box={maxclass:'js'};
input.nextobject=output;output.nextobject=device;device.nextobject=box;
const graph=[];
c.box=box;c.patcher.firstobject=input;
c.patcher.connect=(...v)=>graph.push(['connect',...v]);c.patcher.disconnect=(...v)=>graph.push(['disconnect',...v]);
c.patcher.newdefault=(x,y,name)=>{const o={maxclass:name};let tail=input;while(tail.nextobject)tail=tail.nextobject;tail.nextobject=o;return o;};
assert(c.ensure_native_graph());assert.equal(graph.filter(x=>x[0]==='disconnect').length,2);
const count=graph.length;assert(c.ensure_native_graph());assert.equal(graph.length,count);
const patch=JSON.parse(fs.readFileSync(path.join(root,'Harmonic_Quantizer/Harmonic Quantizer.maxpat'))).patcher;
const has=(a,b)=>patch.lines.some(x=>x.patchline.source[0]===a&&x.patchline.destination[0]===b);
assert(has('obj-midiin','obj-native')&&has('obj-native','obj-midiout'));
assert(!has('obj-midiin','obj-js')&&!has('obj-js','obj-midiout'));
for(const name of Object.keys(saved))assert(patch.boxes.some(x=>x.box.varname===name));
c.notifydeleted();
console.log('Native production adapter: all parameter restore/mode mappings, source/raw fields, Motion expiry, transport stop, monitors, legacy graph upgrade and direct MIDI graph passed.');
