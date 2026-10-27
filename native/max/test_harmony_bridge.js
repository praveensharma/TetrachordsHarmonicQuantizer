'use strict';
const assert = require('assert'), fs = require('fs'), vm = require('vm');
const shared = {}, sent = [];
const ctx = vm.createContext({
    Global:function(){return shared;}, Task:function(){this.cancel=this.repeat=function(){};},
    outlet:(...v)=>sent.push(v), arrayfromargs:args=>Array.from(args)
});
vm.runInContext(fs.readFileSync(__dirname+'/native_harmony_bridge.js','utf8'),ctx);
Object.assign(shared,{activeValidVersion:1,root:0,validNoteSource:'midi',
    activeValidPitchClasses:[0,4,7],activeValidMidiNotes:[60,64,67,72],
    chordVersion:1,chordRoot:0,activeChordNotes:[48,52,55]});
ctx.bridge_loadbang();
let commands=sent.filter(x=>x[0]===0).map(x=>Array.from(x[1]));
assert.deepStrictEqual(commands,[['field',1,0,1,145,4,60,64,67,72],['chord',1,0,48,52,55]]);
sent.length=0; ctx.snapshot(); assert.strictEqual(sent.length,0);
ctx.harmony(10,1,1,3,5); assert.strictEqual(sent.length,0); // never override selected MIDI field
ctx.validnotes(2,1,'midi',1,3); commands=sent.filter(x=>x[0]===0).map(x=>Array.from(x[1]));
assert.deepStrictEqual(commands,[['field',2,1,1,10,0]]); // stale raw snapshot not attached
sent.length=0; shared.activeValidVersion=3; shared.activeValidPitchClasses=[];shared.activeValidMidiNotes=[];
ctx.snapshot(); assert.strictEqual(sent[0][1][4],0); // explicit empty field is meaningful
ctx.bridge_deleted();
console.log('Native control bridge: MIDI source selection, raw octave preservation, empty fields, bus updates and snapshot dedup passed.');
