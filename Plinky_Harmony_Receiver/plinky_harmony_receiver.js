// Chords NRPN: 33:78 root (CC6), 33:79 chord / 33:80 scale (CC6+38).
// Patch complete per-channel snapshots; commit after 12 ms of quiet.
autowatch=1;inlets=1;outlets=5;
if(typeof TetrachordsLiveScaleMatcher==='undefined'&&typeof include!=='undefined')include('live_scale_matcher.js');
if(typeof TetrachordsLiveScaleBridge==='undefined'&&typeof include!=='undefined')include('live_scale_bridge.js');
var shared=new Global('tetrachords_harmony_v1');
var enabled=false,ready=false,blocked=false,running=0,bytes=[],sysex=false;
var channels={},latest=null,commits=0,published=0,expected='',watch=null,assemblyTask=null;
var QUIET_MS=12,TIMEOUT=200,lastInput=0,lastDecoded=0,lastPublished=0,lastSummary=0;
var rxBytes=0,rxCC=0,rxFields=0,rejected=0,lastProblem='';
var liveSync=false,matcher=null,bridge=null,liveTask=null,liveText='Live Scale Sync: Off';
var bridgeAttempt=-1000000;
var liveError='';
var TRACE_PATH='/private/tmp/plinky_harmony_receiver_trace.tsv';
var instance=String(new Date().getTime())+'-'+Math.floor(Math.random()*1000000);
function now(){return new Date().getTime();}
function signature(){return [shared.activeValidVersion,shared.chordVersion,shared.validNoteSource].join('|');}
function status(s){outlet(0,'set',s);}
function names(pcs){var n=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];return pcs.map(function(p){return n[p%12];}).join(' ');}
function control(name,fallback){try{var v=patcher.getnamed(name).getvalueof();return v instanceof Array?v[0]:v;}catch(e){return fallback;}}
function trace(event,detail){
    if(typeof File==='undefined')return;
    var f=new File(TRACE_PATH,'readwrite');if(!f.isopen)return;
    if(!f.eof)f.writeline('time\tinstance\tevent\tdetails');
    if(f.eof>262144){f.eof=0;f.position=0;f.writeline('time\tinstance\tevent\tdetails');}
    f.position=f.eof;f.writeline(now()+'\t'+instance+'\t'+event+'\t'+detail);f.close();
}
function init(){
    ready=true;trace('INIT','plinky-1.1 quietMs='+QUIET_MS+' timeoutMs='+TIMEOUT);
    restore_session_cache();
    liveSync=!!Number(control('live_scale_sync',0));active(control('publish',0));
    if(!watch&&typeof Task!=='undefined'){watch=new Task(tick,this);watch.interval=250;watch.repeat();}
    ensure_bridge();update_live_readout();
}
function active(v){
    if(v instanceof Array)v=v[0];enabled=!!Number(v);blocked=false;expected=signature();
    trace('MODE',enabled?'publish':'monitor');
    status(enabled?'Publish on — waiting for harmony':'Monitor only — Publish is Off');
    if(enabled&&latest)publish(latest); // Only states received in this session.
    update_live_readout();
}
function ensure_bridge(){
    if(bridge||!ready||!liveSync)return;
    if(now()-bridgeAttempt<2000)return;bridgeAttempt=now();
    try{
        matcher=new TetrachordsLiveScaleMatcher();
        bridge=new TetrachordsLiveScaleBridge(typeof LiveAPI==='undefined'?null:LiveAPI,function(e){
            if(e&&e.type==='warning')trace('LIVE_WARNING',e.warning);
        });
        trace('LIVE_READY',JSON.stringify(bridge.init()));liveError='';
    }catch(e){bridge=null;liveError=String(e);liveText='Live Scale Sync unavailable: '+e;trace('LIVE_ERROR',String(e));}
}
function livescalesync(v){
    if(v instanceof Array)v=v[0];liveSync=v==='current'||v==='on'||Number(v)===1;
    if(!liveSync){if(liveTask)liveTask.cancel();liveTask=null;liveText='Live Scale Sync: Off';}
    else{ensure_bridge();if(enabled&&latest&&!blocked)schedule_live_sync();}
    trace('LIVE_MODE',liveSync?'current':'off');update_live_readout();
}
function update_live_readout(){
    if(!liveSync)liveText='Live Scale Sync: Off';
    else if(!enabled)liveText='Live Scale Sync: waiting for Publish Harmony';
    else if(!bridge&&liveError)liveText='Live Scale Sync unavailable: '+liveError;
    else if(!latest&&bridge)liveText='Live Scale Sync: waiting for complete harmony';
    outlet(4,'set',liveText);
}
function schedule_live_sync(){
    if(!liveSync||!enabled||blocked||!latest)return;
    ensure_bridge();if(!bridge)return;
    if(typeof Task==='undefined'){perform_live_sync();return;}
    if(!liveTask)liveTask=new Task(perform_live_sync,this);
    liveTask.cancel();liveTask.schedule(30);
}
function perform_live_sync(){
    if(!liveSync||!enabled||blocked||!latest||!bridge)return;
    check_source();if(blocked)return;
    try{
        var match=matcher.match({rootPitchClass:latest.root%12,validPitchClasses:pitches(latest.root,latest.scale),source:'plinky'});
        var result=bridge.setCurrentScale(match);
        shared.plinkyLiveScaleMatch=match;shared.plinkyLiveScaleResult=result;
        liveText='Live: '+names([match.rootNote||0])+' '+(match.scaleName||'unmapped')+' · '+match.matchType.toUpperCase()+
            ' · '+(result.verified?'verified':result.skipped?'skipped':'unverified');
        trace('LIVE_SCALE',JSON.stringify({match:match,result:result}));
    }catch(e){liveText='Live Scale Sync failed: '+e;trace('LIVE_ERROR',String(e));}
    update_live_readout();
}
function check_source(){
    if(enabled&&!blocked&&signature()!==expected){
        blocked=true;if(liveTask)liveTask.cancel();
        status('Source conflict — disable other receiver, then toggle Publish Off/On');
        trace('CONFLICT','expected='+expected+' actual='+signature());
    }
}
function diagnostics(){return {instance:instance,bytes:rxBytes,cc:rxCC,fields:rxFields,decoded:commits,published:published,
    rejected:rejected,lastInput:lastInput,lastDecoded:lastDecoded,lastPublished:lastPublished,
    mode:enabled?'publish':'monitor',blocked:blocked,lastProblem:lastProblem};}
function tick(){
    check_source();flush_due();
    if(now()-lastSummary>=1000){
        lastSummary=now();var d=diagnostics();shared.plinkyDiagnostics=JSON.stringify(d);
        var age=lastDecoded?Math.max(0,Math.floor((now()-lastDecoded)/1000))+'s ago':'waiting';
        status((blocked?'SOURCE CONFLICT':enabled?'Publishing':'Monitor only')+' · MIDI '+rxBytes+' B / '+rxCC+' CC · decoded '+commits+
            ' / sent '+published+' · rejected '+rejected+' · harmony '+age);
        trace('SUMMARY',JSON.stringify(d));
    }
}
function state(ch){
    if(!channels[ch])channels[ch]={msb:null,lsb:null,dataMSB:null,dataLSB:null,cached:null,pending:null,due:0,fragment:0};
    return channels[ch];
}
function restore_session_cache(){
    // Max Global survives script reloads, but not a fresh application session.
    // Retain only complete per-channel hardware states, never pending patches.
    var saved;try{saved=JSON.parse(shared.plinkyReceiverCache||'{}');}catch(e){return;}
    if(saved.v!==1||!saved.states)return;
    for(var ch in saved.states){
        var p=saved.states[ch],n=Number(ch);
        if(n<1||n>16||n!==Math.floor(n)||!p)continue;
        if(typeof p.root!=='number'||p.root<0||p.root>127||p.root!==Math.floor(p.root))continue;
        if(typeof p.chord!=='number'||p.chord<0||p.chord>4095||p.chord!==Math.floor(p.chord))continue;
        if(typeof p.scale!=='number'||p.scale<1||p.scale>4095||p.scale!==Math.floor(p.scale))continue;
        p.channel=n;state(n).cached=p;
        if(n===saved.lastChannel)latest=p;
    }
    if(latest){lastDecoded=Number(latest.at)||0;render_harmony(latest);trace('RESTORE_CACHE',JSON.stringify(latest));}
}
function save_session_cache(){
    var states={};for(var ch in channels)if(channels[ch].cached)states[ch]=channels[ch].cached;
    shared.plinkyReceiverCache=JSON.stringify({v:1,states:states,lastChannel:latest.channel});
}
function draft(s,ch){
    if(!s.pending){var c=s.cached;s.pending={root:c?c.root:null,chord:c?c.chord:null,scale:c?c.scale:null,
        channel:ch,at:now(),changed:{}};}
    return s.pending;
}
function reject(s,reason){
    s.pending=null;s.dataMSB=null;s.dataLSB=null;s.fragment=0;s.due=0;
    rejected++;lastProblem=reason;trace('REJECT',reason);status(reason+' — last complete harmony retained');
}
function queue(s){
    s.due=now()+QUIET_MS;
    if(typeof Task!=='undefined'){
        if(!assemblyTask)assemblyTask=new Task(flush_due,this);
        assemblyTask.cancel();assemblyTask.schedule(QUIET_MS);
    }
}
function flush_due(){
    var next=0;
    for(var ch in channels){
        var s=channels[ch],p=s.pending;if(!p)continue;
        if(now()-p.at>TIMEOUT){reject(s,'Incomplete/timed-out update on ch '+ch);continue;}
        if(s.due>now()){next=next?Math.min(next,s.due):s.due;continue;}
        if(s.fragment||p.root===null||p.chord===null||p.scale===null){
            next=next?Math.min(next,p.at+TIMEOUT+1):p.at+TIMEOUT+1;continue;
        }
        s.pending=null;s.cached=p;s.due=0;commit(p);
    }
    if(next&&typeof Task!=='undefined'){
        if(!assemblyTask)assemblyTask=new Task(flush_due,this);
        assemblyTask.cancel();assemblyTask.schedule(Math.max(1,next-now()));
    }
}
function msg_int(value){
    rxBytes++;lastInput=now();var b=value&255;
    if(b>=248)return;
    if(b===240){sysex=true;running=0;bytes=[];return;}
    if(b===247){sysex=false;running=0;bytes=[];return;}
    if(b&128){sysex=false;running=b<240?b:0;bytes=[];return;}
    if(sysex||!running)return;
    bytes.push(b);var type=running&240,count=(type===192||type===208)?1:2;
    if(bytes.length===count){if(type===176)cc((running&15)+1,bytes[0],bytes[1]);bytes=[];}
}
function list(){var a=arrayfromargs(arguments);for(var i=0;i<a.length;i++)msg_int(a[i]);}
function cc(ch,controller,value){
    rxCC++;var s=state(ch);
    if(s.pending&&now()-s.pending.at>TIMEOUT)reject(s,'Timed-out update on ch '+ch);
    if(controller===99||controller===98||controller===101||controller===100){
        if(s.fragment)reject(s,'Incomplete mask before parameter change on ch '+ch);
        s.dataMSB=null;s.dataLSB=null;
        if(controller===101||controller===100){s.msb=null;s.lsb=null;return;}
        s[controller===99?'msb':'lsb']=value;return;
    }
    if(s.msb!==33||s.lsb<78||s.lsb>80)return;
    if(s.lsb===78){
        if(controller===6){var p=draft(s,ch);p.root=value;p.changed.root=true;rxFields++;trace('FIELD','ch='+ch+' root='+value);queue(s);}
        return;
    }
    if(controller!==6&&controller!==38)return;
    draft(s,ch);s.fragment=now()||1;s[controller===6?'dataMSB':'dataLSB']=value;queue(s);
    if(s.dataMSB===null||s.dataLSB===null)return;
    var mask=(s.dataMSB<<7)|s.dataLSB;s.dataMSB=null;s.dataLSB=null;s.fragment=0;
    if(mask>4095||(s.lsb===80&&mask===0)){reject(s,'Invalid '+(s.lsb===79?'chord':'scale')+' mask');return;}
    var key=s.lsb===79?'chord':'scale';s.pending[key]=mask;s.pending.changed[key]=true;
    rxFields++;trace('FIELD','ch='+ch+' '+key+'=0x'+mask.toString(16));queue(s);
}
function intervals(mask){var a=[];for(var i=0;i<12;i++)if(mask&(1<<i))a.push(i);return a;}
function pitches(root,mask){return intervals(mask).map(function(i){return (root+i)%12;}).sort(function(a,b){return a-b;});}
function voicing(root,mask){var base=root;while(base+11>127)base-=12;return intervals(mask).map(function(i){return base+i;});}
function send(message){messnamed.apply(null,['tetrachords_harmony_bus_v1'].concat(message));}
function key(p){return [p.root,p.chord,p.scale].join('|');}
function render_harmony(p){
    outlet(1,'set','Root: '+names([p.root%12])+' · MIDI '+p.root+' · input ch '+p.channel);
    outlet(2,'set','Chord: '+(names(pitches(p.root,p.chord))||'(empty)')+' · root-position voicing reconstructed');
    outlet(3,'set','Scale: '+names(pitches(p.root,p.scale)));
}
function commit(p){
    var changed=!latest||key(latest)!==key(p);latest=p;commits++;lastDecoded=now();
    save_session_cache();render_harmony(p);
    trace('DECODE',JSON.stringify(p));
    if(enabled&&(changed||!published))publish(p);
    else status(enabled?'Harmony unchanged':'Monitor only — decoded harmony; Publish is Off');
}
function publish(p){
    check_source();if(!enabled||blocked)return;
    var root=p.root%12,scale=pitches(root,p.scale),chord=pitches(root,p.chord);
    var cv=(Number(shared.chordVersion)||0)+1,vv=(Number(shared.activeValidVersion)||0)+1;
    var cn=voicing(p.root,p.chord),sn=voicing(p.root,p.scale);
    var cm=['chord',cv,root].concat(cn),vm=['validnotes',vv,root,'plinky'].concat(scale);
    shared.root=root;shared.rootMidiNote=p.root;
    shared.plinkyRootMidiNote=p.root;shared.plinkyChordMask=p.chord;shared.plinkyScaleMask=p.scale;
    shared.plinkyVoicingReconstructed=1;
    shared.chordRoot=root;shared.activeChordNotes=cn;shared.activeChordPitchClasses=chord;
    shared.chordMessage=cm;shared.chordVersion=cv;
    shared.validNoteSource='plinky';shared.activeValidMidiNotes=sn;
    shared.activeValidPitchClasses=scale;shared.legalPitchClasses=scale;
    shared.validNoteMessage=vm;shared.activeValidVersion=vv;
    expected=signature();send(cm);send(vm);published++;lastPublished=now();
    trace('PUBLISH','validVersion='+vv+' chordVersion='+cv+' root='+root+' pcs='+scale.join(','));
    status('Publishing Plinky Chords · update '+published);schedule_live_sync();update_live_readout();
}
function notifydeleted(){
    if(watch)watch.cancel();if(assemblyTask)assemblyTask.cancel();if(liveTask)liveTask.cancel();
    if(bridge&&bridge.observers)for(var i=0;i<bridge.observers.length;i++){
        try{bridge.observers[i].property='';}catch(e){}
    }
}
