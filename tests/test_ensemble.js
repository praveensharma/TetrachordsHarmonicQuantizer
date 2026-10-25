"use strict";
const assert = require("assert");
const fs = require("fs");
const vm = require("vm");
const path = require("path");
const source = fs.readFileSync(path.join(__dirname, "../Harmonic_Quantizer/harmonic_quantizer.js"), "utf8");

function studio() {
    const globals = {};
    const timers = new Set();
    let now = 0;
    function advance(ms) {
        const end = now + ms;
        for (let safety = 0; safety < 10000; safety++) {
            const next = [...timers].filter(t => t.due <= end).sort((a,b) => a.due-b.due)[0];
            if (!next) { now = end; return; }
            now = next.due;
            timers.delete(next);
            next.fn.call(next.owner);
        }
        throw new Error("Scheduler did not settle");
    }
    function device(part, group=1, separation=100, controls={}) {
        const midi = [];
        const selectors = {};
        function Global(name) { return globals[name] || (globals[name]={}); }
        function Task(fn, owner) { this.fn=fn; this.owner=owner; }
        Task.prototype.schedule=function(ms) { this.due=now+ms; timers.add(this); };
        Task.prototype.cancel=function() { timers.delete(this); };
        Task.prototype.repeat=function() {};
        const values = Object.assign({ensemble_group:group, ensemble_part:part, ensemble_separation:separation}, controls);
        const c = vm.createContext({Global, Task, Math, Date:class extends Date { constructor() { super(now); } },
            outlet(index,...bytes) { if(index===0) midi.push({time:now,byte:bytes[0]}); },
            arrayfromargs(args) { return Array.from(args); }, messnamed() {},
            patcher:{getnamed(name) {
                if(name==='ensemble_group_selector'||name==='ensemble_part_selector')return {message(cmd,v){assert.equal(cmd,'set');selectors[name]=v;}};
                return name in values ? {getvalueof() { return values[name]; }} : null;
            }}
        });
        vm.runInContext(source,c);
        c.init(); c.mode("nearest"); c.registermode("free"); c.timing("immediate");
        c.apply_valid_notes([1,0,"midi",0,2,4,5,7,9,11]);
        c.ensemble_refresh();
        return {c,midi,selectors,notes:()=>midi.filter((_,i)=>i%3===1).map(x=>x.byte)};
    }
    return {device,advance,globals};
}

function simultaneous(order) {
    const s=studio(); const parts=[1,2,3,4].map(p=>s.device(p));
    order.forEach(i=>parts[i].c.handle_note_on(9,60,100));
    s.advance(4);
    const notes=parts.map(p=>p.notes()[0]);
    assert.equal(new Set(notes).size,4);
    parts.forEach(p=>assert.equal(p.midi[0].byte,0x98));
    assert.ok(parts[0].c.ensembleMonitorText.includes("Voice D:"));
    assert.equal(parts[3].selectors.ensemble_part_selector,3);
    assert.equal(parts[3].selectors.ensemble_group_selector,1);
    return notes;
}
assert.deepStrictEqual(simultaneous([0,1,2,3]),simultaneous([3,2,1,0]));

// Separation 0 is an exact pitch A/B; Off has no ensemble scheduling delay.
{
    const s=studio(), a=s.device(1,1,0), b=s.device(2,1,0), off=s.device(1,0,100);
    [a,b,off].forEach(p=>p.c.handle_note_on(1,61,90));
    assert.deepStrictEqual(off.notes(),[62]); assert.equal(off.midi[0].time,0);
    a.c.handle_note_off(1,61,0);assert.equal(a.midi[3].time,0);
    s.advance(4); assert.deepStrictEqual(a.notes(),[62,62]); assert.deepStrictEqual(b.notes(),[62]);
}
// A 1 ms source gate stays 1 ms long after buffering. Note Off releases the
// exact selected output and does not clear the part's assigned CV pitch.
{
    const s=studio(), a=s.device(1), b=s.device(2);
    a.c.handle_note_on(1,60,100); b.c.handle_note_on(2,60,100);
    s.advance(1); b.c.handle_note_off(2,60,0);
    s.advance(8);
    assert.deepStrictEqual(b.notes(),[59,59]);
    assert.equal(b.midi[3].time-b.midi[0].time,1);
    const state=JSON.parse(s.globals.tetrachords_ensemble_v1.snapshot);
    assert.equal(state[1].members[b.c.traceInstance].note,59);
    assert.equal(b.c.voiceState[2].output,59);
}
// Groups isolate; duplicate Part IDs are visible and do not compete.
{
    const s=studio(), a=s.device(1), b=s.device(1), c=s.device(2,2);
    [a,b,c].forEach(p=>p.c.handle_note_on(1,60,100)); s.advance(4);
    [a,b,c].forEach(p=>assert.deepStrictEqual(p.notes(),[60]));
    assert.ok(a.c.ensembleMonitorText.includes("CONFLICT"));
}
// Manual group reset clears all voices but retains held-note release mappings.
{
    const s=studio(), a=s.device(1), b=s.device(2);
    [a,b].forEach(p=>p.c.handle_note_on(1,60,100)); s.advance(4);
    a.c.resetensemble(); b.c.ensemble_refresh();
    assert.deepStrictEqual(Object.keys(a.c.voiceState),[]);
    assert.deepStrictEqual(Object.keys(b.c.voiceState),[]);
    b.c.handle_note_off(1,60,0); s.advance(4); assert.deepStrictEqual(b.notes(),[59,59]);
    [b,a].forEach(p=>p.c.handle_note_on(1,60,100)); s.advance(4);
    // The second coordinated cycle rotates first choice from Voice A to B.
    assert.deepStrictEqual(b.notes(),[59,59,60]);
}
// Register safety and a one-note allowed set never produce an illegal escape.
{
    const s=studio(), a=s.device(1), b=s.device(2);
    [a,b].forEach(p=>{p.c.apply_valid_notes([2,0,"midi",0]);p.c.registermode("limited");p.c.low(60);p.c.high(60);p.c.handle_note_on(1,100,100);});
    s.advance(4); [a,b].forEach(p=>assert.deepStrictEqual(p.notes(),[60]));
}
// Panic discards unsent notes and releases membership; unloading removes a
// sustained assignment without waiting for a new Note On in another part.
{
    const s=studio(), a=s.device(1), b=s.device(2);
    a.c.handle_note_on(1,60,100); a.c.panic(); s.advance(5);
    assert.ok(!a.midi.some(x=>x.byte===0x90));
    b.c.handle_note_on(1,60,100); s.advance(4); assert.deepStrictEqual(b.notes(),[60]);
    b.c.notifydeleted();
    assert.ok(!JSON.parse(s.globals.tetrachords_ensemble_v1.snapshot)[1].members[b.c.traceInstance]);
}
// Dense notes preserve ordering and short durations through the same delay.
{
    const s=studio(), a=s.device(1);
    a.c.handle_note_on(1,60,100); s.advance(1); a.c.handle_note_off(1,60,0);
    s.advance(1); a.c.handle_note_on(1,64,100); s.advance(1); a.c.handle_note_off(1,64,0);
    s.advance(10);
    assert.deepStrictEqual(a.notes(),[60,60,64,64]);
    assert.deepStrictEqual(a.midi.filter((_,i)=>i%3===0).map(x=>x.time),[4,5,6,7]);
    assert.deepStrictEqual(Object.keys(a.c.activeNoteMappings),[]);
}
// A reset during collection cannot repopulate memory with pre-reset notes.
{
    const s=studio(), a=s.device(1), b=s.device(2);
    b.c.handle_note_on(1,60,100); a.c.resetensemble(); s.advance(8);
    assert.deepStrictEqual(b.notes(),[60]);
    assert.deepStrictEqual(Object.keys(b.c.voiceState),[]);
    b.c.handle_note_off(1,60,0); s.advance(5); assert.deepStrictEqual(b.notes(),[60,60]);
}
// Chord modes stay on chord tones, including when the wider scale has closer alternatives.
{
    const s=studio(), a=s.device(1), b=s.device(2);
    [a,b].forEach(p=>{p.c.mode("chordnearest");p.c.activeChordNotes=[60,64,67];p.c.handle_note_on(1,60,100);});
    s.advance(4);
    [a,b].forEach(p=>assert.ok([0,4,7].includes(p.notes()[0]%12)));
}
// Saved UI controls feed the real engine; the monitor uses its own JS outlet.
{
    const patch=JSON.parse(fs.readFileSync(path.join(__dirname,"../Harmonic_Quantizer/Harmonic Quantizer.maxpat"),"utf8")).patcher;
    const boxes=Object.fromEntries(patch.boxes.map(({box})=>[box.id,box]));
    for(const id of ["obj-ensemble-number","obj-part-number","obj-separation-number"]) {
        assert.equal(boxes[id].parameter_enable,1);
        assert.ok(patch.lines.some(({patchline:l})=>l.source[0]===id && l.destination[0]===id+"-prepend"));
    }
    assert.equal(boxes["obj-js"].numoutlets,3);
    assert.ok(patch.lines.some(({patchline:l})=>l.source[0]==="obj-js" && l.source[1]===2 && l.destination[0]==="obj-ensemble-monitor"));
    const s=studio(), a=s.device(4,3,73);
    assert.equal(a.c.ensembleGroup,3); assert.equal(a.c.ensemblePart,4); assert.equal(a.c.separationAmount,73);
}
console.log("All ensemble coordination tests passed.");
