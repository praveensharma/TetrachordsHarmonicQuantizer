// One persisted controller per ensemble. This device does not process MIDI.
autowatch=1; inlets=1; outlets=1;
var shared=new Global("tetrachords_motion_v1");
var identity=new Date().getTime().toString(36)+Math.random().toString(36).slice(2);
var group=1,biases=[0,0,0,0],spread=0,heartbeat=null,ready=false,lastStatus="";
function clamp(v,a,b){return Math.max(a,Math.min(b,Number(v)||0));}
function state(){try{return JSON.parse(shared.snapshot||"{}");}catch(e){return {};}}
function leave(){var s=state();delete s[identity];shared.snapshot=JSON.stringify(s);}
function publish(){
    if(!ready){return;}
    var s=state(),now=new Date().getTime(),count=0;
    for(var id in s){if(now-s[id].seen>=2000){delete s[id];}}
    s[identity]={group:group,biases:biases.slice(),spread:spread,seen:now};
    for(var key in s){if(s[key].group===group){count++;}}
    shared.snapshot=JSON.stringify(s);
    var effective=biases.map(function(b,i){return Math.round(clamp(b+[-1,-.4,.4,1][i]*spread,-100,100)*10)/10;});
    var text=count>1?"Conflict: use one Harmonic Motion per ensemble. Motion is neutral.":
        "Effective A / B / C / D: "+effective.join(" / ")+" · Stateful Nearest";
    if(text!==lastStatus){outlet(0,"set",text);lastStatus=text;}
}
function ensemble(v){leave();group=Math.round(clamp(v,1,8));publish();}
function bias(part,v){biases[Math.round(clamp(part,1,4))-1]=clamp(v,-100,100);publish();}
function spreadmotion(v){spread=clamp(v,-100,100);publish();}
function init(){
    var self=this;
    function value(name,fallback){try{var b=self.patcher.getnamed(name);return b?b.getvalueof():fallback;}catch(e){return fallback;}}
    group=Math.round(clamp(value("motion_group",0),0,7))+1;
    spread=clamp(value("spread_motion",0),-100,100);
    for(var i=0;i<4;i++){biases[i]=clamp(value("motion_bias_"+(i+1),0),-100,100);}
    ready=true;publish();
    if(heartbeat){heartbeat.cancel();}
    if(typeof Task!=="undefined"){heartbeat=new Task(publish,this);heartbeat.interval=250;heartbeat.repeat();}
}
function notifydeleted(){ready=false;if(heartbeat){heartbeat.cancel();}leave();}
