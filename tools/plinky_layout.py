"""Generate the compact Plinky receiver. No Live/Max UI automation required."""
import json
from performance_layout import ROOT, BG, box, line, parameter

def main():
    p=dict(fileversion=1,appversion=dict(major=9,minor=0,revision=0,architecture='x64',modernui=1),
           classnamespace='box',rect=[100,100,720,169],devicewidth=720,openinpresentation=1,
           bgcolor=BG,boxes=[],lines=[],parameters={})
    p['boxes']=[box('title','comment',[15,8,285,25],text='Plinky Harmony Receiver',fontsize=18,fontface=1),
        box('help','comment',[15,37,690,19],text='Chords NRPN · dedicated Plinky input track · Monitor In · MIDI To: No Output'),
        box('root','comment',[15,59,690,19],text='Root: waiting'),
        box('chord','comment',[15,79,690,19],text='Chord: waiting'),
        box('scale','comment',[15,99,690,19],text='Scale: waiting'),
        box('live-status','comment',[15,119,690,19],text='Live Scale Sync: Off',fontsize=10),
        box('status','comment',[15,142,690,19],text='Waiting for MIDI',fontsize=10),
        parameter('publish','Publish Harmony',[315,10,175,23],0,0,1,['Monitor Only','Publish Harmony']),
        parameter('live_scale_sync','Live Scale Sync',[510,10,195,23],0,0,1,['Live Scale: Off','Live Scale: On']),
        box('midi','newobj',text='midiin',numoutlets=1),
        box('engine','newobj',text='js plinky_harmony_receiver.js',numoutlets=5),
        box('prepend','newobj',text='prepend active',numoutlets=1),
        box('live-send','newobj',text='prepend livescalesync',numoutlets=1),
        box('ready','newobj',text='live.thisdevice',numoutlets=3),
        box('defer','newobj',text='deferlow',numoutlets=1),
        box('init','message',text='init',numoutlets=1)]
    p['lines']=[line('midi','engine'),line('publish','prepend'),line('prepend','engine'),
        line('live_scale_sync','live-send'),line('live-send','engine'),
        line('ready','defer'),line('defer','init'),line('init','engine')]
    for i,name in enumerate(['status','root','chord','scale','live-status']):p['lines'].append(line('engine',name,i))
    p['parameters']['publish']=['Publish Harmony','Publish Harmony',0]
    p['parameters']['live_scale_sync']=['Live Scale Sync','Live Scale Sync',0]
    p['dependency_cache']=[dict(name=n,bootpath='.',type='TEXT',implicit=1) for n in
        ['plinky_harmony_receiver.js','live_scale_bridge.js','live_scale_matcher.js']]
    for e in p['boxes']:
        b=e['box']
        if b.get('presentation'):
            x,y,w,h=b['presentation_rect'];assert x+w<=720 and y+h<=169
    path=ROOT/'Plinky_Harmony_Receiver/Plinky Harmony Receiver.maxpat'
    path.write_text(json.dumps({'patcher':p},indent=2)+'\n')

if __name__=='__main__':main()
