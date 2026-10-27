"""Production quantizer graph plus an isolated, control-only fixed C-major seed."""
import json
import shutil
from pathlib import Path
from build_amxd import parse_container,replace_patch,encode_container

ROOT=Path(__file__).resolve().parent.parent
OUT=ROOT/'native/build/validation'
OUT.mkdir(parents=True,exist_ok=True)
doc=json.loads((ROOT/'Harmonic_Quantizer/Harmonic Quantizer.maxpat').read_text())
p=doc['patcher']
for entry in p['boxes']:
    box=entry['box']
    if box['id']=='obj-js':box['text']=box['text'].replace('harmonic_quantizer.js','fixed_harmonic_quantizer.js')
    if box['id']=='obj-receive':box['text']='r codex_fixed_scale_test_private_bus'
    if 'harmonic_monitor.js' in box.get('text',''):
        box['text']=box['text'].replace('harmonic_monitor.js','fixed_harmonic_monitor.js')
    if box.get('text')=='Harmonic Quantizer':box['text']='Harmonic Quantizer · Fixed C Major'
p['boxes'].append({'box':{'id':'fixed-scale-setup','maxclass':'newobj','text':'js fixed_scale_setup.js',
 'numinlets':1,'numoutlets':2,'patching_rect':[20,650,220,22]}})
p['lines'].append({'patchline':{'source':['fixed-scale-setup',0],'destination':['obj-js',1]}})
p['lines'].append({'patchline':{'source':['fixed-scale-setup',1],'destination':['obj-js',0]}})
p['dependency_cache']=[]
control=(ROOT/'Harmonic_Quantizer/harmonic_quantizer.js').read_text()
control=control.replace('include("native_harmony_bridge.js")','include("fixed_native_harmony_bridge.js")')
control=control.replace('tetrachords_motion_v1','codex_fixed_scale_motion')
(OUT/'fixed_harmonic_quantizer.js').write_text(control)
bridge=(ROOT/'native/max/native_harmony_bridge.js').read_text().replace('tetrachords_harmony_v1','codex_fixed_scale_harmony')
(OUT/'fixed_native_harmony_bridge.js').write_text(bridge)
shutil.copy2(ROOT/'Harmonic_Quantizer/harmonic_monitor.js',OUT/'fixed_harmonic_monitor.js')
shutil.copy2(ROOT/'native/max/fixed_scale_setup.js',OUT/'fixed_scale_setup.js')
shutil.copytree(ROOT/'native/build/tetrachords.quantizer.mxo',OUT/'tetrachords.quantizer.mxo',dirs_exist_ok=True)
seed=ROOT/'dist/Harmonic Quantizer.amxd'
dest=OUT/'Harmonic Quantizer Fixed Scale Test.amxd'
dest.write_bytes(encode_container(replace_patch(parse_container(seed.read_bytes(),seed),(json.dumps(doc)+'\n').encode()+b'\0')))
# Keep the production note path unmodified; the helper talks only to control inlet.
for a,b in [('obj-midiin','obj-native'),('obj-native','obj-midiout')]:
    assert any(l['patchline']['source']==[a,0] and l['patchline']['destination']==[b,0] for l in p['lines'])
assert [l['patchline']['destination'] for l in p['lines'] if l['patchline']['source'][0]=='fixed-scale-setup']==[['obj-js',1],['obj-js',0]]
print(dest)
