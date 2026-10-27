// Control/readout adapter only. Melodic MIDI is wired directly to C++.
// The pre-migration algorithm is retained ONLY in tests/reference/.
include("native_harmony_bridge.js");
inlets = 2;
outlets = 3; // native control commands, status, ensemble display
autowatch = 1;
var controls = {
    mode:"harmonizer", harmonizermap:"pitchclass", timing:"nextnote", gravity:"off",
    continuity:60, registermode:"limited", low:24, high:48, inputbehavior:"follow",
    stability:20, samepitch:"legato", ensemble:0, part:1, separation:0
};
var modeValues = ["chordnearest","nearest","harmonizer","melody","statefulnearest","up","down","chromatic"];
var nativeModes = ["nearest","chordnearest","harmonizer","chromatic","up","down","melody","statefulnearest"];
var aliases = {"chord-nearest":"chordnearest","scale-nearest":"nearest","chord-map":"harmonizer",
    "scale-contour":"melody","stateful-nearest":"statefulnearest","scale-smooth":"statefulnearest",
    "voicelead":"statefulnearest","scale-up":"up","scale-down":"down","scale-map":"chromatic"};
var names = ["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"];
var motion = new Global("tetrachords_motion_v1"), timer = null, lastMotion = null;
var latestState = "Waiting for harmony", lastEnsemble = "", activePcs = [], activeSource = "Waiting";
var transportObserver=null, wasPlaying=null;
function clamp(v,lo,hi) { return Math.max(lo,Math.min(hi,v)); }
function command(name,value) { if(typeof value === "undefined") outlet(0,name); else outlet(0,name,value); }
function status(text) { outlet(1,"set",String(text)); }
function noteName(n) { return n < 0 ? "—" : names[n%12]+(Math.floor(n/12)-1); }
function menu(v, values, fallback) {
    if(typeof v === "number") return values[v|0] === undefined ? fallback : values[v|0];
    v=String(v).toLowerCase(); v=aliases[v] || v;
    return values.indexOf(v)>=0 ? v : fallback;
}
function mode(v) { controls.mode=menu(v,modeValues,controls.mode); command("mode",nativeModes.indexOf(controls.mode)); }
function harmonizermap(v) { controls.harmonizermap=menu(v,["pitchclass","voicing"],controls.harmonizermap); command("chordmap",controls.harmonizermap==="voicing"?1:0); }
function timing(v) { controls.timing=menu(v,["immediate","nextnote","nextbar"],controls.timing); command("timing",["immediate","nextnote","nextbar"].indexOf(controls.timing)); }
function gravity(v) { controls.gravity=menu(v,["off","light","strong"],controls.gravity); command("gravity",["off","light","strong"].indexOf(controls.gravity)); }
function registermode(v) { controls.registermode=menu(v,["limited","free"],controls.registermode);command("registermode",controls.registermode==="free"?1:0); }
function continuity(v) { controls.continuity=clamp(v|0,0,100);command("continuity",controls.continuity); }
function low(v) { controls.low=clamp(v|0,0,127);if(controls.high<controls.low)controls.high=controls.low;command("low",controls.low); }
function high(v) { controls.high=clamp(v|0,0,127);if(controls.low>controls.high)controls.low=controls.high;command("high",controls.high); }
function inputbehavior(v) {
    if(v==="follow-gate" || v==="follow gate")v="follow";
    if(v==="hold-last-pitch" || v==="hold last pitch")v="hold";
    controls.inputbehavior=menu(v,["follow","hold"],controls.inputbehavior);
    command("inputbehavior",controls.inputbehavior==="hold"?1:0);
}
function stability(v) { controls.stability=clamp(v|0,0,100);command("stability",controls.stability); }
function samepitch(v) { controls.samepitch=menu(v,["legato","retrigger"],controls.samepitch);command("samepitch",controls.samepitch==="retrigger"?1:0); }
function ensemble(v) { controls.ensemble=clamp(v|0,0,8);command("ensemble",controls.ensemble);refreshMenus();updateMotion(); }
function part(v) { controls.part=clamp(v|0,1,4);command("part",controls.part);refreshMenus();updateMotion(); }
function separation(v) { controls.separation=clamp(v|0,0,100);command("separation",controls.separation); }
function bypass(v) { command("bypass",v?1:0); }
function panic() { command("panic"); }
function resetvoices() { command("resetvoices"); }
function resetensemble() { command("resetensemble"); }
function active(v) { command("active",v?1:0); }
function tiebreakup(v) { command("tiebreakup",v?1:0); }
function nearest(){mode("nearest");} function chordnearest(){mode("chordnearest");}
function harmonizer(){mode("harmonizer");} function chromatic(){mode("chromatic");}
function melody(){mode("melody");} function statefulnearest(){mode("statefulnearest");}
function up(){mode("up");} function down(){mode("down");}
function visual(selector,payload) {
    try { for(var i=0;i<2;i++) {
        var o=this.patcher.getnamed(i?"monitor-detail":"monitor-compact");
        if(o)o.message(selector,payload);
    }} catch(e) {}
}
function nativeevent(input,output,channel,movement,ic,cc,dc,sc) {
    try { for(var i=0;i<2;i++) {
        var o=this.patcher.getnamed(i?"monitor-detail":"monitor-compact");
        if(o)o.message("event",input,output,channel,"Native • "+controls.mode);
    }} catch(e) {}
    status(noteName(input)+" → "+noteName(output)+" • ch "+channel+" • "+activeSource+
        (controls.mode==="statefulnearest"?" • move "+movement+" • separation cost "+sc:""));
}
function nativestate(mask,source,version,root) {
    activePcs=[];for(var n=0;n<12;n++)if(mask&(1<<n))activePcs.push(n);
    activeSource=["SysEx Intervals","MIDI Note Field","Plinky"][source] || "Harmony";
    var key=[mask,source,version,root].join("/");
    if(key!==latestState) {
        latestState=key;visual("active",JSON.stringify({pcs:activePcs,source:activeSource}));
        status(activeSource+" • "+(activePcs.length?activePcs.map(function(n){return names[n];}).join(" "):"waiting for notes"));
    }
}
function nativeensemble() {
    var a=arrayfromargs(arguments), g=a[0], labels=[];
    for(var p=1;p<=4;p++)labels.push("Voice "+"ABCD".charAt(p-1)+": "+(a[p*2]?"CONFLICT":noteName(a[p*2-1])));
    var text=g?"Ensemble "+"ABCDEFGH".charAt(g-1)+" • "+labels.join("  "):"Independent — no ensemble coordination";
    if(text!==lastEnsemble){lastEnsemble=text;outlet(2,"set",text);}
}
function nativefault(fault) {
    if(fault)status("Native capacity fault — stop the source, then toggle this device off/on to reset");
}
function updateMotion() {
    var effective=0;
    if(controls.ensemble) try {
        var entries=JSON.parse(motion.snapshot || "{}"), matches=[], now=new Date().getTime();
        for(var id in entries)if(entries[id].group===controls.ensemble && now-entries[id].seen<2000)matches.push(entries[id]);
        if(matches.length===1) {
            var e=matches[0], base=clamp(Number(e.biases[controls.part-1])||0,-100,100);
            effective=clamp(base+clamp(Number(e.spread)||0,-100,100)*[-1,-0.4,0.4,1][controls.part-1],-100,100);
        }
    }catch(e){}
    if(effective!==lastMotion){lastMotion=effective;command("motion",effective);}
}
function refreshMenus() {
    try {this.patcher.getnamed("ensemble_group_selector").message("set",controls.ensemble);
         this.patcher.getnamed("ensemble_part_selector").message("set",controls.part-1);}catch(e){}
}
function value(name) {
    try {var o=this.patcher.getnamed(name);if(!o || !o.getvalueof)return null;
        var v=o.getvalueof();if(v!==null && typeof v!=="string" && typeof v.length!=="undefined")v=v.length?v[0]:null;
        return typeof v==="undefined"?null:v;}catch(e){return null;}
}
function restore_controls_from_patcher() {
    var mappings=[
        ["mode","quantizer_mode"],["harmonizermap","chord_map"],["timing","harmony_change"],
        ["gravity","root_gravity"],["continuity","continuity"],["registermode","register_mode"],
        ["low","register_low"],["high","register_high"],["inputbehavior","input_behavior"],
        ["stability","input_stability"],["samepitch","same_pitch"],["ensemble","ensemble_group"],
        ["part","ensemble_part"],["separation","ensemble_separation"]];
    // Read all values first; setters can update UI selectors during recall.
    var restored={};for(var i=0;i<mappings.length;i++){var m=mappings[i],v=value(m[1]);restored[m[0]]=v===null?controls[m[0]]:v;}
    for(var j=0;j<mappings.length;j++){var fn=mappings[j][0];this[fn](restored[fn]);}
}
function poll() { snapshot();updateMotion();command("report"); }
function ensure_native_graph() {
    // Old Live Sets may embed the old patch but resolve this updated sidecar.
    // Upgrade only this device's three MIDI connections, preserving all UI IDs.
    if(!this.patcher || !this.patcher.firstobject || !this.box)return true;
    var input=null,output=null,native=null,device=null;
    for(var o=this.patcher.firstobject;o;o=o.nextobject) {
        if(o.maxclass==="midiin")input=o;
        if(o.maxclass==="midiout")output=o;
        if(o.maxclass==="tetrachords.quantizer")native=o;
        if(o.maxclass==="live.thisdevice")device=o;
    }
    if(native)return true;
    if(!input || !output){status("Native migration: MIDI endpoints not found; reload the library device");return false;}
    native=this.patcher.newdefault(480,105,"tetrachords.quantizer");
    if(!native || native.maxclass!=="tetrachords.quantizer") {
        status("Native engine unavailable — install the .mxo beside this device and restart Live");return false;
    }
    native.varname="native_engine";
    this.patcher.disconnect(input,0,this.box,0);
    this.patcher.disconnect(this.box,0,output,0);
    this.patcher.connect(input,0,native,0);this.patcher.connect(native,0,output,0);
    this.patcher.connect(this.box,0,native,0);this.patcher.connect(native,1,this.box,0);
    if(device){var a=this.patcher.newdefault(480,140,"prepend","active");this.patcher.connect(device,1,a,0);this.patcher.connect(a,0,native,0);}
    status("Native MIDI path installed in this device • save your Set to retain the wiring");
    return true;
}
function init() {
    if(!ensure_native_graph())return;
    restore_controls_from_patcher();snapshot();refreshMenus();updateMotion();
    if(timer)timer.cancel();timer=new Task(poll,this);timer.interval=50;timer.repeat();
    if(!transportObserver && typeof LiveAPI!=="undefined")try {
        transportObserver=new LiveAPI(function(args){
            if(args[0]!=="is_playing")return;
            var playing=Number(args[1]);if(wasPlaying===1 && playing===0)panic();wasPlaying=playing;
        },"live_set");transportObserver.property="is_playing";
    }catch(e){status("Native ready • transport observer unavailable");}
}
function loadbang(){init();}
function notifydeleted(){if(timer)timer.cancel();if(transportObserver)try{transportObserver.property="";}catch(e){}}
function msg_int(){status("MIDI wiring error: melodic bytes must enter the native engine directly");}
function anything(){
    if(inlet===1 && messagename==="harmony")harmony.apply(this,arrayfromargs(arguments));
    else if(inlet===1 && messagename==="validnotes")validnotes.apply(this,arrayfromargs(arguments));
    else if(inlet===1 && messagename==="chord")chord.apply(this,arrayfromargs(arguments));
}
