const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..'),globals={},timers=new Set();let now=0,receiver=null;
function advance(ms){now+=ms;for(let count=0;count<1000;count++){const due=[...timers].find(t=>t.due<=now);if(!due)return;timers.delete(due);due.fn.call(due.owner);}throw Error('Timer loop');}
function context(file,controls={}){
 function Global(n){return globals[n]||(globals[n]={});}
 function Task(fn,owner){this.fn=fn;this.owner=owner;this.schedule=ms=>{this.due=now+ms;timers.add(this);};this.cancel=()=>timers.delete(this);}
 const output=[],c=vm.createContext({Global,Task,Date:class extends Date{constructor(){super(now);}},
  LiveAPI:function(){this.set=()=>{};},arrayfromargs:a=>Array.from(a),outlet:(...args)=>output.push(args),
  messnamed(bus,selector,payload){if(bus==='tetrachords_note_field_v1'&&receiver)receiver.fieldpacket(payload);},
  patcher:{getnamed:n=>n in controls?{getvalueof:()=>controls[n]}:null}});
 vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),c);return c;
}
const input=context('Note_Field_Input/note_field_input.js');
function burst(notes){notes.forEach(n=>[144,n,100,128,n,0].forEach(b=>input.msg_int(b)));}
// Collector may load first. It must not create or overwrite harmonic state.
burst([48,50,52,53,55,57,59,60]);advance(25);
assert(!globals.tetrachords_harmony_v1);
receiver=context('Tetrachords_Harmony_Receiver/tetrachords_harmony_receiver.js',
 {valid_note_channel:17,valid_note_source:1,chord_channel:1,chord_hold:0});receiver.init();
assert.equal(receiver.validMidiNotes.join(','),'48,50,52,53,55,57,59,60');
receiver.handle_sysex([240,119,1,64,1,0,2,4,5,7,9,11,12,60,0,0,247]);
[60,64,67].forEach(n=>[144,n,100,128,n,0].forEach(b=>receiver.msg_int(b)));advance(8);
const chord=globals.tetrachords_harmony_v1.activeChordNotes.join(',');assert.equal(chord,'60,64,67');
const version=receiver.validMidiVersion;
burst([49]);advance(24);assert.equal(receiver.validMidiVersion,version);advance(1);
assert.equal(receiver.validMidiNotes.join(','),'49');assert.equal(globals.tetrachords_harmony_v1.activeChordNotes.join(','),chord);
// Duplicate packets, invalid notes, Note Offs and real-time bytes cannot replace the field.
receiver.fieldpacket(globals.tetrachords_field_transport_v1.snapshot);assert.equal(receiver.validMidiVersion,version+1);
receiver.fieldpacket(JSON.stringify({v:1,id:'bad',notes:[200]}));assert.equal(receiver.validMidiNotes.join(','),'49');
[248,128,49,0,144,49,0].forEach(b=>input.msg_int(b));advance(25);assert.equal(receiver.validMidiVersion,version+1);
// SysEx on the field lane is ignored, not interpreted as a chord or extra notes.
[240,1,2,3,247].forEach(b=>input.msg_int(b));advance(25);assert.equal(receiver.validMidiVersion,version+1);
// Turning the helper off cancels pending candidates but retains the last committed field.
burst([51]);input.active(0);advance(25);assert.equal(receiver.validMidiNotes.join(','),'49');input.active(1);
// Same pitch class in different octaves remains intact; running status works.
[144,48,100,60,100].forEach(b=>input.msg_int(b));advance(25);assert.equal(receiver.validMidiNotes.join(','),'48,60');
receiver.validnotechannel(0);burst([55]);advance(25);assert.equal(receiver.validMidiNotes.join(','),'48,60');
receiver.validnotechannel(17);assert.equal(receiver.validMidiNotes.join(','),'55');
receiver.validsource('sysex');assert.equal(globals.tetrachords_harmony_v1.validNoteSource,'sysex');
receiver.validsource('midi');assert.equal(globals.tetrachords_harmony_v1.activeValidMidiNotes.join(','),'55');
console.log('Two-track input: channel-1 internal streams stay distinct, atomic bursts, chord/SysEx preservation, mailbox restore and source switching passed.');
for(const file of ['Note_Field_Input/Tetrachords Note Field Input.maxpat','Tetrachords_Harmony_Receiver/Tetrachords Harmony Receiver.maxpat']){
 const p=JSON.parse(fs.readFileSync(path.join(root,file),'utf8')).patcher,boxes=Object.fromEntries(p.boxes.map(e=>[e.box.id,e.box]));
 for(const e of p.lines){const a=e.patchline.source,b=e.patchline.destination;assert(boxes[a[0]]&&boxes[b[0]]);if(boxes[a[0]].numoutlets!==undefined)assert(a[1]<boxes[a[0]].numoutlets);if(boxes[b[0]].numinlets!==undefined)assert(b[1]<boxes[b[0]].numinlets);}
 for(const b of Object.values(boxes)){if(b.presentation){const [x,y,w,h]=b.presentation_rect;assert(x>=0&&y>=0&&x+w<=p.devicewidth&&y+h<=169,b.id);}}
}
