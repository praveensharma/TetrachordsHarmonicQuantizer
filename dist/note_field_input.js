// The Ableton track selects the hardware port/channel. All in-device channels
// belong to the note-field role; never infer chord roles from rewritten channels.
autowatch=1;inlets=1;outlets=2;
var transport=new Global('tetrachords_field_transport_v1');
var pending=[],last=[],timer=null,running=0,data=[],sysex=false,enabled=true;
var owner=String(new Date().getTime())+'-'+Math.floor(Math.random()*1000000000),serial=0,received=0;
function show(text){outlet(0,'set',text);}
function active(value){enabled=!!value;if(!enabled){cancel();running=0;data=[];sysex=false;show('Disabled — last field retained');}}
function cancel(){if(timer){timer.cancel();}pending=[];}
function msg_int(value){
    if(!enabled){return;}
    var b=value&255;if(b>=248){return;}
    if(b===240){sysex=true;running=0;data=[];return;}
    if(b===247){sysex=false;return;}
    if(b&128){sysex=false;running=b<240?b:0;data=[];return;}
    if(sysex||!running){return;}
    data.push(b);var type=running&240,count=(type===192||type===208)?1:2;
    if(data.length<count){return;}
    if(type===144&&data[1]>0){
        if(pending.length>=128){cancel();show('Burst too large — candidate discarded');running=0;data=[];return;}
        pending.push(data[0]);received++;
        show('Receiving '+pending.length+' notes · internal ch '+((running&15)+1)+' · total '+received);
        if(!timer){timer=new Task(commit,this);}timer.cancel();timer.schedule(25);
    }
    data=[];
}
function list(){var bytes=arrayfromargs(arguments);for(var i=0;i<bytes.length;i++){msg_int(bytes[i]);}}
function commit(){
    if(!enabled||!pending.length){return;}
    last=pending.slice(0);pending=[];
    var packet=JSON.stringify({v:1,id:owner+':'+(++serial),notes:last});
    // Independent mailbox: only the Harmony Receiver writes harmonic state.
    transport.snapshot=packet;messnamed('tetrachords_note_field_v1','fieldpacket',packet);
    var names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
    outlet(1,'set',last.map(function(n){return names[n%12]+(Math.floor(n/12)-1);}).join(' '));
    show('Sent '+last.length+' notes to Harmony Receiver · latched until next burst');
}
function notifydeleted(){cancel();}
function loadbang(){show('Waiting for notes · set this track to Tetrachords Ch. 3');}
