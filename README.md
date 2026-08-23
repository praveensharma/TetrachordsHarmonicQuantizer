# Tetrachords → OXI Dynamic Quantizer and Chord Harmonizer

This package contains two Max for Live MIDI effects:

1. **Tetrachords Harmony Receiver** — listens only to the Tetrachords USB MIDI
   port, parses the 17-byte SysEx message, captures the active chord's MIDI
   notes, updates Ableton Live's scale/root UI, and publishes both states.
2. **OXI Harmonic Quantizer** — listens only to the OXI USB MIDI port, quantizes
   all incoming MIDI note channels to the current Tetrachords pitch collection
   or maps them through the exact active chord, preserves each input channel,
   and sends the result to the selected Live MIDI output.

No `All Ins` routing is required.

## Package contents

```text
Tetrachords_Harmony_Receiver/
  Tetrachords Harmony Receiver.maxpat
  tetrachords_harmony_receiver.js

OXI_Harmonic_Quantizer/
  OXI Harmonic Quantizer.maxpat
  oxi_harmonic_quantizer.js

dist/
  Tetrachords Harmony Receiver.amxd
  OXI Harmonic Quantizer.amxd

tests/
  test_quantizer_logic.js
  test_max_js_engines.js
```

The `.amxd` files are genuine Max for Live MIDI-effect containers created and
saved through Live Suite's bundled Max editor. The `.maxpat` files are editable
source copies of their patchers.

## Install

The easiest installation is the GUI-free builder, which installs each `.amxd`
beside its companion `.js` file and preserves backups of existing devices:

```bash
python3 tools/build_amxd.py --install
python3 tools/build_amxd.py --verify-installed
```

For a manual installation, copy each file from `dist/` beside the matching
JavaScript source in its own Ableton User Library folder, for example:

```text
User Library/
  Max4Live/
    Tetrachords Harmony Receiver/
    OXI Harmonic Quantizer/

  Presets/MIDI Effects/Max MIDI Effect/Imported/
    OXI Harmonic Quantizer.amxd
```

In Live's browser, open **User Library → Max4Live**, then drag the appropriate
`.amxd` onto a MIDI track. Do not drag the `.maxpat` or `.js` file into Live.

If Max reports that it cannot find a JavaScript file, add the package folder to
Max's File Preferences and reload both devices.

Live Suite already includes the Max for Live editor. A separate standalone Max
purchase is not required to load, use, or edit these devices. In Live 12.2 and
later, select the device's options menu and choose **Edit in Max** when you want
to edit it.

## Ableton MIDI preferences

In **Live Settings → Link, Tempo & MIDI**:

- Enable **Track Input** for the Tetrachords USB MIDI port.
- Enable **Track Input** for the OXI USB MIDI port.
- Enable **Track Output** for the FH-2 MIDI port.
- `Remote` is not required for this setup.

Avoid any second direct OXI → FH-2 route. The quantizer track should be the only
path carrying these four OXI channels to the FH-2.

## Track 1 — Tetrachords receiver

Create a dedicated MIDI track:

```text
MIDI From:  Tetrachords USB MIDI
Channel:    All Channels
Monitor:    In
Device:     Tetrachords Harmony Receiver
MIDI To:    No Output
```

Changing a Tetrachords chord state should update the device status to:

```text
Legal notes: ... | root ... | Live label ...
```

The receiver expects exactly:

```text
F0 77 01 40 01 [8 interval bytes] [root] [mode] [track] F7
```

The eight interval bytes are authoritative. The `mode` byte is used only as a
fallback label when updating Live's scale UI. The octave duplicate in the eight
intervals is removed when building the pitch-class set.

Ordinary chord Note Ons arriving on the same track are captured as the active
chord. Set **Chord Ch** to the Tetrachords MIDI output channel carrying that
chord, or leave it at **all** only when no other Tetrachords note streams reach
this receiver track.

**Chord Hold** defaults to **sysex**. Each valid Tetrachords SysEx begins a fresh
capture, the following chord Note On burst replaces the latched chord, and Note
Offs do not erase it. The previously published chord remains active until the
replacement arrives, so short Tetrachords chord gates do not make Harmonizer
fall back to scale quantization. Choose **gate** only when you deliberately want
the original Note On/Off-following behavior. An 8 ms transition buffer groups
the new chord's Note On burst before publishing it.

The receiver initializes its JavaScript `LiveAPI` only after the left outlet of
`live.thisdevice` reports that the Max device and Live API are fully ready:

```text
live.thisdevice → deferlow → init → js
```

It intentionally does not initialize `LiveAPI` from `loadbang`.

## Track 2 — OXI quantizer / harmonizer

Create a second dedicated MIDI track:

```text
MIDI From:  OXI USB MIDI
Channel:    All Channels
Monitor:    In
Device:     OXI Harmonic Quantizer
MIDI To:    OXI return port, FH-2, or another hardware target
Channel:    selected in Live
```

Use any OXI MIDI channels you need. The device processes every incoming note
and preserves its source channel; Live's MIDI To channel selection determines
the destination channel.

### Chord Map mode

Choose **chord-map** in the Mode menu. Within every input octave, C through B
act as successive selectors into the active Tetrachords chord. Selection wraps
up an octave after every chord tone has been used. Rhythm, velocity, MIDI
channel and Note On/Off identity are preserved.

The **Chord Map** menu has two choices:

- **pitchclass** (recommended): orders unique chord tones from the Tetrachords
  root, so inversions do not change the melodic degree pattern.
- **voicing**: follows the exact MIDI notes and inversion emitted by
  Tetrachords, transposed into the input note's register.

If the active chord is empty, Chord Map temporarily falls back to nearest
quantization against the latest Tetrachords scale. Chord Map remains available
for deliberate pattern transformation and is the default mode.

### Chord Nearest mode

Choose **chord-nearest** to preserve the incoming
melody while constraining each new note to the closest pitch class in the active
Tetrachords chord. Unlike Chord Map, input notes are not reinterpreted as
chord-tone selectors, so an ascending line keeps its contour without selector
wrapping. Equal-distance ties follow the device's existing up/down tie
preference.

If no active chord has been captured, Chord Nearest falls back to ordinary
nearest quantization against the latest eight-note Tetrachords scale. Chord
Map is the default mode. This release intentionally replaces the former menu
ordering under the same device identity, so review the Mode once when opening
an older Ableton Set. The menu is ordered and labeled as:

1. `chord-nearest`
2. `scale-nearest`
3. `chord-map`
4. `scale-contour`
5. `scale-smooth`
6. `scale-up`
7. `scale-down`
8. `scale-map`

The former `sticky` entry was behaviorally identical to `voicelead` and has
been removed.

The default register is MIDI 24–48. Quantizer and receiver presentation
controls are Live parameters: each device instance stores its settings in the
Ableton Set and restores them without load-time defaults overwriting the saved
state.

One four-voice example is:

| OXI sequence | MIDI channel | Matriarch destination |
|---|---:|---|
| Oscillator 1 line | 2 | OSC 1 PITCH |
| Oscillator 2 line | 3 | OSC 2 PITCH |
| Oscillator 3 line | 4 | OSC 3 PITCH |
| Oscillator 4 line | 5 | OSC 4 PITCH |

All non-note channel messages pass through unchanged. MIDI clock and other
real-time bytes also pass through. SysEx is passed through unchanged on the
OXI track.

## FH-2 setup

Create four monophonic MIDI/CV converters:

| Converter | Listen channel | Pitch output | Gate output |
|---|---:|---:|---|
| 1 | 2 | FH-2 output 1 | Disabled / unused |
| 2 | 3 | FH-2 output 2 | Disabled / unused |
| 3 | 4 | FH-2 output 3 | Disabled / unused |
| 4 | 5 | FH-2 output 4 | Disabled / unused |

Configure the four outputs as calibrated 1 V/octave pitch CVs. Patch:

```text
FH-2 output 1 → Matriarch OSC 1 PITCH
FH-2 output 2 → Matriarch OSC 2 PITCH
FH-2 output 3 → Matriarch OSC 3 PITCH
FH-2 output 4 → Matriarch OSC 4 PITCH
```

All four Matriarch oscillator pitch inputs must be patched to break the
Matriarch's normalized pitch-input cascade. Tune the four oscillators to unison
before adding musical octave offsets.

## Behavior

- Scale Nearest mode quantizes to the nearest legal pitch across the MIDI range.
- Chord Nearest mode preserves melodic contour while targeting the closest
  active-chord tone.
- Chord Map mode maps the OXI selector pattern through the active MIDI chord.
- Equal-distance ties go upward by default.
- A Note Off uses the exact output pitch selected for its matching Note On.
- Overlapping source notes that collapse to one output pitch are reference
  counted, preventing the first release from prematurely ending the other note.
- A harmony change does not retune notes that are already held. The next Note On
  uses the new pitch collection.
- If the quantizer loads after the receiver, it reads the latest harmony from a
  shared Max `Global`; live updates also arrive on a named Max receive bus.

## First test

1. Load both devices and set both tracks to **Monitor: In**.
2. Set the receiver's **Chord Ch** to the Tetrachords chord-output channel and
   leave **Chord Hold** at **sysex**.
3. Change a Tetrachords chord and confirm the receiver shows `Active chord`.
4. Confirm the quantizer status shows the same chord notes.
5. Select **chord-map** and **pitchclass**.
6. Run an ascending chromatic OXI sequence on one channel.
7. Confirm it arpeggiates the active chord and changes with Tetrachords.
8. Try **voicing**, then add other OXI channels after the one-channel test.

Use the device's **Panic** button if a downstream synth or converter retains a
stuck note.

## Developer validation

If Node.js is installed, run these from the package root:

```text
node tests/test_quantizer_logic.js
node tests/test_max_js_engines.js
```

The second test mocks the Max JavaScript environment and verifies Tetrachords
SysEx decoding, shared harmony state, Live scale/root calls, note quantization
on all input channels, Note Off mapping, program changes, and SysEx pass-through.

## Important Live Set rule

Use one receiver namespace per Live Set. Both supplied devices intentionally use
the fixed names:

```text
tetrachords_harmony_v1
tetrachords_harmony_bus_v1
```

This lets any number of quantizer instances in the same Max runtime follow the
same Tetrachords harmony.
