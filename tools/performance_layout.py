"""Generate the Motion controller and add the quantizer's Input page idempotently."""
import json
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
FG=[.91,.93,.94,1]; BG=[.12,.14,.16,1]; FIELD=[.22,.25,.28,1]

def box(id,cls,rect=None,**kw):
    b=dict(id=id,maxclass=cls,varname=id,numinlets=1,numoutlets=0,
           patching_rect=rect or [20,400,160,22],fontname='Arial',fontsize=11,textcolor=FG)
    if rect:b.update(presentation=1,presentation_rect=rect)
    b.update(kw);return {'box':b}

def line(a,b,out=0,inlet=0):return {'patchline':{'source':[a,out],'destination':[b,inlet]}}

def parameter(id,label,rect,initial,low,high,enum=None):
    value=dict(parameter_longname=label,parameter_shortname=label,parameter_type=2 if enum else 0,
               parameter_mmin=low,parameter_mmax=high,parameter_initial_enable=1,parameter_initial=[initial])
    kw={}
    if enum:
        value['parameter_enum']=enum
        kw.update(items=[x for i,s in enumerate(enum) for x in ([',',s] if i else [s])],
                  numoutlets=3,outlettype=['int','',''])
    else:kw.update(minimum=low,maximum=high,numoutlets=2,outlettype=['float','bang'])
    return box(id,'umenu' if enum else 'flonum',rect,parameter_enable=1,bgcolor=FIELD,
               saved_attribute_attributes={'valueof':value},**kw)

def quantizer():
    path=ROOT/'Harmonic_Quantizer/Harmonic Quantizer.maxpat'
    d=json.loads(path.read_text());p=d['patcher']
    p['rect'][3]=169
    p['boxes']=[e for e in p['boxes'] if not e['box']['id'].startswith('performance-')]
    p['lines']=[e for e in p['lines'] if not any(e['patchline'][k][0].startswith('performance-') for k in ('source','destination'))]
    boxes={e['box']['id']:e['box'] for e in p['boxes']}
    boxes['monitor-compact']['presentation_rect']=[15,121,720,43]
    boxes['monitor-detail']['presentation_rect']=[15,35,720,85]
    config=json.loads(boxes['monitor-compact']['jsarguments'][1])
    config['input']=[]
    for id,rect in [('obj-input-label',[15,44,65,18]),('obj-input-behavior-menu',[85,40,170,23]),
                    ('obj-input-stability-label',[280,44,65,18]),('obj-input-stability-number',[350,40,65,23]),
                    ('obj-input-stability-unit',[425,44,25,18])]:
        # Locate by parameter varname for the two controls; labels vary in older patches.
        if id not in boxes:
            continue
        b=boxes[id];b.update(presentation=1,presentation_rect=rect,hidden=1)
        b.setdefault('varname',id)
        config['input'].append(b.get('varname',id))
        for page in ['play','monitor']:
            if b.get('varname',id) in config[page]:config[page].remove(b.get('varname',id))
    id='performance-same-pitch'
    p['boxes'] += [parameter(id,'Same Pitch',[100,80,160,23],0,0,1,['Legato','Retrigger']),
        box('performance-same-label','comment',[15,84,80,18],text='Same Pitch',bgcolor=[0,0,0,0]),
        box('performance-help','comment',[15,115,715,40],text='Retrigger: restart overlapping identical pitches. Older releases cannot cut off the new attack.\nFollow Gate preserves source note lengths; Hold Last Pitch uses Settle for gestures.',bgcolor=[0,0,0,0]),
        box('performance-send','newobj',text='prepend samepitch',numoutlets=1)]
    p['boxes'][-4]['box']['varname']='same_pitch'
    engine=next(b['id'] for b in boxes.values() if b.get('text','').startswith('js harmonic_quantizer.js'))
    p['lines'] += [line(id,'performance-send'),line('performance-send',engine)]
    config['input'] += ['same_pitch','performance-same-label','performance-help']
    for entry in p['boxes']:
        b=entry['box']
        if b.get('varname') in config['input']:b['hidden']=1
    for i,key in enumerate(['play','monitor','input']):
        if key!='input':boxes['monitor-'+key+'-tab']['presentation_rect']=[480+i*85,7,80,23]
        else:
            p['boxes'] += [box('performance-input-tab','textbutton',[650,7,80,23],text='Input',texton='Input',
                mode=0,numoutlets=3,outlettype=['','int',''],rounded=7,bgcolor=FIELD),
                box('performance-input-bang','newobj',text='t b',numoutlets=1),
                box('performance-input-msg','message',text='page 2',numoutlets=1)]
            p['lines'] += [line('performance-input-tab','performance-input-bang'),line('performance-input-bang','performance-input-msg'),line('performance-input-msg','monitor-compact')]
    for id in ['monitor-compact','monitor-detail']:boxes[id]['jsarguments'][1]=json.dumps(config)
    p.setdefault('parameters',{})['performance-same-pitch']=['Same Pitch','Same Pitch',0]
    path.write_text(json.dumps(d,indent=2,ensure_ascii=False)+'\n')

def motion():
    p=dict(fileversion=1,appversion={'major':9,'minor':0,'revision':0,'architecture':'x64','modernui':1},
        classnamespace='box',rect=[100,100,670,169],devicewidth=670,openinpresentation=1,bgcolor=BG,boxes=[],lines=[],parameters={})
    b=p['boxes'];l=p['lines']
    b += [box('title','comment',[15,7,270,25],text='Harmonic Motion',fontsize=17,fontface=1),
          box('subtitle','comment',[15,36,630,20],text='Stateful Nearest · fixed Voice A → D positions, ordered low → high'),
          box('status','comment',[15,140,640,22],text='Waiting',bgcolor=[0,0,0,0]),
          box('engine','newobj',text='js harmonic_motion.js',numoutlets=1),
          box('midi-in','newobj',text='midiin',numoutlets=1),
          box('midi-out','newobj',text='midiout',numoutlets=0),
          box('ready','newobj',text='live.thisdevice',numoutlets=3),
          box('defer','newobj',text='deferlow',numoutlets=1),
          box('init','message',text='init',numoutlets=1)]
    l += [line('ready','defer'),line('defer','init'),line('init','engine'),line('engine','status'),line('midi-in','midi-out')]
    b += [parameter('motion_group','Motion Ensemble',[480,9,170,23],0,0,7,['Ensemble '+c for c in 'ABCDEFGH']),
          box('group-offset','newobj',text='+ 1',numoutlets=1),box('group-send','newobj',text='prepend ensemble',numoutlets=1)]
    l += [line('motion_group','group-offset'),line('group-offset','group-send'),line('group-send','engine')]
    for i in range(4):
        id='motion_bias_'+str(i+1);x=15+i*110
        b += [box(id+'-label','comment',[x,64,105,18],text='Voice '+ 'ABCD'[i]+' Motion'),
              parameter(id,'V'+str(i+1)+' Motion Bias',[x,85,90,23],0,-100,100),
              box(id+'-send','newobj',text='prepend bias '+str(i+1),numoutlets=1)]
        l += [line(id,id+'-send'),line(id+'-send','engine')]
    b += [box('spread-label','comment',[480,64,170,18],text='Spread Motion'),
          parameter('spread_motion','Spread Motion',[480,85,170,23],0,-100,100),
          box('spread-send','newobj',text='prepend spreadmotion',numoutlets=1),
          box('legend','comment',[15,113,430,18],text='−100 Down     0 Neutral     +100 Up'),
          box('spread-legend','comment',[465,113,200,18],text='− Contract    0    + Expand')]
    l += [line('spread_motion','spread-send'),line('spread-send','engine')]
    for e in b:
        item=e['box']
        if item.get('parameter_enable'):
            name=item['saved_attribute_attributes']['valueof']['parameter_longname'];p['parameters'][item['id']]=[name,name,0]
    p['dependency_cache']=[dict(name='harmonic_motion.js',bootpath='.',type='TEXT',implicit=1)]
    target=ROOT/'Harmonic_Motion/Harmonic Motion.maxpat'
    target.write_text(json.dumps({'patcher':p},indent=2)+'\n')

def validate():
    for file in ['Harmonic_Quantizer/Harmonic Quantizer.maxpat','Harmonic_Motion/Harmonic Motion.maxpat']:
        p=json.loads((ROOT/file).read_text())['patcher'];bs={e['box']['id']:e['box'] for e in p['boxes']}
        for b in bs.values():
            if b.get('presentation'):
                x,y,w,h=b['presentation_rect']
                assert x>=0 and y>=0 and x+w<=p['devicewidth'] and y+h<=169,b['id']
        for e in p['lines']:
            l=e['patchline'];a,o=l['source'];b,i=l['destination']
            assert a in bs and b in bs,(a,b)
            assert o<bs[a]['numoutlets'] and i<bs[b]['numinlets'],(a,b)
        print(file+': bounds and graph verified')

if __name__=='__main__':quantizer();motion();validate()
