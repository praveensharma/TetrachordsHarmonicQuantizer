"""Build temporary, private-bus Live latency fixtures; never edit production devices."""
import argparse, json, struct
from pathlib import Path

HERE=Path(__file__).resolve().parent
ROOT=HERE.parent
parser=argparse.ArgumentParser(description=__doc__)
parser.add_argument('--rota-root',type=Path,default=ROOT.parent/'ROTA',help='Sibling ROTA checkout (or explicit checkout path)')
parser.add_argument('--output',type=Path,default=ROOT/'latency-probe')
parser.add_argument('--matched',action='store_true',help='Matched-topology bypass/quantizer/batched test; experimental batching is test-only')
args=parser.parse_args()
ROTA=args.rota_root.resolve()
if not (ROTA/'src/rota_device.js').is_file():
    parser.error('ROTA source not found; pass --rota-root /path/to/ROTA')
OUT=args.output
OUT.mkdir(exist_ok=True)
(OUT/'latency_live_probe.js').write_bytes((HERE/'latency_live_probe.js').read_bytes())
q=(ROOT/'tests/reference/harmonic_quantizer_legacy.js').read_text()
q=q.replace('tetrachords_harmony_v1','codex_latency_harmony').replace('tetrachords_ensemble_v1','codex_latency_ensemble').replace('tetrachords_motion_v1','codex_latency_motion')
q=q.replace('/private/tmp/harmonic_quantizer_trace.tsv','/private/tmp/codex_latency_quantizer_trace.tsv')
if args.matched:
    q+='''\n// Isolated experiment only: NEVER installed as the production quantizer.\nvar probeBatchOutput=false;\nvar probeOriginalSend=send_midi3;\nfunction probebatch(v){probeBatchOutput=!!v;}\nsend_midi3=function(s,a,b){if(probeBatchOutput){outlet(0,[s&255,a&127,b&127]);}else{probeOriginalSend(s,a,b);}};\n'''
(OUT/'latency_quantizer.js').write_text(q)
r=(ROTA/'src/rota_device.js').read_text()
for key in ['rota_registry_v1','rota_registry_v2','rota_events_v1','rota_events_v2']:
    r=r.replace(key,'codex_latency_'+key)
(OUT/'latency_rota.js').write_text(r)
(OUT/'rota_core.js').write_bytes((ROTA/'src/rota_core.js').read_bytes())

for role in ['sender','worker','sink']:
    boxes=[];lines=[]
    def add(id,cls,text='',ins=1,outs=1,**kw):
        b=dict(id=id,maxclass=cls,numinlets=ins,numoutlets=outs,patching_rect=[20,200+len(boxes)*24,250,22],**kw)
        if text:b['text']=text
        boxes.append({'box':b});return b
    def link(a,b,o=0,i=0):lines.append({'patchline':{'source':[a,o],'destination':[b,i]}})
    add('probe','newobj','js latency_live_probe.js '+role+(' matched' if args.matched else ''),outs=5)
    add('clock','newobj','cpuclock');add('stamp','newobj','prepend stamp')
    if role!='worker':link('probe','clock');link('clock','stamp');link('stamp','probe')
    add('ready','newobj','live.thisdevice',outs=3);add('init','message','init');link('ready','init');link('init','probe')
    add('status','comment','Isolated latency '+role,outs=0,presentation=1,presentation_rect=[10,45,660,22])
    add('route-status','newobj','route routeafter',outs=2);link('probe','route-status',4);link('route-status','status',1)
    if role=='sender':
        add('start','textbutton',texton='START',presentation=1,presentation_rect=[10,10,100,25],mode=0)
        boxes[-1]['box']['text']='START';add('startbang','newobj','t b');add('startmsg','message','start')
        link('start','startbang');link('startbang','startmsg');link('startmsg','probe')
        add('out','newobj','midiout',outs=0);link('probe','out',1)
    else:
        add('in','newobj','midiin',ins=0);link('in','probe')
        add('rota','newobj','js latency_rota.js '+('out' if role=='sink' else 'in'),ins=2,outs=2)
        add('bus','newobj','r codex_latency_rota_events_v1');link('bus','rota',i=1)
        link('probe','rota',3,1)
        if role=='sink':link('rota','probe')
        else:
            add('gate','newobj','gate 3 1',ins=2,outs=3);link('probe','gate');link('probe','gate',1,1)
            add('quant','newobj','js latency_quantizer.js',ins=2,outs=3);link('probe','quant',2,1)
            add('after','newobj','gate 2 1',ins=2,outs=2);link('route-status','after')
            add('out','newobj','midiout',outs=0);link('gate','out');link('gate','quant',1);link('gate','rota',2)
            link('quant','after',0,1);link('after','out');link('after','rota',1)
    doc={'patcher':dict(fileversion=1,appversion=dict(major=9,minor=0,revision=10,architecture='x64'),classnamespace='box',rect=[100,100,700,169],devicewidth=690,openinpresentation=1,boxes=boxes,lines=lines)}
    raw=(json.dumps(doc)+'\n').encode()+b'\0'
    name='Codex Latency '+role.title()+'.amxd'
    (OUT/name).write_bytes(bytes.fromhex('616d7066040000006d6d6d6d')+b'ptch'+struct.pack('<I',len(raw))+raw)
print(OUT)
