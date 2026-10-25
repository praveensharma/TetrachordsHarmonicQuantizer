// Temporary, isolated Live timing fixture. No writes to public harmony/ROTA state.
autowatch=1;inlets=1;outlets=5;
var role=jsarguments[1],state=new Global('codex_latency_probe_20261024');
var timer=null,offTimer=null,index=0,perCase=120,current=-1,queue=[],running=-1,data=[],initialized=false;
var cases=['reference','quant-nearest','quant-stateful','quant-separated','quant-hold20','rota','quant-rota'];
var matched=jsarguments[2]==='matched';
if(matched){cases=['quant-bypass-rota','quant-rota','quant-batched-rota',
 'quant-batched-rota','quant-bypass-rota','quant-rota',
 'quant-rota','quant-batched-rota','quant-bypass-rota'];}
function read(){try{return JSON.parse(state.snapshot||'{}');}catch(e){return {};}}
function write(s){state.snapshot=JSON.stringify(s);}
function text(s){outlet(4,'set',s);}
function init(){
 if(role==='worker'){
  outlet(2,'init');outlet(2,'mode','nearest');outlet(2,'registermode','free');outlet(2,'timing','immediate');
  outlet(2,'validnotes',1,0,'midi',0,2,4,5,7,9,11);
  outlet(3,'init');outlet(3,'voices',1);
 }else if(role==='sink'){outlet(3,'init');}
 text('Isolated latency '+role+' — ready');
}
function start(){
 if(role!=='sender')return;
 stop();index=0;write({run:new Date().getTime(),phase:0,sent:{},results:[],done:false});
 timer=new Task(step,this);timer.schedule(1000);text('Starting isolated test');
}
function step(){
 if(index>=perCase*cases.length){
  var s=read();s.done=true;write(s);text('Complete: '+s.results.length+' notes');return;
 }
 // cpuclock replies synchronously to stamp(), immediately before MIDI emission.
 outlet(0,'bang');
 if(timer)timer.schedule(50);
}
function stamp(time){
 if(role==='sender'){
  var s=read(),phase=Math.floor(index/perCase),slot=index%perCase,velocity=slot+1;
  s.phase=phase;s.sent[String(velocity)]={time:time,phase:phase,slot:slot};write(s);
  outlet(1,144);outlet(1,48+slot%24);outlet(1,velocity);
  if(offTimer)offTimer.cancel();offTimer=new Task(release,this);offTimer.note=48+slot%24;offTimer.schedule(10);
  index++;if(slot===0)text('Testing '+cases[phase]);
 }else if(role==='sink'){
  var s=read(),entry=s.sent&&s.sent[String(queue.shift())];
  if(!entry)return;
  s.results.push({phase:cases[entry.phase],slot:entry.slot,ms:time-entry.time});write(s);
  if(entry.slot===perCase-1){report();}
 }
}
function release(){if(offTimer){outlet(1,128);outlet(1,offTimer.note);outlet(1,0);}}
function configure(phase){
 if(!initialized){init();initialized=true;}
 if(phase===current)return;current=phase;
 var name=cases[phase],hold=name==='quant-hold20',ensemble=name==='quant-separated',rota=name.indexOf('rota')>=0;
 outlet(2,'panic');outlet(2,'inputbehavior',hold?'hold':'follow');outlet(2,'stability',hold?20:0);
 outlet(2,'ensemble',ensemble?1:0);outlet(2,'separation',ensemble?50:0);
 outlet(2,'mode',name==='quant-stateful'||ensemble?'stateful-nearest':'nearest');
 outlet(2,'bypass',name==='quant-bypass-rota'?1:0);
 if(matched)outlet(2,'probebatch',name==='quant-batched-rota'?1:0);
 outlet(0,name==='reference'?1:name==='rota'?3:2);
 // Post-quantizer routing: direct MIDI track route, or private ROTA bus.
 outlet(4,'routeafter',rota?2:1);
 text('Worker: '+cases[phase]);
}
function msg_int(byte){
 if(byte>=248)return;
 if(byte&128){running=byte;data=[];return;}
 if(running<0)return;data.push(byte);if(data.length<2)return;
 if(role==='worker'){
  if((running&240)===144 && data[1]>0)configure(read().phase||0);
  outlet(1,running);outlet(1,data[0]);outlet(1,data[1]);
 }else if(role==='sink' && (running&240)===144 && data[1]>0){queue.push(data[1]);outlet(0,'bang');}
 data=[];
}
function report(){
 var s=read(),summary={run:s.run,scope:'Live internal MIDI tracks, cpuclock; excludes hardware',results:[]};
 var reported={};
 for(var i=0;i<cases.length;i++){
  if(reported[cases[i]])continue;reported[cases[i]]=true;
  var a=(s.results||[]).filter(function(e){return e.phase===cases[i]&&e.slot>=20;}).map(function(e){return e.ms;}).sort(function(a,b){return a-b;});
  if(a.length)summary.results.push({phase:cases[i],samples:a.length,medianMs:a[Math.floor(a.length*.5)],p95Ms:a[Math.ceil(a.length*.95)-1],maxMs:a[a.length-1]});
 }
 var f=new File(matched?'/private/tmp/codex_live_latency_matched_results.json':'/private/tmp/codex_live_latency_results.json','write');if(f.isopen){f.eof=0;f.position=0;f.writeline(JSON.stringify(summary));f.close();}
 text('Captured '+(s.results||[]).length+' notes');
}
function stop(){if(timer)timer.cancel();if(offTimer){offTimer.cancel();release();}timer=null;offTimer=null;}
function notifydeleted(){stop();}
