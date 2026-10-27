"""Match read-only CoreMIDI T-1/Live captures. Excludes FH-2 and audio."""
import argparse
import collections
import json
import math
from pathlib import Path


def events(rows):
    states = {}
    for row in rows:
        source = row.get('source')
        if source not in ('T-1', 'Live output'):
            continue
        state = states.setdefault(source, {'status': None, 'data': []})
        for byte in row.get('bytes', []):
            if byte >= 248:
                continue
            if byte & 128:
                state['status'] = byte if byte < 240 else None
                state['data'] = []
                continue
            status = state['status']
            if status is None:
                continue
            state['data'].append(byte)
            size = 1 if status & 240 in (192, 208) else 2
            if len(state['data']) < size:
                continue
            data = state['data']
            state['data'] = []
            if status & 15 or status & 240 not in (128, 144):
                continue
            yield dict(row, kind='on' if status & 240 == 144 and data[1] else 'off',
                       pitch=data[0], velocity=data[1])


def summarize(rows, phases):
    pending = collections.defaultdict(collections.deque)
    pairs = []
    extras = 0
    counts = collections.Counter()
    for event in events(rows):
        # The listener starts before Live is routed. Do not pair output with
        # the unrelated backlog captured while the test track had No Output.
        if phases and event['unix'] < phases[0]['began']:
            continue
        key = event['kind'], event['pitch']
        counts[event['source'], event['kind']] += 1
        if event['source'] == 'T-1':
            pending[key].append(event)
            continue
        # Same-pitch repeated events are FIFO, never collapsed. A long gap is
        # unmatchable rather than attributed to implausible processor latency.
        while pending[key] and event['arrivalMs'] - pending[key][0]['arrivalMs'] > 1000:
            pending[key].popleft()
        if not pending[key]:
            extras += 1
            continue
        incoming = pending[key].popleft()
        origin = incoming['timestampMs'] or incoming['arrivalMs']
        scheduled = event['timestampMs'] or event['arrivalMs']
        pairs.append(dict(unix=incoming['unix'], kind=event['kind'],
                          callbackMs=event['arrivalMs']-origin,
                          scheduledMs=scheduled-origin,
                          effectiveMs=max(scheduled,event['arrivalMs'])-origin))
    result = []
    for phase in phases:
        # Avoid switches and their deliberate Panic / orphan Off transitions.
        sample = [p for p in pairs if p['kind']=='on' and phase['began']+.3 <= p['unix'] <= phase['ended']-.3]
        summary = {'path':phase['path'], 'samples':len(sample)}
        for metric in ('callbackMs','scheduledMs','effectiveMs'):
            values = sorted(p[metric] for p in sample)
            summary[metric] = {name: values[min(len(values)-1,max(0,math.ceil(q*len(values))-1))] if values else None
                               for name,q in [('median',.5),('p95',.95),('p99',.99),('max',1)]}
        result.append(summary)
    return {'scope':'T-1 CoreMIDI ingress timestamp to Live software MIDI destination; excludes upstream USB travel, FH-2 and audio',
            'counts':{f'{source} {kind}':count for (source,kind),count in counts.items()},
            'unmatchedOutputs':extras,'matchedEvents':len(pairs),'results':result}


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('capture'); parser.add_argument('phases')
    parser.add_argument('--output',type=Path,help='Save generated diagnostic JSON')
    args = parser.parse_args()
    with open(args.capture) as stream:
        rows = [json.loads(line) for line in stream]
    with open(args.phases) as stream:
        phases = json.load(stream)['results']
    report=json.dumps(summarize(rows, phases), indent=2)+'\n'
    if args.output:args.output.write_text(report)
    else:print(report,end='')
