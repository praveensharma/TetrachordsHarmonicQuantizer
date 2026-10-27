// Test-only bookkeeping: cpuclock timestamps are captured by Max BEFORE JS.
// No MIDI ports, audio output or hardware routing are present in this patch.
autowatch=1;inlets=1;outlets=6;
var task=null,phase=-1,active=false,starts={},samples=[],ins=0,outs=0,offsIn=0,offsOut=0,extra=0;
var results=[],phases=["wire","native","legacy","native","wire","legacy"],began=0,boundaryOffs=0;
function toNative(){outlet(2,arrayfromargs(arguments));}
function toLegacy(){outlet(3,arrayfromargs(arguments));}
function later(fn,ms){task=new Task(fn,this);task.schedule(ms);}
function source(time,id){
 if(!active)return;ins++;if(!starts[id])starts[id]=[];starts[id].push(time);
}
function inputoff(){if(active){offsIn++;if(ins===0)boundaryOffs++;}}
function result(time,pitch,velocity){
 if(!active)return;
 if(!velocity){offsOut++;return;}
 outs++;
 if(!starts[velocity]||!starts[velocity].length){extra++;return;}
 samples.push(time-starts[velocity].shift());
}
function begin(){
 phase++;if(phase>=phases.length){finish();return;}
 active=false;outlet(0,0);toNative("panic");toLegacy("panic");
 starts={};samples=[];ins=outs=offsIn=offsOut=extra=boundaryOffs=0;
 outlet(1,phases[phase]==="wire"?1:phases[phase]==="native"?2:3);
 outlet(5,"set","Measuring "+phases[phase]+" • matched Max cpuclock timestamps");
 began=new Date().getTime()/1000;active=true;outlet(0,1);later(stop,2000);
}
function stop(){outlet(0,0);later(collect,200);}
function collect(){
 active=false;samples.sort(function(a,b){return a-b;});
 function q(f){return samples.length?samples[Math.min(samples.length-1,Math.ceil(samples.length*f)-1)]:null;}
 var pending=0;for(var id in starts)pending+=starts[id].length;
 results.push({path:phases[phase],began:began,ended:new Date().getTime()/1000,inputOns:ins,outputOns:outs,inputOffs:offsIn,outputOffs:offsOut,boundaryOrphanOffs:boundaryOffs,
  unmatched:pending,extraOns:extra,samples:samples.length,medianMs:q(.5),p95Ms:q(.95),p99Ms:q(.99),maxMs:q(1)});
 later(begin,100);
}
function finish(){
 outlet(0,0);active=false;toNative("panic");toLegacy("panic");
 // Native deliberately consumes unmatched Offs at an A/B switch. Raw wire and
 // frozen legacy pass them through. They are not missing note-instance Offs.
 var valid=results.every(function(r){return r.samples>0 && r.inputOns===r.outputOns &&
  r.inputOffs-(r.path==='native'?r.boundaryOrphanOffs:0)===r.outputOffs && !r.extraOns && !r.unmatched;});
 var report={scope:"Max scheduler ingress to post-processor cpuclock; excludes USB, Live input/output and FH-2",valid:valid,time:new Date().toISOString(),results:results};
 var f=new File("/private/tmp/tetrachords-native-timing.json","write");
 if(f.isopen){f.eof=0;f.position=0;f.writeline(JSON.stringify(report));f.close();}
 outlet(5,"set",(valid?"PASS":"CHECK COUNTS")+" • wire/native/legacy timing written • no hardware I/O");
}
function start(){
 phase=-1;results=[];outlet(0,0);
 toNative("registermode",1);toNative("mode",0);toNative("timing",0);toNative("ensemble",0);
 toNative("inputbehavior",0);toNative("samepitch",0);toNative("gravity",0);toNative("field",1,0,1,2741,0);
 toLegacy("registermode","free");toLegacy("mode","nearest");toLegacy("timing","immediate");
 toLegacy("ensemble",0);toLegacy("inputbehavior","follow");toLegacy("samepitch","legato");toLegacy("gravity","off");
 outlet(4,"validnotes",1,0,"midi",0,2,4,5,7,9,11);later(begin,100);
}
function loadbang(){later(start,1000);}
function notifydeleted(){outlet(0,0);if(task)task.cancel();}
