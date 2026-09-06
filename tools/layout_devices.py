#!/usr/bin/env python3
"""Reflow existing UI objects into Live's 169px panel, preserving parameters."""
import argparse
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
BG = [0.12, 0.14, 0.16, 1.0]
TEXT = [0.91, 0.93, 0.94, 1.0]
MUTED = [0.66, 0.72, 0.76, 1.0]
FIELD = [0.22, 0.25, 0.28, 1.0]
ACCENT = [0.44, 0.85, 0.73, 1.0]

QUANTIZER = {
    'obj-title': [15, 7, 245, 24],
    'obj-subtitle': [290, 10, 440, 18],
    'obj-mode-label': [15, 38, 40, 18],
    'obj-mode-menu': [60, 35, 165, 23],
    'obj-timing-label': [245, 38, 45, 18],
    'obj-timing-menu': [295, 35, 110, 23],
    'obj-gravity-label': [425, 38, 48, 18],
    'obj-gravity-menu': [478, 35, 90, 23],
    'obj-reset-voices-button': [590, 38, 17, 17],
    'obj-reset-voices-label': [615, 38, 125, 18],
    'obj-harmonizer-label': [15, 67, 68, 18],
    'obj-harmonizer-menu': [85, 64, 130, 23],
    'obj-continuity-label': [235, 67, 72, 18],
    'obj-continuity-number': [310, 64, 50, 23],
    'obj-register-label': [385, 67, 55, 18],
    'obj-register-mode-menu': [445, 64, 80, 23],
    'obj-low-label': [535, 67, 30, 18],
    'obj-low-number': [570, 64, 48, 23],
    'obj-high-label': [630, 67, 34, 18],
    'obj-high-number': [670, 64, 48, 23],
    'obj-ensemble-label': [15, 96, 65, 18],
    'obj-ensemble-number': [85, 93, 50, 23],
    'obj-ensemble-off-label': [140, 96, 55, 18],
    'obj-part-label': [205, 96, 35, 18],
    'obj-part-number': [245, 93, 45, 23],
    'obj-separation-label': [315, 96, 95, 18],
    'obj-separation-number': [410, 93, 50, 23],
    'obj-reset-ensemble-button': [505, 96, 17, 17],
    'obj-reset-ensemble-label': [535, 96, 135, 18],
    'obj-status': [15, 121, 720, 20],
    'obj-ensemble-monitor': [15, 145, 720, 19],
}
RECEIVER = {
    'obj-title': [15, 7, 310, 24],
    'obj-subtitle': [345, 10, 550, 18],
    'obj-valid-source-label': [15, 43, 80, 18],
    'obj-valid-source-menu': [100, 40, 210, 23],
    'obj-valid-channel-label': [15, 73, 80, 18],
    'obj-valid-channel-menu': [100, 70, 80, 23],
    'obj-chord-channel-label': [15, 103, 80, 18],
    'obj-chord-channel-menu': [100, 100, 70, 23],
    'obj-chord-hold-label': [185, 103, 65, 18],
    'obj-chord-hold-menu': [250, 100, 65, 23],
    'obj-derived-monitor': [335, 40, 560, 23],
    'obj-midi-valid-monitor': [335, 69, 560, 23],
    'obj-active-valid-monitor': [335, 98, 560, 34],
    'obj-status': [15, 140, 880, 23],
}

def update(relative, positions, width, receiver=False):
    path = ROOT / relative
    doc = json.loads(path.read_text())
    patch = doc['patcher']
    patch.update(devicewidth=width, bgcolor=BG, openinpresentation=1)
    boxes = {entry['box']['id']: entry['box'] for entry in patch['boxes']}
    for box in boxes.values():
        if box.get('presentation'):
            box['presentation'] = int(box['id'] in positions)
    for id, rect in positions.items():
        box = boxes[id]
        box.update(presentation=1, presentation_rect=rect, fontsize=11.0,
                   fontname='Arial', textcolor=TEXT)
        if box['maxclass'] == 'comment' and id != 'obj-status' and 'monitor' not in id:
            box['textcolor'] = MUTED
        elif box['maxclass'] in ('message', 'number', 'umenu'):
            box.update(bgcolor=FIELD)
        elif box['maxclass'] == 'button':
            box.update(bgcolor=FIELD, color=ACCENT)
        if box['maxclass'] == 'message':
            # Readouts are text labels, not Max message buttons. This avoids
            # the host's message-box gradient and quoted-symbol decoration.
            box.update(maxclass='comment', numinlets=1, numoutlets=0,
                       bgcolor=[0.0, 0.0, 0.0, 0.0], ignoreclick=1)
            box.pop('outlettype', None)
            box['text'] = box.get('text', '').removeprefix('set ').strip('"')
    boxes['obj-title'].update(fontsize=16.0, fontface=1, textcolor=TEXT)
    boxes['obj-subtitle'].update(fontsize=10.0)
    if receiver:
        boxes['obj-subtitle']['text'] = 'HARMONIC INPUT  /  Compare SysEx intervals with incoming MIDI notes'
        boxes['obj-chord-hold-label']['text'] = 'Hold'
        boxes['obj-valid-channel-label']['text'] = 'MIDI field ch'
        boxes['obj-active-valid-monitor'].update(linecount=2, textcolor=ACCENT)
        boxes['obj-valid-source-menu']['hint'] = 'Select the active valid-note collection. Both sources remain visible for comparison.'
        boxes['obj-valid-channel-menu']['hint'] = 'Dedicated MIDI note-field input channel. Off retains the last complete field.'
        boxes['obj-chord-hold-menu']['hint'] = 'SysEx latches each chord update; Gate follows Note On/Off lengths.'
    else:
        boxes['obj-subtitle']['text'] = 'PITCH  /  REGISTER  /  ENSEMBLE'
        boxes['obj-ensemble-monitor']['textcolor'] = ACCENT
        boxes['obj-continuity-number']['hint'] = 'Stateful Nearest: 0% is nearest-note quantization; higher values favor continuity.'
        boxes['obj-register-mode-menu']['hint'] = 'Free bypasses register boundaries. Limited uses the existing mode-specific Low/High behavior.'
        boxes['obj-ensemble-number']['hint'] = '0 = Off. Use the same group on coordinated parts. Enabled groups add a 4 ms collection window.'
        boxes['obj-part-number']['hint'] = 'Choose a unique Part 1–4 within the ensemble.'
        boxes['obj-separation-number']['hint'] = 'Soft preference against exact unisons. 0% preserves the independent quantizer result.'
        boxes['obj-reset-voices-button']['hint'] = 'Clear local voice memory; held-note releases remain intact.'
        boxes['obj-reset-ensemble-button']['hint'] = 'Clear pitch memory for every part in this ensemble.'
        # The engine already emits `set text`. Sending it to inlet 1 displayed
        # the literal command; inlet 0 processes it as a display update.
        for entry in patch['lines']:
            line = entry['patchline']
            if line['destination'][0] == 'obj-status':
                line['destination'][1] = 0
    path.write_text(json.dumps(doc, indent=2, ensure_ascii=False) + '\n')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--check', action='store_true', help='Validate installed-source presentation bounds without editing')
    args = parser.parse_args()
    files = [('Harmonic_Quantizer/Harmonic Quantizer.maxpat', QUANTIZER, 750, False),
             ('Tetrachords_Harmony_Receiver/Tetrachords Harmony Receiver.maxpat', RECEIVER, 910, True)]
    for relative, positions, width, receiver in files:
        if not args.check:
            update(relative, positions, width, receiver)
        patch = json.loads((ROOT / relative).read_text())['patcher']
        for entry in patch['boxes']:
            box = entry['box']
            if box.get('presentation'):
                x, y, w, h = box['presentation_rect']
                assert 0 <= x and 0 <= y and x + w <= patch['devicewidth'] and y + h <= 169, box['id']
        if not receiver:
            assert all(entry['patchline']['destination'][1] == 0 for entry in patch['lines']
                       if entry['patchline']['destination'][0] == 'obj-status')
        print(relative + ': presentation bounds verified')
