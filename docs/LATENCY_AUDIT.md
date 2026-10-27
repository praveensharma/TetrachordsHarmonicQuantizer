# MIDI latency audit — 2026-10-24

## Native migration follow-up — 2026-10-26

The current quantizer note path is native C++, not a JS callback. All pitch modes,
Hold/Settle and ensemble decision windows are included. The old results below
describe the earlier engine/fixtures and must not be presented as new native
hardware measurements. The JS benchmark/latency fixtures now explicitly load
the frozen reference engine as a baseline.

Native processing still intentionally waits for Hold stability and/or active
ensemble separation. Follow Gate + Separation 0 is the zero-deliberate-wait
control condition. Display, Motion discovery and harmony snapshot recovery run
outside the melodic note path.

The user reports T-1 USB pitch sequences still sounded late/sloppy with Live's
buffer at 128 samples. Do not infer the cause solely from that buffer value.
Next measurement: identical T-1 source and Live/FH-2 route, matched bypass/native
passes, input/output Note On/Off counts, per-event delay distribution and jitter.
Separate extra/retriggered notes from actual timing error, and distinguish
external direct gates from Live-routed pitch/gate timing. No claim of resolving
the reported hardware timing fault has been made by the language port.

## Measurement boundaries

The existing `/private/tmp/harmonic_quantizer_trace.tsv` (last modified
2026-10-24 03:25 UTC) contained 70 matched INPUT_NOTE → NOTE pairs: median
1 ms, p95 69 ms, maximum 101 ms. These are real timestamps from an earlier
Max run, not a fresh loopback test. NOTE was logged before MIDI emission;
INPUT_NOTE was logged after input settling. The interval excludes Live input
buffering, hardware and any input settling delay. Millisecond clock resolution,
logging overhead and scheduler interruptions limit attribution. The spikes do
not prove that disk I/O alone caused them.

`tools/measure_processing.js` is a reproducible Node VM experiment. File calls
are counted/stubbed, UI is stubbed, and timers use a simulated scheduler. Its
CPU times must NOT be advertised as Ableton/Max/hardware latency. Baseline and
updated sources were tested with the same harness, 1,000 notes per configuration.

| Configuration | Deliberate delay, unchanged | Timer callbacks before → after |
| --- | ---: | ---: |
| Follow Gate, separation zero | 0 ms | 0 → 0 |
| Follow Gate, separation enabled | 4 ms | 8,000 → 2,000 |
| Hold Last Pitch, settle 20 ms | 20 ms | 20,000 → 1,000 |
| Hold Last Pitch, settle 20 ms, separation enabled | 24 ms | 24,000 → 2,000 |

The Follow Gate counts include buffered Note Offs. Exact runtime timing still
depends on Max scheduling. No filters or voice-leading semantics were removed.

## Changes

- Quantizer logging: replace 3–5 synchronous File opens per note with an in-memory
  bounded queue (256 lines), flushed by the existing 100 ms maintenance task.
- Readouts: retain up to 16 pending visual events and the latest status, and flush
  them during maintenance. Ensemble membership/voice state remains immediate;
  selector writes and status outlets no longer happen on the note path.
- Timing windows: schedule the next actual due time instead of 1 ms polling.
  FIFO Note Off mapping, short gate duration, same-pitch retrigger and coordinated
  rotation retain their existing tests. Emit MIDI before formatting note readouts.
- ROTA: remove discovery/menu/registry refresh on every Note On. Keep its regular
  100 ms maintenance and receiver-side validation on every packet. Saved routing,
  conflict handling and note ownership are unchanged.

ROTA's 5,000-note Node experiment measured median input-to-receiver processing
0.043 → 0.0094 ms (p95 0.0523 → 0.0122 ms). Inline discovery calls were
5,000 → 0; registry reads 10,000 → 5,000. These figures exclude Live and hardware.
Run its separate `tools/measure_processing.js` in the ROTA repository to repeat.

## Fresh runtime diagnostics

The quantizer now records a bounded rolling window of 512 actual callback-to-MIDI
durations, including settling and ensemble waits. A `LATENCY` JSON summary is
added to the existing trace about every five seconds while notes are processed.
It includes sample count, median, p95 and maximum, with explicit scope. Diagnostics
remain separate from harmony source selection (Plinky, SysEx or MIDI Note Field).
These timings still exclude Ableton buffering before/after the device and hardware.

## Completed isolated Live measurement

With the user's approval, three temporary tracks were added at the end of the
current Ableton Beta Set, outside existing groups. All had MIDI To: No Output.
The sender had No Input; worker/sink monitored only the preceding test track's
Post FX stream. Playback continued at the existing 124 BPM, 48 kHz configuration.
No original device was reloaded or changed, and the Set was not saved.

Max `cpuclock` timestamped generated Note Ons and received Note Ons. Seven
sequential cases each sent 120 notes at nominal 50 ms intervals; first 20 notes
were excluded, yielding 100 measurements each. All 100 post-warmup notes arrived
in every case. Known C-major test notes were seeded into a private harmony Global;
test ensemble, motion, ROTA registry/bus and quantizer traces also had private
names. No production receiver or ROTA controller was joined by a test device.

| Live test path | Median ms | p95 ms | Max ms |
| --- | ---: | ---: | ---: |
| Internal MIDI reference | 5.426 | 39.482 | 57.716 |
| Nearest quantizer | 5.602 | 40.136 | 65.079 |
| Stateful quantizer, separation zero | 5.495 | 31.534 | 45.279 |
| Stateful quantizer, separation 50% | 11.155 | 57.372 | 71.987 |
| Nearest, Hold Last Pitch with 20 ms settle | 29.310 | 66.120 | 80.343 |
| Private ROTA bus | 3.432 | 23.952 | 43.141 |
| Nearest then private ROTA bus | 14.469 | 25.085 | 40.727 |

These are REAL Max/Live measurements of the isolated fixture, NOT hardware round
trip. Absolute times include the probe's JavaScript parsing/Global bookkeeping,
Live routing and scheduler behavior. The ROTA cases replace the final Live track
routing hop with the ROTA bus, so their absolute numbers cannot be subtracted as
if every path had identical topology. Cases were sequential, not simultaneous
paired trials, so small median differences are not precise causal estimates.
All quantizer and ROTA processing used the optimized source copies; this was not
an old/new production-device A/B.

Nearest/stateful medians were close to reference. The reference itself has a
large long tail, demonstrating a source of jitter outside pitch selection; this
does not identify a particular Live preference, OS process or hardware cause.
The combined quantizer/ROTA path still has meaningful latency worth investigating
further. No global buffer/scheduler settings were changed to improve the result.

Cleanup: all three test tracks were removed using their own track context menus.
The initial and final visible original routing/monitoring/arm/activator settings
matched, as did tempo and playback state. Original selected track (QUANTIZED
MIDI), empty browser search/User Library, and No Clip Selected view were restored.
The temporary devices were moved out of the User Library to a recoverable temp
folder. Fixture sources remain with this project for repeatable future tests.

Raw summary: `LATENCY_LIVE_RESULTS_2026-10-24.json`. An earlier fixture attempt
was discarded because its test harmony was not initialized correctly; only the
validated run (ID 1792887540391) above is reported. The summary writer was also
updated to truncate the output explicitly before future runs.

## Matched-topology follow-up (prepared, not yet run in Live)

ROTA performs note assignment and bus forwarding immediately; its maintenance
timer is not a per-note delay. Sticky Hold Notes is an assignment count, not a
duration. JavaScript scheduler handoffs still require host measurement.

`tools/build_latency_probe.py --matched --rota-root ../ROTA` prepares balanced,
repeated bypass-quantizer/nearest-quantizer/batched-output trials through the same
ROTA route. The batched-output override exists only in the private fixture, never
in the production device. This isolates routing and MIDI-byte delivery hypotheses
without claiming that the current combined-path result identifies a cause.

Pure Node VM tests of the same quantizer-to-ROTA-to-four-receivers topology measured
median/p95 of 0.0142/0.0213 ms bypassed, 0.0237/0.0372 ms nearest and 0.1841/0.3957 ms
stateful. These are processing-only figures, not Max scheduler or hardware latency.
The next Live experiment remains pending; no existing Set was changed to run it.

## Future measurement

A hardware loopback or audio/CV measurement remains a separate future test.
No hardware ports, audio buffers or clock-routing settings were altered:

1. Isolated MIDI input/output, with no Muse/FH-2/other hardware destinations.
2. Timestamp paired Note Ons for a direct reference and processed chain using
   identical source events, routing and Live/audio settings.
3. Compare reference vs processed distributions (median/p95/max), not just means.
4. Repeat under the user's normal recording/CPU load and active quantizer modes.
5. Remove only temporary test resources; restore any changed routing explicitly.

For minimum deliberate delay use Follow Gate and Separation 0 (or Independent).
For Trails with independent articulation, keep Hold Last Pitch if needed, but
try a smaller settle value separately; zero disables filtering and can restore
the pitch warble this feature was introduced to prevent. Do not silently change
existing Set parameters to obtain a faster-looking result.
