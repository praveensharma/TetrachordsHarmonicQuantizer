# Plinky Harmony Receiver — Chords

## Setup

1. Connect Plinky12 running Chords by USB. Enable Track for its MIDI input in Live.
   On Chords tap MIDI → Page 3 → top Clock/shared-harmony row and enable USB1
   Out (fourth of the seven port pads; white highlight = enabled). Note voice
   routing on Page 1 is separate and does not enable harmony metadata.
2. Create a dedicated MIDI track: MIDI From = the Plinky port carrying harmony
   CC/NRPN messages, All Channels; Monitor In; MIDI To = No Output.
3. Add **Plinky Harmony Receiver** from the User Library. Do not put ROTA or
   CC-filtering effects before it. It consumes MIDI and has no MIDI thru.
4. Leave **Monitor Only** selected initially. Change harmony on Chords. Check
   the Root, Chord and Scale readouts, including C major = C E G / C D E F G A B.
5. Disable the Tetrachords Harmony Receiver and any other harmony publishers.
   Choose **Publish Harmony**, then change harmony on Chords again.
6. Existing quantizers now consume the Plinky state. Use Scale Nearest to test
   the scale and Chord Nearest to test chord tones. Chord Map intentionally maps
   input chromatic positions to chord degrees and can change register.

Publish mode and Live Scale Sync are stored with the device/Set. The first
hardware state needs root, chord mask and scale mask. Subsequent messages can
change any subset. Complete per-channel states are retained in Max Global for
warm script reloads, but not written into a preset as pretend live hardware
data. A cold Max session needs a complete initial state. If the receiver keeps
reporting a partial starting state, change both chord quality and scale on
Chords to make it send those masks once.

Enabling Publish publishes the last complete state decoded in the current Max
session immediately. Turning Publish off retains the last shared harmony; it
does NOT bypass quantizers. Monitor Only never publishes or writes Live scales.

Only one harmonic authority should run. The adapter detects unexpected shared
version/source changes and stops publishing with a conflict warning. This is a
fail-stop diagnostic, not a global lock on legacy receivers: another receiver
can still overwrite state. Disable it, then toggle Publish Off/On and change
the Chords harmony. Do not use two publishing Plinky receivers simultaneously.

## Wire protocol

Based on the developer-supplied C-major MIDI capture:

| Meaning | NRPN MSB:LSB (decimal) | Encoding |
| --- | --- | --- |
| Root | 33:78 (4302) | CC6 = MIDI root, 0–127; no LSB required |
| Chord | 33:79 (4303) | `(CC6 << 7) | CC38`, 12-bit root-relative mask |
| Scale | 33:80 (4304) | Same mask encoding |

The example sends LSB before MSB. Both data orders are supported, but partial
values are never published. State is isolated per MIDI channel; channel numbers
may be rewritten inside Live, so select the port/channel at track input.

Each channel caches its last complete root/chord/scale snapshot. A changed root,
chord mask or scale mask patches that snapshot. Changes are coalesced after
12 ms of quiet before committing once. This handles the real capture's
C → F → C → D updates where the unchanged chord mask was omitted.

A half-received 14-bit mask blocks the whole patch; data bits are never guessed.
Incomplete candidates expire after 200 ms. Timeouts, empty scale masks and
values above 4095 retain the last complete state.
An empty chord mask clears chord metadata (existing chord modes fall back to the
scale). Notes, note-offs, clock, SysEx and unrelated NRPNs do not define harmony.

Bit i means `(root + i) % 12`. Chord mask 0x091 and scale mask 0xAB5 at root 60
decode to C E G and C D E F G A B. Raw root and masks remain in shared state.

## Integration and limitations

Uses the existing `tetrachords_harmony_v1` snapshot and
`tetrachords_harmony_bus_v1` events. The complete global snapshot is written
before chord/validnotes notifications. Versions increment from current global
values, avoiding version collisions when changing source. Source is `plinky`.

The protocol supplies pitch classes, NOT a voicing. `activeChordNotes` and
`activeValidMidiNotes` are explicitly reconstructed upward from the root MIDI
note (octave-adjusted only if necessary to remain within MIDI range). Exact
Voicing in Chord Map therefore uses a synthetic root-position voicing, not the
notes Chords actually sounds. Pitch-class Chord Map/Chord Nearest use the exact
chord membership; scale modes use the exact scale membership.

## Live Scale Sync and diagnostics

Select **Live Scale: On** alongside **Publish Harmony** to drive Live's Current
Scale. Default is Off. The device reuses the existing LiveScaleMatcher and
LiveScaleBridge, coalesces writes, and reads root/name/mode/intervals back to
verify them. The readout reports EXACT / APPROXIMATE / NONE and verification.
The exact Plinky scale mask continues to drive custom quantizers, independently
of any Live approximation. Observations never publish harmony or create write
loops. A manual Live edit remains until the next actual harmonic change.
Live API failure leaves harmonic decoding/publication working.

The bottom readout shows received MIDI/CC counts, decoded/published updates,
rejections and age of the last decoded harmony. Quiet hardware does not make a
held chord invalid; age reports silence rather than automatically clearing it.
`/private/tmp/plinky_harmony_receiver_trace.tsv` records fields, commits,
publishing, source conflicts and Live readback. It rolls over around 256 KiB.
The trace has an instance identifier and is updated by a one-second summary;
raw performance MIDI is counted rather than logged byte by byte.

There is no MIDI output back to hardware. Blocks-specific features are not
implemented. Keep only one receiver publishing in a Set.

## Tetrachords audit

Tetrachords uses complete 17-byte SysEx frames rather than delta NRPN fields.
The separate MIDI field lane replaces the set atomically after its Note On
burst and ignores Note Offs. It accepts variable collection sizes and retains
actual MIDI pitches; a new SysEx root must NOT transpose a retained MIDI field.
Both paths are covered by `test_receiver_reliability.js` and existing tests.

Reloaded receivers now advance versions from the shared state's current
versions, so subscribers cannot mistake a new frame for an already seen one.
Held chords in gate mode also republish root metadata changes. Live API startup
failure cannot stop harmony startup. SysEx buffering and field candidates are
bounded; diagnostics report MIDI bytes, SysEx frames, field commits, publication
age and rejects. The Tetrachords and quantizer traces roll over and continue
instead of silently stopping after 1000 lines. The existing distinction between
SysEx-derived and authoritative MIDI-note fields is preserved.

Shared bridge 0.1.1 also fixes Song construction to `new LiveAPI(null,
'live_set')` and verifies that the object/scale properties resolve before
observing or writing. The constructor takes callback first, path second:
https://docs.cycling74.com/apiref/js/liveapi/

## Verification

`node tests/test_plinky.js` tests the captured bytes, transposition, masks,
partial updates from the hardware capture, atomicity, malformed/incomplete
data, running status, realtime interleaving, channel isolation, warm reloads,
source conflicts, quantizer consumption and Live Scale Sync.

`python3 tools/plinky_layout.py` regenerates the 720 × 169 presentation.
`python3 tools/build_amxd.py --device 'Plinky Harmony Receiver' --device 'Harmonic Quantizer' --install`
builds and installs with backups; `--verify-installed` verifies package/source
identity. No Max window is required. After installation, reload the receiver
device to get the new Live Scale menu and diagnostics layout. Package checks
and recorded MIDI replay do not verify live Max rendering, saved-Set parameter
recall or audible performance.

## Direct MIDI capture

`tools/capture_midi.swift` is the read-only CoreMIDI diagnostic used for the
studio capture. Compile with `swiftc -swift-version 5 tools/capture_midi.swift
-o /private/tmp/capture-midi`, then run `/private/tmp/capture-midi 30` and save
stdout as JSONL. It subscribes to Plinky, FH-2 and Muse source endpoints.
`--request-fh2` additionally sends only the FH-2 configuration dump request,
never an install/reset/save command. CoreMIDI requires host access outside the
restricted execution sandbox. A source subscription observes that device's
outgoing MIDI, not another application's writes to its destination port; an
FH-2 source capture is therefore not a direct probe of Live → FH-2 delivery.
