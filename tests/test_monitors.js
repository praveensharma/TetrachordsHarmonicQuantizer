const assert=require('assert'),fs=require('fs'),vm=require('vm'),path=require('path');
const root=path.join(__dirname,'..');
function display(view,width,height){
 const calls=[],objects={play:{},detail:{}};
 const mgraphics={size:[width,height]};
 mgraphics.text_measure=s=>[s.length*5,11];
 for(const f of ['init','redraw','set_source_rgba','select_font_face','set_font_size','move_to','text_path','fill','rectangle','set_line_width','line_to','stroke'])mgraphics[f]=(...args)=>{for(const a of args)if(typeof a==='number')assert(Number.isFinite(a));calls.push([f,...args]);};
 const c=vm.createContext({mgraphics,jsarguments:['harmonic_monitor.js',view,JSON.stringify({play:['play'],monitor:['detail']})],
  Global:function(){return {};},Task:function(){this.repeat=()=>{};this.cancel=()=>{};},
  patcher:{getnamed(n){return objects[n]?{message(k,v){objects[n][k]=v;}}:null;}}});
 vm.runInContext(fs.readFileSync(path.join(root,'Harmonic_Quantizer/harmonic_monitor.js'),'utf8'),c);
 c.page(0);assert.equal(objects.play.hidden,0);assert.equal(objects.detail.hidden,1);
 c.page(1);assert.equal(objects.play.hidden,1);assert.equal(objects.detail.hidden,0);
 c.paint();for(let i=0;i<60;i++)c.event(i%128,(i+1)%128,2);
 assert.equal(c.history.length,24);c.paint();
 c.harmony.derivedValidPitchClasses=[0,4,7];c.harmony.midiFieldPitchClasses=[0,3,7];
 c.harmony.derivedValidMidiNotes=[60,64,67];c.harmony.midiFieldNotes=[48,51,55];c.tick();
 assert(c.match().startsWith('Different'));c.paint();
 c.harmony.midiFieldPitchClasses=[0,4,7];c.tick();assert(c.match().startsWith('Same'));
 return c;
}
for(const args of [['compact',720,43],['detail',720,85],['receiver',760,98]])display(...args);
// Visual events must follow final MIDI emission, not candidate scoring.
const emitted=[],visual=[];let fail=false;
const c=vm.createContext({Global:function(){return {};},arrayfromargs:a=>Array.from(a),messnamed(){},
 outlet(...args){emitted.push(args);},patcher:{getnamed(name){return {message(...args){if(fail)throw Error('missing UI');visual.push([name,...args]);}};}}});
vm.runInContext(fs.readFileSync(path.join(root,'Harmonic_Quantizer/harmonic_quantizer.js'),'utf8'),c);
c.activate_harmony(1,0,[0,4,7],'sysex');c.quantizerMode='nearest';c.registerMode='free';
c.process_channel_message(144,61,100);
const event=visual.find(e=>e[1]==='event');assert(event);assert.equal(event[2],61);
assert.equal(event[3],emitted.filter(e=>e[0]===0)[1][1]);
const before=emitted.length;fail=true;c.process_channel_message(128,61,0);assert(emitted.length>before);
fail=false;c.enabled=0;c.process_channel_message(144,65,100);
assert(visual.some(e=>e[1]==='event'&&e[2]===65&&e[3]===65&&e[5]==='Bypassed'));
console.log('Monitors: bounded history, empty/differing sources, page visibility, finite drawing and final-output telemetry passed.');
