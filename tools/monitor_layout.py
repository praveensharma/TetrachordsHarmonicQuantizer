"""Read-only feedback, with detailed visualizations on a separate Monitor page."""
import json

def add_monitor(p,receiver):
    cache=p.setdefault('dependency_cache',[])
    if not any(e.get('name')=='harmonic_monitor.js' for e in cache):
        cache.append(dict(name='harmonic_monitor.js',bootpath='.',type='TEXT',implicit=1))
    # Idempotent: generated visualization objects have a dedicated prefix.
    p['boxes']=[e for e in p['boxes'] if not e['box']['id'].startswith('monitor-')]
    p['lines']=[e for e in p['lines'] if not any(e['patchline'][k][0].startswith('monitor-') for k in ('source','destination'))]
    boxes={e['box']['id']:e['box'] for e in p['boxes']}
    pages={'play':[],'monitor':[]}
    for b in boxes.values():
        if not b.get('presentation') or b['id']=='obj-title':continue
        if b['id']=='obj-subtitle':b['presentation']=0;continue
        b.setdefault('varname',b['id'])
        detail=not receiver and b['id'] in ('obj-status','obj-ensemble-monitor')
        pages['monitor' if detail else 'play'].append(b['varname'])
        b['hidden']=int(detail)
        if detail:b['presentation_rect'][1]=145 if b['id']=='obj-status' else 122
        if detail:b['presentation_rect'][3]=19
    def add(id,cls,rect=None,**kw):
        b=dict(id=id,maxclass=cls,numinlets=1,numoutlets=0,patching_rect=rect or [10,1800,180,22],varname=id)
        if rect:b.update(presentation=1,presentation_rect=rect)
        b.update(kw);p['boxes'].append({'box':b});return b
    controller='monitor-detail' if receiver else 'monitor-compact'
    pages['monitor'].append('monitor-detail')
    if not receiver:pages['play'].append('monitor-compact')
    for i,key in enumerate(('play','monitor')):
        add('monitor-'+key+'-tab','textbutton',[p['devicewidth']-180+i*85,7,80,23],text=key.title(),texton=key.title(),mode=0,
            numoutlets=3,outlettype=['','int',''],rounded=7,bgcolor=[.04,.48,1,1] if not i else [.22,.25,.28,1],textcolor=[.91,.93,.94,1],fontsize=11)
        add('monitor-'+key+'-bang','newobj',text='t b',numoutlets=1)
        add('monitor-'+key+'-message','message',text='page '+str(i),numoutlets=1)
        for a,b in [('monitor-'+key+'-tab','monitor-'+key+'-bang'),('monitor-'+key+'-bang','monitor-'+key+'-message'),('monitor-'+key+'-message',controller)]:
            p['lines'].append({'patchline':{'source':[a,0],'destination':[b,0]}})
    config=json.dumps(pages)
    common=dict(filename='harmonic_monitor.js',numoutlets=0,parameter_enable=0,border=0,bgcolor=[0,0,0,0],ignoreclick=1)
    if not receiver:add('monitor-compact','jsui',[15,121,720,43],jsarguments=['compact',config],**common)
    add('monitor-detail','jsui',[15,40 if receiver else 35,760 if receiver else 720,98 if receiver else 85],
        jsarguments=['receiver' if receiver else 'detail',config],hidden=1,**common)
