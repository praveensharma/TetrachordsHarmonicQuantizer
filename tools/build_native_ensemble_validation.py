"""Hardware-isolated four-instance native acceptance patch."""
import json,shutil
from pathlib import Path
from build_amxd import parse_container,replace_patch,encode_container
ROOT=Path(__file__).resolve().parent.parent;OUT=ROOT/'native/build/validation';OUT.mkdir(parents=True,exist_ok=True)
boxes=[{'box':dict(id='test',maxclass='newobj',text='js runtime_ensemble_validation.js',numinlets=4,numoutlets=5,patching_rect=[20,280,260,22])},
 {'box':dict(id='label',maxclass='comment',text='Four native voices — testing…',fontsize=16,presentation=1,presentation_rect=[15,15,650,30],patching_rect=[15,15,650,30])}]
lines=[]
for p in range(4):
 boxes.append({'box':dict(id='engine'+str(p),maxclass='newobj',text='tetrachords.quantizer',numinlets=1,numoutlets=2,patching_rect=[20+p*170,200,160,22])})
 lines += [{'patchline':{'source':['test',p],'destination':['engine'+str(p),0]}},
           {'patchline':{'source':['engine'+str(p),0],'destination':['test',p]}}]
lines.append({'patchline':{'source':['test',4],'destination':['label',0]}})
doc={'patcher':dict(fileversion=1,classnamespace='box',rect=[0,0,700,360],devicewidth=690,openinpresentation=1,boxes=boxes,lines=lines)}
template=ROOT/'dist/Harmonic Quantizer.amxd';dest=OUT/'Native Four Voice Acceptance.amxd'
dest.write_bytes(encode_container(replace_patch(parse_container(template.read_bytes(),template),(json.dumps(doc)+'\n').encode()+b'\0')))
shutil.copy2(ROOT/'native/max/runtime_ensemble_validation.js',OUT/'runtime_ensemble_validation.js')
print(dest)
