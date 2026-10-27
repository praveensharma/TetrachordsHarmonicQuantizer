// Four real native Max instances. No MIDI ports or hardware output in this patch.
autowatch=1;inlets=4;outlets=5;
var bytes=[[],[],[],[]],checks=[],task=null,winner=0;
function msg_int(b){bytes[inlet].push(b);}
function send(p){outlet(p,arrayfromargs(arguments).slice(1));}
function note(p,on){var bs=[on?144:128,60,on?100:0];for(var i=0;i<3;i++)outlet(p,bs[i]);}
function pitches(p){var ns=[];for(var i=0;i+2<bytes[p].length;i+=3)if(bytes[p][i]===144&&bytes[p][i+2])ns.push(bytes[p][i+1]);return ns;}
function clear(){bytes=[[],[],[],[]];}
function panic(){for(var p=0;p<4;p++)send(p,"panic");clear();}
function later(fn,ms){task=new Task(fn,this);task.schedule(ms);}
function check(name,ok){checks.push({name:name,passed:!!ok});if(!ok)finish("FAIL: "+name);return !!ok;}
function finish(result){
 if(task)task.cancel();
 outlet(4,"set",result+" • four native voices • "+checks.length+" checks");
 var f=new File("/private/tmp/tetrachords-native-ensemble-validation.json","write");
 if(f.isopen){f.writeline(JSON.stringify({result:result,time:new Date().toISOString(),checks:checks}));f.close();}
 panic();
}
function start(){
 for(var p=0;p<4;p++){
  send(p,"registermode",1);send(p,"mode",0);send(p,"timing",0);send(p,"field",1,0,1,53,0);
  send(p,"ensemble",8);send(p,"part",p+1);send(p,"separation",100);
 }
 clear();for(var p=0;p<4;p++)note(p,true);
 if(!check("Coordinated notes are not emitted early",bytes.every(function(b){return !b.length;})))return;
 later(function(){
  var ns=[0,1,2,3].map(function(p){return pitches(p)[0];});
  if(!check("Four real instances choose distinct valid pitches",JSON.stringify(ns.slice().sort(function(a,b){return a-b;}))==="[60,62,64,65]"))return;
  winner=ns.indexOf(60);for(var p=0;p<4;p++)note(p,false);
  later(function(){
   if(!check("All four offs return to their selected pitches",[0,1,2,3].every(function(p){return bytes[p].length===6&&bytes[p][1]===bytes[p][4];})))return;
   clear();for(var p=0;p<4;p++)note(p,true);
   later(function(){
    var next=[0,1,2,3].map(function(p){return pitches(p)[0];}).indexOf(60);
    if(!check("Allocation priority rotates between real instances",next===(winner+1)%4))return;
    panic();for(var p=0;p<4;p++)send(p,"separation",0);
    clear();for(var p=0;p<4;p++)note(p,true);
    if(!check("Zero separation has immediate unisons",[0,1,2,3].every(function(p){return pitches(p)[0]===60;})))return;
    panic();for(var p=0;p<4;p++){
     send(p,"separation",100);send(p,"low",60);send(p,"high",60);send(p,"registermode",0);
    }
    for(var p=0;p<4;p++)note(p,true);
    later(function(){if(!check("Hard registers retain possible unisons at 100 percent",[0,1,2,3].every(function(p){return pitches(p)[0]===60;})))return;finish("PASS");},25);
   },25);
  },25);
 },25);
}
function loadbang(){later(start,1000);}
function notifydeleted(){if(task)task.cancel();}
