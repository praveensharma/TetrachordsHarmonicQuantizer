"""Read-only recorded-clip A/B onset analysis; not absolute physical latency."""
import argparse
import gzip
import json
from pathlib import Path
import subprocess
import tempfile
import wave
import xml.etree.ElementTree as ET
import numpy as np


def attack_offsets(audio, sr, expected, window_ms=5):
    hop=max(1,round(sr*.0005))
    energy=np.mean(audio*audio,axis=1)
    power=energy[:len(energy)//hop*hop].reshape(-1,hop).mean(axis=1)
    integral=np.r_[0,np.cumsum(power)]
    width=round(window_ms*.001*sr/hop)
    index=np.arange(width,len(power)-width)
    rise=np.log((integral[index+width]-integral[index]+1e-8)/
                (integral[index]-integral[index-width]+1e-8))
    results=[]
    for seconds in expected:
        candidates=np.flatnonzero(abs(index*hop/sr-seconds)<=.035)
        if not len(candidates):raise ValueError('Note outside audio/search region')
        best=candidates[np.argmax(rise[candidates])]
        results.append(dict(expectedSeconds=seconds,onsetSeconds=float(index[best]*hop/sr),
                            offsetMs=float((index[best]*hop/sr-seconds)*1000),
                            energyRiseLogRatio=float(rise[best])))
    return results


def analyze(set_path):
    root=ET.fromstring(gzip.open(set_path,'rb').read())
    tracks={t.find('Name/EffectiveName').get('Value'):t for t in root.findall('.//Tracks/*')
            if t.find('Name/EffectiveName') is not None}
    midi=tracks['New MIDI Track'].findall('./DeviceChain/MainSequencer/ClipTimeable/ArrangerAutomation/Events/MidiClip')
    audio=tracks['New Audio Track'].findall('./DeviceChain/MainSequencer/Sample/ArrangerAutomation/Events/AudioClip')
    tempo_node=root.find('.//MainTrack/DeviceChain/Mixer/Tempo/Manual')
    if tempo_node is None:tempo_node=root.find('.//MasterTrack/DeviceChain/Mixer/Tempo/Manual')
    tempo=float(tempo_node.get('Value'))
    report={'scope':'Recorded audio versus recorded input MIDI; not absolute latency',
            'set':str(set_path),'tempo':tempo,'onsetResolutionMs':.5,'searchRadiusMs':35,'takes':[]}
    for clip in audio:
        color=int(clip.find('Color').get('Value'))
        if color not in (18,14):continue
        reference=next(c for c in midi if c.find('CurrentStart').get('Value')==clip.find('CurrentStart').get('Value'))
        assert float(reference.find('Loop/LoopStart').get('Value'))==0
        assert float(clip.find('Loop/LoopStart').get('Value'))==0
        markers=clip.findall('WarpMarkers/WarpMarker')
        assert len(markers)==2 and float(markers[0].get('SecTime'))==0 and float(markers[0].get('BeatTime'))==0
        assert abs(float(markers[1].get('SecTime'))/float(markers[1].get('BeatTime'))-60/tempo)<1e-9
        notes=sorted((float(n.get('Time')),int(k.find('MidiKey').get('Value')))
                     for k in reference.findall('Notes/KeyTracks/KeyTrack') for n in k.findall('Notes/MidiNoteEvent'))
        source=Path(clip.find('.//SampleRef/FileRef/Path').get('Value'))
        with tempfile.TemporaryDirectory(prefix='tetrachords-audio-analysis-') as tmp:
            target=Path(tmp)/'analysis.wav'
            subprocess.run(['afconvert','-f','WAVE','-d','LEI16',str(source),str(target)],check=True)
            with wave.open(str(target)) as stream:
                sr=stream.getframerate();signal=np.frombuffer(stream.readframes(stream.getnframes()),'<i2').reshape(-1,stream.getnchannels())/32768.
        expected=[beat*60/tempo for beat,pitch in notes]
        take={'label':'green/on' if color==18 else 'red/off','audioClip':clip.find('Name').get('Value'),
              'midiClip':reference.find('Name').get('Value'),'source':str(source),'notes':len(notes),
              'inputPitches':[pitch for beat,pitch in notes],'windows':[]}
        estimates=[]
        for seconds in expected:
            segment=signal[int((seconds+.02)*sr):int((seconds+.09)*sr),0]
            spectrum=abs(np.fft.rfft(segment*np.hanning(len(segment)),65536))
            frequencies=np.fft.rfftfreq(65536,1/sr)
            peak=frequencies[np.argmax(spectrum*(frequencies>30))]
            estimates.append(float(69+12*np.log2(peak/440)))
        # Relative comparison only: synth tuning/octave and harmonics can make
        # a dominant spectral peak unsuitable as an absolute pitch measurement.
        take['dominantPeakMidiEstimates']=estimates
        for width in (5,8,10):
            points=attack_offsets(signal,sr,expected,width)
            values=[p['offsetMs'] for p in points]
            take['windows'].append(dict(windowMs=width,medianMs=float(np.median(values)),
                p5Ms=float(np.percentile(values,5)),p95Ms=float(np.percentile(values,95)),
                minMs=min(values),maxMs=max(values),stdMs=float(np.std(values)),
                minimumRiseLogRatio=min(p['energyRiseLogRatio'] for p in points),points=points))
        report['takes'].append(take)
    assert len(report['takes'])==2
    report['identicalInputPitches']=report['takes'][0]['inputPitches']==report['takes'][1]['inputPitches']
    on=next(t for t in report['takes'] if t['label']=='green/on')
    off=next(t for t in report['takes'] if t['label']=='red/off')
    observed=[round(a-b) for a,b in zip(on['dominantPeakMidiEstimates'],off['dominantPeakMidiEstimates'])]
    expected=[0 if p%12 in (0,2,4,5,7,9,11) else 1 for p in on['inputPitches']]
    report['relativePitchCheck']={'observedRoundedSemitoneChanges':observed,
        'expectedCmajorNearestTieUpChanges':expected,'allMatch':observed==expected}
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('set',type=Path);parser.add_argument('--output',type=Path)
    args=parser.parse_args();report=analyze(args.set)
    result=json.dumps(report,indent=2)+'\n'
    if args.output:args.output.write_text(result)
    else:print(result,end='')
