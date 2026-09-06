# Tetrachords Harmonic Quantizer and Chord Tools

This package contains two Max for Live MIDI effects:

1. **Tetrachords Harmony Receiver** — parses the 17-byte SysEx message,
   captures the active chord's MIDI notes, optionally captures an authoritative
   MIDI note field of any size, and publishes one selected valid-note source.
2. **Harmonic Quantizer** — processes any MIDI source against the selected
   Tetrachords pitch collection or exact active chord, preserves each input
   channel, and sends the result to the selected Live MIDI output.

No `All Ins` routing is required.

## Package contents

```text
Tetrachords_Harmony_Receiver/
  Tetrachords Harmony Receiver.maxpat
  tetrachords_harmony_receiver.js

Harmonic_Quantizer/
  Harmonic Quantizer.maxpat
  harmonic_quantizer.js

dist/
  Tetrachords Harmony Receiver.amxd
  Harmonic Quantizer.amxd

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
    Harmonic Quantizer/

  Presets/MIDI Effects/Max MIDI Effect/Imported/
    Harmonic Quantizer.amxd
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
- Enable **Track Input** for the sequencer or controller MIDI port.
- Enable **Track Output** for the FH-2 MIDI port.
- `Remote` is not required for this setup.

Avoid a second direct source-to-hardware route. The quantizer track should be
the only path carrying source notes to the target synth or MIDI/CV converter.

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

For an A/B comparison, Tetrachords may also send a collection of simultaneous
Note Ons on a dedicated channel. Set **Field Ch** to that channel, then switch
**Valid Notes** between **SysEx Intervals** and **MIDI Note Field** while
playback continues. After a 25 ms quiet window, the receiver atomically commits
whatever non-empty Note On burst was sent as a complete replacement field;
ordinary releases do not clear or merge it. Its monitor rows
show the raw SysEx-derived notes, raw MIDI notes, and active source, plus an
`EXACT RAW MATCH`, `SAME PITCH CLASSES`, or `DIFFERENT` comparison.

The track must receive **All Channels** so it can see the chord channel and the
dedicated note-field channel together. The note-field channel is excluded from
chord capture even when **Chord Ch** is set to **all**.

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

## Track 2 — source quantizer / harmonizer

Create a second dedicated MIDI track:

```text
MIDI From:  sequencer or controller MIDI
Channel:    All Channels
Monitor:    In
Device:     Harmonic Quantizer
MIDI To:    synth, MIDI/CV converter, or another hardware target
Channel:    selected in Live
```

Use any source MIDI channels you need. The device processes every incoming note
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
nearest quantization against the selected Tetrachords note collection. Chord
Map is the default mode. This release intentionally replaces the former menu
ordering under the same device identity, so review the Mode once when opening
an older Ableton Set. The menu is ordered and labeled as:

1. `chord-nearest`
2. `scale-nearest`
3. `chord-map`
4. `scale-contour`
5. `stateful-nearest`
6. `scale-up`
7. `scale-down`
8. `scale-map`

### Ensemble Coordination

Use one quantizer instance per melodic part. Set **Ensemble** to the same
number (1–8) on the four tracks and assign unique **Part** numbers 1–4. These
identities are independent of MIDI channels; Ableton still controls routing.
Ensemble 0 is Off and retains the original processing without buffering.
Group, Part and **Separation** are saved Live parameters. Defaults are Off,
Part 1 and Separation 0% so existing tracks opt in explicitly.

Each part publishes its last assigned MIDI pitch, including after Note Off.
This supports CV pitches articulated by separate hardware triggers: the
monitor displays assigned pitches, not which sounds are currently audible.
The four-part monitor shows note names and MIDI numbers, flags exact unisons,
and reports CONFLICT when two devices claim the same Part. Conflicting parts
keep their normal quantized pitches rather than applying separation.

Separation is a soft preference against exact pitch duplication. At 0%, the
original quantizer pitch is retained; increasing it favors a nearby allowed
alternative within six semitones of that pitch. Octave doubling is allowed.
Chord modes choose chord tones; other modes use the active valid collection.
Register boundaries and directional constraints restrict alternatives. The
final separated pitch is the one remembered by Stateful Nearest and paired
with its Note Off. Continuity remains independent on every instance.

Ensemble-enabled instances collect requests for approximately **4 ms** and
resolve each batch in **Part 1 → Part 4** order. Participating parts replace
their old pitch assignments together; idle parts keep theirs. Notes arriving
in the same batch therefore give the same choices regardless of track arrival
order, provided the harmony, settings and prior state match. Notes outside
that window form subsequent batches. Very dense notes within one part use
the pre-delivery quantizer memory; this is intended for four melodic lanes,
not polyphonic voice allocation within one lane.

Note Ons and Note Offs receive the same nominal delay to preserve short gates.
Max scheduler load can add timing jitter; actual Ableton/hardware latency
still needs a listening test. MIDI clock is not buffered. Independently
routed external triggers are not delayed: allow CV to settle before triggering
the envelope. Ensemble Off is available when that timing cannot be accommodated.

**Reset Ensemble** clears all four parts' pitch/continuity memories together,
without releasing held notes or losing their release mappings. Use it before
restarting the same phrase for a controlled A/B. This release has a manual
reset; automatic host-synchronized phrase resets are deferred until the studio
test. Reset Voices remains local. Deleted devices release their membership;
stale members expire after two seconds without a heartbeat. Do not reuse an
ensemble group in two open Sets that should be independent.

First studio test: four KeyStep Pro lanes, Ensemble 1, Parts 1–4,
Stateful Nearest, Continuity 60%, Register Free (or each part's chosen Limited
range). Start with Separation 0%, then try 50%. Reset Ensemble and restart the
source phrase at each A/B endpoint. The same repeating inputs and harmony are
needed to assess reproducibility; live gestures are naturally different.

### Stateful Nearest mode

**stateful-nearest** remembers the final MIDI pitch actually transmitted for
each incoming MIDI channel. It scores every currently legal candidate against
both the new input pitch and that voice's previous output. **Continuity** sets
the balance: 0% is exactly Scale Nearest; higher values favor smaller movement.

On the first Note On after the harmonic version changes, a previous pitch that
remains legal receives a strong but finite common-tone bonus. A clearly
different incoming gesture can still move the voice, and subsequent notes use
ordinary stateful scoring so high continuity does not permanently freeze it.
The status display shows input, previous output, final output, signed movement,
and `[COMMON]` when a common tone was retained. State is independent per MIDI
channel and per device instance. **Reset Voices** clears only that memory;
Panic clears it as part of its broader note-off and controller reset.

Stateful Nearest does not retune an already sounding note when harmony changes.
It makes its transition on the next Note On. The former Scale Smooth algorithm
and its overlapping Sticky alias have been replaced by this mode.

The **Register** menu selects **limited** or **free**. Limited uses the Low/High
window (MIDI 24–48 by default). Free quantizes the harmonic pitch target but
does not fold octaves or apply either register boundary, allowing the source
sequencer to own register completely. Quantizer and receiver presentation
controls are Live parameters: each device instance stores its settings in the
Ableton Set and restores them without load-time defaults overwriting the saved
state.

One four-voice example is:

| Source sequence | MIDI channel | Matriarch destination |
|---|---:|---|
| Oscillator 1 line | 2 | OSC 1 PITCH |
| Oscillator 2 line | 3 | OSC 2 PITCH |
| Oscillator 3 line | 4 | OSC 3 PITCH |
| Oscillator 4 line | 5 | OSC 4 PITCH |

All non-note channel messages pass through unchanged. MIDI clock and other
real-time bytes also pass through. SysEx is passed through unchanged on the
source track.

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
- Chord Map mode maps the source selector pattern through the active MIDI chord.
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
6. Run an ascending chromatic source sequence on one channel.
7. Confirm it arpeggiates the active chord and changes with Tetrachords.
8. Try **voicing**, then add other source channels after the one-channel test.

Use the device's **Panic** button if a downstream synth or converter retains a
stuck note.

## Developer validation

If Node.js is installed, run these from the package root:

```text
node tests/test_quantizer_logic.js
node tests/test_max_js_engines.js
node tests/test_ensemble.js
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
