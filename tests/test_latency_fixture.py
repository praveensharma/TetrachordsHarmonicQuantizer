"""Validate isolated probe graphs and matched experiment without opening Live."""
import json, struct, subprocess, sys, tempfile
from pathlib import Path

root=Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory(prefix='latency-fixture-test-') as temporary:
    temp=Path(temporary);rota=temp/'ROTA'/'src';rota.mkdir(parents=True)
    (rota/'rota_device.js').write_text('var registry=new Global("rota_registry_v1");var bus="rota_events_v1";')
    (rota/'rota_core.js').write_text('// fixture-only build dependency\n')
    for matched in [False,True]:
        output=temp/('matched' if matched else 'original')
        command=[sys.executable,str(root/'tools/build_latency_probe.py'),'--rota-root',str(rota.parent),'--output',str(output)]
        if matched:command.append('--matched')
        subprocess.run(command,check=True,capture_output=True)
        for device in output.glob('*.amxd'):
            data=device.read_bytes();assert data[:4]==b'ampf'
            size=struct.unpack('<I',data[16:20])[0];doc=json.loads(data[20:20+size].rstrip(b'\0'))
            boxes={b['box']['id']:b['box'] for b in doc['patcher']['boxes']}
            for line in doc['patcher']['lines']:
                a,o=line['patchline']['source'];b,i=line['patchline']['destination']
                assert 0<=o<boxes[a]['numoutlets'] and 0<=i<boxes[b]['numinlets']
            if 'Sink' in device.name:assert 'out' not in boxes,'Sink must never forward MIDI'
            assert (' matched' in boxes['probe']['text'])==matched
        q=(output/'latency_quantizer.js').read_text()
        assert '"tetrachords_harmony_v1"' not in q and '"tetrachords_ensemble_v1"' not in q
        assert '"rota_events_v1"' not in (output/'latency_rota.js').read_text()
        assert ('probeBatchOutput' in q)==matched
print('Latency fixtures: portable build, isolated namespaces, valid graphs, non-forwarding sink and test-only batching passed.')
