import importlib.util
from pathlib import Path
import unittest

spec=importlib.util.spec_from_file_location('capture_analysis',Path(__file__).resolve().parents[1]/'tools/analyze_t1_loopback.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)

class CaptureAnalysis(unittest.TestCase):
    def row(self,source,t,bytes):
        return dict(source=source,arrivalMs=t,timestampMs=t,unix=t/1000,bytes=bytes)
    def test_fifo_and_future_output_timestamp(self):
        rows=[self.row('T-1',1000,[144,55,100]),self.row('T-1',1001,[144,55,101]),
              dict(self.row('Live output',1002,[144,55,100]),timestampMs=1005),
              self.row('Live output',1003,[144,55,101])]
        report=module.summarize(rows,[dict(path='native',began=0,ended=2)])
        self.assertEqual(report['matchedEvents'],2)
        self.assertEqual(report['unmatchedOutputs'],0)
        self.assertEqual(report['results'][0]['effectiveMs']['max'],5)
        self.assertEqual(report['results'][0]['callbackMs']['max'],2)
    def test_running_status_realtime_and_channel_filter(self):
        rows=[self.row('T-1',1000,[144,55,100,248,56,101,145,60,100])]
        self.assertEqual([(e['pitch'],e['velocity']) for e in module.events(rows)],[(55,100),(56,101)])
    def test_empty_capture_is_not_a_measurement(self):
        report=module.summarize([], [dict(path='native',began=0,ended=2)])
        self.assertEqual(report['results'][0]['samples'],0)
        self.assertIsNone(report['results'][0]['effectiveMs']['median'])

if __name__=='__main__':unittest.main()
