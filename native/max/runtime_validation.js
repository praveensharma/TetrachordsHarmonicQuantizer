// Test-only producer/sink. This device contains NO hardware MIDI output.
autowatch=1;inlets=1;outlets=3;
var received=[],steps=[],task=null,checks=[],initial={},started=0;
var legacy=typeof jsarguments!=="undefined" && jsarguments[1]==="legacy";
function control(name){outlet(0,[name].concat(arrayfromargs(arguments).slice(1)));}
function midi(){var b=arrayfromargs(arguments);for(var i=0;i<b.length;i++){
 if(legacy)this.patcher.getnamed("native_engine").message(b[i]);else outlet(1,b[i]);}}
function msg_int(b){received.push(b);}
function check(name,condition){checks.push({name:name,passed:!!condition});if(!condition)finish("FAIL: "+name);return !!condition;}
function equal(a,b){return JSON.stringify(a)===JSON.stringify(b);}
function ons(){var n=[];for(var i=0;i+2<received.length;i+=3)if((received[i]&240)===144&&received[i+2])n.push(received[i+1]);return n;}
function later(fn,delay){task=new Task(fn,this);task.schedule(delay);}
function modeTest(label,note){steps.push(function(){
 control("panic");control("inputbehavior","follow");control("ensemble",0);control("mode",label);control("resetvoices");
 received=[];midi(144,61,100,128,61,0);
 if(!check(label,equal(received,[144,note,100,128,note,0])))return;
 next();
});}
function next(){if(!steps.length){finish("PASS");return;}var fn=steps.shift();later(fn,5);}
function finish(result){
 if(task)task.cancel();steps=[];
 outlet(2,"set",result+" • "+checks.filter(function(c){return c.passed;}).length+" runtime checks • native C++");
 var report={result:result,legacyGraph:legacy,time:new Date().toISOString(),initial:initial,checks:checks};
 var f=new File("/private/tmp/tetrachords-native-live-validation.jsonl","readwrite");
 if(f.isopen){f.position=f.eof;f.writeline(JSON.stringify(report));f.close();}
 if(result==="PASS"){
  // Values deliberately differ from defaults for save/reopen recall proof.
  try{this.patcher.getnamed("quantizer_mode").message(1);this.patcher.getnamed("continuity").message(73);
      this.patcher.getnamed("register_mode").message(1);this.patcher.getnamed("input_behavior").message(0);}catch(e){}
 }
}
function start(){
 started=new Date().getTime();checks=[];steps=[];
 if(legacy){
  var eng=this.patcher.getnamed("native_engine");
  if(!check("Old embedded graph created native engine",!!eng))return;
  this.patcher.connect(eng,0,this.box,0);
 }
 var ns=["quantizer_mode","continuity","register_mode","same_pitch","input_behavior"];
 for(var i=0;i<ns.length;i++)try{initial[ns[i]]=this.patcher.getnamed(ns[i]).getvalueof();}catch(e){}
 control("timing","immediate");control("registermode","free");control("gravity","off");control("samepitch","legato");
 control("validnotes",101,0,"midi",0,4,7);control("chord",101,0,48,52,55);control("continuity",75);
 modeTest("scale-nearest",60);modeTest("chord-nearest",60);modeTest("chord-map",64);
 modeTest("scale-map",60);modeTest("scale-up",64);modeTest("scale-down",60);
 steps.push(function(){control("mode","scale-contour");control("panic");received=[];
  midi(144,61,100,128,61,0,144,62,100,128,62,0);
  if(!check("Contour history",equal(ons(),[60,64])))return;next();});
 steps.push(function(){control("mode","stateful-nearest");control("resetvoices");received=[];
  midi(144,61,100,128,61,0,144,67,100,128,67,0);
  if(!check("Stateful continuity",equal(ons(),[60,64])))return;next();});
 steps.push(function(){control("mode","scale-nearest");control("validnotes",102,6,"sysex",1,6,10);received=[];
  midi(144,60,100,128,60,0);if(!check("SysEx source switch",equal(ons(),[61])))return;
  control("validnotes",103,0,"midi",0,4,7);received=[];midi(144,61,100,128,61,0);
  if(!check("MIDI field source switch",equal(ons(),[60])))return;next();});
 steps.push(function(){control("inputbehavior","hold");control("stability",20);received=[];
  midi(144,62,100,128,62,0);if(!check("Hold has no immediate output",ons().length===0))return;
  later(function(){if(!check("Hold retains one note after short gate",equal(ons(),[64])&&received.length===3))return;
   control("inputbehavior","follow");if(!check("Hold exit releases mapped pitch",received.length===6&&received[4]===64))return;next();},40);});
 steps.push(function(){control("ensemble",1);control("part",1);control("separation",100);received=[];
  midi(144,61,100,128,61,0);if(!check("Ensemble defers both edges",received.length===0))return;
  later(function(){if(!check("Ensemble paired output",equal(received,[144,60,100,128,60,0])))return;next();},25);});
 steps.push(function(){control("ensemble",0);control("inputbehavior","hold");control("stability",100);
  midi(144,64,100);control("panic");received=[];
  later(function(){if(!check("Panic cancels pending note",ons().length===0))return;control("inputbehavior","follow");next();},150);});
 next();
}
function loadbang(){later(start,1000);}
function notifydeleted(){if(task)task.cancel();}
