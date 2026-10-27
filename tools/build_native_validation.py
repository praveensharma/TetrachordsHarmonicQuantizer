"""Build an isolated production-graph acceptance device with no MIDI output."""
import json
import shutil
import argparse
from pathlib import Path
from build_amxd import parse_container,replace_patch,encode_container,embedded_patch

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'native/build/validation'
OUT.mkdir(parents=True,exist_ok=True)
parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--legacy-graph',action='store_true');args=parser.parse_args()
source=ROOT/('tests/reference/legacy_quantizer.maxpat' if args.legacy_graph else 'Harmonic_Quantizer/Harmonic Quantizer.maxpat')
patch=json.loads(source.read_text())
p=patch['patcher']
# Test the actual production control script and engine; no external note source.
if not args.legacy_graph:
    p['boxes']=[b for b in p['boxes'] if b['box']['id'] not in ('obj-midiin','obj-midiout')]
    p['lines']=[l for l in p['lines'] if not any(v[0] in ('obj-midiin','obj-midiout') for v in l['patchline'].values() if isinstance(v,list))]
for b in p['boxes']:
    o=b['box']
    if o['id']=='obj-receive':o['text']='r codex_native_validation_harmony_bus'
    if o['id']=='obj-native':o['varname']='native_engine'
    if o['id']=='obj-js':o['varname']='quantizer_control'
p['boxes'].extend([
 {'box':{'id':'validation','maxclass':'newobj','text':'js runtime_validation.js'+(' legacy' if args.legacy_graph else ''),'numinlets':1,'numoutlets':3,'patching_rect':[20,620,230,22]}},
 {'box':{'id':'validation-result','maxclass':'comment','text':'Native acceptance: running…','varname':'validation_result','presentation':1,'presentation_rect':[15,167,720,22],'patching_rect':[15,167,720,22],'textcolor':[0.4,1,0.7,1],'fontsize':12}}
])
connections=[('validation',0,'obj-js',0),('validation',2,'validation-result',0)]
if not args.legacy_graph:connections += [('validation',1,'obj-native',0),('obj-native',0,'validation',0)]
for a,o,b,i in connections:
    p['lines'].append({'patchline':{'source':[a,o],'destination':[b,i]}})
p['dependency_cache']=[]
raw=(json.dumps(patch,indent=2)+'\n').encode()+b'\0'
template=ROOT/'dist/Harmonic Quantizer.amxd'
dest=OUT/('Native Legacy Recall.amxd' if args.legacy_graph else 'Native Acceptance.amxd')
dest.write_bytes(encode_container(replace_patch(parse_container(template.read_bytes(),template),raw)))
assert embedded_patch(parse_container(dest.read_bytes(),dest),dest)==patch
for name in ['harmonic_quantizer.js','harmonic_monitor.js']:
    shutil.copy2(ROOT/'Harmonic_Quantizer'/name,OUT/name)
shutil.copy2(ROOT/'native/max/runtime_validation.js',OUT/'runtime_validation.js')
(OUT/'native_harmony_bridge.js').write_text((ROOT/'native/max/native_harmony_bridge.js').read_text().replace('tetrachords_harmony_v1','codex_native_validation_harmony'))
shutil.copytree(ROOT/'native/build/tetrachords.quantizer.mxo',OUT/'tetrachords.quantizer.mxo',dirs_exist_ok=True)
if not args.legacy_graph:assert not any(b['box'].get('text') in ('midiin','midiout') for b in p['boxes'])
print(dest)
