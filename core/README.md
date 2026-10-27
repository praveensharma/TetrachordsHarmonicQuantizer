# Portable harmonic core

Dependency-free C++17 engine used by the native Max Harmonic Quantizer.
Max-specific code lives in `native/max/`; future platform adapters should reuse
this library rather than fork the algorithms.

## Build/tests

```sh
python3 tools/test_cpp_core.py
python3 tools/test_cpp_core.py --sanitize
cmake -S core -B /tmp/tetrachords-core-build -DCMAKE_BUILD_TYPE=Release
cmake --build /tmp/tetrachords-core-build
ctest --test-dir /tmp/tetrachords-core-build --output-on-failure
```

Node.js enables actual-JS selector and timed differential comparisons. The
reference lives in `tests/reference/harmonic_quantizer_legacy.js`, not the
production control adapter. Builds disable floating-point contraction; do not
enable fast-math when using the parity guarantee. Assertions remain enabled in
Release tests. For embedded linking, disable `TETRACHORDS_BUILD_TESTS`.

## Engine API

See `include/tetrachords/engine.hpp`.

- `Engine(Sink, Ensemble*)`: one logical MIDI input namespace, optionally a
  host-owned shared ensemble registry. The registry must outlive all engines.
- `set_settings(settings, time_us)`: atomic validation and control transitions.
- `set_field(Field)`, `set_chord(Chord)`: complete versioned harmonic updates.
- `process(MidiEvent)` / `process_byte(byte,time_us)`: complete or raw MIDI.
- `tick(time_us)`, `next_due()`: deterministic host-managed native timers.
  UINT64_MAX means no deadline; an immediate path needs no timer.
- `bypass`, `panic`, `reset_voice_history`, `reset_ensemble`.
- `pop_decision`, `diagnostics`, `ensemble_pitch`: bounded readout state.

No heap allocation, threads, files, clocks or platform APIs are in the library.
The host serializes all calls to engines sharing a registry and supplies
nondecreasing microsecond timestamps. The sink is synchronous, nonblocking,
allocation-free and non-reentrant; it copies events if retaining them.

The library never emits another engine's MIDI from the current engine's call.
Shared ensemble resolution chooses pending pitches; each engine drains its own
events on its own host deadline. This matters for safely routing separate Max
outlets or embedded MIDI destinations.

## Harmony representation

Masks are absolute pitch classes: C=bit 0 through B=bit 11. Root is separate.
Raw MIDI notes retain ordering, octaves and duplicates, including exact repeated
notes. A nonempty raw collection must match the supplied mask; malformed updates
are rejected atomically. Collections can contain 1–128 notes, not exactly eight.

Selected valid fields and explicit chord metadata remain separate. Tetrachords
and Plinky receiver decoding, note-burst collection and Live Scale projection
remain platform adapters. Passing SysEx through the melodic parser does not
implicitly decode harmonic state.

## Musical behavior

All eight selectors are implemented: Scale Nearest, Chord Nearest, Chord Map,
Scale Map, Scale Up/Down, Scale Contour and Stateful Nearest. Chord Map supports
pitch-class selection and exact voicing. Stateful scoring supports continuity,
common tones and supplied effective directional Motion bias.

Follow Gate is immediate at separation zero. Hold keeps one pitch per channel,
ignores source offs, confirms repeated reports without restarting stability, and
uses a host deadline for settling. Ensemble separation retains the four-ms
window, rotating part priority, soft exact-MIDI-pitch collision cost, bounded
six-semitone alternatives, asynchronous active occupancy and visible duplicate
part conflicts. Unisons remain possible; octave-related pitches do not collide.

## Bounds and failure

Each engine has 512 source mappings (including silent/retrigger tombstones),
512 deferred events, 16 stability slots and 32 recent telemetry entries. An
ensemble registry has 64 engines; pending jobs per group are capped at 512.
Engine size is about 171 KiB on the tested macOS ABI; tests report exact size.

An overflow releases active outputs, cancels pending work and latches a fault.
Further note events are consumed until Panic. Non-note traffic remains routable.
Telemetry overflow discards old display history only, never musical events.

The core defaults to Scale Nearest and legacy oracle semantics for comparison.
The production native adapter selects the original Chord Map default and enables
`safe_lifecycle`. This policy also enforces valid-pitch safety: no invalid root
attraction, invalid clamping/ceiling pitch or fabricated pitch in an impossible
hard register. It fixes empty-field ownership loss, orphan-off interference and
bypass cancellation identity loss. These deliberate differences have independent
regression tests rather than being mislabeled as legacy parity.

MIDI Stop itself remains raw passthrough. The Live adapter observes transport
stop and sends Panic. Sustain/other CCs are forwarded; sustain does not change
source ownership or turn sustained release tails into collision occupants.
A source reset/Panic discards identities; stop input before resuming to avoid
ambiguous old releases after reset.

## Portability and timing limits

No Max, CoreMIDI, JUCE, NT, Daisy or JSON dependency is in the core. The SDK adapter
and UI/receiver plumbing are separate. Current compiled runtime is macOS universal;
Windows/Linux/rack builds are not certified yet.

Host benchmarks include sink/timer overhead and exclude Max, Live, USB/MIDI and
CV hardware. They cannot establish end-to-end latency. See
[the native migration notes](../native/README.md) for runtime validation and
installation instructions.
