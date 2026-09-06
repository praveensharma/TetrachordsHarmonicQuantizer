// Read-only telemetry. No MIDI output, note scheduling, or parameter writes.
autowatch=1; inlets=1; outlets=0;
mgraphics.init(); mgraphics.relative_coords=0; mgraphics.autofill=0;
var names=['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];
var fg=[.91,.93,.94,1],muted=[.66,.72,.76,1],green=[.44,.85,.73,1],blue=[.4,.68,1,1],amber=[1,.7,.35,1];
var view=jsarguments[1]||'compact',history=[],last=null,pcs=[],source='Waiting',dirty=true;
var harmony=new Global('tetrachords_harmony_v1'),comparison='',derived=[],field=[],rawDerived=[],rawField=[];
function event(input,output,channel,reason){
    last={input:input,output:output,channel:channel,reason:reason||''};history.push(last);
    if(history.length>24){history.shift();}dirty=true;
}
function active(raw){try{var s=JSON.parse(raw);pcs=s.pcs;source=s.source;dirty=true;}catch(e){}}
function reset(){history=[];last=null;dirty=true;}
function pc(n){return ((n%12)+12)%12;}
function note(n){return names[pc(n)]+(Math.floor(n/12)-1);}
function list(v){return v ? Array.prototype.slice.call(v) : [];}
function tick(){
    var d=list(harmony.derivedValidPitchClasses),f=list(harmony.midiFieldPitchClasses||harmony.tetrachordsValidPitchClasses);
    var rd=list(harmony.derivedValidMidiNotes),rf=list(harmony.midiFieldNotes||harmony.tetrachordsValidMidiNotes);
    var sig=JSON.stringify([d,f,rd,rf]);
    if(sig!==comparison){comparison=sig;derived=d;field=f;rawDerived=rd;rawField=rf;dirty=true;}
    if(dirty){mgraphics.redraw();dirty=false;}
}
var task=new Task(tick,this);task.interval=100;task.repeat();
function page(value){
    try{
        var config=JSON.parse(jsarguments[2]||'{}'),which=value===1?'monitor':'play';
        ['play','monitor'].forEach(function(key){(config[key]||[]).forEach(function(name){var obj=this.patcher.getnamed(name);if(obj){obj.message('hidden',key===which?0:1);}},this);},this);
        ['play','monitor'].forEach(function(key){var tab=this.patcher.getnamed('monitor-'+key+'-tab');if(tab){tab.message('bgcolor',key===which ? .04 : .22,key===which ? .48 : .25,key===which ? 1 : .28,1);}},this);
    }catch(e){}
}
function loadbang(){page(0);}
function notifydeleted(){task.cancel();}
function text(x,y,s,c,size){
    mgraphics.set_source_rgba(c||fg);mgraphics.select_font_face('Arial');mgraphics.set_font_size(size||11);
    s=String(s);var clipped=false;
    while(mgraphics.text_measure(s+(clipped?'…':''))[0]>mgraphics.size[0]-x-2 && s.length){s=s.slice(0,-1);clipped=true;}
    mgraphics.move_to(x,y);mgraphics.text_path(s+(clipped?'…':''));mgraphics.fill();
}
function rect(x,y,w,h,c){mgraphics.set_source_rgba(c);mgraphics.rectangle(x,y,w,h);mgraphics.fill();}
function strip(x,y,w,set,other,markers){
    var cell=w/12;
    for(var i=0;i<12;i++){
        var allowed=set.indexOf(i)>=0,different=other && allowed!==(other.indexOf(i)>=0);
        rect(x+i*cell,y,cell-2,22,allowed?[.24,.37,.34,1]:[.18,.21,.23,1]);
        text(x+i*cell+4,y+14,names[i],allowed?green:muted,10);
        if(different){rect(x+i*cell,y+20,cell-2,2,amber);}
        if(markers && last){
            if(pc(last.input)===i){text(x+i*cell+3,y+32,'I',blue,9);}
            if(pc(last.output)===i){text(x+i*cell+cell-10,y+32,'O',green,9);}
        }
    }
}
function match(){
    if(!rawDerived.length||!rawField.length){return 'Waiting for both sources';}
    var a=derived.slice().sort().join(','),b=field.slice().sort().join(',');
    return a===b?'Same pitch classes (register may differ)':'Different pitch classes — amber marks mismatches';
}
function trace(x,y,w,h){
    if(!history.length){text(x,y+20,'Waiting for emitted MIDI notes',muted);return;}
    var low=127,high=0;
    history.forEach(function(p){low=Math.min(low,p.input,p.output);high=Math.max(high,p.input,p.output);});
    if(high-low<12){var mid=(high+low)/2;low=Math.max(0,mid-6);high=Math.min(127,mid+6);}
    text(x,y+10,'Input (blue) / emitted output (green)',muted,10);
    text(x,y+24,note(Math.round(high)),muted,9);text(x,y+h,note(Math.round(low)),muted,9);
    ['input','output'].forEach(function(key){
        mgraphics.set_source_rgba(key==='input'?blue:green);mgraphics.set_line_width(key==='input'?1:2);
        history.forEach(function(p,i){var px=x+34+i*(w-40)/23,py=y+22+(high-p[key])/(high-low)*(h-25);
            if(i===0){mgraphics.move_to(px,py);}else{mgraphics.line_to(px,py);}
        });mgraphics.stroke();
        history.forEach(function(p,i){var px=x+34+i*(w-40)/23,py=y+22+(high-p[key])/(high-low)*(h-25);rect(px-1,py-1,3,3,key==='input'?blue:green);});
    });
}
function paint(){
    var w=mgraphics.size[0],h=mgraphics.size[1];
    // No background fill: readouts inherit the device surface.
    if(view==='compact'){
        if(last){var delta=last.output-last.input;text(0,14,note(last.input)+' → '+note(last.output)+'  '+(delta>=0?'+':'')+delta+' st · ch '+last.channel,fg,12);}
        else{text(0,14,'Input → emitted output: waiting',muted);}
        text(0,35,last && last.reason?last.reason:source+' · last I/O',muted,10);strip(310,0,w-310,pcs,null,true);
    }else if(view==='receiver'){
        text(0,12,'SysEx',muted);strip(90,0,360,derived,rawField.length?field:null,false);
        text(470,14,rawDerived.length?rawDerived.map(note).join(' '):'Waiting for SysEx',fg,10);
        text(0,42,'MIDI field',muted);strip(90,30,360,field,rawDerived.length?derived:null,false);
        text(470,44,rawField.length?rawField.map(note).join(' '):'Waiting for MIDI field',fg,10);
        text(0,75,match(),amber);text(0,94,'Raw notes retain octaves · C4 = MIDI 60 · no source synchronization assumed',muted,10);
    }else{
        text(0,12,'SysEx',muted,10);strip(66,0,270,derived,rawField.length?field:null,false);
        text(0,39,'MIDI',muted,10);strip(66,27,270,field,rawDerived.length?derived:null,false);
        text(0,70,match(),amber,10);trace(355,0,w-355,h-2);
    }
}
