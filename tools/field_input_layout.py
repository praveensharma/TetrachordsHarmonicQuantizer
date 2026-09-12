"""Generate the small role-specific note-field input device."""
import json
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
def generate():
    boxes=[];lines=[]
    def add(id,cls,text='',rect=None,**kw):
        b=dict(id=id,maxclass=cls,numinlets=1,numoutlets=0 if cls=='comment' else 1,patching_rect=rect or [10,220+len(boxes)*25,240,22])
        if text:b['text']=text
        if rect:b.update(presentation=1,presentation_rect=rect,fontname='Arial',fontsize=11,textcolor=[.91,.93,.94,1],bgcolor=[0,0,0,0])
        b.update(kw);boxes.append({'box':b})
    def link(a,b,out=0):lines.append({'patchline':{'source':[a,out],'destination':[b,0]}})
    add('title','comment','Tetrachords Note Field Input',[15,9,460,25],fontsize=17,fontface=1)
    add('help','comment','Track input: Tetrachords → Ch. 3 · Monitor In · MIDI To: No Output',[15,43,490,22])
    add('status','comment','Waiting for notes',[15,77,490,30])
    add('notes','comment','No field captured yet',[15,110,490,27],textcolor=[.44,.85,.73,1])
    add('footer','comment','Receiver Field input: Separate track · Note Offs do not clear the field',[15,144,490,20],fontsize=10)
    add('in','newobj','midiin');add('engine','newobj','js note_field_input.js',numoutlets=2)
    add('load','newobj','live.thisdevice',numoutlets=3);add('active','newobj','prepend active')
    link('in','engine');link('engine','status');link('engine','notes',1);link('load','active',1);link('active','engine')
    p=dict(fileversion=1,appversion=dict(major=9,minor=0,revision=0,architecture='arm64'),rect=[0,0,760,620],
        openinpresentation=1,devicewidth=520,bgcolor=[.12,.14,.16,1],boxes=boxes,lines=lines,
        dependency_cache=[dict(name='note_field_input.js',bootpath='.',type='TEXT',implicit=1)])
    path=ROOT/'Note_Field_Input/Tetrachords Note Field Input.maxpat'
    path.write_text(json.dumps({'patcher':p},indent=2,ensure_ascii=False)+'\n')

def receiver_transport(p):
    b={e['box']['id']:e['box'] for e in p['boxes']}
    menu=b['obj-valid-channel-menu']
    labels=['off']+[str(i) for i in range(1,17)]+['Separate track']
    menu['items']=[v for i,label in enumerate(labels) for v in ([',',label] if i else [label])]
    menu['saved_attribute_attributes']['valueof'].update(parameter_mmax=17,parameter_enum=labels,parameter_initial=[17])
    menu['presentation_rect']=[100,70,210,23]
    menu['hint']='Separate track receives the Note Field Input device. Numeric choices are legacy in-device MIDI channel filters.'
    b['obj-valid-channel-label']['text']='Field input'
    if 'field-transport' not in b:
        p['boxes'].append({'box':dict(id='field-transport',maxclass='newobj',text='r tetrachords_note_field_v1',numinlets=0,numoutlets=1,patching_rect=[20,2000,240,22])})
        p['lines'].append({'patchline':{'source':['field-transport',0],'destination':['obj-js',0]}})
    # Labels may contain spaces; route menu indices directly to the engine.
    for e in p['lines']:
        if e['patchline']['source'][0]=='obj-valid-channel-menu':e['patchline']['source'][1]=0
