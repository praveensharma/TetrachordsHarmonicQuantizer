# v1.0.0-beta.2 — native quantizer, 2026-10-27

Feature-frozen native quantizer beta. The existing device name and saved
parameter identities are retained. macOS arm64/x86_64 native quantization now
replaces the JS note-processing path; controls, receivers and displays stay JS.
Hold/Settle and shared ensemble scheduling are native too. Raw MIDI never passes
through a JS note callback. Zero-separation Follow Gate introduces no deliberate
wait; Hold/Separation retain their explicitly configured musical windows.

The runtime now requires the complete .mxo bundle and native build manifest.
Builders reject stale binaries and installers back up existing devices/bundles.
Old embedded patch wiring is upgraded within the device on load, without
renaming controls or changing other tracks. Restart Live for a native binary
update; save Sets after checking the updated wiring.

Native safety fixes cover empty-field ownership, unmatched releases, canceled
queued notes after bypass, invalid root gravity, missing-chord ceilings and
impossible register windows. These are explicit, separately tested changes.
The old engine is retained only as the differential-test oracle, not a runtime
fallback or parallel device version.

See [native migration](../native/README.md) and [latency audit](LATENCY_AUDIT.md)
for evidence and limits. This port alone is not proof that T-1/FH-2 round-trip
latency or jitter has been eliminated.

## Completed acceptance

Real Live production/legacy-graph, four-instance ensemble and parameter recall
checks passed. The T-1 software-output comparison matched 3,337 Note Ons across
the buffer/monitoring A/B conditions without extra/missing Ons. In the recorded
green/on versus red/off audio comparison, all 32 pitch changes matched C-major
nearest-note quantization and no additional quantizer delay was measurable.
Recorded audio offsets are not absolute hardware round-trip latency.
See [audio A/B](T1_AUDIO_AB_2026-10-27.md),
[software timing](T1_TIMING_2026-10-27.md) and
[Live validation](NATIVE_LIVE_VALIDATION_2026-10-26.json).

The native bundle is macOS arm64/x86_64, locally ad-hoc signed, not notarized.
Fresh-machine installation, sustained multi-device hardware stress and other
host/platform combinations remain outside this beta's certification. ROTA is
a separate project and is not included in this quantizer migration release.
No new features or additional latency experiments are planned for this freeze.

Local installation note: both Harmonic Quantizer library copies match this
build. The studio's Plinky receiver has a separate MIDIMiscellany loop bridge
extension; it was intentionally not overwritten or incorporated into this beta.
The bundled receiver is the repository's tested standalone implementation.

# v1.0.0-beta.1 — 2026-10-24

This is a tagged beta checkpoint, not a stable release. Device names stay
unchanged: no v2 titles or parallel legacy/OXI variants are introduced.

## Included

- Five devices: Tetrachords Harmony Receiver, Tetrachords Note Field Input,
  Plinky Harmony Receiver, Harmonic Quantizer and Harmonic Motion.
- Plinky Chords root/chord/scale NRPN decoding, partial-update assembly, diagnostics
  and optional Live Current Scale projection; Tetrachords MIDI-field/SysEx sources
  remain distinct and exact custom quantization remains authoritative.
- Receiver startup/version/field-buffer reliability fixes; bounded diagnostic state.
- Stateful motion controls and same-pitch Legato/Retrigger ownership protection.
- Compact performance/monitor/input layouts with transparent readouts.
- Deferred quantizer diagnostics and deadline-based scheduling; source, distribution
  and installation consistency checks. `--install` rebuilds `dist/` before copying.

## Verification boundary

Automated tests cover source engines, matching, malformed/partial MIDI, note
ownership, short gates, ensembles, motion, telemetry and package consistency.
The isolated Live timing run measured optimized engine copies in a private test
namespace; it is not a full hardware or installed-preset certification. See
[the complete audit](LATENCY_AUDIT.md) and [raw summary](LATENCY_LIVE_RESULTS_2026-10-24.json).

Still required before stable release: fresh installation on another system,
device parameter save/reopen, full multi-part hardware stress/stop/bypass tests,
and matched-topology follow-up on the combined quantizer→ROTA latency.

## Installation / upgrade

Copy the complete `dist/` bundle together, or use the Python installer. These
devices use external JavaScript sidecars; an AMXD alone is not the full package.
Back up Sets and reload changed devices to adopt new code/patch definitions.
Updating a library file does not prove existing saved instances updated themselves.
Current development/testing used Live 12 Beta and Max 9; other combinations are
not certified by this checkpoint. Receiver consumes MIDI (no thru); use a separate
track when forwarding original chord notes to a synth. Use only one active harmony
publisher. Do not assume Plinky, SysEx and MIDI Note Field collections are identical.

## Timing

Follow Gate/Separation 0 has no deliberate note wait; separation coordination
adds 4 ms; Hold Last Pitch adds its selected settling time. General scheduler
jitter can be much larger. No hardware calibration, clock routing, buffer settings
or original live-Set devices were modified for the timing experiment.
