# Tetrachords Harmonic Quantizer and Chord Tools

This repository includes **Plinky12 Chords support** as well as Tetrachords.
The v1.0.0-beta.1 package contains five Max for Live MIDI effects:

1. **Tetrachords Harmony Receiver** — parses the 17-byte SysEx message,
   captures the active chord's MIDI notes, optionally captures an authoritative
   MIDI note field of any size, and publishes one selected valid-note source.
2. **Harmonic Quantizer** — processes any MIDI source against the selected
   Tetrachords pitch collection or exact active chord, preserves each input
   channel, and sends the result to the selected Live MIDI output.
3. **Tetrachords Note Field Input** — captures the optional dedicated
   Tetrachords MIDI note-field track and forwards atomic bursts to the receiver.
4. **Plinky Harmony Receiver** — decodes Chords root/chord/scale NRPN updates
   into the same shared harmonic state. Use one active harmony publisher.
5. **Harmonic Motion** — optional ensemble voice-motion controls for the
   stateful quantizer; it does not generate MIDI notes itself.

Use either Tetrachords or Plinky as the harmonic authority, not both at once.
The quantizer device names do not change when switching harmony sources.
No `All Ins` routing is required.

## Start here

Download the complete runtime ZIP from the
[v1 beta release](https://github.com/praveensharma/TetrachordsHarmonicQuantizer/releases/tag/v1.0.0-beta.1).
Extract it and read `INSTALL.txt`. Keep **every file in `Devices/` together**:
the AMXDs require the adjacent JavaScript files. Download the runtime ZIP asset,
not GitHub's automatically generated Source code ZIP, for ready-to-load devices.

| Device | Put it on | What it does |
| --- | --- | --- |
| Tetrachords Harmony Receiver | Dedicated Tetrachords chord/state track | Publishes harmonic state; optionally follows the separate MIDI note field |
| Tetrachords Note Field Input | Dedicated Tetrachords valid-note track | Collects a Note On burst and sends it to the Harmony Receiver |
| Plinky Harmony Receiver | Dedicated Plinky12 Chords metadata track | Publishes root, chord and scale from NRPN messages; replaces the Tetrachords receiver path |
| Harmonic Quantizer | Each melodic source/destination lane | Transforms incoming pitches using the active receiver's harmony |
| Harmonic Motion | A convenient MIDI track | Optional directional-motion controller for an ensemble of Stateful Nearest quantizers |

The receiver tracks are **control inputs**, not synth-note output tracks. Use a
separate track to forward original hardware chords to a synth. Start with one
receiver and one quantizer before adding ensemble coordination or ROTA.

Jump to [installation](#install), [Tetrachords setup](#tetrachords-harmony-receiver),
[Plinky12 setup](#plinky-harmony-receiver--plinky12-chords),
[quantizer modes/input](#harmonic-quantizer), [ensemble](#ensemble-coordination),
[Harmonic Motion](#harmonic-motion), [ROTA](#rota-integration-separate-repository),
or [first test / troubleshooting](#first-test-and-troubleshooting).

See [Voice Separation v2](docs/VOICE_SEPARATION.md) for coordinated scoring,
active-pitch semantics, and the ROTA integration boundary.
See [current beta notes](docs/RELEASE_NOTES.md),
[Plinky setup](docs/PLINKY_HARMONY_RECEIVER.md),
[Voice Leading v3](docs/VOICE_LEADING_V3.md), and
[measured latency and limitations](docs/LATENCY_AUDIT.md).

## Package contents

```text
Tetrachords_Harmony_Receiver/
  Tetrachords Harmony Receiver.maxpat
  tetrachords_harmony_receiver.js
  live_scale_matcher.js
  live_scale_bridge.js

Note_Field_Input/
  Tetrachords Note Field Input.maxpat
  note_field_input.js

Plinky_Harmony_Receiver/
  Plinky Harmony Receiver.maxpat
  plinky_harmony_receiver.js

Harmonic_Motion/
  Harmonic Motion.maxpat
  harmonic_motion.js

Harmonic_Quantizer/
  Harmonic Quantizer.maxpat
  harmonic_quantizer.js

dist/
  Tetrachords Harmony Receiver.amxd
  Harmonic Quantizer.amxd
  Tetrachords Note Field Input.amxd
  Plinky Harmony Receiver.amxd
  Harmonic Motion.amxd
  ...all required JavaScript sidecars

tests/
  test_live_scale_sync.js
  test_quantizer_logic.js
  test_max_js_engines.js
```

The `.amxd` files are genuine Max for Live MIDI-effect containers built from the
committed container seeds and editable `.maxpat` source patches. They are not
frozen: keep their companion JavaScript files beside them.

## Install

The easiest installation is the GUI-free builder, which installs each `.amxd`
beside its companion `.js` file and preserves backups of existing devices:

```bash
python3 tools/build_amxd.py
python3 tools/build_amxd.py --verify-dist
python3 tools/build_amxd.py --install
python3 tools/build_amxd.py --verify-installed
```

Installation also rebuilds `dist/` first, then installs those exact AMXD bytes.
Building/verifying `dist/` alone does not touch your User Library or running Set.
No Max editor is needed. Python 3.10+ and Node.js are used for build/tests.

For a portable manual bundle, copy **all files in `dist/` together** into one
new User Library folder. Do not copy only an AMXD: the monitor, scale bridge,
matcher and device JavaScript dependencies are required. Reopen/reload devices
to adopt changed scripts/patch definitions, and back up working Sets first.

Run all automated checks before sharing a build:

```bash
python3 tools/build_amxd.py --verify-dist
python3 tests/test_distribution.py
python3 tests/test_latency_fixture.py
for test in tests/test_*.js; do node "$test" || exit 1; done
```

For manual installation, use a single folder containing the entire `dist/`
collection (or the release ZIP's entire `Devices/` collection), for example:

```text
User Library/
  Presets/MIDI Effects/Max MIDI Effect/Harmonic Tools/
    ...all five AMXDs and all eight JavaScript files
```

In Live's browser, navigate to your chosen User Library folder and drag the appropriate
`.amxd` onto a MIDI track. Do not drag the `.maxpat` or `.js` file into Live.

If Max reports that it cannot find a JavaScript file, first check that every
sidecar is beside the AMXDs. If needed, add that folder to Max's File Preferences
and reload the affected devices. Avoid multiple older copies on Max's search path.

These devices require Live with Max for Live. Development/testing used Live 12
Beta and Max 9; other combinations are not certified by this beta. No Max editor
or standalone Max installation is needed for the normal load-and-play workflow.
Existing Sets can retain older embedded patches: back up the Set, reload/replace
updated devices, check settings and routing, then save a copy. Replacing a library
file alone is not proof that an existing instance updated.

## Ableton MIDI preferences

In **Live Settings → Link, Tempo & MIDI**:

- Enable **Track Input** for your chosen harmony source: Tetrachords or Plinky.
- Enable **Track Input** for the sequencer or controller MIDI port.
- Enable **Track Output** for the actual hardware target (FH-2, synth, etc.).
- `Remote` is not required for this setup.

Avoid a second direct source-to-hardware route. The quantizer track should be
the only path carrying source notes to the target synth or MIDI/CV converter.

## Tetrachords Harmony Receiver

Create a dedicated MIDI track:

```text
MIDI From:  Tetrachords USB MIDI
Channel:    Ch. 1 (Tetrachords chord output)
Monitor:    In
Device:     Tetrachords Harmony Receiver
MIDI To:    No Output
```

Change harmony on Tetrachords and check the receiver's Play/Monitor readouts:
the root/SysEx collection and active chord should update. Chord notes arrive
as ordinary MIDI Note Ons; the SysEx intervals are a separate source of valid
notes, not a substitute for the active MIDI chord.

The receiver expects exactly:

```text
F0 77 01 40 01 [8 interval bytes] [root] [mode] [track] F7
```

The eight interval bytes are authoritative only when **Valid Notes** is set to
**SysEx Intervals**. The `mode` byte remains a fallback label for legacy/debug
display. When **MIDI Note Field** is selected, that independently captured
collection is authoritative and may intentionally differ from SysEx. The raw
MIDI collection retains register and duplicate pitch classes; algorithms that
need pitch classes derive them downstream.

For an A/B comparison, Tetrachords may also send a collection of simultaneous
Note Ons on a dedicated channel. Use the separate input track below, then switch
**Valid Notes** between **SysEx Intervals** and **MIDI Note Field** while
playback continues. After a 25 ms quiet window, the receiver atomically commits
whatever non-empty Note On burst was sent as a complete replacement field;
ordinary releases do not clear or merge it. Its monitor rows
show the raw SysEx-derived notes, raw MIDI notes, and active source, plus an
`EXACT RAW MATCH`, `SAME PITCH CLASSES`, or `DIFFERENT` comparison.

### Tetrachords Note Field Input — dedicated helper track

Live was observed presenting hardware channel-3 notes to Max as channel 1.
Do not combine the two note streams using All Channels and filter inside Max.
Filter them at the Ableton track inputs instead:

| Track | Ableton input | Device | Device settings |
|---|---|---|---|
| Harmony Receiver | Tetrachords → Ch. 1 | Tetrachords Harmony Receiver | Chord Ch 1; Field input Separate track; Valid Notes MIDI Note Field |
| Note Field | Tetrachords → Ch. 3 | Tetrachords Note Field Input | No internal channel selector needed |

Both tracks: Monitor In, MIDI To No Output. Put each device first in its chain;
no Note Length/Latch is required. Use only one Harmony Receiver and one Note
Field Input for this shared harmonic system. Existing quantizer tracks stay unchanged.

The field device buffers any nonempty Note On burst, commits after 25 ms of
quiet, retains exact MIDI pitches (including octave duplicates), and ignores
Note Offs. Only the receiver publishes harmonic state. The field device uses
a separate mailbox so it can load before the receiver without losing its last
completed collection; that collection is retained if the helper is disabled.
An oversized burst is discarded, never partially committed.

The field does **not require eight notes**: one or more notes form a replacement
collection. Send the whole intended field as a chord burst, not an arpeggio.
Stopping its transmission, sending Note Offs, or disabling the helper retains
the last complete collection; it does not bypass quantization. If it is silent
on first load, check Track Input, Monitor In, the helper's note count, and the
receiver's **Field input: Separate track** setting. No complete field means no
usable MIDI-field harmony yet. Do not swap chord and field roles to compensate.

### Ableton Live Current Scale sync

The receiver's visible **Live Scale** menu has two persisted choices:

- **Off** leaves Live's Current Scale untouched.
- **Current Scale** maps the currently selected valid-note source to the closest
  scale that Live can represent, then writes Song root, scale name and scale
  mode. This is the default, matching the receiver's previous automatic update.

This mapping is only a projection for Live-native scale-aware devices. The
Harmonic Quantizer always keeps using the exact active Tetrachords pitch
collection. An eight-note MIDI field therefore stays eight-note even when Live
can express it only as a seven-note approximation.

The receiver holds the SysEx root stable while matching either valid-note
source. It reports **EXACT**, **APPROXIMATE**, or **NONE** on the Monitor page,
including notes omitted from or added by the Live projection. Writes are
coalesced for 30 ms, repeated identical states are skipped, and a read-back of
`root_note`, `scale_name`, `scale_mode`, and `scale_intervals` verifies the
result. Live observations are diagnostics only and never feed back into the
canonical Tetrachords state.

Developer diagnostics live in `tools/Live Scale API Probe.maxpat`. Run it from
Live's bundled Max to probe Song and selected-clip read/write/observe behavior
against the installed beta without deliberately changing values.

Select **Separate track** explicitly in existing saved receiver instances;
fresh devices default to it. Numeric Field input options remain legacy local
filters, not hardware channel selectors. Confirm the receiver's SysEx/root
readout still updates from the chord track, then confirm the field and chord
readouts change independently. Host/hardware validation remains required.

Ordinary chord Note Ons arriving on the same track are captured as the active
chord. Set **Chord Ch** to **1** (the channel delivered inside Live), while
the Ableton track input selects Tetrachords' actual chord-output channel.

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

## Plinky Harmony Receiver — Plinky12 Chords

Included in this repository and in the runtime ZIP as
**Plinky Harmony Receiver.amxd**. It uses the same quantizers as Tetrachords;
you do not need Tetrachords hardware or its Note Field Input helper for Plinky.

1. On Plinky12 running **Chords**, enable harmony metadata on the connected
   output. The tested USB setup is **MIDI → Page 3 → top Clock/shared-harmony
   row → USB1 Out** (fourth of seven port pads; white means enabled). Ordinary
   voice-note routing on Page 1 is separate: seeing notes does not prove harmony
   NRPNs are enabled.
2. In Live, create a dedicated MIDI track: **MIDI From: the Plinky harmony port**,
   **All Channels**, **Monitor: In**, **MIDI To: No Output**. This explicit-port
   control track is not `All Ins` and should not feed hardware back to itself.
3. Load **Plinky Harmony Receiver** first in that chain, before any CC filters.
   Leave **Monitor Only** selected; change Chords harmony and check Root, Chord,
   Scale and the received CC/decoded-update counters.
4. Disable the Tetrachords Harmony Receiver and any other harmony publishers.
   Select **Publish Harmony**. The last complete decoded state publishes
   immediately; subsequent changes update all quantizers.
5. On a separate melodic track, load **Harmonic Quantizer**. Test with
   **scale-nearest** for the Plinky scale, or **chord-nearest** for chord tones.
   Set **Register: free**, **Gravity: off**, **Ensemble: Independent** and
   **Input: Follow Gate** for a simple initial comparison.

A cold session needs root, chord mask and scale mask once; later updates may
omit unchanged fields. If the initial readout remains partial, change both chord
quality and scale on Chords. Ordinary Note Ons do not define Plinky harmony.
Turning Publish off leaves the last shared harmony in place—it is not quantizer
bypass. A source-conflict warning means another publisher must be disabled before
toggling Publish off/on again.

**Live Scale: On** optionally projects the Plinky scale into Live's Current
Scale; its default is Off and it only writes while publishing. Exact Plinky
membership remains the custom quantizers' authority even if Live reports an
approximation. Plinky provides chord/scale pitch classes, not played voicing:
Chord Map's `voicing` choice uses a reconstructed root-position collection,
not the exact treble/bass notes sounded by Chords.

The receiver consumes incoming MIDI and has **no MIDI thru**. To play a synth
with Plinky's actual chord notes, create a separate Plinky note-input track and
route only the desired voice channel(s) to that synth. Do not send all metadata,
clock and every voice channel to hardware unless deliberately required.

See the [full Plinky guide](docs/PLINKY_HARMONY_RECEIVER.md) for the NRPN protocol,
partial-state handling, source conflicts and diagnostics. Blocks-specific
features are not implemented.

## Harmonic Quantizer

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

One publishing **Tetrachords Harmony Receiver or Plinky Harmony Receiver** must
have received a usable harmonic state. No direct MIDI cable or track routing from
the receiver to each quantizer is needed: they share harmony internally. Play
shows controls and input/output pitches; Monitor exposes source/voice diagnostics;
Input contains gate, settle and same-pitch behavior.

### Input behavior for gestural pitch sources

**Input** controls how the quantizer treats the source note lifecycle:

- **Follow Gate** preserves every incoming Note On and Note Off. Use this for
  keyboards, sequencers and sources whose MIDI notes also articulate the sound.
- **Hold Last Pitch** keeps one quantized output note active per MIDI channel.
  Incoming Note Offs are ignored; the next Note On safely releases and replaces
  the previous output. Use this when a gestural MIDI source supplies pitch while
  separate hardware triggers or envelopes articulate the sound.

In Hold Last Pitch, **Settle** waits 0–100 ms before adopting a new source pitch.
The default 20 ms suppresses brief adjacent-note flutter at gesture boundaries;
repeated reports of the same pitch confirm it rather than restarting the timer.
Set Settle to 0 ms for immediate pitch changes. Follow Gate never applies this
delay. Switching input behaviors or using Panic releases all device-managed held
notes so mode changes cannot leave stuck notes.

**Same Pitch: Legato / Retrigger** is also on Input. Legato forwards repeated
Note Ons with shared release ownership; a MIDI-to-CV converter may keep the gate
high. Retrigger sends Off then On for a repeated active output pitch, with no
added timed gap, and protects the replacement from older input Note Offs.
For sequencer gates that need a fresh attack at the same quantized pitch, try
Follow Gate + Retrigger. In Hold Last Pitch, replacements already release the
held note. Audible retriggering still depends on the converter/envelope.

### Mode reference

| Mode | Musical behavior |
| --- | --- |
| `chord-nearest` | Closest active-chord tone; use this for a melody locked to chord membership without selector remapping |
| `scale-nearest` | Closest pitch in the selected valid-note field/Plinky scale; simplest source-comparison test |
| `chord-map` | C–B input positions select successive chord tones, wrapping upward; transforms the source pattern |
| `scale-contour` | Remembers source/output history and converts melodic direction and intervals into scale-degree movement |
| `stateful-nearest` | Balances the incoming pitch against the previous realized output using Continuity |
| `scale-up` | First allowed pitch at or above the input |
| `scale-down` | First allowed pitch at or below the input |
| `scale-map` | C–B input positions select successive degrees of the selected valid collection, rather than nearest pitches |

Chord modes use **active chord metadata**; scale modes use the **selected valid
field**. They are different musical constraints. Changing Tetrachords' Valid
Notes source need not change a chord-mode result if the chord stayed the same.
Chord modes fall back to the selected field when no active chord is available.

**Change** controls when a pending valid-field update becomes active: `immediate`,
`nextnote` (default), or `nextbar`. `nextbar` requires incoming MIDI Clock and
counts 96 ticks per bar; it does not infer the bar from Live transport alone.
Chord metadata updates are separate. These options do not continuously retune
held notes; new Note Ons use the applicable harmonic state.

**Gravity** adds a velocity-sensitive root/fifth preference (off/light/strong), not
another scale. Leave it off for strict mode/source comparisons. **Register:
limited** applies the Low/High register window; **free** disables octave folding
into that window. Free is not quantizer bypass and Chord Map can still generate
octave movement. Low/High are MIDI note numbers, not frequencies. Defaults are
Limited, Low 24, High 48; choose Free explicitly when the source owns register.

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
Map is the default mode. Menu labels/order have changed during development;
review Mode once when loading an older Set. The Mode reference above follows
the current menu order.

### Ensemble Coordination

Use one quantizer instance per melodic part. Set **Ensemble** to the same
named group (**Ensemble A–H**) on the four tracks and assign distinct
**Voice A–D** identities. These are independent of MIDI channels; Ableton still
controls routing. **Independent** disables ensemble coordination. Internal
parameter IDs 0–8 / 1–4 are not destination channels.
Ensemble, Voice and **Voice Separation** are saved Live parameters. Defaults are
Independent, Voice A and Voice Separation 0% so tracks opt in explicitly.

Each part publishes its last assigned MIDI pitch for the monitor and separately
tracks currently occupied pitches for scoring. In Follow Gate, Note Off removes
occupancy; Hold Last Pitch retains it until replacement or reset. The monitor
still displays assigned pitches, not which analog envelopes are currently audible.
The four-part monitor shows note names and MIDI numbers, flags exact unisons,
and reports CONFLICT when two devices claim the same Voice. Conflicting parts
keep their normal quantized pitches rather than applying separation.

Voice Separation is a soft preference against exact pitch duplication. At 0%,
the original independent path is retained without ensemble buffering; increasing
it favors a nearby allowed alternative within six semitones. Octave doubling is allowed.
Chord modes choose chord tones; other modes use the active valid collection.
Register boundaries and directional constraints restrict alternatives. The
scorer combines input distance, Stateful Nearest continuity/common-tone costs,
and collision pressure. The final pitch is remembered and paired with its Note
Off. Continuity remains independent on every instance.

Ensemble-enabled instances with Voice Separation above zero collect requests
for approximately **4 ms** and resolve each batch with first choice rotating
from **Voice A → D** between cycles. Idle parts' sounding pitches remain
occupied. Notes arriving
in the same batch therefore give the same choices regardless of track arrival
order, provided the harmony, settings and prior state match. Notes outside
that window form subsequent batches. This is optimized for four monophonic
melodic lanes rather than polyphonic allocation within one lane.

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

First studio test: four independent source lanes, Ensemble A, Voices A–D,
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

The **Register** menu selects **limited** or **free**. Limited uses Low/High
(MIDI 24–48 by default), with mode-specific behavior: Scale/Chord Nearest and
neutral Stateful Nearest's first-note/Continuity-0 path preserve low source notes
and enforce High as a safety ceiling rather than folding all notes into the
window. Stateful candidate scoring uses the window; mapped/contour modes fold
their target into it. Free quantizes the harmonic pitch target but
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

## Harmonic Motion

This optional controller biases **Stateful Nearest** decisions; it does not
generate notes or replace the receiver. MIDI passes through unchanged.

1. Put one **Harmonic Quantizer** on each melodic lane. Choose `stateful-nearest`,
   the same named Ensemble, and distinct Voice A–D identities.
2. Load one **Harmonic Motion** on a convenient MIDI track and choose that same
   Ensemble. No MIDI routing between this controller and the quantizers is needed.
3. Begin with all four Motion Bias controls and Spread Motion at 0.
4. **Voice Motion −100…+100** discourages downward movement at positive values,
   or upward movement at negative values. Zero is neutral. It is a soft preference,
   not a pitch offset or a forced ascending/descending sequence.
5. **Spread Motion** adds fixed low-to-high biases across Voice A–D: positive
   tends to expand, negative to contract. Assign A–D in your intended register
   order; the controller does not sort pitches or prevent voice crossing.

Base biases plus Spread are clamped to ±100. A held common tone can remain held;
Motion affects new note decisions, not continuous pitch bend. Continuity,
register and exact-pitch Separation remain separate influences. Nonzero motion
with Limited register cannot select outside the window; a window containing no
valid candidate can produce silence.

Use only **one Motion controller per ensemble**. Duplicate controllers show a
conflict and neutralize motion rather than competing. The controls save with the
Set; live melodic history does not. Reset Ensemble between repeatable A/B takes.
See [Motion and Same Pitch details](docs/VOICE_LEADING_V3.md).

## ROTA integration (separate repository)

[ROTA and ROTA OUT](https://github.com/praveensharma/ROTA) are distributed MIDI
allocators, not devices bundled in this repository. Get their complete runtime
ZIP from the [ROTA beta release](https://github.com/praveensharma/ROTA/releases/tag/v1.0.0-beta.1).

For independent realized voice histories, use:

```text
Source MIDI → ROTA
                → ROTA OUT track 1 → Harmonic Quantizer → destination 1
                → ROTA OUT track 2 → Harmonic Quantizer → destination 2
                → ROTA OUT track 3 → Harmonic Quantizer → destination 3
                → ROTA OUT track 4 → Harmonic Quantizer → destination 4
Receiver → shared harmony for all four quantizers (no MIDI rerouting needed)
```

1. Load **ROTA** on the source MIDI track; Monitor In, MIDI To No Output.
2. Create four destination MIDI tracks, each with **ROTA OUT** before its
   quantizer. Monitor In; select the actual synth/FH-2 port and channel in each
   track's **MIDI To**. ROTA OUT receives through the internal bus, so do not
   additionally route a duplicate native note stream into it; use No Input.
3. One unambiguous master can pair automatically. Check ROTA's four named slots
   and each OUT's **Receive from** choice. Resolve ambiguous multi-master setups
   explicitly. Track names identify destinations; Setup permits manual overrides.
4. Start with **Round Robin**, four enabled slots, and no transpose/range filters.
   Try Interwoven's Distribution/Interweave/Seed only after the basic route works.

Putting one common quantizer **before** ROTA is also valid, but its stateful
history follows the source channel, not each physical destination. Putting one
after each OUT gives each part its own history and ensemble identity. Do not
accidentally quantize twice while comparing these layouts.

ROTA does not add a deliberate note-wait window. **Hold Notes** counts Sticky
Random assignments; it does not lengthen gates. Max/Live scheduling can still
add latency; the combined-path follow-up is pending. See ROTA's
[routing/studio guide](https://github.com/praveensharma/ROTA/blob/codex/rota-prototype/docs/studio-test.md)
for lifecycle, automatic pairing, range/transpose and persistence checks.

## Hardware MIDI/CV outputs

The devices do not configure FH-2 or any synth. Match each track's MIDI output
channel to the intended converter/destination, and avoid a second unquantized
route. For pitch-only CV with independently patched envelopes, use Hold Last
Pitch when appropriate; for MIDI-controlled gates, start with Follow Gate.

The following is an **example mapping**, not a required layout or an instruction
to overwrite a working FH-2 configuration:

Create four monophonic MIDI/CV converters:

| Converter | Listen channel | Pitch output | Gate output |
|---|---:|---:|---|
| 1 | 2 | FH-2 output 1 | Disabled / unused |
| 2 | 3 | FH-2 output 2 | Disabled / unused |
| 3 | 4 | FH-2 output 3 | Disabled / unused |
| 4 | 5 | FH-2 output 4 | Disabled / unused |

With those converter/output assignments already configured, the matching patch is:

```text
FH-2 output 1 → Matriarch OSC 1 PITCH
FH-2 output 2 → Matriarch OSC 2 PITCH
FH-2 output 3 → Matriarch OSC 3 PITCH
FH-2 output 4 → Matriarch OSC 4 PITCH
```

Do not compensate for incorrect CV range or routing with large post-quantizer
transpositions. If MIDI note numbers are correct but the instrument sounds wrong,
upload/read the live FH-2 configuration and inspect Output Range and converter
assignments before changing calibration or oscillator tuning. Hardware-specific
setup is separate from validating MIDI quantization.

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

## First test and troubleshooting

1. Configure **one** publishing receiver using the appropriate section above.
   For Tetrachords, Live's track input selects the hardware chord channel;
   **Chord Ch** refers to the channel delivered inside Max (commonly 1).
   Keep Chord Hold `sysex`. The separate helper track selects the hardware
   valid-note channel and the receiver selects Field input `Separate track`.
2. Confirm changing hardware harmony updates the receiver's active source and
   collection. For Plinky, check Publish Harmony; for MIDI Note Field, check
   the helper's committed collection. A moving MIDI meter alone is not proof.
3. On one melodic lane choose `scale-nearest`, Register `free`, Gravity `off`,
   Ensemble `Independent`, Input `Follow Gate`, Change `nextnote`.
4. Send a slow chromatic sequence. Compare a MIDI monitor before and after the
   quantizer: output pitch classes should belong to the receiver's selected
   collection. Change harmony and repeat. Note spellings/octave labels can
   differ between tools; compare MIDI note numbers and pitch classes.
5. Try `chord-nearest` to target only the active chord; then `chord-map` with
   `pitchclass` to hear selector remapping. Plinky `voicing` is reconstructed,
   not a copy of its played notes.
6. Add destinations/ensemble/motion one at a time. Test hardware separately
   after the post-quantizer MIDI is correct.

If a source stops updating, confirm its **actual port/channel** at Live's track
input, Monitor In, device enable state and publisher selection. The Tetrachords
field is deliberately latched after Note Off/quiet input. Neither receiver
silence nor Plinky Monitor Only is a bypass command.

If notes are unexpectedly high/low, inspect Chord Map's selector behavior,
Register and any downstream Pitch effects before changing hardware tuning.
If repeated notes lose their attacks, test Same Pitch Retrigger with Follow Gate.
If gesture boundaries flutter while separate hardware envelopes provide gates,
try Hold Last Pitch and its settle time; that settling deliberately adds latency.

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

Use one publishing harmonic authority in the shared Max runtime. Both receivers
and the quantizers intentionally use the fixed names:

```text
tetrachords_harmony_v1
tetrachords_harmony_bus_v1
```

This lets any number of quantizer instances follow the same Tetrachords **or
Plinky** harmony. It is not an independent namespace per open Set: simultaneous
Sets/instances using these names can conflict. Ensemble and Motion groups share
that runtime too; do not reuse groups for unrelated instruments.

## Validation and release limits

The beta includes automated engine, note lifecycle, ensemble, receiver and
package checks plus an isolated Live timing experiment. Automated recall tests
are not a real save/close/reopen certification. Fresh installation, device-state
recall, sustained multi-device hardware stress, and the matched quantizer→ROTA
Live latency follow-up remain studio acceptance checks.

Follow Gate with Independent/Separation 0 has no deliberate note wait. Active
separation adds a roughly 4 ms coordination window; Hold Last Pitch adds its
selected settle time. Receiver state-assembly windows apply to harmony updates,
not every melodic note. See [latency evidence](docs/LATENCY_AUDIT.md),
[release notes](docs/RELEASE_NOTES.md), and [release packaging](docs/RELEASING.md).
