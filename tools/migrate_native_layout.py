"""Mechanical MIDI graph migration; leaves all existing parameter/UI IDs intact."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def migrate():
    path = ROOT / 'Harmonic_Quantizer/Harmonic Quantizer.maxpat'
    patch = json.loads(path.read_text())
    p = patch['patcher']
    if not any(b['box']['id']=='native-panic-button' for b in p['boxes']):
        p['boxes'].append({'box':dict(id='native-panic-button',varname='native-panic-button',
            maxclass='textbutton',text='Panic',texton='Panic',mode=0,numinlets=1,numoutlets=3,
            patching_rect=[410,7,60,23],presentation=1,presentation_rect=[410,7,60,23],
            rounded=7,bgcolor=[0.65,0.15,0.18,1],textcolor=[1,1,1,1],fontsize=11)})
        p['boxes'].append({'box':dict(id='native-panic-bang',maxclass='newobj',text='t b',
            numinlets=1,numoutlets=1,patching_rect=[410,250,45,22])})
        for a,b in [('native-panic-button','native-panic-bang'),('native-panic-bang','obj-panic')]:
            p['lines'].append({'patchline':{'source':[a,0],'destination':[b,0]}})
    if any(b['box']['id'] == 'obj-native' for b in p['boxes']):
        path.write_text(json.dumps(patch,indent=2)+'\n')
        return
    p['boxes'].append({'box': dict(id='obj-native', maxclass='newobj', numinlets=1,
        numoutlets=2, outlettype=['int',''], patching_rect=[480,105,180,22], text='tetrachords.quantizer')})
    p['boxes'].append({'box': dict(id='obj-native-active', maxclass='newobj', numinlets=1,
        numoutlets=1, outlettype=[''], patching_rect=[480,140,130,22], text='prepend active')})
    for item in p['lines']:
        line = item['patchline']
        if line['source'][0] == 'obj-midiin':
            line['destination'] = ['obj-native',0]
        if line['source'] == ['obj-js',0] and line['destination'][0] == 'obj-midiout':
            line['source'] = ['obj-native',0]
    for source,dest in [(['obj-js',0],['obj-native',0]),(['obj-native',1],['obj-js',0]),
                        (['obj-thisdevice',1],['obj-native-active',0]),(['obj-native-active',0],['obj-native',0]),
                        (['obj-thisdevice',0],['obj-init',0])]:
        p['lines'].append({'patchline': {'source':source,'destination':dest}})
    p['dependency_cache'] = [d for d in p.get('dependency_cache',[]) if d.get('name')!='tetrachords.quantizer.mxo']
    p['dependency_cache'].append({'name':'tetrachords.quantizer.mxo','type':'iLaX'})
    path.write_text(json.dumps(patch,indent=2)+'\n')


if __name__ == '__main__':
    migrate()
