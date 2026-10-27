# Native Harmonic Quantizer

The production Harmonic Quantizer now sends melodic MIDI directly through the
portable C++ engine. Its name, existing control IDs and parameter identities
remain unchanged. JS handles receiver updates, controls, Motion discovery and
readouts only; it does not process or forward melodic MIDI.

## Build and verify

macOS, Apple command line tools, Python 3, Node.js and the official
[Cycling '74 max-sdk-base](https://github.com/Cycling74/max-sdk-base) are required.
Validated SDK revision: `c03a2922a2a8ff149165a1e2ea134e9321d6e202`.

```sh
python3 tools/test_cpp_core.py --sanitize
python3 tools/build_native_max.py --sdk /path/to/max-sdk-base --sanitize
python3 tools/build_amxd.py
python3 tools/build_amxd.py --verify-dist
python3 tests/test_distribution.py
```

The external is a locally signed arm64+x86_64 macOS bundle. The builder records
source and recursive bundle hashes in `native_build.json`. Distribution and
installation reject stale or altered binaries. A native build does not install
anything; the AMXD builder installs only with explicit `--install`.

Keep the AMXD, JS sidecars, `tetrachords.quantizer.mxo` and manifest together.
The runtime ZIP packager includes the entire bundle and executable permission
bits. This is a macOS distribution, not a Windows build or notarization claim.
The core itself has no Max/macOS dependency.

## Processing and scheduling

`midiin → tetrachords.quantizer → midiout`

Configuration is separate:

`receiver bus / fallback snapshot → control JS → native field/chord/settings`

All eight pitch modes, Chord Map voicing, continuity, directional Motion scoring,
register selection, Note On/Off ownership, Hold/Settle, shared ensemble occupancy,
rotating priority and collision scoring execute in C++.

Follow Gate with zero separation has no deliberate wait. Hold adds its selected
settle interval. Separation adds the existing four-millisecond collection window.
Max clocks run these native deadlines; no JS Task carries a melodic note.
A 50 ms control/readout task handles UI/Motion discovery and missed harmony
snapshot recovery. It is not per-note scheduling, although a missed control
message can delay harmony recovery until the next poll.

The Max adapter uses Max's global recursive critical section. It is not lock-free
or a claim of audio-thread safety. Downstream Max objects, Live's buffering and
USB/MIDI hardware can still add delay/jitter.

## Lifecycle and correctness

- Every transformed note keeps its original channel/pitch FIFO source identity.
- Exact-pitch Retrigger retires old owners into tombstones; late offs cannot end
  the replacement. Legato preserves one On per accepted input On.
- Empty-field/raw notes are tracked too, so field loss/recovery cannot lose offs.
- Canceled ensemble notes retain FIFO tombstones across bypass.
- Hold ignores source offs and replaces one held owner per channel; rapid pitch
  reports cannot build up an unbounded owner list.
- Panic/deactivation cancel pending notes and release active outputs. Stop is
  observed in Live and requests Panic; raw MIDI Stop remains passthrough.
- Reset Voices drains already accepted ensemble events before clearing memory.
- Ensemble reset clears memory without forgetting physically active occupancy.
- A hard register with no legal pitch produces a silent mapping, not a fabricated
  boundary pitch. Root gravity cannot invent an invalid field note. Chord Nearest
  uses the field correctly when no explicit chord exists.
- Capacity faults are fail-closed and visible in the status readout. Stop input
  and toggle the device off/on (or send Panic) to reset.

Panic is a source-reset boundary: MIDI 1.0 cannot identify an old unmatched release
after all source identities have explicitly been discarded. Stop the source
before resetting and resuming it.

## Existing Sets / library updates

The builder overwrites the existing Harmonic Quantizer library name and creates
backups. Quit/restart Live when replacing a native external: an already loaded
binary may remain cached even if the file changes.

Old Sets can embed the old patch while loading the new JS sidecar. On load, the
control adapter upgrades only that device's old MIDI connections to the native
object, preserving its controls and parameters. Save the Set after verifying it.
It does not rewrite unrelated tracks or hardware routing. Missing externals are
reported rather than silently selecting a different algorithm.

## Validation

The old JS engine is retained only in `tests/reference/`, never in the runtime
package. Legacy musical tests deliberately target that frozen oracle. Production
adapter tests target the actual new control script and MIDI graph.

- 578,190 selector/lifecycle differential operations against the actual old JS.
- 3,600 timed differential operations: four voices, separation 0/50/100,
  Follow/Hold and Nearest/Contour/Stateful modes, including short gates.
- Independent exhaustive nearest, native pitch-safety, capacity, cancellation,
  rotation, asynchronous occupancy, conflicting-part and allocator-free tests.
- Sanitizers for core and SDK-header Max adapter host shim.
- Production control/menu restoration, source selection, raw-note retention,
  Motion expiry, monitor, stop observer and old-graph migration tests.
- A real Live acceptance fixture tests all eight modes, both source types,
  Hold/Settle, ensemble timing and panic, with no hardware MIDI output.
- Save/reopen checks record initial recalled values, not just source metadata.

Use `tools/build_native_validation.py` to create the isolated test device;
`--legacy-graph` exercises an old embedded patch. Only use the legacy-graph
fixture on a track explicitly set to No Output. Test logs are written to
`/private/tmp/tetrachords-native-live-validation.jsonl`.

These checks establish correctness and loading, not T-1/FH-2 end-to-end timing.
The latency investigation must use matched before/after observations with the
same source, route, buffer and mode. Do not infer hardware latency from host
microbenchmarks.

### Real Live result — 2026-10-26

The production-graph device passed all 16 runtime checks after a cold Live
restart, including nondefault mode/continuity/register recall (Scale Nearest,
73%, Free). An old embedded patch passed its automatic graph migration plus
the same 16 checks. Four real native instances passed six additional checks
for pitch separation, rotating priority, paired releases, zero-pressure unisons
and impossible-separation register constraints. No test sent MIDI to hardware.
See [recorded runtime results](../docs/NATIVE_LIVE_VALIDATION_2026-10-26.json).
