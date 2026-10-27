"""Matched high-priority Max event timing; no MIDI ports or hardware outputs."""
import json,shutil,sys
from pathlib import Path
from build_amxd import parse_container,replace_patch,encode_container
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'native/build/validation';OUT.mkdir(parents=True,exist_ok=True)
boxes=[];lines=[]
def add(id,text,ins=1,outs=1,kind='newobj',**kw):
    boxes.append({'box':dict(id=id,maxclass=kind,text=text,numinlets=ins,numoutlets=outs,patching_rect=[20+(len(boxes)%4)*190,100+(len(boxes)//4)*40,180,22],**kw)})
def link(a,o,b,i=0):lines.append({'patchline':{'source':[a,o],'destination':[b,i]}})
add('control','js runtime_timing.js',outs=6)
add('metro','metro 10');link('control',0,'metro')
add('tick','t b b',outs=2);link('metro',0,'tick')
add('counter','counter 1 127',ins=5,outs=4);link('tick',1,'counter')
add('id','t i i',outs=2);link('counter',0,'id')
add('source-order','t b i',outs=2);link('id',1,'source-order')
add('source-clock','cpuclock');link('source-order',0,'source-clock')
add('source-pack','pack 0. 0',ins=2);link('source-order',1,'source-pack',1);link('source-clock',0,'source-pack')
add('source-prefix','prepend source');link('source-pack',0,'source-prefix');link('source-prefix',0,'control')
add('on-order','t b i',outs=2);link('id',0,'on-order')
add('on-pack','pack 61 0',ins=2);link('on-order',1,'on-pack',1);link('on-order',0,'on-pack')
add('formatter','midiformat',ins=7,outs=2);link('on-pack',0,'formatter')
add('off-delay','delay 1');link('tick',0,'off-delay')
add('off-order','t b b',outs=2);link('off-delay',0,'off-order')
add('off-count','inputoff',kind='message');link('off-order',1,'off-count');link('off-count',0,'control')
add('off-message','61 0',kind='message');link('off-order',0,'off-message');link('off-message',0,'formatter')
add('gate','gate 3 1',ins=2,outs=3);link('control',1,'gate');link('formatter',0,'gate',1)
add('native','tetrachords.quantizer',outs=2);link('gate',1,'native');link('control',2,'native')
add('legacy','js timing_legacy.js',ins=2,outs=3);link('gate',2,'legacy');link('control',3,'legacy');link('control',4,'legacy',1)
add('parser','midiparse',outs=8);link('gate',0,'parser');link('native',0,'parser');link('legacy',0,'parser')
add('result-order','t b l',outs=2);link('parser',0,'result-order')
add('result-unpack','unpack 0 0',outs=2);link('result-order',1,'result-unpack')
add('result-clock','cpuclock');link('result-order',0,'result-clock')
add('result-pack','pack 0. 0 0',ins=3);link('result-clock',0,'result-pack');link('result-unpack',0,'result-pack',1);link('result-unpack',1,'result-pack',2)
add('result-prefix','prepend result');link('result-pack',0,'result-prefix');link('result-prefix',0,'control')
live='--live' in sys.argv
loopback='--loopback' in sys.argv
tag=sys.argv[sys.argv.index('--tag')+1] if '--tag' in sys.argv else ''
assert not tag or (tag.replace('-','').isalnum() and len(tag)<40)
if live:
    # Capture the incoming note timestamp before processing. The JS recorder
    # receives a Max-captured timestamp, not its own callback execution time.
    lines=[l for l in lines if l['patchline']['source'][0] != 'formatter']
    add('input','midiin');add('input-order','t i i',outs=2)
    add('input-parser','midiparse',outs=8)
    add('input-unpack','unpack 0 0',outs=2)
    add('input-id','sel 0',outs=2)
    link('input',0,'input-order');link('input-order',1,'input-parser')
    link('input-parser',0,'input-unpack');link('input-unpack',1,'input-id')
    link('input-id',0,'off-count');link('input-id',1,'source-order')
    link('input-order',0,'gate',1)
if loopback:
    assert live
    add('output','midiout');link('gate',0,'output');link('native',0,'output');link('legacy',0,'output')
add('label','Measuring native / JS timing…',kind='comment',outs=0,presentation=1,presentation_rect=[15,15,720,30],fontsize=15);link('control',5,'label')
doc={'patcher':dict(fileversion=1,classnamespace='box',rect=[0,0,800,600],devicewidth=760,openinpresentation=1,boxes=boxes,lines=lines)}
runtime_name=('runtime_timing_'+tag+'.js') if tag else 'runtime_timing_loopback.js' if loopback else 'runtime_timing_live.js' if live else 'runtime_timing.js'
boxes[0]['box']['text']='js '+runtime_name
seed=ROOT/'dist/Harmonic Quantizer.amxd';dest=OUT/('T1 Loopback Timing.amxd' if loopback else 'T1 Timing Comparison.amxd' if live else 'Native Timing Comparison.amxd')
if tag:dest=OUT/('T1 '+tag+'.amxd')
dest.write_bytes(encode_container(replace_patch(parse_container(seed.read_bytes(),seed),(json.dumps(doc)+'\n').encode()+b'\0')))
runtime=(ROOT/'native/max/runtime_timing.js').read_text()
if live:
    runtime=runtime.replace('outlet(0,1);later(stop,2000)','later(stop,10000)')
    runtime=runtime.replace('tetrachords-native-timing.json','tetrachords-t1-timing.json')
    runtime=runtime.replace('if(!active)return;ins++;','sawInput=true;if(!active)return;ins++;')
    runtime=runtime.replace('later(begin,100);','later(waitForInput,100);')
    runtime+='\nvar sawInput=false;\nfunction waitForInput(){if(sawInput)begin();else {outlet(5,"set","Waiting for T-1 note input — software-only test");later(waitForInput,100);}}\n'
if tag:
    runtime=runtime.replace('later(stop,10000)','later(stop,4000)')
    runtime=runtime.replace('tetrachords-t1-timing.json','tetrachords-t1-'+tag+'.json')
(OUT/runtime_name).write_text(runtime)
legacy=(ROOT/'tests/reference/harmonic_quantizer_legacy.js').read_text()
for key in ['tetrachords_harmony_v1','tetrachords_ensemble_v1','tetrachords_motion_v1']:legacy=legacy.replace(key,'codex_timing_'+key)
legacy=legacy.replace('/private/tmp/harmonic_quantizer_trace.tsv','/private/tmp/codex_native_timing_legacy.tsv')
(OUT/'timing_legacy.js').write_text(legacy)
assert loopback or not any(b['box']['text']=='midiout' for b in boxes)
print(dest)
