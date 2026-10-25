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
