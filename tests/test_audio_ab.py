import importlib.util
from pathlib import Path
import unittest
import numpy as np
spec=importlib.util.spec_from_file_location('audio_ab',Path(__file__).resolve().parents[1]/'tools/analyze_audio_ab.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class OnsetAnalysis(unittest.TestCase):
    def test_known_envelope_delay_at_two_pitches(self):
        sr=48000;t=np.arange(sr)/sr;expected=[.2,.6];signal=np.zeros(sr)
        for start,hz in zip(expected,[220,330]):
            age=t-(start+.008);env=np.where((age>=0)&(age<.1),np.exp(-np.maximum(age,0)*20),0)
            signal+=np.sin(2*np.pi*hz*t)*env
        result=module.attack_offsets(np.column_stack([signal,signal]),sr,expected)
        for point in result:self.assertLess(abs(point['offsetMs']-8),1.5)

if __name__=='__main__':unittest.main()
